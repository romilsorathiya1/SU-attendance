import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { User, Student } from '@/models/Schemas';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export async function POST(req) {
  await dbConnect();
  const { token, role, password } = await req.json();

  // Hash the token from URL to compare with DB
  const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

  let user;
  const query = {
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() }
  };

  if (role === 'Student') user = await Student.findOne(query);
  else user = await User.findOne({ ...query, role });

  if (!user) return NextResponse.json({ message: 'Invalid or expired token' }, { status: 400 });

  // Set new password
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(password, salt);
  
  // Clear tokens
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  
  await user.save();

  return NextResponse.json({ success: true, message: 'Password Updated' });
}