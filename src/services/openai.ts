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
			model: 'tts-1',
			input,
			voice: 'alloy',
			response_format: 'wav',
			speed: 1.0
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

export function getConditionalPrompt(question: string, response: string) {
	return `I asked the user "${question}".
	
	They responded with "${response}".
	
	Summarize their response in one word only: "yes" or "no". Respond with only one of these words: "yes" or "no".`;
}

export function getDynamicPrompt(question: string, response: string) {
	return `I asked the user "${question}".
	
	They responded with "${response}".
	
	Acting as an enlightenment and spiritual guru, help the user explore their thoughts and feelings by providing an insightful response that helps them reflect.`;
}
