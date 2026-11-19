with open('/Users/vinayakbhat/.gemini/antigravity/brain/53a520b7-c3b0-4e0f-bc25-cc5c6bfa2925/scratch/pages-manifest-v10.json') as f:
    text = f.read()
print('Contains backtick?', '`' in text)
print('Contains dollar?', '$' in text)
