import {
  BackgroundComponent, WorldCoordinateComponent,
  CameraEntity, ViewportComponent,
} from '../src/camera';
import {
  Hero, Platform, MinionMap, Wall,
} from './objects';
import {
  RotationKeysComponent, KeyboardMovementSystem,
  KeyboardRotationSystem, MovementSystem,
} from './shared';
import { KeyboardKeys } from '../src/input-system';
import { GameObject } from '../src';
import {
  CollisionUtils, PhysicsSystem, RigidRectangleComponent,
} from '../src/collision-engine';
import { TextComponent, TransformComponent } from '../src/systems';

export class CollisionSystem {
  run({ entities }) {
    const tuples = [];
    entities.forEach((e) => {
      const transform = e.components.find((c) => c instanceof TransformComponent);
      const rigid = e.components.find((c) => c.rigidType >= 0);
      if (!transform || !rigid) return;
      rigid.drawColor = [0, 1, 0, 1];
      tuples.push([transform, rigid]);
    });
    tuples.forEach((e, i) => {
      const [transform, rigid] = e;
      for (let j = i + 1; j < tuples.length; j++) {
        const [otherTransform, otherRigid] = tuples[j];
        if (CollisionUtils.collidedShapes(rigid, transform, otherRigid, otherTransform)) {
          rigid.drawColor = [1, 0, 0, 1];
          otherRigid.drawColor = [1, 0, 0, 1];
        }
      }
    });
  }
}

export default (game, canvas) => {
  // eslint-disable-next-line no-param-reassign
  canvas.width = 1280;
  // eslint-disable-next-line no-param-reassign
  canvas.height = 720;
  const scene = game.createScene();
  scene.setGlobalLight({ ambientColor: [0.8, 0.8, 0.8, 1] });
  const camera = new CameraEntity();
  camera.components.push(new WorldCoordinateComponent({
    center: [100, 56.25],
    width: 200,
  }));
  camera.components.push(new ViewportComponent({
    array: [0, 0, 1280, 720],
  }));
  camera.components.push(new BackgroundComponent({
    color: [0.8, 0.8, 0.8, 0],
  }));
  scene.addCamera(camera);

  scene.setResources([
    './assets/images/bg.png',
    './assets/images/minion_sprite.png',
    './assets/images/platform.png',
    './assets/images/wall.png',
    './assets/fonts/system-default-font.fnt',
  ]);

  // create a few objects ...
  let i; let j; let rx; let ry; let obj; let dy;
  const dx = 80;
  ry = Math.random() * 5 + 20;
  for (i = 0; i < 4; i++) {
    rx = 20 + Math.random() * 160;
    obj = new MinionMap({ position: [rx, ry], size: [18, 14.4], isRigid: true });
    scene.addEntity(obj);

    for (j = 0; j < 2; j++) {
      rx = 20 + (j * dx) + Math.random() * dx;
      dy = 10 * Math.random() - 5;
      obj = new Platform({ position: [rx, ry + dy], size: [30, 3.75] });
      scene.addEntity(obj);
    }

    ry = ry + 20 + Math.random() * 10;
  }

  // the floor and ceiling
  rx = -15;
  for (i = 0; i < 9; i++) {
    obj = new Platform({ position: [rx, 2], size: [30, 3.75] });
    scene.addEntity(obj);
    obj = new Platform({ position: [rx, 112], size: [30, 3.75] });
    scene.addEntity(obj);
    rx += 30;
  }

  // the left and right walls
  ry = 12;
  for (i = 0; i < 8; i++) {
    obj = new Wall({ position: [5, ry], size: [4, 16] });
    scene.addEntity(obj);

    obj = new Wall({ position: [195, ry], size: [4, 16] });
    scene.addEntity(obj);
    ry += 16;
  }

  const hero = new Hero({ position: [16, 22], size: [18, 24] });
  hero.components.push(new RigidRectangleComponent({
    mass: 0.7,
    restitution: 0.3,
    width: 16,
    height: 22,
    drawBounds: true,
    drawColor: [0, 1, 0, 1],
  }));
  hero.components.push(new RotationKeysComponent({
    left: KeyboardKeys.Q,
    right: KeyboardKeys.E,
  }));
  scene.addEntity(hero);

  const message = new GameObject();
  message.components.push(
    new TextComponent({
      content: 'Status Message',
      position: [10, 110],
      size: 3,
      color: [1, 1, 1, 1],
      font: './assets/fonts/system-default-font.fnt',
    }),
  );
  scene.addEntity(message);

  scene.use(new KeyboardMovementSystem());
  scene.use(new KeyboardRotationSystem());
  scene.use(new MovementSystem());
  scene.use(new PhysicsSystem());
};
