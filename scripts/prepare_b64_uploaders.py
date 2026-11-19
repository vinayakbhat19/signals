import json
import base64
import math

scratch = '/Users/vinayakbhat/.gemini/antigravity/brain/53a520b7-c3b0-4e0f-bc25-cc5c6bfa2925/scratch'

with open(f'{scratch}/pages-manifest-v18.json') as f:
    manifest = json.load(f)

manifest_str = json.dumps(manifest)
b64_str = base64.b64encode(manifest_str.encode('utf-8')).decode('utf-8')

n_chunks = 8
chunk_len = math.ceil(len(b64_str) / n_chunks)
print(f'Total b64 len: {len(b64_str)}, per chunk: ~{chunk_len}')

for i in range(n_chunks):
    val = b64_str[i*chunk_len:(i+1)*chunk_len]
    code = (
        "async () => {\n"
        "  return await cloudflare.request({\n"
        "    method: 'PUT',\n"
        f"    path: `/accounts/${{accountId}}/storage/kv/namespaces/fe9524c6c83a431eb26202f8b8435c51/values/b{i+1}`,\n"
        f"    body: '{val}',\n"
        "  });\n"
        "}\n"
    )
    with open(f'{scratch}/upload-b{i+1}.js', 'w') as f:
        f.write(code)
    print(f'Wrote upload-b{i+1}.js, length {len(code)}')
