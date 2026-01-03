import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail', // or your SMTP provider
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const message = {
    from: `"SU Attendance Support" <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: `<div>
            <h1>Password Reset Request</h1>
            <p>${options.message}</p>
            <a href="${options.url}" style="padding:10px 20px; background:blue; color:white; text-decoration:none;">Reset Password</a>
           </div>` 
  };

  await transporter.sendMail(message);
};

export default sendEmail;