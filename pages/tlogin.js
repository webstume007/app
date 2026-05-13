import { useEffect, useState, useRef, useMemo } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabase';
import AttendanceSheet from '../components/AttendanceSheet';

// Helper function to dynamically calculate Semester
const getSemesterFromSession = (session) => {
if (!session) return "";
const match = session.match(/20\d{2}/);
if (!match) return session;

```
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

```

};

// --- Custom Nano SVGs for UI ---
const SVGS = {
tick: ,
cross: ,
chevronDown: ,
chevronUp: ,
bell: ,
calendar: ,
attendance: ,
updates: ,
clock: ,
home: ,
userTie: ,
location: ,
live: ,
tickCircle: ,
users: ,
leftArrow: ,
rightArrow: ,
edit: ,
trash: ,
download: ,
stats: ,
plus: ,
undo: ,
building: ,
alertCircle: ,
rocket: ,
eye: 
};

export default function TeacherLoginAndDashboard() {
// --- AUTH STATES ---
const [session, setSession] = useState(null);
const [isLoginMode, setIsLoginMode] = useState(true);
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');

```
// --- GATEKEEPER STATE ---
const [isPendingApproval, setIsPendingApproval] = useState(false);

// --- SIGNUP SPECIFIC STATES ---
const [signupName, setSignupName] = useState('');
const [cnic, setCnic] = useState('');
const [phone, setPhone] = useState('');
const [availableTeacherNames, setAvailableTeacherNames] = useState([]);
const [authError, setAuthError] = useState('');

// --- TOAST & TIMER STATES ---
const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
const [resendTimer, setResendTimer] = useState(0);
const [unverifiedEmail, setUnverifiedEmail] = useState('');

// --- DASHBOARD STATES ---
const [profile, setProfile] = useState(null);
const [schedule, setSchedule] = useState([]);
const [baseSchedule, setBaseSchedule] = useState([]);
const [roster, setRoster] = useState([]); 
const [loading, setLoading] = useState(true);
const alertedClasses = useRef(new Set()); 
const [currentTime, setCurrentTime] = useState(new Date());

// --- PWA & NOTIFICATION STATES ---
const [isStandalone, setIsStandalone] = useState(true);
const [showInstallBanner, setShowInstallBanner] = useState(false);
const [deferredPrompt, setDeferredPrompt] = useState(null);
const [showNotifBanner, setShowNotifBanner] = useState(false);

// --- DROPDOWN STATES ---
const [availableRooms, setAvailableRooms] = useState([]);
const [availableCourses, setAvailableCourses] = useState([]);
const [availableSessions, setAvailableSessions] = useState([]); 
const [availableSections, setAvailableSections] = useState([]);

// --- TOGGLE STATES FOR MANUAL ENTRY ---
const [isManualCourse, setIsManualCourse] = useState(false);
const [isManualRoom, setIsManualRoom] = useState(false);
const [isManualSession, setIsManualSession] = useState(false); 
const [isManualSection, setIsManualSection] = useState(false);

// --- TAB STATES ---
const [currentTab, setCurrentTab] = useState('home');
const [isSidebarOpen, setIsSidebarOpen] = useState(false);

const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
const isMobile = windowWidth < 768;

// --- WEEKLY TIMETABLE STATES ---
const [selectedDay, setSelectedDay] = useState(() => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    return ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].includes(today) ? today : "MON";
});

const [basePlanDayFilter, setBasePlanDayFilter] = useState('ALL');

// --- NOTICE BOARD STATE ---
const [noticeIndex, setNoticeIndex] = useState(0);

// --- ATTENDANCE & APPROVAL STATES ---
const [attendanceView, setAttendanceView] = useState('approve'); 
const [pendingAttendances, setPendingAttendances] = useState([]);
const [activeAttendanceLecture, setActiveAttendanceLecture] = useState(null);
const [attendanceStats, setAttendanceStats] = useState([]);
const [allSessionsData, setAllSessionsData] = useState([]);
const [allExceptionsData, setAllExceptionsData] = useState([]);

// --- Filter States based on actual teaching data ---
const [attendanceSectionFilter, setAttendanceSectionFilter] = useState('ALL');
const [attendanceSessionFilter, setAttendanceSessionFilter] = useState('ALL');
const [editSectionFilter, setEditSectionFilter] = useState('ALL');
const [editSubjectFilter, setEditSubjectFilter] = useState('ALL');

// --- ANNOUNCEMENT STATES ---
const [announcements, setAnnouncements] = useState([]);
const [announcementForm, setAnnouncementForm] = useState({ type: 'assignment', subject: '', deadline_date: '', deadline_time: '8:00 AM', topics: '', details: '' });
const [selectedSectionsForAnn, setSelectedSectionsForAnn] = useState([]);

// --- MODAL STATES ---
const [isEditModalOpen, setIsEditModalOpen] = useState(false);
const [editingClass, setEditingClass] = useState(null);
const [newDate, setNewDate] = useState('');
const [newStartTime, setNewStartTime] = useState('8:00 AM');
const [newEndTime, setNewEndTime] = useState('9:30 AM');
const [newRoom, setNewRoom] = useState('');
const [isBaseModalOpen, setIsBaseModalOpen] = useState(false);
const [baseForm, setBaseForm] = useState({ id: null, session: '', section: '', course: '', room: '', day: 'MON', start_time: '8:00 AM', end_time: '9:30 AM' });

const allTabs = [
    { id: 'home', label: 'HOME', icon: SVGS.home },
    { id: 'weekly', label: 'SCHEDULE', icon: SVGS.calendar },
    { id: 'attendance', label: 'ATTENDANCE', icon: SVGS.attendance },
    { id: 'updates', label: 'UPDATES', icon: SVGS.updates },
    { id: 'permanent', label: 'BASE PLAN', icon: SVGS.building }
];

const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const filterDays = ["ALL", ...days];

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

const formatCountdown = (totalSeconds) => {
    if (totalSeconds <= 0) return "00:00:00";
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
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

useEffect(() => {
    if (typeof window !== 'undefined') {
        setIsStandalone(window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone);
    }

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch((err) => console.error('SW Registration Failed', err));
    }

    const handleInstall = (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handleInstall);

    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            verifyTeacherAndLoad(session.user.id, session);
        } else {
            fetchUnclaimedTeachers();
            setLoading(false);
        }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) {
            verifyTeacherAndLoad(session.user.id, session);
        } else { 
            setSession(null); setProfile(null); setLoading(false); 
        }
    });

    if ("Notification" in window && Notification.permission === "default") {
        setShowNotifBanner(true);
    }

    return () => {
        authListener.subscription.unsubscribe();
        window.removeEventListener('beforeinstallprompt', handleInstall);
    };
}, []);

// --- Safe Pagination Engine for >1000 Rows ---
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

// --- STRICT TEACHER VERIFICATION (GATEKEEPER) ---
const verifyTeacherAndLoad = async (userId, activeSession) => {
    const { data: profileData, error } = await supabase.from('teacher_profiles').select('*').eq('id', userId).single();
    if (error || !profileData) {
        await supabase.auth.signOut();
        setSession(null);
        setLoading(false);
        setAuthError("Unauthorized: This email is not registered as a Teacher.");
    } else if (profileData.is_approved === false) {
        setIsPendingApproval(true);
        setSession(activeSession);
        setProfile(profileData);
        setLoading(false);
    } else {
        setSession(activeSession);
        setProfile(profileData);
        fetchProfileAndSchedule(profileData.name);
    }
};

const fetchUnclaimedTeachers = async () => {
    const { data: allLectures } = await supabase.from('base_schedule').select('teacher');
    const { data: claimedProfiles } = await supabase.from('teacher_profiles').select('name');
    
    if (allLectures) {
        const allTeacherNames = [...new Set(allLectures.map(x => x.teacher))].filter(Boolean);
        const claimedNames = claimedProfiles ? claimedProfiles.map(p => p.name) : [];
        const unclaimed = allTeacherNames.filter(name => !claimedNames.includes(name));
        setAvailableTeacherNames(unclaimed.sort());
    }
};

const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError(error.message);
};

const handleSignup = async (e) => {
    e.preventDefault();
    if (!signupName) return showToast('Please select your name from the dropdown.', 'error');

    const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
            emailRedirectTo: '[https://mohsinakhtar.me/verify-success](https://mohsinakhtar.me/verify-success)',
            data: { full_name: signupName, phone: phone, cnic: cnic }
        }
    });

    if (error) {
        showToast(error.message, "error");
        return;
    }

    if (data?.user) {
        const { error: profileError } = await supabase.from('teacher_profiles').insert([{
            id: data.user.id, 
            name: signupName,
            email: email,
            phone: phone,
            cnic: cnic
        }]);

        if (profileError) {
            console.error("Profile Insert Error:", profileError);
            showToast("Auth created, but profile failed: " + profileError.message, "error");
        } else {
            setUnverifiedEmail(email);
            setResendTimer(60); 
            showToast("Account created! Verify your email to submit your profile for admin approval.", "success");
            setIsLoginMode(true);
            fetchUnclaimedTeachers(); 
        }
    }
};

const handleResendEmail = async () => {
    if (resendTimer > 0) return;
    const { error } = await supabase.auth.resend({ type: 'signup', email: unverifiedEmail });
    if (error) showToast(error.message, "error");
    else { showToast("Verification email resent! Please check your inbox.", "success"); setResendTimer(60); }
};

const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setIsPendingApproval(false);
};

const fetchProfileAndSchedule = async (teacherName) => {
    const { data: scheduleData } = await fetchAllRows('base_schedule', { teacher: teacherName });
    setBaseSchedule(scheduleData || []);
    
    const { data: allData } = await fetchAllRows('base_schedule');
    if (allData) {
        setAvailableRooms([...new Set(allData.map(x => x.room))].filter(Boolean).sort());
        setAvailableCourses([...new Set(allData.map(x => x.course))].filter(Boolean).sort());
        setAvailableSessions([...new Set(allData.map(x => x.session))].filter(Boolean).sort());
        setAvailableSections([...new Set(allData.map(x => x.section))].filter(Boolean).sort());
    }

    if (scheduleData && scheduleData.length > 0) {
        const uniqueGroups = [...new Set(scheduleData.map(s => JSON.stringify({ session: s.session, section: s.section })))].map(str => JSON.parse(str));
        let allStudents = [];
        for (const group of uniqueGroups) {
            const { data: students } = await fetchAllRows('students', { session: group.session, section: group.section });
            if (students) allStudents = [...allStudents, ...students];
        }
        setRoster(allStudents);
    }

    const { data: exceptionsData } = await fetchAllRows('schedule_exceptions');
    setAllExceptionsData(exceptionsData || []);

    const baseIds = scheduleData ? scheduleData.map(s => s.id) : [];
    let sessionsWithRecords = [];
    let stats = [];
    let pending = [];

    if (baseIds.length > 0) {
        const [sessionsRes, recordsRes] = await Promise.all([
            fetchAllRows('attendance_sessions', null, { column: 'base_schedule_id', values: baseIds }),
            fetchAllRows('attendance_records')
        ]);

        const allSessions = sessionsRes.data || [];
        const allRecords = recordsRes.data || [];

        sessionsWithRecords = allSessions.map(s => {
            const base = scheduleData.find(b => b.id === s.base_schedule_id);
            return {
                ...s,
                course: base?.course,
                section: base?.section,
                session: base?.session,
                day: base?.day,
                baseLecture: base,
                records: allRecords.filter(r => r.session_id === s.id)
            }
        });
        
        setAllSessionsData(sessionsWithRecords);

        pending = sessionsWithRecords.filter(s => s.status === 'pending').map(session => {
            const presentCount = session.records.filter(r => r.status === 'Present' || r.status === 'Leave').length;
            return { ...session, presentCount, totalCount: session.records.length };
        });
        setPendingAttendances(pending);

        const uniqueClasses = [...new Set(scheduleData.map(s => JSON.stringify({ course: s.course, section: s.section, session: s.session })))].map(str => JSON.parse(str));
        
        stats = uniqueClasses.map(cls => {
            const classBaseIds = scheduleData.filter(s => s.course === cls.course && s.section === cls.section && s.session === cls.session).map(s => s.id);
            const classSessions = sessionsWithRecords.filter(s => classBaseIds.includes(s.base_schedule_id));
            
            let totalRecords = 0;
            let presentRecords = 0;
            
            classSessions.forEach(sess => {
                sess.records.forEach(rec => {
                    totalRecords++;
                    if (rec.status === 'Present' || rec.status === 'Leave') presentRecords++;
                });
            });

            const percentage = totalRecords === 0 ? 0 : Math.round((presentRecords / totalRecords) * 100);
            return { subject: cls.course, section: cls.section, session: cls.session, totalConducted: classSessions.length, percentage, sessions: classSessions };
        });
        setAttendanceStats(stats);
    }

    // Fetch announcements matching teacher's sessions/sections
    const tGroups = [...new Set(scheduleData.map(s => JSON.stringify({ session: s.session, section: s.section })))].map(str => JSON.parse(str));
    let allAnns = [];
    for (const tg of tGroups) {
        const { data: aData } = await supabase.from('class_announcements').select('*').eq('session', tg.session).eq('section', tg.section);
        if (aData) allAnns = [...allAnns, ...aData];
    }
    // Deduplicate announcements by ID
    const uniqueAnnsMap = new Map();
    allAnns.forEach(a => uniqueAnnsMap.set(a.id, a));
    setAnnouncements(Array.from(uniqueAnnsMap.values()).sort((a,b) => new Date(b.created_at) - new Date(a.created_at)));

    const mergedSchedule = (scheduleData || []).map(cls => {
        const targetDate = getDateForCurrentWeekDay(cls.day);
        const exception = (exceptionsData || []).find(ex => ex.base_schedule_id === cls.id && ex.exception_date === targetDate);
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
    setLoading(false);
};

const handleApproveAttendance = async (sessionId) => {
    const { error } = await supabase.from('attendance_sessions').update({ status: 'approved' }).eq('id', sessionId);
    if (error) {
        showToast("Failed to approve: " + error.message, "error");
    } else {
        showToast("Attendance approved successfully!", "success");
        fetchProfileAndSchedule(profile.name);
    }
};

const getStudentAttendance = (studentReg, subjectFilter, sectionFilter, sessionFilter) => {
    let present = 0, total = 0;
    allSessionsData.forEach(session => {
        if (subjectFilter !== 'ALL' && session.course !== subjectFilter) return;
        if (sectionFilter !== 'ALL' && session.section !== sectionFilter) return;
        if (sessionFilter !== 'ALL' && session.session !== sessionFilter) return;

        const record = session.records.find(r => r.student_id === studentReg);
        if (record) {
            total++;
            if (record.status === 'Present' || record.status === 'Leave') present++;
        }
    });
    return total === 0 ? 0 : Math.round((present / total) * 100);
};

const downloadCSV = (stat, viewOnly = false) => {
    if (stat.sessions.length === 0) return showToast("No attendance recorded for this subject yet.", "error");

    let csv = "Registration Number,Name";
    const sortedSessions = stat.sessions.sort((a,b) => new Date(a.session_date) - new Date(b.session_date));
    
    sortedSessions.forEach(s => { csv += `,${s.session_date}`; });
    csv += ",Overall %\n";

    const sectionRoster = roster.filter(student => student.section === stat.section && student.session === stat.session);

    sectionRoster.forEach(student => {
        let row = `${student.registration_number},${student.student_name}`;
        let presentCount = 0, totalCount = 0;
        
        sortedSessions.forEach(s => {
            const rec = s.records.find(r => r.student_id === student.registration_number);
            if (rec) {
                totalCount++;
                const isPresent = (rec.status === 'Present' || rec.status === 'Leave') ? 1 : 0;
                row += `,${isPresent}`;
                if (isPresent === 1) presentCount++;
            } else { row += `,N/A`; }
        });
        
        const pct = totalCount === 0 ? 0 : Math.round((presentCount / totalCount) * 100);
        row += `,${pct}%\n`;
        csv += row;
    });

    if (viewOnly) {
        const rows = csv.split('\n').filter(r => r.trim() !== '');
        let html = '<html lang="en"><head><title>Attendance Report</title><style>table { border-collapse: collapse; width: 100%; font-family: sans-serif; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; } th { background-color: #f2f2f2; color: #002147; }</style></head><body style="padding: 20px;"><h2>Attendance View: ' + stat.subject + ' (Sec ' + stat.section + ')</h2><table>';
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
    a.download = `${stat.subject}_${stat.session}_Sec_${stat.section}_Attendance.csv`;
    a.click();
};

useEffect(() => {
    if (!session || schedule.length === 0) return;
    const interval = setInterval(() => {
        const currentDay = currentTime.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
        const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes();

        schedule.forEach(cls => {
            if (cls.day === currentDay) {
                const startMins = parseTime(cls.start_time);
                const diff = startMins - currentMins;

                if (diff <= 180 && diff > 178 && !cls.isConfirmed && !cls.isCancelled && !cls.isRescheduled) {
                    if (!alertedClasses.current.has(cls.id)) {
                        alertedClasses.current.add(cls.id);
                        if (Notification.permission === "granted") {
                            new Notification("Lecture Action Required", { 
                                body: `${cls.course} for Sec ${cls.section} starts in 3 hours. Please Confirm or Cancel.`, 
                                icon: "/icon.png" 
                            });
                        }
                        supabase.from('notifications').insert([{ message: `Teacher Reminder: ${cls.course} (Sec ${cls.section}) is pending confirmation.` }]).then();
                    }
                }
            }
        });
    }, 60000); 

    return () => clearInterval(interval);
}, [schedule, session, currentTime]);

useEffect(() => {
    if (!profile || !profile.is_approved || schedule.length === 0) return;
    const channel = supabase
        .channel('teacher-updates')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
            const newMsg = payload.new.message;
            const isRelevant = schedule.some(cls => newMsg.includes(cls.course) && newMsg.includes(cls.section));
            if (isRelevant && Notification.permission === "granted") {
                new Notification("IUB Schedule Alert", { body: newMsg, icon: "/icon.png" });
            }
        }).subscribe();
    return () => { supabase.removeChannel(channel); };
}, [profile, schedule]);

const handleInstallClick = async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') setDeferredPrompt(null);
    }
};

const forceNotificationPermission = async () => {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
        setShowNotifBanner(false);
        new Notification("Notifications Enabled!", { body: "You will now receive IUB alerts." });
    }
};

const handleConfirmClass = async (classId, courseName, section, clsDay) => {
    setSchedule(prev => prev.map(c => c.id === classId ? { ...c, isConfirmed: true, isCancelled: false, isRescheduled: false } : c));
    const targetDate = getDateForCurrentWeekDay(clsDay);
    const { error } = await supabase.from('schedule_exceptions').insert([{
        base_schedule_id: classId, exception_date: targetDate, status: 'confirmed', cancelled_by: session.user.id
    }]);

    if (error) showToast("Failed to update: " + error.message, "error");
    else {
        const { error: notifError } = await supabase.from('notifications').insert([{ message: `Confirmed: ${courseName} for Section ${section} will be held on ${targetDate}.` }]);
        if(notifError) showToast("Updated, but notification failed.", "error");
        else showToast("Class confirmed & students notified!", "success");
    }
    fetchProfileAndSchedule(profile.name); 
};

const handleCancelClass = async (classId, courseName, section, clsDay) => {
    const confirmCancel = window.confirm(`Are you sure you want to CANCEL ${courseName}?`);
    if (!confirmCancel) return;

    setSchedule(prev => prev.map(c => c.id === classId ? { ...c, isCancelled: true, isConfirmed: false, isRescheduled: false } : c));
    const targetDate = getDateForCurrentWeekDay(clsDay);
    const { error } = await supabase.from('schedule_exceptions').insert([{
        base_schedule_id: classId, exception_date: targetDate, status: 'cancelled', cancelled_by: session.user.id
    }]);

    if (error) showToast("Failed to cancel: " + error.message, "error");
    else {
        const { error: notifError } = await supabase.from('notifications').insert([{ message: `Cancelled: ${courseName} for Section ${section} on ${targetDate} has been cancelled by ${profile.name}.` }]);
        if(notifError) showToast("Cancelled, but notification failed.", "error");
        else showToast("Class cancelled & students notified!", "success");
    }
    fetchProfileAndSchedule(profile.name);
};

const handleUndoException = async (classId, actionType, courseName, section, clsDay) => {
    setSchedule(prev => prev.map(c => c.id === classId ? { ...c, isCancelled: false, isConfirmed: false, isRescheduled: false, exceptionDetails: null } : c));
    const targetDate = getDateForCurrentWeekDay(clsDay);
    
    const { error } = await supabase.from('schedule_exceptions').delete().match({ base_schedule_id: classId, exception_date: targetDate });

    if (error) showToast("Failed to undo: " + error.message, "error");
    else {
        if (actionType === 'cancelled') await supabase.from('notifications').delete().eq('message', `Cancelled: ${courseName} for Section ${section} on ${targetDate} has been cancelled by ${profile.name}.`);
        else if (actionType === 'confirmed') await supabase.from('notifications').delete().eq('message', `Confirmed: ${courseName} for Section ${section} will be held on ${targetDate}.`);
        else if (actionType === 'rescheduled') await supabase.from('notifications').delete().ilike('message', `Rescheduled: ${courseName} for Section ${section}%`);
        showToast("Action reversed successfully.", "success");
    }
    fetchProfileAndSchedule(profile.name);
};

const submitReschedule = async (e) => {
    e.preventDefault();
    const targetDate = getDateForCurrentWeekDay(editingClass.day);
    const { error } = await supabase.from('schedule_exceptions').insert([{
        base_schedule_id: editingClass.id, exception_date: targetDate, status: 'rescheduled',
        new_start_time: newStartTime, new_end_time: newEndTime, new_room: newRoom, cancelled_by: session.user.id
    }]);

    if (error) showToast("Failed to reschedule: " + error.message, "error");
    else {
        const { error: notifError } = await supabase.from('notifications').insert([{ message: `Rescheduled: ${editingClass.course} for Section ${editingClass.section} moved to Room ${newRoom} (${newStartTime} - ${newEndTime}) on ${targetDate}.` }]);
        if(notifError) showToast("Rescheduled, but notification failed.", "error");
        else showToast(`Class rescheduled & students notified!`, "success");
    }
    setIsEditModalOpen(false); 
    fetchProfileAndSchedule(profile.name);
};

const openEditModal = (cls) => {
    setEditingClass(cls); setNewDate(new Date().toLocaleDateString('en-CA'));
    setNewStartTime(convertTo12Hour(cls.start_time)); setNewEndTime(convertTo12Hour(cls.end_time));
    setNewRoom(cls.room); setIsEditModalOpen(true);
};

const openBaseModal = (cls = null) => {
    if (cls) {
        setBaseForm({ ...cls, start_time: convertTo12Hour(cls.start_time), end_time: convertTo12Hour(cls.end_time) });
        setIsManualCourse(!availableCourses.includes(cls.course)); setIsManualRoom(!availableRooms.includes(cls.room));
        setIsManualSession(!availableSessions.includes(cls.session)); setIsManualSection(!availableSections.includes(cls.section));
    } else {
        setBaseForm({ id: null, session: '', section: '', course: '', room: '', day: 'MON', start_time: '8:00 AM', end_time: '9:30 AM' });
        setIsManualCourse(false); setIsManualRoom(false); setIsManualSession(false); setIsManualSection(false);
    }
    setIsBaseModalOpen(true);
};

const submitBaseSchedule = async (e) => {
    e.preventDefault();
    setIsBaseModalOpen(false); 
    const payload = { 
        course: baseForm.course, teacher: profile.name, room: baseForm.room, 
        day: baseForm.day, start_time: baseForm.start_time, end_time: baseForm.end_time, 
        session: baseForm.session, section: baseForm.section 
    };
    if (baseForm.id) await supabase.from('base_schedule').update(payload).eq('id', baseForm.id);
    else await supabase.from('base_schedule').insert([payload]);
    await fetchProfileAndSchedule(profile.name);
};

const deleteBaseLecture = async (id, courseName, section) => {
    if (!window.confirm(`Permanently delete ${courseName} (Sec ${section}) from your schedule? This cannot be undone.`)) return;
    setBaseSchedule(prev => prev.filter(c => c.id !== id));
    await supabase.from('base_schedule').delete().eq('id', id);
    await fetchProfileAndSchedule(profile.name);
};

// --- Announcement Logic ---
const submitAnnouncement = async (e) => {
    e.preventDefault();
    if (selectedSectionsForAnn.length === 0) return showToast("Please select at least one section.", "error");

    const payloads = selectedSectionsForAnn.map(ss => ({
        session: ss.session, 
        section: ss.section,
        type: announcementForm.type,
        subject: announcementForm.subject,
        deadline_date: announcementForm.type === 'assignment' ? announcementForm.deadline_date : null,
        deadline_time: announcementForm.type === 'assignment' ? announcementForm.deadline_time : null,
        topics: announcementForm.topics,
        details: announcementForm.details
    }));

    const { error } = await supabase.from('class_announcements').insert(payloads);
    if (error) return showToast("Failed to add announcement: " + error.message, "error");

    for (const ss of selectedSectionsForAnn) {
        const notifMsg = announcementForm.type === 'assignment' 
            ? `NEW ASSIGNMENT: ${announcementForm.subject} - ${announcementForm.topics}. Due: ${announcementForm.deadline_date}`
            : `MESSAGE from Teacher: ${announcementForm.topics} - Section ${ss.section}`;
            
        await supabase.from('notifications').insert([{ message: notifMsg }]);
    }

    showToast("Announcement posted and selected classes notified!", "success");
    setAnnouncementForm({ type: 'assignment', subject: '', deadline_date: '', deadline_time: '8:00 AM', topics: '', details: '' });
    setSelectedSectionsForAnn([]);
    fetchProfileAndSchedule(session.user.id);
};

const handleSectionSelectionToggle = (ssStr) => {
    const obj = JSON.parse(ssStr);
    const exists = selectedSectionsForAnn.some(x => x.session === obj.session && x.section === obj.section);
    if (exists) {
        setSelectedSectionsForAnn(selectedSectionsForAnn.filter(x => !(x.session === obj.session && x.section === obj.section)));
    } else {
        setSelectedSectionsForAnn([...selectedSectionsForAnn, obj]);
    }
};


// --- Notice Board Math ---
const currentDayStr = currentTime.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes();
const currentSecs = currentTime.getSeconds();

const todayEvents = useMemo(() => {
    const events = [];
    const myTodayClasses = schedule.filter(c => c.day === currentDayStr && !c.isCancelled).sort((a,b) => parseTime(a.start_time) - parseTime(b.start_time));
    myTodayClasses.forEach(c => {
        events.push({ type: 'lecture', title: c.course, room: c.room, section: c.section, startMins: parseTime(c.start_time), endMins: parseTime(c.end_time), raw: c });
    });
    return events;
}, [schedule, currentDayStr]);

useEffect(() => {
    if (todayEvents.length > 0 && currentTab === 'home') {
        const currentTotalSecs = currentMins * 60 + currentSecs;
        let activeIdx = todayEvents.findIndex(e => (e.endMins * 60) > currentTotalSecs);
        if (activeIdx === -1) activeIdx = todayEvents.length - 1; 
        setNoticeIndex(activeIdx);
    }
}, [todayEvents.length, currentTab, currentMins, currentSecs]);

const nextNotice = () => setNoticeIndex((prev) => (prev + 1) % todayEvents.length);
const prevNotice = () => setNoticeIndex((prev) => (prev - 1 + todayEvents.length) % todayEvents.length);

// Find Tomorrow's Classes if today has none
const tmrwDayStr = new Date(currentTime.getTime() + 86400000).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
const tomorrowEvents = schedule.filter(c => c.day === tmrwDayStr && !c.isCancelled);

// --- Monthly Progress Math ---
const getMonthlyProgress = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    const startDate = new Date(currentYear, currentMonth, 1);
    const endDate = new Date(currentYear, currentMonth + 1, 0);

    let scheduledThisMonth = 0;
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
        const classesOnDay = baseSchedule.filter(c => c.day === dayName).length;
        scheduledThisMonth += classesOnDay;
    }

    let cancelledThisMonth = 0;
    allExceptionsData.forEach(e => {
        const ed = new Date(e.exception_date);
        if (ed.getMonth() === currentMonth && ed.getFullYear() === currentYear && e.status === 'cancelled') {
            if (baseSchedule.find(b => b.id === e.base_schedule_id)) cancelledThisMonth++;
        }
    });

    const conductedThisMonth = allSessionsData.filter(s => {
        const sd = new Date(s.session_date);
        return sd.getMonth() === currentMonth && sd.getFullYear() === currentYear;
    }).length;

    const pct = scheduledThisMonth === 0 ? 0 : Math.min(100, Math.round((conductedThisMonth / scheduledThisMonth) * 100));
    return { conductedThisMonth, scheduledThisMonth, cancelledThisMonth, pct };
};

const monthlyProgress = getMonthlyProgress();

// --- Overall Class Attendance ---
const getOverallAttPct = () => {
    let overallPresent = 0;
    let overallTotal = 0;
    allSessionsData.forEach(session => {
        session.records.forEach(rec => {
            overallTotal++;
            if (rec.status === 'Present' || rec.status === 'Leave') overallPresent++;
        });
    });
    return overallTotal === 0 ? 0 : Math.round((overallPresent / overallTotal) * 100);
};
const overallAttPct = getOverallAttPct();

// --- Teacher Specific Dropdowns ---
const mySessions = useMemo(() => [...new Set(baseSchedule.map(c => c.session))].sort(), [baseSchedule]);
const mySections = useMemo(() => [...new Set(baseSchedule.map(c => c.section))].sort(), [baseSchedule]);
const mySectionSessions = useMemo(() => [...new Set(baseSchedule.map(c => JSON.stringify({session: c.session, section: c.section})))].map(str => JSON.parse(str)), [baseSchedule]);
const mySubjects = useMemo(() => [...new Set(baseSchedule.map(c => c.course))].sort(), [baseSchedule]);


if (loading) {
    return (
        <div style={{ ...welcomeBg, flexDirection: 'column', gap: '20px' }}>
            <Head><title>Loading | Teacher Portal</title></Head>
            <div className="custom-spinner"></div>
            <h2 style={{ color: '#F2A900', margin: 0, fontSize: '1.2rem', animation: 'pulseText 1.5s infinite ease-in-out' }}>
                Loading Teacher Data...
            </h2>
            <style>{`
                .custom-spinner { width: 45px; height: 45px; border: 4px solid rgba(255, 255, 255, 0.1); border-left-color: #F2A900; border-radius: 50%; animation: spin 1s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes pulseText { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
            `}</style>
        </div>
    );
}

if (!session) {
    return (
        <div style={welcomeBg}>
            <div style={{...toastStyle, opacity: toast.show ? 1 : 0, transform: toast.show ? 'translateY(0)' : 'translateY(-20px)', backgroundColor: toast.type === 'error' ? '#dc3545' : '#28a745' }}>
                {toast.message}
            </div>
            <div style={welcomeCard}>
                <h2 style={{ color: '#002147', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    {SVGS.userTie} {isLoginMode ? 'Teacher Login' : 'Teacher Sign Up'}
                </h2>
                {authError && <div style={{ background: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '5px', marginBottom: '15px', fontSize: '0.85rem' }}>{authError}</div>}
                <form onSubmit={isLoginMode ? handleLogin : handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {!isLoginMode && (
                        <>
                            <select required value={signupName} onChange={(e) => setSignupName(e.target.value)} style={inputStyle}>
                                <option value="" disabled>-- Select Your Name --</option>
                                {availableTeacherNames.map(name => <option key={name} value={name}>{name}</option>)}
                            </select>
                            {availableTeacherNames.length === 0 && <span style={{ fontSize: '0.75rem', color: 'red' }}>All teachers currently in the record already have accounts.</span>}
                            <input type="text" placeholder="CNIC Number" required value={cnic} onChange={(e) => setCnic(e.target.value)} style={inputStyle} />
                            <input type="text" placeholder="Phone Number" required value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} />
                        </>
                    )}
                    <input type="email" placeholder="Email Address" required value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
                    <input type="password" placeholder="Password" required value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
                    <button type="submit" disabled={!isLoginMode && availableTeacherNames.length === 0} style={{ width: '100%', padding: '15px', background: '#F2A900', color: '#002147', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', opacity: (!isLoginMode && availableTeacherNames.length === 0) ? 0.5 : 1 }}>
                        {isLoginMode ? 'Login' : 'Sign Up'}
                    </button>
                </form>
                {isLoginMode && unverifiedEmail && (
                    <div style={{ marginTop: '15px', padding: '15px', background: '#f8f9fa', borderRadius: '8px', textAlign: 'center', fontSize: '0.85rem' }}>
                        <p style={{ margin: '0 0 10px 0', color: '#555', fontWeight: 'bold' }}>Didn't receive the email?</p>
                        <button onClick={handleResendEmail} disabled={resendTimer > 0} style={{ width: '100%', background: resendTimer > 0 ? '#ccc' : '#002147', color: 'white', border: 'none', padding: '10px', borderRadius: '5px', cursor: resendTimer > 0 ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                            {resendTimer > 0 ? `Resend available in ${resendTimer}s` : 'Resend Verification Email'}
                        </button>
                    </div>
                )}
                <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.9rem' }}>
                    {isLoginMode ? "Don't have an account? " : "Already have an account? "}
                    <span onClick={() => { setIsLoginMode(!isLoginMode); setAuthError(''); }} style={{ color: '#007bff', cursor: 'pointer', fontWeight: 'bold' }}>
                        {isLoginMode ? 'Sign Up' : 'Login'}
                    </span>
                </div>
            </div>
        </div>
    );
}

if (isPendingApproval) {
    return (
        <div style={welcomeBg}>
            <Head><title>Pending Approval | Teacher Portal</title></Head>
            <div style={welcomeCard}>
                <div style={{ color: '#F2A900', marginBottom: '15px', display: 'flex', justifyContent: 'center' }}>
                    {SVGS.clock}
                </div>
                <h2 style={{ color: '#002147', margin: '0 0 15px 0' }}>Approval Pending</h2>
                <p style={{ color: '#555', fontSize: '1rem', lineHeight: '1.5', marginBottom: '25px' }}>
                    Your account has been successfully verified, but an administrator must manually approve your access before you can view your dashboard.
                </p>
                <button onClick={handleLogout} style={{ background: '#F2A900', color: '#002147', border: 'none', padding: '12px 25px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>
                    Log Out
                </button>
            </div>
        </div>
    );
}

// ==========================================
// RENDER: TEACHER DASHBOARD
// ==========================================

const filteredWeeklySchedule = schedule
    .filter(cls => cls.day === selectedDay)
    .sort((a, b) => parseTime(a.start_time) - parseTime(b.start_time));

const filteredBaseSchedule = baseSchedule
    .filter(cls => basePlanDayFilter === 'ALL' || cls.day === basePlanDayFilter)
    .sort((a, b) => {
        if (a.day !== b.day) return a.day.localeCompare(b.day);
        return parseTime(a.start_time) - parseTime(b.start_time);
    });

return (
    <div style={{ backgroundColor: '#f0f2f5', minHeight: '100vh', fontFamily: "'Roboto', sans-serif", display: 'flex', flexDirection: 'column' }}>
        <Head>
            <title>Teacher Dashboard | IUB</title>
            <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"/>
            <link rel="manifest" href="/manifest.json" />
            <meta name="theme-color" content="#002147" />
        </Head>

        <style>{`
            .desktop-nav { display: none; }
            .mobile-nav { display: flex; }
            @media (min-width: 768px) {
                .desktop-nav { display: flex; align-items: center; gap: 15px; }
                .mobile-nav { display: none !important; }
                .hamburger-btn { display: none !important; }
                .mobile-hide { display: none !important; }
            }
            .scroll-hide::-webkit-scrollbar { display: none; }
            @keyframes fadeInSlide {
                from { opacity: 0; transform: translateY(-5px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .expand-anim { animation: fadeInSlide 0.3s ease forwards; }
        `}</style>

        <div style={{...toastStyle, opacity: toast.show ? 1 : 0, transform: toast.show ? 'translateY(0)' : 'translateY(-20px)', backgroundColor: toast.type === 'error' ? '#dc3545' : '#28a745' }}>
            {toast.message}
        </div>

        <header style={headerStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div className="hamburger-btn" onClick={() => setIsSidebarOpen(true)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#F2A900">
                        <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
                    </svg>
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '1.2rem', display: 'flex' }}>{SVGS.userTie}</span> 
                    TEACHER PORTAL
                </div>
            </div>

            <div className="desktop-nav">
                {allTabs.map(tab => (
                    <div 
                        key={tab.id} 
                        onClick={() => setCurrentTab(tab.id)}
                        style={{
                            cursor: 'pointer', padding: '6px 10px', borderRadius: '5px', fontWeight: 'bold', fontSize: '0.75rem',
                            background: currentTab === tab.id ? '#F2A900' : 'transparent',
                            color: currentTab === tab.id ? '#002147' : '#fff',
                            transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                    >
                        {tab.icon} {tab.label}
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button onClick={handleLogout} style={{ background: '#dc3545', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>Logout</button>
            </div>
        </header>

        {isSidebarOpen && (
            <div style={sidebarOverlay} onClick={() => setIsSidebarOpen(false)}>
                <div style={sidebarMenu} onClick={e => e.stopPropagation()}>
                    <div style={{ padding: '15px 20px', borderBottom: '1px solid #eee', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, color: '#002147', fontSize: '1rem' }}>Menu</h3>
                        <button onClick={() => setIsSidebarOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#999' }}>✖</button>
                    </div>
                    {allTabs.map(tab => (
                        <button 
                            key={tab.id} 
                            onClick={() => { setCurrentTab(tab.id); setIsSidebarOpen(false); }} 
                            style={sidebarBtn(currentTab === tab.id)}
                        >
                            <span style={{ opacity: 0.7 }}>{tab.icon}</span> <span style={{ marginLeft: '10px' }}>{tab.label}</span>
                            {tab.id === 'attendance' && pendingAttendances.length > 0 && <span style={redBadgeStyle}>{pendingAttendances.length}</span>}
                        </button>
                    ))}
                </div>
            </div>
        )}

        <div className="mobile-nav" style={tabBar}>
            {allTabs.map(tab => (
                <button key={tab.id} onClick={() => setCurrentTab(tab.id)} style={tabBtn(currentTab === tab.id)}>
                    <div style={{ marginBottom: '2px', opacity: currentTab === tab.id ? 1 : 0.6 }}>{tab.icon}</div>
                    {tab.label}
                    {tab.id === 'attendance' && pendingAttendances.length > 0 && <span style={newsRedDot}></span>}
                </button>
            ))}
        </div>

        <div style={{ padding: '12px 16px', maxWidth: '800px', margin: '0 auto', flex: 1, width: '100%', boxSizing: 'border-box' }}>
            
            {deferredPrompt && showInstallBanner && (
                <div className="expand-anim" style={{ ...notifBannerStyle, background: '#17a2b8', borderColor: '#117a8b' }}>
                    <div style={{ flex: 1, paddingRight: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div>
                            <b style={{ display: 'block', marginBottom: '2px', fontSize: '0.8rem' }}>Install App</b>
                            <span style={{ fontSize: '0.65rem', opacity: 0.9 }}>Add Portal to your home screen for better performance.</span>
                        </div>
                    </div>
                    <button onClick={handleInstallClick} style={{ ...enableBtnStyle, background: '#fff', color: '#17a2b8' }}>Install</button>
                </div>
            )}
            {showNotifBanner && (
                <div className="expand-anim" style={notifBannerStyle}>
                    <div style={{ flex: 1, paddingRight: '10px' }}>
                        <b style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>Stay Updated! {SVGS.bell}</b>
                        <span style={{ fontSize: '0.65rem', opacity: 0.9 }}>Allow notifications to get instant lecture reminders.</span>
                    </div>
                    <button onClick={forceNotificationPermission} style={enableBtnStyle}>Enable</button>
                </div>
            )}

            
            {currentTab === 'home' && (
                <div className="expand-anim">
                    <div style={{ background: 'linear-gradient(135deg, #002147 0%, #003366 100%)', borderRadius: '16px', padding: '20px', color: '#fff', marginBottom: '16px', boxShadow: '0 4px 15px rgba(0,33,71,0.2)' }}>
                        <h2 style={{ margin: '0 0 5px 0', fontSize: '1.2rem', fontWeight: '900', color: '#F2A900', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            Welcome, {profile?.name}
                        </h2>
                    </div>
                    
                    <div style={{ padding: '16px', background: '#fff', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #eee' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#002147', fontWeight: '900', fontSize: '0.9rem' }}>
                            <div style={{ background: '#e0f2fe', padding: '8px', borderRadius: '50%', color: '#0369a1' }}>{SVGS.attendance}</div>
                            Overall Students Attendance
                        </div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '900', color: overallAttPct >= 75 ? '#28a745' : '#dc3545' }}>{overallAttPct}%</div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                        <div style={{ flex: 1, background: '#fff', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #eee', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.7rem', color: '#666', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '6px' }}>Conducted Lectures</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#002147' }}>{monthlyProgress.conductedThisMonth}</div>
                        </div>
                        <div style={{ flex: 1, background: '#fff', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #eee', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.7rem', color: '#666', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '6px' }}>Cancelled Lectures</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#dc3545' }}>{monthlyProgress.cancelledThisMonth}</div>
                        </div>
                    </div>

                    <div style={{ ...whiteCard, padding: 0, overflow: 'hidden' }}>
                        <div style={{ background: '#f8f9fa', padding: '12px 16px', borderBottom: '1px solid #eee', fontWeight: 'bold', color: '#002147', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                            {SVGS.bell} Notice Board (Today's Schedule)
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px' }}>
                            {todayEvents.length > 0 && (
                                <button onClick={prevNotice} style={{ background: '#f0f2f5', border: 'none', color: '#002147', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{SVGS.leftArrow}</button>
                            )}
                            
                            <div style={{ flex: 1, textAlign: 'center', margin: '0 15px' }}>
                                {todayEvents.length === 0 ? (
                                    <div>
                                        {tomorrowEvents.length > 0 ? (
                                            <>
                                                <h3 style={{ margin: '0 0 6px 0', color: '#007bff', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                    {SVGS.calendar} No Lectures Today
                                                </h3>
                                                <p style={{ margin: 0, fontSize: '0.8rem', color: '#666', fontWeight: 'bold' }}>You have {tomorrowEvents.length} lecture(s) scheduled for tomorrow.</p>
                                            </>
                                        ) : (
                                            <h3 style={{ margin: '0', color: '#28a745', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                {SVGS.tickCircle} No Lectures Today or Tomorrow
                                            </h3>
                                        )}
                                    </div>
                                ) : (() => {
                                    const targetEvent = todayEvents[noticeIndex];
                                    let noticeState = "Finished";
                                    let remainingSecs = 0;
                                    
                                    if (targetEvent) {
                                        const currentTotalSecs = currentMins * 60 + currentSecs;
                                        const startSecs = targetEvent.startMins * 60;
                                        const endSecs = targetEvent.endMins * 60;
                                        if (currentTotalSecs < startSecs) {
                                            noticeState = "Upcoming";
                                            remainingSecs = startSecs - currentTotalSecs;
                                        } else if (currentTotalSecs >= startSecs && currentTotalSecs < endSecs) {
                                            noticeState = "Ongoing";
                                            remainingSecs = endSecs - currentTotalSecs;
                                        }
                                        if (targetEvent.raw.isCancelled) noticeState = "Cancelled";
                                    }

                                    const hasAssignment = announcements.some(a => a.type === 'assignment' && a.subject === targetEvent.course && new Date(a.deadline_date) >= new Date());

                                    return (
                                        <div className="expand-anim" key={`lec-${noticeIndex}`}>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: noticeState === 'Ongoing' ? '#dc3545' : noticeState === 'Cancelled' ? '#666' : '#007bff', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                {noticeState === 'Ongoing' && SVGS.live} {noticeState === 'Finished' ? 'Lecture Concluded' : noticeState === 'Upcoming' ? 'Upcoming Lecture' : noticeState === 'Cancelled' ? 'Cancelled Lecture' : 'Lecture Time Started'}
                                            </div>
                                            <h3 style={{ margin: '0 0 6px 0', color: noticeState === 'Cancelled' ? '#999' : '#002147', fontSize: '1.05rem', fontWeight: '900', textDecoration: noticeState === 'Cancelled' ? 'line-through' : 'none' }}>{targetEvent.title}</h3>
                                            <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                {SVGS.location} Room {targetEvent.room} | Sec {targetEvent.section}
                                            </div>
                                            {hasAssignment && (
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fff9e6', color: '#b27b00', padding: '4px 10px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 'bold', marginBottom: '10px', border: '1px solid #fde68a' }}>
                                                    {SVGS.edit} Has Assignment
                                                </div>
                                            )}
                                            {noticeState !== 'Finished' && noticeState !== 'Cancelled' && (
                                                <div style={{ background: noticeState === 'Ongoing' ? '#fef2f2' : '#e7f1ff', border: `1px solid ${noticeState === 'Ongoing' ? '#fecaca' : '#b8daff'}`, display: 'inline-block', padding: '6px 16px', borderRadius: '20px', color: noticeState === 'Ongoing' ? '#991b1b' : '#004085', fontWeight: '900', fontSize: '1.1rem', marginTop: '5px' }}>
                                                    {formatCountdown(remainingSecs)} <span style={{fontSize: '0.7rem', opacity: 0.8, marginLeft: '4px'}}>{noticeState === 'Ongoing' ? 'Remaining' : 'Starts In'}</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>

                            {todayEvents.length > 0 && (
                                <button onClick={nextNotice} style={{ background: '#f0f2f5', border: 'none', color: '#002147', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{SVGS.rightArrow}</button>
                            )}
                        </div>
                    </div>

                    {pendingAttendances.length > 0 && (
                        <div className="expand-anim" style={{ marginBottom: '16px' }}>
                            <h3 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#dc3545', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '900', textTransform: 'uppercase' }}>
                                {SVGS.alertCircle} Action Required: Pending Approvals
                            </h3>
                            {pendingAttendances.map(session => (
                                <div key={`hm-pend-${session.id}`} style={{ background: 'white', padding: '15px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', marginBottom: '10px', borderLeft: '5px solid #f59e0b', border: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                    <div>
                                        <div style={{ fontWeight: '900', fontSize: '0.95rem', color: '#000' }}>{session.course}</div>
                                        <div style={{ color: '#666', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>Sec {session.section} ({getSemesterFromSession(session.session)}) | {session.session_date}</div>
                                        <div style={{ color: '#059669', fontSize: '0.7rem', fontWeight: 'bold', marginTop: '6px' }}>{session.presentCount}/{session.totalCount} Present</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => {
                                            const formattedLecture = { ...session.baseLecture, attendanceSession: session };
                                            setActiveAttendanceLecture(formattedLecture);
                                        }} style={btnStyle('#f0f2f5', SVGS.edit)}>Verify</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                        {[
                            { id: 'weekly', label: 'Schedule', icon: SVGS.calendar, bg: '#e0f2fe', col: '#0369a1' },
                            { id: 'attendance', label: 'Attendance', icon: SVGS.attendance, bg: '#dcfce7', col: '#15803d' },
                            { id: 'updates', label: 'Updates', icon: SVGS.updates, bg: '#fef3c7', col: '#a16207' }
                        ].map(item => (
                            <div key={item.id} onClick={() => setCurrentTab(item.id)} style={{ background: item.bg, color: item.col, padding: '16px 8px', borderRadius: '16px', textAlign: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', transition: 'transform 0.2s' }}>
                                <div style={{ marginBottom: '8px', opacity: 0.9, display: 'flex', justifyContent: 'center' }}>{item.icon}</div>
                                <div style={{ fontSize: '0.7rem', fontWeight: '900' }}>{item.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            
            {currentTab === 'weekly' && (
                <div className="expand-anim">
                    <div style={dayFilter}>
                        {days.map(day => (
                            <button key={`day-${day}`} onClick={() => setSelectedDay(day)} style={{...dayBtnStyle(selectedDay === day), background: selectedDay === day ? '#002147' : '#f8f9fa'}}>
                                {day}
                            </button>
                        ))}
                    </div>

                    <h3 style={{ color: '#333', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', marginBottom: '16px', fontWeight: '900' }}>Classes for {selectedDay} (Temp Actions)</h3>
                    {filteredWeeklySchedule.length === 0 ? <div style={emptyState}>No classes scheduled for {selectedDay}.</div> : (
                        filteredWeeklySchedule.map((cls) => (
                            <div key={cls.id} style={{ background: 'white', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', marginBottom: '16px', borderLeft: cls.isRescheduled ? '5px solid #007bff' : cls.isConfirmed ? '5px solid #28a745' : '1px solid #eee', opacity: cls.isCancelled ? 0.6 : 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '12px', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                                    <div>
                                        <div style={{ fontWeight: '900', fontSize: '1rem', color: cls.isCancelled ? '#dc3545' : '#000', textDecoration: cls.isCancelled ? 'line-through' : 'none' }}>{cls.course}</div>
                                        <div style={{ color: '#666', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                                            {SVGS.users} Sec {cls.section} ({getSemesterFromSession(cls.session)}) | {SVGS.location} Room {cls.room}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ color: '#002147', fontWeight: '900', fontSize: '0.75rem' }}>{cls.day}</div>
                                        <div style={{ color: '#F2A900', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>{SVGS.clock} {convertTo12Hour(cls.start_time)} - {convertTo12Hour(cls.end_time)}</div>
                                    </div>
                                </div>
                                {cls.isRescheduled && <div style={{ background: '#e7f1ff', color: '#004085', padding: '10px', borderRadius: '8px', marginBottom: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>Moved to {cls.exceptionDetails.new_room} on {cls.exceptionDetails.exception_date} ({convertTo12Hour(cls.exceptionDetails.new_start_time)} - {convertTo12Hour(cls.exceptionDetails.new_end_time)})</div>}
                                {cls.isConfirmed && <div style={{ background: '#d4edda', color: '#155724', padding: '10px', borderRadius: '8px', marginBottom: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>Confirmed to be Held on {cls.exceptionDetails?.exception_date}</div>}
                                
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {cls.isCancelled ? <button onClick={() => handleUndoException(cls.id, 'cancelled', cls.course, cls.section, cls.day)} style={btnStyle('#6c757d', SVGS.undo)}>Undo Cancellation</button> : cls.isConfirmed ? <button onClick={() => handleUndoException(cls.id, 'confirmed', cls.course, cls.section, cls.day)} style={btnStyle('#6c757d', SVGS.undo)}>Mark Not Confirm</button> : cls.isRescheduled ? <button onClick={() => handleUndoException(cls.id, 'rescheduled', cls.course, cls.section, cls.day)} style={btnStyle('#6c757d', SVGS.undo)}>Undo Reschedule</button> : (
                                        <>
                                            <button onClick={() => handleConfirmClass(cls.id, cls.course, cls.section, cls.day)} style={btnStyle('#28a745', SVGS.tickCircle)}>Will Held</button>
                                            <button onClick={() => openEditModal(cls)} style={btnStyle('#007bff', SVGS.edit)}>Modify</button>
                                            <button onClick={() => handleCancelClass(cls.id, cls.course, cls.section, cls.day)} style={btnStyle('#dc3545', SVGS.cross)}>Cancel</button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            
            {currentTab === 'attendance' && (
                <div className="expand-anim">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px', padding: '6px', background: '#e9ecef', borderRadius: '12px' }}>
                        <button onClick={() => setAttendanceView('approve')} style={subTabStyle(attendanceView === 'approve')}>
                            <span style={{display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center'}}>
                                {SVGS.tickCircle} Approvals
                                {pendingAttendances.length > 0 && <span style={redBadgeStyle}>{pendingAttendances.length}</span>}
                            </span>
                        </button>
                        <button onClick={() => setAttendanceView('mark')} style={subTabStyle(attendanceView === 'mark')}>
                            <span style={{display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center'}}>{SVGS.edit} Mark/Edit</span>
                        </button>
                        <button onClick={() => setAttendanceView('download')} style={subTabStyle(attendanceView === 'download')}>
                            <span style={{display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center'}}>{SVGS.download} CSV</span>
                        </button>
                        <button onClick={() => setAttendanceView('stats')} style={subTabStyle(attendanceView === 'stats')}>
                            <span style={{display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center'}}>{SVGS.stats} Stats</span>
                        </button>
                    </div>

                    
                    {attendanceView === 'approve' && (
                        <div className="expand-anim">
                            <h3 style={{ color: '#333', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', marginBottom: '16px', fontWeight: '900' }}>Pending Attendance</h3>
                            {pendingAttendances.length === 0 ? <div style={emptyState}>No pending attendance to approve.</div> : (
                                pendingAttendances.map(session => (
                                    <div key={`pend-${session.id}`} style={{ background: 'white', padding: '16px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', marginBottom: '16px', borderLeft: '5px solid #f59e0b', border: '1px solid #eee' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '12px', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                                            <div>
                                                <div style={{ fontWeight: '900', fontSize: '1rem', color: '#000' }}>{session.course}</div>
                                                <div style={{ color: '#666', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>{SVGS.users} Section {session.section} ({getSemesterFromSession(session.session)})</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ color: '#002147', fontWeight: '900', fontSize: '0.8rem' }}>{session.session_date}</div>
                                                <div style={{ color: '#059669', fontSize: '0.75rem', fontWeight: 'bold', marginTop: '4px', background: '#dcfce7', padding: '4px 10px', borderRadius: '12px', display: 'inline-block' }}>{session.presentCount} / {session.totalCount} Present</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                            <button onClick={() => handleApproveAttendance(session.id)} style={btnStyle('#28a745', SVGS.tickCircle)}>Approve Directly</button>
                                            <button onClick={() => {
                                                const formattedLecture = { ...session.baseLecture, attendanceSession: session };
                                                setActiveAttendanceLecture(formattedLecture);
                                            }} style={btnStyle('#007bff', SVGS.edit)}>Review & Edit</button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    
                    {attendanceView === 'mark' && (
                        <div className="expand-anim">
                            <h3 style={{ color: '#333', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', marginBottom: '16px', fontWeight: '900' }}>Today's Lectures</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                                {attendanceStats.map(stat => {
                                    const todayClass = schedule.find(c => c.course === stat.subject && c.section === stat.section && c.session === stat.session && c.day === currentDayStr && !c.isCancelled);
                                    if (!todayClass) return null;

                                    const startMins = parseTime(todayClass.start_time);
                                    const endMins = parseTime(todayClass.end_time);
                                    const isOngoing = currentMins >= startMins && currentMins <= endMins;
                                    const todaySession = todayClass.attendanceSession;

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

                            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: '16px', gap: '10px' }}>
                                <h3 style={{ color: '#333', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', margin: 0, fontWeight: '900' }}>Edit Past Sessions</h3>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
                                    <select value={editSectionFilter} onChange={(e) => setEditSectionFilter(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none', fontWeight: 'bold', fontSize: '0.75rem', flex: 1 }}>
                                        <option value="ALL">All Sections</option>
                                        {mySectionSessions.map(s => <option key={`${s.session}-${s.section}`} value={`${s.session}-${s.section}`}>{getSemesterFromSession(s.session)} - Sec {s.section}</option>)}
                                    </select>
                                    <select value={editSubjectFilter} onChange={(e) => setEditSubjectFilter(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none', fontWeight: 'bold', fontSize: '0.75rem', flex: 1 }}>
                                        <option value="ALL">All Subjects</option>
                                        {mySubjects.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>

                            {allSessionsData.length === 0 ? <div style={emptyState}>No past sessions recorded.</div> : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                                    {allSessionsData
                                        .filter(session => (editSectionFilter === 'ALL' || `${session.session}-${session.section}` === editSectionFilter))
                                        .filter(session => (editSubjectFilter === 'ALL' || session.course === editSubjectFilter))
                                        .sort((a,b) => new Date(b.session_date) - new Date(a.session_date))
                                        .map(session => (
                                            <div key={`editpast-${session.id}`} style={{ background: 'white', padding: '16px', borderRadius: '12px', borderLeft: session.status === 'pending' ? '4px solid #f59e0b' : '4px solid #6c757d', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.04)', border: '1px solid #eee' }}>
                                                <div>
                                                    <div style={{ fontWeight: 'bold', color: '#000', fontSize: '0.85rem' }}>{session.course}</div>
                                                    <div style={{ color: '#666', fontSize: '0.7rem', marginTop: '4px' }}>{getSemesterFromSession(session.session)} - Sec {session.section} | Date: {session.session_date}</div>
                                                    {session.status === 'pending' && <div style={{ fontSize: '0.65rem', color: '#f59e0b', fontWeight: 'bold', marginTop: '4px' }}>PENDING APPROVAL</div>}
                                                </div>
                                                <button onClick={() => {
                                                    const formattedLecture = { ...session.baseLecture, attendanceSession: session };
                                                    setActiveAttendanceLecture(formattedLecture);
                                                }} style={{ padding: '8px 16px', background: '#002147', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s ease' }}>
                                                    {SVGS.edit} {session.status === 'pending' ? 'Review' : 'Edit'}
                                                </button>
                                            </div>
                                        ))}
                                        {allSessionsData.filter(session => (editSectionFilter === 'ALL' || `${session.session}-${session.section}` === editSectionFilter)).filter(session => (editSubjectFilter === 'ALL' || session.course === editSubjectFilter)).length === 0 && (
                                            <div style={emptyState}>No matching records found.</div>
                                        )}
                                </div>
                            )}
                        </div>
                    )}

                    
                    {attendanceView === 'download' && (
                        <div className="expand-anim" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                            {attendanceStats.map(stat => (
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
                    )}

                    
                    {attendanceView === 'stats' && (
                        <div className="expand-anim" style={{ background: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #eee' }}>
                            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: '16px', gap: '10px' }}>
                                <h3 style={{ margin: 0, color: '#002147', fontSize: '1rem', fontWeight: '900' }}>Attendance Overview</h3>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
                                    <select value={attendanceSessionFilter} onChange={(e) => setAttendanceSessionFilter(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none', fontWeight: 'bold', fontSize: '0.75rem', flex: 1 }}>
                                        <option value="ALL">All Sessions</option>
                                        {mySessions.map(s => <option key={s} value={s}>{getSemesterFromSession(s)} ({s})</option>)}
                                    </select>
                                    <select value={attendanceSectionFilter} onChange={(e) => setAttendanceSectionFilter(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none', fontWeight: 'bold', fontSize: '0.75rem', flex: 1 }}>
                                        <option value="ALL">All Sections</option>
                                        {mySections.map(s => <option key={s} value={s}>Section {s}</option>)}
                                    </select>
                                </div>
                            </div>
                            
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.75rem' }}>
                                    <thead>
                                        <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                                            <th style={{ padding: '12px' }}>Registration No.</th>
                                            <th style={{ padding: '12px' }}>Name</th>
                                            {!isMobile && <th style={{ padding: '12px' }}>Session</th>}
                                            {!isMobile && <th style={{ padding: '12px' }}>Section</th>}
                                            <th style={{ padding: '12px', textAlign: 'right' }}>Overall Att %</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {roster.filter(s => (attendanceSectionFilter === 'ALL' || s.section === attendanceSectionFilter) && (attendanceSessionFilter === 'ALL' || s.session === attendanceSessionFilter)).map(student => {
                                            const pct = getStudentAttendance(student.registration_number, 'ALL', attendanceSectionFilter, attendanceSessionFilter);
                                            return (
                                                <tr key={student.registration_number} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                                    <td style={{ padding: '12px', fontWeight: 'bold', color: '#002147' }}>{student.registration_number}</td>
                                                    <td style={{ padding: '12px', color: '#333' }}>{student.student_name}</td>
                                                    {!isMobile && <td style={{ padding: '12px', color: '#666' }}>{getSemesterFromSession(student.session)}</td>}
                                                    {!isMobile && <td style={{ padding: '12px', color: '#666' }}>{student.section}</td>}
                                                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: '900', color: pct > 75 ? '#28a745' : '#dc3545' }}>
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

            
            {currentTab === 'updates' && (
                <div className="expand-anim">
                    <div style={whiteCard}>
                        <h3 style={{ marginTop: 0, color: '#002147', borderBottom: '1px solid #eee', paddingBottom: '10px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {SVGS.updates} Publish Announcement
                        </h3>
                        <form onSubmit={submitAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <select value={announcementForm.type} onChange={(e) => setAnnouncementForm({...announcementForm, type: e.target.value})} style={{...inputStyle, flex: 1, fontWeight: 'bold', marginBottom: 0}}>
                                    <option value="assignment">Assignment</option>
                                    <option value="message">Simple Message</option>
                                </select>
                                <select required value={announcementForm.subject} onChange={(e) => setAnnouncementForm({...announcementForm, subject: e.target.value})} style={{...inputStyle, flex: 2, marginBottom: 0}}>
                                    <option value="" disabled>-- Select Subject --</option>
                                    <option value="General">General / Off-Topic</option>
                                    {mySubjects.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>

                            <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
                                <label style={{display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#002147', marginBottom: '8px'}}>Select Class Sections to Notify</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {mySectionSessions.map(ss => {
                                        const isChecked = selectedSectionsForAnn.some(x => x.session === ss.session && x.section === ss.section);
                                        return (
                                            <label key={`${ss.session}-${ss.section}`} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', cursor: 'pointer', background: isChecked ? '#e7f1ff' : '#fff', border: isChecked ? '1px solid #b8daff' : '1px solid #ccc', padding: '4px 8px', borderRadius: '4px' }}>
                                                <input type="checkbox" checked={isChecked} onChange={() => handleSectionSelectionToggle(JSON.stringify(ss))} style={{ margin: 0 }} />
                                                {getSemesterFromSession(ss.session)} - Sec {ss.section}
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {announcementForm.type === 'assignment' && announcementForm.subject && (
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <div style={{flex: 1}}>
                                        <label style={{display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#666', marginBottom: '4px'}}>Deadline Date</label>
                                        <input type="date" required value={announcementForm.deadline_date} onChange={(e) => setAnnouncementForm({...announcementForm, deadline_date: e.target.value})} style={{...inputStyle, marginBottom: 0}} />
                                    </div>
                                    <div style={{flex: 1}}>
                                        <label style={{display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#666', marginBottom: '4px'}}>Deadline Time</label>
                                        <select required value={announcementForm.deadline_time} onChange={(e) => setAnnouncementForm({...announcementForm, deadline_time: e.target.value})} style={{...inputStyle, marginBottom: 0}}>
                                            {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                                            <option value="11:59 PM">11:59 PM (Midnight)</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            <input type="text" placeholder={announcementForm.type === 'assignment' ? "Assignment Topic (e.g. Chapter 4)" : "Message Title"} required value={announcementForm.topics} onChange={(e) => setAnnouncementForm({...announcementForm, topics: e.target.value})} style={{...inputStyle, marginBottom: 0}} />
                            <textarea placeholder="Provide detailed instructions or message content here..." required value={announcementForm.details} onChange={(e) => setAnnouncementForm({...announcementForm, details: e.target.value})} style={{...inputStyle, minHeight: '80px', resize: 'vertical', marginBottom: 0}} />
                            
                            <button type="submit" style={{...actionBtn, background: '#002147', color: '#F2A900', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', marginTop: '5px'}}>
                                {SVGS.rocket} Push Announcement
                            </button>
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

            
            {currentTab === 'permanent' && (
                <div className="expand-anim">
                    <div style={dayFilter}>
                        {filterDays.map(day => (
                            <button key={`base-day-${day}`} onClick={() => setBasePlanDayFilter(day)} style={{...dayBtnStyle(basePlanDayFilter === day), background: basePlanDayFilter === day ? '#002147' : '#f8f9fa'}}>
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
                    <button onClick={() => openBaseModal()} style={{ width: '100%', padding: '16px', background: '#002147', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer', marginTop: '10px', marginBottom: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(0,33,71,0.2)' }}>
                        {SVGS.plus} Add New Lecture
                    </button>
                </div>
            )}
        </div>

        <footer style={footerStyle}>
            Made with love by <a href="[http://wa.me/923053296062](http://wa.me/923053296062)" target="_blank" rel="noreferrer" style={{ color: '#002147', fontWeight: '900', textDecoration: 'none' }}>Mohsin | Muntaha | Waleeja | Nazakat — BSAI 3RD 3M</a> 
        </footer>

        
        {activeAttendanceLecture && (
            <AttendanceSheet activeAttendanceLecture.section, activeAttendanceLecture.session existingSession="{activeAttendanceLecture.attendanceSession}" isTeacher: lecture="{activeAttendanceLecture}" name: profile="{{" profile.name, section: session: students="{roster.filter(s" true, }}> s.section === activeAttendanceLecture.section && s.session === activeAttendanceLecture.session)}
                onClose={(didUpdate) => {
                    setActiveAttendanceLecture(null);
                    if (didUpdate) fetchProfileAndSchedule(profile.name);
                }} 
            />
        )}

        
        {isEditModalOpen && (
            <div style={modalOverlayStyle}>
                <div style={modalContentStyle}>
                    <h3 style={{ marginTop: 0, color: '#002147', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '900', fontSize: '1.1rem', marginBottom: '20px' }}>{SVGS.clock} Modify Lecture</h3>
                    <form onSubmit={submitReschedule} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <input type="date" required value={newDate} onChange={(e) => setNewDate(e.target.value)} style={inputStyle} />
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <select value={newStartTime} onChange={(e) => setNewStartTime(e.target.value)} style={{...inputStyle, flex: 1}}>{timeSlots.map(t => <option key={t} value={t}>{t}</option>)}</select>
                            <select value={newEndTime} onChange={(e) => setNewEndTime(e.target.value)} style={{...inputStyle, flex: 1}}>{timeSlots.map(t => <option key={t} value={t}>{t}</option>)}</select>
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

        
        {isBaseModalOpen && (
            <div style={modalOverlayStyle}>
                <div style={{...modalContentStyle, maxHeight: '90vh', overflowY: 'auto'}}>
                    <h3 style={{ marginTop: 0, color: '#002147', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '900', fontSize: '1.1rem', marginBottom: '20px' }}>{SVGS.building} {baseForm.id ? 'Edit Base Lecture' : 'Add New Lecture'}</h3>
                    <form onSubmit={submitBaseSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {isManualSession ? <input type="text" placeholder="Session (e.g. Spring 2026)..." required value={baseForm.session} onChange={(e) => setBaseForm({...baseForm, session: e.target.value})} style={inputStyle} /> : <select required value={baseForm.session} onChange={(e) => { if (e.target.value === 'MANUAL') { setIsManualSession(true); setBaseForm({...baseForm, session: ''}); } else setBaseForm({...baseForm, session: e.target.value}); }} style={inputStyle}><option value="" disabled>-- Select Session --</option>{availableSessions.map(s => <option key={s} value={s}>{s}</option>)}<option value="MANUAL">+ Add Manually</option></select>}
                        {isManualSection ? <input type="text" placeholder="Section (e.g. 1E)..." required value={baseForm.section} onChange={(e) => setBaseForm({...baseForm, section: e.target.value})} style={inputStyle} /> : <select required value={baseForm.section} onChange={(e) => { if (e.target.value === 'MANUAL') { setIsManualSection(true); setBaseForm({...baseForm, section: ''}); } else setBaseForm({...baseForm, section: e.target.value}); }} style={inputStyle}><option value="" disabled>-- Select Section --</option>{availableSections.map(s => <option key={s} value={s}>{s}</option>)}<option value="MANUAL">+ Add Manually</option></select>}
                        {isManualCourse ? <input type="text" placeholder="Subject Name..." required value={baseForm.course} onChange={(e) => setBaseForm({...baseForm, course: e.target.value})} style={inputStyle} /> : <select required value={baseForm.course} onChange={(e) => { if (e.target.value === 'MANUAL') { setIsManualCourse(true); setBaseForm({...baseForm, course: ''}); } else setBaseForm({...baseForm, course: e.target.value}); }} style={inputStyle}><option value="" disabled>-- Select Subject --</option>{availableCourses.map(c => <option key={c} value={c}>{c}</option>)}<option value="MANUAL">+ Add Manually</option></select>}
                        {isManualRoom ? <input type="text" placeholder="Room Name (e.g. 101)..." required value={baseForm.room} onChange={(e) => setBaseForm({...baseForm, room: e.target.value})} style={inputStyle} /> : <select required value={baseForm.room} onChange={(e) => { if (e.target.value === 'MANUAL') { setIsManualRoom(true); setBaseForm({...baseForm, room: ''}); } else setBaseForm({...baseForm, room: e.target.value}); }} style={inputStyle}><option value="" disabled>-- Select Room --</option>{availableRooms.map(r => <option key={r} value={r}>{r}</option>)}<option value="MANUAL">+ Add Manually</option></select>}
                        <select required value={baseForm.day} onChange={(e) => setBaseForm({...baseForm, day: e.target.value})} style={inputStyle}>{days.map(d => <option key={d} value={d}>{d}</option>)}</select>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <select value={baseForm.start_time} onChange={(e) => setBaseForm({...baseForm, start_time: e.target.value})} style={{...inputStyle, flex: 1}}>{timeSlots.map(t => <option key={t} value={t}>{t}</option>)}</select>
                            <select value={baseForm.end_time} onChange={(e) => setBaseForm({...baseForm, end_time: e.target.value})} style={{...inputStyle, flex: 1}}>{timeSlots.map(t => <option key={t} value={t}>{t}</option>)}</select>
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

```

}

// STYLES
const welcomeBg = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: '#002147', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000 };
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
