import re

with open('frontend/pages/Settings.html', 'r', encoding='utf-8') as f:
    text = f.read()

ids = re.findall(r'id=["\']([^"\']+)["\']', text)
modal_ids = [i for i in ids if 'modal' in i.lower()]
print(f"Modal IDs in Settings.html: {len(modal_ids)}")
for m in sorted(modal_ids):
    print(f"  {m}")
