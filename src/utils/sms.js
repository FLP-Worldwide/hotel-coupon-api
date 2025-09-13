// utils/sms.js
const axios = require("axios");
const nodemailer = require("nodemailer");

const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY;
const FAST2SMS_ENDPOINT = process.env.FAST2SMS_ENDPOINT || "https://www.fast2sms.com/dev/bulkV2";

// Nodemailer transporter (fallback)
let transporter = null;
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
} else {
  console.warn("SMTP not configured — email fallback will not work. Set SMTP_USER and SMTP_PASS in .env");
}

// normalizeNumber same as you had
function normalizeNumber(number) {
  if (!number) return number;
  let n = String(number).trim();
  n = n.replace(/[\s-]/g, "");
  if (n.startsWith("+")) n = n.slice(1);
  n = n.replace(/^0+/, "");
  if (n.length === 10) n = "91" + n;
  return n;
}

async function sendViaFast2Sms(numbers, message, options = {}) {
  if (!FAST2SMS_API_KEY) throw new Error("Fast2SMS API key not configured (FAST2SMS_API_KEY)");

  const payload = {
    route: options.route || "otp",
    numbers,
    message,
  };

  try {
    const resp = await axios.post(FAST2SMS_ENDPOINT, payload, {
      headers: {
        authorization: FAST2SMS_API_KEY,
        "Content-Type": "application/json",
      },
      timeout: options.timeout || 10000,
    });
    return resp.data;
  } catch (err) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    const msg = err?.message || "Fast2SMS request failed";
    // throw a wrapped error with status/data for caller to inspect
    const e = new Error(`Fast2SMS error (status: ${status}): ${msg}`);
    e.status = status;
    e.data = data;
    throw e;
  }
}

async function sendEmailFallback(toEmail, subject, text) {
  if (!transporter) {
    console.warn("No SMTP transporter configured, cannot send fallback email.");
    return { fallback: "none", message: "No SMTP configured" };
  }
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: toEmail,
      subject,
      text,
    });
    return { fallback: "email", info };
  } catch (err) {
    console.warn("Email fallback failed", err);
    return { fallback: "email_failed", error: err.message };
  }
}

/**
 * sendSmsOtp
 * - Tries Fast2SMS first.
 * - If Fast2SMS returns DLT/996 style error, fallback to email (if configured) or console log.
 * - Returns an object { success: boolean, provider: 'fast2sms'|'email'|'console', detail: ... }
 */
async function sendSmsOtp(identifier, otp, options = {}) {
  if (!identifier) throw new Error("Phone number required to send SMS");
  const to = normalizeNumber(identifier);
  const message = options.template ? options.template.replace("{{OTP}}", otp) : `Your OTP is ${otp}. Do not share this with anyone.`;

  // try Fast2SMS primary
  if (FAST2SMS_API_KEY) {
    try {
      const resp = await sendViaFast2Sms(to, message, options);
      // Fast2SMS returns an object — treat return:true as success
      if (resp && (resp.return === true || resp.return === "true")) {
        return { success: true, provider: "fast2sms", detail: resp };
      } else {
        // provider responded but not success — treat as failure and fallbacks
        console.warn("Fast2SMS responded with non-success:", resp);
      }
    } catch (err) {
      // inspect for DLT / 996 style
      const text = String(err?.data ? JSON.stringify(err.data) : err.message || "");
      console.warn("Fast2SMS error:", err.message, err.status, err.data);
      if (text.includes("996") || text.toLowerCase().includes("dlt") || text.toLowerCase().includes("otp api is closed")) {
        console.warn("Fast2SMS indicates DLT restriction. Falling back to alternate method.");
      } else {
        console.warn("Fast2SMS failed (non-DLT). Falling back to alternate method.");
      }
      // fallthrough to fallback
    }
  } else {
    console.warn("FAST2SMS_API_KEY not set; skipping Fast2SMS and using fallback.");
  }

  // Fallback: email if configured
  if (transporter && process.env.DEV_EMAIL_TO) {
    const subject = "DEV OTP fallback";
    const text = `Phone: ${to}\nOTP: ${otp}\nMessage: ${message}\nNote: This OTP was sent via email fallback because SMS provider failed.`;
    const result = await sendEmailFallback(process.env.DEV_EMAIL_TO, subject, text);
    return { success: true, provider: "email", detail: result };
  }

  // Final fallback: console log (dev only)
  console.log(`[DEV-OTP] phone=${to} otp=${otp} message="${message}"`);
  return { success: true, provider: "console", detail: "OTP logged to server console (dev)" };
}

module.exports = { sendSmsOtp, normalizeNumber, sendViaFast2Sms };
