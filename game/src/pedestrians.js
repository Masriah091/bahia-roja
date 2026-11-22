
import {makePerson} from './port.js';
export class Peds{constructor(scene,rng){this.list=[];const cols=[0xe74c3c,0x3498db,0x2ecc71,0xf1c40f,0xe91e63,0xffffff];
 for(let i=0;i<42;i++){const market=i<26;const x=market?rng.range(-60,60):rng.range(-180,180),z=market?rng.range(-45,55):rng.range(-180,180);const m=makePerson(cols[i%6]);m.position.set(x,0,z);scene.add(m);
  this.list.push({mesh:m,x,z,tx:x,tz:z,stallholder:market&&i%3===0,row:Math.floor(rng.range(0,4)),panic:0,phoning:false,ph:0})}}
 update(dt,rng,player){for(const p of this.list){const dx=p.tx-p.x,dz=p.tz-p.z,d=Math.hypot(dx,dz);
  if(p.panic>0){p.panic-=dt;const fx=p.x-player.x,fz=p.z-player.z,fd=Math.hypot(fx,fz)||1;p.x+=fx/fd*6*dt;p.z+=fz/fd*6*dt}
  else if(d<1){p.tx=Math.max(-190,Math.min(190,p.x+rng.range(-25,25)));p.tz=Math.max(-190,Math.min(190,p.z+rng.range(-25,25)))}
  else{p.x+=dx/d*1.6*dt;p.z+=dz/d*1.6*dt}
  p.mesh.position.set(p.x,0,p.z);p.mesh.rotation.y=Math.atan2(dx,dz);
  if(p.phoning){p.mesh.children[0].position.y=1.15+Math.sin(performance.now()*0.02)*0.03}}}}
