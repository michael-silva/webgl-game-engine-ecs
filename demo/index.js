import { GameEngine, GameObject, CameraComponent } from '../src';
import { Color } from '../src/utils';
import { RenderComponent, TransformComponent } from '../src/systems';

export class Rectangle extends GameObject {
  constructor({ color, transform }) {
    super();
    this.components = [
      new RenderComponent({ color }),
      new TransformComponent(transform),
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

  const game = new GameEngine(canvas, { bgColor: [0.9, 0.9, 0.9, 1] });
  const camera = new CameraComponent({
    center: [20, 60],
    width: 20,
    viewport: [20, 40, 600, 300],
  });
  game.addCamera(camera);

  const blueTransform = new TransformComponent({
    position: [20, 60],
    size: [5, 5],
    rotationInRadians: 0.2,
  });
  const blueRect = new Rectangle({ color: Color.Blue, transform: blueTransform });
  game.addEntity(blueRect);
  const redTransform = new TransformComponent({
    position: [20, 60],
    size: [2, 2],
  });
  const redRect = new Rectangle({
    color: Color.Red,
    transform: redTransform,
  });
  game.addEntity(redRect);


  const topRight = new Rectangle({
    color: Color.Green,
    transform: new TransformComponent({ position: [30, 65], size: [1, 1] }),
  });
  game.addEntity(topRight);
  const topLeft = new Rectangle({
    color: Color.Green,
    transform: new TransformComponent({ position: [10, 65], size: [1, 1] }),
  });
  game.addEntity(topLeft);
  const bottomRight = new Rectangle({
    color: Color.Green,
    transform: new TransformComponent({ position: [30, 55], size: [1, 1] }),
  });
  game.addEntity(bottomRight);
  const bottomLeft = new Rectangle({
    color: Color.Green,
    transform: new TransformComponent({ position: [10, 55], size: [1, 1] }),
  });
  game.addEntity(bottomLeft);

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
