import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { User, Student } from '@/models/Schemas';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export async function POST(req) {
  await dbConnect();
  const { email, role, otp, password } = await req.json();
  const lowerEmail = email.toLowerCase();

  // Re-verify everything securely before resetting
  const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

  let user;
  const query = {
    email: lowerEmail,
    resetPasswordOtp: otpHash,
    resetPasswordExpire: { $gt: Date.now() }
  };

  if (role === 'Student') user = await Student.findOne(query);
  else user = await User.findOne({ ...query, role });

  if (!user) {
    return NextResponse.json({ message: 'Session expired or Invalid OTP' }, { status: 400 });
  }

  // Set new password
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(password, salt);
  
  // Clear OTP fields
  user.resetPasswordOtp = undefined;
  user.resetPasswordExpire = undefined;
  
  await user.save();

  return NextResponse.json({ success: true, message: 'Password Reset Successfully' });
}