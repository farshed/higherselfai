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
// 		name: 'Faisal',
// 		phoneNumber: '+13412214799',
// 		timezone: 'UTC+5',
// 		subscriptionStatus: 'active',
// 		lastCallDay: 0,
// 		lastCallTimestamp: null
// 	})
// 	.then((res) => console.log(res.id));

db.collection('emailTemplates')
	.add({
		day: 1,
		subject: 'HigherSelf Journal',
		body: `<p>Email body</p>`
	})
	.then((res) => console.log(res.id));

// db.collection('scripts')
// 	.add({
// 		day: 1,
// 		steps: [
// 			{ name: '1-opening' },
// 			{ name: '1-what-the-program-is' },
// 			{
// 				type: 'listen',
// 				name: 'blank',
// 				duration: 5
// 			},
// 			{
// 				type: 'conditional',
// 				question: `Have you ever intentionally taken a moment to connect with your Higher Self before today?`,
// 				yes: '1-what-the-program-is-yes',
// 				no: '1-what-the-program-is-no'
// 			},
// 			{ name: '1-how-the-program-works' },
// 			{ name: '1-how-it-works-practically' },
// 			{ name: '1-teaching' },
// 			{ name: '1-preview-of-tomorrow' },
// 			{ name: '1-closing-affirmation' }
// 		]
// 	})
// 	.then((res) => console.log(res.id));
