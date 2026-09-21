import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'Dashboard Domisili TK | PG 2',
  description: 'Dashboard Mapping & Monitoring Domisili Tenaga Kerja PG 2',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f0f4f8' }}>
        <Sidebar />
        <main style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
