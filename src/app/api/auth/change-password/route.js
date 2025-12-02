import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { User, Student } from '@/models/Schemas';
import bcrypt from 'bcryptjs';

export async function POST(req) {
  await dbConnect();
  const { id, role, currentPassword, newPassword } = await req.json();

  let user;
  if (role === 'Student') user = await Student.findOne({ enrollmentNo: id });
  else user = await User.findById(id);

  if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 });

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) return NextResponse.json({ message: 'Incorrect current password' }, { status: 400 });

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);
  await user.save();

  return NextResponse.json({ success: true, message: 'Password Updated Successfully' });
}