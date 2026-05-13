import { useState, useEffect, useRef, useMemo } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabase';

// --- Custom SVGs for UI ---
const SVGS = {
    tick: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>,
    cross: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>,
    calendar: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2"/><line x1="16" y1="2" x2="16" y2="6" strokeWidth="2"/><line x1="8" y1="2" x2="8" y2="6" strokeWidth="2"/></svg>,
    attendance: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>,
    clock: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth="2"/><polyline points="12 6 12 12 16 14" strokeWidth="2"/></svg>,
    door: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M18 20V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16M2 20h20M14 12v.01" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    userTie: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="7" r="4" strokeWidth="2"/><path d="M12 11v10" strokeWidth="2" strokeLinecap="round"/></svg>,
    bus: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h8M8 11h8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2zM8 19v2a1 1 0 01-2 0v-2M18 19v2a1 1 0 01-2 0v-2"></path></svg>,
    cap: <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 14v6m-3-6v6m6-6v6"/></svg>,
    location: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
    tickCircle: <svg width="16" height="16" fill="none" stroke="#28a745" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
    users: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>,
    edit: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>,
    trash: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>,
    upload: <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>,
    chart: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>,
    plus: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>,
    save: <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>,
    alertCircle: <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth="2"/><line x1="12" y1="8" x2="12" y2="12" strokeWidth="2" strokeLinecap="round"/><line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="3" strokeLinecap="round"/></svg>,
    phone: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>,
    star: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.898 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>
};

export default function AdminDashboard() {
    // ==========================================
    // 1. STATE MANAGEMENT
    // ==========================================
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loginUsername, setLoginUsername] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [authError, setAuthError] = useState('');

    const [activeTab, setActiveTab] = useState('overview'); 
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Database States
    const [crs, setCrs] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [baseSchedule, setBaseSchedule] = useState([]);
    const [exceptions, setExceptions] = useState([]);
    const [roster, setRoster] = useState([]); 
    const [attendanceSessions, setAttendanceSessions] = useState([]);
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [pointSchedules, setPointSchedules] = useState([]);

    // Sub-Tabs & Filters
    const [userSubTab, setUserSubTab] = useState('crs'); 
    const [scheduleSubTab, setScheduleSubTab] = useState('base'); 
    const [filterSem, setFilterSem] = useState(''); 
    const [filterSec, setFilterSec] = useState('');
    const [filterDay, setFilterDay] = useState('ALL');
    const [analyticsView, setAnalyticsView] = useState('attendance'); // 'attendance' | 'teachers'

    // Forms & Modals
    const [isBaseModalOpen, setIsBaseModalOpen] = useState(false);
    const [baseForm, setBaseForm] = useState({ id: null, semester: '', section: '', course: '', teacher: '', room: '', day: 'MON', start_time: '8:00 AM', end_time: '9:30 AM' });
    
    const [isUserEditModalOpen, setIsUserEditModalOpen] = useState(false);
    const [userEditForm, setUserEditForm] = useState({ id: null, type: 'cr', first_name: '', last_name: '', name: '', department: '', semester: '', section: '', phone: '', email: '', cnic: '' });

    const fileInputRef = useRef(null);
    const scheduleFileInputRef = useRef(null);

    // Computed Globals
    const availableSemesters = [...new Set(baseSchedule.map(x => x.semester))].filter(Boolean).sort();
    const availableSections = [...new Set(baseSchedule.map(x => x.section))].filter(Boolean).sort();
    const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
    const timeSlots = [];
    let ts = 8 * 60; 
    while (ts < 18 * 60) {
        let h = Math.floor(ts / 60), m = ts % 60, amp = h >= 12 ? 'PM' : 'AM', dh = h > 12 ? h - 12 : h;
        if (dh === 0) dh = 12; 
        timeSlots.push(`${dh}:${m === 0 ? '00' : m} ${amp}`); 
        ts += 30;
    }

    // ==========================================
    // 2. FETCHING ENGINE (Infinite Paginator)
    // ==========================================
    const handleLogin = (e) => {
        e.preventDefault();
        if (loginUsername === 'admin' && loginPassword === 'admin123') {
            setIsAuthenticated(true);
            setAuthError('');
            fetchAllData();
        } else {
            setAuthError('Invalid credentials. Access Denied.');
        }
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        setLoginUsername('');
        setLoginPassword('');
    };

    // Universal fetcher to completely bypass 1000 row limit
    const fetchAllRows = async (table, selectQuery = '*') => {
        let allData = [];
        let from = 0;
        const step = 1000;
        
        while (true) {
            const { data, error } = await supabase.from(table).select(selectQuery).range(from, from + step - 1);
            if (error || !data || data.length === 0) break;
            allData = [...allData, ...data];
            if (data.length < step) break;
            from += step;
        }
        return allData;
    };

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [crData, teacherData, scheduleData, exceptionsData, rosterData, sessionsData, pointsData, recordsData] = await Promise.all([
                fetchAllRows('cr_profiles'),
                fetchAllRows('teacher_profiles'),
                fetchAllRows('base_schedule'),
                fetchAllRows('schedule_exceptions'),
                fetchAllRows('students'),
                fetchAllRows('attendance_sessions', '*, teacher_profiles(name), auth_users:submitted_by(email)'),
                fetchAllRows('point_schedules'),
                fetchAllRows('attendance_records') // Heavy table, handled by fetchAllRows
            ]);

            setCrs(crData || []);
            setTeachers(teacherData || []);
            setBaseSchedule(scheduleData || []);
            setExceptions(exceptionsData || []);
            setRoster((rosterData || []).sort((a,b) => a.registration_number.localeCompare(b.registration_number)));
            setAttendanceSessions(sessionsData || []);
            setPointSchedules(pointsData || []);
            setAttendanceRecords(recordsData || []);
        } catch (error) {
            console.error("Database connection error:", error);
            alert("Database connection error. Check console.");
        }
        setLoading(false);
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
    // 3. HOD ANALYTICS ENGINE
    // ==========================================
    const calculateOverallAttendance = () => {
        if (!filterSem || !filterSec) return null;
        const relevantClasses = baseSchedule.filter(b => b.semester === filterSem && b.section === filterSec).map(b => b.id);
        const relevantSessions = attendanceSessions.filter(s => relevantClasses.includes(s.base_schedule_id) && s.status === 'approved').map(s => s.id);
        
        if (relevantSessions.length === 0) return 0;

        const relevantRecords = attendanceRecords.filter(r => relevantSessions.includes(r.session_id));
        if (relevantRecords.length === 0) return 0;

        const presents = relevantRecords.filter(r => r.status === 'Present' || r.status === 'Leave').length;
        return Math.round((presents / relevantRecords.length) * 100);
    };

    const getTeacherPerformance = () => {
        const performanceMap = {};
        
        // Initialize map
        teachers.forEach(t => {
            performanceMap[t.name] = { totalConducted: 0, dates: [] };
        });
        
        // Count approved sessions mapped to base schedule teachers
        attendanceSessions.filter(s => s.status === 'approved').forEach(session => {
            const base = baseSchedule.find(b => b.id === session.base_schedule_id);
            if (base && base.teacher && performanceMap[base.teacher]) {
                performanceMap[base.teacher].totalConducted += 1;
                performanceMap[base.teacher].dates.push({ date: session.session_date, course: base.course, section: base.section });
            }
        });

        return Object.entries(performanceMap)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a,b) => b.totalConducted - a.totalConducted);
    };

    // ==========================================
    // 4. USERS & DIRECTORY MANAGEMENT
    // ==========================================
    const approveUser = async (table, id) => {
        setActionLoading(true);
        await supabase.from(table).update({ is_approved: true }).eq('id', id);
        await fetchAllData();
        setActionLoading(false);
    };

    const openEditUserModal = (user, type) => {
        setUserEditForm({
            id: user.id,
            type: type, 
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            name: user.name || '',
            department: user.department || '',
            semester: user.semester || '',
            section: user.section || '',
            phone: user.phone || '',
            email: user.email || '',
            cnic: user.cnic || ''
        });
        setIsUserEditModalOpen(true);
    };

    const saveEditedUser = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        const table = userEditForm.type === 'cr' ? 'cr_profiles' : 'teacher_profiles';
        let payload = userEditForm.type === 'cr' 
            ? { first_name: userEditForm.first_name, last_name: userEditForm.last_name, department: userEditForm.department, semester: userEditForm.semester, section: userEditForm.section, phone: userEditForm.phone, is_approved: true }
            : { name: userEditForm.name, phone: userEditForm.phone, cnic: userEditForm.cnic, email: userEditForm.email, is_approved: true };

        await supabase.from(table).update(payload).eq('id', userEditForm.id);
        setIsUserEditModalOpen(false);
        await fetchAllData();
        setActionLoading(false);
    };

    const rejectUser = async (table, id, name) => {
        if(!window.confirm(`Permanently delete ${name}'s profile?`)) return;
        setActionLoading(true);
        await supabase.from(table).delete().eq('id', id);
        await fetchAllData();
        setActionLoading(false);
    };

    // ==========================================
    // 5. BULK INFRASTRUCTURE: SCHEDULE CSV UPLOAD
    // ==========================================
    const handleScheduleCSVUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            setActionLoading(true);
            try {
                const text = event.target.result;
                const rows = text.split('\n').map(r => r.split(',').map(c => c?.trim()));
                const payloads = [];
                
                // Expecting: Semester, Section, Course, Teacher, Room, Day, Start_Time, End_Time
                let startIndex = rows[0].join('').toLowerCase().includes('semester') ? 1 : 0;

                for(let i = startIndex; i < rows.length; i++) {
                    const row = rows[i];
                    if (row.length >= 8 && row[0] && row[1] && row[2]) {
                        payloads.push({ 
                            semester: row[0], section: row[1].toUpperCase(), course: row[2], 
                            teacher: row[3], room: row[4], day: row[5].toUpperCase(), 
                            start_time: row[6], end_time: row[7] 
                        });
                    }
                }

                if (payloads.length > 0) {
                    const { error } = await supabase.from('base_schedule').insert(payloads);
                    if (error) alert("Error importing schedule: " + error.message);
                    else {
                        alert(`Successfully imported ${payloads.length} lectures!`);
                        await fetchAllData();
                    }
                } else {
                    alert("No valid data found matching the format.");
                }
            } catch (err) {
                alert("Failed to parse CSV.");
            }
            setActionLoading(false);
            e.target.value = null;
        };
        reader.readAsText(file);
    };

    const saveBaseSchedule = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        const payload = { ...baseForm };
        delete payload.id;
        if (baseForm.id) await supabase.from('base_schedule').update(payload).eq('id', baseForm.id);
        else await supabase.from('base_schedule').insert([payload]);
        setIsBaseModalOpen(false);
        await fetchAllData();
        setActionLoading(false);
    };

    const deleteBaseSchedule = async (id) => {
        if(!window.confirm('Delete this base lecture globally?')) return;
        setActionLoading(true);
        await supabase.from('base_schedule').delete().eq('id', id);
        await fetchAllData();
        setActionLoading(false);
    };

    // ==========================================
    // RENDERERS
    // ==========================================
    if (!isAuthenticated) {
        return (
            <div style={welcomeBg}>
                <Head><title>Admin Gateway | IUB</title></Head>
                <div className="expand-anim" style={welcomeCard}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px', color: '#002147', transform: 'scale(2)' }}>
                        {SVGS.cap}
                    </div>
                    <h2 style={{ color: '#002147', textAlign: 'center', margin: '0 0 20px 0', fontWeight: '900' }}>Admin God-Mode</h2>
                    {authError && <div style={{ background: '#fef2f2', color: '#dc3545', border: '1px solid #fecaca', padding: '10px', borderRadius: '8px', marginBottom: '15px', fontSize: '0.85rem', fontWeight: 'bold' }}>{authError}</div>}
                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <input type="text" placeholder="Username" value={loginUsername} onChange={e=>setLoginUsername(e.target.value)} required style={inputStyle} />
                        <input type="password" placeholder="Password" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} required style={inputStyle} />
                        <button type="submit" style={bigBtn}>Authorize Access</button>
                    </form>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div style={{ ...welcomeBg, flexDirection: 'column', gap: '20px' }}>
                <Head><title>Syncing | IUB Admin</title></Head>
                <div className="custom-spinner"></div>
                <h2 style={{ color: '#F2A900', margin: 0, fontSize: '1.2rem', animation: 'pulseText 1.5s infinite ease-in-out' }}>
                    Syncing Global Database...
                </h2>
                <style>{`
                    .custom-spinner { width: 45px; height: 45px; border: 4px solid rgba(255, 255, 255, 0.1); border-left-color: #F2A900; border-radius: 50%; animation: spin 1s linear infinite; }
                    @keyframes spin { to { transform: rotate(360deg); } }
                    @keyframes pulseText { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
                    @keyframes slideFade { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
                    .expand-anim { animation: slideFade 0.3s ease-out forwards; }
                    .scroll-hide::-webkit-scrollbar { display: none; }
                `}</style>
            </div>
        );
    }

    const today = new Date().toLocaleDateString('en-CA');
    const classesCancelledToday = exceptions.filter(e => e.exception_date === today && e.status === 'cancelled').length;
    const pendingCrsCount = crs.filter(c => !c.is_approved).length;
    const pendingTeachersCount = teachers.filter(t => !t.is_approved).length;

    const visibleTabs = [
        { id: 'overview', label: 'HOD Analytics', icon: SVGS.chart },
        { id: 'users', label: 'Directory', icon: SVGS.users, badge: pendingCrsCount + pendingTeachersCount },
        { id: 'schedule', label: 'Matrix', icon: SVGS.calendar },
        { id: 'records', label: 'Records', icon: SVGS.note }
    ];

    return (
        <div style={{ background: '#f0f2f5', minHeight: '100vh', fontFamily: "'Roboto', sans-serif", display: 'flex', flexDirection: 'column' }}>
            <Head><title>Admin Console | IUB</title></Head>
            <style>{`
                @keyframes slideFade { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
                .expand-anim { animation: slideFade 0.3s ease-out forwards; }
                .scroll-hide::-webkit-scrollbar { display: none; }
                .desktop-nav { display: none; }
                .mobile-nav { display: flex; }
                @media (min-width: 768px) { .desktop-nav { display: flex; align-items: center; gap: 15px; } .mobile-nav { display: none !important; } }
            `}</style>
            
            <header style={headerStyle}>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.4rem', display: 'flex' }}>{SVGS.cap}</span> HOD & ADMIN CONSOLE
                </div>
                
                <div className="desktop-nav">
                    {visibleTabs.map(tab => (
                        <div key={tab.id} onClick={() => setActiveTab(tab.id)}
                            style={{
                                cursor: 'pointer', padding: '8px 12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem',
                                background: activeTab === tab.id ? '#F2A900' : 'transparent', color: activeTab === tab.id ? '#002147' : '#fff',
                                transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', gap: '6px', position: 'relative'
                            }}>
                            {tab.icon} {tab.label}
                            {tab.badge > 0 && <span style={redDot}>{tab.badge}</span>}
                        </div>
                    ))}
                </div>
                
                <button onClick={handleLogout} style={enableBtnStyle}>Logout</button>
            </header>

            <div className="mobile-nav" style={tabBar}>
                {visibleTabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={tabBtn(activeTab === tab.id)}>
                        <div style={{ marginBottom: '2px', opacity: activeTab === tab.id ? 1 : 0.6 }}>{tab.icon}</div>
                        {tab.label}
                        {tab.badge > 0 && <span style={newsRedDot}></span>}
                    </button>
                ))}
            </div>

            <div style={{ maxWidth: '1200px', margin: '20px auto', padding: '0 15px', flex: 1, width: '100%', boxSizing: 'border-box' }}>
                
                {actionLoading && (
                    <div className="expand-anim" style={{ background: '#fff3cd', color: '#856404', padding: '12px', borderRadius: '10px', textAlign: 'center', fontWeight: 'bold', marginBottom: '20px', border: '1px solid #ffeeba', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        Processing Sync...
                    </div>
                )}

                {/* ---------------------------------------------------- */}
                {/* MODULE 1: HOD OVERVIEW & ANALYTICS */}
                {/* ---------------------------------------------------- */}
                {activeTab === 'overview' && (
                    <div className="expand-anim">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                            <div style={kpiCard}>
                                <div style={kpiTitle}>{SVGS.users} Registered Students</div>
                                <div style={kpiValue}>{roster.length}</div>
                            </div>
                            <div style={kpiCard}>
                                <div style={kpiTitle}>{SVGS.door} Active Sections</div>
                                <div style={kpiValue}>{availableSections.length}</div>
                            </div>
                            <div style={kpiCard}>
                                <div style={kpiTitle}>{SVGS.userTie} Instructors</div>
                                <div style={kpiValue}>{teachers.length}</div>
                            </div>
                            <div style={{...kpiCard, borderLeft: '5px solid #dc3545', background: '#fef2f2'}}>
                                <div style={{...kpiTitle, color: '#dc3545'}}>{SVGS.alertCircle} Cancellations Today</div>
                                <div style={{...kpiValue, color: '#dc3545'}}>{classesCancelledToday}</div>
                            </div>
                        </div>

                        <div style={contentCard}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderBottom: '2px solid #f0f2f5', paddingBottom: '15px', marginBottom: '20px' }}>
                                <h3 style={{ margin: 0, color: '#002147', display: 'flex', alignItems: 'center', gap: '8px' }}>{SVGS.chart} Deep Analytics</h3>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <button onClick={() => setAnalyticsView('attendance')} style={subTabBtn(analyticsView === 'attendance')}>Class Health</button>
                                    <button onClick={() => setAnalyticsView('teachers')} style={subTabBtn(analyticsView === 'teachers')}>Teacher Eval</button>
                                </div>
                            </div>

                            {analyticsView === 'attendance' && (
                                <div className="expand-anim">
                                    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                                        <select value={filterSem} onChange={e=>setFilterSem(e.target.value)} style={{...selectStyle, flex:1, marginBottom: 0}}>
                                            <option value="">Select Semester...</option>
                                            {availableSemesters.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                        <select value={filterSec} onChange={e=>setFilterSec(e.target.value)} style={{...selectStyle, flex:1, marginBottom: 0}}>
                                            <option value="">Select Section...</option>
                                            {availableSections.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    
                                    {filterSem && filterSec ? (
                                        <div style={{ textAlign: 'center', padding: '30px', background: '#f8f9fa', borderRadius: '12px', border: '1px solid #e9ecef' }}>
                                            <div style={{ fontSize: '1rem', color: '#666', fontWeight: 'bold', marginBottom: '10px' }}>Overall Attendance Health for {filterSem} - {filterSec}</div>
                                            <div style={{ fontSize: '4rem', fontWeight: '900', color: calculateOverallAttendance() >= 75 ? '#15803d' : '#dc3545' }}>
                                                {calculateOverallAttendance()}%
                                            </div>
                                        </div>
                                    ) : <div style={emptyState}>Select a Semester and Section to view attendance health.</div>}
                                </div>
                            )}

                            {analyticsView === 'teachers' && (
                                <div className="expand-anim scroll-hide" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                    <table style={tableStyle}>
                                        <thead>
                                            <tr style={tableHeaderRow}>
                                                <th style={tableHeaderCell}>Teacher Name</th>
                                                <th style={{...tableHeaderCell, textAlign: 'center'}}>Verified Conducted Lectures</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {getTeacherPerformance().map(tp => (
                                                <tr key={tp.name} style={tableDataRow}>
                                                    <td style={{...tableDataCell, fontWeight: 'bold'}}>{tp.name}</td>
                                                    <td style={{...tableDataCell, textAlign: 'center'}}>
                                                        <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 12px', borderRadius: '15px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                                            {tp.totalConducted}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ---------------------------------------------------- */}
                {/* MODULE 2: DIRECTORY & USERS */}
                {/* ---------------------------------------------------- */}
                {activeTab === 'users' && (
                    <div className="expand-anim" style={contentCard}>
                        <div style={dayFilter}>
                            <button onClick={() => setUserSubTab('crs')} style={subTabBtn(userSubTab === 'crs')}>Class Reps {pendingCrsCount > 0 && <span style={badgeRed}>{pendingCrsCount}</span>}</button>
                            <button onClick={() => setUserSubTab('teachers')} style={subTabBtn(userSubTab === 'teachers')}>Teachers {pendingTeachersCount > 0 && <span style={badgeRed}>{pendingTeachersCount}</span>}</button>
                        </div>

                        <div style={{ overflowX: 'auto' }} className="scroll-hide">
                            <table style={tableStyle}>
                                <thead>
                                    <tr style={tableHeaderRow}>
                                        <th style={tableHeaderCell}>Status</th>
                                        <th style={tableHeaderCell}>Profile Details</th>
                                        <th style={tableHeaderCell}>Contact Info</th>
                                        <th style={{...tableHeaderCell, textAlign: 'right'}}>Admin Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {userSubTab === 'crs' ? crs.map(cr => (
                                        <tr key={cr.id} style={tableDataRow}>
                                            <td style={tableDataCell}>{cr.is_approved ? <span style={statusGreen}>Active</span> : <span style={statusYellow}>Pending</span>}</td>
                                            <td style={tableDataCell}>
                                                <div style={{fontWeight: 'bold', fontSize: '0.95rem'}}>{cr.first_name || 'N/A'} {cr.last_name || ''}</div>
                                                <div style={{fontSize: '0.75rem', color: '#666', marginTop: '4px'}}>{cr.department} • {cr.semester} • Sec {cr.section}</div>
                                            </td>
                                            <td style={tableDataCell}>
                                                <div style={{display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem'}}>{SVGS.phone} {cr.phone || 'N/A'}</div>
                                            </td>
                                            <td style={{...tableDataCell, textAlign: 'right'}}>
                                                <div style={{display: 'flex', gap: '5px', justifyContent: 'flex-end'}}>
                                                    {!cr.is_approved && <button onClick={() => approveUser('cr_profiles', cr.id)} style={{...actionBtn, background: '#28a745', color: '#fff'}}>{SVGS.tick} Appr</button>}
                                                    <button onClick={() => openEditUserModal(cr, 'cr')} style={{...actionBtn, background: '#f0f2f5', color: '#007bff'}}>{SVGS.edit}</button>
                                                    <button onClick={() => rejectUser('cr_profiles', cr.id, cr.first_name)} style={{...actionBtn, background: '#fef2f2', color: '#dc3545'}}>{SVGS.trash}</button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : teachers.map(teacher => (
                                        <tr key={teacher.id} style={tableDataRow}>
                                            <td style={tableDataCell}>{teacher.is_approved ? <span style={statusGreen}>Active</span> : <span style={statusYellow}>Pending</span>}</td>
                                            <td style={tableDataCell}>
                                                <div style={{fontWeight: 'bold', fontSize: '0.95rem'}}>{teacher.name}</div>
                                                <div style={{fontSize: '0.75rem', color: '#666', marginTop: '4px'}}>CNIC: {teacher.cnic}</div>
                                            </td>
                                            <td style={tableDataCell}>
                                                <div style={{display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', marginBottom: '4px'}}>{SVGS.phone} {teacher.phone || 'N/A'}</div>
                                                <div style={{fontSize: '0.75rem', color: '#666'}}>{teacher.email}</div>
                                            </td>
                                            <td style={{...tableDataCell, textAlign: 'right'}}>
                                                <div style={{display: 'flex', gap: '5px', justifyContent: 'flex-end'}}>
                                                    {!teacher.is_approved && <button onClick={() => approveUser('teacher_profiles', teacher.id)} style={{...actionBtn, background: '#28a745', color: '#fff'}}>{SVGS.tick} Appr</button>}
                                                    <button onClick={() => openEditUserModal(teacher, 'teacher')} style={{...actionBtn, background: '#f0f2f5', color: '#007bff'}}>{SVGS.edit}</button>
                                                    <button onClick={() => rejectUser('teacher_profiles', teacher.id, teacher.name)} style={{...actionBtn, background: '#fef2f2', color: '#dc3545'}}>{SVGS.trash}</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ---------------------------------------------------- */}
                {/* MODULE 3: SCHEDULE MATRIX */}
                {/* ---------------------------------------------------- */}
                {activeTab === 'schedule' && (
                    <div className="expand-anim" style={contentCard}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
                            <div style={dayFilter} style={{marginBottom: 0}}>
                                <button onClick={() => setScheduleSubTab('base')} style={subTabBtn(scheduleSubTab === 'base')}>Base Matrix</button>
                                <button onClick={() => setScheduleSubTab('exceptions')} style={subTabBtn(scheduleSubTab === 'exceptions')}>Exceptions</button>
                            </div>
                            
                            {scheduleSubTab === 'base' && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input type="file" accept=".csv" ref={scheduleFileInputRef} onChange={handleScheduleCSVUpload} style={{ display: 'none' }} />
                                    <button onClick={() => scheduleFileInputRef.current.click()} style={{...actionBtn, background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '4px'}}>
                                        {SVGS.upload} Bulk CSV
                                    </button>
                                    <button onClick={() => {
                                        setBaseForm({ id: null, semester: '', section: '', course: '', teacher: '', room: '', day: 'MON', start_time: '8:00 AM', end_time: '9:30 AM' });
                                        setIsBaseModalOpen(true);
                                    }} style={{...actionBtn, background: '#002147', color: '#F2A900', display: 'flex', alignItems: 'center', gap: '4px'}}>
                                        {SVGS.plus} Add Form
                                    </button>
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                            <select value={filterSem} onChange={e=>setFilterSem(e.target.value)} style={{...selectStyle, flex: 1, marginBottom: 0}}>
                                <option value="">All Semesters</option>
                                {availableSemesters.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <select value={filterSec} onChange={e=>setFilterSec(e.target.value)} style={{...selectStyle, flex: 1, marginBottom: 0}}>
                                <option value="">All Sections</option>
                                {availableSections.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <select value={filterDay} onChange={e=>setFilterDay(e.target.value)} style={{...selectStyle, flex: 1, marginBottom: 0}}>
                                <option value="ALL">All Days</option>
                                {days.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>

                        <div style={{ overflowX: 'auto' }} className="scroll-hide">
                            <table style={tableStyle}>
                                <thead>
                                    <tr style={tableHeaderRow}>
                                        <th style={tableHeaderCell}>Location</th>
                                        <th style={tableHeaderCell}>Course & Teacher</th>
                                        <th style={tableHeaderCell}>Timing</th>
                                        <th style={{...tableHeaderCell, textAlign: 'right'}}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {scheduleSubTab === 'base' ? (
                                        baseSchedule
                                            .filter(b => (filterSem ? b.semester === filterSem : true) && (filterSec ? b.section === filterSec : true) && (filterDay !== 'ALL' ? b.day === filterDay : true))
                                            .map(cls => (
                                                <tr key={cls.id} style={tableDataRow}>
                                                    <td style={tableDataCell}>
                                                        <div style={{fontWeight: 'bold', color: '#002147'}}>{cls.semester}</div>
                                                        <div style={{fontSize: '0.8rem', color: '#666', marginTop: '2px'}}>Sec {cls.section}</div>
                                                    </td>
                                                    <td style={tableDataCell}>
                                                        <div style={{fontWeight: 'bold'}}>{cls.course}</div>
                                                        <div style={{fontSize: '0.8rem', color: '#666', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px'}}>{SVGS.userTie} {cls.teacher} | {SVGS.location} Rm: {cls.room}</div>
                                                    </td>
                                                    <td style={tableDataCell}>
                                                        <div style={{fontWeight: '900', color: '#F2A900'}}>{cls.day}</div>
                                                        <div style={{fontSize: '0.8rem', color: '#666', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px'}}>{SVGS.clock} {convertTo12Hour(cls.start_time)} - {convertTo12Hour(cls.end_time)}</div>
                                                    </td>
                                                    <td style={{...tableDataCell, textAlign: 'right'}}>
                                                        <div style={{display:'flex', gap:'5px', justifyContent: 'flex-end'}}>
                                                            <button onClick={() => { setBaseForm({...cls}); setIsBaseModalOpen(true); }} style={{...actionBtn, background: '#f0f2f5', color: '#333'}}>{SVGS.edit}</button>
                                                            <button onClick={() => deleteBaseSchedule(cls.id)} style={{...actionBtn, background: '#fef2f2', color: '#dc3545'}}>{SVGS.trash}</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                    ) : (
                                        exceptions
                                            .filter(ex => {
                                                const b = baseSchedule.find(bs => bs.id === ex.base_schedule_id);
                                                if(!b) return false;
                                                return (filterSem ? b.semester === filterSem : true) && (filterSec ? b.section === filterSec : true);
                                            })
                                            .map(ex => {
                                                const base = baseSchedule.find(b => b.id === ex.base_schedule_id);
                                                return (
                                                <tr key={ex.id} style={tableDataRow}>
                                                    <td style={tableDataCell}>
                                                        <div style={{fontWeight: 'bold', color: '#002147'}}>{base?.semester}</div>
                                                        <div style={{fontSize: '0.8rem', color: '#666'}}>Sec {base?.section}</div>
                                                    </td>
                                                    <td style={tableDataCell}>
                                                        <div style={{fontWeight: 'bold'}}>{base?.course}</div>
                                                        <div style={{fontSize: '0.8rem', color: '#666'}}>Target Date: {ex.exception_date}</div>
                                                    </td>
                                                    <td style={tableDataCell}>
                                                        {ex.status === 'cancelled' && <span style={statusRed}>CANCELLED</span>}
                                                        {ex.status === 'confirmed' && <span style={statusGreen}>CONFIRMED</span>}
                                                        {ex.status === 'rescheduled' && <span style={statusBlue}>MOVED: {convertTo12Hour(ex.new_start_time)} (Rm {ex.new_room})</span>}
                                                    </td>
                                                    <td style={{...tableDataCell, textAlign: 'right'}}>
                                                        <button onClick={() => deleteException(ex.id)} style={{...actionBtn, background: '#fef2f2', color: '#dc3545', width: 'auto'}}>{SVGS.undo} Undo</button>
                                                    </td>
                                                </tr>
                                            )})
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ---------------------------------------------------- */}
                {/* MODULE 4: RECORDS & ATTENDANCE VAULT */}
                {/* ---------------------------------------------------- */}
                {activeTab === 'records' && (
                    <div className="expand-anim" style={contentCard}>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                            <select value={filterSem} onChange={e=>setFilterSem(e.target.value)} style={{...selectStyle, flex:1, marginBottom: 0}}>
                                <option value="">Isolate Semester...</option>
                                {availableSemesters.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <select value={filterSec} onChange={e=>setFilterSec(e.target.value)} style={{...selectStyle, flex:1, marginBottom: 0}}>
                                <option value="">Isolate Section...</option>
                                {availableSections.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        <h3 style={{...cardHeader, borderTop: '2px solid #f0f2f5', paddingTop: '20px'}}>{SVGS.attendance} Master Attendance Log</h3>
                        <div style={{ maxHeight: '600px', overflowY: 'auto' }} className="scroll-hide">
                            {attendanceSessions.filter(s => {
                                const b = baseSchedule.find(bs => bs.id === s.base_schedule_id);
                                if (!b) return false;
                                return (filterSem ? b.semester === filterSem : true) && (filterSec ? b.section === filterSec : true);
                            }).length === 0 ? <div style={emptyState}>No session logs found for applied filters.</div> : (
                                attendanceSessions.filter(s => {
                                    const b = baseSchedule.find(bs => bs.id === s.base_schedule_id);
                                    if (!b) return false;
                                    return (filterSem ? b.semester === filterSem : true) && (filterSec ? b.section === filterSec : true);
                                }).sort((a,b) => new Date(b.session_date) - new Date(a.session_date)).map(session => {
                                    const base = baseSchedule.find(b => b.id === session.base_schedule_id);
                                    return (
                                        <div key={session.id} style={{ background:'#fff', padding:'15px', borderRadius:'10px', marginBottom:'12px', borderLeft: session.status === 'approved' ? '5px solid #28a745' : '5px solid #F2A900', border: '1px solid #e9ecef', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'}}>
                                            <div style={{display:'flex', justifyContent:'space-between', alignItems: 'center', marginBottom: '8px'}}>
                                                <strong style={{color: '#002147', fontSize: '1.05rem'}}>{base?.course || 'Deleted Course'}</strong>
                                                <span style={{fontSize:'0.75rem', color:'#666', fontWeight: 'bold', background: '#f8f9fa', padding: '4px 10px', borderRadius: '12px', border: '1px solid #dee2e6'}}>{session.session_date}</span>
                                            </div>
                                            <div style={{fontSize:'0.85rem', color:'#555', marginBottom: '15px', display: 'flex', gap: '15px'}}>
                                                <span><strong>Class:</strong> {base?.semester} - Sec {base?.section}</span>
                                                <span><strong>Teacher:</strong> {session.teacher_profiles?.name || 'Unknown'}</span>
                                            </div>
                                            <div style={{display:'flex', gap:'8px', flexWrap:'wrap'}}>
                                                <button onClick={async () => {
                                                    const status = session.status === 'approved' ? 'pending' : 'approved';
                                                    await supabase.from('attendance_sessions').update({status}).eq('id', session.id);
                                                    fetchAllData();
                                                }} style={{...actionBtn, background: session.status === 'approved' ? '#f0f2f5' : '#dcfce7', color: session.status === 'approved' ? '#333' : '#15803d', border: `1px solid ${session.status === 'approved' ? '#ddd' : '#86efac'}`, display: 'flex', alignItems: 'center', gap: '4px'}}>
                                                    {session.status === 'approved' ? <>{SVGS.cross} Unapprove</> : <>{SVGS.tickCircle} Force Approve</>}
                                                </button>
                                                
                                                <button onClick={() => openAttendanceEditor(session)} style={{...actionBtn, background: '#eff6ff', color: '#0369a1', border: '1px solid #bae6fd', display: 'flex', alignItems: 'center', gap: '4px'}}>
                                                    {SVGS.edit} Edit Data
                                                </button>
                                                
                                                <button onClick={async () => {
                                                    if(window.confirm('Wipe this attendance record entirely?')) {
                                                        await supabase.from('attendance_sessions').delete().eq('id', session.id);
                                                        fetchAllData();
                                                    }
                                                }} style={{...actionBtn, background: '#fef2f2', color: '#dc3545', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '4px'}}>
                                                    {SVGS.trash} Delete
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ========================================== */}
            {/* MODALS */}
            {/* ========================================== */}
            
            {isUserEditModalOpen && (
                <div style={modalBackdrop}>
                    <div className="expand-anim" style={modalContent}>
                        <h3 style={{ marginTop: 0, color: '#002147', borderBottom: '1px solid #eee', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {SVGS.userTie} {userEditForm.type === 'cr' ? 'Edit & Approve Class Rep' : 'Edit & Approve Teacher'}
                        </h3>
                        <form onSubmit={saveEditedUser} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {userEditForm.type === 'cr' ? (
                                <>
                                    <div style={{display:'flex', gap:'10px'}}>
                                        <input type="text" placeholder="First Name" required value={userEditForm.first_name} onChange={e=>setUserEditForm({...userEditForm, first_name:e.target.value})} style={{...selectStyle, flex:1, marginBottom: 0}} />
                                        <input type="text" placeholder="Last Name" required value={userEditForm.last_name} onChange={e=>setUserEditForm({...userEditForm, last_name:e.target.value})} style={{...selectStyle, flex:1, marginBottom: 0}} />
                                    </div>
                                    <input type="text" placeholder="Department" required value={userEditForm.department} onChange={e=>setUserEditForm({...userEditForm, department:e.target.value})} style={{...selectStyle, marginBottom: 0}} />
                                    <div style={{display:'flex', gap:'10px'}}>
                                        <input type="text" placeholder="Session/Sem (e.g. 3RD)" required value={userEditForm.semester} onChange={e=>setUserEditForm({...userEditForm, semester:e.target.value})} style={{...selectStyle, flex:1, marginBottom: 0}} />
                                        <input type="text" placeholder="Section (e.g. A)" required value={userEditForm.section} onChange={e=>setUserEditForm({...userEditForm, section:e.target.value})} style={{...selectStyle, flex:1, marginBottom: 0}} />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <input type="text" placeholder="Full Name" required value={userEditForm.name} onChange={e=>setUserEditForm({...userEditForm, name:e.target.value})} style={{...selectStyle, marginBottom: 0}} />
                                    <input type="email" placeholder="Email" value={userEditForm.email} onChange={e=>setUserEditForm({...userEditForm, email:e.target.value})} style={{...selectStyle, marginBottom: 0}} />
                                    <input type="text" placeholder="CNIC" value={userEditForm.cnic} onChange={e=>setUserEditForm({...userEditForm, cnic:e.target.value})} style={{...selectStyle, marginBottom: 0}} />
                                </>
                            )}
                            
                            <input type="text" placeholder="Phone Number" required value={userEditForm.phone} onChange={e=>setUserEditForm({...userEditForm, phone:e.target.value})} style={{...selectStyle, marginBottom: 0}} />
                            
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="button" onClick={()=>setIsUserEditModalOpen(false)} style={{...actionBtn, background: '#f0f2f5', padding: '12px', flex: 1}}>Cancel</button>
                                <button type="submit" style={{...actionBtn, background: '#28a745', color: '#fff', padding: '12px', flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'}}>{SVGS.tickCircle} Save & Approve</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isBaseModalOpen && (
                <div style={modalBackdrop}>
                    <div className="expand-anim" style={modalContent}>
                        <h3 style={{ marginTop: 0, color: '#002147', borderBottom: '1px solid #eee', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>{baseForm.id ? <>{SVGS.edit} Edit Base Lecture</> : <>{SVGS.plus} Force Add Lecture</>}</h3>
                        <form onSubmit={saveBaseSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{display:'flex', gap:'10px'}}>
                                <input type="text" placeholder="Session (e.g. Spring 2026)" required value={baseForm.semester} onChange={e=>setBaseForm({...baseForm, semester:e.target.value})} style={{...selectStyle, flex:1, marginBottom: 0}} />
                                <input type="text" placeholder="Sec (e.g. 1E)" required value={baseForm.section} onChange={e=>setBaseForm({...baseForm, section:e.target.value.toUpperCase()})} style={{...selectStyle, flex:1, marginBottom: 0}} />
                            </div>
                            <input type="text" placeholder="Course Name" required value={baseForm.course} onChange={e=>setBaseForm({...baseForm, course:e.target.value})} style={{...selectStyle, marginBottom: 0}} />
                            <input type="text" placeholder="Teacher Name" required value={baseForm.teacher} onChange={e=>setBaseForm({...baseForm, teacher:e.target.value})} style={{...selectStyle, marginBottom: 0}} />
                            <div style={{display:'flex', gap:'10px'}}>
                                <input type="text" placeholder="Room" required value={baseForm.room} onChange={e=>setBaseForm({...baseForm, room:e.target.value})} style={{...selectStyle, flex:1, marginBottom: 0}} />
                                <select required value={baseForm.day} onChange={e=>setBaseForm({...baseForm, day:e.target.value})} style={{...selectStyle, flex:1, marginBottom: 0}}>{days.map(d=><option key={d} value={d}>{d}</option>)}</select>
                            </div>
                            <div style={{display:'flex', gap:'10px'}}>
                                <select required value={baseForm.start_time} onChange={e=>setBaseForm({...baseForm, start_time:e.target.value})} style={{...selectStyle, flex:1, marginBottom: 0}}>{timeSlots.map(t=><option key={t} value={t}>{t}</option>)}</select>
                                <select required value={baseForm.end_time} onChange={e=>setBaseForm({...baseForm, end_time:e.target.value})} style={{...selectStyle, flex:1, marginBottom: 0}}>{timeSlots.map(t=><option key={t} value={t}>{t}</option>)}</select>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="button" onClick={()=>setIsBaseModalOpen(false)} style={{...actionBtn, background: '#f0f2f5', padding: '12px', flex: 1}}>Cancel</button>
                                <button type="submit" style={{...actionBtn, background: '#002147', color: '#F2A900', padding: '12px', flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'}}>{SVGS.save} Save to Matrix</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isAttendanceModalOpen && (
                <div style={modalBackdrop}>
                    <div className="expand-anim" style={{...modalContent, maxWidth: '600px', display: 'flex', flexDirection: 'column', height: '85vh'}}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
                            <h3 style={{ margin: 0, color: '#002147', display: 'flex', alignItems: 'center', gap: '6px' }}>{SVGS.edit} Admin Override: Attendance</h3>
                            <button onClick={() => setIsAttendanceModalOpen(false)} style={{ background: '#fef2f2', border: 'none', color: '#dc3545', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', cursor: 'pointer' }}>X</button>
                        </div>
                        
                        <div style={{ overflowY: 'auto', flexGrow: 1, paddingRight: '5px' }} className="scroll-hide">
                            {attendanceEditData.students.length === 0 ? <div style={emptyState}>No students in roster for this section.</div> : (
                                attendanceEditData.students.map((student) => {
                                    const currentStatus = attendanceEditData.recordsMap[student.registration_number];
                                    return (
                                        <div key={student.registration_number} style={{ border: '1px solid #eee', padding: '12px', borderRadius: '10px', marginBottom: '10px', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                            <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#002147', fontSize: '0.9rem' }}>{student.registration_number} - {student.student_name}</div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                {['Present', 'Absent', 'Leave'].map(status => (
                                                    <button
                                                        key={status}
                                                        onClick={() => handleAttendanceStatusChange(student.registration_number, status)}
                                                        style={{
                                                            flex: 1, padding: '8px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem', transition: 'all 0.2s',
                                                            background: currentStatus === status ? (status === 'Present' ? '#dcfce7' : status === 'Absent' ? '#fef2f2' : '#fef3c7') : '#f8f9fa',
                                                            color: currentStatus === status ? (status === 'Present' ? '#15803d' : status === 'Absent' ? '#dc3545' : '#b45309') : '#6b7280',
                                                            border: `1px solid ${currentStatus === status ? (status === 'Present' ? '#86efac' : status === 'Absent' ? '#fecaca' : '#fde68a') : '#e5e7eb'}`
                                                        }}
                                                    >
                                                        {status}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>

                        <div style={{ paddingTop: '15px', borderTop: '2px solid #eee', marginTop: 'auto' }}>
                            <button onClick={saveAttendanceEdits} style={{...bigBtn, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'}}>
                                {SVGS.save} Save & Override Attendance
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ==========================================
// 8. IUB THEME STYLES
// ==========================================

const welcomeBg = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: '#002147', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 3000 };
const welcomeCard = { background: '#fff', padding: '30px', borderRadius: '15px', width: '90%', maxWidth: '380px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', boxSizing: 'border-box' };
const headerStyle = { background: '#002147', color: '#F2A900', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 1000, boxShadow: '0 4px 15px rgba(0,0,0,0.2)', flexWrap: 'wrap' };
const enableBtnStyle = { background: '#F2A900', color: '#002147', border: 'none', padding: '6px 15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.3s ease', fontSize: '0.85rem' };

const tabBar = { background: '#fff', padding: '8px 4px', gap: '6px', position: 'sticky', top: '55px', zIndex: 999, boxShadow: '0 4px 10px rgba(0,0,0,0.05)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' };
const tabBtn = (active) => ({ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: '65px', padding: '8px 2px', border: 'none', background: active ? '#002147' : 'transparent', color: active ? '#F2A900' : '#666', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.3s ease', position: 'relative' });

const actionBtn = { padding: '8px 12px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.75rem', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '4px' };
const bigBtn = { width: '100%', padding: '14px', background: '#F2A900', color: '#002147', border: 'none', borderRadius: '8px', fontWeight: 900, cursor: 'pointer', transition: 'all 0.3s ease', fontSize: '0.9rem' };

const inputStyle = { width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box', background: '#f8f9fa', transition: 'all 0.3s ease' };
const selectStyle = { width: '100%', padding: '10px 12px', marginBottom: '12px', borderRadius: '8px', border: '1px solid #dee2e6', fontSize: '0.85rem', background: '#f8f9fa', outline: 'none', boxSizing: 'border-box', transition: 'all 0.3s ease', color: '#333' };

const subTabBtn = (isActive) => ({ padding: '8px 15px', border: 'none', background: isActive ? '#002147' : '#e9ecef', color: isActive ? '#F2A900' : '#555', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', gap: '6px' });
const dayFilter = { display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px', WebkitOverflowScrolling: 'touch' };

const contentCard = { background: '#fff', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: '20px' };
const cardHeader = { margin: '0 0 15px 0', borderBottom: '2px solid #f0f2f5', paddingBottom: '10px', color: '#002147', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' };

const kpiCard = { background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.04)', borderLeft: '5px solid #F2A900', transition: 'transform 0.2s' };
const kpiTitle = { color: '#666', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' };
const kpiValue = { color: '#002147', fontSize: '2.2rem', fontWeight: 900, marginTop: '8px' };

const tableStyle = { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' };
const tableHeaderRow = { background: '#f8f9fa', borderBottom: '2px solid #dee2e6' };
const tableHeaderCell = { padding: '12px 15px', color: '#495057', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' };
const tableDataRow = { borderBottom: '1px solid #eee', transition: 'background 0.2s' };
const tableDataCell = { padding: '15px', color: '#333' };

const statusGreen = { background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid #86efac' };
const statusRed = { background: '#fef2f2', color: '#dc3545', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid #fecaca' };
const statusYellow = { background: '#fef3c7', color: '#b45309', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid #fde68a' };
const statusBlue = { background: '#eff6ff', color: '#0369a1', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid #bae6fd' };

const redDot = { position: 'absolute', top: '-5px', right: '-5px', background: '#dc3545', color: 'white', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(220,53,69,0.4)' };
const newsRedDot = { position: 'absolute', top: '4px', right: '4px', width: '6px', height: '6px', background: '#dc3545', borderRadius: '50%' };
const badgeRed = { background: '#dc3545', color: 'white', borderRadius: '12px', padding: '2px 6px', fontSize: '0.65rem', marginLeft: '6px' };
const emptyState = { textAlign: 'center', padding: '30px 15px', color: '#999', fontSize: '0.9rem', background: '#f8f9fa', borderRadius: '10px', border: '1px dashed #dee2e6' };

const modalBackdrop = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,33,71,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, padding: '20px', boxSizing: 'border-box', backdropFilter: 'blur(3px)' };
const modalContent = { background: 'white', padding: '25px', borderRadius: '15px', width: '100%', maxWidth: '450px', boxShadow: '0 15px 35px rgba(0,0,0,0.2)' };
