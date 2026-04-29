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
    const [currentTab, setCurrentTab] = useState('class'); // 'class' | 'room' | 'teacher'
    const [roomSubTab, setRoomSubTab] = useState('schedule'); // 'schedule' | 'free'
    const [selectedDay, setSelectedDay] = useState('ALL');
    const [showAlerts, setShowAlerts] = useState(false);
    const [alertsRead, setAlertsRead] = useState(false);
    const [showNotifBanner, setShowNotifBanner] = useState(false); // New Notification Banner State
    
    // Free Room Filters
    const [freeDay, setFreeDay] = useState('MON');
    const [freeStart, setFreeStart] = useState('8:00 AM');
    const [freeEnd, setFreeEnd] = useState('9:00 AM');
    const [searchedFreeRooms, setSearchedFreeRooms] = useState(null);

    // Search & Dropdown States
    const [teacherSearch, setTeacherSearch] = useState('');
    const [selectedTeacher, setSelectedTeacher] = useState('');
    const [roomSearch, setRoomSearch] = useState('');
    const [selectedRoom, setSelectedRoom] = useState('');

    const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const filterDays = ["ALL", ...days];

    const timeSlots = [];
    let ts = 8 * 60; 
    while (ts < 18 * 60) {
        let h = Math.floor(ts / 60), m = ts % 60, amp = h >= 12 ? 'PM' : 'AM', dh = h > 12 ? h - 12 : h;
        if (dh === 0) dh = 12; 
        timeSlots.push(`${dh}:${m === 0 ? '00' : m} ${amp}`); 
        ts += 30;
    }

    // 1. INITIAL LOAD (Runs ONLY ONCE when the app opens)
    useEffect(() => {
        const saved = localStorage.getItem('iub_user_selection');
        if (saved) {
            setUserSection(JSON.parse(saved));
            setIsFirstVisit(false);
        }

        // Show the manual prompt banner if permissions haven't been granted/denied yet
        if ("Notification" in window && Notification.permission === "default") {
            setShowNotifBanner(true);
        }

        fetchLiveSchedule();
    }, []); // <-- Empty array stops the infinite loop!

    // 2. SUPABASE REALTIME LISTENER (Runs only when userSection actually changes)
    useEffect(() => {
        // If there's no section selected yet, don't open a connection
        if (!userSection) return; 

        const channel = supabase
            .channel('realtime-updates')
            .on('postgres_changes', 
                { event: 'INSERT', schema: 'public', table: 'notifications' }, 
                (payload) => {
                    const newMsg = payload.new.message;
                    
                    if (newMsg.includes(userSection.section)) {
                        setNotifications(prev => [payload.new, ...prev]);
                        setAlertsRead(false);

                        if (Notification.permission === "granted") {
                            new Notification("IUB Update Alert", {
                                body: newMsg,
                                icon: "/icon.png"
                            });
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userSection]); // <-- Now it safely watches the userSection

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

    const isClassPassed = (cls) => {
        const now = new Date();
        const currentDayShort = now.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        const dayMap = { 'MON': 1, 'TUE': 2, 'WED': 3, 'THU': 4, 'FRI': 5, 'SAT': 6, 'SUN': 7 };
        const todayIdx = dayMap[currentDayShort] || 0;
        const classDayIdx = dayMap[cls.day] || 0;

        if (classDayIdx < todayIdx) return true;
        if (classDayIdx === todayIdx) {
            return parseTime(cls.end_time) <= currentMinutes;
        }
        return false;
    };

    // Dynamic Extractions
    const availableSemesters = [...new Set(rawData.map(x => x.semester))].filter(Boolean).sort();
    const getSectionsForSem = (sem) => [...new Set(rawData.filter(x => x.semester === sem).map(x => x.section))].sort();
    const allTeachers = [...new Set(rawData.map(x => x.teacher))].filter(Boolean).sort();
    const allRooms = [...new Set(rawData.map(x => x.room))].filter(Boolean).sort();

    const getStatusStyles = (cls) => {
        if (isClassPassed(cls)) return { label: 'Passed / As Scheduled', color: '#856404', bg: '#fff', border: '#F2A900' };

        const exc = exceptions.find(e => e.base_schedule_id === cls.id);
        if (exc?.status === 'cancelled') return { label: 'Cancelled', color: '#721c24', bg: '#f8d7da', border: '#f5c6cb' };
        if (exc?.status === 'confirmed') return { label: 'Confirmed', color: '#155724', bg: '#d4edda', border: '#c3e6cb' };
        if (exc?.status === 'rescheduled') return { label: `Moved to ${exc.new_room}`, color: '#004085', bg: '#e7f1ff', border: '#b8daff' };
        return { label: 'As Scheduled', color: '#856404', bg: '#fff', border: '#F2A900' };
    };

    const searchFreeRooms = () => {
        const sVal = parseTime(freeStart);
        const eVal = parseTime(freeEnd);
        if (sVal >= eVal) {
            alert("End time must be after start time");
            return;
        }
        
        const strictlyCancelledClasses = rawData.filter(cls => {
            if (cls.day !== freeDay) return false;
            const clsS = parseTime(cls.start_time);
            const clsE = parseTime(cls.end_time);
            const overlaps = (sVal < clsE && eVal > clsS);
            if (!overlaps) return false;

            const exc = exceptions.find(e => e.base_schedule_id === cls.id);
            return exc?.status === 'cancelled';
        });

        const available = [...new Set(strictlyCancelledClasses.map(c => c.room))];
        setSearchedFreeRooms(available);
    };

    // This forces the Chrome permission popup based on a user click
    const forceNotificationPermission = async () => {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            setShowNotifBanner(false);
            new Notification("Notifications Enabled!", { body: "You will now receive IUB alerts." });
        }
    };

    const relevantNotifs = notifications.filter(n => n.message.includes(userSection?.section));

    if (loading) return <div style={centerStyle}>Loading...</div>;

    // --- WELCOME SCREEN ---
    if (isFirstVisit) {
        return (
            <div style={welcomeBg}>
                <div style={welcomeCard}>
                    <h2 style={{color: '#002147', margin: '0 0 10px 0'}}>Welcome Students! 👋</h2>
                    <p style={{color: '#666', fontSize: '0.9rem', marginBottom: '20px'}}>Select your section once to get your personalized schedule.</p>
                    
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

    // Filter Logic for Views
    const getFilteredClasses = (filterKey, filterValue) => {
        let classes = rawData.filter(c => c[filterKey] === filterValue);
        if (selectedDay !== 'ALL') {
            classes = classes.filter(c => c.day === selectedDay);
        }
        return classes.sort((a, b) => parseTime(a.start_time) - parseTime(b.start_time));
    };

    const mySchedule = getFilteredClasses('section', userSection?.section);
    const teacherSchedule = getFilteredClasses('teacher', selectedTeacher);
    const roomSchedule = getFilteredClasses('room', selectedRoom);

    // --- RENDER COMPONENT HELPERS ---
    const renderClassCards = (scheduleList, displayContext) => {
        if (scheduleList.length === 0) return <div style={emptyState}>No classes scheduled for {selectedDay === 'ALL' ? 'the week' : selectedDay}.</div>;

        const daysToRender = selectedDay === 'ALL' ? days : [selectedDay];
        
        return daysToRender.map(day => {
            const dayClasses = scheduleList.filter(c => c.day === day);
            if (dayClasses.length === 0) return null;

            return (
                <div key={day} style={{marginBottom: '20px'}}>
                    <div style={dayHeaderStrip}>{day}</div>
                    {dayClasses.map((cls, idx) => {
                        const status = getStatusStyles(cls);
                        return (
                            <div key={idx} style={{...cardBase, background: status.bg, borderLeft: `5px solid ${status.border}`}}>
                                <div style={{fontWeight: 900, color: '#002147', fontSize: '0.85rem'}}>🕒 {cls.start_time} - {cls.end_time}</div>
                                <div style={{fontWeight: 'bold', fontSize: '1.1rem', margin: '5px 0'}}>{cls.course}</div>
                                <div style={{color: '#555', fontSize: '0.8rem'}}>
                                    {displayContext !== 'room' && <span>📍 Room: {cls.room} | </span>}
                                    {displayContext !== 'teacher' && <span>👨‍🏫 {cls.teacher} | </span>}
                                    <span>👥 {cls.section}</span>
                                </div>
                                <div style={{marginTop: '8px', fontSize: '0.7rem', fontWeight: 'bold', color: status.color, textTransform: 'uppercase'}}>● {status.label}</div>
                            </div>
                        );
                    })}
                </div>
            );
        });
    };

    // --- MAIN APP VIEW ---
    return (
        <div style={{ backgroundColor: '#f0f2f5', minHeight: '100vh', fontFamily: "'Roboto', sans-serif", display: 'flex', flexDirection: 'column' }}>
            <Head><title>My Schedule | IUB AI</title></Head>

            <header style={headerStyle}>
                <div style={{fontSize: '1.1rem', fontWeight: 900}}>🎓 {userSection.section}</div>
                <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                    <div style={{position: 'relative', cursor: 'pointer', fontSize: '1.3rem'}} onClick={() => setShowAlerts(!showAlerts)}>
                        🔔
                        {!alertsRead && relevantNotifs.length > 0 && <span style={redDot}></span>}
                    </div>
                    <button onClick={() => { localStorage.removeItem('iub_user_selection'); setIsFirstVisit(true); }} style={changeBtn}>Change Section</button>
                </div>
            </header>

            <div style={tabBar}>
                {['class', 'room', 'teacher'].map(tab => (
                    <button key={tab} onClick={() => { setCurrentTab(tab); setShowAlerts(false); }} style={tabBtn(currentTab === tab)}>
                        {tab === 'class' ? '📅 SCHEDULE' : tab === 'room' ? '🚪 ROOMS' : '👨‍🏫 TEACHERS'}
                    </button>
                ))}
            </div>

            <div style={{ padding: '15px', maxWidth: '600px', margin: '0 auto', flex: 1, width: '100%' }}>
                
                {/* NOTIFICATION BANNER */}
                {showNotifBanner && (
                    <div style={notifBannerStyle}>
                        <div style={{flex: 1, paddingRight: '10px'}}>
                            <b style={{display: 'block', marginBottom: '3px'}}>Stay Updated! 🔔</b>
                            <span style={{fontSize: '0.75rem', opacity: 0.9}}>Allow notifications to get instant alerts for cancelled classes.</span>
                        </div>
                        <button onClick={forceNotificationPermission} style={enableBtnStyle}>Enable</button>
                    </div>
                )}

                {/* ALERTS MODAL/VIEW */}
                {showAlerts ? (
                    <div style={whiteCard}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                            <h4 style={{margin: 0, fontSize: '1rem', color: '#002147'}}>Alerts & Notifications</h4>
                            <button onClick={() => setAlertsRead(true)} style={markReadBtn}>Mark as Read</button>
                        </div>
                        {alertsRead || relevantNotifs.length === 0 ? (
                             <div style={emptyState}>No new notifications.</div>
                        ) : (
                            relevantNotifs.map((n, i) => (
                                <div key={i} style={notifCard}>
                                    <p style={{margin: '0 0 5px 0', fontSize: '0.9rem'}}>{n.message}</p>
                                    <span style={{fontSize: '0.7rem', color: '#999'}}>{new Date(n.created_at).toLocaleDateString()} at {new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <>
                        {/* GLOBAL DAY FILTER */}
                        {(currentTab === 'class' || currentTab === 'teacher' || (currentTab === 'room' && roomSubTab === 'schedule')) && (
                            <div style={dayFilter}>
                                {filterDays.map(day => (
                                    <button key={day} onClick={() => setSelectedDay(day)} style={dayBtnStyle(selectedDay === day)}>{day}</button>
                                ))}
                            </div>
                        )}

                        {/* 1. SCHEDULE TAB */}
                        {currentTab === 'class' && renderClassCards(mySchedule, 'class')}

                        {/* 2. ROOM TAB */}
                        {currentTab === 'room' && (
                            <>
                                <div style={{display: 'flex', gap: '10px', marginBottom: '15px'}}>
                                    <button onClick={() => setRoomSubTab('schedule')} style={subTabBtn(roomSubTab === 'schedule')}>ROOM SCHEDULE</button>
                                    <button onClick={() => setRoomSubTab('free')} style={subTabBtn(roomSubTab === 'free')}>FREE ROOM</button>
                                </div>

                                {roomSubTab === 'schedule' && (
                                    <div style={whiteCard}>
                                        <input type="text" placeholder="🔍 Search room..." value={roomSearch} onChange={e => setRoomSearch(e.target.value)} style={searchInput} />
                                        <select value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)} style={selectStyle}>
                                            <option value="">-- Select Room --</option>
                                            {allRooms.filter(r => r.toLowerCase().includes(roomSearch.toLowerCase())).map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                        {selectedRoom && renderClassCards(roomSchedule, 'room')}
                                    </div>
                                )}

                                {roomSubTab === 'free' && (
                                    <div style={whiteCard}>
                                        <h4 style={{marginTop: 0, fontSize: '0.9rem', color: '#555'}}>Strictly finds rooms freed by cancellation</h4>
                                        <select value={freeDay} onChange={e => setFreeDay(e.target.value)} style={selectStyle}>
                                            {days.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                        <div style={{display: 'flex', gap: '10px'}}>
                                            <select value={freeStart} onChange={e => setFreeStart(e.target.value)} style={{...selectStyle, flex: 1}}>
                                                <option value="" disabled>Start Time</option>
                                                {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                            <select value={freeEnd} onChange={e => setFreeEnd(e.target.value)} style={{...selectStyle, flex: 1}}>
                                                <option value="" disabled>End Time</option>
                                                {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                        <button onClick={searchFreeRooms} style={searchBtn}>SEARCH FREE ROOMS</button>
                                        
                                        {searchedFreeRooms !== null && (
                                            <div style={{marginTop: '15px'}}>
                                                {searchedFreeRooms.length > 0 ? searchedFreeRooms.map(r => (
                                                    <div key={r} style={freeRoomItem}>✅ Room {r} is FREE (Class Cancelled)</div>
                                                )) : <div style={emptyState}>No rooms were cancelled during this time slot.</div>}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        {/* 3. TEACHER TAB */}
                        {currentTab === 'teacher' && (
                            <div style={whiteCard}>
                                <input type="text" placeholder="🔍 Search teacher name..." value={teacherSearch} onChange={e => setTeacherSearch(e.target.value)} style={searchInput} />
                                <select value={selectedTeacher} onChange={e => setSelectedTeacher(e.target.value)} style={selectStyle}>
                                    <option value="">-- Select Teacher --</option>
                                    {allTeachers.filter(t => t.toLowerCase().includes(teacherSearch.toLowerCase())).map(t => <option key={t} value={t}>{t}</option>)}
                                </select>

                                {selectedTeacher && (
                                    <>
                                        <a href={`https://wa.me/?text=Hello%20${selectedTeacher}`} target="_blank" rel="noreferrer" style={whatsappBtn}>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.592 2.654-.696c1.001.572 2.135.881 3.288.881 3.181 0 5.767-2.587 5.768-5.766.001-3.181-2.585-5.764-5.242-5.764zm12 5.766c0 6.627-5.373 12-12 12s-12-5.373-12-12 5.373-12 12-12 12 5.373 12 12zm-4.322 3.012c-.255-.128-1.509-.745-1.742-.83-.233-.085-.403-.127-.573.128-.17.255-.658.83-.807 1.002-.149.17-.297.191-.552.063-.255-.127-1.077-.397-2.053-1.266-.757-.674-1.268-1.507-1.416-1.762-.149-.255-.016-.393.111-.52.115-.114.255-.297.382-.446.128-.148.17-.255.255-.425.085-.17.043-.319-.021-.446-.064-.128-.573-1.382-.786-1.892-.208-.497-.419-.43-.573-.438-.149-.008-.319-.008-.489-.008-.17 0-.446.064-.679.319-.234.255-.893.872-.893 2.126 0 1.254.914 2.466 1.042 2.636.128.17 1.799 2.747 4.359 3.853.609.263 1.085.42 1.458.538.618.196 1.181.168 1.628.102.497-.073 1.509-.617 1.722-1.212.212-.595.212-1.105.149-1.212-.064-.107-.234-.17-.489-.298z"/></svg>
                                            Contact {selectedTeacher}
                                        </a>
                                        {renderClassCards(teacherSchedule, 'teacher')}
                                    </>
                                )}
                            </div>
                        )}
                    </>
                )}

                <div style={{ textAlign: 'center', marginTop: '40px', paddingBottom: '30px' }}>
                    <a href="/login" style={loginBtn}>CR Login Portal</a>
                </div>
            </div>

            <footer style={footerStyle}>
                Made with ❤️ by <a href="http://wa.me/923053296062" target="_blank" rel="noreferrer" style={{color: '#002147', fontWeight: '900', textDecoration: 'none'}}>Mohsin</a>
            </footer>
        </div>
    );
}

// STYLES
const welcomeBg = { position: 'fixed', top:0, left:0, width:'100%', height:'100%', background:'#002147', display:'flex', justifyContent:'center', alignItems:'center', zIndex: 3000 };
const welcomeCard = { background:'#fff', padding:'30px', borderRadius:'15px', width:'90%', maxWidth:'400px', textAlign:'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' };
const bigBtn = { width:'100%', padding:'15px', background:'#F2A900', border:'none', borderRadius:'8px', fontWeight:900, color:'#002147', cursor:'pointer' };
const headerStyle = { background: '#002147', color: '#F2A900', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 1000, boxShadow: '0 2px 10px rgba(0,0,0,0.2)' };
const changeBtn = { background: 'transparent', color: '#fff', border: '1px solid #fff', borderRadius: '5px', padding: '6px 10px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' };
const redDot = { position: 'absolute', top: '-2px', right: '-2px', width: '10px', height: '10px', background: 'red', borderRadius: '50%', border: '2px solid #002147' };
const tabBar = { display: 'flex', background: '#fff', padding: '8px', gap: '5px', position: 'sticky', top: '60px', zIndex: 999, boxShadow: '0 2px 5px rgba(0,0,0,0.05)', overflowX: 'auto' };
const tabBtn = (active) => ({ flex: 1, minWidth: '100px', padding: '12px', border: 'none', background: active ? '#002147' : '#f0f2f5', color: active ? '#fff' : '#666', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' });
const subTabBtn = (active) => ({ flex: 1, padding: '10px', border: 'none', background: active ? '#F2A900' : '#e9ecef', color: active ? '#002147' : '#555', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' });
const dayFilter = { display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '5px' };
const dayBtnStyle = (active) => ({ flex: 1, minWidth: '50px', padding: '10px', borderRadius: '8px', border: 'none', background: active ? '#002147' : '#fff', color: active ? '#F2A900' : '#555', fontWeight: 'bold', fontSize: '0.75rem', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' });
const dayHeaderStrip = { background: '#002147', color: '#F2A900', padding: '8px 15px', borderRadius: '8px', fontWeight: 900, marginBottom: '10px', textTransform: 'uppercase', fontSize: '0.85rem' };
const selectStyle = { width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px', border: '2px solid #dee2e6', fontSize: '0.9rem', background: '#fff', outline: 'none' };
const searchInput = { width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px', border: '2px solid #dee2e6', fontSize: '0.9rem', background: '#fff', outline: 'none', boxSizing: 'border-box' };
const cardBase = { padding: '15px', marginBottom: '12px', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' };
const notifCard = { background: '#fff', padding: '15px', borderRadius: '8px', marginBottom: '10px', borderLeft: '4px solid #dc3545', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' };
const whiteCard = { background: '#fff', padding: '18px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: '20px', borderTop: '4px solid #F2A900' };
const searchBtn = { width: '100%', padding: '14px', background: '#002147', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '5px' };
const markReadBtn = { background: '#e9ecef', border: 'none', padding: '6px 12px', borderRadius: '5px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', color: '#555' };
const freeRoomItem = { padding: '12px', borderBottom: '1px solid #eee', color: '#28a745', fontWeight: 'bold', fontSize: '0.85rem', background: '#f0fff4', borderRadius: '5px', marginBottom: '5px' };
const whatsappBtn = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: '#25D366', color: '#fff', padding: '12px 20px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', marginBottom: '20px', boxShadow: '0 4px 10px rgba(37, 211, 102, 0.2)' };
const loginBtn = { display: 'inline-block', background: '#F2A900', color: '#002147', padding: '12px 25px', borderRadius: '8px', textDecoration: 'none', fontWeight: 900, fontSize: '0.8rem', boxShadow: '0 4px 15px rgba(242, 169, 0, 0.3)' };
const emptyState = { textAlign: 'center', padding: '40px', color: '#999', fontSize: '0.9rem' };
const centerStyle = { textAlign: 'center', marginTop: '50px', fontFamily: 'sans-serif' };
const footerStyle = { textAlign: 'center', padding: '20px', background: '#fff', color: '#666', borderTop: '1px solid #dee2e6', fontSize: '0.9rem', marginTop: 'auto' };
const notifBannerStyle = {
    background: '#002147',
    color: '#fff',
    padding: '15px',
    borderRadius: '10px',
    marginBottom: '15px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.85rem',
    border: '2px solid #F2A900'
};
const enableBtnStyle = {
    background: '#F2A900',
    color: '#002147',
    border: 'none',
    padding: '8px 15px',
    borderRadius: '5px',
    fontWeight: 'bold',
    cursor: 'pointer'
};
