// BAHÍA ROJA — the campaign: fifteen jobs for Casa Roja in three acts,
// from a nobody with a borrowed boat hook to REY DE BAHÍA ROJA. Missions
// are data — a title, a giver, a briefing, a reward and a list of stages —
// and the runner below interprets the stage kinds: goto, load, deliver,
// chase, shootout, race, destroy, escort, escape. The runner owns its
// actors (the fleeing car, the wedding car, the truck to burn) and hands
// the HUD a marker, a stage fraction and a live enemy count.

import { LOCATIONS } from './world.js';
import { makeCar, driveToward } from './vehicles.js';
import { dist } from './rng.js';

const L = (key) => LOCATIONS[key];

export const MISSIONS = [
  {
    title: 'PRIMERA CARGA', giver: 'VIEJO TOMÁS', start: 'ferryDock',
    brief: ['A crate of "sardines" waits at the ferry dock, Adrián.',
      'Load it, drive it to the Escarlata yard gate. Nobody opens it. Nobody.'],
    reward: { cash: 900, rep: 40 },
    stages: [
      { kind: 'goto', at: 'ferryDock', label: 'Go to the ferry dock' },
      { kind: 'load', at: 'ferryDock', label: 'Load the crate', seconds: 4 },
      { kind: 'deliver', at: 'yardGate', label: 'Deliver to the yard gate', needCar: true },
    ],
  },
  {
    title: 'PESCADO FRESCO', giver: 'LA LONJA', start: 'fishAuction',
    brief: ['The auction ice is melting and the buyers are impatient.',
      'Run the fish to the Mercado, then up to the Astillero cantinas. Fast.'],
    reward: { cash: 1100, rep: 45 },
    stages: [
      { kind: 'goto', at: 'fishAuction', label: 'Pick up at the fish auction' },
      { kind: 'race', points: ['marketPlaza', 'dryDock'], label: 'Deliver before the ice melts', seconds: 150 },
    ],
  },
  {
    title: 'EL CONTENEDOR 12', giver: 'CASA ROJA', start: 'yardGate',
    brief: ['Los Martillos opened container twelve. OUR container.',
      'Take the yard back from their sicarios and bring the truck home.'],
    reward: { cash: 1600, rep: 60 },
    stages: [
      { kind: 'goto', at: 'yardCrane', label: 'Reach Grúa Tres' },
      { kind: 'shootout', at: 'yardCrane', label: 'Clear the yard crew', waves: [[['pistol', 3], ['smg', 1]]] },
      { kind: 'deliver', at: 'casaRoja', label: 'Bring the truck to Almacén Casa Roja', needCar: true },
    ],
  },
  {
    title: 'RUEDA PINCHADA', giver: 'VIEJO TOMÁS', start: 'ferryDock',
    brief: ['Our driver Beto ran with the night’s takings.',
      'His Brisa is fast but he is not. Stop the car — the money matters, he doesn’t.'],
    reward: { cash: 1400, rep: 55 },
    stages: [
      { kind: 'chase', spawnAt: 'saltWorks', label: 'Stop Beto’s car', carType: 'sedan' },
    ],
  },
  {
    title: 'LA LONJA CIERRA', giver: 'LA LONJA', start: 'fishAuction',
    brief: ['Los Martillos want the fish auction. Tonight they come to take it.',
      'Hold the Lonja. Every stallholder in Puerto Viejo is watching.'],
    reward: { cash: 1900, rep: 70 },
    stages: [
      { kind: 'shootout', at: 'fishAuction', label: 'Defend the Lonja', waves: [[['pistol', 3]], [['smg', 2], ['pistol', 2]]] },
    ],
  },
  {
    title: 'DIQUE SECO', giver: 'CASA ROJA', start: 'yardGate',
    brief: ['The Martillos are fitting a fast hull in the dry dock.',
      'Burn their truck, scatter their crew, leave the hull a reef.'],
    reward: { cash: 2200, rep: 75 },
    stages: [
      { kind: 'goto', at: 'dryDock', label: 'Get to the dry dock' },
      { kind: 'destroy', at: 'dryDock', label: 'Wreck the Martillo truck', carType: 'truck' },
      { kind: 'shootout', at: 'dryDock', label: 'Scatter the dock crew', waves: [[['pistol', 2], ['shotgun', 1]]] },
    ],
  },
  {
    title: 'SEÑAL DEL FARO', giver: 'LA SIRENA', start: 'cliffStairs',
    brief: ['A package waits under the lighthouse, but the Guardia watches the cliff road.',
      'Take it, and lose them in the streets below. Do not lead them home.'],
    reward: { cash: 2400, rep: 80 },
    stages: [
      { kind: 'goto', at: 'lighthouse', label: 'Climb to the Faro' },
      { kind: 'load', at: 'lighthouse', label: 'Take the package', seconds: 3 },
      { kind: 'escape', label: 'Lose the Guardia', forceStars: 3 },
    ],
  },
  {
    title: 'LA BODA DE LA COLINA', giver: 'VILLA SOL', start: 'villaSol',
    brief: ['The Sol heir marries at dusk. The white Escarlata GT is the wedding car.',
      'Drive the couple down to the Casino. Los Martillos would love to spoil the photos.'],
    reward: { cash: 2800, rep: 85 },
    stages: [
      { kind: 'goto', at: 'villaSol', label: 'Go to Villa Sol' },
      { kind: 'escort', at: 'casino', label: 'Drive the couple to Casino Mirador', carType: 'sport' },
    ],
  },
  {
    title: 'SAL NEGRA', giver: 'CASA ROJA', start: 'saltWorks',
    brief: ['Black salt from the salinas, worth more than the white kind tonight.',
      'One run, south gate to the Marina, before the tide turns.'],
    reward: { cash: 2600, rep: 80 },
    stages: [
      { kind: 'goto', at: 'saltWorks', label: 'Load at the salinas' },
      { kind: 'race', points: ['marina'], label: 'Reach the Marina before the tide', seconds: 105 },
    ],
  },
  {
    title: 'MERCADO CERRADO', giver: 'EL MERCADO', start: 'marketPlaza',
    brief: ['They closed three stalls with baseball bats at noon.',
      'Tonight the Mercado answers. Clear the plaza, then report to the Boutique.'],
    reward: { cash: 3100, rep: 95 },
    stages: [
      { kind: 'shootout', at: 'marketPlaza', label: 'Clear the plaza', waves: [[['pistol', 3], ['smg', 1]], [['shotgun', 2], ['smg', 1]]] },
      { kind: 'goto', at: 'casino', label: 'Report at Colina Mirador' },
    ],
  },
  {
    title: 'EL INTERCEPTOR', giver: 'CASA ROJA', start: 'casaRoja',
    brief: ['A black Interceptor has been shadowing our runs for a week.',
      'It is not Guardia. Run it down and see who pays for it.'],
    reward: { cash: 3400, rep: 100 },
    stages: [
      { kind: 'chase', spawnAt: 'radioTower', label: 'Run down the black Interceptor', carType: 'interceptor' },
    ],
  },
  {
    title: 'CARGA FANTASMA', giver: 'LA SIRENA', start: 'cliffStairs',
    brief: ['The ghost cargo comes ashore at the cliff stairs at midnight.',
      'The Guardia will be told. Drive it home anyway. That is the job.'],
    reward: { cash: 3900, rep: 110 },
    stages: [
      { kind: 'load', at: 'cliffStairs', label: 'Take the ghost cargo', seconds: 4 },
      { kind: 'deliver', at: 'casaRoja', label: 'Deliver under the searchlights', needCar: true, forceStars: 4 },
    ],
  },
  {
    title: 'LA ÚLTIMA GRÚA', giver: 'CASA ROJA', start: 'yardGate',
    brief: ['Los Martillos come for the yard itself tonight, all of them.',
      'Hold Grúa Tres, load the last container, and put it on the ferry.'],
    reward: { cash: 4400, rep: 120 },
    stages: [
      { kind: 'shootout', at: 'yardCrane', label: 'Hold Grúa Tres', waves: [[['smg', 2], ['pistol', 2]], [['shotgun', 2], ['smg', 2], ['rifle', 1]]] },
      { kind: 'load', at: 'yardCrane', label: 'Load the last container', seconds: 5 },
      { kind: 'deliver', at: 'ferryDock', label: 'Put it on the ferry', needCar: true },
    ],
  },
  {
    title: 'FARO APAGADO', giver: 'VIEJO TOMÁS', start: 'ferryDock',
    brief: ['The Radio Faro tower reports our every move to the Guardia.',
      'Kill its generator truck, then disappear before the sky fills with CÓNDOR.'],
    reward: { cash: 4800, rep: 130 },
    stages: [
      { kind: 'destroy', at: 'radioTower', label: 'Wreck the generator truck', carType: 'van', forceStars: 3 },
      { kind: 'escape', label: 'Vanish from the cliff road' },
    ],
  },
  {
    title: 'REY DE BAHÍA ROJA', giver: 'CASA ROJA', start: 'casaRoja',
    brief: ['One last run, the whole coast, every crew watching.',
      'Win the run, then take Villa Sol. After tonight the port has one king.'],
    reward: { cash: 8000, rep: 200 },
    stages: [
      { kind: 'race', points: ['fishAuction', 'marketPlaza', 'yardGate', 'marina', 'villaSol'], label: 'The coast run', seconds: 330 },
      { kind: 'shootout', at: 'villaSol', label: 'Take Villa Sol', waves: [[['smg', 3], ['rifle', 1]], [['shotgun', 2], ['rifle', 2]]] },
    ],
  },
];

/** Heat that holds a given star count, for forced-alert stages. */
const HEAT_FOR_STARS = [0, 18, 46, 88, 140, 205];

export function createMissions() {
  const runner = {
    index: 0, // next mission to offer
    state: 'offer', // offer | briefing | active | done | alldone
    stageIdx: 0,
    stageTime: 0,
    loadProgress: 0,
    wave: 0,
    targetCar: null,
    escortCar: null,
    destroyCar: null,
    rammer0: null,
    rammer1: null,
    escortAmbush: false,
    racePoint: 0,
    raceTime: 0,
    cargoIntegrity: 1,
    cargoCarHp: -1,
    aliveEnemies: 0,
    message: '',
  };

  function mission() {
    return MISSIONS[runner.index] || null;
  }
  function stage() {
    const m = mission();
    return m ? m.stages[runner.stageIdx] : null;
  }
  function stagePoint(st) {
    if (!st) return null;
    if (st.kind === 'race') {
      const key = st.points[runner.racePoint];
      return key ? L(key) : null;
    }
    if (st.kind === 'chase') return runner.targetCar;
    if (st.kind === 'destroy') return runner.destroyCar;
    if (st.kind === 'escort') return L(st.at);
    return st.at ? L(st.at) : null;
  }

  function cleanupActors(ctx) {
    for (const key of ['targetCar', 'escortCar', 'destroyCar', 'rammer0', 'rammer1']) {
      const car = runner[key];
      if (car && ctx) ctx.removeCar(car);
      runner[key] = null;
    }
    runner.escortAmbush = false;
  }

  function spawnWave(ctx) {
    const st = stage();
    const at = L(st.at);
    const waveDef = st.waves[runner.wave];
    if (!waveDef) return;
    for (const pair of waveDef) {
      const weapon = pair[0];
      const count = pair[1];
      for (let i = 0; i < count; i += 1) {
        const ang = ctx.rng.range(0, Math.PI * 2);
        const r = ctx.rng.range(120, 300);
        ctx.combat.spawnGang(at.x + Math.sin(ang) * r, at.y - Math.cos(ang) * r, {
          weapon,
          hp: weapon === 'rifle' ? 130 : 90,
          accuracy: 0.4 + runner.index * 0.012,
          cash: 120 + runner.index * 22,
        });
      }
    }
    if (runner.wave > 0) ctx.feed('¡Refuerzos de Los Martillos!');
  }

  function beginStage(ctx) {
    const st = stage();
    runner.stageTime = 0;
    runner.loadProgress = 0;
    runner.wave = 0;
    runner.racePoint = 0;
    runner.cargoCarHp = -1;
    runner.message = '';
    if (!st) return;
    if (st.forceStars) {
      ctx.police.reportCrime(ctx.playerCtl.state.x, ctx.playerCtl.state.y, 'kill');
      ctx.police.heat = Math.max(ctx.police.heat, HEAT_FOR_STARS[st.forceStars]);
    }
    if (st.kind === 'chase') {
      const at = L(st.spawnAt);
      const car = makeCar(st.carType || 'sedan', at.x, at.y, 0, 'mission', ctx.rng);
      car.hp = 130;
      runner.targetCar = car;
      ctx.addCar(car);
      ctx.feed('El objetivo huye — ¡síguelo!');
    }
    if (st.kind === 'destroy') {
      const at = L(st.at);
      const car = makeCar(st.carType || 'truck', at.x + 60, at.y + 40, 1.2, 'mission', ctx.rng);
      car.hp = 160;
      runner.destroyCar = car;
      ctx.addCar(car);
    }
    if (st.kind === 'escort') {
      const startAt = L(mission().start);
      const car = makeCar(st.carType || 'sport', startAt.x + 50, startAt.y + 30, 0.6, 'mission', ctx.rng);
      car.color = '#e8e4da';
      runner.escortCar = car;
      ctx.addCar(car);
      ctx.feed('El coche de la boda espera. Súbete.');
    }
    if (st.kind === 'shootout') spawnWave(ctx);
    if (st.kind === 'race') runner.raceTime = st.seconds;
  }

  function advance(ctx) {
    runner.stageIdx += 1;
    const m = mission();
    if (runner.stageIdx >= m.stages.length) {
      runner.state = 'done';
      cleanupActors(null); // delivered cars stay in the world as scenery
      ctx.onMissionComplete(m);
    } else {
      beginStage(ctx);
    }
  }

  function fail(ctx, reason) {
    const m = mission();
    runner.state = 'offer';
    runner.stageIdx = 0;
    cleanupActors(ctx);
    ctx.combat.clear();
    ctx.onMissionFail(m, reason);
  }

  runner.mission = mission;
  runner.stage = stage;
  runner.stagePoint = stagePoint;
  runner.beginStage = beginStage;

  /** The world marker the HUD and the map draw: offer, target, waypoint. */
  runner.marker = function marker() {
    if (runner.state === 'offer') {
      const m = mission();
      if (!m) return null;
      const at = L(m.start);
      return { x: at.x, y: at.y, label: m.title, sub: 'Nuevo trabajo — ' + m.giver };
    }
    if (runner.state !== 'active') return null;
    const st = stage();
    const p = stagePoint(st);
    if (!p) return null;
    return { x: p.x, y: p.y, label: st.label, sub: 'JOB ' + (runner.index + 1) + '/15' };
  };

  /** Fraction 0..1 of the current stage, for the HUD stage bar. */
  runner.stageProgress = function stageProgress() {
    const st = stage();
    if (!st || runner.state !== 'active') return 0;
    if (st.kind === 'load') return runner.loadProgress / (st.seconds || 4);
    if (st.kind === 'race') return runner.racePoint / st.points.length;
    if (st.kind === 'shootout') {
      const countWave = (w) => w.reduce((a, pair) => a + pair[1], 0);
      const total = st.waves.reduce((n, w) => n + countWave(w), 0);
      const doneWaves = st.waves.slice(0, runner.wave).reduce((n, w) => n + countWave(w), 0);
      const thisWave = st.waves[runner.wave] ? countWave(st.waves[runner.wave]) : 0;
      return (doneWaves + (thisWave - runner.aliveEnemies)) / Math.max(1, total);
    }
    if (st.kind === 'chase' && runner.targetCar) {
      return 1 - Math.max(0, runner.targetCar.hp) / 130;
    }
    if (st.kind === 'destroy' && runner.destroyCar) {
      return 1 - Math.max(0, runner.destroyCar.hp) / 160;
    }
    if (st.kind === 'escape') return runner.stageTime > 2 ? 0.5 : 0.2;
    return 0.15;
  };

  runner.startBriefing = function startBriefing() {
    if (runner.state === 'offer' && mission()) runner.state = 'briefing';
  };
  runner.accept = function accept(ctx) {
    if (runner.state !== 'briefing') return;
    runner.state = 'active';
    runner.stageIdx = 0;
    beginStage(ctx);
  };
  runner.decline = function decline() {
    if (runner.state === 'briefing') runner.state = 'offer';
  };
  runner.fail = fail;

  runner.update = function update(dt, ctx) {
    if (runner.state !== 'active') return;
    const st = stage();
    if (!st) return;
    const player = ctx.playerCtl.state;
    const px = player.car ? player.car.x : player.x;
    const py = player.car ? player.car.y : player.y;
    runner.stageTime += dt;
    runner.aliveEnemies = ctx.combat.alive();
    if (player.dead) { fail(ctx, 'Caíste en el trabajo.'); return; }

    switch (st.kind) {
      case 'goto': {
        const at = L(st.at);
        if (dist(px, py, at.x, at.y) < 95) advance(ctx);
        break;
      }
      case 'load': {
        const at = L(st.at);
        if (dist(px, py, at.x, at.y) < 95) {
          runner.loadProgress += dt;
          if (runner.loadProgress >= (st.seconds || 4)) {
            ctx.audio.pickup();
            advance(ctx);
          }
        } else {
          runner.loadProgress = Math.max(0, runner.loadProgress - dt * 1.5);
        }
        break;
      }
      case 'deliver': {
        const at = L(st.at);
        if (st.needCar && !player.car) {
          runner.message = 'Necesitas un vehículo para la carga.';
          break;
        }
        runner.message = '';
        if (player.car) {
          if (runner.cargoCarHp < 0) runner.cargoCarHp = player.car.hp;
          runner.cargoIntegrity = Math.max(0, player.car.hp) / Math.max(1, runner.cargoCarHp);
        }
        if (dist(px, py, at.x, at.y) < 105) advance(ctx);
        break;
      }
      case 'race': {
        runner.raceTime -= dt;
        const key = st.points[runner.racePoint];
        const at = key ? L(key) : null;
        if (at && dist(px, py, at.x, at.y) < 115) {
          runner.racePoint += 1;
          runner.raceTime += 12;
          ctx.audio.pickup();
          ctx.feed('Punto de control ✓ +12s');
          if (runner.racePoint >= st.points.length) { advance(ctx); break; }
        }
        if (runner.raceTime <= 0) fail(ctx, 'El tiempo se acabó.');
        break;
      }
      case 'chase': {
        const car = runner.targetCar;
        if (!car) { advance(ctx); break; }
        if (car.hp <= 0 || car.dead) {
          ctx.feed('Objetivo detenido. La carga es nuestra.');
          advance(ctx);
          break;
        }
        if (!car.route || dist(car.x, car.y, car.route.x, car.route.y) < 90) {
          const away = Math.atan2(car.x - px, -(car.y - py));
          car.route = { x: car.x + Math.sin(away) * 900, y: car.y - Math.cos(away) * 900 };
        }
        driveToward(car, car.route.x, car.route.y, dt, ctx.world, { throttle: 0.96 });
        if (dist(car.x, car.y, px, py) > 1900) fail(ctx, 'El objetivo escapó.');
        break;
      }
      case 'destroy': {
        const car = runner.destroyCar;
        if (!car || car.hp <= 0 || car.dead) {
          if (car && !car.exploded) {
            car.exploded = true;
            ctx.combat.fx.explosion(car.x, car.y);
            ctx.audio.crash(true);
          }
          advance(ctx);
        }
        break;
      }
      case 'escort': {
        const car = runner.escortCar;
        const at = L(st.at);
        if (!car) { fail(ctx, 'El coche de la boda se perdió.'); break; }
        if (car.hp <= 0) { fail(ctx, 'El coche de la boda ardió.'); break; }
        if (player.car === car && !runner.escortAmbush) {
          runner.escortAmbush = true;
          for (let i = 0; i < 2; i += 1) {
            const rammer = makeCar('muscle',
              car.x + ctx.rng.range(-500, 500), car.y + ctx.rng.range(-500, 500),
              0, 'gang', ctx.rng);
            ctx.addCar(rammer);
            runner['rammer' + i] = rammer;
          }
          ctx.feed('¡Los Martillos vienen a por la boda!');
        }
        for (let i = 0; i < 2; i += 1) {
          const rammer = runner['rammer' + i];
          if (rammer && !rammer.dead && rammer.hp > 0) {
            driveToward(rammer, px, py, dt, ctx.world, { throttle: 0.94 });
          }
        }
        if (dist(car.x, car.y, at.x, at.y) < 120 && player.car === car) advance(ctx);
        break;
      }
      case 'shootout': {
        if (runner.aliveEnemies === 0) {
          if (runner.wave + 1 < st.waves.length) {
            runner.wave += 1;
            spawnWave(ctx);
          } else {
            advance(ctx);
          }
        }
        break;
      }
      case 'escape': {
        if (ctx.police.stars() === 0) advance(ctx);
        else if (runner.stageTime > 240) fail(ctx, 'La Guardia no te soltó.');
        break;
      }
      default:
        break;
    }
  };

  /** Mission-owned cars currently on the street (rendering, collisions). */
  runner.ownedCars = function ownedCars() {
    const out = [];
    for (const key of ['targetCar', 'escortCar', 'destroyCar', 'rammer0', 'rammer1']) {
      if (runner[key]) out.push(runner[key]);
    }
    return out;
  };

  return runner;
}
