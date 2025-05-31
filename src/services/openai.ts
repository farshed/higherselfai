import OpenAIClient from 'openai';
import { File } from 'node:buffer';
import { MulawToWavStream } from './audio';

const openai = new OpenAIClient({
	apiKey: process.env.OPENAI_API_KEY
});

export class OpenAI {
	static async chatGPT(prompt: string) {
		const chat = await openai.chat.completions.create({
			model: 'gpt-3.5-turbo',
			messages: [{ role: 'user', content: prompt }]
		});

		const response = chat.choices[0].message.content;
		return response;
	}

	static async textToSpeech(input: string) {
		const audio = await openai.audio.speech.create({
			// model: 'tts-1',
			model: 'gpt-4o-mini-tts',
			input,
			// voice: 'alloy',
			voice: 'ballad',
			response_format: 'wav',
			speed: 1.0,
			instructions: `Voice: Warm, upbeat, and reassuring, with a steady and confident cadence that keeps the conversation calm and productive.

Tone: Positive and solution-oriented, always focusing on the next steps rather than dwelling on the problem.

Dialect: Neutral and professional, avoiding overly casual speech but maintaining a friendly and approachable style.

Pronunciation: Clear and precise, with a natural rhythm that emphasizes key words to instill confidence and keep the customer engaged.

Features: Uses empathetic phrasing, gentle reassurance, and proactive language to shift the focus from frustration to resolution.`
		});

		const audioBuffer = Buffer.from(await audio.arrayBuffer());
		return audioBuffer;
	}
}

export async function transcribeMulawBuffer(muLawBuffer: Buffer) {
	const transcoder = new MulawToWavStream();
	transcoder.write(muLawBuffer);
	transcoder.end();

	const wavBuffer: any = await transcoder.getOutputBuffer();
	const file = new File([wavBuffer], 'input.wav', { type: 'audio/wav' });

	const transcript = await openai.audio.transcriptions.create({
		file,
		model: 'whisper-1',
		response_format: 'text'
	});

	return transcript;
}

export function getConditionalPrompt(question: string, response: string, prompt: string) {
	return `I asked the user "${question}".
They responded with "${response}".

${prompt}`;
}

export function getDynamicPrompt(
	question: string,
	response: string,
	prompt: string,
	username: string
) {
	return `I asked the user "${question}".
	They responded with "${response}".
	
${prompt}
	
The user's name is ${username}. You may use that in your response.`;
}
