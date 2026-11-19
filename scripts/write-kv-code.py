import json

for part_num in (1, 2, 3):
    with open(f'/Users/vinayakbhat/.gemini/antigravity/brain/53a520b7-c3b0-4e0f-bc25-cc5c6bfa2925/scratch/manifest-v10-p{part_num}.txt') as f:
        val = f.read()

    js_code = (
        "async () => {\n"
        + "  const val = " + json.dumps(val) + ";\n"
        + "  await cloudflare.request({\n"
        + '    method: "PUT",\n'
        + f'    path: `/accounts/${{accountId}}/storage/kv/namespaces/a39cbb339d7443c69cc657aa975d9065/values/p{part_num}`,\n'
        + '    headers: { "Content-Type": "text/plain" },\n'
        + '    body: val,\n'
        + '  });\n'
        + f'  return {{ ok: true, part: {part_num}, len: val.length }};\n'
        + '}\n'
    )
    with open(f'/Users/vinayakbhat/.gemini/antigravity/brain/53a520b7-c3b0-4e0f-bc25-cc5c6bfa2925/scratch/kv-v10-p{part_num}-code.txt', 'w') as f:
        f.write(js_code)
    print(f'Wrote kv-v10-p{part_num}-code.txt')
