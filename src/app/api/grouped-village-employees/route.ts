import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;
const QUERY_CHUNK_SIZE = 50;
const READ_BATCH_SIZE = 1000;

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const uploadId = searchParams.get('upload_id');
        const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);
        const search = (searchParams.get('search') || '').trim().toLocaleLowerCase('id-ID');

        if (!uploadId) {
            return NextResponse.json({ error: 'Upload data tidak ditemukan.' }, { status: 400 });
        }

        const villageCounts = new Map<string, number>();
        let offset = 0;
        while (true) {
            const { data, error } = await supabase
                .from('employee_domisili')
                .select('nama_desa')
                .eq('upload_id', uploadId)
                .range(offset, offset + READ_BATCH_SIZE - 1);
            if (error) throw error;
            if (!data?.length) break;

            for (const employee of data) {
                const village = String(employee.nama_desa || '').trim();
                if (village) villageCounts.set(village, (villageCounts.get(village) || 0) + 1);
            }

            if (data.length < READ_BATCH_SIZE) break;
            offset += READ_BATCH_SIZE;
        }

        const groupedVillageNames = [...villageCounts]
            .filter(([village, count]) => count < 20 || village.startsWith('Format') || village.startsWith('Lokasi'))
            .map(([village]) => village);
        if (!groupedVillageNames.length) {
            return NextResponse.json({ data: [], page, totalPages: 1, totalCount: 0, pageSize: PAGE_SIZE });
        }

        const employees: any[] = [];
        for (let index = 0; index < groupedVillageNames.length; index += QUERY_CHUNK_SIZE) {
            const { data, error } = await supabase
                .from('employee_domisili')
                .select('kit_tk, employee_name, nama_desa, kecamatan, gender, bagian, nama_mandor')
                .eq('upload_id', uploadId)
                .in('nama_desa', groupedVillageNames.slice(index, index + QUERY_CHUNK_SIZE));
            if (error) throw error;
            employees.push(...(data || []));
        }

        const filteredEmployees = employees
            .filter(employee => !search || [employee.employee_name, employee.nama_desa]
                .some(value => String(value || '').toLocaleLowerCase('id-ID').includes(search)))
            .sort((a, b) => String(a.employee_name || '').localeCompare(String(b.employee_name || ''), 'id-ID'));
        const totalCount = filteredEmployees.length;
        const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
        const safePage = Math.min(page, totalPages);
        const start = (safePage - 1) * PAGE_SIZE;

        return NextResponse.json({
            data: filteredEmployees.slice(start, start + PAGE_SIZE),
            page: safePage,
            totalPages,
            totalCount,
            pageSize: PAGE_SIZE,
        });
    } catch (error) {
        console.error('Error fetching grouped village employees:', error);
        return NextResponse.json({ error: 'Gagal memuat daftar karyawan Desa Lainnya.' }, { status: 500 });
    }
}