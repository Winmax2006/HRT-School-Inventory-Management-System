with open('Api.gs', 'r', encoding='utf-8') as f:
    text = f.read()

print(f"Api.gs length: {len(text)}")
idx = text.find('ACTION_ROUTING')
if idx != -1:
    print(text[idx:idx+1500])
else:
    print("ACTION_ROUTING not found directly")
    # find switch or router
    idx2 = text.find('apiDispatch')
    if idx2 != -1:
        print(text[idx2:idx2+1500])
