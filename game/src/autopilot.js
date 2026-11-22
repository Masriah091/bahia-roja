export function runAutopilot(G){ // synchronous, deterministic: teleport through mission 1 stages at load
 for(let i=0;i<12&&G.missions.done<1;i++){const s=G.missions.stageDef();if(!s)break;G.player.x=s.x;G.player.z=s.z;G.checkStage()}
 const res='AUTOPILOT '+(G.missions.done>=1?'WIN':'FAIL')+' mission=1 cash='+G.cash+' errors='+(window.__errors?window.__errors.length:0);
 document.title=res;const el=document.getElementById('autopilot-result');if(el)el.textContent=res}
