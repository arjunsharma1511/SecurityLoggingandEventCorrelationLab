"use strict";
const $=id=>document.getElementById(id);
const safe=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const key="signal-harbour-night-watch-v1";
const preference=matchMedia("(prefers-reduced-motion: reduce)");
function fresh(){return {done:0,pos:0,entries:{},tries:{},checks:{},motion:!preference.matches,tests:{},beat:{}};}
function readState(){try{const v=JSON.parse(localStorage.getItem(key));if(v&&Number.isInteger(v.done)&&v.done>=0&&v.done<=50&&Number.isInteger(v.pos)&&v.pos>=0&&v.pos<=v.done&&v.pos<50)return {...fresh(),...v};}catch{}return fresh();}
const s=readState(), coast=startHarbour($("coast"));
const pages=[];
rounds.forEach((r,i)=>{for(let j=0;j<3;j++)pages.push({i,j});if(i%3===2)pages.push({i,j:3});});
let inDesk=false,beat=0,playing=false,interval,dispose=()=>{},storageOK=true;
function save(){try{localStorage.setItem(key,JSON.stringify(s));}catch{storageOK=false;$("sr").textContent="Browser storage is unavailable. Keep this tab open during your shift.";}}
function get(){const p=pages[s.pos];return {...p,r:rounds[p.i],ch:Math.floor(p.i/3)};}
function motion(){document.documentElement.classList.toggle("still",!s.motion);$("motion").textContent=s.motion?"Pause motion":"Enable motion";$("motion").setAttribute("aria-pressed",String(!s.motion));coast.motion(!s.motion);}
function stop(){clearInterval(interval);playing=false;dispose();dispose=()=>{};}
function route(){
 $("count").textContent=Math.floor(s.done/10)+" of 5 chapters signed";
 $("route").innerHTML=chapters.map((c,i)=>{const opened=i*10<=s.done;return '<button class="chapter" data-ch="'+i+'" '+(!opened?'disabled':'')+'><span class="stamp" aria-hidden="true">'+["▤","◷","⑂","≋","☼"][i]+'</span><span><small>Chapter '+(i+1)+'</small><strong>'+safe(c[0])+'</strong><span>'+safe(c[1])+'</span></span><b>'+(s.done>=(i+1)*10?"Signed":opened?"Open":"Locked")+'</b></button>';}).join("");
 $("begin").textContent=s.done===50?"View my completed shift":s.done||Object.keys(s.tries).length?"Resume my shift":"Start my shift";
}
function home(focus=false){
 stop();inDesk=false;$("landing").hidden=false;$("desk").hidden=true;$("reward").hidden=s.done!==50;route();coast.morning(s.done===50);
 if(focus){$("home").focus({preventScroll:true});window.scrollTo(0,0);}
}
function desk(pos,focus=true){
 stop();s.pos=Math.max(0,Math.min(pos,s.done,49));save();inDesk=true;$("landing").hidden=true;$("desk").hidden=false;$("reward").hidden=true;
 const {i,j}=get();beat=s.beat[i]??0;render();if(j!==3)showFrame(s.motion&&j===0,true);
 if(focus){$("task-title").focus({preventScroll:true});window.scrollTo(0,0);}
}
function slip(id){const [n,src,time,meaning,raw]=slips[id];return '<details class="slip"><summary><span class="slip-id">'+n+'</span><strong>'+safe(src)+'</strong><time>'+safe(time)+'</time></summary><p>'+safe(meaning)+'</p><div class="original"><small>Original record</small><code>'+safe(raw)+'</code></div></details>';}
function exercise(task,j){
 const v=s.tries[s.pos]||[],done=s.pos<s.done;
 if(task.kind==="number")return '<label class="number"><span>Your answer in '+safe(task.unit)+'</span><input id="number" type="number" min="0" step="1" inputmode="numeric" value="'+safe(v[0])+'" '+(done?"disabled":"")+'></label>';
 return '<div class="options">'+task.options.map((label,k)=>{const at=v.indexOf(k);return '<button data-opt="'+k+'" aria-pressed="'+(at>=0)+'" class="option '+(at>=0?"selected":"")+'" '+(done?'disabled':'')+'><i aria-hidden="true">'+(task.kind==="order"&&at>=0?at+1:at>=0?"✓":task.kind==="choose"?"○":"·")+'</i>'+safe(label)+'</button>';}).join("")+'</div>';
}
function fieldExercise(ch,done){
 const f=fieldChecks[ch],values=s.checks[ch]||[];
 return '<section class="field-case"><p class="eyebrow">Practice on fresh records</p><h4>'+safe(f.title)+'</h4><p>'+safe(f.intro)+'</p><div>'+f.rows.map(([id,src,text])=>'<details class="slip"><summary><span class="slip-id">'+id+'</span><strong>'+safe(src)+'</strong></summary><p>'+safe(text)+'</p></details>').join("")+'</div>'+f.fields.map(([prompt],n)=>'<label><span>'+safe(prompt)+'</span><input data-fieldcheck="'+n+'" maxlength="20" autocomplete="off" value="'+safe(values[n])+'" '+(done?"readonly":"")+'></label>').join("")+'<details class="hint"><summary>Help with these new slips</summary><p>'+safe(f.hint)+'</p></details></section>';
}
function trial(){
 const test=s.tests,mask=test.mask??1,ran=test.last===mask;
 const samples=[["Ferry desk to Chart House · 18:24",7],["Desk 7 to North Pier · 18:25",1],["Ferry desk to Chart House · 18:32 (what-if)",6]];
 return '<section class="trial"><h4>Try the permit checker</h4><p>First test time alone. Then switch on all three checks and compare the rows.</p><div class="switches">'+["Time","Sender","Recipient"].map((v,i)=>'<label><input data-mask="'+(1<<i)+'" type="checkbox" '+(mask&(1<<i)?"checked":"")+'>'+v+'</label>').join("")+'</div><button id="run-test">Test these checks</button><ul>'+samples.map(([name,bits])=>'<li>'+name+' <b>'+(ran?((bits&mask)===mask?"Fits":"Review"):"—")+'</b></li>').join("")+'</ul><small>Trials recorded · Time alone '+(test.broad?"✓":"—")+' / All three '+(test.full?"✓":"—")+'</small></section>';
}
function render(){
 const {i,j,r,ch}=get(),signed=s.pos<s.done,entry=j===3;
 $("position").textContent="Chapter "+(ch+1)+" / 5 · Scene "+(i+1)+" / 15";$("back").hidden=s.pos===0;
 const question=entry?"Can you apply this skill to a fresh set of slips?":r.tasks[j].q;
 const header='<div class="section-title"><p class="eyebrow">Chapter '+(ch+1)+' · '+safe(chapters[ch][0])+'</p><h2 id="task-title" tabindex="-1">'+safe(entry?chapters[ch][3]:r.name)+'</h2></div>';
 const view='<div class="screen"><div class="screen-top"><span class="lamp"></span> Harbour projector <span id="frame-count"></span></div><canvas id="film" role="img" aria-describedby="caption"></canvas><p id="caption"></p><div class="player"><button id="prev-frame" aria-label="Previous frame">‹</button><button id="play"></button><button id="next-frame" aria-label="Next frame">›</button><div id="frame-dots" aria-label="Scene frames"></div></div></div>';
 const evidence='<div class="evidence"><h3>Evidence slips</h3><p>Open a slip to see what that source recorded.</p>'+r.ids.map(slip).join("")+'<button class="archive-link" id="all-records">Search the full log desk</button></div>';
 const kind=entry?"Logbook entry":{choose:"Choose one",pair:"Pick two",order:"Put in order",number:"Read a number"}[r.tasks[j].kind];
 const instruction=entry?"Complete three short evidence checks. Then return to the night case and write a chapter note of at least eight words. Your instructor reviews the explanation.":{choose:"Select one answer.",pair:"Select exactly two answers. Click a choice again to remove it.",order:"Click each item from earliest to latest. Click a selected item to remove it and try again.",number:"Enter a whole number from the evidence."}[r.tasks[j].kind];
 const hint=entry?["Name the paper wait and the completed print job.","Use both the event time and the delivery time.","Compare the user and inside address on the two slips.","Compare sender, recipient and window on H4.","Start with “The records show…”. Then add “We still need…” and name the owner."][ch]:r.tasks[j].hint;
 const notes=entry?fieldExercise(ch,signed)+'<p class="return-note">Back to the night watch</p><p>'+safe(chapters[ch][4])+'</p><label class="entry"><span>My shift note</span><textarea id="note" maxlength="1200" rows="4" '+(signed?"readonly":"")+'>'+safe(s.entries[ch]||"")+'</textarea></label>':exercise(r.tasks[j],j);
 const noteEvidence=entry?["bell queue health","late file buffer","nia sol read","permit ferry night","nia read night blind owner"][ch].split(" ").map(slip).join(""):"";
 $("station").innerHTML=header+'<div class="workgrid"><div class="left">'+(entry?'<div class="note-art"><span class="book-mark" aria-hidden="true">≋</span><p class="eyebrow">Chapter logbook</p><h3>'+safe(chapters[ch][3])+'</h3></div><div class="evidence"><h3>Look back at the originals</h3>'+noteEvidence+'</div>':view+evidence)+'</div><article class="task"><div class="step-head"><span class="eyebrow">'+kind+'</span><span>'+(entry?"Chapter note":"Decision "+(j+1)+" of 3")+'</span></div><div class="segments">'+[0,1,2].map(n=>'<i class="'+(n<=j?"lit":"")+'"></i>').join("")+'</div><h3>'+safe(question)+'</h3><p class="directions">'+instruction+'</p>'+(i===10&&j===1?trial():"")+notes+'<details class="hint"><summary>Give me a hint</summary><p>'+safe(hint)+'</p></details><div id="feedback" role="status"></div><div class="actions"><button id="check" class="primary" '+(signed?'hidden':'')+'>'+(entry?"Save my entry":"Check my answer")+'</button><button id="next" class="primary" '+(signed?'':'hidden')+'>'+nextLabel()+'</button></div></article></div>';
 if(signed)successMessage();
}
function nextLabel(){return s.pos===49?"Finish my shift":get().j===2&&get().i%3===2?"Write chapter note":get().j>=2?"Next scene":"Next decision";}
function showFrame(auto=false,animate=true){
 const {i,r}=get();clearInterval(interval);dispose();playing=auto;beat=Math.max(0,Math.min(2,beat));s.beat[i]=beat;save();
 $("caption").textContent=r.beats[beat];$("film").setAttribute("aria-label",films[i][beat].join(" · "));$("frame-count").textContent="Frame "+(beat+1)+" / 3";
 $("frame-dots").innerHTML=[0,1,2].map(n=>'<button data-frame="'+n+'" aria-label="Show frame '+(n+1)+'" aria-pressed="'+(n===beat)+'"></button>').join("");
 $("play").textContent=playing?"Pause story":beat===2?"Replay story":"Play story";$("prev-frame").disabled=beat===0;$("next-frame").disabled=beat===2;
 dispose=makeProjector($("film"),i,beat,!s.motion||!animate);
 if(auto)interval=setTimeout(()=>{if(document.hidden){showFrame(false);return;}if(beat<2){beat++;showFrame(true);}else showFrame(false);},6500);
}
function msg(text,good=false){const e=$("feedback");e.className=good?"right":"retry";e.textContent=text;}
function successMessage(){const {j,r,ch}=get();msg(j===3?"Saved in your logbook. Your instructor can review this note.":r.tasks[j].why,true);}
function check(){
 const {i,j,r,ch}=get();if(s.pos!==s.done)return;
 if(j===3){const wrong=fieldChecks[ch].fields.findIndex((field,n)=>String((s.checks[ch]||[])[n]||"").trim().toLowerCase()!==field[1].toLowerCase());if(wrong>=0){msg("Check the field “"+fieldChecks[ch].fields[wrong][0]+"”. "+fieldChecks[ch].hint);$("station").querySelector('[data-fieldcheck="'+wrong+'"]').focus();return;}if((s.entries[ch]||"").trim().split(/\s+/).filter(Boolean).length<8){msg("Add a sentence of at least eight words. Use a detail from the slips and explain what it tells you.");return;}}
 else{
 const q=r.tasks[j],a=s.tries[s.pos]||[];
 if(i===10&&j===1&&!(s.tests.broad&&s.tests.full)){msg("Use the permit checker twice. Run Time alone, then run Time, Sender and Recipient together.");return;}
 const sorted=v=>v.slice().sort((a,b)=>a-b).join(",");
 const ok=q.kind==="number"?a[0]!==undefined&&String(a[0]).trim()!==""&&Number(a[0])===q.answer[0]:q.kind==="pair"?sorted(a)===sorted(q.answer):a.join()===q.answer.join();
 if(!ok){msg((a.length===0?"Start with the evidence slips. ":"Take another look. ")+q.hint);return;}}
 s.done++;save();successMessage();$("check").hidden=true;$("next").hidden=false;
 $("station").querySelectorAll(".option,#number").forEach(el=>el.disabled=true);if($("note")){$("note").readOnly=true;document.querySelectorAll("[data-fieldcheck]").forEach(el=>el.readOnly=true);}
 $("next").focus({preventScroll:true});
}
function selectOpt(n){
 if(s.pos<s.done)return;const q=get().r.tasks[get().j],a=s.tries[s.pos]||[];
 if(q.kind==="choose")s.tries[s.pos]=[n];
 else if(a.includes(n))s.tries[s.pos]=a.filter(v=>v!==n);
 else if(q.kind==="pair"&&a.length===2){msg("Two choices are selected. Click one to remove it before adding another.");return;}
 else s.tries[s.pos]=[...a,n];save();
 document.querySelectorAll("[data-opt]").forEach(el=>{const at=s.tries[s.pos].indexOf(Number(el.dataset.opt));el.classList.toggle("selected",at>=0);el.setAttribute("aria-pressed",String(at>=0));el.querySelector("i").textContent=at>=0?(q.kind==="order"?at+1:"✓"):(q.kind==="choose"?"○":"·");});$("feedback").textContent="";
}
function download(blob,name){const a=document.createElement("a"),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
function report(){let out=["SIGNAL HARBOUR | HARBOUR AFTER DARK","Completed night watch | fictional training records"];chapters.forEach((c,ch)=>{out.push("\nCHAPTER "+(ch+1)+" | "+c[0],"My note: "+s.entries[ch],"Practice case: "+fieldChecks[ch].title);fieldChecks[ch].fields.forEach(([prompt],n)=>out.push("  "+prompt+" — "+s.checks[ch][n]));rounds.slice(ch*3,ch*3+3).forEach(r=>{out.push(r.name+" · source slips "+r.ids.map(id=>slips[id][0]).join(", "));r.tasks.forEach(q=>out.push("  "+q.why));});});return out.join("\n");}
function completed(){home();$("reward").hidden=false;$("learner").focus();$("reward").scrollIntoView({block:"center"});}
function archive(){
 const content=$("journal-content");
 content.innerHTML='<p>The log desk brings records from different systems into one place. In security work, a tool that does this and helps find patterns is called a SIEM.</p><label class="entry"><span>Search the 19 original slips</span><input id="find-slip" type="search" placeholder="Try Desk-7, 18:25 or a slip number"></label><p id="matches" role="status"></p><div id="found"></div><div class="actions"><button id="save-sources">Save a copy of the sources</button><button id="show-notes">Read my notes</button></div>';
 $("journal").querySelector("h2").textContent="The log desk";
 function search(){const term=$("find-slip").value.trim().toLowerCase();const keys=Object.keys(slips).filter(k=>slips[k].join(" ").toLowerCase().includes(term));$("matches").textContent=keys.length+" matching slips";$("found").innerHTML=keys.map(slip).join("");}
 $("find-slip").oninput=search;$("save-sources").onclick=()=>download(new Blob([JSON.stringify(Object.values(slips).map(([id,source,time,reading,original])=>({id,source,time,reading,original})),null,2)],{type:"application/json"}),"Harbour-Original-Slips.json");$("show-notes").onclick=journal;search();if(!$("journal").open)$("journal").showModal();$("find-slip").focus();
}
function journal(){
 let legacy="";try {const old=JSON.parse(localStorage.getItem("north-quay-midnight-edition-v1"));if(old?.passed===8&&old.report)legacy='<details><summary>Previous Midnight Edition hand-off</summary><pre>'+safe(old.report)+'</pre></details>';}catch{}
 $("journal").querySelector("h2").textContent="My logbook";$("journal-content").innerHTML='<button class="archive-link" id="open-archive">Search the full log desk</button><p>'+s.done+' of 50 activities signed. '+(storageOK?"Your work saves in this browser.":"Storage is unavailable. Keep this tab open.")+'</p>'+chapters.map((c,i)=>'<section><small>Chapter '+(i+1)+'</small><h3>'+safe(c[3])+'</h3><p>'+safe(s.entries[i]||(s.done<i*10+10?"Your chapter note appears here when you write it.":""))+'</p></section>').join("")+legacy;
 $("open-archive").onclick=archive;if(!$("journal").open)$("journal").showModal();
}
$("station").addEventListener("click",e=>{
 const b=e.target.closest("button");if(!b)return;
 if(b.dataset.opt!==undefined){selectOpt(Number(b.dataset.opt));return;}
 if(b.dataset.frame!==undefined){beat=Number(b.dataset.frame);showFrame(false);return;}
 switch(b.id){case "all-records":archive();break;case "check":check();break;case "next":if(s.pos===49)completed();else desk(s.pos+1);break;
 case "play":if(playing)showFrame(false,false);else{if(beat===2)beat=0;showFrame(true);}break;
 case "prev-frame":beat--;showFrame(false);break;case "next-frame":beat++;showFrame(false);break;
 case "run-test":{const mask=s.tests.mask??1;s.tests.last=mask;if(mask===1)s.tests.broad=true;if(mask===7)s.tests.full=true;save();updateTrial();break;}}
});
function updateTrial(){const node=$("station").querySelector(".trial");if(node){const active=document.activeElement;const selector=active?.dataset.mask?'[data-mask="'+active.dataset.mask+'"]':"#run-test";node.outerHTML=trial();document.querySelector(selector)?.focus({preventScroll:true});}}
$("station").addEventListener("change",e=>{if(e.target.dataset.mask){let mask=s.tests.mask??1;mask^=Number(e.target.dataset.mask);s.tests.mask=mask;s.tests.last=null;save();updateTrial();}});
$("station").addEventListener("input",e=>{if(s.pos<s.done)return;if(e.target.dataset.fieldcheck!==undefined){(s.checks[get().ch]||=[])[Number(e.target.dataset.fieldcheck)]=e.target.value;}if(e.target.id==="number")s.tries[s.pos]=[e.target.value];if(e.target.id==="note")s.entries[get().ch]=e.target.value;save();});
$("route").onclick=e=>{const b=e.target.closest("button[data-ch]");if(!b||b.disabled)return;const start=Number(b.dataset.ch)*10;desk(s.done>=start+10?start:Math.min(s.done,49));};
$("home").onclick=$("chart-btn").onclick=()=>home(true);$("back").onclick=()=>desk(s.pos-1);
$("begin").onclick=()=>s.done===50?completed():desk(s.done);
$("studies").onclick=journal;$("close-journal").onclick=()=>$("journal").close();
function setMotion(v){s.motion=v;motion();save();if(inDesk&&get().j!==3)showFrame(v);}
$("motion").onclick=()=>setMotion(!s.motion);preference.addEventListener("change",e=>setMotion(!e.matches));
$("export").onclick=()=>{if(s.done===50)download(new Blob([report()],{type:"text/plain;charset=utf-8"}),"Signal-Harbour-Shift-Report.txt");};
$("cert").onclick=()=>{if(s.done!==50)return;const name=$("learner").value.trim();if(!name){$("download-status").textContent="Enter your name first.";$("learner").focus();return;}
 const cv=document.createElement("canvas");cv.width=1500;cv.height=1000;const c=cv.getContext("2d");c.fillStyle="#111f34";c.fillRect(0,0,1500,1000);c.drawImage($("coast"),62,65,1376,410);c.fillStyle="#fff2cd";c.textAlign="center";
 const line=(txt,y,font)=>{c.font=font;c.fillText(txt,750,y,1250);};line("SIGNAL HARBOUR   /   NIGHT WATCH",540,"bold 24px monospace");line("Certificate of Completion",628,"bold 68px Georgia");c.fillStyle="#a7eed0";line(name,723,"italic 72px Georgia");c.fillStyle="#eff3f0";line("Harbour After Dark",795,"bold 40px Georgia");line("Security logging, event correlation and evidence-based handover",853,"28px sans-serif");line("15 scenes completed   ·   "+new Date().toLocaleDateString(),920,"23px monospace");cv.toBlob(b=>{if(b){download(b,"Harbour-After-Dark-Certificate.png");$("download-status").textContent="Your certificate download has started.";}},"image/png");};
motion();home();
