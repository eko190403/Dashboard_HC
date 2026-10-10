import { NextRequest, NextResponse } from 'next/server';
import * as xlsx from 'xlsx';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const namaDesa = searchParams.get('nama_desa')?.trim();
        if (!namaDesa) {
            return NextResponse.json({ error: 'Nama desa wajib diisi.' }, { status: 400 });
        }

        let uploadId = searchParams.get('upload_id');
        if (!uploadId) {
            const { data: latestUpload, error } = await supabase
                .from('upload_logs')
                .select('id')
                .order('uploaded_at', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            if (!latestUpload) {
                return NextResponse.json({ error: 'Belum ada data yang diunggah.' }, { status: 404 });
            }
            uploadId = latestUpload.id;
        }

        const allData: {
            kit_tk: string | null;
            employee_name: string | null;
            birth_date: string | null;
            age: number | null;
            gender: string | null;
            employment_status: string | null;
            street_address: string | null;
            komoditi: string | null;
            bagian: string | null;
            kit_mandor: string | null;
            nama_mandor: string | null;
            kasi: string | null;
            indeks_tk: string | null;
            nama_desa: string | null;
            kecamatan: string | null;
        }[] = [];
        const pageSize = 1000;

        for (let from = 0; ; from += pageSize) {
            const { data, error } = await supabase
                .from('employee_domisili')
                .select('kit_tk, employee_name, birth_date, age, gender, employment_status, street_address, komoditi, bagian, kit_mandor, nama_mandor, kasi, indeks_tk, nama_desa, kecamatan')
                .eq('upload_id', uploadId)
                .eq('nama_desa', namaDesa)
                .order('employee_name', { ascending: true })
                .range(from, from + pageSize - 1);

            if (error) throw error;
            if (data?.length) allData.push(...data);
            if (!data || data.length < pageSize) break;
        }

        const sheetData = [
            ['No', 'KIT TK', 'Nama Karyawan', 'Tanggal Lahir', 'Umur', 'Gender', 'Status', 'Alamat Lengkap', 'Komoditi', 'Bagian', 'KIT Mandor', 'Nama Mandor', 'Kasi', 'Indeks TK', 'Desa', 'Kecamatan'],
            ...allData.map((row, index) => [
                index + 1,
                row.kit_tk || '-',
                row.employee_name || '-',
                row.birth_date || '-',
                row.age ?? '-',
                row.gender || '-',
                row.employment_status || '-',
                row.street_address || '-',
                row.komoditi || '-',
                row.bagian || '-',
                row.kit_mandor || '-',
                row.nama_mandor || '-',
                row.kasi || '-',
                row.indeks_tk || '-',
                row.nama_desa || '-',
                row.kecamatan || '-',
            ]),
        ];

        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.aoa_to_sheet(sheetData);
        worksheet['!cols'] = [
            { wch: 5 }, { wch: 14 }, { wch: 28 }, { wch: 16 }, { wch: 8 }, { wch: 12 },
            { wch: 16 }, { wch: 36 }, { wch: 22 }, { wch: 28 }, { wch: 14 }, { wch: 24 },
            { wch: 20 }, { wch: 14 }, { wch: 24 }, { wch: 20 },
        ];
        const sheetName = `Desa ${namaDesa}`.replace(/[\[\]:*?/\\]/g, '_').slice(0, 31);
        xlsx.utils.book_append_sheet(workbook, worksheet, sheetName || 'Data Desa');

        const buffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });
        const safeVillageName = namaDesa
            .normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9_-]+/g, '_')
            .replace(/^_+|_+$/g, '') || 'Desa';

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="Data_Desa_${safeVillageName}_${new Date().toISOString().slice(0, 10)}.xlsx"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        console.error('Error exporting village data:', error);
        const message = error instanceof Error ? error.message : 'Gagal mengekspor data desa.';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
