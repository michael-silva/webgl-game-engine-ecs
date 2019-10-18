/* eslint-disable max-classes-per-file */
import {
  WorldCoordinateComponent,
  CameraEntity, ViewportComponent,
} from '@wge/core/camera';
import { KeyboardKeys, MouseButton } from '@wge/core/input-engine';
import { GameObject } from '@wge/core';
import {
  PhysicsSystem, RigidRectangleComponent, RigidCircleComponent,
} from '@wge/core/physics-system';
import {
  CameraUtils, TransformComponent,
} from '@wge/core/utils';
import { RenderComponent, TextComponent } from '@wge/core/render-engine';

export class BouncyBall extends GameObject {
  constructor({ position }) {
    super();
    const vx = (Math.random() - 0.5);
    const vy = (Math.random() - 0.5);
    const speed = 20 + Math.random() * 10;
    const velocity = [vx * speed, vy * speed];
    const size = 5;
    this.components.push(new RenderComponent({
      color: [1, 1, 1, 0],
      texture: './assets/images/Ball.png',
    }));
    this.components.push(new TransformComponent({
      position,
      size: [size, size],
    }));
    const rigid = new RigidCircleComponent({
      velocity,
      radius: size / 2,
      mass: 1,
      restitution: 0.9,
      friction: 0.7,
      drawColor: [0, 1, 0, 1],

    });
    this.components.push(rigid);
  }
}

export class SoccerBall extends GameObject {
  constructor({ position, enabled }) {
    super();
    const vx = (Math.random() - 0.5);
    const vy = (Math.random() - 0.5);
    const speed = 20 + Math.random() * 10;
    const velocity = [vx * speed, vy * speed];
    const size = 10;
    this.components.push(new RenderComponent({
      color: [1, 1, 1, 0],
      texture: './assets/images/SoccerBall.png',
    }));
    this.components.push(new TransformComponent({
      position,
      size: [size, size],
    }));
    const rigid = new RigidCircleComponent({
      velocity,
      radius: size / 2,
      mass: 1,
      restitution: 0.7,
      friction: 0.6,
      drawColor: [0, 1, 0, 1],

    });
    if (enabled) {
      rigid.enabled = true;
      rigid.drawBounds = true;
    }
    this.components.push(rigid);
  }
}

export class Rock extends GameObject {
  constructor({ position }) {
    super();
    const vx = (Math.random() - 0.5);
    const vy = (Math.random() - 0.5);
    const speed = 20 + Math.random() * 10;
    const velocity = [vx * speed, vy * speed];
    const size = 10;
    this.components.push(new RenderComponent({
      color: [1, 1, 1, 0],
      texture: './assets/images/Rock.png',
    }));
    this.components.push(new TransformComponent({
      position,
      size: [size, size],
    }));
    const rigid = new RigidRectangleComponent({
      velocity,
      width: size,
      height: size,
      mass: 20,
      restitution: 0.4,
      friction: 0.8,
      drawColor: [0, 1, 0, 1],

    });
    this.components.push(rigid);
  }
}

export class IceBlock extends GameObject {
  constructor({ position }) {
    super();
    const vx = (Math.random() - 0.5);
    const vy = (Math.random() - 0.5);
    const speed = 20 + Math.random() * 10;
    const velocity = [vx * speed, vy * speed];
    const size = 10;
    this.components.push(new RenderComponent({
      color: [1, 1, 1, 0],
      texture: './assets/images/Ice.png',
    }));
    this.components.push(new TransformComponent({
      position,
      size: [size, size],
    }));
    const rigid = new RigidRectangleComponent({
      velocity,
      width: size,
      height: size,
      mass: 1,
      restitution: 0.4,
      friction: 0.01,
      drawColor: [0, 1, 0, 1],

    });
    this.components.push(rigid);
  }
}

export class WoodBall extends GameObject {
  constructor({ position }) {
    super();
    const vx = (Math.random() - 0.5);
    const vy = (Math.random() - 0.5);
    const speed = 20 + Math.random() * 10;
    const velocity = [vx * speed, vy * speed];
    const size = 8;
    this.components.push(new RenderComponent({
      color: [1, 1, 1, 0],
      texture: './assets/images/WoodBall.png',
    }));
    this.components.push(new TransformComponent({
      position,
      size: [size, size],
    }));
    const rigid = new RigidCircleComponent({
      velocity,
      radius: size / 2,
      mass: 1,
      restitution: 0.5,
      friction: 0.5,
      drawColor: [0, 1, 0, 1],

    });
    this.components.push(rigid);
  }
}

export class BowlingBall extends GameObject {
  constructor({ position }) {
    super();
    const vx = (Math.random() - 0.5);
    const vy = (Math.random() - 0.5);
    const speed = 20 + Math.random() * 10;
    const velocity = [vx * speed, vy * speed];
    const size = 8;
    this.components.push(new RenderComponent({
      color: [1, 1, 1, 0],
      texture: './assets/images/BowlingBall.png',
    }));
    this.components.push(new TransformComponent({
      position,
      size: [size, size],
    }));
    const rigid = new RigidCircleComponent({
      velocity,
      radius: size / 2,
      mass: 10,
      restitution: 0.3,
      friction: 0.2,
      drawColor: [0, 1, 0, 1],

    });
    this.components.push(rigid);
  }
}

export class Wood extends GameObject {
  constructor({ position, horizontal }) {
    super();
    const height = horizontal ? 5 : 56.25;
    const width = horizontal ? 85 : 5;
    this.components.push(new RenderComponent({
      color: [1, 1, 1, 0],
      texture: './assets/images/Wood.png',
    }));
    this.components.push(new TransformComponent({
      position, size: [width, height],
    }));
    const rigid = new RigidRectangleComponent({
      width,
      height,
      mass: 0,
      restitution: 0.8,
      friction: 0.5,
      drawColor: [0, 1, 0, 1],

    });
    this.components.push(rigid);
  }
}

export class Ice extends GameObject {
  constructor({ position, horizontal }) {
    super();
    const height = horizontal ? 5 : 56.25;
    const width = horizontal ? 85 : 5;
    this.components.push(new RenderComponent({
      color: [1, 1, 1, 0],
      texture: './assets/images/Ice.png',
    }));
    this.components.push(new TransformComponent({
      position, size: [width, height],
    }));
    const rigid = new RigidRectangleComponent({
      width,
      height,
      mass: 0,
      restitution: 0.8,
      friction: 0.01,
      drawColor: [0, 1, 0, 1],

    });
    this.components.push(rigid);
  }
}

export class Dirt extends GameObject {
  constructor({ position, horizontal }) {
    super();
    const height = horizontal ? 5 : 56.25;
    const width = horizontal ? 85 : 5;
    this.components.push(new RenderComponent({
      color: [1, 1, 1, 0],
      texture: './assets/images/Dirt.png',
    }));
    this.components.push(new TransformComponent({
      position, size: [width, height],
    }));
    const rigid = new RigidRectangleComponent({
      width,
      height,
      mass: 0,
      restitution: 0.3,
      friction: 0.7,
      drawColor: [0, 1, 0, 1],

    });
    this.components.push(rigid);
  }
}

export class Mud extends GameObject {
  constructor({ position, horizontal }) {
    super();
    const height = horizontal ? 5 : 56.25;
    const width = horizontal ? 85 : 5;
    this.components.push(new RenderComponent({
      color: [1, 1, 1, 0],
      texture: './assets/images/Mud.png',
    }));
    this.components.push(new TransformComponent({
      position, size: [width, height],
    }));
    const rigid = new RigidRectangleComponent({
      width,
      height,
      mass: 0,
      restitution: 0.01,
      friction: 0.1,
      drawColor: [0, 1, 0, 1],

    });
    this.components.push(rigid);
  }
}

class KeyboardPhysicsMovementSystem {
  constructor() {
    console.log('# Use keys [AWSD] to move the selected solid object');
  }

  run({ entities }, { inputState }) {
    const { keyboard } = inputState;
    entities.forEach((e) => {
      const rigid = e.components.find((c) => c.rigidType >= 0);
      if (!rigid || !rigid.enabled) return;
      if (keyboard.pressedKeys[KeyboardKeys.W]) rigid.velocity[1] += 2;
      if (keyboard.pressedKeys[KeyboardKeys.S]) rigid.velocity[1] -= 2;
      if (keyboard.pressedKeys[KeyboardKeys.A]) rigid.velocity[0] -= 1;
      if (keyboard.pressedKeys[KeyboardKeys.D]) rigid.velocity[0] += 1;
    });
  }
}

class EnableMovementSystem {
  constructor() {
    console.log('# Press [Z/X] to navigate between solid objects');
  }

  run({ entities }, { inputState }) {
    const { keyboard } = inputState;
    let step = 0;
    if (keyboard.clickedKeys[KeyboardKeys.Z]) step = -1;
    if (keyboard.clickedKeys[KeyboardKeys.X]) step = 1;
    if (step === 0) return;
    const rigids = entities
      .map((e) => e.components.find((c) => c.rigidType >= 0 && c.invMass > 0))
      .filter(Boolean);
    for (let i = 0; i < rigids.length; i++) {
      const rigid = rigids[i];
      if (rigid.enabled) {
        rigid.enabled = false;
        rigid.drawBounds = false;
        const j = Math.max(0, Math.min(rigids.length - 1, i + step));
        rigids[j].enabled = true;
        rigids[j].drawBounds = true;
        break;
      }
    }
  }
}

class MouseObjectsCreationSystem {
  constructor() {
    const keys = ['P', 'O', 'I', 'U', 'Y', 'T'];
    const names = ['bouncy ball', 'rock', 'soccer ball', 'wood ball', 'ice block', 'bowling ball'];
    keys.forEach((k, i) => console.log(`# Hold the ${k} key and click to create a new ${names[i]}`));
  }

  run(world, { inputState, cameras }) {
    const { mouse, keyboard } = inputState;
    if (mouse.clickedButtons[MouseButton.Left]) {
      const camera = cameras.find((c) => !c.disabled);
      const worldCoordinate = camera.components.find((c) => c instanceof WorldCoordinateComponent);
      const viewport = camera.components.find((c) => c instanceof ViewportComponent);
      if (!viewport || !worldCoordinate) return;
      if (!CameraUtils.isMouseInViewport(viewport.array, mouse)) return;
      const position = CameraUtils.getMouseWorldCoordinate(
        viewport.array, worldCoordinate, mouse,
      );
      if (keyboard.pressedKeys[KeyboardKeys.P]) {
        const ball = new BouncyBall({ position });
        world.entities.push(ball);
      }
      if (keyboard.pressedKeys[KeyboardKeys.O]) {
        const rock = new Rock({ position });
        world.entities.push(rock);
      }
      if (keyboard.pressedKeys[KeyboardKeys.I]) {
        const ball = new SoccerBall({ position });
        world.entities.push(ball);
      }
      if (keyboard.pressedKeys[KeyboardKeys.U]) {
        const ball = new WoodBall({ position });
        world.entities.push(ball);
      }
      if (keyboard.pressedKeys[KeyboardKeys.Y]) {
        const block = new IceBlock({ position });
        world.entities.push(block);
      }
      if (keyboard.pressedKeys[KeyboardKeys.T]) {
        const rock = new BowlingBall({ position });
        world.entities.push(rock);
      }
    }
  }
}

class PhysicsControlSystem {
  constructor() {
    console.log('# Press Spacebar to inject a random speed to all objects');
  }

  run({ entities }, { inputState }) {
    const { keyboard } = inputState;
    if (keyboard.pressedKeys[KeyboardKeys.Space]) {
      entities.forEach((e) => {
        const transform = e.components.find((c) => c instanceof TransformComponent);
        const shape = e.components.find((c) => c.rigidType >= 0);
        if (!shape || !transform || shape.invMass === 0) return;
        // Give all rigid shape a random velocity
        shape.velocity[0] += (Math.random() - 0.5) * 10;
        shape.velocity[1] += (Math.random() - 0.5) * 10;
      });
    }
  }
}

export default (game) => {
  const scene = game.createScene();
  const world = scene.createWorld();
  scene.setGlobalLight({ ambientColor: [0.8, 0.8, 0.8, 1] });
  const camera = new CameraEntity();
  camera.components.push(new WorldCoordinateComponent({
    center: [92.5, 56.25],
    width: 200,
  }));
  camera.components.push(new ViewportComponent({
    array: [0, 0, 1280, 720],
  }));
  game.addCamera(camera);

  scene.setResources([
    './assets/images/Dirt.png',
    './assets/images/Ice.png',
    './assets/images/Mud.png',
    './assets/images/Wood.png',
    './assets/images/SoccerBall.png',
    './assets/images/BowlingBall.png',
    './assets/images/Rock.png',
    './assets/images/Ball.png',
    './assets/images/WoodBall.png',
    './assets/fonts/system-default-font.fnt',
  ]);

  const wood1 = new Wood({ position: [0, 84] });
  world.addEntity(wood1);
  const wood2 = new Wood({ position: [89, 84] });
  world.addEntity(wood2);
  const wood3 = new Wood({ position: [44.5, 109.75], horizontal: true });
  world.addEntity(wood3);
  const wood4 = new Wood({ position: [44.5, 58.5], horizontal: true });
  world.addEntity(wood4);
  const dirt1 = new Dirt({ position: [94, 84] });
  world.addEntity(dirt1);
  const dirt2 = new Dirt({ position: [183, 84] });
  world.addEntity(dirt2);
  const dirt3 = new Dirt({ position: [138.5, 109.75], horizontal: true });
  world.addEntity(dirt3);
  const dirt4 = new Dirt({ position: [138.5, 58.5], horizontal: true });
  world.addEntity(dirt4);
  const ice1 = new Ice({ position: [0, 28] });
  world.addEntity(ice1);
  const ice2 = new Ice({ position: [89, 28] });
  world.addEntity(ice2);
  const ice3 = new Ice({ position: [44.5, 53.75], horizontal: true });
  world.addEntity(ice3);
  const ice4 = new Ice({ position: [44.5, 2.5], horizontal: true });
  world.addEntity(ice4);
  const mud1 = new Mud({ position: [94, 28] });
  world.addEntity(mud1);
  const mud2 = new Mud({ position: [183, 28] });
  world.addEntity(mud2);
  const mud3 = new Mud({ position: [138.5, 53.75], horizontal: true });
  world.addEntity(mud3);
  const mud4 = new Mud({ position: [138.5, 2.5], horizontal: true });
  world.addEntity(mud4);

  const ball1 = new BouncyBall({ position: [30, 84] });
  world.addEntity(ball1);
  const rock1 = new Rock({ position: [40, 74] });
  world.addEntity(rock1);

  const ball2 = new SoccerBall({ position: [30, 34], enabled: true });
  world.addEntity(ball2);
  const rock2 = new Rock({ position: [40, 24] });
  world.addEntity(rock2);

  const ball3 = new WoodBall({ position: [120, 84] });
  world.addEntity(ball3);
  const rock3 = new IceBlock({ position: [130, 74] });
  world.addEntity(rock3);

  const ball4 = new BouncyBall({ position: [120, 34] });
  world.addEntity(ball4);
  const rock4 = new BowlingBall({ position: [130, 24] });
  world.addEntity(rock4);

  const message = new GameObject();
  message.components.push(
    new TextComponent({
      content: 'Status Message',
      position: [10, 110],
      size: 3,
      color: [1, 1, 1, 1],
      font: './assets/fonts/system-default-font.fnt',
    }),
  );
  world.addEntity(message);

  scene.use(new KeyboardPhysicsMovementSystem());
  scene.use(new EnableMovementSystem());
  scene.use(new MouseObjectsCreationSystem());
  scene.use(new PhysicsControlSystem());
  scene.use(new PhysicsSystem());
};
