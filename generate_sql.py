import pandas as pd
import math

df = pd.read_excel('PG2 21 Sept 2026.XLSX')
df = df.fillna('')
columns = df.columns.tolist()

# Generate CREATE TABLE statement
create_table = 'CREATE TABLE IF NOT EXISTS employees (\n    id SERIAL PRIMARY KEY,\n'
for col in columns:
    safe_col = f'"{col}"'
    create_table += f'    {safe_col} TEXT,\n'
create_table = create_table.rstrip(',\n') + '\n);\n\n'

# Generate INSERT statements
values_list = []
for index, row in df.iterrows():
    vals = []
    for val in row:
        if isinstance(val, str):
            val = val.replace("'", "''")
            vals.append(f"'{val}'")
        else:
            vals.append(f"'{val}'")
    values_list.append('(' + ', '.join(vals) + ')')

# Batch inserts to avoid too large query (100 rows per batch)
final_sql = create_table
batch_size = 100
for i in range(0, len(values_list), batch_size):
    batch = values_list[i:i+batch_size]
    final_sql += 'INSERT INTO employees (' + ', '.join([f'"{c}"' for c in columns]) + ') VALUES\n'
    final_sql += ',\n'.join(batch) + ';\n\n'

with open('seed.sql', 'w', encoding='utf-8') as f:
    f.write(final_sql)
