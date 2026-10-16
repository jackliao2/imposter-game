const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.join(__dirname, "..");
const pack = require(path.join(root, "js", "words.js"));

function walk(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    if (name === "node_modules" || name === ".git" || name === "test") continue;
    const abs = path.join(dir, name);
    if (fs.statSync(abs).isDirectory()) walk(abs, out);
    else if (name.endsWith(".html")) out.push(abs);
  }
}

function textOf(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").toLowerCase();
}

function articleParas(html) {
  const article = (html.match(/<article[\s\S]*?<\/article>/) || [""])[0];
  return (article.match(/<p>[\s\S]*?<\/p>/g) || []).map(function (p) {
    return p.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  }).filter(function (p) { return p.length >= 60; });
}

const files = [];
walk(root, files);
const pages = files.map(function (file) {
  const html = fs.readFileSync(file, "utf8");
  const rel = "/" + path.relative(root, file).replace(/\\/g, "/").replace(/index\.html$/, "");
  const url = rel === "/" ? "/" : rel;
  return {
    url: url,
    html: html,
    text: textOf(html),
    title: (html.match(/<title>([^<]*)<\/title>/) || [])[1] || "",
    h1: (html.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "",
    description: (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || "",
    canonical: (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1] || ""
  };
});

const byUrl = new Map(pages.map(function (p) { return [p.url, p]; }));
function need(url) {
  const page = byUrl.get(url);
  assert.ok(page, "missing page " + url);
  return page;
}

const titles = new Set();
const descriptions = new Set();
const paras = new Map();
pages.forEach(function (page) {
  assert.ok(page.title, "title " + page.url);
  assert.ok(!titles.has(page.title), "duplicate title " + page.title);
  titles.add(page.title);
  assert.ok(page.description, "description " + page.url);
  assert.ok(!descriptions.has(page.description), "duplicate description " + page.url);
  descriptions.add(page.description);
  assert.ok(page.canonical.indexOf("https://imposter-game-one.vercel.app/") === 0, page.url + " canonical " + page.canonical);
  assert.strictEqual(page.canonical, "https://imposter-game-one.vercel.app" + page.url, page.url);
  articleParas(page.html).forEach(function (para) {
    if (!paras.has(para)) paras.set(para, []);
    paras.get(para).push(page.url);
  });
});
for (const [para, where] of paras) {
  assert.strictEqual(where.length, 1, "duplicated paragraph on " + where.join(", ") + ": " + para.slice(0, 120));
}

const intents = [
  { url: "/", heading: "imposter game", phrases: ["imposter game", "game imposter", "game of imposter", "game with imposter"] },
  { url: "/the-imposter-game/", heading: "the imposter game", phrases: ["the imposter game", "imposter the game", "the game imposter"] },
  { url: "/online/", heading: "imposter game online", phrases: ["imposter game online", "online imposter game", "imposter online game", "imposter online games", "online game imposter", "online games imposter", "the imposter game online"] },
  { url: "/free/", heading: "free imposter", phrases: ["free imposter games", "imposter game free", "imposter free game", "imposter game online free", "imposter game free online", "imposter free online game", "imposter online free", "imposter online game free"] },
  { url: "/unblocked/", heading: "unblocked", phrases: ["imposter game unblocked", "imposter unblocked"] },
  { url: "/impostor-game/", heading: "impostor game", phrases: ["impostor game", "games impostor", "impostor game online", "impostor game free", "impostor game online free", "impostor online game", "game impostor online"] },
  { url: "/io/", heading: "imposter", phrases: ["imposter game io", "imposter io", "imposter io game", "imposterio"] },
  { url: "/offline/", heading: "imposter game offline", phrases: ["imposter game offline"] },
  { url: "/one-phone/", heading: "imposter mobile game", phrases: ["imposter mobile game"] },
  { url: "/browser/", heading: "imposter game browser", phrases: ["imposter game browser"] }
];

intents.forEach(function (intent) {
  const page = need(intent.url);
  const heading = (page.title + " " + page.h1).toLowerCase();
  assert.ok(heading.indexOf(intent.heading) !== -1, intent.url + " heading lacks " + intent.heading);
  intent.phrases.forEach(function (phrase) {
    assert.ok(page.text.indexOf(phrase) !== -1, intent.url + " missing phrase " + phrase);
  });
  assert.ok(page.html.indexOf('id="app"') !== -1, intent.url + " does not deal");
});

["/", "/how-to-play/"].forEach(function (url) {
  assert.ok(need(url).html.indexOf('href="/compare/"') !== -1, url + " does not link compare");
});
const compare = need("/compare/");
assert.ok(compare.html.indexOf('id="worked-trail"') !== -1, "worked trail missing");
assert.ok(compare.text.indexOf("the secret is lighthouse") !== -1, "secret");
assert.ok(compare.text.indexOf("crew slips") !== -1, "crew slips");
assert.ok(compare.text.indexOf("imposter slip") !== -1, "imposter slip");
assert.ok(compare.text.indexOf("the vote lands on alex") !== -1, "vote");
assert.ok(compare.text.indexOf("spoken") !== -1, "spoken pattern");
assert.ok(compare.text.indexOf("room code") !== -1, "room code pattern");
assert.ok(compare.text.indexOf("no room code") !== -1, "refuses room codes");

function articleSentences(html) {
  const article = (html.match(/<article[\s\S]*?<\/article>/) || [""])[0];
  const text = article.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.split(/(?<=\.)\s+/).map(function (sentence) { return sentence.trim(); }).filter(Boolean);
}
function statesDifference(sentence) {
  const s = sentence.toLowerCase();
  const written = /\b(two|both)\b/.test(s) && /written clues/.test(s) && /remain|readable|standing|view|pinned|posted|visible/.test(s);
  const vote = /vote|voting|ballot|voter/.test(s) && /slip/.test(s);
  const steal = /one guess/.test(s) && /steal/.test(s);
  return written && vote && steal;
}
const differenceSentences = new Map();
pages.forEach(function (page) {
  articleSentences(page.html).filter(statesDifference).forEach(function (sentence) {
    if (!differenceSentences.has(sentence)) differenceSentences.set(sentence, []);
    differenceSentences.get(sentence).push(page.url);
  });
});
pages.forEach(function (page) {
  const own = articleSentences(page.html).filter(statesDifference).filter(function (sentence) {
    return differenceSentences.get(sentence).length === 1;
  });
  assert.ok(own.length >= 1, page.url + " has no unique sentence that keeps two written clues up, votes a slip, and lets one guess steal the round");
});

const home = need("/");
assert.strictEqual(home.title, "Imposter Game");
assert.strictEqual(home.h1, "Imposter Game");
["free", "unblocked", "offline", "impostor", "browser", "game io"].forEach(function (word) {
  assert.ok(home.description.toLowerCase().indexOf(word) === -1, "home description competes on " + word);
});
pages.forEach(function (page) {
  if (page.url === "/") return;
  assert.notStrictEqual(page.title, "Imposter Game", page.url + " uses the home title");
  assert.notStrictEqual(page.h1.toLowerCase(), "imposter game", page.url + " uses the home heading");
});
assert.ok(!/data-voice="spoken"/.test(home.html), "home must not default to spoken");
const gameJs = fs.readFileSync(path.join(root, "js", "game.js"), "utf8");
assert.ok(/voice:\s*false/.test(gameJs), "written clues are the default");

function citedWords(html) {
  const rows = html.match(/<tr><td>([^<]+)<\/td>/g) || [];
  return rows.map(function (row) { return row.replace(/<[^>]+>/g, "").trim().toLowerCase(); });
}
pages.forEach(function (page) {
  const deck = (page.html.match(/data-deck="([^"]+)"/) || [])[1];
  if (!deck || deck === "mixed") return;
  const list = (pack.categories[deck] || []).map(function (word) { return word.toLowerCase(); });
  assert.ok(list.length > 0, "dealer has no " + deck);
  citedWords(page.html).forEach(function (word) {
    assert.ok(list.indexOf(word) !== -1, page.url + " cites " + word + " which " + deck + " cannot deal");
  });
});
const packWords = [];
Object.keys(pack.categories).forEach(function (cat) {
  pack.categories[cat].forEach(function (word) { packWords.push(word.toLowerCase()); });
});
packWords.sort(function (a, b) { return b.length - a.length; });

const faqAnswers = new Map();
pages.forEach(function (page) {
  const raw = (page.html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/) || [])[1];
  if (!raw) return;
  const data = JSON.parse(raw);
  if (!data.mainEntity) return;
  const article = (page.html.match(/<article[\s\S]*?<\/article>/) || [""])[0];
  const blocks = article.match(/<details>[\s\S]*?<\/details>/g) || [];
  const visible = blocks.map(function (block) {
    return {
      q: ((block.match(/<summary>([\s\S]*?)<\/summary>/) || [])[1] || "").trim(),
      a: ((block.match(/<p>([\s\S]*?)<\/p>/) || [])[1] || "").replace(/<[^>]+>/g, "").trim()
    };
  });
  assert.strictEqual(visible.length, data.mainEntity.length, "faq count " + page.url);
  data.mainEntity.forEach(function (item, index) {
    assert.strictEqual(visible[index].q, item.name, "faq question " + page.url);
    assert.strictEqual(visible[index].a, item.acceptedAnswer.text, "faq answer " + page.url);
    const key = item.name + " " + item.acceptedAnswer.text;
    if (!faqAnswers.has(key)) faqAnswers.set(key, []);
    faqAnswers.get(key).push(page.url);
  });
  const deck = (page.html.match(/data-deck="([^"]+)"/) || [])[1];
  if (!deck || deck === "mixed") return;
  const allowed = new Set((pack.categories[deck] || []).map(function (word) { return word.toLowerCase(); }));
  const answerText = data.mainEntity.map(function (item) { return item.acceptedAnswer.text; }).join(" ").toLowerCase();
  packWords.forEach(function (word) {
    const re = new RegExp("(^|[^a-z])" + word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^a-z]|$)");
    if (re.test(answerText)) assert.ok(allowed.has(word), page.url + " faq cites " + word + " outside " + deck);
  });
});
for (const [key, where] of faqAnswers) {
  assert.strictEqual(where.length, 1, "duplicated faq " + where.join(", ") + ": " + key.slice(0, 80));
}

assert.ok(citedWords(need("/decks/screen/").html).length >= 4, "screen examples");
assert.ok(citedWords(need("/decks/play/").html).length >= 4, "sports examples");
assert.strictEqual((need("/decks/screen/").html.match(/data-deck="screen"/) || []).length, 1);
assert.strictEqual((need("/decks/play/").html.match(/data-deck="sports"/) || []).length, 1);

const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
const locs = (sitemap.match(/<loc>([^<]+)<\/loc>/g) || []).map(function (loc) {
  return loc.replace(/<\/?loc>/g, "").replace("https://imposter-game-one.vercel.app", "") || "/";
});
pages.forEach(function (page) {
  assert.ok(locs.indexOf(page.url) !== -1, "sitemap missing " + page.url);
});
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
assert.ok(/var CACHE = "imposter-v4"/.test(sw), "cache identity");
locs.forEach(function (loc) {
  assert.ok(sw.indexOf('"' + loc + '"') !== -1, "precache missing " + loc);
});

console.log("niche-pages ok", pages.length, "urls", locs.length);
