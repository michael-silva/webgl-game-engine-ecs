import {
  BackgroundComponent, WorldCoordinateComponent,
  CameraEntity, ViewportComponent,
} from '../src/camera';
import {
  Hero, Platform, MinionMap,
} from './objects';
import {
  RotationKeysComponent, KeyboardMovementSystem,
  KeyboardRotationSystem, MovementSystem,
} from './shared';
import { KeyboardKeys } from '../src/input-system';
import { GameObject } from '../src';
import { RigidCircleComponent, CollisionUtils } from '../src/collision-engine';
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
    './assets/fonts/system-default-font.fnt',
  ]);

  // create a few objects ...
  let i; let rx; let ry; let obj;
  ry = Math.random() * 5 + 20;
  for (i = 0; i < 4; i++) {
    rx = 20 + Math.random() * 80;
    obj = new Hero({ position: [rx, ry], size: [18, 24] });
    obj.components.push(new RigidCircleComponent({
      radius: 9,
      drawBounds: true,
      drawColor: [0, 1, 0, 1],
    }));
    scene.addEntity(obj);

    rx = rx + 20 + Math.random() * 80;
    obj = new MinionMap({ position: [rx, ry], size: [18, 14.4], isRigid: true });
    scene.addEntity(obj);

    rx = 20 + Math.random() * 160;
    obj = new Platform({ position: [rx, ry], size: [30, 3.75] });
    scene.addEntity(obj);

    ry = ry + 20 + Math.random() * 10;
  }

  const minion = new MinionMap({ position: [rx, ry], size: [18, 14.4], isRigid: true });
  scene.addEntity(minion);

  const platform = new Platform({ position: [20, 30], size: [30, 3.75] });
  scene.addEntity(platform);

  const hero = new Hero({ position: [20, 30], size: [18, 24] });
  hero.components.push(new RigidCircleComponent({
    radius: 9,
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
      position: [2, 4],
      size: 3,
      color: [1, 0, 0, 1],
      font: './assets/fonts/system-default-font.fnt',
    }),
  );
  scene.addEntity(message);

  scene.use(new KeyboardMovementSystem());
  scene.use(new KeyboardRotationSystem());
  scene.use(new MovementSystem());
  scene.use(new CollisionSystem());
};
