import { GameObject } from '../src';
import { RenderComponent } from '../src/render-system';
import { TransformComponent } from '../src/systems';
import { AudioComponent } from '../src/audio-system';

export class Rectangle extends GameObject {
  constructor({
    color, texture, sprite, transform,
  }) {
    super();
    this.components = [
      new RenderComponent({ color, texture, sprite }),
      new TransformComponent(transform),
    ];
  }
}

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
      if (keyboard.pressedKeys[movementKeys.up]) movement.direction[1] = -1;
      if (keyboard.pressedKeys[movementKeys.down]) movement.direction[1] = 1;
      if (keyboard.pressedKeys[movementKeys.left]) movement.direction[0] = -1;
      if (keyboard.pressedKeys[movementKeys.right]) movement.direction[0] = 1;
    });
  }
}

export class MovementChangeLevelSystem {
  run({ entities }, { cameras, worlds }) {
    const [camera] = cameras;
    const MAX_X = camera.center[0] + camera.width / 2;
    const MIN_X = camera.center[0] - camera.width / 2;
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
