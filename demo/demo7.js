/* eslint-disable max-classes-per-file */

import {
  MovementSystem, KeyboardMovementSystem, KeyboardRotationSystem,
  MovementComponent, RotationKeysComponent, MovementKeysComponent,
  Interpolation, InterpolationArray,
} from './shared';
import {
  BoundingUtils, RenderUtils, TransformUtils, CameraUtils,
} from '../src/utils';
import {
  TransformComponent, RenderComponent,
} from '../src/systems';
import {
  Minion, Hero, Brain, Portal,
} from './objects';
import { KeyboardKeys } from '../src/input-system';
import {
  BackgroundComponent, ViewportComponent, WorldCoordinateComponent, CameraEntity,
} from '../src/camera';

class WorldCoordinateInterpolation {
  constructor(props) {
    Object.assign(this, props);
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

class ClampAtBoundaryComponent {
  constructor({ camIndex, zone }) {
    this.camIndex = camIndex;
    this.zone = zone;
  }
}

class CameraBoundarySystem {
  run({ entities }, { cameras }) {
    cameras.forEach((camera, i) => {
      const worldCoordinate = camera.components.find((c) => c instanceof WorldCoordinateComponent);
      const viewport = camera.components.find((c) => c instanceof ViewportComponent);
      if (!worldCoordinate || !viewport) return;
      entities.forEach((e) => {
        const transform = e.components.find((c) => c instanceof TransformComponent);
        const boundary = e.components.find((c) => c instanceof ClampAtBoundaryComponent);
        if (!transform || !boundary || boundary.camIndex !== i) return;
        const { zone } = boundary;
        const wcTransform = CameraUtils.getWcTransform(worldCoordinate, viewport, zone);
        const status = BoundingUtils.boundCollideStatus(wcTransform, transform);
        if (!BoundingUtils.isInside(status)) {
          const pos = transform.position;
          const [left, right, bottom, top] = status;
          if (top !== 0) {
            pos[1] = wcTransform.position[1]
              + (wcTransform.size[1] / 2) - (transform.size[1] / 2);
          }
          if (bottom !== 0) {
            pos[1] = wcTransform.position[1]
              - (wcTransform.size[1] / 2) + (transform.size[1] / 2);
          }
          if (right !== 0) {
            pos[0] = wcTransform.position[0]
              + (wcTransform.size[0] / 2) - (transform.size[0] / 2);
          }
          if (left !== 0) {
            pos[0] = wcTransform.position[0]
              - (wcTransform.size[0] / 2) + (transform.size[0] / 2);
          }
          transform.position = [pos[0], pos[1]];
        }
      });
    });
  }
}

class CameraPanComponent {
  constructor({ camIndex, zone }) {
    this.camIndex = camIndex;
    this.zone = zone;
  }
}

class CameraPanSystem {
  run({ entities }, { cameras }) {
    cameras.forEach((camera, i) => {
      const worldCoordinate = camera.components.find((c) => c instanceof WorldCoordinateComponent);
      const wcInterpolation = camera.components
        .find((c) => c instanceof WorldCoordinateInterpolation);
      const viewport = camera.components.find((c) => c instanceof ViewportComponent);
      if (!worldCoordinate || !wcInterpolation || !viewport) return;
      entities.forEach((e) => {
        const transform = e.components.find((c) => c instanceof TransformComponent);
        const pan = e.components.find((c) => c instanceof CameraPanComponent);
        if (!transform || !pan || pan.camIndex !== i) return;
        const { zone } = pan;
        const wcTransform = CameraUtils.getWcTransform(worldCoordinate, viewport, zone);
        const collideStatus = BoundingUtils.boundCollideStatus(wcTransform, transform);
        if (!BoundingUtils.isInside(collideStatus)) {
          const newCenter = [...wcTransform.position];
          const [collideLeft, collideRight, collideBottom, collideTop] = collideStatus;
          if (collideTop !== 0) {
            newCenter[1] = transform.position[1]
              - (wcTransform.size[1] / 2) + (transform.size[1] / 2);
          }
          if (collideBottom !== 0) {
            newCenter[1] = transform.position[1]
              + (wcTransform.size[1] / 2) - (transform.size[1] / 2);
          }
          if (collideRight !== 0) {
            newCenter[0] = transform.position[0]
              - (wcTransform.size[0] / 2) + (transform.size[0] / 2);
          }
          if (collideLeft !== 0) {
            newCenter[0] = transform.position[0]
              + (wcTransform.size[0] / 2) - (transform.size[0] / 2);
          }
          wcInterpolation.center.value = newCenter;
        }
      });
    });
  }
}

class FocusAtComponent {
  constructor({ options }) {
    this.options = options;
  }
}

class CameraFocusComponent {
  constructor({
    id, zoomDelta, zoomOutKey, zoomInKey, zoomTowardOutKey, zoomTowardInKey,
  }) {
    this.id = id;
    this.zoomDelta = zoomDelta;
    this.zoomOutKey = zoomOutKey;
    this.zoomInKey = zoomInKey;
    this.zoomTowardOutKey = zoomTowardOutKey;
    this.zoomTowardInKey = zoomTowardInKey;
  }
}

class CameraControlSystem {
  run({ entities }, { cameras }, { keyboard }) {
    cameras.forEach((camera) => {
      const worldCoordinate = camera.components.find((c) => c instanceof WorldCoordinateComponent);
      const wcInterpolation = camera.components
        .find((c) => c instanceof WorldCoordinateInterpolation);
      const focused = camera.components.find((c) => c instanceof CameraFocusComponent);
      const focusAt = camera.components.find((c) => c instanceof FocusAtComponent);
      if (!worldCoordinate || !wcInterpolation || !focusAt || !focused) return;

      if (focused.id) {
        const focusEntity = entities.find((e) => e.id === focused.id);
        const focusTransform = focusEntity.components.find((c) => c instanceof TransformComponent);
        if (keyboard.clickedKeys[focused.zoomTowardOutKey]) {
          const newWc = CameraUtils.zoomTowards(worldCoordinate,
            focusTransform.position, 1 - focused.zoomDelta);
          wcInterpolation.width.nextValue = newWc.width;
          wcInterpolation.center.nextValue = newWc.center;
        }
        if (keyboard.clickedKeys[focused.zoomTowardInKey]) {
          const newWc = CameraUtils.zoomTowards(worldCoordinate,
            focusTransform.position, 1 + focused.zoomDelta);
          wcInterpolation.width.nextValue = newWc.width;
          wcInterpolation.center.nextValue = newWc.center;
        }
      }

      if (keyboard.clickedKeys[focused.zoomOutKey]) {
        const wcWidth = CameraUtils.zoomBy(worldCoordinate, 1 - focused.zoomDelta);
        wcInterpolation.width.nextValue = wcWidth;
      }
      if (keyboard.clickedKeys[focused.zoomInKey]) {
        const wcWidth = CameraUtils.zoomBy(worldCoordinate, 1 + focused.zoomDelta);
        wcInterpolation.width.nextValue = wcWidth;
      }

      focusAt.options.forEach((option) => {
        if (keyboard.clickedKeys[option.key]) {
          focused.id = option.entityId;
          const entity = entities.find((e) => e.id === focused.id);
          const transform = entity.components.find((c) => c instanceof TransformComponent);
          wcInterpolation.center.nextValue = transform.position;
        }
      });
    });
  }
}

class InterpolationSystem {
  run(world, { cameras }) {
    cameras.forEach((camera) => {
      const worldCoordinate = camera.components.find((c) => c instanceof WorldCoordinateComponent);
      const wcInterpolation = camera.components
        .find((c) => c instanceof WorldCoordinateInterpolation);
      if (!worldCoordinate || !wcInterpolation) return;
      wcInterpolation.center.update();
      wcInterpolation.width.update();
      worldCoordinate.center = wcInterpolation.center.value;
      worldCoordinate.width = wcInterpolation.width.value;
    });
  }
}

export default (game) => {
  const scene = game.createScene();
  const camera = new CameraEntity();
  camera.components.push(new WorldCoordinateComponent({
    center: [50, 37.5],
    width: 100,
  }));
  camera.components.push(new WorldCoordinateInterpolation({
    center: new InterpolationArray({ value: [50, 37.5], cycles: 300, rate: 0.1 }),
    width: new Interpolation({ value: 100, cycles: 300, rate: 0.1 }),
  }));
  camera.components.push(new ViewportComponent({
    array: [0, 0, 640, 480],
  }));
  camera.components.push(new CameraFocusComponent({
    zoomDelta: 0.1,
    zoomInKey: KeyboardKeys.M,
    zoomOutKey: KeyboardKeys.N,
    zoomTowardInKey: KeyboardKeys.J,
    zoomTowardOutKey: KeyboardKeys.K,
  }));
  camera.components.push(new BackgroundComponent({
    size: [150, 150],
    position: [150, 150],
    texture: './assets/images/bg.png',
  }));
  scene.addCamera(camera);

  scene.setResources([
    './assets/images/minion_sprite.png',
    './assets/fonts/system-default-font.fnt',
  ]);

  const minionLeft = new Minion(30, 30);
  scene.addEntity(minionLeft);
  const minionRight = new Minion(70, 30);
  scene.addEntity(minionRight);

  const portal = new Portal(50, 30);
  portal.components.push(new MovementKeysComponent({
    right: KeyboardKeys.Right,
    left: KeyboardKeys.Left,
    up: KeyboardKeys.Up,
    down: KeyboardKeys.Down,
  }));
  portal.components.push(new ClampAtBoundaryComponent({ camIndex: 0, zone: 0.8 }));
  scene.addEntity(portal);

  const hero = new Hero();
  hero.components.push(new CameraPanComponent({ camIndex: 0, zone: 0.9 }));
  hero.components.push(new RotationKeysComponent({
    left: KeyboardKeys.Q,
    right: KeyboardKeys.E,
  }));
  scene.addEntity(hero);

  const brain = new Brain({ speed: 0.1 });
  brain.components.push(new ClampAtBoundaryComponent({ camIndex: 0, zone: 0.9 }));
  brain.components.push(new TargetComponent({ id: hero.id }));
  scene.addEntity(brain);

  camera.components.push(new FocusAtComponent({
    options: [{
      entityId: minionLeft.id,
      key: KeyboardKeys.Z,
    },
    {
      entityId: minionRight.id,
      key: KeyboardKeys.X,
    },
    {
      entityId: portal.id,
      key: KeyboardKeys.C,
    },
    {
      entityId: hero.id,
      key: KeyboardKeys.V,
    }],
  }));

  scene.use(new InterpolationSystem());
  scene.use(new KeyboardMovementSystem());
  scene.use(new KeyboardRotationSystem());
  scene.use(new MovementSystem());
  scene.use(new FollowTargetSystem());
  scene.use(new CameraControlSystem());
  scene.use(new CameraBoundarySystem());
  scene.use(new CameraPanSystem());
};
