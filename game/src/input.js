// Midnight Getaway — keyboard + mouse input (one place, one job).
// Tracks held keys and edge-triggered presses; mouse clicks for title/buttons.
export const keys = Object.create(null);      // held: keys['KeyW'] === true
const pressed = Object.create(null);          // edge: consumed by wasPressed()
export let mouse = { x: 0, y: 0, clicked: false, clickX: 0, clickY: 0 };

export function inputInit(canvas) {
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (!keys[e.code]) pressed[e.code] = true;
    keys[e.code] = true;
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k of Object.keys(keys)) keys[k] = false; });
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
    mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
  });
  canvas.addEventListener('mousedown', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.clickX = (e.clientX - r.left) * (canvas.width / r.width);
    mouse.clickY = (e.clientY - r.top) * (canvas.height / r.height);
    mouse.clicked = true;
  });
}
export function wasPressed(code) {
  if (pressed[code]) { pressed[code] = false; return true; }
  return false;
}
export function consumeClick() {
  if (mouse.clicked) { mouse.clicked = false; return { x: mouse.clickX, y: mouse.clickY }; }
  return null;
}
export function endFrame() { for (const k of Object.keys(pressed)) pressed[k] = false; }
export function axis() {
  // movement vector from WASD/arrows, normalized
  let x = 0, y = 0;
  if (keys.KeyA || keys.ArrowLeft) x -= 1;
  if (keys.KeyD || keys.ArrowRight) x += 1;
  if (keys.KeyW || keys.ArrowUp) y -= 1;
  if (keys.KeyS || keys.ArrowDown) y += 1;
  if (x && y) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
  return { x, y };
}
export function sprinting() { return !!(keys.ShiftLeft || keys.ShiftRight); }
