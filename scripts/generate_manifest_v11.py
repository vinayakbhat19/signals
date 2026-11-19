import os
import hashlib
import json

out_dir = '/Users/vinayakbhat/projects/pratice/event/out'
manifest = {}

for root, _, files in os.walk(out_dir):
    for f in sorted(files):
        if f.startswith('.'):
            continue
        full_path = os.path.join(root, f)
        rel_path = '/' + os.path.relpath(full_path, out_dir)
        with open(full_path, 'rb') as fp:
            data = fp.read()
            h = hashlib.md5(data).hexdigest()
        manifest[rel_path] = h

print(f'Total files in manifest: {len(manifest)}')
scratch = '/Users/vinayakbhat/.gemini/antigravity/brain/53a520b7-c3b0-4e0f-bc25-cc5c6bfa2925/scratch'
with open(f'{scratch}/pages-manifest-v11.json', 'w') as fp:
    json.dump(manifest, fp)

# Unique hashes
unique_hashes = list(set(manifest.values()))
print(f'Unique hashes: {len(unique_hashes)}')
with open(f'{scratch}/hashes-v11.json', 'w') as fp:
    json.dump(unique_hashes, fp)
