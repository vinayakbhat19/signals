import json

scratch = '/Users/vinayakbhat/.gemini/antigravity/brain/53a520b7-c3b0-4e0f-bc25-cc5c6bfa2925/scratch'
chunks = []
for i in range(1, 5):
    with open(f'{scratch}/v18-p{i}.txt') as fp:
        chunks.append(fp.read())

bulk_data = [{'key': f'p{i+1}', 'value': chunks[i]} for i in range(4)]

js_code = (
    "async () => {\n"
    "  const res = await cloudflare.request({\n"
    "    method: 'PUT',\n"
    "    path: `/accounts/${accountId}/storage/kv/namespaces/fe9524c6c83a431eb26202f8b8435c51/bulk`,\n"
    "    body: " + json.dumps(bulk_data) + ",\n"
    "  });\n"
    "  return res;\n"
    "}\n"
)

with open(f'{scratch}/v18-bulk-upload.js', 'w') as fp:
    fp.write(js_code)
print('Fixed v18-bulk-upload.js, size:', len(js_code))
