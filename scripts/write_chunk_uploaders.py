import json

scratch = '/Users/vinayakbhat/.gemini/antigravity/brain/53a520b7-c3b0-4e0f-bc25-cc5c6bfa2925/scratch'

for i in range(1, 5):
    with open(f'{scratch}/v18-p{i}.txt') as f:
        val = f.read()
    code = (
        "async () => {\n"
        "  return await cloudflare.request({\n"
        "    method: 'PUT',\n"
        f"    path: `/accounts/${{accountId}}/storage/kv/namespaces/fe9524c6c83a431eb26202f8b8435c51/values/p{i}`,\n"
        "    body: " + json.dumps(val) + ",\n"
        "  });\n"
        "}\n"
    )
    with open(f'{scratch}/upload-kv-p{i}.js', 'w') as f:
        f.write(code)
    print(f'Wrote upload-kv-p{i}.js, length {len(code)}')
