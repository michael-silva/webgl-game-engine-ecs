import { GameEngine, GameObject } from '../src';
import { Color } from '../src/utils';
import { RenderComponent } from '../src/systems';

export class Rectangle extends GameObject {
  constructor(color) {
    super();
    this.components = [
      new RenderComponent({ color }),
    ];
  }
}

export class CustomSystem {
  run() {
    console.log('custom run');
  }
}

function main() {
  const canvas = document.querySelector('#canvas');

  const game = new GameEngine(canvas);
  const rect = new Rectangle(Color.Red);
  game.addEntity(rect);
  game.use(new CustomSystem());
  game.start();

  /*
  const game = new GameEngine(canvas);
  const rect = new Rectangle(Color.Red);
  const scene = new GameScene()
  scene.addEntity(rect);
  game.addScene(scene);
  game.use(new CustomSystem());
  game.start();
  */
}

window.addEventListener('load', main);
