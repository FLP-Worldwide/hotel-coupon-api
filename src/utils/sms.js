// utils/sms.js
const axios = require('axios');

const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY;
const FAST2SMS_ENDPOINT = process.env.FAST2SMS_ENDPOINT || 'https://www.fast2sms.com/dev/bulkV2';
if (!FAST2SMS_API_KEY) {
  console.warn('Fast2SMS API key not configured. Set FAST2SMS_API_KEY in .env');
}

/**
 * normalizeNumber
 * - Accepts formats like "+9198xxxxxxxx", "9198xxxxxxxx" or "98xxxxxxxx"
 * - Returns number without '+' and with country code (assumes India if no country code)
 */
function normalizeNumber(number) {
  if (!number) return number;
  let n = String(number).trim();
  // remove spaces and dashes
  n = n.replace(/[\s-]/g, '');
  // remove leading '+'
  if (n.startsWith('+')) n = n.slice(1);
  // if starts with 0 -> remove leading zero(s)
  n = n.replace(/^0+/, '');
  // if length is 10 (e.g., 98xxxxxxxx) assume India and prefix 91
  if (n.length === 10) n = '91' + n;
  return n;
}

/**
 * sendViaFast2Sms
 * - numbers: single normalized number string OR comma-separated string (no '+')
 * - message: string
 * - returns: fast2sms response object
 */
async function sendViaFast2Sms(numbers, message, options = {}) {
  if (!FAST2SMS_API_KEY) throw new Error('Fast2SMS API key not configured (FAST2SMS_API_KEY)');

  const payload = {
    route: options.route || 'otp', // 'otp' recommended for OTP messages
    numbers,
    message,
    // You can add other fields supported by Fast2SMS v2:
    // language: options.language || 'english',
    // flash: options.flash ? 1 : 0,
    // variables_values: options.variables_values,
    // sender_id: options.sender_id
  };

  try {
    const resp = await axios.post(FAST2SMS_ENDPOINT, payload, {
      headers: {
        'authorization': FAST2SMS_API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: options.timeout || 10000
    });

    // resp.data usually contains { return: true/false, message: "...", data: {...} }
    return resp.data;
  } catch (err) {
    // throw a clear error so calling code can decide what to do
    const status = err?.response?.status;
    const data = err?.response?.data;
    const msg = err?.message || 'Fast2SMS request failed';
    throw new Error(`Fast2SMS error (status: ${status}): ${msg} ${data ? JSON.stringify(data) : ''}`);
  }
}

/**
 * sendSmsOtp
 * - identifier: phone number (any common format)
 * - otp: string or number
 * - options: optional { route, timeout }
 */
async function sendSmsOtp(identifier, otp, options = {}) {
  if (!identifier) throw new Error('Phone number required to send SMS');
  const to = normalizeNumber(identifier);
  // Fast2SMS expects numbers without '+' (e.g., 9198xxxxxxx). For multiple numbers you can pass comma separated string.
  const message = options.template
    ? options.template.replace('{{OTP}}', otp)
    : `Your OTP is ${otp}. Do not share this with anyone.`;

  // For debugging / logging
  // console.log('Fast2SMS -> sending to:', to, ' message:', message);

  const result = await sendViaFast2Sms(to, message, options);
  return result;
}

module.exports = { sendSmsOtp, normalizeNumber, sendViaFast2Sms };
