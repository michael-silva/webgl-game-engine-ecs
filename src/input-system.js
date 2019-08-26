export const KeyboardKeys = Object.freeze({
  // special keys
  Backspace: 8,
  Tab: 9,
  Enter: 13,
  Shift: 16,
  Ctrl: 17,
  Alt: 18,
  Escape: 27,
  Space: 32,
  PageUp: 33,
  PageDown: 34,
  End: 35,
  Home: 36,

  // arrows
  Left: 37,
  Up: 38,
  Right: 39,
  Down: 40,

  // numbers
  Zero: 48,
  One: 49,
  Two: 50,
  Three: 51,
  Four: 52,
  Five: 53,
  Six: 54,
  Seven: 55,
  Eight: 56,
  Nine: 57,

  // Alphabets
  A: 65,
  B: 66,
  C: 67,
  D: 68,
  E: 69,
  F: 70,
  G: 71,
  H: 72,
  I: 73,
  J: 74,
  K: 75,
  L: 76,
  M: 77,
  N: 78,
  O: 79,
  P: 80,
  Q: 81,
  R: 82,
  S: 83,
  T: 84,
  U: 85,
  V: 86,
  W: 87,
  X: 88,
  Y: 89,
  Z: 90,
  LastKeyCode: 222,
});

export const MouseButton = Object.freeze({
  Left: 0,
  Middle: 1,
  Right: 2,
});

export class KeyboardState {
  constructor() {
    const defaultArray = new Array(KeyboardKeys.LastKeyCode).fill(false);
    this.pressedKeys = defaultArray.slice(0);
    this.previousStateKeys = defaultArray.slice(0);
    this.clickedKeys = defaultArray.slice(0);
  }

  isKeyPressed(key) {
    return this.pressedKeys[key];
  }

  isKeyClicked(key) {
    return this.clickedKeys[key];
  }
}

export class MouseState {
  constructor() {
    const defaultMouseArray = new Array(KeyboardKeys.LastKeyCode).fill(false);
    this.pressedButtons = defaultMouseArray.slice(0);
    this.previousStateButtons = defaultMouseArray.slice(0);
    this.clickedButtons = defaultMouseArray.slice(0);

    this.mousePosX = -1;
    this.mousePosY = -1;
  }

  isButtonPressed(key) {
    return this.pressedButtons[key];
  }

  isButtonClicked(key) {
    return this.clickedButtons[key];
  }
}


export class InputSystem {
  constructor(element) {
    this._element = element;
    this._keyboardState = new KeyboardState();
    this._mouseState = new MouseState();

    window.addEventListener('keydown', this._handleKeydown.bind(this), false);
    window.addEventListener('keyup', this._handleKeyup.bind(this), false);
    window.addEventListener('mousedown', this._onMouseDown.bind(this), false);
    window.addEventListener('mouseup', this._onMouseUp.bind(this), false);
    window.addEventListener('mousemove', this._onMouseMove.bind(this), false);
  }

  run(game) {
    const { pressedKeys, clickedKeys, previousStateKeys } = this._keyboardState;
    pressedKeys.forEach((pressed, key) => {
      clickedKeys[key] = pressed && !previousStateKeys[key];
      previousStateKeys[key] = pressed;
    });

    const { clickedButtons, pressedButtons, previousStateButtons } = this._mouseState;
    for (let i = 0; i < 3; i++) {
      clickedButtons[i] = (!previousStateButtons[i]) && pressedButtons[i];
      previousStateButtons[i] = pressedButtons[i];
    }

    // eslint-disable-next-line
    game.keyboard = this._keyboardState;
    // eslint-disable-next-line
    game.mouse = this._mouseState;
  }

  _handleKeydown(e) {
    this._keyboardState.pressedKeys[e.keyCode] = true;
  }

  _handleKeyup(e) {
    this._keyboardState.pressedKeys[e.keyCode] = false;
  }

  _onMouseDown(e) {
    if (this._onMouseMove(e)) {
      this._mouseState.pressedButtons[e.button] = true;
    }
  }

  _onMouseUp(e) {
    this._onMouseMove(e);
    this._mouseState.pressedButtons[e.button] = false;
  }

  _onMouseMove(e) {
    let inside = false;

    const bBox = this._element.getBoundingClientRect();
    // In Canvas Space now. Convert via ratio from canvas to client.
    const x = Math.round((e.clientX - bBox.left) * (this._element.width / bBox.width));
    const y = Math.round((e.clientY - bBox.top) * (this._element.width / bBox.width));
    if ((x >= 0) && (x < this._element.width) && (y >= 0) && (y < this._element.height)) {
      this._mouseState.mousePosX = x;
      this._mouseState.mousePosY = this._element.height - 1 - y;
      inside = true;
    }
    return inside;
  }
}
