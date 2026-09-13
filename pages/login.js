import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Auth() {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [cnic, setCnic] = useState('');
    const [password, setPassword] = useState('');

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        // Map CNIC to the dummy email domain we set up in backstage.js
        const email = `${cnic.replace(/\D/g, '')}@cr.iub.edu`;

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setMessage(`Error: ${error.message}`);
        } else {
            setMessage('Login successful! Redirecting to Dashboard...');
            window.location.href = '/'; 
        }
        setLoading(false);
    };

    return (
        <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', fontFamily: 'sans-serif', background: '#fff', borderRadius: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
            <h2 style={{ textAlign: 'center', color: '#002147' }}>
                CR Login
            </h2>
            <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input 
                    type="text" 
                    placeholder="CNIC (e.g., 31202...)" 
                    required 
                    value={cnic} 
                    onChange={(e) => setCnic(e.target.value)} 
                    style={inputStyle} 
                />
                <input 
                    type="password" 
                    placeholder="Password" 
                    required 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    style={inputStyle} 
                />
                <button type="submit" disabled={loading} style={{ padding: '10px', fontSize: '16px', cursor: 'pointer', background: '#F2A900', color: '#002147', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
                    {loading ? 'Processing...' : 'Login'}
                </button>
            </form>
            {message && <p style={{ marginTop: '15px', color: message.includes('Error') ? 'red' : 'green', textAlign: 'center' }}>{message}</p>}
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
