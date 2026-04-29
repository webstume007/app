import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
    const [session, setSession] = useState(null);
    const [profile, setProfile] = useState(null);
    const [schedule, setSchedule] = useState([]);
    const [loading, setLoading] = useState(true);
    const [availableRooms, setAvailableRooms] = useState([]);

    // --- MODAL STATES FOR EDIT TIMING ---
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState(null);
    const [newDate, setNewDate] = useState('');
    const [newStartTime, setNewStartTime] = useState('8:00 AM');
    const [newEndTime, setNewEndTime] = useState('9:30 AM');
    const [newRoom, setNewRoom] = useState('');

    // Generate time slots for the dropdowns
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
            // Fetch Base Schedule
            const { data: scheduleData } = await supabase.from('base_schedule').select('*').eq('semester', profileData.semester).eq('section', profileData.section);
            
            // Fetch all rooms for the Reschedule dropdown
            const { data: allData } = await supabase.from('base_schedule').select('room');
            if (allData) {
                const rooms = [...new Set(allData.map(x => x.room))].filter(Boolean).sort();
                setAvailableRooms(rooms);
            }

            // Fetch Exceptions (Cancellations, Reschedules, & Confirmations)
            const { data: exceptionsData } = await supabase.from('schedule_exceptions').select('*');

            // Merge data to determine the current status of each class
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
        const today = new Date().toISOString().split('T')[0];

        const { error } = await supabase.from('schedule_exceptions').insert([{
            base_schedule_id: classId,
            exception_date: today,
            status: 'confirmed',
            cancelled_by: session.user.id
        }]);

        if (error) return alert("Error: " + error.message);

        await supabase.from('notifications').insert([{ 
            message: `✅ Confirmed: ${courseName} for Section ${profile.section} is happening as scheduled.` 
        }]);

        alert(`${courseName} marked as Confirmed!`);
        fetchProfileAndSchedule(session.user.id);
    };

    // --- ACTION: CANCEL CLASS ---
    const handleCancelClass = async (classId, courseName) => {
        const confirmCancel = window.confirm(`Are you sure you want to CANCEL ${courseName}?`);
        if (!confirmCancel) return;

        const today = new Date().toISOString().split('T')[0];

        const { error } = await supabase.from('schedule_exceptions').insert([{
            base_schedule_id: classId, exception_date: today, status: 'cancelled', cancelled_by: session.user.id
        }]);

        if (error) return alert("Error: " + error.message);

        await supabase.from('notifications').insert([{ 
            message: `🚨 Cancelled: ${courseName} for Section ${profile.section} is cancelled.` 
        }]);

        alert(`Class cancelled successfully!`);
        fetchProfileAndSchedule(session.user.id);
    };

    // --- ACTION: OPEN EDIT MODAL ---
    const openEditModal = (cls) => {
        setEditingClass(cls);
        setNewDate(new Date().toISOString().split('T')[0]);
        setNewStartTime(cls.start_time);
        setNewEndTime(cls.end_time);
        setNewRoom(cls.room);
        setIsEditModalOpen(true);
    };

    // --- ACTION: SUBMIT RESCHEDULE ---
    const submitReschedule = async (e) => {
        e.preventDefault();
        const { error } = await supabase.from('schedule_exceptions').insert([{
            base_schedule_id: editingClass.id,
            exception_date: newDate,
            status: 'rescheduled',
            new_start_time: newStartTime,
            new_end_time: newEndTime,
            new_room: newRoom,
            cancelled_by: session.user.id
        }]);

        if (error) return alert("Error: " + error.message);

        await supabase.from('notifications').insert([{ 
            message: `🔄 Rescheduled: ${editingClass.course} (${profile.section}) moved to Room ${newRoom} on ${newDate} at ${newStartTime}.` 
        }]);

        alert(`Class rescheduled successfully!`);
        setIsEditModalOpen(false);
        fetchProfileAndSchedule(session.user.id);
    };

    if (loading) return <div style={{ textAlign: 'center', marginTop: '50px', fontFamily: 'sans-serif' }}>Loading Dashboard...</div>;
    if (!session) return null;

    return (
        <div style={{ background: '#f0f2f5', minHeight: '100vh', fontFamily: "'Roboto', sans-serif" }}>
            <header style={{ background: '#002147', color: '#F2A900', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: '900', fontSize: '1.2rem' }}>🎓 CR Dashboard</div>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <a href="/notifications" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold' }}>🔔 Notifications</a>
                    <button onClick={handleLogout} style={{ background: '#F2A900', color: '#002147', border: 'none', padding: '8px 15px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>Logout</button>
                </div>
            </header>

            <div style={{ maxWidth: '1000px', margin: '20px auto', padding: '0 15px' }}>
                <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '20px', borderLeft: '5px solid #F2A900' }}>
                    <h2 style={{ margin: '0 0 10px 0', color: '#002147' }}>Welcome, {profile?.first_name} {profile?.last_name}</h2>
                    <p style={{ margin: 0, color: '#555' }}>Managing: <strong>{profile?.semester} Semester | Section {profile?.section}</strong></p>
                </div>

                <h3 style={{ color: '#333', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px', marginBottom: '15px' }}>Your Weekly Timetable</h3>
                
                {schedule.length === 0 ? (
                    <p>No classes found.</p>
                ) : (
                    schedule.sort((a, b) => a.day.localeCompare(b.day)).map((cls) => (
                        <div key={cls.id} style={{ 
                            background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', marginBottom: '15px', 
                            borderLeft: cls.isRescheduled ? '5px solid #007bff' : cls.isConfirmed ? '5px solid #28a745' : 'none',
                            opacity: cls.isCancelled ? 0.6 : 1 
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px' }}>
                                <div>
                                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: cls.isCancelled ? 'red' : '#000', textDecoration: cls.isCancelled ? 'line-through' : 'none' }}>
                                        {cls.course}
                                    </div>
                                    <div style={{ color: '#666', fontSize: '0.9rem' }}>{cls.teacher} | Room {cls.room}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ color: '#002147', fontWeight: '900' }}>{cls.day}</div>
                                    <div style={{ color: '#F2A900', fontWeight: 'bold' }}>{cls.start_time} - {cls.end_time}</div>
                                </div>
                            </div>

                            {cls.isRescheduled && (
                                <div style={{ background: '#e7f1ff', color: '#004085', padding: '10px', borderRadius: '5px', marginBottom: '10px', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                    🔄 Moved to {cls.exceptionDetails.new_room} on {cls.exceptionDetails.exception_date}
                                </div>
                            )}

                            {cls.isConfirmed && (
                                <div style={{ background: '#d4edda', color: '#155724', padding: '10px', borderRadius: '5px', marginBottom: '10px', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                    ✅ Confirmed for Today
                                </div>
                            )}
                            
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                {cls.isCancelled ? (
                                    <div style={{ width: '100%', textAlign: 'center', padding: '10px', background: '#ffeeba', color: '#856404', borderRadius: '5px', fontWeight: 'bold' }}>Class Cancelled for Today</div>
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

            {/* EDIT MODAL */}
            {isEditModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
                    <div style={{ background: 'white', padding: '25px', borderRadius: '10px', width: '90%', maxWidth: '400px' }}>
                        <h3 style={{ marginTop: 0 }}>Reschedule Class</h3>
                        <form onSubmit={submitReschedule} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <input type="date" required value={newDate} onChange={(e) => setNewDate(e.target.value)} style={inputStyle} />
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <select value={newStartTime} onChange={(e) => setNewStartTime(e.target.value)} style={inputStyle}>{timeSlots.map(t => <option key={t} value={t}>{t}</option>)}</select>
                                <select value={newEndTime} onChange={(e) => setNewEndTime(e.target.value)} style={inputStyle}>{timeSlots.map(t => <option key={t} value={t}>{t}</option>)}</select>
                            </div>
                            <select required value={newRoom} onChange={(e) => setNewRoom(e.target.value)} style={inputStyle}>
                                {availableRooms.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button type="button" onClick={() => setIsEditModalOpen(false)} style={{ flex: 1, padding: '12px', background: '#eee', border: 'none', borderRadius: '5px' }}>Cancel</button>
                                <button type="submit" style={{ flex: 1, padding: '12px', background: '#F2A900', color: '#002147', border: 'none', borderRadius: '5px', fontWeight: 'bold' }}>Save</button>
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
const inputStyle = { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', outline: 'none', fontSize: '1rem' };
