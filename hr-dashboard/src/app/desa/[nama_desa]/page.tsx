import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ArrowLeft, Users, MapPin } from 'lucide-react';
import ClientEmployeeTable from '@/components/ClientEmployeeTable';

export const revalidate = 0;

export default async function VillagePage({ params }: { params: Promise<{ nama_desa: string }> }) {
    const { nama_desa } = await params;
    const decodedNamaDesa = decodeURIComponent(nama_desa);

    // 1. Get latest upload_id
    const { data: latestUpload, error: uploadError } = await supabase
        .from('upload_logs')
        .select('*')
        .order('uploaded_at', { ascending: false })
        .limit(1)
        .single();

    let employees: any[] = [];
    let kecamatan = '';
    let summary: any = null;

    if (!uploadError && latestUpload) {
        // Fetch employees
        const { data: empData, error: empError } = await supabase
            .from('employee_domisili')
            .select('*')
            .eq('upload_id', latestUpload.id)
            .eq('nama_desa', decodedNamaDesa)
            .order('employee_name', { ascending: true });
        
        if (!empError && empData) {
            employees = empData;
            if (employees.length > 0) {
                kecamatan = employees[0].kecamatan;
            }
        }

        // Fetch summary info for this village
        const { data: sumData } = await supabase
            .from('summary_domisili')
            .select('*')
            .eq('upload_id', latestUpload.id)
            .eq('nama_desa', decodedNamaDesa)
            .single();
        
        if (sumData) {
            summary = sumData;
        }
    }

    const totalLaki = employees.filter(e => e.gender === 'male' || e.gender === 'laki-laki').length;
    const totalPerempuan = employees.filter(e => e.gender === 'female' || e.gender === 'perempuan').length;

    return (
        <div style={{ padding: '28px 32px', maxWidth: 1280, margin: '0 auto' }}>
            
            <div style={{ marginBottom: 24 }}>
                <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#5a7184', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
                    <ArrowLeft size={16} /> Kembali ke Dashboard
                </Link>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1a2b4a', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <MapPin size={24} color="#1e5fd4" />
                        Desa {decodedNamaDesa}
                    </h1>
                    <p style={{ margin: '6px 0 0', fontSize: 14, color: '#5a7184' }}>
                        Kecamatan: {kecamatan || '—'}
                    </p>
                </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                <div className="kpi-card" style={{ borderTop: `3px solid #1e5fd4` }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#5a7184', textTransform: 'uppercase' }}>Total Tenaga Kerja</p>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: '#e9f0fc', color: '#1e5fd4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Users size={20} />
                        </div>
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: '#1a2b4a', marginBottom: 4 }}>
                        {employees.length.toLocaleString('id-ID')}
                    </div>
                </div>

                <div className="kpi-card" style={{ borderTop: `3px solid #4b80dc` }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#5a7184', textTransform: 'uppercase' }}>Laki-laki</p>
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: '#1e5fd4', marginBottom: 4 }}>
                        {summary ? summary.jumlah_laki : totalLaki}
                    </div>
                </div>

                <div className="kpi-card" style={{ borderTop: `3px solid #e11d48` }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#5a7184', textTransform: 'uppercase' }}>Perempuan</p>
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: '#e11d48', marginBottom: 4 }}>
                        {summary ? summary.jumlah_perempuan : totalPerempuan}
                    </div>
                </div>
            </div>

            {/* Data Table with Pagination */}
            <ClientEmployeeTable employees={employees} latestUpload={latestUpload} />

        </div>
    );
}
