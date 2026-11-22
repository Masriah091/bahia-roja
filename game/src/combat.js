
import '../vendor/three.min.js'; const THREE = window.THREE;
export class Combat{constructor(scene){this.scene=scene;this.tracers=[];this.nums=[];this.muzzle=null}
 fire(from,to,dmg){const g=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(from.x,1.4,from.z),new THREE.Vector3(to.x,1.2,to.z)]);const l=new THREE.Line(g,new THREE.LineBasicMaterial({color:0xffdd55}));this.scene.add(l);this.tracers.push({l,t:0.18});
  const s=new THREE.Mesh(new THREE.SphereGeometry(0.28),new THREE.MeshBasicMaterial({color:0xffaa22}));s.position.set(from.x,1.4,from.z);this.scene.add(s);this.muzzle=s;setTimeout(()=>this.scene.remove(s),60);
  const el=document.createElement('div');el.className='dmgnum';el.textContent='-'+dmg;el.style.left=(46+Math.random()*0)+'%';el.style.top='38%';document.getElementById('dmgnums').appendChild(el);this.nums.push({el,t:0.9})}
 update(dt){for(let i=this.tracers.length-1;i>=0;i--){const t=this.tracers[i];t.t-=dt;if(t.t<=0){this.scene.remove(t.l);this.tracers.splice(i,1)}}
  for(let i=this.nums.length-1;i>=0;i--){const n=this.nums[i];n.t-=dt;n.el.style.top=(38-(0.9-n.t)*6)+'%';n.el.style.opacity=n.t;if(n.t<=0){n.el.remove();this.nums.splice(i,1)}}}}
