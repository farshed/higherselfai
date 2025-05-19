import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export class SendGrid {
	static async sendEmail(to: string, subject: string, html: string) {
		try {
			await sgMail.send({ from: 'TODO', to, subject, html });
		} catch (err: any) {
			console.error('sendgrid error:', err?.response?.body || err);
		}
	}
}
