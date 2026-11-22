
import '../vendor/three.min.js'; const THREE = window.THREE;
import {RNG} from './rng.js'; import {Input} from './input.js'; import {AudioSys} from './audio.js';
import {buildWorld,makePerson} from './port.js'; import {Traffic} from './traffic.js'; import {Peds} from './pedestrians.js';
import {Vehicles} from './vehicles.js'; import {Police} from './police.js'; import {CoverSys} from './cover.js';
import {Combat} from './combat.js'; import {MissionSys,MISSIONS} from './missions.js'; import {WEAPONS,CREW,DISTRICTS} from './config.js';
import {updateHUD,districtAt} from './hud.js'; import {drawMinimap,drawMap} from './minimap.js'; import {renderStats,renderTitleSlots} from './menus.js'; import {runAutopilot} from './autopilot.js';
window.__errors=[]; addEventListener('error',e=>window.__errors.push(String(e.message)));
const Q=new URLSearchParams(location.search); const SHOT=+(Q.get('shot')||0); window.__SHOTMODE=SHOT>0; const AUTO=Q.get('autopilot')==='1';
const rng=new RNG(92741);
const scene=new THREE.Scene();
const NIGHT=(SHOT===2);
scene.fog=new THREE.Fog(NIGHT?0x1a1030:0xe88a50,NIGHT?30:60,NIGHT?160:240);
const camera=new THREE.PerspectiveCamera(62,16/9,0.1,600);
const renderer=new THREE.WebGLRenderer({antialias:true}); renderer.setSize(innerWidth,innerHeight); renderer.setPixelRatio(0.55); renderer.shadowMap.enabled=true;
renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.25; renderer.outputColorSpace=THREE.SRGBColorSpace;
document.getElementById('game').appendChild(renderer.domElement);
// sky dome gradient via large sphere shader-free: use scene background + sun sprite
scene.background=new THREE.Color(NIGHT?0x140f2a:0xf28c4a);
const sun=new THREE.DirectionalLight(NIGHT?0x99aaff:0xffb060,NIGHT?0.85:2.2); sun.position.set(-60,28,-40); sun.shadow.mapSize.set(1024,1024); sun.castShadow=true; scene.add(sun);
scene.add(new THREE.AmbientLight(NIGHT?0x6677bb:0xffd9a0,NIGHT?1.1:0.85));
const skyGlow=new THREE.Mesh(new THREE.SphereGeometry(380,16,12),new THREE.MeshBasicMaterial({color:NIGHT?0x241545:0xff7e5f,side:THREE.BackSide,transparent:true,opacity:0.45})); scene.add(skyGlow);
const world=buildWorld(scene,rng);
const input=new Input(); const audio=new AudioSys();
const playerMesh=makePerson(0xffd700); scene.add(playerMesh);
// enemies for fight stage
const enemies=[]; for(let i=0;i<4;i++){const m=makePerson(0x7b241c); m.position.set(14+i*5,0,28+(i%2)*6); scene.add(m); enemies.push({mesh:m,x:14+i*5,z:28+(i%2)*6,hp:40,alive:true,inCover:false,fireT:rng.range(1,2)})}
const G={cash:250,rep:10,earned:0,stolen:0,evaded:0,coverUses:0,shotsFired:0,maxWanted:0,jobs:1,collected:0,
 player:{x:0,z:-38,angle:0,hp:100,armor:50},vehicle:null,wanted:0,hidden:false,searchT:0,inCover:false,cover:null,
 weapons:(()=>{const w=JSON.parse(JSON.stringify(WEAPONS));w[0].ammo=Infinity;return w})(),weapon:1,radio:0,track:0,tick:0,feedLog:[],banner:null,crew:CREW.map(c=>({...c,cdT:0,face:['🧔','👩','🧑'][CREW.indexOf(c)]})),visited:new Set(['Mercado Nocturno']),
 police:null,missions:new MissionSys(),audio,feed(m){this.feedLog.push(m)},clockStr(){const t=17*60+Math.floor(this.tick/2);const h=Math.floor(t/60)%24,mm=t%60;return String(h).padStart(2,'0')+':'+String(mm).padStart(2,'0')},
 rankTitle(){return this.rep<25?'Puestera':this.rep<50?'Mandadera':this.rep<75?'Socia de Fila':this.rep<95?'Capitana de Muelle':'Reina del Puerto'},
 stageDef(){return this.missions.stageDef()},
 saveGame(){try{localStorage.setItem('bahia-auto',JSON.stringify({cash:this.cash,done:this.missions.done,collected:this.collected}))}catch(e){}},
 saveSlot(i){try{localStorage.setItem('bahia-save-'+i,JSON.stringify({cash:this.cash,done:this.missions.done,collected:this.collected,rep:this.rep}))}catch(e){} this.feed('💾 Saved to slot '+i)},
 checkStage(){const s=this.stageDef();if(!s)return;const d=Math.hypot(this.player.x-s.x,this.player.z-s.z);if(d>4)return;
  if(s.type==='fight')return;
  if(s.type==='escape'){if(this.wanted===0)this.missions.advance(this);return}
  if(s.type==='steal'){const v=vehicles.nearest(this.player.x,this.player.z);if(v){this.enterVehicle(v);this.missions.advance(this)}return}
  this.showDialogue(s); this.missions.advance(this)},
 showDialogue(s){const m=this.missions.cur();const d=document.getElementById('dialogue');d.style.display='flex';document.getElementById('davatar').textContent='👵';document.getElementById('dname').textContent=m.giver;document.getElementById('drole').textContent=m.role;document.getElementById('dline').textContent='“'+s.line+'”';document.getElementById('dmech').textContent='💡 '+s.mech;clearTimeout(this._dt);this._dt=setTimeout(()=>d.style.display='none',window.__SHOTMODE?600000:6000)}};
G.police=new Police(scene);
const traffic=new Traffic(scene,rng), peds=new Peds(scene,rng), vehicles=new Vehicles(scene,rng), coverSys=new CoverSys(world.covers), combat=new Combat(scene);
G.coverHint=''; G.prompt='';
function crime(amount,witnessText){ // witness check
 let witnessed=false; for(const p of peds.list){if(p.stallholder&&Math.hypot(p.x-G.player.x,p.z-G.player.z)<16){witnessed=true;p.phoning=true;p.panic=2;
   setTimeout(()=>{p.phoning=false},4000); break}}
 if(witnessed){G.feed('📞 WITNESS! A stallholder is calling the Policía Portuaria — '+(witnessText||'crime reported!')); G.wanted=Math.min(5,G.wanted+amount); audio.siren()}
 else {G.wanted=Math.min(5,G.wanted+Math.max(0,amount-1)); if(amount>0)G.feed('👁 No stallholder saw that — clean… this time.')}
 G.maxWanted=Math.max(G.maxWanted,G.wanted); if(G.wanted>0)G.police.spawn(G.wanted,G.player,rng)}
function enterVehicle(v){G.vehicle=v;G.stolen++;audio.engine();G.feed('🚗 Stole the '+v.mod.n);crime(1,'a car theft was seen at the stalls!')}
let started=!SHOT&&!AUTO;
document.getElementById('startbtn').onclick=()=>{started=true;audio.ensure();document.getElementById('title').style.display='none';const s=G.stageDef();if(s)G.showDialogue(s)};
if(SHOT||AUTO){document.getElementById('title').style.display='none';started=true}
// ---- SHOT STAGING ----
function stageShot(){ if(SHOT===1){G.wanted=4;G.maxWanted=4;G.cash=4850;G.rep=62;G.player.x=0;G.player.z=-10;G.police.spawn(4,G.player,rng);
  G.police.units.forEach((u,i)=>{u.active=true;u.mesh.visible=true;u.x=-8+i*7;u.z=-26-i*3;u.dist=18+i*6;u.mesh.position.set(u.x,0,u.z)});
  // roadblock ahead
  G.police.units[3].role='ROADBLOCK';G.police.units[3].x=0;G.police.units[3].z=18;G.police.units[3].mesh.position.set(0,0,18);
  if(G.police.heli){G.police.pinHeli=true;G.police.heli.mesh.visible=true;G.police.heli.mesh.position.set(9,13,24)} const s=G.stageDef();if(s)G.showDialogue(s); G.feed('🚨 MUELLE-4 in pursuit — roadblock ahead!');G.feed('🚁 ALCATRAZ overhead with spotlight')}
 if(SHOT===2){G.wanted=2;G.cash=3200;G.inCover=true;G.player.x=-22;G.player.z=-12;G.coverHint='🛡 IN COVER — ducking behind a stall breaks line of sight';
  const lantern=new THREE.PointLight(0xffaa33,2.2,42);lantern.position.set(-17,4.5,-5);scene.add(lantern);
  const neon=new THREE.PointLight(0xff44aa,1.4,30);neon.position.set(-10,3.5,4);scene.add(neon);
  enemies[0].alive=false;enemies[0].x=-17;enemies[0].z=-3;enemies[0].mesh.rotation.x=Math.PI/2;enemies[0].mesh.position.set(-17,0.3,-3);
  enemies[1].x=-14;enemies[1].z=3;enemies[1].mesh.position.set(-14,0,3);
  enemies[2].x=-11;enemies[2].z=10;enemies[2].mesh.position.set(-11,0,10);
  combat.fire(G.player,enemies[1],24);combat.fire(G.player,enemies[2],16);
  for(const[txt,l,tp]of[['-24','52%','40%'],['-16','58%','34%']]){const el=document.createElement('div');el.className='dmgnum';el.textContent=txt;el.style.left=l;el.style.top=tp;document.getElementById('dmgnums').appendChild(el)}
  G.showDialogue({line:'Stall, crate, stall — hop cover and drop them.',mech:'COVER COMBAT: Space snaps you to a stall; you take less fire while covered.'});
  document.getElementById('dname').textContent='Doña Carmen Salas';document.getElementById('drole').textContent='Market Matriarch';
  G.feed('🔫 Alley shootout on row three!');G.missions.idx=3}
 if(SHOT===3){G.player.x=-126;G.player.z=104;const v=vehicles.list[0];v.x=-124;v.z=108;v.mesh.position.set(v.x,0,v.z);
  G.prompt='E — STEAL · '+v.mod.n; let p=peds.list.find(p=>p.stallholder);p.x=-120;p.z=101;p.phoning=true;p.mesh.position.set(p.x,0,p.z);
  G.feed('📞 WITNESS! A stallholder is calling the Policía Portuaria — a car theft was seen at the stalls!');G.wanted=1;G.police.spawn(1,G.player,rng);G.feed('👀 Stallholder on the phone — duck by a stall to hide!')}
 if(SHOT===4){G.cash=12750;G.rep=78;G.collected=13;G.missions.done=4;G.standing=[35,62,20,45,15];document.getElementById('mapscreen').style.display='block';renderStats(G);drawMap(G)}}
G.standing=[10,25,0,5,0];
stageShot(); renderTitleSlots(); updateHUD(G); drawMinimap(G);
if(AUTO) runAutopilot(G);
// ---- INPUT ACTIONS ----
let fireCd=0, interactCd=0;
addEventListener('keydown',e=>{ if(e.code==='KeyM'){const m=document.getElementById('mapscreen');const open=m.style.display==='block';m.style.display=open?'none':'block';if(!open){renderStats(G);drawMap(G)}}
 if(e.code==='Tab'){e.preventDefault();const m=document.getElementById('mapscreen');m.style.display='block';renderStats(G);drawMap(G)}
 if(e.code==='Digit1'||e.code==='Digit2'||e.code==='Digit3'||e.code==='Digit4'||e.code==='Digit5'||e.code==='Digit6'){const i=+e.code.slice(-1)-1;if(!G.weapons[i].locked){G.weapon=i;audio.blip()}else G.feed('🔒 '+G.weapons[i].n+' locked — $'+G.weapons[i].price)}
 if(e.code==='KeyR'){G.weapons[G.weapon].ammo+=10;G.feed('🔄 Reloaded')}
 if(e.code==='KeyQ'){G.radio=(G.radio+1)%2;G.track=0;audio.blip()}
 // crew
 for(const c of G.crew){if(e.code==='Key'+c.key&&c.cdT<=0){c.cdT=c.cd;audio.blip();
   if(c.key==='Z'){G.hidden=true;G.searchT=Math.max(G.searchT,4);G.feed('💨 Elías — SMOKE SCREEN! Sight lines broken')}
   if(c.key==='X'){G.player.hp=Math.min(100,G.player.hp+35);if(G.vehicle)G.vehicle.cond=Math.min(100,G.vehicle.cond+30);G.feed('🔧 Rosa — QUICK FIX! +35 HP')}
   if(c.key==='C'){G.feed('👁 Tito — EYES OUT: '+G.police.units.filter(u=>u.active).length+' units marked on the minimap');G.police.units.forEach(u=>u.dist=Math.round(Math.hypot(u.x-G.player.x,u.z-G.player.z)))}}}
});
// ---- FIXED TIMESTEP LOOP ----
let last=performance.now(),acc=0; const STEP=1/60;
function frame(now){requestAnimationFrame(frame);let dt=(now-last)/1000;last=now;if(dt>0.25)dt=0.25;acc+=dt;while(acc>=STEP){tick(STEP);acc-=STEP}
 // camera
 if(SHOT===1){camera.position.set(G.player.x+2.0,1.5,G.player.z-4.6);camera.lookAt(G.player.x,2.6,G.player.z+12)}
 else if(SHOT===2){camera.position.set(G.player.x+5.5,2.3,G.player.z-7.5);camera.lookAt(G.player.x+1,1.1,G.player.z+7)}
 else if(SHOT===3){camera.position.set(G.player.x-5,2.4,G.player.z-7);camera.lookAt(G.player.x+3,1.2,G.player.z+4)}
 else if(G.vehicle){camera.position.set(G.vehicle.x-Math.sin(G.vehicle.angle)*11,5,G.vehicle.z-Math.cos(G.vehicle.angle)*11);camera.lookAt(G.vehicle.x,1,G.vehicle.z)}
 else{camera.position.set(G.player.x-Math.sin(G.player.angle)*9,4.6,G.player.z-Math.cos(G.player.angle)*9);camera.lookAt(G.player.x,1.4,G.player.z)}
 renderer.render(scene,camera)}
function tick(dt){if(!started)return;G.tick++;
 const ax=input.axis(); const sprint=input.down('ShiftLeft')?1.7:1;
 if(G.vehicle){const v=G.vehicle; if(input.down('KeyW'))v.speed=Math.min(v.mod.sp,v.speed+14*dt); if(input.down('KeyS'))v.speed=Math.max(-8,v.speed-12*dt); v.speed*=0.995;
  if(input.down('KeyA'))v.angle+=dt*1.4; if(input.down('KeyD'))v.angle-=dt*1.4;
  v.x+=Math.sin(v.angle)*v.speed*dt; v.z+=Math.cos(v.angle)*v.speed*dt; v.x=Math.max(-200,Math.min(200,v.x)); v.z=Math.max(-200,Math.min(200,v.z));
  v.mesh.position.set(v.x,0,v.z); v.mesh.rotation.y=v.angle; G.player.x=v.x;G.player.z=v.z;
  if(input.down('Enter')){G.vehicle=null;G.feed('🚶 On foot again')} }
 else {const sp=7*sprint*(G.inCover?0.45:1); if(ax.x||ax.z){G.player.angle=Math.atan2(ax.x,ax.z);G.player.x+=ax.x*sp*dt;G.player.z+=ax.z*sp*dt;G.player.x=Math.max(-200,Math.min(200,G.player.x));G.player.z=Math.max(-200,Math.min(200,G.player.z))}}
 playerMesh.position.set(G.player.x,G.inCover? -0.25:0,G.player.z); playerMesh.rotation.y=G.player.angle; playerMesh.visible=!G.vehicle;
 // cover
 const near=coverSys.nearest(G.player.x,G.player.z); G.coverHint='';
 if(near&&!G.vehicle){G.coverHint='DUCK BY A STALL TO HIDE — press SPACE for cover'; if(input.down('Space')&&!G.inCover){G.inCover=true;G.coverUses++;G.feed('🛡 In cover behind a '+(near.type==='stall'?'market stall':'crate'))}}
 if(!input.down('Space'))G.inCover=false;
 const anyLOS=G.police.units.some(u=>u.active&&!coverSys.losBlocked(G.player.x,G.player.z,u.x,u.z));
 G.hidden=G.inCover||(G.vehicle?false:!anyLOS&&G.wanted>0);
 if(G.wanted>0){if(G.hidden){G.searchT-=dt;if(G.searchT<=0){G.wanted--;G.searchT=6;G.evaded++;G.feed('✅ Lost them — wanted level down');if(G.wanted===0)G.police.clear()}}else G.searchT=6}
 // prompt / interact
 G.prompt=''; const nv=vehicles.nearest(G.player.x,G.player.z);
 if(!G.vehicle&&nv)G.prompt='E — STEAL · '+nv.mod.n;
 interactCd-=dt;
 if(input.down('KeyE')&&interactCd<=0){interactCd=0.6;
  if(!G.vehicle&&nv)enterVehicle(nv); else G.checkStage()}
 // collectibles
 for(const c of world.crates){if(!c.taken&&Math.hypot(c.x-G.player.x,c.z-G.player.z)<2.4){c.taken=true;c.mesh.visible=false;G.collected++;G.cash+=75;G.feed('📦 Lost cargo found! '+G.collected+'/20 (+$75)')}}
 G.visited.add(districtAt(G.player.x,G.player.z));
 // shooting
 fireCd-=dt; const w=G.weapons[G.weapon];
 if((input.clicked||input.down('KeyF'))&&fireCd<=0&&w.ammo>0){input.clicked=false;fireCd=0.28;G.shotsFired++;audio.ensure();audio.shot();
  let best=null,bd=40; for(const e of enemies){if(e.alive){const d=Math.hypot(e.x-G.player.x,e.z-G.player.z);if(d<bd){bd=d;best=e}}}
  if(best){combat.fire(G.player,best,w.dmg);best.hp-=w.dmg;if(best.hp<=0){best.alive=false;best.mesh.rotation.x=Math.PI/2;best.mesh.position.y=0.3;G.feed('💀 Rival down');const s=G.stageDef();if(s&&s.type==='fight'&&enemies.filter(e=>!e.alive).length>=3)G.missions.advance(G);crime(1,'shots fired in the market alley!')}}
  if(w.ammo!==Infinity)w.ammo--}
 // enemies act during fight stage / when wanted
 const s=G.stageDef();
 for(const e of enemies){if(!e.alive)continue;const active=s&&s.type==='fight';e.mesh.visible=true;if(!active)continue;e.fireT-=dt;const d=Math.hypot(e.x-G.player.x,e.z-G.player.z);
  if(e.fireT<=0&&d<30){e.fireT=rng.range(1.2,2.2);combat.fire(e,G.player,6);const dmg=G.inCover?2:7;if(G.player.armor>0)G.player.armor=Math.max(0,G.player.armor-dmg);else G.player.hp-=dmg;if(G.player.hp<=0){G.player.hp=60;G.wanted=0;G.police.clear();G.feed('🏥 Rosa patched you up — back in the fight')}}}
 traffic.update(dt); peds.update(dt,rng,G.player); G.police.update(dt,G.player,G.hidden); combat.update(dt);
 for(const c of G.crew)if(c.cdT>0)c.cdT-=dt;
 if(G.banner){G.banner.timer-=dt;if(G.banner.timer<=0)G.banner=null}
 if(G.tick%12===0){G.checkStage();updateHUD(G);drawMinimap(G);if(document.getElementById('mapscreen').style.display==='block')drawMap(G)}
 if(G.tick%600===0)audio.gull();
}
requestAnimationFrame(frame);
