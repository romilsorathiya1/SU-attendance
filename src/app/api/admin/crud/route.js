import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Student, Organization, User, Attendance } from '@/models/Schemas';
import bcrypt from 'bcryptjs';

export async function POST(req) {
  await dbConnect();
  const body = await req.json();
  const { action, collection, data } = body;

  try {
    let result = { success: true };

    // --- CREATE ---
    if (action === 'create') {
      if (['student', 'teacher'].includes(collection)) {
        const rawPassword = data.password || '123456'; 
        const salt = await bcrypt.genSalt(10);
        data.password = await bcrypt.hash(rawPassword, salt);
      }

      if (collection === 'student') {
        // Data already contains 'semester' from frontend
        result = await Student.create(data);
      }
      else if (collection === 'teacher') result = await User.create({ ...data, role: 'Teacher' });
      else if (collection === 'class') {
         // Store semester in details
         result = await Organization.create({ 
             type: 'class', 
             name: data.name, 
             parentName: data.course, // Course is the parent
             details: { semester: data.semester }, // <--- STORE SEMESTER
             college: data.college // Optional: helps with filtering
         });
      }
      else if (['college', 'course'].includes(collection)) {
        result = await Organization.create({ type: collection, ...data });
      }
    } 
    
    // --- UPDATE ---
    else if (action === 'update') {
      if (collection === 'course') {
        const { id, subjects } = data;
        result = await Organization.findByIdAndUpdate(id, { 
          $set: { 'details.subjects': subjects } 
        }, { new: true });
      } 
      else if (collection === 'attendance') {
        const { id, status } = data;
        result = await Attendance.findByIdAndUpdate(id, { status: status }, { new: true });
      }
    }

    // --- DELETE ---
    else if (action === 'delete') {
      if (collection === 'colleges') {
        const collegesToDelete = await Organization.find({ _id: { $in: data } });
        const collegeNames = collegesToDelete.map(c => c.name);
        const coursesExist = await Organization.findOne({ type: 'course', parentName: { $in: collegeNames } });
        if (coursesExist) return NextResponse.json({ error: "Cannot delete College(s). Please delete associated Courses first." }, { status: 400 });
        await Organization.deleteMany({ _id: { $in: data } });
      } 
      else if (collection === 'courses') {
        const coursesToDelete = await Organization.find({ _id: { $in: data } });
        const courseNames = coursesToDelete.map(c => c.name);
        const classesExist = await Organization.findOne({ type: 'class', parentName: { $in: courseNames } });
        if (classesExist) return NextResponse.json({ error: "Cannot delete Course(s). Please delete associated Classes first." }, { status: 400 });
        await Organization.deleteMany({ _id: { $in: data } });
      } 
      else if (collection === 'classes') {
        const classesToDelete = await Organization.find({ _id: { $in: data } });
        const classNames = classesToDelete.map(c => c.name);
        const studentsExist = await Student.findOne({ class: { $in: classNames } });
        if (studentsExist) return NextResponse.json({ error: "Cannot delete Class(es). Please delete associated Students first." }, { status: 400 });
        await Organization.deleteMany({ _id: { $in: data } });
      }
      else if (collection === 'students') await Student.deleteMany({ enrollmentNo: { $in: data } });
      else if (collection === 'teachers') await User.deleteMany({ _id: { $in: data } });
      else if (collection === 'attendance') await Attendance.deleteMany({ _id: { $in: data } });
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error("API Error:", e);
    return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
  }
}