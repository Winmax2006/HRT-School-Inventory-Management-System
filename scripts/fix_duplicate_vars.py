with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

target = "var _cachedDashboardData = null;\r\n        var _lastFilterSignature = null;"
replacement = "_cachedDashboardData = null;\r\n        _lastFilterSignature = null;"

if target in text:
    text = text.replace(target, replacement, 1)
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Replaced successfully")
else:
    # Try LF
    target_lf = "var _cachedDashboardData = null;\n        var _lastFilterSignature = null;"
    replacement_lf = "_cachedDashboardData = null;\n        _lastFilterSignature = null;"
    if target_lf in text:
        text = text.replace(target_lf, replacement_lf, 1)
        with open('index.html', 'w', encoding='utf-8') as f:
            f.write(text)
        print("Replaced LF successfully")
    else:
        print("Target not found")
