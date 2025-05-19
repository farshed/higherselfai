import { Elysia, t } from 'elysia';
import { twiml } from 'twilio';
import { db } from './services/firebase';
import { logger } from './middleware/logger';

const { VoiceResponse } = twiml;

const streams = new Map<string, { socket: any; meta: any }>();

const app = new Elysia()
	.use(logger)
	.post(
		'/twilio-webhook',
		async ({ body, set }) => {
			const phoneNumber = body.From!;
			const callSid = body.CallSid!;

			const users = await db.collection('users').where('age', '>', 25).get();
			const scripts = await db.collection('scripts').get();

			users.forEach((doc) => {
				console.log(doc.id, doc.data());
			});

			const response = new VoiceResponse();
			const connect = response.connect();
			connect.stream({ url: 'wss://your-server.com/stream' });

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

		message(ws, raw: any) {
			let data;
			try {
				data = JSON.parse(raw.toString());
			} catch {
				console.error('invalid json');
				return;
			}

			const sid = data.streamSid;
			switch (data.event) {
				case 'start': {
					const callSid = data.start.callSid;
					streams.set(sid, { socket: ws, meta: data.start });
					console.log(`stream started: ${sid}`);
					break;
				}

				case 'media': {
					if (!streams.has(sid)) return;
					const payload = data.media.payload;

					// echo back for demo
					ws.send(
						JSON.stringify({
							event: 'media',
							streamSid: sid,
							media: { payload }
						})
					);
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
