import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { User, Student } from '@/models/Schemas';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

export async function POST(req) {
  try {
    await dbConnect();
    const { email, password, role } = await req.json();

    let user;
    if (role === 'Student') {
      console.log("student Email :- "+email)
      user = await Student.findOne({ 
        $or: [{ email: email }, { enrollmentNo: email }] 
      });
    } else {
      user = await User.findOne({ email, role });
    }

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    // 7 Days Expiration
    const expiresIn = '7d'; 
    const expirationMs = 7 * 24 * 60 * 60 * 1000;

    const token = jwt.sign(
      { _id: user._id, role: user.role || 'Student', name: user.name },
      process.env.JWT_SECRET || 'secret123',
      { expiresIn: expiresIn }
    );

    const cookieStore = await cookies();
    cookieStore.set('token', token, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      maxAge: expirationMs / 1000, // maxAge is in seconds
      path: '/'
    });

    return NextResponse.json({ 
      success: true, 
      user: { 
        id: user._id,
        name: user.name, 
        email: user.email, 
        role: role, 
        college: user.college 
      } 
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Server Error' }, { status: 500 });
  }
}