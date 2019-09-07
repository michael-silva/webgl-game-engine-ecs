import {
  MovementSystem, KeyboardMovementSystem, KeyboardRotationSystem,
  MovementComponent, RotationKeysComponent, CollisionComponent, CollisionSystem,
} from './shared';
import { GameObject } from '../src';
import {
  BoundingUtils, RenderUtils, TransformUtils,
} from '../src/utils';
import {
  TransformComponent, RenderComponent,
} from '../src/systems';
import {
  Minion, Hero, Brain,
} from './objects';
import { KeyboardKeys } from '../src/input-system';
import {
  CameraEntity, WorldCoordinateComponent, ViewportComponent, BackgroundComponent,
} from '../src/camera';

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
      const renderable = e.components.find((c) => c instanceof RenderComponent);
      const limit = e.components.find((c) => c instanceof MovementLimitComponent);
      if (!transform || !limit || !renderable) return;
      // if fly off to the left, re-appear at the right
      if (transform.position[0] < limit.minX) {
        transform.position[0] = limit.maxX;
        transform.position[1] = limit.maxY * Math.random();
        renderable.color[3] = 0;
      }
      else if (transform.position[0] > limit.maxX) {
        transform.position[0] = limit.minX;
        transform.position[1] = limit.maxY * Math.random();
        renderable.color[3] = 0;
      }
      if (transform.position[1] < limit.minY) {
        transform.position[1] = limit.maxY;
        transform.position[0] = limit.maxX * Math.random();
        renderable.color[3] = 0;
      }
      else if (transform.position[1] > limit.maxY) {
        transform.position[1] = limit.minY;
        transform.position[0] = limit.maxX * Math.random();
        renderable.color[3] = 0;
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
      color: [1, 1, 1, 0],
      texture: './assets/images/minion_sprite.png',
      sprite: { position: [510, 595, 23, 153] },
    }));
    this.components.push(new TransformComponent({
      position: [0, 0],
      size: [refWidth / 50, refHeight / 50],
    }));
  }
}

class DyePackTargetComponent {
  constructor({ id }) {
    if (!id) throw new Error('target id is undefined');
    this.id = id;
  }
}

class CollisionColorSystem {
  run({ entities }) {
    entities.forEach((e) => {
      const collision = e.components.find((c) => c instanceof CollisionComponent);
      const renderable = e.components.find((c) => c instanceof RenderComponent);
      if (!collision || !renderable) return;
      if (collision.pixelTouch && collision.color && !collision.renderColor) {
        collision.renderColor = renderable.color;
        renderable.color = collision.color;
      }
      else if (!collision.pixelTouch && collision.renderColor) {
        renderable.color = collision.renderColor;
        collision.renderColor = null;
      }
    });
  }
}

class TargetComponent {
  constructor({ id }) {
    if (!id) throw new Error('target id is undefined');
    this.id = id;
  }
}

class FollowTargetSystem {
  run({ entities }, scene, { renderState, resourceMap }) {
    const { gl } = renderState;
    entities.forEach((e) => {
      const transform = e.components.find((c) => c instanceof TransformComponent);
      const movement = e.components.find((c) => c instanceof MovementComponent);
      const renderable = e.components.find((c) => c instanceof RenderComponent);
      const target = e.components.find((c) => c instanceof TargetComponent);
      if (!transform || !movement || !target) return;
      const targetEntity = entities.find((et) => et.id === target.id);
      if (!targetEntity) return;
      const targetTransform = targetEntity.components.find((c) => c instanceof TransformComponent);
      const targetRenderable = targetEntity.components.find((c) => c instanceof RenderComponent);
      if (!targetTransform || !targetRenderable) return;
      const textureInfo = resourceMap[renderable.texture];
      const targetTextureInfo = resourceMap[targetRenderable.texture];
      if (!textureInfo || !textureInfo.loaded
        || !targetTextureInfo || !targetTextureInfo.loaded) return;
      const rate = 0.02; // graduate rate
      const isCollided = BoundingUtils.intersectsBound(targetTransform, transform)
        && this.getPixelTouch(
          gl,
          transform,
          renderable.sprite,
          textureInfo.asset,
          targetTransform,
          targetTextureInfo.asset,
          targetRenderable.sprite,
        );
      if (isCollided) {
        if (movement.speed !== 0) {
          movement.oldSpeed = movement.speed;
        }
        movement.speed = 0;
      }
      else {
        if (movement.speed === 0) {
          movement.speed = movement.oldSpeed;
        }
        const rotation = TransformUtils.rotateObjPointTo(
          transform.position,
          movement.direction,
          targetTransform.position,
          rate,
        );
        movement.direction = rotation.direction;
        transform.rotationInRadians += rotation.radians;
      }
    });
  }

  getPixelTouch(gl, transform, sprite, textureInfo, otherTransform, otherTextureInfo, otherSprite) {
    RenderUtils.readColorArray(gl, textureInfo);
    RenderUtils.readColorArray(gl, otherTextureInfo);
    return RenderUtils.pixelTouches(
      transform,
      textureInfo,
      sprite,
      otherTransform,
      otherTextureInfo,
      otherSprite,
    );
  }
}

class DyePackCollisionSystem {
  run({ entities }) {
    entities.forEach((e) => {
      const transform = e.components.find((c) => c instanceof TransformComponent);
      const renderable = e.components.find((c) => c instanceof RenderComponent);
      const touch = e.components.find((c) => c instanceof DyePackTargetComponent);
      if (!transform || !renderable || !touch) return;
      const targetEntity = entities.find((et) => et.id === touch.id);
      if (!targetEntity) return;
      const targetCollision = targetEntity.components.find((c) => c instanceof CollisionComponent);
      if (!targetCollision) return;
      if (targetCollision.pixelTouch) {
        transform.position = targetCollision.pixelTouch;
      }
      else {
        transform.position = [100, 100];
      }
    });
  }
}

export default (game) => {
  const scene = game.createScene();
  const camera = new CameraEntity();
  camera.components.push(new WorldCoordinateComponent({
    center: [50, 33],
    width: 100,
  }));
  camera.components.push(new ViewportComponent({
    array: [0, 0, 600, 400],
  }));
  camera.components.push(new BackgroundComponent());
  scene.addCamera(camera);

  scene.setResources([
    './assets/images/minion_sprite.png',
    './assets/fonts/system-default-font.fnt',
  ]);

  const maxMinions = 20;
  for (let i = 0; i < maxMinions; i++) {
    const randomY = Math.random() * 65;
    const randomX = Math.random() * 200;
    const minion = new Minion(randomX, randomY);
    minion.components.push(new MovementComponent({ speed: 0.2, direction: [-1, 0] }));
    minion.components.push(new MovementLimitComponent({
      minX: 0, maxX: 200, minY: 0, maxY: 65,
    }));
    minion.components.push(new CollisionComponent({ color: [1, 0, 0, 0.5] }));
    scene.addEntity(minion);
  }

  const hero = new Hero();
  hero.components.push(new CollisionComponent({ }));
  hero.components.push(new RotationKeysComponent({
    left: KeyboardKeys.Q,
    right: KeyboardKeys.E,
  }));
  scene.addEntity(hero);

  const brain = new Brain();
  brain.components.push(new CollisionComponent({ }));
  brain.components.push(new TargetComponent({ id: hero.id }));
  scene.addEntity(brain);

  const dyePack = new DyePack();
  dyePack.components.push(new DyePackTargetComponent({ id: brain.id }));
  scene.addEntity(dyePack);

  scene.use(new KeyboardMovementSystem());
  scene.use(new KeyboardRotationSystem());
  scene.use(new MovementSystem());
  scene.use(new MovementPortalSystem());
  scene.use(new FollowTargetSystem());
  scene.use(new CollisionSystem());
  scene.use(new CollisionColorSystem());
  scene.use(new DyePackCollisionSystem());
};
