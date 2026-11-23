// BAHÍA ROJA — money moving through legitimate-looking doors. Six shop
// kinds, each with a catalogue: an item knows its price, whether Adrián
// may take it right now (and if not, why not, in words the feed can
// print), and what it does when he does. screens.js renders the
// catalogue; buy() here moves the money and applies the effect.

import { WEAPONS } from './combat.js';
import { VEHICLE_TYPES, makeCar } from './vehicles.js';

function weaponItem(id) {
  const def = WEAPONS[id];
  return {
    id: 'w_' + id,
    name: def.name,
    desc: 'Daño ' + def.damage + ' · cargador ' + def.mag,
    price: def.price,
    can(game) {
      if (game.playerCtl.hasWeapon(id)) return 'Ya lo tienes';
      return true;
    },
    apply(game) {
      game.playerCtl.giveWeapon(id);
      return def.name + ' es tuyo.';
    },
  };
}

function ammoItem(id) {
  const def = WEAPONS[id];
  return {
    id: 'a_' + id,
    name: 'Munición — ' + def.name,
    desc: '+' + def.mag * 3 + ' balas',
    price: def.ammoPrice,
    can(game) {
      if (!game.playerCtl.hasWeapon(id)) return 'No tienes el arma';
      return true;
    },
    apply(game) {
      const slot = game.playerCtl.state.weapons.find((w) => w.id === id);
      if (slot) slot.reserve += def.mag * 3;
      return 'Munición cargada.';
    },
  };
}

export const SHOP_CATALOGS = {
  weapons: {
    title: 'ARMERÍA DEL PUERTO',
    items: [weaponItem('smg'), weaponItem('shotgun'), weaponItem('rifle'),
      ammoItem('pistol'), ammoItem('smg'), ammoItem('shotgun'), ammoItem('rifle')],
  },
  garage: {
    title: 'TALLER ROQUE',
    items: [
      {
        id: 'repair', name: 'REPARACIÓN TOTAL', desc: 'El coche sale como nuevo', price: 0,
        priceOf(game) {
          if (!game.playerCtl.state.car) return 0;
          const missing = 100 - game.playerCtl.state.car.hp;
          return Math.max(60, Math.round(missing * 2.4));
        },
        can(game) {
          if (!game.playerCtl.state.car) return 'Ven con un coche';
          if (game.playerCtl.state.car.hp >= 99) return 'No le pasa nada';
          return true;
        },
        apply(game) {
          game.playerCtl.state.car.hp = 100;
          return 'Roque: "Como nuevo, piloto."';
        },
      },
      {
        id: 'spray', name: 'PINTURA NUEVA', desc: 'Otro color: la Guardia busca el viejo', price: 150,
        can(game) {
          if (!game.playerCtl.state.car) return 'Ven con un coche';
          return true;
        },
        apply(game, ctx) {
          const car = game.playerCtl.state.car;
          car.color = ctx.rng.pick(['#3f6d5a', '#5a6b7a', '#8f3b30', '#c8c2b4', '#274b8f', '#23252a']);
          game.police.heat *= 0.45;
          return 'Nuevo color, nuevo fantasma.';
        },
      },
      {
        id: 'tune', name: 'MOTOR PREPARADO', desc: '+12% de punta para este coche', price: 1200,
        can(game) {
          if (!game.playerCtl.state.car) return 'Ven con un coche';
          if (game.playerCtl.state.car.tuned) return 'Ya está preparado';
          return true;
        },
        apply(game) {
          const car = game.playerCtl.state.car;
          car.tuned = true;
          car.type = Object.assign({}, car.type, {
            top: Math.round(car.type.top * 1.12),
            accel: Math.round(car.type.accel * 1.1),
          });
          return 'El motor canta distinto ahora.';
        },
      },
    ],
  },
  food: {
    title: 'CANTINA LA BRASA',
    items: [
      {
        id: 'plato', name: 'PLATO DEL DÍA', desc: 'Pescado frito: +50 de salud', price: 60,
        can(game) { return game.playerCtl.state.hp >= 100 ? 'Estás lleno' : true; },
        apply(game) { game.playerCtl.heal(50); return 'Como en casa de la abuela.'; },
      },
      {
        id: 'cafe', name: 'CAFÉ SOLO', desc: '+15 de salud y a correr', price: 15,
        can(game) { return game.playerCtl.state.hp >= 100 ? 'Estás lleno' : true; },
        apply(game) { game.playerCtl.heal(15); return 'Fuerte. A correr.'; },
      },
    ],
  },
  pharmacy: {
    title: 'FARMACIA DEL FARO',
    items: [
      {
        id: 'medkit', name: 'BOTIQUÍN COMPLETO', desc: 'Salud al máximo', price: 150,
        can(game) { return game.playerCtl.state.hp >= 100 ? 'Estás entero' : true; },
        apply(game) { game.playerCtl.heal(100); return 'Entero otra vez.'; },
      },
      {
        id: 'armor', name: 'CHALECO ANTIBALAS', desc: 'Blindaje 100', price: 300,
        can(game) { return game.playerCtl.state.armor >= 100 ? 'Ya llevas uno' : true; },
        apply(game) { game.playerCtl.state.armor = 100; return 'Pesa. Protege más.'; },
      },
    ],
  },
  clothes: {
    title: 'BOUTIQUE MIRADOR',
    items: [
      {
        id: 'outfit', name: 'TRAJE NUEVO', desc: 'La Guardia pierde tu descripción', price: 120,
        can() { return true; },
        apply(game) {
          game.police.clear(Math.floor(game.police.heat * 0.2));
          game.outfit = (game.outfit + 1) % 4;
          return '¿Adrián? Nunca estuvo aquí.';
        },
      },
      {
        id: 'hat', name: 'SOMBRERO DE PAJA', desc: 'Estilo del puerto, sin más', price: 40,
        can(game) { return game.hat ? 'Ya tienes uno' : true; },
        apply(game) { game.hat = true; return 'Con esto, ni tu madre.'; },
      },
    ],
  },
  dealer: {
    title: 'MOTOR ROQUE — VENTA',
    items: ['hatch', 'pickup', 'van', 'truck', 'muscle', 'sport'].map((id) => {
      const t = VEHICLE_TYPES[id];
      return {
        id: 'car_' + id,
        name: t.name,
        desc: 'Punta ' + Math.round(t.top * 0.36) + ' km/h · papeles limpios',
        price: t.price,
        can() { return true; },
        apply(game, ctx) {
          const shop = game.openShop;
          const car = makeCar(id, shop.x + 40, shop.y + 70, Math.PI, 'parked', ctx.rng);
          ctx.addCar(car);
          return t.name + ' te espera fuera.';
        },
      };
    }),
  },
};

/** Attempt a purchase; returns the message the feed should show. */
export function buy(game, item, ctx) {
  const check = item.can(game);
  if (check !== true) {
    ctx.audio.denied();
    return typeof check === 'string' ? check : 'No se puede.';
  }
  const price = item.priceOf ? item.priceOf(game) : item.price;
  if (game.cash < price) {
    ctx.audio.denied();
    return 'No te alcanza. La Casa paga mejor que esto.';
  }
  game.cash -= price;
  const msg = item.apply(game, ctx);
  ctx.audio.cash();
  return msg;
}
