import { NextRequest, NextResponse } from 'next/server';
import * as xlsx from 'xlsx';
import { supabase } from '@/lib/supabase';
import { normalizeDesa } from '@/lib/normalizer';

function getBagian(row: any): string {
    const dep = String(row['Department'] || '').toLowerCase();
    const subDep = String(row['SubDep'] || row['Subdivision'] || '').toLowerCase();
    const section = String(row['Section'] || '').toLowerCase();
    const costCenter = String(row['Cost Center'] || '').toLowerCase();
    const jabatan = String(row['Jabatan/Posisi'] || row['Position'] || row['Jabatan'] || '').toLowerCase();
    const allText = `${dep} ${subDep} ${section} ${costCenter} ${jabatan}`;

    if (allText.includes('guava') || allText.includes('jambu')) {
        if (allText.includes('harvest') || allText.includes('panen')) return 'Guava Harvest';
        if (allText.includes('qc')) return 'Guava QC';
        if (allText.includes('spraying') || allText.includes('field service')) return 'Guava Spraying';
        return 'Planting';
    }
    
    if (allText.includes('banana') || allText.includes('pisang')) {
        if (allText.includes('qc')) return 'Banana QC';
        if (allText.includes('harvest') || allText.includes('panen') || allText.includes('ph ') || allText.includes('packing')) return 'Banana Harvest';
        if (allText.includes('support') || allText.includes('bambu') || allText.includes('pest')) return 'Banana Support';
        return 'Banana Plantation';
    }
    
    if (allText.includes('planting')) return 'Planting';
    if (allText.includes('harvest')) return 'Guava Harvest';

    return 'Lainnya';
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
            employeeRecords.push({
                nama_desa: normalizedDesa,
                kecamatan: district,
                employee_name: row['Employee Name'] || row['Name'] || row['Full Name'] || 'Unknown',
                gender: row['Gender Key'] || '',
                street_address: rawAddr || '',
                employment_status: status,
                age: age,
                birth_date: formattedBirthDate,
                bagian: getBagian(row),
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
