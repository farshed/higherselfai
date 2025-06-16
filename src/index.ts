import { Elysia, t } from 'elysia';
import { twiml } from 'twilio';
import { OpenAIRealtimeWebSocket } from 'openai/beta/realtime/websocket';
import { createUserSession, db, updateUserFields } from './services/firebase';
import { logger } from './middleware/logger';
import {
	decodeMulawChunk,
	getBlankMulawAudio,
	getMulawBase64FromURL,
	wavToMulawBase64
} from './services/audio';
import { S3 } from './services/s3';
import { sleep } from 'bun';
import type { ElysiaWS } from 'elysia/ws';
import {
	getConditionalPrompt,
	getDynamicPrompt,
	OpenAI,
	transcribeMulawBuffer
} from './services/openai';
import { SendGrid } from './services/sendgrid';
import { endCall } from './services/twilio';
import { injectVars } from './utils';
import { OpenAIRealtimeWS } from 'openai/beta/realtime/ws.mjs';

const { VoiceResponse } = twiml;

type CallSession = PrerecordedCallSession | RealtimeCallSession;

const streams = new Map<string, CallSession>();
const callers = new Map<string, { user: any; script: any }>();

const app = new Elysia()
	.use(logger)
	.post(
		'/twilio-webhook',
		async ({ body, set }) => {
			const phoneNumber = body.From!;
			const callSid = body.CallSid!;

			console.log('body', body);

			if (!callSid || !phoneNumber) return;

			const users = await db
				.collection('users')
				.where('phoneNumber', '==', phoneNumber)
				.where('subscriptionStatus', '==', 'active')
				.limit(1)
				.get();

			// TODO: User is allowed only one call per day.

			if (users.empty) return;
			const user = users.docs[0].data();

			const scripts = await db
				.collection('scripts')
				.where('day', '==', user.lastCallDay + 1)
				.get();

			if (scripts.empty) return;
			const script = scripts.docs[0].data();

			callers.set(callSid, { user: { ...user, id: users.docs[0].id }, script });

			const response = new VoiceResponse();
			const connect = response.connect();
			connect.stream({ url: 'wss://api.memestreamedia.com/stream' });

			set.headers['content-type'] = 'text/xml';
			return response.toString();
		},
		{
			body: t.Object(
				{
					From: t.Optional(t.String()),
					CallSid: t.Optional(t.String())
				},
				{ additionalProperties: true }
			)
		}
	)
	.ws('/stream', {
		open(ws) {},
		async message(ws, data: any) {
			try {
				const sid = data.streamSid;

				switch (data.event) {
					case 'start': {
						const callSid = data.start.callSid;
						const caller = callers.get(callSid);
						if (!caller) return;

						const { script, user } = caller;
						const CallSession =
							script.type === 'realtime' ? RealtimeCallSession : PrerecordedCallSession;
						const callSession = new CallSession(callSid, sid, ws, user, script);
						streams.set(sid, callSession);

						break;
					}

					case 'media':
					case 'mark': {
						if (!streams.has(sid)) return;
						// callType = 'prerecorded';
						const callSession = streams.get(sid);
						await callSession?.processEvent(data);

						break;
					}

					case 'stop': {
						if (!streams.has(sid)) return;
						const callSession = streams.get(sid);
						await callSession?.finish();
						streams.delete(sid);
						console.log(`stream stopped: ${sid}`);
						break;
					}
				}
			} catch (err) {
				console.log('Error:', err);
			}
		},

		close(ws) {
			for (const [sid, ctx] of streams.entries()) {
				if (ctx.ws === ws) streams.delete(sid);
			}
		}
	})
	.get('/ping', () => 'API is running')
	.listen(process.env.PORT || 3000);

console.log(`🦊 Server is running at ${app.server?.hostname}:${app.server?.port}`);

class PrerecordedCallSession {
	callType = 'prerecorded';
	pastSteps: any[] = [];
	currentStep: any;
	audioBuffer: Uint8Array[] = [];
	transcripts: string[] = [];
	gptResponses: string[] = [];
	callBegin = Date.now();

	constructor(
		public callSid: string,
		public streamSid: string,
		public ws: ElysiaWS,
		public user: any,
		public script: any
	) {
		this.currentStep = script.steps[0];
		if (!this.currentStep?.type) {
			this.currentStep.steps.shift();
			const label = this.currentStep.name;
			this.sendAudio(`${label}.wav`, label);
		} else {
			this.currentStep = { name: 'pre-opening' };
			const silence = getBlankMulawAudio(0.1);
			this.sendAudio(silence, 'pre-opening');
		}
	}

	async processEvent(data: any) {
		switch (data.event) {
			case 'media': {
				if (this.currentStep?.type !== 'listen') return;

				const chunk = decodeMulawChunk(data.media.payload);
				this.audioBuffer.push(chunk);

				break;
			}

			case 'mark': {
				if (data.mark.name === this.currentStep.name) {
					this.pastSteps.push(this.currentStep);
					this.currentStep = this.script.steps.shift();
					if (!this.currentStep) {
						return endCall(this.callSid);
					}

					if (this.currentStep?.type === 'conditional') {
						const buf = Buffer.concat(this.audioBuffer.map((chunk) => Buffer.from(chunk)));
						const transcript = await transcribeMulawBuffer(buf);
						this.transcripts.push(transcript);

						const prompt = getConditionalPrompt(
							this.currentStep.question,
							transcript,
							this.currentStep.prompt
						);
						const response = await OpenAI.chatGPT(prompt);
						this.gptResponses.push(response!);

						const fileName = `${
							this.currentStep?.[response?.toLowerCase() || this.currentStep?.default]
						}.wav`;
						await this.sendAudio(fileName, this.currentStep.name);

						this.audioBuffer = [];
					} else if (this.currentStep?.type === 'conditional-generated') {
						const buf = Buffer.concat(this.audioBuffer.map((chunk) => Buffer.from(chunk)));
						const transcript = await transcribeMulawBuffer(buf);
						this.transcripts.push(transcript);

						const prompt = getConditionalPrompt(
							this.currentStep.question,
							transcript,
							this.currentStep.prompt
						);
						const response = await OpenAI.chatGPT(prompt);
						this.gptResponses.push(response!);

						const template =
							this.currentStep?.[response?.toLowerCase() || this.currentStep?.default];
						const responseText = injectVars(template, { name: this.user.name });

						const wavBuf = await OpenAI.textToSpeech(responseText);
						const mulaw = await wavToMulawBase64(wavBuf);
						await this.sendAudio(mulaw, this.currentStep.name);

						this.audioBuffer = [];
					} else if (this.currentStep?.type === 'dynamic') {
						let response: any;

						if (this.currentStep.response) {
							response = injectVars(this.currentStep.response, {
								name: this.user.name
							});
						} else {
							const buf = Buffer.concat(this.audioBuffer.map((chunk) => Buffer.from(chunk)));
							const transcript = await transcribeMulawBuffer(buf);
							this.transcripts.push(transcript);

							const prompt = getDynamicPrompt(
								this.currentStep.question,
								transcript,
								this.currentStep.prompt,
								this.user.name
							);
							response = await OpenAI.chatGPT(prompt);
							this.gptResponses.push(response!);
						}

						const wavBuf = await OpenAI.textToSpeech(response!);
						const mulaw = await wavToMulawBase64(wavBuf);
						await this.sendAudio(mulaw, this.currentStep.name);

						this.audioBuffer = [];
					} else if (['listen', 'pause'].includes(this.currentStep?.type)) {
						const silence = getBlankMulawAudio(this.currentStep.duration);
						await this.sendAudio(silence, this.currentStep.name);
					} else {
						await this.sendAudio(`${this.currentStep.name}.wav`, this.currentStep.name);
					}
				}

				break;
			}
		}
	}

	async sendAudio(filenameOrAudio: string, mark: string) {
		console.log({ mark });
		const audio = filenameOrAudio.endsWith('.wav')
			? await getMulawBase64FromURL(S3.getURL(filenameOrAudio))
			: filenameOrAudio;

		this.ws.send(
			JSON.stringify({
				event: 'media',
				streamSid: this.streamSid,
				media: { payload: audio }
			})
		);

		await sleep(1);

		this.ws.send(
			JSON.stringify({
				event: 'media',
				streamSid: this.streamSid,
				media: { payload: getBlankMulawAudio(1) }
			})
		);

		await sleep(1);

		this.ws.send(
			JSON.stringify({
				event: 'mark',
				streamSid: this.streamSid,
				mark: { name: mark }
			})
		);
	}

	async finish() {
		const callTS = new Date(this.callBegin).toISOString();
		const callDuration = Math.round((Date.now() - this.callBegin) / 1000);
		// TODO: uncomment
		// await updateUserFields(this.user, callTS);

		const emailTemplates = await db
			.collection('emailTemplates')
			.where('day', '==', this.user.lastCallDay + 1)
			.limit(1)
			.get();

		let emailSent = false;

		if (!emailTemplates.empty) {
			const template = emailTemplates.docs[0].data();

			const variables = {
				...this.user,
				callDuration
			};

			// TODO: await SendGrid.sendEmail()
			// emailSent = true;
		}

		await createUserSession({
			phoneNumber: this.user.phoneNumber,
			callDay: this.user.lastCallDay + 1,
			transcripts: this.transcripts,
			gptResponses: this.gptResponses,
			callDuration,
			emailSent
		});
	}
}

class RealtimeCallSession {
	callType = 'realtime';
	rt = new OpenAIRealtimeWS({ model: 'gpt-4o-realtime-preview-2024-12-17' });
	transcript: any[] = [];

	constructor(
		public callSid: string,
		public streamSid: string,
		public ws: ElysiaWS,
		public user: any,
		public script: any
	) {
		this.rt.socket.on('open', () => {
			console.log('openai socket open');
			this.rt.send({
				type: 'session.update',
				session: {
					turn_detection: { type: 'server_vad' },
					input_audio_format: 'g711_ulaw',
					output_audio_format: 'g711_ulaw',
					voice: 'ballad',
					input_audio_transcription: {
						model: 'gpt-4o-transcribe',
						language: 'en'
					},
					instructions: `${
						this.script.systemPrompt ||
						`Use the script given below to guide the flow of conversation. If the user deviates, gently bring them back to align the conversation with the script. Don't let the user drag the conversation. Keep your tone upbeat and positive. Do not wait for the user to speak first. Preemptively start the conversation with "Hello, ${this.user.name}". At any point, do not pause talking unless it's to let the user answer a question you asked.`
					}
				
				Script:
				${injectVars(this.script.body, this.user)}
				
				Once you reach the end of the script, call the 'finished' function. Do not respond in any way once you've called 'finished'.`,
					modalities: ['text', 'audio'],
					tool_choice: 'auto',
					tools: [
						{
							name: 'finished',
							description: `Function to be called when you reach the end of the script.`,
							type: 'function'
						}
					]
				}
			});
		});

		this.rt.on('error', (err) => console.log('Error', err));

		this.rt.on('response.audio.delta', (data) => {
			this.ws.send(
				JSON.stringify({
					event: 'media',
					streamSid: this.streamSid,
					media: { payload: Buffer.from(data.delta, 'base64').toString('base64') }
				})
			);
		});

		this.rt.on('response.text.delta', (data) => {
			console.log('text', data.delta);
		});
		this.rt.on('conversation.item.input_audio_transcription.completed', (data) => {
			console.log('transcript', data.transcript);
		});

		this.rt.on('response.function_call_arguments.done', (data) => {
			console.log('func call done');

			this.finish();
		});

		// this.rt.on('response.function_call_arguments.delta', (data) => {
		// 	console.log('func call', data);

		// 	this.finish()
		// 		.finally(() => streams.delete(this.streamSid))
		// 		.catch(() => {});
		// });
	}

	async processEvent(data: any) {
		try {
			if (data.event === 'media' && this.rt.socket.readyState === this.rt.socket.OPEN) {
				this.rt.send({
					type: 'input_audio_buffer.append',
					audio: data.media.payload
				});
			}
		} catch (err) {
			console.log(err);
		}
	}

	async finish() {
		await Bun.sleep(2500);
		this.rt.close();
		streams.delete(this.streamSid);
	}
}

// async function test() {
// 	const res = fs.readFileSync('./audio/test.wav');
// 	const buf = Buffer.from(res);

// 	const dataOffset = buf.indexOf('data');
// 	if (dataOffset === -1) throw new Error('no data chunk found');

// 	const dataStart = dataOffset + 8;
// 	const rawMulaw = buf.subarray(dataStart);

// 	const transcript = await transcribeMulawBuffer(rawMulaw);
// 	console.log({ transcript });
// }

// test();

// async function test() {
// 	const users = await db
// 		.collection('users')
// 		.where('phoneNumber', '==', '+13412214799')
// 		.where('subscriptionStatus', '==', 'active')
// 		.limit(1)
// 		.get();

// 	if (users.empty) return;
// 	const user = { ...users.docs[0].data(), id: users.docs[0].id };
// 	console.log(user);
// }

// test();
