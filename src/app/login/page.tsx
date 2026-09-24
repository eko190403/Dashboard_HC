'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { login, isAuthenticated } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated()) router.replace('/');
  }, [router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const user = login(username, password);
    if (user) {
      router.replace('/');
    } else {
      setError('Username atau password salah. Silakan coba lagi.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', system-ui, sans-serif",
      background: 'linear-gradient(135deg, #0f172a 0%, #1a3358 50%, #0f172a 100%)',
      overflow: 'hidden',
    }}>
      {/* Decorative background blobs */}
      <div style={{ position: 'absolute', top: -250, right: -150, width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 65%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -200, left: -120, width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,165,115,0.09) 0%, transparent 65%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '45%', left: '12%', width: 250, height: 250, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 65%)', pointerEvents: 'none' }} />

      {/* Subtle grid pattern */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
        backgroundSize: '44px 44px',
      }} />

      {/* Card */}
      <div style={{
        position: 'relative', zIndex: 1,
        background: '#ffffff',
        borderRadius: 24,
        padding: '48px 44px',
        width: '100%', maxWidth: 420,
        margin: '0 16px',
        boxShadow: '0 40px 100px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08)',
        animation: 'fadeSlideUp 0.4s cubic-bezier(0.16,1,0.3,1) both',
      }}>
        {/* Logo & branding */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 96, height: 96,
            background: '#fff',
            borderRadius: 20, margin: '0 auto 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 16px 40px rgba(30,95,212,0.2)',
            overflow: 'hidden',
          }}>
            <img src="/logo.png" alt="Logo PG 2 Estate" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.025em' }}>
            Selamat Datang
          </h1>
          <p style={{ margin: 0, fontSize: 13.5, color: '#64748b', lineHeight: 1.5 }}>
            Masuk ke <strong style={{ color: '#1e5fd4' }}>HR Dashboard</strong> · PG 2 Estate
          </p>
        </div>

        <form onSubmit={handleSubmit} autoComplete="off">
          {/* Username field */}
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="login-username" style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 7, letterSpacing: '0.01em' }}>
              Username
            </label>
            <input
              id="login-username"
              type="text"
              value={username}
              onChange={e => { setUsername(e.target.value); setError(''); }}
              placeholder="Masukkan username Anda"
              required
              autoComplete="username"
              style={{
                width: '100%', padding: '12px 14px',
                border: `1.5px solid ${error ? '#fca5a5' : '#e2e8f0'}`,
                borderRadius: 10, fontSize: 14, outline: 'none',
                background: '#f8fafc', color: '#0f172a',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
              }}
              onFocus={e => { e.target.style.borderColor = '#1e5fd4'; e.target.style.boxShadow = '0 0 0 3px rgba(30,95,212,0.1)'; e.target.style.background = '#fff'; }}
              onBlur={e => { e.target.style.borderColor = error ? '#fca5a5' : '#e2e8f0'; e.target.style.boxShadow = 'none'; e.target.style.background = '#f8fafc'; }}
            />
          </div>

          {/* Password field */}
          <div style={{ marginBottom: 8 }}>
            <label htmlFor="login-password" style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 7, letterSpacing: '0.01em' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="Masukkan password Anda"
                required
                autoComplete="current-password"
                style={{
                  width: '100%', padding: '12px 44px 12px 14px',
                  border: `1.5px solid ${error ? '#fca5a5' : '#e2e8f0'}`,
                  borderRadius: 10, fontSize: 14, outline: 'none',
                  background: '#f8fafc', color: '#0f172a',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
                }}
                onFocus={e => { e.target.style.borderColor = '#1e5fd4'; e.target.style.boxShadow = '0 0 0 3px rgba(30,95,212,0.1)'; e.target.style.background = '#fff'; }}
                onBlur={e => { e.target.style.borderColor = error ? '#fca5a5' : '#e2e8f0'; e.target.style.boxShadow = 'none'; e.target.style.background = '#f8fafc'; }}
              />
              <button type="button" onClick={() => setShowPw(!showPw)} style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#94a3b8', display: 'flex', alignItems: 'center', padding: 4, borderRadius: 4,
                transition: 'color 0.15s',
              }}
                onMouseEnter={e => (e.currentTarget.style.color = '#64748b')}
                onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 8, padding: '10px 14px', marginTop: 12,
              fontSize: 13, color: '#dc2626',
              animation: 'fadeSlideUp 0.2s ease both',
            }}>
              <span style={{ fontSize: 16 }}>⚠️</span>
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            id="login-submit"
            disabled={loading}
            style={{
              width: '100%', marginTop: 28, padding: '14px',
              background: loading ? '#93b8f0' : 'linear-gradient(135deg, #1e5fd4 0%, #3b82f6 100%)',
              color: '#fff', border: 'none', borderRadius: 10,
              fontSize: 14, fontWeight: 700, letterSpacing: '0.01em',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: loading ? 'none' : '0 6px 20px rgba(30,95,212,0.38)',
              transition: 'transform 0.15s, box-shadow 0.2s',
            }}
            onMouseEnter={e => { if (!loading) { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 10px 28px rgba(30,95,212,0.45)'; } }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = loading ? 'none' : '0 6px 20px rgba(30,95,212,0.38)'; }}
          >
            {loading ? (
              <>
                <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Memverifikasi...
              </>
            ) : (
              <>
                <LogIn size={15} />
                Masuk ke Dashboard
              </>
            )}
          </button>
        </form>

        {/* Demo credentials */}
        <div style={{
          marginTop: 24, padding: '12px 16px',
          background: '#f8fafc', borderRadius: 10,
          border: '1px dashed #cbd5e1', fontSize: 12,
          color: '#64748b', textAlign: 'center', lineHeight: 1.8,
        }}>
          💡 Demo login: <span style={{ fontFamily: 'monospace', background: '#e2e8f0', padding: '1px 6px', borderRadius: 4 }}>admin</span> / <span style={{ fontFamily: 'monospace', background: '#e2e8f0', padding: '1px 6px', borderRadius: 4 }}>admin123</span>
        </div>
      </div>
    </div>
  );
}
