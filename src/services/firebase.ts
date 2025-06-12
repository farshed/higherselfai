import admin from 'firebase-admin';
import serviceAccount from '../../serviceAccountKey.json';

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount as any)
});

export const db = admin.firestore();

export async function updateUserFields(user: any, lastCallTimeStamp: string) {
	return db
		.collection('users')
		.doc(user.id)
		.update({
			lastCallDay: admin.firestore.FieldValue.increment(1),
			lastCallTimeStamp
		});
}

export async function createUserSession(session: any) {
	const { id } = await db.collection('sessions').add({
		...session,
		date: new Date().toISOString()
	});
	return id;
}

// db.collection('users')
// 	.add({
// 		name: 'Michael',
// 		phoneNumber: '+13133207775',
// 		email: 'ruvested@gmail.com',
// 		timezone: 'UTC-4',
// 		subscriptionStatus: 'active',
// 		lastCallDay: 0,
// 		lastCallTimestamp: null
// 	})
// 	.then((res) => console.log(res.id));

// db.collection('emailTemplates')
// 	.add({
// 		day: 1,
// 		subject: 'HigherSelf Journal',
// 		body: `<p>Email body</p>`
// 	})
// 	.then((res) => console.log(res.id));

// db.collection('scripts')
// 	.add({
// 		day: 2,
// 		steps: [
// 			{ type: 'dynamic', name: 'opening', response: 'Hi {{name}}, how are you feeling today?' },
// 			{ type: 'listen', name: 'opening-listen', duration: 3 },
// 			{
// 				type: 'conditional',
// 				name: 'opening-question',
// 				question: `How are you feeling today?`,
// 				prompt: `Summarize their response in one word only: "yes" (in case of positive response) or "no" (in case of negative or absent response). Respond with only one of these words: "yes" or "no".`,
// 				yes: '2-opening-positive',
// 				no: '2-opening-negative',
// 				default: 'no'
// 			},

// 			{ name: '2-closed-question-1' },
// 			{ type: 'listen', name: 'closed-question-1-listen', duration: 5 },
// 			{
// 				type: 'conditional-generated',
// 				name: 'closed-question-1',
// 				question: `When opportunity shows up, what's your automatic move? Do you:
// 			A) Freeze
// 			B) Flee
// 			C) Take on the risk.`,
// 				prompt: `Summarize their response in one letter only: "a", "b", "c". Answer with "d" in case of no response. Respond with only one of these letter: "a", "b", "c", "d"`,
// 				a: `{{name}}, what you just said isn't who you are. It's who you've been conditioned to be. Let's rewrite that pattern starting now`,
// 				b: `{{name}}, what you just said isn't who you are. It's who you've been conditioned to be. Let's rewrite that pattern starting now`,
// 				c: `{{name}}, that's it. The Alpha doesn't need to be perfect — he just needs to move. You're already shifting.`,
// 				d: `Still loading your Alpha response? No worries {{name}}, whatever you are thinking isn't who you are. It's who you've been conditioned to be. Let's rewrite that pattern starting now`,
// 				default: 'd'
// 			},

// 			{ name: '2-story-segment' },

// 			{
// 				type: 'dynamic',
// 				name: 'closed-question-2',
// 				response: `{{name}}, which of these beliefs has been quietly playing in your background?
// 			I'm not interesting enough, I'll probably mess it up, I know I have it — but I'm afraid to prove it.

// 			Let me repeat, which of these beliefs has been quietly playing in your background?
// I'm not interesting enough
// I'll probably mess it up
// I know I have it — but I'm afraid to prove it.`
// 			},
// 			{ type: 'listen', name: 'closed-question-2-listen', duration: 5 },
// 			{
// 				type: 'conditional-generated',
// 				name: 'closed-question-2',
// 				question: `which of these beliefs has been quietly playing in your background?
// A) I'm not interesting enough
// B) I'll probably mess it up
// C) I know I have it — but I'm afraid to prove it.`,
// 				prompt: `Summarize their response in one letter only: "a", "b", "c". Answer with "d" in case of no response. Respond with only one of these letter: "a", "b", "c", "d"`,
// 				a: `{{name}}, that belief is just a leftover download — it's not truth. You're rewriting the code now`,
// 				b: `{{name}}, that belief is just a leftover download — it's not truth. You're rewriting the code now`,
// 				c: `{{name}}, that's the edge — not fear of failure, but fear of becoming undeniable. That fear? It's fuel.`,
// 				d: `{{name}}, that belief is just a leftover download — it's not truth. You're rewriting the code now`,
// 				default: 'd'
// 			},

// 			{ name: '2-teaching' },
// 			{
// 				type: 'dynamic',
// 				name: '2-teaching-dynamic',
// 				response: '{{name}}, that pause is where power begins.'
// 			},

// 			{ name: '2-reflection' },
// 			{ type: 'listen', name: 'reflection-listen', duration: 5 },

// 			{
// 				type: 'dynamic',
// 				name: '2-reflection-response',
// 				question: `Say this out loud — even in a whisper: If I was already the man, I would ______. It could be
// something like: "I'd walk up and introduce myself, I'd speak with confidence in the meeting, or I'd stop doubting myself and take the next step." Now — go. Say it out loud.`,
// 				prompt: `Acting as an enlightenment and spiritual guru, help the user explore their thoughts and feelings by providing a response that. Output nothing else but the response.
// 	1. Mirror the user's response (if provided).
// 	2. Connect that response to growth.
// 	3. Offer encouragement, reflection, and a next step.
// 	4. Keep it under ~80 words.`
// 			},

// 			{ name: '2-closing-affirmation-1' },
// 			{ type: 'pause', name: '2-closing-affirmation-1-pause', duration: 3 },
// 			{ name: '2-closing-affirmation-2' },
// 			{ type: 'pause', name: '2-closing-affirmation-2-pause', duration: 3 },
// 			{ name: '2-closing-affirmation-3' },
// 			{ type: 'pause', name: '2-closing-affirmation-3-pause', duration: 3 },
// 			{ name: '2-closing-affirmation-4' },
// 			{ type: 'pause', name: '2-closing-affirmation-4-pause', duration: 3 },
// 			{ name: '2-closing-affirmation-5' },
// 			{ type: 'pause', name: '2-closing-affirmation-5-pause', duration: 3 },
// 			{ name: '2-closing-affirmation-6' },
// 			{ type: 'pause', name: '2-closing-affirmation-6-pause', duration: 3 },

// 			{
// 				type: 'dynamic',
// 				name: '2-closing',
// 				response: `{{name}}, before tomorrow's call — check your email. It'll prep you for Day 2: The Law of Polarity — where we shift you from internal conflict… to magnetic power. Learning Polarity helps you become the balanced, focused, attractive version of yourself that people naturally follow. You've already started. And this is just Day 1.`
// 			}
// 		]
// 	})
// 	.then((res) => console.log(res.id));

// db.collection('scripts').add({
// 	type: 'realtime',
// 	body: `You are FutureAlpha, a real-time voice-based identity coach. You speak directly to young men
// who want to become more confident, grounded, and focused. You don’t sound like a therapist.
// You’re calm, sharp, masculine, and emotionally aware.

// You are guiding {{name}} through his first voice session. Your tone is direct but grounded,
// motivational but not hype.
// Begin with a welcome, then ask what he wants to achieve with this program. When he answers,
// mirror it — and embed how FutureAlpha will help him reach that exact goal. Explain the
// program structure and emphasize the importance of the pre-call emails for maximum results.
// Ask a second reflection question about what’s been blocking him, mirror it, and finish by
// assigning today’s mission and previewing Call 2 on the Hermetic Law of Mentalism.
// Say his name three times. Prioritize connection over complexity. Focus on inner rewiring over
// outer hacks.
// Reflection Question 1 – Identity Intent
// “Let’s cut straight to it:
// What do you want to achieve with this program?
// Say it out loud, no filter.”
// 🕓 Wait for voice input
// 🎯 GPT Response: Mirror + Personalized Framing
// “Okay, so your goal is: ‘[insert user response]’.
// That tells me you’re ready for more than just surface-level change —
// You’re ready to rewire who you are at the source.
// That’s exactly what FutureAlpha was built for.”
// “This isn’t motivation. This is transformation.
// FutureAlpha is a system that guides you — daily — to become the version of you
// who already gets the results you’re chasing.
// And it does it through a unique blend of spiritual science and behavioral
// psychology — built around the way your mind actually works.”
// 📬 How It Works – Including Daily Email Review
// “Here’s how it works:
// 📩 Each day starts with a quick pre-call email.
// It gives you the focus, questions, and energy to bring into the session.
// 🧠 Then you hop on a 7-minute voice call like this — where we train your mind
// using:
// ● The Hermetic Principles – the universal rules reality follows
// ● Your RAS – the Reticular Activating System that controls what you see,
// notice, and attract
// ● And your Big 5 Personality Wiring – so it’s custom to how you think and
// move
// You’re not reacting anymore, {{name}}. You’re repatterning.”
// ⚡️ Reflection Question 2 – Blocker
// “Now let me ask you something deeper:
// What’s been holding you back lately?
// Is it fear? Lack of clarity? Too many distractions?
// Name what’s been making progress feel hard.”
// 🕓 Wait for voice input
// 🎯 GPT Mirrors Response
// “Thanks for being real.
// You said: ‘[user’s blocker]’ — and that’s the loop we’re going to break.
// Most guys try to push through that with willpower.
// You? You’re going to reprogram it.”
// 🧭 Reframing Identity
// “Every single day from here on, you’re going to take small aligned steps.
// No ego. No faking it.
// Just consistent momentum toward the FutureAlpha version of you.”
// “You’re here because you're ready to stop outsourcing your power — and start
// building it inside.”
// 🧠 Daily Mission – Observation Activation
// “Here’s your mission for today, {{name}}:
// Start paying attention to the voice in your head.
// Not to change it — just to notice it.
// Notice how it talks when you feel uncertain… or challenged… or when nobody’s
// watching.”
// “Awareness is step one.
// We shape it tomorrow.”
// 🔮 Close + Preview of Call 2 (Mentalism)
// “{{name}} — this is a new rhythm you’re stepping into.
// A daily system designed to sharpen who you are and how you show up.”
// “Tomorrow, we begin with the first Hermetic Principle:
// 🧠 Mentalism — the law that says your thoughts literally form your experience.
// Change your thoughts… and you change your path.
// I’ll show you how.”
// “So today: read your pre-call email. Reflect on the voice inside.
// And I’ll meet you back here tomorrow.”
// Let’s move, {{name}}. This is just the beginning.`
// });
