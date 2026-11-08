import re

with open('frontend/pages/Settings.html', 'r', encoding='utf-8') as f:
    text = f.read()

ids = re.findall(r'id=["\']([^"\']+)["\']', text)
print(f"Total IDs: {len(ids)}")
set_ids = [i for i in ids if any(i.startswith(p) for p in ['set', 'qr', 'btn', 'mNav', 'mobile'])]
for s in sorted(set_ids):
    print(f"  {s}")
