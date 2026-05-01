import { useEffect } from 'react';
import Head from 'next/head';

export default function VerifySuccess() {
    useEffect(() => {
        // Optional: If they are on a phone, you can try to redirect them back to your app URL
        // setTimeout(() => { window.location.href = "your-app-scheme://"; }, 3000);
    }, []);

    return (
        <div style={{ background: '#002147', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif', textAlign: 'center', color: 'white', padding: '20px' }}>
            <Head><title>Verified | IUB</title></Head>
            <div style={{ background: 'white', padding: '40px', borderRadius: '15px', color: '#333', maxWidth: '400px', width: '100%' }}>
                <div style={{ fontSize: '50px', marginBottom: '20px' }}>✅</div>
                <h2 style={{ color: '#002147', margin: '0 0 10px 0' }}>Email Verified!</h2>
                <p style={{ color: '#666', fontSize: '0.9rem' }}>Your account is now active. You can close this tab and log in to the IUB Assistant app.</p>
                <button onClick={() => window.close()} style={{ marginTop: '20px', padding: '12px 25px', background: '#F2A900', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Close Tab</button>
            </div>
        </div>
    );
}
