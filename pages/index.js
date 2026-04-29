import { useEffect, useState } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabase';

export default function Home() {
    const [rawData, setRawData] = useState([]);
    const [exceptions, setExceptions] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Persistence States
    const [userSection, setUserSection] = useState(null);
    const [isFirstVisit, setIsFirstVisit] = useState(true);

    // Active View States
    const [currentTab, setCurrentTab] = useState('class');
    const [selectedDay, setSelectedDay] = useState('ALL'); // Set to ALL by default
    const [showFreeResults, setShowFreeResults] = useState(false);
    
    // Free Room Filters
    const [freeDay, setFreeDay] = useState('MON');
    const [freeStart, setFreeStart] = useState('8:00 AM');
    const [freeEnd, setFreeEnd] = useState('9:30 AM');

    // Notification States
    const [unreadAlerts, setUnreadAlerts] = useState(false);
    const [alertsCleared, setAlertsCleared] = useState(false);

    const daysFilter = ["ALL", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const actualDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];

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

        // 2. Request Notification Permission
        if ("Notification" in window && Notification.permission !== "granted") {
            Notification.requestPermission();
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

    // Dynamic Extraction
    const availableSemesters = [...new Set(rawData.map(x => x.semester))].filter(Boolean).sort();
    const getSectionsForSem = (sem) => [...new Set(rawData.filter(x => x.semester === sem).map(x => x.section))].sort();

    // Notification Logic
    const relevantNotifs = alertsCleared ? [] : notifications.filter(n => n.message.includes(userSection?.section));
    
    useEffect(() => {
        if (relevantNotifs.length > 0 && currentTab !== 'notif') {
            setUnreadAlerts(true);
            if ("Notification" in window && Notification.permission === "granted") {
                new Notification("IUB Schedule Alert", { body: relevantNotifs[0].message });
            }
        }
    }, [notifications.length]);

    // Status & Expiry Logic
    const getStatusStyles = (cls) => {
        const today = new Date().toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
        const now = new Date();
        const currentMins = now.getHours() * 60 + now.getMinutes();
        
        const dayIdx = actualDays.indexOf(cls.day);
        const todayIdx = actualDays.indexOf(today);

        // Expire logic: If the day has passed, or it is today and the end time has passed
        let isExpired = false;
        if (dayIdx < todayIdx && todayIdx !== -1) isExpired = true;
        if (dayIdx === todayIdx && currentMins > parseTime(cls.end_time)) isExpired = true;

        const exc = exceptions.find(e => e.base_schedule_id === cls.id);
        
        // If expired or no exception, return default
        if (!exc || isExpired) return { label: 'As Scheduled', color: '#856404', bg: '#fff', border: '#F2A900' };

        if (exc.status === 'cancelled') return { label: 'Cancelled', color: '#721c24', bg: '#f8d7da', border: '#f5c6cb' };
        if (exc.status === 'confirmed') return { label: 'Confirmed', color: '#155724', bg: '#d4edda', border: '#c3e6cb' };
        if (exc.status === 'rescheduled') return { label: `Moved to ${exc.new_room}`, color: '#004085', bg: '#e7f1ff', border: '#b8daff' };
        
        return { label: 'As Scheduled', color: '#856404', bg: '#fff', border: '#F2A900' };
    };

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

    // --- RENDER HELPERS ---
    const renderClassCard = (cls, idx) => {
        const status = getStatusStyles(cls);
        return (
            <div key={cls.id || idx} style={{...cardBase, background: status.bg, borderLeft: `5px solid ${status.border}`}}>
                <div style={{fontWeight: 900, color: '#002147', fontSize: '0.85rem'}}>🕒 {cls.start_time} - {cls.end_time}</div>
                <div style={{fontWeight: 'bold', fontSize: '1.1rem', margin: '5px 0'}}>{cls.course}</div>
                <div style={{color: '#555', fontSize: '0.8rem'}}>📍 Room: {cls.room} | 👨‍🏫 {cls.teacher}</div>
                <div style={{marginTop: '8px', fontSize: '0.7rem', fontWeight: 'bold', color: status.color, textTransform: 'uppercase'}}>● {status.label}</div>
            </div>
        );
    };

    // --- MAIN APP VIEW ---
    return (
        <div style={{ backgroundColor: '#f0f2f5', minHeight: '100vh', fontFamily: "'Roboto', sans-serif", display: 'flex', flexDirection: 'column', margin: '0 auto', maxWidth: '500px' }}>
            <Head><title>My Schedule | IUB AI</title></Head>

            <header style={headerStyle}>
                <div style={{fontSize: '1rem', fontWeight: 900}}>🎓 {userSection.section}</div>
                <button onClick={() => { localStorage.removeItem('iub_user_selection'); setIsFirstVisit(true); }} style={changeBtn}>Change Section</button>
            </header>

            <div style={tabBar}>
                {[
                    { id: 'class', label: '📅 SCHED' },
                    { id: 'teacher', label: '👨‍🏫 TCH' },
                    { id: 'room', label: '📍 RM' },
                    { id: 'notif', label: '🔔 ALERTS' },
                    { id: 'free', label: '🔍 FREE' }
                ].map(tab => (
                    <button key={tab.id} onClick={() => { 
                        setCurrentTab(tab.id); 
                        setShowFreeResults(false);
                        if(tab.id === 'notif') setUnreadAlerts(false);
                    }} style={tabBtn(currentTab === tab.id)}>
                        <div style={{position: 'relative', display: 'inline-block'}}>
                            {tab.label}
                            {tab.id === 'notif' && unreadAlerts && <span style={redDotStyle}></span>}
                        </div>
                    </button>
                ))}
            </div>

            <div style={{ padding: '15px', flex: 1, width: '100%' }}>
                
                {/* 1. Schedule Tab */}
                {currentTab === 'class' && (
                    <>
                        <div style={dayFilter}>
                            {daysFilter.map(day => (
                                <button key={day} onClick={() => setSelectedDay(day)} style={dayBtnStyle(selectedDay === day)}>{day}</button>
                            ))}
                        </div>

                        {selectedDay === 'ALL' ? (
                            actualDays.map(day => {
                                const dayClasses = rawData.filter(c => c.section === userSection?.section && c.day === day).sort((a, b) => parseTime(a.start_time) - parseTime(b.start_time));
                                if (dayClasses.length === 0) return null;
                                return (
                                    <div key={day}>
                                        <div style={dayDivider}>{day}</div>
                                        {dayClasses.map((cls, idx) => renderClassCard(cls, idx))}
                                    </div>
                                );
                            })
                        ) : (
                            // Single Day View
                            rawData.filter(c => c.section === userSection?.section && c.day === selectedDay)
                                   .sort((a, b) => parseTime(a.start_time) - parseTime(b.start_time))
                                   .map((cls, idx) => renderClassCard(cls, idx))
                        )}
                        
                        {rawData.filter(c => c.section === userSection?.section && (selectedDay === 'ALL' || c.day === selectedDay)).length === 0 && (
                            <div style={emptyState}>No classes scheduled.</div>
                        )}
                    </>
                )}

                {/* 2. Notifications Tab */}
                {currentTab === 'notif' && (
                    <div style={whiteCard}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                            <h4 style={{margin: 0, fontSize: '0.9rem', color: '#002147'}}>Alerts & Updates</h4>
                            {relevantNotifs.length > 0 && (
                                <button onClick={() => setAlertsCleared(true)} style={markReadBtn}>Mark as Read</button>
                            )}
                        </div>
                        {relevantNotifs.length > 0 ? relevantNotifs.map((n, i) => (
                            <div key={i} style={notifCard}>
                                <p style={{margin: '0 0 5px 0', fontSize: '0.9rem'}}>{n.message}</p>
                                <span style={{fontSize: '0.7rem', color: '#999'}}>{new Date(n.created_at).toLocaleDateString()} at {new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                        )) : <div style={emptyState}>No new updates for your section.</div>}
                    </div>
                )}

                {/* 3. Free Room Tab (STRICT CANCELED LOGIC) */}
                {currentTab === 'free' && (
                    <div style={whiteCard}>
                        <h4 style={{marginTop: 0, fontSize: '0.9rem'}}>Find Empty Rooms (Due to Cancellations)</h4>
                        
                        <label style={labelStyle}>Select Day:</label>
                        <select value={freeDay} onChange={e => {setFreeDay(e.target.value); setShowFreeResults(false);}} style={selectStyle}>
                            {actualDays.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        
                        <label style={labelStyle}>Start Time:</label>
                        <select value={freeStart} onChange={e => {setFreeStart(e.target.value); setShowFreeResults(false);}} style={selectStyle}>
                            {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>

                        <label style={labelStyle}>End Time:</label>
                        <select value={freeEnd} onChange={e => {setFreeEnd(e.target.value); setShowFreeResults(false);}} style={selectStyle}>
                            {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>

                        <button onClick={() => setShowFreeResults(true)} style={searchBtn}>SEARCH FREE ROOMS</button>
                        
                        {showFreeResults && (
                            <div style={{marginTop: '20px'}}>
                                {(() => {
                                    const fStart = parseTime(freeStart);
                                    const fEnd = parseTime(freeEnd);

                                    // Filter to only find rooms that have a explicitly CANCELLED class during this exact overlapping time slot
                                    const cancelledClassesInSlot = rawData.filter(base => {
                                        if (base.day !== freeDay) return false;
                                        
                                        const exc = exceptions.find(e => e.base_schedule_id === base.id);
                                        if (!exc || exc.status !== 'cancelled') return false; // Must strictly be cancelled
                                        
                                        const cStart = parseTime(base.start_time);
                                        const cEnd = parseTime(base.end_time);

                                        // Overlap condition
                                        return (fStart < cEnd && fEnd > cStart);
                                    });

                                    const freeRooms = [...new Set(cancelledClassesInSlot.map(c => c.room))];

                                    if (freeRooms.length === 0) {
                                        return <div style={emptyState}>No cancelled classes found for this time slot.</div>;
                                    }

                                    return freeRooms.map(r => (
                                        <div key={r} style={freeRoomItem}>✅ Room {r} is FREE (Class Cancelled)</div>
                                    ));
                                })()}
                            </div>
                        )}
                    </div>
                )}

                {/* 4. Teacher Tab */}
                {currentTab === 'teacher' && (
                    <div>
                        <h4 style={{color: '#002147'}}>Teacher Schedules</h4>
                        {[...new Set(rawData.map(x => x.teacher))].filter(Boolean).sort().map(t => (
                            <div key={t} style={whiteCard}>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                    <h3 style={{margin: '0 0 10px 0', fontSize: '1rem', color: '#002147'}}>{t}</h3>
                                    <a href={`https://wa.me/?text=Hello Sir`} target="_blank" rel="noreferrer" style={waBtnStyle}>WhatsApp</a>
                                </div>
                                {actualDays.map(d => {
                                    const tClasses = rawData.filter(c => c.teacher === t && c.day === d).sort((a,b) => parseTime(a.start_time) - parseTime(b.start_time));
                                    if(tClasses.length === 0) return null;
                                    return (
                                        <div key={d} style={{marginBottom: '10px'}}>
                                            <div style={{fontSize: '0.8rem', fontWeight: 'bold', background: '#f0f2f5', padding: '4px 8px', borderRadius: '4px'}}>{d}</div>
                                            {tClasses.map((c, i) => (
                                                <div key={i} style={{fontSize: '0.85rem', padding: '5px 0', borderBottom: '1px solid #eee'}}>
                                                    {c.start_time} - {c.end_time} | <strong>{c.section}</strong> | Rm: {c.room}
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                )}

                {/* 5. Room Tab */}
                {currentTab === 'room' && (
                    <div>
                        <h4 style={{color: '#002147'}}>Room Schedules</h4>
                        {[...new Set(rawData.map(x => x.room))].filter(Boolean).sort().map(r => (
                            <div key={r} style={whiteCard}>
                                <h3 style={{margin: '0 0 10px 0', fontSize: '1rem', color: '#002147', borderBottom: '2px solid #F2A900', paddingBottom: '5px'}}>Room: {r}</h3>
                                {actualDays.map(d => {
                                    const rClasses = rawData.filter(c => c.room === r && c.day === d).sort((a,b) => parseTime(a.start_time) - parseTime(b.start_time));
                                    if(rClasses.length === 0) return null;
                                    return (
                                        <div key={d} style={{marginBottom: '10px'}}>
                                            <div style={{fontSize: '0.8rem', fontWeight: 'bold', background: '#f0f2f5', padding: '4px 8px', borderRadius: '4px'}}>{d}</div>
                                            {rClasses.map((c, i) => (
                                                <div key={i} style={{fontSize: '0.85rem', padding: '5px 0', borderBottom: '1px solid #eee'}}>
                                                    {c.start_time} - {c.end_time} | <strong>{c.course}</strong> | {c.section}
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                )}

                <div style={{ textAlign: 'center', marginTop: '40px', paddingBottom: '10px' }}>
                    <a href="/login" style={loginBtn}>CR Login Portal</a>
                </div>
            </div>

            <footer style={footerStyle}>
                Made with <span style={{color: '#dc3545'}}>❤️</span> by <a href="https://wa.me/YOUR_PHONE_NUMBER_HERE" style={{color: '#F2A900', textDecoration: 'none', fontWeight: 'bold'}}>Mohsin</a>
            </footer>
        </div>
    );
}

// STYLES
const welcomeBg = { position: 'fixed', top:0, left:0, width:'100%', height:'100%', background:'#002147', display:'flex', justifyContent:'center', alignItems:'center', zIndex: 3000 };
const welcomeCard = { background:'#fff', padding:'30px', borderRadius:'15px', width:'90%', maxWidth:'400px', textAlign:'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' };
const bigBtn = { width:'100%', padding:'15px', background:'#F2A900', border:'none', borderRadius:'8px', fontWeight:900, color:'#002147', cursor:'pointer' };
const headerStyle = { background: '#002147', color: '#F2A900', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 1000 };
const changeBtn = { background: 'transparent', color: '#fff', border: '1px solid #fff', borderRadius: '5px', padding: '4px 8px', fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer' };
const tabBar = { display: 'flex', background: '#fff', padding: '8px', gap: '3px', position: 'sticky', top: '50px', zIndex: 999, boxShadow: '0 2px 5px rgba(0,0,0,0.05)', overflowX: 'auto', whiteSpace: 'nowrap' };
const tabBtn = (active) => ({ flex: 1, minWidth: '70px', padding: '10px 5px', border: 'none', background: active ? '#002147' : '#f0f2f5', color: active ? '#fff' : '#666', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer' });
const dayFilter = { display: 'flex', gap: '5px', marginBottom: '15px', overflowX: 'auto', paddingBottom: '5px' };
const dayBtnStyle = (active) => ({ flex: 1, minWidth: '55px', padding: '10px', borderRadius: '8px', border: 'none', background: active ? '#F2A900' : '#fff', color: active ? '#002147' : '#555', fontWeight: 'bold', fontSize: '0.7rem', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' });
const dayDivider = { background: '#002147', color: '#fff', padding: '5px 10px', borderRadius: '5px', fontSize: '0.8rem', fontWeight: 'bold', margin: '15px 0 10px 0', textAlign: 'center', letterSpacing: '2px' };
const selectStyle = { width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.9rem', background: '#fff' };
const labelStyle = { display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#555', marginBottom: '4px' };
const cardBase = { padding: '15px', marginBottom: '12px', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' };
const notifCard = { background: '#fff', padding: '12px', borderRadius: '8px', marginBottom: '10px', borderLeft: '4px solid #dc3545', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' };
const whiteCard = { background: '#fff', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '15px' };
const searchBtn = { width: '100%', padding: '12px', background: '#002147', color: '#F2A900', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' };
const freeRoomItem = { padding: '12px', borderBottom: '1px solid #eee', color: '#28a745', fontWeight: 'bold', fontSize: '0.85rem' };
const loginBtn = { display: 'inline-block', background: '#F2A900', color: '#002147', padding: '12px 25px', borderRadius: '8px', textDecoration: 'none', fontWeight: 900, fontSize: '0.8rem', boxShadow: '0 4px 15px rgba(242, 169, 0, 0.3)' };
const markReadBtn = { background: '#f8d7da', color: '#721c24', border: 'none', padding: '5px 10px', borderRadius: '5px', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer' };
const waBtnStyle = { background: '#25D366', color: '#fff', padding: '6px 12px', borderRadius: '20px', textDecoration: 'none', fontSize: '0.75rem', fontWeight: 'bold', boxShadow: '0 2px 5px rgba(37,211,102,0.3)' };
const redDotStyle = { position: 'absolute', top: '-5px', right: '-10px', width: '8px', height: '8px', background: '#dc3545', borderRadius: '50%', border: '2px solid #fff' };
const emptyState = { textAlign: 'center', padding: '40px', color: '#999', fontSize: '0.9rem' };
const centerStyle = { textAlign: 'center', marginTop: '50px', fontFamily: 'sans-serif' };
const footerStyle = { textAlign: 'center', padding: '20px', background: '#002147', color: '#fff', fontSize: '0.85rem', marginTop: 'auto' };
