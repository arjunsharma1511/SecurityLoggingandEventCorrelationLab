"use strict";
// Each frame shows the same observation as its spoken-style caption.
const films=[
 [["Visitor","Ticket desk","Delay reported"],["Paper tray","Printer","Waiting for paper"],["Printer","Job slip","P4 printed"]],
 [["Staff badge","East gate","Gate opens"],["Visitor","Ticket desk","Report received"],["Source slips","Log desk","Originals kept"]],
 [["P4","Printer","Wait · 2 min"],["P5","Printer","Wait · 0 min"],["Printer","Print team","Job results"]],
 [["Gate clock","Harbour clock","Local clock"],["Gate clock","Harbour clock","Subtract 1 hour"],["Badge works","Map read","2 minutes apart"]],
 [["Gate reader","Log desk","Connection lost"],["Map store","Log desk","Record arrives"],["Gate reader","Log desk","Queue delivered"]],
 [["Gate event","Map read","Choose a window"],["18:07 UTC","18:11 UTC","Both events inside"],["Gate event","Log desk","6 min delivery lag"]],
 [["Desk 7","Desk 2","One Wi-Fi entry"],["3 failures","2 sessions","Grouped by Wi-Fi"],["Nia","Sol","Two accounts"]],
 [["Remote access","Desk 7","Address assigned"],["Desk 7","Map store","10.8.0.7"],["Session 10","Record 13","Same user + address"]],
 [["Desk 7","Desk 2","One entry point"],["Nia","Sol","Different devices"],["Failures","Log desk","Operator unknown"]],
 [["Ferry desk","Chart House","Ticket H4"],["Ferry desk","Chart House","90 MB sent"],["Desk 7","North Pier","8 MB sent"]],
 [["Ferry desk","Chart House","Within time"],["Desk 7","North Pier","Outside route"],["Ferry desk","Chart House","Late test · 18:32"]],
 [["Desk 7","North Pier","8 MB sent"],["Desk 7","North Pier","1 MB back"],["Traffic desk","Log slip","Counts only"]],
 [["AI draft","Review desk","Unverified words"],["Traffic desk","Review desk","Sent · 8 MB"],["Map read","Transfer","Contents unknown"]],
 [["Ticket owner","Change book","Permit checked"],["Desk 7","Monitor","Program data missing"],["Analyst","Incident lead","Scoped enquiry"]],
 [["Remote access","Map store","Same client"],["Desk 7","North Pier","Contents unknown"],["Night watch","Morning watch","Report ready"]]
];
function makeProjector(canvas,scene,beat,paused){
 const c=canvas.getContext("2d"); canvas.width=480;canvas.height=187;
 const mode=rounds[scene].mode,labels=films[scene][beat];
 let t=0,prev=0,raf=0,visible=true,stopped=false;
 const rect=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);};
 function line(x,y,X,Y,col,width=2){c.strokeStyle=col;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(X,Y);c.stroke();}
 function circle(x,y,r,col){c.fillStyle=col;c.beginPath();c.arc(x,y,r,0,2*Math.PI);c.fill();}
 function word(s,x,y,size=13,col="#e6f5ee"){c.fillStyle=col;c.font="bold "+size+"px system-ui, sans-serif";c.textAlign="center";c.fillText(s,x,y,144);}
 const ink="#12283b",metal="#76a9ad",light="#f6d991",paper="#faecd1",blue="#bcb2fa",mint="#9aecd0";
 function sprite(kind,x,y){
  const R=(dx,dy,w,h,col)=>rect(x+dx,y+dy,w,h,col);
  if(kind==="printer"){
   R(-20,-13,40,25,metal);R(-15,-23,30,18,paper);R(-12,-19,18,2,metal);R(-16,0,32,5,ink);
   let drop=(beat===1&&scene===0)?0:Math.floor((Math.sin(t*2)+1)*3);R(-12,4,24,6+drop,paper);R(12,-8,4,3,mint);
  }else if(kind==="gate"){R(-22,-25,6,40,metal);R(15,-25,6,40,metal);R(-25,-26,49,5,light);for(let k=0;k<5;k++)R(-16+k*7,-11,3,22,metal);R(-14,-8,29,3,metal);
  }else if(kind==="paper"||kind==="book"){R(-15,-23,29,40,kind==="book"?blue:paper);R(-15,-23,4,40,kind==="book"?"#8274ac":"#ccbea2");for(let k=0;k<4;k++)R(-8,-14+k*6,15-(k%2)*5,2,"#526870");
  }else if(kind==="boat"){let bob=Math.round(Math.sin(t*2));R(-23,3+bob,48,5,light);R(-18,8+bob,38,5,"#df8975");R(-12,-8+bob,24,11,paper);R(-8,-6+bob,5,4,metal);R(0,-6+bob,5,4,metal);R(3,-22+bob,2,14,light);R(5,-21+bob,10,4,"#ef9586");
  }else if(kind==="hut"){R(-17,-8,34,24,metal);for(let k=0;k<5;k++)R(-20+k*4,-11-k*3,40-k*8,4,"#d48b84");R(-10,-4,7,6,light);R(4,0,7,16,ink);
  }else if(kind==="person"){R(-7,-21,15,14,"#efc69f");R(-8,-24,16,5,ink);R(-14,-4,28,20,blue);R(-3,-4,6,7,paper);
  }else if(kind==="store"){for(let k=0;k<3;k++){R(-17,-21+k*13,34,11,metal);R(-12,-17+k*13,5,2,mint);R(2,-17+k*13,10,2,ink);}
  }else{R(-21,-20,42,29,metal);R(-17,-16,34,21,ink);R(-12,-10,10,2,mint);R(-12,-5,18,2,blue);R(-4,9,8,4,metal);R(-14,13,28,3,paper);}
 }
 function icon(label){if(/printer|p4|p5|paper tray/i.test(label))return "printer";if(/gate|badge/i.test(label))return "gate";if(/ferry/i.test(label))return "boat";if(/pier|house/i.test(label))return "hut";if(/file|store|traffic|access/i.test(label))return "store";if(/visitor|owner|analyst|lead|nia|sol|watch|team/i.test(label))return "person";if(/slip|draft|record|ticket|report|book/i.test(label))return "paper";return "screen";}
 function clockFace(x,h,m){circle(x,76,30,metal);circle(x,76,26,ink);for(let k=0;k<12;k++){let a=k*Math.PI/6;rect(x+Math.sin(a)*21,76-Math.cos(a)*21,2,2,paper);}for(const [a,n,col] of [[(h+m/60)*Math.PI/6,13,light],[m*Math.PI/30,19,mint]])line(x,76,x+Math.sin(a)*n,76-Math.cos(a)*n,col,3);circle(x,76,3,paper);}
 function envelope(x,y,col){rect(x-8,y-5,16,11,col);line(x-7,y-4,x,y+1,ink,1);line(x,y+1,x+7,y-4,ink,1);}
 function draw(){
  const bg=c.createLinearGradient(0,0,480,187);bg.addColorStop(0,"#152a42");bg.addColorStop(1,scene>11?"#344259":"#244550");c.fillStyle=bg;c.fillRect(0,0,480,187);
  for(let x=9;x<480;x+=15)for(let y=8;y<187;y+=15)rect(x,y,1,1,"#63798750");
  const progress=paused?.63:(t*.34)%1;
  if(mode==="print"){
   const running=scene===0?beat===2:beat!==0;
   const R=rect, top=67,px=237;
   // A cutaway of the print room: feeder, turning rollers, output tray and operator display.
   R(12,133,456,4,"#5c8489");R(12,137,456,5,"#263f52");R(31,142,6,28,"#415b68");R(442,142,6,28,"#415b68");
   R(116,99,57,8,metal);R(135,107,37,6,"#456777");
   for(let k=0;k<(running?4:beat===0&&scene===0?2:0);k++){R(113+k,95-k*3,62,2,paper);}
   if(running){let slip=progress*43;R(122+slip,91,40,3,paper);}
   R(172,top,130,62,"#64949b");R(180,top-7,115,10,"#a4c4bd");R(181,top+5,112,34,"#253e52");
   // Transparent cover shows the paper moving through the motorised rollers.
   R(184,top+7,106,27,"#344d60");
   for(let k=0;k<3;k++){const xx=201+k*32,yy=top+20;circle(xx,yy,9,"#7f9b9e");circle(xx,yy,5,"#283e4c");let a=running?t*3+k:k;line(xx+Math.cos(a)*3,yy+Math.sin(a)*3,xx+Math.cos(a)*8,yy+Math.sin(a)*8,light,2);}
   if(running)R(186+progress*72,top+28,25,2,paper);
   R(181,top+44,43,5,"#3f6571");R(181,top+52,43,3,"#426776");
   circle(283,top+49,4,running?mint:light);R(178,129,12,4,ink);R(279,129,12,4,ink);R(299,109,62,4,metal);
   if(running){let ext=8+progress*45;R(302,101,ext,4,paper);R(303,106,45,2,paper);R(304,108,43,1,light);}
   if(beat===0&&scene===0){sprite("person",52,108);envelope(72+progress*48,76,light);}
   else {sprite("paper",57,106);if(!running){word("!",151,82,20,light);}}
   sprite("paper",415,104);word(running?"Job printed":"Job record",415,157,12);
   word(scene===0&&beat===0?"Visitor":"Paper supply",60,157,12);
   word(labels[2],px,39,17,light);word(running?"Rollers moving":"Printer waiting",px,157,12);
  }else if(mode==="delay"){
   sprite("gate",63,85);sprite("store",408,85);word("Gate reader",63,136);word("Log desk",408,136);
   for(let x=104;x<365;x+=10)rect(x,86,6,2,metal);
   rect(191,62,81,46,"#263c51");rect(193,99,78,6,"#7998a1");rect(192,66,4,34,metal);rect(266,66,4,34,metal);
   if(beat<2){envelope(212,87,light);envelope(228,81,light);envelope(243,75,light);rect(280,66,4,37,"#f0ab83");word("Holding queue",231,129,12);}
   if(beat===1){envelope(279+progress*105,46,mint);word("Map store slip",336,25,12,mint);}
   if(beat===2){envelope(216+progress*165,86,light);word("Link restored",231,129,12,mint);}
   word(labels[2],220,36,15,light);
  }else if(mode==="edit"){
   function sheet(x,tint){rect(x,50,118,83,tint);rect(x+9,61,56,3,"#68767c");rect(x+9,68,75,2,"#8d9996");}
   sheet(55,paper);sheet(309,"#c7e6d8");word("AI draft",114,155);word("Source check",367,155);
   word(beat===0?"File stolen?":"Downloaded?",113,100,13,ink);
   let p=Math.min(1,progress*1.8);line(70,97,70+87*p,97,"#a1454a",3);
   envelope(195+progress*92,93,light);
   word(["Read recorded","8 MB sent","Content unknown"][beat],367,101,13,ink);word(labels[2],240,30,15,light);
  }else if(mode==="clock"&&scene===3&&beat<2){
   clockFace(103,19,8);clockFace(377,beat===0?19:19-Math.min(1,paused?1:((t*.38)%1.35)),8);
   word("19:08 local",103,137);word(beat===0?"Local reading":"18:08 UTC",377,137);
   word(beat===0?"UTC + 1 hour":"Move back 1 hour",240,78,14,light);
  }else if(mode==="split"&&beat<2){
   sprite("screen",80,51);sprite("screen",80,122);sprite("store",391,86);
   [[51,blue],[122,mint]].forEach(([y,col],i)=>{line(109,y,220,86,col,2);line(220,86,356,86,metal,2);let p=(progress+i*.46)%1;let x=109+247*p,cy=x<220?y+(86-y)*(x-109)/111:86;envelope(x,cy,col);});
   word(beat===0?"Desk 7":"Failed entries",80,83,12);word(beat===0?"Desk 2":"Successful sessions",80,157,12);word("Shared Wi-Fi",387,130,14);word(labels[2],249,42,13,light);
  }else{
   sprite(icon(labels[0]),82,86);sprite(icon(labels[1]),398,86);
   const back=mode==="tide"&&beat===1;
   const blocked=(mode==="delay"&&beat===0)||(mode==="test"&&beat>0);
   for(let x=119;x<363;x+=10)rect(x,82,6,2,metal);
   const start=back?353:122,stop=blocked?240:(back?122:353),p=blocked?Math.min(1,progress*1.7):progress;
   let x=start+(stop-start)*p;
   if(mode==="ferry"||mode==="tide"||mode==="test"){sprite("boat",x,76);for(let j=0;j<16;j++)rect(123+j*15,97+Math.sin(j+t*2)*2,8,1,metal);}
   else envelope(x,82,mode==="edit"?blue:light);
   if(blocked){rect(248,61,4,41,"#f3a885");rect(243,58,15,6,"#f3a885");}
   word(labels[0],82,137);word(labels[1],398,137);word(labels[2],240,42,15,light);
  }
 }
 function run(now){if(prev)t+=Math.min(80,now-prev)/1000;prev=now;draw();raf=requestAnimationFrame(run);}
 function sync(){cancelAnimationFrame(raf);prev=0;draw();if(!stopped&&!paused&&visible&&!document.hidden)raf=requestAnimationFrame(run);}
 const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();});observer.observe(canvas);
 document.addEventListener("visibilitychange",sync);sync();
 return ()=>{stopped=true;cancelAnimationFrame(raf);observer.disconnect();document.removeEventListener("visibilitychange",sync);};
}
