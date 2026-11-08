with open('tests/p3_miniui_critical_test.js', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("'2.7.0-rc.1']", "'2.7.0-rc.1', '2.7.0-rc.2']")
text = text.replace("or 2.7.0-rc.1", "2.7.0-rc.1, or 2.7.0-rc.2")

with open('tests/p3_miniui_critical_test.js', 'w', encoding='utf-8') as f:
    f.write(text)

with open('tests/p4_settings_important_test.js', 'r', encoding='utf-8') as f:
    text4 = f.read()

text4 = text4.replace("'2.7.0-rc.1']", "'2.7.0-rc.1', '2.7.0-rc.2']")
text4 = text4.replace("or 2.7.0-rc.1", "2.7.0-rc.1, or 2.7.0-rc.2")

with open('tests/p4_settings_important_test.js', 'w', encoding='utf-8') as f:
    f.write(text4)

print("Updated p3 and p4 test suites successfully")
