/**
 * 语音英语查询 - 后端服务
 * 提供两个能力：
 *  1. 静态托管前端页面 (client/index.html)
 *  2. /api/lookup?q=xxx 代理有道词典查询（中文→英文、英文→中文）
 */
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const CLIENT_DIR = path.join(__dirname, '..', 'client');
const INDEX_HTML = path.join(CLIENT_DIR, 'index.html');

// ---------- 有道词典查询 ----------
const YOUD_BASE = 'https://dict.youdao.com/jsonapi';

function youdaoQuery(q, le) {
  return new Promise((resolve, reject) => {
    const url = `${YOUD_BASE}?q=${encodeURIComponent(q)}${le ? `&le=${le}` : ''}`;
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://dict.youdao.com/' } }, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('有道响应解析失败'));
          }
        });
      })
      .on('error', reject);
  });
}

/** 从中文查询结果中提取英文单词（尽量选最常见的） */
function extractEnWordFromZh(json) {
  const candidates = [];
  // 1) ce 词典部分：trs -> tr -> l.i（可能是字符串、数组或 {#text: ...}）
  const ce = json && json.ce;
  if (ce && Array.isArray(ce.word)) {
    for (const w of ce.word) {
      for (const trs of w.trs || []) {
        for (const tr of trs.tr || []) {
          const i = tr.l && tr.l.i;
          collectEnText(i, candidates);
        }
      }
    }
  }
  // 2) web_trans 网络释义
  const wt = json && json.web_trans && json.web_trans['web-translation'];
  if (Array.isArray(wt)) {
    for (const t of wt) {
      for (const tr of t.trans || []) {
        if (tr.value) candidates.push(tr.value);
      }
    }
  }
  // 3) simple 简版
  const smp = json && json.simple && json.simple.word;
  if (Array.isArray(smp)) {
    for (const w of smp) {
      if (w['return-phrase']) candidates.push(w['return-phrase']);
    }
  }
  // 清洗：只保留纯英文字母单词，排除"苹果公司"这类短语干扰，按出现顺序去重
  for (const c of candidates) {
    const s = cleanWord(c);
    if (s && /^[a-zA-Z]+$/.test(s)) return s.toLowerCase();
  }
  return null;
}

/** 从 ec 词典结果中提取英文条目（单词、音标、中文释义） */
function extractEnEntry(json) {
  const ec = json && json.ec;
  if (!ec || !Array.isArray(ec.word) || ec.word.length === 0) return null;
  const w = ec.word[0];
  let word = null;
  const rp = w['return-phrase'];
  if (typeof rp === 'string') word = rp;
  else if (rp && rp.l && rp.l.i) word = rp.l.i;
  else if (w.word && typeof w.word === 'object' && w.word['#text']) word = w.word['#text'];
  else if (typeof w.word === 'string') word = w.word;
  if (!word) return null;
  word = String(word).toLowerCase();
  const phonetic = w.ukphone || w.usphone || '';
  const meanings = [];
  for (const trs of w.trs || []) {
    for (const tr of trs.tr || []) {
      const i = tr.l && tr.l.i;
      if (typeof i === 'string' && i.trim()) {
        meanings.push(i.trim());
      } else if (Array.isArray(i)) {
        for (const it of i) {
          if (typeof it === 'string' && it.trim()) meanings.push(it.trim());
        }
      } else if (i && typeof i === 'object' && i['#text']) {
        meanings.push(String(i['#text']).trim());
      }
    }
  }
  if (!word) return null;
  return {
    word,
    phonetic,
    meaning: dedupe(meanings).slice(0, 4).join('；'),
  };
}

function collectEnText(i, arr) {
  if (typeof i === 'string' && i.trim()) arr.push(i);
  else if (Array.isArray(i)) i.forEach((x) => collectEnText(x, arr));
  else if (i && typeof i === 'object') {
    if (i['#text']) arr.push(i['#text']);
    for (const k of Object.keys(i)) if (typeof i[k] !== 'object') collectEnText(i[k], arr);
  }
}

function cleanWord(s) {
  return String(s)
    .replace(/<[^>]+>/g, '')
    .replace(/[^a-zA-Z\u4e00-\u9fa5\s'-]/g, '')
    .trim();
}

function dedupe(arr) {
  const seen = new Set();
  return arr.filter((x) => {
    if (seen.has(x)) return false;
    seen.add(x);
    return true;
  });
}

function isChinese(s) {
  return /[\u4e00-\u9fa5]/.test(s);
}

/** 主查询：中→英 或 英→中 */
async function lookup(q) {
  q = String(q || '').trim();
  if (!q) throw new Error('请输入词语');

  if (isChinese(q)) {
    // 中文：先查一次拿英文单词
    const zhJson = await youdaoQuery(q, '');
    let en = extractEnWordFromZh(zhJson);
    if (!en) throw new Error('没有找到该词的英文翻译');
    // 再用英文查一次拿音标和中文释义
    const enJson = await youdaoQuery(en, 'eng');
    const entry = extractEnEntry(enJson) || {};
    return {
      query: q,
      lang: 'zh',
      word: entry.word || en,
      phonetic: entry.phonetic || '',
      meaning: entry.meaning || '',
      spelling: (entry.word || en).split(''),
    };
  }

  // 英文：直接查
  const enJson = await youdaoQuery(q, 'eng');
  const entry = extractEnEntry(enJson);
  if (!entry) throw new Error('没有找到该单词');
  return {
    query: q,
    lang: 'en',
    word: entry.word,
    phonetic: entry.phonetic,
    meaning: entry.meaning,
    spelling: entry.word.split(''),
  };
}

// ---------- HTTP 服务 ----------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = decodeURIComponent(url.pathname);

  // 查询接口
  if (pathname === '/api/lookup') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    try {
      const result = await lookup(url.searchParams.get('q'));
      res.end(JSON.stringify({ code: 0, data: result }));
    } catch (e) {
      res.statusCode = 200;
      res.end(JSON.stringify({ code: 1, message: e.message || '查询失败，请换个词试试' }));
    }
    return;
  }

  // 静态资源
  let filePath;
  if (pathname === '/' || pathname === '') filePath = INDEX_HTML;
  else filePath = path.join(CLIENT_DIR, pathname);

  if (!filePath.startsWith(CLIENT_DIR)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`语音英语查询服务已启动: http://localhost:${PORT}`);
});
