import { GameObject } from '../src';
import { RenderComponent, TransformComponent } from '../src/systems';
import { MovementComponent, MovementKeysComponent, RotationKeysComponent } from './shared';
import { KeyboardKeys } from '../src/input-system';
import { SpriteAnimation } from '../src/render-system';
import { AnimationType } from '../src/utils';

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

export class Portal extends GameObject {
  constructor() {
    super();
    this.components.push(new RenderComponent({
      color: [1, 1, 1, 0],
      sprite: { position: [130, 310, 0, 180] },
      texture: './assets/images/minion_sprite.png',
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

export class Collector extends GameObject {
  constructor() {
    super();
    this.components.push(new RenderComponent({
      color: [1, 1, 1, 0],
      sprite: { position: [315, 495, 0, 180] },
      texture: './assets/images/minion_sprite.png',
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

export class Minion extends GameObject {
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
  }
}

export class Hero extends GameObject {
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

export class Brain extends GameObject {
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
    this.components.push(new RotationKeysComponent({
      left: KeyboardKeys.Left,
      right: KeyboardKeys.Right,
    }));
  }
}
