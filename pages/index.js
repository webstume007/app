import { useEffect, useState } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabase';

export default function Home() {
    const [rawData, setRawData] = useState([]);
    const [exceptions, setExceptions] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Persistence States
    const [userSection, setUserSection] = useState(null); // Stores { semester: '', section: '' }
    const [isFirstVisit, setIsFirstVisit] = useState(true);

    // Active View States
    const [currentTab, setCurrentTab] = useState('class');
    const [selectedDay, setSelectedDay] = useState('MON');
    const [showFreeResults, setShowFreeResults] = useState(false);
    
    // Free Room Filters
    const [freeDay, setFreeDay] = useState('MON');
    const [freeStart, setFreeStart] = useState('8:00 AM');

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
        // 1. Check browser for saved selection
        const saved = localStorage.getItem('iub_user_selection');
        if (saved) {
            setUserSection(JSON.parse(saved));
            setIsFirstVisit(false);
        }

        // 2. Set default selected day to current day
        const today = new Date().toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
        if (days.includes(today)) setSelectedDay(today);

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

    // Dynamic Extraction
    const availableSemesters = [...new Set(rawData.map(x => x.semester))].filter(Boolean).sort();
    const getSectionsForSem = (sem) => [...new Set(rawData.filter(x => x.semester === sem).map(x => x.section))].sort();

    const getStatusStyles = (classId) => {
        const exc = exceptions.find(e => e.base_schedule_id === classId);
        if (exc?.status === 'cancelled') return { label: 'Cancelled', color: '#721c24', bg: '#f8d7da', border: '#f5c6cb' };
        if (exc?.status === 'confirmed') return { label: 'Confirmed', color: '#155724', bg: '#d4edda', border: '#c3e6cb' };
        if (exc?.status === 'rescheduled') return { label: `Moved to ${exc.new_room}`, color: '#004085', bg: '#e7f1ff', border: '#b8daff' };
        return { label: 'As Scheduled', color: '#856404', bg: '#fff', border: '#F2A900' };
    };

    // Filtered Content
    const mySchedule = rawData.filter(c => c.section === userSection?.section && c.day === selectedDay)
                               .sort((a, b) => parseTime(a.start_time) - parseTime(b.start_time));
    
    const relevantNotifs = notifications.filter(n => n.message.includes(userSection?.section));

    if (loading) return <div style={centerStyle}>Loading...</div>;

    // --- WELCOME SCREEN (NEW VISITORS) ---
    if (isFirstVisit) {
        return (
            <div style={welcomeBg}>
                <div style={welcomeCard}>
                    <h2 style={{color: '#002147', margin: '0 0 10px 0'}}>Welcome Students! 👋</h2>
                    <p style={{color: '#666', fontSize: '0.9rem', marginBottom: '20px'}}>Select your section once to get your personalized schedule and alerts.</p>
                    
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

    // --- MAIN APP VIEW ---
    return (
        <div style={{ backgroundColor: '#f0f2f5', minHeight: '100vh', fontFamily: "'Roboto', sans-serif", display: 'flex', flexDirection: 'column' }}>
            <Head><title>My Schedule | IUB AI</title></Head>

            <header style={headerStyle}>
                <div style={{fontSize: '1rem', fontWeight: 900}}>🎓 {userSection.section}</div>
                <button onClick={() => { localStorage.removeItem('iub_user_selection'); setIsFirstVisit(true); }} style={changeBtn}>Change Section</button>
            </header>

            <div style={tabBar}>
                {['class', 'notif', 'free'].map(tab => (
                    <button key={tab} onClick={() => { setCurrentTab(tab); setShowFreeResults(false); }} style={tabBtn(currentTab === tab)}>
                        {tab === 'class' ? '📅 SCHEDULE' : tab === 'notif' ? '🔔 ALERTS' : '🔍 FREE ROOM'}
                    </button>
                ))}
            </div>

            <div style={{ padding: '15px', maxWidth: '500px', margin: '0 auto', flex: 1, width: '100%' }}>
                
                {/* 1. Schedule Tab */}
                {currentTab === 'class' && (
                    <>
                        {relevantNotifs.length > 0 && (
                            <div style={notifStrip}>⚠️ Update: {relevantNotifs[0].message}</div>
                        )}

                        <div style={dayFilter}>
                            {days.map(day => (
                                <button key={day} onClick={() => setSelectedDay(day)} style={dayBtnStyle(selectedDay === day)}>{day}</button>
                            ))}
                        </div>

                        {mySchedule.length > 0 ? mySchedule.map((cls, idx) => {
                            const status = getStatusStyles(cls.id);
                            return (
                                <div key={idx} style={{...cardBase, background: status.bg, borderLeft: `5px solid ${status.border}`}}>
                                    <div style={{fontWeight: 900, color: '#002147', fontSize: '0.85rem'}}>🕒 {cls.start_time} - {cls.end_time}</div>
                                    <div style={{fontWeight: 'bold', fontSize: '1.1rem', margin: '5px 0'}}>{cls.course}</div>
                                    <div style={{color: '#555', fontSize: '0.8rem'}}>📍 Room: {cls.room} | 👨‍🏫 {cls.teacher}</div>
                                    <div style={{marginTop: '8px', fontSize: '0.7rem', fontWeight: 'bold', color: status.color, textTransform: 'uppercase'}}>● {status.label}</div>
                                </div>
                            );
                        }) : <div style={emptyState}>No classes scheduled for {selectedDay}</div>}
                    </>
                )}

                {/* 2. Notifications Tab */}
                {currentTab === 'notif' && (
                    <div>
                        <h4 style={{margin: '0 0 15px 0', fontSize: '0.9rem', color: '#002147'}}>Updates for {userSection.section}</h4>
                        {relevantNotifs.length > 0 ? relevantNotifs.map((n, i) => (
                            <div key={i} style={notifCard}>
                                <p style={{margin: '0 0 5px 0', fontSize: '0.9rem'}}>{n.message}</p>
                                <span style={{fontSize: '0.7rem', color: '#999'}}>{new Date(n.created_at).toLocaleDateString()} at {new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                        )) : <div style={emptyState}>No specific updates for your section.</div>}
                    </div>
                )}

                {/* 3. Free Room Tab */}
                {currentTab === 'free' && (
                    <div style={whiteCard}>
                        <h4 style={{marginTop: 0, fontSize: '0.9rem'}}>Find Empty Rooms</h4>
                        <select value={freeDay} onChange={e => setFreeDay(e.target.value)} style={selectStyle}>
                            {days.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select value={freeStart} onChange={e => setFreeStart(e.target.value)} style={selectStyle}>
                            {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <button onClick={() => setShowFreeResults(true)} style={searchBtn}>SEARCH FREE ROOMS</button>
                        
                        {showFreeResults && (
                            <div style={{marginTop: '15px'}}>
                                {[...new Set(rawData.map(x => x.room))].filter(Boolean).sort().map(r => {
                                    const isBusy = rawData.some(x => x.room === r && x.day === freeDay && parseTime(freeStart) >= parseTime(x.start_time) && parseTime(freeStart) < parseTime(x.end_time));
                                    return !isBusy ? <div key={r} style={freeRoomItem}>✅ Room {r} is FREE</div> : null;
                                })}
                            </div>
                        )}
                    </div>
                )}

                <div style={{ textAlign: 'center', marginTop: '40px', paddingBottom: '30px' }}>
                    <a href="/login" style={loginBtn}>CR Login Portal</a>
                </div>
            </div>
        </div>
    );
}

// STYLES
const welcomeBg = { position: 'fixed', top:0, left:0, width:'100%', height:'100%', background:'#002147', display:'flex', justifyContent:'center', alignItems:'center', zIndex: 3000 };
const welcomeCard = { background:'#fff', padding:'30px', borderRadius:'15px', width:'90%', maxWidth:'400px', textAlign:'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' };
const bigBtn = { width:'100%', padding:'15px', background:'#F2A900', border:'none', borderRadius:'8px', fontWeight:900, color:'#002147', cursor:'pointer' };
const headerStyle = { background: '#002147', color: '#F2A900', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 1000 };
const changeBtn = { background: 'transparent', color: '#fff', border: '1px solid #fff', borderRadius: '5px', padding: '4px 8px', fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer' };
const tabBar = { display: 'flex', background: '#fff', padding: '8px', gap: '5px', sticky: 'top', top: '50px', zIndex: 999, boxShadow: '0 2px 5px rgba(0,0,0,0.05)' };
const tabBtn = (active) => ({ flex: 1, padding: '12px', border: 'none', background: active ? '#002147' : '#f0f2f5', color: active ? '#fff' : '#666', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer' });
const dayFilter = { display: 'flex', gap: '5px', marginBottom: '15px', overflowX: 'auto', paddingBottom: '5px' };
const dayBtnStyle = (active) => ({ flex: 1, minWidth: '55px', padding: '10px', borderRadius: '8px', border: 'none', background: active ? '#F2A900' : '#fff', color: active ? '#002147' : '#555', fontWeight: 'bold', fontSize: '0.7rem', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' });
const selectStyle = { width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.9rem', background: '#fff' };
const cardBase = { padding: '15px', marginBottom: '12px', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' };
const notifStrip = { background: '#fff3cd', color: '#856404', padding: '10px', borderRadius: '8px', marginBottom: '15px', fontSize: '0.75rem', border: '1px solid #ffeeba', fontWeight: 'bold' };
const notifCard = { background: '#fff', padding: '12px', borderRadius: '8px', marginBottom: '10px', borderLeft: '4px solid #dc3545', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' };
const whiteCard = { background: '#fff', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' };
const searchBtn = { width: '100%', padding: '12px', background: '#002147', color: '#F2A900', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const freeRoomItem = { padding: '12px', borderBottom: '1px solid #eee', color: '#28a745', fontWeight: 'bold', fontSize: '0.85rem' };
const loginBtn = { display: 'inline-block', background: '#F2A900', color: '#002147', padding: '12px 25px', borderRadius: '8px', textDecoration: 'none', fontWeight: 900, fontSize: '0.8rem', boxShadow: '0 4px 15px rgba(242, 169, 0, 0.3)' };
const emptyState = { textAlign: 'center', padding: '40px', color: '#999', fontSize: '0.9rem' };
const centerStyle = { textAlign: 'center', marginTop: '50px', fontFamily: 'sans-serif' };
