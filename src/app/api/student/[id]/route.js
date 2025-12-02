import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Student, Attendance } from '@/models/Schemas';

export async function GET(req, { params }) {
  await dbConnect();
  const { id } = await params; // Next.js 15 requires awaiting params
  
  const student = await Student.findOne({ enrollmentNo: id });
  const records = await Attendance.find({ studentId: id }).sort({ date: -1 });

  if (!student) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ student, records });
}