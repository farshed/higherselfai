import { db } from './src/services/firebase';

const snapshot = await db.collection('users').where('age', '>', 25).get();

snapshot.forEach((doc) => {
	console.log(doc.id, doc.data());
});
