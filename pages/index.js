import { useEffect, useState } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabase';

export default function Home() {
    const [rawData, setRawData] = useState([]);
    const [exceptions, setExceptions] = useState([]);
    
    // Filters
    const [currentTab, setCurrentTab] = useState('class');
    const [semester, setSemester] = useState('');
    const [section, setSection] = useState('');
    const [teacher, setTeacher] = useState('');
    const [room, setRoom] = useState('');
    
    // Free Room Settings
    const [freeDay, setFreeDay] = useState('MON');
    const [freeStart, setFreeStart] = useState('8:00 AM');
    const [freeEnd, setFreeEnd] = useState('9:30 AM');

    // NEW: Day Filter for standard views
    const [selectedDay, setSelectedDay] = useState('MON');
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
        fetchLiveSchedule();
    }, []);

    const fetchLiveSchedule = async () => {
        const { data: baseData } = await supabase.from('base_schedule').select('*');
        const { data: excData } = await supabase.from('schedule_exceptions').select('*').eq('status', 'cancelled');

        setRawData(baseData || []);
        setExceptions(excData || []);
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

    const getActiveSchedule = () => {
        return rawData.filter(cls => {
            const isCancelled = exceptions.some(ex => ex.base_schedule_id === cls.id);
            return !isCancelled;
        });
    };

    const activeData = getActiveSchedule();
    const availableSections = [...new Set(activeData.map(x => x.section))].filter(s => s.includes(semester)).sort();
    const availableTeachers = [...new Set(activeData.map(x => x.teacher))].sort();
    const availableRooms = [...new Set(activeData.map(x => x.room))].sort();

    // Get classes that match the active tab AND the selected day
    const getFilteredClasses = () => {
        return activeData.filter(c => {
            const isMatch = (currentTab === 'class' && c.section === section) || 
                            (currentTab === 'teacher' && c.teacher === teacher) || 
                            (currentTab === 'room' && c.room === room);
            return isMatch && c.day === selectedDay;
        }).sort((a, b) => parseTime(a.start_time) - parseTime(b.start_time)); // Sort chronologically
    };

    const matchedClasses = getFilteredClasses();

    return (
        <div style={{ backgroundColor: '#f0f2f5', color: '#1a1a1b', minHeight: '100vh', fontFamily: "'Roboto', sans-serif", display: 'flex', flexDirection: 'column' }}>
            <Head>
                <title>IUB AI Depart Schedule</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            </Head>

            <header style={{ background: '#002147', color: '#F2A900', padding: '15px 20px', display: 'flex', justifyContent: 'center', position: 'sticky', top: 0, zIndex: 1000, boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 900 }}>🎓 IUB AI Depart Schedule</div>
            </header>

            <div style={{ display: 'flex', background: '#fff', padding: '8px', gap: '5px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', position: 'sticky', top: '54px', zIndex: 999, overflowX: 'auto' }}>
                {['class', 'free', 'teacher', 'room'].map(tab => (
                    <button 
                        key={tab} 
                        onClick={() => setCurrentTab(tab)}
                        style={{ flex: 1, padding: '12px', border: 'none', background: currentTab === tab ? '#002147' : '#e9ecef', color: currentTab === tab ? '#fff' : '#495057', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', borderRadius: '8px', whiteSpace: 'nowrap' }}
                    >
                        {tab === 'class' ? '📅 Schedule' : tab === 'free' ? '🔍 Free Room' : tab === 'teacher' ? '👨‍🏫 Teacher' : '🚪 Room'}
                    </button>
                ))}
            </div>

            <div style={{ padding: '15px', maxWidth: '800px', margin: '0 auto', flex: 1, width: '100%' }}>
                
                {/* Search Controls */}
                <div style={{ background: '#fff', padding: '18px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: '20px', borderTop: '4px solid #F2A900' }}>
                    {currentTab === 'class' && (
                        <>
                            <h3 style={titleStyle}>Find Your Class Schedule</h3>
                            <select value={semester} onChange={(e) => setSemester(e.target.value)} style={selectStyle}>
                                <option value="">-- Select Semester --</option>
                                <option value="1ST">1st Semester</option><option value="3RD">3rd Semester</option>
                                <option value="5TH">5th Semester</option><option value="7TH">7th Semester</option>
                            </select>
                            <select value={section} onChange={(e) => setSection(e.target.value)} style={selectStyle}>
                                <option value="">-- Select Section --</option>
                                {availableSections.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </>
                    )}
                    {currentTab === 'free' && (
                        <>
                            <h3 style={titleStyle}>Find Available Rooms</h3>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <select value={freeDay} onChange={e => setFreeDay(e.target.value)} style={selectStyle}>
                                    {days.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                                <select value={freeStart} onChange={e => setFreeStart(e.target.value)} style={selectStyle}>
                                    {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <select value={freeEnd} onChange={e => setFreeEnd(e.target.value)} style={selectStyle}>
                                    {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        </>
                    )}
                    {currentTab === 'teacher' && (
                        <>
                            <h3 style={titleStyle}>Teacher Schedule</h3>
                            <select value={teacher} onChange={(e) => setTeacher(e.target.value)} style={selectStyle}>
                                <option value="">-- Select Teacher --</option>
                                {availableTeachers.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </>
                    )}
                    {currentTab === 'room' && (
                        <>
                            <h3 style={titleStyle}>Room Allocation</h3>
                            <select value={room} onChange={(e) => setRoom(e.target.value)} style={selectStyle}>
                                <option value="">-- Select Room --</option>
                                {availableRooms.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </>
                    )}
                </div>

                {/* Day Filter (Hidden on Free Room Tab) */}
                {currentTab !== 'free' && (section || teacher || room) && (
                    <div style={{ display: 'flex', gap: '5px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '5px' }}>
                        {days.map(day => (
                            <button
                                key={day}
                                onClick={() => setSelectedDay(day)}
                                style={{
                                    flex: '1', minWidth: '60px', padding: '10px', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer',
                                    background: selectedDay === day ? '#002147' : '#fff',
                                    color: selectedDay === day ? '#F2A900' : '#555',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                                }}
                            >
                                {day}
                            </button>
                        ))}
                    </div>
                )}

                {/* Results Renderer */}
                <div style={{ marginTop: '10px' }}>
                    {currentTab === 'free' ? (
                        <div style={{ background: '#fff', borderRadius: '12px', padding: '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                            <h4 style={{ margin: '0 0 10px 0', color: '#002147' }}>Free Rooms ({freeDay})</h4>
                            {availableRooms.map(r => {
                                const isBusy = activeData.some(x => x.room === r && x.day === freeDay && parseTime(freeStart) >= parseTime(x.start_time) && parseTime(freeStart) < parseTime(x.end_time));
                                if (!isBusy) return <div key={r} style={{ padding: '12px', borderBottom: '1px solid #eee', color: '#28a745', fontWeight: 'bold' }}>✅ Room {r} is FREE</div>;
                                return null;
                            })}
                        </div>
                    ) : (
                        <div>
                            {(section || teacher || room) ? (
                                matchedClasses.length > 0 ? (
                                    matchedClasses.map((cls, idx) => (
                                        <div key={idx} style={{ background: '#fff', borderLeft: '5px solid #F2A900', padding: '15px', marginBottom: '12px', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                                            <div style={{ fontWeight: 900, color: '#002147', fontSize: '1rem', marginBottom: '5px' }}>🕒 {cls.start_time} - {cls.end_time}</div>
                                            <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#000', marginBottom: '8px' }}>{cls.course}</div>
                                            <div style={{ color: '#555', fontSize: '0.9rem', lineHeight: 1.5 }}>
                                                📍 <b>Room:</b> {cls.room} | 👨‍🏫 <b>Teacher:</b> {cls.teacher}<br/>
                                                👥 <b>Section:</b> {cls.section}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ textAlign: 'center', color: '#666', padding: '20px', background: '#fff', borderRadius: '10px' }}>No classes scheduled for {selectedDay}.</div>
                                )
                            ) : null}
                        </div>
                    )}
                </div>

                {/* BIG YELLOW CR LOGIN BUTTON */}
                <div style={{ textAlign: 'center', marginTop: '40px', marginBottom: '20px' }}>
                    <a href="/login" style={{ 
                        display: 'inline-block', 
                        background: '#F2A900', 
                        color: '#002147', 
                        padding: '15px 30px', 
                        borderRadius: '8px', 
                        fontWeight: 900, 
                        fontSize: '1.1rem',
                        textDecoration: 'none', 
                        boxShadow: '0 4px 15px rgba(242, 169, 0, 0.4)',
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                    }}>
                        👨‍💻 CR Login Portal
                    </a>
                </div>

            </div>
        </div>
    );
}

// Styling Objects
const titleStyle = { margin: '0 0 15px 0', fontSize: '1rem', color: '#555', fontWeight: 700 };
const selectStyle = { width: '100%', padding: '12px', marginBottom: '10px', border: '2px solid #dee2e6', borderRadius: '8px', fontSize: '1rem', outline: 'none', background: '#fff' };
