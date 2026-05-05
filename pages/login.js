import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Auth() {
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // Form States
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [department, setDepartment] = useState('BSAI');
    const [academicSession, setAcademicSession] = useState(''); 
    const [section, setSection] = useState('');
    const [phone, setPhone] = useState('');

    // --- Dropdown States ---
    const [availableSessions, setAvailableSessions] = useState([]);
    const [availableSections, setAvailableSections] = useState([]);
    
    // --- Manual Entry Toggles ---
    const [isManualSession, setIsManualSession] = useState(false);
    const [isManualSection, setIsManualSection] = useState(false);

    useEffect(() => {
        const fetchDropdownData = async () => {
            // Fetch both session and section from base_schedule to populate dropdowns
            const { data } = await supabase.from('base_schedule').select('session, section');
            if (data) {
                const uniqueSessions = [...new Set(data.map(item => item.session).filter(Boolean))].sort();
                const uniqueSections = [...new Set(data.map(item => item.section).filter(Boolean))].sort();
                setAvailableSessions(uniqueSessions);
                setAvailableSections(uniqueSections);
            }
        };
        fetchDropdownData();
    }, []);

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        if (isSignUp) {
            // 1. Create the user in Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/login` 
                }
            });

            if (authError) {
                setMessage(`Error: ${authError.message}`);
                setLoading(false);
                return;
            }

            // 2. Save the CR's details to our custom cr_profiles table
            if (authData.user) {
                const { error: profileError } = await supabase
                    .from('cr_profiles')
                    .insert([
                        {
                            id: authData.user.id,
                            first_name: firstName,
                            last_name: lastName,
                            department: department,
                            session: academicSession, 
                            section: section,
                            phone: phone
                        }
                    ]);

                if (profileError) {
                    setMessage(`Profile Error: ${profileError.message}`);
                } else {
                    setMessage('Signup successful! Please check your email to verify your account.');
                    setIsSignUp(false); // Instantly switch to Login view
                }
            }
        } else {
            // LOGIN LOGIC
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                setMessage(`Error: ${error.message}`);
            } else {
                setMessage('Login successful! Redirecting to CR Dashboard...');
                window.location.href = '/crlogin'; 
            }
        }
        setLoading(false);
    };

    return (
        <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', fontFamily: 'sans-serif', background: '#fff', borderRadius: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
            <h2 style={{ textAlign: 'center', color: '#002147' }}>
                {isSignUp ? 'CR Registration' : 'CR Login'}
            </h2>
            
            <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                
                {isSignUp && (
                    <>
                        <input type="text" placeholder="First Name" required value={firstName} onChange={(e) => setFirstName(e.target.value)} style={inputStyle} />
                        <input type="text" placeholder="Last Name" required value={lastName} onChange={(e) => setLastName(e.target.value)} style={inputStyle} />
                        <input type="text" placeholder="Department (e.g., BSAI)" required value={department} onChange={(e) => setDepartment(e.target.value)} style={inputStyle} />
                        
                        {/* --- SESSION FIELD --- */}
                        {isManualSession ? (
                            <input 
                                type="text" 
                                placeholder="Type Session Manually (e.g., 2022-2026)" 
                                required 
                                value={academicSession} 
                                onChange={(e) => setAcademicSession(e.target.value)} 
                                style={{...inputStyle, border: '2px solid #007bff'}} 
                            />
                        ) : (
                            <select 
                                required 
                                value={academicSession} 
                                onChange={(e) => {
                                    if (e.target.value === 'MANUAL') {
                                        setIsManualSession(true);
                                        setAcademicSession('');
                                    } else {
                                        setAcademicSession(e.target.value);
                                    }
                                }} 
                                style={inputStyle}
                            >
                                <option value="">-- Select Session --</option>
                                {availableSessions.map((sess) => (
                                    <option key={sess} value={sess}>{sess}</option>
                                ))}
                                <option value="MANUAL">➕ Add Manually</option>
                            </select>
                        )}
                        
                        {/* --- SECTION FIELD --- */}
                        {isManualSection ? (
                            <input 
                                type="text" 
                                placeholder="Type Section Manually (e.g., A)" 
                                required 
                                value={section} 
                                onChange={(e) => setSection(e.target.value)} 
                                style={{...inputStyle, border: '2px solid #007bff'}} 
                            />
                        ) : (
                            <select 
                                required 
                                value={section} 
                                onChange={(e) => {
                                    if (e.target.value === 'MANUAL') {
                                        setIsManualSection(true);
                                        setSection('');
                                    } else {
                                        setSection(e.target.value);
                                    }
                                }} 
                                style={inputStyle}
                            >
                                <option value="">-- Select Section --</option>
                                {availableSections.map((sec) => (
                                    <option key={sec} value={sec}>{sec}</option>
                                ))}
                                <option value="MANUAL">➕ Add Manually</option>
                            </select>
                        )}

                        <input type="tel" placeholder="Phone Number" required value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} />
                    </>
                )}

                <input type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
                <input type="password" placeholder="Password" required value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />

                <div style={{ display: 'flex', gap: '10px' }}>
                    {isSignUp && (isManualSession || isManualSection) && (
                        <button type="button" onClick={() => { setIsManualSession(false); setIsManualSection(false); setAcademicSession(''); setSection(''); }} style={{ background: '#eee', color: '#333', padding: '12px', border: 'none', borderRadius: '5px', cursor: 'pointer', marginTop: '10px', flex: 1 }}>
                            Cancel Manual
                        </button>
                    )}
                    <button type="submit" disabled={loading} style={{ background: '#F2A900', color: '#002147', padding: '12px', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', flex: 2 }}>
                        {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Log In')}
                    </button>
                </div>
            </form>

            {message && <p style={{ marginTop: '15px', color: message.includes('Error') ? 'red' : '#155724', textAlign: 'center', fontSize: '0.9rem', padding: '10px', background: message.includes('Error') ? '#f8d7da' : '#d4edda', borderRadius: '5px' }}>{message}</p>}

            <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.9rem' }}>
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button onClick={() => { setIsSignUp(!isSignUp); setMessage(''); setIsManualSession(false); setIsManualSection(false); }} style={{ background: 'none', border: 'none', color: '#002147', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}>
                    {isSignUp ? 'Log In' : 'Sign Up'}
                </button>
            </p>
        </div>
    );
}

const inputStyle = {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '5px',
    fontSize: '1rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box'
};
