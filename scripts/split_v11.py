import os
import json

ns = 'fe8a394e4cc64d4da45723033344f9d8'
scratch = '/Users/vinayakbhat/.gemini/antigravity/brain/53a520b7-c3b0-4e0f-bc25-cc5c6bfa2925/scratch'

with open(f'{scratch}/pages-manifest-v11-actual.json') as f:
    manifest_str = f.read()

p1 = manifest_str[:10000]
p2 = manifest_str[10000:20000]
p3 = manifest_str[20000:]

for idx, p in enumerate([p1, p2, p3], 1):
    with open(f'{scratch}/v11-p{idx}.txt', 'w') as f:
        f.write(p)
    
    code = "async () => {\n"
    code += f"  const val = `{p}`;\n"
    code += "  await cloudflare.request({\n"
    code += '    method: "PUT",\n'
    code += f'    path: `/accounts/${{accountId}}/storage/kv/namespaces/{ns}/values/p{idx}`,\n'
    code += '    headers: { "Content-Type": "text/plain" },\n'
    code += '    body: val,\n'
    code += '  });\n'
    code += f'  return {{ ok: true, part: {idx}, len: val.length }};\n'
    code += '}'

    with open(f'{scratch}/code-v11-p{idx}.js', 'w') as f:
        f.write(code)

print(f'Done! p1: {len(p1)}, p2: {len(p2)}, p3: {len(p3)}')
