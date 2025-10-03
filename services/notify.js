const twilio = require('twilio');
require('dotenv').config();

function getTwilioClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  return twilio(sid, token);
}

async function sendRegistrationSms(newUser) {
  const to = process.env.COUNSELOR_PHONE;
  if (!to) throw new Error('COUNSELOR_PHONE not set');
  const from = process.env.TWILIO_FROM_NUMBER;
  const client = getTwilioClient();
  const messageBody = `دانش آموز ${newUser.username} با ایمیل ${newUser.email} ثبت نام کرد.`;
  if (!client || !from) {
    console.log('[SMS MOCK]', { to, body: messageBody });
    return;
  }
  await client.messages.create({ to, from, body: messageBody });
}

module.exports = { sendRegistrationSms };
