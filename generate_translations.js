const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

function isMostlyTamil(str) {
  if (!str) return false;
  const count = (str.match(/[\u0B80-\u0BFF]/g) || []).length;
  return count > 10;
}

async function translateBatch(items) {
  const combined = items.map(t => t.replace(/\r?\n+/g, ' ')).join(' \n###\n ');
  const res = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=ta&tl=en&dt=t', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: 'q=' + encodeURIComponent(combined)
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const json = await res.json();
  const raw = (json[0] || []).map(x => x[0] || '').join('');
  const split = raw.split(/\s*###\s*/);
  return items.map((item, idx) => {
    const trans = (split[idx] || '').trim();
    return trans && !isMostlyTamil(trans) ? trans : item;
  });
}

async function buildDictionary() {
  console.log('Fetching Disease HTML...');
  const dRes = await fetch('https://www.tnagrisnet.tn.gov.in/home/disDetails/en', { headers: { 'User-Agent': 'PrecisionFarmOS/1.0' } });
  const dHtml = await dRes.text();
  const $d = cheerio.load(dHtml);
  const texts = [];
  $d('table#example tbody tr').each((i, row) => {
    const tds = $d(row).find('td');
    if (tds.length >= 4) {
      const txt = tds.eq(3).text().trim();
      if (txt && !texts.includes(txt)) texts.push(txt);
    }
  });

  console.log('Fetching Pest HTML...');
  const pRes = await fetch('https://www.tnagrisnet.tn.gov.in/home/pestDetails/en', { headers: { 'User-Agent': 'PrecisionFarmOS/1.0' } });
  const pHtml = await pRes.text();
  const $p = cheerio.load(pHtml);
  $p('table#example tbody tr').each((i, row) => {
    const tds = $p(row).find('td');
    if (tds.length >= 4) {
      const txt = tds.eq(3).text().trim();
      if (txt && !texts.includes(txt)) texts.push(txt);
    }
  });

  console.log('Total unique texts to translate:', texts.length);

  const dict = {};
  const CHUNK_SIZE = 10;
  for (let i = 0; i < texts.length; i += CHUNK_SIZE) {
    const slice = texts.slice(i, i + CHUNK_SIZE);
    try {
      const translated = await translateBatch(slice);
      slice.forEach((orig, idx) => {
        const trans = translated[idx];
        if (trans && !isMostlyTamil(trans)) {
          dict[orig] = trans;
        }
      });
      console.log(`Translated ${Math.min(i + CHUNK_SIZE, texts.length)} / ${texts.length}`);
    } catch (err) {
      console.error(`Chunk ${i} failed:`, err.message);
    }
  }

  const outDir = path.join(__dirname, 'lib', 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'cropHealthTranslations.json');
  fs.writeFileSync(outFile, JSON.stringify(dict, null, 2), 'utf-8');
  console.log(`Saved ${Object.keys(dict).length} translations to ${outFile}`);
}

buildDictionary().catch(console.error);

