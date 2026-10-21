import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;
const QUERY_CHUNK_SIZE = 50;
const READ_BATCH_SIZE = 1000;

interface GroupedVillageEmployee {
    kit_tk: string | null;
    employee_name: string | null;
    nama_desa: string | null;
    kecamatan: string | null;
    kabupaten: string | null;
    gender: string | null;
    bagian: string | null;
    nama_mandor: string | null;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const uploadId = searchParams.get('upload_id');
        const kabupatenFilter = searchParams.get('kabupaten');
        const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);
        const search = (searchParams.get('search') || '').trim().toLocaleLowerCase('id-ID');

        if (!uploadId) {
            return NextResponse.json({ error: 'Upload data tidak ditemukan.' }, { status: 400 });
        }

        const villageCounts = new Map<string, { village: string; district: string; kabupaten: string; count: number }>();
        let offset = 0;
        while (true) {
            const { data, error } = await supabase
                .from('employee_domisili')
                .select('nama_desa,kecamatan,kabupaten')
                .eq('upload_id', uploadId)
                .range(offset, offset + READ_BATCH_SIZE - 1);
            if (error) throw error;
            if (!data?.length) break;

            for (const employee of data) {
                const village = String(employee.nama_desa || '').trim();
                const district = String(employee.kecamatan || '');
                const kabupaten = String(employee.kabupaten || 'Tidak Diketahui');
                if (!village || (kabupatenFilter && kabupaten !== kabupatenFilter)) continue;

                const key = JSON.stringify([kabupaten, district, village]);
                const existing = villageCounts.get(key);
                villageCounts.set(key, {
                    village,
                    district,
                    kabupaten,
                    count: (existing?.count || 0) + 1,
                });
            }

            if (data.length < READ_BATCH_SIZE) break;
            offset += READ_BATCH_SIZE;
        }

        const groupedVillageKeys = new Set([...villageCounts]
            .filter(([, village]) => village.count < 20 || village.village.startsWith('Format') || village.village.startsWith('Lokasi'))
            .map(([key]) => key));
        const groupedVillageNames = [...new Set([...villageCounts]
            .filter(([key]) => groupedVillageKeys.has(key))
            .map(([, village]) => village.village))];
        if (!groupedVillageKeys.size) {
            return NextResponse.json({ data: [], page, totalPages: 1, totalCount: 0, pageSize: PAGE_SIZE });
        }

        const employees: GroupedVillageEmployee[] = [];
        for (let index = 0; index < groupedVillageNames.length; index += QUERY_CHUNK_SIZE) {
            const { data, error } = await supabase
                .from('employee_domisili')
                .select('kit_tk, employee_name, nama_desa, kecamatan, kabupaten, gender, bagian, nama_mandor')
                .eq('upload_id', uploadId)
                .in('nama_desa', groupedVillageNames.slice(index, index + QUERY_CHUNK_SIZE));
            if (error) throw error;
            employees.push(...(data || []).filter(employee => groupedVillageKeys.has(JSON.stringify([
                employee.kabupaten || 'Tidak Diketahui',
                employee.kecamatan || '',
                employee.nama_desa || '',
            ]))));
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