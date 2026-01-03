'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { FaUserGraduate, FaChalkboardTeacher, FaUniversity, FaBookOpen, FaFileImport, FaInfoCircle, FaFileDownload, FaArrowUp } from 'react-icons/fa';
import * as XLSX from 'xlsx'; 
import styles from '../../styles/Admin.module.css';
import CustomSelect from '../../components/Select';

// Register ChartJS
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// Define Semesters Constant
const SEMESTERS = ["Semester 1", "Semester 2", "Semester 3", "Semester 4", "Semester 5", "Semester 6", "Semester 7", "Semester 8", "Semester 9", "Semester 10"];

export default function AdminPanel() {
    const [activeSection, setActiveSection] = useState('dashboard');
    const [data, setData] = useState({ colleges: [], courses: [], classes: [], teachers: [], students: [], attendance: [] });

    // Modals state
    const [modal, setModal] = useState(null);
    const [importModalType, setImportModalType] = useState(null);
    const [editAttendanceModal, setEditAttendanceModal] = useState(null);
    const [subjectManagerModal, setSubjectManagerModal] = useState(null);

    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [chartData, setChartData] = useState({ labels: [], datasets: [] });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await fetch('/attendance/api/data?type=all');
            const result = await res.json();
            
            const formatData = (arr) => arr ? arr.map(i => ({ ...i, id: i._id, enrollmentNo: i.enrollmentNo || i._id })) : [];

            setData({
                colleges: formatData(result.colleges),
                courses: formatData(result.courses).map(c => ({ 
                    ...c, 
                    // Subjects might be array (legacy) or object (new). Backend saves 'details.subjects'.
                    subjects: c.details?.subjects || {}, 
                    college: c.parentName 
                })),
                classes: formatData(result.classes).map(cls => {
                    const parentCourse = result.courses.find(course => course.name === cls.parentName);
                    const collegeName = parentCourse ? parentCourse.parentName : '';
                    return { 
                        ...cls, 
                        semester: cls.details?.semester || '', 
                        course: cls.parentName,
                        college: collegeName
                    };
                }),
                teachers: formatData(result.teachers),
                students: formatData(result.students),
                attendance: formatData(result.attendance)
            });
        } catch (e) {
            console.error("Failed to load data", e);
        }
    };

    // --- Chart Update Logic (Semester Wise) ---
    useEffect(() => {
        if (!data.students) return;
        const semCounts = {};
        SEMESTERS.forEach(s => semCounts[s] = 0);

        data.students.forEach(student => {
            if (student.semester && semCounts.hasOwnProperty(student.semester)) {
                semCounts[student.semester]++;
            } else if (student.semester) {
                 semCounts[student.semester] = (semCounts[student.semester] || 0) + 1;
            }
        });

        setChartData({
            labels: Object.keys(semCounts),
            datasets: [{
                label: 'Number of Students',
                data: Object.values(semCounts),
                borderColor: 'rgba(0, 123, 255, 1)',
                backgroundColor: 'rgba(0, 123, 255, 0.2)',
                fill: true,
                tension: 0.3
            }]
        });
    }, [data.students]);

    const handleNavClick = (section) => {
        setActiveSection(section);
        if (window.innerWidth <= 768) setSidebarOpen(false);
    };

    // --- CRUD OPERATIONS ---
    const handleAddNew = async (type, newEntry) => {
        const mapType = { student: 'student', teacher: 'teacher', college: 'college', course: 'course', class: 'class' };
        let payload = { ...newEntry };
        if (type === 'course') payload.details = { subjects: {} }; // Initialize as empty object for Semesters
        if (type === 'class') payload.details = { semester: newEntry.semester };
        if (type === 'course' || type === 'class') payload.parentName = newEntry.course || newEntry.college;

        const res = await fetch('/attendance/api/admin/crud', {
            method: 'POST',
            body: JSON.stringify({ action: 'create', collection: mapType[type], data: payload })
        });

        return res.ok;
    };

    const handleSingleAdd = async (type, formData) => {
        const success = await handleAddNew(type, formData);
        if (success) {
            alert(`${type} added successfully!`);
            setModal(null);
            fetchData();
        } else {
            alert("Error adding entry.");
        }
    };

    const handleDelete = async (type, selectedIds) => {
        if (window.confirm(`Are you sure you want to delete ${selectedIds.length} items?`)) {
            try {
                const res = await fetch('/attendance/api/admin/crud', {
                    method: 'POST',
                    body: JSON.stringify({ action: 'delete', collection: type, data: selectedIds })
                });
                const result = await res.json();
                if (!res.ok) alert(result.error || "Failed to delete.");
                else { alert("Deleted successfully."); fetchData(); }
            } catch (error) {
                console.error(error);
                alert("An error occurred while deleting.");
            }
        }
    };

    const handleBulkAdd = async (type, newEntries) => {
        if (!newEntries || newEntries.length === 0) return;
        setLoading(true);
        let successCount = 0;
        let failCount = 0;
        for (const entry of newEntries) {
            if (type === 'student' && !entry.enrollmentNo) continue;
            if (type === 'teacher' && !entry.email) continue;
            const success = await handleAddNew(type, entry);
            if (success) successCount++;
            else failCount++;
        }
        setLoading(false);
        alert(`Import Finished:\nSuccess: ${successCount}\nFailed: ${failCount}`);
        setImportModalType(null);
        fetchData();
    };

    // --- NEW: Promote Students Based on Filter ---
    const handlePromoteFiltered = async (currentFilters) => {
        if (!currentFilters.college || !currentFilters.course || !currentFilters.semester) {
            alert("Action Required:\nPlease select a College, Course, and specific Semester using the filters first.");
            return;
        }

        const confirmMsg = `Are you sure you want to promote filtered students?\n\n` +
                           `College: ${currentFilters.college}\n` +
                           `Course: ${currentFilters.course}\n` +
                           `Current Sem: ${currentFilters.semester}\n` +
                           `${currentFilters.class ? `Class: ${currentFilters.class}` : ''}\n\n` +
                           `This will increase their semester by 1.`;

        if (window.confirm(confirmMsg)) {
            try {
                setLoading(true);
                const res = await fetch('/attendance/api/admin/crud', {
                    method: 'POST',
                    body: JSON.stringify({ 
                        action: 'promote_filtered', 
                        data: currentFilters 
                    })
                });
                const result = await res.json();
                setLoading(false);

                if (res.ok) {
                    alert(result.message);
                    fetchData(); // Refresh to see changes
                } else {
                    alert(result.error);
                }
            } catch (e) {
                setLoading(false);
                alert("Connection error");
            }
        }
    };
    
    const handleSaveAttendance = async (id, newStatus) => {
        try {
            const res = await fetch('/attendance/api/admin/crud', {
                method: 'POST',
                body: JSON.stringify({ action: 'update', collection: 'attendance', data: { id, status: newStatus } })
            });
            if (res.ok) { alert('Attendance updated'); setEditAttendanceModal(null); fetchData(); } 
            else alert('Failed to update');
        } catch (e) { alert('Error updating'); }
    };

    const handleUpdateSubjects = async (courseId, updatedSubjectsObject) => {
        try {
            const res = await fetch('/attendance/api/admin/crud', {
                method: 'POST',
                body: JSON.stringify({ action: 'update', collection: 'course', data: { id: courseId, subjects: updatedSubjectsObject } })
            });
            if (res.ok) fetchData(); 
            else alert('Failed to update subjects');
        } catch (e) { alert('Error updating subjects'); }
    };

    const renderSection = () => {
        switch (activeSection) {
            case 'dashboard':
                return <DashboardSection stats={data} chartData={chartData} />;
            case 'students':
                return <DataTable 
                    title="Students" 
                    data={data.students} 
                    headers={['Enrollment No', 'Name', 'Email', 'College', 'Course', 'Class', 'Semester', 'Mobile']} 
                    onAdd={() => setModal('student')} 
                    onImport={() => setImportModalType('student')} 
                    onDelete={(ids) => handleDelete('students', ids)} 
                    colleges={data.colleges} 
                    courses={data.courses} 
                    allClasses={data.classes}
                    onPromoteFiltered={handlePromoteFiltered} // Pass the handler
                />;
            case 'teachers':
                return <DataTable title="Teachers" data={data.teachers} headers={['No.', 'Name', 'Email', 'College']} onAdd={() => setModal('teacher')} onImport={() => setImportModalType('teacher')} onDelete={(ids) => handleDelete('teachers', ids)} colleges={data.colleges} />;
            case 'colleges':
                return <DataTable title="Colleges" data={data.colleges} headers={['No.', 'College Name']} onAdd={() => setModal('college')} onDelete={(ids) => handleDelete('colleges', ids)} />;
            case 'courses':
                return <DataTable title="Courses" data={data.courses} headers={['No.', 'Course Name', 'College', 'Subjects']} onAdd={() => setModal('course')} onDelete={(ids) => handleDelete('courses', ids)} colleges={data.colleges} onManageSubjects={(course) => setSubjectManagerModal(course)} />;
            case 'classes':
                return <DataTable title="Classes" data={data.classes} headers={['No.', 'Class Name', 'College', 'Course', 'Semester']} onAdd={() => setModal('class')} onImport={() => setImportModalType('class')} onDelete={(ids) => handleDelete('classes', ids)} colleges={data.colleges} courses={data.courses} />;
            case 'attendance':
                return <AttendanceTable data={data.attendance} colleges={data.colleges} courses={data.courses} allClasses={data.classes} onDelete={(ids) => handleDelete('attendance', ids)} onEdit={(record) => setEditAttendanceModal(record)} />;
            default: return null;
        }
    };

    return (
        <div className={styles.container}>
            {loading && <div className={styles.loadingOverlay}>Processing...</div>}
            <Sidebar activeSection={activeSection} onNavClick={handleNavClick} isOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
            <main className={styles.mainContent}>
                <header className={styles.header}>
                    <button className={`${styles.sidebarToggle} ${isSidebarOpen ? styles.hidden : ''}`} onClick={() => setSidebarOpen(true)}>›</button>
                    <h1 className={styles.headerTitle}>{activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}</h1>
                </header>
                {renderSection()}
            </main>

            {modal && <Modal type={modal} onClose={() => setModal(null)} onSave={handleSingleAdd} data={data} />}
            {importModalType && <ExcelImportModal type={importModalType} onClose={() => setImportModalType(null)} onSave={handleBulkAdd} />}
            {editAttendanceModal && <EditAttendanceModal record={editAttendanceModal} onClose={() => setEditAttendanceModal(null)} onSave={handleSaveAttendance} />}
            {subjectManagerModal && <SubjectModal course={subjectManagerModal} onClose={() => setSubjectManagerModal(null)} onUpdate={handleUpdateSubjects} />}
        </div>
    );
}

// --- SUB-COMPONENTS ---
const Sidebar = ({ activeSection, onNavClick, isOpen, setSidebarOpen }) => (
    <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
        <div className={styles.sidebarHeader}><button className={styles.sidebarCloseBtn} onClick={() => setSidebarOpen(false)}>&times;</button></div>
        <ul>
            {['dashboard', 'students', 'teachers', 'colleges', 'courses', 'classes', 'attendance'].map(item => (
                <li key={item} className={activeSection === item ? styles.active : ''} onClick={() => onNavClick(item)}>{item.charAt(0).toUpperCase() + item.slice(1)}</li>
            ))}
        </ul>
    </aside>
);

const DashboardSection = ({ stats, chartData }) => (
    <div>
        <div className={styles.dashboardCards}>
            <DashboardCard title="Total Students" count={stats.students.length} icon={<FaUserGraduate />} />
            <DashboardCard title="Total Teachers" count={stats.teachers.length} icon={<FaChalkboardTeacher />} />
            <DashboardCard title="Total Colleges" count={stats.colleges.length} icon={<FaUniversity />} />
            <DashboardCard title="Total Courses" count={stats.courses.length} icon={<FaBookOpen />} />
        </div>
        <div className={styles.card}>
            <h2>Student Enrollment by Semester</h2>
            <div className={styles.chartContainer}>
                {chartData.datasets.length > 0 ? <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false }} /> : <p>No data available.</p>}
            </div>
        </div>
    </div>
);

const DashboardCard = ({ title, count, icon }) => (
    <div className={styles.dashboardCard}>
        <div className={styles.cardIcon}>{icon}</div>
        <div className={styles.cardContent}><h3>{title}</h3><div className={styles.count}>{count}</div></div>
    </div>
);

const DataTable = ({ title, data, headers, onAdd, onImport, onDelete, colleges = [], courses = [], allClasses = [], onManageSubjects, onPromoteFiltered }) => {
    const [filters, setFilters] = useState({ id: '', name: '', college: '', course: '', class: '', semester: '' });
    const [selectedRows, setSelectedRows] = useState([]);

    const dataKeys = useMemo(() => {
        const mapping = { 
            'No.': 'rowIndex', 'Enrollment No': 'enrollmentNo', 'ID': 'id', 'Name': 'name', 'Email': 'email', 
            'College Name': 'name', 'Course Name': 'name', 'Class Name': 'name', 
            'College': 'college', 'Course': 'course', 'Class': 'class', 'Semester': 'semester', 'Mobile': 'mobile', 'Subjects': 'subjects' 
        };
        return headers.map(h => mapping[h] || h.toLowerCase());
    }, [headers]);

    const availableCourses = useMemo(() => filters.college ? courses.filter(c => c.college === filters.college || c.parentName === filters.college) : courses, [filters.college, courses]);
    const availableClasses = useMemo(() => {
        let filtered = allClasses;
        if (filters.college) filtered = filtered.filter(c => c.college === filters.college || c.parentName === filters.college);
        if (filters.course) filtered = filtered.filter(c => c.course === filters.course || c.parentName === filters.course);
        return filtered;
    }, [filters.college, filters.course, allClasses]);

    const handleFilterChange = (name, value) => {
        setFilters(prev => ({ ...prev, [name]: value, ...(name === 'college' ? { course: '', class: '' } : {}), ...(name === 'course' ? { class: '' } : {}) }));
    };

    const filteredData = useMemo(() => data.filter(item => {
        const idVal = item.enrollmentNo || item.id || '';
        const nameVal = item.name || '';
        return (!filters.id || idVal.toString().toLowerCase().includes(filters.id.toLowerCase())) &&
            (!filters.name || nameVal.toLowerCase().includes(filters.name.toLowerCase())) &&
            (!filters.college || item.college === filters.college) &&
            (!filters.course || item.course === filters.course) &&
            (!filters.class || item.class === filters.class) &&
            (!filters.semester || item.semester === filters.semester);
    }), [data, filters]);

    useEffect(() => { setSelectedRows([]); }, [filteredData]);
    
    // Corrected Select All Logic
    const handleSelectAll = (e) => setSelectedRows(e.target.checked ? filteredData.map(r => r.enrollmentNo || r.id) : []);
    const handleSelectRow = (id) => setSelectedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);

    // Helper to calculate total subjects from Object or Array
    const getSubjectCount = (subData) => {
        if (!subData) return 0;
        if (Array.isArray(subData)) return subData.length; // Legacy
        // New Object structure { "Sem 1": [...], "Sem 2": [...] }
        return Object.values(subData).flat().length;
    };

    // Check if promotion is enabled
    const canPromote = filters.college && filters.course && filters.semester;

    return (
        <div className={styles.card}>
            <div className={styles.tableHeader}>
                <h2>{title} List</h2>
                <div className={styles.tableHeaderActions}>
                    
                    {/* --- NEW INCREASE SEMESTER BUTTON --- */}
                    {title === 'Students' && (
                        <button 
                            className={styles.addNewBtn} 
                            onClick={() => onPromoteFiltered(filters)}
                            disabled={!canPromote}
                            style={{
                                backgroundColor: '#fd7e14', // Orange
                                marginRight: '10px',
                                opacity: canPromote ? 1 : 0.6,
                                cursor: canPromote ? 'pointer' : 'not-allowed'
                            }}
                            title="Filter by College, Course and Semester to enable"
                        >
                            <FaArrowUp style={{marginRight: 5}}/> 
                            Increase Semester
                        </button>
                    )}
                    {/* ------------------------------------ */}

                    {selectedRows.length > 0 && <button className={`${styles.addNewBtn} ${styles.deleteBtn}`} onClick={() => { onDelete(selectedRows); setSelectedRows([]); }}>Delete Selected</button>}
                    {['Students', 'Teachers', 'Classes'].includes(title) && <button className={`${styles.addNewBtn} ${styles.importBtn}`} onClick={onImport}><FaFileImport style={{marginRight: 5}}/> Import Excel</button>}
                    <button className={styles.addNewBtn} onClick={onAdd}>Add New {title.slice(0, -1)}</button>
                </div>
            </div>
            <div className={styles.filters}>
                {title === 'Students' && <input type="text" placeholder="Search Enrollment No..." value={filters.id} onChange={e => handleFilterChange('id', e.target.value)} />}
                
                <input type="text" placeholder="Search Name..." value={filters.name} onChange={e => handleFilterChange('name', e.target.value)} />
                {['Students', 'Teachers', 'Courses', 'Classes'].includes(title) && <CustomSelect selectedValue={filters.college} onChange={(val) => handleFilterChange('college', val)} options={colleges.map(c => ({ value: c.name, label: c.name }))} placeholder="All Colleges" />}
                {['Students', 'Classes'].includes(title) && <CustomSelect selectedValue={filters.course} onChange={(val) => handleFilterChange('course', val)} options={availableCourses.map(c => ({ value: c.name, label: c.name }))} placeholder="All Courses" disabled={!filters.college} />}
                
                {['Students', 'Classes'].includes(title) && <CustomSelect selectedValue={filters.semester} onChange={(val) => handleFilterChange('semester', val)} options={SEMESTERS.map(y => ({ value: y, label: y }))} placeholder="All Semesters" />}
                
                {title === 'Students' && <CustomSelect selectedValue={filters.class} onChange={(val) => handleFilterChange('class', val)} options={availableClasses.map(c => ({ value: c.name, label: c.name }))} placeholder="All Classes" disabled={!filters.course} />}
            </div>
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th><input type="checkbox" className={styles.checkbox} checked={filteredData.length > 0 && selectedRows.length === filteredData.length} onChange={handleSelectAll} /></th>
                            {headers.map(h => <th key={h}>{h}</th>)}
                            {(title === 'Courses' || title === 'Students') && <th>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map((row, rowIndex) => { 
                            const rowId = row.enrollmentNo || row.id;
                            return (
                                <tr key={rowId} className={selectedRows.includes(rowId) ? styles.selectedRow : ''}>
                                    <td><input type="checkbox" className={styles.checkbox} checked={selectedRows.includes(rowId)} onChange={() => handleSelectRow(rowId)} /></td>
                                    {dataKeys.map((key, index) => (
                                        <td key={key} data-label={headers[index]}>
                                            {key === 'rowIndex' 
                                                ? rowIndex + 1 
                                                : (key === 'subjects' ? getSubjectCount(row[key]) + ' Subjects' : row[key])
                                            }
                                        </td>
                                    ))}
                                    {(title === 'Courses' || title === 'Students') && (
                                        <td data-label="Actions">
                                            {title === 'Courses' && <button className={styles.manageBtn} onClick={() => onManageSubjects(row)}>Manage Subjects</button>}
                                            {title === 'Students' && <Link href={`/student/${row.id}`}><button className={styles.manageBtn} style={{backgroundColor: '#007bff'}}>View Full Report</button></Link>}
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const AttendanceTable = ({ data, colleges, courses, allClasses, onDelete, onEdit }) => {
    const [filters, setFilters] = useState({ studentId: '', college: '', course: '', semester: '', class: '', startDate: '', endDate: '' });
    const [selectedRows, setSelectedRows] = useState([]);

    const availableClasses = useMemo(() => {
        let filtered = allClasses;
        if (filters.college) filtered = filtered.filter(c => c.college === filters.college || c.parentName === filters.college);
        if (filters.course) filtered = filtered.filter(c => c.course === filters.course || c.parentName === filters.course);
        if (filters.semester) filtered = filtered.filter(c => c.semester === filters.semester);
        return filtered;
    }, [allClasses, filters.college, filters.course, filters.semester]);

    const filteredData = useMemo(() => data.filter(item => {
        const itemDate = new Date(item.date);
        const start = filters.startDate ? new Date(filters.startDate) : null;
        const end = filters.endDate ? new Date(filters.endDate) : null;
        const idMatch = !filters.studentId || item.studentId.toLowerCase().includes(filters.studentId.toLowerCase());

        return idMatch &&
            (!filters.college || item.college === filters.college) &&
            (!filters.course || item.course === filters.course) &&
            (!filters.semester || item.semester === filters.semester) &&
            (!filters.class || item.class === filters.class) &&
            (!start || itemDate >= start) && (!end || itemDate <= end);
    }), [data, filters]);

    useEffect(() => { setSelectedRows([]); }, [filteredData]);
    const handleSelectAll = (e) => setSelectedRows(e.target.checked ? filteredData.map(r => r.id) : []);
    const handleSelectRow = (id) => setSelectedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);

    // --- EXPORT TO EXCEL FUNCTION ---
    const handleExportExcel = () => {
        if (filteredData.length === 0) return alert("No data to export");

        const exportData = filteredData.map(row => ({
            "Enrollment No": row.studentId,
            "Student Name": row.studentName,
            "College": row.college,
            "Course": row.course,
            "Semester": row.semester,
            "Class": row.class,
            "Subject": row.subject,
            "Date": row.date,
            "Time": row.startTime && row.endTime ? `${row.startTime} - ${row.endTime}` : 'N/A',
            "Status": row.status === 'P' || row.status === 'Present' ? 'Present' : 'Absent',
            "Recorded By": row.recordedBy || 'N/A'
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Attendance Report");
        
        const dateStr = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `Attendance_Report_${dateStr}.xlsx`);
    };

    return (
        <div className={styles.card}>
            <div className={styles.tableHeader}>
                <h2>Attendance Records</h2>
                <div className={styles.tableHeaderActions}>
                    <button className={`${styles.addNewBtn} ${styles.importBtn}`} onClick={handleExportExcel} style={{backgroundColor: '#28a745'}}>
                        <FaFileDownload style={{marginRight: 5}}/> Download Excel
                    </button>
                    {selectedRows.length > 0 && <button className={`${styles.addNewBtn} ${styles.deleteBtn}`} onClick={() => { onDelete(selectedRows); setSelectedRows([]); }}>Delete Selected</button>}
                </div>
            </div>
            <div className={styles.filters}>
                <input type="text" placeholder="Search Enrollment No..." value={filters.studentId} onChange={e => setFilters({ ...filters, studentId: e.target.value })} />
                
                <CustomSelect selectedValue={filters.college} onChange={(val) => setFilters({ ...filters, college: val, course: '', semester: '', class: '' })} options={colleges.map(c => ({ value: c.name, label: c.name }))} placeholder="All Colleges" />
                <CustomSelect selectedValue={filters.course} onChange={(val) => setFilters({ ...filters, course: val, semester: '', class: '' })} options={courses.filter(c => !filters.college || c.college === filters.college).map(c => ({ value: c.name, label: c.name }))} placeholder="All Courses" />
                <CustomSelect selectedValue={filters.semester} onChange={(val) => setFilters({ ...filters, semester: val, class: '' })} options={SEMESTERS.map(s => ({ value: s, label: s }))} placeholder="All Semesters" disabled={!filters.course} />
                <CustomSelect selectedValue={filters.class} onChange={(val) => setFilters({ ...filters, class: val })} options={availableClasses.map(c => ({ value: c.name, label: c.name }))} placeholder="All Classes" disabled={!filters.semester} />

                <div className={styles.dateFilterGroup}>
                    <input type="date" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} />
                    <span>to</span>
                    <input type="date" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} />
                </div>
            </div>
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th><input type="checkbox" className={styles.checkbox} checked={filteredData.length > 0 && selectedRows.length === filteredData.length} onChange={handleSelectAll} /></th>
                            <th>Enrollment No</th><th>Name</th><th>Recorded By</th><th>Date</th><th>Time</th><th>Status</th><th>Class</th><th>Subject</th><th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map(row => (
                            <tr key={row.id} className={selectedRows.includes(row.id) ? styles.selectedRow : ''}>
                                <td><input type="checkbox" className={styles.checkbox} checked={selectedRows.includes(row.id)} onChange={() => handleSelectRow(row.id)} /></td>
                                <td data-label="ID">{row.studentId}</td>
                                <td data-label="Name">{row.studentName}</td>
                                <td data-label="Recorded By" style={{color: '#666', fontWeight: '500'}}>{row.recordedBy || 'N/A'}</td>
                                <td data-label="Date">{row.date}</td>
                                <td data-label="Time">{row.startTime && row.endTime ? `${row.startTime} - ${row.endTime}` : 'N/A'}</td>
                                <td data-label="Status"><span className={row.status === 'Present' || row.status === 'P' ? styles.statusPresent : styles.statusAbsent}>{row.status === 'P' ? 'Present' : (row.status === 'A' ? 'Absent' : row.status)}</span></td>
                                <td data-label="Class">{row.class}</td>
                                <td data-label="Subject">{row.subject}</td>
                                <td data-label="Actions"><button className={styles.editBtn} onClick={() => onEdit(row)}>Edit</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- UPDATED: SEMESTER WISE SUBJECT MANAGEMENT ---
const SubjectModal = ({ course, onClose, onUpdate }) => {
    // State to hold { "Semester 1": ["Sub1"], "Semester 2": [] }
    const [groupedSubjects, setGroupedSubjects] = useState(() => {
        // Handle conversion if legacy array exists
        if (Array.isArray(course.subjects)) {
            return course.subjects.length > 0 ? { "Semester 1": course.subjects } : {};
        }
        return course.subjects || {};
    });

    const [selectedSemester, setSelectedSemester] = useState('Semester 1');
    const [newSubject, setNewSubject] = useState('');

    const handleAdd = () => {
        if (newSubject && selectedSemester) {
            const currentList = groupedSubjects[selectedSemester] || [];
            
            // Prevent duplicate in same semester
            if (!currentList.includes(newSubject)) {
                const updated = {
                    ...groupedSubjects,
                    [selectedSemester]: [...currentList, newSubject]
                };
                
                setGroupedSubjects(updated);
                setNewSubject('');
                onUpdate(course.id, updated); // Save immediately
            }
        }
    };

    const handleDelete = (sem, sub) => {
        if (confirm(`Remove ${sub} from ${sem}?`)) {
            const updatedList = groupedSubjects[sem].filter(s => s !== sub);
            const updated = { ...groupedSubjects, [sem]: updatedList };
            
            // If empty, maybe remove the key? Keeping it is fine too.
            if (updatedList.length === 0) delete updated[sem];

            setGroupedSubjects(updated);
            onUpdate(course.id, updated);
        }
    };

    return (
        <div className={styles.modal} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}><h2>Manage Subjects: {course.name}</h2><span className={styles.closeBtn} onClick={onClose}>&times;</span></div>
                <div className={styles.modalBody}>
                    
                    {/* Add New Subject Section */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '10px', marginBottom: '20px', alignItems: 'end' }}>
                        <div>
                            <label style={{fontSize:'0.8rem', fontWeight:'bold'}}>Select Semester</label>
                            <CustomSelect 
                                selectedValue={selectedSemester} 
                                onChange={(val) => setSelectedSemester(val)} 
                                options={SEMESTERS.map(s => ({ value: s, label: s }))} 
                                placeholder="Sem" 
                            />
                        </div>
                        <div>
                            <label style={{fontSize:'0.8rem', fontWeight:'bold'}}>Subject Name</label>
                            <input 
                                type="text" 
                                placeholder="Enter Subject" 
                                value={newSubject} 
                                onChange={e => setNewSubject(e.target.value)} 
                                style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc', width: '100%' }} 
                            />
                        </div>
                        <button onClick={handleAdd} className={`${styles.addNewBtn} ${styles.saveBtn}`} style={{height:'42px'}}>Add</button>
                    </div>

                    <hr style={{border: '0', borderTop: '1px solid #eee', margin: '20px 0'}} />

                    {/* Display Subjects Grouped by Semester */}
                    <div className={styles.subjectListContainer}>
                        {Object.keys(groupedSubjects).sort().map(sem => (
                            <div key={sem} style={{ marginBottom: '15px' }}>
                                <h4 style={{ margin: '0 0 8px 0', color: '#555', fontSize: '0.95rem' }}>{sem}</h4>
                                <div className={styles.subjectList}>
                                    {groupedSubjects[sem].map((sub, i) => (
                                        <div key={i} className={styles.subjectTag}>
                                            {sub} <span onClick={() => handleDelete(sem, sub)}>&times;</span>
                                        </div>
                                    ))}
                                    {groupedSubjects[sem].length === 0 && <span style={{fontSize:'0.8rem', color:'#999'}}>No subjects</span>}
                                </div>
                            </div>
                        ))}
                        {Object.keys(groupedSubjects).length === 0 && <p style={{textAlign:'center', color:'#888'}}>No subjects added yet.</p>}
                    </div>

                </div>
            </div>
        </div>
    );
};

const Modal = ({ type, onClose, onSave, data }) => {
    const [formData, setFormData] = useState({});
    const availableCourses = useMemo(() => formData.college ? data.courses.filter(c => c.college === formData.college || c.parentName === formData.college) : [], [formData.college, data.courses]);
    const availableClasses = useMemo(() => formData.course ? data.classes.filter(c => (c.course === formData.course || c.parentName === formData.course) && c.semester === formData.semester) : [], [formData.course, formData.semester, data.classes]);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleSelectChange = (name, value) => {
        setFormData(prev => ({
            ...prev, [name]: value,
            ...(name === 'college' ? { course: '', class: '' } : {}),
            ...(name === 'course' ? { class: '' } : {})
        }));
    };
    const handleSubmit = (e) => { e.preventDefault(); onSave(type, formData); };

    const renderFields = () => {
        switch (type) {
            case 'student': return (
                <>
                    <div className={styles.formGroup}><label>Enrollment No</label><input name="enrollmentNo" onChange={handleChange} required /></div>
                    <div className={styles.formGroup}><label>Name</label><input name="name" onChange={handleChange} required /></div>
                    <div className={styles.formGroup}><label>Email</label><input type="email" name="email" onChange={handleChange} required /></div>
                    <div className={styles.formGroup}><label>Mobile</label><input name="mobile" onChange={handleChange} required /></div>
                    <div className={styles.formGroup}><label>College</label><CustomSelect selectedValue={formData.college} onChange={(val) => handleSelectChange('college', val)} options={data.colleges.map(c => ({ value: c.name, label: c.name }))} placeholder="Select" /></div>
                    <div className={styles.formGroup}><label>Course</label><CustomSelect selectedValue={formData.course} onChange={(val) => handleSelectChange('course', val)} options={availableCourses.map(c => ({ value: c.name, label: c.name }))} placeholder="Select" disabled={!formData.college} /></div>
                    <div className={styles.formGroup}><label>Semester</label><CustomSelect selectedValue={formData.semester} onChange={(val) => handleSelectChange('semester', val)} options={SEMESTERS.map(y => ({ value: y, label: y }))} placeholder="Select" /></div>
                    <div className={styles.formGroup}><label>Class</label><CustomSelect selectedValue={formData.class} onChange={(val) => handleSelectChange('class', val)} options={availableClasses.map(c => ({ value: c.name, label: c.name }))} placeholder="Select" disabled={!formData.course} /></div>
                    <div className={styles.formGroup}><label>Password</label><input type="password" name="password" onChange={handleChange} placeholder="Default: 123456" /></div>
                </>
            );
            case 'teacher': return (
                <>
                    <div className={styles.formGroup}><label>Email (ID)</label><input name="email" onChange={handleChange} required /></div>
                    <div className={styles.formGroup}><label>Name</label><input name="name" onChange={handleChange} required /></div>
                    <div className={styles.formGroup}><label>College</label><CustomSelect selectedValue={formData.college} onChange={(val) => handleSelectChange('college', val)} options={data.colleges.map(c => ({ value: c.name, label: c.name }))} placeholder="Select" /></div>
                    <div className={styles.formGroup}><label>Password</label><input type="password" name="password" onChange={handleChange} placeholder="Default: 123456" /></div>
                </>
            );
            case 'class': return (
                <>
                    <div className={styles.formGroup}><label>Class Name</label><input name="name" onChange={handleChange} required /></div>
                    <div className={styles.formGroup}><label>College</label><CustomSelect selectedValue={formData.college} onChange={(val) => handleSelectChange('college', val)} options={data.colleges.map(c => ({ value: c.name, label: c.name }))} placeholder="Select" /></div>
                    <div className={styles.formGroup}><label>Course</label><CustomSelect selectedValue={formData.course} onChange={(val) => handleSelectChange('course', val)} options={availableCourses.map(c => ({ value: c.name, label: c.name }))} placeholder="Select" disabled={!formData.college} /></div>
                    <div className={styles.formGroup}><label>Semester</label><CustomSelect selectedValue={formData.semester} onChange={(val) => handleSelectChange('semester', val)} options={SEMESTERS.map(y => ({ value: y, label: y }))} placeholder="Select" /></div>
                </>
            );
            case 'course': return (
                <>
                    <div className={styles.formGroup}><label>Course Name</label><input name="name" onChange={handleChange} required /></div>
                    <div className={styles.formGroup}><label>College</label><CustomSelect selectedValue={formData.college} onChange={(val) => handleSelectChange('college', val)} options={data.colleges.map(c => ({ value: c.name, label: c.name }))} placeholder="Select" /></div>
                </>
            );
            case 'college': return <div className={styles.formGroup}><label>College Name</label><input name="name" onChange={handleChange} required /></div>;
            default: return null;
        }
    };

    return (
        <div className={styles.modal} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}><h2>Add {type}</h2><span className={styles.closeBtn} onClick={onClose}>&times;</span></div>
                <form onSubmit={handleSubmit}>
                    {renderFields()}
                    <div className={styles.modalButtons}><button className={`${styles.submitBtn} ${styles.saveBtn}`}>Save</button></div>
                </form>
            </div>
        </div>
    );
};

const EditAttendanceModal = ({ record, onClose, onSave }) => {
    const [status, setStatus] = useState(record.status === 'Present' || record.status === 'P' ? 'P' : 'A');
    return (
        <div className={styles.modal} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}><h2>Edit Attendance</h2><span className={styles.closeBtn} onClick={onClose}>&times;</span></div>
                <p><strong>Student:</strong> {record.studentName}</p>
                <div className={styles.formGroup} style={{ marginTop: '15px' }}><label>Status</label>
                    <CustomSelect selectedValue={status} onChange={(val) => setStatus(val)} options={[{ value: 'P', label: 'Present' }, { value: 'A', label: 'Absent' }]} />
                </div>
                <div className={styles.modalButtons}><button onClick={() => onSave(record.id, status)} className={`${styles.submitBtn} ${styles.saveBtn}`}>Update</button></div>
            </div>
        </div>
    );
};

const ExcelImportModal = ({ type, onClose, onSave }) => {
    const [file, setFile] = useState(null);

    const getColumnRequirements = (importType) => {
        switch(importType) {
            case 'student':
                return {
                    title: "Student Data Requirements",
                    columns: ['Enrollment No', 'Name', 'Email', 'Mobile', 'College', 'Course', 'Semester', 'Class'], 
                    note: "Use 'Semester 1', 'Semester 2', etc."
                };
            case 'teacher':
                return {
                    title: "Teacher Data Requirements",
                    columns: ['Email', 'Name', 'College', 'Password'],
                    note: "If password is left blank, it will default to '123456'. 'Email' is used as ID."
                };
            case 'class':
                return {
                    title: "Class Data Requirements",
                    columns: ['Name', 'College', 'Course', 'Semester'], 
                    note: "Valid Semesters: 'Semester 1', 'Semester 2', etc."
                };
            default:
                return { title: "Import Data", columns: [], note: "" };
        }
    };

    const reqs = getColumnRequirements(type);

    const handleImport = () => {
        if (!file) return alert('Please select a .xlsx or .csv file first.');
        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const rawData = XLSX.utils.sheet_to_json(ws);
            
            const mappedData = rawData.map(row => {
                const newRow = {};
                const getValue = (keyName) => {
                    const foundKey = Object.keys(row).find(k => k.trim().toLowerCase() === keyName.toLowerCase());
                    return foundKey ? row[foundKey] : '';
                };

                if (type === 'student') {
                    newRow.enrollmentNo = getValue('Enrollment No') || getValue('EnrollmentNo');
                    newRow.name = getValue('Name');
                    newRow.email = getValue('Email');
                    newRow.mobile = getValue('Mobile');
                    newRow.college = getValue('College');
                    newRow.course = getValue('Course');
                    newRow.semester = getValue('Semester') || getValue('Year'); 
                    newRow.class = getValue('Class');
                } else if (type === 'teacher') {
                    newRow.email = getValue('Email'); 
                    newRow.name = getValue('Name');
                    newRow.college = getValue('College');
                    newRow.password = getValue('Password') || '123456';
                } else if (type === 'class') {
                    newRow.name = getValue('Name') || getValue('Class Name');
                    newRow.college = getValue('College');
                    newRow.course = getValue('Course');
                    newRow.semester = getValue('Semester') || getValue('Year');
                }
                return newRow;
            });
            onSave(type, mappedData);
        };
        reader.readAsBinaryString(file);
    };

    return (
        <div className={styles.modal} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{maxWidth: '500px'}}>
                <div className={styles.modalHeader}><h2>Import {type.charAt(0).toUpperCase() + type.slice(1)}s</h2><span className={styles.closeBtn} onClick={onClose}>&times;</span></div>
                <div style={{ backgroundColor: '#eef6fc', padding: '15px', borderRadius: '8px', marginBottom: '20px', borderLeft: '4px solid #2d89ef' }}>
                    <h4 style={{margin: '0 0 10px 0', display: 'flex', alignItems: 'center', color: '#1a5c9e'}}><FaInfoCircle style={{marginRight: '8px'}}/> Required File Columns</h4>
                    <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px'}}>
                        {reqs.columns.map((col, idx) => ( <span key={idx} style={{ backgroundColor: '#fff', border: '1px solid #cce3f5', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', color: '#0056b3' }}>{col}</span> ))}
                    </div>
                    {reqs.note && <p style={{fontSize: '12px', fontStyle: 'italic', color: '#666', margin: 0}}>* {reqs.note}</p>}
                </div>
                <div className={styles.formGroup}><label>Upload File (.xlsx, .csv)</label><input type="file" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={e => setFile(e.target.files[0])} style={{ padding: '10px', border: '1px dashed #ccc', width: '100%', borderRadius: '5px', cursor: 'pointer' }} /></div>
                <div className={styles.modalButtons}><button onClick={handleImport} className={`${styles.submitBtn} ${styles.saveBtn}`} style={{width: '100%'}}><FaFileImport style={{marginRight: '8px'}}/> Process Import</button></div>
            </div>
        </div>
    );
};