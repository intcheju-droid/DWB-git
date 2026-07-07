/*
 * 더불어 함께 — 사이트 빌드 스크립트 (외부 의존성 없음, Node 18+)
 * 사용법: node build.js
 * articles/*.md 를 읽어 public/ 에 사이트 전체를 생성합니다.
 */
const fs = require('fs');
const path = require('path');

/* ===== 설정 — 배포 후 실제 주소로 바꾸세요 ===== */
const SITE = {
  name: '더불어 함께',
  slogan: '장애인 등 사회적약자의 보편적 언론 권리를 실현하는 인터넷신문',
  url: 'https://intcheju-droid.github.io/DWB-git', // GitHub Pages 주소로 교체
  email: 'intcheju@gmail.com',
  register: '(등록 후 기재)',
  publisher: '(성명)'
};

const ROOT = __dirname;
const OUT = path.join(ROOT, 'public');

/* ===== 유틸 ===== */
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function inline(s){ return s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'); }
function mdToHtml(src){
  return src.split(/\n\s*\n/).map(function(b){
    b = b.trim();
    if(!b) return '';
    if(b.charAt(0) === '<') return b; // raw HTML 블록 통과
    if(b.indexOf('### ') === 0) return '<h3>' + inline(esc(b.slice(4))) + '</h3>';
    if(b.indexOf('## ') === 0) return '<h2>' + inline(esc(b.slice(3))) + '</h2>';
    return '<p>' + inline(esc(b)).replace(/\n/g, '<br>') + '</p>';
  }).join('\n');
}
function fmtDate(iso){ var d = iso.split('-'); return d[0] + '. ' + Number(d[1]) + '. ' + Number(d[2]) + '.'; }

/* ===== 기사 파일 파싱 ===== */
function parseArticle(file){
  var raw = fs.readFileSync(path.join(ROOT, 'articles', file), 'utf8').replace(/^﻿/, '');
  var m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if(!m) throw new Error(file + ': 머리말(---)이 없습니다');
  var meta = {};
  m[1].split('\n').forEach(function(line){
    var i = line.indexOf(':');
    if(i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  });
  var rest = m[2];
  var easySplit = rest.split(/\n===쉬운글===\n/);
  var body = easySplit[0].trim();
  var easyBody = '', easyTitle = '', words = [];
  if(easySplit[1]){
    var wordsSplit = easySplit[1].split(/\n===풀이===\n/);
    var easyLines = wordsSplit[0].trim().split('\n');
    easyTitle = easyLines.shift().trim();
    easyBody = easyLines.join('\n').trim();
    if(wordsSplit[1]){
      wordsSplit[1].trim().split('\n').forEach(function(line){
        var p = line.split('|');
        if(p.length >= 2) words.push([p[0].trim(), p.slice(1).join('|').trim()]);
      });
    }
  }
  return {
    slug: file.replace(/\.md$/, ''),
    meta: meta, body: body,
    easyTitle: easyTitle, easyBody: easyBody, words: words
  };
}

/* ===== 공통 틀 ===== */
function shell(opts){
  return '<!DOCTYPE html>\n<html lang="ko">\n<head>\n'
  + '<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
  + '<title>' + esc(opts.title) + '</title>\n'
  + '<meta name="description" content="' + esc(opts.desc || SITE.slogan) + '">\n'
  + '<link rel="stylesheet" href="' + opts.base + 'assets/style.css">\n'
  + '<link rel="alternate" type="application/rss+xml" title="' + esc(SITE.name) + ' RSS" href="' + opts.base + 'rss.xml">\n'
  + '</head>\n<body>\n'
  + '<a class="skip" href="#main">본문 바로가기</a>\n'
  + '<div class="topbar"><div class="inner">\n'
  + (opts.home
      ? '<span>사람의 가치를 실현하는 장애인 주도형 언론</span>'
      : '<a href="' + opts.base + 'index.html">← ' + esc(SITE.name) + ' 홈으로</a>')
  + '\n<span role="group" aria-label="화면 보기 설정">글자 크기\n'
  + '<button type="button" id="fs1" aria-pressed="true" onclick="setFs(\'\')">기본</button>\n'
  + '<button type="button" id="fs2" aria-pressed="false" onclick="setFs(\'big\')">크게</button>\n'
  + '<button type="button" id="fs3" aria-pressed="false" onclick="setFs(\'bigger\')">아주 크게</button>\n'
  + '<button type="button" id="hc" aria-pressed="false" onclick="toggleHc()">고대비</button>\n'
  + '</span></div></div>\n'
  + '<header class="masthead"><div class="inner">\n'
  + '<a class="logo" href="' + opts.base + 'index.html">' + esc(SITE.name) + '<span class="dot">.</span></a>\n'
  + (opts.home ? '<span class="slogan">' + esc(SITE.slogan) + '</span>' : '')
  + '\n</div></header>\n'
  + opts.content
  + '\n<footer><div class="inner">\n'
  + '<strong>' + esc(SITE.name) + '</strong> — 장애인 주도형 인터넷신문<br>\n'
  + '등록번호: ' + esc(SITE.register) + ' | 발행인·편집인: ' + esc(SITE.publisher) + ' | 이메일: <a href="mailto:' + SITE.email + '">' + SITE.email + '</a><br>\n'
  + '본지는 장애인 보도 권고기준과 자체 보도 가이드라인을 준수하며, 모든 기사에 대체텍스트와 쉬운글 버전을 제공합니다.<br>\n'
  + '<a href="' + opts.base + 'rss.xml">RSS 구독</a> · © ' + new Date().getFullYear() + ' ' + esc(SITE.name) + '. 콘텐츠 무단 전재·재배포 금지.\n'
  + '</div></footer>\n'
  + '<script src="' + opts.base + 'assets/site.js"></script>\n'
  + '</body>\n</html>\n';
}

/* ===== 기사 페이지 ===== */
function articlePage(a){
  var mt = a.meta;
  var tag = mt.series ? (mt.series + (mt.seriesNo ? ' ' + '①②③④⑤⑥⑦⑧⑨⑩'.charAt(Number(mt.seriesNo) - 1) : '')) : (mt.category || '');
  var fig = '';
  if(mt.image){
    fig = '<figure><img src="' + esc(mt.image) + '" alt="' + esc(mt.imageAlt || '') + '">'
        + (mt.imageCaption ? '<figcaption>' + esc(mt.imageCaption) + '</figcaption>' : '') + '</figure>';
  } else if(mt.imageAlt){
    fig = '<figure><div class="thumb" role="img" aria-label="' + esc(mt.imageAlt) + '">[사진 자리]<br>'
        + esc(mt.imageCaption || '') + '</div>'
        + (mt.imageCaption ? '<figcaption>' + esc(mt.imageCaption) + '</figcaption>' : '') + '</figure>';
  }
  var easy = '';
  if(a.easyBody){
    easy = '<section class="easy" id="easy" aria-label="쉬운글 버전 기사">\n<h2>' + esc(a.easyTitle) + '</h2>\n'
      + mdToHtml(a.easyBody)
      + (a.words.length
          ? '\n<div class="words"><h3>어려운 말 풀이</h3><dl>'
            + a.words.map(function(w){ return '<dt>' + esc(w[0]) + '</dt><dd>' + esc(w[1]) + '</dd>'; }).join('')
            + '</dl></div>'
          : '')
      + '\n</section>';
  }
  var content =
    '<main id="main" class="wrap narrow">\n'
    + '<p class="breadcrumb"><a href="../index.html">홈</a> › ' + esc(mt.category || '기사') + '</p>\n'
    + (tag ? '<span class="tag">' + esc(tag) + '</span>\n' : '')
    + '<h1 class="article-title">' + esc(mt.title) + '</h1>\n'
    + (mt.subtitle ? '<p class="subtitle">' + esc(mt.subtitle).replace(/ \/ /g, '<br>') + '</p>\n' : '')
    + '<div class="meta"><span>' + esc(mt.author || '') + ' | 입력 ' + fmtDate(mt.date) + '</span>\n'
    + '<span role="group" aria-label="기사 소리로 듣기">'
    + '<button type="button" class="tts" id="tts-play" onclick="ttsToggle()">🔊 소리로 듣기</button>'
    + '<button type="button" class="tts" id="tts-stop" onclick="ttsStop()" hidden>■ 처음부터</button>'
    + '</span></div>\n'
    + (a.easyBody
        ? '<div class="mode-switch" role="group" aria-label="읽기 방식 선택">'
          + '<button type="button" id="btn-normal" aria-pressed="true" onclick="setEasy(false)">원문 기사</button>'
          + '<button type="button" id="btn-easy" aria-pressed="false" onclick="setEasy(true)">쉬운글로 읽기</button></div>\n'
        : '')
    + '<article class="normal" aria-label="원문 기사">\n' + fig + '\n' + mdToHtml(a.body) + '\n</article>\n'
    + easy
    + '\n</main>';
  return shell({ title: mt.title + ' — ' + SITE.name, desc: mt.description, base: '../', content: content });
}

/* ===== 메인 페이지 ===== */
function indexPage(articles){
  var head = articles[0];
  var rest = articles.slice(1);
  var hm = head.meta;
  var headThumb = hm.image
    ? '<img src="articles/' + esc(hm.image) + '" alt="' + esc(hm.imageAlt || '') + '" style="width:100%">'
    : '<div class="thumb" role="img" aria-label="' + esc(hm.imageAlt || hm.title) + '">[대표 사진 자리]</div>';
  var seriesBox = '';
  if(hm.series){
    var sameSeries = articles.filter(function(a){ return a.meta.series === hm.series; })
      .sort(function(x, y){ return Number(x.meta.seriesNo || 0) - Number(y.meta.seriesNo || 0); });
    seriesBox = '<div class="box"><h3>연재 — ' + esc(hm.series) + '</h3><ul style="list-style:none">'
      + sameSeries.map(function(a){
          return '<li style="padding:.3rem 0"><a href="articles/' + a.slug + '.html">'
            + (a.meta.seriesNo ? a.meta.seriesNo + '회. ' : '') + esc(a.meta.title) + '</a></li>';
        }).join('')
      + '</ul></div>';
  }
  var content =
    '<nav class="gnb" aria-label="주 메뉴"><ul>'
    + '<li><a href="index.html" aria-current="page">홈</a></li>'
    + ['복지','인권','제주','기획·연재','쉬운뉴스','오피니언'].map(function(c){ return '<li><a href="index.html#list">' + c + '</a></li>'; }).join('')
    + '</ul></nav>\n'
    + '<main id="main" class="wrap">\n<div class="grid">\n<section aria-label="주요 기사">\n'
    + '<article class="headline">' + headThumb
    + '<div class="body">'
    + (hm.series ? '<span class="tag">기획 · ' + (hm.seriesNo || '') + '회차</span>' : '<span class="tag">' + esc(hm.category || '뉴스') + '</span>')
    + '<h2><a href="articles/' + head.slug + '.html">' + esc(hm.title) + '</a></h2>'
    + '<p>' + esc(hm.description || '') + '</p>'
    + '<p class="byline">' + esc(hm.author || '') + ' · ' + fmtDate(hm.date) + '</p>'
    + '</div></article>\n'
    + '<section class="list" id="list" aria-label="최신 기사"><h3>최신 기사</h3>\n'
    + (rest.length
        ? rest.map(function(a){
            return '<article><h4><a href="articles/' + a.slug + '.html">' + esc(a.meta.title) + '</a></h4>'
              + '<p class="info">' + esc(a.meta.category || '') + ' · ' + esc(a.meta.author || '') + ' · ' + fmtDate(a.meta.date) + '</p></article>';
          }).join('\n')
        : '<p style="color:var(--sub);font-size:.9em;padding:.8rem 0">곧 새 기사가 추가됩니다.</p>')
    + '</section>\n</section>\n'
    + '<aside aria-label="보조 콘텐츠">\n'
    + '<a class="easy-banner" href="articles/' + head.slug + '.html#easy">쉬운뉴스 바로가기<span>모든 주요 기사를 쉬운 문장으로도 읽을 수 있어요</span></a>\n'
    + seriesBox
    + '<div class="box"><h3>제보 · 구독</h3><p style="font-size:.88em">여러분의 제보가 기사가 됩니다.<br><a href="mailto:' + SITE.email + '">' + SITE.email + '</a></p>'
    + '<p style="font-size:.88em;margin-top:.5rem"><a href="rss.xml">RSS 구독</a></p></div>\n'
    + '</aside>\n</div>\n</main>';
  return shell({ title: SITE.name + ' — 장애인 주도형 인터넷신문', desc: SITE.slogan, base: '', content: content, home: true });
}

/* ===== RSS · 사이트맵 ===== */
function rss(articles){
  var items = articles.map(function(a){
    var link = SITE.url + '/articles/' + a.slug + '.html';
    return '<item><title>' + esc(a.meta.title) + '</title><link>' + link + '</link>'
      + '<guid>' + link + '</guid>'
      + '<description>' + esc(a.meta.description || '') + '</description>'
      + '<pubDate>' + new Date(a.meta.date + 'T09:00:00+09:00').toUTCString() + '</pubDate></item>';
  }).join('\n');
  return '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel>'
    + '<title>' + esc(SITE.name) + '</title><link>' + SITE.url + '</link>'
    + '<description>' + esc(SITE.slogan) + '</description><language>ko</language>\n'
    + items + '\n</channel></rss>\n';
}
function sitemap(articles){
  var urls = ['<url><loc>' + SITE.url + '/</loc></url>'].concat(
    articles.map(function(a){ return '<url><loc>' + SITE.url + '/articles/' + a.slug + '.html</loc><lastmod>' + a.meta.date + '</lastmod></url>'; })
  );
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.join('\n') + '\n</urlset>\n';
}

/* ===== 빌드 실행 ===== */
function copyDir(src, dst){
  fs.mkdirSync(dst, { recursive: true });
  fs.readdirSync(src).forEach(function(f){
    var s = path.join(src, f), d = path.join(dst, f);
    if(fs.statSync(s).isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  });
}

var files = fs.readdirSync(path.join(ROOT, 'articles')).filter(function(f){ return f.endsWith('.md'); });
var articles = files.map(parseArticle).sort(function(a, b){ return b.meta.date.localeCompare(a.meta.date); });
if(!articles.length){ console.error('articles/ 폴더에 기사가 없습니다'); process.exit(1); }

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'articles'), { recursive: true });
copyDir(path.join(ROOT, 'assets'), path.join(OUT, 'assets'));

articles.forEach(function(a){
  fs.writeFileSync(path.join(OUT, 'articles', a.slug + '.html'), articlePage(a));
});
fs.writeFileSync(path.join(OUT, 'index.html'), indexPage(articles));
fs.writeFileSync(path.join(OUT, 'rss.xml'), rss(articles));
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), sitemap(articles));
fs.writeFileSync(path.join(OUT, 'robots.txt'), 'User-agent: *\nAllow: /\nSitemap: ' + SITE.url + '/sitemap.xml\n');

console.log('빌드 완료: 기사 ' + articles.length + '건 → public/');
