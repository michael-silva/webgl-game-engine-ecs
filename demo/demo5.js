import { SpriteAnimation } from '../src/render-system';
import {
  MovementComponent, Rectangle, MovementKeysComponent,
  MovementSystem, KeyboardMovementSystem,
} from './shared';
import { CameraComponent, GameObject } from '../src';
import { Color, AnimationType } from '../src/utils';
import { TransformComponent, RenderComponent, TextComponent } from '../src/systems';
import { KeyboardKeys } from '../src/input-system';

class MovementLimitComponent {
  constructor({
    minX, maxX, minY, maxY,
  }) {
    this.minX = minX;
    this.maxX = maxX;
    this.minY = minY;
    this.maxY = maxY;
  }
}

class MovementPortalSystem {
  run({ entities }) {
    entities.forEach((e) => {
      const transform = e.components.find((c) => c instanceof TransformComponent);
      const limit = e.components.find((c) => c instanceof MovementLimitComponent);
      if (!transform || !limit) return;
      // if fly off to the left, re-appear at the right
      if (transform.position[0] < limit.minX) {
        transform.position[0] = limit.maxX;
        transform.position[1] = limit.maxY * Math.random();
      }
      else if (transform.position[0] > limit.maxX) {
        transform.position[0] = limit.minX;
        transform.position[1] = limit.maxY * Math.random();
      }
      if (transform.position[1] < limit.minY) {
        transform.position[1] = limit.maxY;
        transform.position[0] = limit.maxX * Math.random();
      }
      else if (transform.position[1] > limit.maxY) {
        transform.position[1] = limit.minY;
        transform.position[0] = limit.maxX * Math.random();
      }
    });
  }
}

class DyePack extends GameObject {
  constructor() {
    super();
    const refWidth = 80;
    const refHeight = 130;
    this.components.push(new RenderComponent({
      color: [1, 1, 1, 0.1],
      texture: './assets/images/minion_sprite.png',
      sprite: { position: [510, 595, 23, 153] },
    }));
    this.components.push(new TransformComponent({
      position: [50, 33],
      size: [refWidth / 50, refHeight / 50],
    }));
  }
}

class Hero extends GameObject {
  constructor() {
    super();
    this.components.push(new RenderComponent({
      color: [1, 1, 1, 0],
      texture: './assets/images/minion_sprite.png',
      sprite: { position: [0, 120, 0, 180] },
    }));
    this.components.push(new TransformComponent({
      position: [35, 50],
      size: [9, 12],
    }));
    this.components.push(new MovementComponent({ speed: 0.3 }));
    this.components.push(new MovementKeysComponent({
      right: KeyboardKeys.D,
      left: KeyboardKeys.A,
      up: KeyboardKeys.W,
      down: KeyboardKeys.S,
    }));
  }
}

class Minion extends GameObject {
  constructor(x, y) {
    super();
    this.components.push(new RenderComponent({
      color: [1, 1, 1, 0],
      texture: './assets/images/minion_sprite.png',
      sprite: {
        position: [0, 204, 348, 512],
        animation: Object.assign(new SpriteAnimation(), {
          numFrames: 5,
          width: 204,
          height: 164,
          top: 512,
          left: 0,
          animationType: AnimationType.AnimateSwing,
          updateInterval: 15,
        }),
      },
    }));
    this.components.push(new TransformComponent({
      position: [x, y],
      size: [12, 9.6],
    }));
    this.components.push(new MovementComponent({ speed: 0.2, direction: [-1, 0] }));
    this.components.push(new MovementLimitComponent({
      minX: 0, maxX: 100, minY: 0, maxY: 65,
    }));
  }
}

export default (game) => {
  const scene = game.createScene();
  const camera = new CameraComponent({
    center: [50, 33],
    width: 100,
    viewport: [0, 0, 600, 400],
  });
  scene.addCamera(camera);

  scene.setResources([
    './assets/images/minion_sprite.png',
    './assets/images/Consolas-72.png',
    './assets/fonts/system-default-font.fnt',
    './assets/fonts/Consolas-16.fnt',
    './assets/fonts/Consolas-24.fnt',
    './assets/fonts/Consolas-32.fnt',
    './assets/fonts/Consolas-72.fnt',
    './assets/fonts/Segment7-96.fnt',
  ]);

  const messageSys = new GameObject();
  messageSys.components.push(
    new TextComponent({
      content: 'Status Message',
      position: [1, 2],
      size: 3,
      color: [0, 0, 0, 1],
      font: './assets/fonts/system-default-font.fnt',
    }),
  );
  scene.addEntity(messageSys);

  const hero = new Hero();
  scene.addEntity(hero);

  const dyePack = new DyePack();
  scene.addEntity(dyePack);

  // create 5 minions at random Y values
  const maxMinions = 10;
  for (let i = 0; i < maxMinions; i++) {
    const randomY = Math.random() * 65;
    const randomX = Math.random() * 100;
    const minion = new Minion(randomX, randomY);
    scene.addEntity(minion);
  }

  scene.use(new KeyboardMovementSystem());
  scene.use(new MovementSystem());
  scene.use(new MovementPortalSystem());
};
