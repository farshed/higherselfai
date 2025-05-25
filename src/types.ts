export type User = {
	name: string;
	phoneNumber: string;
	email: string;
	timezone: string;
	subscriptionStatus: 'active' | 'inactive';
	currentCallDay: number;
	lastCallTimestamp?: string;
};

export type Script = {};

export type Session = {};

const script = {
	day: 1,
	steps: [
		{ name: '1-opening' },
		{ name: '1-what-the-program-is' },
		{
			type: 'listen',
			name: 'blank',
			duration: 5
		},
		{
			type: 'conditional',
			name: 'conditional',
			question: `Have you ever intentionally taken a moment to connect with your Higher Self before today?`,
			yes: '1-what-the-program-is-yes',
			no: '1-what-the-program-is-no'
		},
		{ name: '1-how-the-program-works' },
		{ name: '1-how-it-works-practically' },
		{ name: '1-teaching' },
		{ name: '1-preview-of-tomorrow' },
		{ name: '1-closing-affirmation' }
	]
};

// {
// "callDay": 5,
// "date": "2024-06-10",
// "userResponses": {
// 	"reflection": "...",
// 	"closedQ1": "...",
// 	"closedQ2": "..."
// },
// "gptResponses": {
// "closedQ1": "...",
// "mainReflection": "...",
// "closedQ2": "..."
// },
// "emailSent": true
// }
