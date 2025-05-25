import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import { PassThrough } from 'stream';
import ffmpegPath from 'ffmpeg-static';

export async function getMulawBase64FromURL(url: string) {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`failed to fetch: ${res.status}`);

	const buf = Buffer.from(await res.arrayBuffer());

	const dataOffset = buf.indexOf('data');
	if (dataOffset === -1) throw new Error('no data chunk found');

	const dataStart = dataOffset + 8;
	const rawMulaw = buf.subarray(dataStart);

	return rawMulaw.toString('base64');
}

export function decodeMulawChunk(payload: string) {
	const buf = Buffer.from(payload, 'base64');
	return new Uint8Array(buf);
}

export function getBlankMulawAudio(secs: number) {
	return Buffer.from(new Uint8Array(secs * 8000).fill(0xff)).toString('base64');
}

export async function wavToMulawBase64(wavBuffer: Buffer): Promise<string> {
	return new Promise((resolve, reject) => {
		const input = new PassThrough();
		const outputChunks: any[] = [];

		const ffmpeg = spawn(ffmpegPath!, [
			'-hide_banner',
			'-loglevel',
			'error',
			'-f',
			'wav',
			'-i',
			'pipe:0',
			'-ar',
			'8000',
			'-ac',
			'1',
			'-f',
			'mulaw',
			'pipe:1'
		]);

		ffmpeg.stdout.on('data', (chunk) => outputChunks.push(chunk));
		ffmpeg.stderr.on('data', (err) => reject(new Error(err.toString())));
		ffmpeg.on('error', reject);
		ffmpeg.on('close', (code) => {
			if (code !== 0) return reject(new Error(`ffmpeg exited with code ${code}`));
			const mulawBuffer = Buffer.concat(outputChunks);
			const base64 = mulawBuffer.toString('base64');
			resolve(base64);
		});

		input.pipe(ffmpeg.stdin);
		input.end(wavBuffer);
	});
}

export class MulawToWavStream {
	ffmpeg: ChildProcessWithoutNullStreams;
	input: PassThrough;
	output: PassThrough;

	constructor({
		inputRate = 8000,
		outputRate = 16000,
		inputEncoding = 'mulaw',
		outputEncoding = 'wav',
		channels = 1
	} = {}) {
		this.ffmpeg = spawn(ffmpegPath!, [
			'-f',
			inputEncoding,
			'-ar',
			inputRate.toString(),
			'-ac',
			channels.toString(),
			'-i',
			'pipe:0',
			'-ar',
			outputRate.toString(),
			'-ac',
			channels.toString(),
			'-f',
			outputEncoding,
			'pipe:1'
		]);

		this.input = new PassThrough();
		this.output = new PassThrough();

		this.input.pipe(this.ffmpeg.stdin);
		this.ffmpeg.stdout.pipe(this.output);

		this.ffmpeg.stderr.on('data', () => {});

		this.ffmpeg.on('error', (err) => {
			console.error('ffmpeg error:', err);
		});

		this.ffmpeg.on('exit', (code) => {
			if (code !== 0) {
				console.error(`ffmpeg exited with code ${code}`);
			}
		});
	}

	write(chunk: any) {
		this.input.write(chunk);
	}

	end() {
		this.input.end();
	}

	getOutputBuffer() {
		return new Promise((resolve, reject) => {
			const chunks: any[] = [];
			this.output.on('data', (chunk) => chunks.push(chunk));
			this.output.on('end', () => resolve(Buffer.concat(chunks)));
			this.output.on('error', reject);
		});
	}

	getOutputStream() {
		return this.output;
	}
}
