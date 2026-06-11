'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { exchangeCode } from '@/lib/auth';
import { Suspense } from 'react';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('Connecting to Spotify...');

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state');

    if (error) {
      setError(`Spotify denied access: ${error}`);
      return;
    }

    if (!code) {
      setError('No authorization code received.');
      return;
    }

    const savedState = sessionStorage.getItem('auth_state');
    if (state && savedState && state !== savedState) {
      setError('Security check failed. Please try again.');
      return;
    }

    async function handleExchange() {
      try {
        setStatus('Exchanging tokens...');
        await exchangeCode(code!);
        setStatus('Success! Redirecting...');
        router.replace('/dashboard');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Authentication failed');
      }
    }

    handleExchange();
  }, [searchParams, router]);

  if (error) {
    return (
      <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '20px', padding: '24px' }}>
        <div style={{ fontSize: '48px' }}>😕</div>
        <h2 style={{ fontFamily: 'Space Grotesk', fontSize: '24px', fontWeight: 700 }}>Something went wrong</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', maxWidth: '400px' }}>{error}</p>
        <a href="/" className="btn btn-primary">Try Again</a>
      </main>
    );
  }

  return (
    <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '20px' }}>
      <div style={{ position: 'relative', width: '64px', height: '64px' }}>
        <div style={{ width: '64px', height: '64px', border: '3px solid rgba(29,185,84,0.2)', borderTop: '3px solid #1DB954', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
      <div style={{ fontFamily: 'Space Grotesk', fontSize: '18px', fontWeight: 600, color: '#fff' }}>
        {status}
      </div>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>Securing your session with Spotify</p>
    </main>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ width: '48px', height: '48px', border: '3px solid rgba(29,185,84,0.2)', borderTop: '3px solid #1DB954', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </main>
    }>
      <CallbackHandler />
    </Suspense>
  );
}
