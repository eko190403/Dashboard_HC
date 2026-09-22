import { NextResponse } from 'next/server';
import * as xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';

export async function GET() {
  try {
    // Tentukan path ke file Excel
    // Asumsi file "PG2 21 Sept 2026.XLSX" ditempatkan di dalam folder `public` atau folder `data` di root project
    const filePath = path.join(process.cwd(), 'public', 'PG2 21 Sept 2026.XLSX');
    
    // Periksa apakah file ada
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File Excel tidak ditemukan. Pastikan file "PG2 21 Sept 2026.XLSX" berada di dalam folder "public".' }, { status: 404 });
    }

    // Baca file Excel menggunakan fs dan xlsx
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    
    // Ambil sheet pertama
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Konversi data ke JSON
    const data = xlsx.utils.sheet_to_json(sheet);
    
    // TODO: Proses raw data tersebut menjadi format array yang dikelompokkan
    // berdasarkan bagian (contoh: "Guava Harvest", "Planting") dan desa (contoh: "Abung Semuli").
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading excel file:', error);
    return NextResponse.json({ error: 'Gagal memproses file Excel' }, { status: 500 });
  }
}
