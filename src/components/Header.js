'use client'; 

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { 
    FaSignOutAlt, 
    FaKey, 
    FaQuestionCircle, 
    FaUserShield,   // Icon for Admin
    FaClipboardList,// Icon for Teacher
    FaListAlt       // Icon for Student
} from 'react-icons/fa';
import styles from '../styles/Header.module.css'; 

// Import your Auth Components
import LoginHelpModal from './auth/LoginHelpModal';
import ChangePasswordModal from './auth/ChangePasswordModal';
import ForgotPasswordFlow from './auth/ForgotPasswordFlow';

const Header = () => {
    const [user, setUser] = useState(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    
    const router = useRouter();
    const pathname = usePathname(); 
    const dropdownRef = useRef(null);

    // --- Modals State ---
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [showChangePassModal, setShowChangePassModal] = useState(false);
    const [showForgotPassModal, setShowForgotPassModal] = useState(false);

    // Function to check user session
    const checkUserSession = () => {
        const stored = localStorage.getItem('user');
        if (stored) {
            try {
                const userData = JSON.parse(stored);
                // Create an initial (e.g., "John Doe" -> "J")
                const initial = userData.name ? userData.name.charAt(0).toUpperCase() : 'U';
                setUser({ ...userData, initial });
            } catch (e) {
                console.error("Error parsing user data", e);
                setUser(null);
            }
        } else {
            setUser(null);
        }
    };

    // Check session on load and route change
    useEffect(() => {
        checkUserSession();
        setIsDropdownOpen(false); // Close dropdown on navigation
    }, [pathname]);

    // Close dropdown if clicked outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        localStorage.removeItem('user');
        try {
            await fetch('/attendance/api/auth/logout', { method: 'POST' });
        } catch (error) {
            console.error('Logout failed', error);
        }
        setUser(null);
        setIsDropdownOpen(false);
        router.push('/'); 
    };

    // Helper to close dropdown and navigate
    const handleNavigation = (path) => {
        setIsDropdownOpen(false);
        router.push(path);
    };

    return (
        <>
            <header className={styles.header}>
                <Link href="/" className={styles.logoLink}>
                    <h1>SU Attendance</h1>
                </Link>

                <div className={styles.userMenu} ref={dropdownRef}>
                    {!user ? (
                        <button 
                            className={styles.userProfileButton}
                            onClick={() => setShowHelpModal(true)}
                            style={{ 
                                padding: '8px 15px', 
                                borderRadius: '20px', 
                                border: '1px solid #007bff',
                                background: 'white' 
                            }}
                        >
                            <FaQuestionCircle style={{ marginRight: '8px', color: '#007bff', fontSize: '1.1rem' }}/>
                            <span style={{ color: '#007bff', fontWeight: '600', fontSize: '0.9rem' }}>How to Login?</span>
                        </button>
                    ) : (
                        <>
                            <button 
                                className={styles.userProfileButton} 
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            >
                                <div className={styles.userAvatar}>
                                    <span>{user.initial}</span>
                                </div>
                                <span className={styles.userName}>{user.name}</span>
                            </button>

                            {isDropdownOpen && (
                                <div className={styles.dropdown}>
                                    <ul>
                                        {/* --- ROLE BASED MENU ITEMS --- */}

                                        {/* 1. ADMIN PANEL */}
                                        {user.role === 'Admin' && (
                                            <li onClick={() => handleNavigation('/admin')}>
                                                <FaUserShield className={styles.dropdownIcon} />
                                                <span>Admin Panel</span>
                                            </li>
                                        )}

                                        {/* 2. TEACHER: TAKE ATTENDANCE */}
                                        {user.role === 'Teacher' && (
                                            <li onClick={() => handleNavigation('/attendance')}>
                                                <FaClipboardList className={styles.dropdownIcon} />
                                                <span>Take Attendance</span>
                                            </li>
                                        )}

                                        {/* 3. STUDENT: VIEW ATTENDANCE */}
                                        {user.role === 'Student' && (
                                            <li onClick={() => handleNavigation(`/student/${user.id}`)}>
                                                <FaListAlt className={styles.dropdownIcon} />
                                                <span>View Attendance</span>
                                            </li>
                                        )}
                                        
                                        <hr style={{ margin: '5px 0', border: '0', borderTop: '1px solid #eee' }} />

                                        {/* --- COMMON ITEMS --- */}
                                        <li onClick={() => { setIsDropdownOpen(false); setShowChangePassModal(true); }}>
                                            <FaKey className={styles.dropdownIcon} />
                                            <span>Change Password</span>
                                        </li>
                                        <li onClick={handleLogout} style={{ color: '#dc3545' }}>
                                            <FaSignOutAlt className={styles.dropdownIcon} style={{ color: '#dc3545' }} />
                                            <span>Logout</span>
                                        </li>
                                    </ul>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </header>

            {/* --- Modals --- */}
            
            {showHelpModal && (
                <LoginHelpModal 
                    onClose={() => setShowHelpModal(false)}
                    onOpenForgot={() => {
                        setShowHelpModal(false);
                        setShowForgotPassModal(true);
                    }} 
                />
            )}

            {showChangePassModal && user && (
                <ChangePasswordModal 
                    user={user} 
                    onClose={() => setShowChangePassModal(false)} 
                />
            )}

            {showForgotPassModal && (
                <ForgotPasswordFlow 
                    onClose={() => setShowForgotPassModal(false)} 
                />
            )}
        </>
    );
};

export default Header;