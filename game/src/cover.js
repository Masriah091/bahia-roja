
export class CoverSys{constructor(covers){this.covers=covers;this.active=null}
 nearest(x,z){let best=null,bd=4.2;for(const c of this.covers){const d=Math.hypot(c.x-x,c.z-z);if(d<bd){bd=d;best=c}}return best}
 losBlocked(x1,z1,x2,z2){ // is there a stall/crate near the midpoint segment?
  for(let t=0.2;t<0.9;t+=0.2){const x=x1+(x2-x1)*t,z=z1+(z2-z1)*t;for(const c of this.covers){if(Math.hypot(c.x-x,c.z-z)<2.2)return true}}return false}}
