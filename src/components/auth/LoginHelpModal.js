'use client';
import styles from '../../styles/AuthModals.module.css';

export default function LoginHelpModal({ onClose, onOpenForgot }) {
    return (
        <div className={styles.overlay}>
            <div className={styles.modalContainer}>
                <button onClick={onClose} className={styles.closeBtn}>&times;</button>
                
                <div className={styles.content}>
                    <h2 className={styles.title}>How to Login</h2>
                    <p className={styles.subtitle}>Select your role to view login instructions.</p>

                    <div className={styles.instructionBox}>
                        <span className={styles.instructionTitle}>🎓 For Students</span>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#555' }}>
                            <strong>Username:</strong> Your Enrollment Number<br/>
                            <strong>Password:</strong> Your registered password
                        </p>
                    </div>

                    <div className={styles.instructionBox} style={{ borderLeftColor: '#28a745' }}>
                        <span className={styles.instructionTitle}>👨‍🏫 For Teachers</span>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#555' }}>
                            <strong>Username:</strong> Your Official Email ID<br/>
                            <strong>Password:</strong> Provided administration password
                        </p>
                    </div>

                    <div style={{ marginTop: '25px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                        <p style={{ fontSize: '0.9rem', color: '#666' }}>Can&apos;t access your account?</p>
                        <button onClick={onOpenForgot} className={styles.secondaryLink} style={{ marginTop: 0 }}>
                            Reset Password
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}