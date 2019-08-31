/* eslint-disable max-classes-per-file */

import { GameEngine } from '../src';
import { KeyboardKeys } from '../src/input-system';
import { SoundSystem } from '../src/audio-system';
import { ImageLoader, AudioLoader } from '../src/resources-system';
import initDemo1 from './demo1';
import initDemo2 from './demo2';
import initDemo3 from './demo3';
import initDemo4 from './demo4';
import { FontLoader } from '../src/systems';

export class KeyboardChangeDemoSystem {
  run(game) {
    const { keyboard } = game;
    if (keyboard.pressedKeys[KeyboardKeys.One]) {
      // eslint-disable-next-line no-param-reassign
      game.currentScene = 0;
    }
    if (keyboard.pressedKeys[KeyboardKeys.Two]) {
      // eslint-disable-next-line no-param-reassign
      game.currentScene = 1;
    }
    if (keyboard.pressedKeys[KeyboardKeys.Three]) {
      // eslint-disable-next-line no-param-reassign
      game.currentScene = 2;
    }
  }
}

function main() {
  const canvas = document.querySelector('#canvas');

  const game = new GameEngine(canvas, { bgColor: [0.9, 0.9, 0.9, 1] });
  game.mapLoader({ pattern: /(\.png|\.jpg)$/, loader: new ImageLoader() });
  game.mapLoader({ pattern: /(\.mp3|\.wav)$/, loader: new AudioLoader() });
  game.mapLoader({ pattern: /\.fnt$/, loader: new FontLoader() });
  game.useBefore(new KeyboardChangeDemoSystem());
  fetch('assets/scenes/demo1/scene.json')
    .then((res) => res.json())
    .then((data) => {
      initDemo1(game);
      initDemo2(game, data);
      initDemo3(game);
      initDemo4(game);

      game.useAfter(new SoundSystem());
      game.start();
      // eslint-disable-next-line
      game._game.currentScene = 3
    });
}

window.addEventListener('load', main);
