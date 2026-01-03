'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../styles/Home.module.css'; // OR './page.module.css' depending on your structure
import Link from 'next/link';
import ForgotPasswordFlow from '@/components/auth/ForgotPasswordFlow'; // Import the component

export default function Home() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('Teacher');
    const [isOptionsOpen, setIsOptionsOpen] = useState(false);
    const [error, setError] = useState(false);
    
    // --- NEW: Loading State ---
    const [isLoading, setIsLoading] = useState(false);

    // State for the Forgot Password Modal
    const [showForgotModal, setShowForgotModal] = useState(false);

    const router = useRouter();
    const loginFormRef = useRef(null);
    const customSelectRef = useRef(null);

    const roles = ['Teacher', 'Student', 'Admin'];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (customSelectRef.current && !customSelectRef.current.contains(event.target)) {
                setIsOptionsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogin = async (event) => {
        event.preventDefault();
        setError(false);
        setIsLoading(true); // 1. Start Loading

        try {
            const res = await fetch('/attendance/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, role }),
            });

            if (res.ok) {
                const data = await res.json();
                
                console.log("DATA :- ",data)

                // Store user details in localStorage
                localStorage.setItem('user', JSON.stringify(data.user));
                
                // Redirect Logic
                if (role === 'Admin') {
                    router.push('/admin');
                } 
                else if (role === 'Student') {
                    router.push(`/student/${data.user.id}`); 
                } 
                else {
                    router.push('/attendance');
                }
                
                // Note: We don't set isLoading(false) here to prevent the button 
                // flashing back to "Login" while the page is redirecting.

            } else {
                // 2. Stop Loading on API Error
                setError(true);
                setIsLoading(false);
            }
        } catch (err) {
            console.error(err);
            // 3. Stop Loading on Network Error
            setError(true);
            setIsLoading(false);
        }
    };

    const handleScrollToLogin = () => {
        loginFormRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleOptionClicked = (selectedRole) => {
        setRole(selectedRole);
        setIsOptionsOpen(false);
    };

    return (
        <main className={styles.mainContent}>
            <div className={styles.loginWrapper}>
                <div className={styles.heroSection}>
                    <h2><span className={styles.highlight}>Smart Attendance</span> for a Smarter Campus.</h2>
                    <p>Empowering Shreyarth University&apos;s faculty with a seamless and intelligent way to track student attendance.</p>
                    <button onClick={handleScrollToLogin} className={styles.heroBtn}>Get Started</button>
                </div>

                <div className={styles.loginContainer} ref={loginFormRef}>
                    <h2>{role} Login</h2>
                    <form onSubmit={handleLogin}>
                        <div className={styles.formGroup}>
                            <label>Role</label>
                            <div className={`${styles.customSelect} ${isOptionsOpen ? styles.open : ''}`} ref={customSelectRef}>
                                <div className={styles.customSelect__trigger} onClick={() => setIsOptionsOpen(!isOptionsOpen)}>
                                    <span>{role}</span>
                                    <div className={styles.arrow}></div>
                                </div>
                                {isOptionsOpen && (
                                    <ul className={styles.customSelect__options}>
                                        {roles.map((option) => (
                                            <li key={option} className={`${styles.customSelect__option} ${role === option ? styles.selected : ''}`} onClick={() => handleOptionClicked(option)}>
                                                {option}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="email">
                                {role === 'Student' ? 'Enrollment No / Email' : 'Email Address'}
                            </label>
                            <input 
                                type="text" 
                                id="email" 
                                placeholder={role === 'Student' ? "Enter Enrollment or Email" : "Enter your email"} 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                                required 
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="password">Password</label>
                            <input 
                                type="password" 
                                id="password" 
                                placeholder="Enter your password" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                required 
                            />
                        </div>

                        {/* --- Forgot Password Link --- */}
                        <div style={{textAlign:'right', marginBottom:'15px'}}>
                            <button 
                                type="button" 
                                onClick={() => setShowForgotModal(true)}
                                style={{
                                    background: 'none', 
                                    border: 'none', 
                                    color: '#007bff', 
                                    fontSize: '0.9rem', 
                                    cursor: 'pointer', 
                                    textDecoration: 'underline',
                                    padding: 0,
                                    fontFamily: 'inherit'
                                }}
                            >
                                Forgot Password?
                            </button>
                        </div>

                        {/* --- Login Button with Loading State --- */}
                        <button 
                            type="submit" 
                            className={styles.loginBtn} 
                            disabled={isLoading}
                            style={{ 
                                opacity: isLoading ? 0.7 : 1, 
                                cursor: isLoading ? 'not-allowed' : 'pointer' 
                            }}
                        >
                            {isLoading ? 'Logging in...' : 'Login'}
                        </button>

                        {error && <p className={styles.errorMessage}>Invalid credentials or server error.</p>}
                    </form>
                </div>
            </div>

            {/* --- Render Modal Outside the Layout --- */}
            {showForgotModal && (
                <ForgotPasswordFlow onClose={() => setShowForgotModal(false)} />
            )}
        </main>
    );
}