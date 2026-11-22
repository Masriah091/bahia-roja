
import {MISSIONS} from './missions.js';
export function renderStats(G){const $=id=>document.getElementById(id);const pct=Math.round((G.missions.done/7)*40+(G.collected/20)*25+Math.min(35,G.jobs*5));
 $('pct').textContent=pct+'% COMPLETE';
 $('checklist').innerHTML='☑ Story missions '+G.missions.done+'/7<br>☑ Market jobs done: '+G.jobs+'<br>☑ Lost cargo crates '+G.collected+'/20<br>☑ Districts visited: '+G.visited.size+'/5';
 $('medals').innerHTML=MISSIONS.map((m,i)=>'<div>'+(i<G.missions.done?'🥇':i===G.missions.done?'🥈':'⬜')+' '+(i+1)+'. '+m.t+' — '+(i<G.missions.done?'GOLD · $'+m.pay:i===G.missions.done?'IN PROGRESS':'LOCKED')+'</div>').join('');
 $('career').innerHTML='Cash earned $'+G.earned+' · Cars stolen '+G.stolen+' · Witnesses evaded '+G.evaded+'<br>Times hidden in cover '+G.coverUses+' · Shots fired '+G.shotsFired+' · Highest wanted '+G.maxWanted+'★';
 const ladder=['Puestera','Mandadera','Socia de Fila','Capitana de Muelle','Reina del Puerto'];const ri=Math.min(4,Math.floor(G.rep/25));
 $('ladder').innerHTML=ladder.map((r,i)=>'<div style="'+(i===ri?'color:#ffd700;font-weight:bold':'color:#aaa')+'">'+(i+1)+'. '+r+(i===ri?' ← YOU':'')+'</div>').join('')+'<div style="margin-top:6px">NEXT UNLOCK: '+(G.missions.cur()?G.missions.cur().unlock:'Story complete — free roam legend')+'</div>';
 $('slots').innerHTML=[1,2,3].map(i=>{const s=localStorage.getItem('bahia-save-'+i);return '<button class="savebtn" data-slot="'+i+'">SLOT '+i+' — '+(s?'$'+JSON.parse(s).cash+' · M'+(JSON.parse(s).done+1):'EMPTY')+'</button>'}).join('');
 document.querySelectorAll('.savebtn').forEach(b=>b.onclick=()=>{G.saveSlot(+b.dataset.slot);renderStats(G)})}
export function renderTitleSlots(){const el=document.getElementById('titleslots');if(!el)return;el.innerHTML=[1,2,3].map(i=>{const s=localStorage.getItem('bahia-save-'+i);return '<div class="tslot">SAVE '+i+'<br><b>'+(s?'$'+JSON.parse(s).cash+' · Mission '+(JSON.parse(s).done+1)+' · Cargo '+JSON.parse(s).collected+'/20':'— empty berth —')+'</b></div>'}).join('')}
