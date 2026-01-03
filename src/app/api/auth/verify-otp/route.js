import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { User, Student } from '@/models/Schemas';
import crypto from 'crypto'; // <--- MAKE SURE THIS IS IMPORTED

export async function POST(req) {
  try {
    await dbConnect();
    
    // 1. Parse Data
    const body = await req.json();
    const { email, role, otp } = body;

    // Debugging Log (Check your VS Code Terminal when you click verify)
    console.log("Verifying OTP for:", email, "Role:", role, "Input OTP:", otp);

    if (!email || !otp) {
      return NextResponse.json({ message: 'Missing Email or OTP' }, { status: 400 });
    }

    const lowerEmail = email.toLowerCase();

    // 2. Find User
    let user;
    if (role === 'Student') {
      user = await Student.findOne({ email: lowerEmail });
    } else {
      user = await User.findOne({ email: lowerEmail, role });
    }

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // 3. Check Expiry
    if (!user.resetPasswordExpire || user.resetPasswordExpire < Date.now()) {
      return NextResponse.json({ message: 'OTP has expired. Please resend.' }, { status: 400 });
    }

    // 4. Hash Input OTP safely
    // We convert otp to string to prevent crypto crash if frontend sends a number
    const otpString = otp.toString(); 
    const otpHash = crypto.createHash('sha256').update(otpString).digest('hex');
    
    // 5. Compare
    if (user.resetPasswordOtp !== otpHash) {
      return NextResponse.json({ message: 'Incorrect OTP Code' }, { status: 400 });
    }

    // Success
    return NextResponse.json({ success: true, message: 'OTP Verified' });

  } catch (error) {
    console.error("Verify OTP API Error:", error); // This will show the REAL error in your terminal
    return NextResponse.json({ message: 'Server Error during verification' }, { status: 500 });
  }
}