import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { createRequestSupabaseClient } from '@/lib/auth-server';
import { addSummaryWorksheet, type SummaryRow } from '@/lib/summary-workbook';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type UploadRecord = {
    id: number | string;
    filename: string;
    total_hc: number;
    uploaded_at: string | null;
};

type EmployeeRecord = {
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
};

function buildSummaryRows(employees: EmployeeRecord[], totalHc: number) {
    const villageCounts = new Map<string, number>();
    const districtCounts = new Map<string, number>();
    for (const employee of employees) {
        const village = employee.nama_desa?.trim() || 'Tidak Diketahui';
        const district = employee.kecamatan?.trim() || 'Tidak Diketahui';
        villageCounts.set(village, (villageCounts.get(village) || 0) + 1);
        districtCounts.set(district, (districtCounts.get(district) || 0) + 1);
    }

    const namedVillages: SummaryRow[] = [];
    let otherVillageCount = 0;
    let limitedAddressCount = 0;
    for (const [name, count] of villageCounts) {
        if (name === 'Lokasi Perusahaan / Mess' || name === 'Tidak Diketahui' || name.startsWith('Format')) {
            limitedAddressCount += count;
        } else if (count < 20) {
            otherVillageCount += count;
        } else {
            namedVillages.push({ name, count, percentage: count / totalHc * 100 });
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

    return { villageRows, districtRows, chartRows: namedVillages.slice(0, 10) };
}

function addEmployeeWorksheet(workbook: ExcelJS.Workbook, employees: EmployeeRecord[]) {
    const worksheet = workbook.addWorksheet('Data Karyawan');
    worksheet.columns = [
        { header: 'No', key: 'no', width: 7 },
        { header: 'KIT TK', key: 'kit_tk', width: 16 },
        { header: 'Nama Karyawan', key: 'employee_name', width: 30 },
        { header: 'Tanggal Lahir', key: 'birth_date', width: 16 },
        { header: 'Umur', key: 'age', width: 9 },
        { header: 'Gender', key: 'gender', width: 12 },
        { header: 'Status', key: 'employment_status', width: 18 },
        { header: 'Alamat Lengkap', key: 'street_address', width: 40 },
        { header: 'Komoditi', key: 'komoditi', width: 24 },
        { header: 'Bagian', key: 'bagian', width: 30 },
        { header: 'KIT Mandor', key: 'kit_mandor', width: 16 },
        { header: 'Nama Mandor', key: 'nama_mandor', width: 26 },
        { header: 'Kasi', key: 'kasi', width: 22 },
        { header: 'Indeks TK', key: 'indeks_tk', width: 16 },
        { header: 'Desa', key: 'nama_desa', width: 26 },
        { header: 'Kecamatan', key: 'kecamatan', width: 24 },
    ];
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];
    worksheet.autoFilter = { from: 'A1', to: 'P1' };
    const header = worksheet.getRow(1);
    header.height = 22;
    header.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF405F96' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    employees.forEach((employee, index) => {
        worksheet.addRow({
            no: index + 1,
            kit_tk: employee.kit_tk || '-',
            employee_name: employee.employee_name || '-',
            birth_date: employee.birth_date || '-',
            age: employee.age ?? '-',
            gender: employee.gender || '-',
            employment_status: employee.employment_status || '-',
            street_address: employee.street_address || '-',
            komoditi: employee.komoditi || '-',
            bagian: employee.bagian || '-',
            kit_mandor: employee.kit_mandor || '-',
            nama_mandor: employee.nama_mandor || '-',
            kasi: employee.kasi || '-',
            indeks_tk: employee.indeks_tk || '-',
            nama_desa: employee.nama_desa || '-',
            kecamatan: employee.kecamatan || '-',
        });
    });
}

export async function GET(request: NextRequest) {
    try {
        const supabase = createRequestSupabaseClient(request);
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const uploadId = new URL(request.url).searchParams.get('upload_id');
        let uploadQuery = supabase
            .from('upload_logs')
            .select('id, filename, total_hc, uploaded_at');
        if (uploadId) uploadQuery = uploadQuery.eq('id', uploadId);
        else uploadQuery = uploadQuery.order('uploaded_at', { ascending: false }).limit(1);
        const { data: upload, error: uploadError } = await uploadQuery.single();
        if (uploadError) {
            if (uploadError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Data upload tidak ditemukan.' }, { status: 404 });
            }
            throw uploadError;
        }

        const uploadRecord = upload as UploadRecord;
        const employees: EmployeeRecord[] = [];
        const pageSize = 1000;
        for (let from = 0; ; from += pageSize) {
            const { data, error } = await supabase
                .from('employee_domisili')
                .select('kit_tk, employee_name, birth_date, age, gender, employment_status, street_address, komoditi, bagian, kit_mandor, nama_mandor, kasi, indeks_tk, nama_desa, kecamatan')
                .eq('upload_id', uploadRecord.id)
                .order('employee_name', { ascending: true })
                .range(from, from + pageSize - 1);
            if (error) throw error;
            if (data?.length) employees.push(...data as EmployeeRecord[]);
            if (!data || data.length < pageSize) break;
        }

        const totalHc = Number(uploadRecord.total_hc);
        if (!totalHc || employees.length !== totalHc) {
            return NextResponse.json({ error: 'Jumlah detail karyawan tidak sesuai total HC upload; file tidak dibuat agar ringkasan tidak keliru.' }, { status: 422 });
        }

        const rows = buildSummaryRows(employees, totalHc);
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'HR Dashboard PG 2';
        workbook.created = new Date();
        addEmployeeWorksheet(workbook, employees);
        await addSummaryWorksheet(workbook, rows.villageRows, rows.districtRows, rows.chartRows, totalHc);

        const buffer = await workbook.xlsx.writeBuffer();
        const baseName = uploadRecord.filename.replace(/\.[^.]+$/, '');
        const outputFilename = `${baseName}_data_lengkap.xlsx`
            .replace(/[\r\n"]/g, '_');
        const fallbackFilename = outputFilename.replace(/[^\x20-\x7E]/g, '_');
        return new NextResponse(Buffer.from(buffer), {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${fallbackFilename}"; filename*=UTF-8''${encodeURIComponent(outputFilename)}`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        console.error('Error exporting full upload workbook:', error);
        const message = error instanceof Error ? error.message : 'Gagal mengunduh data lengkap.';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
