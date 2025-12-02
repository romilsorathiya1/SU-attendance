import React from 'react';
import styles from '../../styles/AuthModals.module.css';
import { FaTimes } from 'react-icons/fa';

const ModalWrapper = ({ title, subtitle, onClose, children }) => {
    return (
        <div className={styles.overlay}>
            <div className={styles.modalCard}>
                <div className={styles.modalHeader}>
                    <h2>{title}</h2>
                    {subtitle && <p>{subtitle}</p>}
                    <button onClick={onClose} className={styles.closeBtn}>
                        <FaTimes />
                    </button>
                </div>
                <div className={styles.modalBody}>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default ModalWrapper;