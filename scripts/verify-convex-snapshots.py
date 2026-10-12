"""Compare private Convex snapshots without printing any customer records."""
import hashlib
import json
import sys
import zipfile

source, target = map(zipfile.ZipFile, sys.argv[1:3])

def documents(archive, name):
    return sorted((json.loads(line) for line in archive.read(name).splitlines() if line), key=lambda row: row['_id'])

tables = [name for name in source.namelist() if name.endswith('/documents.jsonl') and not name.endswith('_tables/documents.jsonl')]
differences = []
records = 0
for name in tables:
    rows = documents(source, name)
    records += len(rows)
    if name not in target.namelist() or rows != documents(target, name):
        differences.append(name)
extra_tables = [name for name in target.namelist() if name.endswith('/documents.jsonl') and not name.endswith('_tables/documents.jsonl') and name not in tables]
files = [name for name in source.namelist() if '/_storage/' in '/' + name and not name.endswith(('.jsonl', '/'))]
file_differences = sum(name not in target.namelist() or hashlib.sha256(source.read(name)).digest() != hashlib.sha256(target.read(name)).digest() for name in files)
print(json.dumps({'tables': len(tables), 'records': records, 'documentDifferences': differences, 'extraTables': extra_tables, 'files': len(files), 'fileDifferences': file_differences}))
sys.exit(bool(differences or extra_tables or file_differences))
