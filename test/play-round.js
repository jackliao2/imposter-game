const fs = require("fs");
const path = require("path");
const assert = require("assert");
const { JSDOM } = require("jsdom");

const root = path.join(__dirname, "..");
const engine = require(path.join(root, "js", "engine.js"));

function rules() {
  const caught = engine.tally({ p1: "imp", p2: "imp", p3: "crew" });
  assert.strictEqual(engine.crewCaught(caught.leaders, ["imp"]), true, "sole top vote on an imposter");
  const tied = engine.tally({ p1: "imp", p2: "crew" });
  assert.strictEqual(tied.leaders.length, 2, "tie has two leaders");
  assert.strictEqual(engine.crewCaught(tied.leaders, ["imp"]), false, "tie is not a catch");
  const crew = engine.tally({ p1: "crew", p2: "crew", p3: "imp" });
  assert.strictEqual(engine.crewCaught(crew.leaders, ["imp"]), false, "sole vote on a non-imposter");
  assert.strictEqual(engine.guessHits("Fish & Chips", "fish and chips"), true, "normalized guess steals");
  assert.strictEqual(engine.guessHits("waffle", "fish and chips"), false, "different guess does not steal");
}

function play() {
  const dom = new JSDOM('<!DOCTYPE html><html><body><main id="app"></main></body></html>', {
    url: "https://imposter-game-one.vercel.app/",
    runScripts: "dangerously",
    pretendToBeVisual: true
  });
  const window = dom.window;
  const document = window.document;
  assert.strictEqual(typeof window.module, "undefined");
  assert.strictEqual(typeof window.require, "undefined");
  window.confirm = function () { return true; };
  ["engine.js", "words.js", "game.js"].forEach(function (file) {
    const script = document.createElement("script");
    script.textContent = fs.readFileSync(path.join(root, "js", file), "utf8");
    document.body.appendChild(script);
  });
  assert.ok(document.getElementById("start"), "game did not install");
  assert.ok(document.querySelector('[data-mode="hint"]'), "category mode is on the table");
  assert.ok(/too close/.test(document.body.textContent), "a clue sample is on the table");
  click('[data-mode="hint"]');
  assert.ok(/knows the list/.test(document.body.textContent), "category mode explains the list");
  click('[data-mode="classic"]');

  function click(sel) {
    const node = document.querySelector(sel);
    assert.ok(node, "missing " + sel);
    node.click();
  }
  click('[data-step="players"][data-dir="-1"]');
  click('[data-step="players"][data-dir="-1"]');
  click("#start");

  for (let i = 0; i < 3; i++) {
    const hold = document.getElementById("hold");
    assert.ok(hold, "no card");
    function point(name) {
      const event = new window.Event(name, { bubbles: true, cancelable: true });
      event.pointerType = "touch";
      event.button = 0;
      event.pointerId = 1;
      return event;
    }
    hold.dispatchEvent(point("pointerdown"));
    assert.ok(/Your word|You do not know the word/.test(hold.textContent), hold.textContent);
    hold.dispatchEvent(point("pointerup"));
    assert.ok(!/Your word/.test(hold.textContent), "card stayed open");
    click("#pass-next");
  }

  const words = ["steam", "morning", "ticket", "kettle", "quiet", "round"];
  for (let c = 0; c < 6; c++) {
    const input = document.getElementById("clue-input");
    assert.ok(input, "spoken mode is not the default");
    input.value = words[c];
    document.getElementById("clue-form").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  }
  click("#to-vote");
  const ballots = document.querySelectorAll("[data-vote]");
  assert.strictEqual(ballots.length, 3);
  const ballotText = Array.prototype.map.call(ballots, function (node) { return node.textContent; }).join(" ");
  words.forEach(function (word) {
    assert.ok(ballotText.indexOf(word) !== -1, "vote lost written slip " + word);
  });
  dom.window.close();
}

rules();
play();
console.log("play-round ok");
