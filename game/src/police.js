import '../vendor/three.min.js'; const THREE = window.THREE;

import {makeCar,makePerson} from './port.js';
import {UNIT_NAMES,ROLES} from './config.js';
export class Police{constructor(scene){this.units=[];this.foot=[];this.heli=null;this.scene=scene;
 for(let i=0;i<5;i++){const m=makeCar(0xecf0f1);const stripe=new THREE.Mesh(new THREE.BoxGeometry(4.25,0.3,1.95),new THREE.MeshBasicMaterial({color:0x1a5276}));stripe.position.y=0.65;m.add(stripe);m.visible=false;scene.add(m);
  this.units.push({mesh:m,name:UNIT_NAMES[i],role:ROLES[i%ROLES.length],x:0,z:0,speed:0,active:false,dist:0})}
 for(let i=0;i<6;i++){const m=makePerson(0x1a5276);m.visible=false;scene.add(m);this.foot.push({mesh:m,x:0,z:0,hp:40,active:false,inCover:false,fireT:0,name:UNIT_NAMES[i]})}}
 spawn(wanted,player,rng){const n=Math.min(5,1+wanted);for(let i=0;i<this.units.length;i++){const u=this.units[i];if(i<n&&!u.active){u.active=true;u.mesh.visible=true;u.x=player.x+rng.range(-60,60);u.z=player.z+rng.range(-60,60);u.role=ROLES[(i+wanted)%ROLES.length]}}
 if(wanted>=4&&!this.heli){const g=new THREE.Group();const b=new THREE.Mesh(new THREE.BoxGeometry(6,2,2.4),new THREE.MeshStandardMaterial({color:0x222233}));g.add(b);const r=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.3,9),new THREE.MeshBasicMaterial({color:0xffffcc}));r.position.y=2.2;g.add(r);const spot=new THREE.SpotLight(0xffffff,2,80,0.4);spot.position.y=-1;g.add(spot);g.userData.rotor=r;this.heli={mesh:g,name:'ALCATRAZ'};this.scene.add(g)}
 if(this.heli)this.heli.mesh.visible=wanted>=4}
 update(dt,player,hidden){for(const u of this.units){if(!u.active)continue;const dx=player.x-u.x,dz=player.z-u.z,d=Math.hypot(dx,dz);u.dist=Math.round(d);
   const target=u.role==='ROADBLOCK'?14:9;if(d>target){u.x+=dx/d*17*dt;u.z+=dz/d*17*dt}
   u.mesh.position.set(u.x,0,u.z);u.mesh.rotation.y=Math.atan2(dx,dz)}
  if(this.heli&&!this.pinHeli){const h=this.heli.mesh;h.position.set(player.x+Math.sin(performance.now()*0.0004)*12,16,player.z+Math.cos(performance.now()*0.0004)*12);h.children[1].rotation.z+=dt*22}}
 clear(){for(const u of this.units){u.active=false;u.mesh.visible=false}if(this.heli)this.heli.mesh.visible=false}}
