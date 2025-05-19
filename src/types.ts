export type User = {
	name: string;
	phoneNumber: string;
	timezone: string;
	subscriptionStatus: 'active' | 'inactive';
	currentCallDay: number;
	lastCallTimestamp?: string;
};

export type Script = {};

export type Session = {};

const script = {
	mp3s: {
		intro: 's3://higher-self/day5/intro.mp3',
		teaching: '...',
		prompt: '...',
		affirmation: '...'
	},
	gptPrompts: {
		closedQ1: '...',
		mainReflection: '...',
		closedQ2: '...'
	},
	task: 'Example…Practice shifting your dominant thought today.',
	nextTopic: 'Example…Tomorrow we begin Root Chakra grounding.',
	journalPrompt: 'Example…What belief am I ready to release?'
};

// {
// "callDay": 5,
// "date": "2024-06-10"
// ,
// "transcription": {
// "reflection": "
// ...
// "
// ,
// "closedQ1": "
// ...
// "
// ,
// "closedQ2": "
// ...
// "
// },
// "gptResponses": {
// "closedQ1": "
// ...
// "
// ,
// "mainReflection": "
// ...
// "
// ,
// "closedQ2": "
// ...
// "
// },
// "emailSent": true
// }
