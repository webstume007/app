import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Notifications() {
    const [session, setSession] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Check if user is logged in
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) {
                fetchNotifications();
            } else {
                window.location.href = '/login';
            }
        });
    }, []);

    const fetchNotifications = async () => {
        // Fetch all notifications, newest first
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50); // Show the latest 50 alerts

        if (error) {
            console.error('Error fetching notifications:', error);
        } else {
            setNotifications(data || []);
        }
        setLoading(false);
    };

    // Format the timestamp into a readable date/time
    const formatTime = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleString('en-US', { 
            weekday: 'short', month: 'short', day: 'numeric', 
            hour: 'numeric', minute: '2-digit', hour12: true 
        });
    };

    if (loading) return <div style={{ textAlign: 'center', marginTop: '50px', fontFamily: 'sans-serif' }}>Loading Notifications...</div>;
    if (!session) return null;

    return (
        <div style={{ background: '#f0f2f5', minHeight: '100vh', fontFamily: "'Roboto', sans-serif" }}>
            <header style={{ background: '#002147', color: '#F2A900', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
                <div style={{ fontWeight: '900', fontSize: '1.2rem' }}>🔔 Notifications</div>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <a href="/crlogin" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold', alignSelf: 'center' }}>⬅ Back to Dashboard</a>
                </div>
            </header>

            <div style={{ maxWidth: '800px', margin: '30px auto', padding: '0 15px' }}>
                <h2 style={{ color: '#002147', marginBottom: '20px' }}>Recent Activity & Alerts</h2>

                {notifications.length === 0 ? (
                    <div style={{ background: 'white', padding: '20px', borderRadius: '8px', textAlign: 'center', color: '#666' }}>
                        No notifications yet. You're all caught up!
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {notifications.map(notif => (
                            <div key={notif.id} style={{ background: 'white', padding: '15px', borderRadius: '8px', borderLeft: '5px solid #dc3545', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                                <p style={{ margin: '0 0 8px 0', fontSize: '1.05rem', color: '#333', fontWeight: '500' }}>
                                    {notif.message}
                                </p>
                                <span style={{ fontSize: '0.8rem', color: '#888' }}>
                                    🕒 {formatTime(notif.created_at)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
