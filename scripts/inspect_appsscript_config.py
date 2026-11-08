with open('apps_script/Config.gs', 'r', encoding='utf-8') as f:
    text = f.read()

print(f"apps_script/Config.gs length: {len(text)}")
idx = text.find('SHEET_NAMES')
if idx != -1:
    print(text[idx:idx+1200])
