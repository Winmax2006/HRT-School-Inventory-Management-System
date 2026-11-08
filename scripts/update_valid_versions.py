with open('tests/p3_miniui_critical_test.js', 'r', encoding='utf-8') as f:
    p3 = f.read()

p3 = p3.replace('"VERSION: \'2.7.0-rc.1\'"', '"VERSION: \'2.7.0-rc.1\'", "VERSION: \'2.7.0-rc.2\'"')
p3 = p3.replace("'v2.7.0-rc.1'", "'v2.7.0-rc.1', 'v2.7.0-rc.2'")

with open('tests/p3_miniui_critical_test.js', 'w', encoding='utf-8') as f:
    f.write(p3)

with open('tests/p4_settings_important_test.js', 'r', encoding='utf-8') as f:
    p4 = f.read()

p4 = p4.replace('"VERSION: \'2.7.0-rc.1\'"', '"VERSION: \'2.7.0-rc.1\'", "VERSION: \'2.7.0-rc.2\'"')
p4 = p4.replace("'v2.7.0-rc.1'", "'v2.7.0-rc.1', 'v2.7.0-rc.2'")

with open('tests/p4_settings_important_test.js', 'w', encoding='utf-8') as f:
    f.write(p4)

print("Updated validVersions arrays in p3 and p4 successfully")
