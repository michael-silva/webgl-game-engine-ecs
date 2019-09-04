/* eslint-disable max-classes-per-file */

import { vec2 } from 'gl-matrix';
import {
  MovementComponent, MovementKeysComponent,
  MovementSystem, KeyboardMovementSystem, KeyboardRotationSystem, RotationKeysComponent,
} from './shared';
import { CameraComponent, GameObject } from '../src';
import {
  BoundingUtils, RenderUtils,
} from '../src/utils';
import {
  TransformComponent, RenderComponent,
} from '../src/systems';
import { KeyboardKeys } from '../src/input-system';


class DyePack extends GameObject {
  constructor() {
    super();
    const refWidth = 80;
    const refHeight = 130;
    this.components.push(new RenderComponent({
      color: [1, 1, 1, 1],
      texture: './assets/images/minion_sprite.png',
      sprite: { position: [510, 595, 23, 153] },
    }));
    this.components.push(new TransformComponent({
      position: [0, 0],
      size: [refWidth / 50, refHeight / 50],
    }));
  }
}

class Portal extends GameObject {
  constructor() {
    super();
    this.components.push(new RenderComponent({
      color: [1, 1, 1, 0],
      texture: './assets/images/minion_portal.png',
    }));
    this.components.push(new TransformComponent({
      position: [70, 30],
      size: [10, 10],
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

class Collector extends GameObject {
  constructor() {
    super();
    this.components.push(new RenderComponent({
      color: [1, 1, 1, 0],
      texture: './assets/images/minion_collector.png',
    }));
    this.components.push(new TransformComponent({
      position: [50, 30],
      size: [30, 30],
    }));
    this.components.push(new MovementComponent({ speed: 0.3 }));
    this.components.push(new MovementKeysComponent({
      right: KeyboardKeys.Right,
      left: KeyboardKeys.Left,
      up: KeyboardKeys.Up,
      down: KeyboardKeys.Down,
    }));
  }
}

class CollisionComponent {
  constructor({ dyeRef }) {
    this.dyeRef = dyeRef;
  }
}

class TouchComponent {
  pixelTouch = null;
}

class DyePackCollisionSystem {
  run({ entities }) {
    entities.forEach((e) => {
      const touch = e.components.find((c) => c instanceof TouchComponent);
      const renderable = e.components.find((c) => c instanceof RenderComponent);
      const transform = e.components.find((c) => c instanceof TransformComponent);
      if (!touch || !renderable || !transform) return;
      renderable.color[3] = touch.pixelTouch ? 0.1 : 0;
      transform.position = touch.pixelTouch || [0, 0];
    });
  }
}

class CollisionSystem {
  run({ entities }, scene, { resourceMap, renderState }) {
    const { gl } = renderState;
    entities.forEach((e, i) => {
      const transform = e.components.find((c) => c instanceof TransformComponent);
      const rendeable = e.components.find((c) => c instanceof RenderComponent);
      const collision = e.components.find((c) => c instanceof CollisionComponent);
      if (!transform || !collision || !rendeable || !rendeable.texture
        || !resourceMap[rendeable.texture] || !resourceMap[rendeable.texture].loaded) return;
      const textureInfo = resourceMap[rendeable.texture].asset;
      for (let j = i + 1; j < entities.length; j++) {
        const otherTransform = entities[j].components.find((c) => c instanceof TransformComponent);
        const otherRenderable = entities[j].components.find((c) => c instanceof RenderComponent);
        const otherCollision = entities[j].components.find((c) => c instanceof CollisionComponent);
        if (!otherTransform || !otherRenderable || !otherCollision || !otherRenderable.texture
          || !resourceMap[otherRenderable.texture]
          // eslint-disable-next-line
          || !resourceMap[otherRenderable.texture].loaded) continue;
        const dyeCollision = collision.dyeRef.components
          .find((c) => c instanceof TouchComponent);
        const odyeCollision = otherCollision.dyeRef.components
          .find((c) => c instanceof TouchComponent);
        dyeCollision.pixelTouch = null;
        odyeCollision.pixelTouch = null;
        const otherTextureInfo = resourceMap[otherRenderable.texture].asset;
        if (transform.rotationInRadians === 0 && otherTransform.rotationInRadians === 0) {
          if (BoundingUtils.intersectsBound(transform, otherTransform)) {
            const pixelTouch = this.getPixelTouch(
              gl,
              transform,
              textureInfo,
              otherTransform,
              otherTextureInfo,
            );
            dyeCollision.pixelTouch = pixelTouch;
            odyeCollision.pixelTouch = pixelTouch;
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
            const pixelTouch = this.getPixelTouch(
              gl,
              transform,
              textureInfo,
              otherTransform,
              otherTextureInfo,
            );
            dyeCollision.pixelTouch = pixelTouch;
            odyeCollision.pixelTouch = pixelTouch;
          }
        }
      }
    });
  }

  getPixelTouch(gl, transform, textureInfo, otherTransform, otherTextureInfo) {
    RenderUtils.readColorArray(gl, textureInfo);
    RenderUtils.readColorArray(gl, otherTextureInfo);
    return RenderUtils.pixelTouches(
      transform,
      textureInfo,
      otherTransform,
      otherTextureInfo,
    );
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
    './assets/images/minion_portal.png',
    './assets/images/minion_collector.png',
    './assets/fonts/system-default-font.fnt',
  ]);

  const dyePack = new DyePack();
  dyePack.components.push(new TouchComponent());

  const portal = new Portal();
  portal.components.push(new CollisionComponent({ dyeRef: dyePack }));
  portal.components.push(new RotationKeysComponent({
    left: KeyboardKeys.Q,
    right: KeyboardKeys.E,
  }));
  scene.addEntity(portal);

  const collector = new Collector();
  collector.components.push(new RotationKeysComponent({
    left: KeyboardKeys.X,
    right: KeyboardKeys.Z,
  }));
  collector.components.push(new CollisionComponent({ dyeRef: dyePack }));
  scene.addEntity(collector);

  // to draw in front
  scene.addEntity(dyePack);

  scene.use(new KeyboardMovementSystem());
  scene.use(new KeyboardRotationSystem());
  scene.use(new MovementSystem());
  scene.use(new CollisionSystem());
  scene.use(new DyePackCollisionSystem());
};
