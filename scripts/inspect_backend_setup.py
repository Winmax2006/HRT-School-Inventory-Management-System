with open('backend/setup/Setup.gs', 'r', encoding='utf-8') as f:
    text = f.read()

print(f"backend/setup/Setup.gs length: {len(text)}")
lines = [l for l in text.split('\n') if 'sheet' in l.lower() or 'table' in l.lower() or 'schema' in l.lower()]
print(f"Matches count: {len(lines)}")
for l in lines[:25]:
    print(" ", l.strip())
