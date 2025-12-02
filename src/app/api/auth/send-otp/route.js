import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { User, Student } from '@/models/Schemas';
import sendEmail from '@/lib/email';
import crypto from 'crypto';

export async function POST(req) {
  try {
    await dbConnect();
    const { email, role } = await req.json();
    
    if(!email) return NextResponse.json({ message: 'Email required' }, { status: 400 });

    const lowerEmail = email.toLowerCase();

    let user;
    if (role === 'Student') user = await Student.findOne({ email: lowerEmail });
    else user = await User.findOne({ email: lowerEmail, role });

    if (!user) {
      return NextResponse.json({ message: 'Email not found in database' }, { status: 404 });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash OTP before saving
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    
    // Save to DB
    user.resetPasswordOtp = otpHash;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 mins

    await user.save();

    // Send Email
    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset OTP',
        message: `Your OTP is: ${otp}`,
        url: '#'
      });
      return NextResponse.json({ success: true, message: 'OTP sent' });
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      return NextResponse.json({ message: 'Failed to send email' }, { status: 500 });
    }

  } catch (error) {
    console.error("Send OTP Error:", error);
    return NextResponse.json({ message: 'Server Error' }, { status: 500 });
  }
}