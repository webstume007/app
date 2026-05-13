import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabase';

// --- Custom SVGs for UI ---
const SVGS = {
    tick: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>,
    cross: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>,
    bell: <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>,
    calendar: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2"/><line x1="16" y1="2" x2="16" y2="6" strokeWidth="2"/><line x1="8" y1="2" x2="8" y2="6" strokeWidth="2"/></svg>,
    attendance: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>,
    updates: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"></path></svg>,
    clock: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth="2"/><polyline points="12 6 12 12 16 14" strokeWidth="2"/></svg>,
    door: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M18 20V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16M2 20h20M14 12v.01" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    userTie: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="7" r="4" strokeWidth="2"/><path d="M12 11v10" strokeWidth="2" strokeLinecap="round"/></svg>,
    bus: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h8M8 11h8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2zM8 19v2a1 1 0 01-2 0v-2M18 19v2a1 1 0 01-2 0v-2"></path></svg>,
    cap: <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 14v6m-3-6v6m6-6v6"/></svg>,
    location: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
    tickCircle: <svg width="16" height="16" fill="none" stroke="#28a745" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
    note: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>,
    users: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>,
    edit: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>,
    trash: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>,
    upload: <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>,
    chart: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>,
    plus: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>,
    save: <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>,
    undo: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>,
    alertCircle: <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth="2"/><line x1="12" y1="8" x2="12" y2="12" strokeWidth="2" strokeLinecap="round"/><line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="3" strokeLinecap="round"/></svg>,
    broadcast: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/></svg>
};

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
    const [studentForm, setStudentForm] = useState({ original_reg: null, student_name: '', registration_number: '', session: '', section: '' });

    const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
    const [attendanceEditData, setAttendanceEditData] = useState({ session: null, recordsMap: {}, students: [] });

    const [isUserEditModalOpen, setIsUserEditModalOpen] = useState(false);
    const [userEditForm, setUserEditForm] = useState({ id: null, type: 'cr', first_name: '', last_name: '', name: '', department: '', semester: '', section: '', phone: '', cnic: '' });

    const [globalAlertMsg, setGlobalAlertMsg] = useState('');
    const fileInputRef = useRef(null);
    const pointsFileInputRef = useRef(null); 

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
                supabase.from('students').select('*').order('registration_number', { ascending: true }), 
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
    // 3. MODULE FUNCTIONS: USERS
    // ==========================================
    
    const approveUser = async (table, id) => {
        setActionLoading(true);
        const { error } = await supabase.from(table).update({ is_approved: true }).eq('id', id);
        if (error) alert("Failed to approve user. Error: " + error.message);
        else await fetchAllData();
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
                is_approved: true
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
        if (error) alert("Error saving: " + error.message);
        else {
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
    // 5. MODULE FUNCTIONS: ACADEMIC RECORDS (STUDENTS)
    // ==========================================
    const saveStudent = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        const payload = { 
            registration_number: studentForm.registration_number,
            student_name: studentForm.student_name,
            session: studentForm.session,
            section: studentForm.section
        };

        const { error } = await supabase.from('students').upsert([payload]);
        
        if(error) alert("Error: " + error.message);
        else {
            setIsStudentModalOpen(false);
            await fetchAllData();
        }
        setActionLoading(false);
    };

    const handleCSVUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!filterSem || !filterSec) {
            alert("Please select a Semester/Session and Section from the dropdowns first before importing CSV.");
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
                
                let startIndex = rows[0].join('').toLowerCase().includes('regist') || rows[0].join('').toLowerCase().includes('roll') ? 1 : 0;

                for(let i = startIndex; i < rows.length; i++) {
                    const row = rows[i];
                    if (row.length >= 2) {
                        const reg = row[0].trim();
                        const name = row[1].trim();
                        if (reg && name) {
                            payloads.push({ student_name: name, registration_number: reg, session: filterSem, section: filterSec });
                        }
                    }
                }

                if (payloads.length > 0) {
                    const { error } = await supabase.from('students').upsert(payloads);
                    if (error) alert("Error importing: " + error.message);
                    else {
                        alert(`Successfully imported/updated ${payloads.length} students!`);
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
        
        const { data: students } = await supabase.from('students')
            .select('*')
            .eq('session', base.semester) 
            .eq('section', base.section)
            .order('registration_number', { ascending: true });

        const recordsMap = {};
        if (records) {
            records.forEach(r => recordsMap[r.student_id] = r.status);
        }
        
        if (students) {
            students.forEach(s => {
                if (!recordsMap[s.registration_number]) recordsMap[s.registration_number] = 'Absent';
            });
        }

        setAttendanceEditData({ session, recordsMap, students: students || [] });
        setIsAttendanceModalOpen(true);
        setActionLoading(false);
    };

    const handleAttendanceStatusChange = (studentReg, status) => {
        setAttendanceEditData(prev => ({
            ...prev,
            recordsMap: { ...prev.recordsMap, [studentReg]: status }
        }));
    };

    const saveAttendanceEdits = async () => {
        setActionLoading(true);
        const { session, recordsMap, students } = attendanceEditData;
        
        await supabase.from('attendance_records').delete().eq('session_id', session.id);
        
        const payloads = students.map(s => ({
            session_id: session.id,
            student_id: s.registration_number,
            status: recordsMap[s.registration_number]
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
    // 6. MODULE FUNCTIONS: INFRASTRUCTURE (ROUTES)
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

    const handlePointsCSVUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            setActionLoading(true);
            try {
                const text = event.target.result;
                const rows = text.split('\n').map(r => r.split(','));
                const payloads = [];
                
                let startIndex = rows[0].join('').toLowerCase().includes('route') ? 1 : 0;

                for(let i = startIndex; i < rows.length; i++) {
                    const row = rows[i];
                    if (row.length >= 2) {
                        const routeStr = row[0].trim();
                        const timeStr = row[1].trim();
                        const isSatStr = row.length > 2 ? row[2].trim().toLowerCase() : 'false';
                        const isSat = isSatStr === 'true' || isSatStr === '1' || isSatStr === 'yes' || isSatStr === 'y';

                        if (routeStr && timeStr) {
                            payloads.push({ route: routeStr, departure_time: timeStr, is_saturday: isSat });
                        }
                    }
                }

                if (payloads.length > 0) {
                    const { error } = await supabase.from('point_schedules').insert(payloads);
                    if (error) alert("Error importing routes: " + error.message);
                    else {
                        alert(`Successfully imported ${payloads.length} routes!`);
                        await fetchAllData();
                    }
                } else {
                    alert("No valid data found in CSV.");
                }
            } catch (err) {
                alert("Failed to parse Routes CSV.");
            }
            setActionLoading(false);
            e.target.value = null;
        };
        reader.readAsText(file);
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
            <div style={welcomeBg}>
                <Head><title>Admin Login | IUB</title></Head>
                <div className="expand-anim" style={welcomeCard}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px', color: '#002147', transform: 'scale(2)' }}>
                        {SVGS.lock}
                    </div>
                    <h2 style={{ color: '#002147', textAlign: 'center', margin: '0 0 20px 0', fontWeight: '900' }}>Admin Gateway</h2>
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
                <Head><title>Loading Database | IUB Admin</title></Head>
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
    const todaysExceptions = exceptions.filter(e => e.exception_date === today);
    const classesCancelledToday = todaysExceptions.filter(e => e.status === 'cancelled').length;
    
    const pendingCrsCount = crs.filter(c => !c.is_approved).length;
    const pendingTeachersCount = teachers.filter(t => !t.is_approved).length;

    const visibleTabs = [
        { id: 'overview', label: 'Overview', icon: SVGS.chart },
        { id: 'users', label: 'Users', icon: SVGS.users, badge: pendingCrsCount + pendingTeachersCount },
        { id: 'schedule', label: 'Schedule', icon: SVGS.calendar },
        { id: 'records', label: 'Records', icon: SVGS.note },
        { id: 'infrastructure', label: 'Infra', icon: SVGS.bus }
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
                @media (min-width: 768px) {
                    .desktop-nav { display: flex; align-items: center; gap: 15px; }
                    .mobile-nav { display: none !important; }
                }
            `}</style>
            
            <header style={headerStyle}>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '1.2rem', display: 'flex' }}>{SVGS.cap}</span> 
                    IUB ADMIN CONSOLE
                </div>
                
                <div className="desktop-nav">
                    {visibleTabs.map(tab => (
                        <div 
                            key={tab.id} 
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                cursor: 'pointer', padding: '8px 12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.8rem',
                                background: activeTab === tab.id ? '#F2A900' : 'transparent',
                                color: activeTab === tab.id ? '#002147' : '#fff',
                                transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', gap: '6px', position: 'relative'
                            }}
                        >
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
                
                {/* ACTION LOADER */}
                {actionLoading && (
                    <div className="expand-anim" style={{ background: '#fff3cd', color: '#856404', padding: '12px', borderRadius: '10px', textAlign: 'center', fontWeight: 'bold', marginBottom: '20px', border: '1px solid #ffeeba', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <div className="custom-spinner" style={{width: '20px', height: '20px', borderWidth: '3px', margin: 0}}></div>
                        Processing Database Request...
                    </div>
                )}

                {/* ---------------------------------------------------- */}
                {/* MODULE 1: OVERVIEW */}
                {/* ---------------------------------------------------- */}
                {activeTab === 'overview' && (
                    <div className="expand-anim">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                            <div style={kpiCard}>
                                <div style={kpiTitle}>{SVGS.users} Total Students</div>
                                <div style={kpiValue}>{roster.length}</div>
                            </div>
                            <div style={kpiCard}>
                                <div style={kpiTitle}>{SVGS.door} Total Sections</div>
                                <div style={kpiValue}>{availableSections.length}</div>
                            </div>
                            <div style={kpiCard}>
                                <div style={kpiTitle}>{SVGS.userTie} Class Reps</div>
                                <div style={kpiValue}>{crs.length}</div>
                            </div>
                            <div style={kpiCard}>
                                <div style={kpiTitle}>{SVGS.userTie} Teachers</div>
                                <div style={kpiValue}>{teachers.length}</div>
                            </div>
                            <div style={kpiCard}>
                                <div style={kpiTitle}>{SVGS.calendar} Base Lectures</div>
                                <div style={kpiValue}>{baseSchedule.length}</div>
                            </div>
                            <div style={{...kpiCard, borderLeft: '5px solid #dc3545', background: '#fef2f2'}}>
                                <div style={{...kpiTitle, color: '#dc3545'}}>{SVGS.alertCircle} Cancelled Today</div>
                                <div style={{...kpiValue, color: '#dc3545'}}>{classesCancelledToday}</div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                            <div style={contentCard}>
                                <h3 style={cardHeader}>{SVGS.history} Recent Exception Activity</h3>
                                {exceptions.slice(0, 5).map(ex => {
                                    const base = baseSchedule.find(b => b.id === ex.base_schedule_id);
                                    return (
                                        <div key={ex.id} style={{ padding: '12px', background: '#f8f9fa', borderRadius: '8px', marginBottom: '10px', fontSize: '0.85rem', borderLeft: '4px solid #002147', border: '1px solid #eee' }}>
                                            <strong style={{color: '#002147'}}>{base?.course || 'Unknown'} (Sec {base?.section})</strong><br/>
                                            <span style={{ display: 'inline-block', marginTop: '5px', fontWeight: 'bold', color: ex.status === 'cancelled' ? '#dc3545' : '#007bff' }}>
                                                {ex.status.toUpperCase()}
                                            </span> <span style={{color: '#666'}}>on {ex.exception_date}</span>
                                        </div>
                                    );
                                })}
                                {exceptions.length === 0 && <div style={emptyState}>No recent exceptions.</div>}
                            </div>
                            <div style={contentCard}>
                                <h3 style={cardHeader}>{SVGS.clock} Pending Attendance Approvals</h3>
                                {attendanceSessions.filter(s => s.status === 'pending').map(session => {
                                    const base = baseSchedule.find(b => b.id === session.base_schedule_id);
                                    return (
                                        <div key={session.id} style={{ padding: '12px', background: '#fff9e6', borderLeft: '4px solid #F2A900', borderRadius: '8px', marginBottom: '10px', fontSize: '0.85rem', border: '1px solid #fde68a' }}>
                                            <strong style={{color: '#856404'}}>{base?.course || 'Unknown'} (Sec {base?.section})</strong><br/>
                                            <div style={{color: '#666', marginTop: '5px'}}>
                                                Submitted: {session.session_date} <br/> Teacher: {session.teacher_profiles?.name}
                                            </div>
                                        </div>
                                    );
                                })}
                                {attendanceSessions.filter(s => s.status === 'pending').length === 0 && <div style={{...emptyState, background: '#f0fdf4', color: '#15803d', border: '1px dashed #bbf7d0'}}>{SVGS.tickCircle} All caught up.</div>}
                            </div>
                        </div>
                    </div>
                )}

                {/* ---------------------------------------------------- */}
                {/* MODULE 2: USERS */}
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
                                        <th style={tableHeaderCell}>Name</th>
                                        <th style={tableHeaderCell}>Contact</th>
                                        <th style={tableHeaderCell}>{userSubTab === 'crs' ? 'Dept / Sem / Sec' : 'CNIC'}</th>
                                        <th style={{...tableHeaderCell, textAlign: 'right'}}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {userSubTab === 'crs' ? crs.map(cr => (
                                        <tr key={cr.id} style={tableDataRow}>
                                            <td style={tableDataCell}>
                                                {cr.is_approved ? <span style={statusGreen}>Active</span> : <span style={statusYellow}>Pending</span>}
                                            </td>
                                            <td style={{...tableDataCell, fontWeight: 'bold'}}>{cr.first_name || 'N/A'} {cr.last_name || ''}</td>
                                            <td style={tableDataCell}>{cr.phone || 'No Phone'}</td>
                                            <td style={{...tableDataCell, fontSize: '0.8rem', color: '#555'}}>{cr.department} | {cr.semester} | Sec {cr.section}</td>
                                            <td style={{...tableDataCell, textAlign: 'right'}}>
                                                <div style={{display: 'flex', gap: '5px', justifyContent: 'flex-end'}}>
                                                    {!cr.is_approved ? (
                                                        <>
                                                            <button onClick={() => approveUser('cr_profiles', cr.id)} style={{...actionBtn, background: '#28a745', color: '#fff'}}>{SVGS.tick} Approve</button>
                                                            <button onClick={() => openEditUserModal(cr, 'cr')} style={{...actionBtn, background: '#007bff', color: '#fff'}}>{SVGS.edit} Edit</button>
                                                            <button onClick={() => rejectUser('cr_profiles', cr.id, cr.first_name)} style={{...actionBtn, background: '#dc3545', color: '#fff'}}>{SVGS.trash}</button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button onClick={() => openEditUserModal(cr, 'cr')} style={{...actionBtn, background: '#f0f2f5', color: '#333'}}>{SVGS.edit} Edit</button>
                                                            <button onClick={() => rejectUser('cr_profiles', cr.id, cr.first_name)} style={{...actionBtn, background: '#fef2f2', color: '#dc3545'}}>{SVGS.trash} Revoke</button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )) : teachers.map(teacher => (
                                        <tr key={teacher.id} style={tableDataRow}>
                                            <td style={tableDataCell}>
                                                {teacher.is_approved ? <span style={statusGreen}>Active</span> : <span style={statusYellow}>Pending</span>}
                                            </td>
                                            <td style={{...tableDataCell, fontWeight: 'bold'}}>{teacher.name}</td>
                                            <td style={tableDataCell}>{teacher.email}<br/><span style={{fontSize:'0.8rem', color:'#666'}}>{teacher.phone}</span></td>
                                            <td style={tableDataCell}>{teacher.cnic}</td>
                                            <td style={{...tableDataCell, textAlign: 'right'}}>
                                                <div style={{display: 'flex', gap: '5px', justifyContent: 'flex-end'}}>
                                                    {!teacher.is_approved ? (
                                                        <>
                                                            <button onClick={() => approveUser('teacher_profiles', teacher.id)} style={{...actionBtn, background: '#28a745', color: '#fff'}}>{SVGS.tick} Approve</button>
                                                            <button onClick={() => openEditUserModal(teacher, 'teacher')} style={{...actionBtn, background: '#007bff', color: '#fff'}}>{SVGS.edit} Edit</button>
                                                            <button onClick={() => rejectUser('teacher_profiles', teacher.id, teacher.name)} style={{...actionBtn, background: '#dc3545', color: '#fff'}}>{SVGS.trash}</button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button onClick={() => openEditUserModal(teacher, 'teacher')} style={{...actionBtn, background: '#f0f2f5', color: '#333'}}>{SVGS.edit} Edit</button>
                                                            <button onClick={() => rejectUser('teacher_profiles', teacher.id, teacher.name)} style={{...actionBtn, background: '#fef2f2', color: '#dc3545'}}>{SVGS.trash} Revoke</button>
                                                        </>
                                                    )}
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
                {/* MODULE 3: SCHEDULE */}
                {/* ---------------------------------------------------- */}
                {activeTab === 'schedule' && (
                    <div className="expand-anim" style={contentCard}>
                        <div style={dayFilter}>
                            <button onClick={() => setScheduleSubTab('base')} style={subTabBtn(scheduleSubTab === 'base')}>Base Matrix</button>
                            <button onClick={() => setScheduleSubTab('exceptions')} style={subTabBtn(scheduleSubTab === 'exceptions')}>Global Exceptions</button>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                            <select value={filterSem} onChange={e=>setFilterSem(e.target.value)} style={{...selectStyle, flex: 1, marginBottom: 0}}>
                                <option value="">All Sessions/Semesters</option>
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
                            {scheduleSubTab === 'base' && (
                                <button onClick={() => {
                                    setBaseForm({ id: null, semester: '', section: '', course: '', teacher: '', room: '', day: 'MON', start_time: '8:00 AM', end_time: '9:30 AM' });
                                    setIsBaseModalOpen(true);
                                }} style={{...actionBtn, background: '#002147', color: '#F2A900', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'}}>{SVGS.plus} Add Lecture</button>
                            )}
                        </div>

                        <div style={{ overflowX: 'auto' }} className="scroll-hide">
                            <table style={tableStyle}>
                                <thead>
                                    <tr style={tableHeaderRow}>
                                        <th style={tableHeaderCell}>Loc</th>
                                        <th style={tableHeaderCell}>Course & Teacher</th>
                                        <th style={tableHeaderCell}>Timing / Day</th>
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
                                                        <div style={{fontSize: '0.8rem', color: '#666'}}>Sec {cls.section}</div>
                                                    </td>
                                                    <td style={tableDataCell}>
                                                        <div style={{fontWeight: 'bold'}}>{cls.course}</div>
                                                        <div style={{fontSize: '0.8rem', color: '#666', display: 'flex', alignItems: 'center', gap: '4px'}}>{SVGS.userTie} {cls.teacher} | {SVGS.location} Rm: {cls.room}</div>
                                                    </td>
                                                    <td style={tableDataCell}>
                                                        <div style={{fontWeight: '900', color: '#F2A900'}}>{cls.day}</div>
                                                        <div style={{fontSize: '0.8rem', color: '#666', display: 'flex', alignItems: 'center', gap: '4px'}}>{SVGS.clock} {convertTo12Hour(cls.start_time)} - {convertTo12Hour(cls.end_time)}</div>
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
                                                        <button onClick={() => deleteException(ex.id)} style={{...actionBtn, background: '#fef2f2', color: '#dc3545', width: 'auto'}}>{SVGS.undo} Undo Exception</button>
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
                    <div className="expand-anim" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
                        
                        {/* ROSTER VIEWER */}
                        <div style={contentCard}>
                            <h3 style={cardHeader}>{SVGS.users} Global Roster Index</h3>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                                <select value={filterSem} onChange={e=>setFilterSem(e.target.value)} style={{...selectStyle, flex:1, marginBottom: 0}}>
                                    <option value="">Select Session</option>
                                    {availableSemesters.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <select value={filterSec} onChange={e=>setFilterSec(e.target.value)} style={{...selectStyle, flex:1, marginBottom: 0}}>
                                    <option value="">Select Section</option>
                                    {availableSections.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                                <button onClick={() => {
                                    setStudentForm({ original_reg: null, student_name: '', registration_number: '', session: filterSem || '', section: filterSec || '' });
                                    setIsStudentModalOpen(true);
                                }} style={{...actionBtn, background: '#002147', color: '#F2A900', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'}}>{SVGS.plus} Add Student</button>
                                
                                <input type="file" accept=".csv" ref={fileInputRef} onChange={handleCSVUpload} style={{ display: 'none' }} />
                                <button onClick={() => fileInputRef.current.click()} style={{...actionBtn, background: '#28a745', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'}}>{SVGS.upload} CSV Import</button>
                            </div>

                            <div style={{ maxHeight: '400px', overflowY: 'auto' }} className="scroll-hide">
                                {(!filterSem || !filterSec) ? <div style={emptyState}>Select Session & Section to view roster.</div> : (
                                    <table style={tableStyle}>
                                        <tbody>
                                            {roster.filter(r => r.session === filterSem && r.section === filterSec).map(s => (
                                                <tr key={s.registration_number} style={tableDataRow}>
                                                    <td style={{...tableDataCell, fontWeight: 'bold'}}>{s.registration_number}</td>
                                                    <td style={tableDataCell}>{s.student_name}</td>
                                                    <td style={{...tableDataCell, textAlign:'right', display:'flex', gap:'5px', justifyContent:'flex-end'}}>
                                                        <button onClick={() => { setStudentForm({...s, original_reg: s.registration_number}); setIsStudentModalOpen(true); }} style={{...actionBtn, background: '#f0f2f5', minWidth:'auto', padding:'6px'}}>{SVGS.edit}</button>
                                                        <button onClick={async ()=>{
                                                            if(window.confirm('Delete student?')) {
                                                                await supabase.from('students').delete().eq('registration_number', s.registration_number);
                                                                fetchAllData();
                                                            }
                                                        }} style={{...actionBtn, background: '#fef2f2', color: '#dc3545', minWidth:'auto', padding:'6px'}}>{SVGS.trash}</button>
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
                            <h3 style={cardHeader}>{SVGS.attendance} Attendance Vault (Raw Data)</h3>
                            <div style={{ maxHeight: '500px', overflowY: 'auto' }} className="scroll-hide">
                                {attendanceSessions.length === 0 ? <div style={emptyState}>No sessions recorded yet.</div> : (
                                    attendanceSessions.sort((a,b) => new Date(b.session_date) - new Date(a.session_date)).map(session => {
                                        const base = baseSchedule.find(b => b.id === session.base_schedule_id);
                                        return (
                                            <div key={session.id} style={{ background:'#f8f9fa', padding:'15px', borderRadius:'10px', marginBottom:'12px', borderLeft: session.status === 'approved' ? '5px solid #28a745' : '5px solid #F2A900', borderTop: '1px solid #eee', borderRight: '1px solid #eee', borderBottom: '1px solid #eee', boxShadow: '0 2px 5px rgba(0,0,0,0.02)'}}>
                                                <div style={{display:'flex', justifyContent:'space-between', alignItems: 'center', marginBottom: '8px'}}>
                                                    <strong style={{color: '#002147', fontSize: '1.05rem'}}>{base?.course || 'Deleted Course'}</strong>
                                                    <span style={{fontSize:'0.75rem', color:'#666', fontWeight: 'bold', background: '#e9ecef', padding: '3px 8px', borderRadius: '12px'}}>{session.session_date}</span>
                                                </div>
                                                <div style={{fontSize:'0.8rem', color:'#555', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '4px'}}>
                                                    <span><strong>Class:</strong> Sec {base?.section} ({base?.semester})</span>
                                                    <span><strong>By:</strong> {session.auth_users?.email || 'Unknown'}</span>
                                                </div>
                                                <div style={{display:'flex', gap:'8px', flexWrap:'wrap'}}>
                                                    <button onClick={async () => {
                                                        const status = session.status === 'approved' ? 'pending' : 'approved';
                                                        await supabase.from('attendance_sessions').update({status}).eq('id', session.id);
                                                        fetchAllData();
                                                    }} style={{...actionBtn, background: session.status === 'approved' ? '#f0f2f5' : '#dcfce7', color: session.status === 'approved' ? '#333' : '#15803d', border: `1px solid ${session.status === 'approved' ? '#ddd' : '#86efac'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'}}>
                                                        {session.status === 'approved' ? <>{SVGS.cross} Unapprove</> : <>{SVGS.tickCircle} Force Approve</>}
                                                    </button>
                                                    
                                                    <button onClick={() => openAttendanceEditor(session)} style={{...actionBtn, background: '#eff6ff', color: '#0369a1', border: '1px solid #bae6fd', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'}}>
                                                        {SVGS.edit} Edit Data
                                                    </button>
                                                    
                                                    <button onClick={async () => {
                                                        if(window.confirm('Wipe this attendance record entirely?')) {
                                                            await supabase.from('attendance_sessions').delete().eq('id', session.id);
                                                            fetchAllData();
                                                        }
                                                    }} style={{...actionBtn, background: '#fef2f2', color: '#dc3545', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'}}>
                                                        {SVGS.trash} Wipe
                                                    </button>
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
                    <div className="expand-anim" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                        
                        {/* GLOBAL BROADCAST */}
                        <div style={contentCard}>
                            <h3 style={{...cardHeader, color: '#dc3545', display: 'flex', alignItems: 'center', gap: '8px'}}>{SVGS.broadcast} Global Emergency Broadcast</h3>
                            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '15px' }}>Push a high-priority notification to every single registered section simultaneously.</p>
                            <form onSubmit={sendGlobalAlert}>
                                <textarea 
                                    required 
                                    value={globalAlertMsg}
                                    onChange={e=>setGlobalAlertMsg(e.target.value)}
                                    placeholder="Enter emergency message here... (e.g. University closed today)"
                                    style={{...selectStyle, minHeight: '120px', resize: 'vertical'}}
                                />
                                <button type="submit" style={{...bigBtn, background: '#dc3545', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'}}>
                                    {SVGS.alertCircle} DISPATCH GLOBAL ALERT
                                </button>
                            </form>
                        </div>

                        {/* BUS POINTS */}
                        <div style={contentCard}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
                                <h3 style={{ margin: 0, color: '#002147', display: 'flex', alignItems: 'center', gap: '6px' }}>{SVGS.bus} Bus Point Engine</h3>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input type="file" accept=".csv" ref={pointsFileInputRef} onChange={handlePointsCSVUpload} style={{ display: 'none' }} />
                                    <button onClick={() => pointsFileInputRef.current.click()} style={{...actionBtn, background: '#e0f2fe', color: '#0369a1', minWidth: 'auto', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '4px'}}>{SVGS.upload} Bulk CSV</button>
                                    <button onClick={() => {
                                        setPointForm({ id: null, route: 'AC_to_BJC', departure_time: '08:00', is_saturday: false });
                                        setIsPointModalOpen(true);
                                    }} style={{...actionBtn, background: '#002147', color: '#F2A900', minWidth: 'auto', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '4px'}}>{SVGS.plus} Route</button>
                                </div>
                            </div>
                            
                            <div style={{ maxHeight: '400px', overflowY: 'auto' }} className="scroll-hide">
                                <table style={tableStyle}>
                                    <thead>
                                        <tr style={tableHeaderRow}>
                                            <th style={tableHeaderCell}>Route</th>
                                            <th style={tableHeaderCell}>Time</th>
                                            <th style={tableHeaderCell}>Type</th>
                                            <th style={tableHeaderCell}>Act</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pointSchedules.sort((a,b) => a.departure_time.localeCompare(b.departure_time)).map(p => (
                                            <tr key={p.id} style={tableDataRow}>
                                                <td style={{...tableDataCell, fontSize: '0.8rem', color: '#002147', fontWeight: 'bold'}}>{p.route === 'AC_to_BJC' ? 'AC ➔ BJC' : 'BJC ➔ AC'}</td>
                                                <td style={tableDataCell}><strong>{convertTo12Hour(p.departure_time.slice(0,5))}</strong></td>
                                                <td style={tableDataCell}>{p.is_saturday ? <span style={{color:'#d97706', background: '#fef3c7', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight:'bold'}}>Weekend</span> : <span style={{color:'#15803d', background: '#dcfce7', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight:'bold'}}>Weekday</span>}</td>
                                                <td style={{...tableDataCell, display:'flex', gap:'5px'}}>
                                                    <button onClick={() => {setPointForm(p); setIsPointModalOpen(true);}} style={{...actionBtn, background: '#f0f2f5', padding: '6px', minWidth:'auto'}}>{SVGS.edit}</button>
                                                    <button onClick={() => deletePointSchedule(p.id)} style={{...actionBtn, background: '#fef2f2', color: '#dc3545', padding: '6px', minWidth:'auto'}}>{SVGS.trash}</button>
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
                                    <input type="text" placeholder="CNIC" value={userEditForm.cnic} onChange={e=>setUserEditForm({...userEditForm, cnic:e.target.value})} style={{...selectStyle, marginBottom: 0}} />
                                </>
                            )}
                            
                            <input type="text" placeholder="Phone Number" required value={userEditForm.phone} onChange={e=>setUserEditForm({...userEditForm, phone:e.target.value})} style={{...selectStyle, marginBottom: 0}} />
                            
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="button" onClick={()=>setIsUserEditModalOpen(false)} style={{...actionBtn, background: '#f0f2f5'}}>Cancel</button>
                                <button type="submit" style={{...actionBtn, background: '#28a745', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'}}>{SVGS.tickCircle} Save & Approve</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* BASE LECTURE MODAL */}
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
                                <button type="button" onClick={()=>setIsBaseModalOpen(false)} style={{...actionBtn, background: '#f0f2f5'}}>Cancel</button>
                                <button type="submit" style={{...actionBtn, background: '#002147', color: '#F2A900', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'}}>{SVGS.save} Save to DB</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* POINT SCHEDULE MODAL */}
            {isPointModalOpen && (
                <div style={modalBackdrop}>
                    <div className="expand-anim" style={modalContent}>
                        <h3 style={{ marginTop: 0, color: '#002147', borderBottom: '1px solid #eee', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>{pointForm.id ? <>{SVGS.edit} Edit Bus Route</> : <>{SVGS.plus} Add Bus Route</>}</h3>
                        <form onSubmit={savePointSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <label style={{fontWeight:'bold', fontSize:'0.8rem', color: '#666', marginBottom: '4px', display: 'block'}}>Route Direction</label>
                                <select value={pointForm.route} onChange={e=>setPointForm({...pointForm, route:e.target.value})} style={{...selectStyle, marginBottom: 0}}>
                                    <option value="AC_to_BJC">Abbasia Campus ➔ Baghdad</option>
                                    <option value="BJC_to_AC">Baghdad ➔ Abbasia Campus</option>
                                </select>
                            </div>
                            <div>
                                <label style={{fontWeight:'bold', fontSize:'0.8rem', color: '#666', marginBottom: '4px', display: 'block'}}>Departure Time (24H format)</label>
                                <input type="time" required value={pointForm.departure_time} onChange={e=>setPointForm({...pointForm, departure_time:e.target.value})} style={{...selectStyle, marginBottom: 0}} />
                            </div>
                            <div style={{display: 'flex', alignItems: 'center', gap: '10px', background: '#f8f9fa', padding: '10px', borderRadius: '8px', border: '1px solid #eee'}}>
                                <input type="checkbox" id="isSat" checked={pointForm.is_saturday} onChange={e=>setPointForm({...pointForm, is_saturday:e.target.checked})} style={{width:'18px', height:'18px', accentColor: '#002147'}} />
                                <label htmlFor="isSat" style={{fontWeight:'bold', color:'#333', fontSize: '0.9rem', cursor: 'pointer'}}>Is this a Saturday-only timing?</label>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                                <button type="button" onClick={()=>setIsPointModalOpen(false)} style={{...actionBtn, background: '#f0f2f5'}}>Cancel</button>
                                <button type="submit" style={{...actionBtn, background: '#002147', color: '#F2A900', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'}}>{SVGS.save} Save Route</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* STUDENT FORM MODAL */}
            {isStudentModalOpen && (
                <div style={modalBackdrop}>
                    <div className="expand-anim" style={modalContent}>
                        <h3 style={{ marginTop: 0, color: '#002147', borderBottom: '1px solid #eee', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>{studentForm.original_reg ? <>{SVGS.edit} Edit Student</> : <>{SVGS.users} Add Student</>}</h3>
                        <form onSubmit={saveStudent} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{display:'flex', gap:'10px'}}>
                                <input type="text" placeholder="Session (e.g. Spring 2026)" required value={studentForm.session} onChange={e=>setStudentForm({...studentForm, session:e.target.value})} style={{...selectStyle, flex:1, marginBottom: 0}} />
                                <input type="text" placeholder="Sec (e.g. 1E)" required value={studentForm.section} onChange={e=>setStudentForm({...studentForm, section:e.target.value.toUpperCase()})} style={{...selectStyle, flex:1, marginBottom: 0}} />
                            </div>
                            
                            <div>
                                <input 
                                    type="text" 
                                    placeholder="Registration No. (e.g. FA23-BSE-001)" 
                                    required 
                                    value={studentForm.registration_number} 
                                    onChange={e=>setStudentForm({...studentForm, registration_number:e.target.value})} 
                                    style={{...selectStyle, marginBottom: 0, background: studentForm.original_reg ? '#e9ecef' : '#f8f9fa', cursor: studentForm.original_reg ? 'not-allowed' : 'text'}} 
                                    disabled={studentForm.original_reg !== null} 
                                />
                                {studentForm.original_reg && <div style={{fontSize: '0.7rem', color: '#dc3545', marginTop: '4px', fontWeight: 'bold'}}>*Registration number is fixed. Delete and recreate if incorrect.</div>}
                            </div>
                            
                            <input type="text" placeholder="Student Full Name" required value={studentForm.student_name} onChange={e=>setStudentForm({...studentForm, student_name:e.target.value})} style={{...selectStyle, marginBottom: 0}} />
                            
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="button" onClick={()=>setIsStudentModalOpen(false)} style={{...actionBtn, background: '#f0f2f5'}}>Cancel</button>
                                <button type="submit" style={{...actionBtn, background: '#002147', color: '#F2A900', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'}}>{SVGS.save} Save Student</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ATTENDANCE EDITOR MODAL */}
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
                                                            background: currentStatus === status 
                                                                ? (status === 'Present' ? '#dcfce7' : status === 'Absent' ? '#fef2f2' : '#fef3c7') 
                                                                : '#f8f9fa',
                                                            color: currentStatus === status 
                                                                ? (status === 'Present' ? '#15803d' : status === 'Absent' ? '#dc3545' : '#b45309') 
                                                                : '#6b7280',
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

const welcomeBg = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: '#002147', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000 };
const welcomeCard = { background: '#fff', padding: '30px', borderRadius: '15px', width: '90%', maxWidth: '380px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', boxSizing: 'border-box' };
const headerStyle = { background: '#002147', color: '#F2A900', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 1000, boxShadow: '0 4px 15px rgba(0,0,0,0.2)', flexWrap: 'wrap' };
const enableBtnStyle = { background: '#F2A900', color: '#002147', border: 'none', padding: '6px 15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.3s ease', fontSize: '0.85rem' };

const tabBar = { background: '#fff', padding: '8px 4px', gap: '6px', position: 'sticky', top: '55px', zIndex: 999, boxShadow: '0 4px 10px rgba(0,0,0,0.05)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' };
const tabBtn = (active) => ({ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: '65px', padding: '8px 2px', border: 'none', background: active ? '#002147' : 'transparent', color: active ? '#F2A900' : '#666', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.3s ease', position: 'relative' });

const btnStyle = (bg) => ({ flex: 1, minWidth: '100px', padding: '10px', background: bg, color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.3s ease' });
const actionBtn = { padding: '8px 12px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.75rem', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '4px' };
const bigBtn = { width: '100%', padding: '14px', background: '#F2A900', color: '#002147', border: 'none', borderRadius: '8px', fontWeight: 900, cursor: 'pointer', transition: 'all 0.3s ease', fontSize: '0.9rem' };

const inputStyle = { width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box', background: '#f8f9fa', transition: 'all 0.3s ease' };
const selectStyle = { width: '100%', padding: '10px 12px', marginBottom: '12px', borderRadius: '8px', border: '1px solid #dee2e6', fontSize: '0.85rem', background: '#f8f9fa', outline: 'none', boxSizing: 'border-box', transition: 'all 0.3s ease', color: '#333' };

const tabStyle = (isActive) => ({ flex: 1, padding: '12px', background: isActive ? '#002147' : '#fff', color: isActive ? 'white' : '#555', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: isActive ? '0 4px 10px rgba(0,33,71,0.2)' : '0 2px 5px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' });
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
