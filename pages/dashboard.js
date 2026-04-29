import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
    const [session, setSession] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Check if user is logged in
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) fetchProfile(session.user.id);
            else {
                window.location.href = '/login'; // Redirect to login if not authenticated
            }
        });

        // 2. Listen for auth changes (like logging out)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (!session) window.location.href = '/login';
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = async (userId) => {
        const { data, error } = await supabase
            .from('cr_profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error fetching profile:', error);
        } else {
            setProfile(data);
        }
        setLoading(false);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    // Placeholder function for our next step
    const handleCancelClass = (classId) => {
        alert("This will mark the class as cancelled and notify other CRs!");
    };

    if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading Dashboard...</div>;
    if (!session) return null; // Will redirect via useEffect

    return (
        <div style={{ background: '#f0f2f5', minHeight: '100vh', fontFamily: 'sans-serif' }}>
            {/* Dashboard Header */}
            <header style={{ background: '#002147', color: '#F2A900', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: '900', fontSize: '1.2rem' }}>🎓 IUB AI Depart - CR Portal</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ color: 'white', cursor: 'pointer' }}>🔔 Notifications</span>
                    <button onClick={handleLogout} style={{ background: '#F2A900', color: '#002147', border: 'none', padding: '8px 15px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>Logout</button>
                </div>
            </header>

            <div style={{ maxWidth: '1000px', margin: '20px auto', padding: '0 15px' }}>
                {/* Welcome Card */}
                <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '20px', borderLeft: '5px solid #F2A900' }}>
                    <h2 style={{ margin: '0 0 10px 0', color: '#002147' }}>Welcome, {profile?.first_name} {profile?.last_name}</h2>
                    <p style={{ margin: 0, color: '#555' }}>
                        Managing Schedule for: <strong>{profile?.department} | {profile?.semester} Semester | Section {profile?.section}</strong>
                    </p>
                </div>

                {/* Upcoming Lectures Area */}
                <h3 style={{ color: '#333', textTransform: 'uppercase', fontSize: '1rem' }}>Upcoming Lectures (Next 6 Days)</h3>
                
                {/* Dummy Class Card (We will connect this to the database next) */}
                <div style={{ background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', marginBottom: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px' }}>
                        <div>
                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#000' }}>Introduction to AI</div>
                            <div style={{ color: '#666', fontSize: '0.9rem' }}>Sir Ali | Room 102</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ color: '#002147', fontWeight: '900' }}>Monday</div>
                            <div style={{ color: '#F2A900', fontWeight: 'bold' }}>10:00 AM - 11:30 AM</div>
                        </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button style={{ flex: 1, padding: '10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>
                            ✅ Will Held
                        </button>
                        <button onClick={() => handleCancelClass(1)} style={{ flex: 1, padding: '10px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>
                            ❌ Cancelled
                        </button>
                        <button style={{ flex: 1, padding: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>
                            🕒 Edit Timing
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
