import { Elysia } from 'elysia';
import { db } from './services/firebase';
import { logger } from './middleware/logger';

const app = new Elysia()
	.use(logger)
	.get('/ping', () => 'API is running')
	.post('/webhook', async ({ body, set }) => {
		const users = await db.collection('users').where('age', '>', 25).get();
		const scripts = await db.collection('scripts').get();

		users.forEach((doc) => {
			console.log(doc.id, doc.data());
		});
	})
	.listen(process.env.PORT || 3000);

console.log(`🦊 Server is running at ${app.server?.hostname}:${app.server?.port}`);
