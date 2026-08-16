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
  slogan: '장애인 등 사회적약자의 보편적 언론 권리를 지향하는 장애인 주도형 소식·정보 공유 공간',
  url: 'https://dwb.ai.kr', // 실제 도메인 (GitHub의 build.js와 동일하게 유지)
  email: 'intcheju@gmail.com',
  operator: '남명우'
};

/* ===== 복지정보 바로가기 — 외부 공공 정보 링크 =====
 * 여기에 항목을 추가하면 메인 화면 오른쪽 배너에 자동 반영됩니다.
 * 정부 사이트는 개편 시 주소가 바뀔 수 있으니 월 1회 링크 확인을 권장합니다. */
const WELFARE_LINKS = [
  { name: '보건복지부 복지뉴스',
    desc: '복지로 · 이번 주 복지 소식',
    url: 'https://www.bokjiro.go.kr/ssis-tbu/twatxa/wlfarePr/selectWlfareSubMain.do' },
  { name: '보건복지부 복지서비스',
    desc: '복지로 · 내 상황에 맞는 복지혜택 찾기',
    url: 'https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52000M.do' },
  { name: '법제처 시행예정법령',
    desc: '국가법령정보센터 · 곧 시행되는 법령 (검색창에 “장애” 입력)',
    url: 'https://www.law.go.kr/lsSc.do?menuId=1&subMenuId=23&tabMenuId=121' }
];

/* ===== 함께하는 단체·시설 — 외부 기관 링크 =====
 * color는 카드 왼쪽 띠 색(기관 상징색 계열). 항목을 추가하면 배너에 자동 반영됩니다.
 * jejuwel·wbs는 https 미지원이라 http 주소를 사용합니다(2026.7.25 확인). */
const ORG_LINKS = [
  { name: '제주특별자치도장애인총연합회',
    desc: '제주 장애인단체 연합',
    color: '#2e9e4f',
    url: 'http://jejuwel.or.kr' },
  { name: '탐라장애인주간보호시설',
    desc: '성인 장애인 주간보호 · 제주',
    color: '#d9a406',
    url: 'http://wbs.or.kr' },
  { name: '한국장애인주간이용시설협회',
    desc: '전국 주간이용시설 협회',
    color: '#e05f8f',
    url: 'https://kdda.or.kr' },
  { name: '제주특별자치도사회복지사협회',
    desc: '사회복지사 자격·교육·현장 지원',
    color: '#18a999',
    url: 'https://welfare.net/jeju' },
  { name: '제주복지넷',
    desc: '제주 복지정보 검색 · 제주사회복지협의회',
    color: '#2b8fd0',
    url: 'https://jejubokji.net' }
];

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
      ? '<span>사람의 가치를 실현하는 장애인 주도형 소식·정보 공유 공간</span>'
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
  + '<strong>' + esc(SITE.name) + '</strong> — 장애인 주도형 소식·정보 공유 공간<br>\n'
  + '운영: ' + esc(SITE.operator) + ' | 이메일: <a href="mailto:' + SITE.email + '">' + SITE.email + '</a><br>\n'
  + '이 공간은 장애인 보도 권고기준과 자체 작성 원칙을 따르며, 모든 글에 대체텍스트와 쉬운글 버전을 제공합니다.<br>\n'
  + '정식 인터넷신문 등록을 준비하고 있습니다. 등록 전까지는 언론 보도가 아닌 정보 공유 목적으로 운영됩니다.<br>\n'
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
  /* '브리핑' 카테고리는 헤드라인·최신 기사 목록에서 분리해 별도 상자로 노출 */
  var briefs = articles.filter(function(a){ return (a.meta.category || '') === '브리핑'; });
  var news = articles.filter(function(a){ return (a.meta.category || '') !== '브리핑'; });
  if(!news.length) news = articles; /* 기사가 브리핑뿐일 때의 안전장치 */
  var head = news[0];
  var rest = news.slice(1);
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
  /* 오늘의 브리핑 세 줄 → 메인 상단 카드 3장 (최신 브리핑 frontmatter card1~card3: "문장 | 날짜 | 판정") */
  var cardStrip = '';
  if(briefs.length){
    var bm0 = briefs[0].meta;
    var cards = [bm0.card1, bm0.card2, bm0.card3].filter(Boolean).map(function(c){
      return c.split('|').map(function(s){ return s.trim(); });
    });
    if(cards.length){
      cardStrip = '<section aria-label="오늘의 브리핑 세 줄" style="margin:0 0 1.4rem">'
        + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:.8rem">'
        + cards.map(function(c, i){
            return '<a href="articles/' + briefs[0].slug + '.html" style="display:block;background:var(--navy);color:#fff;padding:1rem 1.1rem;border-radius:10px;text-decoration:none;border-bottom:4px solid var(--gold)">'
              + '<span style="display:block;font-size:.78em;color:#e8d9a8;margin-bottom:.4rem">오늘의 브리핑 ' + '①②③'.charAt(i)
              + (c[1] ? ' · ' + esc(c[1]) : '') + (c[2] ? ' · [' + esc(c[2]) + ']' : '') + '</span>'
              + '<strong style="font-size:1.02em;line-height:1.5;font-weight:600">' + esc(c[0]) + '</strong></a>';
          }).join('')
        + '</div></section>';
    }
  }
  var briefBox = '';
  if(briefs.length){
    briefBox = '<div class="box" id="briefing"><h3>브리핑 모아보기</h3>'
      + '<ul style="list-style:none;margin:0;padding:0">'
      + briefs.slice(0, 7).map(function(a, i){
          return '<li style="padding:.32rem 0;font-size:.9em' + (i ? ';border-top:1px solid var(--line)' : '') + '">'
            + '<a href="articles/' + a.slug + '.html">' + fmtDate(a.meta.date) + ' 브리핑</a>'
            + (i === 0 ? ' <span style="font-size:.82em;color:var(--sub)">· 최신</span>' : '')
            + '</li>';
        }).join('')
      + '</ul>'
      + '<p style="font-size:.78em;color:var(--sub);margin-top:.4rem">다른 언론·기관의 소식을 요약해 소개하는 정보 공유 코너입니다.</p></div>';
  }
  var infoBox = '<div class="box"><h3>복지정보 바로가기</h3>'
    + '<ul style="list-style:none;margin:0;padding:0">'
    + WELFARE_LINKS.map(function(l){
        return '<li style="padding:.35rem 0"><a href="' + esc(l.url) + '" target="_blank" rel="noopener">'
          + esc(l.name) + '</a><br><span style="font-size:.82em;color:var(--sub)">' + esc(l.desc) + '</span></li>';
      }).join('')
    + '</ul><p style="font-size:.78em;color:var(--sub);margin-top:.4rem">외부 공공기관 사이트가 새 창으로 열립니다.</p></div>';
  var orgBox = '<div class="box"><h3>함께하는 단체·시설</h3>'
    + '<ul style="list-style:none;margin:0;padding:0">'
    + ORG_LINKS.map(function(l){
        return '<li style="margin:.5rem 0;border-left:5px solid ' + l.color + ';padding:.15rem 0 .15rem .6rem">'
          + '<a href="' + esc(l.url) + '" target="_blank" rel="noopener">' + esc(l.name) + '</a>'
          + '<br><span style="font-size:.82em;color:var(--sub)">' + esc(l.desc) + '</span></li>';
      }).join('')
    + '</ul><p style="font-size:.78em;color:var(--sub);margin-top:.4rem">외부 기관 사이트가 새 창으로 열립니다.</p></div>';
  var content =
    '<nav class="gnb" aria-label="주 메뉴"><ul>'
    + '<li><a href="index.html" aria-current="page">홈</a></li>'
    + '<li><a href="index.html#briefing">브리핑</a></li>'
    + ['복지','인권','제주','기획·연재','쉬운뉴스','오피니언'].map(function(c){ return '<li><a href="index.html#list">' + c + '</a></li>'; }).join('')
    + '</ul></nav>\n'
    + '<main id="main" class="wrap">\n'
    + cardStrip
    + '<div class="grid">\n<section aria-label="주요 기사">\n'
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
    + briefBox + '\n'
    + seriesBox
    + infoBox + '\n'
    + orgBox + '\n'
    + '<div class="box"><h3>제보 · 구독</h3><p style="font-size:.88em">여러분의 제보가 기사가 됩니다.<br><a href="mailto:' + SITE.email + '">' + SITE.email + '</a></p>'
    + '<p style="font-size:.88em;margin-top:.5rem"><a href="rss.xml">RSS 구독</a></p></div>\n'
    + '</aside>\n</div>\n</main>';
  return shell({ title: SITE.name + ' — 장애인 주도형 소식·정보 공간', desc: SITE.slogan, base: '', content: content, home: true });
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

/* ===== 정적 파일 통과 =====
 * static/ 폴더에 넣은 파일은 그대로 사이트 최상위로 복사됩니다.
 * 예: static/vlog.html → dwb.ai.kr/vlog.html (앱·대시보드 등 단일 HTML 게시용)
 * ※ build.js를 교체할 때 이 블록이 빠지면 vlog.html이 404가 됩니다. */
var STATIC = path.join(ROOT, 'static');
if (fs.existsSync(STATIC)) copyDir(STATIC, OUT);

articles.forEach(function(a){
  fs.writeFileSync(path.join(OUT, 'articles', a.slug + '.html'), articlePage(a));
});
fs.writeFileSync(path.join(OUT, 'index.html'), indexPage(articles));
fs.writeFileSync(path.join(OUT, 'rss.xml'), rss(articles));
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), sitemap(articles));
fs.writeFileSync(path.join(OUT, 'robots.txt'), 'User-agent: *\nAllow: /\nSitemap: ' + SITE.url + '/sitemap.xml\n');

console.log('빌드 완료: 기사 ' + articles.length + '건 → public/');
