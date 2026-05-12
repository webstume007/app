import { useEffect, useState, useRef } from 'react';
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

// --- Custom SVGs for UI ---
const SVGS = {
    tick: <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>,
    cross: <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>,
    minus: <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M20 12H4"></path></svg>,
    chevronDown: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>,
    chevronUp: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path></svg>,
    bell: <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>,
    whatsapp: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.592 2.654-.696c1.001.572 2.135.881 3.288.881 3.181 0 5.767-2.587 5.768-5.766.001-3.181-2.585-5.764-5.242-5.764zm12 5.766c0 6.627-5.373 12-12 12s-12-5.373-12-12 5.373-12 12-12 12 5.373 12 12zm-4.322 3.012c-.255-.128-1.509-.745-1.742-.83-.233-.085-.403-.127-.573.128-.17.255-.658.83-.807 1.002-.149.17-.297.191-.552.063-.255-.127-1.077-.397-2.053-1.266-.757-.674-1.268-1.507-1.416-1.762-.149-.255-.016-.393.111-.52.115-.114.255-.297.382-.446.128-.148.17-.255.255-.425.085-.17.043-.319-.021-.446-.064-.128-.573-1.382-.786-1.892-.208-.497-.419-.43-.573-.438-.149-.008-.319-.008-.489-.008-.17 0-.446.064-.679.319-.234.255-.893.872-.893 2.126 0 1.254.914 2.466 1.042 2.636.128.17 1.799 2.747 4.359 3.853.609.263 1.085.42 1.458.538.618.196 1.181.168 1.628.102.497-.073 1.509-.617 1.722-1.212.212-.595.212-1.105.149-1.212-.064-.107-.234-.17-.489-.298z" /></svg>,
    calendar: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2"/><line x1="16" y1="2" x2="16" y2="6" strokeWidth="2"/><line x1="8" y1="2" x2="8" y2="6" strokeWidth="2"/></svg>,
    attendance: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>,
    updates: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"></path></svg>,
    clock: <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth="2"/><polyline points="12 6 12 12 16 14" strokeWidth="2"/></svg>,
    alertCircle: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth="2"/><line x1="12" y1="8" x2="12" y2="12" strokeWidth="2" strokeLinecap="round"/><line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="3" strokeLinecap="round"/></svg>,
    door: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M18 20V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16M2 20h20M14 12v.01" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    userTie: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="7" r="4" strokeWidth="2"/><path d="M12 11v10" strokeWidth="2" strokeLinecap="round"/></svg>,
    bus: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h8M8 11h8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2zM8 19v2a1 1 0 01-2 0v-2M18 19v2a1 1 0 01-2 0v-2"></path></svg>
};

export default function Home() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    
    // Core Data States
    const [dropdownMeta, setDropdownMeta] = useState({ sessions: [], rooms: [], baseMeta: [] });
    const [rawData, setRawData] = useState([]);
    const [exceptions, setExceptions] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [pointsData, setPointsData] = useState([]); 
    const [announcements, setAnnouncements] = useState([]); 
    const [teachersData, setTeachersData] = useState([]); 
    const [contactsData, setContactsData] = useState([]); 
    const [loading, setLoading] = useState(true);

    const [studentsData, setStudentsData] = useState([]);
    const [attSessions, setAttSessions] = useState([]);
    const [attRecords, setAttRecords] = useState([]);

    const [userSection, setUserSection] = useState(null);
    const [isFirstVisit, setIsFirstVisit] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date()); 
    const [readNotifIds, setReadNotifIds] = useState([]);
    const [myRollNumber, setMyRollNumber] = useState(null);

    const notifiedDeadlines = useRef(new Set());

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
    const [expandedContactId, setExpandedContactId] = useState(null); 

    const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

    const [freeDay, setFreeDay] = useState('MON');
    const [freeStart, setFreeStart] = useState('8:00 AM');
    const [freeEnd, setFreeEnd] = useState('9:00 AM');
    const [searchedFreeRooms, setSearchedFreeRooms] = useState(null);

    const [teacherSearch, setTeacherSearch] = useState('');
    const [selectedTeacher, setSelectedTeacher] = useState('');
    const [roomSearch, setRoomSearch] = useState('');
    const [selectedRoom, setSelectedRoom] = useState('');

    const [attSearch, setAttSearch] = useState('');
    const [selectedRollInput, setSelectedRollInput] = useState('');
    const [attFilter, setAttFilter] = useState('All'); 
    const [updatesFilter, setUpdatesFilter] = useState('Last Month');
    const [selectedAttSubject, setSelectedAttSubject] = useState(''); 

    // Offline / Connectivity States
    const [isOffline, setIsOffline] = useState(false);
    const [lastUpdated, setLastUpdated] = useState('Unknown');

    // Transport Tab State
    const [isSatTransport, setIsSatTransport] = useState(false);

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

    // Offline Event Listeners
    useEffect(() => {
        setIsOffline(!navigator.onLine);
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => { 
            window.removeEventListener('online', handleOnline); 
            window.removeEventListener('offline', handleOffline); 
        };
    }, []);

    // --- Dynamic Target Fetchers ---
    const [loadedTeachers, setLoadedTeachers] = useState(new Set());
    useEffect(() => {
        if (selectedTeacher && !loadedTeachers.has(selectedTeacher)) {
            const fetchTS = async () => {
                const { data } = await supabase.from('base_schedule').select('*').eq('teacher', selectedTeacher);
                if (data && data.length > 0) {
                    setRawData(prev => {
                        const exist = new Set(prev.map(p => p.id));
                        return [...prev, ...data.filter(d => !exist.has(d.id))];
                    });
                    const ids = data.map(d => d.id);
                    const { data: excData } = await supabase.from('schedule_exceptions').select('*').in('base_schedule_id', ids);
                    if (excData) {
                        setExceptions(prev => {
                            const exist = new Set(prev.map(p => p.id));
                            return [...prev, ...excData.filter(d => !exist.has(d.id))];
                        });
                    }
                    setLoadedTeachers(prev => new Set(prev).add(selectedTeacher));
                }
            };
            fetchTS();
        }
    }, [selectedTeacher]);

    const [loadedRooms, setLoadedRooms] = useState(new Set());
    useEffect(() => {
        if (selectedRoom && !loadedRooms.has(selectedRoom)) {
            const fetchRS = async () => {
                const { data } = await supabase.from('base_schedule').select('*').eq('room', selectedRoom);
                if (data && data.length > 0) {
                    setRawData(prev => {
                        const exist = new Set(prev.map(p => p.id));
                        return [...prev, ...data.filter(d => !exist.has(d.id))];
                    });
                    const ids = data.map(d => d.id);
                    const { data: excData } = await supabase.from('schedule_exceptions').select('*').in('base_schedule_id', ids);
                    if (excData) {
                        setExceptions(prev => {
                            const exist = new Set(prev.map(p => p.id));
                            return [...prev, ...excData.filter(d => !exist.has(d.id))];
                        });
                    }
                    setLoadedRooms(prev => new Set(prev).add(selectedRoom));
                }
            };
            fetchRS();
        }
    }, [selectedRoom]);

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        // Hydrate from LocalStorage
        const savedOffline = localStorage.getItem('iub_offline_data');
        if (savedOffline) {
            try {
                const parsed = JSON.parse(savedOffline);
                if (parsed.rawData) setRawData(parsed.rawData);
                if (parsed.notifications) setNotifications(parsed.notifications);
                if (parsed.announcements) setAnnouncements(parsed.announcements);
                if (parsed.pointsData) setPointsData(parsed.pointsData);
                if (parsed.lastUpdated) setLastUpdated(parsed.lastUpdated);
            } catch(e) {}
        }

        const savedSelection = localStorage.getItem('iub_user_selection');
        if (savedSelection) {
            const parsed = JSON.parse(savedSelection);
            if (parsed.semester && !parsed.session) parsed.session = parsed.semester;
            setUserSection(parsed);
            setIsFirstVisit(false);
            if (parsed.section === 'GUEST') setCurrentTab('room');
        }

        const savedReadNotifs = localStorage.getItem('iub_read_notifs');
        if (savedReadNotifs) setReadNotifIds(JSON.parse(savedReadNotifs));

        const savedRoll = localStorage.getItem('iub_my_roll');
        if (savedRoll) setMyRollNumber(savedRoll);

        if ("Notification" in window && Notification.permission === "default") {
            setShowNotifBanner(true);
        }

        fetchLiveSchedule();
    }, []);

    // 2-Hour Popup Notification and Alerts Tracker
    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            setCurrentTime(now);

            announcements.forEach(ann => {
                if (ann.type === 'assignment' && ann.deadline_date && ann.deadline_time) {
                    const deadlineDate = new Date(ann.deadline_date);
                    const deadlineMins = parseTime(ann.deadline_time);
                    deadlineDate.setHours(Math.floor(deadlineMins / 60), deadlineMins % 60, 0, 0);
                    
                    const diffMins = Math.floor((deadlineDate - now) / 60000);
                    
                    // Exact match for 2 Hours (120 mins)
                    if (diffMins === 120 && !notifiedDeadlines.current.has(ann.id)) {
                        notifiedDeadlines.current.add(ann.id);
                        
                        const msg = `⏰ DEADLINE ALERT: Only 2 hours left for ${ann.subject} Assignment (${ann.topics}).`;
                        
                        setNotifications(prev => [{ id: Date.now(), message: msg, created_at: new Date().toISOString() }, ...prev]);
                        setShowAlerts(true); 
                        
                        if (Notification.permission === "granted") {
                            new Notification("Assignment Due Soon!", { body: msg, icon: "/icon.png" });
                        }
                    }
                }
            });
        }, 60000);
        return () => clearInterval(timer);
    }, [announcements]);

    useEffect(() => {
        if (!userSection || userSection.section === 'GUEST') return;

        const channel = supabase
            .channel('student-dashboard-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, (payload) => {
                const msg = (payload.new?.message || payload.old?.message || "");
                const sem = getSemesterFromSession(userSection.session);
                
                const isGlobal = msg.includes('GLOBAL');
                const hasSection = msg.includes(userSection.section);
                const hasSession = msg.includes(userSection.session) || (sem && msg.includes(sem));

                if (isGlobal || (hasSection && hasSession)) {
                    if (payload.eventType === 'INSERT') {
                        if (Notification.permission === "granted") {
                            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                                navigator.serviceWorker.ready.then((reg) => {
                                    reg.showNotification("IUB Update Alert", { body: payload.new.message, icon: "/icon.png" });
                                });
                            } else {
                                new Notification("IUB Update Alert", { body: payload.new.message, icon: "/icon.png" });
                            }
                        }
                    }
                    setShowAlerts(true);
                    fetchLiveSchedule(); // Silent background refresh
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'class_announcements' }, (payload) => {
                const pnew = payload.new || payload.old || {};
                if (pnew.section === userSection.section && pnew.session === userSection.session) {
                    if (payload.eventType === 'INSERT') {
                        if (Notification.permission === "granted") {
                            new Notification("New Class Update", { body: `${pnew.subject}: ${pnew.topics}`, icon: "/icon.png" });
                        }
                    }
                    setShowAlerts(true);
                    fetchLiveSchedule(); // Silent background refresh
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'schedule_exceptions' }, () => {
                setLoadedRooms(new Set());
                setLoadedTeachers(new Set());
                fetchLiveSchedule(); // Silent background refresh
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [userSection]);

    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').then((reg) => console.log('SW Registered')).catch(console.error);
        }
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        });
    }, []);

    // --- Safe Pagination Engine for >1000 Rows ---
    const fetchAllRows = async (table, select = '*') => {
        let all = []; let from = 0; const step = 1000;
        while(true) {
            const { data, error } = await supabase.from(table).select(select).order('id', { ascending: true }).range(from, from + step - 1);
            if (error || !data || data.length === 0) break;
            all = [...all, ...data];
            if (data.length < step) break;
            from += step;
        }
        return { data: all };
    };

    const fetchLiveSchedule = async () => {
        const savedSelection = localStorage.getItem('iub_user_selection');
        let activeSession = null; let activeSection = null;
        if (savedSelection) {
            const parsed = JSON.parse(savedSelection);
            activeSession = parsed.session || parsed.semester;
            activeSection = parsed.section;
        }
        const savedRoll = localStorage.getItem('iub_my_roll');

        const { data: baseMeta } = await fetchAllRows('base_schedule', 'id, session, section, room, teacher');
        const uniqueSessions = [...new Set(baseMeta.map(x => x.session))].filter(Boolean);
        const uniqueRooms = [...new Set(baseMeta.map(x => x.room))].filter(Boolean).sort();
        setDropdownMeta({ sessions: uniqueSessions, rooms: uniqueRooms, baseMeta: baseMeta });

        let baseReq = Promise.resolve({ data: [] });
        let studentsReq = Promise.resolve({ data: [] });
        let annReq = Promise.resolve({ data: [] });

        if (activeSession && activeSection && activeSection !== 'GUEST') {
            baseReq = supabase.from('base_schedule').select('*').eq('session', activeSession).eq('section', activeSection);
            studentsReq = supabase.from('students').select('*').eq('session', activeSession).eq('section', activeSection);
            annReq = supabase.from('class_announcements').select('*').eq('session', activeSession).eq('section', activeSection).order('created_at', { ascending: false });
        }

        const [baseRes, notifRes, pointsRes, teachersRes, contactsRes, studentsRes, annRes] = await Promise.all([
            baseReq,
            supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(200),
            supabase.from('point_schedules').select('*'),
            supabase.from('teacher_profiles').select('name, phone'),
            fetchAllRows('contacts'), 
            studentsReq,
            annReq
        ]);

        const myScheduleData = baseRes.data || [];
        setRawData(myScheduleData); 
        
        if (myScheduleData.length > 0) {
            const ids = myScheduleData.map(c => c.id);
            const { data: excData } = await supabase.from('schedule_exceptions').select('*').in('base_schedule_id', ids);
            setExceptions(excData || []);
        }

        if (activeSession && activeSection && activeSection !== 'GUEST' && myScheduleData.length > 0) {
            const ids = myScheduleData.map(c => c.id);
            const { data: attSessData } = await supabase.from('attendance_sessions').select('*').in('base_schedule_id', ids);
            setAttSessions(attSessData || []);
        }

        if (savedRoll) {
            const { data: attRecData } = await supabase.from('attendance_records').select('*').eq('student_id', savedRoll);
            setAttRecords(attRecData || []);
        }

        setNotifications(notifRes.data || []);
        setPointsData(pointsRes.data || []); 
        setTeachersData(teachersRes.data || []);
        setContactsData(contactsRes.data || []);
        setStudentsData(studentsRes.data || []);
        setAnnouncements(annRes.data || []);
        
        // Cache data for offline viewing
        const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastUpdated(nowTime);
        localStorage.setItem('iub_offline_data', JSON.stringify({
            rawData: myScheduleData,
            notifications: notifRes.data || [],
            announcements: annRes.data || [],
            pointsData: pointsRes.data || [],
            lastUpdated: nowTime
        }));

        setLoading(false);
    };

    const handleInitialSelection = (sessionVal, secVal) => {
        const selection = { session: sessionVal, section: secVal };
        localStorage.setItem('iub_user_selection', JSON.stringify(selection));
        setUserSection(selection);
        setIsFirstVisit(false);
        setLoading(true);
        fetchLiveSchedule();
    };

    const handleGuestSelection = () => {
        const selection = { session: 'N/A', section: 'GUEST' };
        localStorage.setItem('iub_user_selection', JSON.stringify(selection));
        setUserSection(selection);
        setIsFirstVisit(false);
        setCurrentTab('room');
    };

    const handleRollSelectConfirm = async () => {
        if (!selectedRollInput) return;
        if (window.confirm(`Are you sure ${selectedRollInput} is your registration number?`)) {
            localStorage.setItem('iub_my_roll', selectedRollInput);
            setMyRollNumber(selectedRollInput);
            const { data } = await supabase.from('attendance_records').select('*').eq('student_id', selectedRollInput);
            if (data) setAttRecords(data);
        }
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

    const convertTo12Hour = (timeStr) => {
        if (!timeStr) return "";
        if (timeStr.toUpperCase().includes('AM') || timeStr.toUpperCase().includes('PM')) return timeStr;
        let [h, m] = timeStr.split(':').map(Number);
        const suffix = h >= 12 ? "PM" : "AM";
        h = h % 12 || 12;
        return `${h}:${m === 0 ? '00' : m < 10 ? '0' + m : m} ${suffix}`;
    };

    const availableSessions = dropdownMeta.sessions.sort((a, b) => {
        const semA = parseInt(getSemesterFromSession(a)) || 99;
        const semB = parseInt(getSemesterFromSession(b)) || 99;
        return semA - semB;
    });

    const getSectionsForSession = (sess) => [...new Set(dropdownMeta.baseMeta.filter(x => x.session === sess).map(x => x.section))].sort();
    
    const allTeachers = [...new Set([
        ...teachersData.map(x => x.name), 
        ...dropdownMeta.baseMeta.map(x => x.teacher)
    ])].filter(Boolean).sort();
    
    const allRooms = dropdownMeta.rooms;

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
        const validUp = pointsData.filter(p => p.route === 'AC_to_BJC' && p.is_saturday === isSat && parseDbTime(p.departure_time) <= targetUpMins).sort((a, b) => parseDbTime(b.departure_time) - parseDbTime(a.departure_time)); 
        const bestUp = validUp.length > 0 ? convertTo12Hour(validUp[0].departure_time.slice(0, 5)) : 'N/A';

        const targetDownMins = clsEndMins;
        const validDown = pointsData.filter(p => p.route === 'BJC_to_AC' && p.is_saturday === isSat && parseDbTime(p.departure_time) >= targetDownMins).sort((a, b) => parseDbTime(a.departure_time) - parseDbTime(b.departure_time)); 
        const bestDown = validDown.length > 0 ? convertTo12Hour(validDown[0].departure_time.slice(0, 5)) : 'N/A';

        return { up: bestUp, down: bestDown };
    };

    const searchFreeRooms = async () => {
        const sVal = parseTime(freeStart);
        const eVal = parseTime(freeEnd);
        if (sVal >= eVal) return alert("End time must be after start time");

        const { data: dayClasses } = await supabase.from('base_schedule').select('*').eq('day', freeDay);
        if (!dayClasses) return;

        const ids = dayClasses.map(c => c.id);
        const { data: excData } = await supabase.from('schedule_exceptions').select('*').in('base_schedule_id', ids);

        const strictlyCancelledClasses = dayClasses.filter(cls => {
            const overlaps = (sVal < parseTime(cls.end_time) && eVal > parseTime(cls.start_time));
            if (!overlaps) return false;
            const todayStr = new Date().toLocaleDateString('en-CA');
            const exc = (excData || []).filter(e => String(e.base_schedule_id) === String(cls.id) && e.exception_date >= todayStr)[0];
            return exc?.status === 'cancelled';
        });

        setSearchedFreeRooms([...new Set(strictlyCancelledClasses.map(c => c.room))]);
    };

    const forceNotificationPermission = async () => {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            setShowNotifBanner(false);
            new Notification("Notifications Enabled!", { body: "You will now receive IUB alerts." });
        }
    };

    const relevantNotifs = notifications.filter(n => {
        const msg = n.message || "";
        const sem = getSemesterFromSession(userSection?.session);
        const isGlobal = msg.includes('GLOBAL');
        const hasSection = msg.includes(userSection?.section);
        const hasSession = msg.includes(userSection?.session) || (sem && msg.includes(sem));

        return (isGlobal || (hasSection && hasSession)) && !readNotifIds.includes(n.id);
    });

    const handleMarkAsRead = () => {
        const newReadIds = [...readNotifIds, ...relevantNotifs.map(n => n.id)];
        setReadNotifIds(newReadIds);
        localStorage.setItem('iub_read_notifs', JSON.stringify(newReadIds));
    };

    const relevantAnnouncements = announcements.filter(a => a.section === userSection?.section && a.session === userSection?.session);
    const sectionStudents = studentsData.filter(s => s.section === userSection?.section && s.session === userSection?.session);

    const getFilteredAnnouncements = () => {
        let filtered = relevantAnnouncements;
        if (updatesFilter !== 'All') {
            const now = new Date();
            const daysMap = { 'Last Week': 7, '15 Days': 15, 'Last Month': 30 };
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

    const generateWaLink = (phone, defaultText) => {
        if(!phone) return `https://wa.me/?text=${encodeURIComponent(defaultText)}`;
        let p = String(phone).replace(/\D/g, '');
        if(p.startsWith('0')) p = '92' + p.substring(1);
        return `https://wa.me/${p}?text=${encodeURIComponent(defaultText)}`;
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
        if (filterKey === 'section') classes = classes.filter(c => c.session === userSection?.session);
        if (selectedDay !== 'ALL') classes = classes.filter(c => c.day === selectedDay);
        return classes; 
    };

    const mySchedule = getFilteredClasses('section', userSection?.section);
    const teacherSchedule = getFilteredClasses('teacher', selectedTeacher);
    const roomSchedule = getFilteredClasses('room', selectedRoom);

    // --- ATTENDANCE LOGIC ---
    const getFilteredAttendance = () => {
        const myClasses = rawData.filter(c => c.section === userSection?.section && c.session === userSection?.session);
        const mySubjects = [...new Set(myClasses.map(c => c.course))];
        
        let allValidSessions = attSessions.filter(sess => myClasses.some(c => c.id === sess.base_schedule_id));
        let validSessions = allValidSessions;
        
        if (attFilter !== 'All') {
            const now = new Date();
            const daysMap = { 'Last Week': 7, 'Last Month': 30 };
            const ms = daysMap[attFilter] * 24 * 60 * 60 * 1000;
            validSessions = validSessions.filter(s => (now - new Date(s.session_date)) <= ms);
        }

        const subjectStats = mySubjects.map(sub => {
            const subClassIds = myClasses.filter(c => c.course === sub).map(c => c.id);
            const subSessions = allValidSessions.filter(s => subClassIds.includes(s.base_schedule_id));
            
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

        return { subjectStats, validSessions, allValidSessions, mySubjects, myClasses };
    };

    const CircularProgress = ({ percentage, subject, isOverall = false }) => {
        const radius = isOverall ? 40 : 30;
        const circumference = 2 * Math.PI * radius;
        const strokeDashoffset = circumference - (percentage / 100) * circumference;
        let color = percentage < 50 ? '#dc3545' : percentage < 80 ? '#ffc107' : '#28a745';
        const size = isOverall ? 90 : 70;

        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '8px' }}>
                <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx="50" cy="50" r={radius} stroke="#e9ecef" strokeWidth="8" fill="transparent" />
                        <circle cx="50" cy="50" r={radius} stroke={color} strokeWidth="8" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }} />
                    </svg>
                    <span style={{ position: 'absolute', fontWeight: 'bold', fontSize: isOverall ? '1rem' : '0.8rem', color: '#002147' }}>
                        {Math.round(percentage)}%
                    </span>
                </div>
                <div style={{ fontSize: isOverall ? '0.75rem' : '0.65rem', marginTop: '6px', fontWeight: 'bold', color: '#555', textAlign: 'center', maxWidth: isOverall ? '90px' : '75px', lineHeight: '1.2' }}>
                    {subject}
                </div>
            </div>
        );
    };

    const StatusBadge = ({ status }) => {
        let bg = '#d4edda', color = '#155724', icon = SVGS.tick;
        if (status === 'Absent') { bg = '#f8d7da'; color = '#721c24'; icon = SVGS.cross; }
        else if (status === 'Leave') { bg = '#e2e8f0'; color = '#334155'; icon = SVGS.minus; }

        return (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: bg, color: color, padding: '3px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>
                {icon} {status}
            </span>
        );
    };

    const renderClassCards = (scheduleList, displayContext) => {
        if (displayContext === 'class' && userSection?.section === 'GUEST') {
            return (
                <div style={{...whiteCard, textAlign: 'center', color: '#666', marginTop: '20px'}}>
                    <p style={{fontSize: '1rem', fontWeight: 'bold', color: '#002147'}}>👤 Guest Mode Active</p>
                    <p style={{fontSize: '0.8rem'}}>You can search for Teacher schedules and Free Rooms above.</p>
                    <p style={{fontSize: '0.8rem'}}>To view a personalized schedule, click <b>"Change Section"</b>.</p>
                </div>
            );
        }

        if (scheduleList.length === 0) return <div style={emptyState}>No classes scheduled.</div>;
        const daysToRender = selectedDay === 'ALL' ? days : [selectedDay];

        return daysToRender.map(day => {
            const dayClasses = scheduleList.filter(c => c.day === day).sort((a, b) => parseTime(a.start_time) - parseTime(b.start_time));
            if (dayClasses.length === 0) return null;

            return (
                <div key={day} style={{ marginBottom: '20px' }}>
                    <div style={dayHeaderStrip}>{day}</div>
                    {dayClasses.map((cls, idx) => {
                        const status = getStatusStyles(cls);
                        const points = getNearestPoints(cls); 
                        const bgCol = status ? status.bg : '#fff';
                        const borderCol = status ? status.border : '#F2A900';

                        const activeSubjectAssignments = activeAssignments.filter(a => a.subject === cls.course && a.section === cls.section);
                        const isContactExpanded = expandedContactId === cls.id;

                        let teacherContactNumber = null;
                        const teacherFromContacts = contactsData.find(c => c.role && c.role.toLowerCase() === 'teacher' && c.name === cls.teacher);
                        if (teacherFromContacts && teacherFromContacts.contact) {
                            teacherContactNumber = teacherFromContacts.contact;
                        } else {
                            const teacherFromProfiles = teachersData.find(t => t.name === cls.teacher);
                            if (teacherFromProfiles && teacherFromProfiles.phone) teacherContactNumber = teacherFromProfiles.phone;
                        }

                        const crContact = contactsData.find(c => 
                            c.role && c.role.toLowerCase().includes('cr') && 
                            c.session?.trim().toLowerCase() === cls.session?.trim().toLowerCase() && 
                            c.section?.trim().toLowerCase() === cls.section?.trim().toLowerCase()
                        );

                        return (
                            <div key={idx} style={{ marginBottom: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.04)', borderRadius: '10px', overflow: 'hidden', border: '1px solid #eee' }}>
                                <div 
                                    onClick={() => setExpandedContactId(isContactExpanded ? null : cls.id)}
                                    style={{ ...cardBase, marginBottom: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, boxShadow: 'none', background: bgCol, borderLeft: `5px solid ${borderCol}`, cursor: 'pointer' }}
                                >
                                    <div style={{ fontWeight: 900, color: '#002147', fontSize: '0.75rem' }}>🕒 {convertTo12Hour(cls.start_time)} - {convertTo12Hour(cls.end_time)}</div>
                                    <div style={{ fontWeight: 'bold', fontSize: '1rem', margin: '4px 0', color: '#111827' }}>{cls.course}</div>
                                    <div style={{ color: '#555', fontSize: '0.7rem' }}>
                                        {displayContext !== 'room' && <span>📍 Room: {cls.room} | </span>}
                                        {displayContext !== 'teacher' && <span>👨‍🏫 {cls.teacher} | </span>}
                                        <span>👥 {getSemesterFromSession(cls.session)}-{cls.section}</span>
                                    </div>
                                    {status && <div style={{ marginTop: '8px', fontSize: '0.65rem', fontWeight: 'bold', color: status.color, textTransform: 'uppercase' }}>● {status.label}</div>}
                                </div>
                                
                                {activeSubjectAssignments.length > 0 && (
                                    <div 
                                        onClick={(e) => { e.stopPropagation(); setExpandedAssignmentId(expandedAssignmentId === cls.id ? null : cls.id); }}
                                        style={{ background: '#fff9e6', borderTop: '1px solid #fde68a', borderLeft: '5px solid #F2A900', padding: '8px 12px', cursor: 'pointer' }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', border: '1px solid #F2A900', borderRadius: '20px', padding: '2px 8px', fontSize: '0.6rem' }}>
                                                <span style={{ fontWeight: '900', color: '#b27b00' }}>ASSIGNMENT</span>
                                                <span style={{ color: '#ccc' }}>|</span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#856404', fontWeight: 'bold' }}>
                                                    {SVGS.clock} Due: {getTimeRemainingStr(activeSubjectAssignments[0]) || 'Soon'}
                                                </span>
                                            </div>
                                            <div style={{ color: '#b27b00' }}>
                                                {expandedAssignmentId === cls.id ? SVGS.chevronUp : SVGS.chevronDown}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {expandedAssignmentId === cls.id && activeSubjectAssignments.length > 0 && (
                                    <div className="expand-anim" style={{ background: '#fff9e6', borderLeft: '5px solid #F2A900', padding: '0 12px 10px 12px' }}>
                                        {activeSubjectAssignments.map(ann => (
                                            <div key={ann.id} style={{ marginBottom: '8px', paddingTop: '8px', borderTop: '1px dashed #fde68a' }}>
                                                <div style={{ fontWeight: 'bold', color: '#002147', fontSize: '0.8rem' }}>📝 {ann.topics}</div>
                                                <div style={{ color: '#444', fontSize: '0.75rem', marginTop: '4px', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>{ann.details}</div>
                                                <div style={{ fontSize: '0.65rem', color: '#b27b00', marginTop: '6px', fontWeight: 'bold' }}>
                                                    Deadline: {new Date(ann.deadline_date).toLocaleDateString()} at {convertTo12Hour(ann.deadline_time)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div style={pointStripStyle}>
                                    <span style={{ fontWeight: 900, marginRight: '8px', color: '#ccc' }}>Nearest Points:</span>
                                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="#28a745"><path d="M12 2L4 10h5v12h6V10h5L12 2z"/></svg>
                                            {points.up}
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="#007bff"><path d="M12 22l8-8h-5V2h-6v12H4l8 8z"/></svg>
                                            {points.down}
                                        </span>
                                    </div>
                                </div>

                                {isContactExpanded && (
                                    <div className="expand-anim" style={{ padding: '12px', background: '#f8f9fa', borderTop: '1px solid #eee' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {teacherContactNumber ? (
                                                <a href={generateWaLink(teacherContactNumber, `Salam Sir/Mam ${cls.teacher}`)} target="_blank" rel="noreferrer" style={contactBtnStyle}>
                                                    {SVGS.whatsapp} Contact Teacher: {cls.teacher}
                                                </a>
                                            ) : (
                                                <div style={{...contactBtnStyle, background: '#e2e8f0', color: '#64748b', cursor: 'not-allowed', boxShadow: 'none'}}>{SVGS.whatsapp} Contact Teacher: N/A</div>
                                            )}
                                            
                                            {crContact && crContact.contact && (
                                                <a href={generateWaLink(crContact.contact, `Salam ${crContact.name}`)} target="_blank" rel="noreferrer" style={{...contactBtnStyle, background: '#002147', color: '#F2A900'}}>
                                                    {SVGS.whatsapp} Contact CR: {crContact.name}
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}
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

    if (loading) {
        return (
            <div style={{ ...welcomeBg, flexDirection: 'column', gap: '20px' }}>
                <Head><title>Loading | IUB Assistant</title></Head>
                <div className="custom-spinner"></div>
                <h2 style={{ color: '#F2A900', margin: 0, fontSize: '1.2rem', animation: 'pulseText 1.5s infinite ease-in-out' }}>
                    Fetching IUB Data...
                </h2>
                <style>{`
                    .custom-spinner { width: 45px; height: 45px; border: 4px solid rgba(255, 255, 255, 0.1); border-left-color: #F2A900; border-radius: 50%; animation: spin 1s linear infinite; }
                    @keyframes spin { to { transform: rotate(360deg); } }
                    @keyframes pulseText { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
                `}</style>
            </div>
        );
    }

    if (isFirstVisit) {
        return (
            <div style={welcomeBg}>
                <div style={welcomeCard}>
                    <h2 style={{ color: '#002147', margin: '0 0 10px 0', fontSize: '1.2rem' }}>Welcome to IUB Assistant! 👋</h2>
                    <p style={{ color: '#666', fontSize: '0.8rem', marginBottom: '15px' }}>Select your section for a personalized schedule.</p>

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
                        
                        <div style={{color: '#999', fontSize: '0.7rem'}}>— OR —</div>
                        <button onClick={handleGuestSelection} style={{ ...bigBtn, background: '#e2e8f0', color: '#334155' }}>Continue as Guest</button>
                    </div>
                </div>
            </div>
        );
    }

    const isGuestUser = userSection?.section === 'GUEST';

    const allTabs = [
        { id: 'class', label: 'SCHEDULE', icon: SVGS.calendar },
        { id: 'attendance', label: 'ATTENDANCE', icon: SVGS.attendance },
        { id: 'announcements', label: 'UPDATES', icon: SVGS.updates },
        { id: 'room', label: 'ROOMS', icon: SVGS.door },
        { id: 'teacher', label: 'TEACHERS', icon: SVGS.userTie },
        { id: 'transport', label: 'TRANSPORT', icon: SVGS.bus }
    ];
    
    // Guest doesn't see classes, attendance, or updates
    const availableTabs = isGuestUser ? allTabs.filter(t => ['room', 'teacher', 'transport'].includes(t.id)) : allTabs;

    return (
        <div style={{ backgroundColor: '#f0f2f5', minHeight: '100vh', fontFamily: "'Roboto', sans-serif", display: 'flex', flexDirection: 'column' }}>
            <Head>
                <title>My Schedule | IUB AI</title>
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
                <meta name="theme-color" content="#002147" />
            </Head>

            <style>{`
                .desktop-nav { display: none; }
                .mobile-nav { display: flex; }
                @media (min-width: 768px) {
                    .desktop-nav { display: flex; align-items: center; gap: 15px; }
                    .mobile-nav { display: none !important; }
                    .hamburger-btn { display: none !important; }
                    .desktop-hide { display: none !important; }
                }
                @media (max-width: 767px) {
                    .mobile-hide { display: none !important; }
                }
                .scroll-hide::-webkit-scrollbar { display: none; }
                
                @keyframes fadeInSlide {
                    from { opacity: 0; transform: translateY(-5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .expand-anim { animation: fadeInSlide 0.3s ease forwards; }
            `}</style>

            <header style={headerStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div className="hamburger-btn" onClick={() => setIsSidebarOpen(true)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#F2A900">
                            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
                        </svg>
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '1.2rem' }}>🎓</span> 
                        {isOffline ? 'IUB ASSISTANT' : (isGuestUser ? 'GUEST' : `${getSemesterFromSession(userSection?.session)} • ${userSection?.section}`)}
                    </div>
                </div>

                <div className="desktop-nav">
                    {availableTabs.map(tab => (
                        <div 
                            key={tab.id} 
                            onClick={() => { setCurrentTab(tab.id); setShowAlerts(false); }}
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

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {!isGuestUser && (
                        <div style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => setShowAlerts(!showAlerts)}>
                            {SVGS.bell}
                            {relevantNotifs.length > 0 && <span style={redDot}></span>}
                        </div>
                    )}
                    <button className="mobile-hide" onClick={() => { localStorage.removeItem('iub_user_selection'); setIsFirstVisit(true); }} style={changeBtn}>Change Section</button>
                </div>
            </header>

            {isSidebarOpen && (
                <div style={sidebarOverlay} onClick={() => setIsSidebarOpen(false)}>
                    <div style={sidebarMenu} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '15px 20px', borderBottom: '1px solid #eee', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, color: '#002147', fontSize: '1rem' }}>Menu</h3>
                            <button onClick={() => setIsSidebarOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#999' }}>✖</button>
                        </div>
                        {availableTabs.map(tab => (
                            <button 
                                key={tab.id} 
                                onClick={() => { setCurrentTab(tab.id); setIsSidebarOpen(false); setShowAlerts(false); }} 
                                style={sidebarBtn(currentTab === tab.id)}
                            >
                                <span style={{ opacity: 0.7 }}>{tab.icon}</span> <span style={{ marginLeft: '10px' }}>{tab.label}</span>
                            </button>
                        ))}
                        
                        <div style={{ marginTop: 'auto', padding: '15px', borderTop: '1px solid #eee' }}>
                            <button onClick={() => { localStorage.removeItem('iub_user_selection'); setIsFirstVisit(true); setIsSidebarOpen(false); }} style={{...changeBtn, width: '100%', background: '#dc3545', color: '#fff', border: 'none', padding: '10px', fontSize: '0.8rem' }}>
                                Change Section
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="mobile-nav" style={tabBar}>
                {availableTabs.filter(tab => isGuestUser ? true : (tab.id !== 'room' && tab.id !== 'teacher' && tab.id !== 'transport')).map(tab => (
                    <button key={tab.id} onClick={() => { setCurrentTab(tab.id); setShowAlerts(false); }} style={tabBtn(currentTab === tab.id)}>
                        <div style={{ marginBottom: '2px', opacity: currentTab === tab.id ? 1 : 0.6 }}>{tab.icon}</div>
                        {tab.label}
                        {tab.id === 'announcements' && activeAssignments.length > 0 && <span style={newsRedDot}></span>}
                    </button>
                ))}
            </div>

            <div style={{ padding: '10px 12px', maxWidth: '600px', margin: '0 auto', flex: 1, width: '100%', boxSizing: 'border-box' }}>

                {isOffline && !isGuestUser && (
                    <div className="expand-anim" style={{ background: '#fff', borderRadius: '20px', padding: '6px 15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', marginBottom: '15px', fontSize: '0.75rem', fontWeight: 'bold', color: '#002147', border: '1px solid #F2A900' }}>
                        <span style={{background: '#002147', color: '#F2A900', padding: '2px 8px', borderRadius: '12px'}}>{getSemesterFromSession(userSection?.session)}-{userSection?.section}</span>
                        <span style={{color: '#ccc'}}>|</span>
                        <span style={{display: 'flex', alignItems: 'center', gap: '4px', color: '#dc3545'}}>{SVGS.alertCircle} Last Update: {lastUpdated}</span>
                    </div>
                )}

                {deferredPrompt && (
                    <div className="expand-anim" style={{ ...notifBannerStyle, background: '#17a2b8', borderColor: '#117a8b' }}>
                        <div style={{ flex: 1, paddingRight: '10px' }}>
                            <b style={{ display: 'block', marginBottom: '2px' }}>Install App 📱</b>
                            <span style={{ fontSize: '0.65rem', opacity: 0.9 }}>Add IUB Assistant to your home screen.</span>
                        </div>
                        <button onClick={handleInstallClick} style={{ ...enableBtnStyle, background: '#fff', color: '#17a2b8' }}>Install</button>
                    </div>
                )}

                {showNotifBanner && (
                    <div className="expand-anim" style={notifBannerStyle}>
                        <div style={{ flex: 1, paddingRight: '10px' }}>
                            <b style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>Stay Updated! {SVGS.bell}</b>
                            <span style={{ fontSize: '0.65rem', opacity: 0.9 }}>Allow notifications for cancelled classes.</span>
                        </div>
                        <button onClick={forceNotificationPermission} style={enableBtnStyle}>Enable</button>
                    </div>
                )}

                {showAlerts ? (
                    <div className="expand-anim" style={whiteCard}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#002147' }}>Alerts & Notifications</h4>
                            <button onClick={handleMarkAsRead} style={markReadBtn}>Mark as Read</button>
                        </div>
                        {relevantNotifs.length === 0 ? (
                            <div style={emptyState}>No new notifications.</div>
                        ) : (
                            relevantNotifs.map((n, i) => (
                                <div key={i} style={notifCard}>
                                    <p style={{ margin: '0 0 4px 0', fontSize: '0.8rem' }}>{n.message}</p>
                                    <span style={{ fontSize: '0.65rem', color: '#999' }}>{new Date(n.created_at).toLocaleDateString()} at {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
                                <div className="expand-anim">
                                    {renderClassCards(mySchedule, 'class')}
                                </div>
                            </>
                        )}

                        {/* ======================= ATTENDANCE TAB ======================= */}
                        {currentTab === 'attendance' && !isGuestUser && (
                            <div className="expand-anim" style={whiteCard}>
                                <h4 style={{marginTop: 0, color: '#002147', marginBottom: '12px', borderBottom: '1px solid #eee', paddingBottom: '8px', fontSize: '0.95rem'}}>Student Attendance</h4>
                                
                                {!myRollNumber ? (
                                    <>
                                        <div style={{ padding: '10px', background: '#e7f1ff', borderRadius: '8px', borderLeft: '3px solid #007bff', marginBottom: '12px', fontSize: '0.75rem', lineHeight: '1.4' }}>
                                            Please select your Registration/Roll Number to view your attendance.
                                        </div>
                                        <input type="text" placeholder="🔍 Search Roll No..." value={attSearch} onChange={e => setAttSearch(e.target.value)} style={searchInput} />
                                        
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
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                            <div>
                                                <div style={{ fontWeight: 'bold', color: '#002147', fontSize: '0.95rem' }}>{myRollNumber}</div>
                                                <div style={{ fontSize: '0.7rem', color: '#666' }}>{studentsData.find(s=>s.registration_number === myRollNumber)?.student_name}</div>
                                            </div>
                                        </div>

                                        {(() => {
                                            const { subjectStats, allValidSessions, mySubjects, myClasses } = getFilteredAttendance();
                                            if (subjectStats.length === 0) return <div style={emptyState}>No attendance records found.</div>;

                                            let totalPres = 0, totalClasses = 0;
                                            subjectStats.forEach(s => {
                                                totalClasses += s.total;
                                                totalPres += (s.pct / 100) * s.total;
                                            });
                                            const overallPct = totalClasses === 0 ? 0 : (totalPres / totalClasses) * 100;

                                            const nowMs = new Date().getTime();
                                            const last7DaysSessions = allValidSessions.filter(s => (nowMs - new Date(s.session_date).getTime()) <= 7 * 24 * 60 * 60 * 1000).sort((a,b) => new Date(b.session_date) - new Date(a.session_date));

                                            return (
                                                <>
                                                    <div style={{ marginBottom: '25px', padding: '12px', background: '#f8f9fa', borderRadius: '10px', border: '1px solid #e9ecef' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                                                            <CircularProgress percentage={overallPct} subject="OVERALL ATTENDANCE" isOverall={true} />
                                                        </div>
                                                        <div style={{ height: '1px', background: '#dee2e6', margin: '12px 0' }}></div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '8px' }}>
                                                            {subjectStats.map(stat => (
                                                                <CircularProgress key={stat.subject} percentage={stat.pct} subject={stat.subject} />
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div style={{ marginBottom: '25px' }}>
                                                        <h3 style={{ fontSize: '0.85rem', color: '#002147', borderBottom: '2px solid #F2A900', paddingBottom: '4px', marginBottom: '12px' }}>Last Week Attendance</h3>
                                                        <div style={{ overflowX: 'auto' }}>
                                                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.75rem' }}>
                                                                <tbody>
                                                                    {mySubjects.map(sub => {
                                                                        const subClassIds = myClasses.filter(c => c.course === sub).map(c => c.id);
                                                                        const subSess = last7DaysSessions.filter(s => subClassIds.includes(s.base_schedule_id));
                                                                        if(subSess.length === 0) return null;

                                                                        return (
                                                                            <tr key={sub} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                                                                <td style={{ padding: '8px 6px', fontWeight: 'bold', color: '#444', minWidth: '90px' }}>{sub}</td>
                                                                                <td style={{ padding: '8px 6px', display: 'flex', gap: '6px', overflowX: 'auto' }} className="scroll-hide">
                                                                                    {subSess.map(sess => {
                                                                                        const rec = attRecords.find(r => r.session_id === sess.id && r.student_id === myRollNumber);
                                                                                        const status = rec ? rec.status : 'Absent';
                                                                                        const dateStr = new Date(sess.session_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric' }).replace('/', '-'); 
                                                                                        return (
                                                                                            <div key={sess.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#fff', padding: '4px', borderRadius: '6px', border: '1px solid #e2e8f0', minWidth: '55px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                                                                                                <span style={{ fontSize: '0.6rem', color: '#666', fontWeight: 'bold', marginBottom: '3px' }}>{dateStr}</span>
                                                                                                <StatusBadge status={status} />
                                                                                            </div>
                                                                                        )
                                                                                    })}
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>

                                                    <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '10px', border: '1px solid #e9ecef' }}>
                                                        <h3 style={{ fontSize: '0.85rem', color: '#002147', marginBottom: '8px' }}>Check Subject History</h3>
                                                        <select value={selectedAttSubject} onChange={e => setSelectedAttSubject(e.target.value)} style={selectStyle}>
                                                            <option value="">-- Select Subject --</option>
                                                            {mySubjects.map(s => <option key={s} value={s}>{s}</option>)}
                                                        </select>

                                                        {selectedAttSubject && (
                                                            <div className="expand-anim" style={{ marginTop: '8px' }}>
                                                                {(() => {
                                                                    const specificClassIds = myClasses.filter(c => c.course === selectedAttSubject).map(c => c.id);
                                                                    const specificSessions = allValidSessions.filter(s => specificClassIds.includes(s.base_schedule_id)).sort((a,b) => new Date(b.session_date) - new Date(a.session_date));
                                                                    
                                                                    if(specificSessions.length === 0) return <div style={emptyState}>No records found.</div>;

                                                                    return specificSessions.map(sess => {
                                                                        const rec = attRecords.find(r => r.session_id === sess.id && r.student_id === myRollNumber);
                                                                        const status = rec ? rec.status : 'Absent';
                                                                        const dateStr = new Date(sess.session_date).toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
                                                                        
                                                                        return (
                                                                            <div key={sess.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#fff', borderRadius: '6px', marginBottom: '6px', border: '1px solid #eee', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                                                                                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#444' }}>{dateStr}</span>
                                                                                <StatusBadge status={status} />
                                                                            </div>
                                                                        )
                                                                    });
                                                                })()}
                                                            </div>
                                                        )}
                                                    </div>
                                                </>
                                            )
                                        })()}
                                    </>
                                )}
                            </div>
                        )}

                        {/* ======================= ROOMS TAB ======================= */}
                        {currentTab === 'room' && (
                            <div className="expand-anim">
                                <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                                    <button onClick={() => setRoomSubTab('schedule')} style={subTabBtn(roomSubTab === 'schedule')}>ROOM SCHEDULE</button>
                                    <button onClick={() => setRoomSubTab('free')} style={subTabBtn(roomSubTab === 'free')}>FREE ROOM</button>
                                </div>

                                {roomSubTab === 'schedule' && (
                                    <div className="expand-anim" style={whiteCard}>
                                        <input type="text" placeholder="🔍 Search room..." value={roomSearch} onChange={e => setRoomSearch(e.target.value)} style={searchInput} />
                                        <select value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)} style={selectStyle}>
                                            <option value="">-- Select Room --</option>
                                            {allRooms.filter(r => r.toLowerCase().includes(roomSearch.toLowerCase())).map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                        
                                        <div style={{...dayFilter, marginTop: '8px', marginBottom: '15px'}}>
                                            {filterDays.map(day => (
                                                <button key={day} onClick={() => setSelectedDay(day)} style={{...dayBtnStyle(selectedDay === day), background: selectedDay === day ? '#002147' : '#f8f9fa'}}>{day}</button>
                                            ))}
                                        </div>

                                        {selectedRoom && renderClassCards(roomSchedule, 'room')}
                                    </div>
                                )}

                                {roomSubTab === 'free' && (
                                    <div className="expand-anim" style={whiteCard}>
                                        <h4 style={{ marginTop: 0, fontSize: '0.8rem', color: '#555' }}>Strictly finds rooms freed by cancellation</h4>
                                        <select value={freeDay} onChange={e => setFreeDay(e.target.value)} style={selectStyle}>
                                            {days.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                        <div style={{ display: 'flex', gap: '8px' }}>
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
                                            <div className="expand-anim" style={{ marginTop: '12px' }}>
                                                {searchedFreeRooms.length > 0 ? searchedFreeRooms.map(r => (
                                                    <div key={r} style={freeRoomItem}>✅ Room {r} is FREE (Class Cancelled)</div>
                                                )) : <div style={emptyState}>No rooms were cancelled.</div>}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ======================= TEACHER TAB ======================= */}
                        {currentTab === 'teacher' && (
                            <div className="expand-anim" style={whiteCard}>
                                <input type="text" placeholder="🔍 Search teacher name..." value={teacherSearch} onChange={e => setTeacherSearch(e.target.value)} style={searchInput} />
                                <select value={selectedTeacher} onChange={e => setSelectedTeacher(e.target.value)} style={selectStyle}>
                                    <option value="">-- Select Teacher --</option>
                                    {allTeachers.filter(t => t.toLowerCase().includes(teacherSearch.toLowerCase())).map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                
                                <div style={{...dayFilter, marginTop: '8px', marginBottom: '15px'}}>
                                    {filterDays.map(day => (
                                        <button key={day} onClick={() => setSelectedDay(day)} style={{...dayBtnStyle(selectedDay === day), background: selectedDay === day ? '#002147' : '#f8f9fa'}}>{day}</button>
                                    ))}
                                </div>

                                {selectedTeacher && (
                                    <div className="expand-anim">
                                        {renderClassCards(teacherSchedule, 'teacher')}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ======================= UPDATES TAB ======================= */}
                        {currentTab === 'announcements' && !isGuestUser && (
                            <div className="expand-anim">
                                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', background: '#f8f9fa', padding: '5px', borderRadius: '10px' }}>
                                    {['Last Week', '15 Days', 'Last Month', 'All'].map(f => (
                                        <button 
                                            key={f} 
                                            onClick={() => setUpdatesFilter(f)} 
                                            style={{ 
                                                flex: 1, padding: '6px', fontSize: '0.65rem', fontWeight: 'bold', borderRadius: '6px', border: 'none', 
                                                background: updatesFilter === f ? '#002147' : '#fff', 
                                                color: updatesFilter === f ? '#F2A900' : '#555',
                                                boxShadow: updatesFilter === f ? '0 2px 4px rgba(0,0,0,0.15)' : '0 1px 2px rgba(0,0,0,0.05)',
                                                transition: 'all 0.3s ease', cursor: 'pointer'
                                            }}
                                        >
                                            {f}
                                        </button>
                                    ))}
                                </div>
                                {updatesFilter === 'Last Week' && <div style={{fontSize: '0.6rem', color: '#888', marginBottom: '12px', paddingLeft: '4px'}}>* Showing records from today to previous 7 days</div>}
                                {updatesFilter !== 'Last Week' && <div style={{marginBottom: '12px'}}></div>}

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
                                                style={{ display: 'flex', background: 'white', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.03)', marginBottom: '12px', border: '1px solid #eee', cursor: 'pointer', transition: 'all 0.3s ease' }}
                                            >
                                                <div style={{ width: '5px', background: ann.type === 'assignment' ? '#F2A900' : '#3b82f6' }}></div>
                                                
                                                <div style={{ flex: 1, padding: '12px', position: 'relative' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                            <span style={{ fontSize: '0.6rem', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                                {ann.subject}
                                                            </span>
                                                        </div>
                                                        <div style={{ color: '#002147', opacity: 0.6 }}>
                                                            {isExpanded ? SVGS.chevronUp : SVGS.chevronDown}
                                                        </div>
                                                    </div>

                                                    <h4 style={{ margin: '0 0 4px 0', fontSize: '0.9rem', color: '#111827', fontWeight: '800', lineHeight: '1.3' }}>{ann.topics}</h4>
                                                    
                                                    {!isExpanded && ann.type === 'assignment' && deadlineDate && (
                                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: isExpired ? '#fef2f2' : '#fff9e6', border: `1px solid ${isExpired ? '#fecaca' : '#F2A900'}`, borderRadius: '15px', padding: '2px 6px', fontSize: '0.6rem', marginTop: '4px' }}>
                                                            <span style={{ fontWeight: '900', color: isExpired ? '#991b1b' : '#b27b00' }}>ASSIGNMENT</span>
                                                            <span style={{ color: isExpired ? '#f87171' : '#fde68a' }}>|</span>
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: isExpired ? '#991b1b' : '#856404', fontWeight: 'bold' }}>
                                                                {isExpired ? SVGS.alertCircle : SVGS.clock} 
                                                                {isExpired ? 'Passed' : timeRemainingDisplay}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {isExpanded && (
                                                        <div className="expand-anim" style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #f0f0f0' }}>
                                                            <p style={{ margin: '0 0 10px 0', fontSize: '0.75rem', color: '#4b5563', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>{ann.details}</p>
                                                            
                                                            {ann.type === 'assignment' && deadlineDate && (
                                                                <div style={{ background: isExpired ? '#fef2f2' : '#f0f9ff', border: `1px solid ${isExpired ? '#fecaca' : '#bae6fd'}`, color: isExpired ? '#991b1b' : '#0369a1', fontSize: '0.7rem', padding: '8px 10px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                                    <div style={{ fontWeight: 'bold' }}>Due: {new Date(ann.deadline_date).toLocaleDateString()} at {convertTo12Hour(ann.deadline_time)}</div>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                                                                        {isExpired ? SVGS.alertCircle : SVGS.clock}
                                                                        {isExpired ? `❌ Passed` : `Time Remaining: ${timeRemainingDisplay}`}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            
                                                            <div style={{ fontSize: '0.6rem', color: '#9ca3af', marginTop: '8px' }}>Posted: {new Date(ann.created_at).toLocaleDateString()}</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        )}

                        {/* ======================= TRANSPORT TAB ======================= */}
                        {currentTab === 'transport' && (
                            <div className="expand-anim" style={whiteCard}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                    <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#002147' }}>University Transport Timings</h4>
                                </div>
                                
                                <div style={{ display: 'flex', gap: '6px', marginBottom: '15px', background: '#f8f9fa', padding: '5px', borderRadius: '10px' }}>
                                    <button onClick={() => setIsSatTransport(false)} style={{ flex: 1, padding: '8px', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '6px', border: 'none', background: !isSatTransport ? '#002147' : '#fff', color: !isSatTransport ? '#F2A900' : '#555', transition: '0.3s', cursor: 'pointer' }}>Mon - Fri</button>
                                    <button onClick={() => setIsSatTransport(true)} style={{ flex: 1, padding: '8px', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '6px', border: 'none', background: isSatTransport ? '#002147' : '#fff', color: isSatTransport ? '#F2A900' : '#555', transition: '0.3s', cursor: 'pointer' }}>Saturday</button>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    {/* AC to BJC */}
                                    <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '10px', border: '1px solid #eee' }}>
                                        <h5 style={{ margin: '0 0 10px 0', color: '#28a745', borderBottom: '2px solid #28a745', paddingBottom: '5px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            {SVGS.bus} AC ➔ BJC
                                        </h5>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {pointsData.filter(p => p.route === 'AC_to_BJC' && p.is_saturday === isSatTransport).sort((a,b) => parseDbTime(a.departure_time) - parseDbTime(b.departure_time)).map((p, i) => (
                                                <div key={i} style={{ background: '#fff', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.8rem', fontWeight: 'bold', color: '#333', textAlign: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                                    {convertTo12Hour(p.departure_time.slice(0,5))}
                                                </div>
                                            ))}
                                            {pointsData.filter(p => p.route === 'AC_to_BJC' && p.is_saturday === isSatTransport).length === 0 && <div style={emptyState}>No buses.</div>}
                                        </div>
                                    </div>
                                    
                                    {/* BJC to AC */}
                                    <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '10px', border: '1px solid #eee' }}>
                                        <h5 style={{ margin: '0 0 10px 0', color: '#007bff', borderBottom: '2px solid #007bff', paddingBottom: '5px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            {SVGS.bus} BJC ➔ AC
                                        </h5>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {pointsData.filter(p => p.route === 'BJC_to_AC' && p.is_saturday === isSatTransport).sort((a,b) => parseDbTime(a.departure_time) - parseDbTime(b.departure_time)).map((p, i) => (
                                                <div key={i} style={{ background: '#fff', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.8rem', fontWeight: 'bold', color: '#333', textAlign: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                                    {convertTo12Hour(p.departure_time.slice(0,5))}
                                                </div>
                                            ))}
                                            {pointsData.filter(p => p.route === 'BJC_to_AC' && p.is_saturday === isSatTransport).length === 0 && <div style={emptyState}>No buses.</div>}
                                        </div>
                                    </div>
                                </div>
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
const welcomeCard = { background: '#fff', padding: '20px', borderRadius: '15px', width: '90%', maxWidth: '350px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', boxSizing: 'border-box' };
const bigBtn = { width: '100%', padding: '10px', background: '#F2A900', border: 'none', borderRadius: '8px', fontWeight: 900, color: '#002147', cursor: 'pointer', transition: 'all 0.3s ease', fontSize: '0.85rem' };
const headerStyle = { background: '#002147', color: '#F2A900', padding: '12px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 1000, boxShadow: '0 2px 10px rgba(0,0,0,0.2)', flexWrap: 'wrap' };
const changeBtn = { background: 'transparent', color: '#fff', border: '1px solid #fff', borderRadius: '4px', padding: '4px 6px', fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s ease' };
const redDot = { position: 'absolute', top: '0', right: '0', width: '6px', height: '6px', background: 'red', borderRadius: '50%', border: '1px solid #002147' };
const newsRedDot = { position: 'absolute', top: '4px', right: '4px', width: '6px', height: '6px', background: 'red', borderRadius: '50%' };
const tabBar = { background: '#fff', padding: '6px 4px', gap: '4px', position: 'sticky', top: '45px', zIndex: 999, boxShadow: '0 2px 5px rgba(0,0,0,0.05)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' };
const tabBtn = (active) => ({ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: '60px', padding: '6px 2px', border: 'none', background: active ? '#002147' : '#f0f2f5', color: active ? '#F2A900' : '#666', borderRadius: '6px', fontSize: '0.6rem', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.3s ease', position: 'relative' });
const subTabBtn = (active) => ({ flex: 1, padding: '6px', border: 'none', background: active ? '#F2A900' : '#e9ecef', color: active ? '#002147' : '#555', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s ease' });
const dayFilter = { display: 'flex', gap: '4px', marginBottom: '10px', overflowX: 'auto', paddingBottom: '4px', WebkitOverflowScrolling: 'touch' };
const dayBtnStyle = (active) => ({ flex: 1, minWidth: '35px', padding: '6px', borderRadius: '6px', border: 'none', background: active ? '#002147' : '#fff', color: active ? '#F2A900' : '#555', fontWeight: 'bold', fontSize: '0.65rem', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', transition: 'all 0.3s ease' });
const dayHeaderStrip = { background: '#002147', color: '#F2A900', padding: '5px 10px', borderRadius: '6px', fontWeight: 900, marginBottom: '8px', textTransform: 'uppercase', fontSize: '0.75rem' };
const selectStyle = { width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '6px', border: '1px solid #dee2e6', fontSize: '0.8rem', background: '#fff', outline: 'none', boxSizing: 'border-box', transition: 'all 0.3s ease' };
const searchInput = { width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '6px', border: '1px solid #dee2e6', fontSize: '0.8rem', background: '#fff', outline: 'none', boxSizing: 'border-box', transition: 'all 0.3s ease' };
const cardBase = { padding: '10px', borderRadius: '8px', transition: 'all 0.3s ease' };
const notifCard = { background: '#fff', padding: '8px', borderRadius: '6px', marginBottom: '8px', borderLeft: '3px solid #dc3545', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'all 0.3s ease' };
const whiteCard = { background: '#fff', padding: '12px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '12px', borderTop: '4px solid #F2A900', transition: 'all 0.3s ease' };
const searchBtn = { width: '100%', padding: '10px', background: '#002147', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '4px', boxSizing: 'border-box', transition: 'all 0.3s ease', fontSize: '0.8rem' };
const markReadBtn = { background: '#e9ecef', border: 'none', padding: '3px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer', color: '#555', transition: 'all 0.3s ease' };
const freeRoomItem = { padding: '8px', borderBottom: '1px solid #eee', color: '#28a745', fontWeight: 'bold', fontSize: '0.75rem', background: '#f0fff4', borderRadius: '4px', marginBottom: '4px' };
const contactBtnStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', background: '#25D366', color: '#fff', padding: '6px 10px', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.75rem', width: '100%', boxSizing: 'border-box', boxShadow: '0 1px 3px rgba(37, 211, 102, 0.2)', transition: 'all 0.3s ease' };
const emptyState = { textAlign: 'center', padding: '20px 10px', color: '#999', fontSize: '0.8rem' };
const centerStyle = { textAlign: 'center', marginTop: '40px', fontFamily: 'sans-serif', fontSize: '0.85rem' };
const footerStyle = { textAlign: 'center', padding: '10px', background: '#fff', color: '#666', borderTop: '1px solid #dee2e6', fontSize: '0.6rem', marginTop: 'auto', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const notifBannerStyle = { background: '#002147', color: '#fff', padding: '8px 10px', borderRadius: '8px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '2px solid #F2A900', gap: '8px', transition: 'all 0.3s ease' };
const enableBtnStyle = { background: '#F2A900', color: '#002147', border: 'none', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.3s ease', fontSize: '0.7rem' };
const pointStripStyle = { background: '#3f3f3f', color: '#fff', padding: '4px 8px', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px', display: 'flex', alignItems: 'center', fontSize: '0.65rem', fontWeight: 'bold', justifyContent: 'flex-start' };

// Sidebar Styles
const sidebarOverlay = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, animation: 'fadeInSlide 0.2s ease' };
const sidebarMenu = { width: '230px', height: '100%', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '2px 0 10px rgba(0,0,0,0.1)' };
const sidebarBtn = (active) => ({ display: 'flex', alignItems: 'center', width: '100%', textAlign: 'left', padding: '10px 15px', border: 'none', background: active ? '#f0f2f5' : '#fff', color: active ? '#002147' : '#555', borderLeft: active ? '4px solid #F2A900' : '4px solid transparent', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', borderBottom: '1px solid #eee', transition: 'all 0.3s ease' });
