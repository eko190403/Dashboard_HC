import { supabase } from '@/lib/supabase';
import DashboardClient from '@/components/DashboardClient';

export const revalidate = 0; // Disable caching to always show latest data

export default async function DashboardPage({ searchParams }: { searchParams: { upload_id?: string } }) {
    const uploadId = searchParams.upload_id;

    // 1. Fetch all uploads for the dropdown
    const { data: allUploads } = await supabase
        .from('upload_logs')
        .select('*')
        .order('uploaded_at', { ascending: false });

    if (!allUploads || allUploads.length === 0) {
        return <DashboardClient initialData={null} allUploads={[]} currentUploadId={null} />;
    }

    // 2. Determine current upload
    let currentUpload = allUploads[0];
    let currentIndex = 0;
    
    if (uploadId) {
        const foundIndex = allUploads.findIndex(u => String(u.id) === uploadId);
        if (foundIndex !== -1) {
            currentUpload = allUploads[foundIndex];
            currentIndex = foundIndex;
        }
    }

    // 3. Find previous upload for comparison (the one right before the current in time)
    // Since allUploads is sorted descending, the previous upload is at currentIndex + 1
    const previousUpload = currentIndex + 1 < allUploads.length ? allUploads[currentIndex + 1] : null;

    // 4. Fetch summary_domisili for this upload
    const { data: villages, error: villagesError } = await supabase
        .from('summary_domisili')
        .select('*')
        .eq('upload_id', currentUpload.id)
        .order('jumlah_tk', { ascending: false });

    if (villagesError || !villages) {
        return <DashboardClient initialData={null} allUploads={allUploads} currentUploadId={currentUpload.id} />;
    }

    // Process Data for Charts and KPIs
    const totalVillages = villages.length;
    
    // Group by District for Donut Chart
    const districtMap: Record<string, number> = {};
    villages.forEach(v => {
        if (!v.kecamatan || v.kecamatan === 'Tidak Diketahui') return;
        districtMap[v.kecamatan] = (districtMap[v.kecamatan] || 0) + v.jumlah_tk;
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
            percentage: (finalDistrictData[0].value / currentUpload.total_hc) * 100 
          } 
        : { name: '-', percentage: 0 };

    const diffHc = previousUpload ? (currentUpload.total_hc - previousUpload.total_hc) : 0;

    const dashboardData = {
        totalHc: currentUpload.total_hc,
        diffHc, // New comparison diff
        totalVillages,
        dominantDistrict,
        lastUpdated: currentUpload.uploaded_at,
        villageData: villages,
        districtData: finalDistrictData
    };

    return <DashboardClient initialData={dashboardData} allUploads={allUploads} currentUploadId={currentUpload.id} />;
}
