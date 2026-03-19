const nodemailer = require("nodemailer");

const sendEmailOtp = async (email, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail", // or use SMTP
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // app password
      },
    });

    const mailOptions = {
      from: `"Your App" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your OTP Code",
      html: `
        <div style="font-family: Arial; padding: 20px">
          <h2>🔐 Your OTP Code</h2>
          <p>Your verification code is:</p>
          <h1 style="letter-spacing: 4px;">${otp}</h1>
          <p>This OTP will expire in ${process.env.OTP_EXPIRES_MIN || 5} minutes.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`OTP sent to email: ${email}`);
  } catch (error) {
    console.error("Email send error:", error);
    throw new Error("Failed to send email OTP");
  }
};

module.exports = sendEmailOtp;