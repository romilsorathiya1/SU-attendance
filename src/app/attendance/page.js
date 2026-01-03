'use client';

import { useState, useEffect, useRef, Suspense } from 'react'; // Added Suspense import
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from '../../styles/Attendance.module.css';
import CustomSelect from '../../components/Select';

// Renamed original component to AttendanceContent so we can wrap it
function AttendanceContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isInitialLoad = useRef(true);

    const [activeView, setActiveView] = useState(searchParams.get('view') || 'takeAttendance');
    const [teacherName, setTeacherName] = useState('');

    const TIME_SLOTS = [
        { label: "9:00 AM - 9:55 AM", start: "09:00", end: "09:55" },
        { label: "10:00 AM - 10:55 AM", start: "10:00", end: "10:55" },
        { label: "11:05 AM - 12:00 PM", start: "11:05", end: "12:00" },
        { label: "12:05 PM - 1:00 PM", start: "12:05", end: "13:00" },
        { label: "1:40 PM - 2:35 PM", start: "13:40", end: "14:35" },
        { label: "2:40 PM - 3:35 PM", start: "14:40", end: "15:35" },
        { label: "Other", start: "", end: "" }
    ];

    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');

    const [selectedCollege, setSelectedCollege] = useState(searchParams.get('college') || '');
    const [selectedCourse, setSelectedCourse] = useState(searchParams.get('course') || '');
    const [selectedSemester, setSelectedSemester] = useState(searchParams.get('semester') || '');
    const [selectedClass, setSelectedClass] = useState(searchParams.get('class') || '');
    
    // Subject for Taking Attendance
    const [selectedSubject, setSelectedSubject] = useState(searchParams.get('subject') || '');
    // Subject for Viewing Records (New State)
    const [selectedRecordSubject, setSelectedRecordSubject] = useState(''); 
    
    const [hierarchy, setHierarchy] = useState({ colleges: [], courses: [], classes: [] });
    const [students, setStudents] = useState([]);
    const [attendance, setAttendance] = useState({});
    const [filteredRecordStudents, setFilteredRecordStudents] = useState([]);
    const [percentageFilter, setPercentageFilter] = useState(75);
    const [isLoadingRecords, setIsLoadingRecords] = useState(false);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const storedUser = localStorage.getItem('user'); 
                if (storedUser) {
                    const parsed = JSON.parse(storedUser);
                    setTeacherName(parsed.name || 'Unknown Teacher');
                } else {
                    const res = await fetch('/attendance/api/auth/me'); 
                    if (res.ok) {
                        const data = await res.json();
                        setTeacherName(data.name);
                    }
                }
            } catch (e) { console.error("Could not fetch user", e); }
        };
        fetchUser();
    }, []);

    useEffect(() => {
        fetch('/attendance/api/attendance?hierarchy=true')
            .then(res => res.json())
            .then(data => setHierarchy(data));
    }, []);

    const collegeOptions = hierarchy.colleges.map(c => ({ value: c.name, label: c.name }));
    const courseOptions = hierarchy.courses.filter(c => c.parentName === selectedCollege).map(c => ({ value: c.name, label: c.name }));
    const semesterOptions = ["Semester 1", "Semester 2", "Semester 3", "Semester 4", "Semester 5", "Semester 6", "Semester 7", "Semester 8"].map(y => ({ value: y, label: y }));
    const classOptions = hierarchy.classes.filter(c => c.parentName === selectedCourse && c.details?.semester === selectedSemester).map(c => ({ value: c.name, label: c.name }));
    
    // Dynamic Subject Options Logic
    const currentCourse = hierarchy.courses.find(c => c.name === selectedCourse);
    let availableSubjects = [];
    if (currentCourse && currentCourse.details && currentCourse.details.subjects) {
        if (Array.isArray(currentCourse.details.subjects)) {
            availableSubjects = currentCourse.details.subjects;
        } else {
            availableSubjects = currentCourse.details.subjects[selectedSemester] || [];
        }
    }
    const subjectOptions = availableSubjects.map(s => ({ value: s, label: s }));

    const timeSlotOptions = TIME_SLOTS.map(slot => ({ value: slot.label, label: slot.label }));

    const handleTimeSlotChange = (val) => {
        setSelectedTimeSlot(val);
        const slot = TIME_SLOTS.find(s => s.label === val);
        if (slot && val !== 'Other') { setStartTime(slot.start); setEndTime(slot.end); } 
        else { setStartTime(''); setEndTime(''); }
    };

    // --- Main Data Fetching Effect ---
    useEffect(() => {
        if (selectedCollege && selectedCourse && selectedSemester && selectedClass) {
            let query = `college=${selectedCollege}&course=${selectedCourse}&semester=${selectedSemester}&class=${selectedClass}`;
            
            if (activeView === 'takeAttendance') {
                fetch(`/attendance/api/attendance?view=students&${query}`)
                    .then(res => res.json())
                    .then(data => {
                        setStudents(data);
                        const initial = {};
                        data.forEach(s => initial[s.enrollmentNo] = 'P');
                        setAttendance(initial);
                    });
            } else {
                // For View Records, append the subject if selected
                if (selectedRecordSubject) {
                    query += `&subject=${encodeURIComponent(selectedRecordSubject)}`;
                }
                
                setIsLoadingRecords(true);
                fetch(`/attendance/api/attendance?view=records&${query}`)
                    .then(res => res.json())
                    .then(data => {
                         setFilteredRecordStudents(data.filter(s => s.attendancePercentage <= percentageFilter));
                         setIsLoadingRecords(false);
                    })
                    .catch(() => setIsLoadingRecords(false));
            }
        } else {
            setStudents([]);
            setFilteredRecordStudents([]);
        }
    }, [selectedCollege, selectedCourse, selectedSemester, selectedClass, activeView, percentageFilter, selectedRecordSubject]);

    useEffect(() => {
        if (isInitialLoad.current) { isInitialLoad.current = false; return; }
        const params = new URLSearchParams();
        if (selectedCollege) params.set('college', selectedCollege);
        if (selectedCourse) params.set('course', selectedCourse);
        if (selectedSemester) params.set('semester', selectedSemester); 
        if (selectedClass) params.set('class', selectedClass);
        params.set('view', activeView);
        router.replace(`/attendance?${params.toString()}`, { scroll: false });
    }, [selectedCollege, selectedCourse, selectedSemester, selectedClass, activeView, router]);

    const handleCheckboxChange = (enrollmentNo, isChecked) => {
        setAttendance(prev => ({ ...prev, [enrollmentNo]: isChecked ? 'P' : 'A' }));
    };

    const handleSelectAll = (e) => {
        const isChecked = e.target.checked;
        const newStatus = isChecked ? 'P' : 'A';
        const newAttendance = {};
        students.forEach(student => { newAttendance[student.enrollmentNo] = newStatus; });
        setAttendance(newAttendance);
    };

    const handleSubmit = async () => {
        if (!selectedCollege || !selectedCourse || !selectedSemester || !selectedClass || !selectedSubject || !attendanceDate || !selectedTimeSlot) {
            alert("All fields are compulsory."); return;
        }
        if (selectedTimeSlot === 'Other' && (!startTime || !endTime)) {
            alert("Please specify Start Time and End Time."); return;
        }

        const payload = {
            attendanceData: attendance,
            meta: {
                date: attendanceDate,
                startTime,
                endTime,
                subject: selectedSubject,
                college: selectedCollege,
                course: selectedCourse,
                semester: selectedSemester, 
                cls: selectedClass,
                recordedBy: teacherName,
                students: students 
            }
        };

        try {
            const res = await fetch('/attendance/api/attendance', { method: 'POST', body: JSON.stringify(payload) });
            const responseData = await res.json();
            if (res.ok) alert('Attendance Submitted Successfully!');
            else alert(responseData.error || 'Failed to submit attendance');
        } catch (error) { alert('An error occurred.'); }
    };

    const areAllSelected = (list, stateObj) => list.length > 0 && list.every(s => stateObj[s.enrollmentNo] === 'P');
    const getSummaryCounts = (studentList, attendanceState) => {
        const total = studentList.length;
        const present = Object.values(attendanceState).filter(val => val === 'P').length;
        const absent = total - present;
        return { total, present, absent };
    };

    return (
        <main className={styles.mainContent}>
            <div className={styles.container}>
                <div className={styles.viewSwitcher}>
                    <button className={activeView === 'takeAttendance' ? styles.active : ''} onClick={() => setActiveView('takeAttendance')}>Take Attendance</button>
                    <button className={activeView === 'viewRecords' ? styles.active : ''} onClick={() => setActiveView('viewRecords')}>View Records</button>
                </div>

                <div className={styles.attendanceForm}>
                    <div className={styles.formGroup}><label>College/School <span style={{color:'red'}}>*</span></label><CustomSelect options={collegeOptions} selectedValue={selectedCollege} onChange={setSelectedCollege} placeholder="Select College" /></div>
                    <div className={styles.formGroup}><label>Course <span style={{color:'red'}}>*</span></label><CustomSelect options={courseOptions} selectedValue={selectedCourse} onChange={setSelectedCourse} placeholder="Select Course" disabled={!selectedCollege} /></div>
                    <div className={styles.formGroup}><label>Semester <span style={{color:'red'}}>*</span></label><CustomSelect options={semesterOptions} selectedValue={selectedSemester} onChange={setSelectedSemester} placeholder="Select Semester" disabled={!selectedCourse} /></div>
                    <div className={styles.formGroup}><label>Class <span style={{color:'red'}}>*</span></label><CustomSelect options={classOptions} selectedValue={selectedClass} onChange={setSelectedClass} placeholder="Select Class" disabled={!selectedSemester} /></div>

                    {activeView === 'takeAttendance' && ( <>
                        <div className={styles.formGroup}><label>Subject <span style={{color:'red'}}>*</span></label><CustomSelect options={subjectOptions} selectedValue={selectedSubject} onChange={setSelectedSubject} placeholder="Select Subject" disabled={!selectedClass} /></div>
                        <div className={styles.formGroup}><label>Date <span style={{color:'red'}}>*</span></label><input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} /></div>
                        <div className={styles.formGroup}><label>Time Slot <span style={{color:'red'}}>*</span></label><CustomSelect options={timeSlotOptions} selectedValue={selectedTimeSlot} onChange={handleTimeSlotChange} placeholder="Select Time" /></div>
                        {selectedTimeSlot === 'Other' && ( <><div className={styles.formGroup}><label>Start Time <span style={{color:'red'}}>*</span></label><input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} /></div><div className={styles.formGroup}><label>End Time <span style={{color:'red'}}>*</span></label><input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} /></div></>)}
                    </>)}

                    {/* NEW: Subject Selector for View Records */}
                    {activeView === 'viewRecords' && (
                        <div className={styles.formGroup}>
                            <label>Subject (Optional)</label>
                            <CustomSelect 
                                options={subjectOptions} 
                                selectedValue={selectedRecordSubject} 
                                onChange={setSelectedRecordSubject} 
                                placeholder="All Subjects" 
                                disabled={!selectedClass} 
                            />
                        </div>
                    )}
                </div>

                {activeView === 'takeAttendance' && ( <>
                    {students.length > 0 && ( 
                    <div className={styles.studentList}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                            <h2>Mark Today&apos;s Attendance</h2>
                            {teacherName && <span style={{fontSize:'0.9rem', color:'#666'}}>Teacher: <strong>{teacherName}</strong></span>}
                        </div>
                        <table>
                            <thead><tr><th>Enrollment No.</th><th>Student Name</th><th className={styles.centerAlign}><span>Select All</span><input type="checkbox" className={styles.headerCheckbox} checked={areAllSelected(students, attendance)} onChange={handleSelectAll} /></th></tr></thead>
                            <tbody>
                                {students.map(student => ( <tr key={student.enrollmentNo}><td data-label="Enrollment No.">{student.enrollmentNo}</td><td data-label="Student Name">{student.name}</td><td data-label="Attendance" className={styles.centerAlign}><input type="checkbox" className={styles.attendanceCheckbox} checked={attendance[student.enrollmentNo] === 'P'} onChange={(e) => handleCheckboxChange(student.enrollmentNo, e.target.checked)} /></td></tr> ))}
                            </tbody>
                        </table>
                        {(() => { const { total, present, absent } = getSummaryCounts(students, attendance); return ( <div className={styles.summaryContainer}><div className={`${styles.summaryBox} ${styles.total}`}><span className={styles.summaryLabel}>Total Students</span><span className={styles.summaryValue}>{total}</span></div><div className={`${styles.summaryBox} ${styles.present}`}><span className={styles.summaryLabel}>Present</span><span className={styles.summaryValue}>{present}</span></div><div className={`${styles.summaryBox} ${styles.absent}`}><span className={styles.summaryLabel}>Absent</span><span className={styles.summaryValue}>{absent}</span></div></div> ); })()}
                    </div> 
                    )}
                    <button className={styles.submitBtn} onClick={handleSubmit} disabled={students.length === 0}>Submit Attendance</button>
                </>)}

                {activeView === 'viewRecords' && ( <>
                    <div className={styles.percentageFilterContainer}><label htmlFor="percentageFilter">Show students below or equal to: <strong>{percentageFilter}%</strong></label><input type="range" id="percentageFilter" min="0" max="100" value={percentageFilter} onChange={e => setPercentageFilter(e.target.value)} className={styles.percentageSlider} /></div>
                    {isLoadingRecords ? ( <div style={{textAlign: 'center', padding: '20px', fontSize: '1.2rem', color: '#007bff'}}>Loading Records...</div> ) : (
                        <div className={`${styles.studentList} ${styles.recordsTable}`}><h2>Student Attendance Records {selectedRecordSubject && `(${selectedRecordSubject})`}</h2>
                            {selectedClass ? ( 
                                <div className={styles.recordsTableContainer}>
                                    <table>
                                        <thead><tr><th>Enrollment No.</th><th>Name</th><th>Course</th><th>Semester</th><th>Class</th><th>Attd. %</th><th>Mobile</th><th>Email</th><th>View Details</th></tr></thead>
                                        <tbody>
                                            {filteredRecordStudents.length > 0 ? filteredRecordStudents.map(student => ( <tr key={student.enrollmentNo}><td data-label="Enrollment No.">{student.enrollmentNo}</td><td data-label="Name">{student.name}</td><td data-label="Course">{student.course}</td><td data-label="Semester">{student.semester}</td><td data-label="Class">{student.class}</td><td data-label="Attd. %" style={{fontWeight: 'bold', color: student.attendancePercentage < 50 ? '#c0392b' : '#27ae60' }}>{student.attendancePercentage}%</td><td data-label="Mobile">{student.mobile}</td><td data-label="Email">{student.email}</td><td data-label="View Details"><Link href={`/student/${student._id}`}><button className={styles.statusBtn}>View Details</button></Link></td></tr> )) : ( <tr><td colSpan="9" className={styles.placeholderText}>No students found.</td></tr> )}
                                        </tbody>
                                    </table>
                                </div>
                            ) : ( <p className={styles.placeholderText}>Please select College, Course, Semester and Class to view records.</p> )}
                        </div>
                    )}
                </>)}
            </div>
        </main>
    );
}

// This is the new wrapper component that fixes the build error
export default function AttendancePage() {
    return (
        <Suspense fallback={<div style={{textAlign:'center', padding:'2rem'}}>Loading Attendance Module...</div>}>
            <AttendanceContent />
        </Suspense>
    );
}