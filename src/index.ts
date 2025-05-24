import { Elysia, t } from 'elysia';
import { twiml } from 'twilio';
import { db } from './services/firebase';
import { logger } from './middleware/logger';
import { decodeMulawChunk, getMulawBase64FromUrl } from './services/audio';
import { S3 } from './services/s3';
import { sleep } from 'bun';
import type { ElysiaWS } from 'elysia/ws';

const { VoiceResponse } = twiml;

const streams = new Map<
	string,
	{
		callSid: string;
		user: any;
		script: any;
		shouldRecord: boolean;
		audioBuffer: Uint8Array[];
		socket: any;
		meta: any;
	}
>();
const callers = new Map<string, { user: any; script: any }>();

function getCaller(streamSid: string) {
	const stream = streams.get(streamSid);
	if (!stream) return null;

	return callers.get(stream.callSid) || null;
}

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

			callers.set(callSid, { user, script });

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
		open(ws) {
			// wait for 'start' to bind context
		},

		async message(ws, data: any) {
			const sid = data.streamSid;

			switch (data.event) {
				case 'start': {
					const caller = getCaller(sid);
					if (!caller) return;

					const callSid = data.start.callSid;

					const { script, user } = caller;
					// const step = script.steps.pop();
					// if (!step) return;

					const callSession = new CallSession(callSid, sid, ws, user, script);

					streams.set(sid, callSession);

					// streams.set(sid, {
					// 	callSid,
					// 	user: caller.user,
					// 	script: caller.script,
					// 	shouldRecord: ['dynamic', 'conditional'].includes(step.type),
					// 	audioBuffer: [],
					// 	socket: ws,
					// 	meta: data.start
					// });

					if (!step.type) {
						await sendAudio(ws, sid, step.name);
					} else if (step.type === 'conditional') {
					} else if (step.type === 'dynamic') {
					}

					console.log(`stream started: ${sid}`);
					break;
				}

				case 'mark': {
					break;
				}

				case 'media': {
					if (!streams.has(sid)) return;
					const stream = streams.get(sid);

					if (stream?.shouldRecord) {
						const chunk = decodeMulawChunk(data.media.payload);
						stream.audioBuffer.push(chunk);
					}

					break;
				}

				case 'stop': {
					console.log(`stream stopped: ${sid}`);
					streams.delete(sid);
					break;
				}

				default:
					console.log(`unhandled event: ${data.event}`);
			}
		},

		close(ws) {
			for (const [sid, ctx] of streams.entries()) {
				if (ctx.socket === ws) streams.delete(sid);
			}
		}
	})
	.get('/ping', () => 'API is running')
	.listen(process.env.PORT || 3000);

console.log(`🦊 Server is running at ${app.server?.hostname}:${app.server?.port}`);

async function sendAudio(ws: ElysiaWS, sid: string, fileName: string) {
	const audio = await getMulawBase64FromUrl(S3.getURL(`${fileName}.wav`));
	ws.send(
		JSON.stringify({
			event: 'media',
			streamSid: sid,
			media: { payload: audio }
		})
	);

	await sleep(1);

	ws.send(
		JSON.stringify({
			event: 'mark',
			streamSid: sid,
			mark: { name: fileName }
		})
	);
}

class CallSession {
	currentStep: any;
	audioBuffer: Uint8Array[] = [];

	constructor(
		private callSid: string,
		private streamSid: string,
		private ws: ElysiaWS,
		private user: any,
		private script: any
	) {
		this.currentStep = script.steps.pop();
		if (this.currentStep) {
			this.sendAudio(this.currentStep.name);
		}
	}

	processEvent(data: any) {
		const sid = data.streamSid;

		switch (data.event) {
			case 'media': {
				if (this.currentStep.type !== 'listen') return;

				const chunk = decodeMulawChunk(data.media.payload);
				this.audioBuffer.push(chunk);

				break;
			}

			case 'mark': {
				break;
			}
		}
	}

	async sendAudio(fileName: string) {
		const audio = await getMulawBase64FromUrl(S3.getURL(`${fileName}.wav`));
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
				event: 'mark',
				streamSid: this.streamSid,
				mark: { name: fileName }
			})
		);
	}
}
