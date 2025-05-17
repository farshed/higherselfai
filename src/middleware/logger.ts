import { Elysia } from 'elysia';

export const logger = new Elysia()
	.onRequest(({ request }) => {
		console.log(`[${new Date().toISOString()}] ${request.method} ${request.url}`);
	})
	.onAfterResponse(({ request, response, set }) => {
		console.log(`[${new Date().toISOString()}] ${request.method} ${request.url} - ${set.status}`);
	})
	.onError(({ request, error }) => {
		console.error(
			`[${new Date().toISOString()}] ${request.method} ${request.url} - ERROR: ${error}`
		);
	});
