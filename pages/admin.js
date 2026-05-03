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

    // User Edit & Approve Modal State
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
        // Added error catching to see why it was failing before
        const { error } = await supabase.from(table).update({ is_approved: true }).eq('id', id);
        
        if (error) {
            alert("Failed to approve user. Error: " + error.message);
        } else {
            await fetchAllData();
        }
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

        const { error } = await supabase.from(table).update(payload).eq('id', userEditForm.id);
        if (error) {
            alert("Error saving: " + error.message);
        } else {
            setIsUserEditModalOpen(false);
            await fetchAllData();
        }
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
            <div style={{ background: '#002147', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: "'Roboto', sans-serif" }}>
                <Head><title>Admin Login | IUB</title></Head>
                <div style={{ background: 'white', padding: '30px', borderRadius: '15px', width: '90%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                    <h2 style={{ color: '#002147', textAlign: 'center', margin: '0 0 20px 0' }}>Admin God-Mode</h2>
                    {authError && <div style={{ background: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '5px', marginBottom: '15px', fontSize: '0.85rem' }}>{authError}</div>}
                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <input type="text" placeholder="Username" value={loginUsername} onChange={e=>setLoginUsername(e.target.value)} required style={inputStyle} />
                        <input type="password" placeholder="Password" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} required style={inputStyle} />
                        <button type="submit" style={{ width: '100%', padding: '15px', background: '#F2A900', color: '#002147', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Authorize Access</button>
                    </form>
                </div>
            </div>
        );
    }

    if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Roboto', sans-serif" }}>Initializing Global Database...</div>;

    const today = new Date().toLocaleDateString('en-CA');
    const todaysExceptions = exceptions.filter(e => e.exception_date === today);
    const classesCancelledToday = todaysExceptions.filter(e => e.status === 'cancelled').length;
    
    const pendingCrsCount = crs.filter(c => !c.is_approved).length;
    const pendingTeachersCount = teachers.filter(t => !t.is_approved).length;

    return (
        <div style={{ background: '#f0f2f5', minHeight: '100vh', fontFamily: "'Roboto', sans-serif" }}>
            <Head><title>Admin Dashboard | IUB Assistant</title></Head>
            
            {/* IUB THEMED HEADER */}
            <header style={{ background: '#002147', color: '#F2A900', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ fontWeight: '900', fontSize: '1.2rem' }}>🎓 IUB Admin Portal</div>
                <button onClick={handleLogout} style={{ background: '#F2A900', color: '#002147', border: 'none', padding: '8px 15px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>Logout</button>
            </header>

            <div style={{ maxWidth: '1200px', margin: '20px auto', padding: '0 15px' }}>
                
                {/* ACTION LOADER */}
                {actionLoading && <div style={{ background: '#fff3cd', color: '#856404', padding: '10px', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold', marginBottom: '20px' }}>Processing Database Request...</div>}

                {/* IUB TABS */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    <button onClick={() => setActiveTab('overview')} style={tabStyle(activeTab === 'overview')}>📊 Overview</button>
                    <button onClick={() => setActiveTab('users')} style={tabStyle(activeTab === 'users')}>
                        👥 Users {(pendingCrsCount + pendingTeachersCount) > 0 && <span style={redDot}>{pendingCrsCount + pendingTeachersCount}</span>}
                    </button>
                    <button onClick={() => setActiveTab('schedule')} style={tabStyle(activeTab === 'schedule')}>📅 Schedule</button>
                    <button onClick={() => setActiveTab('records')} style={tabStyle(activeTab === 'records')}>📝 Records</button>
                    <button onClick={() => setActiveTab('infrastructure')} style={tabStyle(activeTab === 'infrastructure')}>🚌 Infrastructure</button>
                </div>

                {/* ---------------------------------------------------- */}
                {/* MODULE 1: OVERVIEW */}
                {/* ---------------------------------------------------- */}
                {activeTab === 'overview' && (
                    <div style={{ animation: 'fadeIn 0.3s' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
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
                            <div style={{...kpiCard, borderLeft: '5px solid #dc3545'}}>
                                <div style={kpiTitle}>Classes Cancelled Today</div>
                                <div style={{...kpiValue, color: '#dc3545'}}>{classesCancelledToday}</div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                            <div style={contentCard}>
                                <h3 style={cardHeader}>Recent Exception Activity</h3>
                                {exceptions.slice(0, 5).map(ex => {
                                    const base = baseSchedule.find(b => b.id === ex.base_schedule_id);
                                    return (
                                        <div key={ex.id} style={{ padding: '10px', background: '#f8f9fa', borderRadius: '6px', marginBottom: '10px', fontSize: '0.85rem', borderLeft: '3px solid #002147' }}>
                                            <strong>{base?.course || 'Unknown'} (Sec {base?.section})</strong><br/>
                                            <span style={{ color: ex.status === 'cancelled' ? '#dc3545' : '#007bff' }}>{ex.status.toUpperCase()}</span> on {ex.exception_date}
                                        </div>
                                    );
                                })}
                            </div>
                            <div style={contentCard}>
                                <h3 style={cardHeader}>Pending Attendance Approvals</h3>
                                {attendanceSessions.filter(s => s.status === 'pending').map(session => {
                                    const base = baseSchedule.find(b => b.id === session.base_schedule_id);
                                    return (
                                        <div key={session.id} style={{ padding: '10px', background: '#fff3cd', borderLeft: '4px solid #ffc107', borderRadius: '6px', marginBottom: '10px', fontSize: '0.85rem' }}>
                                            <strong>{base?.course || 'Unknown'} (Sec {base?.section})</strong><br/>
                                            Submitted on: {session.session_date} | Teacher: {session.teacher_profiles?.name}
                                        </div>
                                    );
                                })}
                                {attendanceSessions.filter(s => s.status === 'pending').length === 0 && <p style={{color: '#666'}}>All caught up.</p>}
                            </div>
                        </div>
                    </div>
                )}

                {/* ---------------------------------------------------- */}
                {/* MODULE 2: USERS */}
                {/* ---------------------------------------------------- */}
                {activeTab === 'users' && (
                    <div style={contentCard}>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                            <button onClick={() => setUserSubTab('crs')} style={subTabBtn(userSubTab === 'crs')}>Class Reps {pendingCrsCount > 0 && `(${pendingCrsCount})`}</button>
                            <button onClick={() => setUserSubTab('teachers')} style={subTabBtn(userSubTab === 'teachers')}>Teachers {pendingTeachersCount > 0 && `(${pendingTeachersCount})`}</button>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={tableStyle}>
                                <thead>
                                    <tr style={{ background: '#f8f9fa' }}>
                                        <th style={thStyle}>Status</th>
                                        <th style={thStyle}>Name</th>
                                        <th style={thStyle}>Contact</th>
                                        <th style={thStyle}>{userSubTab === 'crs' ? 'Dept / Sem / Sec' : 'CNIC'}</th>
                                        <th style={thStyle}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {userSubTab === 'crs' ? crs.map(cr => (
                                        <tr key={cr.id} style={{ borderBottom: '1px solid #eee' }}>
                                            <td style={tdStyle}>
                                                {cr.is_approved ? <span style={statusGreen}>Active</span> : <span style={statusYellow}>Pending</span>}
                                            </td>
                                            <td style={tdStyle}><strong>{cr.first_name || 'N/A'} {cr.last_name || ''}</strong></td>
                                            <td style={tdStyle}>{cr.phone || 'No Phone'}</td>
                                            <td style={tdStyle}>{cr.department} | {cr.semester} | Sec {cr.section}</td>
                                            <td style={tdStyle}>
                                                {!cr.is_approved ? (
                                                    <div style={{display: 'flex', gap: '5px', flexWrap: 'wrap'}}>
                                                        <button onClick={() => approveUser('cr_profiles', cr.id)} style={btnStyle('#28a745')}>Approve</button>
                                                        <button onClick={() => openEditUserModal(cr, 'cr')} style={btnStyle('#007bff')}>Edit & Appr</button>
                                                        <button onClick={() => rejectUser('cr_profiles', cr.id, cr.first_name)} style={btnStyle('#dc3545')}>Reject</button>
                                                    </div>
                                                ) : (
                                                    <div style={{display: 'flex', gap: '5px', flexWrap: 'wrap'}}>
                                                        <button onClick={() => openEditUserModal(cr, 'cr')} style={btnStyle('#007bff')}>Edit</button>
                                                        <button onClick={() => rejectUser('cr_profiles', cr.id, cr.first_name)} style={btnStyle('#dc3545')}>Revoke</button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )) : teachers.map(teacher => (
                                        <tr key={teacher.id} style={{ borderBottom: '1px solid #eee' }}>
                                            <td style={tdStyle}>
                                                {teacher.is_approved ? <span style={statusGreen}>Active</span> : <span style={statusYellow}>Pending</span>}
                                            </td>
                                            <td style={tdStyle}><strong>{teacher.name}</strong></td>
                                            <td style={tdStyle}>{teacher.email}<br/><span style={{fontSize:'0.8rem', color:'#666'}}>{teacher.phone}</span></td>
                                            <td style={tdStyle}>{teacher.cnic}</td>
                                            <td style={tdStyle}>
                                                {!teacher.is_approved ? (
                                                    <div style={{display: 'flex', gap: '5px', flexWrap: 'wrap'}}>
                                                        <button onClick={() => approveUser('teacher_profiles', teacher.id)} style={btnStyle('#28a745')}>Approve</button>
                                                        <button onClick={() => openEditUserModal(teacher, 'teacher')} style={btnStyle('#007bff')}>Edit & Appr</button>
                                                        <button onClick={() => rejectUser('teacher_profiles', teacher.id, teacher.name)} style={btnStyle('#dc3545')}>Reject</button>
                                                    </div>
                                                ) : (
                                                    <div style={{display: 'flex', gap: '5px', flexWrap: 'wrap'}}>
                                                        <button onClick={() => openEditUserModal(teacher, 'teacher')} style={btnStyle('#007bff')}>Edit</button>
                                                        <button onClick={() => rejectUser('teacher_profiles', teacher.id, teacher.name)} style={btnStyle('#dc3545')}>Revoke</button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ---------------------------------------------------- */}
                {/* MODULE 3: SCHEDULE */}
                {/* ---------------------------------------------------- */}
                {activeTab === 'schedule' && (
                    <div style={contentCard}>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                            <button onClick={() => setScheduleSubTab('base')} style={subTabBtn(scheduleSubTab === 'base')}>Base Matrix</button>
                            <button onClick={() => setScheduleSubTab('exceptions')} style={subTabBtn(scheduleSubTab === 'exceptions')}>Global Exceptions</button>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                            <select value={filterSem} onChange={e=>setFilterSem(e.target.value)} style={{...inputStyle, flex: 1}}>
                                <option value="">All Semesters</option>
                                {availableSemesters.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <select value={filterSec} onChange={e=>setFilterSec(e.target.value)} style={{...inputStyle, flex: 1}}>
                                <option value="">All Sections</option>
                                {availableSections.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <select value={filterDay} onChange={e=>setFilterDay(e.target.value)} style={{...inputStyle, flex: 1}}>
                                <option value="ALL">All Days</option>
                                {days.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                            {scheduleSubTab === 'base' && (
                                <button onClick={() => {
                                    setBaseForm({ id: null, semester: '', section: '', course: '', teacher: '', room: '', day: 'MON', start_time: '8:00 AM', end_time: '9:30 AM' });
                                    setIsBaseModalOpen(true);
                                }} style={{...btnStyle('#002147'), flex: 1}}>+ Add Lecture</button>
                            )}
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={tableStyle}>
                                <thead>
                                    <tr style={{ background: '#f8f9fa' }}>
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
                                                <tr key={cls.id} style={{ borderBottom: '1px solid #eee' }}>
                                                    <td style={tdStyle}><strong>{cls.semester} | Sec {cls.section}</strong></td>
                                                    <td style={tdStyle}><strong>{cls.course}</strong><br/><span style={{fontSize:'0.8rem', color:'#666'}}>{cls.teacher} | Room: {cls.room}</span></td>
                                                    <td style={tdStyle}><strong>{cls.day}</strong><br/>{convertTo12Hour(cls.start_time)} - {convertTo12Hour(cls.end_time)}</td>
                                                    <td style={tdStyle}>
                                                        <div style={{display:'flex', gap:'5px'}}>
                                                            <button onClick={() => { setBaseForm({...cls}); setIsBaseModalOpen(true); }} style={btnStyle('#007bff')}>Edit</button>
                                                            <button onClick={() => deleteBaseSchedule(cls.id)} style={btnStyle('#dc3545')}>Del</button>
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
                                                <tr key={ex.id} style={{ borderBottom: '1px solid #eee' }}>
                                                    <td style={tdStyle}><strong>{base?.semester} | Sec {base?.section}</strong></td>
                                                    <td style={tdStyle}><strong>{base?.course}</strong><br/><span style={{fontSize:'0.8rem', color:'#666'}}>Target Date: {ex.exception_date}</span></td>
                                                    <td style={tdStyle}>
                                                        {ex.status === 'cancelled' && <span style={statusRed}>CANCELLED</span>}
                                                        {ex.status === 'confirmed' && <span style={statusGreen}>CONFIRMED</span>}
                                                        {ex.status === 'rescheduled' && <span style={statusBlue}>MOVED: {convertTo12Hour(ex.new_start_time)} (Rm {ex.new_room})</span>}
                                                    </td>
                                                    <td style={tdStyle}>
                                                        <button onClick={() => deleteException(ex.id)} style={btnStyle('#dc3545')}>Undo Exception</button>
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
                {/* MODULE 4: RECORDS */}
                {/* ---------------------------------------------------- */}
                {activeTab === 'records' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
                        
                        {/* ROSTER VIEWER */}
                        <div style={contentCard}>
                            <h3 style={cardHeader}>Global Roster Index</h3>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                                <select value={filterSem} onChange={e=>setFilterSem(e.target.value)} style={{...inputStyle, flex:1}}>
                                    <option value="">Select Sem</option>
                                    {availableSemesters.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <select value={filterSec} onChange={e=>setFilterSec(e.target.value)} style={{...inputStyle, flex:1}}>
                                    <option value="">Select Sec</option>
                                    {availableSections.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                                <button onClick={() => {
                                    setStudentForm({ id: null, student_name: '', roll_number: '', semester: filterSem || '', section: filterSec || '' });
                                    setIsStudentModalOpen(true);
                                }} style={btnStyle('#002147')}>+ Add Student</button>
                                <input type="file" accept=".csv" ref={fileInputRef} onChange={handleCSVUpload} style={{ display: 'none' }} />
                                <button onClick={() => fileInputRef.current.click()} style={btnStyle('#28a745')}>CSV Import</button>
                            </div>

                            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                {(!filterSem || !filterSec) ? <p style={{color:'#666', textAlign:'center'}}>Select filters to view roster.</p> : (
                                    <table style={tableStyle}>
                                        <tbody>
                                            {roster.filter(r => r.semester === filterSem && r.section === filterSec).map(s => (
                                                <tr key={s.id} style={{borderBottom:'1px solid #eee'}}>
                                                    <td style={tdStyle}><strong>{s.roll_number}</strong></td>
                                                    <td style={tdStyle}>{s.student_name}</td>
                                                    <td style={{...tdStyle, textAlign:'right', display:'flex', gap:'5px', justifyContent:'flex-end'}}>
                                                        <button onClick={() => { setStudentForm(s); setIsStudentModalOpen(true); }} style={{...btnStyle('#007bff'), minWidth:'auto', padding:'5px 10px'}}>Edit</button>
                                                        <button onClick={async ()=>{
                                                            if(window.confirm('Delete student?')) {
                                                                await supabase.from('class_roster').delete().eq('id', s.id);
                                                                fetchAllData();
                                                            }
                                                        }} style={{...btnStyle('#dc3545'), minWidth:'auto', padding:'5px 10px'}}>X</button>
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
                            <h3 style={cardHeader}>Attendance Vault (Raw Data)</h3>
                            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                {attendanceSessions.length === 0 ? <p style={{color:'#666'}}>No sessions recorded yet.</p> : (
                                    attendanceSessions.sort((a,b) => new Date(b.session_date) - new Date(a.session_date)).map(session => {
                                        const base = baseSchedule.find(b => b.id === session.base_schedule_id);
                                        return (
                                            <div key={session.id} style={{ background:'#f8f9fa', padding:'12px', borderRadius:'8px', marginBottom:'10px', borderLeft: session.status === 'approved' ? '5px solid #28a745' : '5px solid #ffc107'}}>
                                                <div style={{display:'flex', justifyContent:'space-between'}}>
                                                    <strong>{base?.course || 'Deleted Course'}</strong>
                                                    <span style={{fontSize:'0.8rem', color:'#666'}}>{session.session_date}</span>
                                                </div>
                                                <div style={{fontSize:'0.8rem', color:'#666', marginTop:'5px'}}>
                                                    Sec: {base?.section} ({base?.semester}) | By: {session.auth_users?.email || 'Unknown'}
                                                </div>
                                                <div style={{marginTop:'10px', display:'flex', gap:'5px', flexWrap:'wrap'}}>
                                                    <button onClick={async () => {
                                                        const status = session.status === 'approved' ? 'pending' : 'approved';
                                                        await supabase.from('attendance_sessions').update({status}).eq('id', session.id);
                                                        fetchAllData();
                                                    }} style={{...btnStyle(session.status === 'approved' ? '#6c757d' : '#28a745'), flex: 1}}>{session.status === 'approved' ? 'Unapprove' : 'Force Approve'}</button>
                                                    
                                                    <button onClick={() => openAttendanceEditor(session)} style={{...btnStyle('#007bff'), flex: 1}}>Edit Data</button>
                                                    
                                                    <button onClick={async () => {
                                                        if(window.confirm('Wipe this attendance record entirely?')) {
                                                            await supabase.from('attendance_sessions').delete().eq('id', session.id);
                                                            fetchAllData();
                                                        }
                                                    }} style={{...btnStyle('#dc3545'), flex: 1}}>Wipe</button>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ---------------------------------------------------- */}
                {/* MODULE 5: INFRASTRUCTURE */}
                {/* ---------------------------------------------------- */}
                {activeTab === 'infrastructure' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                        
                        {/* GLOBAL BROADCAST */}
                        <div style={contentCard}>
                            <h3 style={{...cardHeader, color: '#dc3545'}}>⚠️ Global Emergency Broadcast</h3>
                            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '15px' }}>Push a high-priority notification to every single registered section simultaneously.</p>
                            <form onSubmit={sendGlobalAlert}>
                                <textarea 
                                    required 
                                    value={globalAlertMsg}
                                    onChange={e=>setGlobalAlertMsg(e.target.value)}
                                    placeholder="Enter emergency message here... (e.g. University closed today)"
                                    style={{...inputStyle, minHeight: '100px', resize: 'vertical'}}
                                />
                                <button type="submit" style={{...btnStyle('#dc3545'), marginTop: '10px', width: '100%'}}>DISPATCH GLOBAL ALERT</button>
                            </form>
                        </div>

                        {/* BUS POINTS */}
                        <div style={contentCard}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                                <h3 style={{ margin: 0 }}>Bus Point Logic Engine</h3>
                                <button onClick={() => {
                                    setPointForm({ id: null, route: 'AC_to_BJC', departure_time: '08:00', is_saturday: false });
                                    setIsPointModalOpen(true);
                                }} style={{...btnStyle('#002147'), minWidth: 'auto', padding: '8px 12px'}}>+ Route</button>
                            </div>
                            
                            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                                <table style={tableStyle}>
                                    <thead>
                                        <tr style={{background:'#f8f9fa'}}>
                                            <th style={thStyle}>Route</th>
                                            <th style={thStyle}>Time</th>
                                            <th style={thStyle}>Type</th>
                                            <th style={thStyle}>Act</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pointSchedules.sort((a,b) => a.departure_time.localeCompare(b.departure_time)).map(p => (
                                            <tr key={p.id} style={{borderBottom:'1px solid #eee'}}>
                                                <td style={tdStyle}>{p.route === 'AC_to_BJC' ? 'AC ➔ BJC' : 'BJC ➔ AC'}</td>
                                                <td style={tdStyle}><strong>{convertTo12Hour(p.departure_time.slice(0,5))}</strong></td>
                                                <td style={tdStyle}>{p.is_saturday ? <span style={{color:'#F2A900', fontWeight:'bold'}}>Weekend</span> : 'Weekday'}</td>
                                                <td style={{...tdStyle, display:'flex', gap:'5px'}}>
                                                    <button onClick={() => {setPointForm(p); setIsPointModalOpen(true);}} style={{...btnStyle('#007bff'), padding: '5px', minWidth:'auto'}}>Edit</button>
                                                    <button onClick={() => deletePointSchedule(p.id)} style={{...btnStyle('#dc3545'), padding: '5px', minWidth:'auto'}}>Del</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                )}
            </div>

            {/* ========================================== */}
            {/* MODALS */}
            {/* ========================================== */}
            
            {/* USER EDIT & APPROVE MODAL */}
            {isUserEditModalOpen && (
                <div style={modalBackdrop}>
                    <div style={modalContent}>
                        <h3 style={{ marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
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
                                <button type="button" onClick={()=>setIsUserEditModalOpen(false)} style={btnStyle('#6c757d')}>Cancel</button>
                                <button type="submit" style={btnStyle('#28a745')}>Save & Approve</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* BASE LECTURE MODAL */}
            {isBaseModalOpen && (
                <div style={modalBackdrop}>
                    <div style={modalContent}>
                        <h3 style={{ marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '10px' }}>{baseForm.id ? 'Edit Base Lecture' : 'Force Add Lecture'}</h3>
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
                                <button type="button" onClick={()=>setIsBaseModalOpen(false)} style={btnStyle('#6c757d')}>Cancel</button>
                                <button type="submit" style={btnStyle('#002147')}>Save to Database</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* POINT SCHEDULE MODAL */}
            {isPointModalOpen && (
                <div style={modalBackdrop}>
                    <div style={modalContent}>
                        <h3 style={{ marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '10px' }}>{pointForm.id ? 'Edit Bus Route' : 'Add Bus Route'}</h3>
                        <form onSubmit={savePointSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <label style={{fontWeight:'bold', fontSize:'0.85rem'}}>Route Direction</label>
                                <select value={pointForm.route} onChange={e=>setPointForm({...pointForm, route:e.target.value})} style={inputStyle}>
                                    <option value="AC_to_BJC">Abbasia Campus to Baghdad</option>
                                    <option value="BJC_to_AC">Baghdad to Abbasia Campus</option>
                                </select>
                            </div>
                            <div>
                                <label style={{fontWeight:'bold', fontSize:'0.85rem'}}>Departure Time (24H format)</label>
                                <input type="time" required value={pointForm.departure_time} onChange={e=>setPointForm({...pointForm, departure_time:e.target.value})} style={inputStyle} />
                            </div>
                            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                <input type="checkbox" id="isSat" checked={pointForm.is_saturday} onChange={e=>setPointForm({...pointForm, is_saturday:e.target.checked})} style={{width:'20px', height:'20px'}} />
                                <label htmlFor="isSat" style={{fontWeight:'bold', color:'#333'}}>Is this a Saturday-only timing?</label>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="button" onClick={()=>setIsPointModalOpen(false)} style={btnStyle('#6c757d')}>Cancel</button>
                                <button type="submit" style={btnStyle('#002147')}>Save Route</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* STUDENT FORM MODAL */}
            {isStudentModalOpen && (
                <div style={modalBackdrop}>
                    <div style={modalContent}>
                        <h3 style={{ marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '10px' }}>{studentForm.id ? 'Edit Student' : 'Add Student'}</h3>
                        <form onSubmit={saveStudent} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{display:'flex', gap:'10px'}}>
                                <input type="text" placeholder="Sem (e.g. 3RD)" required value={studentForm.semester} onChange={e=>setStudentForm({...studentForm, semester:e.target.value.toUpperCase()})} style={{...inputStyle, flex:1}} />
                                <input type="text" placeholder="Sec (e.g. A)" required value={studentForm.section} onChange={e=>setStudentForm({...studentForm, section:e.target.value.toUpperCase()})} style={{...inputStyle, flex:1}} />
                            </div>
                            <input type="text" placeholder="Roll Number (e.g. FA23-BSE-001)" required value={studentForm.roll_number} onChange={e=>setStudentForm({...studentForm, roll_number:e.target.value})} style={inputStyle} />
                            <input type="text" placeholder="Student Full Name" required value={studentForm.student_name} onChange={e=>setStudentForm({...studentForm, student_name:e.target.value})} style={inputStyle} />
                            
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="button" onClick={()=>setIsStudentModalOpen(false)} style={btnStyle('#6c757d')}>Cancel</button>
                                <button type="submit" style={btnStyle('#002147')}>Save Student</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ATTENDANCE EDITOR MODAL */}
            {isAttendanceModalOpen && (
                <div style={modalBackdrop}>
                    <div style={{...modalContent, maxWidth: '600px', display: 'flex', flexDirection: 'column', height: '85vh'}}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
                            <h3 style={{ margin: 0, color: '#002147' }}>Admin Override: Attendance</h3>
                            <button onClick={() => setIsAttendanceModalOpen(false)} style={{ background: 'none', border: 'none', color: '#dc3545', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer' }}>X</button>
                        </div>
                        
                        <div style={{ overflowY: 'auto', flexGrow: 1, paddingRight: '5px' }}>
                            {attendanceEditData.students.length === 0 ? <p style={{color:'#666'}}>No students in roster for this section.</p> : (
                                attendanceEditData.students.map((student) => {
                                    const currentStatus = attendanceEditData.recordsMap[student.id];
                                    return (
                                        <div key={student.id} style={{ border: '1px solid #eee', padding: '12px', borderRadius: '8px', marginBottom: '10px', background: '#f8f9fa' }}>
                                            <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#000' }}>{student.roll_number} - {student.student_name}</div>
                                            <div style={{ display: 'flex', gap: '5px' }}>
                                                {['Present', 'Absent', 'Leave'].map(status => (
                                                    <button
                                                        key={status}
                                                        onClick={() => handleAttendanceStatusChange(student.id, status)}
                                                        style={{
                                                            flex: 1, padding: '8px', borderRadius: '5px', border: 'none', fontWeight: 'bold', cursor: 'pointer',
                                                            background: currentStatus === status 
                                                                ? (status === 'Present' ? '#28a745' : status === 'Absent' ? '#dc3545' : '#F2A900') 
                                                                : '#ddd',
                                                            color: currentStatus === status ? (status === 'Leave' ? '#002147' : 'white') : '#333'
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
                            <button onClick={saveAttendanceEdits} style={{ width: '100%', padding: '15px', background: '#002147', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}>
                                Save & Override Attendance
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

const btnStyle = (bg) => ({ flex: 1, minWidth: '100px', padding: '10px', background: bg, color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' });
const inputStyle = { width: '100%', padding: '12px', border: '2px solid #dee2e6', borderRadius: '8px', outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box' };
const tabStyle = (isActive) => ({ flex: 1, padding: '12px', background: isActive ? '#002147' : '#ddd', color: isActive ? 'white' : '#333', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s', position: 'relative' });
const subTabBtn = (isActive) => ({ padding: '10px 15px', border: 'none', background: isActive ? '#F2A900' : '#e9ecef', color: isActive ? '#002147' : '#555', borderRadius: '5px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' });

const kpiCard = { background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', borderLeft: '5px solid #F2A900' };
const kpiTitle = { color: '#666', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase' };
const kpiValue = { color: '#002147', fontSize: '2.5rem', fontWeight: 900, marginTop: '5px' };
const contentCard = { background: 'white', padding: '25px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' };
const cardHeader = { margin: '0 0 15px 0', borderBottom: '1px solid #eee', paddingBottom: '10px', color: '#002147' };

const tableStyle = { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' };
const thStyle = { padding: '12px 15px', borderBottom: '2px solid #dee2e6', color: '#666', fontWeight: 'bold' };
const tdStyle = { padding: '15px', borderBottom: '1px solid #eee', color: '#333' };

const statusGreen = { background: '#d4edda', color: '#155724', padding: '4px 8px', borderRadius: '5px', fontSize: '0.75rem', fontWeight: 'bold' };
const statusRed = { background: '#f8d7da', color: '#721c24', padding: '4px 8px', borderRadius: '5px', fontSize: '0.75rem', fontWeight: 'bold' };
const statusYellow = { background: '#fff3cd', color: '#856404', padding: '4px 8px', borderRadius: '5px', fontSize: '0.75rem', fontWeight: 'bold' };
const statusBlue = { background: '#e7f1ff', color: '#004085', padding: '4px 8px', borderRadius: '5px', fontSize: '0.75rem', fontWeight: 'bold' };
const badgeStyle = { background: '#e9ecef', color: '#333', padding: '4px 8px', borderRadius: '5px', fontSize: '0.75rem', fontWeight: 'bold' };

const redDot = { position: 'absolute', top: '-5px', right: '-5px', background: 'red', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '0.7rem' };
const modalBackdrop = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: '20px', boxSizing: 'border-box' };
const modalContent = { background: 'white', padding: '30px', borderRadius: '10px', width: '100%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' };
