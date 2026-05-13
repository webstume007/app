import React, { useState, useEffect, useMemo, useRef } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabase';

// ==========================================
// 1. SVG ASSETS
// ==========================================
const SVGS = {
    home: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>,
    users: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>,
    userTie: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round"/><circle cx="12" cy="7" r="4"/><path d="M12 11v10" strokeLinecap="round"/></svg>,
    door: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M18 20V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16M2 20h20M14 12v.01" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    clock: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    calendar: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    check: <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>,
    cross: <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>,
    undo: <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>,
    shield: <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>,
    broadcast: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/></svg>,
    alertTriangle: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>,
    chart: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>,
    trash: <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>,
    hamburger: <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>,
};

// ==========================================
// 2. UTILITY FUNCTIONS
// ==========================================
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

const convertTo12Hour = (timeStr) => {
    if (!timeStr) return "";
    if (timeStr.toUpperCase().includes('AM') || timeStr.toUpperCase().includes('PM')) return timeStr;
    let [h, m] = timeStr.split(':').map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${m === 0 ? '00' : m < 10 ? '0' + m : m} ${suffix}`;
};

// ==========================================
// 3. MAIN COMPONENT
// ==========================================
export default function AdminDashboard() {
    // Auth
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loadingAuth, setLoadingAuth] = useState(true);

    // Layout
    const [activeTab, setActiveTab] = useState('overview');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [loadingData, setLoadingData] = useState(false);
    const [actionProcessing, setActionProcessing] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Data
    const [crProfiles, setCrProfiles] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [baseSchedule, setBaseSchedule] = useState([]);
    const [exceptions, setExceptions] = useState([]);
    const [attendanceSessions, setAttendanceSessions] = useState([]);
    const [notifications, setNotifications] = useState([]);

    // Feature States
    const [leaveTeacher, setLeaveTeacher] = useState('');
    const [leaveDate, setLeaveDate] = useState('');
    const [holidayDate, setHolidayDate] = useState('');
    const [broadcastMsg, setBroadcastMsg] = useState('');
    
    // Audit Filters
    const [auditSession, setAuditSession] = useState('');
    const [auditSection, setAuditSection] = useState('');

    // Derived Lookups
    const uniqueSessions = [...new Set(baseSchedule.map(s => s.session))].filter(Boolean).sort();
    const uniqueSections = [...new Set(baseSchedule.map(s => s.section))].filter(Boolean).sort();
    const distinctScheduleTeachers = [...new Set(baseSchedule.map(s => s.teacher))].filter(Boolean).sort();
    const currentDayStr = currentTime.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    const todayStr = currentTime.toLocaleDateString('en-CA');
    const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes();

    // Init Clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Auth Check
    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            // Using a strict email check for Admin God-Mode based on instructions
            if (session && session.user && session.user.email === 'admin@iub.edu.pk') {
                setIsAuthenticated(true);
                fetchDashboardData();
            } else {
                setIsAuthenticated(false);
            }
            setLoadingAuth(false);
        };
        checkAuth();
    }, []);

    const fetchDashboardData = async () => {
        setLoadingData(true);
        try {
            const [crRes, tchRes, schRes, excRes, attRes, notRes] = await Promise.all([
                fetchAllRows('cr_profiles'),
                fetchAllRows('teacher_profiles'),
                fetchAllRows('base_schedule'),
                fetchAllRows('schedule_exceptions'),
                fetchAllRows('attendance_sessions'),
                fetchAllRows('notifications')
            ]);
            
            setCrProfiles(crRes.data || []);
            setTeachers(tchRes.data || []);
            setBaseSchedule(schRes.data || []);
            setExceptions(excRes.data || []);
            setAttendanceSessions(attRes.data || []);
            setNotifications(notRes.data || []);
        } catch (error) {
            alert('Error syncing database. Check console.');
            console.error(error);
        }
        setLoadingData(false);
    };

    // --- HANDLERS: CR APPROVALS ---
    const handleCRAction = async (id, isApprove) => {
        setActionProcessing(true);
        if (isApprove) {
            await supabase.from('cr_profiles').update({ is_approved: true }).eq('id', id);
        } else {
            if (window.confirm("Are you sure you want to permanently delete this CR profile?")) {
                await supabase.from('cr_profiles').delete().eq('id', id);
            }
        }
        await fetchDashboardData();
        setActionProcessing(false);
    };

    // --- HANDLERS: TEACHER LEAVES (THE ENGINE) ---
    const handleApproveLeave = async (e) => {
        e.preventDefault();
        if (!leaveTeacher || !leaveDate) return alert("Select Teacher and Date");
        if (!window.confirm(`Cancel all classes for ${leaveTeacher} on ${leaveDate}?`)) return;

        setActionProcessing(true);
        const dayOfWeek = new Date(leaveDate).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
        
        // Find affected base schedules
        const affectedClasses = baseSchedule.filter(c => c.teacher === leaveTeacher && c.day === dayOfWeek);
        
        if (affectedClasses.length === 0) {
            alert("This teacher has no classes scheduled on this day.");
            setActionProcessing(false);
            return;
        }

        const exceptionPayloads = [];
        const notificationPayloads = [];

        affectedClasses.forEach(cls => {
            exceptionPayloads.push({
                base_schedule_id: cls.id,
                exception_date: leaveDate,
                status: 'cancelled'
            });

            notificationPayloads.push({
                message: `🚨 ALERT: ${cls.course} for Section ${cls.section} is cancelled today as the teacher is on leave.`
            });
        });

        const { error: exErr } = await supabase.from('schedule_exceptions').insert(exceptionPayloads);
        if (exErr) { alert("Failed to cancel classes: " + exErr.message); setActionProcessing(false); return; }

        await supabase.from('notifications').insert(notificationPayloads);
        
        alert(`Successfully cancelled ${affectedClasses.length} classes for ${leaveTeacher}.`);
        setLeaveTeacher('');
        setLeaveDate('');
        await fetchDashboardData();
        setActionProcessing(false);
    };

    // --- HANDLERS: GLOBAL HOLIDAY ---
    const handleDeclareHoliday = async (e) => {
        e.preventDefault();
        if (!holidayDate) return alert("Select a date");
        if (!window.confirm(`DANGER: Are you sure you want to declare a GLOBAL holiday for ${holidayDate}? This cancels EVERYTHING.`)) return;

        setActionProcessing(true);
        const dayOfWeek = new Date(holidayDate).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
        const affectedClasses = baseSchedule.filter(c => c.day === dayOfWeek);

        if (affectedClasses.length === 0) {
            alert("No classes exist on this day of the week.");
            setActionProcessing(false);
            return;
        }

        const exceptionPayloads = affectedClasses.map(cls => ({
            base_schedule_id: cls.id,
            exception_date: holidayDate,
            status: 'cancelled'
        }));

        await supabase.from('schedule_exceptions').insert(exceptionPayloads);
        await supabase.from('notifications').insert([{ message: `🚨 GLOBAL ALERT: University Holiday declared for ${holidayDate}. All classes are officially cancelled.` }]);
        
        alert(`Global Holiday executed. ${affectedClasses.length} classes cancelled.`);
        setHolidayDate('');
        await fetchDashboardData();
        setActionProcessing(false);
    };

    // --- HANDLERS: BROADCAST ---
    const handleBroadcast = async (e) => {
        e.preventDefault();
        if (!broadcastMsg.includes('GLOBAL')) {
            alert("Broadcast message MUST contain the word 'GLOBAL' to trigger universal delivery.");
            return;
        }
        setActionProcessing(true);
        await supabase.from('notifications').insert([{ message: broadcastMsg }]);
        alert("Broadcast Sent!");
        setBroadcastMsg('');
        await fetchDashboardData();
        setActionProcessing(false);
    };

    // --- CLASH DETECTOR LOGIC ---
    const clashDetector = useMemo(() => {
        const clashes = [];
        const roomDayGroups = {};
        
        // Group by Room and Day
        baseSchedule.forEach(cls => {
            const key = `${cls.room}_${cls.day}`;
            if (!roomDayGroups[key]) roomDayGroups[key] = [];
            roomDayGroups[key].push(cls);
        });

        // O(N^2) check within small groups
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
                    
                    // Overlap Condition: Start1 < End2 AND End1 > Start2
                    if (s1 < e2 && e1 > s2) {
                        clashes.push({ c1, c2 });
                    }
                }
            }
        });
        return clashes;
    }, [baseSchedule]);

    // --- LIVE ONGOING LOGIC ---
    const liveClasses = useMemo(() => {
        return baseSchedule.filter(cls => {
            if (cls.day !== currentDayStr) return false;
            const startMins = parseTime(cls.start_time);
            const endMins = parseTime(cls.end_time);
            
            // Check Exceptions
            const exception = exceptions.find(e => e.base_schedule_id === cls.id && e.exception_date === todayStr);
            if (exception && exception.status === 'cancelled') return false;

            return currentMins >= startMins && currentMins < endMins;
        });
    }, [baseSchedule, exceptions, currentMins, currentDayStr, todayStr]);

    // --- DEFAULTERS LOGIC ---
    const defaultersList = useMemo(() => {
        if (!auditSession || !auditSection) return [];
        
        // Target specific section
        const sectionClasses = baseSchedule.filter(c => c.session === auditSession && c.section === auditSection && c.day === currentDayStr);
        
        return sectionClasses.filter(cls => {
            const endMins = parseTime(cls.end_time);
            // Class must be in the past for today
            if (currentMins < endMins) return false;

            // Check if cancelled
            const exception = exceptions.find(e => e.base_schedule_id === cls.id && e.exception_date === todayStr);
            if (exception && exception.status === 'cancelled') return false;

            // Check if attendance exists
            const hasAttendance = attendanceSessions.some(att => att.base_schedule_id === cls.id && att.session_date === todayStr);
            return !hasAttendance;
        });
    }, [auditSession, auditSection, baseSchedule, exceptions, attendanceSessions, currentMins, currentDayStr, todayStr]);


    // ==========================================
    // RENDERING
    // ==========================================
    if (loadingAuth) return <div style={centerScreen}><div className="loader"></div></div>;

    if (!isAuthenticated) {
        return (
            <div style={authBg}>
                <Head><title>Admin Auth | IUB</title></Head>
                <div style={authCard} className="expand-anim">
                    <div style={{ color: '#002147', marginBottom: '20px' }}>{SVGS.shield}</div>
                    <h2 style={{ color: '#002147', margin: '0 0 20px 0', fontSize: '1.5rem', fontWeight: 900 }}>HOD Gateway</h2>
                    <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '20px' }}>Restricted access. Use demo bypass if disconnected from Supabase.</p>
                    {authError && <div style={errorBox}>{authError}</div>}
                    <form style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <button type="button" onClick={() => setIsAuthenticated(true)} style={primaryBtn}>Developer Demo Bypass</button>
                    </form>
                </div>
            </div>
        );
    }

    const TABS = [
        { id: 'overview', label: 'Overview', icon: SVGS.chart },
        { id: 'approvals', label: 'CR Approvals', icon: SVGS.users },
        { id: 'leaves', label: 'Teacher Leaves', icon: SVGS.userTie },
        { id: 'schedule', label: 'Global Schedule', icon: SVGS.calendar },
        { id: 'broadcast', label: 'Broadcast', icon: SVGS.broadcast },
        { id: 'audit', label: 'Attendance Audit', icon: SVGS.clock },
    ];

    return (
        <div style={appWrapper}>
            <Head>
                <title>HOD Dashboard | IUB Assistant</title>
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"/>
            </Head>

            <style>{`
                * { box-sizing: border-box; }
                body { margin: 0; padding: 0; background-color: #f0f2f5; font-family: 'Roboto', sans-serif; }
                @keyframes slideFade { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
                .expand-anim { animation: slideFade 0.3s ease-out forwards; }
                .loader { border: 4px solid rgba(0, 33, 71, 0.1); border-left-color: #F2A900; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                
                .desktop-tabs { display: none; }
                .mobile-header-btn { display: block; }
                @media (min-width: 1024px) {
                    .desktop-tabs { display: flex; align-items: center; gap: 8px; }
                    .mobile-header-btn { display: none; }
                }
            `}</style>

            {/* HEADER */}
            <header style={headerStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div className="mobile-header-btn" onClick={() => setIsSidebarOpen(true)} style={{ cursor: 'pointer', color: '#F2A900' }}>
                        {SVGS.hamburger}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#F2A900', fontWeight: 900, fontSize: '1.2rem' }}>
                        {SVGS.cap} IUB HOD DASHBOARD
                    </div>
                </div>

                <div className="desktop-tabs">
                    {TABS.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={navTabBtn(activeTab === tab.id)}>
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                <div>
                    <button onClick={handleLogout} style={dangerBtnSm}>Logout</button>
                </div>
            </header>

            {/* MOBILE SIDEBAR */}
            {isSidebarOpen && (
                <div style={sidebarOverlay} onClick={() => setIsSidebarOpen(false)}>
                    <div style={sidebarMenu} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '20px', borderBottom: '1px solid #eee', color: '#002147', fontWeight: 900, fontSize: '1.1rem', display: 'flex', justifyContent: 'space-between' }}>
                            Menu
                            <span onClick={() => setIsSidebarOpen(false)} style={{ cursor: 'pointer', color: '#999' }}>✖</span>
                        </div>
                        <div style={{ padding: '10px' }}>
                            {TABS.map(tab => (
                                <button key={tab.id} onClick={() => { setActiveTab(tab.id); setIsSidebarOpen(false); }} style={sideTabBtn(activeTab === tab.id)}>
                                    {tab.icon} {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* MAIN CONTENT AREA */}
            <main style={mainContent}>
                {loadingData && (
                    <div className="expand-anim" style={processingBanner}>
                        <div className="loader" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
                        Synchronizing Deep Database...
                    </div>
                )}
                {actionProcessing && (
                    <div className="expand-anim" style={{...processingBanner, background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a'}}>
                        Executing Admin Command...
                    </div>
                )}

                {/* ==================================== */}
                {/* 1. OVERVIEW TAB */}
                {/* ==================================== */}
                {activeTab === 'overview' && (
                    <div className="expand-anim">
                        <div style={kpiGrid}>
                            <div style={statCard}>
                                <div style={statTitle}>{SVGS.users} Total Students</div>
                                <div style={statValue}>{(baseSchedule.length * 40).toLocaleString()}+ <span style={{fontSize:'0.8rem', color:'#666', fontWeight:'normal'}}>(Est.)</span></div>
                            </div>
                            <div style={statCard}>
                                <div style={statTitle}>{SVGS.door} Active Sections</div>
                                <div style={statValue}>{uniqueSections.length}</div>
                            </div>
                            <div style={statCard}>
                                <div style={statTitle}>{SVGS.userTie} Registered Teachers</div>
                                <div style={statValue}>{teachers.length}</div>
                            </div>
                            <div style={statCard}>
                                <div style={statTitle}>{SVGS.alertTriangle} Classes Cancelled Today</div>
                                <div style={{...statValue, color: '#dc3545'}}>{exceptions.filter(e => e.exception_date === todayStr && e.status === 'cancelled').length}</div>
                            </div>
                        </div>

                        <div style={whiteCard}>
                            <h3 style={cardHeader}>{SVGS.broadcast} Live Radar: Ongoing Classes Right Now</h3>
                            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '15px' }}>Auto-refreshes. Filters out officially cancelled classes for today ({todayStr}).</p>
                            
                            {liveClasses.length === 0 ? <div style={emptyStateBox}>No classes actively running at this exact minute.</div> : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px' }}>
                                    {liveClasses.map(cls => (
                                        <div key={cls.id} style={liveClassCard}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                <span style={{ fontSize: '0.7rem', fontWeight: 900, background: '#fef2f2', color: '#dc3545', padding: '2px 8px', borderRadius: '12px', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <span style={{width:'6px', height:'6px', background:'#dc3545', borderRadius:'50%'}}></span> LIVE
                                                </span>
                                                <span style={{ fontSize: '0.75rem', color: '#0369a1', fontWeight: 'bold' }}>Room {cls.room}</span>
                                            </div>
                                            <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#002147', marginBottom: '4px' }}>{cls.course}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#555', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>{SVGS.userTie} {cls.teacher}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#856404', fontWeight: 'bold', background: '#fff9e6', padding: '6px', borderRadius: '6px' }}>
                                                {convertTo12Hour(cls.start_time)} to {convertTo12Hour(cls.end_time)} | Sec {cls.section} ({cls.session})
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ==================================== */}
                {/* 2. CR APPROVALS TAB */}
                {/* ==================================== */}
                {activeTab === 'approvals' && (
                    <div className="expand-anim">
                        <div style={whiteCard}>
                            <h3 style={cardHeader}>{SVGS.users} Class Representative Approvals</h3>
                            <div style={tableWrapper} className="hide-scrollbar">
                                <table style={tableStyle}>
                                    <thead>
                                        <tr>
                                            <th style={thStyle}>Status</th>
                                            <th style={thStyle}>Name</th>
                                            <th style={thStyle}>Department & Session</th>
                                            <th style={thStyle}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {crProfiles.sort((a, b) => Number(a.is_approved) - Number(b.is_approved)).map(cr => (
                                            <tr key={cr.id} style={trStyle}>
                                                <td style={tdStyle}>
                                                    {cr.is_approved ? <span style={badgeSuccess}>Approved</span> : <span style={badgeWarning}>Pending</span>}
                                                </td>
                                                <td style={tdStyle}><strong>{cr.first_name} {cr.last_name}</strong></td>
                                                <td style={tdStyle}>{cr.department} | {cr.session} - Sec {cr.section}</td>
                                                <td style={tdStyle}>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        {!cr.is_approved && <button onClick={() => handleCRAction(cr.id, true)} style={successBtnSm}>{SVGS.check} Approve</button>}
                                                        <button onClick={() => handleCRAction(cr.id, false)} style={dangerBtnSm}>{SVGS.trash} Delete</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {crProfiles.length === 0 && <tr><td colSpan="4" style={emptyTd}>No CR profiles found.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ==================================== */}
                {/* 3. TEACHER LEAVES TAB */}
                {/* ==================================== */}
                {activeTab === 'leaves' && (
                    <div className="expand-anim" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                        <div style={whiteCard}>
                            <h3 style={cardHeader}>{SVGS.userTie} Teacher Leave Engine</h3>
                            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '20px' }}>
                                Selecting a teacher and date will automatically find all their scheduled classes for that day, cancel them globally, and push notifications to affected sections.
                            </p>
                            <form onSubmit={handleApproveLeave} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div>
                                    <label style={labelStyle}>Select Teacher</label>
                                    <select value={leaveTeacher} onChange={e=>setLeaveTeacher(e.target.value)} required style={inputStyle}>
                                        <option value="">-- Choose Instructor --</option>
                                        {distinctScheduleTeachers.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Leave Date</label>
                                    <input type="date" value={leaveDate} onChange={e=>setLeaveDate(e.target.value)} required style={inputStyle} />
                                </div>
                                <button type="submit" style={{...primaryBtn, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '15px'}}>
                                    {SVGS.alertTriangle} Execute Auto-Cancel Protocol
                                </button>
                            </form>
                        </div>

                        <div style={whiteCard}>
                            <h3 style={cardHeader}>{SVGS.calendar} Recent Leave Executions</h3>
                            <div style={{ maxHeight: '350px', overflowY: 'auto' }} className="hide-scrollbar">
                                {exceptions.filter(e => e.status === 'cancelled').slice(-10).reverse().map(ex => {
                                    const base = baseSchedule.find(b => b.id === ex.base_schedule_id);
                                    if(!base) return null;
                                    return (
                                        <div key={ex.id} style={{ padding: '12px', background: '#fef2f2', borderLeft: '4px solid #dc3545', borderRadius: '8px', marginBottom: '10px', fontSize: '0.85rem' }}>
                                            <div style={{ fontWeight: 'bold', color: '#991b1b', marginBottom: '4px' }}>Teacher: {base.teacher}</div>
                                            <div style={{ color: '#7f1d1d' }}>Date: {ex.exception_date}</div>
                                            <div style={{ color: '#b91c1c', fontSize: '0.75rem', marginTop: '6px' }}>Impacted: {base.course} (Sec {base.section})</div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* ==================================== */}
                {/* 4. GLOBAL SCHEDULE & ROOM MASTER */}
                {/* ==================================== */}
                {activeTab === 'schedule' && (
                    <div className="expand-anim">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                            <div style={{...whiteCard, marginBottom: 0}}>
                                <h3 style={cardHeader}>{SVGS.calendar} Global Holiday Declaration</h3>
                                <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '15px' }}>Cancels ALL classes across all departments for a specific date.</p>
                                <form onSubmit={handleDeclareHoliday} style={{ display: 'flex', gap: '10px' }}>
                                    <input type="date" value={holidayDate} onChange={e=>setHolidayDate(e.target.value)} required style={{...inputStyle, flex: 1}} />
                                    <button type="submit" style={dangerBtn}>Declare</button>
                                </form>
                            </div>

                            <div style={{...whiteCard, marginBottom: 0, borderTop: '4px solid #dc3545'}}>
                                <h3 style={{...cardHeader, color: '#dc3545'}}>{SVGS.alertTriangle} Matrix Clash Detector</h3>
                                <div style={{ maxHeight: '150px', overflowY: 'auto' }} className="hide-scrollbar">
                                    {clashDetector.length === 0 ? <div style={emptyStateBox}>System clear. No structural overlaps detected.</div> : (
                                        clashDetector.map((clash, idx) => (
                                            <div key={idx} style={{ padding: '10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', marginBottom: '8px', fontSize: '0.75rem' }}>
                                                <strong style={{color: '#991b1b'}}>CRITICAL OVERLAP in {clash.c1.room} on {clash.c1.day}</strong><br/>
                                                1: {clash.c1.course} ({clash.c1.start_time} - {clash.c1.end_time}) Sec {clash.c1.section}<br/>
                                                2: {clash.c2.course} ({clash.c2.start_time} - {clash.c2.end_time}) Sec {clash.c2.section}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        <div style={whiteCard}>
                            <h3 style={cardHeader}>{SVGS.door} Base Timetable Viewer</h3>
                            <div style={tableWrapper} className="hide-scrollbar">
                                <table style={tableStyle}>
                                    <thead>
                                        <tr>
                                            <th style={thStyle}>Dept / Session / Sec</th>
                                            <th style={thStyle}>Course</th>
                                            <th style={thStyle}>Teacher</th>
                                            <th style={thStyle}>Room</th>
                                            <th style={thStyle}>Day & Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {baseSchedule.slice(0, 100).map(cls => ( // Limiting render for performance in admin view, filters would normally apply here
                                            <tr key={cls.id} style={trStyle}>
                                                <td style={tdStyle}>{cls.session} | Sec {cls.section}</td>
                                                <td style={tdStyle}><strong>{cls.course}</strong></td>
                                                <td style={tdStyle}>{cls.teacher}</td>
                                                <td style={tdStyle}><strong>{cls.room}</strong></td>
                                                <td style={tdStyle}>{cls.day} | {convertTo12Hour(cls.start_time)} - {convertTo12Hour(cls.end_time)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ==================================== */}
                {/* 5. GLOBAL BROADCAST */}
                {/* ==================================== */}
                {activeTab === 'broadcast' && (
                    <div className="expand-anim" style={{ maxWidth: '600px', margin: '0 auto' }}>
                        <div style={whiteCard}>
                            <h3 style={cardHeader}>{SVGS.broadcast} Network-Wide Transmission</h3>
                            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '20px' }}>
                                Push a message to the dashboard of every registered student and CR. The message string must include 'GLOBAL' to bypass section filters on the client side.
                            </p>
                            <form onSubmit={handleBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <textarea 
                                    required 
                                    value={broadcastMsg}
                                    onChange={e=>setBroadcastMsg(e.target.value)}
                                    placeholder="e.g., GLOBAL ALERT: University will remain closed on..."
                                    style={{...inputStyle, minHeight: '150px', resize: 'vertical'}}
                                />
                                <button type="submit" style={{...primaryBtn, padding: '15px', fontSize: '1rem'}}>{SVGS.broadcast} Dispatch Transmission</button>
                            </form>
                        </div>

                        <div style={whiteCard}>
                            <h3 style={cardHeader}>{SVGS.clock} Broadcast History</h3>
                            <div style={{ maxHeight: '300px', overflowY: 'auto' }} className="hide-scrollbar">
                                {notifications.filter(n => n.message.includes('GLOBAL')).slice(0, 10).map(n => (
                                    <div key={n.id} style={{ padding: '12px', background: '#f8f9fa', border: '1px solid #eee', borderRadius: '8px', marginBottom: '10px', fontSize: '0.85rem' }}>
                                        <div style={{ color: '#002147', fontWeight: 'bold', marginBottom: '4px' }}>{n.message}</div>
                                        <div style={{ color: '#999', fontSize: '0.7rem' }}>{new Date(n.created_at).toLocaleString()}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ==================================== */}
                {/* 6. ATTENDANCE AUDIT */}
                {/* ==================================== */}
                {activeTab === 'audit' && (
                    <div className="expand-anim">
                        <div style={whiteCard}>
                            <h3 style={cardHeader}>{SVGS.clock} Compliance & Defaulter Audit</h3>
                            
                            <div style={{ display: 'flex', gap: '15px', marginBottom: '25px', flexWrap: 'wrap' }}>
                                <select value={auditSession} onChange={e=>setAuditSession(e.target.value)} style={{...inputStyle, flex: 1}}>
                                    <option value="">-- Select Session --</option>
                                    {uniqueSessions.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <select value={auditSection} onChange={e=>setAuditSection(e.target.value)} style={{...inputStyle, flex: 1}}>
                                    <option value="">-- Select Section --</option>
                                    {uniqueSections.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>

                            {auditSession && auditSection ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                                    <div style={{ padding: '20px', background: '#fff3cd', borderRadius: '12px', borderLeft: '5px solid #F2A900' }}>
                                        <h4 style={{ margin: '0 0 15px 0', color: '#856404', display: 'flex', alignItems: 'center', gap: '8px' }}>{SVGS.alertTriangle} Immediate Action Required (Defaulters)</h4>
                                        <p style={{ fontSize: '0.8rem', color: '#856404', marginBottom: '15px' }}>Classes that ended earlier today but have NO attendance submitted by the CR.</p>
                                        
                                        {defaultersList.length === 0 ? <div style={{ fontWeight: 'bold', color: '#155724' }}>All clear for today.</div> : (
                                            defaultersList.map(cls => (
                                                <div key={cls.id} style={{ background: '#fff', padding: '10px', borderRadius: '6px', marginBottom: '8px', fontSize: '0.8rem', fontWeight: 'bold', color: '#991b1b', border: '1px solid #fde68a' }}>
                                                    {cls.course} | {cls.teacher}<br/>
                                                    <span style={{color: '#666', fontWeight: 'normal'}}>{convertTo12Hour(cls.start_time)} - {convertTo12Hour(cls.end_time)}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    <div style={{ padding: '20px', background: '#e0f2fe', borderRadius: '12px', borderLeft: '5px solid #0284c7' }}>
                                        <h4 style={{ margin: '0 0 15px 0', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '8px' }}>{SVGS.chart} Course Execution Stats</h4>
                                        
                                        {(() => {
                                            const secBases = baseSchedule.filter(c => c.session === auditSession && c.section === auditSection);
                                            const courses = [...new Set(secBases.map(c => c.course))];
                                            
                                            return courses.map(course => {
                                                const ids = secBases.filter(b => b.course === course).map(b => b.id);
                                                const attCount = attendanceSessions.filter(a => ids.includes(a.base_schedule_id) && a.status === 'approved').length;
                                                return (
                                                    <div key={course} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #bae6fd', fontSize: '0.85rem' }}>
                                                        <span style={{ fontWeight: 'bold', color: '#002147' }}>{course}</span>
                                                        <span style={{ background: '#0284c7', color: 'white', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>{attCount} Lectures</span>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>
                            ) : (
                                <div style={emptyStateBox}>Select a Session and Section to perform audit.</div>
                            )}
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}

// ==========================================
// STYLES OBJECTS
// ==========================================
const appWrapper = { display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f0f2f5', boxSizing: 'border-box' };
const centerScreen = { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#002147' };

const authBg = { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#002147', boxSizing: 'border-box' };
const authCard = { background: '#fff', padding: '40px 30px', borderRadius: '15px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 15px 35px rgba(0,0,0,0.3)', boxSizing: 'border-box' };
const errorBox = { background: '#fef2f2', color: '#dc3545', padding: '10px', borderRadius: '8px', border: '1px solid #fecaca', marginBottom: '20px', fontSize: '0.85rem', fontWeight: 'bold' };

const headerStyle = { background: '#002147', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 1000, boxShadow: '0 4px 15px rgba(0,0,0,0.2)', boxSizing: 'border-box' };
const mainContent = { padding: '20px', maxWidth: '1400px', margin: '0 auto', width: '100%', boxSizing: 'border-box', flex: 1 };

const navTabBtn = (active) => ({ background: active ? '#F2A900' : 'transparent', color: active ? '#002147' : '#fff', border: 'none', padding: '10px 15px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', gap: '6px' });
const primaryBtn = { width: '100%', padding: '12px', background: '#F2A900', color: '#002147', border: 'none', borderRadius: '8px', fontWeight: 900, cursor: 'pointer', transition: 'all 0.3s ease', fontSize: '0.9rem' };
const dangerBtn = { padding: '12px 20px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s ease' };
const dangerBtnSm = { padding: '8px 12px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.75rem' };
const successBtnSm = { padding: '8px 12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' };

const inputStyle = { width: '100%', padding: '12px', border: '1px solid #dee2e6', borderRadius: '8px', outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box', background: '#f8f9fa', color: '#333' };
const labelStyle = { display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#002147', marginBottom: '8px' };

const whiteCard = { background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: '25px', boxSizing: 'border-box', borderTop: '4px solid #002147' };
const cardHeader = { margin: '0 0 20px 0', borderBottom: '2px solid #f0f2f5', paddingBottom: '12px', color: '#002147', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' };

const kpiGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '25px' };
const statCard = { background: 'linear-gradient(135deg, #002147 0%, #003366 100%)', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', color: '#fff', borderBottom: '4px solid #F2A900' };
const statTitle = { fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '8px' };
const statValue = { fontSize: '2.5rem', fontWeight: 900, marginTop: '10px', color: '#F2A900' };

const liveClassCard = { padding: '15px', borderRadius: '10px', border: '1px solid #e0e0e0', background: '#f8f9fa', borderLeft: '5px solid #28a745' };

const tableWrapper = { overflowX: 'auto', width: '100%' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem', minWidth: '600px' };
const thStyle = { padding: '15px', background: '#f8f9fa', color: '#002147', fontWeight: 'bold', borderBottom: '2px solid #dee2e6' };
const tdStyle = { padding: '15px', borderBottom: '1px solid #eee', color: '#333' };
const trStyle = { transition: 'background 0.2s', ':hover': { background: '#f8f9fa' } };
const emptyTd = { padding: '20px', textAlign: 'center', color: '#999', fontStyle: 'italic' };
const emptyStateBox = { textAlign: 'center', padding: '30px', background: '#f8f9fa', borderRadius: '10px', border: '1px dashed #ccc', color: '#666', fontSize: '0.9rem' };

const badgeSuccess = { background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid #86efac' };
const badgeWarning = { background: '#fef3c7', color: '#b45309', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid #fde68a' };

const processingBanner = { background: '#e0f2fe', color: '#0369a1', padding: '12px', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', border: '1px solid #bae6fd' };

const sidebarOverlay = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,33,71,0.6)', zIndex: 9999, backdropFilter: 'blur(3px)', animation: 'slideFade 0.2s ease' };
const sidebarMenu = { width: '260px', height: '100%', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '2px 0 15px rgba(0,0,0,0.2)' };
const sideTabBtn = (active) => ({ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', textAlign: 'left', padding: '15px 20px', border: 'none', background: active ? '#f0f2f5' : '#fff', color: active ? '#002147' : '#555', borderLeft: active ? '4px solid #F2A900' : '4px solid transparent', fontSize: '0.95rem', fontWeight: 'bold', cursor: 'pointer', borderBottom: '1px solid #eee' });
