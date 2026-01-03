'use client';

import { useState, useMemo, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faFilter, faChartLine, faPieChart, faHistory, faCheckCircle, faTimesCircle, faCalendarAlt } from '@fortawesome/free-solid-svg-icons';
import styles from '../../../styles/Sudents.module.css';
import CustomSelect from '../../../components/Select'; 

ChartJS.register(ArcElement, Tooltip, Legend);

export default function StudentAttendancePage({ params }) {
    const router = useRouter();
    const unwrappedParams = use(params); 
    const id = unwrappedParams.id;

   

    const [studentInfo, setStudentInfo] = useState({ enrollmentNo: "", name: 'Loading...', course: '', year: '', semester: '' });
    const [records, setRecords] = useState([]);
    const [availableSubjects, setAvailableSubjects] = useState([]); // NEW: State for subjects from DB
    
    useEffect(() => {
        fetch(`/attendance/api/student/${id}`)
            .then(res => res.json())
            .then(data => {
                if(data.student) setStudentInfo(data.student);
                if(data.records) setRecords(data.records);
                if(data.subjects) setAvailableSubjects(data.subjects); // Store fetched subjects
            })
            .catch(err => {

                setStudentInfo(prev => ({...prev, name: 'Student Not Found'}));
                
            });
    }, [id]);

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [isFiltered, setIsFiltered] = useState(false);

    // UPDATED: Create options from the fetched subjects list
    const subjectOptions = useMemo(() => {
        // If API returned subjects, use them. Otherwise fallback to unique subjects from records.
        if (availableSubjects.length > 0) {
            return availableSubjects.map(sub => ({ value: sub, label: sub }));
        }
        // Fallback
        const uniqueFromRecords = [...new Set(records.map(r => r.subject))].filter(Boolean);
        return uniqueFromRecords.map(sub => ({ value: sub, label: sub }));
    }, [availableSubjects, records]);

    const filteredData = useMemo(() => {
        if (!isFiltered) return records;
        return records.filter(record => 
            (!startDate || record.date >= startDate) && 
            (!endDate || record.date <= endDate) &&
            (!selectedSubject || record.subject === selectedSubject)
        );
    }, [startDate, endDate, selectedSubject, isFiltered, records]);

    const { presentCount, absentCount, totalCount, percentage } = useMemo(() => {
        const total = filteredData.length;
        const present = filteredData.filter(r => r.status === 'Present' || r.status === 'P').length;
        const absent = total - present;
        const percent = total > 0 ? ((present / total) * 100).toFixed(1) : 0;
        return { presentCount: present, absentCount: absent, totalCount: total, percentage: percent };
    }, [filteredData]);
    
    const pieChartData = useMemo(() => ({
        labels: ['Present', 'Absent'],
        datasets: [{
            data: [presentCount, absentCount],
            backgroundColor: ['#28a745', '#dc3545'],
            borderColor: '#ffffff',
            borderWidth: 4,
            hoverOffset: 10,
        }],
    }), [presentCount, absentCount]);

    const pieChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: { animateScale: true },
        plugins: { legend: { position: 'bottom', labels: { font: { size: 14, family: 'Poppins' }, padding: 20 } } },
    };

    const formatTimeRange = (startTime, endTime) => {
        const format12Hour = (time24) => {
            if (!time24) return '';
            let [hours, minutes] = time24.split(':');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12 || 12; 
            return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
        };
        return `${format12Hour(startTime)} to ${format12Hour(endTime)}`;
    };

    const handleFilter = () => setIsFiltered(true);
    
    const handleReset = () => {
        setStartDate('');
        setEndDate('');
        setSelectedSubject('');
        setIsFiltered(false);
    };

    return (
        <div className={styles.mainContainer}>
            <header className={styles.pageHeader}>
                <div className={styles.headerTitleSection}>
                    <h1 className={styles.title}>{studentInfo.name}&apos;s Attendance</h1>
                    <p className={styles.subtitle}>Enrollment: {studentInfo.enrollmentNo || studentInfo.id} | {studentInfo.course} - {studentInfo.semester || studentInfo.year}</p>
                </div>
                <button onClick={() => router.back()} className={styles.backLink}>
                    <FontAwesomeIcon icon={faArrowLeft} /> Back to Attendance
                </button>
            </header>

            <div className={styles.card}>
                <h2><FontAwesomeIcon icon={faFilter} /> Filter Records</h2>
                <div className={styles.filters}>
                    <div className={styles.formGroup} style={{zIndex: 20}}>
                        <label>Subject</label>
                        <CustomSelect 
                            selectedValue={selectedSubject} 
                            onChange={(val) => setSelectedSubject(val)} 
                            options={subjectOptions} 
                            placeholder="All Subjects" 
                        />
                    </div>

                    <div className={styles.formGroup}><label htmlFor="startDate">Start Date</label><input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
                    <div className={styles.formGroup}><label htmlFor="endDate">End Date</label><input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
                    
                    <div className={styles.filterButtons}>
                        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleFilter}>Apply Filter</button>
                        <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleReset}>Reset</button>
                    </div>
                </div>
            </div>

            <div className={styles.attendanceSummaryLayout}>
                <div className={styles.card}>
                    <h2><FontAwesomeIcon icon={faChartLine} /> Attendance Summary {isFiltered && "(Filtered)"}</h2>
                    <div className={styles.summaryCardContent}>
                        <div className={styles.percentageDisplay}><span className={styles.value}>{percentage}%</span><span className={styles.label}>Attendance</span></div>
                        <div className={styles.statsBreakdown}>
                            <div className={`${styles.statItem} ${styles.present}`}><FontAwesomeIcon icon={faCheckCircle} /><div className={styles.text}><div className={styles.label}>Present</div><div className={styles.value}>{presentCount}</div></div></div>
                            <div className={`${styles.statItem} ${styles.absent}`}><FontAwesomeIcon icon={faTimesCircle} /><div className={styles.text}><div className={styles.label}>Absent</div><div className={styles.value}>{absentCount}</div></div></div>
                            <div className={styles.statItem}><FontAwesomeIcon icon={faCalendarAlt} /><div className={styles.text}><div className={styles.label}>Total Classes</div><div className={styles.value}>{totalCount}</div></div></div>
                        </div>
                    </div>
                </div>
                <div className={styles.card}>
                    <h2><FontAwesomeIcon icon={faPieChart} /> Distribution {isFiltered && "(Filtered)"}</h2>
                    <div className={styles.pieChartContainer}><Pie data={pieChartData} options={pieChartOptions} /></div>
                </div>
            </div>

            <div className={styles.card}>
                <h2><FontAwesomeIcon icon={faHistory} /> Attendance Records</h2>
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Subject</th>
                                <th>Time</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.length > 0 ? (
                                filteredData.map((record, index) => (
                                    <tr key={index}>
                                        <td data-label="Date">{record.date}</td>
                                        <td data-label="Subject">{record.subject}</td>
                                        <td data-label="Time">{formatTimeRange(record.startTime, record.endTime)}</td>
                                        <td data-label="Status">
                                            <span className={`${styles.statusBadge} ${record.status === 'Present' || record.status === 'P' ? styles.statusPresent : styles.statusAbsent}`}>
                                                {record.status === 'P' ? 'Present' : (record.status === 'A' ? 'Absent' : record.status)}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="4" style={{ textAlign: 'center' }}>No records found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}