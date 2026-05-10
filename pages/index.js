import { useEffect, useState } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabase';

// Helper function to dynamically calculate Semester based on Session text and Current Date
const getSemesterFromSession = (session) => {
    if (!session) return "";
    const match = session.match(/20\d{2}/);
    if (!match) return session; 

    const startYear = parseInt(match[0], 10);
    const isSpringStart = session.toLowerCase().includes('spring') || session.toLowerCase().includes('sp');
    
    const d = new Date();
    const currYear = d.getFullYear();
    const currMonth = d.getMonth(); // 0 = Jan, 11 = Dec
    
    let semestersPassed = (currYear - startYear) * 2;
    
    // Fall sessions start around August (Month index 7)
    if (currMonth >= 7) semestersPassed += 1;
    if (isSpringStart) semestersPassed += 1;
    
    if (semestersPassed <= 0) return "1ST";
    
    const suffixes = ["TH", "ST", "ND", "RD"];
    const v = semestersPassed % 100;
    const suffix = suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];
    
    return `${semestersPassed}${suffix}`;
};

// Helper for grouping attendance dates
const getWeekKey = (dateStr) => {
    const d = new Date(dateStr);
    const day = d.getDay() || 7; 
    d.setDate(d.getDate() - (day - 1));
    return `Week of ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
};

export default function Home() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [rawData, setRawData] = useState([]);
    const [exceptions, setExceptions] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [pointsData, setPointsData] = useState([]); 
    const [announcements, setAnnouncements] = useState([]); 
    const [teachersData, setTeachersData] = useState([]); 
    const [loading, setLoading] = useState(true);

    // NEW Data States for Attendance
    const [studentsData, setStudentsData] = useState([]);
    const [attSessions, setAttSessions] = useState([]);
    const [attRecords, setAttRecords] = useState([]);

    // Persistence States
    const [userSection, setUserSection] = useState(null);
    const [isFirstVisit, setIsFirstVisit] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date()); 
    const [readNotifIds, setReadNotifIds] = useState([]);
    const [myRollNumber, setMyRollNumber] = useState(null);

    // Active View States
    const [currentTab, setCurrentTab] = useState('class'); 
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [roomSubTab, setRoomSubTab] = useState('schedule'); 
    const [selectedDay, setSelectedDay] = useState(() => {
        const today = new Date().toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
        return today === 'SUN' ? 'ALL' : today;
    });
    const [showAlerts, setShowAlerts] = useState(false);
    const [showNotifBanner, setShowNotifBanner] = useState(false);
    
    const [expandedAssignmentId, setExpandedAssignmentId] = useState(null);

    // Responsive State
    const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

    // Free Room Filters
    const [freeDay, setFreeDay] = useState('MON');
    const [freeStart, setFreeStart] = useState('8:00 AM');
    const [freeEnd, setFreeEnd] = useState('9:00 AM');
    const [searchedFreeRooms, setSearchedFreeRooms] = useState(null);

    // Search & Dropdown States
    const [teacherSearch, setTeacherSearch] = useState('');
    const [selectedTeacher, setSelectedTeacher] = useState('');
    const [roomSearch, setRoomSearch] = useState('');
    const [selectedRoom, setSelectedRoom] = useState('');

    // Attendance & Update Filter States
    const [attSearch, setAttSearch] = useState('');
    const [selectedRollInput, setSelectedRollInput] = useState('');
    const [attFilter, setAttFilter] = useState('Last Month');
    const [updatesFilter, setUpdatesFilter] = useState('Last Month');

    const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const filterDays = ["ALL", ...days];

    const timeSlots = [];
    let ts = 8 * 60;
    while (ts < 18 * 60) {
        let h = Math.floor(ts / 60), m = ts % 60, amp = h >= 12 ? 'PM' : 'AM', dh = h > 12 ? h - 12 : h;
        if (dh === 0) dh = 12;
        timeSlots.push(`${dh}:${m === 0 ? '00' : m} ${amp}`);
        ts += 30;
    }

    // Window Resize Listener
    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // 1. INITIAL LOAD
    useEffect(() => {
        const savedSelection = localStorage.getItem('iub_user_selection');
        if (savedSelection) {
            const parsed = JSON.parse(savedSelection);
            if (parsed.semester && !parsed.session) parsed.session = parsed.semester;
            setUserSection(parsed);
            setIsFirstVisit(false);
            if (parsed.section === 'GUEST') setCurrentTab('room');
        }

        const savedReadNotifs = localStorage.getItem('iub_read_notifs');
        if (savedReadNotifs) {
            setReadNotifIds(JSON.parse(savedReadNotifs));
        }

        const savedRoll = localStorage.getItem('iub_my_roll');
        if (savedRoll) setMyRollNumber(savedRoll);

        if ("Notification" in window && Notification.permission === "default") {
            setShowNotifBanner(true);
        }

        fetchLiveSchedule();

        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // 2. SUPABASE REALTIME LISTENER (Instant Updates)
    useEffect(() => {
        if (!userSection || userSection.section === 'GUEST') return;

        const channel = supabase
            .channel('student-dashboard-updates')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
                if (payload.new.message.includes(userSection.section) || payload.new.message.includes('GLOBAL')) {
                    setNotifications(prev => [payload.new, ...prev]);
                    
                    if (Notification.permission === "granted") {
                        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                            navigator.serviceWorker.ready.then((registration) => {
                                registration.showNotification("IUB Update Alert", {
                                    body: payload.new.message, icon: "/icon.png", vibrate: [200, 100, 200]
                                });
                            });
                        } else {
                            new Notification("IUB Update Alert", { body: payload.new.message, icon: "/icon.png" });
                        }
                    }
                }
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'class_announcements' }, (payload) => {
                if (payload.new.section === userSection.section && payload.new.session === userSection.session) {
                    setAnnouncements(prev => [payload.new, ...prev].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)));
                    
                    if (Notification.permission === "granted") {
                        const title = payload.new.type === 'assignment' ? "New Assignment Posted!" : "New Class Announcement";
                        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                            navigator.serviceWorker.ready.then((registration) => {
                                registration.showNotification(title, {
                                    body: `${payload.new.subject}: ${payload.new.topics}`, icon: "/icon.png", vibrate: [200, 100, 200]
                                });
                            });
                        } else {
                            new Notification(title, { body: `${payload.new.subject}: ${payload.new.topics}`, icon: "/icon.png" });
                        }
                    }
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'schedule_exceptions' }, () => fetchLiveSchedule())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'base_schedule' }, () => fetchLiveSchedule())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [userSection]);

    // 3. INITIALIZE SERVICE WORKER
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').then((reg) => console.log('SW Registered')).catch((err) => console.error('SW Failed!', err));
        }
    }, []);

    useEffect(() => {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        });
    }, []);

    // 4. INVALID CACHE RECOVERY (Revert old/wrong selection logic gracefully)
    useEffect(() => {
        if (!loading && !isFirstVisit && userSection && userSection.section !== 'GUEST' && rawData.length > 0) {
            const isValid = rawData.some(c => c.session === userSection.session && c.section === userSection.section);
            if (!isValid) {
                localStorage.removeItem('iub_user_selection');
                setUserSection(null);
                setIsFirstVisit(true);
            }
        }
    }, [loading, isFirstVisit, userSection, rawData]);

    const fetchLiveSchedule = async () => {
        const [baseRes, excRes, notifRes, pointsRes, annRes, teachersRes, studentsRes, attSessRes, attRecRes] = await Promise.all([
            supabase.from('base_schedule').select('*'),
            supabase.from('schedule_exceptions').select('*'), 
            supabase.from('notifications').select('*').order('created_at', { ascending: false }),
            supabase.from('point_schedules').select('*'),
            supabase.from('class_announcements').select('*').order('created_at', { ascending: false }),
            supabase.from('teacher_profiles').select('name, phone'),
            supabase.from('students').select('*'),
            supabase.from('attendance_sessions').select('*'),
            supabase.from('attendance_records').select('*')
        ]);
    
        setRawData(baseRes.data || []);
        setExceptions(excRes.data || []);
        setNotifications(notifRes.data || []);
        setPointsData(pointsRes.data || []); 
        setAnnouncements(annRes.data || []);
        setTeachersData(teachersRes.data || []);
        
        setStudentsData(studentsRes.data || []);
        setAttSessions(attSessRes.data || []);
        setAttRecords(attRecRes.data || []);

        setLoading(false);
    };

    const handleInitialSelection = (sessionVal, secVal) => {
        const selection = { session: sessionVal, section: secVal };
        localStorage.setItem('iub_user_selection', JSON.stringify(selection));
        setUserSection(selection);
        setIsFirstVisit(false);
    };

    const handleGuestSelection = () => {
        const selection = { session: 'N/A', section: 'GUEST' };
        localStorage.setItem('iub_user_selection', JSON.stringify(selection));
        setUserSection(selection);
        setIsFirstVisit(false);
        setCurrentTab('room');
    };

    const handleRollSelectConfirm = () => {
        if (!selectedRollInput) return;
        if (window.confirm(`Are you sure ${selectedRollInput} is your roll number? You will not be able to change this later.`)) {
            localStorage.setItem('iub_my_roll', selectedRollInput);
            setMyRollNumber(selectedRollInput);
        }
    };

    // --- UNIVERSAL TIME PARSER ---
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

    const convertTo12Hour = (timeStr) => {
        if (!timeStr) return "";
        if (timeStr.toUpperCase().includes('AM') || timeStr.toUpperCase().includes('PM')) return timeStr;
        let [h, m] = timeStr.split(':').map(Number);
        const suffix = h >= 12 ? "PM" : "AM";
        h = h % 12 || 12;
        return `${h}:${m === 0 ? '00' : m < 10 ? '0' + m : m} ${suffix}`;
    };

    // Extract dynamic dropdown data natively matching the new schema
    const availableSessions = [...new Set(rawData.map(x => x.session))]
        .filter(Boolean)
        .sort((a, b) => {
            const semA = parseInt(getSemesterFromSession(a)) || 99;
            const semB = parseInt(getSemesterFromSession(b)) || 99;
            return semA - semB;
        });

    const getSectionsForSession = (sess) => [...new Set(rawData.filter(x => x.session === sess).map(x => x.section))].sort();
    
    const allTeachers = [...new Set(rawData.map(x => x.teacher))].filter(Boolean).sort();
    const allRooms = [...new Set(rawData.map(x => x.room))].filter(Boolean).sort();

    const getStatusStyles = (cls) => {
        const todayStr = new Date().toLocaleDateString('en-CA');
        const exc = exceptions.filter(e => String(e.base_schedule_id) === String(cls.id) && e.exception_date >= todayStr)[0];
        
        if (exc?.status === 'cancelled') return { label: `Cancelled on ${exc.exception_date}`, color: '#721c24', bg: '#f8d7da', border: '#dc3545' };
        if (exc?.status === 'confirmed') return { label: `Confirmed for ${exc.exception_date}`, color: '#155724', bg: '#d4edda', border: '#28a745' };
        if (exc?.status === 'rescheduled') return { label: `Moved to ${exc.new_room} on ${exc.exception_date}`, color: '#004085', bg: '#e7f1ff', border: '#007bff' };

        return null; 
    };

    const getNearestPoints = (cls) => {
        if (!pointsData || pointsData.length === 0) return { up: '--:--', down: '--:--' };

        const isSat = cls.day === 'SAT';
        const clsStartMins = parseTime(cls.start_time);
        const clsEndMins = parseTime(cls.end_time);

        const targetUpMins = clsStartMins - 30;
        const validUp = pointsData
            .filter(p => p.route === 'AC_to_BJC' && p.is_saturday === isSat && parseDbTime(p.departure_time) <= targetUpMins)
            .sort((a, b) => parseDbTime(b.departure_time) - parseDbTime(a.departure_time)); 
        
        const bestUp = validUp.length > 0 ? convertTo12Hour(validUp[0].departure_time.slice(0, 5)) : 'N/A';

        const targetDownMins = clsEndMins;
        const validDown = pointsData
            .filter(p => p.route === 'BJC_to_AC' && p.is_saturday === isSat && parseDbTime(p.departure_time) >= targetDownMins)
            .sort((a, b) => parseDbTime(a.departure_time) - parseDbTime(b.departure_time)); 
        
        const bestDown = validDown.length > 0 ? convertTo12Hour(validDown[0].departure_time.slice(0, 5)) : 'N/A';

        return { up: bestUp, down: bestDown };
    };

    const searchFreeRooms = () => {
        const sVal = parseTime(freeStart);
        const eVal = parseTime(freeEnd);
        if (sVal >= eVal) return alert("End time must be after start time");

        const strictlyCancelledClasses = rawData.filter(cls => {
            if (cls.day !== freeDay) return false;
            const clsS = parseTime(cls.start_time);
            const clsE = parseTime(cls.end_time);
            const overlaps = (sVal < clsE && eVal > clsS);
            if (!overlaps) return false;

            const todayStr = new Date().toLocaleDateString('en-CA');
            const exc = exceptions.filter(e => String(e.base_schedule_id) === String(cls.id) && e.exception_date >= todayStr)[0];
            return exc?.status === 'cancelled';
        });

        const available = [...new Set(strictlyCancelledClasses.map(c => c.room))];
        setSearchedFreeRooms(available);
    };

    const forceNotificationPermission = async () => {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            setShowNotifBanner(false);
            new Notification("Notifications Enabled!", { body: "You will now receive IUB alerts." });
        }
    };

    const relevantNotifs = notifications.filter(n => 
        (n.message.includes(userSection?.section) || n.message.includes('GLOBAL')) &&
        !readNotifIds.includes(n.id)
    );

    const handleMarkAsRead = () => {
        const newReadIds = [...readNotifIds, ...relevantNotifs.map(n => n.id)];
        setReadNotifIds(newReadIds);
        localStorage.setItem('iub_read_notifs', JSON.stringify(newReadIds));
    };

    // STRICT SECTION & SESSION ISOLATION
    const targetSemester = getSemesterFromSession(userSection?.session);
    
    const relevantAnnouncements = announcements.filter(a => a.section === userSection?.section && (a.session === userSection?.session || getSemesterFromSession(a.session) === targetSemester));
    const sectionStudents = studentsData.filter(s => s.section === userSection?.section && (s.session === userSection?.session || getSemesterFromSession(s.session) === targetSemester));

    // Updates Filter Logic
    const getFilteredAnnouncements = () => {
        let filtered = relevantAnnouncements;
        if (updatesFilter !== 'All') {
            const now = new Date();
            const daysMap = { 'Last Week': 7, 'Last 15 Days': 15, 'Last Month': 30 };
            const ms = daysMap[updatesFilter] * 24 * 60 * 60 * 1000;
            filtered = filtered.filter(a => (now - new Date(a.created_at)) <= ms);
        }
        return filtered;
    };

    const activeAssignments = relevantAnnouncements.filter(ann => {
        if (ann.type !== 'assignment' || !ann.deadline_date || !ann.deadline_time) return false;
        const deadlineDate = new Date(ann.deadline_date);
        const deadlineMins = parseTime(ann.deadline_time);
        deadlineDate.setHours(Math.floor(deadlineMins / 60), deadlineMins % 60, 0, 0);
        return (deadlineDate - currentTime) > 0;
    });

    const getTeacherWhatsAppLink = (teacherName) => {
        const tInfo = teachersData.find(t => t.name === teacherName);
        if (tInfo && tInfo.phone) {
            let p = tInfo.phone.replace(/\D/g, '');
            if(p.startsWith('0')) p = '92' + p.substring(1);
            return `https://wa.me/${p}?text=Salam%20${encodeURIComponent(teacherName)}`;
        }
        return `https://wa.me/?text=Salam%20${encodeURIComponent(teacherName)}`;
    };

    const getTimeRemainingStr = (ann) => {
        if (!ann.deadline_date || !ann.deadline_time) return null;
        const deadlineDate = new Date(ann.deadline_date);
        const deadlineMins = parseTime(ann.deadline_time);
        deadlineDate.setHours(Math.floor(deadlineMins / 60), deadlineMins % 60, 0, 0);
        
        const diffMs = deadlineDate - currentTime;
        if (diffMs <= 0) return null; 
        
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
        const mins = Math.floor((diffMs / 1000 / 60) % 60);
        return `${days > 0 ? days + 'd ' : ''}${hours}h ${mins}m`;
    };

    const getFilteredClasses = (filterKey, filterValue) => {
        let classes = rawData.filter(c => c[filterKey] === filterValue);
        if (filterKey === 'section') {
            classes = classes.filter(c => c.session === userSection?.session);
        }
        if (selectedDay !== 'ALL') {
            classes = classes.filter(c => c.day === selectedDay);
        }
        return classes; 
    };

    const mySchedule = getFilteredClasses('section', userSection?.section);
    const teacherSchedule = getFilteredClasses('teacher', selectedTeacher);
    const roomSchedule = getFilteredClasses('room', selectedRoom);

    // --- ATTENDANCE LOGIC ---
    const getFilteredAttendance = () => {
        const myClasses = rawData.filter(c => c.section === userSection?.section && c.session === userSection?.session);
        const mySubjects = [...new Set(myClasses.map(c => c.course))];
        
        let validSessions = attSessions.filter(sess => myClasses.some(c => c.id === sess.base_schedule_id));
        
        if (attFilter !== 'All') {
            const now = new Date();
            const daysMap = { 'Last Week': 7, 'Last Month': 30 };
            const ms = daysMap[attFilter] * 24 * 60 * 60 * 1000;
            validSessions = validSessions.filter(s => (now - new Date(s.session_date)) <= ms);
        }

        const subjectStats = mySubjects.map(sub => {
            const subClassIds = myClasses.filter(c => c.course === sub).map(c => c.id);
            const subSessions = validSessions.filter(s => subClassIds.includes(s.base_schedule_id));
            
            let presentCount = 0;
            let totalCount = 0;

            subSessions.forEach(sess => {
                const record = attRecords.find(r => r.session_id === sess.id && r.student_id === myRollNumber);
                if (record) {
                    totalCount++;
                    if (record.status === 'Present' || record.status === 'Leave') presentCount++;
                }
            });

            const pct = totalCount === 0 ? 0 : (presentCount / totalCount) * 100;
            return { subject: sub, pct, total: totalCount };
        }).filter(stat => stat.total > 0);

        const datesMap = {};
        validSessions.sort((a, b) => new Date(b.session_date) - new Date(a.session_date)).forEach(sess => {
            const dateObj = new Date(sess.session_date);
            const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short' });
            const weekKey = getWeekKey(sess.session_date);
            const courseName = myClasses.find(c => c.id === sess.base_schedule_id)?.course;
            const record = attRecords.find(r => r.session_id === sess.id && r.student_id === myRollNumber);

            if (!datesMap[weekKey]) datesMap[weekKey] = {};
            if (!datesMap[weekKey][dateStr]) datesMap[weekKey][dateStr] = {};
            
            datesMap[weekKey][dateStr][courseName] = record ? record.status : '-';
        });

        return { subjectStats, datesMap, mySubjects };
    };

    const CircularProgress = ({ percentage, subject }) => {
        const isLow = percentage < 80;
        const color = isLow ? '#dc3545' : '#28a745';
        const bg = `conic-gradient(${color} ${percentage}%, #e9ecef ${percentage}%)`;
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '55px', height: '55px', borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '45px', height: '45px', borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem', color: '#002147' }}>
                        {Math.round(percentage)}%
                    </div>
                </div>
                <div style={{ fontSize: '0.75rem', marginTop: '8px', fontWeight: 'bold', color: '#555', textAlign: 'center', maxWidth: '70px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {subject}
                </div>
            </div>
        )
    };


    // --- RENDER COMPONENT HELPERS ---
    const renderClassCards = (scheduleList, displayContext) => {
        if (displayContext === 'class' && userSection?.section === 'GUEST') {
            return (
                <div style={{...whiteCard, textAlign: 'center', color: '#666', marginTop: '20px'}}>
                    <p style={{fontSize: '1.2rem'}}>👤 Guest Mode Active</p>
                    <p>You can search for Teacher schedules and Free Rooms above.</p>
                    <p>To view a personalized class schedule, click <b>"Change Section"</b> in the top right corner.</p>
                </div>
            );
        }

        if (scheduleList.length === 0) return <div style={emptyState}>No classes scheduled for {selectedDay === 'ALL' ? 'the week' : selectedDay}.</div>;

        const daysToRender = selectedDay === 'ALL' ? days : [selectedDay];

        return daysToRender.map(day => {
            const dayClasses = scheduleList
                .filter(c => c.day === day)
                .sort((a, b) => parseTime(a.start_time) - parseTime(b.start_time));
                
            if (dayClasses.length === 0) return null;

            return (
                <div key={day} style={{ marginBottom: '20px' }}>
                    <div style={dayHeaderStrip}>{day}</div>
                    {dayClasses.map((cls, idx) => {
                        const status = getStatusStyles(cls);
                        const points = getNearestPoints(cls); 
                        const bgCol = status ? status.bg : '#fff';
                        const borderCol = status ? status.border : '#F2A900';

                        // STRICT SECTION ISOLATION FOR ASSIGNMENTS IN LECTURE CARDS
                        const activeSubjectAssignments = activeAssignments.filter(a => a.subject === cls.course && a.section === cls.section);

                        return (
                            <div key={idx} style={{ marginBottom: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                                <div style={{ ...cardBase, marginBottom: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, boxShadow: 'none', background: bgCol, borderLeft: `5px solid ${borderCol}` }}>
                                    <div style={{ fontWeight: 900, color: '#002147', fontSize: '0.85rem' }}>🕒 {convertTo12Hour(cls.start_time)} - {convertTo12Hour(cls.end_time)}</div>
                                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem', margin: '5px 0' }}>{cls.course}</div>
                                    <div style={{ color: '#555', fontSize: '0.8rem' }}>
                                        {displayContext !== 'room' && <span>📍 Room: {cls.room} | </span>}
                                        {displayContext !== 'teacher' && <span>👨‍🏫 {cls.teacher} | </span>}
                                        {/* Display calculated dynamic semester along with section */}
                                        <span>👥 {getSemesterFromSession(cls.session)}-{cls.section}</span>
                                    </div>
                                    
                                    {status && (
                                        <div style={{ marginTop: '8px', fontSize: '0.75rem', fontWeight: 'bold', color: status.color, textTransform: 'uppercase' }}>
                                            ● {status.label}
                                        </div>
                                    )}
                                </div>
                                
                                {activeSubjectAssignments.length > 0 && (
                                    <div 
                                        onClick={() => setExpandedAssignmentId(expandedAssignmentId === cls.id ? null : cls.id)}
                                        style={{ background: '#dc3545', color: 'white', padding: '8px 12px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                    >
                                        <span>⚠️ Assignment Pending</span>
                                        <span>{getTimeRemainingStr(activeSubjectAssignments[0])} {expandedAssignmentId === cls.id ? '▲' : '▼'}</span>
                                    </div>
                                )}

                                {expandedAssignmentId === cls.id && activeSubjectAssignments.length > 0 && (
                                    <div style={{ background: '#fef2f2', borderLeft: '5px solid #dc3545', padding: '12px', animation: 'fadeIn 0.2s ease' }}>
                                        {activeSubjectAssignments.map(ann => (
                                            <div key={ann.id} style={{ marginBottom: '10px' }}>
                                                <div style={{ fontWeight: 'bold', color: '#b91c1c', fontSize: '0.9rem' }}>📝 {ann.topics}</div>
                                                <div style={{ color: '#7f1d1d', fontSize: '0.85rem', marginTop: '4px', whiteSpace: 'pre-wrap' }}>{ann.details}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#991b1b', marginTop: '6px', fontWeight: 'bold' }}>
                                                    Due: {new Date(ann.deadline_date).toLocaleDateString()} at {convertTo12Hour(ann.deadline_time)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div style={pointStripStyle}>
                                    <span style={{ fontWeight: 900, marginRight: '8px', color: '#ccc' }}>Nearest Points:</span>
                                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="#28a745"><path d="M12 2L4 10h5v12h6V10h5L12 2z"/></svg>
                                            {points.up}
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="#007bff"><path d="M12 22l8-8h-5V2h-6v12H4l8 8z"/></svg>
                                            {points.down}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            );
        });
    };

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') setDeferredPrompt(null);
        }
    };

    // --- MAIN APP VIEW ---
    if (loading) return <div style={centerStyle}>Loading System Data...</div>;

    if (isFirstVisit) {
        return (
            <div style={welcomeBg}>
                <div style={welcomeCard}>
                    <h2 style={{ color: '#002147', margin: '0 0 10px 0' }}>Welcome to IUB Assistant! 👋</h2>
                    <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '20px' }}>Select your section for a personalized schedule, or continue as a guest.</p>

                    <select id="initSession" style={selectStyle} onChange={(e) => {
                        const secDropdown = document.getElementById('initSec');
                        const secs = getSectionsForSession(e.target.value);
                        secDropdown.innerHTML = '<option value="">-- Select Section --</option>' + secs.map(s => `<option value="${s}">${s}</option>`).join('');
                    }}>
                        <option value="">-- Select Semester --</option>
                        {availableSessions.map(s => (
                            <option key={s} value={s}>{getSemesterFromSession(s)} Semester</option>
                        ))}
                    </select>

                    <select id="initSec" style={selectStyle}>
                        <option value="">-- Select Section --</option>
                    </select>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                        <button onClick={() => {
                            const sem = document.getElementById('initSession').value;
                            const sec = document.getElementById('initSec').value;
                            if (sem && sec) handleInitialSelection(sem, sec);
                            else alert("Please select both Semester and Section");
                        }} style={bigBtn}>Show My Schedule</button>
                        
                        <div style={{color: '#999', fontSize: '0.8rem'}}>— OR —</div>
                        
                        <button onClick={handleGuestSelection} style={{ ...bigBtn, background: '#e2e8f0', color: '#334155' }}>Continue as Guest</button>
                    </div>
                </div>
            </div>
        );
    }

    const isGuestUser = userSection?.section === 'GUEST';

    // Desktop Tabs logic
    const allTabs = [
        { id: 'class', label: '📅 SCHEDULE' },
        { id: 'attendance', label: '✅ ATTENDANCE' },
        { id: 'announcements', label: '📢 UPDATES' },
        { id: 'room', label: '🚪 ROOMS' },
        { id: 'teacher', label: '👨‍🏫 TEACHERS' }
    ];
    const availableTabs = isGuestUser ? allTabs.filter(t => t.id === 'room' || t.id === 'teacher') : allTabs;

    return (
        <div style={{ backgroundColor: '#f0f2f5', minHeight: '100vh', fontFamily: "'Roboto', sans-serif", display: 'flex', flexDirection: 'column' }}>
            <Head>
                <title>My Schedule | IUB AI</title>
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
                <meta name="theme-color" content="#002147" />
                <link rel="manifest" href="/manifest.json" />
                <link rel="apple-touch-icon" href="/icon-192x192.png" />
            </Head>

            <style>{`
                .desktop-nav { display: none; }
                .mobile-nav { display: flex; }
                @media (min-width: 768px) {
                    .desktop-nav { display: flex; align-items: center; gap: 15px; }
                    .mobile-nav { display: none !important; }
                    .hamburger-btn { display: none !important; }
                }
            `}</style>

            <header style={headerStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div className="hamburger-btn" onClick={() => setIsSidebarOpen(true)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="#F2A900">
                            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
                        </svg>
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900 }}>
                        {isGuestUser ? '🎓 GUEST' : `🎓 ${getSemesterFromSession(userSection?.session)} • ${userSection?.section}`}
                    </div>
                </div>

                {/* DESKTOP NAV BAR */}
                <div className="desktop-nav">
                    {availableTabs.map(tab => (
                        <div 
                            key={tab.id} 
                            onClick={() => { setCurrentTab(tab.id); setShowAlerts(false); }}
                            style={{
                                cursor: 'pointer', padding: '8px 12px', borderRadius: '5px', fontWeight: 'bold', fontSize: '0.85rem',
                                background: currentTab === tab.id ? '#F2A900' : 'transparent',
                                color: currentTab === tab.id ? '#002147' : '#fff',
                                transition: '0.2s'
                            }}
                        >
                            {tab.label}
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {!isGuestUser && (
                        <div style={{ position: 'relative', cursor: 'pointer', fontSize: '1.3rem' }} onClick={() => setShowAlerts(!showAlerts)}>
                            🔔
                            {relevantNotifs.length > 0 && <span style={redDot}></span>}
                        </div>
                    )}
                    <button onClick={() => { localStorage.removeItem('iub_user_selection'); setIsFirstVisit(true); }} style={changeBtn}>Change Section</button>
                </div>
            </header>

            {/* SIDEBAR OVERLAY */}
            {isSidebarOpen && (
                <div style={sidebarOverlay} onClick={() => setIsSidebarOpen(false)}>
                    <div style={sidebarMenu} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '20px', borderBottom: '1px solid #eee', marginBottom: '10px' }}>
                            <h3 style={{ margin: 0, color: '#002147' }}>Menu Options</h3>
                        </div>
                        {availableTabs.map(tab => (
                            <button 
                                key={tab.id} 
                                onClick={() => { setCurrentTab(tab.id); setIsSidebarOpen(false); setShowAlerts(false); }} 
                                style={sidebarBtn(currentTab === tab.id)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* MOBILE TAB BAR - Hide Room and Teacher strictly on mobile per prompt */}
            <div className="mobile-nav" style={tabBar}>
                {availableTabs.filter(tab => tab.id !== 'room' && tab.id !== 'teacher').map(tab => (
                    <button key={tab.id} onClick={() => { setCurrentTab(tab.id); setShowAlerts(false); }} style={tabBtn(currentTab === tab.id)}>
                        {tab.label}
                        {tab.id === 'announcements' && activeAssignments.length > 0 && <span style={newsRedDot}></span>}
                    </button>
                ))}
            </div>

            <div style={{ padding: '10px 15px', maxWidth: '600px', margin: '0 auto', flex: 1, width: '100%', boxSizing: 'border-box' }}>

                {deferredPrompt && (
                    <div style={{ ...notifBannerStyle, background: '#17a2b8', borderColor: '#117a8b', marginBottom: '15px' }}>
                        <div style={{ flex: 1, paddingRight: '10px' }}>
                            <b style={{ display: 'block', marginBottom: '3px' }}>Install App 📱</b>
                            <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>Add IUB Assistant to your home screen for better performance and reliable notifications.</span>
                        </div>
                        <button onClick={handleInstallClick} style={{ ...enableBtnStyle, background: '#fff', color: '#17a2b8' }}>Install</button>
                    </div>
                )}

                {showNotifBanner && (
                    <div style={notifBannerStyle}>
                        <div style={{ flex: 1, paddingRight: '10px' }}>
                            <b style={{ display: 'block', marginBottom: '3px' }}>Stay Updated! 🔔</b>
                            <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>Allow notifications to get instant alerts for cancelled classes.</span>
                        </div>
                        <button onClick={forceNotificationPermission} style={enableBtnStyle}>Enable</button>
                    </div>
                )}

                {showAlerts ? (
                    <div style={whiteCard}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h4 style={{ margin: 0, fontSize: '1rem', color: '#002147' }}>Alerts & Notifications</h4>
                            <button onClick={handleMarkAsRead} style={markReadBtn}>Mark as Read</button>
                        </div>
                        {relevantNotifs.length === 0 ? (
                            <div style={emptyState}>No new notifications.</div>
                        ) : (
                            relevantNotifs.map((n, i) => (
                                <div key={i} style={notifCard}>
                                    <p style={{ margin: '0 0 5px 0', fontSize: '0.9rem' }}>{n.message}</p>
                                    <span style={{ fontSize: '0.7rem', color: '#999' }}>{new Date(n.created_at).toLocaleDateString()} at {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <>
                        {currentTab === 'class' && !isGuestUser && (
                            <>
                                <div style={dayFilter}>
                                    {filterDays.map(day => (
                                        <button key={day} onClick={() => setSelectedDay(day)} style={dayBtnStyle(selectedDay === day)}>{day}</button>
                                    ))}
                                </div>
                                {renderClassCards(mySchedule, 'class')}
                            </>
                        )}

                        {/* ATTENDANCE TAB */}
                        {currentTab === 'attendance' && !isGuestUser && (
                            <div style={whiteCard}>
                                <h4 style={{marginTop: 0, color: '#002147', marginBottom: '15px'}}>Student Attendance</h4>
                                
                                {!myRollNumber ? (
                                    <>
                                        <div style={{ padding: '15px', background: '#e7f1ff', borderRadius: '8px', borderLeft: '4px solid #007bff', marginBottom: '15px', fontSize: '0.85rem' }}>
                                            Please select your Registration/Roll Number to view your attendance. This action is permanent.
                                        </div>
                                        <input type="text" placeholder="🔍 Search Roll No (e.g. FA23...)" value={attSearch} onChange={e => setAttSearch(e.target.value)} style={searchInput} />
                                        
                                        <select value={selectedRollInput} onChange={e => setSelectedRollInput(e.target.value)} style={selectStyle}>
                                            <option value="">-- Select Roll No --</option>
                                            {sectionStudents
                                                .filter(s => (s.registration_number || "").toLowerCase().includes(attSearch.toLowerCase()))
                                                .map(s => <option key={s.registration_number} value={s.registration_number}>{s.registration_number} - {s.student_name}</option>)
                                            }
                                        </select>
                                        
                                        <button onClick={handleRollSelectConfirm} style={{...bigBtn, opacity: selectedRollInput ? 1 : 0.5}} disabled={!selectedRollInput}>
                                            Confirm Roll Number
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #eee' }}>
                                            <div>
                                                <div style={{ fontWeight: 'bold', color: '#002147' }}>{myRollNumber}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#666' }}>{studentsData.find(s=>s.registration_number === myRollNumber)?.student_name}</div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '5px', marginBottom: '20px' }}>
                                            {['Last Week', 'Last Month', 'All'].map(f => (
                                                <button key={f} onClick={() => setAttFilter(f)} style={{ flex: 1, padding: '8px', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '5px', border: '1px solid #dee2e6', background: attFilter === f ? '#002147' : '#fff', color: attFilter === f ? '#F2A900' : '#555' }}>{f}</button>
                                            ))}
                                        </div>

                                        {(() => {
                                            const { subjectStats, datesMap, mySubjects } = getFilteredAttendance();
                                            
                                            if (subjectStats.length === 0) return <div style={emptyState}>No attendance records found for this period.</div>;

                                            return (
                                                <>
                                                    <div style={{ display: 'flex', justifyContent: 'space-around', margin: '20px 0', flexWrap: 'wrap', gap: '15px' }}>
                                                        {subjectStats.map(stat => (
                                                            <CircularProgress key={stat.subject} percentage={stat.pct} subject={stat.subject} />
                                                        ))}
                                                    </div>

                                                    {Object.entries(datesMap).map(([week, daysData]) => (
                                                        <div key={week} style={{ marginBottom: '20px', overflow: 'hidden', borderRadius: '10px', border: '1px solid #dee2e6', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
                                                            <div style={{ background: '#f8f9fa', padding: '10px 15px', fontWeight: 'bold', color: '#002147', borderBottom: '1px solid #dee2e6', fontSize: '0.85rem' }}>
                                                                📅 {week}
                                                            </div>
                                                            <div style={{ overflowX: 'auto' }}>
                                                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.8rem' }}>
                                                                    <thead>
                                                                        <tr style={{ color: '#555' }}>
                                                                            <th style={{ padding: '10px', width: '30%', textAlign: 'left', borderBottom: '1px solid #eee' }}>Date</th>
                                                                            {mySubjects.map(sub => (
                                                                                <th key={sub} style={{ padding: '10px', whiteSpace: 'nowrap', borderBottom: '1px solid #eee', fontWeight: 'normal' }}>
                                                                                    {sub.length > 10 ? sub.substring(0, 10) + '..' : sub}
                                                                                </th>
                                                                            ))}
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {Object.entries(daysData).map(([dateStr, subjects]) => (
                                                                            <tr key={dateStr} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                                                                <td style={{ padding: '12px 10px', textAlign: 'left', fontWeight: 'bold', color: '#333' }}>{dateStr}</td>
                                                                                {mySubjects.map(sub => {
                                                                                    const status = subjects[sub];
                                                                                    const icon = status === 'Present' ? '✅' : status === 'Absent' ? '❌' : status === 'Leave' ? '🛌' : '-';
                                                                                    return <td key={sub} style={{ padding: '12px 10px' }}>{icon}</td>
                                                                                })}
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </>
                                            )
                                        })()}
                                    </>
                                )}
                            </div>
                        )}

                        {currentTab === 'room' && (
                            <>
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
                                    <button onClick={() => setRoomSubTab('schedule')} style={subTabBtn(roomSubTab === 'schedule')}>ROOM SCHEDULE</button>
                                    <button onClick={() => setRoomSubTab('free')} style={subTabBtn(roomSubTab === 'free')}>FREE ROOM</button>
                                </div>

                                {roomSubTab === 'schedule' && (
                                    <div style={whiteCard}>
                                        <input type="text" placeholder="🔍 Search room..." value={roomSearch} onChange={e => setRoomSearch(e.target.value)} style={searchInput} />
                                        <select value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)} style={selectStyle}>
                                            <option value="">-- Select Room --</option>
                                            {allRooms.filter(r => r.toLowerCase().includes(roomSearch.toLowerCase())).map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                        
                                        <div style={{...dayFilter, marginTop: '10px', marginBottom: '20px'}}>
                                            {filterDays.map(day => (
                                                <button key={day} onClick={() => setSelectedDay(day)} style={{...dayBtnStyle(selectedDay === day), background: selectedDay === day ? '#002147' : '#f8f9fa'}}>{day}</button>
                                            ))}
                                        </div>

                                        {selectedRoom && renderClassCards(roomSchedule, 'room')}
                                    </div>
                                )}

                                {roomSubTab === 'free' && (
                                    <div style={whiteCard}>
                                        <h4 style={{ marginTop: 0, fontSize: '0.9rem', color: '#555' }}>Strictly finds rooms freed by cancellation</h4>
                                        <select value={freeDay} onChange={e => setFreeDay(e.target.value)} style={selectStyle}>
                                            {days.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <select value={freeStart} onChange={e => setFreeStart(e.target.value)} style={{ ...selectStyle, flex: 1 }}>
                                                <option value="" disabled>Start Time</option>
                                                {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                            <select value={freeEnd} onChange={e => setFreeEnd(e.target.value)} style={{ ...selectStyle, flex: 1 }}>
                                                <option value="" disabled>End Time</option>
                                                {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                        <button onClick={searchFreeRooms} style={searchBtn}>SEARCH FREE ROOMS</button>

                                        {searchedFreeRooms !== null && (
                                            <div style={{ marginTop: '15px' }}>
                                                {searchedFreeRooms.length > 0 ? searchedFreeRooms.map(r => (
                                                    <div key={r} style={freeRoomItem}>✅ Room {r} is FREE (Class Cancelled)</div>
                                                )) : <div style={emptyState}>No rooms were cancelled during this time slot.</div>}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        {currentTab === 'teacher' && (
                            <div style={whiteCard}>
                                <input type="text" placeholder="🔍 Search teacher name..." value={teacherSearch} onChange={e => setTeacherSearch(e.target.value)} style={searchInput} />
                                <select value={selectedTeacher} onChange={e => setSelectedTeacher(e.target.value)} style={selectStyle}>
                                    <option value="">-- Select Teacher --</option>
                                    {allTeachers.filter(t => t.toLowerCase().includes(teacherSearch.toLowerCase())).map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                
                                <div style={{...dayFilter, marginTop: '10px', marginBottom: '20px'}}>
                                    {filterDays.map(day => (
                                        <button key={day} onClick={() => setSelectedDay(day)} style={{...dayBtnStyle(selectedDay === day), background: selectedDay === day ? '#002147' : '#f8f9fa'}}>{day}</button>
                                    ))}
                                </div>

                                {selectedTeacher && (
                                    <>
                                        <a href={getTeacherWhatsAppLink(selectedTeacher)} target="_blank" rel="noreferrer" style={whatsappBtn}>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.592 2.654-.696c1.001.572 2.135.881 3.288.881 3.181 0 5.767-2.587 5.768-5.766.001-3.181-2.585-5.764-5.242-5.764zm12 5.766c0 6.627-5.373 12-12 12s-12-5.373-12-12 5.373-12 12-12 12 5.373 12 12zm-4.322 3.012c-.255-.128-1.509-.745-1.742-.83-.233-.085-.403-.127-.573.128-.17.255-.658.83-.807 1.002-.149.17-.297.191-.552.063-.255-.127-1.077-.397-2.053-1.266-.757-.674-1.268-1.507-1.416-1.762-.149-.255-.016-.393.111-.52.115-.114.255-.297.382-.446.128-.148.17-.255.255-.425.085-.17.043-.319-.021-.446-.064-.128-.573-1.382-.786-1.892-.208-.497-.419-.43-.573-.438-.149-.008-.319-.008-.489-.008-.17 0-.446.064-.679.319-.234.255-.893.872-.893 2.126 0 1.254.914 2.466 1.042 2.636.128.17 1.799 2.747 4.359 3.853.609.263 1.085.42 1.458.538.618.196 1.181.168 1.628.102.497-.073 1.509-.617 1.722-1.212.212-.595.212-1.105.149-1.212-.064-.107-.234-.17-.489-.298z" /></svg>
                                            Contact {selectedTeacher}
                                        </a>
                                        {renderClassCards(teacherSchedule, 'teacher')}
                                    </>
                                )}
                            </div>
                        )}

                        {currentTab === 'announcements' && !isGuestUser && (
                            <div>
                                <div style={{ display: 'flex', gap: '5px', marginBottom: '15px' }}>
                                    {['Last Week', 'Last 15 Days', 'Last Month', 'All'].map(f => (
                                        <button key={f} onClick={() => setUpdatesFilter(f)} style={{ flex: 1, padding: '8px', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '5px', border: '1px solid #dee2e6', background: updatesFilter === f ? '#002147' : '#fff', color: updatesFilter === f ? '#F2A900' : '#555' }}>{f}</button>
                                    ))}
                                </div>

                                {getFilteredAnnouncements().length === 0 ? (
                                    <div style={emptyState}>No updates found for the selected filter.</div>
                                ) : (
                                    getFilteredAnnouncements().map(ann => {
                                        const isExpanded = expandedAssignmentId === ann.id;
                                        const deadlineDate = ann.deadline_date ? new Date(ann.deadline_date) : null;
                                        
                                        let timeRemainingDisplay = null;
                                        let isExpired = false;

                                        if (deadlineDate && ann.deadline_time) {
                                            const dm = parseTime(ann.deadline_time);
                                            deadlineDate.setHours(Math.floor(dm / 60), dm % 60, 0, 0);
                                            
                                            const diffMs = deadlineDate - currentTime;
                                            
                                            if (diffMs > 0) {
                                                const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                                const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
                                                const mins = Math.floor((diffMs / 1000 / 60) % 60);
                                                timeRemainingDisplay = `${days > 0 ? days + 'd ' : ''}${hours}h ${mins}m`;
                                            } else {
                                                isExpired = true;
                                            }
                                        }

                                        return (
                                            <div 
                                                key={ann.id} 
                                                onClick={() => setExpandedAssignmentId(isExpanded ? null : ann.id)}
                                                style={{ cursor: 'pointer', background: 'white', padding: '15px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '15px', borderLeft: `5px solid #007bff`, transition: 'background 0.2s' }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#666', textTransform: 'uppercase' }}>
                                                        {ann.subject}
                                                    </span>
                                                    <span style={{ color: '#002147', fontWeight: 'bold', fontSize: '1.2rem', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}>
                                                        ▼
                                                    </span>
                                                </div>

                                                <h4 style={{ margin: '0 0 5px 0', fontSize: '1.05rem', color: '#000' }}>{ann.topics}</h4>
                                                
                                                {ann.type === 'assignment' && deadlineDate && (
                                                    <div style={{ marginTop: '10px' }}>
                                                        <div style={{ background: isExpired ? '#f8d7da' : '#fff3cd', color: isExpired ? '#721c24' : '#856404', padding: '8px 12px', borderRadius: '5px', fontSize: '0.85rem', fontWeight: 'bold', display: 'inline-block' }}>
                                                            {isExpired ? `❌ Deadline Passed` : `⏳ Time Remaining: ${timeRemainingDisplay}`}
                                                        </div>
                                                    </div>
                                                )}

                                                {isExpanded && (
                                                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #eee', animation: 'fadeIn 0.2s ease' }}>
                                                        <div style={{ fontSize: '0.75rem', color: '#999', marginBottom: '8px' }}>Posted: {new Date(ann.created_at).toLocaleDateString()}</div>
                                                        <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#444', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>{ann.details}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            <footer style={footerStyle}>
                Made with ❤️ by <a href="http://wa.me/923053296062" target="_blank" rel="noreferrer" style={{ color: '#002147', fontWeight: '900', textDecoration: 'none' }}>Mohsin | Muntaha | Waleeja | Nazakat — BSAI 3RD 3M</a> 
            </footer>
        </div>
    );
}

// STYLES
const welcomeBg = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: '#002147', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000 };
const welcomeCard = { background: '#fff', padding: '30px', borderRadius: '15px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', boxSizing: 'border-box' };
const bigBtn = { width: '100%', padding: '15px', background: '#F2A900', border: 'none', borderRadius: '8px', fontWeight: 900, color: '#002147', cursor: 'pointer' };
const headerStyle = { background: '#002147', color: '#F2A900', padding: '18px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 1000, boxShadow: '0 2px 10px rgba(0,0,0,0.2)', flexWrap: 'wrap' };
const changeBtn = { background: 'transparent', color: '#fff', border: '1px solid #fff', borderRadius: '5px', padding: '6px 8px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' };
const redDot = { position: 'absolute', top: '-2px', right: '-2px', width: '10px', height: '10px', background: 'red', borderRadius: '50%', border: '2px solid #002147' };
const newsRedDot = { position: 'absolute', top: '5px', right: '5px', width: '8px', height: '8px', background: 'red', borderRadius: '50%' };
const tabBar = { background: '#fff', padding: '8px 6px', gap: '6px', position: 'sticky', top: '60px', zIndex: 999, boxShadow: '0 2px 5px rgba(0,0,0,0.05)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' };
const tabBtn = (active) => ({ flex: 1, minWidth: '95px', padding: '12px 5px', border: 'none', background: active ? '#002147' : '#f0f2f5', color: active ? '#F2A900' : '#666', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 0.2s', position: 'relative' });
const subTabBtn = (active) => ({ flex: 1, padding: '10px', border: 'none', background: active ? '#F2A900' : '#e9ecef', color: active ? '#002147' : '#555', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' });
const dayFilter = { display: 'flex', gap: '6px', marginBottom: '15px', overflowX: 'auto', paddingBottom: '5px', WebkitOverflowScrolling: 'touch' };
const dayBtnStyle = (active) => ({ flex: 1, minWidth: '45px', padding: '8px', borderRadius: '8px', border: 'none', background: active ? '#002147' : '#fff', color: active ? '#F2A900' : '#555', fontWeight: 'bold', fontSize: '0.75rem', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' });
const dayHeaderStrip = { background: '#002147', color: '#F2A900', padding: '8px 15px', borderRadius: '8px', fontWeight: 900, marginBottom: '10px', textTransform: 'uppercase', fontSize: '0.85rem' };
const selectStyle = { width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px', border: '2px solid #dee2e6', fontSize: '0.9rem', background: '#fff', outline: 'none', boxSizing: 'border-box' };
const searchInput = { width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px', border: '2px solid #dee2e6', fontSize: '0.9rem', background: '#fff', outline: 'none', boxSizing: 'border-box' };
const cardBase = { padding: '12px', borderRadius: '10px' };
const notifCard = { background: '#fff', padding: '12px', borderRadius: '8px', marginBottom: '10px', borderLeft: '4px solid #dc3545', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' };
const whiteCard = { background: '#fff', padding: '15px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: '15px', borderTop: '4px solid #F2A900' };
const searchBtn = { width: '100%', padding: '14px', background: '#002147', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '5px', boxSizing: 'border-box' };
const markReadBtn = { background: '#e9ecef', border: 'none', padding: '6px 12px', borderRadius: '5px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', color: '#555' };
const freeRoomItem = { padding: '12px', borderBottom: '1px solid #eee', color: '#28a745', fontWeight: 'bold', fontSize: '0.85rem', background: '#f0fff4', borderRadius: '5px', marginBottom: '5px' };
const whatsappBtn = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: '#25D366', color: '#fff', padding: '12px 20px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', marginBottom: '20px', boxShadow: '0 4px 10px rgba(37, 211, 102, 0.2)' };
const emptyState = { textAlign: 'center', padding: '30px 10px', color: '#999', fontSize: '0.9rem' };
const centerStyle = { textAlign: 'center', marginTop: '50px', fontFamily: 'sans-serif' };
const footerStyle = { textAlign: 'center', padding: '20px', background: '#fff', color: '#666', borderTop: '1px solid #dee2e6', fontSize: '0.9rem', marginTop: 'auto' };
const notifBannerStyle = { background: '#002147', color: '#fff', padding: '12px 15px', borderRadius: '10px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', border: '2px solid #F2A900', gap: '10px' };
const enableBtnStyle = { background: '#F2A900', color: '#002147', border: 'none', padding: '8px 12px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' };
const pointStripStyle = { background: '#3f3f3f', color: '#fff', padding: '8px 12px', borderBottomLeftRadius: '10px', borderBottomRightRadius: '10px', display: 'flex', alignItems: 'center', fontSize: '0.8rem', fontWeight: 'bold', justifyContent: 'flex-start' };

// Sidebar Styles
const sidebarOverlay = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, animation: 'fadeIn 0.2s ease' };
const sidebarMenu = { width: '260px', height: '100%', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '2px 0 10px rgba(0,0,0,0.1)' };
const sidebarBtn = (active) => ({ width: '100%', textAlign: 'left', padding: '15px 20px', border: 'none', background: active ? '#f0f2f5' : '#fff', color: active ? '#002147' : '#555', borderLeft: active ? '5px solid #F2A900' : '5px solid transparent', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', borderBottom: '1px solid #eee' });
