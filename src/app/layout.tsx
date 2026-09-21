import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'Dashboard Domisili TK | PG 2',
  description: 'Dashboard Mapping & Monitoring Domisili Tenaga Kerja PG 2',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="app-layout" style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f0f4f8' }}>
        <Sidebar />
        <main className="app-main" style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
