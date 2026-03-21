// utils/sendEmailOtp.js
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmailOtp = async (email, otp) => {
  try {
    await resend.emails.send({
      from: "no-reply@notionadvertising.com",
      to: email,
      subject: "Your OTP Code",
      html: `
        <h2>Your OTP is: ${otp}</h2>
        <p>Valid for 5 minutes</p>
      `,
    });

    console.log("✅ Email sent via Resend");
  } catch (error) {
    console.error("Resend error:", error);
    throw new Error("Failed to send email OTP");
  }
};

module.exports = sendEmailOtp;