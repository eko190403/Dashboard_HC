import { supabase } from '@/lib/supabase';
import GroupedVillagePageClient from './page-client';

export const revalidate = 0;

export default async function GroupedVillagePage({
    searchParams,
}: {
    searchParams: Promise<{ upload_id?: string | string[]; kabupaten?: string | string[] }>;
}) {
    const params = await searchParams;
    const requestedUploadId = Array.isArray(params.upload_id) ? params.upload_id[0] : params.upload_id;
    const requestedKabupaten = Array.isArray(params.kabupaten) ? params.kabupaten[0] : params.kabupaten;

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
            .select('jumlah_tk,kabupaten')
            .eq('upload_id', uploadId)
            .eq('is_grouped', true);
        totalCount = (groupedSummary || [])
            .filter(row => !requestedKabupaten || (row.kabupaten || 'Tidak Diketahui') === requestedKabupaten)
            .reduce((total, row) => total + Number(row.jumlah_tk || 0), 0);
    }

    return <GroupedVillagePageClient uploadId={uploadId} kabupaten={requestedKabupaten || null} totalCount={totalCount} />;
}