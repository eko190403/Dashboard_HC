import ExcelJS from 'exceljs';
import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createElement } from 'react';

export type SummaryRow = {
    name: string;
    count: number;
    percentage: number;
};

async function createVillageChart(villages: SummaryRow[]): Promise<Buffer> {
    const fontPath = join(process.cwd(), 'node_modules', 'next', 'dist', 'compiled', '@vercel', 'og', 'Geist-Regular.ttf');
    const fontData = Uint8Array.from(await readFile(fontPath)).buffer;
    const maxPercentage = Math.max(...villages.map(village => village.percentage), 0.01);
    const rows = villages.map((village, index) => createElement(
        'div',
        {
            key: village.name,
            style: {
                display: 'flex',
                alignItems: 'center',
                height: 31,
                marginBottom: 4,
            },
        },
        createElement('div', {
            style: {
                width: 195,
                paddingRight: 12,
                fontSize: 15,
                color: '#1f2937',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
            },
        }, `${index + 1}. ${village.name}`),
        createElement(
            'div',
            {
                style: {
                    display: 'flex',
                    width: 430,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: '#e8edf5',
                    overflow: 'hidden',
                },
            },
            createElement('div', {
                style: {
                    width: `${Math.max(1, village.percentage / maxPercentage * 100)}%`,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: '#405f96',
                },
            }),
        ),
        createElement('div', {
            style: {
                width: 80,
                paddingLeft: 12,
                fontSize: 15,
                fontWeight: 600,
                color: '#1f2937',
                textAlign: 'right',
            },
        }, `${village.percentage.toFixed(2)}%`),
    ));

    const image = new ImageResponse(
        createElement(
            'div',
            {
                style: {
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                    height: '100%',
                    padding: '24px 28px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #d1d5db',
                    borderRadius: 16,
                    fontFamily: 'Geist',
                },
            },
            createElement('div', {
                style: {
                    fontSize: 23,
                    fontWeight: 700,
                    color: '#1a2b4a',
                    lineHeight: '30px',
                    marginBottom: 12,
                },
            }, 'Top 10 Desa/Kelurahan (Persentase TK)'),
            ...rows,
        ),
        {
            width: 760,
            height: 430,
            fonts: [{ name: 'Geist', data: fontData, weight: 400, style: 'normal' }],
        },
    );

    return Buffer.from(await image.arrayBuffer());
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

export async function addSummaryWorksheet(
    workbook: ExcelJS.Workbook,
    villageRows: SummaryRow[],
    districtRows: SummaryRow[],
    chartRows: SummaryRow[],
    totalHc: number,
): Promise<void> {
    let sheetName = 'Ringkasan';
    let suffix = 1;
    while (workbook.getWorksheet(sheetName)) {
        const suffixText = suffix === 1 ? ' HC' : ` HC ${suffix}`;
        sheetName = `Ringkasan${suffixText}`;
        suffix += 1;
    }

    const worksheet = workbook.addWorksheet(sheetName);
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
    for (const column of [1, 5]) {
        worksheet.getColumn(column).eachCell({ includeEmpty: false }, cell => { cell.alignment = { horizontal: 'left' }; });
    }
    for (const column of [2, 3, 6, 7]) {
        worksheet.getColumn(column).eachCell({ includeEmpty: false }, cell => { cell.alignment = { horizontal: 'right' }; });
    }
    worksheet.getRow(3).eachCell(cell => { cell.alignment = { horizontal: 'center', vertical: 'middle' }; });

    const chart = await createVillageChart(chartRows);
    const imageId = workbook.addImage({ base64: chart.toString('base64'), extension: 'png' });
    worksheet.addImage(imageId, {
        tl: { col: 3.15, row: 16 },
        ext: { width: 570, height: 323 },
    });
}
