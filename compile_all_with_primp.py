import json
import os
import time
import urllib.parse
import primp

client = primp.Client()

with open('extracted_items.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

diseases = data.get('diseases', [])
pests = data.get('pests', [])
all_items = [{**d, 'type': 'disease'} for d in diseases] + [{**p, 'type': 'pest'} for p in pests]

print(f"Total records to verify: {len(all_items)}")

out_file = os.path.join('lib', 'data', 'cropHealthTranslations.json')
dict_data = {}
if os.path.exists(out_file):
    try:
        with open(out_file, 'r', encoding='utf-8') as f:
            dict_data = json.load(f)
    except Exception:
        dict_data = {}

print(f"Existing keys in dict: {len(dict_data)}")

def is_tamil(text):
    if not text:
        return False
    return any(0x0B80 <= ord(c) <= 0x0BFF for c in text[:30])

def translate_with_primp(text):
    clean = text.replace('\n', ' ').strip()
    url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=ta&tl=en&dt=t&q=' + urllib.parse.quote(clean)
    r = client.get(url)
    if r.status_code == 200:
        j = r.json()
        parts = [x[0] for x in (j[0] or []) if x and x[0]]
        res = ''.join(parts).strip()
        if res and not is_tamil(res):
            return res
    return None

translated_new = 0
for idx, item in enumerate(all_items):
    msg = item.get('msg', '').strip()
    sl_key = f"{item['type']}-{item['slNo']}"
    crop_key = f"{item['crop']}:{item['nameEn']}"

    # Check if already translated
    existing = dict_data.get(msg) or dict_data.get(sl_key) or dict_data.get(crop_key)
    if existing and not is_tamil(existing):
        dict_data[msg] = existing
        dict_data[sl_key] = existing
        dict_data[crop_key] = existing
        continue

    # Translate
    trans = translate_with_primp(msg)
    if trans:
        dict_data[msg] = trans
        dict_data[sl_key] = trans
        dict_data[crop_key] = trans
        translated_new += 1
    else:
        print(f"Failed to translate: {crop_key}")

    time.sleep(0.04)
    if (idx + 1) % 25 == 0 or idx == len(all_items) - 1:
        print(f"Progress: {idx+1}/{len(all_items)} (New translated: {translated_new}, Total keys: {len(dict_data)})")

os.makedirs(os.path.dirname(out_file), exist_ok=True)
with open(out_file, 'w', encoding='utf-8') as f:
    json.dump(dict_data, f, ensure_ascii=False, indent=2)

print(f"Successfully saved {len(dict_data)} keys to {out_file}")

# Final verification
d_covered = sum(1 for d in diseases if dict_data.get(d['msg']) or dict_data.get(f"disease-{d['slNo']}") or dict_data.get(f"{d['crop']}:{d['nameEn']}"))
p_covered = sum(1 for p in pests if dict_data.get(p['msg']) or dict_data.get(f"pest-{p['slNo']}") or dict_data.get(f"{p['crop']}:{p['nameEn']}"))
print(f"FINAL COVERAGE -> Diseases: {d_covered}/{len(diseases)} | Pests: {p_covered}/{len(pests)}")

