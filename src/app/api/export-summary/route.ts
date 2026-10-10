import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { supabase } from '@/lib/supabase';
import { addSummaryWorksheet, type SummaryRow } from '@/lib/summary-workbook';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type EmployeeSummaryRecord = {
    nama_desa: string | null;
    kecamatan: string | null;
};

async function getLatestUpload() {
    const { data, error } = await supabase
        .from('upload_logs')
        .select('id, uploaded_at, total_hc')
        .order('uploaded_at', { ascending: false })
        .limit(1)
        .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const uploadIdParam = searchParams.get('upload_id');
        const uploadResult = uploadIdParam
            ? await supabase
                .from('upload_logs')
                .select('id, uploaded_at, total_hc')
                .eq('id', uploadIdParam)
                .single()
            : { data: await getLatestUpload(), error: null };

        if (uploadResult.error) throw uploadResult.error;
        const upload = uploadResult.data;
        if (!upload) {
            return NextResponse.json({ error: 'Belum ada data yang diunggah.' }, { status: 404 });
        }

        const uploadId = String(upload.id);
        const totalHc = Number(upload.total_hc);
        if (!totalHc || totalHc < 1) {
            return NextResponse.json({ error: 'Data unggahan tidak memiliki total HC yang valid.' }, { status: 422 });
        }

        const pageSize = 1000;
        const villageCounts = new Map<string, number>();
        const districtCounts = new Map<string, number>();
        for (let from = 0; ; from += pageSize) {
            const { data, error } = await supabase
                .from('employee_domisili')
                .select('nama_desa, kecamatan')
                .eq('upload_id', uploadId)
                .range(from, from + pageSize - 1);
            if (error) throw error;
            for (const employee of (data || []) as EmployeeSummaryRecord[]) {
                const village = employee.nama_desa?.trim() || 'Tidak Diketahui';
                const district = employee.kecamatan?.trim() || 'Tidak Diketahui';
                villageCounts.set(village, (villageCounts.get(village) || 0) + 1);
                districtCounts.set(district, (districtCounts.get(district) || 0) + 1);
            }
            if (!data || data.length < pageSize) break;
        }

        if (villageCounts.size === 0) {
            return NextResponse.json({ error: 'Data karyawan tidak ditemukan untuk upload ini.' }, { status: 404 });
        }

        const namedVillages: SummaryRow[] = [];
        let otherVillageCount = 0;
        let limitedAddressCount = 0;
        for (const [name, count] of villageCounts) {
            if (
                name === 'Lokasi Perusahaan / Mess'
                || name === 'Tidak Diketahui'
                || name.startsWith('Format')
            ) {
                limitedAddressCount += count;
            } else if (count < 20) {
                otherVillageCount += count;
            } else {
                namedVillages.push({
                    name,
                    count,
                    percentage: count / totalHc * 100,
                });
            }
        }

        namedVillages.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'id'));
        const villageRows = [...namedVillages];
        if (otherVillageCount > 0) {
            villageRows.push({
                name: 'Desa Lainnya (< 20 TK)',
                count: otherVillageCount,
                percentage: otherVillageCount / totalHc * 100,
            });
        }
        if (limitedAddressCount > 0) {
            villageRows.push({
                name: 'Format Alamat Terbatas / Lainnya',
                count: limitedAddressCount,
                percentage: limitedAddressCount / totalHc * 100,
            });
        }
        const chartRows = namedVillages
            .slice(0, 10);

        const sortedDistricts = [...districtCounts.entries()]
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'id'));
        const districtRows = sortedDistricts.slice(0, 10).map(item => ({
            ...item,
            percentage: item.count / totalHc * 100,
        }));
        const otherDistricts = sortedDistricts.slice(10).reduce((count, item) => count + item.count, 0);
        if (otherDistricts > 0) {
            districtRows.push({
                name: 'Kecamatan Lainnya',
                count: otherDistricts,
                percentage: otherDistricts / totalHc * 100,
            });
        }

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'HR Dashboard PG 2';
        workbook.created = new Date();
        await addSummaryWorksheet(workbook, villageRows, districtRows, chartRows, totalHc);

        const buffer = await workbook.xlsx.writeBuffer();
        const date = upload.uploaded_at
            ? new Date(upload.uploaded_at).toISOString().slice(0, 10)
            : new Date().toISOString().slice(0, 10);
        return new NextResponse(Buffer.from(buffer), {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="Ringkasan_Desa_Kecamatan_${date}.xlsx"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        console.error('Error exporting village and district summary:', error);
        const message = error instanceof Error ? error.message : 'Gagal mengekspor ringkasan.';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
