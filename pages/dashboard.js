import { useEffect, useState } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabase';

export default function Home() {
    const [rawData, setRawData] = useState([]);
    const [exceptions, setExceptions] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Persistence & Tracking States
    const [userSection, setUserSection] = useState(null); 
    const [isFirstVisit, setIsFirstVisit] = useState(true);
    const [readAlerts, setReadAlerts] = useState([]);

    // Active View States
    const [currentTab, setCurrentTab] = useState('class');
    const [selectedDay, setSelectedDay] = useState('ALL');
    const [showFreeResults, setShowFreeResults] = useState(false);
    
    // Search States
    const [teacherSearch, setTeacherSearch] = useState('');
    const [roomSearch, setRoomSearch] = useState('');

    // Free Room Filters
    const [freeDay, setFreeDay] = useState('MON');
    const [freeStart, setFreeStart] = useState('8:00 AM');
    const [freeEnd, setFreeEnd] = useState('9:30 AM');

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
        const savedSec = localStorage.getItem('iub_user_selection');
        if (savedSec) {
            setUserSection(JSON.parse(savedSec));
            setIsFirstVisit(false);
        }

        const savedRead = localStorage.getItem('iub_read_alerts');
        if (savedRead) {
            setReadAlerts(JSON.parse(savedRead));
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

    const handleInitialSelection = (sem, sec) => {
        const selection = { semester: sem, section: sec };
        localStorage.setItem('iub_user_selection', JSON.stringify(selection));
        setUserSection(selection);
        setIsFirstVisit(false);
    };

    const parseTime = (t) => { 
        if (!t) return 0; 
        let clean = t.replace(/\./g, '').trim().toUpperCase(); 
        let [tm, ap] = clean.split(' '); 
        let [h, m] = tm.split(':').map(Number); 
        if (h === 12) h = 0; 
        if (ap === 'PM') h += 12; 
        return h * 60 + (m || 0); 
    };

    // EXPIRING LOGIC: Checks if current time is past lecture end time
    const isUpdateActive = (classId, endTime, exceptionDate) => {
        const exc = exceptions.find(e => e.base_schedule_id === classId);
        if (!exc) return null;
        
        const now = new Date();
        const todayIso = now.toISOString().split('T')[0];
        
        // If exception is for today, check the clock
        if (exc.exception_date === todayIso) {
            const endMins = parseTime(endTime);
            const nowMins = now.getHours() * 60 + now.getMinutes();
            if (nowMins > endMins) return null; // Expired
        }
        return exc;
    };

    const getStatusStyles = (cls) => {
        const exc = isUpdateActive(cls.id, cls.end_time, cls.exception_date);
        if (exc?.status === 'cancelled') return { label: 'Cancelled', color: '#dc3545', bg: '#f8d7da', border: '#f5c6cb', icon: '🚨' };
        if (exc?.status === 'confirmed') return { label: 'Confirmed', color: '#28a745', bg: '#d4edda', border: '#c3e6cb', icon: '✅' };
        if (exc?.status === 'rescheduled') return { label: `Moved to Room ${exc.new_room}`, color: '#004085', bg: '#e7f1ff', border: '#b8daff', icon: '🔄' };
        return { label: 'As Scheduled', color: '#856404', bg: '#fff', border: '#F2A900', icon: '📅' };
    };

    // Dynamic Lists
    const availableSemesters = [...new Set(rawData.map(x => x.semester))].filter(Boolean).sort();
    const getSectionsForSem = (sem) => [...new Set(rawData.filter(x => x.semester === sem).map(x => x.section))].sort();

    // Filters
    const filterByDay = (data) => selectedDay === 'ALL' ? data : data.filter(d => d.day === selectedDay);

    const scheduleData = filterByDay(rawData.filter(c => c.section === userSection?.section))
                        .sort((a, b) => days.indexOf(a.day) - days.indexOf(b.day) || parseTime(a.start_time) - parseTime(b.start_time));

    const teacherData = filterByDay(rawData.filter(c => teacherSearch && c.teacher === teacherSearch))
                        .sort((a, b) => days.indexOf(a.day) - days.indexOf(b.day) || parseTime(a.start_time) - parseTime(b.start_time));

    const roomData = filterByDay(rawData.filter(c => roomSearch && c.room === roomSearch))
                        .sort((a, b) => days.indexOf(a.day) - days.indexOf(b.day) || parseTime(a.start_time) - parseTime(b.start_time));

    // FREE ROOM LOGIC: Naturally Free + Cancelled Rooms
    const getFreeRooms = () => {
        const searchStart = parseTime(freeStart);
        const searchEnd = parseTime(freeEnd);
        const allRooms = [...new Set(rawData.map(x => x.room))].filter(Boolean).sort();

        return allRooms.filter(room => {
            const overlappingClasses = rawData.filter(x => 
                x.room === room && 
                x.day === freeDay && 
                searchStart < parseTime(x.end_time) && 
                searchEnd > parseTime(x.start_time)
            );

            if (overlappingClasses.length === 0) return true; // Naturally free

            // If classes overlap, ALL of them must have an active 'cancelled' status to be considered free
            return overlappingClasses.every(cls => {
                const exc = isUpdateActive(cls.id, cls.end_time, cls.exception_date);
                return exc?.status === 'cancelled';
            });
        });
    };

    // Notification Logic
    const relevantNotifs = notifications.filter(n => n.message.includes(userSection?.section));
    const hasUnreadAlerts = relevantNotifs.some(n => !readAlerts.includes(n.id));

    const markAlertsAsRead = () => {
        const ids = relevantNotifs.map(n => n.id);
        localStorage.setItem('iub_read_alerts', JSON.stringify(ids));
        setReadAlerts(ids);
    };

    if (loading) return <div style={centerStyle}>Loading...</div>;

    if (isFirstVisit) {
        return (
            <div style={welcomeBg}>
                <div style={welcomeCard}>
                    <h2 style={{color: '#002147', margin: '0 0 10px 0'}}>IUB Schedule 👋</h2>
                    <p style={{color: '#666', fontSize: '0.8rem', marginBottom: '20px'}}>Select your section once to get your personalized schedule and alerts.</p>
                    
                    <select id="initSem" style={selectStyle} onChange={(e) => {
                        const secDropdown = document.getElementById('initSec');
                        const secs = getSectionsForSem(e.target.value);
                        secDropdown.innerHTML = '<option value="">-- Select Section --</option>' + 
                                                secs.map(s => `<option value="${s}">${s}</option>`).join('');
                    }}>
                        <option value="">-- Select Semester --</option>
                        {availableSemesters.map(s => <option key={s} value={s}>{s} Semester</option>)}
                    </select>

                    <select id="initSec" style={selectStyle}>
                        <option value="">-- Select Section --</option>
                    </select>

                    <button onClick={() => {
                        const sem = document.getElementById('initSem').value;
                        const sec = document.getElementById('initSec').value;
                        if(sem && sec) handleInitialSelection(sem, sec);
                    }} style={bigBtn}>Show My Schedule</button>
                </div>
            </div>
        );
    }

    return (
        <div style={mobileWrapper}>
            <Head>
                <title>My Schedule | IUB AI</title>
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
            </Head>

            <header style={headerStyle}>
                <div style={{fontSize: '1rem', fontWeight: 900}}>🎓 {userSection.section}</div>
                <button onClick={() => { localStorage.removeItem('iub_user_selection'); setIsFirstVisit(true); }} style={changeBtn}>Change Section</button>
            </header>

            <div style={tabBar}>
                {[
                    { id: 'class', icon: '📅', label: 'Schedule' },
                    { id: 'teacher', icon: '👨‍🏫', label: 'Teacher' },
                    { id: 'room', icon: '🚪', label: 'Room' },
                    { id: 'free', icon: '🔍', label: 'Free' },
                    { id: 'notif', icon: '🔔', label: 'Alerts', badge: hasUnreadAlerts }
                ].map(tab => (
                    <button key={tab.id} onClick={() => { setCurrentTab(tab.id); setShowFreeResults(false); }} style={tabBtn(currentTab === tab.id)}>
                        <div style={{position: 'relative', display: 'inline-block'}}>
                            <div style={{fontSize: '1.2rem'}}>{tab.icon}</div>
                            {tab.badge && <span style={redDot}></span>}
                        </div>
                        <div style={{fontSize: '0.6rem', marginTop: '2px'}}>{tab.label}</div>
                    </button>
                ))}
            </div>

            <main style={contentArea}>
                
                {/* GLOBAL DAY FILTER (Hidden for Free Room & Alerts) */}
                {currentTab !== 'free' && currentTab !== 'notif' && (
                    <div style={dayFilter}>
                        {days.map(day => (
                            <button key={day} onClick={() => setSelectedDay(day)} style={dayBtnStyle(selectedDay === day)}>{day}</button>
                        ))}
                    </div>
                )}

                {/* 1. SCHEDULE TAB */}
                {currentTab === 'class' && (
                    <>
                        {scheduleData.length > 0 ? scheduleData.map((cls, idx) => {
                            const status = getStatusStyles(cls);
                            return (
                                <div key={idx} style={{...cardBase, background: status.bg, borderLeft: `5px solid ${status.border}`}}>
                                    <div style={dayBadge}>{cls.day}</div>
                                    <div style={{fontWeight: 900, color: '#002147', fontSize: '0.85rem'}}>🕒 {cls.start_time} - {cls.end_time}</div>
                                    <div style={{fontWeight: 'bold', fontSize: '1.1rem', margin: '5px 0', color: '#000'}}>{cls.course}</div>
                                    <div style={{color: '#555', fontSize: '0.8rem'}}>📍 Room: {cls.room} | 👨‍🏫 {cls.teacher}</div>
                                    <div style={{marginTop: '8px', fontSize: '0.7rem', fontWeight: 'bold', color: status.color, textTransform: 'uppercase'}}>{status.icon} {status.label}</div>
                                </div>
                            );
                        }) : <div style={emptyState}>No classes scheduled for {selectedDay}</div>}
                    </>
                )}

                {/* 2. TEACHER TAB */}
                {currentTab === 'teacher' && (
                    <div>
                        <select value={teacherSearch} onChange={e => setTeacherSearch(e.target.value)} style={selectStyle}>
                            <option value="">-- Select Teacher --</option>
                            {[...new Set(rawData.map(x => x.teacher))].sort().map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        
                        {teacherSearch && (
                            <div style={whiteCard}>
                                <div style={{background: '#e8f5e9', padding: '10px', borderRadius: '8px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px'}}>
                                    <span style={{fontSize: '1.5rem'}}>📱</span>
                                    <a href={`https://wa.me/`} style={{color: '#25D366', fontWeight: 'bold', textDecoration: 'none'}}>WhatsApp Prof. {teacherSearch}</a>
                                </div>
                                <h4 style={{margin: '0 0 10px 0', fontSize: '0.9rem'}}>Lectures ({selectedDay})</h4>
                                {teacherData.length > 0 ? teacherData.map((cls, idx) => (
                                    <div key={idx} style={listItem}>
                                        <div style={{fontWeight: 'bold', fontSize: '0.85rem'}}>{cls.course}</div>
                                        <div style={{fontSize: '0.75rem', color: '#666'}}>{cls.day} | {cls.start_time} - {cls.end_time} | 🚪 Room {cls.room} | Sec: {cls.section}</div>
                                    </div>
                                )) : <div style={emptyState}>No lectures found.</div>}
                            </div>
                        )}
                    </div>
                )}

                {/* 3. ROOM TAB */}
                {currentTab === 'room' && (
                    <div>
                        <select value={roomSearch} onChange={e => setRoomSearch(e.target.value)} style={selectStyle}>
                            <option value="">-- Select Room --</option>
                            {[...new Set(rawData.map(x => x.room))].sort().map(r => <option key={r} value={r}>Room {r}</option>)}
                        </select>
                        
                        {roomSearch && (
                            <div style={whiteCard}>
                                <h4 style={{margin: '0 0 10px 0', fontSize: '0.9rem'}}>Room {roomSearch} Schedule ({selectedDay})</h4>
                                {roomData.length > 0 ? roomData.map((cls, idx) => (
                                    <div key={idx} style={listItem}>
                                        <div style={{fontWeight: 'bold', fontSize: '0.85rem'}}>{cls.course}</div>
                                        <div style={{fontSize: '0.75rem', color: '#666'}}>{cls.day} | {cls.start_time} - {cls.end_time} | 👨‍🏫 {cls.teacher} | Sec: {cls.section}</div>
                                    </div>
                                )) : <div style={emptyState}>Room is free.</div>}
                            </div>
                        )}
                    </div>
                )}

                {/* 4. FREE ROOM TAB */}
                {currentTab === 'free' && (
                    <div style={whiteCard}>
                        <h4 style={{marginTop: 0, fontSize: '0.9rem', color: '#002147'}}>Find Empty Rooms</h4>
                        <select value={freeDay} onChange={e => setFreeDay(e.target.value)} style={selectStyle}>
                            {days.filter(d => d !== 'ALL').map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <div style={{display: 'flex', gap: '5px'}}>
                            <select value={freeStart} onChange={e => setFreeStart(e.target.value)} style={selectStyle}>
                                <option value="">Start Time</option>
                                {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <select value={freeEnd} onChange={e => setFreeEnd(e.target.value)} style={selectStyle}>
                                <option value="">End Time</option>
                                {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <button onClick={() => setShowFreeResults(true)} style={searchBtn}>SEARCH FREE ROOMS</button>
                        
                        {showFreeResults && (
                            <div style={{marginTop: '15px'}}>
                                {getFreeRooms().length > 0 ? getFreeRooms().map(r => (
                                    <div key={r} style={freeRoomItem}>✅ Room {r} is FREE</div>
                                )) : <div style={emptyState}>No rooms available for this time slot.</div>}
                            </div>
                        )}
                    </div>
                )}

                {/* 5. ALERTS TAB */}
                {currentTab === 'notif' && (
                    <div>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                            <h4 style={{margin: 0, fontSize: '0.9rem', color: '#002147'}}>Section Alerts</h4>
                            {hasUnreadAlerts && <button onClick={markAlertsAsRead} style={markReadBtn}>✔️ Mark as Read</button>}
                        </div>
                        {relevantNotifs.length > 0 ? relevantNotifs.map((n, i) => (
                            <div key={i} style={{...notifCard, opacity: readAlerts.includes(n.id) ? 0.7 : 1}}>
                                <p style={{margin: '0 0 5px 0', fontSize: '0.85rem', fontWeight: readAlerts.includes(n.id) ? 'normal' : 'bold'}}>{n.message}</p>
                                <span style={{fontSize: '0.7rem', color: '#999'}}>{new Date(n.created_at).toLocaleDateString()} at {new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                        )) : <div style={emptyState}>No specific updates for your section.</div>}
                    </div>
                )}
            </main>

            <footer style={footerStyle}>
                <div>Made with love by <a href="https://wa.me/923000000000" style={{color: '#F2A900', textDecoration: 'none', fontWeight: 'bold'}}>Mohsin</a></div>
                <div style={{margin: '0 10px', color: '#666'}}>|</div>
                <a href="/login" style={{color: '#fff', textDecoration: 'none', fontSize: '0.75rem', fontWeight: 'bold'}}>CR Login</a>
            </footer>
        </div>
    );
}

// STYLES
const mobileWrapper = { maxWidth: '500px', margin: '0 auto', background: '#f0f2f5', minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 0 20px rgba(0,0,0,0.1)', overflowX: 'hidden' };
const headerStyle = { background: '#002147', color: '#F2A900', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1000 };
const changeBtn = { background: 'transparent', color: '#fff', border: '1px solid #fff', borderRadius: '4px', padding: '4px 8px', fontSize: '0.65rem', cursor: 'pointer', fontWeight: 'bold' };
const tabBar = { display: 'flex', background: '#fff', padding: '10px 5px', gap: '2px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', overflowX: 'auto' };
const tabBtn = (active) => ({ flex: 1, minWidth: '60px', border: 'none', background: 'transparent', color: active ? '#002147' : '#999', cursor: 'pointer', textAlign: 'center', transition: '0.3s', fontWeight: active ? 'bold' : 'normal' });
const redDot = { position: 'absolute', top: '-2px', right: '-5px', width: '8px', height: '8px', background: '#dc3545', borderRadius: '50%', border: '1px solid #fff' };
const contentArea = { padding: '15px', flex: 1 };
const dayFilter = { display: 'flex', gap: '5px', marginBottom: '15px', overflowX: 'auto', paddingBottom: '5px' };
const dayBtnStyle = (active) => ({ flex: 1, minWidth: '50px', padding: '10px 5px', borderRadius: '8px', border: 'none', background: active ? '#F2A900' : '#fff', color: active ? '#002147' : '#666', fontWeight: 'bold', fontSize: '0.7rem', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' });
const cardBase = { padding: '15px', marginBottom: '12px', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', position: 'relative' };
const dayBadge = { position: 'absolute', top: '15px', right: '15px', fontSize: '0.65rem', fontWeight: 900, color: '#002147', background: '#f0f2f5', padding: '3px 8px', borderRadius: '12px' };
const selectStyle = { width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.9rem', outline: 'none', background: '#fff' };
const whiteCard = { background: '#fff', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' };
const searchBtn = { width: '100%', padding: '12px', background: '#002147', color: '#F2A900', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const freeRoomItem = { padding: '12px', borderBottom: '1px solid #eee', color: '#28a745', fontWeight: 'bold', fontSize: '0.85rem' };
const listItem = { padding: '10px 0', borderBottom: '1px solid #f0f2f5' };
const notifCard = { background: '#fff', padding: '15px', borderRadius: '10px', marginBottom: '10px', borderLeft: '4px solid #dc3545', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' };
const markReadBtn = { background: '#e9ecef', border: 'none', padding: '5px 10px', borderRadius: '5px', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer', color: '#495057' };
const footerStyle = { padding: '20px', textAlign: 'center', background: '#002147', color: '#fff', fontSize: '0.75rem', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 'auto' };
const welcomeBg = { position: 'fixed', top:0, left:0, width:'100%', height:'100%', background:'#002147', display:'flex', justifyContent:'center', alignItems:'center', zIndex: 3000 };
const welcomeCard = { background:'#fff', padding:'30px', borderRadius:'15px', width:'90%', maxWidth:'400px', textAlign:'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' };
const bigBtn = { width:'100%', padding: '15px', background: '#F2A900', border: 'none', borderRadius: '8px', fontWeight: 900, color: '#002147', cursor: 'pointer', marginTop: '10px' };
const emptyState = { textAlign: 'center', padding: '40px', color: '#999', fontSize: '0.85rem' };
const centerStyle = { textAlign: 'center', marginTop: '100px', fontFamily: 'sans-serif' };
