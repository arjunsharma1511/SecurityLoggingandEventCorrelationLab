"use strict";

const $ = id => document.getElementById(id);
const key = "north-quay-midnight-edition-v1";
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const record = id => records.find(item => item.id === id);
function fresh() { return { passed:0, current:0, drafts:{}, report:"", paused:reduced.matches }; }
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(key));
    if (s && Number.isInteger(s.passed) && s.passed >= 0 && s.passed <= stations.length &&
        Number.isInteger(s.current) && s.current >= 0 && s.current < stations.length &&
        s.current <= s.passed && s.drafts && typeof s.drafts === "object") return s;
  } catch { /* Browser storage may be unavailable. */ }
  return fresh();
}
const state = load();
let sequenceVersion = 0;
function save() {
  try { localStorage.setItem(key, JSON.stringify(state)); }
  catch { $("meter").title = "Storage unavailable. Progress is held in this tab."; }
}
function draft() { return state.drafts[state.current] ||= {}; }
function put(name, value) { draft()[name] = value; save(); }
function picks(name) { return draft()[name] || []; }
function draw(label, field, choices) {
  return '<label class="control"><span>'+esc(label)+'</span><select data-field="'+field+'"><option value="">Choose…</option>'+
    choices.map((choice,i) => '<option value="'+i+'" '+(String(draft()[field])===String(i)?"selected":"")+'>'+esc(choice)+'</option>').join("")+'</select></label>';
}
function group(list, prefix) { return list.map(([label, choices], i) => draw(label,prefix+i,choices)).join(""); }
function slip(id) {
  const r = record(id);
  return '<details class="slip" data-slip="'+r.id+'"><summary><code>'+r.id+'</code> '+esc(r.title)+'</summary><p>'+esc(r.source)+' · received '+r.received+' UTC</p><pre>'+esc(r.raw)+'</pre></details>';
}
function action(id,label,kind="light") { return '<button class="'+kind+'" data-action="'+id+'">'+esc(label)+'</button>'; }
function mix(...ids) { return '<div class="slips">'+ids.map(slip).join("")+'</div>'; }
function nav() {
  $("meter").textContent = state.passed+" / 8 stations signed";
  $("nav").innerHTML = stations.map((s,i) => '<button data-go="'+i+'" '+(i>state.passed?"disabled":"")+' '+(i===state.current?'aria-current="step"':"")+'><b>'+String(i+1).padStart(2,"0")+'</b><span>'+esc(s.name)+'</span><small>'+(i<state.passed?"Signed":i>state.passed?"Locked":"Open")+'</small></button>').join("");
  $("start").textContent = state.passed === 8 ? "View signed edition" : state.passed || Object.keys(state.drafts[0]||{}).length ? "Resume shift" : "Open shift file";
  $("reward").hidden = state.passed !== 8;
}
function setMotion() {
  document.documentElement.classList.toggle("paused",!!state.paused);
  $("motion").textContent = state.paused ? "Enable motion" : "Pause motion";
  $("motion").setAttribute("aria-pressed",String(!!state.paused));
}
function dispatch() {
  return mix("HELP","ALERT","QUEUE")+group(forms.dispatch,"d")+'<div class="toolbox">'+action("seal",draft().sealed?"Snapshot sealed":"Seal original records")+
    (draft().sealed?action("originals","Download sealed JSON"):"")+'</div>';
}
function sorting() {
  const choices = [2,0,4,1,3].map(i=>forms.routes[i][1]);
  return '<div class="sorting">'+forms.routes.map(([id],i)=>'<div>'+slip(id)+draw("Route "+id+" to its question","route"+i,choices)+
    (choices[draft()["route"+i]]?'<p class="tray">Filed for review · '+esc(choices[draft()["route"+i]])+'</p>':"")+'</div>').join("")+'</div>';
}
const sequence = ["AUTH","VPN","FILE","RELAY"];
const arrivalOrder = [...sequence].sort((a,b)=>record(a).received.localeCompare(record(b).received));
function shownTime(id) {
  if (id === "VPN") {
    if (draft().offset == null || draft().offset === "") return "Convert gateway clock";
    const minutes = 335 - [0,300,330,360][Number(draft().offset)];
    return new Date(Date.UTC(2026,10,18,0,minutes)).toISOString().slice(11,19)+" UTC";
  }
  return {AUTH:"00:02:10 UTC",FILE:"00:06:30 UTC",RELAY:"00:09:40 UTC"}[id];
}
function clock() {
  return mix("CLOCK","VPN")+draw("Offset to subtract from gateway time 05:35","offset",["0 hours","5 hours","5 hours 30 minutes","6 hours"])+
    '<p class="readout" id="utc">Converted gateway time · '+shownTime("VPN")+'</p>'+
    '<div class="reel" aria-label="Arrival order">'+arrivalOrder.map(id=>'<span data-arrival="'+id+'"><b>'+id+'</b><small>'+record(id).received+'</small></span>').join("")+'</div>'+
    action("replay","Play arrival reel")+'<p id="replay-caption" class="fine" aria-live="polite">Collector arrival times in UTC. Playback compresses the wait.</p>'+
    '<h3>Assemble the event-time reel</h3><p>Click the earliest source event first. Each click adds a strip to your cut.</p><div class="toolbox">'+
    ["RELAY","FILE","AUTH","VPN"].map(id=>'<button data-strip="'+id+'" '+(picks("order").includes(id)?"disabled":"")+'>'+id+' · '+shownTime(id)+'</button>').join("")+'</div>'+
    '<ol class="cut">'+picks("order").map(id=>'<li><strong>'+id+'</strong><small>'+shownTime(id)+'</small></li>').join("")+'</ol>'+action("undo","Undo last strip")+action("clear-reel","Clear reel");
}
function threadBoard() {
  const comparisons=[
    ["IP matches, but AUTH names Mina and GUEST names Eli.","Account and public IP match between AUTH and VPN.","PRESS identifies the spooler; it supplies no matching account."],
    ["M-42 identifies the VPN session. FILE records an address instead.","This is the public side of the tunnel. FILE observed the internal side.","VPN assigned 10.4.9.27. FILE observed client 10.4.9.27."],
    ["FILE and RELAY record the same client within three minutes and ten seconds.","The spooler has a different internal address."],
    ["Two different accounts appear among the candidate originals.","The IP grouping includes two accounts. The device and assigned address help distinguish them."]
  ];
  return mix("AUTH","GUEST","VPN","FILE","RELAY","ALERT")+'<div class="threads">'+forms.links.map(([id,prompt,choices],i)=>
    '<div class="thread"><strong>'+id+'</strong><i aria-hidden="true"></i>'+draw(prompt,"link"+i,choices)+
    (comparisons[i][draft()["link"+i]]?'<p class="comparison">'+comparisons[i][draft()["link"+i]]+'</p>':"")+'</div>').join("")+'</div>';
}
const rules = ["Match approved source","Match approved destination","Inside approved UTC window"];
function model() {
  const flags = picks("rules");
  const evaluated = draft().tested === flags.join("|");
  return mix("JOB","PRESS","RELAY")+'<fieldset><legend>Ticket conditions to enforce together</legend>'+rules.map((label,i)=>
    '<label class="check"><input type="checkbox" data-rule="'+i+'" '+(flags.includes(i)?"checked":"")+'>'+label+'</label>').join("")+'</fieldset>'+
    action("test","Run ticket model","ink")+'<div class="test-sheet"><table><caption>Two observed transfers and three fictional test inputs</caption><thead><tr><th>Flow</th><th>Sender</th><th>Destination</th><th>UTC</th><th>Model result</th></tr></thead><tbody>'+
    flows.map(([id,ip,dest,time],i)=>{
      const checks = [ip==="10.4.8.12",dest==="press.example",time>="00:05:00" && time<="00:15:00"];
      const passes = flags.every(n=>checks[n]);
      return '<tr><th>'+id+'</th><td>'+ip+'</td><td>'+dest+'</td><td>'+time+'</td><td class="'+(evaluated?(passes?"allowed":"reviewed"):"")+'" style="--n:'+i+'">'+(evaluated?(passes?"Fits model":"Review"):"Awaiting run")+'</td></tr>';
    }).join("")+'</tbody></table></div>'+draw("Which observed flow needs review under PR-88?","transfer",["PRESS","RELAY","Both fit PR-88"]);
}
const citations = ["JOB","VPN","FILE","GAP","PRESS","RELAY"];
function editor() {
  return mix(...citations)+'<div class="galleys">'+forms.edits.map((e,i)=>{
    const current = e.choices[draft()["edit"+i]];
    return '<section><p class="kicker">Draft line '+(i+1)+'</p><p class="draft-line '+(current?"struck":"")+'">'+e.claim+'</p>'+
      (current?'<p class="insert">'+esc(current)+'</p>':"")+draw("Replacement wording","edit"+i,e.choices)+draw("Cite the verifying record","cite"+i,citations)+'</section>';
  }).join("")+'</div>';
}
function enquiries() {
  return '<div class="mail">'+forms.enquiries.map(([owner,ask,reply],i)=>'<article><h3>'+owner+'</h3><p>'+ask+'</p>'+
    (picks("opened").includes(i)?'<blockquote><b>Reply received</b><br>'+esc(reply)+'</blockquote>':'<button data-letter="'+i+'">Send simulated enquiry</button>')+'</article>').join("")+'</div>'+
    draw("What did the approval enquiry establish?","owner",["PR-88 covers both transfers.","The register covers the spooler delivery only.","The ticket covers Mina’s laptop if the size is smaller."])+
    draw("Which uncertainty remains after the endpoint reply?","gap",["Whether any connection was recorded","Which account the VPN logged","The sending process and transferred content"]);
}
const reportIds = ["HELP","EDGE","VPN","FILE","PRESS","GAP","RELAY"];
function finalDesk() {
  return '<p>Use the source archive or unfold the records here. Cite the four originals that establish Mina’s VPN session, file operation, external transfer and endpoint visibility gap.</p>'+mix(...reportIds)+
    '<fieldset><legend>Citations for the incident lead</legend>'+reportIds.map(id=>'<label class="check inline"><input type="checkbox" data-ref="'+id+'" '+(picks("refs").includes(id)?"checked":"")+'>'+id+'</label>').join("")+'</fieldset>'+
    group(forms.handoff,"final")+'<label class="control"><span>In your own words, what should the next analyst check and why? Write at least eight words.</span><textarea id="note" maxlength="1800" rows="3">'+esc(draft().note)+'</textarea></label>'+
    action("proof","Preview hand-off")+'<pre id="proof" '+(draft().proof?"":"hidden")+'>'+esc(reportText())+'</pre>';
}
function reportText() {
  return ["NORTH QUAY PRESS | MORNING HAND-OFF","18 November 2026 | 00:00–00:15 UTC",
    "Scope: Mina, DESIGN-07, VPN M-42 and 10.4.9.27.","Cited sources: "+picks("refs").join(", "),
    ...forms.handoff.map(([label,choices],i)=>label+": "+(choices[draft()["final"+i]]||"[choose wording]")),
    "Analyst follow-up: "+(draft().note||"[add your note]")].join("\n\n");
}
const tools = [dispatch,sorting,clock,threadBoard,model,editor,enquiries,finalDesk];
function render(focus=false) {
  sequenceVersion++;
  const i=state.current,s=stations[i];
  $("station").innerHTML='<header class="station-head"><p class="kicker">'+s.tool+' / '+String(i+1).padStart(2,"0")+' of 08</p><h2>'+s.name+'</h2><p>'+s.goal+'</p></header>'+
    '<section class="lesson"><h3>At your desk</h3><p>'+s.lesson+'</p><details><summary>Worked example</summary><p>'+s.example+'</p></details><details><summary>Field guide for beginners</summary><p>An emitter is the system that created the record. A client is the device using a service. A VPN assigns a temporary internal address to a connected device. MFA means multi-factor authentication. Z means UTC. In these proxy records, bytes_sent counts data leaving the client. A mebibyte (MiB) is 1,048,576 bytes. EDR is the endpoint sensor that reports activity on a device.</p></details></section>'+
    '<section class="assignment"><h3>Your assignment</h3><p>'+s.action+'</p></section><div id="instrument">'+tools[i]()+'</div>'+
    '<section class="practice" id="practice"><h3>Two practice clippings</h3><p>Try the same skill on these separate examples. Keep their evidence out of the overnight case report.</p>'+
    clippings[i].map(([title,raw,prompt,,hint],n)=>'<article><h4>'+esc(title)+'</h4><pre>'+esc(raw)+'</pre><label class="control"><span>'+esc(prompt)+'</span><input data-clipping="'+n+'" value="'+esc(draft()["clip"+n])+'" maxlength="80" autocomplete="off"></label><details><summary>Clipping hint</summary><p>'+esc(hint)+'</p></details></article>').join("")+'</section>'+
    '<div class="submit"><details><summary>Need a hint?</summary><p>'+s.hint+'</p></details><p id="feedback" role="status"></p>'+
    action("grade",i===7?"Sign the hand-off":"Check station","ink")+' <button id="next" '+(i>=state.passed?"disabled":"")+'>'+ (i===7?"View signed edition":"Next station")+'</button></div>';
  nav();
  if (focus) $("station").focus();
}
function refreshTool() {
  sequenceVersion++;
  const openSlips=[...$("instrument").querySelectorAll("details[open][data-slip]")].map(el=>el.dataset.slip);
  const old=document.activeElement;
  const selector=old?.dataset.field?'[data-field="'+old.dataset.field+'"]':old?.dataset.rule?'[data-rule="'+old.dataset.rule+'"]':null;
  $("instrument").innerHTML=tools[state.current]();
  for(const id of openSlips){const slip=$("instrument").querySelector('[data-slip="'+id+'"]');if(slip)slip.open=true;}
  if(selector) $("instrument").querySelector(selector)?.focus({preventScroll:true});
}
function goto(i) { state.current=i;save();render(true); }
function fail(message) { $("feedback").className="retry";$("feedback").textContent=message; }
function checkGroup(items,prefix) {
  const bad=items.findIndex((item,i)=>String(draft()[prefix+i])!==String(item[2]));
  return bad<0?"":"Review “"+items[bad][0]+"”. Use the source slip or worked example above.";
}
function validate() {
  const d=draft();
  switch(state.current) {
    case 0: return checkGroup(forms.dispatch,"d") || (!d.sealed?"Seal the original records before moving on.":"");
    case 1: {
      const bad=[1,3,0,4,2].findIndex((v,i)=>String(d["route"+i])!==String(v));
      return bad<0?"":"Reopen "+forms.routes[bad][0]+". Read its action or result and choose the question that field directly answers.";
    }
    case 2:
      if(d.offset!=="2") return "The source offset is +05:30. Subtract the full offset, including minutes.";
      if(!d.replayed) return "Play the arrival reel once and compare its first record with the earliest source event.";
      return picks("order").join()===sequence.join()?"":"Compare the event times printed on your strips. Undo or clear your reel to fix the order.";
    case 3: {
      const bad=forms.links.findIndex((row,i)=>String(d["link"+i])!==String(row[3]));
      return bad<0?"":"Recheck the "+forms.links[bad][0]+" link. "+forms.links[bad][4];
    }
    case 4:
      if(!d.triedBroad) return "Run a trial with fewer than three conditions. Find an extra flow that passes.";
      if(picks("rules").length!==3 || d.tested!==picks("rules").join("|")) return "Compare all five outcomes with JOB. Run the model with every ticket condition enforced.";
      return d.transfer==="1"?"":"Which actual sender and destination fall outside the ticket?";
    case 5: {
      const bad=forms.edits.findIndex((e,i)=>String(d["edit"+i])!==String(e.answer)||citations[d["cite"+i]]!==e.source);
      return bad<0?"":"Check the wording and citation for draft line "+(bad+1)+". Match the specific field to the edited statement.";
    }
    case 6:
      if(![0,1].every(i=>picks("opened").includes(i))) return "Read both the change owner’s and the endpoint custodian’s replies.";
      return d.owner==="1" && d.gap==="2"?"":"The change register covers one route. The custodian describes a limit on process and content evidence.";
    case 7:
      if(picks("refs").slice().sort().join()!==["FILE","GAP","RELAY","VPN"].join()) return "Cite one original each for the session, file read, laptop transfer and coverage gap.";
      return checkGroup(forms.handoff,"final") || ((d.note||"").trim().split(/\s+/).length<8?"Write a follow-up of at least eight words. Your instructor reviews its reasoning.":"") || (!d.proof?"Preview your completed hand-off before signing.":"");
  }
}
const debriefs=[
  "Scope recorded and originals sealed. Press Operations can examine the queue delay while you review the security lead.",
  "You routed five observations to the questions their source systems can answer.",
  "The identity failures came first. Buffering made AUTH arrive after the outbound flow.",
  "Mina’s account and assigned address connect the records. The shared public IP also includes Eli.",
  "Your tested rule admits only PRESS. RELAY is smaller, but its client and destination fall outside PR-88.",
  "The corrected briefing reflects the original direction, VPN result and coverage gap.",
  "You have a scoped approval check and a documented evidence gap for the incoming analyst.",
  "Hand-off signed. Your instructor can review the written follow-up in your exported report."
];
function grade() {
  const message=validate();
  if(message) return fail(message);
  const normalise=value=>String(value??"").trim().toLowerCase().replace(/\s+/g," ");
  const bad=clippings[state.current].findIndex((clip,i)=>!clip[3].some(answer=>normalise(answer)===normalise(draft()["clip"+i])));
  if(bad>=0){fail("Your main assignment checks out. Revisit the practice clipping “"+clippings[state.current][bad][0]+"” and use its hint if needed.");document.querySelector('[data-clipping="'+bad+'"]').focus();return;}
  if(state.current===7) state.report=reportText();
  state.passed=Math.max(state.passed,state.current+1);
  save();nav();
  $("feedback").className="success";$("feedback").textContent=debriefs[state.current];
  $("next").disabled=false;
}
async function replay(button) {
  const version=++sequenceVersion;
  button.disabled=true;
  for(const id of arrivalOrder) {
    if(version!==sequenceVersion) return;
    document.querySelectorAll("[data-arrival]").forEach(el=>el.classList.toggle("active",el.dataset.arrival===id));
    $("replay-caption").textContent=id+" arrived at "+record(id).received+" UTC. Compare its source time on the strip below.";
    if(!state.paused) await new Promise(resolve=>setTimeout(resolve,560));
  }
  if(version===sequenceVersion) {
    put("replayed",true);button.disabled=false;
    $("replay-caption").textContent="Arrival order: "+arrivalOrder.join(" · ")+". AUTH arrived last after buffering.";
  }
}
function download(value,type,filename) {
  const a=document.createElement("a");
  const url=URL.createObjectURL(new Blob([value],{type}));a.href=url;a.download=filename;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1200);
}
function originalCopy() {return JSON.stringify({edition:"North Quay Press",date:"2026-11-18",receiptTimezone:"UTC",records},null,2);}
function toggle(field,value,on) { const values=new Set(picks(field));if(on) values.add(value);else values.delete(value);put(field,[...values]); }
function updateProof() { if(state.current===7){put("proof",false);$("proof").hidden=true;} }
$("station").addEventListener("change",e=>{
  const n=e.target;
  if(n.dataset.field) {put(n.dataset.field,n.value);updateProof();if([1,2,3,5].includes(state.current))refreshTool();}
  if(n.dataset.rule!==undefined){toggle("rules",Number(n.dataset.rule),n.checked);put("tested",null);refreshTool();}
  if(n.dataset.ref){toggle("refs",n.dataset.ref,n.checked);updateProof();}
  $("feedback").textContent="";
});
$("station").addEventListener("input",e=>{
  if(e.target.id==="note"){put("note",e.target.value);updateProof();}
  if(e.target.dataset.clipping!==undefined)put("clip"+e.target.dataset.clipping,e.target.value);
});
$("station").addEventListener("click",e=>{
  const b=e.target.closest("button");if(!b)return;
  if(b.id==="next"){if(state.current===7) $("name").focus();else goto(state.current+1);return;}
  if(b.dataset.strip){put("order",[...picks("order"),b.dataset.strip]);refreshTool();return;}
  if(b.dataset.letter!==undefined){toggle("opened",Number(b.dataset.letter),true);refreshTool();return;}
  switch(b.dataset.action){
    case "grade":grade();break;
    case "seal":put("sealed",true);refreshTool();break;
    case "originals":download(originalCopy(),"application/json","North-Quay-originals.json");break;
    case "replay":replay(b);break;
    case "undo":put("order",picks("order").slice(0,-1));refreshTool();break;
    case "clear-reel":put("order",[]);refreshTool();break;
    case "test":if(picks("rules").length<3)put("triedBroad",true);put("tested",picks("rules").join("|"));refreshTool();break;
    case "proof":put("proof",true);$("proof").textContent=reportText();$("proof").hidden=false;break;
  }
});
$("nav").addEventListener("click",e=>{const b=e.target.closest("[data-go]");if(b&&!b.disabled)goto(Number(b.dataset.go));});
$("start").onclick=()=>state.passed===8?$("name").focus():goto(Math.min(state.passed,7));
$("motion").onclick=()=>{state.paused=!state.paused;setMotion();save();};
reduced.addEventListener("change",e=>{state.paused=e.matches;setMotion();save();});
function searchArchive() {
  const term=$("query").value.trim().toLowerCase();
  const results=records.filter(r=>(!$("source").value||r.source===$("source").value)&&[r.id,r.source,r.title,r.raw,r.received].join(" ").toLowerCase().includes(term));
  $("records").innerHTML=results.map(r=>slip(r.id)).join("");
  $("result-count").textContent=results.length+" of "+records.length+" records match.";
}
$("source").innerHTML='<option value="">All sources</option>'+[...new Set(records.map(r=>r.source))].map(s=>'<option>'+esc(s)+'</option>').join("");
$("cabinet-btn").onclick=()=>{searchArchive();$("cabinet").showModal();$("query").focus();};
$("query").oninput=searchArchive;$("source").onchange=searchArchive;$("close").onclick=()=>$("cabinet").close();
$("report").onclick=()=>{if(state.report)download(state.report,"text/plain;charset=utf-8","North-Quay-hand-off.txt");};
$("certificate").onclick=()=>{
  if(state.passed!==8)return;
  const name=$("name").value.trim();
  if(!name){$("reward-status").textContent="Enter the name you want printed on your certificate.";$("name").focus();return;}
  const canvas=document.createElement("canvas");canvas.width=1500;canvas.height=940;
  const ctx=canvas.getContext("2d");ctx.fillStyle="#f5f2e8";ctx.fillRect(0,0,1500,940);
  ctx.strokeStyle="#242c26";ctx.lineWidth=4;ctx.strokeRect(42,42,1416,856);
  ctx.fillStyle="#242c26";ctx.textAlign="center";
  function line(s,y,font){ctx.font=font;ctx.fillText(s,750,y,1250);}
  line("NORTH QUAY PRESS   /   CASE RELAY",155,"bold 30px monospace");
  line("Certificate of Completion",300,"bold 75px Georgia");
  line(name,460,"italic 80px Georgia");
  line("The Midnight Edition",575,"bold 52px Georgia");
  line("Security logging, event correlation and SOC investigation",650,"32px system-ui");
  line("Eight stations completed   •   "+new Date().toLocaleDateString(),790,"26px monospace");
  const a=document.createElement("a");a.download="Midnight-Edition-Certificate.png";a.href=canvas.toDataURL("image/png");a.click();
  $("reward-status").textContent="Certificate download started.";
};
setMotion();render();
