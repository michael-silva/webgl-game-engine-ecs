import { GameObject } from '../src';
import { RenderComponent, TransformComponent, Material } from '../src/systems';
import { MovementComponent, MovementKeysComponent } from './shared';
import { KeyboardKeys } from '../src/input-system';
import { SpriteAnimation } from '../src/render-engine';
import { AnimationType } from '../src/utils';
import { RigidCircleComponent, RigidRectangleComponent } from '../src/collision-engine';

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
  constructor(x, y) {
    super();
    this.components.push(new RenderComponent({
      color: [1, 1, 1, 0],
      sprite: { position: [130, 310, 0, 180] },
      texture: './assets/images/minion_sprite.png',
    }));
    this.components.push(new TransformComponent({
      position: [x || 70, y || 30],
      size: [10, 10],
    }));
    this.components.push(new MovementComponent({ speed: 0.3 }));
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
  }
}
export class MinionMap extends GameObject {
  constructor({
    position: [x, y], z, size, noMap, isRigid,
  }) {
    super();
    this.components.push(new RenderComponent({
      color: [1, 1, 1, 0],
      texture: './assets/images/minion_sprite.png',
      normalMap: noMap ? null : './assets/images/minion_sprite_normal.png',
      sprite: {
        position: [0, 204, 348, 512],
        animation: Object.assign(new SpriteAnimation(), {
          numFrames: 5,
          width: 204,
          height: 164,
          top: 512,
          left: 0,
          animationType: AnimationType.AnimateSwing,
          updateInterval: 30,
        }),
      },
    }));
    this.components.push(new TransformComponent({
      position: [x, y],
      size: size || [18, 14.4],
      z,
    }));
    if (isRigid) {
      const speed = 5;
      const velocity = Math.random() > 0.5 ? [speed, 0] : [-speed, 0];
      const rigid = Math.random() > 0.5
        ? new RigidCircleComponent({
          radius: 6.5,
          mass: 2,
          friction: 0,
          velocity,
          acceleration: [0, 0],
          drawColor: [0, 1, 0, 1],
          drawBounds: true,
        })
        : new RigidRectangleComponent({
          width: 17,
          height: 14,
          mass: 2,
          friction: 0,
          velocity,
          acceleration: [0, 0],
          drawColor: [0, 1, 0, 1],
          drawBounds: true,
        });
      this.components.push(rigid);
    }
  }
}

export class Hero extends GameObject {
  constructor({
    keys = {}, position, size, z,
  } = {}) {
    super();
    this.components.push(new RenderComponent({
      color: [1, 1, 1, 0],
      texture: './assets/images/minion_sprite.png',
      sprite: { position: [0, 120, 0, 180] },
    }));
    this.components.push(new TransformComponent({
      position: position || [35, 50],
      size: size || [9, 12],
      z,
    }));
    this.components.push(new MovementComponent({ speed: 0.3 }));
    this.components.push(new MovementKeysComponent({
      right: KeyboardKeys.D,
      left: KeyboardKeys.A,
      up: KeyboardKeys.W,
      down: KeyboardKeys.S,
      ...keys,
    }));
  }
}

export class HeroMap extends GameObject {
  constructor({ position, size, z } = {}) {
    super();
    this.components.push(new RenderComponent({
      color: [1, 1, 1, 0],
      texture: './assets/images/minion_sprite.png',
      normalMap: './assets/images/minion_sprite_normal.png',
      sprite: { position: [0, 120, 0, 180] },
      material: new Material(),
    }));
    this.components.push(new TransformComponent({
      position: position || [15, 50],
      size: size || [18, 24],
      z,
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
  constructor({ speed = 0.05 } = {}) {
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
    this.components.push(new MovementComponent({ speed, direction: [0, 1] }));
  }
}

export class Platform extends GameObject {
  constructor({ position, size }) {
    super();
    this.components.push(new RenderComponent({
      color: [1, 1, 1, 0],
      texture: './assets/images/platform.png',
    }));
    this.components.push(new TransformComponent({
      position,
      size,
    }));
    const rigid = new RigidRectangleComponent({
      width: size[0], height: size[1] - 0.75, mass: 0, drawColor: [0, 1, 0, 1], drawBounds: true,
    });
    this.components.push(rigid);
  }
}

export class Wall extends GameObject {
  constructor({ position, size }) {
    super();
    this.components.push(new RenderComponent({
      color: [1, 1, 1, 0],
      texture: './assets/images/wall.png',
    }));
    this.components.push(new TransformComponent({
      position,
      size,
    }));
    const rigid = new RigidRectangleComponent({
      width: size[0] - 2, height: size[1], mass: 0, drawColor: [0, 1, 0, 1], drawBounds: true,
    });
    this.components.push(rigid);
  }
}
