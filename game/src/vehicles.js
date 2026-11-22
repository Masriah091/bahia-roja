
import {makeCar} from './port.js';
export const MODELS=[{n:'Furgoneta Pesquera',c:0x2980b9,sp:26},{n:'Cupé Ceniza',c:0xe67e22,sp:34},{n:'Pickup Muelle',c:0x27ae60,sp:24},{n:'Sedán Alto',c:0xbdc3c7,sp:30},{n:'Hatch Mercado',c:0xe74c3c,sp:28}];
export class Vehicles{constructor(scene,rng){this.list=[];
 for(let i=0;i<10;i++){const mod=MODELS[i%5];const m=makeCar(mod.c);const x=rng.range(-170,170),z=[-70,0,70][i%3]+rng.range(-3,3);m.position.set(x,0,z);scene.add(m);
  this.list.push({mesh:m,x,z,mod,cond:100,angle:Math.PI/2,speed:0})}}
 nearest(x,z){let best=null,bd=6;for(const v of this.list){const d=Math.hypot(v.x-x,v.z-z);if(d<bd){bd=d;best=v}}return best}}
