// Keyboard + mouse input for the twin-stick controls. The canvas listens for
// its own pointer; the window listens for keys so focus never eats a press.
// Aim is always the mouse position in arena coordinates; firing is mouse-hold
// or Space. M toggles mute, R / Enter / click restarts from the end screen.
export function createInput(canvas) {
  const held = { up: false, down: false, left: false, right: false };
  const state = {
    up: false,
    down: false,
    left: false,
    right: false,
    mouseX: 640,
    mouseY: 300,
    mouseDown: false,
    spaceHeld: false,
    muted: false,
    restartPressed: false,
    anyKey: false,
    // Firing is true while either trigger is held; a getter keeps the two
    // triggers from ever cancelling each other.
    get firing() {
      return this.mouseDown || this.spaceHeld;
    },
  };

  const KEYMAP = {
    KeyW: 'up', ArrowUp: 'up',
    KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
  };

  function syncHeld() {
    state.up = held.up;
    state.down = held.down;
    state.left = held.left;
    state.right = held.right;
  }

  function toArena(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyM') {
      state.muted = !state.muted;
      return;
    }
    state.anyKey = true;
    if (event.code === 'KeyR' || event.code === 'Enter') state.restartPressed = true;
    if (event.code === 'Space') {
      state.spaceHeld = true;
      event.preventDefault();
      return;
    }
    const field = KEYMAP[event.code];
    if (field) {
      held[field] = true;
      syncHeld();
      if (event.code.startsWith('Arrow')) event.preventDefault();
    }
  });

  window.addEventListener('keyup', (event) => {
    if (event.code === 'Space') {
      state.spaceHeld = false;
      return;
    }
    const field = KEYMAP[event.code];
    if (field) {
      held[field] = false;
      syncHeld();
    }
  });

  canvas.addEventListener('pointermove', (event) => {
    const p = toArena(event);
    state.mouseX = p.x;
    state.mouseY = p.y;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const p = toArena(event);
    state.mouseX = p.x;
    state.mouseY = p.y;
    state.mouseDown = true;
  });
  window.addEventListener('pointerup', () => {
    state.mouseDown = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return state;
}
