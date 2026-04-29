import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
    const [session, setSession] = useState(null);
    const [profile, setProfile] = useState(null);
    const [schedule, setSchedule] = useState([]);
    const [loading, setLoading] = useState(true);
    const [availableRooms, setAvailableRooms] = useState([]);
    
    // Tab Management
    const [activeTab, setActiveTab] = useState('temporary'); // 'temporary' or 'base'

    // --- MODAL STATES ---
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isBaseModalOpen, setIsBaseModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState(null);
    
    // Form States
    const [newDate, setNewDate] = useState('');
    const [newStartTime, setNewStartTime] = useState('8:00 AM');
    const [newEndTime, setNewEndTime] = useState('9:30 AM');
    const [newRoom, setNewRoom] = useState('');
    const [newCourse, setNewCourse] = useState('');
    const [newTeacher, setNewTeacher] = useState('');
    const [newDay, setNewDay] = useState('MON');

    const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const timeSlots = [];
    let ts = 8 * 60; 
    while (ts < 18 * 60) {
        let h = Math.floor(ts / 60), m = ts % 60, amp = h >= 12 ? 'PM' : 'AM', dh = h > 12 ? h - 12 : h;
        if (dh === 0) dh = 12; 
        timeSlots.push(`${dh}:${m === 0 ? '00' : m} ${amp}`); 
        ts += 30;
    }

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) fetchProfileAndSchedule(session.user.id);
            else window.location.href = '/login';
        });
    }, []);

    const fetchProfileAndSchedule = async (userId) => {
        const { data: profileData } = await supabase.from('cr_profiles').select('*').eq('id', userId).single();
        setProfile(profileData);

        if (profileData) {
            const { data: scheduleData } = await supabase.from('base_schedule').select('*').eq('semester', profileData.semester).eq('section', profileData.section);
            const { data: allRooms } = await supabase.from('base_schedule').select('room');
            if (allRooms) setAvailableRooms([...new Set(allRooms.map(x => x.room))].filter(Boolean).sort());

            const { data: exceptionsData } = await supabase.from('schedule_exceptions').select('*');

            const merged = (scheduleData || []).map(cls => {
                const exc = (exceptionsData || []).find(ex => ex.base_schedule_id === cls.id);
                return { 
                    ...cls, 
                    isCancelled: exc?.status === 'cancelled',
                    isRescheduled: exc?.status === 'rescheduled',
                    isConfirmed: exc?.status === 'confirmed',
                    exceptionDetails: exc
                };
            });
            setSchedule(merged);
        }
        setLoading(false);
    };

    // --- TEMPORARY ACTIONS (DAILY) ---
    const handleConfirmClass = async (classId, courseName) => {
        const { error } = await supabase.from('schedule_exceptions').insert([{
            base_schedule_id: classId, exception_date: new Date().toISOString().split('T')[0], status: 'confirmed', cancelled_by: session.user.id
        }]);
        if (error) return alert(error.message);
        await supabase.from('notifications').insert([{ message: `✅ Confirmed: ${courseName} (${profile.section}) is on today.` }]);
        fetchProfileAndSchedule(session.user.id);
    };

    const handleCancelClass = async (classId, courseName) => {
        if (!confirm(`Cancel ${courseName}?`)) return;
        const { error } = await supabase.from('schedule_exceptions').insert([{
            base_schedule_id: classId, exception_date: new Date().toISOString().split('T')[0], status: 'cancelled', cancelled_by: session.user.id
        }]);
        if (error) return alert(error.message);
        await supabase.from('notifications').insert([{ message: `🚨 Cancelled: ${courseName} (${profile.section}) is cancelled today.` }]);
        fetchProfileAndSchedule(session.user.id);
    };

    const submitReschedule = async (e) => {
        e.preventDefault();
        const { error } = await supabase.from('schedule_exceptions').insert([{
            base_schedule_id: editingClass.id, exception_date: newDate, status: 'rescheduled', new_start_time: newStartTime, new_end_time: newEndTime, new_room: newRoom, cancelled_by: session.user.id
        }]);
        if (error) return alert(error.message);
        await supabase.from('notifications').insert([{ message: `🔄 Rescheduled: ${editingClass.course} (${profile.section}) moved to Room ${newRoom} at ${newStartTime}.` }]);
        setIsEditModalOpen(false);
        fetchProfileAndSchedule(session.user.id);
    };

    // --- PERMANENT ACTIONS (BASE SCHEDULE) ---
    const openBaseEditModal = (cls) => {
        setEditingClass(cls);
        setNewCourse(cls.course);
        setNewTeacher(cls.teacher);
        setNewRoom(cls.room);
        setNewDay(cls.day);
        setNewStartTime(cls.start_time);
        setNewEndTime(cls.end_time);
        setIsBaseModalOpen(true);
    };

    const submitPermanentUpdate = async (e) => {
        e.preventDefault();
        const { error } = await supabase.from('base_schedule').update({
            course: newCourse, teacher: newTeacher, room: newRoom, day: newDay, start_time: newStartTime, end_time: newEndTime
        }).eq('id', editingClass.id);

        if (error) return alert("Error updating base schedule: " + error.message);
        
        alert("Base Schedule updated permanently!");
        setIsBaseModalOpen(false);
        fetchProfileAndSchedule(session.user.id);
    };

    if (loading) return <div style={centerStyle}>Loading CR Portal...</div>;

    return (
        <div style={{ background: '#f0f2f5', minHeight: '100vh', fontFamily: "'Roboto', sans-serif" }}>
            <header style={headerStyle}>
                <div style={{ fontWeight: 900 }}>🎓 CR PORTAL: {profile?.section}</div>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <a href="/notifications" style={{ color: 'white', textDecoration: 'none', fontSize: '0.8rem' }}>🔔 Alerts</a>
                    <button onClick={() => supabase.auth.signOut().then(() => window.location.href='/login')} style={logoutBtn}>Logout</button>
                </div>
            </header>

            {/* TAB TOGGLE */}
            <div style={tabContainer}>
                <button onClick={() => setActiveTab('temporary')} style={tabStyle(activeTab === 'temporary')}>Temporary Changes</button>
                <button onClick={() => setActiveTab('base')} style={tabStyle(activeTab === 'base')}>Weekly Schedule (Base)</button>
            </div>

            <div style={{ maxWidth: '600px', margin: '0 auto', padding: '15px' }}>
                
                {activeTab === 'temporary' ? (
                    <div>
                        <h4 style={sectionTitle}>Today's Quick Updates</h4>
                        {schedule.map(cls => (
                            <div key={cls.id} style={{...cardStyle, borderLeft: cls.isConfirmed ? '5px solid #28a745' : cls.isCancelled ? '5px solid #dc3545' : '5px solid #F2A900', opacity: cls.isCancelled ? 0.6 : 1}}>
                                <div style={cardHeader}>
                                    <div>
                                        <div style={{fontWeight: 'bold'}}>{cls.course}</div>
                                        <div style={{fontSize: '0.8rem', color: '#666'}}>{cls.day} | {cls.start_time} - {cls.end_time}</div>
                                    </div>
                                    <div style={{textAlign: 'right', fontSize: '0.8rem', fontWeight: 'bold'}}>{cls.room}</div>
                                </div>
                                <div style={{display: 'flex', gap: '5px', marginTop: '10px'}}>
                                    {cls.isCancelled ? <div style={statusBadge('#dc3545')}>Cancelled</div> : 
                                     cls.isConfirmed ? <div style={statusBadge('#28a745')}>Confirmed</div> : 
                                     <>
                                        <button onClick={() => handleConfirmClass(cls.id, cls.course)} style={actionBtn('#28a745')}>Held</button>
                                        <button onClick={() => { setEditingClass(cls); setIsEditModalOpen(true); }} style={actionBtn('#007bff')}>Resched</button>
                                        <button onClick={() => handleCancelClass(cls.id, cls.course)} style={actionBtn('#dc3545')}>Cancel</button>
                                     </>
                                    }
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div>
                        <h4 style={sectionTitle}>Permanent Schedule Editor</h4>
                        <p style={{fontSize: '0.75rem', color: '#666', marginBottom: '15px'}}>Changes made here will update the timetable permanently for everyone.</p>
                        {schedule.map(cls => (
                            <div key={cls.id} style={cardStyle}>
                                <div style={cardHeader}>
                                    <div>
                                        <div style={{fontWeight: 'bold'}}>{cls.course}</div>
                                        <div style={{fontSize: '0.8rem', color: '#666'}}>{cls.day} | {cls.start_time} - {cls.end_time}</div>
                                        <div style={{fontSize: '0.75rem', color: '#888'}}>{cls.teacher}</div>
                                    </div>
                                    <button onClick={() => openBaseEditModal(cls)} style={editPermanentBtn}>Edit Permanent</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* MODAL: TEMPORARY RESCHEDULE */}
            {isEditModalOpen && (
                <div style={modalOverlay}>
                    <div style={modalCard}>
                        <h3>Temporary Reschedule</h3>
                        <form onSubmit={submitReschedule} style={formStyle}>
                            <input type="date" required value={newDate} onChange={e => setNewDate(e.target.value)} style={inputStyle} />
                            <select value={newStartTime} onChange={e => setNewStartTime(e.target.value)} style={inputStyle}>{timeSlots.map(t => <option key={t} value={t}>{t}</option>)}</select>
                            <select value={newRoom} onChange={e => setNewRoom(e.target.value)} style={inputStyle}>{availableRooms.map(r => <option key={r} value={r}>{r}</option>)}</select>
                            <div style={{display: 'flex', gap: '10px'}}>
                                <button type="button" onClick={() => setIsEditModalOpen(false)} style={cancelBtn}>Close</button>
                                <button type="submit" style={saveBtn}>Confirm Change</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: PERMANENT BASE EDIT */}
            {isBaseModalOpen && (
                <div style={modalOverlay}>
                    <div style={modalCard}>
                        <h3 style={{margin: '0 0 15px 0', color: '#002147'}}>Permanent Edit</h3>
                        <form onSubmit={submitPermanentUpdate} style={formStyle}>
                            <label style={labelStyle}>Course Name</label>
                            <input value={newCourse} onChange={e => setNewCourse(e.target.value)} style={inputStyle} />
                            
                            <label style={labelStyle}>Teacher</label>
                            <input value={newTeacher} onChange={e => setNewTeacher(e.target.value)} style={inputStyle} />

                            <div style={{display: 'flex', gap: '5px'}}>
                                <div style={{flex:1}}>
                                    <label style={labelStyle}>Day</label>
                                    <select value={newDay} onChange={e => setNewDay(e.target.value)} style={inputStyle}>{days.map(d => <option key={d} value={d}>{d}</option>)}</select>
                                </div>
                                <div style={{flex:1}}>
                                    <label style={labelStyle}>Room</label>
                                    <input value={newRoom} onChange={e => setNewRoom(e.target.value)} style={inputStyle} />
                                </div>
                            </div>

                            <div style={{display: 'flex', gap: '5px'}}>
                                <div style={{flex:1}}><label style={labelStyle}>Start</label><select value={newStartTime} onChange={e => setNewStartTime(e.target.value)} style={inputStyle}>{timeSlots.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                                <div style={{flex:1}}><label style={labelStyle}>End</label><select value={newEndTime} onChange={e => setNewEndTime(e.target.value)} style={inputStyle}>{timeSlots.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                            </div>

                            <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                                <button type="button" onClick={() => setIsBaseModalOpen(false)} style={cancelBtn}>Discard</button>
                                <button type="submit" style={saveBtn}>Save Permanently</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// STYLES
const headerStyle = { background: '#002147', color: '#F2A900', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const tabContainer = { display: 'flex', background: '#fff', borderBottom: '1px solid #ddd' };
const tabStyle = (active) => ({ flex: 1, padding: '15px', border: 'none', background: active ? '#fff' : '#f8f9fa', color: active ? '#002147' : '#999', fontWeight: 'bold', borderBottom: active ? '3px solid #F2A900' : 'none', cursor: 'pointer' });
const cardStyle = { background: '#fff', padding: '15px', borderRadius: '10px', marginBottom: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' };
const cardHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const actionBtn = (bg) => ({ flex: 1, padding: '8px', border: 'none', borderRadius: '5px', background: bg, color: '#fff', fontWeight: 'bold', fontSize: '0.7rem', cursor: 'pointer' });
const editPermanentBtn = { padding: '8px 12px', background: '#002147', color: '#F2A900', border: 'none', borderRadius: '5px', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer' };
const logoutBtn = { background: '#F2A900', color: '#002147', border: 'none', padding: '5px 10px', borderRadius: '5px', fontSize: '0.7rem', fontWeight: 'bold' };
const statusBadge = (color) => ({ width: '100%', textAlign: 'center', padding: '8px', background: color + '22', color: color, borderRadius: '5px', fontWeight: 'bold', fontSize: '0.75rem' });
const modalOverlay = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 };
const modalCard = { background: '#fff', padding: '25px', borderRadius: '15px', width: '90%', maxWidth: '400px' };
const inputStyle = { width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '0.9rem' };
const saveBtn = { flex: 1, padding: '12px', background: '#002147', color: '#F2A900', border: 'none', borderRadius: '8px', fontWeight: 'bold' };
const cancelBtn = { flex: 1, padding: '12px', background: '#eee', border: 'none', borderRadius: '8px', fontWeight: 'bold' };
const formStyle = { display: 'flex', flexDirection: 'column' };
const labelStyle = { fontSize: '0.7rem', fontWeight: 'bold', color: '#666', marginBottom: '3px' };
const sectionTitle = { fontSize: '0.9rem', color: '#002147', marginBottom: '10px', textTransform: 'uppercase' };
const centerStyle = { textAlign: 'center', marginTop: '50px' };
