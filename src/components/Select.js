'use client';

import { useState, useEffect, useRef } from 'react';
import styles from '../styles/Select.module.css';

const CustomSelect = ({ options, selectedValue, onChange, placeholder, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    const selectedOption = options.find(option => option.value === selectedValue);
    const displayValue = selectedOption ? selectedOption.label : placeholder;

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleOptionClick = (value) => {
        onChange(value);
        setIsOpen(false);
    };

    return (
        <div 
            className={`${styles.customSelect} ${isOpen ? styles.open : ''} ${disabled ? styles.disabled : ''}`} 
            ref={wrapperRef}
        >
            <div className={styles.customSelect__trigger} onClick={() => !disabled && setIsOpen(!isOpen)}>
                <span>{displayValue}</span>
                <div className={styles.arrow}></div>
            </div>
            <div className={styles.customSelect__options}>
                {options.map((option,i) => (
                    <div
                        key={i}
                        className={`${styles.customSelect__option} ${selectedValue === option.value ? styles.selected : ''}`}
                        onClick={() => handleOptionClick(option.value)}
                    >
                        {option.label}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CustomSelect;