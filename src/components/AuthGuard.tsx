'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { hasValidSession } from '@/lib/auth';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authenticatedPath, setAuthenticatedPath] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (pathname === '/login') return () => { active = false; };
    hasValidSession()
      .then(isValid => {
        if (!active) return;
        if (!isValid) router.replace('/login');
        else setAuthenticatedPath(pathname);
      })
      .catch(() => {
        if (active) router.replace('/login');
      });
    return () => { active = false; };
  }, [pathname, router]);

  // On login page, always render immediately (login covers everything)
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // On protected pages, show loading until auth is confirmed
  if (authenticatedPath !== pathname) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: '#f0f4f8',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 36, height: 36, margin: '0 auto 12px',
            border: '3px solid #e2e8f0', borderTopColor: '#1e5fd4',
            borderRadius: '50%', animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ margin: 0, color: '#94a3b8', fontSize: 13, fontFamily: "'Inter', sans-serif" }}>Memuat...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
