import { GameEngine } from '@wge/core';
import { FontLoader } from '@wge/core/systems';
import { AudioLoader, ImageLoader } from '@wge/core/resources-system';
import initPong from './pong';

function main() {
  const canvas = document.querySelector('#canvas');

  const game = new GameEngine(canvas, { bgColor: [0.3, 0.3, 0.3, 1] });
  game.mapLoader({ pattern: /(\.png|\.jpg)$/, loader: new ImageLoader() });
  game.mapLoader({ pattern: /(\.mp3|\.wav)$/, loader: new AudioLoader() });
  game.mapLoader({ pattern: /\.fnt$/, loader: new FontLoader() });
  initPong(game);
  game.run();
}

window.addEventListener('load', main);
