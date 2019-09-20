/* eslint-disable max-classes-per-file */

import { GameEngine } from '../src';
import { KeyboardKeys } from '../src/input-system';
import { SoundSystem } from '../src/audio-system';
import { ImageLoader, AudioLoader } from '../src/resources-system';
import initDemo1 from './demo1';
import initDemo2 from './demo2';
import initDemo3 from './demo3';
import initDemo4 from './demo4';
import initDemo5 from './demo5';
import initDemo6 from './demo6';
import initDemo7 from './demo7';
import initDemo8 from './demo8';
import initDemo9 from './demo9';
import initDemo10 from './demo10';
import { FontLoader } from '../src/systems';

export class KeyboardChangeDemoSystem {
  constructor(canvas) {
    this.canvas = canvas;
  }

  run(game) {
    const { inputState: { keyboard } } = game;
    if (keyboard.pressedKeys[KeyboardKeys.Shift]) {
      if (keyboard.pressedKeys[KeyboardKeys.One]) {
        this.changeScene(game, 8);
      }
      if (keyboard.pressedKeys[KeyboardKeys.Two]) {
        this.changeScene(game, 9);
      }
      if (keyboard.pressedKeys[KeyboardKeys.Three]) {
        this.changeScene(game, 10);
      }
      if (keyboard.pressedKeys[KeyboardKeys.Four]) {
        this.changeScene(game, 11);
      }
      if (keyboard.pressedKeys[KeyboardKeys.Five]) {
        this.changeScene(game, 12);
      }
      if (keyboard.pressedKeys[KeyboardKeys.Six]) {
        this.changeScene(game, 13);
      }
      if (keyboard.pressedKeys[KeyboardKeys.Seven]) {
        this.changeScene(game, 14);
      }
      if (keyboard.pressedKeys[KeyboardKeys.Eight]) {
        this.changeScene(game, 15);
      }
    }
    else {
      if (keyboard.pressedKeys[KeyboardKeys.One]) {
        this.changeScene(game, 0);
      }
      if (keyboard.pressedKeys[KeyboardKeys.Two]) {
        this.changeScene(game, 1);
      }
      if (keyboard.pressedKeys[KeyboardKeys.Three]) {
        this.changeScene(game, 2);
      }
      if (keyboard.pressedKeys[KeyboardKeys.Four]) {
        this.changeScene(game, 3);
      }
      if (keyboard.pressedKeys[KeyboardKeys.Five]) {
        this.changeScene(game, 4);
      }
      if (keyboard.pressedKeys[KeyboardKeys.Six]) {
        this.changeScene(game, 5);
      }
      if (keyboard.pressedKeys[KeyboardKeys.Seven]) {
        this.changeScene(game, 6);
      }
      if (keyboard.pressedKeys[KeyboardKeys.Eight]) {
        this.changeScene(game, 7);
      }
    }
  }

  changeScene(game, number) {
    // eslint-disable-next-line no-param-reassign
    game.currentScene = number;
    this.canvas.width = number > 7 ? 1280 : 640;
    this.canvas.height = number > 7 ? 720 : 480;
  }
}

function main() {
  const canvas = document.querySelector('#canvas');

  const game = new GameEngine(canvas, { bgColor: [0.9, 0.9, 0.9, 1] });
  game.mapLoader({ pattern: /(\.png|\.jpg)$/, loader: new ImageLoader() });
  game.mapLoader({ pattern: /(\.mp3|\.wav)$/, loader: new AudioLoader() });
  game.mapLoader({ pattern: /\.fnt$/, loader: new FontLoader() });
  game.useBefore(new KeyboardChangeDemoSystem(canvas));
  fetch('assets/scenes/demo1/scene.json')
    .then((res) => res.json())
    .then((data) => {
      initDemo1(game);
      initDemo2(game, data);
      initDemo3(game);
      initDemo4(game);
      initDemo5(game);
      initDemo6(game);
      initDemo7(game);
      initDemo8(game);
      initDemo9(game);
      initDemo10(game);

      game.useAfter(new SoundSystem());
      game.run({ scene: 9 });
      canvas.width = 1280;
      canvas.height = 720;
    });
}

window.addEventListener('load', main);
