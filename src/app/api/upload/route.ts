import { NextRequest, NextResponse } from 'next/server';
import * as xlsx from 'xlsx';
import { supabase } from '@/lib/supabase';
import { normalizeDesa } from '@/lib/normalizer';

function getKomoditiAndBagian(row: any): { komoditi: string; bagian: string } {
    // Baca langsung dari kolom SAP yang sudah terstruktur
    const subDepRaw = String(row['Sub Department Text'] || '').trim();
    const depRaw = String(row['Department Text'] || '').trim();
    const subDepLow = subDepRaw.toLowerCase();
    const depLow = depRaw.toLowerCase();

    // --- PINE / NANAS (Wilayah) ---
    const wilayahMatch = subDepRaw.match(/wilayah\s*(\d+)/i);
    if (wilayahMatch) {
        return { komoditi: 'Pine', bagian: `Wilayah ${wilayahMatch[1]}` };
    }
    if (subDepLow.includes('process pine') || depLow.includes('process pine')) {
        return { komoditi: 'Pine', bagian: 'Process Pine' };
    }
    if (subDepLow.includes('harvesting & transport') || subDepLow.includes('harvesting & ph central')) {
        return { komoditi: 'Pine', bagian: 'Harvesting & Transport' };
    }

    // --- GUAVA (Jambu) ---
    if (subDepLow.includes('guava') || depLow.includes('guava')) {
        if (subDepLow.includes('harvest')) return { komoditi: 'Guava', bagian: 'Guava Harvest' };
        if (subDepLow.includes('qc')) return { komoditi: 'Guava', bagian: 'Guava QC' };
        if (subDepLow.includes('spraying') || subDepLow.includes('field service')) return { komoditi: 'Guava', bagian: 'Guava Spraying' };
        return { komoditi: 'Guava', bagian: 'Guava Plantation' };
    }

    // --- BANANA (Pisang) ---
    if (subDepLow.includes('banana') || depLow.includes('banana')) {
        if (subDepLow.includes('qc')) return { komoditi: 'Banana', bagian: 'Banana QC' };
        if (subDepLow.includes('ph') || subDepLow.includes('packing')) return { komoditi: 'Banana', bagian: 'Banana Harvest & PH' };
        if (subDepLow.includes('support')) return { komoditi: 'Banana', bagian: 'Banana Support' };
        return { komoditi: 'Banana', bagian: 'Banana Plantation' };
    }

    // --- QCPP (QC Processed Pineapple) ---
    if (subDepLow.includes('qc processed') || depLow.includes('qc processed') || subDepLow.includes('quality sistem') || subDepLow.includes('standarization')) {
        return { komoditi: 'QCPP', bagian: subDepRaw.replace(/^SubDep\s*/i, '') || 'QC Pineapple' };
    }

    // --- PLANTING ---
    if (subDepLow.includes('planting')) {
        return { komoditi: 'Planting', bagian: 'Planting' };
    }

    // --- AGRITECH ---
    if (subDepLow.includes('agritech') || depLow.includes('agritech') || subDepLow.includes('greenhouse') || subDepLow.includes('precision agriculture') || subDepLow.includes('ndvi') || subDepLow.includes('system data')) {
        return { komoditi: 'Agritech', bagian: subDepRaw.replace(/^SubDep\s*/i, '') || 'Agritech' };
    }

    // --- RISET / R&D ---
    if (subDepLow.includes('plant breeding') || subDepLow.includes('biofertilizer') || subDepLow.includes('durian') || subDepLow.includes('coconut') || subDepLow.includes('operation improvement') || depLow.includes('crop improvement') || depLow.includes('new crop') || depLow.includes('sustainable')) {
        return { komoditi: 'Riset & R&D', bagian: subDepRaw.replace(/^SubDep\s*/i, '') || depRaw };
    }

    // --- FIELD & SUPPORT ---
    if (subDepLow.includes('field support') || subDepLow.includes('irrigation') || subDepLow.includes('land road') || subDepLow.includes('mtc') || subDepLow.includes('plant maintenance') || subDepLow.includes('warehouse') || subDepLow.includes('service')) {
        return { komoditi: 'Field & Support', bagian: subDepRaw.replace(/^SubDep\s*/i, '') || 'Field Support' };
    }

    // --- Fallback ---
    const bagianFallback = subDepRaw.replace(/^SubDep\s*/i, '') || depRaw || 'Lainnya';
    return { komoditi: 'Lainnya', bagian: bagianFallback };
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Upload original file to Supabase Storage Bucket 'excel-backups' if needed
        // For now, we will process it first
        const filename = `${Date.now()}_${file.name}`;
        
        const { error: storageError } = await supabase.storage
            .from('excel-backups')
            .upload(filename, buffer, {
                contentType: file.type,
            });
        
        if (storageError) {
            console.warn('Could not upload to storage bucket. Proceeding with parsing...', storageError);
        }

        // Parse with SheetJS
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const rawData = xlsx.utils.sheet_to_json(sheet) as any[];

        // Fetch mandor mapping
        const { data: mandorData, error: mandorError } = await supabase
            .from('mandor_mapping')
            .select('*');
            
        const mandorMap: Record<string, any> = {};
        if (mandorData) {
            mandorData.forEach(m => {
                mandorMap[m.kit_mandor] = m;
            });
        }

        let totalHc = 0;
        const villageCounts: Record<string, { count: number; district: string; laki: number; perempuan: number }> = {};
        const employeeRecords: any[] = [];

        for (const row of rawData) {
            const rawAddr = row['Street and House Number'];
            const district = row['District'] || '';
            const status = row['Employment Status'] || '';
            const gender = (row['Gender Key'] || '').toString().toLowerCase();

            // Skip empty rows if necessary
            if (rawAddr === undefined && district === '') continue;

            // Only count active employees
            if (status && status.toLowerCase() !== 'active') {
                continue;
            }

            const normalizedDesa = normalizeDesa(rawAddr, district);
            
            if (!villageCounts[normalizedDesa]) {
                villageCounts[normalizedDesa] = { count: 0, district: district, laki: 0, perempuan: 0 };
            }
            villageCounts[normalizedDesa].count += 1;
            if (gender === 'male') {
                villageCounts[normalizedDesa].laki += 1;
            } else if (gender === 'female') {
                villageCounts[normalizedDesa].perempuan += 1;
            }
            totalHc += 1;

            // Calculate Age & Birth Date
            let age = null;
            let formattedBirthDate = null;
            const rawBirthDate = row['Birth date'];
            if (rawBirthDate) {
                let birthDate: Date;
                if (typeof rawBirthDate === 'number') {
                    // Excel stores dates as days since Jan 1, 1900
                    birthDate = new Date((rawBirthDate - 25569) * 86400 * 1000);
                } else {
                    birthDate = new Date(rawBirthDate);
                }

                if (!isNaN(birthDate.getTime())) {
                    const today = new Date();
                    let computedAge = today.getFullYear() - birthDate.getFullYear();
                    const m = today.getMonth() - birthDate.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                        computedAge--;
                    }
                    age = computedAge;
                    
                    // Format birth_date to YYYY-MM-DD
                    const y = birthDate.getFullYear();
                    const m_str = String(birthDate.getMonth() + 1).padStart(2, '0');
                    const d_str = String(birthDate.getDate()).padStart(2, '0');
                    formattedBirthDate = `${y}-${m_str}-${d_str}`;
                }
            }

            // Collect individual employee data
            const { komoditi, bagian } = getKomoditiAndBagian(row);
            const kitMandor = String(row['Kode Mandor'] || '').trim();
            const mappedMandor = mandorMap[kitMandor] || {};

            employeeRecords.push({
                nama_desa: normalizedDesa,
                kecamatan: district,
                employee_name: row['Employee Name'] || row['Name'] || row['Full Name'] || 'Unknown',
                gender: row['Gender Key'] || '',
                street_address: rawAddr || '',
                employment_status: status,
                age: age,
                birth_date: formattedBirthDate,
                komoditi,
                bagian,
                kit_tk: String(row['Pers.No.'] || row['Pers No.'] || row['Pers No'] || row['Personnel Number'] || row['Persno'] || row['persno'] || ''),
                kit_mandor: kitMandor,
                nama_mandor: mappedMandor.nama_mandor || '-',
                kasi: mappedMandor.kasi || '-',
                indeks_tk: String(row['Pers.No.'] || row['Pers No.'] || row['Pers No'] || row['Personnel Number'] || row['Persno'] || row['persno'] || '-'),
            });
        }

        if (totalHc === 0) {
            return NextResponse.json({ error: 'No valid data found in Excel file.' }, { status: 400 });
        }

        // Apply threshold < 20 for "Desa Lainnya (< 20 TK)"
        const finalCounts: Record<string, { count: number; district: string; isGrouped: boolean; laki: number; perempuan: number }> = {};
        
        for (const [desa, data] of Object.entries(villageCounts)) {
            if (data.count < 20 || desa.startsWith('Format') || desa.startsWith('Lokasi')) {
                const groupedName = 'Desa Lainnya (< 20 TK)';
                if (!finalCounts[groupedName]) {
                    finalCounts[groupedName] = { count: 0, district: 'Various', isGrouped: true, laki: 0, perempuan: 0 };
                }
                finalCounts[groupedName].count += data.count;
                finalCounts[groupedName].laki += data.laki;
                finalCounts[groupedName].perempuan += data.perempuan;
            } else {
                finalCounts[desa] = { count: data.count, district: data.district, isGrouped: false, laki: data.laki, perempuan: data.perempuan };
            }
        }

        // Insert into upload_logs
        const { data: uploadLog, error: uploadError } = await supabase
            .from('upload_logs')
            .insert({
                filename: file.name,
                total_hc: totalHc,
                uploaded_by: 'System Admin'
            })
            .select()
            .single();

        if (uploadError || !uploadLog) {
            throw new Error(`Failed to create upload log: ${uploadError?.message}`);
        }

        const uploadId = uploadLog.id;

        // Prepare data for summary_domisili
        const summaryData = Object.entries(finalCounts).map(([desa, data]) => {
            const persentase = ((data.count / totalHc) * 100).toFixed(2);
            return {
                upload_id: uploadId,
                nama_desa: desa,
                kecamatan: data.district,
                jumlah_tk: data.count,
                persentase: parseFloat(persentase),
                is_grouped: data.isGrouped,
                jumlah_laki: data.laki,
                jumlah_perempuan: data.perempuan,
            };
        });

        // Bulk insert into summary_domisili
        const { error: summaryError } = await supabase
            .from('summary_domisili')
            .insert(summaryData);

        if (summaryError) {
            throw new Error(`Failed to insert summary data: ${summaryError?.message}`);
        }

        // Prepare and insert employee data
        const employeeDataToInsert = employeeRecords.map(emp => ({
            ...emp,
            upload_id: uploadId
        }));

        // Batch insert in chunks of 1000
        const CHUNK_SIZE = 1000;
        for (let i = 0; i < employeeDataToInsert.length; i += CHUNK_SIZE) {
            const chunk = employeeDataToInsert.slice(i, i + CHUNK_SIZE);
            const { error: empError } = await supabase
                .from('employee_domisili')
                .insert(chunk);
            if (empError) {
                console.error('Failed to insert employee chunk:', empError);
                throw new Error(`Failed to insert employee data: ${empError?.message}`);
            }
        }

        return NextResponse.json({ 
            message: 'Data successfully processed', 
            totalHc, 
            uploadId 
        });

    } catch (error: any) {
        console.error('Error processing upload:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
