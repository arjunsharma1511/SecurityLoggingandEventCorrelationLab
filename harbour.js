"use strict";
// Hand-drawn pixel harbour. Logical coordinates keep the same artwork at each viewport size.
function startHarbour(canvas) {
  const c=canvas.getContext("2d");
  const W=640,H=280;
  canvas.width=W;canvas.height=H;
  let t=0, previous=0, frame=0, paused=false, dawn=false, visible=true;
  let seed=83;
  const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  const stars=Array.from({length:110},()=>[random()*W,random()*146,random()*7]);
  const ripples=Array.from({length:148},()=>[random()*W,random()*60,2+random()*13,random()*6]);
  function rect(x,y,w,h,col){c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),w,h);}
  function poly(points,col){c.fillStyle=col;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();}
  function disk(x,y,r,col){c.fillStyle=col;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
  function roof(x,y,w,h,col){poly([[x,y],[x+w/2,y-h],[x+w,y]],col);}
  function house(x,y,w,h,sh,roofCol){
    rect(x,y-h,w,h,sh);roof(x-3,y-h,w+6,10,roofCol);
    rect(x+w*.68,y-h-12,3,8,sh);
    for(let i=4;i<w-2;i+=7){rect(x+i,y-h+4,3,5,"#ffc782");rect(x+i,y-h+7,3,1,"#a66561");}
    rect(x+w/2,y-7,5,7,"#192e48");
  }
  function scene(){
    const sky=c.createLinearGradient(0,0,0,217);
    sky.addColorStop(0,dawn?"#32446f":"#0c193b");sky.addColorStop(.46,dawn?"#a27294":"#283a67");sky.addColorStop(1,dawn?"#ffc590":"#b47d8d");
    c.fillStyle=sky;c.fillRect(0,0,W,H);
    for(const [x,y,p] of stars){c.globalAlpha=.3+.5*(1+Math.sin(t*.8+p))/2;rect(x,y,1+(p>6),1,"#fff3ca");}c.globalAlpha=1;
    const mx=423,my=48;disk(mx,my,24,"#cabb9550");disk(mx,my,21,"#f9deb0");disk(mx-7,my-6,3,"#e8ca9c");disk(mx+6,my+6,2,"#ecd1a4");
    for(let i=0;i<6;i++){const x=((65+i*119+t*(1+i%2))%770)-70,y=48+(i*27)%92;rect(x,y,37,2,"#abb0ce52");rect(x+14,y-2,35,2,"#acb1cc52");rect(x+23,y-3,14,2,"#acb1cc52");}
    poly([[0,177],[28,168],[37,171],[68,145],[82,153],[104,131],[130,153],[171,122],[203,144],[226,135],[261,156],[297,139],[330,165],[383,140],[411,153],[451,125],[480,150],[525,135],[565,160],[600,138],[640,147],[640,218],[0,218]],"#586184");
    poly([[0,182],[28,176],[65,166],[107,183],[135,151],[172,172],[213,152],[248,169],[279,144],[300,169],[343,161],[378,181],[417,159],[452,172],[477,153],[516,174],[559,161],[597,178],[640,164],[640,220],[0,220]],"#3e5272");
    for(let i=0;i<65;i++){const x=i*11,y=178+Math.sin(i*.81)*8;roof(x,y+8,9,15,"#334c62");}
    const sea=c.createLinearGradient(0,192,0,280);sea.addColorStop(0,"#55778a");sea.addColorStop(.32,"#37576d");sea.addColorStop(1,"#122f48");c.fillStyle=sea;c.fillRect(0,191,W,89);
    for(const [x,y,w,p] of ripples){rect((x+Math.sin(t*.7+p)*4+W)%W,192+y*1.5,w,1,p>4?"#749398":"#4f7383");}
    for(let i=0;i<14;i++){let y=194+i*5,x=mx+Math.sin(i*2+t)*8;rect(x-i*.8,y,3+i,1,"#c8ac9277");}
    // Dock, workshops and jetties form the near shore.
    poly([[142,206],[202,197],[251,191],[316,185],[357,191],[381,203],[370,211],[270,212],[243,219],[177,215]],"#223d4d");
    rect(227,197,124,5,"#8c796f");for(let i=230;i<349;i+=13)rect(i,202,3,9,"#273b49");
    house(248,194,26,15,"#65758a","#44475e");house(283,193,30,17,"#9a8486","#5b5369");house(321,192,16,12,"#5e7882","#36495a");
    // Rocky headland and the working light.
    poly([[424,213],[447,205],[462,189],[488,183],[502,168],[535,160],[552,160],[570,177],[599,180],[621,199],[653,203],[640,227],[598,218],[574,224],[523,218],[481,227]],"#203b4c");
    poly([[437,210],[464,187],[490,181],[505,166],[537,159],[557,157],[575,175],[609,183],[618,194],[577,183],[548,175],[515,179],[491,192],[471,196]],"#526b69");
    poly([[471,203],[502,180],[524,177],[514,187],[488,197]],"#799186");
    house(550,166,27,15,"#ddc6ad","#985e63");
    const bx=532,by=80;
    poly([[bx-6,by],[bx+6,by],[bx+13,165],[bx-13,165]],"#eadbb7");
    poly([[bx+3,by],[bx+6,by],[bx+13,165],[bx+5,165]],"#b9aa98");
    for(const [dy,half] of [[22,8],[51,10]]){poly([[bx-half,by+dy],[bx+half,by+dy],[bx+half+1,by+dy+13],[bx-half-1,by+dy+13]],"#ba6e65");}
    rect(bx-2,142,3,6,"#3c5362");rect(bx-2,112,3,5,"#3c5362");rect(bx-3,155,6,10,"#4a545a");
    const sweep=Math.sin(t*.68), reach=85+118*Math.abs(sweep),side=sweep>=0?1:-1,tip=bx+side*reach;
    let beam=c.createLinearGradient(bx,74,tip,80);beam.addColorStop(0,"rgba(255,229,155,.53)");beam.addColorStop(1,"rgba(244,225,159,.04)");
    poly([[bx,73],[tip,54+6*sweep],[tip,99+10*sweep],[bx,77]],beam);
    rect(bx-9,78,18,4,"#253950");rect(bx-6,65,12,13,"#ffdf91");
    for(let i=-7;i<=7;i+=7)rect(bx+i,64,2,15,"#475467");roof(bx-11,65,22,10,"#985e63");rect(bx,50,1,7,"#293948");
    rect(bx-12,82,24,2,"#364556");for(let dx=-11;dx<13;dx+=5)rect(bx+dx,78,1,5,"#354459");
    // Ferry, mast, lamps and its wake.
    const fx=330+Math.sin(t*.12)*78,fy=222+Math.sin(t*1.5)*.8;
    for(let k=0;k<4;k++)rect(fx-24-k*6,fy+5+(k%2)*2,7,1,"#a2c9c3");
    poly([[fx-23,fy],[fx+22,fy],[fx+15,fy+6],[fx-16,fy+6]],"#152d43");rect(fx-16,fy-3,29,3,"#cd8573");rect(fx-10,fy-9,19,6,"#e7d5af");
    for(let j=-8;j<=5;j+=5)rect(fx+j,fy-8,3,3,"#446674");rect(fx+1,fy-18,1,9,"#c9c5af");poly([[fx+2,fy-18],[fx+9,fy-16],[fx+2,fy-14]],"#e5a477");
    for(let j=0;j<3;j++){const gx=((t*5+j*12)%530)+32,gy=89+j*4+Math.sin(t+j)*2;c.strokeStyle="#d4c5bf";c.lineWidth=1;c.beginPath();c.moveTo(gx-3,gy-1);c.lineTo(gx,gy+Math.sin(t*3));c.lineTo(gx+3,gy-1);c.stroke();}
    // Foreground quay and lit harbour windows.
    poly([[0,228],[55,222],[98,234],[132,240],[169,248],[183,257],[112,268],[0,263]],"#162f42");
    house(12,229,31,22,"#384b60","#28374b");house(54,231,28,17,"#41596b","#353d51");
    for(let i=0;i<4;i++){rect(604+i*10,260+i,3,20,"#172f41");}poly([[582,256],[640,258],[640,265],[582,260]],"#4e5e64");
  }
  function loop(now){if(previous) t+=Math.min(now-previous,80)/1000;previous=now;scene();frame=requestAnimationFrame(loop);}
  function sync(){cancelAnimationFrame(frame);previous=0;scene();if(visible&&!paused&&!document.hidden)frame=requestAnimationFrame(loop);}
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();}).observe(canvas);
  document.addEventListener("visibilitychange",sync);
  sync();return {motion(off){paused=off;sync();},morning(v){dawn=v;sync();}};
}
