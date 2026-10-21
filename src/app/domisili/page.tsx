import DomicileDetailsClient from '@/components/DomicileDetailsClient';
import { getDashboardData } from '@/lib/dashboard-data';

export const revalidate = 0;

export default async function DomicilePage({
    searchParams,
}: {
    searchParams: Promise<{
        upload_id?: string;
        kabupaten?: string;
        kecamatan?: string;
    }>;
}) {
    const { upload_id: uploadId, kabupaten, kecamatan } = await searchParams;
    const dashboard = await getDashboardData(uploadId);

    return (
        <DomicileDetailsClient
            initialData={dashboard.initialData}
            allUploads={dashboard.allUploads}
            currentUploadId={dashboard.currentUploadId}
            initialKabupaten={kabupaten || 'All'}
            initialKecamatan={kecamatan || 'All'}
        />
    );
}
