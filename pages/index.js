import { useEffect, useState } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabase';

export default function Home() {
    const [rawData, setRawData] = useState([]);
    const [exceptions, setExceptions] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Persistence
    const [userSection, setUserSection] = useState(null); 
    const [isFirstVisit, setIsFirstVisit] = useState(true);

    // Filters
    const [currentTab, setCurrentTab] = useState('class');
    const [selectedDay, setSelectedDay] = useState('ALL'); // Default to ALL
    
    // Search states
    const [teacherSearch, setTeacherSearch] = useState('');
    const [roomSearch, setRoomSearch] = useState('');
    
    // Free Room Filters (Corrected with Start & End)
    const [freeDay, setFreeDay] = useState('MON');
    const [freeStart, setFreeStart] = useState('8:00 AM');
    const [freeEnd, setFreeEnd] = useState('9:30 AM');
    const [showFreeResults, setShowFreeResults] = useState(false);

    const days = ["ALL", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

    const timeSlots = [];
    let ts = 8 * 60; 
    while (ts < 18 * 60) {
        let h = Math.floor(ts / 60), m = ts % 60, amp = h >= 12 ? 'PM' : 'AM', dh = h > 12 ? h - 12 : h;
        if (dh === 0) dh = 12; 
        timeSlots.push(`${dh}:${m === 0 ? '00' : m} ${amp}`); 
        ts += 30;
    }

    useEffect(() => {
        const saved = localStorage.getItem('iub_user_selection');
        if (saved) {
            setUserSection(JSON.parse(saved));
            setIsFirstVisit(false);
        }
        fetchLiveSchedule();
    }, []);

    const fetchLiveSchedule = async () => {
        const { data: baseData } = await supabase.from('base_schedule').select('*');
        const { data: excData } = await supabase.from('schedule_exceptions').select('*');
        const { data: notifData } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });

        setRawData(baseData || []);
        setExceptions(excData || []);
        setNotifications(notifData || []);
        setLoading(false);
    };

    const parseTime = (t) => { 
        if (!t) return 0; 
        let clean = t.replace(/\./g, '').trim().toUpperCase(); 
        let [tm, ap] = clean.split(' '); 
        let [h, m] = tm.split(':').map(Number); 
        if (h === 12) h = 0; if (ap === 'PM') h += 12; 
        return h * 60 + (m || 0); 
    };

    // LOGIC: Check if an update has expired
    const isUpdateActive = (classId, endTime) => {
        const exc = exceptions.find(e => e.base_schedule_id === classId);
        if (!exc) return null;
        
        // Check if current time > lecture end time on the same day
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const lectureEndMinutes = parseTime(endTime);
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        if (exc.exception_date === todayStr && currentMinutes > lectureEndMinutes) {
            return null; // Expired
        }
        return exc;
    };

    const getStatusStyles = (cls) => {
        const exc = isUpdateActive(cls.id, cls.end_time);
        if (exc?.status === 'cancelled') return { label: 'Cancelled', color: '#721c24', bg: '#f8d7da', border: '#f5c6cb', icon: '🚨' };
        if (exc?.status === 'confirmed') return { label: 'Confirmed', color: '#155724', bg: '#d4edda', border: '#c3e6cb', icon: '✅' };
        if (exc?.status === 'rescheduled') return { label: `Moved to ${exc.new_room}`, color: '#004085', bg: '#e7f1ff', border: '#b8daff', icon: '🔄' };
        return { label: 'As Scheduled', color: '#856404', bg: '#fff', border: '#F2A900', icon: '📅' };
    };

    const availableSemesters = [...new Set(rawData.map(x => x.semester))].filter(Boolean).sort();
    const getSectionsForSem = (sem) => [...new Set(rawData.filter(x => x.semester === sem).map(x => x.section))].sort();

    // Data Filtering
    const filterByDay = (data) => selectedDay === 'ALL' ? data : data.filter(d => d.day === selectedDay);

    const scheduleData = filterByDay(rawData.filter(c => c.section === userSection?.section))
                        .sort((a, b) => days.indexOf(a.day) - days.indexOf(b.day) || parseTime(a.start_time) - parseTime(b.start_time));

    const teacherData = filterByDay(rawData.filter(c => teacherSearch && c.teacher === teacherSearch))
                        .sort((a, b) => parseTime(a.start_time) - parseTime(b.start_time));

    const roomData = filterByDay(rawData.filter(c => roomSearch && c.room === roomSearch))
                        .sort((a, b) => parseTime(a.start_time) - parseTime(b.start_time));

    // NEW FREE ROOM LOGIC: Only show rooms from CANCELLED lectures
    const getFreeRoomsFromCancellations = () => {
        return exceptions.filter(exc => {
            const base = rawData.find(r => r.id === exc.base_schedule_id);
            if (!base || exc.status !== 'cancelled' || base.day !== freeDay) return false;
            
            const searchStart = parseTime(freeStart);
            const searchEnd = parseTime(freeEnd);
            const classStart = parseTime(base.start_time);
            const classEnd = parseTime(base.end_time);

            // Check if search interval overlaps with cancelled class interval
            return (searchStart < classEnd && searchEnd > classStart);
        }).map(exc => rawData.find(r => r.id === exc.base_schedule_id).room);
    };

    if (loading) return <div style={centerStyle}>Loading...</div>;

    if (isFirstVisit) {
        return (
            <div style={welcomeBg}>
                <div style={welcomeCard}>
                    <h2 style={{color: '#002147', margin: '0 0 10px 0'}}>IUB Schedule 👋</h2>
                    <p style={{color: '#666', fontSize: '0.8rem', marginBottom: '20px'}}>Select your section once to continue.</p>
                    <select id="initSem" style={selectStyle} onChange={(e) => {
                        const secDropdown = document.getElementById('initSec');
                        const secs = getSectionsForSem(e.target.value);
                        secDropdown.innerHTML = '<option value="">-- Select Section --</option>' + 
                                                secs.map(s => `<option value="${s}">${s}</option>`).join('');
                    }}>
                        <option value="">-- Select Semester --</option>
                        {availableSemesters.map(s => <option key={s} value={s}>{s} Semester</option>)}
                    </select>
                    <select id="initSec" style={selectStyle}><option value="">-- Select Section --</option></select>
                    <button onClick={() => {
                        const sem = document.getElementById('initSem').value;
                        const sec = document.getElementById('initSec').value;
                        if(sem && sec) {
                            const selection = { semester: sem, section: sec };
                            localStorage.setItem('iub_user_selection', JSON.stringify(selection));
                            setUserSection(selection);
                            setIsFirstVisit(false);
                        }
                    }} style={bigBtn}>Save & Continue</button>
                </div>
            </div>
        );
    }

    return (
        <div style={mobileWrapper}>
            <Head><title>IUB Portal</title></Head>

            <header style={headerStyle}>
                <div style={{fontWeight: 900, fontSize: '0.9rem'}}>🎓 {userSection.section}</div>
                <button onClick={() => { localStorage.removeItem('iub_user_selection'); setIsFirstVisit(true); }} style={changeBtn}>Change Section</button>
            </header>

            <div style={tabBar}>
                {[
                    {id: 'class', icon: '📅', label: 'Schedule'},
                    {id: 'teacher', icon: '👨‍🏫', label: 'Teacher'},
                    {id: 'room', icon: '🚪', label: 'Room'},
                    {id: 'free', icon: '🔍', label: 'Free Room'},
                    {id: 'notif', icon: '🔔', label: 'Alerts'}
                ].map(tab => (
                    <button key={tab.id} onClick={() => {setCurrentTab(tab.id); setShowFreeResults(false);}} style={tabBtn(currentTab === tab.id)}>
                        <div style={{fontSize: '1.2rem'}}>{tab.icon}</div>
                        <div style={{fontSize: '0.6rem'}}>{tab.label}</div>
                    </button>
                ))}
            </div>

            <main style={contentArea}>
                {/* GLOBAL DAY FILTER */}
                {currentTab !== 'free' && currentTab !== 'notif' && (
                    <div style={dayFilter}>
                        {days.map(day => (
                            <button key={day} onClick={() => setSelectedDay(day)} style={dayBtnStyle(selectedDay === day)}>{day}</button>
                        ))}
                    </div>
                )}

                {/* TAB: SCHEDULE */}
                {currentTab === 'class' && (
                    <>
                        {scheduleData.length > 0 ? scheduleData.map((cls, idx) => {
                            const status = getStatusStyles(cls);
                            return (
                                <div key={idx} style={{...cardBase, background: status.bg, borderLeft: `5px solid ${status.border}`}}>
                                    <div style={dayLabel}>{cls.day}</div>
                                    <div style={{fontWeight: 900, color: '#002147', fontSize: '0.8rem'}}>🕒 {cls.start_time} - {cls.end_time}</div>
                                    <div style={{fontWeight: 'bold', fontSize: '1rem', margin: '3px 0'}}>{cls.course}</div>
                                    <div style={{color: '#555', fontSize: '0.75rem'}}>Room: {cls.room} | Prof. {cls.teacher}</div>
                                    <div style={{marginTop: '8px', fontSize: '0.7rem', fontWeight: 'bold', color: status.color}}>{status.icon} {status.label}</div>
                                </div>
                            );
                        }) : <div style={emptyState}>No classes found.</div>}
                    </>
                )}

                {/* TAB: TEACHER */}
                {currentTab === 'teacher' && (
                    <div>
                        <select style={selectStyle} onChange={e => setTeacherSearch(e.target.value)}>
                            <option value="">-- Select Teacher --</option>
                            {[...new Set(rawData.map(x => x.teacher))].sort().map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        {teacherSearch && (
                            <div style={whiteCard}>
                                <div style={{fontWeight: 'bold', marginBottom: '10px'}}>Contact: <a href={`https://wa.me/`} style={{color: '#25D366'}}>WhatsApp Prof. {teacherSearch}</a></div>
                                <div style={{fontSize: '0.8rem', color: '#666'}}>Lectures for {selectedDay}:</div>
                                {teacherData.map((cls, i) => (
                                    <div key={i} style={{padding: '10px 0', borderBottom: '1px solid #eee'}}>
                                        <b>{cls.day}</b>: {cls.course} ({cls.start_time}) - Room {cls.room}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB: ROOM */}
                {currentTab === 'room' && (
                    <div>
                        <select style={selectStyle} onChange={e => setRoomSearch(e.target.value)}>
                            <option value="">-- Select Room --</option>
                            {[...new Set(rawData.map(x => x.room))].sort().map(r => <option key={r} value={r}>Room {r}</option>)}
                        </select>
                        {roomSearch && roomData.map((cls, i) => (
                            <div key={i} style={cardBase}>
                                <b>{cls.day}</b>: {cls.course} ({cls.start_time} - {cls.end_time})<br/>
                                <span style={{fontSize: '0.8rem'}}>Section: {cls.section}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* TAB: FREE ROOM */}
                {currentTab === 'free' && (
                    <div style={whiteCard}>
                        <h4 style={{marginTop: 0, fontSize: '0.9rem'}}>Rooms Freed by Cancellations</h4>
                        <select value={freeDay} onChange={e => setFreeDay(e.target.value)} style={selectStyle}>
                            {days.filter(d => d !== 'ALL').map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <div style={{display: 'flex', gap: '5px'}}>
                            <select value={freeStart} onChange={e => setFreeStart(e.target.value)} style={selectStyle}>
                                {timeSlots.map(t => <option key={t} value={t}>Start: {t}</option>)}
                            </select>
                            <select value={freeEnd} onChange={e => setFreeEnd(e.target.value)} style={selectStyle}>
                                {timeSlots.map(t => <option key={t} value={t}>End: {t}</option>)}
                            </select>
                        </div>
                        <button onClick={() => setShowFreeResults(true)} style={searchBtn}>SEARCH CANCELLED ROOMS</button>
                        {showFreeResults && (
                            <div style={{marginTop: '15px'}}>
                                {[...new Set(getFreeRoomsFromCancellations())].map(r => (
                                    <div key={r} style={freeRoomItem}>✅ Room {r} is now FREE (Class Cancelled)</div>
                                ))}
                                {getFreeRoomsFromCancellations().length === 0 && <div style={emptyState}>No rooms were cancelled for this slot.</div>}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB: NOTIFICATIONS */}
                {currentTab === 'notif' && (
                    <div>
                        {notifications.filter(n => n.message.includes(userSection.section)).map((n, i) => (
                            <div key={i} style={notifCard}>
                                <p style={{margin: 0, fontSize: '0.85rem'}}>{n.message}</p>
                                <span style={{fontSize: '0.65rem', color: '#999'}}>{new Date(n.created_at).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <footer style={footerStyle}>
                <div>Made with love by <a href="https://wa.me/923000000000" style={{color: '#F2A900', textDecoration: 'none', fontWeight: 'bold'}}>Mohsin</a></div>
                <div style={{margin: '0 10px', color: '#666'}}>|</div>
                <a href="/login" style={{color: '#fff', textDecoration: 'none', fontSize: '0.7rem'}}>CR Login</a>
            </footer>
        </div>
    );
}

// STYLES
const mobileWrapper = { maxWidth: '500px', margin: '0 auto', background: '#f0f2f5', minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 0 20px rgba(0,0,0,0.1)' };
const headerStyle = { background: '#002147', color: '#F2A900', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const changeBtn = { background: 'transparent', color: '#fff', border: '1px solid #fff', borderRadius: '4px', padding: '3px 6px', fontSize: '0.6rem' };
const tabBar = { display: 'flex', background: '#fff', padding: '10px 5px', gap: '2px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' };
const tabBtn = (active) => ({ flex: 1, border: 'none', background: 'transparent', color: active ? '#002147' : '#999', cursor: 'pointer', textAlign: 'center', transition: '0.3s' });
const contentArea = { padding: '15px', flex: 1 };
const dayFilter = { display: 'flex', gap: '4px', marginBottom: '15px', overflowX: 'auto', paddingBottom: '5px' };
const dayBtnStyle = (active) => ({ flex: 1, minWidth: '45px', padding: '8px 4px', borderRadius: '6px', border: 'none', background: active ? '#F2A900' : '#fff', color: active ? '#002147' : '#666', fontWeight: 'bold', fontSize: '0.65rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' });
const cardBase = { padding: '12px', marginBottom: '10px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', position: 'relative' };
const dayLabel = { position: 'absolute', top: '12px', right: '12px', fontSize: '0.6rem', fontWeight: 900, color: '#002147', opacity: 0.5 };
const selectStyle = { width: '100%', padding: '10px', marginBottom: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '0.85rem' };
const whiteCard = { background: '#fff', padding: '15px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' };
const searchBtn = { width: '100%', padding: '10px', background: '#002147', color: '#F2A900', border: 'none', borderRadius: '6px', fontWeight: 'bold' };
const freeRoomItem = { padding: '10px', borderBottom: '1px solid #eee', color: '#28a745', fontWeight: 'bold', fontSize: '0.8rem' };
const notifCard = { background: '#fff', padding: '12px', borderRadius: '8px', marginBottom: '8px', borderLeft: '4px solid #dc3545' };
const footerStyle = { padding: '20px', textAlign: 'center', background: '#002147', color: '#fff', fontSize: '0.75rem', display: 'flex', justifyContent: 'center', alignItems: 'center' };
const welcomeBg = { position: 'fixed', top:0, left:0, width:'100%', height:'100%', background:'#002147', display:'flex', justifyContent:'center', alignItems:'center', zIndex: 3000 };
const welcomeCard = { background:'#fff', padding:'25px', borderRadius:'12px', width:'85%', textAlign:'center' };
const bigBtn = { width:'100%', padding: '12px', background: '#F2A900', border: 'none', borderRadius: '6px', fontWeight: 900, color: '#002147' };
const emptyState = { textAlign: 'center', padding: '30px', color: '#999', fontSize: '0.8rem' };
const centerStyle = { textAlign: 'center', marginTop: '100px' };
