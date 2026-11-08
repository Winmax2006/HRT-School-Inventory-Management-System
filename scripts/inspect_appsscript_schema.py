with open('apps_script/Schema.gs', 'r', encoding='utf-8') as f:
    text = f.read()

print(f"apps_script/Schema.gs length: {len(text)}")
print(text[:1200])
