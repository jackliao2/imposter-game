(function () {
  var engine = window.ImposterEngine;
  var pack = window.WORD_PACK;
  var app = document.getElementById("app");
  var timerId = null;
  var holdPointer = null;

  var decks = [
    { id: "mixed", label: "The room", stripe: "#e4c48a" },
    { id: "food", label: "Supper", stripe: "#d07a45" },
    { id: "animals", label: "Creatures", stripe: "#d2a15a" },
    { id: "places", label: "Out", stripe: "#3d8f86" },
    { id: "home", label: "House", stripe: "#c46b6b" },
    { id: "nature", label: "Weather", stripe: "#7ea2c4" },
    { id: "jobs", label: "Work", stripe: "#b9a06a" },
    { id: "sports", label: "Play", stripe: "#6aaa72" },
    { id: "school", label: "Class", stripe: "#8d7cc4" },
    { id: "clothes", label: "Closet", stripe: "#c47aa6" },
    { id: "screen", label: "Screen", stripe: "#d4a017" }
  ];

  var state = {
    screen: "setup",
    playerCount: 5,
    imposterCount: 1,
    category: "mixed",
    mode: "classic",
    voice: false,
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
    clues: {},
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
      if (typeof saved.voice === "boolean") state.voice = saved.voice;
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
        voice: state.voice,
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
    if (state.muted || (!window.AudioContext && !window.webkitAudioContext)) return;
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      var ctx = beep.ctx || (beep.ctx = new Ctx());
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = "triangle";
      gain.gain.value = 0.045;
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

  function slipText(id) {
    var list = (state.clues[id] || []).filter(Boolean);
    return list.join(" · ");
  }

  function seatsHtml(activeId) {
    var list = players();
    return list.map(function (p, i) {
      var angle = (-90 + (i * 360) / list.length) * Math.PI / 180;
      var x = 50 + Math.cos(angle) * 40;
      var y = 48 + Math.sin(angle) * 36;
      var text = slipText(p.id);
      var burned = state.screen === "result" && state.imposterIds.indexOf(p.id) !== -1;
      var slip = text ? '<div class="slip' + (burned ? " burned" : "") + '">' + escapeHtml(text) + "</div>" : "";
      return '<div class="seat' + (p.id === activeId ? " is-now" : "") + '" data-i="' + i + '" style="left:' + x.toFixed(1) + "%;top:" + y.toFixed(1) + '%"><span class="seat-name">' + escapeHtml(p.name) + "</span>" + slip + "</div>";
    }).join("");
  }

  function tableHtml(activeId, hub) {
    return '<div class="table-wrap"><div class="oval"></div>' + seatsHtml(activeId) + '<div class="hub">' + hub + "</div></div>";
  }

  function startRound() {
    fitNames();
    saveSettings();
    var used = {};
    state.used.forEach(function (word) { used[word.toLowerCase()] = true; });
    var usedSet = {
      has: function (word) { return !!used[String(word).toLowerCase()]; }
    };
    if (state.mode === "cousin") {
      var deal = engine.pickCousin(pack, usedSet, rng);
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
    state.clues = {};
    state.round += 1;
    state.passIndex = 0;
    state.seen = false;
    state.clueLap = 0;
    state.clueStep = 0;
    state.votes = {};
    state.ballotIndex = 0;
    state.ballotSeen = false;
    state.discussLeft = 40;
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
    if (state.mode === "cousin") return { kind: "word", word: isImpostor ? state.cousin : state.secret };
    if (isImpostor) return { kind: "imposter" };
    return { kind: "word", word: state.secret };
  }

  function markPassReady() {
    var next = document.getElementById("pass-next");
    if (!next || !state.seen) return;
    var last = state.passIndex + 1 >= state.playerCount;
    next.disabled = false;
    next.textContent = last ? "Clues go on the table" : "Pass to " + players()[state.passIndex + 1].name;
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
    state.clueStep += 1;
    if (state.clueStep >= players().length) {
      state.clueStep = 0;
      state.clueLap += 1;
    }
    if (state.clueLap >= 2) {
      openDiscuss();
      return;
    }
    draw();
  }

  function pinClue(raw) {
    var speaker = orderFrom(state.startOffset)[state.clueStep];
    var word = state.voice ? "…" : String(raw || "").replace(/\s+/g, " ").trim();
    if (!state.voice) {
      if (!word || word.split(" ").length > 2) {
        var input = document.getElementById("clue-input");
        if (input) input.classList.add("shake");
        return;
      }
    }
    var list = (state.clues[speaker.id] || []).slice();
    list[state.clueLap] = word;
    state.clues[speaker.id] = list;
    beep(560, 40);
    advanceClue();
  }

  function openDiscuss() {
    state.screen = "discuss";
    state.discussLeft = 40;
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

  function recap() {
    var lines = players().map(function (p) {
      var mark = state.imposterIds.indexOf(p.id) !== -1 ? "  ← imposter" : "";
      return p.name + ": " + (slipText(p.id) || "—") + mark;
    });
    lines.unshift("Imposter Game");
    lines.push("Word: " + state.secret);
    if (state.cousin) lines.push("Lookalike: " + state.cousin);
    return lines.join("\n");
  }

  function copyRecap() {
    var text = recap();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        var btn = document.getElementById("copy");
        if (btn) btn.textContent = "Copied";
      }).catch(function () { window.prompt("Copy the round", text); });
      return;
    }
    window.prompt("Copy the round", text);
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
      var card = cardFor(currentPassPlayer());
      if (card.kind === "imposter") {
        face.innerHTML = '<span class="seal">Imposter</span><b>You do not know the word.</b><small>Read the table. Write something that fits.</small>';
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
      node.querySelector("[data-face]").innerHTML = "<small>Press and hold</small><b>Show my card</b>";
      holdPointer = null;
      markPassReady();
    }
    node.addEventListener("pointerdown", function (event) {
      event.preventDefault();
      show(event);
    });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (type) {
      node.addEventListener(type, hide);
    });
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

  function evidenceList(asButtons) {
    return orderFrom(state.startOffset).map(function (p) {
      var burned = state.screen === "result" && state.imposterIds.indexOf(p.id) !== -1;
      var text = slipText(p.id) || "—";
      if (asButtons) {
        return '<button type="button" class="evidence" data-vote="' + p.id + '"><span>' + escapeHtml(p.name) + "</span><b>" + escapeHtml(text) + "</b></button>";
      }
      return '<div class="evidence' + (burned ? " burned" : "") + '"><span>' + escapeHtml(p.name) + "</span><b>" + escapeHtml(text) + "</b></div>";
    }).join("");
  }

  function chrome(label) {
    return '<div class="chrome"><button type="button" class="texty" id="quit">End</button><span>' + escapeHtml(label) + '</span><button type="button" class="texty" id="mute-play">' + (state.muted ? "Muted" : "Sound") + "</button></div>";
  }

  function renderSetup() {
    var deckButtons = decks.map(function (deck) {
      return '<button type="button" class="deck' + (state.category === deck.id ? " is-on" : "") + '" data-cat="' + deck.id + '" style="--stripe:' + deck.stripe + '">' + deck.label + "</button>";
    }).join("");
    var nameFields = "";
    for (var i = 0; i < state.playerCount; i++) {
      nameFields += '<label>Seat ' + (i + 1) + '<input maxlength="16" data-name="' + i + '" value="' + escapeHtml(state.names[i] || "") + '" placeholder="Player ' + (i + 1) + '"></label>';
    }
    app.innerHTML =
      '<section class="stage setup">' +
        tableHtml("", '<button type="button" class="deal" id="start">Deal</button>') +
        '<p class="hint">Write the clues on the phone. They stay on the table. Vote for the slip that does not belong.</p>' +
        '<div class="steppers">' +
          '<div class="stepper"><span>Seats</span><button type="button" data-step="players" data-dir="-1" aria-label="Fewer players">−</button><strong>' + state.playerCount + '</strong><button type="button" data-step="players" data-dir="1" aria-label="More players">+</button></div>' +
          '<div class="stepper"><span>Imposters</span><button type="button" data-step="imposters" data-dir="-1" aria-label="Fewer imposters">−</button><strong>' + state.imposterCount + '</strong><button type="button" data-step="imposters" data-dir="1" aria-label="More imposters">+</button></div>' +
        "</div>" +
        '<div class="decks" role="group" aria-label="Word deck">' + deckButtons + "</div>" +
        '<div class="seg" role="group" aria-label="Imposter card">' +
          '<button type="button" data-mode="classic" class="' + (state.mode === "classic" ? "is-on" : "") + '">Blank card</button>' +
          '<button type="button" data-mode="cousin" class="' + (state.mode === "cousin" ? "is-on" : "") + '">Lookalike</button>' +
        "</div>" +
        '<p class="hint">' + (state.mode === "classic"
          ? "The imposter sees a blank role and has to write into everyone else's trail."
          : "The imposter gets a cousin of the word and is not told. The slip gives them away.") + "</p>" +
        '<button type="button" class="btn ghost" id="voice">' + (state.voice ? "Clues are spoken" : "Clues are written") + "</button>" +
        '<details class="names"><summary>Name the seats</summary><div class="name-grid">' + nameFields + "</div></details>" +
        '<details class="rules"><summary>How a round goes</summary><ol>' +
          "<li>Pass the phone. Press and hold, read, let go.</li>" +
          "<li>Two laps. Each person pins one word to the table.</li>" +
          "<li>Read the trail. Vote for the slip that doesn't fit.</li>" +
          "<li>A caught imposter gets one guess to steal the round.</li>" +
        "</ol></details>" +
        '<button type="button" class="btn ghost" id="mute">' + (state.muted ? "Sound off" : "Sound on") + "</button>" +
      "</section>";
    var deckRow = app.querySelector(".decks");
    var deckOn = app.querySelector(".deck.is-on");
    if (deckRow && deckOn) {
      var view = deckRow.clientWidth;
      var pad = deckRow.querySelector("[data-deck-pad]");
      if (!pad) {
        pad = document.createElement("span");
        pad.setAttribute("data-deck-pad", "");
        pad.setAttribute("aria-hidden", "true");
        deckRow.appendChild(pad);
      }
      pad.style.flex = "0 0 " + Math.max(0, view - deckOn.offsetWidth) + "px";
      function into(el) {
        return el.getBoundingClientRect().left - deckRow.getBoundingClientRect().left + deckRow.scrollLeft;
      }
      var end = into(deckOn) + deckOn.offsetWidth;
      var start = into(deckOn);
      var chip = deckOn.previousElementSibling;
      while (chip && chip.classList && chip.classList.contains("deck")) {
        if (end - into(chip) <= view + 1) start = into(chip);
        else break;
        chip = chip.previousElementSibling;
      }
      deckRow.scrollLeft = start;
    }

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
        var index = Number(input.getAttribute("data-name"));
        state.names[index] = input.value;
        var seat = app.querySelector('.seat[data-i="' + index + '"] .seat-name');
        if (seat) seat.textContent = input.value.trim() || ("Player " + (index + 1));
        saveSettings();
      });
    });
    document.getElementById("start").addEventListener("click", startRound);
    document.getElementById("voice").addEventListener("click", function () {
      state.voice = !state.voice;
      saveSettings();
      draw();
    });
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
        tableHtml(player.id, "") +
        '<p class="kicker">Hand the phone to</p>' +
        '<h2 class="who">' + escapeHtml(player.name) + "</h2>" +
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
    var speaker = orderFrom(state.startOffset)[state.clueStep];
    var second = state.clueLap === 1;
    var field = state.voice
      ? '<button type="button" class="btn primary" id="said">Said it</button>'
      : '<form id="clue-form" class="clue-form"><label class="sr" for="clue-input">One word</label><input id="clue-input" maxlength="22" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" placeholder="' + (second ? "Narrow it" : "One word") + '"><button type="submit" class="btn primary">Pin it to the table</button></form>';
    app.innerHTML =
      '<section class="stage play">' +
        chrome("Trail · pass " + (state.clueLap + 1) + " of 2") +
        tableHtml(speaker.id, "") +
        '<p class="kicker">' + (second ? "Second word" : "First word") + "</p>" +
        '<h2 class="who">' + escapeHtml(speaker.name) + "</h2>" +
        '<p class="hint">' + (state.voice
          ? "Say one word out loud. Do not say the secret, and do not name the deck."
          : "Type one word. It stays on the felt. Do not write the secret.") + "</p>" +
        field +
      "</section>";
    if (state.voice) {
      document.getElementById("said").addEventListener("click", function () { pinClue(""); });
    } else {
      var form = document.getElementById("clue-form");
      var input = document.getElementById("clue-input");
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        pinClue(input.value);
      });
      input.focus();
    }
  }

  function renderDiscuss() {
    app.innerHTML =
      '<section class="stage play">' +
        chrome("Read the trail") +
        '<p class="kicker" id="discuss-count">' + state.discussLeft + "</p>" +
        '<h2 class="who">Which slip is off?</h2>' +
        '<p class="hint">The words are the evidence. The imposter should argue too.</p>' +
        evidenceList(false) +
        '<button type="button" class="btn primary" id="to-vote">Vote on a slip</button>' +
      "</section>";
    document.getElementById("to-vote").addEventListener("click", openBallot);
  }

  function renderBallot() {
    var voter = players()[state.ballotIndex];
    if (!state.ballotSeen) {
      app.innerHTML =
        '<section class="stage play">' +
          chrome("Vote " + (state.ballotIndex + 1) + " of " + state.playerCount) +
          '<p class="kicker">Hand the phone to</p>' +
          '<h2 class="who">' + escapeHtml(voter.name) + "</h2>" +
          '<p class="hint">Tap the slip that does not belong. The choice locks before the phone moves on.</p>' +
          evidenceList(true) +
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
        '<button type="button" class="btn primary" id="ballot-next">' + (last ? "Open the poster" : "Next voter") + "</button>" +
      "</section>";
    document.getElementById("ballot-next").addEventListener("click", finishBallot);
  }

  function renderSteal() {
    app.innerHTML =
      '<section class="stage play">' +
        chrome("One guess") +
        '<p class="kicker">The table pointed at</p>' +
        '<h2 class="who">' + escapeHtml(nameOf(state.leaders[0])) + "</h2>" +
        '<p class="hint">Hand them the phone. One right guess steals the round.</p>' +
        '<form id="steal-form" class="steal"><label class="sr" for="steal-input">Guess the word</label><input id="steal-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="The word"><button type="submit" class="btn primary">Guess</button></form>' +
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
    var stolen = state.steal && engine.guessHits(state.steal, state.secret);
    var headline = "Wrong slip.";
    var detail = escapeHtml(nameOf(state.leaders[0] || "")) + " knew the word.";
    if (stolen) {
      headline = "Stolen.";
      detail = escapeHtml(nameOf(state.leaders[0])) + " named it.";
    } else if (state.caught) {
      headline = "That slip was the one.";
      detail = escapeHtml(nameOf(state.leaders[0])) + " was the imposter.";
    } else if (state.leaders.length !== 1) {
      headline = "The table split.";
      detail = "No single slip won. The imposter stays in.";
    }
    var wordLine = state.mode === "cousin"
      ? "The table had <b>" + escapeHtml(state.secret) + "</b>. The lookalike was <b>" + escapeHtml(state.cousin) + "</b>."
      : "The word was <b>" + escapeHtml(state.secret) + "</b>.";
    app.innerHTML =
      '<section class="stage play">' +
        chrome("Round " + state.round) +
        tableHtml("", "") +
        '<article class="poster">' +
          '<p class="kicker">The poster</p>' +
          '<h2 class="who">' + headline + "</h2>" +
          '<p class="hint">' + detail + "</p>" +
          '<p class="word-line">' + wordLine + "</p>" +
          evidenceList(false) +
          '<div class="scoreline"><span>Table</span><b>' + state.tableWins + "</b></div>" +
          '<div class="scoreline"><span>Imposters</span><b>' + state.imposterWins + "</b></div>" +
        "</article>" +
        '<button type="button" class="btn primary" id="next">Next round</button>' +
        '<button type="button" class="btn ghost" id="copy">Copy the round</button>' +
        '<button type="button" class="btn ghost" id="table">New table</button>' +
      "</section>";
    document.getElementById("next").addEventListener("click", nextRound);
    document.getElementById("copy").addEventListener("click", copyRecap);
    document.getElementById("table").addEventListener("click", newTable);
  }

  function bindChrome() {
    var quit = document.getElementById("quit");
    var mute = document.getElementById("mute-play");
    if (quit) quit.addEventListener("click", function () {
      if (window.confirm("Leave this round? The score stays until you start a new table.")) backToSetup();
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
    } else if (state.screen === "ballot") renderBallot();
    else if (state.screen === "steal") renderSteal();
    else if (state.screen === "result") renderResult();
    bindChrome();
  }

  function applyPageIntent() {
    var deck = document.body.getAttribute("data-deck");
    var mode = document.body.getAttribute("data-mode");
    var voice = document.body.getAttribute("data-voice");
    var known = { mixed: 1, food: 1, animals: 1, places: 1, home: 1, nature: 1, jobs: 1, sports: 1, school: 1, clothes: 1, screen: 1 };
    if (deck && known[deck]) state.category = deck;
    if (mode === "classic" || mode === "cousin") state.mode = mode;
    if (voice === "spoken") state.voice = true;
    if (voice === "written") state.voice = false;
  }

  loadSettings();
  applyPageIntent();
  draw();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/sw.js").catch(function () { return null; });
    });
  }
})();
