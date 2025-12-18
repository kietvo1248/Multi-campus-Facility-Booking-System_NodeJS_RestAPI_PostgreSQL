// test-email.js
require('dotenv').config();
const nodemailer = require('nodemailer');

async function main() {
  console.log('--- Đang test cấu hình Email ---');
  console.log('User:', process.env.EMAIL_USER);
  
  // Tạo transporter
  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  // Thử gửi 1 email
  try {
    const info = await transporter.sendMail({
      from: `"Test System" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Gửi cho chính mình để test
      subject: "✅ Test Nodemailer thành công",
      text: "Nếu nhận được email này, cấu hình App Password đã đúng!",
    });

    console.log("✅ Gửi thành công!");
    console.log("Message ID:", info.messageId);
  } catch (error) {
    console.error("❌ Gửi thất bại. Nguyên nhân:");
    console.error(error);
  }
}

main();