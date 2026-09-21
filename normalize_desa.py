import pandas as pd
import re

df = pd.read_excel('PG2 21 Sept 2026.XLSX', sheet_name='Sheet1')
df = df.fillna('')

# ======================================================
# ALIAS MAPPING: Variasi penulisan -> Nama Standar
# ======================================================
ALIAS_MAP = {
    # Gunung Sari
    'gunung sari': 'Gunung Sari',
    'gn. sari': 'Gunung Sari',
    'gn sari': 'Gunung Sari',
    'gngsari': 'Gunung Sari',

    # Rejo Mulyo
    'rejo mulyo': 'Rejo Mulyo',
    'rejomulyo': 'Rejo Mulyo',
    'rejo muliyo': 'Rejo Mulyo',

    # Gunung Menanti
    'gunung menanti': 'Gunung Menanti',
    'gn menanti': 'Gunung Menanti',
    'gn. menanti': 'Gunung Menanti',

    # Gunung Kramat (termasuk variasi keramat)
    'gunung kramat': 'Gunung Kramat',
    'gunung keramat': 'Gunung Kramat',
    'gn kramat': 'Gunung Kramat',
    'gn. kramat': 'Gunung Kramat',
    'gn keramat': 'Gunung Kramat',
    'gn. keramat': 'Gunung Kramat',

    # Sido Rahayu
    'sido rahayu': 'Sido Rahayu',
    'sidorahayu': 'Sido Rahayu',
    'sido rahaju': 'Sido Rahayu',
    'campang': 'Sido Rahayu',  # per spec

    # Bumi Raharja
    'bumi raharja': 'Bumi Raharja',
    'bumiraharja': 'Bumi Raharja',
    'bumi raharjo': 'Bumi Raharja',

    # Gunung Agung
    'gunung agung': 'Gunung Agung',
    'gn agung': 'Gunung Agung',
    'gn. agung': 'Gunung Agung',

    # Bumi Jaya
    'bumi jaya': 'Bumi Jaya',
    'bumijaya': 'Bumi Jaya',
    'bumi jaya i': 'Bumi Jaya',

    # Papan Asri
    'papan asri': 'Papan Asri',
    'papanasri': 'Papan Asri',

    # Banjar Kertahayu
    'banjar kertahayu': 'Banjar Kertahayu',
    'banjar kerta rahayu': 'Banjar Kertahayu',
    'banjarkertahayu': 'Banjar Kertahayu',
    'banjar ke': 'Banjar Kertahayu',

    # Bumi Restu
    'bumi restu': 'Bumi Restu',
    'bumirestu': 'Bumi Restu',

    # Sukoharjo
    'sukoharjo': 'Sukoharjo',

    # Lempuyang Bandar
    'lempuyang bandar': 'Lempuyang Bandar',
    'lempuyangbandar': 'Lempuyang Bandar',

    # Buring Kencana
    'buring kencana': 'Buring Kencana',
    'buringkencana': 'Buring Kencana',

    # Bandar Sakti
    'bandar sakti': 'Bandar Sakti',
    'bandarsakti': 'Bandar Sakti',

    # Banjar Ratu
    'banjar ratu': 'Banjar Ratu',
    'banjarratu': 'Banjar Ratu',

    # Purba Sakti
    'purba sakti': 'Purba Sakti',
    'purbasakti': 'Purba Sakti',

    # Margodadi
    'margodadi': 'Margodadi',
    'margo dadi': 'Margodadi',

    # Terbanggi Besar
    'terbanggi besar': 'Terbanggi Besar',
    'terbanggibesar': 'Terbanggi Besar',

    # Terusan Nunyai
    'terusan nunyai': 'Terusan Nunyai',
    'terusannunyai': 'Terusan Nunyai',

    # Gunung Batin Udik
    'gunung batin udik': 'Gunung Batin Udik',
    'gn batin udik': 'Gunung Batin Udik',

    # Talang Dua
    'talang dua': 'Talang Dua',
    'talangdua': 'Talang Dua',

    # Buring Jaya
    'buring jaya': 'Buring Jaya',
    'buringjaya': 'Buring Jaya',

    # Talang Harapan
    'talang harapan': 'Talang Harapan',
    'talangharapan': 'Talang Harapan',

    # Bandar Sari
    'bandar sari': 'Bandar Sari',
    'bandarsari': 'Bandar Sari',

    # Talang Maju
    'talang maju': 'Talang Maju',
    'talangmaju': 'Talang Maju',

    # Semuli Raya
    'semuli raya': 'Semuli Raya',
    'semuliraya': 'Semuli Raya',

    # Jaya Bakti
    'jaya bakti': 'Jaya Bakti',
    'jayabakti': 'Jaya Bakti',

    # Candi Rejo
    'candi rejo': 'Candi Rejo',
    'candirejo': 'Candi Rejo',

    # Sumber Rejo
    'sumber rejo': 'Sumber Rejo',
    'sumberrejo': 'Sumber Rejo',
}

ALIAS_KEYS = sorted(ALIAS_MAP.keys(), key=len, reverse=True)  # Terlama dulu supaya greedy match

# ======================================================
# PEMISAH RegEx
# ======================================================
SEPARATOR_PATTERN = re.compile(
    r'\b(?:rt/?rw|rt|rw|dusun|dsn|dsn\.|jl\.|jalan|kp\.|kampung|kel\.|kec\.|kab\.|desa)\b',
    re.IGNORECASE
)

COMPANY_KEYWORDS = ['perum op', 'perum kopkar', 'pt ggp', 'pg 2', 'pg2', 'mess', 'kost', 'komp.', 'asrama', 'perumahan pt', 'perumahan ggp', 'kopkar']

def normalize_desa(row):
    raw_addr = str(row['Street and House Number']).strip()
    district = str(row['District']).strip()

    if not raw_addr or raw_addr in ['-', '.', '', '0']:
        return district.title() if district else 'Tidak Diketahui'

    addr_lower = raw_addr.lower()

    # 1. Cek apakah termasuk alamat perusahaan/mess
    for kw in COMPANY_KEYWORDS:
        if kw in addr_lower:
            return 'Lokasi Perusahaan / Mess'

    # 2. Cek alias mapping langsung (greedy, terpanjang dulu)
    for key in ALIAS_KEYS:
        if key in addr_lower:
            return ALIAS_MAP[key]

    # 3. Gunakan RegEx parsing: potong sebelum separator
    parts = SEPARATOR_PATTERN.split(raw_addr)
    candidates = []
    for part in parts:
        part = part.strip().strip(',').strip()
        part = re.sub(r'^[\d\s/.,;:-]+', '', part).strip()  # Buang angka/simbol di awal
        if len(part) >= 3 and re.search(r'[a-zA-Z]{3}', part):
            candidates.append(part)

    if candidates:
        best = candidates[0].strip(',. ').title()
        # Cek lagi di alias
        for key in ALIAS_KEYS:
            if key in best.lower():
                return ALIAS_MAP[key]
        return best

    # 4. Fallback ke District
    if district:
        return district.title()

    return 'Tidak Diketahui'

df['Desa_Normal'] = df.apply(normalize_desa, axis=1)

# Klasifikasikan sebagai "Desa Lainnya" jika count < 20
counts = df['Desa_Normal'].value_counts()
SMALL_VILLAGES = set(counts[counts < 20].index)

def final_desa(desa):
    if desa in SMALL_VILLAGES:
        return 'Desa Lainnya (< 20 TK)'
    if desa.startswith('Format') or desa.startswith('Lokasi'):
        return 'Desa Lainnya (< 20 TK)'
    return desa

df['Desa_Final'] = df['Desa_Normal'].apply(final_desa)

# Validasi Total
final_counts = df['Desa_Final'].value_counts()
total = final_counts.sum()
print(f"=== VALIDASI TOTAL: {total} baris (harus 5.492) ===\n")
print(final_counts.to_string())
