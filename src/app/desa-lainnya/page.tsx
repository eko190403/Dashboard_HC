import { supabase } from '@/lib/supabase';
import GroupedVillagePageClient from './page-client';

export const revalidate = 0;

export default async function GroupedVillagePage({
    searchParams,
}: {
    searchParams: Promise<{ upload_id?: string | string[] }>;
}) {
    const params = await searchParams;
    const requestedUploadId = Array.isArray(params.upload_id) ? params.upload_id[0] : params.upload_id;

    let uploadId = requestedUploadId || null;
    if (!uploadId) {
        const { data: latestUpload } = await supabase
            .from('upload_logs')
            .select('id')
            .order('uploaded_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        uploadId = latestUpload?.id || null;
    }

    let totalCount = 0;
    if (uploadId) {
        const { data: groupedSummary } = await supabase
            .from('summary_domisili')
            .select('jumlah_tk')
            .eq('upload_id', uploadId)
            .eq('is_grouped', true)
            .maybeSingle();
        totalCount = Number(groupedSummary?.jumlah_tk || 0);
    }

    return <GroupedVillagePageClient uploadId={uploadId} totalCount={totalCount} />;
}