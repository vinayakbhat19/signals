import json

with open('/Users/vinayakbhat/.gemini/antigravity/brain/53a520b7-c3b0-4e0f-bc25-cc5c6bfa2925/scratch/pages-manifest-v10.json') as f:
    manifest_obj = json.load(f)

manifest_str = json.dumps(manifest_obj)

headers_content = """/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.workers.dev; frame-src 'self' https://challenges.cloudflare.com; frame-ancestors 'none'; form-action 'self'; base-uri 'self'; object-src 'none'
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(self), microphone=(), geolocation=(), payment=()
  Cache-Control: public, max-age=0, must-revalidate

/_next/static/*
  Cache-Control: public, max-age=31536000, immutable

/brand/*
  Cache-Control: public, max-age=604800

/emergency.json
  Cache-Control: public, max-age=15, must-revalidate
"""

js_code = (
    "async () => {\n"
    + "  const manifest = " + json.dumps(manifest_str) + ";\n"
    + "  const headersFile = " + json.dumps(headers_content) + ";\n"
    + '  const form = new FormData();\n'
    + '  form.append("manifest", manifest);\n'
    + '  form.append("_headers", new Blob([headersFile], { type: "text/plain" }), "_headers");\n'
    + '  form.append("branch", "main");\n'
    + '  form.append("commit_message", "Deploy v10: Native standalone Fiesta intro animation, official 4-day Linktree schedule, and Signals rainbow tab favicon");\n'
    + '  const res = await cloudflare.request({\n'
    + '    method: "POST",\n'
    + '    path: `/accounts/${accountId}/pages/projects/fiesta26/deployments`,\n'
    + '    body: form,\n'
    + '  });\n'
    + '  return {\n'
    + '    id: res.result?.id,\n'
    + '    url: res.result?.url,\n'
    + '    latest_stage: res.result?.latest_stage,\n'
    + '    jwt: res.result?.deployment_trigger?.metadata?.jwt,\n'
    + '  };\n'
    + '}\n'
)

out_path = '/Users/vinayakbhat/.gemini/antigravity/brain/53a520b7-c3b0-4e0f-bc25-cc5c6bfa2925/scratch/deploy-v10-code.txt'
with open(out_path, 'w') as f:
    f.write(js_code)

print('Generated deploy-v10-code.txt successfully, length:', len(js_code))
