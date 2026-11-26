"use strict";

const KEY = "case-relay-completion-v1";
const DATE_LABEL = "18 November 2026";
const TASK_KEYS = cases.flatMap((item, c) => item.tasks.map((_, t) => `${c}:${t}`));
const TOTAL = TASK_KEYS.length;
const $ = id => document.getElementById(id);
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const snapshots = new Map();
let pausedMotion = reducedMotion.matches;
let completed = loadProgress();
let caseIndex = 0;
let taskIndex = 0;
let filter = {};
let selected = "";
let pins = [];
let arrivals = [];
let replayIndex = -1;
let replayTimer = null;
let flight = null;

const activeCase = () => cases[caseIndex];
const activeTask = () => activeCase().tasks[taskIndex];
const key = () => `${caseIndex}:${taskIndex}`;
const findEvent = id => activeCase().events.find(event => event.id === id);
const escape = value => String(value).replace(/[&<>"']/g, character => (
  { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]
));

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    return new Set(Array.isArray(saved) ? saved.filter(value => TASK_KEYS.includes(value)) : []);
  } catch {
    return new Set();
  }
}

function saveProgress() {
  try {
    localStorage.setItem(KEY, JSON.stringify([...completed]));
  } catch {
    $("progress-label").title = "Browser storage is unavailable. Keep this tab open to retain progress.";
  }
}

function updateProgress() {
  const allDone = completed.size === TOTAL;
  $("progress").value = completed.size;
  $("progress-label").textContent = `${completed.size} / ${TOTAL} complete`;
  $("resume").textContent = allDone ? "View certificate" : completed.size ? "Resume the lab" : "Start the lab";
  $("completion-badge").hidden = !completed.has(key());
  $("next").disabled = !completed.has(key());
  $("next").textContent = key() === TASK_KEYS.at(-1) ? "Go to hand-off" : "Next challenge";
  $("cert-form").hidden = !allDone;
  $("cert-status").textContent = allDone
    ? "All 24 challenges complete. Your certificate is ready."
    : "Complete all 24 challenges to unlock your certificate.";
  $("handoff").hidden = caseIndex !== cases.length - 1 || !completed.has(TASK_KEYS.at(-1));
}

function renderNavigation() {
  $("cases").innerHTML = cases.map((item, c) => {
    const count = item.tasks.filter((_, t) => completed.has(`${c}:${t}`)).length;
    return `<button type="button" data-case="${c}" ${c === caseIndex ? 'aria-current="step"' : ""}><strong>${item.title}</strong><span>${item.topic}</span><small>${count} / ${item.tasks.length} complete</small></button>`;
  }).join("");
  $("tasks").innerHTML = activeCase().tasks.map((task, t) =>
    `<button type="button" data-task="${t}" ${t === taskIndex ? 'aria-current="step"' : ""} aria-label="Challenge ${t + 1}, ${task.title}${completed.has(`${caseIndex}:${t}`) ? ", completed" : ""}">Challenge ${t + 1}${completed.has(`${caseIndex}:${t}`) ? " ✓" : ""}</button>`
  ).join("");
}

function stopReplay() {
  clearTimeout(replayTimer);
  replayTimer = null;
  $("play").textContent = "Replay arrivals";
}

function cancelFlight() {
  flight?.cancel();
  flight = null;
}

function updateMotion() {
  document.documentElement.classList.toggle("motion-paused", pausedMotion);
  $("motion").textContent = pausedMotion ? "Enable motion" : "Pause motion";
  $("motion").setAttribute("aria-pressed", String(pausedMotion));
  if (pausedMotion) cancelFlight();
}

function rewind() {
  stopReplay();
  cancelFlight();
  replayIndex = -1;
  $("replay-state").textContent = "Ready";
  $("replay-message").textContent = "Replay shows SIEM arrival order with gaps shortened for the lab.";
  $("replay-progress").max = arrivals.length;
  $("replay-progress").value = 0;
  $("source-strip").querySelectorAll("[data-source]").forEach(node => node.classList.remove("relaying"));
  updateSelectedRows();
}

function openCase(c, t, focus = true) {
  caseIndex = c;
  taskIndex = t;
  const item = activeCase();
  const task = activeTask();
  filter = {};
  pins = [];
  selected = "";
  arrivals = [...item.events].sort((a, b) => a.arrival.localeCompare(b.arrival));
  const names = [...new Set(item.events.map(event => event.source))];
  $("filter-source").innerHTML = '<option value="">All sources</option>' + names.map(name => `<option>${name}</option>`).join("");
  $("filters").reset();
  $("source-strip").innerHTML = names.map(name => `<span data-source="${name}" style="--signal:${sources[name].colour}">${name}</span>`).join("");
  $("case-brief").innerHTML = `<div><h3>${item.title}</h3><span>Fictional evidence · ${DATE_LABEL}</span></div><p>${item.brief}</p>`;
  $("mission").innerHTML = `<div class="section-title"><h3 id="mission-title" tabindex="-1">${task.title}</h3><span id="completion-badge" hidden>Complete</span></div>
    <p>${task.scope}</p>${task.ordered ? '<p class="mode-badge">Timeline order matters</p>' : ""}
    ${task.audit ? '<p class="mode-badge">Simulated AI draft under review</p>' : ""}
    <div class="mission-links"><details><summary>Show a hint</summary><p>${task.hint}</p></details><a href="#submission">Go to your finding</a></div>`;
  $("prompts").innerHTML = task.questions.map((item, index) => `<fieldset><legend>${item.prompt}</legend>${item.choices.map((choice, n) =>
    `<label><input type="radio" name="question-${index}" value="${n}"><span>${choice}</span></label>`).join("")}</fieldset>`).join("");
  renderNavigation();
  renderRows();
  renderDetails();
  renderPins();
  updateSnapshotStatus();
  rewind();
  feedback("", "");
  updateProgress();
  if (focus) $("mission-title").focus();
}

function presentEvents() {
  const sortKey = $("sort").value === "arrival" ? "arrival" : "utc";
  return [...activeCase().events].sort((a, b) => a[sortKey].localeCompare(b[sortKey]) || a.id.localeCompare(b.id))
    .filter(event => {
      const text = [event.id, event.source, event.host, event.headline, event.raw].join(" ").toLowerCase();
      return (!filter.source || event.source === filter.source) &&
        (!filter.query || text.includes(filter.query)) &&
        (!filter.from || event.utc >= filter.from) && (!filter.to || event.utc <= filter.to);
    });
}

function renderRows() {
  const events = presentEvents();
  $("rows").innerHTML = events.map(event => `<tr data-row="${event.id}">
    <td><button type="button" data-inspect="${event.id}" aria-label="Inspect event ${event.id}">${event.id}</button></td>
    <td>${event.utc}</td><td>${event.arrival}</td><td><span class="source-tag" style="--signal:${sources[event.source].colour}">${event.source}</span></td>
    <td>${event.headline}</td></tr>`).join("") || '<tr><td colspan="5">No matching events. Adjust or clear the filters.</td></tr>';
  $("match-count").textContent = `${events.length} of ${activeCase().events.length} shown. Replay covers the full log set.`;
  updateSelectedRows();
}

function updateSelectedRows() {
  const replayed = arrivals[replayIndex]?.id;
  $("rows").querySelectorAll("[data-row]").forEach(row => {
    const id = row.dataset.row;
    row.classList.toggle("selected", id === selected);
    row.classList.toggle("arriving", id === replayed);
    row.firstElementChild.firstElementChild.setAttribute("aria-pressed", String(id === selected));
    row.classList.toggle("pinned", pins.includes(id));
  });
}

function renderDetails() {
  const event = findEvent(selected);
  if (!event) {
    $("record").innerHTML = '<h4 id="record-title">Event details</h4><p>Select an event ID to read the original record.</p>';
    return;
  }
  $("record").innerHTML = `<div class="section-title"><h4 id="record-title" tabindex="-1">Event ${event.id}</h4><button class="quiet small" type="button" id="pin-event" aria-pressed="${pins.includes(event.id)}">${pins.includes(event.id) ? "Unpin event" : "Pin event"}</button></div>
    <p class="source-tag" style="--signal:${sources[event.source].colour}">${event.source} · ${event.host}</p>
    <dl class="event-times"><div><dt>Event UTC</dt><dd>${event.utc}</dd></div><div><dt>Arrived UTC</dt><dd>${event.arrival}</dd></div></dl>
    <h5>Original source record</h5><pre tabindex="0">${escape(event.raw)}</pre><p class="field-note">${sources[event.source].meaning}</p>`;
}

function inspect(id, focus = false) {
  selected = id;
  updateSelectedRows();
  renderDetails();
  if (focus) $("record-title").focus();
}

function drawFlight(source) {
  cancelFlight();
  const receiver = $("replay-state");
  const origin = $("source-strip").querySelector(`[data-source="${source}"]`);
  $("source-strip").querySelectorAll("[data-source]").forEach(node => node.classList.toggle("relaying", node === origin));
  if (pausedMotion || !origin.animate) return;
  const wrapper = $("ingest");
  const map = wrapper.getBoundingClientRect();
  const start = origin.getBoundingClientRect();
  const end = receiver.getBoundingClientRect();
  const dot = document.createElement("span");
  dot.className = "ingest-dot";
  dot.style.setProperty("--signal", sources[source].colour);
  dot.setAttribute("aria-hidden", "true");
  wrapper.append(dot);
  flight = dot.animate([
    { transform: `translate(${start.left - map.left + start.width / 2}px,${start.bottom - map.top}px)`, opacity: 0 },
    { opacity: 1, offset: .14 },
    { transform: `translate(${end.left - map.left + end.width / 2}px,${end.top - map.top}px)`, opacity: 1 }
  ], { duration: 500, easing: "ease-out" });
  flight.addEventListener("finish", () => dot.remove());
  flight.addEventListener("cancel", () => dot.remove());
}

function stepReplay() {
  if (replayIndex + 1 >= arrivals.length) return false;
  replayIndex += 1;
  const event = arrivals[replayIndex];
  $("replay-state").textContent = `${event.id} · ${event.source}`;
  $("replay-message").textContent = `Arrived ${event.arrival} UTC · event time ${event.utc} UTC · ${event.headline}`;
  $("replay-progress").value = replayIndex + 1;
  drawFlight(event.source);
  updateSelectedRows();
  return true;
}

function replayTick() {
  if (!stepReplay() || replayIndex === arrivals.length - 1) {
    stopReplay();
    return;
  }
  replayTimer = setTimeout(replayTick, 870);
}

function renderPins(changed = "") {
  $("pins").innerHTML = pins.map((id, position) => {
    const event = findEvent(id);
    return `<li style="--signal:${sources[event.source].colour}" ${id === changed ? 'class="changed"' : ""}>
      <div><span class="pin-meta">${event.utc} UTC · ${event.source}</span><strong>${event.headline}</strong><small>${event.host}</small></div>
      <div class="pin-controls"><button class="quiet small" type="button" data-pin-action="inspect" data-id="${id}" aria-label="Inspect pinned event ${id}">${id}</button>
        <button class="quiet small" type="button" data-pin-action="earlier" data-id="${id}" ${position === 0 ? "disabled" : ""} aria-label="Move ${id} earlier">Earlier</button>
        <button class="quiet small" type="button" data-pin-action="later" data-id="${id}" ${position === pins.length - 1 ? "disabled" : ""} aria-label="Move ${id} later">Later</button>
        <button class="quiet small" type="button" data-pin-action="remove" data-id="${id}" aria-label="Remove ${id}">Remove</button></div></li>`;
  }).join("") || '<li class="empty">Select an event and choose Pin event to begin.</li>';
  $("empty-board").disabled = pins.length === 0;
  renderJoins();
  updateSelectedRows();
}

function renderJoins() {
  const board = $("joins");
  board.hidden = pins.length < 2;
  if (board.hidden) return;
  const comparableFields = {
    Account: ["user"], Address: ["src_ip", "assigned_ip", "client_ip", "public_ip"],
    Device: ["device"], Session: ["session"], Request: ["request_id"]
  };
  const matches = [];
  for (const [type, fields] of Object.entries(comparableFields)) {
    const values = new Map();
    for (const id of pins) {
      const event = findEvent(id);
      for (const field of fields) {
        const value = event.fields[field];
        if (value === undefined) continue;
        if (!values.has(value)) values.set(value, new Set());
        values.get(value).add(id);
      }
    }
    for (const [value, ids] of values) {
      if (ids.size > 1) matches.push({ type, value, ids: [...ids] });
    }
  }
  board.innerHTML = `<h4>Field matches across your pins</h4><p class="meta">Matching values suggest a link to verify against the original records.</p>
    ${matches.length ? `<ul>${matches.map(({ type, value, ids }) => `<li><b>${type}</b><code>${escape(value)}</code><span>${ids.join(" · ")}</span></li>`).join("")}</ul>`
      : '<p class="meta">No exact match on the compared account, address, device, session or request fields.</p>'}`;
}

function updateSnapshotStatus() {
  const ready = snapshots.has(caseIndex);
  $("download-original").disabled = !ready;
  $("preserve").textContent = ready ? "Snapshot prepared" : "Prepare original snapshot";
  $("preserve").disabled = ready;
  $("snapshot-state").textContent = ready
    ? `${activeCase().events.length} original records prepared. Filter and pin changes stay in your working view.`
    : "Prepare a copy of the full supplied log set, including source and arrival time.";
}

function download(href, filename) {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
}

function downloadText(value, type, filename) {
  const url = URL.createObjectURL(new Blob([value], { type }));
  download(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function feedback(message, tone) {
  $("feedback").textContent = message;
  $("feedback").dataset.tone = tone;
}

function check() {
  const task = activeTask();
  if (task.preserve && !snapshots.has(caseIndex)) {
    return feedback("Prepare the original snapshot in the evidence panel first.", "review");
  }
  if (pins.length !== task.ids.length) {
    return feedback(`Pin exactly ${task.ids.length} event${task.ids.length === 1 ? "" : "s"}. Check the scope above the explorer.`, "review");
  }
  if (!task.ids.every(id => pins.includes(id))) {
    return feedback(`Check which records belong in scope. ${task.hint}`, "review");
  }
  if (task.ordered && pins.some((id, position) => id !== task.ids[position])) {
    return feedback("You have the right events. Use Earlier and Later to put them in UTC event-time order.", "review");
  }
  const choices = task.questions.map((_, index) => document.querySelector(`input[name="question-${index}"]:checked`));
  if (choices.some(choice => !choice)) {
    return feedback("Your evidence matches. Answer each question before checking.", "review");
  }
  const errors = task.questions.flatMap((question, index) => Number(choices[index].value) === question.answer ? [] : [index + 1]);
  if (errors.length) {
    return feedback(`Your evidence matches. Review ${errors.length === 1 ? "response" : "responses"} ${errors.join(", ")}. ${task.hint}`, "review");
  }
  completed.add(key());
  saveProgress();
  renderNavigation();
  updateProgress();
  feedback(task.questions.map(question => question.explanation).join(" "), "pass");
}

function openKey(next) {
  openCase(...next.split(":").map(Number));
}

$("motion").addEventListener("click", () => { pausedMotion = !pausedMotion; updateMotion(); });
reducedMotion.addEventListener("change", event => { pausedMotion = event.matches; updateMotion(); });
$("play").addEventListener("click", () => {
  if (replayTimer !== null) return stopReplay();
  if (replayIndex === arrivals.length - 1) rewind();
  $("play").textContent = "Pause replay";
  replayTick();
});
$("step").addEventListener("click", () => {
  stopReplay();
  if (!stepReplay()) $("replay-message").textContent = "End of supplied record set. Rewind to replay.";
});
$("rewind").addEventListener("click", rewind);
$("filters").addEventListener("submit", event => {
  event.preventDefault();
  const time = id => {
    const value = $(id).value;
    return value.length === 5 ? value + ":00" : value;
  };
  const from = time("filter-from");
  const to = time("filter-to");
  if (from && to && from > to) {
    $("match-count").textContent = "From UTC must be earlier than or equal to To UTC. The current filters are still active.";
    return;
  }
  filter = { source: $("filter-source").value, query: $("filter-query").value.trim().toLowerCase(), from, to };
  renderRows();
});
$("clear").addEventListener("click", () => {
  $("filters").reset();
  filter = {};
  renderRows();
});
$("sort").addEventListener("change", renderRows);
$("rows").addEventListener("click", event => {
  const button = event.target.closest("[data-inspect]");
  if (button) inspect(button.dataset.inspect, matchMedia("(max-width: 50rem)").matches);
});
$("record").addEventListener("click", event => {
  if (event.target.id !== "pin-event") return;
  const adding = !pins.includes(selected);
  pins = adding ? [...pins, selected] : pins.filter(id => id !== selected);
  renderPins(adding ? selected : "");
  event.target.setAttribute("aria-pressed", String(adding));
  event.target.textContent = adding ? "Unpin event" : "Pin event";
});
$("pins").addEventListener("click", event => {
  const button = event.target.closest("[data-pin-action]");
  if (!button) return;
  const { id, pinAction } = button.dataset;
  if (pinAction === "inspect") return inspect(id, true);
  if (pinAction === "remove") {
    pins = pins.filter(pin => pin !== id);
    if (selected === id) renderDetails();
    renderPins();
    if (pins.length) $("pins").querySelector("button").focus();
    else $("board-title").setAttribute("tabindex", "-1");
    if (!pins.length) $("board-title").focus();
    return;
  }
  const from = pins.indexOf(id);
  const to = from + (pinAction === "earlier" ? -1 : 1);
  if (to < 0 || to >= pins.length) return;
  [pins[from], pins[to]] = [pins[to], pins[from]];
  renderPins(id);
  const controls = [...$("pins").querySelectorAll(`[data-id="${id}"]`)];
  (controls.find(control => control.dataset.pinAction === pinAction && !control.disabled) || controls[0]).focus({ preventScroll: true });
});
$("empty-board").addEventListener("click", () => {
  pins = [];
  renderPins();
  renderDetails();
});
$("preserve").addEventListener("click", () => {
  snapshots.set(caseIndex, JSON.stringify({
    case: activeCase().title,
    sourceDate: DATE,
    records: activeCase().events.map(event => ({
      id: event.id, source: event.source, emitter: event.host,
      eventTimeOriginal: event.originalTime, eventTimeUtc: `${DATE}T${event.utc}Z`,
      arrivalTimeUtc: `${DATE}T${event.arrival}Z`, raw: event.raw
    }))
  }, null, 2));
  updateSnapshotStatus();
  $("download-original").focus();
});
$("download-original").addEventListener("click", () => {
  const snapshot = snapshots.get(caseIndex);
  if (snapshot) downloadText(snapshot, "application/json", `case-relay-${caseIndex + 1}-originals.json`);
});
$("check").addEventListener("click", check);
$("cases").addEventListener("click", event => {
  const button = event.target.closest("[data-case]");
  if (!button) return;
  const c = Number(button.dataset.case);
  const first = cases[c].tasks.findIndex((_, t) => !completed.has(`${c}:${t}`));
  openCase(c, Math.max(first, 0));
});
$("tasks").addEventListener("click", event => {
  const button = event.target.closest("[data-task]");
  if (button) openCase(caseIndex, Number(button.dataset.task));
});
$("next").addEventListener("click", () => {
  const next = TASK_KEYS[TASK_KEYS.indexOf(key()) + 1];
  if (next) openKey(next);
  else $("handoff-note").focus();
});
$("resume").addEventListener("click", () => {
  const pending = TASK_KEYS.find(task => !completed.has(task));
  if (pending) openKey(pending);
  else {
    $("certificate").scrollIntoView();
    $("learner").focus({ preventScroll: true });
  }
});
$("reset").addEventListener("click", () => {
  if (!confirm("Clear the completed challenges and current working notes in this browser tab?")) return;
  completed.clear();
  saveProgress();
  snapshots.clear();
  $("handoff-note").value = "";
  $("note-feedback").textContent = "";
  openCase(0, 0);
});
$("download-note").addEventListener("click", () => {
  const note = $("handoff-note").value.trim();
  if (!note) {
    $("note-feedback").textContent = "Write your hand-off before downloading it.";
    $("handoff-note").focus();
    return;
  }
  downloadText(`CASE RELAY | FINAL ANALYST SHIFT\n${DATE_LABEL} · 17:40–18:00 UTC\n\n${note}\n`, "text/plain", "case-relay-hand-off.txt");
  $("note-feedback").textContent = "Hand-off download started.";
});
$("cert-form").addEventListener("submit", event => {
  event.preventDefault();
  const name = $("learner").value.trim();
  if (!name || completed.size !== TOTAL) return;
  const canvas = document.createElement("canvas");
  canvas.width = 1500;
  canvas.height = 940;
  const context = canvas.getContext("2d");
  context.fillStyle = "#1b1532";
  context.fillRect(0, 0, 1500, 940);
  context.strokeStyle = "#e5b3ff";
  context.lineWidth = 4;
  context.strokeRect(45, 45, 1410, 850);
  context.textAlign = "center";
  function line(text, y, font, colour) {
    context.fillStyle = colour;
    context.font = font;
    context.fillText(text, 750, y, 1260);
  }
  line("CASE RELAY SOC TRAINING", 161, "bold 30px system-ui", "#e5b3ff");
  line("Certificate of Completion", 280, "bold 72px system-ui", "#ffffff");
  line("Awarded to", 361, "32px system-ui", "#cfcae3");
  line(name, 467, "bold 89px system-ui", "#ffffff");
  line("Security Logging & Event Correlation", 613, "bold 50px system-ui", "#edc8ff");
  line("SIEM search · Timelines · Source verification · Investigation hand-off", 679, "27px system-ui", "#d9d4ed");
  line(`${TOTAL} challenges completed · ${new Date().toLocaleDateString(undefined, { dateStyle: "long" })}`, 812, "28px system-ui", "#d9d4ed");
  download(canvas.toDataURL("image/png"), "Case-Relay-Certificate.png");
});

updateMotion();
openCase(0, 0, false);
