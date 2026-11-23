// BAHÍA ROJA — keyboard and mouse, gathered in one place.
//
// Held keys answer through down(); one-shot presses answer through
// pressed() exactly once, however long the key stays down; the wheel and
// the pointer are tracked for aiming and weapon switching. Menus read
// pressed() once per frame and call endFrame() when they are done, which
// is what makes "exactly once" hold across the whole frame.

export function createInput(canvas) {
  const held = new Set();
  const pressedSet = new Set();
  const mouse = { x: 0, y: 0, down: false, active: false };
  let wheelDelta = 0;

  window.addEventListener('keydown', (event) => {
    if (!event.repeat) pressedSet.add(event.code);
    held.add(event.code);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  window.addEventListener('blur', () => {
    held.clear();
    mouse.down = false;
  });
  canvas.addEventListener('pointermove', (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    mouse.active = true;
  });
  canvas.addEventListener('pointerdown', (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    mouse.down = true;
    mouse.active = true;
    pressedSet.add('Pointer');
  });
  window.addEventListener('pointerup', () => {
    mouse.down = false;
  });
  canvas.addEventListener('wheel', (event) => {
    wheelDelta += event.deltaY;
    event.preventDefault();
  }, { passive: false });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    mouse,
    /** Is this key code currently held? */
    down(code) {
      return held.has(code);
    },
    /** Was this key code pressed since the last endFrame()? */
    pressed(code) {
      return pressedSet.has(code);
    },
    /** Net wheel movement since the last endFrame(). */
    get wheel() {
      return wheelDelta;
    },
    /** Menu navigation helpers, read once per frame. */
    navUp() {
      return pressedSet.has('KeyW') || pressedSet.has('ArrowUp');
    },
    navDown() {
      return pressedSet.has('KeyS') || pressedSet.has('ArrowDown');
    },
    navLeft() {
      return pressedSet.has('KeyA') || pressedSet.has('ArrowLeft');
    },
    navRight() {
      return pressedSet.has('KeyD') || pressedSet.has('ArrowRight');
    },
    confirm() {
      return pressedSet.has('Enter') || pressedSet.has('Space') || pressedSet.has('Pointer');
    },
    back() {
      return pressedSet.has('Escape') || pressedSet.has('Backspace');
    },
    /** Close the frame: one-shot presses and wheel motion are spent. */
    endFrame() {
      pressedSet.clear();
      wheelDelta = 0;
    },
  };
}
