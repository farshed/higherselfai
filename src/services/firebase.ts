import admin from 'firebase-admin';
import serviceAccount from '../../serviceAccountKey.json';

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount as any)
});

export const db = admin.firestore();

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
