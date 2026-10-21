import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import AuthGuard from '@/components/AuthGuard';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Dashboard Domisili TK | PG 2',
  description: 'Dashboard Mapping & Monitoring Domisili Tenaga Kerja PG 2',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={inter.className}>
      <head />
      <body className="app-layout" style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f0f4f8' }}>
        <AuthGuard>
          <Sidebar />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
            <TopBar />
            <main className="app-main" style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
              {children}
            </main>
          </div>
        </AuthGuard>
      </body>
    </html>
  );
}
