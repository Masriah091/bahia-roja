
import '../vendor/three.min.js'; const THREE = window.THREE;
export function buildWorld(scene,rng){
 const M=(c,r=0.7)=>new THREE.MeshStandardMaterial({color:c,roughness:r});
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(420,420),M(0x3a3f3a,1));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
 const water=new THREE.Mesh(new THREE.PlaneGeometry(420,90),new THREE.MeshStandardMaterial({color:0x14425e,roughness:0.25,metalness:0.4}));water.rotation.x=-Math.PI/2;water.position.set(0,0.05,-195);scene.add(water);
 // roads
 for(let i=-2;i<=2;i++){for(const horiz of [true,false]){const r=new THREE.Mesh(new THREE.PlaneGeometry(horiz?420:14,horiz?14:420),M(0x222226,0.95));r.rotation.x=-Math.PI/2;r.position.set(horiz?0:i*70,0.02,horiz?i*70:0);scene.add(r)}}
 const covers=[],stallRows=[];
 const awn=[0xe74c3c,0xf39c12,0x1abc9c,0xe67e22,0x9b59b6,0xec407a];
 // market stalls in rows around Mercado Nocturno
 for(let row=0;row<4;row++){const rep={row,score:50};stallRows.push(rep);
  for(let i=0;i<8;i++){const x=-52+i*15,z=-38+row*22;const g=new THREE.Group();
   const base=new THREE.Mesh(new THREE.BoxGeometry(5,2.2,3),M(0x8a5a2b));base.position.y=1.1;base.castShadow=true;g.add(base);
   const aw=new THREE.Mesh(new THREE.BoxGeometry(5.8,0.25,4),M(awn[(row+i)%6],0.6));aw.position.y=2.9;aw.rotation.z=0.12;g.add(aw);
   for(const dx of[-2.3,2.3]){const p=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.09,2.9),M(0x555555));p.position.set(dx,1.45,1.4);g.add(p)}
   const goods=new THREE.Mesh(new THREE.BoxGeometry(4.4,0.5,2.2),M(awn[(row+i+2)%6]));goods.position.y=2.45;g.add(goods);
   // lantern (real light only on a few stalls; others glow via emissive bulb)
   if((row*8+i)%7===0){const lamp=new THREE.PointLight(0xffaa33,0.9,12);lamp.position.set(0,3.4,0);g.add(lamp)}
   const bulb=new THREE.Mesh(new THREE.SphereGeometry(0.18),new THREE.MeshBasicMaterial({color:0xffcc66}));bulb.position.y=3.3;g.add(bulb);
   g.position.set(x,0,z);scene.add(g);covers.push({x,z:x? x:x,z,w:5,d:3,row,type:'stall'});}}
 // crates cover
 for(let i=0;i<26;i++){const x=rng.range(-180,180),z=rng.range(-180,180);const c=new THREE.Mesh(new THREE.BoxGeometry(2,1.4,2),M(i%2?0x7a4a21:0x5d6d3a));c.position.set(x,0.7,z);c.castShadow=true;scene.add(c);covers.push({x,z,w:2,d:2,row:-1,type:'crate'})}
 // warehouses
 for(let i=0;i<10;i++){const x=-180+i*38,z=-150+(i%2)*28;const wh=new THREE.Mesh(new THREE.BoxGeometry(24,11,18),M(i%2?0x6e4a2f:0x54626e));wh.position.set(x,5.5,z);wh.castShadow=true;scene.add(wh);
  const win=new THREE.Mesh(new THREE.PlaneGeometry(18,3),new THREE.MeshBasicMaterial({color:0xffca7a}));win.position.set(x,7,z+9.1);scene.add(win)}
 // cranes
 for(const x of[-150,-40,80]){const g=new THREE.Group();const leg=new THREE.Mesh(new THREE.BoxGeometry(2,34,2),M(0xc0392b));leg.position.y=17;g.add(leg);const arm=new THREE.Mesh(new THREE.BoxGeometry(38,2,2),M(0xe67e22));arm.position.set(14,33,0);g.add(arm);const cab=new THREE.Mesh(new THREE.BoxGeometry(4,3,4),M(0xf1c40f));cab.position.set(2,30,0);g.add(cab);g.position.set(x,0,-168);scene.add(g)}
 // boats
 for(let i=0;i<7;i++){const g=new THREE.Group();const hull=new THREE.Mesh(new THREE.BoxGeometry(10,2.5,3.6),M(i%2?0x2980b9:0xc0392b));hull.position.y=1;g.add(hull);const mast=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,8),M(0xdddddd));mast.position.y=5;g.add(mast);g.position.set(-160+i*48,0,-192);scene.add(g)}
 // houses Barrio Alto + lamps
 for(let i=0;i<22;i++){const x=95+rng.range(0,80),z=-160+rng.range(0,110);const h=new THREE.Mesh(new THREE.BoxGeometry(9,rng.range(5,11),9),M([0xd9a066,0xc97b5a,0xa8b5a0][i%3]));h.position.set(x,h.geometry.parameters.height/2,z);h.castShadow=true;scene.add(h)}
 for(let i=0;i<30;i++){const x=-175+i*12,z=(i%3-1)*70;if(i%8===0){const l=new THREE.PointLight(0xff9944,0.5,16);l.position.set(x,5,z);scene.add(l)}const p=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.1,5),M(0x333333));p.position.set(x,2.5,z);scene.add(p);const bulb=new THREE.Mesh(new THREE.SphereGeometry(0.16),new THREE.MeshBasicMaterial({color:0xffbb55}));bulb.position.set(x,5,z);scene.add(bulb)}
 // collectible crates positions
 const crates=[];for(let i=0;i<20;i++){const x=rng.range(-185,185),z=rng.range(-185,185);const m=new THREE.Mesh(new THREE.BoxGeometry(1.1,1.1,1.1),new THREE.MeshBasicMaterial({color:0xffd700}));m.position.set(x,0.8,z);scene.add(m);crates.push({x,z,mesh:m,taken:false})}
 return{covers,stallRows,crates};
}
export function makePerson(color){const g=new THREE.Group();const M=c=>new THREE.MeshStandardMaterial({color:c,roughness:0.8});const b=new THREE.Mesh(new THREE.BoxGeometry(0.62,1.05,0.34),M(color));b.position.y=1.05;g.add(b);const h=new THREE.Mesh(new THREE.SphereGeometry(0.21),M(0xd9a066));h.position.y=1.85;g.add(h);const l=new THREE.Mesh(new THREE.BoxGeometry(0.55,0.55,0.3),M(0x222244));l.position.y=0.28;g.add(l);return g}
export function makeCar(color){const g=new THREE.Group();const M=(c,r=0.35)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:0.5});const b=new THREE.Mesh(new THREE.BoxGeometry(4.2,0.85,1.9),M(color));b.position.y=0.65;b.castShadow=true;g.add(b);const t=new THREE.Mesh(new THREE.BoxGeometry(2.1,0.7,1.7),M(0x18222e,0.15));t.position.set(-0.2,1.35,0);g.add(t);for(const[dx,dz]of[[-1.4,0.95],[1.4,0.95],[-1.4,-0.95],[1.4,-0.95]]){const wh=new THREE.Mesh(new THREE.CylinderGeometry(0.36,0.36,0.22),M(0x111111,0.9));wh.rotation.x=Math.PI/2;wh.position.set(dx,0.36,dz);g.add(wh)}const hl=new THREE.Mesh(new THREE.BoxGeometry(0.15,0.2,1.4),new THREE.MeshBasicMaterial({color:0xffe9a0}));hl.position.set(2.12,0.7,0);g.add(hl);return g}
