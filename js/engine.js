(function (g, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  g.ImposterEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function maxImposters(playerCount) {
    const n = Math.floor(playerCount);
    if (n < 3) return 1;
    return Math.max(1, Math.floor((n - 1) / 2));
  }

  function clampImposters(playerCount, wanted) {
    const max = maxImposters(playerCount);
    const n = Math.floor(wanted);
    if (!Number.isFinite(n) || n < 1) return 1;
    return Math.min(max, n);
  }

  function shuffle(list, rng) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const swap = a[i];
      a[i] = a[j];
      a[j] = swap;
    }
    return a;
  }

  function uniqueWords(lists) {
    const seen = new Set();
    const out = [];
    lists.forEach(function (list) {
      (list || []).forEach(function (word) {
        const key = String(word).trim().toLowerCase();
        if (!key || seen.has(key)) return;
        seen.add(key);
        out.push(String(word).trim());
      });
    });
    return out;
  }

  function poolFor(pack, category) {
    const cats = pack.categories || {};
    if (category === "mixed" || !cats[category]) {
      return uniqueWords(Object.keys(cats).map(function (key) { return cats[key]; }));
    }
    return uniqueWords([cats[category]]);
  }

  function pickWord(pack, category, used, rng) {
    const pool = poolFor(pack, category);
    if (!pool.length) return "apple";
    const fresh = pool.filter(function (word) { return !used.has(word.toLowerCase()); });
    const source = fresh.length ? fresh : pool;
    return source[Math.floor(rng() * source.length)];
  }

  function pickCousin(pack, used, rng) {
    const pairs = (pack.cousins || []).filter(function (pair) {
      return pair && pair[0] && pair[1] && !used.has(String(pair[0]).toLowerCase()) && !used.has(String(pair[1]).toLowerCase());
    });
    const source = pairs.length ? pairs : (pack.cousins || []);
    if (!source.length) return { secret: "coffee", cousin: "tea" };
    const pair = source[Math.floor(rng() * source.length)];
    if (rng() < 0.5) return { secret: pair[0], cousin: pair[1] };
    return { secret: pair[1], cousin: pair[0] };
  }

  function pickImposters(ids, count, rng) {
    return shuffle(ids, rng).slice(0, count);
  }

  function tally(votes) {
    const counts = {};
    Object.keys(votes || {}).forEach(function (voter) {
      const target = votes[voter];
      if (!target) return;
      counts[target] = (counts[target] || 0) + 1;
    });
    let top = 0;
    Object.keys(counts).forEach(function (id) {
      if (counts[id] > top) top = counts[id];
    });
    const leaders = Object.keys(counts).filter(function (id) { return counts[id] === top; });
    return { counts: counts, top: top, leaders: leaders };
  }

  function crewCaught(leaders, imposterIds) {
    if (!leaders || leaders.length !== 1) return false;
    return imposterIds.indexOf(leaders[0]) !== -1;
  }

  function norm(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9 ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function guessHits(guess, secret) {
    const a = norm(guess);
    const b = norm(secret);
    return a.length > 0 && a === b;
  }

  return {
    maxImposters: maxImposters,
    clampImposters: clampImposters,
    shuffle: shuffle,
    uniqueWords: uniqueWords,
    poolFor: poolFor,
    pickWord: pickWord,
    pickCousin: pickCousin,
    pickImposters: pickImposters,
    tally: tally,
    crewCaught: crewCaught,
    norm: norm,
    guessHits: guessHits
  };
});
