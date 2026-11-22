
import {DISTRICTS,RADIO} from './config.js';
export function districtAt(x,z){let best=DISTRICTS[0],bd=1e9;for(const d of DISTRICTS){const dd=Math.hypot(d.x-x,d.z-z);if(dd<bd){bd=dd;best=d}}return best.name}
export function updateHUD(G){const $=id=>document.getElementById(id);
 $('cash').textContent='$'+G.cash.toLocaleString('en-US');$('clock').textContent=G.clockStr();
 const stars='★'.repeat(G.wanted)+'☆'.repeat(5-G.wanted);$('stars').textContent=stars;
 $('sight').textContent=G.wanted===0?'':(G.hidden?'SEARCHING '+Math.ceil(G.searchT)+'s':'IN SIGHT');
 $('district').textContent=districtAt(G.player.x,G.player.z);
 $('respectfill').style.width=Math.min(100,G.rep)+'%';$('respecttxt').textContent=G.rankTitle()+' · '+G.rep+'/100 REP';
 const m=G.missions.cur();if(m){const s=G.missions.stageDef();$('mtitle').textContent='MISSION '+(G.missions.idx+1)+' — '+m.t;$('mstage').textContent='STAGE '+(G.missions.stage+1)+'/'+m.stages.length;$('mnext').textContent='NEXT: '+(s?s.txt:'—')}else{$('mtitle').textContent='FREE ROAM — Bahía Roja is yours';$('mstage').textContent='STORY COMPLETE';$('mnext').textContent='NEXT: market jobs & collectibles'}
 // dispatch
 $('dispatch').innerHTML='<b>📡 POLICÍA PORTUARIA — DISPATCH</b><br>'+G.police.units.filter(u=>u.active).map(u=>'🚓 '+u.name+' · '+u.role+' · '+u.dist+' m').join('<br>')+(G.wanted>=4?'<br>🚁 ALCATRAZ · SPOTLIGHT · overhead':'')+(G.police.units.some(u=>u.active)?'':'<span style="color:#9f9">no active units</span>');
 $('feed').innerHTML=G.feedLog.slice(-6).map(f=>'• '+f).join('<br>');
 // weapons
 $('wheel').innerHTML=G.weapons.map((w,i)=>'<div class="slot '+(i===G.weapon?'sel':'')+(w.locked?' lock':'')+'">'+w.i+'<small>'+(w.locked?'🔒$'+w.price:(w.ammo===Infinity?'∞':w.ammo))+'</small></div>').join('');
 const st=RADIO[G.radio];$('radio').innerHTML='📻 '+st.n+'<br><small>♪ '+st.tracks[G.track]+'</small>';
 if(G.vehicle){$('vehpanel').style.display='block';$('vmodel').textContent=G.vehicle.mod.n;$('vcond').textContent='CONDITION '+Math.round(G.vehicle.cond)+'%';$('vspeed').textContent=Math.round(Math.abs(G.vehicle.speed)*3.6);$('vgear').textContent=G.vehicle.speed>0.5?'D':G.vehicle.speed<-0.5?'R':'N'}
 else $('vehpanel').style.display='none';
 $('collect').textContent='📦 LOST CARGO '+G.collected+'/20';
 $('coverhint').style.display=G.coverHint?'block':'none';if(G.coverHint)$('coverhint').textContent=G.coverHint;
 $('prompt').style.display=G.prompt?'block':'none';if(G.prompt)$('prompt').textContent=G.prompt;
 // crew
 $('crew').innerHTML=G.crew.map(c=>'<div class="crewcard"><b>'+c.face+' '+c.n+'</b><br>'+c.label+' ['+c.key+']<br><small>'+(c.cdT>0?'⏳ '+Math.ceil(c.cdT)+'s':'READY')+'</small></div>').join('');
 if(G.banner){$('banner').style.display='block';$('banner').innerHTML='<div class="passtitle">'+G.banner.t+'</div>'+G.banner.sub+'<br><small>🔓 '+G.banner.unlock+'</small>'}else $('banner').style.display='none';
}
