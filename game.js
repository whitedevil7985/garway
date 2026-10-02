(() => {
  const canvas = document.querySelector('#gameCanvas');
  const ctx = canvas.getContext('2d');
  const ui = {
    coins: document.querySelector('#coinCount'), score: document.querySelector('#score'), distance: document.querySelector('#distance'),
    start: document.querySelector('#startCard'), tutorial: document.querySelector('#tutorial'), pause: document.querySelector('#pauseButton'),
    paused: document.querySelector('#pausedScreen'), over: document.querySelector('#gameOver'), final: document.querySelector('#finalScore')
  };
  let W, H, dpr, running = false, paused = false, time = 0, last = 0;
  let lane = 1, targetLane = 1, jumping = 0, sliding = 0, score = 2743, coins = 128, distance = 1.2;
  let obstacles = [], pickups = [], flash = 0, swipeStart;
  const laneX = [-.48, 0, .48];

  function resize() { dpr = Math.min(devicePixelRatio || 1, 2); W = canvas.clientWidth; H = canvas.clientHeight; canvas.width=W*dpr; canvas.height=H*dpr; ctx.setTransform(dpr,0,0,dpr,0,0); }
  addEventListener('resize', resize); resize();
  const mix=(a,b,t)=>a+(b-a)*t, pY=z=>mix(H*.22,H*1.08,z), trackWidth=z=>mix(W*.14,W*.95,z), xAt=(l,z)=>W/2 + laneX[l]*trackWidth(z)*.53;
  function polygon(points, fill) {ctx.beginPath(); points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();}
  function circle(x,y,r,fill){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();}

  function drawSky() {
    const g=ctx.createLinearGradient(0,0,0,H*.42);g.addColorStop(0,'#72cef1');g.addColorStop(.58,'#b7e3e6');g.addColorStop(1,'#f4be7c');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    for(let side=0;side<2;side++) for(let i=0;i<9;i++) { const z=(i/9+.05)%1, y=pY(z), h=mix(18,H*.39,z), x=side?W-mix(20,W*.33,z):mix(20,W*.33,z); ctx.fillStyle=i%2?'#88745c':'#bc9e74';ctx.fillRect(side?x:x-mix(18,W*.13,z),y-h,mix(8,W*.12,z),h); ctx.fillStyle='#3e6c73'; ctx.fillRect(side?x+3:x-mix(14,W*.13,z),y-h+10,mix(4,W*.09,z),mix(2,h*.65)); }
    ctx.strokeStyle='#39454b';ctx.lineWidth=1; for(let y=H*.08;y<H*.42;y+=H*.055){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y+20);ctx.stroke();}
  }
  function drawTrack() {
    polygon([[W*.5-W*.07,H*.21],[W*.5+W*.07,H*.21],[W*.98,H],[W*.02,H]],'#5b5142');
    for(let l=0;l<3;l++) { const center=laneX[l]*.33; const top=W*.018, bot=W*.06; polygon([[W/2+center*W-top,H*.22],[W/2+center*W+top,H*.22],[W/2+center*W+bot,H],[W/2+center*W-bot,H]],'#292b2b'); }
    ctx.strokeStyle='#ddd7bd';ctx.lineWidth=3; for(let n=-3;n<=3;n++){ctx.beginPath();ctx.moveTo(W/2+n*W*.023,H*.22);ctx.lineTo(W/2+n*W*.17,H);ctx.stroke();}
    for(let z=.05;z<1;z+=.045){let y=pY(z), ww=trackWidth(z);ctx.strokeStyle='#6b5140';ctx.lineWidth=Math.max(2,6*z);ctx.beginPath();ctx.moveTo(W/2-ww*.54,y);ctx.lineTo(W/2+ww*.54,y);ctx.stroke();}
    ctx.strokeStyle='#2b2a28';ctx.lineWidth=2; for(let x=0;x<W;x+=W*.12){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+W*.04,H*.32);ctx.stroke();}
  }
  function drawTrain(l,z,red=false) { const x=xAt(l,z), y=pY(z), s=mix(.07,1.12,z), w=W*.31*s,h=H*.31*s; const grad=ctx.createLinearGradient(x-w/2,y-h,x+w/2,y);grad.addColorStop(0,'#253943');grad.addColorStop(.5,red?'#a42e23':'#707b80');grad.addColorStop(1,'#1d2529');ctx.fillStyle=grad;ctx.fillRect(x-w/2,y-h,x+w,h);ctx.fillStyle='#152532';ctx.fillRect(x-w*.34,y-h*.8,w*.68,h*.3);ctx.fillStyle='#89c5dc';ctx.fillRect(x-w*.26,y-h*.73,w*.52,h*.18);ctx.fillStyle='#d9d0c5';ctx.fillRect(x-w*.4,y-h*.08,w*.8,h*.1);circle(x-w*.28,y-h*.03,w*.06,'#ffd55e');circle(x+w*.28,y-h*.03,w*.06,'#ffd55e');ctx.fillStyle='#242629';ctx.fillRect(x-w*.48,y-h*.02,w*.12,h*.2);ctx.fillRect(x+w*.36,y-h*.02,w*.12,h*.2);}
  function drawCoin(l,z) {const x=xAt(l,z),y=pY(z)-mix(5,H*.1,z),r=mix(4,23,z);ctx.save();ctx.shadowColor='#ffb000';ctx.shadowBlur=r;circle(x,y,r,'#f9a70e');circle(x,y,r*.68,'#ffd843');ctx.fillStyle='#fff6a8';ctx.font=`bold ${r*1.1}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('★',x,y+1);ctx.restore();}
  function drawPlayer() { const x=xAt(lane,1), y=H*.84-(jumping?Math.sin(jumping*Math.PI)*H*.2:0), s=1; ctx.save();ctx.translate(x,y); if(sliding){ctx.scale(1.25,.6);ctx.rotate(-.12)}ctx.fillStyle='#1d2730';ctx.fillRect(-W*.027,-H*.045,W*.054,H*.11);ctx.fillStyle='#0a67ad';ctx.beginPath();ctx.roundRect(-W*.07,-H*.16,W*.14,H*.14,12);ctx.fill();ctx.fillStyle='#1e2124';ctx.fillRect(-W*.048,-H*.25,W*.096,H*.11);circle(0,-H*.3,W*.044,'#e5b180');ctx.fillStyle='#1d2528';ctx.beginPath();ctx.arc(0,-H*.325,W*.051,Math.PI,0);ctx.fill();ctx.fillStyle='#0a5793';ctx.fillRect(-W*.03,-H*.012,W*.021,H*.1);ctx.fillRect(W*.009,-H*.012,W*.021,H*.1);ctx.fillStyle='#f6f3e8';ctx.fillRect(-W*.04,H*.075,W*.03,H*.016);ctx.fillRect(W*.012,H*.075,W*.03,H*.016);ctx.restore(); }
  function draw() { drawSky();drawTrack(); obstacles.sort((a,b)=>a.z-b.z).forEach(o=>drawTrain(o.lane,o.z,o.red));pickups.sort((a,b)=>a.z-b.z).forEach(c=>drawCoin(c.lane,c.z));drawPlayer(); if(flash){ctx.fillStyle=`rgba(255,80,30,${flash})`;ctx.fillRect(0,0,W,H);} }
  function spawn() { if(Math.random()<.024) obstacles.push({lane:Math.floor(Math.random()*3),z:.05,red:Math.random()>.45}); if(Math.random()<.07) pickups.push({lane:Math.floor(Math.random()*3),z:.05}); }
  function update(dt) { if(!running||paused)return; time+=dt; const speed=.00025+Math.min(time*.000001, .00025); targetLane=Math.max(0,Math.min(2,targetLane)); lane=mix(lane,targetLane,Math.min(1,dt*.014)); if(jumping) jumping=Math.max(0,jumping-dt*.0011); if(sliding) sliding=Math.max(0,sliding-dt*.0014); obstacles.forEach(o=>o.z+=speed*dt);pickups.forEach(c=>c.z+=speed*dt); spawn(); pickups=pickups.filter(c=>{if(c.z>.88&&c.lane===Math.round(lane)){coins++;score+=20;return false}return c.z<1.15}); obstacles=obstacles.filter(o=>{if(o.z>.88&&o.lane===Math.round(lane)&&!jumping&&!sliding){end();return false}return o.z<1.2});score+=Math.floor(dt*.02);distance+=dt*.0000018; flash=Math.max(0,flash-dt*.002); ui.coins.textContent=coins;ui.score.textContent=String(score).padStart(6,'0');ui.distance.textContent=distance.toFixed(1)+' km'; }
  function loop(now){const dt=Math.min(now-last||16,45);last=now;update(dt);draw();requestAnimationFrame(loop)}requestAnimationFrame(loop);
  function begin(){running=true;paused=false;ui.start.classList.add('hidden');ui.tutorial.classList.add('hidden');ui.over.classList.add('hidden');}
  function end(){running=false;flash=.5;ui.final.textContent=String(score).padStart(6,'0');ui.over.classList.remove('hidden');}
  function move(key){ if(!running||paused)return; if(key==='ArrowLeft'||key==='a')targetLane--;if(key==='ArrowRight'||key==='d')targetLane++;if((key==='ArrowUp'||key==='w'||key===' ')&&!jumping)jumping=1;if((key==='ArrowDown'||key==='s')&&!sliding)sliding=1; }
  addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','a','d','w','s'].includes(e.key)){e.preventDefault();move(e.key)}});
  canvas.addEventListener('pointerdown',e=>swipeStart={x:e.clientX,y:e.clientY});canvas.addEventListener('pointerup',e=>{if(!swipeStart)return;const dx=e.clientX-swipeStart.x,dy=e.clientY-swipeStart.y;if(Math.max(Math.abs(dx),Math.abs(dy))<20)return;if(Math.abs(dx)>Math.abs(dy))move(dx>0?'ArrowRight':'ArrowLeft');else move(dy<0?'ArrowUp':'ArrowDown');swipeStart=null;});
  document.querySelector('#playButton').onclick=begin;document.querySelector('#retryButton').onclick=()=>{obstacles=[];pickups=[];score=2743;coins=128;distance=1.2;lane=targetLane=1;begin()};
  ui.pause.onclick=()=>{if(!running)return;paused=!paused;ui.paused.classList.toggle('hidden',!paused)};document.querySelector('#resumeButton').onclick=()=>{paused=false;ui.paused.classList.add('hidden')};
})();
