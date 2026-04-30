import { useEffect, useState } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
    const [session, setSession] = useState(null);
    const [profile, setProfile] = useState(null);
    const [schedule, setSchedule] = useState([]); // For Weekly view with exceptions
    const [baseSchedule, setBaseSchedule] = useState([]); // For Permanent Base Schedule
    const [loading, setLoading] = useState(true);
    
    // --- DROPDOWN STATES ---
    const [availableRooms, setAvailableRooms] = useState([]);
    const [availableCourses, setAvailableCourses] = useState([]);
    const [availableTeachers, setAvailableTeachers] = useState([]);

    // --- TOGGLE STATES FOR MANUAL ENTRY ---
    const [isManualCourse, setIsManualCourse] = useState(false);
    const [isManualTeacher, setIsManualTeacher] = useState(false);

    // --- TAB STATE ---
    const [activeTab, setActiveTab] = useState('weekly'); // 'weekly' or 'permanent'

    // --- MODAL STATES FOR TEMP RESCHEDULE ---
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState(null);
    const [newDate, setNewDate] = useState('');
    const [newStartTime, setNewStartTime] = useState('8:00 AM');
    const [newEndTime, setNewEndTime] = useState('9:30 AM');
    const [newRoom, setNewRoom] = useState('');

    // --- MODAL STATES FOR PERMANENT SCHEDULE ---
    const [isBaseModalOpen, setIsBaseModalOpen] = useState(false);
    const [baseForm, setBaseForm] = useState({ id: null, course: '', teacher: '', room: '', day: 'MON', start_time: '8:00 AM', end_time: '9:30 AM' });

    // Updated days to match index.js exactly
    const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

    // Generate time slots for the dropdowns
    const timeSlots = [];
    let ts = 8 * 60; 
    while (ts < 18 * 60) {
        let h = Math.floor(ts / 60), m = ts % 60, amp = h >= 12 ? 'PM' : 'AM', dh = h > 12 ? h - 12 : h;
        if (dh === 0) dh = 12; 
        timeSlots.push(`${dh}:${m === 0 ? '00' : m} ${amp}`); 
        ts += 30;
    }

    // Convert any 24h DB time to 12h AM/PM for display
    const convertTo12Hour = (timeStr) => {
        if (!timeStr) return "";
        if (timeStr.toUpperCase().includes('AM') || timeStr.toUpperCase().includes('PM')) return timeStr;
        let [h, m] = timeStr.split(':').map(Number);
        const suffix = h >= 12 ? "PM" : "AM";
        h = h % 12 || 12;
        return `${h}:${m === 0 ? '00' : m < 10 ? '0' + m : m} ${suffix}`;
    };

    useEffect(() => {
        // Request Notification Permissions on load
        if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission();
        }

        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) fetchProfileAndSchedule(session.user.id);
            else window.location.href = '/login';
        });
    }, []);

    // REALTIME LISTENER: CR gets notifications for their section
    useEffect(() => {
        if (!profile) return;
        const channel = supabase
            .channel('cr-realtime-updates')
            .on('postgres_changes', 
                { event: 'INSERT', schema: 'public', table: 'notifications' }, 
                (payload) => {
                    const newMsg = payload.new.message;
                    if (newMsg.includes(profile.section)) {
                        if (Notification.permission === "granted") {
                            new Notification("IUB Update Alert", { body: newMsg, icon: "/icon.png" });
                        }
                    }
                }
            ).subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [profile]);

    const fetchProfileAndSchedule = async (userId) => {
        const { data: profileData } = await supabase.from('cr_profiles').select('*').eq('id', userId).single();
        setProfile(profileData);

        if (profileData) {
            // Fetch Base Schedule
            const { data: scheduleData } = await supabase.from('base_schedule').select('*').eq('semester', profileData.semester).eq('section', profileData.section);
            setBaseSchedule(scheduleData || []);
            
            // Fetch all rooms, courses, and teachers for the dropdowns
            const { data: allData } = await supabase.from('base_schedule').select('room, course, teacher');
            if (allData) {
                setAvailableRooms([...new Set(allData.map(x => x.room))].filter(Boolean).sort());
                setAvailableCourses([...new Set(allData.map(x => x.course))].filter(Boolean).sort());
                setAvailableTeachers([...new Set(allData.map(x => x.teacher))].filter(Boolean).sort());
            }

            // Fetch Exceptions (Cancellations, Reschedules, & Confirmations)
            const today = new Date().toLocaleDateString('en-CA');
            const { data: exceptionsData } = await supabase.from('schedule_exceptions').select('*').eq('exception_date', today);

            // Merge data to determine the current status of each class for the week
            const mergedSchedule = (scheduleData || []).map(cls => {
                const exception = (exceptionsData || []).find(ex => ex.base_schedule_id === cls.id);
                
                return { 
                    ...cls, 
                    isCancelled: exception?.status === 'cancelled',
                    isRescheduled: exception?.status === 'rescheduled',
                    isConfirmed: exception?.status === 'confirmed',
                    exceptionDetails: exception
                };
            });

            setSchedule(mergedSchedule);
        }
        setLoading(false);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = '/login';
    };

    // --- ACTION: WILL HELD (CONFIRM CLASS) ---
    const handleConfirmClass = async (classId, courseName) => {
        setSchedule(prev => prev.map(c => c.id === classId ? { ...c, isConfirmed: true, isCancelled: false } : c));
        
        const today = new Date().toLocaleDateString('en-CA');
        const { error } = await supabase.from('schedule_exceptions').insert([{
            base_schedule_id: classId, exception_date: today, status: 'confirmed', cancelled_by: session.user.id
        }]);

        if (error) alert("Error: " + error.message);
        fetchProfileAndSchedule(session.user.id); 
    };

    // --- ACTION: CANCEL CLASS ---
    const handleCancelClass = async (classId, courseName) => {
        const confirmCancel = window.confirm(`Are you sure you want to CANCEL ${courseName}?`);
        if (!confirmCancel) return;

        setSchedule(prev => prev.map(c => c.id === classId ? { ...c, isCancelled: true, isConfirmed: false } : c));

        const today = new Date().toLocaleDateString('en-CA');
        const { error } = await supabase.from('schedule_exceptions').insert([{
            base_schedule_id: classId, exception_date: today, status: 'cancelled', cancelled_by: session.user.id
        }]);

        if (error) {
            alert("Error: " + error.message);
        } else {
            await supabase.from('notifications').insert([{ 
                message: `🚨 Cancelled: ${courseName} for Section ${profile.section} is cancelled.` 
            }]);
        }
        
        fetchProfileAndSchedule(session.user.id);
    };

    // --- ACTION: UNDO EXCEPTION (CANCEL/CONFIRM/RESCHEDULE) ---
    const handleUndoException = async (classId, actionType, courseName) => {
        setSchedule(prev => prev.map(c => c.id === classId ? { ...c, isCancelled: false, isConfirmed: false, isRescheduled: false, exceptionDetails: null } : c));

        const today = new Date().toLocaleDateString('en-CA');
        const { error } = await supabase.from('schedule_exceptions')
            .delete()
            .match({ base_schedule_id: classId, exception_date: today });

        if (error) {
            console.error("Delete Error:", error);
            alert("Error undoing action in DB.");
        }

        if (actionType === 'cancelled') {
            const targetMessage = `🚨 Cancelled: ${courseName} for Section ${profile.section} is cancelled.`;
            await supabase.from('notifications').delete().eq('message', targetMessage);
        }

        fetchProfileAndSchedule(session.user.id);
    };

    // --- ACTION: OPEN TEMP EDIT MODAL ---
    const openEditModal = (cls) => {
        setEditingClass(cls);
        setNewDate(new Date().toLocaleDateString('en-CA'));
        setNewStartTime(convertTo12Hour(cls.start_time));
        setNewEndTime(convertTo12Hour(cls.end_time));
        setNewRoom(cls.room);
        setIsEditModalOpen(true);
    };

    // --- ACTION: SUBMIT RESCHEDULE ---
    const submitReschedule = async (e) => {
        e.preventDefault();
        const { error } = await supabase.from('schedule_exceptions').insert([{
            base_schedule_id: editingClass.id, exception_date: new Date().toLocaleDateString('en-CA'), status: 'rescheduled',
            new_start_time: newStartTime, new_end_time: newEndTime, new_room: newRoom, cancelled_by: session.user.id
        }]);

        if (error) return alert("Error: " + error.message);

        alert(`Class rescheduled successfully!`);
        setIsEditModalOpen(false);
        fetchProfileAndSchedule(session.user.id);
    };

    // --- PERMANENT SCHEDULE ACTIONS ---
    const openBaseModal = (cls = null) => {
        if (cls) {
            setBaseForm({ ...cls, start_time: convertTo12Hour(cls.start_time), end_time: convertTo12Hour(cls.end_time) });
            // Check if existing course/teacher is in our lists, if not, toggle manual entry
            setIsManualCourse(!availableCourses.includes(cls.course));
            setIsManualTeacher(!availableTeachers.includes(cls.teacher));
        } else {
            setBaseForm({ id: null, course: '', teacher: '', room: '', day: 'MON', start_time: '8:00 AM', end_time: '9:30 AM' });
            setIsManualCourse(false);
            setIsManualTeacher(false);
        }
        setIsBaseModalOpen(true);
    };

    const submitBaseSchedule = async (e) => {
        e.preventDefault();
        setIsBaseModalOpen(false); // Close modal instantly for smooth UI
        
        const payload = { 
            course: baseForm.course, teacher: baseForm.teacher, room: baseForm.room, 
            day: baseForm.day, start_time: baseForm.start_time, end_time: baseForm.end_time, 
            semester: profile.semester, section: profile.section 
        };

        if (baseForm.id) {
            await supabase.from('base_schedule').update(payload).eq('id', baseForm.id);
        } else {
            await supabase.from('base_schedule').insert([payload]);
        }
        
        // Await the fetch to ensure DB is fully updated before UI refresh
        await fetchProfileAndSchedule(session.user.id);
    };

    const deleteBaseLecture = async (id, courseName) => {
        if (!window.confirm(`Permanently delete ${courseName} from the base schedule? This cannot be undone.`)) return;
        
        // Optimistic UI Delete
        setBaseSchedule(prev => prev.filter(c => c.id !== id));
        
        await supabase.from('base_schedule').delete().eq('id', id);
        await fetchProfileAndSchedule(session.user.id);
    };

    if (loading) return <div style={{ textAlign: 'center', marginTop: '50px', fontFamily: 'sans-serif' }}>Loading Dashboard...</div>;
    if (!session) return null;

    return (
        <div style={{ background: '#f0f2f5', minHeight: '100vh', fontFamily: "'Roboto', sans-serif" }}>
            <Head>
                <title>CR Dashboard | IUB</title>
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"/>
            </Head>

            <header style={{ background: '#002147', color: '#F2A900', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ fontWeight: '900', fontSize: '1.2rem' }}>🎓 CR Dashboard</div>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <a href="/notifications" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem' }}>🔔 Notifications</a>
                    <button onClick={handleLogout} style={{ background: '#F2A900', color: '#002147', border: 'none', padding: '8px 15px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>Logout</button>
                </div>
            </header>

            <div style={{ maxWidth: '1000px', margin: '20px auto', padding: '0 15px' }}>
                <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '20px', borderLeft: '5px solid #F2A900' }}>
                    <h2 style={{ margin: '0 0 10px 0', color: '#002147', fontSize: '1.5rem' }}>Welcome, {profile?.first_name} {profile?.last_name}</h2>
                    <p style={{ margin: 0, color: '#555', fontSize: '0.95rem' }}>Managing: <strong>{profile?.semester} Semester | Section {profile?.section}</strong></p>
                </div>

                {/* --- NAVIGATION TABS --- */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                    <button 
                        onClick={() => setActiveTab('weekly')} 
                        style={{ flex: 1, padding: '12px', background: activeTab === 'weekly' ? '#002147' : '#ddd', color: activeTab === 'weekly' ? 'white' : '#333', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s' }}
                    >
                        📅 Weekly Timetable
                    </button>
                    <button 
                        onClick={() => setActiveTab('permanent')} 
                        style={{ flex: 1, padding: '12px', background: activeTab === 'permanent' ? '#002147' : '#ddd', color: activeTab === 'permanent' ? 'white' : '#333', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s' }}
                    >
                        🏛️ Base Schedule
                    </button>
                </div>

                {/* ================= WEEKLY SCHEDULE TAB ================= */}
                {activeTab === 'weekly' && (
                    <div>
                        <h3 style={{ color: '#333', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px', marginBottom: '15px' }}>Your Weekly Timetable (Temp Exceptions)</h3>
                        
                        {schedule.length === 0 ? (
                            <p>No classes found.</p>
                        ) : (
                            schedule.sort((a, b) => a.day.localeCompare(b.day)).map((cls) => (
                                <div key={cls.id} style={{ 
                                    background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', marginBottom: '15px', 
                                    borderLeft: cls.isRescheduled ? '5px solid #007bff' : cls.isConfirmed ? '5px solid #28a745' : 'none',
                                    opacity: cls.isCancelled ? 0.6 : 1 
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: cls.isCancelled ? 'red' : '#000', textDecoration: cls.isCancelled ? 'line-through' : 'none' }}>
                                                {cls.course}
                                            </div>
                                            <div style={{ color: '#666', fontSize: '0.9rem' }}>{cls.teacher} | Room {cls.room}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ color: '#002147', fontWeight: '900' }}>{cls.day}</div>
                                            <div style={{ color: '#F2A900', fontWeight: 'bold' }}>{convertTo12Hour(cls.start_time)} - {convertTo12Hour(cls.end_time)}</div>
                                        </div>
                                    </div>

                                    {cls.isRescheduled && (
                                        <div style={{ background: '#e7f1ff', color: '#004085', padding: '10px', borderRadius: '5px', marginBottom: '10px', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                            🔄 Moved to {cls.exceptionDetails.new_room} on {cls.exceptionDetails.exception_date} ({convertTo12Hour(cls.exceptionDetails.new_start_time)} - {convertTo12Hour(cls.exceptionDetails.new_end_time)})
                                        </div>
                                    )}

                                    {cls.isConfirmed && (
                                        <div style={{ background: '#d4edda', color: '#155724', padding: '10px', borderRadius: '5px', marginBottom: '10px', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                            ✅ Confirmed for Today
                                        </div>
                                    )}
                                    
                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                        {cls.isCancelled ? (
                                            <button onClick={() => handleUndoException(cls.id, 'cancelled', cls.course)} style={btnStyle('#6c757d')}>↩️ Undo Cancellation</button>
                                        ) : cls.isConfirmed ? (
                                            <button onClick={() => handleUndoException(cls.id, 'confirmed', cls.course)} style={btnStyle('#6c757d')}>↩️ Mark Not Confirm</button>
                                        ) : cls.isRescheduled ? (
                                            <button onClick={() => handleUndoException(cls.id, 'rescheduled', cls.course)} style={btnStyle('#6c757d')}>↩️ Undo Reschedule</button>
                                        ) : (
                                            <>
                                                <button onClick={() => handleConfirmClass(cls.id, cls.course)} style={btnStyle('#28a745')}>✅ Will Held</button>
                                                <button onClick={() => openEditModal(cls)} style={btnStyle('#007bff')}>🕒 Edit Timing</button>
                                                <button onClick={() => handleCancelClass(cls.id, cls.course)} style={btnStyle('#dc3545')}>❌ Cancel Class</button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* ================= PERMANENT SCHEDULE TAB ================= */}
                {activeTab === 'permanent' && (
                    <div>
                        <h3 style={{ color: '#333', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px', marginBottom: '15px' }}>Permanent / Base Schedule</h3>
                        
                        {baseSchedule.length === 0 ? (
                            <p>No base schedule found.</p>
                        ) : (
                            baseSchedule.sort((a, b) => a.day.localeCompare(b.day)).map((cls) => (
                                <div key={`base-${cls.id}`} style={{ background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', marginBottom: '15px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#000' }}>{cls.course}</div>
                                            <div style={{ color: '#666', fontSize: '0.9rem' }}>{cls.teacher} | Room {cls.room}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ color: '#002147', fontWeight: '900' }}>{cls.day}</div>
                                            <div style={{ color: '#F2A900', fontWeight: 'bold' }}>{convertTo12Hour(cls.start_time)} - {convertTo12Hour(cls.end_time)}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                        <button onClick={() => openBaseModal(cls)} style={btnStyle('#17a2b8')}>✏️ Edit Lecture</button>
                                        <button onClick={() => deleteBaseLecture(cls.id, cls.course)} style={btnStyle('#dc3545')}>🗑️ Delete Lecture</button>
                                    </div>
                                </div>
                            ))
                        )}
                        
                        <button onClick={() => openBaseModal()} style={{ width: '100%', padding: '15px', background: '#002147', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', marginTop: '10px', marginBottom: '30px' }}>
                            ➕ Add New Lecture
                        </button>
                    </div>
                )}
            </div>

            {/* TEMP EXCEPTION EDIT MODAL */}
            {isEditModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: '15px', boxSizing: 'border-box' }}>
                    <div style={{ background: 'white', padding: '25px', borderRadius: '10px', width: '100%', maxWidth: '400px' }}>
                        <h3 style={{ marginTop: 0 }}>Reschedule Class (Temp)</h3>
                        <form onSubmit={submitReschedule} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <input type="date" required value={newDate} onChange={(e) => setNewDate(e.target.value)} style={inputStyle} />
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                <select value={newStartTime} onChange={(e) => setNewStartTime(e.target.value)} style={{...inputStyle, flex: 1}}>{timeSlots.map(t => <option key={t} value={t}>{t}</option>)}</select>
                                <select value={newEndTime} onChange={(e) => setNewEndTime(e.target.value)} style={{...inputStyle, flex: 1}}>{timeSlots.map(t => <option key={t} value={t}>{t}</option>)}</select>
                            </div>
                            <select required value={newRoom} onChange={(e) => setNewRoom(e.target.value)} style={inputStyle}>
                                {availableRooms.length > 0 ? availableRooms.map(r => <option key={r} value={r}>{r}</option>) : <option value={newRoom}>{newRoom}</option>}
                            </select>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button type="button" onClick={() => setIsEditModalOpen(false)} style={{ flex: 1, padding: '12px', background: '#eee', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" style={{ flex: 1, padding: '12px', background: '#F2A900', color: '#002147', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* PERMANENT BASE SCHEDULE MODAL */}
            {isBaseModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: '15px', boxSizing: 'border-box' }}>
                    <div style={{ background: 'white', padding: '25px', borderRadius: '10px', width: '100%', maxWidth: '400px' }}>
                        <h3 style={{ marginTop: 0 }}>{baseForm.id ? 'Edit Base Lecture' : 'Add New Lecture'}</h3>
                        <form onSubmit={submitBaseSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            
                            {/* COURSE / SUBJECT DROPDOWN */}
                            {isManualCourse ? (
                                <input type="text" placeholder="Type Subject Name..." required value={baseForm.course} onChange={(e) => setBaseForm({...baseForm, course: e.target.value})} style={inputStyle} />
                            ) : (
                                <select required value={baseForm.course} onChange={(e) => {
                                    if (e.target.value === 'MANUAL') { setIsManualCourse(true); setBaseForm({...baseForm, course: ''}); }
                                    else setBaseForm({...baseForm, course: e.target.value});
                                }} style={inputStyle}>
                                    <option value="" disabled>-- Select Subject --</option>
                                    {availableCourses.map(c => <option key={c} value={c}>{c}</option>)}
                                    <option value="MANUAL">+ Add Manually</option>
                                </select>
                            )}

                            {/* TEACHER DROPDOWN */}
                            {isManualTeacher ? (
                                <input type="text" placeholder="Type Teacher Name..." required value={baseForm.teacher} onChange={(e) => setBaseForm({...baseForm, teacher: e.target.value})} style={inputStyle} />
                            ) : (
                                <select required value={baseForm.teacher} onChange={(e) => {
                                    if (e.target.value === 'MANUAL') { setIsManualTeacher(true); setBaseForm({...baseForm, teacher: ''}); }
                                    else setBaseForm({...baseForm, teacher: e.target.value});
                                }} style={inputStyle}>
                                    <option value="" disabled>-- Select Teacher --</option>
                                    {availableTeachers.map(t => <option key={t} value={t}>{t}</option>)}
                                    <option value="MANUAL">+ Add Manually</option>
                                </select>
                            )}
                            
                            <input type="text" placeholder="Room (e.g. 101)" required value={baseForm.room} onChange={(e) => setBaseForm({...baseForm, room: e.target.value})} style={inputStyle} />
                            
                            {/* DAYS DROPDOWN (Matches index.js formatting) */}
                            <select required value={baseForm.day} onChange={(e) => setBaseForm({...baseForm, day: e.target.value})} style={inputStyle}>
                                {days.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>

                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                <select value={baseForm.start_time} onChange={(e) => setBaseForm({...baseForm, start_time: e.target.value})} style={{...inputStyle, flex: 1}}>{timeSlots.map(t => <option key={t} value={t}>{t}</option>)}</select>
                                <select value={baseForm.end_time} onChange={(e) => setBaseForm({...baseForm, end_time: e.target.value})} style={{...inputStyle, flex: 1}}>{timeSlots.map(t => <option key={t} value={t}>{t}</option>)}</select>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button type="button" onClick={() => setIsBaseModalOpen(false)} style={{ flex: 1, padding: '12px', background: '#eee', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" style={{ flex: 1, padding: '12px', background: '#F2A900', color: '#002147', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

const btnStyle = (bg) => ({ flex: 1, minWidth: '100px', padding: '10px', background: bg, color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' });
const labelStyle = { display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#333', marginBottom: '5px' };
const inputStyle = { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', outline: 'none', fontSize: '1rem', boxSizing: 'border-box' };
