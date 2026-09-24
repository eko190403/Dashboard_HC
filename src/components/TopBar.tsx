'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, LogOut, UserCircle2, Settings } from 'lucide-react';
import { getUser, logout, type User } from '@/lib/auth';

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(() => getUser());
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleUserUpdate = (event: Event) => setUser((event as CustomEvent<User>).detail);
    window.addEventListener('hr-user-updated', handleUserUpdate);
    return () => window.removeEventListener('hr-user-updated', handleUserUpdate);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Don't render on login page
  if (pathname === '/login') return null;

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  if (!user) return null;

  // Get time-based greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Selamat Pagi' : hour < 15 ? 'Selamat Siang' : hour < 18 ? 'Selamat Sore' : 'Selamat Malam';

  return (
    <div className="desktop-topbar" style={{
      position: 'sticky', top: 0, zIndex: 40,
      background: '#ffffff',
      borderBottom: '1px solid #dde3ed',
      padding: '0 28px',
      height: 56,
      display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
      boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
      flexShrink: 0,
    }}>
      {/* Greeting text */}
      <span style={{
        marginRight: 'auto',
        fontSize: 13, color: '#64748b',
        fontFamily: "'Inter', sans-serif",
      }}>
        👋 {greeting}, <strong style={{ color: '#1a2b4a' }}>{user.name}</strong>
      </span>

      {/* Profile button + dropdown */}
      <div style={{ position: 'relative' }} ref={dropdownRef}>
        <button
          id="profile-button"
          onClick={() => setOpen(!open)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '6px 8px', borderRadius: 10,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          {/* User info */}
          <div style={{ textAlign: 'right', lineHeight: 1.25 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1a2b4a' }}>{user.name}</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>{user.role}</div>
          </div>

          {/* Avatar */}
          <div style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #1e5fd4 0%, #3b82f6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 13, fontWeight: 700,
            boxShadow: '0 2px 8px rgba(30,95,212,0.3)',
          }}>
            {user.avatar ? <img src={user.avatar} alt="Foto profil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : user.initials}
          </div>

          <ChevronDown
            size={14} color="#94a3b8"
            style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}
          />
        </button>

        {/* Dropdown menu */}
        {open && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0',
            boxShadow: '0 12px 32px rgba(0,0,0,0.14)',
            minWidth: 200, padding: '8px',
            animation: 'fadeSlideUp 0.15s ease both',
            zIndex: 200,
          }}>
            {/* Profile info block */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 14px 12px', marginBottom: 4,
              borderBottom: '1px solid #f1f5f9',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #1e5fd4, #3b82f6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 14, fontWeight: 700,
              }}>
                {user.avatar ? <img src={user.avatar} alt="Foto profil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : user.initials}
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>{user.name}</div>
                <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 1 }}>{user.role}</div>
              </div>
            </div>

            {/* Profile menu item */}
            <button onClick={() => { setOpen(false); router.push('/profile'); }} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 12px', borderRadius: 8, border: 'none',
              background: 'none', cursor: 'pointer',
              fontSize: 13, color: '#374151', fontWeight: 500,
              transition: 'background 0.12s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <UserCircle2 size={15} color="#64748b" />
              Profil Saya
            </button>

            <button onClick={() => { setOpen(false); router.push('/settings'); }} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 12px', borderRadius: 8, border: 'none',
              background: 'none', cursor: 'pointer',
              fontSize: 13, color: '#374151', fontWeight: 500,
              transition: 'background 0.12s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <Settings size={15} color="#64748b" />
              Pengaturan
            </button>

            {/* Logout */}
            <button
              id="logout-button"
              onClick={handleLogout}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 12px', borderRadius: 8, border: 'none',
                background: 'none', cursor: 'pointer',
                fontSize: 13, color: '#dc2626', fontWeight: 500,
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <LogOut size={15} />
              Keluar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
