with open('backend/data/Schema.gs', 'r', encoding='utf-8') as f:
    text = f.read()

print(f"backend/data/Schema.gs length: {len(text)}")
print(text[:1200])
