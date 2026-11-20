import {drawHero} from './hero-art.js';
import {drawAnimatedEnemy} from './sprite-art.js';

// A boss room is a short, forced 1v1. The dungeon stays underneath; this layer
// owns only the duel state and its small touch/keyboard surface.
const W=960,H=600,GROUND=410;
const NAMES=['奶瓶收缴员','静音箱','分拣巨钳','拼装奶偶','牛来与美鼠'];
const TIPS=['先看它的起手，再决定是跳还是替身。','不要一直贴脸，重击后的硬直够它反打。','它抬手时往它身后走，扇形弹会空。','血量过半会加速，留一次替身给狂暴。','两个都倒下了，门才会开。'];

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const fmt=n=>Math.max(0,Math.round(n));

function makeOverlay(){
 const wrap=document.querySelector('.canvas-wrap');
 if(!wrap)return null;
 const old=wrap.querySelector('.duel-overlay');
 if(old)old.remove();
 const node=document.createElement('div');
 node.className='duel-overlay';
 node.setAttribute('aria-hidden','true');
 node.innerHTML='<canvas aria-label="Boss 房横版决斗"></canvas><div class="duel-controls" role="group" aria-label="决斗操作"><div class="duel-move" role="group" aria-label="移动与跳跃"><button type="button" data-duel-hold="left" aria-label="向左移动">←</button><button type="button" data-duel-hold="right" aria-label="向右移动">→</button><button type="button" class="duel-jump" data-duel-action="jump">跳</button></div><div class="duel-actions" role="group" aria-label="攻击与技能"><button type="button" class="special" data-duel-action="skill">技能</button><button type="button" class="special" data-duel-action="ultimate">奥义</button><button type="button" data-duel-action="dash">替身</button><button type="button" class="duel-primary" data-duel-action="light">普攻</button><button type="button" data-duel-action="heavy">重击</button></div></div>';
 wrap.append(node);
 return {node,canvas:node.querySelector('canvas'),ctx:node.querySelector('canvas').getContext('2d',{alpha:true})};
}

function drawBar(ctx,x,y,w,h,ratio,back='#1b2a22',fill='#64a96d'){
 ctx.fillStyle='#0b1510';ctx.fillRect(x-2,y-2,w+4,h+4);
 ctx.fillStyle=back;ctx.fillRect(x,y,w,h);
 ctx.fillStyle=fill;ctx.fillRect(x,y,w*clamp(ratio,0,1),h);
 ctx.fillStyle='#fff6da55';ctx.fillRect(x,y,w*clamp(ratio,0,1),2);
}

export function createBossDuel({getGame,onStart,onFinish}={}){
 const host=makeOverlay();
 if(!host)return {check(){},reset(){},active:false};
 const {node,canvas,ctx}=host;
 const held=new Set();
 let active=false,game=null;
 let time=0,raf=0,last=0;
 let px=300,py=GROUND,vy=0,pface=1,moving=false;
 let attack=null,dash=0,dashCD=0,invUntil=0,energy=0,combo=0,comboT=0,skillCD=0,ultCD=0;
 let bx=650,by=GROUND,bfacing=-1,bstate='idle',btimer=1.1,bwind=0,bhit=0,bhitUntil=0,benraged=false;
 let intro=0;
 let boss=null,bossHp=100,bossMax=100,queue=[],result=null,resultAt=0,shake=0,flash=0;
 let playerWasHit=false;
 const pshots=[],projectiles=[],particles=[],trail=[];

 function sizeCanvas(){
  const base=document.querySelector('#game');
  if(!base||!canvas)return;
  const w=Math.max(1,Math.round(base.width)),h=Math.max(1,Math.round(base.height));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
 }
 function contextTransform(){
  sizeCanvas();
  const sx=canvas.width/W,sy=canvas.height/H;
  ctx.setTransform(sx,0,0,sy,0,0);ctx.imageSmoothingEnabled=false;
 }
 function bossName(){return NAMES[Math.max(0,Math.min(4,(game?.floor||1)-1))]}
 function bossPrompt(){return TIPS[Math.max(0,Math.min(4,(game?.floor||1)-1))]}
 function clearTransient(){
  pshots.length=0;projectiles.length=0;particles.length=0;trail.length=0;shake=0;flash=0;
 }
 function publishState(){
  // The real room stays authoritative for HP and boss death; this is only the
  // normalized bar the duel draws.
  if(!boss)return;
  boss.hp=Math.max(0,boss.maxHp*(bossHp/bossMax));
  if(bossHp<=0){boss.hp=0;boss.dead=true}
 }
 function start(which){
  if(!which)return;
  game=getGame();
  if(!game)return;
  boss=which;
  bossMax=100;bossHp=100;
  queue=(game.room?.enemies||[]).filter(e=>e.type==='boss'&&!e.dead);
  px=300;py=GROUND;vy=0;pface=1;moving=false;attack=null;dash=0;dashCD=0;invUntil=0;energy=0;combo=0;comboT=0;skillCD=0;ultCD=0;
  bx=650;by=GROUND;bfacing=-1;bstate='idle';btimer=1.1;bwind=0;bhit=0;bhitUntil=0;benraged=false;
  clearTransient();result=null;resultAt=0;intro=1.15;
  game.p.inv=Math.max(game.p.inv||0,.35);
  active=true;time=0;last=0;
  game.mode='duel';
  node.classList.add('show');node.setAttribute('aria-hidden','false');document.body.classList.add('duel-active');
  const bar=document.querySelector('#bossbar');if(bar)bar.hidden=true;
  onStart?.();
  if(!raf)raf=requestAnimationFrame(loop);
 }
 function startNext(){
  const next=queue.find(e=>e.type==='boss'&&!e.dead);
  if(next){start(next);return}
  finish('win');
 }
 function finish(kind){
  if(!active)return;
  active=false;cancelAnimationFrame(raf);raf=0;
  node.classList.remove('show');node.setAttribute('aria-hidden','true');document.body.classList.remove('duel-active');
  const g=game;
  if(kind==='win'){
   if(g){const bar=document.querySelector('#bossbar');if(bar)bar.hidden=false;g.mode='play';g.p.inv=Math.max(g.p.inv||0,1.6);g.update(0,{});g.emit('toast',{text:'Boss 房已清空。门开了。'})}
  }else if(g){
   g.p.hp=0;g.mode='dead';g.emit('end',{win:false});
  }
  onFinish?.(kind);
 }
 function reset(){
  active=false;cancelAnimationFrame(raf);raf=0;node.classList.remove('show');node.setAttribute('aria-hidden','true');document.body.classList.remove('duel-active');clearTransient();
 }
 function check(){
  const g=getGame();
  if(active&&g!==game){reset();return}
  if(active)return;
  if(!g||g.mode!=='play'||g.room?.type!=='boss'||g.room.clear)return;
  const bosses=(g.room.enemies||[]).filter(e=>e.type==='boss'&&!e.dead);
  if(!bosses.length)return;
  start(bosses[0]);
 }
 function resultWin(){
  if(result)return;
  result='win';resultAt=1.35;bhit=0;bossHp=0;publishState();
  shake=18;flash=.55;particles.push({x:bx,y:by-70,r:3,color:'#ffe28a'});
 }
 function resultLose(){
  if(result)return;
  result='lose';resultAt=1.35;flash=.4;
 }
 function hitBoss(dmg,kind='light'){
  if(result||bossHp<=0)return;
  const dmgScale=Math.max(1,bossMax/100);
  bossHp=Math.max(0,bossHp-dmg/dmgScale);
  bhit=.12;bhitUntil=time+.16;
  energy=Math.min(100,energy+dmg*.55);
  combo++;comboT=1.05;
  shake=Math.min(14,4+dmg*.25);flash=.12;
  for(let i=0;i<(kind==='ultimate'?24:8);i++){const a=Math.random()*Math.PI*2,v=80+Math.random()*180;particles.push({x:bx,y:by-65,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.3+Math.random()*.3,r:2+Math.random()*3,color:kind==='ultimate'?'#ffe28a':'#fff2bf'})}
  publishState();
  if(bossHp<=0)resultWin();
 }
 function hitPlayer(){
  if(result)return;
  const p=game?.p;if(!p)return;
  if(p.inv>0||dash>0)return;
  if(p.shield){p.shield=false;p.shieldCD=12;p.inv=.6;shake=6;flash=.15;for(let i=0;i<10;i++){const a=Math.random()*Math.PI*2,v=40+Math.random()*110;particles.push({x:px,y:py-45,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.3+Math.random()*.3,r:2+Math.random()*3,color:'#bad37e'})}return}
  p.hp=Math.max(0,p.hp-1);p.inv=1.1;playerWasHit=true;
  combo=0;comboT=0;shake=9;flash=.25;
  for(let i=0;i<12;i++){const a=Math.random()*Math.PI*2,v=40+Math.random()*130;particles.push({x:px,y:py-45,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.3+Math.random()*.3,r:2+Math.random()*3,color:'#f09a86'})}
  if(p.hp<=0)resultLose();
 }
 function light(){
  if(result||attack||dash>0)return;
  pface=bx>=px?1:-1;attack={t:0,dur:.3,hit:false,dmg:Math.max(8,Math.round(6*(game.p.damage||1))),range:132,heavy:false};
 }
 function heavy(){
  if(result||attack||dash>0)return;
  pface=bx>=px?1:-1;attack={t:0,dur:.52,hit:false,dmg:Math.max(16,Math.round(12*(game.p.damage||1))),range:150,heavy:true};
 }
 function jump(){
  if(result||attack||dash>0||py<GROUND-1)return;
  vy=-440;
 }
 function doDash(){
  if(result||dash>0||dashCD>0)return;
  dash=.32;dashCD=2.2;invUntil=Math.max(invUntil,time+.2);trail.length=0;
 }
 function skill(){
  if(result||skillCD>0)return;
  skillCD=5;
  pshots.push({x:px+pface*48,y:py-42,vx:pface*560,vy:0,life:1.4,dmg:12,r:20});
 }
 function ultimate(){
  if(result||energy<100)return;
  energy=0;flash=.6;shake=14;dash=.08;invUntil=time+.25;
  pshots.push({x:px,y:py-30,vx:0,vy:0,life:.6,dmg:0,r:250,ultimate:true});
  if(Math.abs(bx-px)<300)hitBoss(Math.max(35,Math.round(24*(game.p.damage||1))),'ultimate');
 }
 function action(name){
  if(!active||result)return;
  if(name==='jump')jump();else if(name==='light')light();else if(name==='heavy')heavy();else if(name==='dash')doDash();else if(name==='skill')skill();else if(name==='ultimate')ultimate();
 }
 function syncButtons(){
  const blocked={jump:!!result||intro>0||!!attack||dash>0||py<GROUND-1,light:!!result||intro>0||!!attack||dash>0,heavy:!!result||intro>0||!!attack||dash>0,dash:!!result||intro>0||dash>0||dashCD>0,skill:!!result||intro>0||skillCD>0,ultimate:!!result||intro>0||energy<100};
  for(const b of node.querySelectorAll('[data-duel-action]')){const off=!!blocked[b.dataset.duelAction];b.classList.toggle('is-off',off);b.setAttribute('aria-disabled',String(off))}
 }
 function chooseBossAttack(){
  const n=Math.random();
  if(benraged){btimer=.55;if(n<.42)return bstart('charge');if(n<.64)return bstart('stomp');return bstart('fan')}
  btimer=1.15;if(n<.34)bstart('charge');else if(n<.67)bstart('stomp');else bstart('fan');
 }
 function bstart(kind){bstate=kind+'Wind';bwind=kind==='fan'?.55:.72}
 function fan(){
  const dx=px-bx,dy=py-70-by;const len=Math.max(1,Math.hypot(dx,dy));const base=Math.atan2(dy,dx);
  for(const a of [-.28,0,.28])projectiles.push({x:bx,y:by-70,vx:Math.cos(base+a)*320,vy:Math.sin(base+a)*320,r:14,life:2.4,dmg:1});
 }
 function stomp(){
  shake=12;flash=.2;
  if(Math.abs(px-bx)<230&&py>GROUND-100)hitPlayer();
  for(let i=0;i<18;i++){const a=Math.random()*Math.PI*2,v=60+Math.random()*160;particles.push({x:bx,y:by,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.35+Math.random()*.25,r:2+Math.random()*3,color:'#f4d36f'})}
 }
 function updateBoss(dt){
  bhit=Math.max(0,bhit-dt);
  if(result)return;
  if(benraged&&bossHp>0&&bossHp<=50)benraged=true;
  if(bstate==='idle'||bstate==='walk'){
   btimer-=dt;
   if(btimer<=0)chooseBossAttack();
   const dx=px-bx;if(Math.abs(dx)>150){bstate='walk';bfacing=dx>0?1:-1;bx+=bfacing*(benraged?120:90)*dt}else bstate='idle';
  }else if(bstate.endsWith('Wind')){
   bwind-=dt;
   if(bwind<=0){
    const kind=bstate.replace('Wind','');
    if(kind==='charge'){bstate='charge';bwind=.36;const dir=px>=bx?1:-1;bfacing=dir}
    else if(kind==='stomp'){bstate='idle';stomp();btimer=benraged?.6:1.15}
    else {bstate='fan';bwind=.35;fan();}
   }
  }else if(bstate==='charge'){
   const dir=px>=bx?1:-1;bfacing=dir;bx=clamp(bx+dir*(benraged?430:360)*dt,90,870);bwind-=dt;
   if(Math.abs(px-bx)<70&&Math.abs(py-by)<90)hitPlayer();
   if(bwind<=0){bstate='idle';btimer=benraged?.55:1.0}
  }else if(bstate==='fan'){
   bwind-=dt;if(bwind<=0){bstate='idle';btimer=benraged?.55:1.15}
  }
  if(bossHp<=50&&bossHp>0)benraged=true;
  bx=clamp(bx,90,870);
 }
 function updatePlayer(dt){
  if(result)return;
  const p=game.p;
  if(p.inv>0)p.inv=Math.max(0,p.inv-dt);
  if(dash>0){dash=Math.max(0,dash-dt);px=clamp(px+pface*420*dt,70,890)}
  if(dashCD>0)dashCD=Math.max(0,dashCD-dt);
  if(skillCD>0)skillCD=Math.max(0,skillCD-dt);
  let mx=0;if(held.has('left'))mx-=1;if(held.has('right'))mx+=1;
  if(mx){px=clamp(px+mx*260*dt,70,890);pface=mx;moving=true}else moving=false;
  if(py<GROUND||vy<0){vy+=1100*dt;py+=vy*dt;if(py>=GROUND){py=GROUND;vy=0}}
  if(attack){
   attack.t+=dt;
   if(!attack.hit&&attack.t>=attack.dur*.44){
    attack.hit=true;
    if(Math.abs(bx-px)<attack.range+60&&Math.abs(py-by)<115)hitBoss(attack.dmg,attack.heavy?'heavy':'light');
   }
   if(attack.t>=attack.dur)attack=null;
  }
  if(comboT>0){comboT-=dt;if(comboT<=0)combo=0}
  if(energy<100)energy=Math.min(100,energy+dt*.35);
  // Keep the two bodies readable; don't let the player stand inside the boss.
  if(Math.abs(bx-px)<72){if(px<bx)px=bx-72;else px=bx+72;px=clamp(px,70,890)}
  for(const s of pshots){s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;if(!s.ultimate&&!s.hitDone&&Math.abs(s.x-bx)<80&&Math.abs(s.y-(by-70))<110){s.hitDone=true;s.life=0;hitBoss(s.dmg,'skill')}}
  for(const b of projectiles){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(Math.hypot(b.x-px,b.y-(py-45))<b.r+26)hitPlayer()}
  for(const q of particles){q.x+=(q.vx||0)*dt;q.y+=(q.vy||0)*dt;q.life-=dt}
  pshots.splice(0,pshots.length,...pshots.filter(s=>s.life>0&&!s.hitDone));
  projectiles.splice(0,projectiles.length,...projectiles.filter(b=>b.life>0));
  particles.splice(0,particles.length,...particles.filter(q=>q.life>0));
  shake*=Math.pow(.92,dt*60);if(shake<.2)shake=0;
  flash=Math.max(0,flash-dt*2.2);
 }
 function update(dt){
  if(!active)return;
  time+=dt;
  if(result){resultAt-=dt;if(resultAt<=0){if(result==='win'){const next=queue.find(e=>e.type==='boss'&&!e.dead&&e!==boss);if(next){result=null;start(next)}else finish('win')}else finish('lose')}return}
  if(intro>0){intro=Math.max(0,intro-dt);syncButtons();return}
  updatePlayer(dt);updateBoss(dt);syncButtons();
 }
 function drawBackground(){
  const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#0e2019');bg.addColorStop(.45,'#19382a');bg.addColorStop(1,'#07110c');
  ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#234d34';ctx.beginPath();ctx.arc(480,300,235,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#2f6844';ctx.beginPath();ctx.arc(480,300,178,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#ffffff08';for(let i=0;i<7;i++)ctx.fillRect(90+i*120,140,42,360);
  ctx.fillStyle='#0b1710';ctx.fillRect(0,GROUND,W,H-GROUND);
  ctx.strokeStyle='#78a46955';ctx.lineWidth=2;for(let i=0;i<12;i++){ctx.beginPath();ctx.moveTo(i*90,GROUND);ctx.lineTo(i*90-80,H);ctx.stroke()}
  ctx.fillStyle='#f4d36f';ctx.font='900 11px ui-monospace,monospace';ctx.textAlign='center';ctx.fillText('BOSS ROOM · NO ESCAPE',480,54);
  ctx.fillStyle='#fff6da88';ctx.font='900 10px ui-monospace,monospace';ctx.fillText('THE BINDING OF NAIWA · BOSS DUEL',480,72);
 }
 function drawFighterBars(){
  const p=game.p;drawBar(ctx,70,30,350,16,p.hp/p.maxHp,'#1b2a22','#68ad70');
  drawBar(ctx,540,30,350,16,bossHp/bossMax,'#2b1b1b','#c8554f');
  ctx.fillStyle='#fff6da';ctx.font='900 12px system-ui';ctx.textAlign='left';ctx.fillText('奶蛙 · 玩家',70,22);
  ctx.textAlign='right';ctx.fillText(bossName(),890,22);
  ctx.textAlign='center';ctx.fillStyle='#f4d36f';ctx.font='900 11px ui-monospace,monospace';ctx.fillText('ROUND 1',480,25);
  ctx.fillStyle='#fff6da99';ctx.font='700 11px system-ui';ctx.textAlign='left';ctx.fillText(`${Math.max(0,p.hp)} / ${p.maxHp}`,70,62);
  ctx.textAlign='right';ctx.fillText(`${fmt(bossHp)}%`,890,62);
 }
 function drawHUD(){
  drawFighterBars();
  ctx.fillStyle='#d9ead1aa';ctx.font='700 10px system-ui';ctx.textAlign='left';ctx.fillText('A/D 移动 · W/空格 跳 · J 普攻 · K 重击 · L 替身 · U 技能 · R 奥义',70,88);
  drawBar(ctx,70,H-96,180,9,energy/100,'#1b2a22','#f4d36f');
  ctx.fillStyle='#fff6da';ctx.font='800 10px system-ui';ctx.fillText(`奥义槽 ${fmt(energy)}%`,70,H-104);
  if(combo>1&&comboT>0){ctx.save();ctx.translate(480,155);ctx.rotate(-.05);ctx.fillStyle='#ffe88c';ctx.font='900 30px system-ui';ctx.textAlign='center';ctx.fillText(combo+' HIT',0,0);ctx.restore()}
  const dashLeft=dashCD>0?Math.ceil(dashCD):0;ctx.fillStyle=dashCD>0?'#d9ead188':'#bde8cb';ctx.font='700 10px system-ui';ctx.textAlign='right';ctx.fillText(dashCD>0?`替身 ${dashLeft}s`:'替身就绪',890,H-104);
  if(!result&&time<4){ctx.fillStyle='#fff6daaa';ctx.font='700 11px system-ui';ctx.textAlign='center';ctx.fillText(bossPrompt(),480,H-28)}
  if(intro>0){ctx.fillStyle='rgba(8,17,13,.72)';ctx.fillRect(0,0,W,H);ctx.textAlign='center';ctx.fillStyle='#f4d36f';ctx.font='900 11px ui-monospace,monospace';ctx.fillText('BOSS DUEL',480,245);ctx.fillStyle='#fff6da';ctx.font='900 44px system-ui';ctx.fillText('奶蛙 VS '+bossName(),480,300);ctx.fillStyle='#bde8cb';ctx.font='900 12px ui-monospace,monospace';ctx.fillText('ROUND 1',480,335)}
  if(result){ctx.fillStyle='#08110de8';ctx.fillRect(0,0,W,H);ctx.textAlign='center';ctx.fillStyle=result==='win'?'#f4d36f':'#f09a86';ctx.font='900 54px system-ui';ctx.fillText(result==='win'?'K.O.':'你倒了',480,275);ctx.fillStyle='#fff6da';ctx.font='800 15px system-ui';ctx.fillText(result==='win'?(bossName()+'后退半步。门开了。'):(bossName()+'：妈——妈——。再试一次？'),480,320);ctx.fillStyle='#d9ead188';ctx.font='700 11px system-ui';ctx.fillText(result==='win'?'正在结算…':'正在回到复活点…',480,360)}
 }
 function draw(){
  if(!active)return;
  contextTransform();
  ctx.clearRect(0,0,W,H);
  ctx.save();if(shake>0)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
  drawBackground();
  // projectile effects before actors
  for(const s of pshots){ctx.save();ctx.globalAlpha=Math.min(1,s.life);if(s.ultimate){ctx.strokeStyle='#ffe28a';ctx.lineWidth=10;ctx.beginPath();ctx.arc(px,py-45,s.r*(1-s.life/.6)+20,0,Math.PI*2);ctx.stroke()}else{ctx.fillStyle='#bff1d0';ctx.beginPath();ctx.ellipse(s.x,s.y,s.r,10,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff6da';ctx.lineWidth=3;ctx.stroke()}ctx.restore()}
  for(const p of projectiles){ctx.fillStyle='#ef9c76';ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ffe5b4';ctx.lineWidth=2;ctx.stroke()}
  const fakeBoss={...boss,x:bx,y:by,artFacing:bfacing,artMoving:bstate==='walk'||bstate==='charge',artAttackUntil:bstate.endsWith('Wind')||bstate==='charge'?time+1:0,hit:bhit,dead:false,deadAt:0,finalSkill:null};
  drawAnimatedEnemy(ctx,fakeBoss,time);
  const fakeHero={p:{...game.p,face:pface,dash:0},elapsed:time,heroMoving:moving,heroHurtUntil:game.p.inv>0?time+1:0,heroLandUntil:0,heroLaughUntil:0,actionClock:time};
  if(dash>0){for(let i=1;i<4;i++){ctx.globalAlpha=.13/i;drawHero(ctx,fakeHero,px-pface*i*19,py,1.25,true,{face:pface})}ctx.globalAlpha=1}
  drawHero(ctx,fakeHero,px,py,1.25,false,{face:pface});
  for(const q of particles){ctx.globalAlpha=Math.max(0,q.life*2);ctx.fillStyle=q.color;ctx.fillRect(q.x,q.y,q.r,q.r)}
  ctx.globalAlpha=1;
  if(flash>0){ctx.fillStyle=`rgba(255,246,218,${flash*.65})`;ctx.fillRect(0,0,W,H)}
  ctx.restore();
  drawHUD();
 }
 function loop(now){
  if(!active)return;
  if(!last)last=now;
  const dt=Math.min(.04,(now-last)/1000);last=now;
  update(dt);draw();
  raf=requestAnimationFrame(loop);
 }

 const keyMap={a:'left',d:'right',w:'jump',j:'light',k:'heavy',l:'dash',u:'skill',r:'ultimate',' ':'jump'};
 function onKeyDown(e){
  if(!active)return;
  const k=e.key.toLowerCase();if(!(k in keyMap))return;
  e.preventDefault();e.stopPropagation();if(e.repeat)return;
  const a=keyMap[k];if(a==='left'||a==='right')held.add(a);else action(a);
 }
 function onKeyUp(e){const k=e.key.toLowerCase();if(k==='a')held.delete('left');if(k==='d'||k==='arrowright')held.delete('right')}
 function releaseHeld(){held.clear()}
 window.addEventListener('keydown',onKeyDown,true);
 window.addEventListener('keyup',onKeyUp,true);
 window.addEventListener('pointerup',releaseHeld);
 window.addEventListener('pointercancel',releaseHeld);
 window.addEventListener('blur',releaseHeld);
 for(const b of node.querySelectorAll('[data-duel-hold]')){
  const dir=b.dataset.duelHold;
  b.addEventListener('pointerdown',e=>{e.preventDefault();try{b.setPointerCapture?.(e.pointerId)}catch{}held.add(dir)});
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>held.delete(dir));
 }
 for(const b of node.querySelectorAll('[data-duel-action]'))b.addEventListener('pointerdown',e=>{e.preventDefault();action(b.dataset.duelAction)});
 window.addEventListener('resize',sizeCanvas);

 return {check,reset,get active(){return active},start,finish, _debug:{get game(){return game},get boss(){return boss},get state(){return {px,py,bossHp,energy,result,active}},hitBoss,hitPlayer}};
}
