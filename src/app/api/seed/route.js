import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { User, Student, Organization, Attendance } from '@/models/Schemas';
import bcrypt from 'bcryptjs';

export async function GET() {
  await dbConnect();

  try {
    // 0. Clear existing data
    await User.deleteMany({});
    await Student.deleteMany({});
    await Organization.deleteMany({});
    await Attendance.deleteMany({});

    // Generate a hashed password for everyone (e.g., "123456")
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('123456', salt);

    // 1. Create Users (Admin & 2 Teachers with Indian Names)
    await User.create([
      { 
        name: 'Admin User', 
        email: 'admin@test.com', 
        password: hashedPassword, 
        role: 'Admin' 
      },
      { 
        name: 'Prof. Amit Verma', 
        email: 'amit@test.com', 
        password: hashedPassword, 
        role: 'Teacher', 
        college: 'School of Computer Science (SOCSA)' 
      },
      { 
        name: 'Prof. Neha Gupta', 
        email: 'neha@test.com', 
        password: hashedPassword, 
        role: 'Teacher', 
        college: 'School of Management (SOM)' 
      }
    ]);

    // 2. Create Hierarchy

    // --- Colleges ---
    await Organization.create({ type: 'college', name: 'School of Computer Science (SOCSA)' });
    await Organization.create({ type: 'college', name: 'School of Management (SOM)' });

    // --- Courses ---
    await Organization.create({ 
      type: 'course', 
      name: 'BCA', 
      parentName: 'School of Computer Science (SOCSA)', 
      details: { subjects: ['C Programming', 'Web Development', 'Mathematics', 'Communication Skills'] } 
    });
    
    await Organization.create({ 
      type: 'course', 
      name: 'MCA', 
      parentName: 'School of Computer Science (SOCSA)', 
      details: { subjects: ['Advanced Java', 'Python', 'AI & ML'] } 
    });

    await Organization.create({ 
      type: 'course', 
      name: 'BBA', 
      parentName: 'School of Management (SOM)', 
      details: { subjects: ['Economics', 'Business Management', 'Accounting'] } 
    });

    // --- Classes (Semester Wise) ---
    // BCA Classes
    await Organization.create({ type: 'class', name: 'A', parentName: 'BCA', details: { semester: 'Semester 1' } });
    await Organization.create({ type: 'class', name: 'B', parentName: 'BCA', details: { semester: 'Semester 1' } });
    await Organization.create({ type: 'class', name: 'A', parentName: 'BCA', details: { semester: 'Semester 3' } }); // Seniors

    // MCA Classes
    await Organization.create({ type: 'class', name: 'A', parentName: 'MCA', details: { semester: 'Semester 1' } });

    // BBA Classes
    await Organization.create({ type: 'class', name: 'A', parentName: 'BBA', details: { semester: 'Semester 1' } });

    // 3. Students (Indian Names, mixed semesters)
    await Student.create([
      // BCA Semester 1 - Class A
      { 
        enrollmentNo: 'BCA23001', name: 'Rahul Sharma', email: 'rahul@test.com', mobile: '9876543210', 
        password: hashedPassword, college: 'School of Computer Science (SOCSA)', course: 'BCA', semester: 'Semester 1', class: 'A' 
      },
      { 
        enrollmentNo: 'BCA23002', name: 'Priya Patel', email: 'priya@test.com', mobile: '9876543211', 
        password: hashedPassword, college: 'School of Computer Science (SOCSA)', course: 'BCA', semester: 'Semester 1', class: 'A' 
      },
      { 
        enrollmentNo: 'BCA23003', name: 'Arjun Singh', email: 'arjun@test.com', mobile: '9876543212', 
        password: hashedPassword, college: 'School of Computer Science (SOCSA)', course: 'BCA', semester: 'Semester 1', class: 'A' 
      },

      // BCA Semester 1 - Class B
      { 
        enrollmentNo: 'BCA23004', name: 'Sneha Reddy', email: 'sneha@test.com', mobile: '9876543213', 
        password: hashedPassword, college: 'School of Computer Science (SOCSA)', course: 'BCA', semester: 'Semester 1', class: 'B' 
      },

      // BCA Semester 3 (Seniors)
      { 
        enrollmentNo: 'BCA22001', name: 'Vikram Malhotra', email: 'vikram@test.com', mobile: '9876543214', 
        password: hashedPassword, college: 'School of Computer Science (SOCSA)', course: 'BCA', semester: 'Semester 3', class: 'A' 
      },

      // MCA Semester 1
      { 
        enrollmentNo: 'MCA23001', name: 'Anjali Das', email: 'anjali@test.com', mobile: '9876543215', 
        password: hashedPassword, college: 'School of Computer Science (SOCSA)', course: 'MCA', semester: 'Semester 1', class: 'A' 
      },

      // BBA Semester 1
      { 
        enrollmentNo: 'BBA23001', name: 'Rohan Mehta', email: 'rohan@test.com', mobile: '9876543216', 
        password: hashedPassword, college: 'School of Management (SOM)', course: 'BBA', semester: 'Semester 1', class: 'A' 
      }
    ]);

    return NextResponse.json({ message: 'Database Seeded Successfully with Semester Data & Indian Names' });

  } catch (error) {
    console.error("Seeding Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}