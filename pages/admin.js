import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabase';

export default function AdminDashboard() {
    // ==========================================
    // 1. STATE MANAGEMENT
    // ==========================================
    
    // Auth State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loginUsername, setLoginUsername] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [authError, setAuthError] = useState('');

    // Global UI State
    const [activeTab, setActiveTab] = useState('overview'); 
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Global Data States
    const [crs, setCrs] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [baseSchedule, setBaseSchedule] = useState([]);
    const [exceptions, setExceptions] = useState([]);
    const [roster, setRoster] = useState([]);
    const [attendanceSessions, setAttendanceSessions] = useState([]);
    const [pointSchedules, setPointSchedules] = useState([]);

    // Module Specific States
    const [userSubTab, setUserSubTab] = useState('crs'); 
    const [scheduleSubTab, setScheduleSubTab] = useState('base'); 
    
    // Filters for Modules
    const [filterSem, setFilterSem] = useState('');
    const [filterSec, setFilterSec] = useState('');
    const [filterDay, setFilterDay] = useState('ALL');

    // Modals & Forms
    const [isBaseModalOpen, setIsBaseModalOpen] = useState(false);
    const [baseForm, setBaseForm] = useState({ id: null, semester: '', section: '', course: '', teacher: '', room: '', day: 'MON', start_time: '8:00 AM', end_time: '9:30 AM' });
    
    const [isPointModalOpen, setIsPointModalOpen] = useState(false);
    const [pointForm, setPointForm] = useState({ id: null, route: 'AC_to_BJC', departure_time: '08:00', is_saturday: false });

    const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
    const [studentForm, setStudentForm] = useState({ id: null, student_name: '', roll_number: '', semester: '', section: '' });

    const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
    const [attendanceEditData, setAttendanceEditData] = useState({ session: null, recordsMap: {}, students: [] });

    // NEW: User Edit & Approve Modal State
    const [isUserEditModalOpen, setIsUserEditModalOpen] = useState(false);
    const [userEditForm, setUserEditForm] = useState({ id: null, type: 'cr', first_name: '', last_name: '', name: '', department: '', semester: '', section: '', phone: '', cnic: '' });

    const [globalAlertMsg, setGlobalAlertMsg] = useState('');
    const fileInputRef = useRef(null);

    // Extracted Dropdown Data
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
    // 2. AUTHENTICATION & DATA FETCHING
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

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [
                { data: crData }, { data: teacherData }, { data: scheduleData }, 
                { data: exceptionsData }, { data: rosterData }, { data: sessionsData }, { data: pointsData }
            ] = await Promise.all([
                supabase.from('cr_profiles').select('*'),
                supabase.from('teacher_profiles').select('*'),
                supabase.from('base_schedule').select('*'),
                supabase.from('schedule_exceptions').select('*'),
                supabase.from('class_roster').select('*').order('roll_number', { ascending: true }),
                supabase.from('attendance_sessions').select('*, teacher_profiles(name), auth_users:submitted_by(email)'),
                supabase.from('point_schedules').select('*')
            ]);

            setCrs(crData || []);
            setTeachers(teacherData || []);
            setBaseSchedule(scheduleData || []);
            setExceptions(exceptionsData || []);
            setRoster(rosterData || []);
            setAttendanceSessions(sessionsData || []);
            setPointSchedules(pointsData || []);
        } catch (error) {
            console.error("Error fetching admin data:", error);
            alert("Database connection error.");
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
    // 3. MODULE FUNCTIONS: USERS (WITH APPROVAL LOGIC)
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
            type: type, // 'cr' or 'teacher'
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            name: user.name || '',
            department: user.department || '',
            semester: user.semester || '',
            section: user.section || '',
            phone: user.phone || '',
            cnic: user.cnic || ''
        });
        setIsUserEditModalOpen(true);
    };

    const saveEditedUser = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        
        const table = userEditForm.type === 'cr' ? 'cr_profiles' : 'teacher_profiles';
        let payload = {};
        
        if (userEditForm.type === 'cr') {
            payload = { 
                first_name: userEditForm.first_name, 
                last_name: userEditForm.last_name, 
                department: userEditForm.department, 
                semester: userEditForm.semester, 
                section: userEditForm.section, 
                phone: userEditForm.phone, 
                is_approved: true // Automatically approves upon edit
            };
        } else {
            payload = { 
                name: userEditForm.name, 
                phone: userEditForm.phone, 
                cnic: userEditForm.cnic, 
                is_approved: true 
            };
        }

        await supabase.from(table).update(payload).eq('id', userEditForm.id);
        setIsUserEditModalOpen(false);
        await fetchAllData();
        setActionLoading(false);
    };

    const rejectUser = async (table, id, name) => {
        if(!window.confirm(`Are you sure you want to reject and delete ${name}? This removes their profile completely.`)) return;
        setActionLoading(true);
        await supabase.from(table).delete().eq('id', id);
        await fetchAllData();
        setActionLoading(false);
    };

    // ==========================================
    // 4. MODULE FUNCTIONS: SCHEDULE
    // ==========================================
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

    const deleteException = async (id) => {
        if(!window.confirm('Force delete this exception and restore base schedule?')) return;
        setActionLoading(true);
        await supabase.from('schedule_exceptions').delete().eq('id', id);
        await fetchAllData();
        setActionLoading(false);
    };

    // ==========================================
    // 5. MODULE FUNCTIONS: ACADEMIC RECORDS 
    // ==========================================
    const saveStudent = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        const payload = { ...studentForm };
        delete payload.id;

        if (studentForm.id) await supabase.from('class_roster').update(payload).eq('id', studentForm.id);
        else await supabase.from('class_roster').insert([payload]);
        
        setIsStudentModalOpen(false);
        await fetchAllData();
        setActionLoading(false);
    };

    const handleCSVUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!filterSem || !filterSec) {
            alert("Please select a Semester and Section from the dropdowns first before importing CSV.");
            e.target.value = null;
            return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
            setActionLoading(true);
            try {
                const text = event.target.result;
                const rows = text.split('\n').map(r => r.split(','));
                const payloads = [];
                
                let startIndex = rows[0].join('').toLowerCase().includes('roll') ? 1 : 0;

                for(let i = startIndex; i < rows.length; i++) {
                    const row = rows[i];
                    if (row.length >= 2) {
                        const roll = row[0].trim();
                        const name = row[1].trim();
                        if (roll && name) {
                            payloads.push({ student_name: name, roll_number: roll, semester: filterSem, section: filterSec });
                        }
                    }
                }

                if (payloads.length > 0) {
                    const { error } = await supabase.from('class_roster').insert(payloads);
                    if (error) alert("Error importing: " + error.message);
                    else {
                        alert(`Successfully imported ${payloads.length} students!`);
                        await fetchAllData();
                    }
                } else {
                    alert("No valid data found in CSV.");
                }
            } catch (err) {
                alert("Failed to parse CSV.");
            }
            setActionLoading(false);
            e.target.value = null;
        };
        reader.readAsText(file);
    };

    // -- Attendance Logic --
    const openAttendanceEditor = async (session) => {
        setActionLoading(true);
        const base = baseSchedule.find(b => b.id === session.base_schedule_id);
        
        const { data: records } = await supabase.from('attendance_records').select('*').eq('session_id', session.id);
        
        const { data: students } = await supabase.from('class_roster')
            .select('*')
            .eq('semester', base.semester)
            .eq('section', base.section)
            .order('roll_number', { ascending: true });

        const recordsMap = {};
        if (records) {
            records.forEach(r => recordsMap[r.student_id] = r.status);
        }
        
        if (students) {
            students.forEach(s => {
                if (!recordsMap[s.id]) recordsMap[s.id] = 'Absent';
            });
        }

        setAttendanceEditData({ session, recordsMap, students: students || [] });
        setIsAttendanceModalOpen(true);
        setActionLoading(false);
    };

    const handleAttendanceStatusChange = (studentId, status) => {
        setAttendanceEditData(prev => ({
            ...prev,
            recordsMap: { ...prev.recordsMap, [studentId]: status }
        }));
    };

    const saveAttendanceEdits = async () => {
        setActionLoading(true);
        const { session, recordsMap, students } = attendanceEditData;
        
        await supabase.from('attendance_records').delete().eq('session_id', session.id);
        
        const payloads = students.map(s => ({
            session_id: session.id,
            student_id: s.id,
            status: recordsMap[s.id]
        }));

        const { error } = await supabase.from('attendance_records').insert(payloads);
        
        if (error) alert("Error saving attendance: " + error.message);
        else {
            alert("Attendance successfully updated!");
            setIsAttendanceModalOpen(false);
            await fetchAllData();
        }
        setActionLoading(false);
    };

    // ==========================================
    // 6. MODULE FUNCTIONS: INFRASTRUCTURE
    // ==========================================
    const savePointSchedule = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        const payload = { route: pointForm.route, departure_time: pointForm.departure_time, is_saturday: pointForm.is_saturday };
        if (pointForm.id) await supabase.from('point_schedules').update(payload).eq('id', pointForm.id);
        else await supabase.from('point_schedules').insert([payload]);
        setIsPointModalOpen(false);
        await fetchAllData();
        setActionLoading(false);
    };

    const deletePointSchedule = async (id) => {
        if(!window.confirm('Delete this point timing?')) return;
        setActionLoading(true);
        await supabase.from('point_schedules').delete().eq('id', id);
        await fetchAllData();
        setActionLoading(false);
    };

    const sendGlobalAlert = async (e) => {
        e.preventDefault();
        if(!globalAlertMsg) return;
        if(!window.confirm('Push this alert to ALL active devices?')) return;
        setActionLoading(true);
        
        const sectionsToAlert = [...new Set(baseSchedule.map(s => s.section))];
        const payloads = sectionsToAlert.map(sec => ({
            message: `🔴 ADMIN BROADCAST [${sec}]: ${globalAlertMsg}`
        }));

        await supabase.from('notifications').insert(payloads);
        setGlobalAlertMsg('');
        alert('Global Alert Dispatched!');
        setActionLoading(false);
    };


    // ==========================================
    // 7. RENDERERS
    // ==========================================

    if (!isAuthenticated) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', fontFamily: "'Inter', sans-serif" }}>
                <Head><title>Admin Panel | IUB Assistant</title></Head>
                <div style={{ background: 'white', padding: '40px', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                    <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                        <h1 style={{ margin: 0, color: '#1e293b', fontSize: '1.8rem', fontWeight: 900 }}>Admin God-Mode</h1>
                        <p style={{ margin: '5px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>System Control Panel</p>
                    </div>
                    {authError && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '12px', borderRadius: '6px', marginBottom: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>{authError}</div>}
                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div>
                            <label style={labelStyle}>Username</label>
                            <input type="text" value={loginUsername} onChange={e=>setLoginUsername(e.target.value)} required style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>Password</label>
                            <input type="password" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} required style={inputStyle} />
                        </div>
                        <button type="submit" style={{ ...btnPrimary, marginTop: '10px', padding: '14px' }}>Authorize Access</button>
                    </form>
                </div>
            </div>
        );
    }

    if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#475569', fontWeight: 'bold' }}>Initializing Global Database...</div>;

    const today = new Date().toLocaleDateString('en-CA');
    const todaysExceptions = exceptions.filter(e => e.exception_date === today);
    const classesCancelledToday = todaysExceptions.filter(e => e.status === 'cancelled').length;
    
    // Count pending users for KPI
    const pendingCrsCount = crs.filter(c => !c.is_approved).length;
    const pendingTeachersCount = teachers.filter(t => !t.is_approved).length;

    return (
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: "'Inter', sans-serif" }}>
            <Head><title>Admin Dashboard | IUB Assistant</title></Head>
            
            {/* MOBILE HAMBURGER */}
            <button onClick={() => setIsSidebarOpen(true)} style={{ display: 'md-none', position: 'fixed', top: '15px', left: '15px', zIndex: 50, background: '#1e293b', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', ...mobileOnlyShow }}>
                ☰ Menu
            </button>

            {/* SIDEBAR */}
            <aside style={{ ...sidebarStyle, transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ margin: 0, color: 'white', fontSize: '1.2rem', fontWeight: 900 }}>IUB Admin</h2>
                        <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 'bold' }}>● SYSTEM ONLINE</span>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer', ...mobileOnlyShow }}>×</button>
                </div>

                <nav style={{ padding: '20px 10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <button onClick={() => {setActiveTab('overview'); setIsSidebarOpen(false);}} style={navItemStyle(activeTab === 'overview')}>📊 System Overview</button>
                    <button onClick={() => {setActiveTab('users'); setIsSidebarOpen(false);}} style={navItemStyle(activeTab === 'users')}>👥 User Management {(pendingCrsCount + pendingTeachersCount) > 0 && <span style={{background:'red', color:'white', padding:'2px 6px', borderRadius:'10px', fontSize:'0.7rem', marginLeft:'5px'}}>{pendingCrsCount + pendingTeachersCount}</span>}</button>
                    <button onClick={() => {setActiveTab('schedule'); setIsSidebarOpen(false);}} style={navItemStyle(activeTab === 'schedule')}>📅 Schedule Master</button>
                    <button onClick={() => {setActiveTab('records'); setIsSidebarOpen(false);}} style={navItemStyle(activeTab === 'records')}>📝 Academic Records</button>
                    <button onClick={() => {setActiveTab('infrastructure'); setIsSidebarOpen(false);}} style={navItemStyle(activeTab === 'infrastructure')}>🚌 Infrastructure & Alerts</button>
                </nav>

                <div style={{ padding: '20px', marginTop: 'auto', borderTop: '1px solid #334155' }}>
                    <button onClick={handleLogout} style={{ width: '100%', padding: '10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Log Out Session</button>
                </div>
            </aside>

            {/* MAIN WORKSPACE */}
            <main style={{ flex: 1, padding: '30px', marginLeft: 0, overflowY: 'auto', ...mainContentResponsive }}>
                
                {/* LOADER OVERLAY */}
                {actionLoading && <div style={loaderOverlay}>Processing Global Action...</div>}

                {/* ---------------------------------------------------- */}
                {/* MODULE 1: OVERVIEW */}
                {/* ---------------------------------------------------- */}
                {activeTab === 'overview' && (
                    <div className="animate-fade-in">
                        <h2 style={sectionHeader}>System Overview</h2>
                        <div style={kpiGrid}>
                            <div style={kpiCard}>
                                <div style={kpiTitle}>Total Class Reps</div>
                                <div style={kpiValue}>{crs.length}</div>
                            </div>
                            <div style={kpiCard}>
                                <div style={kpiTitle}>Total Teachers</div>
                                <div style={kpiValue}>{teachers.length}</div>
                            </div>
                            <div style={kpiCard}>
                                <div style={kpiTitle}>Base Lectures Tracked</div>
                                <div style={kpiValue}>{baseSchedule.length}</div>
                            </div>
                            <div style={{...kpiCard, borderBottom: '4px solid #ef4444'}}>
                                <div style={kpiTitle}>Classes Cancelled Today</div>
                                <div style={{...kpiValue, color: '#ef4444'}}>{classesCancelledToday}</div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '30px' }}>
                            <div style={contentCard}>
                                <h3 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>Recent Exception Activity</h3>
                                {exceptions.slice(0, 5).map(ex => {
                                    const base = baseSchedule.find(b => b.id === ex.base_schedule_id);
                                    return (
                                        <div key={ex.id} style={{ padding: '10px', background: '#f8fafc', borderRadius: '6px', marginBottom: '10px', fontSize: '0.85rem' }}>
                                            <strong>{base?.course || 'Unknown'} (Sec {base?.section})</strong><br/>
                                            <span style={{ color: ex.status === 'cancelled' ? '#ef4444' : '#3b82f6' }}>{ex.status.toUpperCase()}</span> on {ex.exception_date}
                                        </div>
                                    );
                                })}
                            </div>
                            <div style={contentCard}>
                                <h3 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>Pending Attendance Approvals</h3>
                                {attendanceSessions.filter(s => s.status === 'pending').map(session => {
                                    const base = baseSchedule.find(b => b.id === session.base_schedule_id);
                                    return (
                                        <div key={session.id} style={{ padding: '10px', background: '#fef9c3', borderLeft: '4px solid #eab308', borderRadius: '6px', marginBottom: '10px', fontSize: '0.85rem' }}>
                                            <strong>{base?.course || 'Unknown'} (Sec {base?.section})</strong><br/>
                                            Submitted on: {session.session_date} | Teacher: {session.teacher_profiles?.name}
                                        </div>
                                    );
                                })}
                                {attendanceSessions.filter(s => s.status === 'pending').length === 0 && <p style={{color: '#94a3b8'}}>All caught up.</p>}
                            </div>
                        </div>
                    </div>
                )}

                {/* ---------------------------------------------------- */}
                {/* MODULE 2: USERS (WITH APPROVAL SYSTEM) */}
                {/* ---------------------------------------------------- */}
                {activeTab === 'users' && (
                    <div className="animate-fade-in">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                            <h2 style={{...sectionHeader, margin: 0}}>User Management</h2>
                            <div style={{ display: 'flex', background: '#e2e8f0', padding: '4px', borderRadius: '8px' }}>
                                <button onClick={() => setUserSubTab('crs')} style={toggleBtn(userSubTab === 'crs')}>Class Reps {pendingCrsCount > 0 && <span style={{color:'red'}}>({pendingCrsCount})</span>}</button>
                                <button onClick={() => setUserSubTab('teachers')} style={toggleBtn(userSubTab === 'teachers')}>Teachers {pendingTeachersCount > 0 && <span style={{color:'red'}}>({pendingTeachersCount})</span>}</button>
                            </div>
                        </div>

                        <div style={{...contentCard, overflowX: 'auto'}}>
                            <table style={tableStyle}>
                                <thead>
                                    <tr>
                                        <th style={thStyle}>Status</th>
                                        <th style={thStyle}>Name</th>
                                        <th style={thStyle}>Contact</th>
                                        <th style={thStyle}>{userSubTab === 'crs' ? 'Dept / Sem / Sec' : 'CNIC'}</th>
                                        <th style={thStyle}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {userSubTab === 'crs' ? crs.map(cr => (
                                        <tr key={cr.id} style={trStyle}>
                                            <td style={tdStyle}>
                                                {cr.is_approved ? (
                                                    <span style={{...statusBadge, background:'#dcfce7', color:'#16a34a'}}>Active</span>
                                                ) : (
                                                    <span style={{...statusBadge, background:'#fef9c3', color:'#eab308'}}>Pending</span>
                                                )}
                                            </td>
                                            <td style={tdStyle}><strong>{cr.first_name || 'N/A'} {cr.last_name || ''}</strong></td>
                                            <td style={tdStyle}>{cr.phone || 'No Phone'}</td>
                                            <td style={tdStyle}>{cr.department} | {cr.semester} | Sec {cr.section}</td>
                                            <td style={tdStyle}>
                                                {!cr.is_approved ? (
                                                    <div style={{display: 'flex', gap: '5px', flexWrap: 'wrap'}}>
                                                        <button onClick={() => approveUser('cr_profiles', cr.id)} style={btnSuccessSmall}>Approve</button>
                                                        <button onClick={() => openEditUserModal(cr, 'cr')} style={btnEditSmall}>Edit & Approve</button>
                                                        <button onClick={() => rejectUser('cr_profiles', cr.id, cr.first_name)} style={btnDangerSmall}>Reject</button>
                                                    </div>
                                                ) : (
                                                    <div style={{display: 'flex', gap: '5px', flexWrap: 'wrap'}}>
                                                        <button onClick={() => openEditUserModal(cr, 'cr')} style={btnEditSmall}>Edit</button>
                                                        <button onClick={() => rejectUser('cr_profiles', cr.id, cr.first_name)} style={btnDangerSmall}>Revoke Access</button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )) : teachers.map(teacher => (
                                        <tr key={teacher.id} style={trStyle}>
                                            <td style={tdStyle}>
                                                {teacher.is_approved ? (
                                                    <span style={{...statusBadge, background:'#dcfce7', color:'#16a34a'}}>Active</span>
                                                ) : (
                                                    <span style={{...statusBadge, background:'#fef9c3', color:'#eab308'}}>Pending</span>
                                                )}
                                            </td>
                                            <td style={tdStyle}><strong>{teacher.name}</strong></td>
                                            <td style={tdStyle}>{teacher.email}<br/><span style={{fontSize:'0.8rem', color:'#64748b'}}>{teacher.phone}</span></td>
                                            <td style={tdStyle}>{teacher.cnic}</td>
                                            <td style={tdStyle}>
                                                {!teacher.is_approved ? (
                                                    <div style={{display: 'flex', gap: '5px', flexWrap: 'wrap'}}>
                                                        <button onClick={() => approveUser('teacher_profiles', teacher.id)} style={btnSuccessSmall}>Approve</button>
                                                        <button onClick={() => openEditUserModal(teacher, 'teacher')} style={btnEditSmall}>Edit & Approve</button>
                                                        <button onClick={() => rejectUser('teacher_profiles', teacher.id, teacher.name)} style={btnDangerSmall}>Reject</button>
                                                    </div>
                                                ) : (
                                                    <div style={{display: 'flex', gap: '5px', flexWrap: 'wrap'}}>
                                                        <button onClick={() => openEditUserModal(teacher, 'teacher')} style={btnEditSmall}>Edit</button>
                                                        <button onClick={() => rejectUser('teacher_profiles', teacher.id, teacher.name)} style={btnDangerSmall}>Revoke Access</button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {(userSubTab === 'crs' ? crs : teachers).length === 0 && <p style={{textAlign:'center', padding:'20px', color:'#94a3b8'}}>No records found.</p>}
                        </div>
                    </div>
                )}

                {/* ---------------------------------------------------- */}
                {/* MODULE 3: SCHEDULE MASTER */}
                {/* ---------------------------------------------------- */}
                {activeTab === 'schedule' && (
                    <div className="animate-fade-in">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                            <h2 style={{...sectionHeader, margin: 0}}>Schedule Master</h2>
                            <div style={{ display: 'flex', background: '#e2e8f0', padding: '4px', borderRadius: '8px' }}>
                                <button onClick={() => setScheduleSubTab('base')} style={toggleBtn(scheduleSubTab === 'base')}>Base Matrix</button>
                                <button onClick={() => setScheduleSubTab('exceptions')} style={toggleBtn(scheduleSubTab === 'exceptions')}>Global Exceptions</button>
                            </div>
                        </div>

                        {/* FILTERS */}
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                            <select value={filterSem} onChange={e=>setFilterSem(e.target.value)} style={filterSelect}>
                                <option value="">All Semesters</option>
                                {availableSemesters.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <select value={filterSec} onChange={e=>setFilterSec(e.target.value)} style={filterSelect}>
                                <option value="">All Sections</option>
                                {availableSections.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <select value={filterDay} onChange={e=>setFilterDay(e.target.value)} style={filterSelect}>
                                <option value="ALL">All Days</option>
                                {days.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                            {scheduleSubTab === 'base' && (
                                <button onClick={() => {
                                    setBaseForm({ id: null, semester: '', section: '', course: '', teacher: '', room: '', day: 'MON', start_time: '8:00 AM', end_time: '9:30 AM' });
                                    setIsBaseModalOpen(true);
                                }} style={{...btnPrimary, marginLeft: 'auto'}}>+ Force Add Lecture</button>
                            )}
                        </div>

                        <div style={{...contentCard, overflowX: 'auto'}}>
                            <table style={tableStyle}>
                                <thead>
                                    <tr>
                                        <th style={thStyle}>Loc</th>
                                        <th style={thStyle}>Course & Teacher</th>
                                        <th style={thStyle}>Timing / Day</th>
                                        <th style={thStyle}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {scheduleSubTab === 'base' ? (
                                        baseSchedule
                                            .filter(b => (filterSem ? b.semester === filterSem : true) && (filterSec ? b.section === filterSec : true) && (filterDay !== 'ALL' ? b.day === filterDay : true))
                                            .map(cls => (
                                                <tr key={cls.id} style={trStyle}>
                                                    <td style={tdStyle}><span style={badgeStyle}>{cls.semester} | Sec {cls.section}</span></td>
                                                    <td style={tdStyle}><strong>{cls.course}</strong><br/><span style={{fontSize:'0.8rem', color:'#64748b'}}>{cls.teacher} | {cls.room}</span></td>
                                                    <td style={tdStyle}><strong>{cls.day}</strong><br/>{convertTo12Hour(cls.start_time)} - {convertTo12Hour(cls.end_time)}</td>
                                                    <td style={tdStyle}>
                                                        <div style={{display:'flex', gap:'5px'}}>
                                                            <button onClick={() => { setBaseForm({...cls}); setIsBaseModalOpen(true); }} style={btnEditSmall}>Edit</button>
                                                            <button onClick={() => deleteBaseSchedule(cls.id)} style={btnDangerSmall}>Kill</button>
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
                                                <tr key={ex.id} style={trStyle}>
                                                    <td style={tdStyle}><span style={badgeStyle}>{base?.semester} | Sec {base?.section}</span></td>
                                                    <td style={tdStyle}><strong>{base?.course}</strong><br/><span style={{fontSize:'0.8rem', color:'#64748b'}}>Target Date: {ex.exception_date}</span></td>
                                                    <td style={tdStyle}>
                                                        {ex.status === 'cancelled' && <span style={{...statusBadge, background:'#fee2e2', color:'#dc2626'}}>CANCELLED</span>}
                                                        {ex.status === 'confirmed' && <span style={{...statusBadge, background:'#dcfce7', color:'#16a34a'}}>CONFIRMED</span>}
                                                        {ex.status === 'rescheduled' && <span style={{...statusBadge, background:'#dbeafe', color:'#2563eb'}}>MOVED: {convertTo12Hour(ex.new_start_time)} (Rm {ex.new_room})</span>}
                                                    </td>
                                                    <td style={tdStyle}>
                                                        <button onClick={() => deleteException(ex.id)} style={btnDangerSmall}>Undo Exception</button>
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
                {/* MODULE 4: ACADEMIC RECORDS */}
                {/* ---------------------------------------------------- */}
                {activeTab === 'records' && (
                    <div className="animate-fade-in">
                        <h2 style={sectionHeader}>Academic Records Sandbox</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
                            
                            {/* ROSTER VIEWER */}
                            <div style={contentCard}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                                    <h3 style={{ margin: 0 }}>Global Roster Index</h3>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button onClick={() => {
                                            setStudentForm({ id: null, student_name: '', roll_number: '', semester: filterSem || '', section: filterSec || '' });
                                            setIsStudentModalOpen(true);
                                        }} style={btnPrimarySmall}>+ Add</button>
                                        <input type="file" accept=".csv" ref={fileInputRef} onChange={handleCSVUpload} style={{ display: 'none' }} />
                                        <button onClick={() => fileInputRef.current.click()} style={{...btnPrimarySmall, background: '#10b981'}}>CSV Import</button>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                                    <select value={filterSem} onChange={e=>setFilterSem(e.target.value)} style={{...filterSelect, flex:1}}>
                                        <option value="">Select Sem</option>
                                        {availableSemesters.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    <select value={filterSec} onChange={e=>setFilterSec(e.target.value)} style={{...filterSelect, flex:1}}>
                                        <option value="">Select Sec</option>
                                        {availableSections.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                    {(!filterSem || !filterSec) ? <p style={{color:'#94a3b8', textAlign:'center'}}>Select filters to view roster.</p> : (
                                        <table style={{width:'100%', fontSize:'0.85rem'}}>
                                            <tbody>
                                                {roster.filter(r => r.semester === filterSem && r.section === filterSec).map(s => (
                                                    <tr key={s.id} style={{borderBottom:'1px solid #f1f5f9'}}>
                                                        <td style={{padding:'8px 0'}}><strong>{s.roll_number}</strong></td>
                                                        <td style={{padding:'8px 0'}}>{s.student_name}</td>
                                                        <td style={{padding:'8px 0', textAlign:'right', display:'flex', gap:'5px', justifyContent:'flex-end'}}>
                                                            <button onClick={() => { setStudentForm(s); setIsStudentModalOpen(true); }} style={btnEditSmall}>Edit</button>
                                                            <button onClick={async ()=>{
                                                                if(window.confirm('Delete student?')) {
                                                                    await supabase.from('class_roster').delete().eq('id', s.id);
                                                                    fetchAllData();
                                                                }
                                                            }} style={btnDangerSmall}>X</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>

                            {/* ATTENDANCE VAULT */}
                            <div style={contentCard}>
                                <h3 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>Attendance Vault (Raw Data)</h3>
                                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                    {attendanceSessions.length === 0 ? <p style={{color:'#94a3b8'}}>No sessions recorded yet.</p> : (
                                        attendanceSessions.sort((a,b) => new Date(b.session_date) - new Date(a.session_date)).map(session => {
                                            const base = baseSchedule.find(b => b.id === session.base_schedule_id);
                                            return (
                                                <div key={session.id} style={{ background:'#f8fafc', padding:'12px', borderRadius:'8px', marginBottom:'10px', borderLeft: session.status === 'approved' ? '4px solid #10b981' : '4px solid #f59e0b'}}>
                                                    <div style={{display:'flex', justifyContent:'space-between'}}>
                                                        <strong>{base?.course || 'Deleted Course'}</strong>
                                                        <span style={{fontSize:'0.8rem', color:'#64748b'}}>{session.session_date}</span>
                                                    </div>
                                                    <div style={{fontSize:'0.8rem', color:'#64748b', marginTop:'5px'}}>
                                                        Sec: {base?.section} ({base?.semester}) | By: {session.auth_users?.email || 'Unknown'}
                                                    </div>
                                                    <div style={{marginTop:'10px', display:'flex', gap:'5px', flexWrap:'wrap'}}>
                                                        <button onClick={async () => {
                                                            const status = session.status === 'approved' ? 'pending' : 'approved';
                                                            await supabase.from('attendance_sessions').update({status}).eq('id', session.id);
                                                            fetchAllData();
                                                        }} style={{...btnEditSmall, flex: 1}}>{session.status === 'approved' ? 'Unapprove' : 'Force Approve'}</button>
                                                        
                                                        <button onClick={() => openAttendanceEditor(session)} style={{...btnPrimarySmall, background:'#3b82f6', flex: 1}}>Edit Records</button>
                                                        
                                                        <button onClick={async () => {
                                                            if(window.confirm('Wipe this attendance record entirely?')) {
                                                                await supabase.from('attendance_sessions').delete().eq('id', session.id);
                                                                fetchAllData();
                                                            }
                                                        }} style={{...btnDangerSmall, flex: 1}}>Wipe Data</button>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>
                )}

                {/* ---------------------------------------------------- */}
                {/* MODULE 6: INFRASTRUCTURE */}
                {/* ---------------------------------------------------- */}
                {activeTab === 'infrastructure' && (
                    <div className="animate-fade-in">
                        <h2 style={sectionHeader}>Infrastructure & Global Comm</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                            
                            {/* GLOBAL BROADCAST */}
                            <div style={contentCard}>
                                <h3 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', color: '#ef4444' }}>⚠️ Global Emergency Broadcast</h3>
                                <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '15px' }}>Push a high-priority notification to every single registered section simultaneously.</p>
                                <form onSubmit={sendGlobalAlert}>
                                    <textarea 
                                        required 
                                        value={globalAlertMsg}
                                        onChange={e=>setGlobalAlertMsg(e.target.value)}
                                        placeholder="Enter emergency message here... (e.g. University closed today)"
                                        style={{...inputStyle, minHeight: '100px', resize: 'vertical'}}
                                    />
                                    <button type="submit" style={{...btnPrimary, background: '#ef4444', marginTop: '10px', width: '100%'}}>DISPATCH GLOBAL ALERT</button>
                                </form>
                            </div>

                            {/* BUS POINTS */}
                            <div style={contentCard}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                                    <h3 style={{ margin: 0 }}>Bus Point Logic Engine</h3>
                                    <button onClick={() => {
                                        setPointForm({ id: null, route: 'AC_to_BJC', departure_time: '08:00', is_saturday: false });
                                        setIsPointModalOpen(true);
                                    }} style={btnPrimarySmall}>+ Add Route</button>
                                </div>
                                
                                <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                                    <table style={{width:'100%', fontSize:'0.85rem'}}>
                                        <thead>
                                            <tr style={{background:'#f1f5f9', textAlign:'left'}}>
                                                <th style={{padding:'8px'}}>Route</th>
                                                <th style={{padding:'8px'}}>Time</th>
                                                <th style={{padding:'8px'}}>Type</th>
                                                <th style={{padding:'8px'}}>Act</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pointSchedules.sort((a,b) => a.departure_time.localeCompare(b.departure_time)).map(p => (
                                                <tr key={p.id} style={{borderBottom:'1px solid #f8fafc'}}>
                                                    <td style={{padding:'8px'}}>{p.route === 'AC_to_BJC' ? 'AC ➔ BJC' : 'BJC ➔ AC'}</td>
                                                    <td style={{padding:'8px'}}><strong>{convertTo12Hour(p.departure_time.slice(0,5))}</strong></td>
                                                    <td style={{padding:'8px'}}>{p.is_saturday ? <span style={{color:'#eab308', fontWeight:'bold'}}>Weekend</span> : 'Weekday'}</td>
                                                    <td style={{padding:'8px'}}>
                                                        <button onClick={() => {setPointForm(p); setIsPointModalOpen(true);}} style={{color:'#3b82f6', border:'none', background:'none', cursor:'pointer', marginRight:'5px'}}>Edit</button>
                                                        <button onClick={() => deletePointSchedule(p.id)} style={{color:'#ef4444', border:'none', background:'none', cursor:'pointer'}}>Del</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                        </div>
                    </div>
                )}
            </main>

            {/* ========================================== */}
            {/* MODALS */}
            {/* ========================================== */}
            
            {/* USER EDIT & APPROVE MODAL */}
            {isUserEditModalOpen && (
                <div style={modalBackdrop}>
                    <div style={modalContent}>
                        <h3 style={{ marginTop: 0, borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                            {userEditForm.type === 'cr' ? 'Edit & Approve Class Rep' : 'Edit & Approve Teacher'}
                        </h3>
                        <form onSubmit={saveEditedUser} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {userEditForm.type === 'cr' ? (
                                <>
                                    <div style={{display:'flex', gap:'10px'}}>
                                        <input type="text" placeholder="First Name" required value={userEditForm.first_name} onChange={e=>setUserEditForm({...userEditForm, first_name:e.target.value})} style={{...inputStyle, flex:1}} />
                                        <input type="text" placeholder="Last Name" required value={userEditForm.last_name} onChange={e=>setUserEditForm({...userEditForm, last_name:e.target.value})} style={{...inputStyle, flex:1}} />
                                    </div>
                                    <input type="text" placeholder="Department" required value={userEditForm.department} onChange={e=>setUserEditForm({...userEditForm, department:e.target.value})} style={inputStyle} />
                                    <div style={{display:'flex', gap:'10px'}}>
                                        <input type="text" placeholder="Semester (e.g. 3RD)" required value={userEditForm.semester} onChange={e=>setUserEditForm({...userEditForm, semester:e.target.value})} style={{...inputStyle, flex:1}} />
                                        <input type="text" placeholder="Section (e.g. A)" required value={userEditForm.section} onChange={e=>setUserEditForm({...userEditForm, section:e.target.value})} style={{...inputStyle, flex:1}} />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <input type="text" placeholder="Full Name" required value={userEditForm.name} onChange={e=>setUserEditForm({...userEditForm, name:e.target.value})} style={inputStyle} />
                                    <input type="text" placeholder="CNIC" value={userEditForm.cnic} onChange={e=>setUserEditForm({...userEditForm, cnic:e.target.value})} style={inputStyle} />
                                </>
                            )}
                            
                            <input type="text" placeholder="Phone Number" required value={userEditForm.phone} onChange={e=>setUserEditForm({...userEditForm, phone:e.target.value})} style={inputStyle} />
                            
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="button" onClick={()=>setIsUserEditModalOpen(false)} style={{...btnPrimary, background:'#94a3b8', flex:1}}>Cancel</button>
                                <button type="submit" style={{...btnPrimary, background: '#10b981', flex:1}}>Save & Approve</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* BASE LECTURE MODAL */}
            {isBaseModalOpen && (
                <div style={modalBackdrop}>
                    <div style={modalContent}>
                        <h3 style={{ marginTop: 0, borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>{baseForm.id ? 'Edit Base Lecture' : 'Force Add Lecture'}</h3>
                        <form onSubmit={saveBaseSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{display:'flex', gap:'10px'}}>
                                <input type="text" placeholder="Semester (e.g. 3RD)" required value={baseForm.semester} onChange={e=>setBaseForm({...baseForm, semester:e.target.value.toUpperCase()})} style={{...inputStyle, flex:1}} />
                                <input type="text" placeholder="Section (e.g. BSAI-A)" required value={baseForm.section} onChange={e=>setBaseForm({...baseForm, section:e.target.value.toUpperCase()})} style={{...inputStyle, flex:1}} />
                            </div>
                            <input type="text" placeholder="Course Name" required value={baseForm.course} onChange={e=>setBaseForm({...baseForm, course:e.target.value})} style={inputStyle} />
                            <input type="text" placeholder="Teacher Name" required value={baseForm.teacher} onChange={e=>setBaseForm({...baseForm, teacher:e.target.value})} style={inputStyle} />
                            <div style={{display:'flex', gap:'10px'}}>
                                <input type="text" placeholder="Room" required value={baseForm.room} onChange={e=>setBaseForm({...baseForm, room:e.target.value})} style={{...inputStyle, flex:1}} />
                                <select required value={baseForm.day} onChange={e=>setBaseForm({...baseForm, day:e.target.value})} style={{...inputStyle, flex:1}}>{days.map(d=><option key={d} value={d}>{d}</option>)}</select>
                            </div>
                            <div style={{display:'flex', gap:'10px'}}>
                                <select required value={baseForm.start_time} onChange={e=>setBaseForm({...baseForm, start_time:e.target.value})} style={{...inputStyle, flex:1}}>{timeSlots.map(t=><option key={t} value={t}>{t}</option>)}</select>
                                <select required value={baseForm.end_time} onChange={e=>setBaseForm({...baseForm, end_time:e.target.value})} style={{...inputStyle, flex:1}}>{timeSlots.map(t=><option key={t} value={t}>{t}</option>)}</select>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="button" onClick={()=>setIsBaseModalOpen(false)} style={{...btnPrimary, background:'#94a3b8', flex:1}}>Cancel</button>
                                <button type="submit" style={{...btnPrimary, flex:1}}>Save to Database</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* POINT SCHEDULE MODAL */}
            {isPointModalOpen && (
                <div style={modalBackdrop}>
                    <div style={{...modalContent, maxWidth: '350px'}}>
                        <h3 style={{ marginTop: 0, borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>{pointForm.id ? 'Edit Bus Route' : 'Add Bus Route'}</h3>
                        <form onSubmit={savePointSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <label style={labelStyle}>Route Direction</label>
                                <select value={pointForm.route} onChange={e=>setPointForm({...pointForm, route:e.target.value})} style={inputStyle}>
                                    <option value="AC_to_BJC">Abbasia Campus to Baghdad</option>
                                    <option value="BJC_to_AC">Baghdad to Abbasia Campus</option>
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Departure Time (24H format)</label>
                                <input type="time" required value={pointForm.departure_time} onChange={e=>setPointForm({...pointForm, departure_time:e.target.value})} style={inputStyle} />
                            </div>
                            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                <input type="checkbox" id="isSat" checked={pointForm.is_saturday} onChange={e=>setPointForm({...pointForm, is_saturday:e.target.checked})} style={{width:'20px', height:'20px'}} />
                                <label htmlFor="isSat" style={{fontWeight:'bold', color:'#475569'}}>Is this a Saturday-only timing?</label>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="button" onClick={()=>setIsPointModalOpen(false)} style={{...btnPrimary, background:'#94a3b8', flex:1}}>Cancel</button>
                                <button type="submit" style={{...btnPrimary, flex:1}}>Save Route</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* STUDENT FORM MODAL */}
            {isStudentModalOpen && (
                <div style={modalBackdrop}>
                    <div style={{...modalContent, maxWidth: '400px'}}>
                        <h3 style={{ marginTop: 0, borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>{studentForm.id ? 'Edit Student' : 'Add Student'}</h3>
                        <form onSubmit={saveStudent} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{display:'flex', gap:'10px'}}>
                                <input type="text" placeholder="Sem (e.g. 3RD)" required value={studentForm.semester} onChange={e=>setStudentForm({...studentForm, semester:e.target.value.toUpperCase()})} style={{...inputStyle, flex:1}} />
                                <input type="text" placeholder="Sec (e.g. A)" required value={studentForm.section} onChange={e=>setStudentForm({...studentForm, section:e.target.value.toUpperCase()})} style={{...inputStyle, flex:1}} />
                            </div>
                            <input type="text" placeholder="Roll Number (e.g. FA23-BSE-001)" required value={studentForm.roll_number} onChange={e=>setStudentForm({...studentForm, roll_number:e.target.value})} style={inputStyle} />
                            <input type="text" placeholder="Student Full Name" required value={studentForm.student_name} onChange={e=>setStudentForm({...studentForm, student_name:e.target.value})} style={inputStyle} />
                            
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="button" onClick={()=>setIsStudentModalOpen(false)} style={{...btnPrimary, background:'#94a3b8', flex:1}}>Cancel</button>
                                <button type="submit" style={{...btnPrimary, flex:1}}>Save Student</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ATTENDANCE EDITOR MODAL */}
            {isAttendanceModalOpen && (
                <div style={modalBackdrop}>
                    <div style={{...modalContent, maxWidth: '600px', display: 'flex', flexDirection: 'column', height: '85vh'}}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
                            <h3 style={{ margin: 0, color: '#0f172a' }}>Admin Override: Attendance</h3>
                            <button onClick={() => setIsAttendanceModalOpen(false)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer' }}>X</button>
                        </div>
                        
                        <div style={{ overflowY: 'auto', flexGrow: 1, paddingRight: '5px' }}>
                            {attendanceEditData.students.length === 0 ? <p style={{color:'#94a3b8'}}>No students in roster for this section.</p> : (
                                attendanceEditData.students.map((student) => {
                                    const currentStatus = attendanceEditData.recordsMap[student.id];
                                    return (
                                        <div key={student.id} style={{ border: '1px solid #e2e8f0', padding: '12px', borderRadius: '8px', marginBottom: '10px', background: '#f8fafc' }}>
                                            <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#334155' }}>{student.roll_number} - {student.student_name}</div>
                                            <div style={{ display: 'flex', gap: '5px' }}>
                                                {['Present', 'Absent', 'Leave'].map(status => (
                                                    <button
                                                        key={status}
                                                        onClick={() => handleAttendanceStatusChange(student.id, status)}
                                                        style={{
                                                            flex: 1, padding: '8px', borderRadius: '5px', border: 'none', fontWeight: 'bold', cursor: 'pointer',
                                                            background: currentStatus === status 
                                                                ? (status === 'Present' ? '#10b981' : status === 'Absent' ? '#ef4444' : '#f59e0b') 
                                                                : '#e2e8f0',
                                                            color: currentStatus === status ? 'white' : '#475569'
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

                        <div style={{ paddingTop: '15px', borderTop: '2px solid #e2e8f0', marginTop: 'auto' }}>
                            <button onClick={saveAttendanceEdits} style={{ width: '100%', padding: '15px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}>
                                Save & Override Attendance
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                body { margin: 0; background: #f8fafc; }
                .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}

// ==========================================
// 8. STYLES (Modern SaaS Palette)
// ==========================================

const sidebarStyle = {
    width: '260px',
    background: '#0f172a',
    color: '#e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    top: 0, bottom: 0, left: 0,
    zIndex: 40,
    transition: 'transform 0.3s ease',
};

const mainContentResponsive = {
    marginLeft: '260px',
    '@media (max-width: 768px)': { marginLeft: '0' }
};

const mobileOnlyShow = {
    '@media (min-width: 769px)': { display: 'none' }
};

const navItemStyle = (isActive) => ({
    padding: '12px 15px',
    background: isActive ? '#1e293b' : 'transparent',
    color: isActive ? '#38bdf8' : '#94a3b8',
    border: 'none',
    borderRadius: '8px',
    textAlign: 'left',
    fontSize: '0.95rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    borderLeft: isActive ? '4px solid #38bdf8' : '4px solid transparent'
});

const sectionHeader = { margin: '0 0 25px 0', fontSize: '1.8rem', color: '#0f172a', fontWeight: 900 };

const kpiGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' };

const kpiCard = { background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', borderBottom: '4px solid #38bdf8' };

const kpiTitle = { color: '#64748b', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' };

const kpiValue = { color: '#0f172a', fontSize: '2.5rem', fontWeight: 900, marginTop: '5px' };

const contentCard = { background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' };

const toggleBtn = (isActive) => ({
    padding: '8px 16px', border: 'none', background: isActive ? 'white' : 'transparent', color: isActive ? '#0f172a' : '#64748b',
    borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: '0.2s'
});

const filterSelect = { padding: '10px 15px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', background: 'white', color: '#334155', fontWeight: 'bold', cursor: 'pointer', minWidth: '150px' };

const tableStyle = { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' };

const thStyle = { padding: '12px 15px', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' };

const tdStyle = { padding: '15px', borderBottom: '1px solid #f1f5f9', color: '#334155' };

const trStyle = { transition: 'background 0.2s', ':hover': { background: '#f8fafc' } };

const badgeStyle = { background: '#e0e7ff', color: '#4338ca', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' };

const statusBadge = { padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 'bold', display: 'inline-block' };

const btnPrimary = { background: '#3b82f6', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' };

const btnPrimarySmall = { ...btnPrimary, padding: '6px 12px', fontSize: '0.8rem' };

const btnSuccessSmall = { background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.75rem' };

const btnEditSmall = { background: '#f1f5f9', color: '#3b82f6', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.75rem' };

const btnDangerSmall = { ...btnEditSmall, color: '#ef4444', background: '#fef2f2', border: '1px solid #fecaca' };

const labelStyle = { display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '6px' };

const inputStyle = { width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', fontSize: '0.95rem', color: '#0f172a', boxSizing: 'border-box' };

const loaderOverlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', backdropFilter: 'blur(4px)' };

const modalBackdrop = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: '20px', boxSizing: 'border-box', backdropFilter: 'blur(4px)' };

const modalContent = { background: 'white', padding: '30px', borderRadius: '16px', width: '100%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', maxHeight: '90vh', overflowY: 'auto' };
