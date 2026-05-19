import { useEffect, useState, useRef } from 'react'; 
import Head from 'next/head';
import { supabase } from '../lib/supabase';
import AttendanceSheet from '../components/AttendanceSheet';

// --- Custom SVGs for UI ---
const SVGS = {
    tick: <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>,
    cross: <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>,
    bell: <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>,
    calendar: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2"/><line x1="16" y1="2" x2="16" y2="6" strokeWidth="2"/><line x1="8" y1="2" x2="8" y2="6" strokeWidth="2"/></svg>,
    attendance: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>,
    updates: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"></path></svg>,
    clock: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth="2"/><polyline points="12 6 12 12 16 14" strokeWidth="2"/></svg>,
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
    save: <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>,
    lock: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>,
    undo: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>,
    file: <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>,
    eye: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>,
    history: <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
    rocket: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v8l9-11h-7z"/></svg>,
    sparkle: <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 2l3 6 6 3-6 3-3 6-3-6-6-3 6-3 3-6z"/></svg>,
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

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const isMobile = windowWidth < 768;

    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch((err) => console.error('SW Registration Failed', err));
        }
    }, []);

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
                            new Notification("Assignment Deadline Approaching!", { body: msg, icon: "/icon-192x192.png" });
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
                    new Notification("IUB Update Alert", { body: newMsg, icon: "/icon-192x192.png" });
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
        const { data: profileData } = await supabase.from('cr_profiles').select('*').eq('id', userId).single();
        
        if (profileData) {
            setProfile(profileData);
            
            if (profileData.is_approved === false) {
                setIsPendingApproval(true);
                setLoading(false);
                return; 
            }

            const { data: rosterData } = await fetchAllRows('students', { session: profileData.session, section: profileData.section });
            const sortedRoster = rosterData.sort((a,b) => a.registration_number.localeCompare(b.registration_number));
            setRoster(sortedRoster);

            const { data: scheduleData } = await fetchAllRows('base_schedule', { session: profileData.session, section: profileData.section });
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
            
            const [exceptionsRes, sessionsRes, logsRes] = await Promise.all([
                fetchAllRows('schedule_exceptions'),
                fetchAllRows('attendance_sessions', null, { column: 'base_schedule_id', values: baseIds }),
                fetchAllRows('attendance_upload_logs', { session: profileData.session, section: profileData.section })
            ]);

            const exceptionsData = exceptionsRes.data || [];
            const allSessions = sessionsRes.data || [];
            
            const sessionIds = allSessions.map(s => s.id);
            let allRecords = [];
            if (sessionIds.length > 0) {
                const recRes = await fetchAllRows('attendance_records', null, { column: 'session_id', values: sessionIds });
                allRecords = recRes.data || [];
            }

            const sortedLogs = (logsRes.data || []).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
            setUploadLogs(sortedLogs);

            const sessionsWithRecords = allSessions.map(s => ({
                ...s,
                course: scheduleData.find(b => b.id === s.base_schedule_id)?.course,
                records: allRecords.filter(r => r.session_id === s.id)
            }));
            
            setAllSessionsData(sessionsWithRecords); 

            const mergedSchedule = (scheduleData || []).map(cls => {
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

            const uniqueSubjects = [...new Set((scheduleData || []).map(s => s.course))];

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

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = '/login';
    };

    const getStudentAttendance = (studentReg, subjectFilter) => {
        let present = 0, total = 0;
        allSessionsData.forEach(session => {
            if (subjectFilter !== 'ALL' && session.course !== subjectFilter) return;
            const record = session.records.find(r => r.student_id === studentReg);
            if (record) {
                total++;
                if (record.status === 'Present' || record.status === 'Leave') present++;
            }
        });
        return total === 0 ? 0 : Math.round((present / total) * 100);
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
        const sessTag = profile?.session ? ` | ${profile.session}` : '';
        await supabase.from('notifications').insert([{ message: `✅ Confirmed: ${courseName} for Section ${profile.section}${sessTag} will be held on ${targetDate}.` }]);
        fetchProfileAndSchedule(session.user.id); 
    };

    const handleCancelClass = async (e, classId, courseName, clsDay) => {
        e.stopPropagation();
        if (!window.confirm(`Are you sure you want to CANCEL ${courseName}?`)) return;
        const targetDate = getDateForCurrentWeekDay(clsDay);
        await supabase.from('schedule_exceptions').insert([{ base_schedule_id: classId, exception_date: targetDate, status: 'cancelled', cancelled_by: session.user.id }]);
        const sessTag = profile?.session ? ` | ${profile.session}` : '';
        await supabase.from('notifications').insert([{ message: `🚨 Cancelled: ${courseName} for Section ${profile.section}${sessTag} on ${targetDate} is cancelled.` }]);
        fetchProfileAndSchedule(session.user.id);
    };

    const handleUndoException = async (e, classId, actionType, courseName, clsDay) => {
        e.stopPropagation();
        const targetDate = getDateForCurrentWeekDay(clsDay);
        const sessTag = profile?.session ? ` | ${profile.session}` : '';
        await supabase.from('schedule_exceptions').delete().match({ base_schedule_id: classId, exception_date: targetDate });

        if (actionType === 'cancelled') await supabase.from('notifications').delete().eq('message', `🚨 Cancelled: ${courseName} for Section ${profile.section}${sessTag} on ${targetDate} is cancelled.`);
        else if (actionType === 'confirmed') await supabase.from('notifications').delete().eq('message', `✅ Confirmed: ${courseName} for Section ${profile.section}${sessTag} will be held on ${targetDate}.`);
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
        const sessTag = profile?.session ? ` | ${profile.session}` : '';
        await supabase.from('schedule_exceptions').insert([{
            base_schedule_id: editingClass.id, exception_date: targetDate, status: 'rescheduled',
            new_start_time: newStartTime, new_end_time: newEndTime, new_room: newRoom, cancelled_by: session.user.id
        }]);
        await supabase.from('notifications').insert([{ message: `🕒 Rescheduled: ${editingClass.course} for Section ${profile.section}${sessTag} moved to Room ${newRoom} (${newStartTime} - ${newEndTime}) on ${targetDate}.` }]);
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
        .filter(cls => cls.day === selectedDay)
        .sort((a, b) => parseTime(a.start_time) - parseTime(b.start_time));
    
    const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    const currentMins = new Date().getHours() * 60 + new Date().getMinutes();

    const visibleTabs = [
        { id: 'weekly', label: 'Weekly', icon: SVGS.calendar },
        ...(!isMobile ? [{ id: 'permanent', label: 'Base', icon: SVGS.home }] : []),
        ...(!isMobile ? [{ id: 'students', label: 'Students', icon: SVGS.users }] : []),
        { id: 'attendance', label: 'Attendance', icon: SVGS.attendance },
        { id: 'announcements', label: 'Updates', icon: SVGS.updates }
    ];

    const ongoingClasses = schedule.filter(cls => {
        if (cls.day !== currentDay || cls.isCancelled) return false;
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
                    {visibleTabs.map(tab => (
                        <div 
                            key={tab.id} 
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                cursor: 'pointer', padding: '6px 10px', borderRadius: '5px', fontWeight: 'bold', fontSize: '0.75rem',
                                background: activeTab === tab.id ? '#F2A900' : 'transparent',
                                color: activeTab === tab.id ? '#002147' : '#fff',
                                transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', gap: '6px'
                            }}
                        >
                            {tab.icon} {tab.label}
                        </div>
                    ))}
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
                        {[{id: 'weekly', label: 'Weekly Timetable', icon: SVGS.calendar}, {id: 'permanent', label: 'Base Schedule', icon: SVGS.home}, {id: 'students', label: 'Manage Students', icon: SVGS.users}, {id: 'attendance', label: 'Attendance', icon: SVGS.attendance}, {id: 'announcements', label: 'Announcements', icon: SVGS.updates}].map(tab => (
                            <button 
                                key={tab.id} 
                                onClick={() => { setActiveTab(tab.id); setIsSidebarOpen(false); }} 
                                style={sidebarBtn(activeTab === tab.id)}
                            >
                                <span style={{ opacity: 0.7 }}>{tab.icon}</span> <span style={{ marginLeft: '10px' }}>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="mobile-nav" style={tabBar}>
                {visibleTabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={tabBtn(activeTab === tab.id)}>
                        <div style={{ marginBottom: '2px', opacity: activeTab === tab.id ? 1 : 0.6 }}>{tab.icon}</div>
                        {tab.label}
                    </button>
                ))}
            </div>

            <div style={{ padding: '15px 12px', maxWidth: '800px', margin: '0 auto', flex: 1, width: '100%', boxSizing: 'border-box' }}>
                
                <div className="expand-anim" style={{ background: 'linear-gradient(135deg, #002147 0%, #003366 100%)', borderRadius: '15px', padding: '20px', color: '#fff', marginBottom: '20px', boxShadow: '0 4px 15px rgba(0,33,71,0.2)' }}>
                    <h2 style={{ margin: '0 0 5px 0', fontSize: '1.2rem', fontWeight: '900', color: '#F2A900', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        Welcome, {profile?.first_name} {profile?.last_name}
                    </h2>
                    <p style={{ margin: 0, color: '#e0e0e0', fontSize: '0.85rem' }}>Managing: <strong>{profile?.session} | Section {profile?.section}</strong></p>
                </div>

                {ongoingClasses.length > 0 && (
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
                {activeTab === 'weekly' && (
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
                                                        <button onClick={(e) => handleConfirmClass(e, cls.id, cls.course, cls.day)} style={{...actionBtn, background: '#28a745'}}>{SVGS.tickCircle} Confirm</button>
                                                        <button onClick={(e) => openEditModal(e, cls)} style={{...actionBtn, background: '#007bff'}}>{SVGS.clock} Reschedule</button>
                                                        <button onClick={(e) => handleCancelClass(e, cls.id, cls.course, cls.day)} style={{...actionBtn, background: '#dc3545'}}>{SVGS.cross} Cancel</button>
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

                {/* ================= SPLIT ATTENDANCE TAB ================= */}
                {activeTab === 'attendance' && (
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
                                    const todayClass = schedule.find(c => c.course === stat.subject && c.day === currentDay && !c.isCancelled);
                                    let isOngoing = false;
                                    let canEdit = false;
                                    let todaySession = null;

                                    if (todayClass) {
                                        const startMins = parseTime(todayClass.start_time);
                                        const endMins = parseTime(todayClass.end_time);
                                        isOngoing = currentMins >= startMins && currentMins <= endMins;
                                        todaySession = todayClass.attendanceSession;
                                        
                                        if (todaySession) {
                                            const sessionTime = new Date(todaySession.created_at).getTime();
                                            const now = new Date().getTime();
                                            const diffMins = (now - sessionTime) / 60000;
                                            if (diffMins <= 30 && todaySession.status === 'pending') {
                                                canEdit = true;
                                            }
                                        }
                                    }

                                    if (!todayClass) return null; 

                                    return (
                                        <div key={`mark-${stat.subject}`} style={{...whiteCard, borderTop: '4px solid #28a745'}}>
                                            <h3 style={{ margin: '0 0 5px 0', color: '#002147', fontSize: '1.1rem' }}>{stat.subject}</h3>
                                            <p style={{ margin: '0 0 15px 0', fontSize: '0.8rem', color: '#666', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                {SVGS.clock} {todayClass.start_time} - {todayClass.end_time} | {SVGS.location} Room {todayClass.room}
                                            </p>
                                            
                                            {isOngoing && !todaySession && (
                                                <button onClick={() => setActiveAttendanceLecture(todayClass)} style={{...bigBtn, background: '#28a745', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'}}>
                                                    {SVGS.note} Mark Attendance (Ongoing)
                                                </button>
                                            )}
                                            {todaySession && canEdit && (
                                                <button onClick={() => setActiveAttendanceLecture(todayClass)} style={{...bigBtn, background: '#007bff', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'}}>
                                                    {SVGS.edit} Edit Attendance
                                                </button>
                                            )}
                                            {todaySession && !canEdit && (
                                                <button disabled style={{...bigBtn, background: '#6c757d', color: 'white', opacity: 0.8, cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'}}>
                                                    {SVGS.lock} Locked ({todaySession.status === 'approved' ? 'Approved' : 'Pending'})
                                                </button>
                                            )}
                                            {!isOngoing && !todaySession && (
                                                <div style={{ textAlign: 'center', padding: '10px', color: '#856404', background: '#fff3cd', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                                    Not currently active.
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {attendanceStats.filter(stat => schedule.find(c => c.course === stat.subject && c.day === currentDay && !c.isCancelled)).length === 0 && (
                                    <div style={whiteCard}><div style={emptyState}>No classes scheduled for today to mark attendance.</div></div>
                                )}
                            </div>
                        )}

                        {attendanceView === 'download' && (
                            <div className="expand-anim" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {attendanceStats.map(stat => (
                                    <div key={`dl-${stat.subject}`} style={{...whiteCard, borderLeft: '4px solid #17a2b8'}}>
                                        <h4 style={{ margin: '0 0 5px 0', color: '#002147', fontSize: '1.1rem' }}>{stat.subject}</h4>
                                        <p style={{ margin: '0 0 15px 0', fontSize: '0.8rem', color: '#666' }}>Lectures Conducted: <strong>{stat.totalConducted}</strong></p>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button onClick={() => downloadCSV(stat, false)} style={{...actionBtn, background: '#17a2b8'}}>{SVGS.download} Download CSV</button>
                                            <button onClick={() => downloadCSV(stat, true)} style={{...actionBtn, background: '#6c757d'}}>{SVGS.eye} View Table</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {attendanceView === 'csv_management' && (
                            <div className="expand-anim" style={whiteCard}>
                                {uploadStatus === 'idle' && (
                                    <>
                                        <h3 style={{ color: '#002147', margin: '0 0 10px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>{SVGS.upload} Upload Attendance CSV</h3>
                                        <p style={{fontSize: '0.8rem', color: '#666', marginBottom: '15px'}}>Select a subject and upload your CSV. If attendance for any dates inside the CSV already exists, it will be <strong>replaced entirely</strong> with the new file's data.</p>
                                        
                                        <select value={uploadCsvSubject} onChange={(e) => setUploadCsvSubject(e.target.value)} style={selectStyle}>
                                            <option value="">-- Select Subject --</option>
                                            {availableCourses.map(c => <option key={`up-${c}`} value={c}>{c}</option>)}
                                        </select>

                                        {uploadCsvSubject && (
                                            <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '10px', border: '2px dashed #ccc', textAlign: 'center', cursor: 'pointer', transition: '0.3s ease' }} onClick={() => fileInputRef.current.click()}>
                                                <div style={{ color: '#002147', marginBottom: '8px', display: 'flex', justifyContent: 'center' }}>{SVGS.file}</div>
                                                <p style={{ fontSize: '0.9rem', color: '#002147', fontWeight: 'bold', margin: '0 0 5px 0' }}>Click to select CSV File</p>
                                                <p style={{ fontSize: '0.7rem', color: '#666', margin: 0 }}>Format: Name, Registration Number, YYYY-MM-DD...</p>
                                                <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} />
                                            </div>
                                        )}
                                    </>
                                )}

                                {uploadStatus === 'confirm' && csvMeta && (
                                    <div className="expand-anim" style={{textAlign: 'center'}}>
                                        <h3 style={{color: '#002147', margin: '0 0 15px 0'}}>Confirm Upload</h3>
                                        <div style={{background: '#e7f1ff', padding: '15px', borderRadius: '10px', border: '1px solid #b8daff', marginBottom: '15px', textAlign: 'left', fontSize: '0.85rem'}}>
                                            <p style={{margin: '0 0 8px 0'}}><strong>Subject:</strong> {uploadCsvSubject}</p>
                                            <p style={{margin: '0 0 8px 0'}}><strong>Total Students/Rows:</strong> {csvMeta.totalRecords}</p>
                                            <p style={{margin: '0 0 8px 0'}}><strong>Dates to Overwrite/Insert ({csvMeta.dateCols.length}):</strong></p>
                                            <div style={{display: 'flex', gap: '5px', flexWrap: 'wrap'}}>
                                                {csvMeta.dateCols.map(d => (
                                                    <span key={d.dateStr} style={{background: '#fff', border: '1px solid #ccc', padding: '3px 8px', borderRadius: '15px', fontSize: '0.7rem', fontWeight: 'bold'}}>{d.dateStr}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button onClick={() => { setUploadStatus('idle'); setCsvMeta(null); }} style={{...actionBtn, background: '#ccc', color: '#333'}}>Cancel</button>
                                            <button onClick={executeCsvUpload} style={{...actionBtn, background: '#28a745', flex: 2}}>{SVGS.upload} Confirm & Upload Data</button>
                                        </div>
                                    </div>
                                )}

                                {uploadStatus === 'uploading' && (
                                    <div className="expand-anim" style={{textAlign: 'center', padding: '30px 0'}}>
                                        <h3 style={{color: '#002147', margin: '0 0 15px 0'}}>Processing Data...</h3>
                                        <div style={{width: '100%', height: '12px', background: '#eee', borderRadius: '6px', overflow: 'hidden'}}>
                                            <div style={{width: `${uploadProgress}%`, height: '100%', background: '#F2A900', transition: 'width 0.3s ease'}}></div>
                                        </div>
                                        <p style={{fontWeight: 'bold', marginTop: '8px', color: '#555', fontSize: '0.85rem'}}>{uploadProgress}%</p>
                                    </div>
                                )}

                                {uploadStatus === 'success' && (
                                    <div className="expand-anim" style={{textAlign: 'center', padding: '20px 0'}}>
                                        <div style={{color: '#28a745', marginBottom: '10px', display: 'flex', justifyContent: 'center', transform: 'scale(2)'}}>{SVGS.tickCircle}</div>
                                        <h3 style={{color: '#28a745', margin: '0 0 10px 0'}}>Upload Complete!</h3>
                                        <p style={{color: '#666', marginBottom: '20px', fontSize: '0.85rem'}}>The attendance data has been successfully stored.</p>
                                        <button onClick={() => { setUploadStatus('idle'); setCsvMeta(null); setUploadCsvSubject(''); }} style={bigBtn}>Upload Another File</button>
                                    </div>
                                )}
                            </div>
                        )}

                        {attendanceView === 'csv_history' && (
                            <div className="expand-anim" style={whiteCard}>
                                <h3 style={{ margin: '0 0 15px 0', color: '#002147', borderBottom: '1px solid #eee', paddingBottom: '10px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>{SVGS.history} Upload History & Undo</h3>
                                {uploadLogs.length === 0 ? (
                                    <div style={emptyState}>No upload history found.</div>
                                ) : (
                                    <div style={{ overflowX: 'auto' }} className="scroll-hide">
                                        <table style={tableStyle}>
                                            <thead>
                                                <tr style={tableHeaderRow}>
                                                    <th style={tableHeaderCell}>Date</th>
                                                    <th style={tableHeaderCell}>Subject</th>
                                                    <th style={tableHeaderCell}>Dates Processed</th>
                                                    <th style={{...tableHeaderCell, textAlign: 'right'}}>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {uploadLogs.map(log => (
                                                    <tr key={log.id} style={tableDataRow}>
                                                        <td style={tableDataCell}>{new Date(log.created_at).toLocaleDateString()}</td>
                                                        <td style={{...tableDataCell, fontWeight: 'bold', color: '#002147'}}>{log.subject}</td>
                                                        <td style={{...tableDataCell, maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{log.dates_included}</td>
                                                        <td style={{...tableDataCell, textAlign: 'right'}}>
                                                            <button onClick={() => handleUndoUpload(log)} style={{ padding: '4px 8px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                {SVGS.undo} Undo
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {attendanceView === 'stats' && (
                            <div className="expand-anim" style={whiteCard}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                                    <h3 style={{ margin: 0, color: '#002147', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>{SVGS.chart} Student Stats</h3>
                                    <select value={attendanceSubjectFilter} onChange={(e) => setAttendanceSubjectFilter(e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #ddd', outline: 'none', fontWeight: 'bold', fontSize: '0.8rem' }}>
                                        <option value="ALL">All Subjects (Overall)</option>
                                        {availableCourses.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                
                                <div style={{ overflowX: 'auto' }} className="scroll-hide">
                                    <table style={tableStyle}>
                                        <thead>
                                            <tr style={tableHeaderRow}>
                                                <th style={tableHeaderCell}>Reg No</th>
                                                <th style={tableHeaderCell}>Name</th>
                                                <th style={{...tableHeaderCell, textAlign: 'right'}}>%</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {roster.map(student => {
                                                const pct = getStudentAttendance(student.registration_number, attendanceSubjectFilter);
                                                return (
                                                    <tr key={student.registration_number} style={tableDataRow}>
                                                        <td style={{...tableDataCell, fontWeight: 'bold'}}>{student.registration_number}</td>
                                                        <td style={tableDataCell}>{student.student_name}</td>
                                                        <td style={{...tableDataCell, textAlign: 'right', fontWeight: 'bold', color: pct >= 75 ? '#28a745' : '#dc3545' }}>
                                                            {pct}%
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ================= ANNOUNCEMENTS TAB ================= */}
                {activeTab === 'announcements' && (
                    <div className="expand-anim">
                        <div style={whiteCard}>
                            <h3 style={{ marginTop: 0, color: '#002147', borderBottom: '1px solid #eee', paddingBottom: '10px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {editAnnId ? <>{SVGS.edit} Edit Announcement</> : <>{SVGS.updates} Publish Announcement</>}
                            </h3>
                            <form onSubmit={submitAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <select value={announcementForm.type} onChange={(e) => setAnnouncementForm({...announcementForm, type: e.target.value})} style={{...selectStyle, flex: 1, fontWeight: 'bold', marginBottom: 0}}>
                                        <option value="assignment">Assignment</option>
                                        <option value="message">Simple Message</option>
                                    </select>
                                    <select required value={announcementForm.subject} onChange={(e) => {
                                        setAnnouncementForm({...announcementForm, subject: e.target.value, lecture_selector: ''});
                                    }} style={{...selectStyle, flex: 2, marginBottom: 0}}>
                                        <option value="" disabled>-- Select Subject --</option>
                                        <option value="General">General / Off-Topic</option>
                                        {availableCourses.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>

                                {announcementForm.type === 'assignment' && announcementForm.subject && (
                                    <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
                                        <label style={{display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#002147', marginBottom: '8px'}}>Select Deadline</label>
                                        
                                        {upcomingLectures.length > 0 && announcementForm.subject !== 'General' && (
                                            <select 
                                                value={announcementForm.lecture_selector} 
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setAnnouncementForm({...announcementForm, lecture_selector: val});
                                                    if (val && val !== 'manual') {
                                                        const [d, t] = val.split('|');
                                                        setAnnouncementForm(prev => ({...prev, deadline_date: d, deadline_time: t}));
                                                    }
                                                }} 
                                                style={selectStyle}
                                            >
                                                <option value="" disabled>-- Select Upcoming Lecture Date --</option>
                                                {upcomingLectures.map(l => {
                                                    const dDate = getNextLectureDate(l.day);
                                                    const timeFmt = convertTo12Hour(l.start_time);
                                                    return <option key={l.id} value={`${dDate}|${timeFmt}`}>{l.day} {dDate} (By {timeFmt})</option>;
                                                })}
                                                <option value="manual">+ Provide Manual Date & Time</option>
                                            </select>
                                        )}

                                        {(announcementForm.lecture_selector === 'manual' || upcomingLectures.length === 0 || announcementForm.subject === 'General') && (
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <div style={{flex: 1}}>
                                                    <label style={{display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#666', marginBottom: '4px'}}>Date</label>
                                                    <input type="date" required value={announcementForm.deadline_date} onChange={(e) => setAnnouncementForm({...announcementForm, deadline_date: e.target.value})} style={{...selectStyle, marginBottom: 0}} />
                                                </div>
                                                <div style={{flex: 1}}>
                                                    <label style={{display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#666', marginBottom: '4px'}}>Time</label>
                                                    <select required value={announcementForm.deadline_time} onChange={(e) => setAnnouncementForm({...announcementForm, deadline_time: e.target.value})} style={{...selectStyle, marginBottom: 0}}>
                                                        {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                                                        <option value="11:59 PM">11:59 PM (Midnight)</option>
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <input type="text" placeholder={announcementForm.type === 'assignment' ? "Assignment Topic (e.g. Chapter 4 Exercises)" : "Message Title"} required value={announcementForm.topics} onChange={(e) => setAnnouncementForm({...announcementForm, topics: e.target.value})} style={{...selectStyle, marginBottom: 0}} />
                                <textarea placeholder="Provide detailed instructions or message content here..." required value={announcementForm.details} onChange={(e) => setAnnouncementForm({...announcementForm, details: e.target.value})} style={{...selectStyle, minHeight: '80px', resize: 'vertical', marginBottom: 0}} />
                                
                                <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                                    {editAnnId && (
                                        <button type="button" onClick={() => { setEditAnnId(null); setAnnouncementForm({ type: 'assignment', subject: '', lecture_selector: '', deadline_date: '', deadline_time: '8:00 AM', topics: '', details: '' }); }} style={{...actionBtn, background: '#ccc', color: '#333'}}>
                                            Cancel
                                        </button>
                                    )}
                                    <button type="submit" style={{...actionBtn, background: '#002147', color: '#F2A900', flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'}}>
                                        {editAnnId ? <>{SVGS.save} Update</> : <>{SVGS.rocket} Push to Class</>}
                                    </button>
                                </div>
                            </form>
                        </div>

                        <h3 style={{ color: '#333', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px', marginBottom: '10px', marginLeft: '5px' }}>Active Announcements</h3>
                        {announcements.length === 0 ? <div style={whiteCard}><div style={emptyState}>No announcements yet.</div></div> : (
                            announcements.map(ann => {
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
                                                {ann.subject}
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
                                                if(window.confirm('Delete this announcement globally?')) {
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
                {activeTab === 'permanent' && (
                    <div className="expand-anim">
                        <button onClick={() => openBaseModal()} style={{...bigBtn, marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'}}>{SVGS.plus} Add New Lecture</button>
                        
                        {baseSchedule.length === 0 ? <div style={whiteCard}><div style={emptyState}>No base schedule found.</div></div> : (
                            baseSchedule.sort((a, b) => a.day.localeCompare(b.day)).map((cls) => (
                                <div key={`base-${cls.id}`} style={whiteCard}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#111827', marginBottom: '4px' }}>{cls.course}</div>
                                            <div style={{ color: '#555', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>{SVGS.userTie} {cls.teacher} | {SVGS.location} Room {cls.room}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ color: '#002147', fontWeight: '900', fontSize: '0.85rem' }}>{cls.day}</div>
                                            <div style={{ color: '#F2A900', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>{SVGS.clock} {convertTo12Hour(cls.start_time)} - {convertTo12Hour(cls.end_time)}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                        <button onClick={() => openBaseModal(cls)} style={{...actionBtn, background: '#f0f2f5', color: '#374151', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center'}}>{SVGS.edit} Edit</button>
                                        <button onClick={() => deleteBaseLecture(cls.id, cls.course)} style={{...actionBtn, background: '#fef2f2', color: '#dc3545', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center'}}>{SVGS.trash} Delete</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* ================= MANAGE STUDENTS TAB ================= */}
                {activeTab === 'students' && (
                    <div className="expand-anim" style={whiteCard}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0, color: '#002147', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>{SVGS.plus} Add Student</h3>
                            <div>
                                <input type="file" accept=".csv" ref={fileInputRef} onChange={handleCSVUpload} style={{ display: 'none' }} />
                                <button onClick={() => fileInputRef.current.click()} style={{ padding: '6px 12px', background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {SVGS.upload} Import CSV
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleAddStudent} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
                            <input type="text" placeholder="Reg No (e.g. FA23-BSE-001)" required value={newStudent.roll} onChange={(e) => setNewStudent({...newStudent, roll: e.target.value})} style={{...selectStyle, flex: 1, minWidth: '130px', marginBottom: 0}} />
                            <input type="text" placeholder="Student Name" required value={newStudent.name} onChange={(e) => setNewStudent({...newStudent, name: e.target.value})} style={{...selectStyle, flex: 2, minWidth: '150px', marginBottom: 0}} />
                            <button type="submit" style={{...actionBtn, background: '#28a745', flex: 'none', width: 'auto'}}>{SVGS.plus} Add</button>
                        </form>

                        <h3 style={{ color: '#002147', fontSize: '1rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>{SVGS.users} Class Roster ({roster.length})</h3>
                        {roster.length === 0 ? <div style={emptyState}>No students added yet.</div> : (
                            <div style={{ overflowX: 'auto' }} className="scroll-hide">
                                <table style={tableStyle}>
                                    <thead>
                                        <tr style={tableHeaderRow}>
                                            <th style={tableHeaderCell}>Reg Number</th>
                                            <th style={tableHeaderCell}>Name</th>
                                            <th style={{...tableHeaderCell, textAlign: 'center'}}>Att %</th>
                                            <th style={{...tableHeaderCell, textAlign: 'right'}}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {roster.map(student => {
                                            const pct = getStudentAttendance(student.registration_number, 'ALL');
                                            return (
                                                <tr key={student.registration_number} style={tableDataRow}>
                                                    <td style={{...tableDataCell, fontWeight: 'bold', fontSize: '0.8rem'}}>{student.registration_number}</td>
                                                    <td style={{...tableDataCell, fontSize: '0.8rem'}}>{student.student_name}</td>
                                                    <td style={{...tableDataCell, textAlign: 'center', fontWeight: 'bold', color: pct >= 75 ? '#28a745' : '#dc3545', fontSize: '0.8rem' }}>{pct}%</td>
                                                    <td style={{...tableDataCell, textAlign: 'right'}}>
                                                        <button onClick={() => handleDeleteStudent(student.registration_number)} style={{ padding: '4px 8px', background: '#fef2f2', color: '#dc3545', border: '1px solid #fecaca', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 'bold' }}>Delete</button>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* MODALS */}
            {activeAttendanceLecture && (
                <AttendanceSheet 
                    lecture={activeAttendanceLecture} 
                    profile={profile}
                    roster={roster}
                    students={roster}
                    existingSession={activeAttendanceLecture.attendanceSession}
                    onClose={(didUpdate) => {
                        setActiveAttendanceLecture(null);
                        if (didUpdate) fetchProfileAndSchedule(session.user.id);
                    }} 
                />
            )}

            {isEditModalOpen && (
                <div style={sidebarOverlay}>
                    <div className="expand-anim" style={{ background: 'white', padding: '25px', borderRadius: '15px', width: '90%', maxWidth: '400px', margin: 'auto', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', boxSizing: 'border-box' }}>
                        <h3 style={{ marginTop: 0, color: '#002147', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '15px' }}>{SVGS.clock} Reschedule Class (Temp)</h3>
                        <form onSubmit={submitReschedule} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <input type="date" required value={newDate} onChange={(e) => setNewDate(e.target.value)} style={selectStyle} />
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                <select value={newStartTime} onChange={(e) => setNewStartTime(e.target.value)} style={{...selectStyle, flex: 1, marginBottom: 0}}>{timeSlots.map(t => <option key={t} value={t}>{t}</option>)}</select>
                                <select value={newEndTime} onChange={(e) => setNewEndTime(e.target.value)} style={{...selectStyle, flex: 1, marginBottom: 0}}>{timeSlots.map(t => <option key={t} value={t}>{t}</option>)}</select>
                            </div>
                            <select required value={newRoom} onChange={(e) => {
                                if (e.target.value === 'MANUAL') {
                                    setIsManualRoom(true); setNewRoom('');
                                } else {
                                    setNewRoom(e.target.value);
                                }
                            }} style={selectStyle}>
                                <option value="" disabled>-- Select Dept Room --</option>
                                {allDepartmentRooms.map(r => <option key={`resch-${r}`} value={r}>{r}</option>)}
                                <option value="MANUAL">+ Add Room Manually</option>
                            </select>
                            {isManualRoom && <input type="text" placeholder="Type Room Name Manually..." required value={newRoom} onChange={(e) => setNewRoom(e.target.value)} style={{...selectStyle, border: '1px solid #007bff'}} />}
                            
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="button" onClick={() => { setIsEditModalOpen(false); setIsManualRoom(false); }} style={{...actionBtn, background: '#f0f2f5', color: '#333'}}>Cancel</button>
                                <button type="submit" style={{...actionBtn, background: '#F2A900', color: '#002147'}}>{SVGS.save} Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isBaseModalOpen && (
                <div style={sidebarOverlay}>
                    <div className="expand-anim" style={{ background: 'white', padding: '25px', borderRadius: '15px', width: '90%', maxWidth: '400px', margin: 'auto', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', boxSizing: 'border-box' }}>
                        <h3 style={{ marginTop: 0, color: '#002147', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '15px' }}>{baseForm.id ? <>{SVGS.edit} Edit Base Lecture</> : <>{SVGS.plus} Add New Lecture</>}</h3>
                        <form onSubmit={submitBaseSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {isManualCourse ? <input type="text" placeholder="Subject Name..." required value={baseForm.course} onChange={(e) => setBaseForm({...baseForm, course: e.target.value})} style={{...selectStyle, border: '1px solid #007bff', marginBottom: 0}} /> : 
                            <select required value={baseForm.course} onChange={(e) => { 
                                if (e.target.value === 'MANUAL') { setIsManualCourse(true); setBaseForm({...baseForm, course: ''}); } 
                                else setBaseForm({...baseForm, course: e.target.value}); 
                            }} style={{...selectStyle, marginBottom: 0}}>
                                <option value="" disabled>-- Select Subject --</option>
                                {availableCourses.map(c => <option key={`bc-${c}`} value={c}>{c}</option>)}
                                <option value="MANUAL">+ Add Manually</option>
                            </select>}

                            {isManualTeacher ? <input type="text" placeholder="Teacher Name..." required value={baseForm.teacher} onChange={(e) => setBaseForm({...baseForm, teacher: e.target.value})} style={{...selectStyle, border: '1px solid #007bff', marginBottom: 0}} /> : 
                            <select required value={baseForm.teacher} onChange={(e) => { 
                                if (e.target.value === 'MANUAL') { setIsManualTeacher(true); setBaseForm({...baseForm, teacher: ''}); } 
                                else {
                                    const selectedTeacher = e.target.value;
                                    const autoCourse = teacherCourseMap[selectedTeacher];
                                    setBaseForm({...baseForm, teacher: selectedTeacher, course: autoCourse || baseForm.course});
                                }
                            }} style={{...selectStyle, marginBottom: 0}}>
                                <option value="" disabled>-- Select Teacher --</option>
                                {availableTeachers.map(t => <option key={`bt-${t}`} value={t}>{t}</option>)}
                                <option value="MANUAL">+ Add Manually</option>
                            </select>}

                            {isManualRoom ? <input type="text" placeholder="Room Name..." required value={baseForm.room} onChange={(e) => setBaseForm({...baseForm, room: e.target.value})} style={{...selectStyle, border: '1px solid #007bff', marginBottom: 0}} /> : 
                            <select required value={baseForm.room} onChange={(e) => { 
                                if (e.target.value === 'MANUAL') { setIsManualRoom(true); setBaseForm({...baseForm, room: ''}); } 
                                else setBaseForm({...baseForm, room: e.target.value}); 
                            }} style={{...selectStyle, marginBottom: 0}}>
                                <option value="" disabled>-- Select Room --</option>
                                {allDepartmentRooms.map(r => <option key={`br-${r}`} value={r}>{r}</option>)}
                                <option value="MANUAL">+ Add Manually</option>
                            </select>}

                            <select required value={baseForm.day} onChange={(e) => setBaseForm({...baseForm, day: e.target.value})} style={{...selectStyle, marginBottom: 0}}>{days.map(d => <option key={d} value={d}>{d}</option>)}</select>
                            
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                <select value={baseForm.start_time} onChange={(e) => setBaseForm({...baseForm, start_time: e.target.value})} style={{...selectStyle, flex: 1, marginBottom: 0}}>{timeSlots.map(t => <option key={t} value={t}>{t}</option>)}</select>
                                <select value={baseForm.end_time} onChange={(e) => setBaseForm({...baseForm, end_time: e.target.value})} style={{...selectStyle, flex: 1, marginBottom: 0}}>{timeSlots.map(t => <option key={t} value={t}>{t}</option>)}</select>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="button" onClick={() => setIsBaseModalOpen(false)} style={{...actionBtn, background: '#f0f2f5', color: '#333'}}>Cancel</button>
                                <button type="submit" style={{...actionBtn, background: '#002147', color: '#F2A900'}}>{SVGS.save} Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- STYLES ---
const welcomeBg = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: '#002147', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 3000 };
const welcomeCard = { background: '#fff', padding: '30px', borderRadius: '15px', width: '90%', maxWidth: '350px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', boxSizing: 'border-box' };
const headerStyle = { background: '#002147', color: '#F2A900', padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 1000, boxShadow: '0 2px 10px rgba(0,0,0,0.2)', flexWrap: 'wrap' };
const tabBar = { background: '#fff', padding: '6px 4px', gap: '4px', position: 'sticky', top: '48px', zIndex: 999, boxShadow: '0 2px 5px rgba(0,0,0,0.05)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' };
const tabBtn = (active) => ({ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: '60px', padding: '8px 2px', border: 'none', background: active ? '#002147' : '#f0f2f5', color: active ? '#F2A900' : '#666', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.3s ease', position: 'relative' });
const subTabBtn = (active) => ({ flex: 1, padding: '8px 12px', border: 'none', background: active ? '#F2A900' : 'transparent', color: active ? '#002147' : '#555', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s ease', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' });
const dayFilter = { display: 'flex', gap: '6px', marginBottom: '15px', overflowX: 'auto', paddingBottom: '4px', WebkitOverflowScrolling: 'touch' };
const dayBtnStyle = (active) => ({ flex: 1, minWidth: '40px', padding: '8px', borderRadius: '8px', border: 'none', background: active ? '#002147' : '#fff', color: active ? '#F2A900' : '#555', fontWeight: 'bold', fontSize: '0.75rem', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', transition: 'all 0.3s ease' });
const whiteCard = { background: '#fff', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '15px', transition: 'all 0.3s ease' };
const cardBase = { padding: '15px', borderRadius: '12px', transition: 'all 0.3s ease' };
const bigBtn = { width: '100%', padding: '12px', background: '#002147', border: 'none', borderRadius: '8px', fontWeight: 900, color: '#fff', cursor: 'pointer', transition: 'all 0.3s ease', fontSize: '0.85rem' };
const actionBtn = { flex: 1, minWidth: '80px', padding: '10px', background: '#eee', color: '#333', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem', transition: 'all 0.3s ease' };
const selectStyle = { width: '100%', padding: '10px 12px', marginBottom: '12px', borderRadius: '8px', border: '1px solid #dee2e6', fontSize: '0.85rem', background: '#f8f9fa', outline: 'none', boxSizing: 'border-box', transition: 'all 0.3s ease', color: '#333' };
const emptyState = { textAlign: 'center', padding: '25px 10px', color: '#999', fontSize: '0.85rem', background: '#f8f9fa', borderRadius: '8px', border: '1px dashed #dee2e6' };
const enableBtnStyle = { background: '#F2A900', color: '#002147', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.3s ease', fontSize: '0.75rem' };
const centerStyle = { textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif', fontSize: '0.9rem', color: '#002147', fontWeight: 'bold' };

// Sidebar
const sidebarOverlay = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, animation: 'fadeInSlide 0.2s ease' };
const sidebarMenu = { width: '250px', height: '100%', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '2px 0 10px rgba(0,0,0,0.1)' };
const sidebarBtn = (active) => ({ display: 'flex', alignItems: 'center', width: '100%', textAlign: 'left', padding: '12px 20px', border: 'none', background: active ? '#f0f2f5' : '#fff', color: active ? '#002147' : '#555', borderLeft: active ? '4px solid #F2A900' : '4px solid transparent', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', borderBottom: '1px solid #eee', transition: 'all 0.3s ease' });

// Tables
const tableStyle = { width: '100%', borderCollapse: 'collapse', textAlign: 'left' };
const tableHeaderRow = { background: '#f8f9fa', borderBottom: '2px solid #dee2e6' };
const tableHeaderCell = { padding: '10px 12px', fontSize: '0.75rem', color: '#495057', textTransform: 'uppercase', letterSpacing: '0.5px' };
const tableDataRow = { borderBottom: '1px solid #eee', transition: 'background 0.2s' };
const tableDataCell = { padding: '12px', color: '#333' };
