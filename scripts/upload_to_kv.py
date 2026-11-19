import json

ns = '97d62c474f9e4e6085edf2a9fbd22bb1'
scratch = '/Users/vinayakbhat/.gemini/antigravity/brain/53a520b7-c3b0-4e0f-bc25-cc5c6bfa2925/scratch'

for part in (1, 2, 3):
    with open(f'{scratch}/manifest-v10-p{part}.txt', 'r') as f:
        val = f.read()
    
    code = "async () => {\n"
    code += f"  const val = `{val}`;\n"
    code += "  await cloudflare.request({\n"
    code += '    method: "PUT",\n'
    code += f'    path: `/accounts/${{accountId}}/storage/kv/namespaces/{ns}/values/p{part}`,\n'
    code += '    headers: { "Content-Type": "text/plain" },\n'
    code += '    body: val,\n'
    code += '  });\n'
    code += f'  return {{ ok: true, part: {part}, len: val.length }};\n'
    code += '}'

    payload = {
        "account_id": "e0ff519987c1fbde9da3d0960b724eea",
        "code": code
    }

    with open(f'{scratch}/upload-p{part}.json', 'w') as f:
        json.dump(payload, f)

print("Generated upload-p1.json, upload-p2.json, upload-p3.json successfully!")
