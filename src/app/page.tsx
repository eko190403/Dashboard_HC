import DashboardClient from '@/components/DashboardClient';
import { getDashboardData } from '@/lib/dashboard-data';

export const revalidate = 0;

export default async function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ upload_id?: string }>;
}) {
    const { upload_id: requestedUploadId } = await searchParams;
    const dashboard = await getDashboardData(requestedUploadId);

    return (
        <DashboardClient
            initialData={dashboard.initialData}
            allUploads={dashboard.allUploads}
            currentUploadId={dashboard.currentUploadId}
        />
    );
}
