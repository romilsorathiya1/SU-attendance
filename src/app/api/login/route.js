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

    console.log(`[Login Attempt] Email: ${email}, Role: ${role}`);

    let user;
    if (role === 'Student') {
      console.log("Searching for Student...");
      user = await Student.findOne({
        $or: [{ email: email }, { enrollmentNo: email }]
      });
    } else {
      console.log("Searching for User (Admin/Teacher)...");
      user = await User.findOne({ email, role });
    }

    if (!user) {
      console.log("[Login Failed] User not found or Role mismatch");
      // Use a distinct message for debugging on frontend
      return NextResponse.json({ message: `User not found with role: ${role}` }, { status: 404 });
    }

    console.log(`[Login Found] User: ${user.name}, checking password...`);
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("[Login Failed] Password mismatch");
      return NextResponse.json({ message: 'Invalid password' }, { status: 401 });
    }
    console.log("[Login Success]");

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