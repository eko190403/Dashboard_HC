import { NextRequest, NextResponse } from 'next/server';
import * as xlsx from 'xlsx';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const komoditi = searchParams.get('komoditi');
        const bagian = searchParams.get('bagian');
        const gender = searchParams.get('gender');
        const search = searchParams.get('search') || '';
        const uploadIdParam = searchParams.get('upload_id');

        // Get upload_id
        let uploadId = uploadIdParam;
        if (!uploadId) {
            const { data: latestUpload } = await supabase
                .from('upload_logs')
                .select('id')
                .order('uploaded_at', { ascending: false })
                .limit(1)
                .single();
            if (latestUpload) uploadId = latestUpload.id;
        }

        let query = supabase
            .from('employee_domisili')
            .select('kit_tk, employee_name, gender, kit_mandor, nama_mandor, kasi, indeks_tk, bagian, komoditi, nama_desa, kecamatan, age');

        if (uploadId) query = query.eq('upload_id', uploadId);
        if (komoditi && komoditi !== 'Semua') query = query.eq('komoditi', komoditi);
        if (bagian) query = query.eq('bagian', bagian);
        if (gender === 'L') query = query.in('gender', ['L', 'male', 'Male', 'laki-laki']);
        if (gender === 'P') query = query.in('gender', ['P', 'female', 'Female', 'perempuan']);
        if (search) query = query.ilike('employee_name', `%${search}%`);

        // Fetch all rows (paginated)
        const allData: any[] = [];
        let page = 0;
        const pageSize = 1000;
        while (true) {
            const { data: pageData, error } = await query
                .order('employee_name', { ascending: true })
                .range(page * pageSize, (page + 1) * pageSize - 1);
            if (error) throw error;
            if (pageData && pageData.length > 0) allData.push(...pageData);
            if (!pageData || pageData.length < pageSize) break;
            page++;
        }

        // Build Excel workbook
        const ws_data = [
            ['No', 'KIT TK', 'Nama TK', 'Gender', 'Usia', 'Komoditi', 'Bagian', 'KIT Mandor', 'Nama Mandor', 'Kasi', 'Desa', 'Kecamatan'],
            ...allData.map((r, i) => [
                i + 1,
                r.kit_tk || '-',
                r.employee_name || '-',
                r.gender || '-',
                r.age || '-',
                r.komoditi || '-',
                r.bagian || '-',
                r.kit_mandor || '-',
                r.nama_mandor || '-',
                r.kasi || '-',
                r.nama_desa || '-',
                r.kecamatan || '-',
            ])
        ];

        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.aoa_to_sheet(ws_data);

        // Set column widths
        ws['!cols'] = [
            { wch: 5 }, { wch: 12 }, { wch: 28 }, { wch: 8 }, { wch: 6 },
            { wch: 22 }, { wch: 28 }, { wch: 12 }, { wch: 20 }, { wch: 20 },
            { wch: 22 }, { wch: 18 },
        ];

        xlsx.utils.book_append_sheet(wb, ws, 'Detail TK');

        const buffer = xlsx.write(wb, { bookType: 'xlsx', type: 'buffer' });

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="Detail_TK_${komoditi || 'Semua'}_${new Date().toISOString().split('T')[0]}.xlsx"`,
            },
        });
    } catch (error: any) {
        console.error('Error exporting TK data:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
