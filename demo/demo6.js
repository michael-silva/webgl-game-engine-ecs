/* eslint-disable max-classes-per-file */
import { vec2 } from 'gl-matrix';
import {
  MovementSystem, KeyboardMovementSystem, KeyboardRotationSystem,
  MovementComponent, RotationKeysComponent,
} from './shared';
import { CameraComponent, GameObject } from '../src';
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

class CollisionComponent {
  constructor({ color }) {
    this.color = color;
  }
}

class DyePackTargetComponent {
  constructor({ id }) {
    if (!id) throw new Error('target id is undefined');
    this.id = id;
  }
}

class CollisionSystem {
  run({ entities }, scene, { resourceMap, renderState }) {
    const { gl } = renderState;
    const tuples = [];
    entities.forEach((e) => {
      const transform = e.components.find((c) => c instanceof TransformComponent);
      const renderable = e.components.find((c) => c instanceof RenderComponent);
      const collision = e.components.find((c) => c instanceof CollisionComponent);
      if (!transform || !collision || !renderable || !renderable.texture
        || !resourceMap[renderable.texture] || !resourceMap[renderable.texture].loaded) return;
      collision.pixelTouch = null;
      tuples.push([transform, renderable, collision]);
    });
    tuples.forEach((e, i) => {
      const [transform, renderable, collision] = e;
      const textureInfo = resourceMap[renderable.texture].asset;
      for (let j = i + 1; j < tuples.length; j++) {
        const [otherTransform, otherRenderable, otherCollision] = tuples[j];
        const otherTextureInfo = resourceMap[otherRenderable.texture].asset;
        let pixelTouch = null;
        if (transform.rotationInRadians === 0 && otherTransform.rotationInRadians === 0) {
          if (BoundingUtils.intersectsBound(transform, otherTransform)) {
            pixelTouch = this.getPixelTouch(
              gl,
              transform,
              renderable.sprite,
              textureInfo,
              otherTransform,
              otherTextureInfo,
              otherRenderable.sprite,
            );
          }
        }
        else {
          const { size } = transform;
          const otherSize = otherTransform.size;
          const radius = Math.sqrt(0.5 * size[0] * 0.5 * size[0] + 0.5 * size[1] * 0.5 * size[1]);
          const otherRadius = Math.sqrt(0.5 * otherSize[0] * 0.5 * otherSize[0]
                                   + 0.5 * otherSize[1] * 0.5 * otherSize[1]);
          const d = [];
          vec2.sub(d, transform.position, otherTransform.position);
          if (vec2.length(d) < (radius + otherRadius)) {
            pixelTouch = this.getPixelTouch(
              gl,
              transform,
              renderable.sprite,
              textureInfo,
              otherTransform,
              otherTextureInfo,
              otherRenderable.sprite,
            );
          }
        }

        if (pixelTouch) {
          collision.pixelTouch = pixelTouch;
          otherCollision.pixelTouch = pixelTouch;
        }
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
  const camera = new CameraComponent({
    center: [50, 33],
    width: 100,
    viewport: [0, 0, 600, 400],
  });
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
    minion.id = i.toString();
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
  scene.use(new DyePackCollisionSystem());
  scene.use(new CollisionColorSystem());
  scene.use(new DyePackCollisionSystem());
};
