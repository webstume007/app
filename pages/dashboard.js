import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
    const [session, setSession] = useState(null);
    const [profile, setProfile] = useState(null);
    const [schedule, setSchedule] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) {
                fetchProfileAndSchedule(session.user.id);
            } else {
                window.location.href = '/login';
            }
        });
    }, []);

    const fetchProfileAndSchedule = async (userId) => {
        // 1. Fetch CR Profile
        const { data: profileData } = await supabase
            .from('cr_profiles')
            .select('*')
            .eq('id', userId)
            .single();

        setProfile(profileData);

        // 2. Fetch Base Schedule for their specific Semester & Section
        if (profileData) {
            const { data: scheduleData } = await supabase
                .from('base_schedule')
                .select('*')
                .eq('semester', profileData.semester)
                .eq('section', profileData.section);
            
            // 3. Fetch Cancellations (Exceptions) to see if any classes are already cancelled
            const { data: exceptionsData } = await supabase
                .from('schedule_exceptions')
                .select('*');

            // Merge the data so we know which classes are cancelled
            const mergedSchedule = scheduleData.map(cls => {
                const isCancelled = exceptionsData.some(ex => ex.base_schedule_id === cls.id && ex.status === 'cancelled');
                return { ...cls, isCancelled };
            });

            setSchedule(mergedSchedule);
        }
        setLoading(false);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = '/login';
    };

    // The Magic: Cancelling a Class
    const handleCancelClass = async (classId, courseName) => {
        const confirmCancel = window.confirm(`Are you sure you want to CANCEL ${courseName}? This will free up the room and notify others.`);
        
        if (!confirmCancel) return;

        // Get today's date formatted as YYYY-MM-DD
        const today = new Date().toISOString().split('T')[0];

        // 1. Write the cancellation to the database
        const { error: exceptionError } = await supabase
            .from('schedule_exceptions')
            .insert([{
                base_schedule_id: classId,
                exception_date: today, // In a future update, we can let them pick the date
                status: 'cancelled',
                cancelled_by: session.user.id
            }]);

        if (exceptionError) {
            alert("Error cancelling class: " + exceptionError.message);
            return;
        }

        // 2. Create a notification for other CRs
        await supabase.from('notifications').insert([{
            message: `Alert: ${courseName} for ${profile.section} has been cancelled. Room is now free.`
        }]);

        alert(`${courseName} cancelled successfully!`);
        
        // 3. Refresh the schedule on the screen
        fetchProfileAndSchedule(session.user.id);
    };

    if (loading) return <div style={{ textAlign: 'center', marginTop: '50px', fontFamily: 'sans-serif' }}>Loading Dashboard...</div>;
    if (!session) return null;

    return (
        <div style={{ background: '#f0f2f5', minHeight: '100vh', fontFamily: 'sans-serif' }}>
            <header style={{ background: '#002147', color: '#F2A900', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: '900', fontSize: '1.2rem' }}>🎓 CR Portal</div>
                <button onClick={handleLogout} style={{ background: '#F2A900', color: '#002147', border: 'none', padding: '8px 15px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>Logout</button>
            </header>

            <div style={{ maxWidth: '1000px', margin: '20px auto', padding: '0 15px' }}>
                <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '20px', borderLeft: '5px solid #F2A900' }}>
                    <h2 style={{ margin: '0 0 10px 0', color: '#002147' }}>Welcome, {profile?.first_name} {profile?.last_name}</h2>
                    <p style={{ margin: 0, color: '#555' }}>Managing Schedule for: <strong>{profile?.department} | {profile?.semester} | Section {profile?.section}</strong></p>
                </div>

                <h3 style={{ color: '#333', textTransform: 'uppercase', fontSize: '1rem' }}>Your Weekly Timetable</h3>
                
                {schedule.length === 0 ? (
                    <p>No classes found for your section. Ensure data is imported to Supabase.</p>
                ) : (
                    schedule.map((cls) => (
                        <div key={cls.id} style={{ background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', marginBottom: '15px', opacity: cls.isCancelled ? 0.6 : 1 }}>
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
                            
                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {cls.isCancelled ? (
                                    <div style={{ width: '100%', textAlign: 'center', padding: '10px', background: '#ffeeba', color: '#856404', borderRadius: '5px', fontWeight: 'bold' }}>
                                        Class Cancelled for Today
                                    </div>
                                ) : (
                                    <>
                                        <button style={{ flex: 1, padding: '10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>✅ Will Held</button>
                                        <button onClick={() => handleCancelClass(cls.id, cls.course)} style={{ flex: 1, padding: '10px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>❌ Cancel Class</button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
