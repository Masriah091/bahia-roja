
import {DISTRICTS} from './config.js';
export function drawMinimap(G){const c=document.getElementById('minimap');if(!c)return;const x=c.getContext('2d');const S=150;x.clearRect(0,0,S,S);
 x.fillStyle='#1c2a1e';x.fillRect(0,0,S,S);x.strokeStyle='#556';x.lineWidth=4;
 for(let i=-2;i<=2;i++){x.strokeStyle='#3d3d44';x.lineWidth=5;x.beginPath();x.moveTo(0,75+i*26);x.lineTo(S,75+i*26);x.stroke();x.beginPath();x.moveTo(75+i*26,0);x.lineTo(75+i*26,S);x.stroke()}
 const W=(wx,wz)=>[75+wx*0.35,75+wz*0.35];
 for(const d of DISTRICTS){const[px,py]=W(d.x,d.z);x.fillStyle='#ffd76a';x.beginPath();x.arc(px,py,3,0,7);x.fill()}
 if(G.hidden&&G.wanted>0){x.strokeStyle='rgba(255,80,80,.7)';x.beginPath();x.arc(75,75,34,0,7);x.stroke()}
 for(const u of G.police.units){if(!u.active)continue;const[px,py]=W(u.x,u.z);x.fillStyle='#4da6ff';x.fillRect(px-2,py-2,4,4)}
 const s=G.missions.stageDef();if(s){const[px,py]=W(s.x,s.z);x.fillStyle='#ffd700';x.beginPath();x.arc(px,py,4+Math.sin(G.tick*0.15)*1.2,0,7);x.fill()}
 x.fillStyle='#fff';x.beginPath();x.arc(75,75,4,0,7);x.fill();x.fillStyle='#ff5252';x.beginPath();x.moveTo(75,68);x.lineTo(72,78);x.lineTo(78,78);x.fill()}
export function drawMap(G){const c=document.getElementById('mapcanvas');const x=c.getContext('2d');x.fillStyle='#14231a';x.fillRect(0,0,760,470);
 x.fillStyle='#14425e';x.fillRect(0,0,760,60);
 for(let i=-2;i<=2;i++){x.strokeStyle='#444';x.lineWidth=8;x.beginPath();x.moveTo(0,235+i*80);x.lineTo(760,235+i*80);x.stroke();x.beginPath();x.moveTo(380+i*110,0);x.lineTo(380+i*110,470);x.stroke()}
 const W=(wx,wz)=>[380+wx*1.7,235+wz*1.7];
 DISTRICTS.forEach((d,i)=>{const[px,py]=W(d.x,d.z);x.fillStyle='#'+d.c.toString(16).padStart(6,'0');x.globalAlpha=0.5;x.beginPath();x.arc(px,py,52,0,7);x.fill();x.globalAlpha=1;x.fillStyle='#fff';x.font='bold 15px sans-serif';x.fillText(d.name,px-48,py);x.font='12px sans-serif';x.fillText('Standing: '+(G.standing[i]||0)+' REP',px-48,py+17)});
 const s=G.missions.stageDef();if(s){const[px,py]=W(s.x,s.z);x.strokeStyle='#ffd700';x.lineWidth=3;x.setLineDash([8,6]);x.beginPath();const[qx,qy]=W(G.player.x,G.player.z);x.moveTo(qx,qy);x.lineTo(px,py);x.stroke();x.setLineDash([]);x.fillStyle='#ffd700';x.beginPath();x.arc(px,py,8,0,7);x.fill();x.fillStyle='#000';x.font='bold 11px sans-serif';x.fillText('GPS',px-10,py+3)}
 const[px,py]=W(G.player.x,G.player.z);x.fillStyle='#fff';x.beginPath();x.arc(px,py,6,0,7);x.fill()}
