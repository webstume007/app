import { Analytics } from '@vercel/analytics/next';
import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isStandalone) setShowInstallBanner(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowInstallBanner(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isStandalone]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try {
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setShowInstallBanner(false);
    } finally {
      setDeferredPrompt(null);
    }
  };

  const shouldShowGlobalInstallBanner =
    Boolean(deferredPrompt) &&
    showInstallBanner &&
    !isStandalone &&
    router.pathname !== '/' &&
    router.pathname !== '/tlogin';

  return (
    <>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap" rel="stylesheet" />
        <meta name="theme-color" content="#002147" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      </Head>
      {shouldShowGlobalInstallBanner && (
        <div
          style={{
            position: 'fixed',
            left: 12,
            right: 12,
            bottom: 12,
            zIndex: 9999,
            background: '#17a2b8',
            border: '1px solid #117a8b',
            borderRadius: 12,
            padding: '10px 12px',
            color: 'white',
            fontFamily: "'Roboto', sans-serif",
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            boxShadow: '0 6px 20px rgba(0,0,0,0.15)'
          }}
        >
          <div style={{ lineHeight: 1.15 }}>
            <b style={{ display: 'block', fontSize: '0.85rem' }}>Install App</b>
            <span style={{ fontSize: '0.7rem', opacity: 0.95 }}>Add IUB Assistant to your home screen.</span>
          </div>
          <button
            onClick={handleInstallClick}
            style={{
              background: '#fff',
              color: '#17a2b8',
              border: 'none',
              borderRadius: 8,
              padding: '8px 12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            Install
          </button>
        </div>
      )}
      <Component {...pageProps} />
      <Analytics />
    </>
  );
}

export default MyApp;
