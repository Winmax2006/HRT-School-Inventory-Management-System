# Update Config.gs and index.html to 2.7.0-rc.3
with open('Config.gs', 'r', encoding='utf-8') as f:
    config = f.read()
config = config.replace("'2.7.0-rc.2'", "'2.7.0-rc.3'")
with open('Config.gs', 'w', encoding='utf-8') as f:
    f.write(config)

with open('index.html', 'r', encoding='utf-8') as f:
    idx = f.read()
idx = idx.replace("2.7.0-rc.2", "2.7.0-rc.3")
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(idx)

# Update tests p3 and p4 valid versions
for tpath in ['tests/p3_miniui_critical_test.js', 'tests/p4_settings_important_test.js']:
    with open(tpath, 'r', encoding='utf-8') as f:
        ttext = f.read()
    ttext = ttext.replace("'2.7.0-rc.2']", "'2.7.0-rc.2', '2.7.0-rc.3']")
    ttext = ttext.replace("or 2.7.0-rc.2", "2.7.0-rc.2, or 2.7.0-rc.3")
    with open(tpath, 'w', encoding='utf-8') as f:
        f.write(ttext)

print("Updated version to 2.7.0-rc.3 across Config.gs, index.html, and tests")
