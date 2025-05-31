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

const script2 = {
	day: 2,
	steps: [
		{ type: 'dynamic', name: 'opening', response: 'Hi {{name}}, how are you feeling today?' },
		// { type: 'pause', name: 'opening-pause-1', duration: 3 },
		{ type: 'listen', name: 'opening-listen', duration: 3 },
		{
			type: 'conditional',
			name: 'opening-question',
			question: `How are you feeling today?`,
			prompt: `Summarize their response in one word only: "yes" (in case of positive response) or "no" (in case of negative or absent response). Respond with only one of these words: "yes" or "no".`,
			yes: '2-opening-positive',
			no: '2-opening-negative',
			default: 'no'
		},

		{ name: '2-closed-question-1' },
		{ type: 'listen', name: 'closed-question-1-listen', duration: 5 },
		{
			type: 'conditional-generated',
			name: 'closed-question-1',
			question: `When opportunity shows up, what's your automatic move? Do you:
			A) Freeze
			B) Flee
			C) Take on the risk.`,
			prompt: `Summarize their response in one letter only: "a", "b", "c". Answer with "d" in case of no response. Respond with only one of these letter: "a", "b", "c", "d"`,
			a: `{{name}}, what you just said isn't who you are. It's who you've been conditioned to be. Let's rewrite that pattern starting now`,
			b: `{{name}}, what you just said isn't who you are. It's who you've been conditioned to be. Let's rewrite that pattern starting now`,
			c: `{{name}}, that's it. The Alpha doesn't need to be perfect — he just needs to move. You're already shifting.`,
			d: `Still loading your Alpha response? No worries {{name}}, whatever you are thinking isn't who you are. It's who you've been conditioned to be. Let's rewrite that pattern starting now`,
			default: 'd'
		},

		{ name: '2-story-segment' },

		{
			type: 'dynamic',
			name: 'closed-question-2',
			response: `{{name}}, which of these beliefs has been quietly playing in your background? 
			I'm not interesting enough, I'll probably mess it up, I know I have it — but I'm afraid to prove it.
	
			Let me repeat, which of these beliefs has been quietly playing in your background?
I'm not interesting enough
I'll probably mess it up
I know I have it — but I'm afraid to prove it.`
		},
		{ type: 'listen', name: 'closed-question-2-listen', duration: 5 },
		{
			type: 'conditional-generated',
			name: 'closed-question-2',
			question: `which of these beliefs has been quietly playing in your background?
A) I'm not interesting enough
B) I'll probably mess it up
C) I know I have it — but I'm afraid to prove it.`,
			prompt: `Summarize their response in one letter only: "a", "b", "c". Answer with "d" in case of no response. Respond with only one of these letter: "a", "b", "c", "d"`,
			a: `{{name}}, that belief is just a leftover download — it's not truth. You're rewriting the code now`,
			b: `{{name}}, that belief is just a leftover download — it's not truth. You're rewriting the code now`,
			c: `{{name}}, that's the edge — not fear of failure, but fear of becoming undeniable. That fear? It's fuel.`,
			d: `{{name}}, that belief is just a leftover download — it's not truth. You're rewriting the code now`,
			default: 'd'
		},

		{ name: '2-teaching' },
		{
			type: 'dynamic',
			name: '2-teaching-dynamic',
			response: '{{name}}, that pause is where power begins.'
		},

		{ type: '2-reflection' },
		{ type: 'listen', name: 'reflection-listen', duration: 5 },

		{
			type: 'dynamic',
			name: '2-reflection-response',
			question: `Say this out loud — even in a whisper: If I was already the man, I would ______. It could be
something like: "I'd walk up and introduce myself, I'd speak with confidence in the meeting, or I'd stop doubting myself and take the next step." Now — go. Say it out loud.`,
			prompt: `Acting as an enlightenment and spiritual guru, help the user explore their thoughts and feelings by providing a response that. Output nothing else but the response.
	1. Mirror the user's response (if provided).
	2. Connect that response to growth.
	3. Offer encouragement, reflection, and a next step.
	4. Keep it under ~80 words.`
		},

		{ name: '2-closing-affirmation-1' },
		{ type: 'pause', name: '2-closing-affirmation-1-pause', duration: 3 },
		{ name: '2-closing-affirmation-2' },
		{ type: 'pause', name: '2-closing-affirmation-2-pause', duration: 3 },
		{ name: '2-closing-affirmation-3' },
		{ type: 'pause', name: '2-closing-affirmation-3-pause', duration: 3 },
		{ name: '2-closing-affirmation-4' },
		{ type: 'pause', name: '2-closing-affirmation-4-pause', duration: 3 },
		{ name: '2-closing-affirmation-5' },
		{ type: 'pause', name: '2-closing-affirmation-5-pause', duration: 3 },
		{ name: '2-closing-affirmation-6' },
		{ type: 'pause', name: '2-closing-affirmation-6-pause', duration: 3 },

		{
			type: 'dynamic',
			name: '2-closing',
			response: `{{name}}, before tomorrow's call — check your email. It'll prep you for Day 2: The Law of Polarity — where we shift you from internal conflict… to magnetic power. Learning Polarity helps you become the balanced, focused, attractive version of yourself that people naturally follow. You've already started. And this is just Day 1.`
		}
	]
};

// const script2 = {
// 	day: 1,
// 	steps: [
// 		{ name: '2-opening-1' },
// 		{ type: 'pause', name: 'opening-pause', duration: 3 },
// 		{ name: '2-opening-2' },
// 		{ name: '2-closed-question' },
// 		{ type: 'listen', name: 'blank', duration: 5 },
// 		{
// 			type: 'repeatable-conditional',
// 			name: 'closed-question',
// 			question: `When opportunity shows up — whether it's the moment you catch the eye of a beautiful girl from across the room, or the chance to speak up, apply, or take a bold step toward something you want — what's your automatic move?`,
// 			a: '2-closed-question-a-b',
// 			b: '2-closed-question-a-b',
// 			c: '2-closed-question-c',
// 			none: '2-do-you-want-me-to-repeat'
// 		},

// 		{
// 			type: 'conditional-',
// 			name: 'conditional',
// 			question: `Would you like me to repeat the question?`,
// 			yes: '1-what-the-program-is-yes',
// 			no: '1-what-the-program-is-no'
// 		},

// 		{ name: '1-how-the-program-works' },
// 		{ name: '1-how-it-works-practically' },
// 		{ name: '1-teaching' },
// 		{ name: '1-preview-of-tomorrow' },
// 		{ name: '1-closing-affirmation' }
// 	]
// };

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
