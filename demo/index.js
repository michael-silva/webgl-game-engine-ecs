import { GameEngine } from '@wge/core';
import initMenu from './menu';

function main() {
  const canvas = document.querySelector('#canvas');

  const game = new GameEngine(canvas, { bgColor: [0.9, 0.9, 0.9, 1] });
  initMenu(game);
}

window.addEventListener('load', main);
