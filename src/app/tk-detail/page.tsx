import { Suspense } from 'react';
import DetailTKPage from './page-client';

export const metadata = {
    title: 'Detail Tenaga Kerja | HR Dashboard PG 2',
    description: 'Halaman detail data tenaga kerja berdasarkan komoditi dan bagian',
};

export default function Page() {
    return (
        <Suspense fallback={<div style={{ padding: 40, color: '#64748b' }}>Memuat halaman...</div>}>
            <DetailTKPage />
        </Suspense>
    );
}
