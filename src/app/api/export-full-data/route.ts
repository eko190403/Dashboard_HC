import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { createRequestSupabaseClient } from '@/lib/auth-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { addSummaryWorksheet, type SummaryRow } from '@/lib/summary-workbook';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type UploadRecord = {
    id: number | string;
    filename: string;
    total_hc: number;
    uploaded_at: string | null;
    audit_summary: string | null;
};

type EmployeeSummaryRecord = {
    nama_desa: string | null;
    kecamatan: string | null;
};

function getStoredBackupPath(auditSummary: string | null): string | null {
    if (!auditSummary) return null;
    try {
        const summary: unknown = JSON.parse(auditSummary);
        if (
            summary
            && typeof summary === 'object'
            && 'backup_path' in summary
            && typeof summary.backup_path === 'string'
            && summary.backup_path.trim()
        ) {
            return summary.backup_path;
        }
    } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
    }
    return null;
}

async function findLegacyBackupPath(
    storage: ReturnType<typeof getSupabaseAdmin>['storage'],
    originalFilename: string,
): Promise<string | null> {
    const candidates: string[] = [];
    const pageSize = 100;
    for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await storage.from('excel-backups').list('', {
            limit: pageSize,
            offset,
            search: originalFilename,
        });
        if (error) throw error;
        for (const object of data || []) {
            if (object.name === originalFilename || object.name.endsWith(`_${originalFilename}`)) {
                candidates.push(object.name);
            }
        }
        if (!data || data.length < pageSize) break;
    }

    if (candidates.length > 1) {
        throw new Error('Backup lama memiliki beberapa file dengan nama sama sehingga tidak dapat dipastikan file mana yang sesuai. Unggah ulang file tersebut untuk mengaktifkan unduhan lengkap.');
    }
    return candidates[0] || null;
}

function buildSummaryRows(
    villageCounts: Map<string, number>,
    districtCounts: Map<string, number>,
    totalHc: number,
) {
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

export async function GET(request: NextRequest) {
    try {
        const authClient = createRequestSupabaseClient(request);
        const { data: { user }, error: authError } = await authClient.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }
        const { searchParams } = new URL(request.url);
        const admin = getSupabaseAdmin();
        const uploadId = searchParams.get('upload_id');
        let uploadQuery = admin
            .from('upload_logs')
            .select('id, filename, total_hc, uploaded_at, audit_summary');
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
        const originalFilename = uploadRecord.filename.split(/[\\/]/).pop() || uploadRecord.filename;
        const backupPath = getStoredBackupPath(uploadRecord.audit_summary)
            || await findLegacyBackupPath(admin.storage, originalFilename);
        if (!backupPath) {
            return NextResponse.json({ error: 'File asli upload ini tidak tersedia di penyimpanan backup.' }, { status: 404 });
        }

        const { data: sourceFile, error: downloadError } = await admin.storage
            .from('excel-backups')
            .download(backupPath);
        if (downloadError) throw downloadError;

        const villageCounts = new Map<string, number>();
        const districtCounts = new Map<string, number>();
        const pageSize = 1000;
        for (let from = 0; ; from += pageSize) {
            const { data, error } = await admin
                .from('employee_domisili')
                .select('nama_desa, kecamatan')
                .eq('upload_id', uploadRecord.id)
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

        const totalHc = Number(uploadRecord.total_hc);
        if (!totalHc || villageCounts.size === 0) {
            return NextResponse.json({ error: 'Data karyawan upload ini tidak tersedia untuk membuat sheet ringkasan.' }, { status: 422 });
        }
        const employeeTotal = [...villageCounts.values()].reduce((sum, count) => sum + count, 0);
        if (employeeTotal !== totalHc) {
            return NextResponse.json({ error: 'Jumlah detail karyawan tidak sesuai total HC upload; file tidak dibuat agar ringkasan tidak keliru.' }, { status: 422 });
        }

        const rows = buildSummaryRows(villageCounts, districtCounts, totalHc);
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(await sourceFile.arrayBuffer());
        await addSummaryWorksheet(workbook, rows.villageRows, rows.districtRows, rows.chartRows, totalHc);

        const buffer = await workbook.xlsx.writeBuffer();
        const date = uploadRecord.uploaded_at
            ? new Date(uploadRecord.uploaded_at).toISOString().slice(0, 10)
            : new Date().toISOString().slice(0, 10);
        const outputFilename = `${originalFilename.replace(/\.[^.]+$/, '')}_dengan_ringkasan.xlsx`
            .replace(/[\r\n"]/g, '_');
        const fallbackFilename = outputFilename.replace(/[^\x20-\x7E]/g, '_');
        return new NextResponse(Buffer.from(buffer), {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${fallbackFilename}"; filename*=UTF-8''${encodeURIComponent(outputFilename)}`,
                'X-Upload-Date': date,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        console.error('Error exporting full upload workbook:', error);
        const message = error instanceof Error ? error.message : 'Gagal mengunduh data lengkap.';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
