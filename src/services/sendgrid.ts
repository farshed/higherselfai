import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export class SendGrid {
	static async sendEmail(to: string, subject: string, html: string, variables: any) {
		const body = injectTemplate(html, variables);

		try {
			await sgMail.send({ from: 'TODO', to, subject, html: body });
		} catch (err: any) {
			console.error('sendgrid error:', err?.response?.body || err);
		}
	}
}

function injectTemplate(template: string, values: any) {
	return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
		return key in values ? values[key] : `{{${key}}}`;
	});
}
