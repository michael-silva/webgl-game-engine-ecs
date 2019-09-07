/* eslint-disable max-classes-per-file */
import { vec2 } from 'gl-matrix';
import { TransformComponent, RenderComponent } from '../src/systems';
import { AudioComponent } from '../src/audio-system';
import { TransformUtils, BoundingUtils, RenderUtils } from '../src/utils';
import { WorldCoordinateComponent } from '../src/camera';

export class MovementComponent {
  constructor({ speed, direction }) {
    this.speed = speed;
    this.direction = direction || [0, 0];
  }
}

export class MovementKeysComponent {
  constructor({
    up, down, left, right,
  }) {
    this.up = up;
    this.down = down;
    this.left = left;
    this.right = right;
  }
}


export class MovementSystem {
  run({ entities }) {
    entities.forEach((e) => {
      const transform = e.components.find((c) => c instanceof TransformComponent);
      const movement = e.components.find((c) => c instanceof MovementComponent);
      if (!transform || !movement) return;
      const [x, y] = transform.position;
      const [dx, dy] = movement.direction;
      const mx = dx * movement.speed;
      const my = dy * movement.speed;
      transform.position = [x + mx, y + my];
    });
  }
}

export class KeyboardMovementSystem {
  run({ entities }, scene, { keyboard }) {
    entities.forEach((e) => {
      const movement = e.components.find((c) => c instanceof MovementComponent);
      const movementKeys = e.components.find((c) => c instanceof MovementKeysComponent);
      if (!movement || !movementKeys) return;
      movement.direction = [0, 0];
      if (keyboard.pressedKeys[movementKeys.up]) movement.direction[1] = 1;
      if (keyboard.pressedKeys[movementKeys.down]) movement.direction[1] = -1;
      if (keyboard.pressedKeys[movementKeys.left]) movement.direction[0] = -1;
      if (keyboard.pressedKeys[movementKeys.right]) movement.direction[0] = 1;
    });
  }
}

export class MovementChangeLevelSystem {
  run({ entities }, { cameras, worlds }) {
    const [camera] = cameras;
    const worldCoordinate = camera.components.find((c) => c instanceof WorldCoordinateComponent);
    const MAX_X = worldCoordinate.center[0] + worldCoordinate.width / 2;
    const MIN_X = worldCoordinate.center[0] - worldCoordinate.width / 2;
    let worldActiveIndex = worlds.findIndex((w) => w.active);
    entities.forEach((e) => {
      const transform = e.components.find((c) => c instanceof TransformComponent);
      const movement = e.components.find((c) => c instanceof MovementComponent);
      if (!transform || !movement) return;
      const [x] = transform.position;
      if (x > MAX_X || x < MIN_X) {
        // eslint-disable-next-line
        worlds[worldActiveIndex].active = false;
        if (++worldActiveIndex === worlds.length) worldActiveIndex = 0;
        // eslint-disable-next-line
        worlds[worldActiveIndex].active = true;
      }
    });
  }
}

export class MovementAudioSystem {
  run({ entities }) {
    entities.forEach((e) => {
      const movement = e.components.find((c) => c instanceof MovementComponent);
      const audio = e.components.find((c) => c instanceof AudioComponent);
      if (!movement || !audio) return;
      if (movement.direction[0] !== 0) {
        audio.play = true;
      }
    });
  }
}


export class RotationKeysComponent {
  constructor({ left, right }) {
    this.left = left;
    this.right = right;
    this.disabled = false;
  }
}

export class KeyboardRotationSystem {
  run({ entities }, scene, { keyboard }) {
    entities.forEach((e) => {
      const rotationKeys = e.components.find((c) => c instanceof RotationKeysComponent);
      const transform = e.components.find((c) => c instanceof TransformComponent);
      const movement = e.components.find((c) => c instanceof MovementComponent);
      if (!transform || !rotationKeys || !movement || rotationKeys.disabled) return;
      const delta = Math.PI * (1 / 180);
      if (keyboard.pressedKeys[rotationKeys.left]) {
        transform.rotationInRadians += delta;
        movement.direction = TransformUtils.rotate(movement.direction, delta);
      }
      else if (keyboard.pressedKeys[rotationKeys.right]) {
        transform.rotationInRadians -= delta;
        movement.direction = TransformUtils.rotate(movement.direction, -delta);
      }
    });
  }
}


export class CollisionComponent {
  constructor({ color }) {
    this.color = color;
  }
}

export class CollisionSystem {
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

export class Interpolation {
  get value() { return this._value; }

  set value(v) {
    this._value = v;
    this._finalValue = v;
    this._cyclesLeft = 0;
  }

  get nextValue() { return this._finalValue; }

  set nextValue(v) {
    this._finalValue = v;
    this._cyclesLeft = this._cycles;
  }

  constructor({ value, cycles, rate }) {
    this.value = value;
    this._cycles = cycles;
    this._rate = rate;
  }

  update() {
    if (this._cyclesLeft <= 0) return;
    this._cyclesLeft--;
    if (this._cyclesLeft === 0) this._value = this._finalValue;
    else this._interpolateValue();
  }

  _interpolateValue() {
    this._value += this._rate * (this._finalValue - this._value);
  }
}

export class InterpolationArray extends Interpolation {
  update() {
    if (this._cyclesLeft <= 0) return;
    this._cyclesLeft--;
    if (this._cyclesLeft === 0) this._value = this._finalValue;
    else this._interpolateValue();
  }

  _interpolateValue() {
    this._value = this._value
      .map((v, i) => this._value[i] + (this._rate * (this._finalValue[i] - this._value[i])));
  }
}
