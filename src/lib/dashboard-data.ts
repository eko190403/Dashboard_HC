import { supabase } from '@/lib/supabase';
import type { DashboardData, UploadOption } from '@/lib/dashboard-types';

export async function getDashboardData(requestedUploadId?: string): Promise<{
    initialData: DashboardData | null;
    allUploads: UploadOption[];
    currentUploadId: string | null;
}> {
    const { data: uploadRows, error: uploadsError } = await supabase
        .from('upload_logs')
        .select('id, uploaded_at, total_hc')
        .order('uploaded_at', { ascending: false });

    if (uploadsError) throw uploadsError;

    const allUploads = (uploadRows || []) as (UploadOption & { total_hc: number })[];
    if (!allUploads.length) {
        return { initialData: null, allUploads: [], currentUploadId: null };
    }

    let currentIndex = 0;
    if (requestedUploadId) {
        const foundIndex = allUploads.findIndex(upload => String(upload.id) === requestedUploadId);
        if (foundIndex !== -1) currentIndex = foundIndex;
    }

    const currentUpload = allUploads[currentIndex];
    const previousUpload = allUploads[currentIndex + 1] || null;

    const unknownDomicileQueries = await Promise.all([
        supabase
            .from('employee_domisili')
            .select('id', { count: 'exact', head: true })
            .eq('upload_id', currentUpload.id)
            .eq('nama_desa', 'Tidak Diketahui'),
        ...['', '-', '.', '0'].map(address => supabase
            .from('employee_domisili')
            .select('id', { count: 'exact', head: true })
            .eq('upload_id', currentUpload.id)
            .eq('street_address', address)
            .neq('nama_desa', 'Tidak Diketahui')),
        supabase
            .from('employee_domisili')
            .select('id', { count: 'exact', head: true })
            .eq('upload_id', currentUpload.id)
            .is('street_address', null)
            .neq('nama_desa', 'Tidak Diketahui'),
    ]);
    const unknownDomicileCount = unknownDomicileQueries.every(result => !result.error)
        ? unknownDomicileQueries.reduce((total, result) => total + (result.count || 0), 0)
        : null;

    const { data: villages, error: villagesError } = await supabase
        .from('summary_domisili')
        .select('*')
        .eq('upload_id', currentUpload.id)
        .order('jumlah_tk', { ascending: false });

    if (villagesError) throw villagesError;

    const villageData = villages || [];
    const districtMap: Record<string, number> = {};
    villageData.forEach(village => {
        if (!village.kecamatan || village.kecamatan === 'Tidak Diketahui') return;
        districtMap[village.kecamatan] = (districtMap[village.kecamatan] || 0) + village.jumlah_tk;
    });

    const districtData = Object.entries(districtMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    const topDistricts = districtData.slice(0, 10);
    const otherDistrictsCount = districtData.slice(10).reduce((sum, item) => sum + item.value, 0);
    const finalDistrictData = [...topDistricts];
    if (otherDistrictsCount > 0) {
        finalDistrictData.push({ name: 'Kecamatan Lainnya', value: otherDistrictsCount });
    }

    const dominantDistrict = finalDistrictData.length > 0
        ? {
            name: finalDistrictData[0].name,
            percentage: currentUpload.total_hc
                ? (finalDistrictData[0].value / currentUpload.total_hc) * 100
                : 0,
        }
        : { name: '-', percentage: 0 };

    const diffHc = previousUpload ? currentUpload.total_hc - previousUpload.total_hc : 0;
    const diffPercent = previousUpload?.total_hc
        ? (diffHc / previousUpload.total_hc) * 100
        : 0;

    return {
        initialData: {
            totalHc: currentUpload.total_hc,
            unknownDomicileCount,
            diffHc,
            diffPercent,
            previousUploadDate: previousUpload?.uploaded_at ?? null,
            totalVillages: villageData.length,
            dominantDistrict,
            lastUpdated: currentUpload.uploaded_at,
            villageData,
            districtData: finalDistrictData,
        },
        allUploads,
        currentUploadId: String(currentUpload.id),
    };
}
