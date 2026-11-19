import json, base64, math

scratch = '/Users/vinayakbhat/.gemini/antigravity/brain/53a520b7-c3b0-4e0f-bc25-cc5c6bfa2925/scratch'
ns = '3ec5d92da4d94ef0be4b42f5e6e53cde'

with open(f'{scratch}/pages-manifest-v19.json') as f:
    manifest = json.load(f)

manifest_str = json.dumps(manifest)
b64_str = base64.b64encode(manifest_str.encode('utf-8')).decode('utf-8')

n_chunks = 8
chunk_len = math.ceil(len(b64_str) / n_chunks)
print(f'Total b64 len: {len(b64_str)}, per chunk: ~{chunk_len}')

for i in range(n_chunks):
    val = b64_str[i*chunk_len:(i+1)*chunk_len]
    code = (
        'async () => {\n'
        '  return await cloudflare.request({\n'
        '    method: "PUT",\n'
        '    path: `/accounts/${accountId}/storage/kv/namespaces/' + ns + '/values/b' + str(i+1) + '`,\n'
        '    body: "' + val + '",\n'
        '  });\n'
        '}\n'
    )
    with open(f'{scratch}/upload-v19-b{i+1}.js', 'w') as f:
        f.write(code)
    print(f'Wrote upload-v19-b{i+1}.js, length {len(code)}')
