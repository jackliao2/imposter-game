(function () {
  var engine = window.ImposterEngine;
  var pack = window.WORD_PACK;
  var app = document.getElementById("app");
  var timerId = null;
  var holdPointer = null;

  var state = {
    screen: "setup",
    playerCount: 5,
    imposterCount: 1,
    category: "mixed",
    mode: "classic",
    names: ["", "", "", "", ""],
    muted: false,
    tableWins: 0,
    imposterWins: 0,
    used: [],
    round: 0,
    startOffset: 0,
    secret: "",
    cousin: "",
    imposterIds: [],
    passIndex: 0,
    seen: false,
    clueLap: 0,
    clueStep: 0,
    votes: {},
    ballotIndex: 0,
    ballotSeen: false,
    discussLeft: 45,
    steal: "",
    leaders: [],
    caught: false
  };

  function rng() {
    if (window.crypto && window.crypto.getRandomValues) {
      var buf = new Uint32Array(1);
      window.crypto.getRandomValues(buf);
      return buf[0] / 4294967296;
    }
    return Math.random();
  }

  function loadSettings() {
    try {
      var raw = localStorage.getItem("imposter-settings");
      if (!raw) return;
      var saved = JSON.parse(raw);
      if (saved.playerCount >= 3 && saved.playerCount <= 12) state.playerCount = saved.playerCount;
      state.imposterCount = engine.clampImposters(state.playerCount, saved.imposterCount || 1);
      if (saved.category) state.category = saved.category;
      if (saved.mode === "cousin" || saved.mode === "classic") state.mode = saved.mode;
      if (Array.isArray(saved.names)) state.names = saved.names;
      if (typeof saved.muted === "boolean") state.muted = saved.muted;
      fitNames();
    } catch (err) {
      return;
    }
  }

  function saveSettings() {
    try {
    localStorage.setItem("imposter-settings", JSON.stringify({
      playerCount: state.playerCount,
      imposterCount: state.imposterCount,
      category: state.category,
      mode: state.mode,
      names: state.names,
      muted: state.muted
    }));
    } catch (err) {
      return;
    }
  }

  function fitNames() {
    while (state.names.length < state.playerCount) state.names.push("");
    if (state.names.length > 12) state.names = state.names.slice(0, 12);
  }

  function players() {
    var list = [];
    for (var i = 0; i < state.playerCount; i++) {
      var typed = (state.names[i] || "").trim();
      list.push({ id: "p" + i, name: typed || ("Player " + (i + 1)) });
    }
    return list;
  }

  function nameOf(id) {
    var found = players().filter(function (p) { return p.id === id; })[0];
    return found ? found.name : "Player";
  }

  function clearTimer() {
    if (timerId) window.clearInterval(timerId);
    timerId = null;
  }

  function beep(freq, ms) {
    if (state.muted || !window.AudioContext && !window.webkitAudioContext) return;
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      var ctx = beep.ctx || (beep.ctx = new Ctx());
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = "triangle";
      gain.gain.value = 0.04;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ms / 1000);
      osc.stop(ctx.currentTime + ms / 1000);
    } catch (err) {
      return;
    }
  }

  function buzz(ms) {
    if (state.muted || !navigator.vibrate) return;
    navigator.vibrate(ms);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function orderFrom(offset) {
    var list = players();
    var out = [];
    for (var i = 0; i < list.length; i++) out.push(list[(offset + i) % list.length]);
    return out;
  }

  function startRound() {
    fitNames();
    saveSettings();
    var used = {};
    state.used.forEach(function (word) { used[word.toLowerCase()] = true; });
    var usedSet = {
      has: function (word) { return !!used[String(word).toLowerCase()]; },
      add: function (word) { used[String(word).toLowerCase()] = true; }
    };
    var deal;
    if (state.mode === "cousin") {
      deal = engine.pickCousin(pack, usedSet, rng);
      state.secret = deal.secret;
      state.cousin = deal.cousin;
    } else {
      state.secret = engine.pickWord(pack, state.category, usedSet, rng);
      state.cousin = "";
    }
    state.used.push(state.secret.toLowerCase());
    if (state.cousin) state.used.push(state.cousin.toLowerCase());
    var ids = players().map(function (p) { return p.id; });
    state.imposterIds = engine.pickImposters(ids, state.imposterCount, rng);
    state.round += 1;
    state.passIndex = 0;
    state.seen = false;
    state.clueLap = 0;
    state.clueStep = 0;
    state.votes = {};
    state.ballotIndex = 0;
    state.ballotSeen = false;
    state.discussLeft = 45;
    state.steal = "";
    state.leaders = [];
    state.caught = false;
    state.screen = "pass";
    document.body.classList.add("playing");
    beep(520, 70);
    draw();
  }

  function currentPassPlayer() {
    return players()[state.passIndex];
  }

  function cardFor(player) {
    var isImpostor = state.imposterIds.indexOf(player.id) !== -1;
    if (state.mode === "cousin") {
      return { kind: "word", word: isImpostor ? state.cousin : state.secret };
    }
    if (isImpostor) return { kind: "imposter" };
    return { kind: "word", word: state.secret };
  }

  function markPassReady() {
    var next = document.getElementById("pass-next");
    if (!next || !state.seen) return;
    var last = state.passIndex + 1 >= state.playerCount;
    next.disabled = false;
    next.textContent = last ? "Everyone has a card" : "Pass to " + players()[state.passIndex + 1].name;
  }

  function finishPass() {
    state.seen = false;
    state.passIndex += 1;
    if (state.passIndex >= state.playerCount) {
      state.screen = "clue";
      beep(640, 60);
    }
    draw();
  }

  function advanceClue() {
    var list = players();
    state.clueStep += 1;
    if (state.clueStep >= list.length) {
      state.clueStep = 0;
      state.clueLap += 1;
    }
    if (state.clueLap >= 2) {
      openDiscuss();
      return;
    }
    draw();
  }

  function openDiscuss() {
    state.screen = "discuss";
    state.discussLeft = 45;
    draw();
  }

  function openBallot() {
    clearTimer();
    state.screen = "ballot";
    state.ballotIndex = 0;
    state.ballotSeen = false;
    state.votes = {};
    draw();
  }

  function castVote(targetId) {
    var voter = players()[state.ballotIndex];
    state.votes[voter.id] = targetId;
    state.ballotSeen = true;
    buzz(12);
    beep(440, 40);
    draw();
  }

  function finishBallot() {
    state.ballotSeen = false;
    state.ballotIndex += 1;
    if (state.ballotIndex >= state.playerCount) {
      revealVote();
      return;
    }
    draw();
  }

  function revealVote() {
    var result = engine.tally(state.votes);
    state.leaders = result.leaders;
    state.caught = engine.crewCaught(result.leaders, state.imposterIds);
    state.screen = state.caught ? "steal" : "result";
    if (!state.caught) award();
    beep(state.caught ? 300 : 680, 120);
    draw();
  }

  function award() {
    if (state.caught) state.tableWins += 1;
    else state.imposterWins += 1;
  }

  function submitSteal() {
    var input = document.getElementById("steal-input");
    state.steal = input ? input.value : "";
    var hit = engine.guessHits(state.steal, state.secret);
    if (hit) state.caught = false;
    award();
    state.screen = "result";
    beep(hit ? 720 : 220, 140);
    draw();
  }

  function nextRound() {
    state.startOffset = (state.startOffset + 1) % state.playerCount;
    startRound();
  }

  function newTable() {
    clearTimer();
    state.tableWins = 0;
    state.imposterWins = 0;
    state.used = [];
    state.round = 0;
    state.startOffset = 0;
    state.screen = "setup";
    document.body.classList.remove("playing");
    draw();
  }

  function backToSetup() {
    clearTimer();
    state.screen = "setup";
    document.body.classList.remove("playing");
    draw();
  }

  function bindHold(node) {
    var shown = false;
    function show(event) {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (typeof node.setPointerCapture === "function" && event.pointerId != null && event.pointerType !== "key") {
        holdPointer = event.pointerId;
        node.setPointerCapture(event.pointerId);
      }
      shown = true;
      state.seen = true;
      node.classList.add("is-open");
      var face = node.querySelector("[data-face]");
      var player = currentPassPlayer();
      var card = cardFor(player);
      if (card.kind === "imposter") {
        face.innerHTML = '<span class="seal">Imposter</span><b>You do not know the word.</b><small>Listen, then blend in.</small>';
      } else {
        face.innerHTML = "<small>Your word</small><b>" + escapeHtml(card.word) + "</b>";
      }
      markPassReady();
      buzz(8);
    }
    function hide() {
      if (!shown) return;
      shown = false;
      node.classList.remove("is-open");
      var face = node.querySelector("[data-face]");
      face.innerHTML = "<small>Press and hold</small><b>Show my card</b>";
      holdPointer = null;
      markPassReady();
    }
    node.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      show(event);
    });
    node.addEventListener("pointerup", hide);
    node.addEventListener("pointercancel", hide);
    node.addEventListener("lostpointercapture", hide);
    node.addEventListener("contextmenu", function (event) { event.preventDefault(); });
    node.addEventListener("keydown", function (event) {
      if (event.key !== " " && event.key !== "Enter") return;
      event.preventDefault();
      if (!shown) show({ pointerType: "key", button: 0, pointerId: 1 });
    });
    node.addEventListener("keyup", function (event) {
      if (event.key === " " || event.key === "Enter") hide();
    });
  }

  function renderSetup() {
    var cats = ["mixed"].concat(Object.keys(pack.categories));
    var labels = {
      mixed: "Mixed", food: "Food", animals: "Animals", places: "Places", home: "Home",
      nature: "Nature", jobs: "Jobs", sports: "Sports", school: "School", clothes: "Clothes"
    };
    var chips = cats.map(function (cat) {
      return '<button type="button" class="chip' + (state.category === cat ? " is-on" : "") + '" data-cat="' + cat + '">' + labels[cat] + "</button>";
    }).join("");
    var nameFields = "";
    for (var i = 0; i < state.playerCount; i++) {
      nameFields += '<label>Player ' + (i + 1) + '<input maxlength="16" data-name="' + i + '" value="' + escapeHtml(state.names[i] || "") + '" placeholder="Player ' + (i + 1) + '"></label>';
    }
    app.innerHTML =
      '<section class="stage setup">' +
        '<p class="lede">Pass one phone. One player does not know the word.</p>' +
        '<div class="steppers">' +
          '<div class="stepper"><span>Players</span><button type="button" data-step="players" data-dir="-1" aria-label="Fewer players">−</button><strong>' + state.playerCount + '</strong><button type="button" data-step="players" data-dir="1" aria-label="More players">+</button></div>' +
          '<div class="stepper"><span>Imposters</span><button type="button" data-step="imposters" data-dir="-1" aria-label="Fewer imposters">−</button><strong>' + state.imposterCount + '</strong><button type="button" data-step="imposters" data-dir="1" aria-label="More imposters">+</button></div>' +
        "</div>" +
        '<div class="chip-row" role="group" aria-label="Word category">' + chips + "</div>" +
        '<div class="seg" role="group" aria-label="How the imposter sees a card">' +
          '<button type="button" data-mode="classic" class="' + (state.mode === "classic" ? "is-on" : "") + '">Classic</button>' +
          '<button type="button" data-mode="cousin" class="' + (state.mode === "cousin" ? "is-on" : "") + '">Lookalike</button>' +
        "</div>" +
        '<p class="hint">' + (state.mode === "classic"
          ? "The imposter sees a blank role. Everyone else sees the same word."
          : "The imposter gets a cousin of the word, and is not told.") + "</p>" +
        '<details class="names"><summary>Add names</summary><div class="name-grid">' + nameFields + "</div></details>" +
        '<details class="rules"><summary>Rules</summary><ol>' +
          "<li>Hand the phone around. Press and hold to see your card, then let go.</li>" +
          "<li>Each player says one word about the secret. Do that twice.</li>" +
          "<li>Vote in secret. The group wins only if one imposter has the most votes alone.</li>" +
          "<li>A caught imposter gets one guess to steal the round.</li>" +
        "</ol></details>" +
        '<button type="button" class="btn primary" id="start">Start the round</button>' +
        '<button type="button" class="btn ghost icon-mute" id="mute">' + (state.muted ? "Sound off" : "Sound on") + "</button>" +
      "</section>";

    app.querySelectorAll("[data-step]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var dir = Number(btn.getAttribute("data-dir"));
        if (btn.getAttribute("data-step") === "players") {
          state.playerCount = Math.min(12, Math.max(3, state.playerCount + dir));
          state.imposterCount = engine.clampImposters(state.playerCount, state.imposterCount);
          fitNames();
        } else {
          state.imposterCount = engine.clampImposters(state.playerCount, state.imposterCount + dir);
        }
        saveSettings();
        draw();
      });
    });
    app.querySelectorAll("[data-cat]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.category = btn.getAttribute("data-cat");
        saveSettings();
        draw();
      });
    });
    app.querySelectorAll("[data-mode]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.mode = btn.getAttribute("data-mode");
        saveSettings();
        draw();
      });
    });
    app.querySelectorAll("[data-name]").forEach(function (input) {
      input.addEventListener("input", function () {
        state.names[Number(input.getAttribute("data-name"))] = input.value;
        saveSettings();
      });
    });
    document.getElementById("start").addEventListener("click", startRound);
    document.getElementById("mute").addEventListener("click", function () {
      state.muted = !state.muted;
      saveSettings();
      draw();
    });
  }

  function renderPass() {
    var player = currentPassPlayer();
    app.innerHTML =
      '<section class="stage play">' +
        chrome("Card " + (state.passIndex + 1) + " of " + state.playerCount) +
        '<p class="kicker">Hand the phone to</p>' +
        '<h2 class="who">' + escapeHtml(player.name) + "</h2>" +
        '<p class="hint">Everyone else, look away. Press and hold. Let go before you pass it on.</p>' +
        '<div class="hold" id="hold" role="button" tabindex="0" aria-label="Press and hold to see your card">' +
          '<div class="paper" data-face><small>Press and hold</small><b>Show my card</b></div>' +
        "</div>" +
        '<button type="button" class="btn primary" id="pass-next" disabled>Hold the card first</button>' +
      "</section>";
    bindHold(document.getElementById("hold"));
    document.getElementById("pass-next").addEventListener("click", function () {
      if (!state.seen) return;
      finishPass();
    });
  }

  function renderClue() {
    var order = orderFrom(state.startOffset);
    var speaker = order[state.clueStep];
    var rows = order.map(function (p, i) {
      return '<li class="' + (i === state.clueStep ? "is-now" : "") + '">' + escapeHtml(p.name) + "</li>";
    }).join("");
    app.innerHTML =
      '<section class="stage play">' +
        chrome("Clues · pass " + (state.clueLap + 1) + " of 2") +
        '<p class="kicker">Say one word</p>' +
        '<h2 class="who">' + escapeHtml(speaker.name) + "</h2>" +
        '<p class="hint">Out loud. Related, not a definition. Do not say the word, and do not say the category.</p>' +
        '<ol class="order">' + rows + "</ol>" +
        '<button type="button" class="btn primary" id="said">Said it</button>' +
        '<button type="button" class="btn ghost" id="to-talk">End clues and talk</button>' +
      "</section>";
    document.getElementById("said").addEventListener("click", advanceClue);
    document.getElementById("to-talk").addEventListener("click", openDiscuss);
  }

  function renderDiscuss() {
    app.innerHTML =
      '<section class="stage play">' +
        chrome("Talk") +
        '<p class="kicker" id="discuss-count">' + state.discussLeft + "</p>" +
        '<h2 class="who">Who felt off?</h2>' +
        '<p class="hint">The imposter should argue too. Pointing comes after the talk, not during it.</p>' +
        '<button type="button" class="btn primary" id="to-vote">Vote in secret</button>' +
      "</section>";
    document.getElementById("to-vote").addEventListener("click", openBallot);
  }

  function renderBallot() {
    var voter = players()[state.ballotIndex];
    if (!state.ballotSeen) {
      var choices = players().map(function (p) {
        return '<button type="button" class="vote" data-vote="' + p.id + '">' + escapeHtml(p.name) + "</button>";
      }).join("");
      app.innerHTML =
        '<section class="stage play">' +
          chrome("Vote " + (state.ballotIndex + 1) + " of " + state.playerCount) +
          '<p class="kicker">Hand the phone to</p>' +
          '<h2 class="who">' + escapeHtml(voter.name) + "</h2>" +
          '<p class="hint">Tap one name. You can tap yourself. The choice disappears before the phone moves on.</p>' +
          '<div class="vote-list">' + choices + "</div>" +
        "</section>";
      app.querySelectorAll("[data-vote]").forEach(function (btn) {
        btn.addEventListener("click", function () { castVote(btn.getAttribute("data-vote")); });
      });
      return;
    }
    var last = state.ballotIndex + 1 >= state.playerCount;
    app.innerHTML =
      '<section class="stage play">' +
        chrome("Vote locked") +
        '<h2 class="who">Locked.</h2>' +
        '<p class="hint">Pass the phone before the next person looks.</p>' +
        '<button type="button" class="btn primary" id="ballot-next">' + (last ? "Show the result" : "Next voter") + "</button>" +
      "</section>";
    document.getElementById("ballot-next").addEventListener("click", finishBallot);
  }

  function renderSteal() {
    var caughtId = state.leaders[0];
    app.innerHTML =
      '<section class="stage play">' +
        chrome("One guess") +
        '<p class="kicker">Caught</p>' +
        '<h2 class="who">' + escapeHtml(nameOf(caughtId)) + "</h2>" +
        '<p class="hint">Hand the phone to the caught imposter. One guess at the word steals the round. A wrong guess gives the round to the group.</p>' +
        '<form id="steal-form" class="steal">' +
          '<label class="sr" for="steal-input">Guess the word</label>' +
          '<input id="steal-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Type the word">' +
          '<button type="submit" class="btn primary">Guess</button>' +
        "</form>" +
        '<button type="button" class="btn ghost" id="no-steal">Take the loss</button>' +
      "</section>";
    document.getElementById("steal-form").addEventListener("submit", function (event) {
      event.preventDefault();
      submitSteal();
    });
    document.getElementById("no-steal").addEventListener("click", function () {
      state.steal = "";
      award();
      state.screen = "result";
      draw();
    });
    document.getElementById("steal-input").focus();
  }

  function renderResult() {
    var result = engine.tally(state.votes);
    var bars = players().map(function (p) {
      var count = result.counts[p.id] || 0;
      var width = result.top ? Math.round((count / state.playerCount) * 100) : 0;
      return '<div class="bar-row"><span>' + escapeHtml(p.name) + '</span><span class="track"><span style="width:' + width + '%"></span></span><b>' + count + "</b></div>";
    }).join("");
    var stolen = state.steal && engine.guessHits(state.steal, state.secret);
    var headline;
    var detail;
    if (stolen) {
      headline = "Stolen.";
      detail = escapeHtml(nameOf(state.leaders[0])) + " named the word and took the round.";
    } else if (state.caught) {
      headline = "The group got them.";
      detail = escapeHtml(nameOf(state.leaders[0])) + " was an imposter.";
    } else if (state.leaders.length !== 1) {
      headline = "The table split.";
      detail = "No single person had the most votes. The imposter slips away.";
    } else {
      headline = "Wrong person.";
      detail = escapeHtml(nameOf(state.leaders[0])) + " knew the word.";
    }
    var wordLine = state.mode === "cousin"
      ? "The table had <b>" + escapeHtml(state.secret) + "</b>. The lookalike was <b>" + escapeHtml(state.cousin) + "</b>."
      : "The word was <b>" + escapeHtml(state.secret) + "</b>.";
    var who = state.imposterIds.map(nameOf).join(", ");
    var scores = "<li><span>Table</span><b>" + state.tableWins + "</b></li><li><span>Imposters</span><b>" + state.imposterWins + "</b></li>";
    app.innerHTML =
      '<section class="stage play">' +
        chrome("Round " + state.round) +
        '<p class="kicker">Result</p>' +
        '<h2 class="who">' + headline + "</h2>" +
        '<p class="hint">' + detail + "</p>" +
        '<p class="word-line">' + wordLine + "</p>" +
        '<p class="hint">Imposter' + (state.imposterIds.length > 1 ? "s" : "") + ": " + escapeHtml(who) + ".</p>" +
        '<div class="bars">' + bars + "</div>" +
        '<ul class="scores">' + scores + "</ul>" +
        '<button type="button" class="btn primary" id="next">Next round</button>' +
        '<button type="button" class="btn ghost" id="table">New table</button>' +
      "</section>";
    document.getElementById("next").addEventListener("click", nextRound);
    document.getElementById("table").addEventListener("click", newTable);
  }

  function chrome(label) {
    return '<div class="chrome"><button type="button" class="texty" id="quit">End</button><span>' + escapeHtml(label) + '</span><button type="button" class="texty" id="mute-play">' + (state.muted ? "Muted" : "Sound") + "</button></div>";
  }

  function bindChrome() {
    var quit = document.getElementById("quit");
    var mute = document.getElementById("mute-play");
    if (quit) quit.addEventListener("click", function () {
      if (window.confirm("Leave this round? Scores stay until you start a new table.")) backToSetup();
    });
    if (mute) mute.addEventListener("click", function () {
      state.muted = !state.muted;
      saveSettings();
      draw();
    });
  }

  function draw() {
    clearTimer();
    if (state.screen === "setup") renderSetup();
    else if (state.screen === "pass") renderPass();
    else if (state.screen === "clue") renderClue();
    else if (state.screen === "discuss") {
      renderDiscuss();
      if (state.discussLeft > 0) {
        timerId = window.setInterval(function () {
          if (state.screen !== "discuss") return;
          state.discussLeft -= 1;
          var node = document.getElementById("discuss-count");
          if (node) node.textContent = state.discussLeft > 0 ? String(state.discussLeft) : "Time";
          if (state.discussLeft <= 0) clearTimer();
        }, 1000);
      }
    }
    else if (state.screen === "ballot") renderBallot();
    else if (state.screen === "steal") renderSteal();
    else if (state.screen === "result") renderResult();
    bindChrome();
  }

  loadSettings();
  draw();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/sw.js").catch(function () { return null; });
    });
  }
})();
