'use client';
import { useState } from 'react';
import styles from '../../styles/AuthModals.module.css';

export default function ChangePasswordModal({ user, onClose }) {
    const [formData, setFormData] = useState({ current: '', new: '', confirm: '' });
    const [msg, setMsg] = useState({ type: '', text: '' });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMsg({ type: '', text: '' });

        if (formData.new !== formData.confirm) {
            return setMsg({ type: 'error', text: "New passwords do not match" });
        }
        if (formData.new.length < 6) {
            return setMsg({ type: 'error', text: "Password must be at least 6 characters" });
        }

        setLoading(true);

        try {
            const res = await fetch('/attendance/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: user.id || user.enrollmentNo,
                    role: user.role,
                    currentPassword: formData.current,
                    newPassword: formData.new
                })
            });

            const data = await res.json();

            if (res.ok) {
                alert('Password Updated Successfully!');
                onClose();
            } else {
                setMsg({ type: 'error', text: data.message });
            }
        } catch (error) {
            setMsg({ type: 'error', text: 'Server error occurred.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modalContainer}>
                <button onClick={onClose} className={styles.closeBtn}>&times;</button>
                
                <div className={styles.content}>
                    <h2 className={styles.title}>Change Password</h2>
                    <p className={styles.subtitle}>Update your account security key.</p>

                    <form onSubmit={handleSubmit}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Current Password</label>
                            <input 
                                type="password" 
                                className={styles.input}
                                value={formData.current}
                                onChange={e => setFormData({...formData, current: e.target.value})}
                                required
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>New Password</label>
                            <input 
                                type="password" 
                                className={styles.input}
                                value={formData.new}
                                onChange={e => setFormData({...formData, new: e.target.value})}
                                required
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Confirm New Password</label>
                            <input 
                                type="password" 
                                className={styles.input}
                                value={formData.confirm}
                                onChange={e => setFormData({...formData, confirm: e.target.value})}
                                required
                            />
                        </div>

                        {msg.text && <div className={`${styles.message} ${styles[msg.type]}`}>{msg.text}</div>}

                        <button type="submit" className={styles.primaryBtn} disabled={loading}>
                            {loading ? 'Updating...' : 'Update Password'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}