import re

def inspect_file(path):
    print(f"=== Sheets in {path} ===")
    try:
        with open(path, 'r', encoding='utf-8') as f:
            text = f.read()
        sheets = set(re.findall(r'(?:insertSheet|getSheetByName|SHEETS\.[A-Z_]+)\s*[:\(]?\s*[\'"]([0-9A-Za-z_]+)[\'"]', text))
        for s in sorted(list(sheets)):
            print(f"  - {s}")
    except Exception as e:
        print(f"  Error: {e}")

inspect_file('backend/setup/Setup.gs')
inspect_file('apps_script/Setup.gs')
inspect_file('Config.gs')
