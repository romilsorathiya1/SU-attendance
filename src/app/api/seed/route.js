import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { User, Student, Organization, Attendance } from '@/models/Schemas';
import bcrypt from 'bcryptjs';

const gujaratiFirstNames = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan',
  'Diya', 'Saanvi', 'Anya', 'Aadhya', 'Pari', 'Ananya', 'Myra', 'Riya', 'Meera', 'Ira'
];
const gujaratiLastNames = [
  'Patel', 'Shah', 'Mehta', 'Trivedi', 'Jani', 'Joshi', 'Bhatt', 'Desai', 'Dave', 'Pandya',
  'Chauhan', 'Parmar', 'Makwana', 'Solanki', 'Rathod', 'Vaghela', 'Gohil', 'Jadeja', 'Chavda'
];

function generateGujaratiName() {
  const first = gujaratiFirstNames[Math.floor(Math.random() * gujaratiFirstNames.length)];
  const last = gujaratiLastNames[Math.floor(Math.random() * gujaratiLastNames.length)];
  return `${first} ${last}`;
}

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

    // 1. Create Users

    // Admin
    await User.create({
      name: 'Admin User',
      email: 'admin@test.com',
      password: hashedPassword,
      role: 'Admin'
    });

    const colleges = [
      { name: 'School of Computer Science and Application (SOCSA)', code: 'SOCSA' },
      { name: 'School of Management (SOM)', code: 'SOM' },
      { name: 'School of Science (SOS)', code: 'SOS' },
      { name: 'School of Commerce (SOC)', code: 'SOC' }
    ];

    // Create Colleges
    for (const col of colleges) {
      await Organization.create({ type: 'college', name: col.name });
    }

    // 2. Create Teachers (10 Teachers with Gujarati names)
    // Distribute teachers among colleges
    const teachers = [];
    for (let i = 0; i < 10; i++) {
      const college = colleges[i % colleges.length]; // Round robin assignment
      teachers.push({
        name: `Prof. ${generateGujaratiName()}`,
        email: `teacher${i + 1}@test.com`,
        password: hashedPassword,
        role: 'Teacher',
        college: college.name
      });
    }
    await User.create(teachers);


    // 3. Create Courses & Classes & Students
    const coursesData = [
      {
        college: 'School of Computer Science and Application (SOCSA)',
        courses: ['BCA', 'MCA', 'BSc IT']
      },
      {
        college: 'School of Management (SOM)',
        courses: ['BBA', 'MBA', 'BCom']
      },
      {
        college: 'School of Science (SOS)',
        courses: ['BSc Chemistry', 'BSc Physics', 'MSc Gen']
      },
      {
        college: 'School of Commerce (SOC)',
        courses: ['BCom Hons', 'MCom', 'BBA Finance']
      }
    ];

    const semesterList = ['Semester 1', 'Semester 2', 'Semester 3'];
    const classList = ['A', 'B'];

    let studentCount = 1;

    for (const collegeData of coursesData) {
      for (const courseName of collegeData.courses) {
        // Create Course
        await Organization.create({
          type: 'course',
          name: courseName,
          parentName: collegeData.college,
          details: { subjects: ['Subject 1', 'Subject 2', 'Subject 3'] }
        });

        // Create Classes (2-3 random selection logic or fixed)
        // Let's do 3 semesters, 1 class each for simplicity in loop, or 2 classes for Sem 1
        for (const sem of semesterList) {
          for (const cls of classList) {
            // Create Class
            await Organization.create({
              type: 'class',
              name: cls,
              parentName: courseName,
              details: { semester: sem }
            });

            // 4. Create Students
            let numStudents = 2; // Default small number

            // Special Condition: SOCSA -> BCA -> First Class (Use Sem 1 Class A)
            if (collegeData.college.includes('SOCSA') && courseName === 'BCA' && sem === 'Semester 1' && cls === 'A') {
              numStudents = 20;
            } else if (collegeData.college.includes('SOCSA') && courseName === 'BCA') {
              // Other BCA classes
              numStudents = 3;
            }

            const students = [];
            for (let k = 0; k < numStudents; k++) {
              const sName = generateGujaratiName();
              const enroll = `${courseName.replace(/\s/g, '')}${2024}${String(studentCount).padStart(4, '0')}`;

              students.push({
                enrollmentNo: enroll,
                name: sName,
                email: `student${studentCount}@test.com`,
                mobile: `98765${String(studentCount).padStart(5, '0')}`,
                password: hashedPassword,
                college: collegeData.college,
                course: courseName,
                semester: sem,
                class: cls
              });
              studentCount++;
            }
            if (students.length > 0) {
              await Student.create(students);
            }
          }
        }
      }
    }

    return NextResponse.json({ message: 'Database Seeded Successfully with Gujarati Names & Hierarchy' });

  } catch (error) {
    console.error("Seeding Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}