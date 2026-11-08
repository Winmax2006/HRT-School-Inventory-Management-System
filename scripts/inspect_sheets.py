import re

with open('School_Inventory_DB_2567_AppsScript.js', 'r', encoding='utf-8') as f:
    text = f.read()

sheets = set(re.findall(r'(?:insertSheet|getSheetByName)\([\'"]([^\'"]+)[\'"]\)', text))
print('Sheets in School_Inventory_DB_2567_AppsScript.js:')
for s in sorted(list(sheets)):
    print(f"  - {s}")
