import { Suspense } from 'react';
import AgeDetailClient from './page-client';

export default function AgeDetailPage() {
    return (
        <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Memuat...</div>}>
            <AgeDetailClient />
        </Suspense>
    );
}
