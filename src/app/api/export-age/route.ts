import { NextRequest, NextResponse } from 'next/server';
import * as xlsx from 'xlsx';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const range = searchParams.get('range') || '';
        const komoditi = searchParams.get('komoditi') || '';
        const search = searchParams.get('search') || '';
        const uploadIdParam = searchParams.get('upload_id');

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
            .select('kit_tk, employee_name, age, gender, komoditi, bagian, nama_desa, kecamatan');

        if (uploadId) query = query.eq('upload_id', uploadId);
        if (komoditi && komoditi !== 'Semua') query = query.eq('komoditi', komoditi);

        // Parse age range
        if (range === '55+' || range === '> 55') {
            query = query.gte('age', 56);
        } else if (range.includes('-')) {
            const [min, max] = range.split('-').map(s => parseInt(s.trim()));
            if (!isNaN(min) && !isNaN(max)) {
                query = query.gte('age', min).lte('age', max);
            }
        }

        if (search) query = query.ilike('employee_name', `%${search}%`);

        // Fetch all rows
        const allData: any[] = [];
        let page = 0;
        const pageSize = 1000;
        while (true) {
            const { data: pageData, error } = await query
                .order('age', { ascending: true })
                .range(page * pageSize, (page + 1) * pageSize - 1);
            if (error) throw error;
            if (pageData && pageData.length > 0) allData.push(...pageData);
            if (!pageData || pageData.length < pageSize) break;
            page++;
        }

        // Build Excel
        const ws_data = [
            ['No', 'KIT TK', 'Nama TK', 'Usia', 'Gender', 'Komoditi', 'Bagian', 'Desa', 'Kecamatan'],
            ...allData.map((r, i) => [
                i + 1,
                r.kit_tk || '-',
                r.employee_name || '-',
                r.age || '-',
                r.gender || '-',
                r.komoditi || '-',
                r.bagian || '-',
                r.nama_desa || '-',
                r.kecamatan || '-',
            ])
        ];

        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.aoa_to_sheet(ws_data);
        ws['!cols'] = [
            { wch: 5 }, { wch: 12 }, { wch: 28 }, { wch: 6 }, { wch: 8 },
            { wch: 22 }, { wch: 28 }, { wch: 22 }, { wch: 18 },
        ];
        xlsx.utils.book_append_sheet(wb, ws, 'Detail Usia');

        const buffer = xlsx.write(wb, { bookType: 'xlsx', type: 'buffer' });

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="Detail_Usia_${range || 'Semua'}_${new Date().toISOString().split('T')[0]}.xlsx"`,
            },
        });
    } catch (error: any) {
        console.error('Error exporting age data:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
