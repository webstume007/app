import { useEffect, useState } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabase';

export default function Home() {
    const [rawData, setRawData] = useState([]);
    const [exceptions, setExceptions] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [currentTab, setCurrentTab] = useState('class');
    const [semester, setSemester] = useState('');
    const [section, setSection] = useState('');
    const [teacher, setTeacher] = useState('');
    const [room, setRoom] = useState('');
    
    // Free Room Settings
    const [freeDay, setFreeDay] = useState('MON');
    const [freeStart, setFreeStart] = useState('8:00 AM');
    const [showFreeResults, setShowFreeResults] = useState(false);

    // Day Filter
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
        const { data: excData } = await supabase.from('schedule_exceptions').select('*');

        setRawData(baseData || []);
        setExceptions(excData || []);
        setLoading(false);
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

    // Dynamic extraction from raw data
    const availableSemesters = [...new Set(rawData.map(x => x.semester))].filter(Boolean).sort();
    const availableSections = [...new Set(rawData.filter(x => x.semester === semester).map(x => x.section))].sort();
    const availableTeachers = [...new Set(rawData.map(x => x.teacher))].sort();
    const availableRooms = [...new Set(rawData.map(x => x.room))].sort();

    // Helper to determine background color and status label
    const getStatusStyles = (classId) => {
        const exc = exceptions.find(e => e.base_schedule_id === classId);
        if (exc?.status === 'cancelled') {
            return { label: 'Cancelled', color: '#721c24', bg: '#f8d7da', border: '#f5c6cb' };
        }
        if (exc?.status === 'confirmed') {
            return { label: 'Confirmed', color: '#155724', bg: '#d4edda', border: '#c3e6cb' };
        }
        if (exc?.status === 'rescheduled') {
            return { label: `Rescheduled: Room ${exc.new_room}`, color: '#004085', bg: '#e7f1ff', border: '#b8daff' };
        }
        return { label: 'As Scheduled', color: '#856404', bg: '#fff', border: '#F2A900' };
    };

    const getFilteredClasses = () => {
        return rawData.filter(c => {
            const isMatch = (currentTab === 'class' && c.section === section) || 
                            (currentTab === 'teacher' && c.teacher === teacher) || 
                            (currentTab === 'room' && c.room === room);
            return isMatch && c.day === selectedDay;
        }).sort((a, b) => parseTime(a.start_time) - parseTime(b.start_time));
    };

    const matchedClasses = getFilteredClasses();

    if (loading) return <div style={{textAlign: 'center', marginTop: '50px', fontFamily: 'sans-serif'}}>Loading Schedule...</div>;

    return (
        <div style={{ backgroundColor: '#f0f2f5', color: '#1a1a1b', minHeight: '100vh', fontFamily: "'Roboto', sans-serif", display: 'flex', flexDirection: 'column' }}>
            <Head>
                <title>IUB AI Depart Schedule</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            </Head>

            <header style={{ background: '#002147', color: '#F2A900', padding: '15px 20px', display: 'flex', justifyContent: 'center', position: 'sticky', top: 0, zIndex: 1000, boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 900 }}>🎓 IUB AI Depart Schedule</div>
            </header>

            {/* Mobile Tab View */}
            <div style={{ display: 'flex', background: '#fff', padding: '8px', gap: '5px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', position: 'sticky', top: '51px', zIndex: 999, overflowX: 'auto' }}>
                {['class', 'free', 'teacher', 'room'].map(tab => (
                    <button 
                        key={tab} 
                        onClick={() => { setCurrentTab(tab); setShowFreeResults(false); }}
                        style={{ flex: 1, padding: '12px', border: 'none', background: currentTab === tab ? '#002147' : '#e9ecef', color: currentTab === tab ? '#fff' : '#495057', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', borderRadius: '8px', whiteSpace: 'nowrap' }}
                    >
                        {tab === 'class' ? '📅 SCHEDULE' : tab === 'free' ? '🔍 FREE ROOM' : tab === 'teacher' ? '👨‍🏫 TEACHER' : '🚪 ROOM'}
                    </button>
                ))}
            </div>

            {/* Fixed Mobile Container */}
            <div style={{ padding: '15px', maxWidth: '600px', margin: '0 auto', flex: 1, width: '100%' }}>
                
                {/* Search Box */}
                <div style={{ background: '#fff', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '15px', borderTop: '4px solid #F2A900' }}>
                    {currentTab === 'class' && (
                        <>
                            <select value={semester} onChange={(e) => { setSemester(e.target.value); setSection(''); }} style={selectStyle}>
                                <option value="">-- Select Semester --</option>
                                {availableSemesters.map(s => <option key={s} value={s}>{s} Semester</option>)}
                            </select>
                            <select value={section} onChange={(e) => setSection(e.target.value)} style={selectStyle} disabled={!semester}>
                                <option value="">-- Select Section --</option>
                                {availableSections.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </>
                    )}
                    {currentTab === 'free' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <h3 style={{margin: '0 0 5px 0', fontSize: '0.9rem', color: '#002147'}}>Search Empty Rooms</h3>
                            <div style={{ display: 'flex', gap: '5px' }}>
                                <select value={freeDay} onChange={e => setFreeDay(e.target.value)} style={selectStyle}>
                                    {days.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                                <select value={freeStart} onChange={e => setFreeStart(e.target.value)} style={selectStyle}>
                                    {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <button onClick={() => setShowFreeResults(true)} style={{ padding: '12px', background: '#002147', color: '#F2A900', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                                SEARCH FREE ROOMS
                            </button>
                        </div>
                    )}
                    {currentTab === 'teacher' && (
                        <select value={teacher} onChange={(e) => setTeacher(e.target.value)} style={selectStyle}>
                            <option value="">-- Select Teacher --</option>
                            {availableTeachers.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    )}
                    {currentTab === 'room' && (
                        <select value={room} onChange={(e) => setRoom(e.target.value)} style={selectStyle}>
                            <option value="">-- Select Room --</option>
                            {availableRooms.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    )}
                </div>

                {/* Day Filter */}
                {currentTab !== 'free' && (section || teacher || room) && (
                    <div style={{ display: 'flex', gap: '5px', marginBottom: '15px', overflowX: 'auto', paddingBottom: '5px' }}>
                        {days.map(day => (
                            <button
                                key={day}
                                onClick={() => setSelectedDay(day)}
                                style={{
                                    flex: '1', minWidth: '55px', padding: '10px', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer',
                                    background: selectedDay === day ? '#002147' : '#fff',
                                    color: selectedDay === day ? '#F2A900' : '#555',
                                    fontSize: '0.75rem',
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
                        showFreeResults && (
                            <div style={{ background: '#fff', borderRadius: '12px', padding: '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                                <h4 style={{ margin: '0 0 10px 0', color: '#002147', fontSize: '0.9rem' }}>Available Rooms on {freeDay} at {freeStart}</h4>
                                {availableRooms.map(r => {
                                    const isBusy = rawData.some(x => 
                                        x.room === r && 
                                        x.day === freeDay && 
                                        parseTime(freeStart) >= parseTime(x.start_time) && 
                                        parseTime(freeStart) < parseTime(x.end_time)
                                    );
                                    if (!isBusy) return <div key={r} style={{ padding: '12px', borderBottom: '1px solid #eee', color: '#28a745', fontWeight: 'bold', fontSize: '0.85rem' }}>✅ Room {r} is FREE</div>;
                                    return null;
                                })}
                            </div>
                        )
                    ) : (
                        <div>
                            {(section || teacher || room) ? (
                                matchedClasses.length > 0 ? (
                                    matchedClasses.map((cls, idx) => {
                                        const status = getStatusStyles(cls.id);
                                        return (
                                            <div key={idx} style={{ 
                                                background: status.bg, 
                                                borderLeft: `5px solid ${status.border}`, 
                                                padding: '15px', 
                                                marginBottom: '12px', 
                                                borderRadius: '10px', 
                                                boxShadow: '0 4px 10px rgba(0,0,0,0.05)' 
                                            }}>
                                                <div style={{ fontWeight: 900, color: '#002147', fontSize: '0.85rem', marginBottom: '5px' }}>🕒 {cls.start_time} - {cls.end_time}</div>
                                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#000', marginBottom: '5px' }}>{cls.course}</div>
                                                <div style={{ color: '#555', fontSize: '0.8rem', lineHeight: 1.4 }}>
                                                    📍 <b>Room:</b> {cls.room} | 👨‍🏫 <b>{cls.teacher}</b>
                                                </div>
                                                <div style={{ marginTop: '8px', fontSize: '0.7rem', fontWeight: 'bold', color: status.color, textTransform: 'uppercase' }}>
                                                    ● {status.label}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div style={{ textAlign: 'center', color: '#666', padding: '20px', background: '#fff', borderRadius: '10px' }}>No classes scheduled for {selectedDay}.</div>
                                )
                            ) : null}
                        </div>
                    )}
                </div>

                {/* BIG YELLOW LOGIN BUTTON */}
                <div style={{ textAlign: 'center', marginTop: '40px', paddingBottom: '30px' }}>
                    <a href="/login" style={{ 
                        display: 'inline-block', 
                        background: '#F2A900', 
                        color: '#002147', 
                        padding: '12px 25px', 
                        borderRadius: '8px', 
                        fontWeight: 900, 
                        fontSize: '0.85rem',
                        textDecoration: 'none', 
                        boxShadow: '0 4px 15px rgba(242, 169, 0, 0.4)',
                        textTransform: 'uppercase'
                    }}>
                        👨‍💻 CR Login Portal
                    </a>
                </div>

            </div>
        </div>
    );
}

const selectStyle = { width: '100%', padding: '12px', marginBottom: '10px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', background: '#fff' };
