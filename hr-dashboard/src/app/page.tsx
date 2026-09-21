import { supabase } from '@/lib/supabase';
import DashboardClient from '@/components/DashboardClient';

export const revalidate = 0; // Disable caching to always show latest data

export default async function DashboardPage() {
    // 1. Get latest upload_id
    const { data: latestUpload, error: uploadError } = await supabase
        .from('upload_logs')
        .select('*')
        .order('uploaded_at', { ascending: false })
        .limit(1)
        .single();

    if (uploadError || !latestUpload) {
        return <DashboardClient initialData={null} />;
    }

    // 2. Fetch summary_domisili for this upload
    const { data: villages, error: villagesError } = await supabase
        .from('summary_domisili')
        .select('*')
        .eq('upload_id', latestUpload.id)
        .order('jumlah_tk', { ascending: false });

    if (villagesError || !villages) {
        return <DashboardClient initialData={null} />;
    }

    // 3. Process Data for Charts and KPIs
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
            percentage: (finalDistrictData[0].value / latestUpload.total_hc) * 100 
          } 
        : { name: '-', percentage: 0 };

    const dashboardData = {
        totalHc: latestUpload.total_hc,
        totalVillages,
        dominantDistrict,
        lastUpdated: latestUpload.uploaded_at,
        villageData: villages,
        districtData: finalDistrictData
    };

    return <DashboardClient initialData={dashboardData} />;
}
