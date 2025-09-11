const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const sendEmailOtp = async (to, otp) => {
  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: 'Your OTP code',
    text: `Your OTP is ${otp}. It will expire shortly.`,
    html: `<p>Your OTP is <b>${otp}</b>. It will expire shortly.</p>`
  });
  return info;
};

module.exports = { sendEmailOtp };
