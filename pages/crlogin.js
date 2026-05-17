import { useEffect, useState, useRef, useMemo } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabase';
import AttendanceSheet from '../components/AttendanceSheet'; 
import AIBot from './ai_bot'; // Imported AI Bot

// Helper function to dynamically calculate Semester
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

// --- Custom Nano SVGs for UI ---
const SVGS = {
    tick: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>,
    cross: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>,
    chevronDown: <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>,
    chevronUp: <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path></svg>,
    bell: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>,
    calendar: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2"/><line x1="16" y1="2" x2="16" y2="6" strokeWidth="2"/><line x1="8" y1="2" x2="8" y2="6" strokeWidth="2"/></svg>,
    attendance: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>,
    updates: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"></path></svg>,
    clock: <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth="2"/><polyline points="12 6 12 12 16 14" strokeWidth="2"/></svg>,
    door: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M18 20V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16M2 20h20M14 12v.01" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    userTie: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="7" r="4" strokeWidth="2"/><path d="M12 11v10" strokeWidth="2" strokeLinecap="round"/></svg>,
    home: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>,
    cap: <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 14v6m-3-6v6m6-6v6"/></svg>,
    location: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
    live: <svg width="12" height="12" fill="#dc3545" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>,
    tickCircle: <svg width="16" height="16" fill="none" stroke="#28a745" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
    note: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>,
    users: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>,
    edit: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>,
    trash: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>,
    upload: <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>,
    download: <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>,
    chart: <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>,
    plus: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>,
    undo: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>,
    building: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>,
    alertCircle: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="3"/></svg>,
    rocket: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v8l9-11h-7z"/></svg>,
    eye: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>,
    cap: <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 14v6m-3-6v6m6-6v6"/></svg>,
    bot: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 2l3 6 6 3-6 3-3 6-3-6-6-3 6-3 3-6z"/></svg>,
    botGradient: <svg width="18" height="18" fill="none" stroke="url(#aiGradient)" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 2l3 6 6 3-6 3-3 6-3-6-6-3 6-3 3-6z"/></svg>,
};

export default function Dashboard() {
    const [session, setSession] = useState(null);
    const [profile, setProfile] = useState(null);
    const [schedule, setSchedule] = useState([]); 
    const [baseSchedule, setBaseSchedule] = useState([]); 
    const [roster, setRoster] = useState([]); 
    const [loading, setLoading] = useState(true);
    
    // --- GATEKEEPER STATE ---
    const [isPendingApproval, setIsPendingApproval] = useState(false);

    // --- RESPONSIVE & SIDEBAR STATES ---
    const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // --- DROPDOWN STATES ---
    const [availableRooms, setAvailableRooms] = useState([]);
    const [allDepartmentRooms, setAllDepartmentRooms] = useState([]); 
    const [availableCourses, setAvailableCourses] = useState([]);
    const [availableTeachers, setAvailableTeachers] = useState([]);
    const [teacherCourseMap, setTeacherCourseMap] = useState({}); 
    const [semesters, setSemesters] = useState([]);
    const [milestones, setMilestones] = useState([]);
    const [examSchedules, setExamSchedules] = useState([]);
    const [pointsData, setPointsData] = useState([]);

    // --- TOGGLE STATES FOR MANUAL ENTRY ---
    const [isManualCourse, setIsManualCourse] = useState(false);
    const [isManualTeacher, setIsManualTeacher] = useState(false);
    const [isManualRoom, setIsManualRoom] = useState(false); 

    // --- TAB & UI STATES ---
    const [activeTab, setActiveTab] = useState('weekly'); 
    
    const [selectedDay, setSelectedDay] = useState(() => {
        const today = new Date().toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
        return ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].includes(today) ? today : "MON";
    });
    
    const [expandedLectureId, setExpandedLectureId] = useState(null);

    // --- ATTENDANCE STATES ---
    const [attendanceView, setAttendanceView] = useState('mark'); 
    const [activeAttendanceLecture, setActiveAttendanceLecture] = useState(null);
    const [attendanceStats, setAttendanceStats] = useState([]); 
    const [allSessionsData, setAllSessionsData] = useState([]); 
    const [attendanceSubjectFilter, setAttendanceSubjectFilter] = useState('ALL'); 
    const [attendanceSemesterFilter, setAttendanceSemesterFilter] = useState('');
    const [uploadCsvSubject, setUploadCsvSubject] = useState('');
    
    // --- CSV UPLOAD & HISTORY STATES ---
    const [csvMeta, setCsvMeta] = useState(null); 
    const [uploadStatus, setUploadStatus] = useState('idle'); 
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadLogs, setUploadLogs] = useState([]);

    // --- STUDENT MANAGEMENT STATE ---
    const [newStudent, setNewStudent] = useState({ name: '', roll: '' });
    const fileInputRef = useRef(null);

    // --- ANNOUNCEMENT STATES ---
    const [announcements, setAnnouncements] = useState([]);
    const [editAnnId, setEditAnnId] = useState(null);
    const [oldAnnMsg, setOldAnnMsg] = useState('');
    const [announcementForm, setAnnouncementForm] = useState({ type: 'assignment', subject: '', lecture_selector: '', deadline_date: '', deadline_time: '8:00 AM', topics: '', details: '' });
    const [upcomingLectures, setUpcomingLectures] = useState([]);
    const [currentTime, setCurrentTime] = useState(new Date());
    const notifiedDeadlines = useRef(new Set()); 

    // --- NEW: Added States to Fix Build Errors ---
    const [resendTimer, setResendTimer] = useState(0);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    // --- MODAL STATES ---
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState(null);
    const [newDate, setNewDate] = useState('');
    const [newStartTime, setNewStartTime] = useState('8:00 AM');
    const [newEndTime, setNewEndTime] = useState('9:30 AM');
    const [newRoom, setNewRoom] = useState('');

    const [isBaseModalOpen, setIsBaseModalOpen] = useState(false);
    const [baseForm, setBaseForm] = useState({ id: null, course: '', teacher: '', room: '', day: 'MON', start_time: '8:00 AM', end_time: '9:30 AM' });

    const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

    const timeSlots = [];
    let ts = 8 * 60; 
    while (ts < 18 * 60) {
        let h = Math.floor(ts / 60), m = ts % 60, amp = h >= 12 ? 'PM' : 'AM', dh = h > 12 ? h - 12 : h;
        if (dh === 0) dh = 12; 
        timeSlots.push(`${dh}:${m === 0 ? '00' : m} ${amp}`); 
        ts += 30;
    }

    const convertTo12Hour = (timeStr) => {
        if (!timeStr) return "";
        if (timeStr.toUpperCase().includes('AM') || timeStr.toUpperCase().includes('PM')) return timeStr;
        let [h, m] = timeStr.split(':').map(Number);
        const suffix = h >= 12 ? "PM" : "AM";
        h = h % 12 || 12;
        return `${h}:${m === 0 ? '00' : m < 10 ? '0' + m : m} ${suffix}`;
    };

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

    const parseDbTime = (t) => {
        if (!t) return 0;
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    };

    const formatCountdown = (totalSeconds) => {
        if (totalSeconds <= 0) return "00:00:00";
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const getRemainingDepartureTime = (depTimeStr) => {
        const [h, m] = depTimeStr.split(':').map(Number);
        const depDate = new Date(currentTime);
        depDate.setHours(h, m, 0, 0);
        const diffSecs = Math.floor((depDate - currentTime) / 1000);
        if (diffSecs < 0) return null;
        return formatCountdown(diffSecs);
    };

    const getDateForCurrentWeekDay = (dayName) => {
        const dayMap = { 'SUN': 0, 'MON': 1, 'TUE': 2, 'WED': 3, 'THU': 4, 'FRI': 5, 'SAT': 6 };
        const today = new Date();
        const currentDay = today.getDay(); 
        const targetDay = dayMap[dayName.toUpperCase()];
        const diff = targetDay - currentDay;
        
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + diff);
        return targetDate.toLocaleDateString('en-CA');
    };

    const getNextLectureDate = (dayName) => {
        const dayMap = { 'SUN': 0, 'MON': 1, 'TUE': 2, 'WED': 3, 'THU': 4, 'FRI': 5, 'SAT': 6 };
        const today = new Date();
        const currentDay = today.getDay();
        const targetDay = dayMap[dayName.toUpperCase()];
        let diff = targetDay - currentDay;
        if (diff <= 0) diff += 7;
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + diff);
        return targetDate.toLocaleDateString('en-CA');
    };

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 5000);
    };

    useEffect(() => {
        let interval;
        if (resendTimer > 0) {
            interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [resendTimer]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const isMobile = windowWidth < 768;

    useEffect(() => {
        if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission();
        }

        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) fetchProfileAndSchedule(session.user.id);
            else window.location.href = '/login';
        });

        const timer = setInterval(() => {
            const now = new Date();
            setCurrentTime(now);

            announcements.forEach(ann => {
                if (ann.type === 'assignment' && ann.deadline_date && ann.deadline_time) {
                    const deadlineDate = new Date(ann.deadline_date);
                    const deadlineMins = parseTime(ann.deadline_time);
                    deadlineDate.setHours(Math.floor(deadlineMins / 60), deadlineMins % 60, 0, 0);
                    
                    const diffMins = Math.floor((deadlineDate - now) / 60000);
                    
                    if (diffMins === 120 && !notifiedDeadlines.current.has(ann.id)) {
                        notifiedDeadlines.current.add(ann.id);
                        
                        const msg = `⏰ DEADLINE ALERT: Only 2 hours left for ${ann.subject} Assignment (${ann.topics}).`;
                        
                        supabase.from('notifications').insert([{ message: msg }]).then();
                        
                        if (Notification.permission === "granted") {
                            new Notification("Assignment Deadline Approaching!", { body: msg, icon: "/icon.png" });
                        }
                    }
                }
            });
        }, 60000);

        return () => clearInterval(timer);
    }, [announcements]);

    useEffect(() => {
        if (!profile || !profile.is_approved) return; 
        const channel = supabase
            .channel('cr-realtime-updates')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
                const newMsg = payload.new.message;
                if (newMsg.includes(profile.section) && Notification.permission === "granted") {
                    new Notification("IUB Update Alert", { body: newMsg, icon: "/icon.png" });
                }
            }).subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [profile]);

    useEffect(() => {
        if(announcementForm.subject && announcementForm.subject !== 'General') {
            const relatedLectures = schedule.filter(c => c.course === announcementForm.subject);
            setUpcomingLectures(relatedLectures);
        } else {
            setUpcomingLectures([]);
        }
    }, [announcementForm.subject, schedule]);

    const fetchAllRows = async (table, matchObj = null, inObj = null) => {
        let all = []; let from = 0; const step = 1000;
        while(true) {
            let query = supabase.from(table).select('*').range(from, from + step - 1);
            if (matchObj) query = query.match(matchObj);
            if (inObj) query = query.in(inObj.column, inObj.values);
            
            const { data, error } = await query;
            if (error || !data || data.length === 0) break;
            all = [...all, ...data];
            if (data.length < step) break;
            from += step;
        }
        return { data: all };
    };

    const fetchProfileAndSchedule = async (userId) => {
        setLoading(true);
        const { data: profileData } = await supabase.from('cr_profiles').select('*').eq('id', userId).single();
        
        if (profileData) {
            setProfile(profileData);
            setAttendanceSemesterFilter(profileData.session);
            
            if (profileData.is_approved === false) {
                setIsPendingApproval(true);
                setLoading(false);
                return; 
            }

            const [semRes, msRes, examRes, ptsRes] = await Promise.all([
                fetchAllRows('sem_status'),
                fetchAllRows('academic_milestones'),
                fetchAllRows('exam_schedules'),
                fetchAllRows('point_schedules')
            ]);
            
            setSemesters(semRes.data || []);
            setMilestones(msRes.data || []);
            setExamSchedules(examRes.data || []);
            setPointsData(ptsRes.data || []);

            const { data: rosterData } = await fetchAllRows('students', { session: profileData.session, section: profileData.section });
            const sortedRoster = rosterData.sort((a,b) => a.registration_number.localeCompare(b.registration_number));
            setRoster(sortedRoster);

            const { data: liveScheduleData } = await fetchAllRows('base_schedule', { session: profileData.session, section: profileData.section });
            const { data: archScheduleData } = await fetchAllRows('base_schedule_archive', { session: profileData.session, section: profileData.section });
            
            const scheduleData = [...(liveScheduleData || []), ...(archScheduleData || [])];
            setBaseSchedule(scheduleData);
            
            const { data: allBaseSchedules } = await supabase.from('base_schedule').select('room, teacher, course');
            if (allBaseSchedules) {
                const deptRooms = [...new Set(allBaseSchedules.map(x => x.room))].filter(Boolean).sort();
                setAllDepartmentRooms(deptRooms);
                
                const tMap = {};
                allBaseSchedules.forEach(bs => {
                    if (bs.teacher && bs.course) tMap[bs.teacher] = bs.course;
                });
                setTeacherCourseMap(tMap);
            }
            
            const { data: annData } = await fetchAllRows('class_announcements', { session: profileData.session, section: profileData.section });
            const sortedAnns = annData.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
            setAnnouncements(sortedAnns);

            if (scheduleData) {
                setAvailableRooms([...new Set(scheduleData.map(x => x.room))].filter(Boolean).sort());
                setAvailableCourses([...new Set(scheduleData.map(x => x.course))].filter(Boolean).sort());
                setAvailableTeachers([...new Set(scheduleData.map(x => x.teacher))].filter(Boolean).sort());
            }

            const baseIds = scheduleData ? scheduleData.map(s => s.id) : [];
            
            const [exceptionsRes, liveSessionsRes, archSessRes, logsRes] = await Promise.all([
                fetchAllRows('schedule_exceptions'),
                fetchAllRows('attendance_sessions', null, { column: 'base_schedule_id', values: baseIds }),
                fetchAllRows('attendance_sessions_archive', null, { column: 'base_schedule_id', values: baseIds }),
                fetchAllRows('attendance_upload_logs', { session: profileData.session, section: profileData.section })
            ]);

            const exceptionsData = exceptionsRes.data || [];
            const allSessions = [...(liveSessionsRes.data || []), ...(archSessRes.data || [])];
            
            const sessionIds = allSessions.map(s => s.id);
            let allRecords = [];
            if (sessionIds.length > 0) {
                const [liveRecRes, archRecRes] = await Promise.all([
                    fetchAllRows('attendance_records', null, { column: 'session_id', values: sessionIds }),
                    fetchAllRows('attendance_records_archive', null, { column: 'session_id', values: sessionIds })
                ]);
                allRecords = [...(liveRecRes.data || []), ...(archRecRes.data || [])];
            }

            const sortedLogs = (logsRes.data || []).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
            setUploadLogs(sortedLogs);

            const sessionsWithRecords = allSessions.map(s => ({
                ...s,
                course: scheduleData.find(b => b.id === s.base_schedule_id)?.course,
                records: allRecords.filter(r => r.session_id === s.id)
            }));
            
            setAllSessionsData(sessionsWithRecords); 

            const mergedSchedule = (scheduleData || []).filter(c => c.session === profileData.session).map(cls => {
                const targetDate = getDateForCurrentWeekDay(cls.day);
                const exception = exceptionsData.find(ex => ex.base_schedule_id === cls.id && ex.exception_date === targetDate);
                const sessionToday = sessionsWithRecords.find(s => s.base_schedule_id === cls.id && s.session_date === targetDate);
                
                return { 
                    ...cls, 
                    isCancelled: exception?.status === 'cancelled',
                    isRescheduled: exception?.status === 'rescheduled',
                    isConfirmed: exception?.status === 'confirmed',
                    exceptionDetails: exception,
                    attendanceSession: sessionToday 
                };
            });
            setSchedule(mergedSchedule);

            const uniqueSubjects = [...new Set((scheduleData || []).filter(c => c.session === attendanceSemesterFilter || c.session === profileData.session).map(s => s.course))];

            const stats = uniqueSubjects.map(subject => {
                const subjectBaseIds = scheduleData.filter(s => s.course === subject).map(s => s.id);
                const subjectSessions = sessionsWithRecords.filter(s => subjectBaseIds.includes(s.base_schedule_id));
                
                let totalRecords = 0;
                let presentRecords = 0;
                
                subjectSessions.forEach(sess => {
                    sess.records.forEach(rec => {
                        totalRecords++;
                        if (rec.status === 'Present' || rec.status === 'Leave') {
                            presentRecords++;
                        }
                    });
                });

                const percentage = totalRecords === 0 ? 0 : Math.round((presentRecords / totalRecords) * 100);
                return { subject, totalConducted: subjectSessions.length, percentage, sessions: subjectSessions };
            });

            setAttendanceStats(stats);
        }
        setLoading(false);
    };

    // Recalculate stats if semester filter changes
    useEffect(() => {
        if (!profile || allSessionsData.length === 0) return;
        const targetBases = baseSchedule.filter(b => b.session === attendanceSemesterFilter && b.section === profile.section);
        const targetBaseIds = targetBases.map(b => b.id);
        const targetSessions = allSessionsData.filter(s => targetBaseIds.includes(s.base_schedule_id));
        
        const uniqueSubjects = [...new Set(targetBases.map(s => s.course))];

        const stats = uniqueSubjects.map(subject => {
            const subjectBaseIds = targetBases.filter(s => s.course === subject).map(s => s.id);
            const subjectSessions = targetSessions.filter(s => subjectBaseIds.includes(s.base_schedule_id));
            
            let totalRecords = 0;
            let presentRecords = 0;
            
            subjectSessions.forEach(sess => {
                sess.records.forEach(rec => {
                    totalRecords++;
                    if (rec.status === 'Present' || rec.status === 'Leave') {
                        presentRecords++;
                    }
                });
            });

            const percentage = totalRecords === 0 ? 0 : Math.round((presentRecords / totalRecords) * 100);
            return { subject, totalConducted: subjectSessions.length, percentage, sessions: subjectSessions };
        });

        setAttendanceStats(stats);
    }, [attendanceSemesterFilter, allSessionsData, baseSchedule, profile]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = '/login';
    };

    const getStudentAttendance = (studentReg, subjectFilter) => {
        let present = 0, total = 0;
        const activeSessions = allSessionsData.filter(s => {
            const b = baseSchedule.find(bs => bs.id === s.base_schedule_id);
            return b && b.session === attendanceSemesterFilter;
        });

        activeSessions.forEach(session => {
            if (subjectFilter !== 'ALL' && session.course !== subjectFilter) return;
            const record = session.records.find(r => r.student_id === studentReg);
            if (record) {
                total++;
                if (record.status === 'Present' || record.status === 'Leave') present++;
            }
        });
        return total === 0 ? 0 : Math.round((present / total) * 100);
    };

    const getNearestPoints = (cls) => {
        if (!pointsData || pointsData.length === 0) return { up: '--:--', down: '--:--' };
        const isSat = cls.day === 'SAT';
        const clsStartMins = parseTime(cls.start_time);
        const clsEndMins = parseTime(cls.end_time);

        const targetUpMins = clsStartMins - 30;
        const validUp = pointsData.filter(p => p.route === 'AC_to_BJC' && p.is_saturday === isSat && parseDbTime(p.departure_time) <= targetUpMins).sort((a, b) => parseDbTime(b.departure_time) - parseDbTime(a.departure_time)); 
        const bestUp = validUp.length > 0 ? convertTo12Hour(validUp[0].departure_time.slice(0, 5)) : 'N/A';

        const targetDownMins = clsEndMins;
        const validDown = pointsData.filter(p => p.route === 'BJC_to_AC' && p.is_saturday === isSat && parseDbTime(p.departure_time) >= targetDownMins).sort((a, b) => parseDbTime(a.departure_time) - parseDbTime(b.departure_time)); 
        const bestDown = validDown.length > 0 ? convertTo12Hour(validDown[0].departure_time.slice(0, 5)) : 'N/A';

        return { up: bestUp, down: bestDown };
    };

    const getStatusStyles = (cls) => {
        const todayStr = new Date().toLocaleDateString('en-CA');
        const exc = exceptions.filter(e => String(e.base_schedule_id) === String(cls.id) && e.exception_date >= todayStr)[0];
        if (exc?.status === 'cancelled') return { label: `Cancelled on ${exc.exception_date}`, color: '#721c24', bg: '#f8d7da', border: '#dc3545' };
        if (exc?.status === 'confirmed') return { label: `Confirmed for ${exc.exception_date}`, color: '#155724', bg: '#d4edda', border: '#28a745' };
        if (exc?.status === 'rescheduled') return { label: `Moved to ${exc.new_room} on ${exc.exception_date}`, color: '#004085', bg: '#e7f1ff', border: '#007bff' };
        return null; 
    };

    const handleEditAnnouncement = (ann) => {
        setEditAnnId(ann.id);
        setAnnouncementForm({
            type: ann.type,
            subject: ann.subject,
            lecture_selector: 'manual',
            deadline_date: ann.deadline_date || '',
            deadline_time: ann.deadline_time || '8:00 AM',
            topics: ann.topics,
            details: ann.details
        });
        
        const oldMsg = ann.type === 'assignment' 
            ? `📢 NEW ASSIGNMENT: ${ann.subject} - ${ann.topics}. Due: ${ann.deadline_date}`
            : `📢 MESSAGE: ${ann.topics} - Section ${profile.section}`;
        setOldAnnMsg(oldMsg);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const submitAnnouncement = async (e) => {
        e.preventDefault();

        const payload = {
            session: profile.session, 
            section: profile.section,
            type: announcementForm.type,
            subject: announcementForm.subject,
            deadline_date: announcementForm.type === 'assignment' ? announcementForm.deadline_date : null,
            deadline_time: announcementForm.type === 'assignment' ? announcementForm.deadline_time : null,
            topics: announcementForm.topics,
            details: announcementForm.details
        };

        if (editAnnId) {
            const { error } = await supabase.from('class_announcements').update(payload).eq('id', editAnnId);
            if (error) return alert("Failed to update: " + error.message);

            const notifMsg = payload.type === 'assignment' 
                ? `📢 UPDATED ASSIGNMENT: ${payload.subject} - ${payload.topics}. Due: ${payload.deadline_date}`
                : `📢 UPDATED MESSAGE: ${payload.topics} - Section ${profile.section}`;
                
            await supabase.from('notifications').update({ message: notifMsg }).eq('message', oldAnnMsg);
            alert("Announcement updated and class notified!");
        } else {
            const { error } = await supabase.from('class_announcements').insert([payload]);
            if (error) return alert("Failed to add announcement: " + error.message);

            const notifMsg = payload.type === 'assignment' 
                ? `📢 NEW ASSIGNMENT: ${payload.subject} - ${payload.topics}. Due: ${payload.deadline_date}`
                : `📢 MESSAGE: ${payload.topics} - Section ${profile.section}`;
                
            await supabase.from('notifications').insert([{ message: notifMsg }]);
            alert("Announcement posted and class notified!");
        }

        setEditAnnId(null);
        setAnnouncementForm({ type: 'assignment', subject: '', lecture_selector: '', deadline_date: '', deadline_time: '8:00 AM', topics: '', details: '' });
        fetchProfileAndSchedule(session.user.id);
    };

    const downloadCSV = (stat, viewOnly = false) => {
        if (stat.sessions.length === 0) return alert("No attendance recorded for this subject yet.");

        let csv = "Name,Registration Number";
        const sortedSessions = stat.sessions.sort((a,b) => new Date(a.session_date) - new Date(b.session_date));
        
        sortedSessions.forEach(s => { csv += `,${s.session_date}`; });
        csv += ",Overall %\n";

        roster.forEach(student => {
            let row = `${student.student_name},${student.registration_number}`;
            let presentCount = 0, totalCount = 0;
            
            sortedSessions.forEach(s => {
                const rec = s.records.find(r => r.student_id === student.registration_number);
                if (rec) {
                    totalCount++;
                    row += `,${rec.status}`;
                    if (rec.status === 'Present' || rec.status === 'Leave') presentCount++;
                } else { row += `,N/A`; }
            });
            
            const pct = totalCount === 0 ? 0 : Math.round((presentCount / totalCount) * 100);
            row += `,${pct}%\n`;
            csv += row;
        });

        if (viewOnly) {
            const rows = csv.split('\n').filter(r => r.trim() !== '');
            let html = '<html lang="en"><head><title>Attendance Report</title><style>table { border-collapse: collapse; width: 100%; font-family: sans-serif; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; } th { background-color: #f2f2f2; color: #002147; }</style></head><body style="padding: 20px;"><h2>Attendance View: ' + stat.subject + '</h2><table>';
            rows.forEach((r, idx) => {
                html += '<tr>';
                const cells = r.split(',');
                cells.forEach(c => { html += idx === 0 ? `<th>${c}</th>` : `<td>${c}</td>`; });
                html += '</tr>';
            });
            html += '</table></body></html>';
            const blob = new Blob([html], { type: 'text/html' });
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
            return;
        }

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${stat.subject}_Attendance.csv`;
        a.click();
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file || !uploadCsvSubject) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const rows = text.split('\n').map(r => r.split(',').map(cell => cell?.trim()));

            if (rows.length < 2) return alert("Invalid CSV format.");

            const headers = rows[0];
            const dateCols = [];
            for(let i = 2; i < headers.length; i++) {
                if(headers[i] && headers[i].toLowerCase() !== 'overall %') {
                    dateCols.push({ index: i, dateStr: headers[i] });
                }
            }

            if(dateCols.length === 0) return alert("No valid date columns found. Format must be: Name, Registration Number, YYYY-MM-DD");

            setCsvMeta({ file, rows, dateCols, totalRecords: rows.length - 1 });
            setUploadStatus('confirm');
        };
        reader.readAsText(file);
        e.target.value = null;
    };

    const executeCsvUpload = async () => {
        if (!csvMeta) return;
        setUploadStatus('uploading');
        setUploadProgress(0);

        const { rows, dateCols } = csvMeta;
        let processedDatesCount = 0;
        const totalDates = dateCols.length;
        const successfulDates = [];

        try {
            for (const { index, dateStr } of dateCols) {
                const parsedDate = new Date(dateStr);
                if(isNaN(parsedDate)) continue; 

                const dayName = parsedDate.toLocaleDateString('en-US', {weekday: 'short'}).toUpperCase();
                const matchingBase = baseSchedule.find(b => b.course === uploadCsvSubject && b.day === dayName) || baseSchedule.find(b => b.course === uploadCsvSubject);

                if (!matchingBase) continue; 

                let sessionId = null;
                const { data: existingSession } = await supabase.from('attendance_sessions')
                    .select('id')
                    .eq('base_schedule_id', matchingBase.id)
                    .eq('session_date', dateStr)
                    .single();

                if (existingSession) {
                    sessionId = existingSession.id;
                    await supabase.from('attendance_records').delete().eq('session_id', sessionId);
                } else {
                    const { data: newSession, error: sessErr } = await supabase.from('attendance_sessions')
                        .insert([{ base_schedule_id: matchingBase.id, session_date: dateStr, submitted_by: session.user.id, status: 'approved' }])
                        .select().single();
                    if (sessErr) { console.error(sessErr); continue; }
                    sessionId = newSession.id;
                }

                const recordsToInsert = [];
                for(let i = 1; i < rows.length; i++) {
                    const row = rows[i];
                    if(row.length < index + 1) continue;
                    
                    const roll = row[1];
                    const rawStatus = row[index];
                    if(!roll || !rawStatus || rawStatus === 'N/A') continue;

                    let status = 'Absent';
                    if (rawStatus.toLowerCase() === 'present' || rawStatus.toLowerCase() === 'p' || rawStatus === '1') status = 'Present';
                    else if (rawStatus.toLowerCase() === 'leave' || rawStatus.toLowerCase() === 'l') status = 'Leave';

                    recordsToInsert.push({ session_id: sessionId, student_id: roll, status: status });
                }

                if (recordsToInsert.length > 0) {
                    const { error: recErr } = await supabase.from('attendance_records').insert(recordsToInsert);
                    if (!recErr) {
                        processedDatesCount++;
                        successfulDates.push(dateStr);
                    }
                }
                
                setUploadProgress(Math.round(((dateCols.indexOf(dateCols.find(d => d.dateStr === dateStr)) + 1) / totalDates) * 100));
            }

            if (successfulDates.length > 0) {
                await supabase.from('attendance_upload_logs').insert([{
                    subject: uploadCsvSubject,
                    session: profile.session,
                    section: profile.section,
                    dates_included: successfulDates.join(', '),
                    total_records: csvMeta.totalRecords,
                    uploaded_by: session.user.id
                }]);
            }

            setUploadStatus('success');
            fetchProfileAndSchedule(session.user.id);
        } catch (err) {
            alert("A network error occurred during upload.");
            setUploadStatus('idle');
        }
    };

    const handleUndoUpload = async (log) => {
        if (!window.confirm(`Are you sure you want to completely reverse this upload for ${log.subject}? All attendance records for dates (${log.dates_included}) will be wiped.`)) return;
        
        try {
            const matchingBases = baseSchedule.filter(b => b.course === log.subject);
            const baseIds = matchingBases.map(b => b.id);
            const dates = log.dates_included.split(',').map(d => d.trim());
            
            const { data: sessionsToDelete } = await supabase.from('attendance_sessions')
                .select('id')
                .in('base_schedule_id', baseIds)
                .in('session_date', dates);
                
            if (sessionsToDelete && sessionsToDelete.length > 0) {
                const sessIds = sessionsToDelete.map(s => s.id);
                await supabase.from('attendance_records').delete().in('session_id', sessIds);
                await supabase.from('attendance_sessions').delete().in('id', sessIds);
            }
            
            await supabase.from('attendance_upload_logs').delete().eq('id', log.id);
            
            alert("Upload reversed successfully.");
            fetchProfileAndSchedule(session.user.id);
        } catch (err) {
            alert("Failed to undo upload.");
        }
    };

    const handleAddStudent = async (e) => {
        e.preventDefault();
        const { error } = await supabase.from('students').insert([{ student_name: newStudent.name, registration_number: newStudent.roll, session: profile.session, section: profile.section }]);
        if (error) alert("Error: " + error.message);
        else { setNewStudent({ name: '', roll: '' }); fetchProfileAndSchedule(session.user.id); }
    };

    const handleDeleteStudent = async (regNum) => {
        if (!window.confirm("Remove this student?")) return;
        await supabase.from('students').delete().eq('registration_number', regNum);
        fetchProfileAndSchedule(session.user.id);
    };

    const handleCSVUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const text = event.target.result;
                const rows = text.split('\n').map(r => r.split(','));
                const payloads = [];
                
                let startIndex = rows[0].join('').toLowerCase().includes('regist') || rows[0].join('').toLowerCase().includes('roll') ? 1 : 0;
                for(let i = startIndex; i < rows.length; i++) {
                    const row = rows[i];
                    if (row.length >= 2) {
                        const reg = row[0].trim();
                        const name = row[1].trim();
                        if (reg && name) { payloads.push({ student_name: name, registration_number: reg, session: profile.session, section: profile.section }); }
                    }
                }

                if (payloads.length > 0) {
                    const { error } = await supabase.from('students').insert(payloads);
                    if (error) alert("Error importing: " + error.message);
                    else { alert(`Successfully imported ${payloads.length} students!`); fetchProfileAndSchedule(session.user.id); }
                } else { alert("No valid data found in CSV."); }
            } catch (err) { alert("Failed to parse CSV."); }
            e.target.value = null; 
        };
        reader.readAsText(file);
    };

    const handleConfirmClass = async (e, classId, courseName, clsDay) => {
        e.stopPropagation(); 
        const targetDate = getDateForCurrentWeekDay(clsDay);
        await supabase.from('schedule_exceptions').insert([{ base_schedule_id: classId, exception_date: targetDate, status: 'confirmed', cancelled_by: session.user.id }]);
        await supabase.from('notifications').insert([{ message: `✅ Confirmed: ${courseName} for Section ${profile.section} will be held on ${targetDate}.` }]);
        fetchProfileAndSchedule(session.user.id); 
    };

    const handleCancelClass = async (e, classId, courseName, clsDay) => {
        e.stopPropagation();
        if (!window.confirm(`Are you sure you want to CANCEL ${courseName}?`)) return;
        const targetDate = getDateForCurrentWeekDay(clsDay);
        await supabase.from('schedule_exceptions').insert([{ base_schedule_id: classId, exception_date: targetDate, status: 'cancelled', cancelled_by: session.user.id }]);
        await supabase.from('notifications').insert([{ message: `🚨 Cancelled: ${courseName} for Section ${profile.section} on ${targetDate} is cancelled.` }]);
        fetchProfileAndSchedule(session.user.id);
    };

    const handleUndoException = async (e, classId, actionType, courseName, clsDay) => {
        e.stopPropagation();
        const targetDate = getDateForCurrentWeekDay(clsDay);
        await supabase.from('schedule_exceptions').delete().match({ base_schedule_id: classId, exception_date: targetDate });

        if (actionType === 'cancelled') await supabase.from('notifications').delete().eq('message', `🚨 Cancelled: ${courseName} for Section ${profile.section} on ${targetDate} is cancelled.`);
        else if (actionType === 'confirmed') await supabase.from('notifications').delete().eq('message', `✅ Confirmed: ${courseName} for Section ${profile.section} will be held on ${targetDate}.`);
        else if (actionType === 'rescheduled') await supabase.from('notifications').delete().ilike('message', `🕒 Rescheduled: ${courseName} for Section ${profile.section}%`);

        fetchProfileAndSchedule(session.user.id);
    };

    const openEditModal = (e, cls) => {
        e.stopPropagation(); setEditingClass(cls); setNewDate(new Date().toLocaleDateString('en-CA'));
        setNewStartTime(convertTo12Hour(cls.start_time)); setNewEndTime(convertTo12Hour(cls.end_time));
        setNewRoom(cls.room); setIsEditModalOpen(true);
    };

    const submitReschedule = async (e) => {
        e.preventDefault();
        const targetDate = getDateForCurrentWeekDay(editingClass.day);
        await supabase.from('schedule_exceptions').insert([{
            base_schedule_id: editingClass.id, exception_date: targetDate, status: 'rescheduled',
            new_start_time: newStartTime, new_end_time: newEndTime, new_room: newRoom, cancelled_by: session.user.id
        }]);
        await supabase.from('notifications').insert([{ message: `🕒 Rescheduled: ${editingClass.course} for Section ${profile.section} moved to Room ${newRoom} (${newStartTime} - ${newEndTime}) on ${targetDate}.` }]);
        alert(`Class rescheduled!`); setIsEditModalOpen(false); fetchProfileAndSchedule(session.user.id);
    };

    const openBaseModal = (cls = null) => {
        if (cls) {
            setBaseForm({ ...cls, start_time: convertTo12Hour(cls.start_time), end_time: convertTo12Hour(cls.end_time) });
            setIsManualCourse(!availableCourses.includes(cls.course)); setIsManualTeacher(!availableTeachers.includes(cls.teacher)); setIsManualRoom(!allDepartmentRooms.includes(cls.room));
        } else {
            setBaseForm({ id: null, course: '', teacher: '', room: '', day: 'MON', start_time: '8:00 AM', end_time: '9:30 AM' });
            setIsManualCourse(false); setIsManualTeacher(false); setIsManualRoom(false);
        }
        setIsBaseModalOpen(true);
    };

    const submitBaseSchedule = async (e) => {
        e.preventDefault(); setIsBaseModalOpen(false); 
        const payload = { course: baseForm.course, teacher: baseForm.teacher, room: baseForm.room, day: baseForm.day, start_time: baseForm.start_time, end_time: baseForm.end_time, session: profile.session, section: profile.section };
        if (baseForm.id) await supabase.from('base_schedule').update(payload).eq('id', baseForm.id);
        else await supabase.from('base_schedule').insert([payload]);
        fetchProfileAndSchedule(session.user.id);
    };

    const deleteBaseLecture = async (id, courseName) => {
        if (!window.confirm(`Permanently delete ${courseName}? This cannot be undone.`)) return;
        await supabase.from('base_schedule').delete().eq('id', id);
        fetchProfileAndSchedule(session.user.id);
    };

    const activeMilestone = semesters.find(s => s.is_active);
    const isExamMode = activeMilestone && (
        (todayStrCA >= (activeMilestone.mid_term_start || '9999-12-31') && todayStrCA <= (activeMilestone.mid_term_end || '0000-01-01')) ||
        (todayStrCA >= (activeMilestone.final_term_start || '9999-12-31') && todayStrCA <= (activeMilestone.final_term_end || '0000-01-01'))
    );
    const isVacation = activeMilestone && (todayStrCA >= (activeMilestone.summer_vacation_start || '9999-12-31') && todayStrCA <= (activeMilestone.summer_vacation_end || '0000-01-01'));

    if (loading) return <div style={centerStyle}><div className="custom-spinner"></div> Loading Dashboard...</div>;
    if (!session) return null;

    if (isPendingApproval) {
        return (
            <div style={welcomeBg}>
                <Head><title>Pending Approval | IUB Assistant</title></Head>
                <div style={welcomeCard}>
                    <div style={{ fontSize: '3rem', marginBottom: '15px' }}>{SVGS.clock}</div>
                    <h2 style={{ color: '#002147', margin: '0 0 15px 0' }}>Approval Pending</h2>
                    <p style={{ color: '#555', fontSize: '1rem', lineHeight: '1.5', marginBottom: '25px' }}>
                        Your account has been successfully verified, but an administrator must manually approve your access before you can view your dashboard.
                    </p>
                    <button onClick={handleLogout} style={bigBtn}>
                        Log Out
                    </button>
                </div>
            </div>
        );
    }

    const filteredWeeklySchedule = schedule
        .filter(cls => cls.day === selectedDay && cls.session === profile.session)
        .sort((a, b) => parseTime(a.start_time) - parseTime(b.start_time));
    
    const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    const currentMins = new Date().getHours() * 60 + new Date().getMinutes();

    const visibleTabs = [
        { id: 'weekly', label: 'Weekly', icon: SVGS.calendar },
        ...(!isMobile ? [{ id: 'permanent', label: 'Base', icon: SVGS.home }] : []),
        ...(!isMobile ? [{ id: 'students', label: 'Students', icon: SVGS.users }] : []),
        { id: 'attendance', label: 'Attendance', icon: SVGS.attendance },
        { id: 'announcements', label: 'Updates', icon: SVGS.updates },
        { id: 'ai_bot', label: 'AI TUTOR', icon: SVGS.bot }
    ];

    const todayEvents = [];

    if (isExamMode) {
        const todayExams = examSchedules.filter(e => 
            e.exam_date === todayStrCA && 
            e.target_group.includes(profile.section) && 
            e.target_group.includes(getSemesterFromSession(profile.session))
        );

        if (todayExams.length > 0) {
            const sortedExams = todayExams.sort((a,b) => parseTime(a.start_time) - parseTime(b.start_time));
            const firstExam = sortedExams[0];
            const lastExam = sortedExams[sortedExams.length - 1];

            const ptsFirst = getNearestPoints({ start_time: firstExam.start_time, end_time: firstExam.end_time, day: currentDayStr });
            if (ptsFirst.up !== 'N/A') {
                todayEvents.push({ type: 'point_up', title: 'Morning Bus (AC ➔ BJC)', time: ptsFirst.up, timeMins: parseTime(ptsFirst.up) });
            }

            sortedExams.forEach(ex => {
                todayEvents.push({ type: 'exam', title: ex.course, room: ex.room, startMins: parseTime(ex.start_time), endMins: parseTime(ex.end_time), raw: ex });
            });

            const ptsLast = getNearestPoints({ start_time: lastExam.start_time, end_time: lastExam.end_time, day: currentDayStr });
            if (ptsLast.down !== 'N/A') {
                todayEvents.push({ type: 'point_down', title: 'Return Bus (BJC ➔ AC)', time: ptsLast.down, timeMins: parseTime(ptsLast.down) });
            }
        } else {
            todayEvents.push({ type: 'milestone', title: 'No Exams Today', desc: 'Enjoy your preparation time.', raw: activeMilestone });
        }
    } else {
        if (activeMilestone && (activeMilestone.event_type === 'summer_vacation' || activeMilestone.event_type === 'holidays')) {
            todayEvents.push({ type: 'vacation', title: 'Vacations / Holidays', desc: `From: ${new Date(activeMilestone.planned_start).toLocaleDateString()} To: ${new Date(activeMilestone.planned_end).toLocaleDateString()}`, raw: activeMilestone });
        } else {
            const dynamicMyClasses = allBaseSchedule.filter(c => c.section === profile.section && c.session === profile.session);
            const myTodayClasses = dynamicMyClasses.filter(c => {
                if (c.day !== currentDayStr) return false;
                const status = getStatusStyles(c);
                if (status && status.label.toLowerCase().includes('cancelled')) return false;
                return true;
            }).sort((a,b) => parseTime(a.start_time) - parseTime(b.start_time));

            if (myTodayClasses.length > 0) {
                const firstCls = myTodayClasses[0];
                const lastCls = myTodayClasses[myTodayClasses.length - 1];

                const ptsFirst = getNearestPoints(firstCls);
                if (ptsFirst.up !== 'N/A') {
                    todayEvents.push({ type: 'point_up', title: 'Morning Bus (AC ➔ BJC)', time: ptsFirst.up, timeMins: parseTime(ptsFirst.up) });
                }

                myTodayClasses.forEach(c => {
                    todayEvents.push({ type: 'lecture', title: c.course, room: c.room, startMins: parseTime(c.start_time), endMins: parseTime(c.end_time), raw: c });
                });

                const ptsLast = getNearestPoints(lastCls);
                if (ptsLast.down !== 'N/A') {
                    todayEvents.push({ type: 'point_down', title: 'Return Bus (BJC ➔ AC)', time: ptsLast.down, timeMins: parseTime(ptsLast.down) });
                }
            }
        }
    }

    const ongoingClasses = schedule.filter(cls => {
        if (cls.day !== currentDay || cls.isCancelled || cls.session !== profile.session) return false;
        const startMins = parseTime(cls.start_time);
        const endMins = parseTime(cls.end_time);
        return currentMins >= startMins && currentMins <= endMins;
    });

    return (
        <div style={{ background: '#f0f2f5', minHeight: '100vh', fontFamily: "'Roboto', sans-serif", display: 'flex', flexDirection: 'column' }}>
            <Head>
                <title>CR Dashboard | IUB</title>
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"/>
            </Head>

            <style>{`
                @keyframes slideFade {
                    from { opacity: 0; transform: translateY(-5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .expand-anim { animation: slideFade 0.3s ease-out forwards; }
                
                @keyframes expandBar {
                    from { width: 0%; }
                }
                .scroll-hide::-webkit-scrollbar { display: none; }
                
                .desktop-nav { display: none; }
                .mobile-nav { display: flex; }
                @media (min-width: 768px) {
                    .desktop-nav { display: flex; align-items: center; gap: 15px; }
                    .mobile-nav { display: none !important; }
                    .hamburger-btn { display: none !important; }
                }
                .custom-spinner { width: 45px; height: 45px; border: 4px solid rgba(0, 33, 71, 0.1); border-left-color: #F2A900; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px auto; }
                @keyframes spin { to { transform: rotate(360deg); } }

                /* AI Tutor Moving Gradient CSS */
                @keyframes aiBgPulse {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                @keyframes aiShineLayer {
                    0% { transform: translateX(-150%) skewX(-15deg); opacity: 0; }
                    20% { opacity: 1; }
                    40% { transform: translateX(250%) skewX(-15deg); opacity: 0; }
                    100% { transform: translateX(250%) skewX(-15deg); opacity: 0; }
                }
                .ai-tutor-btn-active, .ai-tutor-btn-inactive {
                    position: relative;
                    overflow: hidden;
                    border-radius: 8px !important;
                }
                .ai-tutor-btn-active::before, .ai-tutor-btn-inactive::before {
                    content: "";
                    position: absolute;
                    top: 0; left: 0; width: 100%; height: 100%;
                    background: linear-gradient(90deg, rgba(79,172,254,0.1), rgba(0,242,254,0.15), rgba(59,130,246,0.1), rgba(139,92,246,0.1));
                    background-size: 300% 300%;
                    animation: aiBgPulse 5s ease infinite;
                    z-index: 0;
                }
                .ai-tutor-btn-active::after, .ai-tutor-btn-inactive::after {
                    content: "";
                    position: absolute;
                    top: 0; left: 0; width: 40%; height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent);
                    animation: aiShineLayer 6s infinite ease-in-out;
                    z-index: 1;
                    filter: blur(4px);
                }
                .ai-tutor-text-gradient {
                    background: linear-gradient(90deg, #4facfe, #00f2fe, #3b82f6, #8b5cf6);
                    background-size: 300% 300%;
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    animation: aiBgPulse 5s ease infinite;
                    font-weight: 900 !important;
                    position: relative;
                    z-index: 2;
                }
                .desktop-ai-btn {
                    background: rgba(255,255,255,0.1) !important;
                    border: 1px solid rgba(79,172,254,0.3) !important;
                }
                .desktop-ai-btn:hover {
                    background: rgba(255,255,255,0.2) !important;
                }
                .ai-tutor-icon-svg {
                    position: relative;
                    z-index: 2;
                }

                ${currentTab === 'ai_bot' ? `
                    .ai-chat-wrapper {
                        max-width: 100% !important;
                        border-radius: 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                        height: calc(100vh - 45px) !important;
                    }
                    @media (min-width: 768px) {
                        .ai-chat-wrapper {
                            height: calc(100vh - 65px) !important;
                        }
                    }
                ` : ''}
            `}</style>

            <header style={headerStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div className="hamburger-btn" onClick={() => setIsSidebarOpen(true)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#F2A900">
                            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
                        </svg>
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '1.2rem', display: 'flex' }}>{SVGS.cap}</span> 
                        CR DASHBOARD
                    </div>
                </div>

                <div className="desktop-nav">
                    {visibleTabs.map(tab => {
                        const isAIBot = tab.id === 'ai_bot';
                        const isActive = currentTab === tab.id;
                        return (
                            <div 
                                key={tab.id} 
                                onClick={() => { setCurrentTab(tab.id); setShowAlerts(false); }}
                                className={isAIBot ? (isActive ? 'ai-tutor-btn-active' : 'ai-tutor-btn-inactive') : ''}
                                style={{
                                    cursor: 'pointer', padding: '6px 10px', borderRadius: '5px', fontWeight: 'bold', fontSize: '0.75rem',
                                    background: isActive && !isAIBot ? '#F2A900' : 'transparent',
                                    color: isActive && !isAIBot ? '#002147' : '#fff',
                                    transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', gap: '6px'
                                }}
                            >
                                <span className={isAIBot ? 'ai-tutor-icon-svg' : ''}>{isAIBot ? SVGS.botGradient : tab.icon}</span> 
                                <span className={isAIBot ? 'ai-tutor-text-gradient' : ''}>{tab.label}</span>
                            </div>
                        )
                    })}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <a href="/notifications" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {SVGS.bell} <span className="mobile-hide">Alerts</span>
                    </a>
                    <button onClick={handleLogout} style={enableBtnStyle}>Logout</button>
                </div>
            </header>

            {isSidebarOpen && (
                <div style={sidebarOverlay} onClick={() => setIsSidebarOpen(false)}>
                    <div style={sidebarMenu} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '15px 20px', borderBottom: '1px solid #eee', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, color: '#002147', fontSize: '1rem' }}>Menu</h3>
                            <button onClick={() => setIsSidebarOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#999' }}>✖</button>
                        </div>
                        {[{id: 'weekly', label: 'Weekly Timetable', icon: SVGS.calendar}, {id: 'permanent', label: 'Base Schedule', icon: SVGS.home}, {id: 'students', label: 'Manage Students', icon: SVGS.users}, {id: 'attendance', label: 'Attendance', icon: SVGS.attendance}, {id: 'announcements', label: 'Announcements', icon: SVGS.updates}].map(tab => {
                            const isAIBot = tab.id === 'ai_bot';
                            return (
                                <button 
                                    key={tab.id} 
                                    onClick={() => { setCurrentTab(tab.id); setIsSidebarOpen(false); }} 
                                    style={sidebarBtn(currentTab === tab.id)}
                                    className={isAIBot ? 'ai-tutor-btn-inactive' : ''}
                                >
                                    <span style={{ opacity: 0.7 }} className={isAIBot ? 'ai-tutor-icon-svg' : ''}>{isAIBot ? SVGS.botGradient : tab.icon}</span> 
                                    <span style={{ marginLeft: '10px' }} className={isAIBot ? 'ai-tutor-text-gradient' : ''}>{tab.label}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}

            <div className="mobile-nav" style={tabBar}>
                {visibleTabs.map(tab => {
                    const isAIBot = tab.id === 'ai_bot';
                    const isActive = currentTab === tab.id;
                    return (
                        <button 
                            key={tab.id} 
                            onClick={() => { setCurrentTab(tab.id); }} 
                            style={tabBtn(isActive)}
                            className={isAIBot ? (isActive ? 'ai-tutor-btn-active' : 'ai-tutor-btn-inactive') : ''}
                        >
                            <div style={{ marginBottom: '2px', opacity: isActive ? 1 : 0.6 }} className={isAIBot ? 'ai-tutor-icon-svg' : ''}>
                                {isAIBot ? SVGS.botGradient : tab.icon}
                            </div>
                            <span className={isAIBot ? 'ai-tutor-text-gradient' : ''}>{tab.label}</span>
                            {tab.id === 'attendance' && pendingAttendances.length > 0 && <span style={newsRedDot}></span>}
                        </button>
                    )
                })}
            </div>

            <div style={{ padding: '15px 12px', maxWidth: '800px', margin: '0 auto', flex: 1, width: '100%', boxSizing: 'border-box' }}>
                
                <div className="expand-anim" style={{ background: 'linear-gradient(135deg, #002147 0%, #003366 100%)', borderRadius: '15px', padding: '20px', color: '#fff', marginBottom: '20px', boxShadow: '0 4px 15px rgba(0,33,71,0.2)' }}>
                    <h2 style={{ margin: '0 0 5px 0', fontSize: '1.2rem', fontWeight: '900', color: '#F2A900', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        Welcome, {profile?.first_name} {profile?.last_name}
                    </h2>
                    <p style={{ margin: 0, color: '#e0e0e0', fontSize: '0.85rem' }}>Managing: <strong>{profile?.session} | Section {profile?.section}</strong></p>
                </div>

                {!isExamMode && ongoingClasses.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                        {ongoingClasses.map(ongoingClass => {
                            const sessionToday = ongoingClass.attendanceSession;
                            let canEdit = false;
                            
                            if (sessionToday) {
                                const sessionTime = new Date(sessionToday.created_at).getTime();
                                const now = new Date().getTime();
                                const diffMins = (now - sessionTime) / 60000;
                                if (diffMins <= 30 && sessionToday.status === 'pending') canEdit = true;
                            }

                            return (
                                <div key={`global-ongoing-${ongoingClass.id}`} className="expand-anim" style={{ background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)', padding: '15px 20px', borderRadius: '12px', marginBottom: '10px', boxShadow: '0 4px 10px rgba(21, 128, 61, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                                    <div style={{ color: 'white' }}>
                                        <h3 style={{ margin: '0 0 5px 0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                                            {SVGS.live} Ongoing: {ongoingClass.course}
                                        </h3>
                                        <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            {SVGS.clock} {convertTo12Hour(ongoingClass.start_time)} - {convertTo12Hour(ongoingClass.end_time)} | {SVGS.location} Room {ongoingClass.room}
                                        </p>
                                    </div>
                                    <div>
                                        {!sessionToday && (
                                            <button onClick={() => setActiveAttendanceLecture(ongoingClass)} style={{ padding: '8px 15px', background: 'white', color: '#15803d', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                                                {SVGS.note} Mark Attendance
                                            </button>
                                        )}
                                        {sessionToday && canEdit && (
                                            <button onClick={() => setActiveAttendanceLecture(ongoingClass)} style={{ padding: '8px 15px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                                                {SVGS.edit} Edit Attendance
                                            </button>
                                        )}
                                        {sessionToday && !canEdit && (
                                            <button disabled style={{ padding: '8px 15px', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'not-allowed', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                                                {SVGS.lock} Locked ({sessionToday.status === 'approved' ? 'Approved' : 'Pending'})
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ================= WEEKLY SCHEDULE TAB ================= */}
                {currentTab === 'weekly' && (
                    <div className="expand-anim">
                        {activeMilestone && ['mid_term', 'final_term'].includes(activeMilestone.event_type) && (
                            <div style={{background: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '8px', marginBottom: '15px', fontWeight: 'bold', fontSize: '0.8rem', textAlign: 'center'}}>
                                {SVGS.alertCircle} Examination Period Active.
                            </div>
                        )}
                        
                        {isExamMode ? (
                            <div className="expand-anim">
                                {examSchedules.filter(e => 
                                    e.target_group.includes(profile.section) && 
                                    e.target_group.includes(getSemesterFromSession(profile.session))
                                ).sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date)).map((ex, idx) => {
                                    const examDateStr = new Date(ex.exam_date).toLocaleDateString('en-CA');
                                    const isToday = examDateStr === todayStrCA;
                                    const isPast = new Date(ex.exam_date) < new Date(todayStrCA);
                                    
                                    let bgCol = '#fff';
                                    let borderCol = '#F2A900';
                                    
                                    if (isToday) {
                                        bgCol = '#fff9e6';
                                        borderCol = '#dc3545';
                                    } else if (isPast) {
                                        bgCol = '#f8f9fa';
                                        borderCol = '#adb5bd';
                                    }

                                    return (
                                        <div key={idx} style={{ marginBottom: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.04)', borderRadius: '10px', overflow: 'hidden', border: '1px solid #eee' }}>
                                            <div style={{ ...cardBase, marginBottom: 0, boxShadow: 'none', background: bgCol, borderLeft: `5px solid ${borderCol}` }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div>
                                                        <div style={{ fontWeight: 900, color: '#002147', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            {SVGS.calendar} {new Date(ex.exam_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                                        </div>
                                                        <div style={{ fontWeight: 'bold', fontSize: '1rem', margin: '6px 0', color: isPast ? '#6c757d' : '#111827' }}>{ex.course}</div>
                                                        <div style={{ color: '#555', fontSize: '0.7rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{SVGS.clock} {convertTo12Hour(ex.start_time)} - {convertTo12Hour(ex.end_time)}</span>
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{SVGS.location} Room: {ex.room}</span>
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{SVGS.userTie} {ex.teacher}</span>
                                                        </div>
                                                    </div>
                                                    {isToday && (
                                                        <div style={{ background: '#fef2f2', color: '#dc3545', padding: '4px 8px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 'bold', border: '1px solid #fecaca' }}>
                                                            TODAY
                                                        </div>
                                                    )}
                                                    {isPast && (
                                                        <div style={{ background: '#e9ecef', color: '#6c757d', padding: '4px 8px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 'bold', border: '1px solid #ced4da' }}>
                                                            FINISHED
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {examSchedules.filter(e => e.target_group.includes(profile.section) && e.target_group.includes(getSemesterFromSession(profile.session))).length === 0 && (
                                    <div style={{ ...whiteCard, textAlign: 'center', padding: '20px 10px' }}>
                                        <div style={{ marginBottom: '10px', color: '#999', fontSize: '0.85rem', fontWeight: 'bold' }}>No exams scheduled for your section yet.</div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="expand-anim">
                                <div style={dayFilter}>
                                    {days.map(day => (
                                        <button key={day} onClick={() => setSelectedDay(day)}
                                            style={dayBtnStyle(selectedDay === day)}>
                                            {day}
                                        </button>
                                    ))}
                                </div>
                                
                                {filteredWeeklySchedule.length === 0 ? (
                                    <div style={whiteCard}><div style={emptyState}>No classes scheduled for {selectedDay}.</div></div>
                                ) : (
                                    filteredWeeklySchedule.map((cls) => (
                                        <div key={cls.id} onClick={() => setExpandedLectureId(expandedLectureId === cls.id ? null : cls.id)}
                                             style={{ ...cardBase, background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '15px', cursor: 'pointer', border: '1px solid #eee',
                                                borderLeft: cls.isRescheduled ? '5px solid #007bff' : cls.isConfirmed ? '5px solid #28a745' : '5px solid #F2A900', opacity: cls.isCancelled ? 0.6 : 1 
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: expandedLectureId === cls.id ? '1px solid #eee' : 'none', paddingBottom: expandedLectureId === cls.id ? '10px' : '0', marginBottom: expandedLectureId === cls.id ? '10px' : '0', flexWrap: 'wrap', gap: '10px' }}>
                                                <div>
                                                    <div style={{ fontWeight: '900', color: '#002147', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                                                        {SVGS.clock} {convertTo12Hour(cls.start_time)} - {convertTo12Hour(cls.end_time)}
                                                    </div>
                                                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: cls.isCancelled ? '#dc3545' : '#111827', textDecoration: cls.isCancelled ? 'line-through' : 'none', marginBottom: '4px' }}>
                                                        {cls.course}
                                                    </div>
                                                    <div style={{ color: '#555', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{SVGS.userTie} {cls.teacher}</span>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{SVGS.location} Room {cls.room}</span>
                                                    </div>
                                                    
                                                    {cls.attendanceSession && (
                                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '8px', padding: '3px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold', 
                                                            background: cls.attendanceSession.status === 'approved' ? '#d4edda' : '#fff3cd', 
                                                            color: cls.attendanceSession.status === 'approved' ? '#155724' : '#856404' }}>
                                                            {cls.attendanceSession.status === 'approved' ? <>{SVGS.tickCircle} Attendance Approved</> : <>{SVGS.clock} Attendance Pending</>}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {expandedLectureId === cls.id && (
                                                <div className="expand-anim" style={{ marginTop: '15px' }}>
                                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                        {cls.isCancelled ? (
                                                            <button onClick={(e) => handleUndoException(e, cls.id, 'cancelled', cls.course, cls.day)} style={{...actionBtn, background: '#6c757d'}}>{SVGS.undo} Undo Cancel</button>
                                                        ) : cls.isConfirmed ? (
                                                            <button onClick={(e) => handleUndoException(e, cls.id, 'confirmed', cls.course, cls.day)} style={{...actionBtn, background: '#6c757d'}}>{SVGS.undo} Remove Confirm</button>
                                                        ) : cls.isRescheduled ? (
                                                            <button onClick={(e) => handleUndoException(e, cls.id, 'rescheduled', cls.course, cls.day)} style={{...actionBtn, background: '#6c757d'}}>{SVGS.undo} Undo Reschedule</button>
                                                        ) : (
                                                            <>
                                                                <button onClick={(e) => handleConfirmClass(e, cls.id, cls.course, cls.day)} style={{...actionBtn, background: '#28a745', color: '#fff'}}>{SVGS.tickCircle} Confirm</button>
                                                                <button onClick={(e) => openEditModal(e, cls)} style={{...actionBtn, background: '#007bff', color: '#fff'}}>{SVGS.clock} Reschedule</button>
                                                                <button onClick={(e) => handleCancelClass(e, cls.id, cls.course, cls.day)} style={{...actionBtn, background: '#dc3545', color: '#fff'}}>{SVGS.cross} Cancel</button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ================= SPLIT ATTENDANCE TAB ================= */}
                {currentTab === 'attendance' && (
                    <div className="expand-anim">
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '15px', background: '#e9ecef', padding: '5px', borderRadius: '10px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }} className="scroll-hide">
                            <button onClick={() => setAttendanceView('mark')} style={subTabBtn(attendanceView === 'mark')}>{SVGS.tickCircle} Mark</button>
                            <button onClick={() => setAttendanceView('csv_management')} style={subTabBtn(attendanceView === 'csv_management')}>{SVGS.upload} Upload</button>
                            <button onClick={() => setAttendanceView('csv_history')} style={subTabBtn(attendanceView === 'csv_history')}>{SVGS.history} History</button>
                            <button onClick={() => setAttendanceView('download')} style={subTabBtn(attendanceView === 'download')}>{SVGS.download} Save</button>
                            <button onClick={() => setAttendanceView('stats')} style={subTabBtn(attendanceView === 'stats')}>{SVGS.chart} Stats</button>
                        </div>

                        {attendanceView === 'mark' && (
                            <div className="expand-anim" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {attendanceStats.map(stat => {
                                    const todayClass = schedule.find(c => c.course === stat.subject && c.section === stat.section && c.session === stat.session && c.day === currentDayStr && !c.isCancelled);
                                    if (!todayClass) return null;

                                    const startMins = parseTime(todayClass.start_time);
                                    const endMins = parseTime(todayClass.end_time);
                                    const isOngoing = currentMins >= startMins && currentMins <= endMins;
                                    const todaySession = todayClass.attendanceSession;
                                    let canEdit = false;

                                    if (todaySession) {
                                        const sessionTime = new Date(todaySession.created_at).getTime();
                                        const now = new Date().getTime();
                                        const diffMins = (now - sessionTime) / 60000;
                                        if (diffMins <= 30 && todaySession.status === 'pending') {
                                            canEdit = true;
                                        }
                                    }

                                    return (
                                        <div key={`mark-today-${stat.subject}-${stat.section}`} style={{ background: 'white', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', borderTop: '4px solid #28a745', border: '1px solid #eee' }}>
                                            <h3 style={{ margin: '0 0 6px 0', color: '#002147', fontSize: '1.05rem', fontWeight: '900' }}>{stat.subject}</h3>
                                            <p style={{ margin: '0 0 16px 0', fontSize: '0.75rem', color: '#666', fontWeight: 'bold' }}>Sec: {stat.section} | {todayClass.start_time} - {todayClass.end_time}</p>

                                            {isOngoing && !todaySession && (
                                                <button onClick={() => setActiveAttendanceLecture(todayClass)} style={{ width: '100%', padding: '12px', background: '#28a745', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', animation: 'pulse 2s infinite', fontSize: '0.8rem' }}>
                                                    {SVGS.edit} Mark Attendance (Ongoing)
                                                </button>
                                            )}
                                            {(!isOngoing && !todaySession) && (
                                                <button onClick={() => setActiveAttendanceLecture(todayClass)} style={{ width: '100%', padding: '12px', background: '#002147', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.8rem' }}>
                                                    {SVGS.edit} Mark Attendance
                                                </button>
                                            )}
                                            {todaySession && (
                                                <button onClick={() => setActiveAttendanceLecture(todayClass)} style={{ width: '100%', padding: '12px', background: '#007bff', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.8rem' }}>
                                                    {SVGS.edit} Edit Today's Attendance
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                                {attendanceStats.filter(stat => schedule.find(c => c.course === stat.subject && c.section === stat.section && c.session === stat.session && c.day === currentDayStr && !c.isCancelled)).length === 0 && (
                                    <div style={emptyState}>No classes scheduled for today.</div>
                                )}
                            </div>
                        )}

                        {attendanceView === 'download' && (
                            <div className="expand-anim" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div style={{ marginBottom: '10px', background: '#f8f9fa', padding: '15px', borderRadius: '10px', border: '1px solid #eee' }}>
                                    <label style={{fontSize:'0.75rem', fontWeight:'bold', color:'#666', marginBottom:'4px', display:'block'}}>Filter by Semester</label>
                                    <select value={attendanceSemesterFilter} onChange={(e) => setAttendanceSemesterFilter(e.target.value)} style={{...selectStyle, marginBottom: 0}}>
                                        <option value="ALL">All Semesters</option>
                                        {semesters.map(s => <option key={s.id} value={s.semester_name}>{s.semester_name}</option>)}
                                    </select>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                                    {attendanceStats.filter(stat => attendanceSemesterFilter === 'ALL' || stat.session === attendanceSemesterFilter).map(stat => (
                                        <div key={`dl-${stat.subject}-${stat.section}-${stat.session}`} style={{ background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', borderTop: '4px solid #17a2b8', border: '1px solid #eee' }}>
                                            <h3 style={{ margin: '0 0 6px 0', color: '#002147', fontSize: '1.05rem', fontWeight: '900' }}>{stat.subject}</h3>
                                            <p style={{ margin: '0 0 6px 0', fontSize: '0.75rem', color: '#666', fontWeight: 'bold' }}>Session: {getSemesterFromSession(stat.session)} ({stat.session})</p>
                                            <p style={{ margin: '0 0 12px 0', fontSize: '0.75rem', color: '#666', fontWeight: 'bold' }}>Section: {stat.section}</p>
                                            <p style={{ margin: '0 0 16px 0', fontSize: '0.8rem', color: '#666' }}>Lectures Conducted: <strong style={{ color: '#000' }}>{stat.totalConducted}</strong></p>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button onClick={() => downloadCSV(stat, false)} style={{ flex: 1, padding: '10px', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.75rem' }}>
                                                    {SVGS.download} CSV
                                                </button>
                                                <button onClick={() => downloadCSV(stat, true)} style={{ flex: 1, padding: '10px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.75rem' }}>
                                                    {SVGS.eye} Show
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {attendanceView === 'stats' && (
                            <div className="expand-anim" style={{ background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #eee' }}>
                                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: '16px', gap: '10px' }}>
                                    <h3 style={{ margin: 0, color: '#002147', fontSize: '1rem', fontWeight: '900' }}>Attendance Overview</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: isMobile ? '100%' : '300px' }}>
                                        <select value={attendanceSemesterFilter} onChange={(e) => setAttendanceSemesterFilter(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none', fontWeight: 'bold', fontSize: '0.75rem' }}>
                                            <option value="ALL">All Semesters</option>
                                            {semesters.map(s => <option key={s.id} value={s.semester_name}>{s.semester_name}</option>)}
                                        </select>
                                        <select value={attendanceSectionFilter} onChange={(e) => setAttendanceSectionFilter(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none', fontWeight: 'bold', fontSize: '0.75rem' }}>
                                            <option value="ALL">All Sections</option>
                                            {mySections.map(s => <option key={s} value={s}>Section {s}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {(attendanceSectionFilter !== 'ALL' || attendanceSemesterFilter !== 'ALL') ? (
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.75rem' }}>
                                            <thead>
                                                <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                                                    <th style={{ padding: '12px' }}>Registration No.</th>
                                                    <th style={{ padding: '12px' }}>Name</th>
                                                    <th style={{ padding: '12px', textAlign: 'right' }}>Overall Att %</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {roster.filter(s => (attendanceSectionFilter === 'ALL' || s.section === attendanceSectionFilter) && (attendanceSemesterFilter === 'ALL' || s.session === attendanceSemesterFilter)).map(student => {
                                                    const pct = getStudentAttendance(student.registration_number, 'ALL', attendanceSectionFilter, attendanceSemesterFilter);
                                                    return (
                                                        <tr key={student.registration_number} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                                            <td style={{ padding: '12px', fontWeight: 'bold', color: '#002147' }}>{student.registration_number}</td>
                                                            <td style={{ padding: '12px', color: '#333' }}>{student.student_name}</td>
                                                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: '900', color: pct > 75 ? '#28a745' : '#dc3545' }}>
                                                                {pct}%
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div style={emptyState}>Select a session or section filter to view statistics.</div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ================= ANNOUNCEMENTS TAB ================= */}
                {currentTab === 'updates' && (
                    <div className="expand-anim">
                        <div style={whiteCard}>
                            <h3 style={{ marginTop: 0, color: '#002147', borderBottom: '1px solid #eee', paddingBottom: '10px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {editAnnId ? <>{SVGS.edit} Edit Announcement</> : <>{SVGS.updates} Publish Announcement</>}
                            </h3>
                            <form onSubmit={submitAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <select value={announcementForm.type} onChange={(e) => setAnnouncementForm({ ...announcementForm, type: e.target.value })} style={{ ...inputStyle, flex: 1, fontWeight: 'bold', marginBottom: 0 }}>
                                        <option value="assignment">Assignment</option>
                                        <option value="message">Simple Message</option>
                                    </select>
                                    <select required value={announcementForm.subject} onChange={(e) => {
                                        setAnnouncementForm({ ...announcementForm, subject: e.target.value });
                                        setAnnSectionsList(['']);
                                    }} style={{ ...inputStyle, flex: 2, marginBottom: 0 }}>
                                        <option value="" disabled>-- Select Subject --</option>
                                        <option value="General">General / Off-Topic</option>
                                        {mySubjects.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>

                                <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#002147', marginBottom: '8px' }}>Select Class Sections</label>
                                    
                                    {annSectionsList.map((selectedVal, idx) => (
                                        <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                            <select 
                                                required 
                                                value={selectedVal} 
                                                onChange={(e) => {
                                                    const newList = [...annSectionsList];
                                                    newList[idx] = e.target.value;
                                                    setAnnSectionsList(newList);
                                                }} 
                                                style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
                                            >
                                                <option value="" disabled>-- Select Section --</option>
                                                {uniqueValidSections.map(ss => (
                                                    <option key={ss} value={ss} disabled={annSectionsList.includes(ss) && ss !== selectedVal}>
                                                        {getSemesterFromSession(JSON.parse(ss).session)} - Sec {JSON.parse(ss).section}
                                                    </option>
                                                ))}
                                            </select>
                                            {annSectionsList.length > 1 && (
                                                <button type="button" onClick={() => {
                                                    const newList = annSectionsList.filter((_, i) => i !== idx);
                                                    setAnnSectionsList(newList);
                                                }} style={{ background: '#fef2f2', color: '#dc3545', border: '1px solid #fecaca', borderRadius: '8px', padding: '0 10px', cursor: 'pointer' }}>
                                                    {SVGS.cross}
                                                </button>
                                            )}
                                        </div>
                                    ))}

                                    {annSectionsList.length < uniqueValidSections.length && annSectionsList[annSectionsList.length - 1] !== '' && (
                                        <button type="button" onClick={() => setAnnSectionsList([...annSectionsList, ''])} style={{ background: '#e0f2fe', color: '#0369a1', border: '1px dashed #bae6fd', borderRadius: '8px', padding: '6px 12px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', width: 'max-content' }}>
                                            {SVGS.plus} Add Another Section
                                        </button>
                                    )}
                                </div>

                                {announcementForm.type === 'assignment' && announcementForm.subject && (
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#666', marginBottom: '4px' }}>Deadline Date</label>
                                            <select 
                                                required 
                                                value={`${announcementForm.deadline_date}|${announcementForm.deadline_time}`} 
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (val !== 'manual') {
                                                        const [d, t] = val.split('|');
                                                        setAnnouncementForm(prev => ({...prev, deadline_date: d, deadline_time: t}));
                                                    } else {
                                                        setAnnouncementForm(prev => ({...prev, deadline_date: '', deadline_time: '8:00 AM'}));
                                                    }
                                                }} 
                                                style={{...inputStyle, marginBottom: 0}}
                                            >
                                                <option value="|" disabled>-- Select Upcoming Lecture Date --</option>
                                                {upcomingLectures.map(l => {
                                                    const dDate = getNextLectureDate(l.day);
                                                    const timeFmt = convertTo12Hour(l.start_time);
                                                    return <option key={l.id} value={`${dDate}|${l.start_time}`}>{l.day} {dDate} (By {timeFmt})</option>;
                                                })}
                                                <option value="manual">+ Provide Manual Date & Time</option>
                                            </select>

                                            {(!upcomingLectures.some(l => getNextLectureDate(l.day) === announcementForm.deadline_date) && announcementForm.deadline_date !== '') && (
                                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                                    <div style={{flex: 1}}>
                                                        <input type="date" required value={announcementForm.deadline_date} onChange={(e) => setAnnouncementForm({ ...announcementForm, deadline_date: e.target.value })} style={{ ...inputStyle, marginBottom: 0 }} />
                                                    </div>
                                                    <div style={{flex: 1}}>
                                                        <select required value={announcementForm.deadline_time} onChange={(e) => setAnnouncementForm({ ...announcementForm, deadline_time: e.target.value })} style={{ ...inputStyle, marginBottom: 0 }}>
                                                            {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                                                            <option value="11:59 PM">11:59 PM (Midnight)</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <input type="text" placeholder={announcementForm.type === 'assignment' ? "Assignment Topic (e.g. Chapter 4 Exercises)" : "Message Title"} required value={announcementForm.topics} onChange={(e) => setAnnouncementForm({ ...announcementForm, topics: e.target.value })} style={{ ...inputStyle, marginBottom: 0 }} />
                                <textarea placeholder="Provide detailed instructions or message content here..." required value={announcementForm.details} onChange={(e) => setAnnouncementForm({ ...announcementForm, details: e.target.value })} style={{ ...inputStyle, minHeight: '80px', resize: 'vertical', marginBottom: 0 }} />

                                <button type="submit" style={{ ...actionBtn, background: '#002147', color: '#F2A900', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', marginTop: '5px' }}>
                                    {SVGS.rocket} Push Announcement
                                </button>
                            </form>
                        </div>

                        <h3 style={{ color: '#333', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px', marginBottom: '10px', marginLeft: '5px' }}>Active Announcements</h3>
                        {filteredAnnouncements.length === 0 ? <div style={whiteCard}><div style={emptyState}>No announcements yet.</div></div> : (
                            filteredAnnouncements.map(ann => {
                                let timeRemainingDisplay = null;
                                let isExpired = false;

                                if (ann.type === 'assignment' && ann.deadline_date && ann.deadline_time) {
                                    const deadlineDate = new Date(ann.deadline_date);
                                    const deadlineMins = parseTime(ann.deadline_time);
                                    deadlineDate.setHours(Math.floor(deadlineMins / 60), deadlineMins % 60, 0, 0);

                                    const diffMs = deadlineDate - currentTime;

                                    if (diffMs > 0) {
                                        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                        const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
                                        const mins = Math.floor((diffMs / 1000 / 60) % 60);
                                        timeRemainingDisplay = `${days > 0 ? days + 'd ' : ''}${hours}h ${mins}m remaining`;
                                    } else {
                                        isExpired = true;
                                        timeRemainingDisplay = `Deadline Passed`;
                                    }
                                }

                                return (
                                    <div key={ann.id} style={{ ...whiteCard, borderLeft: ann.type === 'assignment' ? '5px solid #F2A900' : '5px solid #3b82f6', borderTop: 'none', opacity: isExpired ? 0.7 : 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.65rem', fontWeight: 'bold', background: '#f0f2f5', padding: '3px 8px', borderRadius: '12px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                {ann.subject} | Sec {ann.section}
                                            </span>
                                            <span style={{ fontSize: '0.7rem', color: '#999' }}>{new Date(ann.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', color: '#111827' }}>{ann.topics}</h4>
                                        <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#4b5563', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>{ann.details}</p>

                                        {ann.type === 'assignment' && (
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: isExpired ? '#fef2f2' : '#fff9e6', border: `1px solid ${isExpired ? '#fecaca' : '#F2A900'}`, borderRadius: '6px', padding: '6px 10px', fontSize: '0.75rem', marginTop: '4px', width: '100%', boxSizing: 'border-box' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: isExpired ? '#991b1b' : '#856404', fontWeight: 'bold' }}>
                                                    {isExpired ? SVGS.alertCircle : SVGS.clock} 
                                                    {isExpired ? 'Passed: ' : 'Due: '} {new Date(ann.deadline_date).toLocaleDateString()} at {convertTo12Hour(ann.deadline_time)}
                                                </span>
                                            </div>
                                        )}
                                        
                                        <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                                            <button onClick={() => handleEditAnnouncement(ann)} style={{ ...actionBtn, background: '#f0f2f5', color: '#374151', padding: '6px 10px', fontSize: '0.75rem', width: 'auto', flex: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                {SVGS.edit} Edit
                                            </button>
                                            <button onClick={async () => {
                                                if (window.confirm('Delete this announcement globally?')) {
                                                    await supabase.from('class_announcements').delete().eq('id', ann.id);
                                                    fetchProfileAndSchedule(session.user.id);
                                                }
                                            }} style={{ ...actionBtn, background: '#fef2f2', color: '#dc3545', padding: '6px 10px', fontSize: '0.75rem', width: 'auto', flex: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                {SVGS.trash} Delete
                                            </button>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                )}

                {/* ================= PERMANENT SCHEDULE TAB ================= */}
                {currentTab === 'permanent' && (
                    <div className="expand-anim">
                        <button onClick={() => openBaseModal()} style={{...bigBtn, marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'}}>{SVGS.plus} Add New Lecture</button>
                        
                        <div style={dayFilter}>
                            {filterDays.map(day => (
                                <button key={`base-day-${day}`} onClick={() => setBasePlanDayFilter(day)} style={{ ...dayBtnStyle(basePlanDayFilter === day), background: basePlanDayFilter === day ? '#002147' : '#f8f9fa' }}>
                                    {day}
                                </button>
                            ))}
                        </div>

                        <h3 style={{ color: '#333', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', marginBottom: '16px', fontWeight: '900' }}>Your Base Schedule</h3>
                        {filteredBaseSchedule.length === 0 ? <div style={emptyState}>No base schedule found.</div> : (
                            filteredBaseSchedule.map((cls) => (
                                <div key={`base-${cls.id}`} style={{ background: 'white', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', marginBottom: '16px', border: '1px solid #eee' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '12px', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                                        <div>
                                            <div style={{ fontWeight: '900', fontSize: '1rem', color: '#000' }}>{cls.course}</div>
                                            <div style={{ color: '#666', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                                                {SVGS.users} Sec {cls.section} ({getSemesterFromSession(cls.session)}) | {SVGS.location} Room {cls.room}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ color: '#002147', fontWeight: '900', fontSize: '0.75rem' }}>{cls.day}</div>
                                            <div style={{ color: '#F2A900', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>{SVGS.clock} {convertTo12Hour(cls.start_time)} - {convertTo12Hour(cls.end_time)}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                        <button onClick={() => openBaseModal(cls)} style={btnStyle('#17a2b8', SVGS.edit)}>Edit Lecture</button>
                                        <button onClick={() => deleteBaseLecture(cls.id, cls.course, cls.section)} style={btnStyle('#dc3545', SVGS.trash)}>Delete</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
                
                {/* ======================= AI TUTOR TAB ======================= */}
                {currentTab === 'ai_bot' && (
                    <div className="expand-anim">
                        <AIBot />
                    </div>
                )}
            </div>

            <footer style={footerStyle}>
                Made with love by <a href="http://wa.me/923053296062" target="_blank" rel="noreferrer" style={{ color: '#002147', fontWeight: '900', textDecoration: 'none' }}>Mohsin | Muntaha | Waleeja | Nazakat — BSAI 3RD 3M</a>
            </footer>

            {/* ATTENDANCE SHEET MODAL */}
            {activeAttendanceLecture && (
                <AttendanceSheet
                    lecture={activeAttendanceLecture}
                    profile={{ name: profile.name, isTeacher: true, section: activeAttendanceLecture.section, session: activeAttendanceLecture.session }}
                    existingSession={activeAttendanceLecture.attendanceSession}
                    students={roster.filter(s => s.section === activeAttendanceLecture.section && s.session === activeAttendanceLecture.session)}
                    onClose={(didUpdate) => {
                        setActiveAttendanceLecture(null);
                        if (didUpdate) fetchProfileAndSchedule(profile.name);
                    }}
                />
            )}

            {/* TEMP EXCEPTION EDIT MODAL */}
            {isEditModalOpen && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <h3 style={{ marginTop: 0, color: '#002147', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '900', fontSize: '1.1rem', marginBottom: '20px' }}>{SVGS.clock} Modify Lecture</h3>
                        <form onSubmit={submitReschedule} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <input type="date" required value={newDate} onChange={(e) => setNewDate(e.target.value)} style={inputStyle} />
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                <select value={newStartTime} onChange={(e) => setNewStartTime(e.target.value)} style={{ ...inputStyle, flex: 1 }}>{timeSlots.map(t => <option key={t} value={t}>{t}</option>)}</select>
                                <select value={newEndTime} onChange={(e) => setNewEndTime(e.target.value)} style={{ ...inputStyle, flex: 1 }}>{timeSlots.map(t => <option key={t} value={t}>{t}</option>)}</select>
                            </div>
                            <select required value={newRoom} onChange={(e) => setNewRoom(e.target.value)} style={inputStyle}>
                                {availableRooms.length > 0 ? availableRooms.map(r => <option key={r} value={r}>{r}</option>) : <option value={newRoom}>{newRoom}</option>}
                            </select>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                                <button type="button" onClick={() => setIsEditModalOpen(false)} style={cancelBtnStyle}>Cancel</button>
                                <button type="submit" style={saveBtnStyle}>Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {/* EXAM SCHEDULE EDIT MODAL */}
            {isExamEditModalOpen && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <h3 style={{ marginTop: 0, color: '#002147', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '900', fontSize: '1.1rem', marginBottom: '20px' }}>{SVGS.clock} Reschedule Exam</h3>
                        <form onSubmit={submitExamEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <input type="date" required value={examEditForm.exam_date} onChange={(e) => setExamEditForm({...examEditForm, exam_date: e.target.value})} style={inputStyle} />
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                <select value={examEditForm.start_time} onChange={(e) => setExamEditForm({...examEditForm, start_time: e.target.value})} style={{ ...inputStyle, flex: 1 }}>{timeSlots.map(t => <option key={t} value={t}>{t}</option>)}</select>
                                <select value={examEditForm.end_time} onChange={(e) => setExamEditForm({...examEditForm, end_time: e.target.value})} style={{ ...inputStyle, flex: 1 }}>{timeSlots.map(t => <option key={t} value={t}>{t}</option>)}</select>
                            </div>
                            <input type="text" required value={examEditForm.room} placeholder="Exam Room" onChange={(e) => setExamEditForm({...examEditForm, room: e.target.value})} style={inputStyle} />
                            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                                <button type="button" onClick={() => setIsExamEditModalOpen(false)} style={cancelBtnStyle}>Cancel</button>
                                <button type="submit" style={saveBtnStyle}>Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* BASE MODAL */}
            {isBaseModalOpen && (
                <div style={modalOverlayStyle}>
                    <div style={{ ...modalContentStyle, maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3 style={{ marginTop: 0, color: '#002147', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '900', fontSize: '1.1rem', marginBottom: '20px' }}>{SVGS.building} {baseForm.id ? 'Edit Base Lecture' : 'Add New Lecture'}</h3>
                        <form onSubmit={submitBaseSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {isManualSession ? <input type="text" placeholder="Session (e.g. Spring 2026)..." required value={baseForm.session} onChange={(e) => setBaseForm({ ...baseForm, session: e.target.value })} style={inputStyle} /> : <select required value={baseForm.session} onChange={(e) => { if (e.target.value === 'MANUAL') { setIsManualSession(true); setBaseForm({ ...baseForm, session: '' }); } else setBaseForm({ ...baseForm, session: e.target.value }); }} style={inputStyle}><option value="" disabled>-- Select Session --</option>{availableSessions.map(s => <option key={s} value={s}>{s}</option>)}<option value="MANUAL">+ Add Manually</option></select>}
                            {isManualSection ? <input type="text" placeholder="Section (e.g. 1E)..." required value={baseForm.section} onChange={(e) => setBaseForm({ ...baseForm, section: e.target.value })} style={inputStyle} /> : <select required value={baseForm.section} onChange={(e) => { if (e.target.value === 'MANUAL') { setIsManualSection(true); setBaseForm({ ...baseForm, section: '' }); } else setBaseForm({ ...baseForm, section: e.target.value }); }} style={inputStyle}><option value="" disabled>-- Select Section --</option>{availableSections.map(s => <option key={s} value={s}>{s}</option>)}<option value="MANUAL">+ Add Manually</option></select>}
                            {isManualCourse ? <input type="text" placeholder="Subject Name..." required value={baseForm.course} onChange={(e) => setBaseForm({ ...baseForm, course: e.target.value })} style={inputStyle} /> : <select required value={baseForm.course} onChange={(e) => { if (e.target.value === 'MANUAL') { setIsManualCourse(true); setBaseForm({ ...baseForm, course: '' }); } else setBaseForm({ ...baseForm, course: e.target.value }); }} style={inputStyle}><option value="" disabled>-- Select Subject --</option>{availableCourses.map(c => <option key={c} value={c}>{c}</option>)}<option value="MANUAL">+ Add Manually</option></select>}
                            {isManualRoom ? <input type="text" placeholder="Room Name (e.g. 101)..." required value={baseForm.room} onChange={(e) => setBaseForm({ ...baseForm, room: e.target.value })} style={inputStyle} /> : <select required value={baseForm.room} onChange={(e) => { if (e.target.value === 'MANUAL') { setIsManualRoom(true); setBaseForm({ ...baseForm, room: '' }); } else setBaseForm({ ...baseForm, room: e.target.value }); }} style={inputStyle}><option value="" disabled>-- Select Room --</option>{availableRooms.map(r => <option key={r} value={r}>{r}</option>)}<option value="MANUAL">+ Add Manually</option></select>}
                            <select required value={baseForm.day} onChange={(e) => setBaseForm({ ...baseForm, day: e.target.value })} style={inputStyle}>{days.map(d => <option key={d} value={d}>{d}</option>)}</select>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                <select value={baseForm.start_time} onChange={(e) => setBaseForm({ ...baseForm, start_time: e.target.value })} style={{ ...inputStyle, flex: 1 }}>{timeSlots.map(t => <option key={t} value={t}>{t}</option>)}</select>
                                <select value={baseForm.end_time} onChange={(e) => setBaseForm({ ...baseForm, end_time: e.target.value })} style={{ ...inputStyle, flex: 1 }}>{timeSlots.map(t => <option key={t} value={t}>{t}</option>)}</select>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                                <button type="button" onClick={() => setIsBaseModalOpen(false)} style={cancelBtnStyle}>Cancel</button>
                                <button type="submit" style={saveBtnStyle}>Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// STYLES
const welcomeBg = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: '#002147', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 3000 };
const welcomeCard = { background: '#fff', padding: '25px', borderRadius: '16px', width: '90%', maxWidth: '380px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', boxSizing: 'border-box' };
const headerStyle = { background: '#002147', color: '#F2A900', padding: '12px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 1000, boxShadow: '0 2px 10px rgba(0,0,0,0.2)', flexWrap: 'wrap' };
const tabBar = { background: '#fff', padding: '6px 4px', gap: '4px', position: 'sticky', top: '45px', zIndex: 999, boxShadow: '0 2px 5px rgba(0,0,0,0.05)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' };
const tabBtn = (active) => ({ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: '60px', padding: '8px 2px', border: 'none', background: active ? '#002147' : '#f0f2f5', color: active ? '#F2A900' : '#666', borderRadius: '8px', fontSize: '0.6rem', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.3s ease', position: 'relative' });
const subTabStyle = (active) => ({ flex: 1, minWidth: '90px', padding: '10px 14px', border: 'none', background: active ? '#F2A900' : 'transparent', color: active ? '#002147' : '#555', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' });
const dayFilter = { display: 'flex', gap: '6px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '6px', WebkitOverflowScrolling: 'touch' };
const dayBtnStyle = (active) => ({ flex: 1, minWidth: '40px', padding: '8px 6px', borderRadius: '10px', border: 'none', background: active ? '#002147' : '#fff', color: active ? '#F2A900' : '#555', fontWeight: 'bold', fontSize: '0.7rem', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.04)', transition: 'all 0.3s ease' });
const btnStyle = (bg, icon) => ({ flex: 1, minWidth: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 14px', background: bg, color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.75rem', transition: 'all 0.2s ease' });
const inputStyle = { width: '100%', padding: '12px 14px', border: '1px solid #dee2e6', borderRadius: '10px', outline: 'none', fontSize: '0.85rem', boxSizing: 'border-box', background: '#f8f9fa', transition: 'border 0.3s ease' };
const actionBtn = { flex: 1, minWidth: '80px', padding: '10px', background: '#eee', color: '#333', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem', transition: 'all 0.3s ease' };
const whiteCard = { background: '#fff', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', marginBottom: '16px', transition: 'all 0.3s ease', border: '1px solid #eee' };
const emptyState = { textAlign: 'center', padding: '25px 10px', color: '#999', fontSize: '0.8rem', background: '#fff', borderRadius: '12px', border: '1px dashed #ddd' };
const toastStyle = { position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', color: 'white', padding: '12px 24px', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', transition: 'all 0.3s ease', zIndex: 9999, fontWeight: 'bold', fontSize: '0.85rem' };
const notifBannerStyle = { background: '#002147', color: '#fff', padding: '10px 12px', borderRadius: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '2px solid #F2A900', gap: '8px', transition: 'all 0.3s ease' };
const enableBtnStyle = { background: '#F2A900', color: '#002147', border: 'none', padding: '6px 14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.3s ease', fontSize: '0.75rem' };
const redBadgeStyle = { background: '#dc3545', color: 'white', borderRadius: '12px', padding: '2px 6px', fontSize: '0.65rem', marginLeft: '6px', fontWeight: 'bold' };
const newsRedDot = { position: 'absolute', top: '6px', right: '6px', width: '6px', height: '6px', background: 'red', borderRadius: '50%' };
const footerStyle = { textAlign: 'center', padding: '16px', background: '#fff', color: '#666', borderTop: '1px solid #dee2e6', fontSize: '0.65rem', marginTop: 'auto' };
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,21,47,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: '16px', boxSizing: 'border-box', backdropFilter: 'blur(3px)' };
const modalContentStyle = { background: 'white', padding: '25px', borderRadius: '16px', width: '100%', maxWidth: '420px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' };
const cancelBtnStyle = { flex: 1, padding: '14px', background: '#e9ecef', color: '#333', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', transition: 'background 0.2s ease' };
const saveBtnStyle = { flex: 1, padding: '14px', background: '#F2A900', color: '#002147', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer', transition: 'background 0.2s ease' };

// Sidebar Styles
const sidebarOverlay = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, animation: 'fadeInSlide 0.2s ease' };
const sidebarMenu = { width: '250px', height: '100%', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '2px 0 15px rgba(0,0,0,0.1)' };
const sidebarBtn = (active) => ({ display: 'flex', alignItems: 'center', width: '100%', textAlign: 'left', padding: '14px 18px', border: 'none', background: active ? '#f0f2f5' : '#fff', color: active ? '#002147' : '#555', borderLeft: active ? '4px solid #F2A900' : '4px solid transparent', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', borderBottom: '1px solid #f8f9fa', transition: 'all 0.3s ease' });
