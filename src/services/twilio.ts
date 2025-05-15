import twilio from 'twilio';

const accountSid = 'your_account_sid';
const authToken = 'your_auth_token';

export const client = twilio(accountSid, authToken);

const call = await client.calls.create({
	url: 'https://handler.twilio.com/twiml/EHxxxxxxxxxxxxxx', // this has your call instructions
	to: '+1234567890', // destination number
	from: '+1987654321' // your twilio number
});

console.log(call.sid);
