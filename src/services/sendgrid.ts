import sgMail from '@sendgrid/mail';
import { injectVars } from '../utils';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export class SendGrid {
	static async sendEmail(to: string, subject: string, html: string, variables: any) {
		const body = injectVars(html, variables);

		try {
			await sgMail.send({ from: 'TODO', to, subject, html: body });
		} catch (err: any) {
			console.error('sendgrid error:', err?.response?.body || err);
		}
	}
}
