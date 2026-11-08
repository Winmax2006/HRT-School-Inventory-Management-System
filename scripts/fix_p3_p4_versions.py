for tpath in ['tests/p3_miniui_critical_test.js', 'tests/p4_settings_important_test.js']:
    with open(tpath, 'r', encoding='utf-8') as f:
        ttext = f.read()
    ttext = ttext.replace('"VERSION: \'2.7.0-rc.2\'"]', '"VERSION: \'2.7.0-rc.2\'", "VERSION: \'2.7.0-rc.3\'"]')
    ttext = ttext.replace("'v2.7.0-rc.2']", "'v2.7.0-rc.2', 'v2.7.0-rc.3']")
    with open(tpath, 'w', encoding='utf-8') as f:
        f.write(ttext)

print("Updated validVersions and validIndexVersions in p3 and p4 to include 2.7.0-rc.3")
