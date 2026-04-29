import { useEffect, useState } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabase';

export default function Home() {
    const [rawData, setRawData] = useState([]);
    const [exceptions, setExceptions] = useState([]);
    const [contactData, setContactData] = useState([]);
    
    const [currentTab, setCurrentTab] = useState('class');
    const [semester, setSemester] = useState('');
    const [section, setSection] = useState('');
    const [teacher, setTeacher] = useState('');
    const [room, setRoom] = useState('');
    const [freeDay, setFreeDay] = useState('MON');
    const [freeStart, setFreeStart] = useState('8:00 AM');
    const [freeEnd, setFreeEnd] = useState('9:30 AM');

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
        // For teacher contacts, you can eventually move this to a Supabase table too!
        // For now, we will assume you have a basic array or fetch it similarly.
        setContactData([
            { name: "Sir Ali", phone: "923000000000" }, // Add your teachers here or move to DB
        ]);
    }, []);

    const fetchLiveSchedule = async () => {
        // 1. Fetch the permanent timetable
        const { data: baseData } = await supabase.from('base_schedule').select('*');
        
        // 2. Fetch today's/this week's cancellations
        // (In a production app, you'd filter this by the specific date)
        const { data: excData } = await supabase
            .from('schedule_exceptions')
            .select('*')
            .eq('status', 'cancelled');

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

    // Filter out cancelled classes so rooms/teachers appear free
    const getActiveSchedule = () => {
        return rawData.filter(cls => {
            const isCancelled = exceptions.some(ex => ex.base_schedule_id === cls.id);
            return !isCancelled; // If it's cancelled, it is removed from the "busy" active schedule
        });
    };

    const activeData = getActiveSchedule();
    const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];

    // Dynamic Dropdown Lists based on Live Data
    const availableSections = [...new Set(activeData.map(x => x.section))].filter(s => s.includes(semester)).sort();
    const availableTeachers = [...new Set(activeData.map(x => x.teacher))].sort();
    const availableRooms = [...new Set(activeData.map(x => x.room))].sort();

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

            <div style={{ padding: '15px', maxWidth: '1200px', margin: '0 auto', flex: 1, width: '100%' }}>
                
                {/* CONTROLS */}
                <div style={{ background: '#fff', padding: '18px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: '20px', borderTop: '4px solid #F2A900' }}>
                    
                    {currentTab === 'class' && (
                        <>
                            <h3 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: '#555', fontWeight: 700 }}>Find Your Class Schedule</h3>
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
                            <h3 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: '#555', fontWeight: 700 }}>Find Available Rooms</h3>
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
                            <h3 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: '#555', fontWeight: 700 }}>Teacher Schedule</h3>
                            <select value={teacher} onChange={(e) => setTeacher(e.target.value)} style={selectStyle}>
                                <option value="">-- Select Teacher --</option>
                                {availableTeachers.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </>
                    )}

                    {currentTab === 'room' && (
                        <>
                            <h3 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: '#555', fontWeight: 700 }}>Room Allocation</h3>
                            <select value={room} onChange={(e) => setRoom(e.target.value)} style={selectStyle}>
                                <option value="">-- Select Room --</option>
                                {availableRooms.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </>
                    )}
                </div>

                {/* RESULTS RENDERER */}
                <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '12px', padding: '15px' }}>
                    
                    {currentTab === 'free' ? (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <tbody>
                                <tr><th style={{ background: '#F2A900', color: '#002147', padding: '15px' }}>Available Rooms ({freeDay})</th></tr>
                                {availableRooms.map(r => {
                                    const isBusy = activeData.some(x => x.room === r && x.day === freeDay && parseTime(freeStart) >= parseTime(x.start_time) && parseTime(freeStart) < parseTime(x.end_time));
                                    if (!isBusy) return <tr key={r}><td style={{ padding: '12px', borderBottom: '1px solid #eee', color: '#28a745', fontWeight: 'bold' }}>✅ {r} is FREE</td></tr>;
                                    return null;
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                            <thead>
                                <tr>
                                    <th style={thStyle}>Time</th>
                                    {days.map(d => <th key={d} style={thStyle}>{d}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {timeSlots.map(slot => {
                                    const sVal = parseTime(slot);
                                    return (
                                        <tr key={slot}>
                                            <td style={{ background: '#f8f9fa', fontWeight: 900, padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>{slot}</td>
                                            {days.map(day => {
                                                const matches = activeData.filter(c => {
                                                    const isMatch = (currentTab === 'class' && c.section === section) || 
                                                                    (currentTab === 'teacher' && c.teacher === teacher) || 
                                                                    (currentTab === 'room' && c.room === room);
                                                    return isMatch && c.day === day && sVal >= parseTime(c.start_time) && sVal < parseTime(c.end_time);
                                                });

                                                return (
                                                    <td key={day} style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                        {matches.length > 0 ? matches.map((m, idx) => (
                                                            <div key={idx} style={{ background: '#e7f1ff', borderLeft: '4px solid #002147', padding: '8px', margin: '4px', textAlign: 'left', borderRadius: '4px' }}>
                                                                <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#000' }}>{m.course}</div>
                                                                <div style={{ fontSize: '0.75rem', color: '#555' }}>
                                                                    {currentTab === 'teacher' ? m.room : m.teacher}
                                                                </div>
                                                                <div style={{ fontSize: '0.75rem', color: 'blue', fontWeight: 'bold' }}>
                                                                    {currentTab === 'class' ? m.room : m.section}
                                                                </div>
                                                            </div>
                                                        )) : <div style={{ color: '#28a745', fontWeight: 'bold', fontSize: '0.7rem', opacity: 0.3 }}>FREE</div>}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <footer style={{ textAlign: 'center', padding: '25px 15px', fontSize: '0.9rem', color: '#666', background: '#fff', borderTop: '1px solid #dee2e6', marginTop: 'auto' }}>
                Made by <a href="http://wa.me/923053296062" target="_blank" rel="noreferrer" style={{ color: '#002147', fontWeight: 700, textDecoration: 'none' }}>Mohsin</a> with ❤️ | <a href="/login" style={{ color: '#F2A900', textDecoration: 'none' }}>CR Login</a>
            </footer>
        </div>
    );
}

// Styling Objects
const selectStyle = { width: '100%', padding: '12px', marginBottom: '10px', border: '2px solid #dee2e6', borderRadius: '8px', fontSize: '1rem', outline: 'none', background: '#fff' };
const thStyle = { background: '#002147', color: '#F2A900', padding: '15px', border: '1px solid #ddd' };
