import pandas as pd
import re
from supabase import create_client

SUPABASE_URL = "https://msoznkwocphkchhraccq.supabase.co"
SUPABASE_KEY = "sb_publishable_PUFq7WjnMfgEa7Ci5R7UAQ_l3CIOX0s"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

df = pd.read_excel('PG2 21 Sept 2026.XLSX', sheet_name='Sheet1')
df = df.fillna('')

ALIAS_MAP = {
    'gunung sari': 'Gunung Sari', 'gn. sari': 'Gunung Sari', 'gn sari': 'Gunung Sari',
    'rejo mulyo': 'Rejo Mulyo', 'rejomulyo': 'Rejo Mulyo', 'rejo muliyo': 'Rejo Mulyo',
    'gunung menanti': 'Gunung Menanti', 'gn menanti': 'Gunung Menanti',
    'gunung kramat': 'Gunung Kramat', 'gunung keramat': 'Gunung Kramat', 'gn kramat': 'Gunung Kramat',
    'gn. kramat': 'Gunung Kramat', 'gn keramat': 'Gunung Kramat',
    'sido rahayu': 'Sido Rahayu', 'sidorahayu': 'Sido Rahayu', 'sido rahaju': 'Sido Rahayu', 'campang': 'Sido Rahayu',
    'bumi raharja': 'Bumi Raharja', 'bumiraharja': 'Bumi Raharja', 'bumi raharjo': 'Bumi Raharja',
    'gunung agung': 'Gunung Agung', 'gn agung': 'Gunung Agung',
    'bumi jaya': 'Bumi Jaya', 'bumijaya': 'Bumi Jaya',
    'papan asri': 'Papan Asri', 'papanasri': 'Papan Asri',
    'banjar kertahayu': 'Banjar Kertahayu', 'banjar kerta rahayu': 'Banjar Kertahayu', 'banjarkertahayu': 'Banjar Kertahayu', 'banjar ke': 'Banjar Kertahayu',
    'bumi restu': 'Bumi Restu', 'bumirestu': 'Bumi Restu',
    'sukoharjo': 'Sukoharjo',
    'lempuyang bandar': 'Lempuyang Bandar', 'lempuyangbandar': 'Lempuyang Bandar',
    'buring kencana': 'Buring Kencana', 'buringkencana': 'Buring Kencana',
    'bandar sakti': 'Bandar Sakti', 'bandarsakti': 'Bandar Sakti',
    'banjar ratu': 'Banjar Ratu', 'banjarratu': 'Banjar Ratu',
    'purba sakti': 'Purba Sakti', 'purbasakti': 'Purba Sakti',
    'margodadi': 'Margodadi', 'margo dadi': 'Margodadi',
    'terbanggi besar': 'Terbanggi Besar', 'terbanggibesar': 'Terbanggi Besar',
    'terusan nunyai': 'Terusan Nunyai', 'terusannunyai': 'Terusan Nunyai',
    'gunung batin udik': 'Gunung Batin Udik', 'gn batin udik': 'Gunung Batin Udik',
    'talang dua': 'Talang Dua', 'talangdua': 'Talang Dua',
    'buring jaya': 'Buring Jaya', 'buringjaya': 'Buring Jaya',
    'talang harapan': 'Talang Harapan', 'talangharapan': 'Talang Harapan',
    'bandar sari': 'Bandar Sari', 'bandarsari': 'Bandar Sari',
    'talang maju': 'Talang Maju', 'talangmaju': 'Talang Maju',
    'semuli raya': 'Semuli Raya', 'semuliraya': 'Semuli Raya',
    'jaya bakti': 'Jaya Bakti', 'jayabakti': 'Jaya Bakti',
    'candi rejo': 'Candi Rejo', 'candirejo': 'Candi Rejo',
    'sumber rejo': 'Sumber Rejo', 'sumberrejo': 'Sumber Rejo',
    'nambah dadi': 'Nambah Dadi', 'nambahdadi': 'Nambah Dadi',
}

ALIAS_KEYS = sorted(ALIAS_MAP.keys(), key=len, reverse=True)
SEPARATOR_PATTERN = re.compile(r'\b(?:rt/?rw|rt|rw|dusun|dsn\.?|jl\.|jalan|kp\.|kampung|kel\.|kec\.|kab\.|desa)\b', re.IGNORECASE)
COMPANY_KEYWORDS = ['perum op', 'perum kopkar', 'pt ggp', 'pg 2', 'pg2', 'mess', 'asrama', 'perumahan pt', 'perumahan ggp', 'kopkar']

def normalize_desa(row):
    raw_addr = str(row['Street and House Number']).strip()
    district = str(row['District']).strip()
    if not raw_addr or raw_addr in ['-', '.', '', '0']:
        return district.title() if district else 'Tidak Diketahui'
    addr_lower = raw_addr.lower()
    for kw in COMPANY_KEYWORDS:
        if kw in addr_lower:
            return 'Lokasi Perusahaan / Mess'
    for key in ALIAS_KEYS:
        if key in addr_lower:
            return ALIAS_MAP[key]
    parts = SEPARATOR_PATTERN.split(raw_addr)
    candidates = []
    for part in parts:
        part = part.strip().strip(',').strip()
        part = re.sub(r'^[\d\s/.,;:-]+', '', part).strip()
        if len(part) >= 3 and re.search(r'[a-zA-Z]{3}', part):
            candidates.append(part)
    if candidates:
        best = candidates[0].strip(',. ').title()
        for key in ALIAS_KEYS:
            if key in best.lower():
                return ALIAS_MAP[key]
        return best
    return district.title() if district else 'Tidak Diketahui'

df['Desa_Normal'] = df.apply(normalize_desa, axis=1)
counts = df['Desa_Normal'].value_counts()
SMALL_VILLAGES = set(counts[counts < 20].index)

def final_desa(desa):
    if desa in SMALL_VILLAGES or desa.startswith('Lokasi'):
        return 'Desa Lainnya (< 20 TK)'
    return desa

df['desa_normalized'] = df['Desa_Normal'].apply(final_desa)

# Update ke Supabase satu per satu dalam batch
print(f"Menambahkan kolom desa_normalized ke Supabase... total: {len(df)} baris")
# Pertama kita perlu menambahkan kolom dulu via SQL jika belum ada
# Buat mapping Pers.No. -> desa_normalized untuk update
update_map = df[['Pers.No.', 'desa_normalized']].copy()
update_map['Pers.No.'] = update_map['Pers.No.'].astype(str).str.strip().str.split('.').str[0]

# Ambil mapping id -> Pers.No. dari Supabase dulu
print("Mengambil data id dari Supabase...")
all_ids = []
page = 0
page_size = 1000
while True:
    result = supabase.table('employees').select('id, "Pers.No."').range(page * page_size, (page + 1) * page_size - 1).execute()
    if not result.data:
        break
    all_ids.extend(result.data)
    if len(result.data) < page_size:
        break
    page += 1

print(f"  Berhasil mengambil {len(all_ids)} baris dari Supabase")

# Buat mapping Pers.No. -> id
persno_to_id = {}
for row in all_ids:
    pn = str(row.get('Pers.No.', '') or '').strip().split('.')[0]
    persno_to_id[pn] = row['id']

# Update per baris menggunakan id
print(f"Memperbarui desa_normalized... total: {len(update_map)} baris")
success = 0
errors = 0
for _, row in update_map.iterrows():
    pn = str(row['Pers.No.']).strip()
    row_id = persno_to_id.get(pn)
    if row_id is None:
        errors += 1
        continue
    supabase.table('employees').update({'desa_normalized': row['desa_normalized']}).eq('id', row_id).execute()
    success += 1
    if success % 200 == 0:
        print(f"  Progress: {success}/{len(update_map)}")

print(f"\nSelesai! Berhasil: {success}, Gagal: {errors}")
