/* Общие функции: банк заданий, подсчёт баллов, код, строка результата */
(function () {
  var KEY = 'ВОВ-СОО-1941-1945';
  var SALT = 'vov-1941-1945-v1';
  var _bank = null;

  function utf8Bytes(s) { return new TextEncoder().encode(s); }

  function loadBank() {
    if (_bank) return _bank;
    var bin = atob(window.__QB);
    var key = utf8Bytes(KEY);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i) ^ key[i % key.length];
    _bank = JSON.parse(new TextDecoder().decode(bytes));
    return _bank;
  }

  function norm(s) {
    return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[\s\-–—.]+/g, '');
  }

  function hash53(str, seed) {
    var h1 = 0xdeadbeef ^ (seed || 0), h2 = 0x41c6ce57 ^ (seed || 0);
    for (var i = 0, ch; i < str.length; i++) {
      ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
  }

  function makeCode(surname, score) {
    return String((hash53(norm(surname) + '|' + score + '|' + SALT, 7) % 90000) + 10000);
  }

  function gradeFor(score, total) {
    var p = score / total * 100;
    if (p >= 90) return 5;
    if (p >= 75) return 4;
    if (p >= 50) return 3;
    return 2;
  }

  function maxScore() {
    var b = loadBank();
    var m = { test: 40, match: 0, chron: 0, gaps: 0, src: 0 };
    b.match.forEach(function (x) { m.match += x.left.length; });
    b.chron.forEach(function (x) { m.chron += x.events.length; });
    b.gaps.forEach(function (x) { m.gaps += x.ans.length; });
    b.src.forEach(function (x) { m.src += x.qs.length; });
    m.total = m.test + m.match + m.chron + m.gaps + m.src;
    return m;
  }

  // res: {tq:[id...], A:{t:{id:opt}, m:[[..]], c:[[..]], g:[[..]], s:[[..]]}}
  function scoreAll(res) {
    var b = loadBank(), A = res.A || {}, s = { test: 0, match: 0, chron: 0, gaps: 0, src: 0 };
    (res.tq || []).forEach(function (id) { if (A.t && A.t[id] === b.test[id].a) s.test++; });
    b.match.forEach(function (x, k) { x.ans.forEach(function (a, i) { if (A.m && A.m[k] && A.m[k][i] === a) s.match++; }); });
    b.chron.forEach(function (x, k) { x.events.forEach(function (_, i) { if (A.c && A.c[k] && A.c[k][i] === i + 1) s.chron++; }); });
    b.gaps.forEach(function (x, k) { x.ans.forEach(function (a, i) { if (A.g && A.g[k] && A.g[k][i] === a) s.gaps++; }); });
    b.src.forEach(function (x, k) { x.qs.forEach(function (q, i) { if (A.s && A.s[k] && A.s[k][i] === q.a) s.src++; }); });
    s.total = s.test + s.match + s.chron + s.gaps + s.src;
    return s;
  }

  function toB64(obj) {
    var bytes = utf8Bytes(JSON.stringify(obj)), s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function fromB64(str) {
    var s = String(str || '').replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var bin = atob(s), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  function checksum(b) {
    return hash53(JSON.stringify([b.sn, b.nm, b.ex, b.tm, b.tq, b.A, b.sc, b.cd]) + SALT, 11).toString(36);
  }

  function packResult(r) {
    var b = { v: 2, sn: r.sn, nm: r.nm, ex: r.ex, tm: r.tm, tq: r.tq, A: r.A };
    b.sc = scoreAll(b).total;
    b.cd = makeCode(b.sn, b.sc);
    b.ck = checksum(b);
    return toB64(b);
  }

  function unpackResult(str) {
    var b = fromB64(str);
    b.score = scoreAll(b);
    b.integrity = (checksum(b) === b.ck);
    b.codeOk = (makeCode(b.sn, b.score.total) === b.cd) && (b.score.total === b.sc);
    return b;
  }

  async function sha256hex(s) {
    var buf = await crypto.subtle.digest('SHA-256', utf8Bytes(s));
    return Array.prototype.map.call(new Uint8Array(buf), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
  }

  window.REV = {
    loadBank: loadBank, norm: norm, makeCode: makeCode, gradeFor: gradeFor, maxScore: maxScore,
    scoreAll: scoreAll, packResult: packResult, unpackResult: unpackResult, sha256hex: sha256hex
  };
})();
