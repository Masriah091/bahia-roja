
export const MISSIONS=[
 {t:'La Primera Caja',giver:'Doña Carmen Salas',role:'Market Matriarch',stages:[
   {txt:'Habla con Doña Carmen en el Mercado Nocturno.',line:'Niña, the market runs on trust — and on boxes nobody logs. Take this stall key.',mech:'Meet your fixer: every mission starts with a portrait talk like this one.',x:0,z:-46,type:'talk'},
   {txt:'Reach the stall row in Mercado Nocturno.',line:'Row two, blue awning. Keep your head down and your hands clean.',mech:'Follow the gold blip on the minimap; the NEXT line always names your goal.',x:-20,z:-16,type:'go'},
   {txt:'Pick up the unlogged crate behind the stall.',line:'That crate never existed. Carry it like it weighs nothing.',mech:'Press E at a gold crate to pick it up. Cover points glow near stalls.',x:-22,z:-14,type:'pickup'},
   {txt:'Deliver the crate to Doña Carmen.',line:'Good. The row captains saw you work clean. Bahía Roja remembers.',mech:'Deliveries pay cash and REP — watch the MISSION PASSED banner.',x:0,z:-46,type:'deliver'}],pay:650,rep:20,unlock:'Escopeta unlocked in the weapon wheel'},
 {t:'Pescado Frío, Manos Limpias',giver:'Doña Carmen Salas',role:'Market Matriarch',stages:[
   {txt:'Talk to Carmen at Puerto Pesquero.',line:'A fish crate at the port holds more than fish. Bring it home.',mech:'New district, same rule: talk first, then follow the blip.',x:-140,z:-120,type:'talk'},
   {txt:'Collect the cold crate at the docks.',line:'Ice on top, contraband below. Classic Puerto Pesquero.',mech:'Dock crates are collectible cargo — 20 are lost around the port.',x:-150,z:-140,type:'pickup'},
   {txt:'Return to Carmen in the market.',line:'Cold fish, warm money. The port row trusts you now.',mech:'Each stall row keeps its own reputation score.',x:0,z:-46,type:'deliver'}],pay:800,rep:25,unlock:'Puerto Pesquero row reputation open'},
 {t:'Testigos en el Mercado',giver:'Doña Carmen Salas',role:'Market Matriarch',stages:[
   {txt:'Talk to Carmen about the witness problem.',line:'Stallholders phone the Portuaria when they see a crime. Work unseen, or work fast.',mech:'WITNESS SYSTEM: crimes near stallholders trigger a phone call and wanted stars.',x:0,z:-46,type:'talk'},
   {txt:'Steal the dock car at Muelle Seis — unseen if you can.',line:'Take the blue furgoneta. If a stallholder sees you, duck by a stall to hide.',mech:'DUCK BY A STALL TO HIDE: press Space at a stall to break line of sight.',x:-130,z:110,type:'steal'},
   {txt:'Lose the Policía Portuaria.',line:'Break their sight, stay in cover, and let SEARCHING tick down.',mech:'While hidden, the wanted timer drains. Stay behind stalls and crates.',x:-130,z:110,type:'escape'},
   {txt:'Park the car at Carmen\'s stall.',line:'No witnesses, no stars, no problem. You learn fast.',mech:'Clean deliveries pay a no-witness bonus.',x:0,z:-46,type:'deliver'}],pay:1100,rep:30,unlock:'SMG Mercado unlocked'},
 {t:'Fuego en el Callejón',giver:'Doña Carmen Salas',role:'Market Matriarch',stages:[
   {txt:'Talk to Carmen about the rival crew.',line:'Rivals are muscling row three. Push them out — from cover.',mech:'COVER COMBAT: Space snaps you to a stall; you take less fire while covered.',x:0,z:-46,type:'talk'},
   {txt:'Clear the alley rivals from cover (3).',line:'Stall, crate, stall — hop cover and drop them.',mech:'Enemies use cover too. Flank when they reload.',x:10,z:25,type:'fight'},
   {txt:'Report back to Carmen.',line:'Row three breathes again. Your name carries weight now.',mech:'Winning fights raises market reputation on that row.',x:0,z:-46,type:'deliver'}],pay:1400,rep:35,unlock:'Rifle Muelle unlocked'},
 {t:'Muelle Seis de Noche',giver:'Doña Carmen Salas',role:'Market Matriarch',stages:[
   {txt:'Talk to Carmen at nightfall.',line:'Dock six, midnight tide. Lanterns on, eyes open.',mech:'Night-market mode: lanterns and neon change sight lines.',x:0,z:-46,type:'talk'},
   {txt:'Move 2 crates at Muelle Seis.',line:'Two crates, one tide window. Move.',mech:'Timed-feel stages chain pickups — watch STAGE x/y.',x:-130,z:95,type:'pickup'},
   {txt:'Deliver to the night boat.',line:'The boat leaves with the tide — and with our secret.',mech:'Boat deliveries close a mission chain stage.',x:-150,z:-185,type:'deliver'}],pay:1700,rep:40,unlock:'Night runs pay +25%'},
 {t:'Barrio Alto Respeta',giver:'Doña Carmen Salas',role:'Market Matriarch',stages:[
   {txt:'Talk to Carmen about Barrio Alto.',line:'The hill families want a cut. Earn their respect first.',mech:'RESPECT bar (bottom-left) tracks your rank across the whole city.',x:0,z:-46,type:'talk'},
   {txt:'Do a market job in Barrio Alto.',line:'Carry the hill order up — no car, no witnesses.',mech:'On-foot jobs reward the walking game Bahía Roja is built on.',x:130,z:-110,type:'go'},
   {txt:'Return to Carmen.',line:'The hill nods at you now. One job left, niña.',mech:'District standing rises per district on the map screen.',x:0,z:-46,type:'deliver'}],pay:2000,rep:50,unlock:'Barrio Alto standing open'},
 {t:'La Reina del Puerto',giver:'Doña Carmen Salas',role:'Market Matriarch',stages:[
   {txt:'Final talk with Carmen at Playa Ceniza.',line:'One last run, and the port is ours — every row, every dock.',mech:'Finale: every system returns — witnesses, cover, police, driving.',x:120,z:120,type:'talk'},
   {txt:'Take the gold crate from Playa Ceniza.',line:'The heaviest box in Bahía Roja. Carry it proud.',mech:'Gold crates are the rarest collectible cargo.',x:135,z:130,type:'pickup'},
   {txt:'Deliver it to Carmen — the ring is complete.',line:'Bahía Roja is yours, socia. Every stall, every tide.',mech:'Finishing all 7 missions completes the story checklist.',x:0,z:-46,type:'deliver'}],pay:3500,rep:80,unlock:'Queen of the Port — story complete'}];
export class MissionSys{constructor(){this.idx=0;this.stage=0;this.done=0;this.active=true}
 cur(){return MISSIONS[this.idx]||null} stageDef(){const m=this.cur();return m?m.stages[this.stage]:null}
 advance(G){const m=this.cur();if(!m)return;this.stage++;G.audio.blip();
  if(this.stage>=m.stages.length){G.cash+=m.pay;G.rep+=m.rep;G.banner={t:'MISSION PASSED',sub:m.t+'  +$'+m.pay+'  +'+m.rep+' REP',unlock:m.unlock,timer:5};this.done++;this.idx++;this.stage=0;
   if(m.unlock.includes('Escopeta'))G.weapons[2].locked=false;if(m.unlock.includes('SMG'))G.weapons[3].locked=false;if(m.unlock.includes('Rifle'))G.weapons[4].locked=false;
   G.feed('🏆 '+m.t+' complete — +$'+m.pay);G.saveGame();}}}
