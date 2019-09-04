/* eslint-disable max-classes-per-file */

import { SpriteAnimation } from '../src/render-system';
import {
  MovementComponent, MovementKeysComponent,
  MovementSystem, KeyboardMovementSystem, RotationKeysComponent, KeyboardRotationSystem,
} from './shared';
import { CameraComponent, GameObject } from '../src';
import { AnimationType, TransformUtils, BoundingUtils } from '../src/utils';
import {
  TransformComponent, RenderComponent, TextComponent, CameraUtils,
} from '../src/systems';
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

class UpdateSpeedComponent {
  constructor({ delta }) {
    this.delta = delta;
  }
}

class BrainModeComponent {
  constructor({ mode }) {
    this.mode = mode;
  }
}

class Brain extends GameObject {
  constructor() {
    super();
    this.components.push(new RenderComponent({
      color: [1, 1, 1, 0],
      texture: './assets/images/minion_sprite.png',
      sprite: { position: [600, 700, 0, 180] },
    }));
    this.components.push(new TransformComponent({
      position: [50, 10],
      size: [3, 5.4],
    }));
    this.components.push(new MovementComponent({ speed: 0.05, direction: [0, 1] }));
    this.components.push(new UpdateSpeedComponent({ delta: 0.01 }));
    this.components.push(new RotationKeysComponent({
      left: KeyboardKeys.Left,
      right: KeyboardKeys.Right,
    }));
    this.components.push(new BrainModeComponent({ mode: 'H' }));
  }
}

class BrainTargetComponent {
  constructor({ component }) {
    this.component = component;
  }
}

class BrainModeSystem {
  run({ entities }, scene, { keyboard }) {
    entities.forEach((e) => {
      const rotationKeys = e.components.find((c) => c instanceof RotationKeysComponent);
      const transform = e.components.find((c) => c instanceof TransformComponent);
      const movement = e.components.find((c) => c instanceof MovementComponent);
      const brainMode = e.components.find((c) => c instanceof BrainModeComponent);
      if (!transform || !rotationKeys || !movement || !brainMode) return;
      const target = entities
        .find((e2) => e2.components.find((c) => c instanceof BrainTargetComponent));
      if (!target) return;
      const targetTransform = target.components.find((c) => c instanceof TransformComponent);
      if (!targetTransform) return;
      let rate = 1;
      switch (brainMode.mode) {
        default:
        case 'H':
          rotationKeys.disabled = false; // player steers with arrow keys
          break;
        case 'K':
          rate = 0.02; // graduate rate
          // When "K" is typed, the following should also be executed.
        // eslint-disable-next-line
        case 'J':
          // stop brain when touches hero
          if (BoundingUtils.intersectsBound(targetTransform, transform)) {
            if (movement.speed !== 0) {
              movement.oldSpeed = movement.speed;
            }
            movement.speed = 0;
          }
          else {
            if (movement.speed === 0) {
              movement.speed = movement.oldSpeed;
            }
            // eslint-disable-next-line
            const rotation = TransformUtils.rotateObjPointTo(
              transform.position,
              movement.direction,
              targetTransform.position,
              rate,
            );
            movement.direction = rotation.direction;
            transform.rotationInRadians += rotation.radians;
            rotationKeys.disabled = true;
          }
          break;
      }
      if (keyboard.pressedKeys[KeyboardKeys.H]) { brainMode.mode = 'H'; }
      if (keyboard.pressedKeys[KeyboardKeys.J]) { brainMode.mode = 'J'; }
      if (keyboard.pressedKeys[KeyboardKeys.K]) { brainMode.mode = 'K'; }
    });
  }
}

class TextTrackBrainModeSystem {
  run({ entities }, { cameras }) {
    entities.forEach((e) => {
      const text = e.components.find((c) => c instanceof TextComponent);
      const brainMode = e.components.find((c) => c instanceof BrainModeComponent);
      if (!text || !brainMode) return;
      const target = entities
        .find((e2) => e2.components.find((c) => c instanceof BrainTargetComponent));
      if (!target) return;
      const targetTransform = target.components.find((c) => c instanceof TransformComponent);
      if (!targetTransform) return;
      // Check for hero going outside 80% of the WC Window bound
      const camTransform = CameraUtils.getTransform(cameras[0]);
      const cameraArea = TransformUtils.resize(camTransform, 0.8);
      const status = BoundingUtils.boundCollideStatus(targetTransform, cameraArea);
      text.content = `[H:keys, J:immediate, K:gradual]: ${brainMode.mode} [Hero bound=${status}]`;
    });
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


  const hero = new Hero();
  hero.components.push(new BrainTargetComponent({ component: TransformComponent }));
  scene.addEntity(hero);

  const dyePack = new DyePack();
  scene.addEntity(dyePack);

  const brain = new Brain();
  brain.components.push(
    new TextComponent({
      content: 'Status Message',
      position: [1, 2],
      size: 3,
      color: [0, 0, 0, 1],
      font: './assets/fonts/system-default-font.fnt',
    }),
  );
  scene.addEntity(brain);

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
  scene.use(new KeyboardRotationSystem());
  scene.use(new BrainModeSystem());
  scene.use(new TextTrackBrainModeSystem());
};
