import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const client = twilio(accountSid, authToken);

export async function endCall(callSid: string) {
	await client.calls(callSid).update({ status: 'completed' });
}

// const call = await client.calls.create({
// 	url: 'https://handler.twilio.com/twiml/EHxxxxxxxxxxxxxx', // this has your call instructions
// 	to: '+1234567890', // destination number
// 	from: '+1987654321' // your twilio number
// });

// console.log(call.sid);
