import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabase';

// ==========================================
// 1. EXTENSIVE SVG ASSET LIBRARY
// ==========================================
const SVGS = {
    home: <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>,
    users: <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>,
    userTie: <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round"/><circle cx="12" cy="7" r="4"/><path d="M12 11v10" strokeLinecap="round"/></svg>,
    door: <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M18 20V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16M2 20h20M14 12v.01" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    clock: <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    calendar: <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    check: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>,
    cross: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>,
    undo: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>,
    shield: <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>,
    broadcast: <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/></svg>,
    alertTriangle: <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>,
    chart: <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>,
    trash: <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>,
    upload: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>,
    download: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>,
    plus: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>,
    save: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>,
    edit: <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>,
    cap: <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 14v6m-3-6v6m6-6v6"/></svg>,
    location: <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
    bus: <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h8M8 11h8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2zM8 19v2a1 1 0 01-2 0v-2M18 19v2a1 1 0 01-2 0v-2"></path></svg>,
    hamburger: <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>,
    phone: <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>,
    email: <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>,
    eye: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
};

// ==========================================
// 2. UTILITY FUNCTIONS & HELPERS
// ==========================================

/**
 * Universal Fetcher: Bypasses Supabase 1000 row limit natively
 * Iterates using range() until all rows are mapped into memory.
 */
const fetchAllRows = async (table, selectQuery = '*') => {
    let allData = [];
    let from = 0;
    const step = 1000;
    
    while (true) {
        const { data, error } = await supabase.from(table).select(selectQuery).range(from, from + step - 1);
        if (error) {
            console.error(`Error fetching table ${table}:`, error);
            break;
        }
        if (!data || data.length === 0) break;
        allData = [...allData, ...data];
        if (data.length < step) break;
        from += step;
    }
    return allData;
};

/**
 * Parses dynamic session strings into standardized Semesters
 */
const getSemesterFromSession = (session) => {
    if (!session) return "";
    const match = session.match(/20\d{2}/);
    if (!match) return session; 
    const startYear = parseInt(match[0], 10);
    const isSpringStart = session.toLowerCase().includes('spring') || session.toLowerCase().includes('sp');
    const d = new Date();
    const currYear = d.getFullYear();
    const currMonth = d.getMonth(); 
    let semestersPassed = (currYear - startYear) * 2;
    if (currMonth >= 7) semestersPassed += 1;
    if (isSpringStart) semestersPassed += 1;
    if (semestersPassed <= 0) return "1ST";
    const suffixes = ["TH", "ST", "ND", "RD"];
    const v = semestersPassed % 100;
    const suffix = suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];
    return `${semestersPassed}${suffix}`;
};

/** Converts '08:30 AM' into minutes for math */
const parseTime = (t) => {
    if (!t) return 0;
    const match12 = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (match12) {
        let h = parseInt(match12[1], 10);
        let m = parseInt(match12[2], 10);
        let ap = match12[3].toUpperCase();
        if (h === 12) h = 0;
        if (ap === 'PM') h += 12;
        return h * 60 + m;
    }
    const match24 = t.match(/(\d+):(\d+)/);
    if (match24) {
        let h = parseInt(match24[1], 10);
        let m = parseInt(match24[2], 10);
        return h * 60 + m;
    }
    return 0;
};

/** Standardizes strings to 12H Format beautifully */
const convertTo12Hour = (timeStr) => {
    if (!timeStr) return "";
    if (timeStr.toUpperCase().includes('AM') || timeStr.toUpperCase().includes('PM')) return timeStr;
    let [h, m] = timeStr.split(':').map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${m === 0 ? '00' : m < 10 ? '0' + m : m} ${suffix}`;
};

const parseCSVText = (csvText = '') => {
    return csvText
        .split(/\r?\n/)
        .filter(line => line.trim())
        .map(line => {
            const cols = [];
            let current = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
                const ch = line[i];
                if (ch === '"' && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else if (ch === '"') {
                    inQuotes = !inQuotes;
                } else if (ch === ',' && !inQuotes) {
                    cols.push(current.trim());
                    current = '';
                } else {
                    current += ch;
                }
            }
            cols.push(current.trim());
            return cols;
        });
};

const normalizeDay = (value = '') => {
    const day = value.trim().toUpperCase();
    const map = { MONDAY: 'MON', TUESDAY: 'TUE', WEDNESDAY: 'WED', THURSDAY: 'THU', FRIDAY: 'FRI', SATURDAY: 'SAT', SUNDAY: 'SUN' };
    return map[day] || day.slice(0, 3);
};

// ==========================================
// 3. MAIN DASHBOARD COMPONENT
// ==========================================

export default function AdminDashboard() {
    // ------------------------------------------
    // A. STATE DECLARATIONS
    // ------------------------------------------
    
    // Auth States
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loginUsername, setLoginUsername] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [authError, setAuthError] = useState(''); // CRITICAL FIX: Explicitly declared here
    const [loadingAuth, setLoadingAuth] = useState(true);

    // Global UI & Layout States
    const [activeTab, setActiveTab] = useState('overview');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [loadingData, setLoadingData] = useState(false);
    const [actionProcessing, setActionProcessing] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isMobileView, setIsMobileView] = useState(false);

    // Database Payload States
    const [crProfiles, setCrProfiles] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [baseSchedule, setBaseSchedule] = useState([]);
    const [exceptions, setExceptions] = useState([]);
    const [attendanceSessions, setAttendanceSessions] = useState([]);
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [pointSchedules, setPointSchedules] = useState([]);
    const [students, setStudents] = useState([]);
    const [notifications, setNotifications] = useState([]);

    // Sub-Tabs & Granular Filters
    const [userSubTab, setUserSubTab] = useState('crs'); 
    const [scheduleSubTab, setScheduleSubTab] = useState('base'); 
    const [filterSem, setFilterSem] = useState(''); 
    const [filterSec, setFilterSec] = useState('');
    const [filterDay, setFilterDay] = useState('ALL');
    const [analyticsView, setAnalyticsView] = useState('attendance'); 
    const [auditSession, setAuditSession] = useState('');
    const [auditSection, setAuditSection] = useState('');

    // Feature Form States
    const [leaveTeacher, setLeaveTeacher] = useState('');
    const [leaveDate, setLeaveDate] = useState('');
    const [holidayDate, setHolidayDate] = useState('');
    const [broadcastMsg, setBroadcastMsg] = useState('');

    // Modals & Entity Forms
    const [isBaseModalOpen, setIsBaseModalOpen] = useState(false);
    const [baseForm, setBaseForm] = useState({ id: null, session: '', section: '', course: '', teacher: '', room: '', day: 'MON', start_time: '08:00 AM', end_time: '09:30 AM' });

    const [isUserEditModalOpen, setIsUserEditModalOpen] = useState(false);
    const [userEditForm, setUserEditForm] = useState({ id: null, type: 'cr', first_name: '', last_name: '', name: '', department: '', session: '', section: '', phone: '', email: '', cnic: '' });

    const [isPointModalOpen, setIsPointModalOpen] = useState(false);
    const [pointForm, setPointForm] = useState({ id: null, route: 'AC_to_BJC', departure_time: '08:00', is_saturday: false });

    const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
    const [studentForm, setStudentForm] = useState({ original_reg: null, student_name: '', registration_number: '', session: '', section: '' });

    const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
    const [attendanceEditData, setAttendanceEditData] = useState({ session: null, recordsMap: {}, studentsList: [] });
    const [uploadStatus, setUploadStatus] = useState({ type: '', text: '' });
    const [scheduleUploadMode, setScheduleUploadMode] = useState('append');
    const [pointsUploadMode, setPointsUploadMode] = useState('append');

    // File Upload Refs
    const fileInputRef = useRef(null);
    const scheduleFileInputRef = useRef(null);
    const scheduleReplaceFileInputRef = useRef(null);
    const pointsFileInputRef = useRef(null);
    const pointsReplaceFileInputRef = useRef(null);
    const crCsvFileInputRef = useRef(null);
    const teacherCsvFileInputRef = useRef(null);

    // Dynamic Constants
    const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
    const timeSlots = [];
    let tMins = 8 * 60; 
    while (tMins < 18 * 60) {
        let h = Math.floor(tMins / 60), m = tMins % 60, amp = h >= 12 ? 'PM' : 'AM', dh = h > 12 ? h - 12 : h;
        if (dh === 0) dh = 12; 
        timeSlots.push(`${String(dh).padStart(2, '0')}:${String(m).padStart(2, '0')} ${amp}`); 
        tMins += 30;
    }

    // ------------------------------------------
    // B. INITIALIZATION & AUTH
    // ------------------------------------------
    
    // Live Clock Ticker
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const updateView = () => setIsMobileView(window.innerWidth < 1024);
        updateView();
        window.addEventListener('resize', updateView);
        return () => window.removeEventListener('resize', updateView);
    }, []);

    // Session Verification
    useEffect(() => {
        const verifyAdminIdentity = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session && session.user && (session.user.email === 'admin@iub.edu.pk' || session.user.email.includes('admin'))) {
                setIsAuthenticated(true);
                fetchDeepDatabase();
            } else {
                setIsAuthenticated(false);
            }
            setLoadingAuth(false);
        };
        verifyAdminIdentity();
    }, []);

    // Manual Form Login Handler
    const handleLogin = async (e) => {
        e.preventDefault();
        setLoadingAuth(true);
        if (loginUsername === 'admin' && loginPassword === 'admin123') {
            setIsAuthenticated(true);
            setAuthError('');
            fetchDeepDatabase();
        } else {
            // Attempt Supabase fallback if local fails
            const { error } = await supabase.auth.signInWithPassword({ email: loginUsername, password: loginPassword });
            if (error) {
                setAuthError('Unauthorized. Access Restricted to HOD Personnel.');
                setIsAuthenticated(false);
            } else {
                setIsAuthenticated(true);
                setAuthError('');
                fetchDeepDatabase();
            }
        }
        setLoadingAuth(false);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setIsAuthenticated(false);
        setLoginUsername('');
        setLoginPassword('');
    };

    // ------------------------------------------
    // C. MASTER DATA PIPELINE
    // ------------------------------------------
    
    const fetchDeepDatabase = async () => {
        setLoadingData(true);
        try {
            const [
                crRes, teacherRes, baseRes, excRes, 
                attSessRes, attRecRes, ptsRes, stdRes, notifRes
            ] = await Promise.all([
                fetchAllRows('cr_profiles'),
                fetchAllRows('teacher_profiles'),
                fetchAllRows('base_schedule'),
                fetchAllRows('schedule_exceptions'),
                fetchAllRows('attendance_sessions', '*, teacher_profiles(name), auth_users:submitted_by(email)'),
                fetchAllRows('attendance_records'),
                fetchAllRows('point_schedules'),
                fetchAllRows('students'),
                fetchAllRows('notifications')
            ]);
            
            setCrProfiles(crRes);
            setTeachers(teacherRes);
            setBaseSchedule(baseRes);
            setExceptions(excRes);
            setAttendanceSessions(attSessRes);
            setAttendanceRecords(attRecRes);
            setPointSchedules(ptsRes);
            setStudents(stdRes.sort((a,b) => a.registration_number.localeCompare(b.registration_number)));
            setNotifications(notifRes.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)));
            
        } catch (error) {
            console.error("Deep Sync Failure:", error);
            alert('Fatal Error synchronizing global database. Check console logs.');
        }
        setLoadingData(false);
    };

    // ------------------------------------------
    // D. MEMOIZED COMPUTATIONS & ANALYTICS
    // ------------------------------------------
    
    // Extracted Maps for Dropdowns
    const uniqueSessions = useMemo(() => [...new Set(baseSchedule.map(s => s.session))].filter(Boolean).sort(), [baseSchedule]);
    const uniqueSections = useMemo(() => [...new Set(baseSchedule.map(s => s.section))].filter(Boolean).sort(), [baseSchedule]);
    const distinctScheduleTeachers = useMemo(() => [...new Set(baseSchedule.map(s => s.teacher))].filter(Boolean).sort(), [baseSchedule]);
    
    // Time Computations
    const currentDayStr = currentTime.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    const todayStr = currentTime.toLocaleDateString('en-CA');
    const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes();

    // 1. Clash Detector Engine (O(N^2) constrained by Day/Room Buckets)
    const clashDetector = useMemo(() => {
        const clashes = [];
        const roomDayGroups = {};
        
        baseSchedule.forEach(cls => {
            const key = `${cls.room}_${cls.day}`;
            if (!roomDayGroups[key]) roomDayGroups[key] = [];
            roomDayGroups[key].push(cls);
        });

        Object.keys(roomDayGroups).forEach(key => {
            const classesInRoom = roomDayGroups[key];
            for (let i = 0; i < classesInRoom.length; i++) {
                for (let j = i + 1; j < classesInRoom.length; j++) {
                    const c1 = classesInRoom[i];
                    const c2 = classesInRoom[j];
                    const s1 = parseTime(c1.start_time);
                    const e1 = parseTime(c1.end_time);
                    const s2 = parseTime(c2.start_time);
                    const e2 = parseTime(c2.end_time);
                    
                    if (s1 < e2 && e1 > s2) { // True overlap logic
                        clashes.push({ c1, c2 });
                    }
                }
            }
        });
        return clashes;
    }, [baseSchedule]);

    // 2. Live Active Radar
    const liveClasses = useMemo(() => {
        return baseSchedule.filter(cls => {
            if (cls.day !== currentDayStr) return false;
            const sMins = parseTime(cls.start_time);
            const eMins = parseTime(cls.end_time);
            
            const exception = exceptions.find(e => e.base_schedule_id === cls.id && e.exception_date === todayStr);
            if (exception && exception.status === 'cancelled') return false;

            return currentMins >= sMins && currentMins < eMins;
        });
    }, [baseSchedule, exceptions, currentMins, currentDayStr, todayStr]);

    // 3. Attendance Defaulters Tracker
    const defaultersList = useMemo(() => {
        if (!filterSem || !filterSec) return [];
        const targeted = baseSchedule.filter(c => c.session === filterSem && c.section === filterSec && c.day === currentDayStr);
        
        return targeted.filter(cls => {
            const eMins = parseTime(cls.end_time);
            if (currentMins < eMins) return false; // Class hasn't finished yet
            
            const exception = exceptions.find(e => e.base_schedule_id === cls.id && e.exception_date === todayStr);
            if (exception && exception.status === 'cancelled') return false; // Cancelled, no attendance needed
            
            const hasAtt = attendanceSessions.some(att => att.base_schedule_id === cls.id && att.session_date === todayStr);
            return !hasAtt; // Defaulter if NO attendance found
        });
    }, [filterSem, filterSec, baseSchedule, exceptions, attendanceSessions, currentMins, currentDayStr, todayStr]);

    // 4. HOD Analytics: Teacher Performance Map
    const teacherPerformance = useMemo(() => {
        const map = {};
        teachers.forEach(t => map[t.name] = { totalConducted: 0, distinctCourses: new Set() });
        
        attendanceSessions.filter(s => s.status === 'approved').forEach(sess => {
            const base = baseSchedule.find(b => b.id === sess.base_schedule_id);
            if (base && base.teacher && map[base.teacher]) {
                map[base.teacher].totalConducted += 1;
                map[base.teacher].distinctCourses.add(`${base.course} (${base.session})`);
            }
        });

        return Object.entries(map).map(([name, data]) => ({ 
            name, 
            totalConducted: data.totalConducted,
            courseScope: Array.from(data.distinctCourses).join(', ')
        })).sort((a,b) => b.totalConducted - a.totalConducted);
    }, [teachers, attendanceSessions, baseSchedule]);

    // 5. HOD Analytics: Master Attendance Overall
    const calculateOverallAttendance = useCallback(() => {
        if (!filterSem || !filterSec) return 0;
        const classIds = baseSchedule.filter(b => b.session === filterSem && b.section === filterSec).map(b => b.id);
        const validSessIds = attendanceSessions.filter(s => classIds.includes(s.base_schedule_id) && s.status === 'approved').map(s => s.id);
        if (validSessIds.length === 0) return 0;

        const validRecords = attendanceRecords.filter(r => validSessIds.includes(r.session_id));
        if (validRecords.length === 0) return 0;

        const presents = validRecords.filter(r => r.status === 'Present' || r.status === 'Leave').length;
        return Math.round((presents / validRecords.length) * 100);
    }, [filterSem, filterSec, baseSchedule, attendanceSessions, attendanceRecords]);


    // ------------------------------------------
    // E. MUTATION HANDLERS
    // ------------------------------------------

    // --- Users: CR & Teacher Workflow ---
    const handleApproveUser = async (table, id) => {
        setActionProcessing(true);
        await supabase.from(table).update({ is_approved: true }).eq('id', id);
        await fetchDeepDatabase();
        setUploadStatus({ type: 'success', text: 'Contact approved and synced with Supabase.' });
        setActionProcessing(false);
    };

    const handleRejectUser = async (table, id, name) => {
        if(!window.confirm(`PERMANENTLY DELETE user profile for ${name}?`)) return;
        setActionProcessing(true);
        await supabase.from(table).delete().eq('id', id);
        await fetchDeepDatabase();
        setUploadStatus({ type: 'success', text: 'Contact deleted from Supabase.' });
        setActionProcessing(false);
    };

    const openEditUserModal = (profile, type) => {
        if (type === 'cr') {
            setUserEditForm({
                id: profile.id,
                type: 'cr',
                first_name: profile.first_name || '',
                last_name: profile.last_name || '',
                name: '',
                department: profile.department || '',
                session: profile.session || '',
                section: profile.section || '',
                phone: profile.phone || '',
                email: profile.email || '',
                cnic: ''
            });
        } else {
            setUserEditForm({
                id: profile.id,
                type: 'teacher',
                first_name: '',
                last_name: '',
                name: profile.name || '',
                department: '',
                session: '',
                section: '',
                phone: profile.phone || '',
                email: profile.email || '',
                cnic: profile.cnic || ''
            });
        }
        setIsUserEditModalOpen(true);
    };

    const openCreateUserModal = (type) => {
        setUserEditForm({
            id: null,
            type,
            first_name: '',
            last_name: '',
            name: '',
            department: '',
            session: '',
            section: '',
            phone: '',
            email: '',
            cnic: ''
        });
        setIsUserEditModalOpen(true);
    };

    const handleSaveUserEdit = async (e) => {
        e.preventDefault();
        setActionProcessing(true);
        const table = userEditForm.type === 'cr' ? 'cr_profiles' : 'teacher_profiles';
        let payload = userEditForm.type === 'cr' 
            ? { first_name: userEditForm.first_name, last_name: userEditForm.last_name, department: userEditForm.department, session: userEditForm.session, section: userEditForm.section, phone: userEditForm.phone, is_approved: true }
            : { name: userEditForm.name, phone: userEditForm.phone, cnic: userEditForm.cnic, email: userEditForm.email, is_approved: true };
        if (userEditForm.id) await supabase.from(table).update(payload).eq('id', userEditForm.id);
        else await supabase.from(table).insert([payload]);
        setIsUserEditModalOpen(false);
        await fetchDeepDatabase();
        setUploadStatus({ type: 'success', text: `${userEditForm.type === 'cr' ? 'CR' : 'Teacher'} contact ${userEditForm.id ? 'updated' : 'added'} and saved to Supabase.` });
        setActionProcessing(false);
    };

    const handleBulkUserCSV = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            setActionProcessing(true);
            try {
                const rows = parseCSVText(event.target.result);
                if (rows.length === 0) throw new Error('CSV is empty');
                const header = rows[0].map(v => v.toLowerCase());
                const hasHeader = header.some(h => h.includes('name') || h.includes('first') || h.includes('phone') || h.includes('section'));
                const body = hasHeader ? rows.slice(1) : rows;
                const payloads = body.map(row => {
                    if (type === 'cr') {
                        return {
                            first_name: row[0]?.trim() || '',
                            last_name: row[1]?.trim() || '',
                            department: row[2]?.trim() || '',
                            session: row[3]?.trim() || '',
                            section: row[4]?.trim().toUpperCase() || '',
                            phone: row[5]?.trim() || '',
                            email: row[6]?.trim() || null,
                            is_approved: true
                        };
                    }
                    return {
                        name: row[0]?.trim() || '',
                        email: row[1]?.trim() || null,
                        phone: row[2]?.trim() || '',
                        cnic: row[3]?.trim() || '',
                        is_approved: true
                    };
                }).filter(entry => type === 'cr' ? entry.first_name && entry.last_name : entry.name);

                if (payloads.length === 0) throw new Error('No valid rows found');
                const table = type === 'cr' ? 'cr_profiles' : 'teacher_profiles';
                await supabase.from(table).insert(payloads);
                await fetchDeepDatabase();
                setUploadStatus({ type: 'success', text: `${payloads.length} ${type === 'cr' ? 'CR' : 'teacher'} contacts imported and saved to Supabase.` });
            } catch (err) {
                setUploadStatus({ type: 'error', text: `CSV upload failed: ${err.message || 'Invalid file format'}` });
            }
            setActionProcessing(false);
            e.target.value = null;
        };
        reader.readAsText(file);
    };

    // --- Teacher Leave Engine (CRITICAL DOMAIN LOGIC) ---
    const handleExecuteTeacherLeave = async (e) => {
        e.preventDefault();
        if (!leaveTeacher || !leaveDate) return alert("Select Teacher and Date");
        if (!window.confirm(`Initiate Global Leave Protocol for ${leaveTeacher} on ${leaveDate}? This will mass-cancel classes and push notifications.`)) return;

        setActionProcessing(true);
        const dayOfWeek = new Date(leaveDate).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
        const impactedClasses = baseSchedule.filter(c => c.teacher === leaveTeacher && c.day === dayOfWeek);
        
        if (impactedClasses.length === 0) {
            alert("No classes exist in the matrix for this teacher on this day.");
            setActionProcessing(false);
            return;
        }

        const exceptionPayloads = [];
        const notifPayloads = [];

        impactedClasses.forEach(cls => {
            exceptionPayloads.push({ base_schedule_id: cls.id, exception_date: leaveDate, status: 'cancelled' });
            notifPayloads.push({ message: `🚨 ALERT: ${cls.course} for Section ${cls.section} is cancelled today as the instructor (${cls.teacher}) is on leave.` });
        });

        await supabase.from('schedule_exceptions').insert(exceptionPayloads);
        await supabase.from('notifications').insert(notifPayloads);
        
        alert(`Leave Protocol Executed. ${impactedClasses.length} matrices cancelled.`);
        setLeaveTeacher(''); setLeaveDate('');
        await fetchDeepDatabase();
        setActionProcessing(false);
    };

    // --- Global Schedule & Holidays ---
    const handleDeclareHoliday = async (e) => {
        e.preventDefault();
        if (!holidayDate) return;
        if (!window.confirm(`DANGER: Declare GLOBAL holiday for ${holidayDate}? ALL classes will be cancelled.`)) return;

        setActionProcessing(true);
        const dayOfWeek = new Date(holidayDate).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
        const impacted = baseSchedule.filter(c => c.day === dayOfWeek);

        if (impacted.length === 0) {
            alert("Matrix is already empty for this day.");
            setActionProcessing(false); return;
        }

        const payloads = impacted.map(cls => ({ base_schedule_id: cls.id, exception_date: holidayDate, status: 'cancelled' }));
        await supabase.from('schedule_exceptions').insert(payloads);
        await supabase.from('notifications').insert([{ message: `🚨 GLOBAL ALERT: University Holiday declared for ${holidayDate}. All campus activities suspended.` }]);
        
        alert(`Holiday Set. ${impacted.length} classes neutralised.`);
        setHolidayDate('');
        await fetchDeepDatabase();
        setActionProcessing(false);
    };

    const handleSaveBaseSchedule = async (e) => {
        e.preventDefault();
        setActionProcessing(true);
        const payload = { ...baseForm };
        delete payload.id;
        if (baseForm.id) await supabase.from('base_schedule').update(payload).eq('id', baseForm.id);
        else await supabase.from('base_schedule').insert([payload]);
        setIsBaseModalOpen(false);
        await fetchDeepDatabase();
        setActionProcessing(false);
    };

    const handleDeleteBaseSchedule = async (id) => {
        if(!window.confirm('Eradicate this base lecture globally?')) return;
        setActionProcessing(true);
        await supabase.from('base_schedule').delete().eq('id', id);
        await fetchDeepDatabase();
        setActionProcessing(false);
    };

    const handleDeleteException = async (id) => {
        if(!window.confirm('Restore base schedule by deleting this exception?')) return;
        setActionProcessing(true);
        await supabase.from('schedule_exceptions').delete().eq('id', id);
        await fetchDeepDatabase();
        setActionProcessing(false);
    };

    const handleBulkScheduleCSV = async (e, mode = 'append') => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            setActionProcessing(true);
            try {
                const rows = parseCSVText(event.target.result);
                if (rows.length === 0) throw new Error('CSV is empty');
                const payloads = [];
                let sIdx = rows[0].join('').toLowerCase().includes('session') ? 1 : 0;
                
                for(let i = sIdx; i < rows.length; i++) {
                    const row = rows[i];
                    if (row.length >= 8 && row[0] && row[1] && row[2]) {
                        payloads.push({ 
                            session: row[0], section: row[1].toUpperCase(), course: row[2], 
                            teacher: row[3], room: row[4], day: normalizeDay(row[5]), 
                            start_time: convertTo12Hour(row[6]), end_time: convertTo12Hour(row[7]) 
                        });
                    }
                }
                if (payloads.length > 0) {
                    if (mode === 'replace') {
                        await supabase.from('base_schedule').delete().neq('id', 0);
                    }
                    await supabase.from('base_schedule').insert(payloads);
                    await fetchDeepDatabase();
                    setUploadStatus({ type: 'success', text: `${payloads.length} base schedule rows ${mode === 'replace' ? 'replaced' : 'added'} and saved to Supabase.` });
                } else {
                    throw new Error('No valid matrix data found');
                }
            } catch (err) {
                setUploadStatus({ type: 'error', text: `Base schedule CSV failed: ${err.message || 'Invalid file format'}` });
            }
            setActionProcessing(false);
            e.target.value = null;
        };
        reader.readAsText(file);
    };

    // --- Global Broadcast ---
    const handleBroadcast = async (e) => {
        e.preventDefault();
        if (!broadcastMsg.includes('GLOBAL')) return alert("Transmission MUST contain 'GLOBAL' to bypass client filters.");
        setActionProcessing(true);
        await supabase.from('notifications').insert([{ message: broadcastMsg }]);
        alert("Transmission Dispatched!");
        setBroadcastMsg('');
        await fetchDeepDatabase();
        setActionProcessing(false);
    };

    // --- Roster & Students ---
    const handleSaveStudent = async (e) => {
        e.preventDefault();
        setActionProcessing(true);
        const payload = { registration_number: studentForm.registration_number, student_name: studentForm.student_name, session: studentForm.session, section: studentForm.section };
        await supabase.from('students').upsert([payload]);
        setIsStudentModalOpen(false);
        await fetchDeepDatabase();
        setActionProcessing(false);
    };

    const handleDeleteStudent = async (reg) => {
        if(!window.confirm(`Purge student ${reg} from the database?`)) return;
        setActionProcessing(true);
        await supabase.from('students').delete().eq('registration_number', reg);
        await fetchDeepDatabase();
        setActionProcessing(false);
    };

    const handleBulkStudentCSV = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!filterSem || !filterSec) { alert("Isolate a Session & Section first."); e.target.value = null; return; }
        
        const reader = new FileReader();
        reader.onload = async (event) => {
            setActionProcessing(true);
            try {
                const text = event.target.result;
                const rows = text.split('\n').map(r => r.split(','));
                const payloads = [];
                let sIdx = rows[0].join('').toLowerCase().includes('regist') ? 1 : 0;

                for(let i = sIdx; i < rows.length; i++) {
                    if (rows[i].length >= 2 && rows[i][0].trim()) {
                        payloads.push({ student_name: rows[i][1].trim(), registration_number: rows[i][0].trim(), session: filterSem, section: filterSec });
                    }
                }
                if (payloads.length > 0) {
                    await supabase.from('students').upsert(payloads);
                    alert(`Roster updated with ${payloads.length} identities.`);
                    await fetchDeepDatabase();
                } else alert("Invalid identity structure.");
            } catch (err) { alert("Parse Exception."); }
            setActionProcessing(false);
            e.target.value = null;
        };
        reader.readAsText(file);
    };

    // --- Attendance Override Engine ---
    const handleOpenAttendanceEditor = async (session) => {
        setActionLoading(true);
        const base = baseSchedule.find(b => b.id === session.base_schedule_id);
        const targetStudents = students.filter(s => s.session === base.session && s.section === base.section);
        const targetRecords = attendanceRecords.filter(r => r.session_id === session.id);
        
        const map = {};
        targetRecords.forEach(r => map[r.student_id] = r.status);
        targetStudents.forEach(s => { if(!map[s.registration_number]) map[s.registration_number] = 'Absent'; });

        setAttendanceEditData({ session, recordsMap: map, studentsList: targetStudents });
        setIsAttendanceModalOpen(true);
        setActionLoading(false);
    };

    const handleSaveAttendanceEdits = async () => {
        setActionProcessing(true);
        const { session, recordsMap, studentsList } = attendanceEditData;
        await supabase.from('attendance_records').delete().eq('session_id', session.id);
        const payloads = studentsList.map(s => ({ session_id: session.id, student_id: s.registration_number, status: recordsMap[s.registration_number] }));
        await supabase.from('attendance_records').insert(payloads);
        alert("Attendance Array Overwritten Successfully.");
        setIsAttendanceModalOpen(false);
        await fetchDeepDatabase();
        setActionProcessing(false);
    };

    // --- Infrastructure & Bus Points ---
    const handleSavePoint = async (e) => {
        e.preventDefault();
        setActionProcessing(true);
        const payload = { route: pointForm.route, departure_time: pointForm.departure_time, is_saturday: pointForm.is_saturday };
        if (pointForm.id) await supabase.from('point_schedules').update(payload).eq('id', pointForm.id);
        else await supabase.from('point_schedules').insert([payload]);
        setIsPointModalOpen(false);
        await fetchDeepDatabase();
        setActionProcessing(false);
    };

    const handleDeletePoint = async (id) => {
        if(!window.confirm('Delete this transport vector?')) return;
        setActionProcessing(true);
        await supabase.from('point_schedules').delete().eq('id', id);
        await fetchDeepDatabase();
        setUploadStatus({ type: 'success', text: 'Point schedule entry deleted from Supabase.' });
        setActionProcessing(false);
    };

    const handlePointsCSVUpload = async (e, mode = 'append') => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            setActionProcessing(true);
            try {
                const rows = parseCSVText(event.target.result);
                if (rows.length === 0) throw new Error('CSV is empty');
                const startIndex = rows[0].join('').toLowerCase().includes('route') ? 1 : 0;
                const payloads = rows.slice(startIndex).map(row => ({
                    route: (row[0] || '').trim(),
                    departure_time: (row[1] || '').trim(),
                    is_saturday: ['true', '1', 'yes', 'y'].includes(((row[2] || '').trim().toLowerCase()))
                })).filter(p => p.route && p.departure_time);

                if (payloads.length === 0) throw new Error('No valid transport rows found');
                if (mode === 'replace') {
                    await supabase.from('point_schedules').delete().neq('id', 0);
                }
                await supabase.from('point_schedules').insert(payloads);
                await fetchDeepDatabase();
                setUploadStatus({ type: 'success', text: `${payloads.length} point schedule rows ${mode === 'replace' ? 'replaced' : 'added'} and saved to Supabase.` });
            } catch (err) {
                setUploadStatus({ type: 'error', text: `Point schedule CSV failed: ${err.message || 'Invalid file format'}` });
            }
            setActionProcessing(false);
            e.target.value = null;
        };
        reader.readAsText(file);
    };


    // ==========================================
    // F. MAIN RENDER PIPELINE
    // ==========================================

    const TABS = [
        { id: 'overview', label: 'HOD Radar', icon: SVGS.chart },
        { id: 'users', label: 'Directory', icon: SVGS.users, badge: crProfiles.filter(c=>!c.is_approved).length + teachers.filter(t=>!t.is_approved).length },
        { id: 'leaves', label: 'Leaves & Cancel', icon: SVGS.userTie },
        { id: 'schedule', label: 'Global Matrix', icon: SVGS.calendar },
        { id: 'broadcast', label: 'Network Alert', icon: SVGS.broadcast },
        { id: 'audit', label: 'Compliance Audit', icon: SVGS.shield },
        { id: 'infra', label: 'Transport', icon: SVGS.bus }
    ];

    if (loadingAuth) return <div style={styles.centerScreen}><div style={styles.loader}></div></div>;

    if (!isAuthenticated) {
        return (
            <div style={styles.authBg}>
                <Head><title>HOD Gateway | IUB</title></Head>
                <div className="expand-anim" style={styles.authCard}>
                    <div style={{ color: '#002147', marginBottom: '20px', display: 'flex', justifyContent: 'center', transform: 'scale(1.5)' }}>{SVGS.shield}</div>
                    <h2 style={{ color: '#002147', margin: '0 0 20px 0', fontWeight: '900' }}>HOD Terminal</h2>
                    {authError && <div style={styles.errorBox}>{authError}</div>}
                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <input type="text" placeholder="Access ID (Email/Username)" value={loginUsername} onChange={e=>setLoginUsername(e.target.value)} required style={styles.inputBox} />
                        <input type="password" placeholder="Passphrase" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} required style={styles.inputBox} />
                        <button type="submit" style={styles.btnPrimary}>AUTHORIZE</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.appWrapper}>
            <Head><title>HOD Console | IUB Assistant</title></Head>
            <style>{`
                body { margin: 0; padding: 0; background-color: #f0f2f5; font-family: 'Roboto', 'Segoe UI', Tahoma, Arial, sans-serif; }
                * { box-sizing: border-box; }
                @keyframes slideFade { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
                .expand-anim { animation: slideFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .hide-scroll::-webkit-scrollbar { display: none; }
                .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            {/* TOP NAVIGATION */}
            <header style={styles.topNav}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ cursor: 'pointer', color: '#F2A900', display: isMobileView ? 'block' : 'none' }} onClick={() => setIsSidebarOpen(true)}>
                        {SVGS.hamburger}
                    </div>
                    <div style={{ fontWeight: 900, color: '#F2A900', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '1px' }}>
                        {SVGS.cap} IUB COMMAND CENTER
                    </div>
                </div>
                <div style={{ display: isMobileView ? 'none' : 'flex', gap: '5px' }}>
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setActiveTab(t.id)} style={styles.navTab(activeTab === t.id)}>
                            {t.icon} {t.label}
                            {t.badge > 0 && <span style={styles.badgeRed}>{t.badge}</span>}
                        </button>
                    ))}
                </div>
                <button onClick={handleLogout} style={styles.btnDangerSm}>TERMINATE</button>
            </header>

            {/* MOBILE SIDEBAR */}
            {isSidebarOpen && (
                <div style={styles.modalBackdrop} onClick={() => setIsSidebarOpen(false)}>
                    <div style={styles.sidebar} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '20px', fontWeight: 900, color: '#002147', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
                            SYSTEM MENU <span onClick={() => setIsSidebarOpen(false)} style={{cursor: 'pointer'}}>{SVGS.cross}</span>
                        </div>
                        {TABS.map(t => (
                            <button key={t.id} onClick={() => { setActiveTab(t.id); setIsSidebarOpen(false); }} style={styles.sideTab(activeTab === t.id)}>
                                {t.icon} {t.label} {t.badge > 0 && <span style={styles.badgeRed}>{t.badge}</span>}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* MAIN CONTENT WORKSPACE */}
            <main style={styles.mainWorkspace}>
                
                {/* SYSTEM PROCESSING INDICATOR */}
                {(loadingData || actionProcessing) && (
                    <div className="expand-anim" style={styles.sysAlertBanner}>
                        <div style={{...styles.loader, width: '16px', height: '16px', borderWidth: '2px'}}></div>
                        {actionProcessing ? 'EXECUTING DIRECTIVE...' : 'SYNCING CORE DATABASE...'}
                    </div>
                )}

                {uploadStatus.text && (
                    <div className="expand-anim" style={styles.statusBanner(uploadStatus.type)}>
                        {uploadStatus.text}
                    </div>
                )}

                {/* ============================================================== */}
                {/* TAB 1: OVERVIEW & RADAR */}
                {/* ============================================================== */}
                {activeTab === 'overview' && (
                    <div className="expand-anim">
                        <div style={styles.grid4}>
                            <div style={styles.kpiCardBlue}>
                                <div style={styles.kpiLabel}>{SVGS.users} Total Students</div>
                                <div style={styles.kpiData}>{students.length}</div>
                            </div>
                            <div style={styles.kpiCardBlue}>
                                <div style={styles.kpiLabel}>{SVGS.door} Active Sections</div>
                                <div style={styles.kpiData}>{uniqueSections.length}</div>
                            </div>
                            <div style={styles.kpiCardBlue}>
                                <div style={styles.kpiLabel}>{SVGS.userTie} Instructors</div>
                                <div style={styles.kpiData}>{teachers.length}</div>
                            </div>
                            <div style={styles.kpiCardRed}>
                                <div style={styles.kpiLabel}>{SVGS.alertTriangle} Classes Cancelled Today</div>
                                <div style={styles.kpiData}>{exceptions.filter(e => e.exception_date === todayStr && e.status === 'cancelled').length}</div>
                            </div>
                        </div>

                        <div style={styles.whiteCard}>
                            <h3 style={styles.cardHeader}>{SVGS.broadcast} LIVE RADAR: Ongoing Classes ({currentDayStr})</h3>
                            <p style={styles.subText}>Auto-synchronizes with system clock. Excludes officially cancelled matrices for today.</p>
                            
                            {liveClasses.length === 0 ? <div style={styles.emptyBox}>No active sessions detected at this time vector.</div> : (
                                <div style={styles.grid3}>
                                    {liveClasses.map(cls => (
                                        <div key={cls.id} style={styles.radarCard}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                                <span style={styles.pulseBadge}><div style={styles.pulseDot}></div> LIVE NOW</span>
                                                <span style={{ fontWeight: 'bold', color: '#0369a1', fontSize: '0.8rem' }}>RM {cls.room}</span>
                                            </div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#002147', marginBottom: '5px' }}>{cls.course}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#555', marginBottom: '10px' }}>{SVGS.userTie} {cls.teacher}</div>
                                            <div style={{ background: '#fef3c7', color: '#b45309', padding: '6px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                                {convertTo12Hour(cls.start_time)} ➔ {convertTo12Hour(cls.end_time)} | {cls.session}-{cls.section}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ============================================================== */}
                {/* TAB 2: DIRECTORY & APPROVALS */}
                {/* ============================================================== */}
                {activeTab === 'users' && (
                    <div className="expand-anim" style={styles.whiteCard}>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #eee', paddingBottom: '15px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={() => setUserSubTab('crs')} style={styles.subTab(userSubTab === 'crs')}>Class Representatives {crProfiles.filter(c=>!c.is_approved).length > 0 && <span style={styles.badgeRed}>{crProfiles.filter(c=>!c.is_approved).length}</span>}</button>
                                <button onClick={() => setUserSubTab('teachers')} style={styles.subTab(userSubTab === 'teachers')}>Faculty Directory {teachers.filter(t=>!t.is_approved).length > 0 && <span style={styles.badgeRed}>{teachers.filter(t=>!t.is_approved).length}</span>}</button>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <input type="file" accept=".csv" ref={crCsvFileInputRef} onChange={(e) => handleBulkUserCSV(e, 'cr')} style={{ display: 'none' }} />
                                <input type="file" accept=".csv" ref={teacherCsvFileInputRef} onChange={(e) => handleBulkUserCSV(e, 'teacher')} style={{ display: 'none' }} />
                                <button onClick={() => userSubTab === 'crs' ? crCsvFileInputRef.current?.click() : teacherCsvFileInputRef.current?.click()} style={{...styles.btnNeutralSm, background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd'}}>{SVGS.upload} Import CSV</button>
                                <button onClick={() => openCreateUserModal(userSubTab === 'crs' ? 'cr' : 'teacher')} style={styles.btnPrimarySm}>{SVGS.plus} Add Contact</button>
                            </div>
                        </div>
                        <div style={styles.csvHint}>
                            {userSubTab === 'crs'
                                ? 'CR CSV format: first_name,last_name,department,session,section,phone,email(optional).'
                                : 'Teacher CSV format: name,email,phone,cnic.'}
                        </div>

                        <div className="hide-scroll" style={{ overflowX: 'auto' }}>
                            <table style={styles.table}>
                                <thead>
                                    <tr style={styles.thRow}>
                                        <th style={styles.th}>Authorization</th>
                                        <th style={styles.th}>Identity</th>
                                        <th style={styles.th}>Contact Vectors</th>
                                        <th style={styles.th}>{userSubTab === 'crs' ? 'Department / Matrix' : 'CNIC Verification'}</th>
                                        <th style={{...styles.th, textAlign: 'right'}}>Commands</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {userSubTab === 'crs' ? crProfiles.map(cr => (
                                        <tr key={cr.id} style={styles.tdRow}>
                                            <td style={styles.td}>{cr.is_approved ? <span style={styles.tagGreen}>Granted</span> : <span style={styles.tagYellow}>Pending</span>}</td>
                                            <td style={styles.td}>
                                                <div style={{fontWeight: 900, color: '#002147'}}>{cr.first_name} {cr.last_name}</div>
                                            </td>
                                            <td style={styles.td}>
                                                <div style={{fontSize: '0.85rem', color: '#555', display: 'flex', alignItems: 'center', gap: '5px'}}>{SVGS.phone} {cr.phone || 'N/A'}</div>
                                            </td>
                                            <td style={styles.td}>
                                                <div style={{fontWeight: 'bold'}}>{cr.department}</div>
                                                <div style={{fontSize: '0.8rem', color: '#666'}}>{cr.session} - Sec {cr.section}</div>
                                            </td>
                                            <td style={{...styles.td, textAlign: 'right'}}>
                                                <div style={{display: 'flex', gap: '5px', justifyContent: 'flex-end'}}>
                                                    {!cr.is_approved && <button onClick={() => handleApproveUser('cr_profiles', cr.id)} style={styles.btnSuccessSm}>{SVGS.check} Approve</button>}
                                                    <button onClick={() => openEditUserModal(cr, 'cr')} style={styles.btnNeutralSm}>{SVGS.edit} Edit</button>
                                                    <button onClick={() => handleRejectUser('cr_profiles', cr.id, cr.first_name)} style={styles.btnDangerSm}>{SVGS.trash} Purge</button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : teachers.map(teacher => (
                                        <tr key={teacher.id} style={styles.tdRow}>
                                            <td style={styles.td}>{teacher.is_approved ? <span style={styles.tagGreen}>Granted</span> : <span style={styles.tagYellow}>Pending</span>}</td>
                                            <td style={styles.td}><div style={{fontWeight: 900, color: '#002147'}}>{teacher.name}</div></td>
                                            <td style={styles.td}>
                                                <div style={{fontSize: '0.85rem', color: '#333', fontWeight: 'bold'}}>{teacher.email}</div>
                                                <div style={{fontSize: '0.8rem', color: '#666', display: 'flex', alignItems: 'center', gap: '5px'}}>{SVGS.phone} {teacher.phone || 'N/A'}</div>
                                            </td>
                                            <td style={styles.td}><div style={{fontFamily: 'monospace', background: '#f8f9fa', padding: '4px 8px', borderRadius: '4px', display: 'inline-block'}}>{teacher.cnic || 'Unverified'}</div></td>
                                            <td style={{...styles.td, textAlign: 'right'}}>
                                                <div style={{display: 'flex', gap: '5px', justifyContent: 'flex-end'}}>
                                                    {!teacher.is_approved && <button onClick={() => handleApproveUser('teacher_profiles', teacher.id)} style={styles.btnSuccessSm}>{SVGS.check} Approve</button>}
                                                    <button onClick={() => openEditUserModal(teacher, 'teacher')} style={styles.btnNeutralSm}>{SVGS.edit} Edit</button>
                                                    <button onClick={() => handleRejectUser('teacher_profiles', teacher.id, teacher.name)} style={styles.btnDangerSm}>{SVGS.trash} Purge</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ============================================================== */}
                {/* TAB 3: LEAVES & HOLIDAYS */}
                {/* ============================================================== */}
                {activeTab === 'leaves' && (
                    <div className="expand-anim" style={styles.grid2}>
                        <div style={styles.whiteCard}>
                            <h3 style={styles.cardHeader}>{SVGS.userTie} Teacher Leave Engine</h3>
                            <p style={styles.subText}>Isolate a teacher and date. The system will locate all corresponding matrices, neutralise them (Cancel), and broadcast a notification to affected sections.</p>
                            <form onSubmit={handleExecuteTeacherLeave} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div>
                                    <label style={styles.label}>Target Instructor</label>
                                    <select value={leaveTeacher} onChange={e=>setLeaveTeacher(e.target.value)} required style={styles.inputBox}>
                                        <option value="">-- Select Identity --</option>
                                        {distinctScheduleTeachers.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={styles.label}>Effective Date</label>
                                    <input type="date" value={leaveDate} onChange={e=>setLeaveDate(e.target.value)} required style={styles.inputBox} />
                                </div>
                                <button type="submit" style={{...styles.btnDanger, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '15px'}}>
                                    {SVGS.alertTriangle} EXECUTE AUTO-CANCEL PROTOCOL
                                </button>
                            </form>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={styles.whiteCard}>
                                <h3 style={{...styles.cardHeader, color: '#dc3545', borderBottomColor: '#fecaca'}}>{SVGS.calendar} Global Holiday Declaration</h3>
                                <p style={styles.subText}>Emergency protocol. Cancels ALL operations on a specific date.</p>
                                <form onSubmit={handleDeclareHoliday} style={{ display: 'flex', gap: '10px' }}>
                                    <input type="date" value={holidayDate} onChange={e=>setHolidayDate(e.target.value)} required style={{...styles.inputBox, flex: 1, marginBottom: 0}} />
                                    <button type="submit" style={styles.btnDanger}>DECLARE</button>
                                </form>
                            </div>
                            
                            <div style={{...styles.whiteCard, flex: 1}}>
                                <h3 style={styles.cardHeader}>{SVGS.undo} Recent Leave Executions</h3>
                                <div className="hide-scroll" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                                    {exceptions.filter(e => e.status === 'cancelled').slice(-10).reverse().map(ex => {
                                        const base = baseSchedule.find(b => b.id === ex.base_schedule_id);
                                        if(!base) return null;
                                        return (
                                            <div key={ex.id} style={{ padding: '12px', background: '#fef2f2', borderLeft: '4px solid #dc3545', borderRadius: '8px', marginBottom: '10px' }}>
                                                <div style={{ fontWeight: 'bold', color: '#991b1b', fontSize: '0.9rem' }}>{base.teacher} <span style={{color: '#dc3545', fontWeight: 'normal'}}>| {ex.exception_date}</span></div>
                                                <div style={{ color: '#7f1d1d', fontSize: '0.8rem', marginTop: '4px' }}>Neutralised: {base.course} (Sec {base.section})</div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ============================================================== */}
                {/* TAB 4: GLOBAL MATRIX SCHEDULE */}
                {/* ============================================================== */}
                {activeTab === 'schedule' && (
                    <div className="expand-anim">
                        
                        {/* CLASH DETECTOR */}
                        {clashDetector.length > 0 && (
                            <div style={{...styles.whiteCard, borderTop: '4px solid #dc3545', background: '#fef2f2'}}>
                                <h3 style={{...styles.cardHeader, color: '#dc3545', borderBottom: 'none', marginBottom: '10px'}}>{SVGS.alertTriangle} CRITICAL SYSTEM CLASHES DETECTED</h3>
                                <div className="hide-scroll" style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {clashDetector.map((clash, idx) => (
                                        <div key={idx} style={{ background: '#fff', border: '1px solid #fecaca', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <strong style={{color: '#991b1b', fontSize: '0.9rem'}}>Spatial Overlap: Room {clash.c1.room} | {clash.c1.day}</strong>
                                                <div style={{fontSize: '0.8rem', color: '#555', marginTop: '4px'}}>
                                                    • {clash.c1.course} ({clash.c1.session}-{clash.c1.section}) [{convertTo12Hour(clash.c1.start_time)} - {convertTo12Hour(clash.c1.end_time)}]<br/>
                                                    • {clash.c2.course} ({clash.c2.session}-{clash.c2.section}) [{convertTo12Hour(clash.c2.start_time)} - {convertTo12Hour(clash.c2.end_time)}]
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div style={styles.whiteCard}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button onClick={() => setScheduleSubTab('base')} style={styles.subTab(scheduleSubTab === 'base')}>{SVGS.calendar} Base Matrix</button>
                                    <button onClick={() => setScheduleSubTab('exceptions')} style={styles.subTab(scheduleSubTab === 'exceptions')}>{SVGS.undo} Exceptions & Overrides</button>
                                </div>
                                {scheduleSubTab === 'base' && (
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <input type="file" accept=".csv" ref={scheduleFileInputRef} onChange={(e) => handleBulkScheduleCSV(e, scheduleUploadMode)} style={{ display: 'none' }} />
                                        <input type="file" accept=".csv" ref={scheduleReplaceFileInputRef} onChange={(e) => handleBulkScheduleCSV(e, 'replace')} style={{ display: 'none' }} />
                                        <button onClick={() => { setScheduleUploadMode('append'); scheduleFileInputRef.current?.click(); }} style={{...styles.btnNeutral, background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd'}}>{SVGS.upload} Add from CSV</button>
                                        <button onClick={() => scheduleReplaceFileInputRef.current?.click()} style={{...styles.btnNeutral, background: '#fff7ed', color: '#c2410c', border: '1px solid #fdba74'}}>{SVGS.upload} Replace by CSV</button>
                                        <button onClick={() => { setBaseForm({ id: null, session: '', section: '', course: '', teacher: '', room: '', day: 'MON', start_time: '08:00 AM', end_time: '09:30 AM' }); setIsBaseModalOpen(true); }} style={styles.btnPrimarySm}>{SVGS.plus} Add Node</button>
                                    </div>
                                )}
                            </div>
                            {scheduleSubTab === 'base' && <div style={styles.csvHint}>Base schedule CSV format: session,section,course,teacher,room,day,start_time,end_time. Replace mode clears old base schedule then saves uploaded rows in Supabase.</div>}

                            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', background: '#f8f9fa', padding: '15px', borderRadius: '10px', border: '1px solid #eee' }}>
                                <div style={{flex: 1, minWidth: '150px'}}>
                                    <label style={{fontSize:'0.75rem', fontWeight:'bold', color:'#666', marginBottom:'4px', display:'block'}}>Isolate Session</label>
                                    <select value={filterSem} onChange={e=>setFilterSem(e.target.value)} style={{...styles.inputBox, marginBottom: 0}}><option value="">All Sessions</option>{uniqueSessions.map(s => <option key={s} value={s}>{s}</option>)}</select>
                                </div>
                                <div style={{flex: 1, minWidth: '150px'}}>
                                    <label style={{fontSize:'0.75rem', fontWeight:'bold', color:'#666', marginBottom:'4px', display:'block'}}>Isolate Section</label>
                                    <select value={filterSec} onChange={e=>setFilterSec(e.target.value)} style={{...styles.inputBox, marginBottom: 0}}><option value="">All Sections</option>{uniqueSections.map(s => <option key={s} value={s}>{s}</option>)}</select>
                                </div>
                                <div style={{flex: 1, minWidth: '150px'}}>
                                    <label style={{fontSize:'0.75rem', fontWeight:'bold', color:'#666', marginBottom:'4px', display:'block'}}>Temporal Filter</label>
                                    <select value={filterDay} onChange={e=>setFilterDay(e.target.value)} style={{...styles.inputBox, marginBottom: 0}}><option value="ALL">All Days</option>{days.map(d => <option key={d} value={d}>{d}</option>)}</select>
                                </div>
                            </div>

                            <div className="hide-scroll" style={{ overflowX: 'auto', maxHeight: '500px', overflowY: 'auto' }}>
                                <table style={styles.table}>
                                    <thead>
                                        <tr style={styles.thRow}>
                                            <th style={styles.th}>Vector (Session/Sec)</th>
                                            <th style={styles.th}>Course & Instructor</th>
                                            <th style={styles.th}>Space/Time Coordinates</th>
                                            <th style={{...styles.th, textAlign: 'right'}}>Admin Interventions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {scheduleSubTab === 'base' ? (
                                            baseSchedule
                                                .filter(b => (filterSem ? b.session === filterSem : true) && (filterSec ? b.section === filterSec : true) && (filterDay !== 'ALL' ? b.day === filterDay : true))
                                                .map(cls => (
                                                    <tr key={cls.id} style={styles.tdRow}>
                                                        <td style={styles.td}>
                                                            <div style={{fontWeight: 900, color: '#002147'}}>{cls.session}</div>
                                                            <div style={{fontSize: '0.8rem', color: '#666', fontWeight: 'bold'}}>Section {cls.section}</div>
                                                        </td>
                                                        <td style={styles.td}>
                                                            <div style={{fontWeight: 'bold', fontSize: '0.95rem'}}>{cls.course}</div>
                                                            <div style={{fontSize: '0.8rem', color: '#666', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px'}}>{SVGS.userTie} {cls.teacher}</div>
                                                        </td>
                                                        <td style={styles.td}>
                                                            <div style={{fontWeight: 900, color: '#F2A900', display: 'flex', alignItems: 'center', gap: '6px'}}>{SVGS.door} Room {cls.room} | {cls.day}</div>
                                                            <div style={{fontSize: '0.8rem', color: '#555', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px'}}>{SVGS.clock} {convertTo12Hour(cls.start_time)} ➔ {convertTo12Hour(cls.end_time)}</div>
                                                        </td>
                                                        <td style={{...styles.td, textAlign: 'right'}}>
                                                            <div style={{display:'flex', gap:'5px', justifyContent: 'flex-end'}}>
                                                                <button onClick={() => { setBaseForm({...cls}); setIsBaseModalOpen(true); }} style={styles.btnNeutralSm}>{SVGS.edit} Modify</button>
                                                                <button onClick={() => handleDeleteBaseSchedule(cls.id)} style={styles.btnDangerSm}>{SVGS.trash} Eradicate</button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                        ) : (
                                            exceptions
                                                .filter(ex => {
                                                    const b = baseSchedule.find(bs => bs.id === ex.base_schedule_id);
                                                    if(!b) return false;
                                                    return (filterSem ? b.session === filterSem : true) && (filterSec ? b.section === filterSec : true);
                                                })
                                                .map(ex => {
                                                    const base = baseSchedule.find(b => b.id === ex.base_schedule_id);
                                                    return (
                                                    <tr key={ex.id} style={styles.tdRow}>
                                                        <td style={styles.td}>
                                                            <div style={{fontWeight: 900, color: '#002147'}}>{base?.session}</div>
                                                            <div style={{fontSize: '0.8rem', color: '#666', fontWeight: 'bold'}}>Sec {base?.section}</div>
                                                        </td>
                                                        <td style={styles.td}>
                                                            <div style={{fontWeight: 'bold', fontSize: '0.95rem'}}>{base?.course}</div>
                                                            <div style={{fontSize: '0.8rem', color: '#666', marginTop: '4px'}}>Target: {ex.exception_date}</div>
                                                        </td>
                                                        <td style={styles.td}>
                                                            {ex.status === 'cancelled' && <span style={styles.tagRed}>CANCELLED</span>}
                                                            {ex.status === 'confirmed' && <span style={styles.tagGreen}>CONFIRMED</span>}
                                                            {ex.status === 'rescheduled' && <span style={styles.tagBlue}>MOVED: {convertTo12Hour(ex.new_start_time)} (Rm {ex.new_room})</span>}
                                                        </td>
                                                        <td style={{...styles.td, textAlign: 'right'}}>
                                                            <button onClick={() => handleDeleteException(ex.id)} style={styles.btnDangerSm}>{SVGS.undo} Reverse</button>
                                                        </td>
                                                    </tr>
                                                )})
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ============================================================== */}
                {/* TAB 5: GLOBAL BROADCAST */}
                {/* ============================================================== */}
                {activeTab === 'broadcast' && (
                    <div className="expand-anim" style={{ maxWidth: '800px', margin: '0 auto' }}>
                        <div style={{...styles.whiteCard, borderTopColor: '#dc3545'}}>
                            <h3 style={{...styles.cardHeader, color: '#dc3545'}}>{SVGS.broadcast} Network-Wide Transmission</h3>
                            <p style={styles.subText}>Push an emergency alert to every active dashboard. System constraint: Message must contain 'GLOBAL' string.</p>
                            <form onSubmit={handleBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <textarea 
                                    required 
                                    value={broadcastMsg}
                                    onChange={e=>setBroadcastMsg(e.target.value)}
                                    placeholder="Type transmission here... e.g. GLOBAL ALERT: All campus activities suspended."
                                    style={{...styles.inputBox, minHeight: '150px', resize: 'vertical', fontSize: '1rem', fontWeight: 'bold'}}
                                />
                                <button type="submit" style={{...styles.btnDanger, padding: '15px', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>{SVGS.broadcast} DISPATCH TO ALL NODES</button>
                            </form>
                        </div>

                        <div style={styles.whiteCard}>
                            <h3 style={styles.cardHeader}>{SVGS.clock} Recent Transmissions</h3>
                            <div className="hide-scroll" style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {notifications.filter(n => n.message.includes('GLOBAL')).slice(0, 15).map(n => (
                                    <div key={n.id} style={{ padding: '15px', background: '#f8f9fa', border: '1px solid #eee', borderLeft: '4px solid #F2A900', borderRadius: '8px' }}>
                                        <div style={{ color: '#002147', fontWeight: 900, marginBottom: '6px', fontSize: '0.95rem' }}>{n.message}</div>
                                        <div style={{ color: '#999', fontSize: '0.75rem', fontWeight: 'bold' }}>{new Date(n.created_at).toLocaleString()}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ============================================================== */}
                {/* TAB 6: AUDIT & RECORDS (Roster + Vault) */}
                {/* ============================================================== */}
                {activeTab === 'audit' && (
                    <div className="expand-anim">
                        
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', background: '#fff', padding: '15px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}>
                            <div style={{flex: 1}}><label style={styles.label}>Audit Target Session</label><select value={auditSession} onChange={e=>{setAuditSession(e.target.value); setFilterSem(e.target.value);}} style={{...styles.inputBox, marginBottom:0}}><option value="">-- Required --</option>{uniqueSessions.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                            <div style={{flex: 1}}><label style={styles.label}>Audit Target Section</label><select value={auditSection} onChange={e=>{setAuditSection(e.target.value); setFilterSec(e.target.value);}} style={{...styles.inputBox, marginBottom:0}}><option value="">-- Required --</option>{uniqueSections.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                        </div>

                        {(!auditSession || !auditSection) ? <div style={styles.emptyBox}>Select Audit Parameters to unlock the HOD Vaults.</div> : (
                            <>
                                {/* DEFAULTER LOGIC */}
                                {defaultersList.length > 0 && (
                                    <div className="expand-anim" style={{...styles.whiteCard, borderTopColor: '#dc3545', background: '#fef2f2'}}>
                                        <h3 style={{...styles.cardHeader, color: '#dc3545', borderBottom: 'none', marginBottom: '10px'}}>{SVGS.alertTriangle} DEFAULTERS DETECTED (NO ATTENDANCE SUBMITTED)</h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '10px' }}>
                                            {defaultersList.map(cls => (
                                                <div key={cls.id} style={{ background: '#fff', padding: '12px', border: '1px solid #fecaca', borderRadius: '8px', borderLeft: '4px solid #dc3545' }}>
                                                    <div style={{fontWeight: 900, color: '#991b1b', marginBottom: '4px'}}>{cls.course}</div>
                                                    <div style={{fontSize: '0.8rem', color: '#7f1d1d', fontWeight: 'bold'}}>{SVGS.clock} Ended at {convertTo12Hour(cls.end_time)}</div>
                                                    <div style={{fontSize: '0.8rem', color: '#555', marginTop: '4px'}}>{SVGS.userTie} Teacher: {cls.teacher}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div style={styles.grid2}>
                                    
                                    {/* ROSTER MANAGEMENT */}
                                    <div style={styles.whiteCard}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                            <h3 style={{margin: 0, color: '#002147', display: 'flex', alignItems: 'center', gap: '8px'}}>{SVGS.users} Identity Roster</h3>
                                            <div style={{ display: 'flex', gap: '5px' }}>
                                                <input type="file" accept=".csv" ref={fileInputRef} onChange={handleBulkStudentCSV} style={{ display: 'none' }} />
                                                <button onClick={() => fileInputRef.current.click()} style={styles.btnNeutralSm}>{SVGS.upload} CSV</button>
                                                <button onClick={() => { setStudentForm({ original_reg: null, student_name: '', registration_number: '', session: auditSession, section: auditSection }); setIsStudentModalOpen(true); }} style={styles.btnPrimarySm}>{SVGS.plus}</button>
                                            </div>
                                        </div>
                                        <div className="hide-scroll" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                            <table style={styles.table}>
                                                <tbody>
                                                    {students.filter(s => s.session === auditSession && s.section === auditSection).map(s => (
                                                        <tr key={s.registration_number} style={styles.tdRow}>
                                                            <td style={{...styles.td, fontWeight: 900, fontSize: '0.85rem'}}>{s.registration_number}</td>
                                                            <td style={{...styles.td, fontSize: '0.85rem'}}>{s.student_name}</td>
                                                            <td style={{...styles.td, textAlign: 'right'}}>
                                                                <button onClick={() => { setStudentForm({...s, original_reg: s.registration_number}); setIsStudentModalOpen(true); }} style={{...styles.btnNeutralSm, padding: '4px 6px'}}>{SVGS.edit}</button>
                                                                <button onClick={() => handleDeleteStudent(s.registration_number)} style={{...styles.btnDangerSm, padding: '4px 6px', marginLeft: '5px'}}>{SVGS.cross}</button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* ATTENDANCE VAULT */}
                                    <div style={styles.whiteCard}>
                                        <h3 style={styles.cardHeader}>{SVGS.shield} Immutable Attendance Vault</h3>
                                        <div className="hide-scroll" style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {attendanceSessions.filter(s => {
                                                const b = baseSchedule.find(bs => bs.id === s.base_schedule_id);
                                                return b && b.session === auditSession && b.section === auditSection;
                                            }).sort((a,b) => new Date(b.session_date) - new Date(a.session_date)).map(sess => {
                                                const base = baseSchedule.find(b => b.id === sess.base_schedule_id);
                                                return (
                                                    <div key={sess.id} style={{ padding: '15px', background: '#f8f9fa', borderRadius: '10px', border: '1px solid #eee', borderLeft: sess.status === 'approved' ? '5px solid #28a745' : '5px solid #F2A900' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                            <strong style={{ color: '#002147' }}>{base.course}</strong>
                                                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', background: '#e9ecef', padding: '2px 8px', borderRadius: '12px' }}>{sess.session_date}</span>
                                                        </div>
                                                        <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '12px' }}>By: {sess.auth_users?.email} | Teacher: {base.teacher}</div>
                                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                            <button onClick={async () => {
                                                                const status = sess.status === 'approved' ? 'pending' : 'approved';
                                                                await supabase.from('attendance_sessions').update({status}).eq('id', sess.id);
                                                                fetchDeepDatabase();
                                                            }} style={{...styles.btnNeutralSm, flex: 1}}>{sess.status === 'approved' ? 'Unapprove' : 'Force Appr'}</button>
                                                            <button onClick={() => handleOpenAttendanceEditor(sess)} style={{...styles.btnPrimarySm, flex: 1, background: '#e0f2fe', color: '#0369a1'}}>Data Edit</button>
                                                            <button onClick={async () => {
                                                                if(window.confirm('Wipe record?')) { await supabase.from('attendance_sessions').delete().eq('id', sess.id); fetchDeepDatabase(); }
                                                            }} style={{...styles.btnDangerSm, flex: 1}}>Wipe</button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ============================================================== */}
                {/* TAB 7: INFRASTRUCTURE (TRANSPORT) */}
                {/* ============================================================== */}
                {activeTab === 'infra' && (
                    <div className="expand-anim" style={{ maxWidth: '800px', margin: '0 auto' }}>
                        <div style={styles.whiteCard}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                                <h3 style={{ margin: 0, color: '#002147', display: 'flex', alignItems: 'center', gap: '8px' }}>{SVGS.bus} Transport Route Engine</h3>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input type="file" accept=".csv" ref={pointsFileInputRef} onChange={(e) => handlePointsCSVUpload(e, pointsUploadMode)} style={{ display: 'none' }} />
                                    <input type="file" accept=".csv" ref={pointsReplaceFileInputRef} onChange={(e) => handlePointsCSVUpload(e, 'replace')} style={{ display: 'none' }} />
                                    <button onClick={() => { setPointsUploadMode('append'); pointsFileInputRef.current?.click(); }} style={{...styles.btnNeutral, background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0'}}>{SVGS.upload} Add CSV</button>
                                    <button onClick={() => pointsReplaceFileInputRef.current?.click()} style={{...styles.btnNeutral, background: '#fff7ed', color: '#c2410c', border: '1px solid #fdba74'}}>{SVGS.upload} Replace CSV</button>
                                    <button onClick={() => { setPointForm({ id: null, route: 'AC_to_BJC', departure_time: '08:00', is_saturday: false }); setIsPointModalOpen(true); }} style={styles.btnPrimarySm}>{SVGS.plus} Add Vector</button>
                                </div>
                            </div>
                            <div style={styles.csvHint}>Point CSV format: route,departure_time,is_saturday. Use route values AC_to_BJC or BJC_to_AC; is_saturday accepts true/false.</div>

                            <div className="hide-scroll" style={{ overflowX: 'auto', maxHeight: '500px', overflowY: 'auto' }}>
                                <table style={styles.table}>
                                    <thead>
                                        <tr style={styles.thRow}>
                                            <th style={styles.th}>Route Vector</th>
                                            <th style={styles.th}>Departure Time</th>
                                            <th style={styles.th}>Logic Domain</th>
                                            <th style={{...styles.th, textAlign: 'right'}}>Commands</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pointSchedules.sort((a,b) => a.departure_time.localeCompare(b.departure_time)).map(p => (
                                            <tr key={p.id} style={styles.tdRow}>
                                                <td style={{...styles.td, fontWeight: 900, color: '#0369a1'}}>{p.route === 'AC_to_BJC' ? 'Abbasia ➔ Baghdad' : 'Baghdad ➔ Abbasia'}</td>
                                                <td style={{...styles.td, fontWeight: 'bold', fontSize: '1.05rem'}}>{convertTo12Hour(p.departure_time.slice(0,5))}</td>
                                                <td style={styles.td}>{p.is_saturday ? <span style={styles.tagYellow}>Saturday Exclusive</span> : <span style={styles.tagGreen}>Standard Weekday</span>}</td>
                                                <td style={{...styles.td, textAlign: 'right'}}>
                                                    <div style={{display: 'flex', gap: '5px', justifyContent: 'flex-end'}}>
                                                        <button onClick={() => {setPointForm(p); setIsPointModalOpen(true);}} style={styles.btnNeutralSm}>{SVGS.edit}</button>
                                                        <button onClick={() => handleDeletePoint(p.id)} style={styles.btnDangerSm}>{SVGS.trash}</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

            </main>

            {/* ============================================================== */}
            {/* OVERLAY MODALS */}
            {/* ============================================================== */}
            
            {/* 1. Base Schedule Editor */}
            {isBaseModalOpen && (
                <div style={styles.modalBackdrop}>
                    <div className="expand-anim" style={styles.modalContent}>
                        <h3 style={{...styles.cardHeader, fontSize: '1.1rem'}}>{SVGS.calendar} {baseForm.id ? 'Modify Coordinate' : 'Establish Matrix Coordinate'}</h3>
                        <form onSubmit={handleSaveBaseSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{display: 'flex', gap: '10px'}}>
                                <div style={{flex: 1}}>
                                    <label style={styles.label}>Session</label>
                                    <input type="text" required placeholder="e.g. Spring 2026" value={baseForm.session} onChange={e=>setBaseForm({...baseForm, session:e.target.value})} style={styles.inputBox} />
                                </div>
                                <div style={{flex: 1}}>
                                    <label style={styles.label}>Section</label>
                                    <input type="text" required placeholder="e.g. 1E" value={baseForm.section} onChange={e=>setBaseForm({...baseForm, section:e.target.value.toUpperCase()})} style={styles.inputBox} />
                                </div>
                            </div>
                            <div><label style={styles.label}>Course Identity</label><input type="text" required value={baseForm.course} onChange={e=>setBaseForm({...baseForm, course:e.target.value})} style={styles.inputBox} /></div>
                            <div><label style={styles.label}>Instructor Identity</label><input type="text" required value={baseForm.teacher} onChange={e=>setBaseForm({...baseForm, teacher:e.target.value})} style={styles.inputBox} /></div>
                            <div style={{display: 'flex', gap: '10px'}}>
                                <div style={{flex: 1}}><label style={styles.label}>Space (Room)</label><input type="text" required value={baseForm.room} onChange={e=>setBaseForm({...baseForm, room:e.target.value})} style={styles.inputBox} /></div>
                                <div style={{flex: 1}}><label style={styles.label}>Temporal (Day)</label><select required value={baseForm.day} onChange={e=>setBaseForm({...baseForm, day:e.target.value})} style={styles.inputBox}>{days.map(d=><option key={d} value={d}>{d}</option>)}</select></div>
                            </div>
                            <div style={{display: 'flex', gap: '10px'}}>
                                <div style={{flex: 1}}><label style={styles.label}>Start Delta</label><select required value={baseForm.start_time} onChange={e=>setBaseForm({...baseForm, start_time:e.target.value})} style={styles.inputBox}>{timeSlots.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
                                <div style={{flex: 1}}><label style={styles.label}>End Delta</label><select required value={baseForm.end_time} onChange={e=>setBaseForm({...baseForm, end_time:e.target.value})} style={styles.inputBox}>{timeSlots.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="button" onClick={()=>setIsBaseModalOpen(false)} style={styles.btnNeutral}>Abort</button>
                                <button type="submit" style={{...styles.btnPrimary, flex: 2}}>Commit to DB</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 2. User Editor */}
            {isUserEditModalOpen && (
                <div style={styles.modalBackdrop}>
                    <div className="expand-anim" style={styles.modalContent}>
                        <h3 style={{...styles.cardHeader, fontSize: '1.1rem'}}>{SVGS.userTie} {userEditForm.id ? 'Profile Intervention' : 'Add Contact'}</h3>
                        <form onSubmit={handleSaveUserEdit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {userEditForm.type === 'cr' ? (
                                <>
                                    <div style={{display:'flex', gap:'10px'}}>
                                        <div style={{flex: 1}}><label style={styles.label}>First Name</label><input type="text" required value={userEditForm.first_name} onChange={e=>setUserEditForm({...userEditForm, first_name:e.target.value})} style={styles.inputBox} /></div>
                                        <div style={{flex: 1}}><label style={styles.label}>Last Name</label><input type="text" required value={userEditForm.last_name} onChange={e=>setUserEditForm({...userEditForm, last_name:e.target.value})} style={styles.inputBox} /></div>
                                    </div>
                                    <div><label style={styles.label}>Department Node</label><input type="text" required value={userEditForm.department} onChange={e=>setUserEditForm({...userEditForm, department:e.target.value})} style={styles.inputBox} /></div>
                                    <div style={{display:'flex', gap:'10px'}}>
                                        <div style={{flex: 1}}><label style={styles.label}>Session</label><input type="text" required value={userEditForm.session} onChange={e=>setUserEditForm({...userEditForm, session:e.target.value})} style={styles.inputBox} /></div>
                                        <div style={{flex: 1}}><label style={styles.label}>Section</label><input type="text" required value={userEditForm.section} onChange={e=>setUserEditForm({...userEditForm, section:e.target.value})} style={styles.inputBox} /></div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div><label style={styles.label}>Full Identity Name</label><input type="text" required value={userEditForm.name} onChange={e=>setUserEditForm({...userEditForm, name:e.target.value})} style={styles.inputBox} /></div>
                                    <div><label style={styles.label}>Registered Email</label><input type="email" value={userEditForm.email} onChange={e=>setUserEditForm({...userEditForm, email:e.target.value})} style={styles.inputBox} /></div>
                                    <div><label style={styles.label}>CNIC Hash</label><input type="text" value={userEditForm.cnic} onChange={e=>setUserEditForm({...userEditForm, cnic:e.target.value})} style={styles.inputBox} /></div>
                                </>
                            )}
                            <div><label style={styles.label}>Telecom Number</label><input type="text" required value={userEditForm.phone} onChange={e=>setUserEditForm({...userEditForm, phone:e.target.value})} style={styles.inputBox} /></div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="button" onClick={()=>setIsUserEditModalOpen(false)} style={styles.btnNeutral}>Abort</button>
                                <button type="submit" style={{...styles.btnSuccess, flex: 2}}>{userEditForm.id ? 'Commit & Approve' : 'Add & Approve'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 3. Point Editor */}
            {isPointModalOpen && (
                <div style={styles.modalBackdrop}>
                    <div className="expand-anim" style={styles.modalContent}>
                        <h3 style={{...styles.cardHeader, fontSize: '1.1rem'}}>{SVGS.bus} Transport Vector Editor</h3>
                        <form onSubmit={handleSavePoint} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <label style={styles.label}>Direction Vector</label>
                                <select value={pointForm.route} onChange={e=>setPointForm({...pointForm, route:e.target.value})} style={styles.inputBox}>
                                    <option value="AC_to_BJC">Abbasia Campus ➔ Baghdad</option>
                                    <option value="BJC_to_AC">Baghdad ➔ Abbasia Campus</option>
                                </select>
                            </div>
                            <div>
                                <label style={styles.label}>Departure Epoch (24H)</label>
                                <input type="time" required value={pointForm.departure_time} onChange={e=>setPointForm({...pointForm, departure_time:e.target.value})} style={styles.inputBox} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8f9fa', padding: '12px', borderRadius: '8px', border: '1px solid #eee' }}>
                                <input type="checkbox" id="satRule" checked={pointForm.is_saturday} onChange={e=>setPointForm({...pointForm, is_saturday:e.target.checked})} style={{width: '20px', height: '20px', accentColor: '#F2A900'}} />
                                <label htmlFor="satRule" style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#002147', cursor: 'pointer' }}>Restrict to Saturday Rule Engine</label>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="button" onClick={()=>setIsPointModalOpen(false)} style={styles.btnNeutral}>Abort</button>
                                <button type="submit" style={{...styles.btnPrimary, flex: 2}}>Commit Vector</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 4. Student Editor */}
            {isStudentModalOpen && (
                <div style={styles.modalBackdrop}>
                    <div className="expand-anim" style={styles.modalContent}>
                        <h3 style={{...styles.cardHeader, fontSize: '1.1rem'}}>{SVGS.users} Identity Manipulation</h3>
                        <form onSubmit={handleSaveStudent} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{display:'flex', gap:'10px'}}>
                                <div style={{flex: 1}}><label style={styles.label}>Session</label><input type="text" required value={studentForm.session} onChange={e=>setStudentForm({...studentForm, session:e.target.value})} style={styles.inputBox} /></div>
                                <div style={{flex: 1}}><label style={styles.label}>Section</label><input type="text" required value={studentForm.section} onChange={e=>setStudentForm({...studentForm, section:e.target.value.toUpperCase()})} style={styles.inputBox} /></div>
                            </div>
                            <div>
                                <label style={styles.label}>Primary Key (Registration Hash)</label>
                                <input type="text" required value={studentForm.registration_number} onChange={e=>setStudentForm({...studentForm, registration_number:e.target.value})} style={{...styles.inputBox, background: studentForm.original_reg ? '#e9ecef' : '#f8f9fa'}} disabled={studentForm.original_reg !== null} />
                                {studentForm.original_reg && <div style={{fontSize: '0.7rem', color: '#dc3545', fontWeight: 'bold', marginTop: '4px'}}>Primary key locked to maintain relational integrity. Purge to recreate.</div>}
                            </div>
                            <div>
                                <label style={styles.label}>Identity Name</label>
                                <input type="text" required value={studentForm.student_name} onChange={e=>setStudentForm({...studentForm, student_name:e.target.value})} style={styles.inputBox} />
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="button" onClick={()=>setIsStudentModalOpen(false)} style={styles.btnNeutral}>Abort</button>
                                <button type="submit" style={{...styles.btnPrimary, flex: 2}}>Commit Record</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 5. Attendance Editor Override */}
            {isAttendanceModalOpen && (
                <div style={styles.modalBackdrop}>
                    <div className="expand-anim" style={{...styles.modalContent, maxWidth: '650px', height: '85vh', display: 'flex', flexDirection: 'column'}}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '2px solid #eee', paddingBottom: '15px' }}>
                            <h3 style={{ margin: 0, color: '#002147', display: 'flex', alignItems: 'center', gap: '8px' }}>{SVGS.shield} Administrative Override: Array Edit</h3>
                            <button onClick={() => setIsAttendanceModalOpen(false)} style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc3545', width: '35px', height: '35px', borderRadius: '50%', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>X</button>
                        </div>
                        
                        <div className="hide-scroll" style={{ overflowY: 'auto', flex: 1, paddingRight: '5px' }}>
                            {attendanceEditData.studentsList.length === 0 ? <div style={styles.emptyBox}>No identities bound to this sector.</div> : (
                                attendanceEditData.studentsList.map((s) => {
                                    const cStat = attendanceEditData.recordsMap[s.registration_number];
                                    return (
                                        <div key={s.registration_number} style={{ background: '#f8f9fa', padding: '15px', borderRadius: '10px', marginBottom: '10px', border: '1px solid #eee' }}>
                                            <div style={{ fontWeight: 900, color: '#002147', marginBottom: '10px', fontSize: '0.95rem' }}>{s.registration_number} — {s.student_name}</div>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                {['Present', 'Absent', 'Leave'].map(st => (
                                                    <button key={st} onClick={() => setAttendanceEditData(p => ({...p, recordsMap: {...p.recordsMap, [s.registration_number]: st}}))}
                                                        style={{
                                                            flex: 1, padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s',
                                                            background: cStat === st ? (st==='Present'?'#dcfce7':st==='Absent'?'#fef2f2':'#fef3c7') : '#fff',
                                                            color: cStat === st ? (st==='Present'?'#15803d':st==='Absent'?'#dc3545':'#b45309') : '#6b7280',
                                                            border: `2px solid ${cStat === st ? (st==='Present'?'#86efac':st==='Absent'?'#fecaca':'#fde68a') : '#e5e7eb'}`,
                                                            boxShadow: cStat === st ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                                                        }}>
                                                        {st}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>

                        <div style={{ paddingTop: '20px', borderTop: '2px solid #eee', marginTop: 'auto' }}>
                            <button onClick={handleSaveAttendanceEdits} style={{...styles.btnPrimary, padding: '15px', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
                                {SVGS.shield} FORCE OVERRIDE DB ARRAY
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ==========================================
// 4. CSS-IN-JS STYLE DICTIONARY
// ==========================================
const styles = {
    appWrapper: { display: 'flex', flexDirection: 'column', minHeight: '100vh', fontFamily: "'Roboto', 'Segoe UI', Tahoma, Arial, sans-serif" },
    centerScreen: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#002147' },
    loader: { border: '4px solid rgba(255, 255, 255, 0.1)', borderLeftColor: '#F2A900', borderRadius: '50%', animation: 'spin 1s linear infinite' },
    authBg: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#002147', padding: '20px' },
    authCard: { background: '#fff', padding: '40px 30px', borderRadius: '20px', width: '100%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' },
    errorBox: { background: '#fef2f2', color: '#dc3545', padding: '12px', borderRadius: '8px', border: '1px solid #fecaca', marginBottom: '20px', fontSize: '0.85rem', fontWeight: 'bold' },
    
    topNav: { background: '#002147', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 1000, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' },
    mainWorkspace: { padding: '20px', maxWidth: '1400px', margin: '0 auto', width: '100%', flex: 1 },
    
    navTab: (active) => ({ background: active ? '#F2A900' : 'transparent', color: active ? '#002147' : '#fff', border: 'none', padding: '8px 12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }),
    sideTab: (active) => ({ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', textAlign: 'left', padding: '15px', border: 'none', background: active ? '#f0f2f5' : '#fff', color: active ? '#002147' : '#555', borderLeft: active ? '4px solid #F2A900' : '4px solid transparent', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', borderBottom: '1px solid #eee' }),
    subTab: (active) => ({ padding: '10px 15px', border: 'none', background: active ? '#002147' : '#e9ecef', color: active ? '#F2A900' : '#555', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s', position: 'relative' }),
    
    btnPrimary: { width: '100%', padding: '12px', background: '#F2A900', color: '#002147', border: 'none', borderRadius: '8px', fontWeight: 900, cursor: 'pointer', transition: '0.2s', fontSize: '0.9rem' },
    btnPrimarySm: { padding: '8px 12px', background: '#002147', color: '#F2A900', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' },
    btnDanger: { padding: '12px 20px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
    btnDangerSm: { padding: '6px 10px', background: '#fef2f2', color: '#dc3545', border: '1px solid #fecaca', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' },
    btnSuccess: { width: '100%', padding: '12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
    btnSuccessSm: { padding: '6px 10px', background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' },
    btnNeutral: { width: '100%', padding: '12px', background: '#e9ecef', color: '#333', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
    btnNeutralSm: { padding: '6px 10px', background: '#f0f2f5', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' },
    
    inputBox: { width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '8px', outline: 'none', fontSize: '0.9rem', background: '#f8f9fa', color: '#111827', transition: 'border-color 0.2s', marginBottom: '15px' },
    label: { display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#4b5563', marginBottom: '6px' },
    
    whiteCard: { background: '#fff', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', marginBottom: '25px' },
    cardHeader: { margin: '0 0 15px 0', borderBottom: '2px solid #f0f2f5', paddingBottom: '12px', color: '#002147', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 900 },
    subText: { fontSize: '0.85rem', color: '#6b7280', marginBottom: '20px', lineHeight: '1.5' },
    emptyBox: { textAlign: 'center', padding: '30px 15px', color: '#9ca3af', fontSize: '0.9rem', background: '#f9fafb', borderRadius: '10px', border: '2px dashed #e5e7eb', fontWeight: 'bold' },
    
    grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '25px' },
    grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' },
    grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' },
    
    kpiCardBlue: { background: 'linear-gradient(135deg, #002147 0%, #003366 100%)', padding: '25px 20px', borderRadius: '15px', boxShadow: '0 10px 20px rgba(0,33,71,0.15)', color: '#fff', borderBottom: '5px solid #F2A900' },
    kpiCardRed: { background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)', padding: '25px 20px', borderRadius: '15px', boxShadow: '0 10px 20px rgba(153,27,27,0.15)', color: '#fff', borderBottom: '5px solid #fca5a5' },
    kpiLabel: { fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '8px' },
    kpiData: { fontSize: '3rem', fontWeight: 900, marginTop: '10px', color: '#F2A900', lineHeight: 1 },
    
    radarCard: { padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb', background: '#fff', borderLeft: '6px solid #28a745', boxShadow: '0 4px 10px rgba(0,0,0,0.03)' },
    pulseBadge: { fontSize: '0.7rem', fontWeight: 900, background: '#fef2f2', color: '#dc3545', padding: '4px 10px', borderRadius: '12px', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.5px' },
    pulseDot: { width: '8px', height: '8px', background: '#dc3545', borderRadius: '50%', animation: 'pulse 1.5s infinite' },
    
    table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem', minWidth: '700px' },
    thRow: { background: '#f8f9fa', borderBottom: '2px solid #dee2e6' },
    th: { padding: '15px', color: '#002147', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px', whiteSpace: 'nowrap' },
    tdRow: { borderBottom: '1px solid #f3f4f6', transition: 'background 0.2s', ':hover': { background: '#f9fafb' } },
    td: { padding: '15px', color: '#374151', verticalAlign: 'middle' },
    
    tagGreen: { background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid #86efac' },
    tagRed: { background: '#fef2f2', color: '#dc3545', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid #fecaca' },
    tagYellow: { background: '#fef3c7', color: '#b45309', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid #fde68a' },
    tagBlue: { background: '#eff6ff', color: '#0369a1', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid #bae6fd' },
    
    badgeRed: { position: 'absolute', top: '-5px', right: '-5px', background: '#dc3545', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '0.65rem', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(220,53,69,0.4)', minWidth: '18px', textAlign: 'center' },
    
    sysAlertBanner: { background: '#eff6ff', color: '#0369a1', padding: '15px', borderRadius: '10px', textAlign: 'center', fontWeight: 900, marginBottom: '25px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', border: '2px solid #bae6fd', fontSize: '0.9rem', letterSpacing: '1px' },
    statusBanner: (type) => ({ background: type === 'error' ? '#fef2f2' : '#ecfdf3', color: type === 'error' ? '#b91c1c' : '#047857', border: `1px solid ${type === 'error' ? '#fecaca' : '#a7f3d0'}`, padding: '12px 14px', borderRadius: '10px', fontWeight: 700, marginBottom: '20px' }),
    csvHint: { fontSize: '0.78rem', color: '#475569', marginBottom: '14px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '10px 12px' },
    
    modalBackdrop: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,33,71,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, padding: '20px', boxSizing: 'border-box', backdropFilter: 'blur(5px)' },
    modalContent: { background: '#fff', padding: '30px', borderRadius: '20px', width: '100%', maxWidth: '450px', boxShadow: '0 25px 50px rgba(0,0,0,0.5)', boxSizing: 'border-box' },
    sidebar: { width: '280px', height: '100%', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '5px 0 25px rgba(0,0,0,0.3)' }
};
