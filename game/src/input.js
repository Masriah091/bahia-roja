
export class Input{constructor(){this.k={};this.clicked=false;addEventListener('keydown',e=>{this.k[e.code]=true;if(['Space','Tab'].includes(e.code))e.preventDefault()});addEventListener('keyup',e=>this.k[e.code]=false);addEventListener('mousedown',()=>this.clicked=true)}down(c){return !!this.k[c]}axis(){return{x:(this.k.KeyD?1:0)-(this.k.KeyA?1:0),z:(this.k.KeyS?1:0)-(this.k.KeyW?1:0)}}}
