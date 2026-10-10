import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import sharp from 'sharp';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SummaryRow = {
    name: string;
    count: number;
    percentage: number;
};

type EmployeeSummaryRecord = {
    nama_desa: string | null;
    kecamatan: string | null;
};

function escapeXml(value: string): string {
    return value.replace(/[<>&'"]/g, character => ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        "'": '&apos;',
        '"': '&quot;',
    })[character] || character);
}

function createVillageChart(villages: SummaryRow[]): string {
    const width = 570;
    const height = 350;
    const left = 60;
    const right = 125;
    const top = 42;
    const bottom = 105;
    const chartWidth = width - left - right;
    const chartHeight = height - top - bottom;
    const maxPercentage = Math.max(...villages.map(village => village.percentage / 100), 0.01);
    const maxValue = Math.max(0.02, Math.ceil(maxPercentage / 0.02) * 0.02);
    const step = chartWidth / Math.max(villages.length, 1);
    const barWidth = Math.min(16, step * 0.62);
    const gridLines = Math.round(maxValue / 0.02);

    const grid = Array.from({ length: gridLines + 1 }, (_, index) => {
        const value = maxValue * (gridLines - index) / gridLines;
        const y = top + chartHeight * index / gridLines;
        const tick = value === 0 ? '0' : value.toFixed(2).replace(/0$/, '');
        return `<line x1="${left}" y1="${y}" x2="${width - right}" y2="${y}" stroke="#b7b7b7" stroke-width="1"/>
            <text x="${left - 8}" y="${y + 4}" text-anchor="end" font-size="10" fill="#111827">${tick}</text>`;
    }).join('');

    const bars = villages.map((village, index) => {
        const x = left + step * index + (step - barWidth) / 2;
        const barHeight = (village.percentage / 100) / maxValue * chartHeight;
        const y = top + chartHeight - barHeight;
        const center = x + barWidth / 2;
        const label = escapeXml(village.name);
        const legendY = top + index * 18 + 15;
        return `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="#405f96"/>
            <text x="${center}" y="${top + chartHeight + 18}" transform="rotate(-45 ${center} ${top + chartHeight + 18})" text-anchor="end" font-size="9" fill="#111827">${label}</text>
            <rect x="${width - right + 18}" y="${legendY - 6}" width="6" height="6" fill="#405f96"/>
            <text x="${width - right + 29}" y="${legendY}" font-size="9" fill="#111827">${label}</text>`;
    }).join('');

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <rect width="100%" height="100%" fill="#ffffff"/>
        <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="14" fill="none" stroke="#a3a3a3"/>
        <text x="${(left + width - right) / 2}" y="25" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" fill="#777777">Top 10 Desa/Kelurahan (Persentase TK)</text>
        ${grid}
        <line x1="${left}" y1="${top}" x2="${left}" y2="${top + chartHeight}" stroke="#9ca3af" stroke-width="1"/>
        <text x="16" y="${top + chartHeight / 2}" transform="rotate(-90 16 ${top + chartHeight / 2})" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" fill="#111827">Persentase (%)</text>
        <text x="${left + chartWidth / 2}" y="${height - 8}" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" fill="#111827">Desa / Kelurahan</text>
        ${bars}
    </svg>`;
}

function addSummaryTable(
    worksheet: ExcelJS.Worksheet,
    startColumn: number,
    firstColumnHeader: string,
    rows: SummaryRow[],
    totalHc: number,
    includeTotal: boolean,
) {
    const headerRow = worksheet.getRow(3);
    [firstColumnHeader, 'Jumlah TK', 'Persentase (%)'].forEach((header, index) => {
        const cell = headerRow.getCell(startColumn + index);
        cell.value = header;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF405F96' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
            top: { style: 'thin', color: { argb: 'FF808080' } },
            bottom: { style: 'thin', color: { argb: 'FF808080' } },
            left: { style: 'thin', color: { argb: 'FF808080' } },
            right: { style: 'thin', color: { argb: 'FF808080' } },
        };
    });

    rows.forEach((item, index) => {
        const row = worksheet.getRow(index + 4);
        row.height = 17;
        row.getCell(startColumn).value = item.name;
        row.getCell(startColumn + 1).value = item.count;
        row.getCell(startColumn + 2).value = item.percentage / 100;
        row.getCell(startColumn + 1).numFmt = '#,##0';
        row.getCell(startColumn + 2).numFmt = '0.00%';
        for (let column = startColumn; column <= startColumn + 2; column++) {
            const cell = row.getCell(column);
            cell.border = {
                top: { style: 'thin', color: { argb: 'FF808080' } },
                bottom: { style: 'thin', color: { argb: 'FF808080' } },
                left: { style: 'thin', color: { argb: 'FF808080' } },
                right: { style: 'thin', color: { argb: 'FF808080' } },
            };
            if (index % 2 === 0) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F8FC' } };
            }
        }
    });

    if (includeTotal) {
        const totalRow = worksheet.getRow(rows.length + 4);
        totalRow.height = 17;
        totalRow.getCell(startColumn).value = 'Total';
        totalRow.getCell(startColumn + 1).value = totalHc;
        totalRow.getCell(startColumn + 2).value = 1;
        totalRow.getCell(startColumn + 1).numFmt = '#,##0';
        totalRow.getCell(startColumn + 2).numFmt = '0.00%';
        for (let column = startColumn; column <= startColumn + 2; column++) {
            const cell = totalRow.getCell(column);
            cell.font = { bold: true };
            cell.border = { top: { style: 'thin', color: { argb: 'FF64748B' } } };
        }
    }
}

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
        const worksheet = workbook.addWorksheet('Ringkasan');
        worksheet.views = [{ state: 'frozen', ySplit: 3, showGridLines: true }];
        worksheet.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
        worksheet.columns = [
            { width: 76 }, { width: 12.5 }, { width: 17 }, { width: 2 },
            { width: 22 }, { width: 12 }, { width: 16 },
        ];
        worksheet.mergeCells('A1:C1');
        worksheet.getCell('A1').value = 'Ringkasan Data Persentase TK per Desa dan Kecamatan';
        worksheet.getCell('A1').font = { bold: true, size: 16 };
        worksheet.getCell('A2').value = 'Berdasarkan Data HC PG 2';
        worksheet.getCell('A2').font = { color: { argb: 'FF202020' } };
        worksheet.getRow(1).height = 21;
        worksheet.getRow(2).height = 19;
        worksheet.getRow(3).height = 20;

        addSummaryTable(worksheet, 1, 'Nama Desa / Kelurahan', villageRows, totalHc, true);
        addSummaryTable(worksheet, 5, 'Kecamatan / District', districtRows, totalHc, false);
        worksheet.getColumn(1).eachCell({ includeEmpty: false }, cell => { cell.alignment = { horizontal: 'left' }; });
        worksheet.getColumn(2).eachCell({ includeEmpty: false }, cell => { cell.alignment = { horizontal: 'right' }; });
        worksheet.getColumn(3).eachCell({ includeEmpty: false }, cell => { cell.alignment = { horizontal: 'right' }; });
        worksheet.getColumn(5).eachCell({ includeEmpty: false }, cell => { cell.alignment = { horizontal: 'left' }; });
        worksheet.getColumn(6).eachCell({ includeEmpty: false }, cell => { cell.alignment = { horizontal: 'right' }; });
        worksheet.getColumn(7).eachCell({ includeEmpty: false }, cell => { cell.alignment = { horizontal: 'right' }; });
        worksheet.getRow(3).eachCell(cell => { cell.alignment = { horizontal: 'center', vertical: 'middle' }; });

        const chart = await sharp(Buffer.from(createVillageChart(chartRows))).png().toBuffer();
        const imageId = workbook.addImage({ base64: chart.toString('base64'), extension: 'png' });
        worksheet.addImage(imageId, {
            tl: { col: 3.15, row: 16 },
            ext: { width: 570, height: 350 },
        });

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
