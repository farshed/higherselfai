import { Elysia, t } from 'elysia';
import { twiml } from 'twilio';
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

const { VoiceResponse } = twiml;

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
						const callSession = new CallSession(callSid, sid, ws, user, script);
						streams.set(sid, callSession);

						break;
					}

					case 'media':
					case 'mark': {
						if (!streams.has(sid)) return;
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

class CallSession {
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
		this.currentStep = script.steps.shift();
		if (this.currentStep) {
			this.sendAudio(this.currentStep.name);
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
					this.currentStep = this.script.steps.shift();
					if (!this.currentStep) {
						return endCall(this.callSid);
					}

					if (this.currentStep?.type === 'conditional') {
						const buf = Buffer.concat(this.audioBuffer.map((chunk) => Buffer.from(chunk)));
						const transcript = await transcribeMulawBuffer(buf);
						this.transcripts.push(transcript);

						const prompt = getConditionalPrompt(this.currentStep.question, transcript);
						const response = await OpenAI.chatGPT(prompt);
						await this.sendAudio(this.currentStep?.[response?.toLowerCase() || 'no']);

						this.audioBuffer = [];
					} else if (this.currentStep?.type === 'dynamic') {
						const buf = Buffer.concat(this.audioBuffer.map((chunk) => Buffer.from(chunk)));
						const transcript = await transcribeMulawBuffer(buf);
						this.transcripts.push(transcript);

						const prompt = getDynamicPrompt(this.currentStep.question, transcript);
						const response = await OpenAI.chatGPT(prompt);
						this.gptResponses.push(response!);
						const wavBuf = await OpenAI.textToSpeech(response!);

						const mulaw = await wavToMulawBase64(wavBuf);
						await this.sendAudio(this.currentStep.name, mulaw);

						this.audioBuffer = [];
					} else {
						await this.sendAudio(this.currentStep.name);
					}
				}

				break;
			}
		}
	}

	async sendAudio(fileName: string, base64Audio?: string) {
		console.log({ fileName });
		let audio = base64Audio;

		if (!audio) {
			audio =
				fileName === 'blank'
					? getBlankMulawAudio(this.currentStep.duration)
					: await getMulawBase64FromURL(S3.getURL(`${fileName}.wav`));
		}

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
				mark: { name: fileName }
			})
		);
	}

	async finish() {
		const callTS = new Date(this.callBegin).toISOString();
		await updateUserFields(this.user, callTS);

		const emailTemplates = await db
			.collection('emailTemplates')
			.where('day', '==', this.user.lastCallDay + 1)
			.limit(1)
			.get();

		let emailSent = false;

		if (!emailTemplates.empty) {
			const template = emailTemplates.docs[0].data();

			// TODO: await SendGrid.sendEmail()
			emailSent = true;
		}

		await createUserSession({
			phoneNumber: this.user.phoneNumber,
			callDay: this.user.lastCallDay + 1,
			transcripts: this.transcripts,
			gptResponses: this.gptResponses,
			callDuration: Date.now() - this.callBegin,
			emailSent
		});
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
