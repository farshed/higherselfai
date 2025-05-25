import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import { PassThrough } from 'stream';

ffmpeg.setFfmpegPath(ffmpegPath!);

// class CallSession {
//   constructor(streamSid, websocket, script) {
//     this.sid = streamSid
//     this.ws = websocket
//     this.script = script
//     this.state = {} // anything you want to track
//     this.index = 0
//     this.waitingForUser = false
//     this.audioBuffer = []
//   }

//   async start() {
//     while (this.index < this.script.length) {
//       const step = this.script[this.index]

//       if (step.type === 'static') {
//         await this.sendAudio(step.audioUrl)
//       }

//       if (step.type === 'conditional') {
//         await this.sendAudio(step.questionAudioUrl)
//         const userText = await this.waitForUserResponse()
//         const choice = step.condition(userText) ? step.ifTrue : step.ifFalse
//         await this.sendAudio(choice)
//       }

//       if (step.type === 'dynamic') {
//         const userText = await this.waitForUserResponse()
//         const aiResponseAudio = await generateAudioFromAi(step.prompt, userText)
//         await this.sendAudio(aiResponseAudio)
//       }

//       this.index++
//     }

//     this.ws.close()
//   }

//   async sendAudio(audioUrlOrData) {
//     // fetch -> ffmpeg transcode -> base64 encode -> chunk + send every ~20ms
//     const b64 = await getBase64MulawAudio(audioUrlOrData)
//     const chunks = splitIntoChunks(b64, 214)
//     for (const chunk of chunks) {
//       this.ws.send(JSON.stringify({
//         event: 'media',
//         streamSid: this.sid,
//         media: { payload: chunk }
//       }))
//       await sleep(20) // pacing
//     }
//   }

//   waitForUserResponse() {
//     return new Promise((resolve) => {
//       this.waitingForUser = resolve
//     })
//   }

//   handleIncomingUserAudio(text) {
//     if (this.waitingForUser) {
//       this.waitingForUser(text)
//       this.waitingForUser = null
//     }
//   }
// }

function linearToMulaw(sample: number): number {
	const MULAW_MAX = 0x1fff;
	const BIAS = 0x84;
	let sign = (sample >> 8) & 0x80;
	if (sign) sample = -sample;
	sample = Math.min(sample + BIAS, MULAW_MAX);

	const exponent = Math.floor(Math.log2(sample)) - 5;
	const mantissa = (sample >> (exponent + 3)) & 0x0f;
	const mulaw = ~(sign | ((exponent << 4) & 0x70) | mantissa);
	return mulaw & 0xff;
}

export async function getMulawBase64FromURL(url: string) {
	console.log('url', url);
	const res = await fetch(url);
	if (!res.ok) throw new Error(`fetch failed: ${res.status}`);

	// const inputStream = res.body;
	// const outputStream = new PassThrough();
	// const chunks: any[] = [];

	// return new Promise((resolve, reject) => {
	// 	ffmpeg(inputStream as any)
	// 		.format('mulaw')
	// 		.audioFrequency(8000)
	// 		.audioChannels(1)
	// 		.outputOptions('-f mulaw')
	// 		.on('error', reject)
	// 		.on('end', () => {
	// 			const raw = Buffer.concat(chunks);
	// 			const b64 = raw.toString('base64');
	// 			resolve(b64);
	// 		})
	// 		.pipe(outputStream);

	// 	outputStream.on('data', (chunk) => chunks.push(chunk));
	// });

	const buf = Buffer.from(await res.arrayBuffer());

	const dataOffset = buf.indexOf('data') + 8;
	const pcm = buf.subarray(dataOffset);

	const mulaw = new Uint8Array(pcm.length / 2);

	for (let i = 0; i < pcm.length; i += 2) {
		const sample = buf.readInt16LE(dataOffset + i);
		mulaw[i / 2] = linearToMulaw(sample);
	}

	return Buffer.from(mulaw).toString('base64');
}

export async function getMulawFromURL(url: string) {
	console.log('url', url);
	const res = await fetch(url);
	if (!res.ok) throw new Error(`fetch failed: ${res.status}`);

	const buf = Buffer.from(await res.arrayBuffer());

	const dataOffset = buf.indexOf('data') + 8;
	const pcm = buf.subarray(dataOffset);

	const mulaw = new Uint8Array(pcm.length / 2);

	for (let i = 0; i < pcm.length; i += 2) {
		const sample = buf.readInt16LE(dataOffset + i);
		mulaw[i / 2] = linearToMulaw(sample);
	}

	return mulaw;
}

export function decodeMulawChunk(payload: string) {
	const buf = Buffer.from(payload, 'base64');
	return new Uint8Array(buf);
}

export function getBlankMulawAudio(secs: number) {
	return Buffer.from(new Uint8Array(secs * 8000).fill(0xff)).toString('base64');
}
