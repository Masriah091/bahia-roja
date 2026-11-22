
import {makeCar} from './port.js';
export class Traffic{constructor(scene,rng){this.cars=[];const cols=[0xc0392b,0x2980b9,0xf39c12,0x27ae60,0xecf0f1,0x8e44ad];
 for(let i=0;i<16;i++){const horiz=i%2===0,lane=(Math.floor(rng.range(-2,3)))*70+(rng.range(-2,2));const m=makeCar(cols[i%6]);scene.add(m);
  this.cars.push({mesh:m,horiz,x:rng.range(-200,200),z:lane,speed:rng.range(8,15)*(rng.next()>0.5?1:-1),lane})}}
 update(dt){for(const c of this.cars){if(c.horiz){c.x+=c.speed*dt;if(c.x>210)c.x=-210;if(c.x<-210)c.x=210;c.mesh.position.set(c.x,0,c.lane);c.mesh.rotation.y=c.speed>0?Math.PI/2:-Math.PI/2}else{c.z+=c.speed*dt;if(c.z>210)c.z=-210;if(c.z<-210)c.z=210;c.mesh.position.set(c.lane,0,c.z);c.mesh.rotation.y=c.speed>0?0:Math.PI}}}}
