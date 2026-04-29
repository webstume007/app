import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
    const [session, setSession] = useState(null);
    const [profile, setProfile] = useState(null);
    const [schedule, setSchedule] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('temporary');

    // Modals
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isBaseModalOpen, setIsBaseModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState(null);

    // Form States
    const [formData, setFormData] = useState({
        course: '', teacher: '', room: '', day: 'MON', start_time: '8:00 AM', end_time: '9:30 AM', date: ''
    });

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
        const { data: p } = await supabase.from('cr_profiles').select('*').eq('id', userId).single();
        setProfile(p);
        if (p) {
            const { data: s } = await supabase.from('base_schedule').select('*').eq('semester', p.semester).eq('section', p.section);
            const { data: e } = await supabase.from('schedule_exceptions').select('*');
            const merged = (s || []).map(cls => {
                const exc = (e || []).find(ex => ex.base_schedule_id === cls.id);
                return { ...cls, exc };
            });
            setSchedule(merged);
        }
        setLoading(false);
    };

    // --- TEMPORARY ACTIONS ---
    const handleConfirm = async (cls) => {
        await supabase.from('schedule_exceptions').insert([{
            base_schedule_id: cls.id, status: 'confirmed', exception_date: new Date().toISOString().split('T')[0], cancelled_by: session.user.id
        }]);
        fetchProfileAndSchedule(session.user.id);
    };

    const handleCancel = async (cls) => {
        if (!confirm(`Cancel ${cls.course}?`)) return;
        await supabase.from('schedule_exceptions').insert([{
            base_schedule_id: cls.id, status: 'cancelled', exception_date: new Date().toISOString().split('T')[0], cancelled_by: session.user.id
        }]);
        // Notify others ONLY on cancellation
        await supabase.from('notifications').insert([{ 
            message: `🚨 ALERT: ${cls.course} for ${profile.section} is CANCELLED. Room ${cls.room} is now free.` 
        }]);
        fetchProfileAndSchedule(session.user.id);
    };

    const handleTempReschedule = async (e) => {
        e.preventDefault();
        await supabase.from('schedule_exceptions').insert([{
            base_schedule_id: editingClass.id, status: 'rescheduled', exception_date: formData.date,
            new_start_time: formData.start_time, new_end_time: formData.end_time, new_room: formData.room, cancelled_by: session.user.id
        }]);
        setIsEditModalOpen(false);
        fetchProfileAndSchedule(session.user.id);
    };

    // --- PERMANENT ACTIONS ---
    const handleAddBase = async (e) => {
        e.preventDefault();
        await supabase.from('base_schedule').insert([{
            ...formData, semester: profile.semester, section: profile.section
        }]);
        setIsAddModalOpen(false);
        fetchProfileAndSchedule(session.user.id);
    };

    const handleUpdateBase = async (e) => {
        e.preventDefault();
        await supabase.from('base_schedule').update({
            course: formData.course, teacher: formData.teacher, room: formData.room,
            day: formData.day, start_time: formData.start_time, end_time: formData.end_time
        }).eq('id', editingClass.id);
        setIsBaseModalOpen(false);
        fetchProfileAndSchedule(session.user.id);
    };

    const handleDeleteBase = async (id) => {
        if (!confirm("Permanently delete this lecture from the weekly schedule?")) return;
        await supabase.from('base_schedule').delete().eq('id', id);
        fetchProfileAndSchedule(session.user.id);
    };

    if (loading) return <div style={centerStyle}>Loading Portal...</div>;

    return (
        <div style={mobileWrapper}>
            <header style={headerStyle}>
                <div style={{fontWeight: 900, fontSize: '0.9rem'}}>🛠 CR PORTAL: {profile?.section}</div>
                <button onClick={() => supabase.auth.signOut().then(() => window.location.href='/')} style={logoutBtn}>Logout</button>
            </header>

            <div style={tabContainer}>
                <button onClick={() => setActiveTab('temporary')} style={tabStyle(activeTab === 'temporary')}>🕒 Temporary</button>
                <button onClick={() => setActiveTab('base')} style={tabStyle(activeTab === 'base')}>📅 Weekly Base</button>
            </div>

            <main style={{padding: '15px'}}>
                {activeTab === 'temporary' ? (
                    <div>
                        <p style={subText}>Daily updates (Held, Cancel, Reschedule)</p>
                        {schedule.map(cls => (
                            <div key={cls.id} style={{...cardStyle, borderLeft: cls.exc?.status === 'confirmed' ? '5px solid #28a745' : cls.exc?.status === 'cancelled' ? '5px solid #dc3545' : '5px solid #F2A900', opacity: cls.exc?.status === 'cancelled' ? 0.6 : 1}}>
                                <div style={cardRow}>
                                    <div style={{fontWeight: 'bold', fontSize: '1rem'}}>{cls.course}</div>
                                    <div style={{fontSize: '0.8rem', fontWeight: 'bold'}}>{cls.room}</div>
                                </div>
                                <div style={{fontSize: '0.75rem', color: '#666'}}>{cls.day} | {cls.start_time} - {cls.end_time}</div>
                                <div style={{display: 'flex', gap: '5px', marginTop: '10px'}}>
                                    {cls.exc?.status === 'cancelled' ? <div style={badge('#dc3545')}>CANCELLED</div> : 
                                     cls.exc?.status === 'confirmed' ? <div style={badge('#28a745')}>CONFIRMED</div> : 
                                     <>
                                        <button onClick={() => handleConfirm(cls)} style={actionBtn('#28a745')}>Held</button>
                                        <button onClick={() => { setEditingClass(cls); setFormData({...formData, room: cls.room, start_time: cls.start_time, end_time: cls.end_time, date: new Date().toISOString().split('T')[0]}); setIsEditModalOpen(true); }} style={actionBtn('#007bff')}>Resched</button>
                                        <button onClick={() => handleCancel(cls)} style={actionBtn('#dc3545')}>Cancel</button>
                                     </>
                                    }
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                            <p style={subText}>Edit your permanent weekly timetable</p>
                            <button onClick={() => setIsAddModalOpen(true)} style={addBtn}>+ Add New</button>
                        </div>
                        {schedule.map(cls => (
                            <div key={cls.id} style={cardStyle}>
                                <div style={cardRow}>
                                    <div>
                                        <div style={{fontWeight: 'bold'}}>{cls.course}</div>
                                        <div style={{fontSize: '0.7rem'}}>{cls.day} | {cls.start_time} - {cls.end_time} | {cls.room}</div>
                                        <div style={{fontSize: '0.7rem', color: '#888'}}>{cls.teacher}</div>
                                    </div>
                                    <div style={{display: 'flex', flexDirection: 'column', gap: '5px'}}>
                                        <button onClick={() => { setEditingClass(cls); setFormData(cls); setIsBaseModalOpen(true); }} style={smallBtn('#002147')}>✏️ Edit</button>
                                        <button onClick={() => handleDeleteBase(cls.id)} style={smallBtn('#dc3545')}>🗑️ Delete</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* MODAL: ADD / EDIT BASE */}
            {(isAddModalOpen || isBaseModalOpen) && (
                <div style={overlay}>
                    <div style={modal}>
                        <h3 style={{marginTop: 0}}>{isAddModalOpen ? '➕ Add Lecture' : '✏️ Edit Lecture'}</h3>
                        <form onSubmit={isAddModalOpen ? handleAddBase : handleUpdateBase}>
                            <input placeholder="Course Name" style={input} value={formData.course} onChange={e => setFormData({...formData, course: e.target.value})} required />
                            <input placeholder="Teacher Name" style={input} value={formData.teacher} onChange={e => setFormData({...formData, teacher: e.target.value})} required />
                            <div style={{display: 'flex', gap: '5px'}}>
                                <select style={input} value={formData.day} onChange={e => setFormData({...formData, day: e.target.value})}>{days.filter(d=>d!=='ALL').map(d=><option key={d} value={d}>{d}</option>)}</select>
                                <input placeholder="Room" style={input} value={formData.room} onChange={e => setFormData({...formData, room: e.target.value})} required />
                            </div>
                            <div style={{display: 'flex', gap: '5px'}}>
                                <select style={input} value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})}>{timeSlots.map(t=><option key={t} value={t}>{t}</option>)}</select>
                                <select style={input} value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})}>{timeSlots.map(t=><option key={t} value={t}>{t}</option>)}</select>
                            </div>
                            <div style={{display: 'flex', gap: '5px', marginTop: '10px'}}>
                                <button type="button" onClick={() => {setIsAddModalOpen(false); setIsBaseModalOpen(false);}} style={modalBtn('#eee', '#333')}>Cancel</button>
                                <button type="submit" style={modalBtn('#002147', '#F2A900')}>Save Permanent</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: TEMP RESCHEDULE */}
            {isEditModalOpen && (
                <div style={overlay}>
                    <div style={modal}>
                        <h3>🕒 Temp Reschedule</h3>
                        <form onSubmit={handleTempReschedule}>
                            <input type="date" style={input} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
                            <select style={input} value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})}>{timeSlots.map(t=><option key={t} value={t}>{t}</option>)}</select>
                            <input placeholder="New Room" style={input} value={formData.room} onChange={e => setFormData({...formData, room: e.target.value})} required />
                            <div style={{display: 'flex', gap: '5px', marginTop: '10px'}}>
                                <button type="button" onClick={() => setIsEditModalOpen(false)} style={modalBtn('#eee', '#333')}>Close</button>
                                <button type="submit" style={modalBtn('#007bff', '#fff')}>Apply Today</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// STYLES
const mobileWrapper = { maxWidth: '500px', margin: '0 auto', minHeight: '100vh', background: '#f0f2f5', display: 'flex', flexDirection: 'column', boxShadow: '0 0 20px rgba(0,0,0,0.1)' };
const headerStyle = { background: '#002147', color: '#F2A900', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const logoutBtn = { background: '#F2A900', color: '#002147', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 900 };
const tabContainer = { display: 'flex', background: '#fff', borderBottom: '1px solid #ddd' };
const tabStyle = (active) => ({ flex: 1, padding: '12px', border: 'none', background: active ? '#fff' : '#f8f9fa', color: active ? '#002147' : '#999', fontWeight: 'bold', borderBottom: active ? '3px solid #F2A900' : 'none', fontSize: '0.75rem' });
const cardStyle = { background: '#fff', padding: '12px', borderRadius: '8px', marginBottom: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' };
const cardRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' };
const subText = { fontSize: '0.7rem', color: '#666', margin: '0 0 10px 0' };
const actionBtn = (bg) => ({ flex: 1, padding: '8px', border: 'none', borderRadius: '5px', background: bg, color: '#fff', fontWeight: 'bold', fontSize: '0.7rem' });
const smallBtn = (bg) => ({ border: 'none', background: bg, color: '#fff', fontSize: '0.6rem', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' });
const addBtn = { background: '#002147', color: '#F2A900', border: 'none', padding: '6px 10px', borderRadius: '5px', fontSize: '0.7rem', fontWeight: 'bold' };
const badge = (c) => ({ width: '100%', textAlign: 'center', padding: '8px', background: c + '15', color: c, borderRadius: '5px', fontWeight: 'bold', fontSize: '0.7rem' });
const overlay = { position: 'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.7)', display:'flex', justifyContent:'center', alignItems:'center', zIndex: 2000 };
const modal = { background:'#fff', padding:'20px', borderRadius:'12px', width:'90%', maxWidth:'380px' };
const input = { width: '100%', padding: '10px', marginBottom: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.85rem' };
const modalBtn = (bg, col) => ({ flex: 1, padding: '10px', border: 'none', borderRadius: '6px', background: bg, color: col, fontWeight: 'bold', fontSize: '0.8rem' });
const centerStyle = { textAlign: 'center', marginTop: '100px', fontFamily: 'sans-serif' };
