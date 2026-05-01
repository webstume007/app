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
    const [semester, setSemester] = useState('3RD');
    const [section, setSection] = useState('');
    const [phone, setPhone] = useState('');

    // --- NEW: State for Sections from Database ---
    const [availableSections, setAvailableSections] = useState([]);

    // --- NEW: Fetch sections when the page loads ---
    useEffect(() => {
        const fetchSections = async () => {
            const { data } = await supabase.from('base_schedule').select('section');
            if (data) {
                const uniqueSections = [...new Set(data.map(item => item.section))].sort();
                setAvailableSections(uniqueSections);
            }
        };
        fetchSections();
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
                            semester: semester,
                            section: section,
                            phone: phone
                        }
                    ]);

                if (profileError) {
                    setMessage(`Profile Error: ${profileError.message}`);
                } else {
                    setMessage('Signup successful! Please check your email to verify your account.');
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
                setMessage('Login successful! Redirecting to CR Login Homepage...');
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
                        <select required value={semester} onChange={(e) => setSemester(e.target.value)} style={inputStyle}>
                            <option value="1ST">1st Semester</option>
                            <option value="2ND">2nd Semester</option>
                            <option value="3RD">3rd Semester</option>
                            <option value="4TH">4th Semester</option>
                            <option value="5TH">5th Semester</option>
                            <option value="6TH">6th Semester</option>
                            <option value="7TH">7th Semester</option>
                            <option value="8TH">8th Semester</option>
                        </select>
                        
                        {/* --- CHANGED: Section Input replaced with Dropdown --- */}
                        <select 
                            required 
                            value={section} 
                            onChange={(e) => setSection(e.target.value)} 
                            style={inputStyle}
                        >
                            <option value="">-- Select Your Section --</option>
                            {availableSections.map((sec) => (
                                <option key={sec} value={sec}>{sec}</option>
                            ))}
                        </select>

                        <input type="tel" placeholder="Phone Number" required value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} />
                    </>
                )}

                <input type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
                <input type="password" placeholder="Password" required value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />

                <button type="submit" disabled={loading} style={{ background: '#F2A900', color: '#002147', padding: '12px', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>
                    {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Log In')}
                </button>
            </form>

            {message && <p style={{ marginTop: '15px', color: message.includes('Error') ? 'red' : 'green', textAlign: 'center', fontSize: '0.9rem' }}>{message}</p>}

            <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.9rem' }}>
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button onClick={() => { setIsSignUp(!isSignUp); setMessage(''); }} style={{ background: 'none', border: 'none', color: '#002147', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}>
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
    outline: 'none'
};
