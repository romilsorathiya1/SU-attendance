'use client';
import { useState, useRef, useEffect } from 'react';
import styles from '../../styles/AuthModals.module.css';

export default function ForgotPasswordFlow({ onClose }) {
    const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Pass
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('Student');
    
    // OTP State
    const [otp, setOtp] = useState(new Array(6).fill(""));
    const otpRefs = useRef([]);

    const [pass, setPass] = useState({ new: '', confirm: '' });
    const [msg, setMsg] = useState({ type: '', text: '' });
    const [loading, setLoading] = useState(false);
    
    // Resend State
    const [resendCooldown, setResendCooldown] = useState(0);

    // --- Timer for Resend ---
    useEffect(() => {
        let timer;
        if (resendCooldown > 0) {
            timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
        }
        return () => clearTimeout(timer);
    }, [resendCooldown]);

    // --- API Helper ---
    const sendOtpApi = async () => {
        const res = await fetch('/attendance/api/auth/send-otp', {
            method: 'POST',
            body: JSON.stringify({ email, role })
        });
        return await res.json();
    };

    // --- Step 1: Send OTP ---
    const handleSendOtp = async (e) => {
        e.preventDefault();
        setLoading(true); setMsg({ type: '', text: '' });

        try {
            const data = await sendOtpApi(); // Use helper
            if (data.success) {
                setStep(2);
                setResendCooldown(30); // 30 seconds cooldown
                setMsg({ type: 'success', text: 'OTP sent to your email.' });
            } else {
                setMsg({ type: 'error', text: data.message });
            }
        } catch (error) {
            setMsg({ type: 'error', text: 'Network error.' });
        } finally {
            setLoading(false);
        }
    };

    // --- Resend Function ---
    const handleResend = async () => {
        if (resendCooldown > 0) return;
        setLoading(true); setMsg({ type: '', text: 'Resending OTP...' });
        
        try {
            const data = await sendOtpApi();
            if (data.success) {
                setResendCooldown(30);
                setMsg({ type: 'success', text: 'New OTP sent successfully!' });
            } else {
                setMsg({ type: 'error', text: data.message });
            }
        } catch (error) {
            setMsg({ type: 'error', text: 'Failed to resend.' });
        } finally {
            setLoading(false);
        }
    };

    // --- Step 2: Verify OTP ---
    const handleOtpChange = (element, index) => {
        const value = element.value;
        // Only allow numbers
        if (/[^0-9]/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto focus next
        if (value && index < 5) {
            otpRefs.current[index + 1].focus();
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        const otpCode = otp.join("");
        if (otpCode.length !== 6) return setMsg({ type: 'error', text: 'Enter full 6-digit OTP' });

        setLoading(true); setMsg({ type: '', text: '' });

        try {
            const res = await fetch('/attendance/api/auth/verify-otp', {
                method: 'POST',
                body: JSON.stringify({ email, role, otp: otpCode })
            });
            const data = await res.json(); // Parse response

            if (res.ok) {
                setStep(3);
                setMsg({ type: '', text: '' });
            } else {
                setMsg({ type: 'error', text: data.message || 'Invalid Code' });
            }
        } catch (error) {
            setMsg({ type: 'error', text: 'Verification failed.' });
        } finally {
            setLoading(false);
        }
    };

    // --- Step 3: Reset Password ---
    const handleReset = async (e) => {
        e.preventDefault();
        if (pass.new !== pass.confirm) return setMsg({ type: 'error', text: "Passwords don't match" });
        
        setLoading(true);
        const otpCode = otp.join("");

        try {
            const res = await fetch('/attendance/api/auth/reset-with-otp', {
                method: 'POST',
                body: JSON.stringify({ email, role, otp: otpCode, password: pass.new })
            });

            if (res.ok) {
                alert('Password Reset Successfully! Login now.');
                onClose();
            } else {
                setMsg({ type: 'error', text: 'Failed to reset password.' });
            }
        } catch (error) {
            setMsg({ type: 'error', text: 'Server error.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modalContainer}>
                <button onClick={onClose} className={styles.closeBtn}>&times;</button>
                <div className={styles.content}>
                    
                    {/* STEP 1: Email Input */}
                    {step === 1 && (
                        <>
                            <h2 className={styles.title}>Forgot Password</h2>
                            <p className={styles.subtitle}>Enter your details to receive a reset code.</p>
                            <form onSubmit={handleSendOtp}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Role</label>
                                    <select value={role} onChange={e=>setRole(e.target.value)} className={styles.select}>
                                        <option value="Student">Student</option>
                                        <option value="Teacher">Teacher</option>
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Registered Email</label>
                                    <input 
                                        type="email" 
                                        className={styles.input} 
                                        value={email}
                                        onChange={e=>setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                {msg.text && <div className={`${styles.message} ${styles[msg.type]}`}>{msg.text}</div>}
                                <button type="submit" className={styles.primaryBtn} disabled={loading}>
                                    {loading ? 'Sending...' : 'Send OTP'}
                                </button>
                            </form>
                        </>
                    )}

                    {/* STEP 2: OTP Verification */}
                    {step === 2 && (
                        <>
                            <h2 className={styles.title}>Enter OTP</h2>
                            <p className={styles.subtitle}>Code sent to <strong>{email}</strong></p>
                            
                            <form onSubmit={handleVerifyOtp}>
                                <div className={styles.otpContainer}>
                                    {otp.map((data, index) => (
                                        <input
                                            key={index}
                                            type="text"
                                            maxLength="1"
                                            className={styles.otpInput}
                                            value={data}
                                            ref={el => otpRefs.current[index] = el}
                                            onChange={e => handleOtpChange(e.target, index)}
                                            onKeyDown={e => {
                                                if (e.key === "Backspace" && !otp[index] && index > 0) 
                                                    otpRefs.current[index - 1].focus();
                                            }}
                                        />
                                    ))}
                                </div>

                                {msg.text && <div className={`${styles.message} ${styles[msg.type]}`}>{msg.text}</div>}
                                
                                <button type="submit" className={styles.primaryBtn} disabled={loading}>
                                    {loading ? 'Verifying...' : 'Verify OTP'}
                                </button>

                                {/* Resend Logic */}
                                <div style={{ marginTop: '20px' }}>
                                    <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '5px' }}>Didn&apos;t receive code?</p>
                                    <button 
                                        type="button" 
                                        onClick={handleResend} 
                                        className={styles.secondaryLink}
                                        style={{ marginTop: 0, opacity: resendCooldown > 0 ? 0.5 : 1 }}
                                        disabled={resendCooldown > 0 || loading}
                                    >
                                        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                                    </button>
                                </div>
                            </form>
                        </>
                    )}

                    {/* STEP 3: New Password */}
                    {step === 3 && (
                        <>
                            <h2 className={styles.title}>Reset Password</h2>
                            <form onSubmit={handleReset}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>New Password</label>
                                    <input 
                                        type="password" 
                                        className={styles.input} 
                                        value={pass.new} 
                                        onChange={e=>setPass({...pass, new:e.target.value})}
                                        required 
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Confirm Password</label>
                                    <input 
                                        type="password" 
                                        className={styles.input} 
                                        value={pass.confirm} 
                                        onChange={e=>setPass({...pass, confirm:e.target.value})}
                                        required 
                                    />
                                </div>
                                {msg.text && <div className={`${styles.message} ${styles[msg.type]}`}>{msg.text}</div>}
                                <button type="submit" className={styles.primaryBtn} disabled={loading}>
                                    {loading ? 'Resetting...' : 'Set New Password'}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}