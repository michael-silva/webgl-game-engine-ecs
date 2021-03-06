/* eslint-disable max-classes-per-file */
import {
  WorldCoordinateComponent,
  CameraEntity, ViewportComponent,
} from '@wge/core/camera';
import { KeyboardKeys, MouseButton } from '@wge/core/input-engine';
import { GameObject } from '@wge/core';
import {
  CollisionUtils, PhysicsSystem, RigidRectangleComponent, RigidCircleComponent,
} from '@wge/core/physics-system';
import {
  CameraUtils, TransformUtils, BoundingUtils, TransformComponent,
} from '@wge/core/utils';
import { RenderComponent, TextComponent } from '@wge/core/render-engine';
import {
  RotationKeysComponent,
  KeyboardRotationSystem, MovementKeysComponent, MovementComponent, MovementSystem,
} from './shared';
import {
  Hero, MinionMap,
} from './objects';


export class Platform extends GameObject {
  constructor({ position }) {
    super();
    this.components.push(new RenderComponent({
      color: [1, 1, 1, 0],
      texture: './assets/images/platform.png',
    }));
    this.components.push(new TransformComponent({
      position,
      size: [30, 3.75],
    }));
    const rigid = new RigidRectangleComponent({
      width: 30, height: 3.0, mass: 0, drawColor: [0, 1, 0, 1], drawBounds: true,
    });
    this.components.push(rigid);
  }
}

export class Wall extends GameObject {
  constructor({ position }) {
    super();
    this.components.push(new RenderComponent({
      color: [1, 1, 1, 0],
      texture: './assets/images/wall.png',
    }));
    this.components.push(new TransformComponent({
      position,
      size: [4, 16],
    }));
    const rigid = new RigidRectangleComponent({
      width: 2, height: 16, mass: 0, drawColor: [0, 1, 0, 1], drawBounds: true,
    });
    this.components.push(rigid);
  }
}

export class DyePack extends GameObject {
  constructor({ position }) {
    super();
    this.components.push(new RenderComponent({
      color: [1, 1, 1, 0],
      texture: './assets/images/dye_pack.png',
    }));
    this.components.push(new TransformComponent({
      position,
      size: [4, 3],
    }));
    const rigid = new RigidCircleComponent({
      radius: 1.5, mass: 0.1, acceleration: [0, 0], drawColor: [0, 1, 0, 1], drawBounds: true,
    });
    this.components.push(rigid);
  }
}


export class CollisionSystem {
  run({ entities }) {
    const tuples = [];
    entities.forEach((e) => {
      const transform = e.components.find((c) => c instanceof TransformComponent);
      const rigid = e.components.find((c) => c.rigidType >= 0);
      if (!transform || !rigid) return;
      rigid.drawColor = [0, 1, 0, 1];
      tuples.push([transform, rigid]);
    });
    tuples.forEach((e, i) => {
      const [transform, rigid] = e;
      for (let j = i + 1; j < tuples.length; j++) {
        const [otherTransform, otherRigid] = tuples[j];
        if (CollisionUtils.collidedShapes(rigid, transform, otherRigid, otherTransform)) {
          rigid.drawColor = [1, 0, 0, 1];
          otherRigid.drawColor = [1, 0, 0, 1];
        }
      }
    });
  }
}

class KeyboardPhysicsMovementSystem {
  run({ entities }, { inputState }) {
    const { keyboard } = inputState;
    entities.forEach((e) => {
      const rigid = e.components.find((c) => c.rigidType >= 0);
      const movementKeys = e.components.find((c) => c instanceof MovementKeysComponent);
      if (!rigid || !movementKeys) return;
      if (keyboard.pressedKeys[movementKeys.up]) rigid.velocity[1] += 2;
      if (keyboard.pressedKeys[movementKeys.down]) rigid.velocity[1] -= 2;
      if (keyboard.pressedKeys[movementKeys.left]) rigid.velocity[0] -= 1;
      if (keyboard.pressedKeys[movementKeys.right]) rigid.velocity[0] += 1;
    });
  }
}


class LifeSpanComponent {
  constructor({ cycles }) {
    this.cycles = cycles;
  }
}

class TargetComponent {

}

class PointTargetComponent {
  constructor({ targetId }) {
    this.targetId = targetId;
  }
}

class MouseObjectsCreationSystem {
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
      if (keyboard.pressedKeys[KeyboardKeys.Z]) {
        const obj = new MinionMap({ position, size: [18, 14.4], isRigid: true });
        world.entities.push(obj);
      }
      else {
        const target = world.entities
          .find((e) => e.components.some((c) => c instanceof TargetComponent));
        const dyePack = new DyePack({ position });
        dyePack.components.push(new MovementComponent({ speed: 0.5, direction: [1, 0] }));
        dyePack.components.push(new LifeSpanComponent({ cycles: 300 }));
        dyePack.components.push(new PointTargetComponent({ targetId: target.id }));
        world.entities.push(dyePack);
      }
    }
  }
}

class LifespanSystem {
  run({ entities }) {
    entities.forEach((e) => {
      const life = e.components.find((c) => c instanceof LifeSpanComponent);
      if (!life) return;
      life.cycles--;
      if (life.cycles < 0) {
        e.destroy();
      }
    });
  }
}

class MouseMoveRigidShapesSystem {
  run({ entities }, { inputState, cameras }) {
    const { mouse, keyboard } = inputState;
    if (keyboard.pressedKeys[KeyboardKeys.X]) {
      const camera = cameras.find((c) => !c.disabled);
      const worldCoordinate = camera.components.find((c) => c instanceof WorldCoordinateComponent);
      const viewport = camera.components.find((c) => c instanceof ViewportComponent);
      if (!viewport || !worldCoordinate) return;
      if (!CameraUtils.isMouseInViewport(viewport.array, mouse)) return;
      const position = CameraUtils.getMouseWorldCoordinate(
        viewport.array, worldCoordinate, mouse,
      );
      for (let i = entities.length - 1; i > 0; i--) {
        const transform = entities[i].components.find((c) => c instanceof TransformComponent);
        const shape = entities[i].components.find((c) => c.rigidType >= 0);
        // eslint-disable-next-line no-continue
        if (!transform || !shape) continue;
        if (CollisionUtils.containsPos(shape, transform, position)) {
          transform.position = [...position];
        }
      }
    }
  }
}

class PhysicsControlSystem {
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

class PointTargetSystem {
  run({ entities }) {
    entities.forEach((e) => {
      const transform = e.components.find((c) => c instanceof TransformComponent);
      const pointTarget = e.components.find((c) => c instanceof PointTargetComponent);
      const movement = e.components.find((c) => c instanceof MovementComponent);
      if (!pointTarget || !transform || !movement) return;
      const target = entities.find((t) => t.id === pointTarget.targetId);
      if (!target) return;
      const targetTransform = target.components.find((c) => c instanceof TransformComponent);
      if (!targetTransform) return;
      const isCollided = BoundingUtils.intersectsBound(targetTransform, transform);
      if (isCollided) {
        e.destroy();
      }
      else {
        const rotation = TransformUtils.rotateObjPointTo(
          transform.position,
          movement.direction,
          targetTransform.position,
          0.8,
        );
        movement.direction = rotation.direction;
        transform.rotationInRadians += rotation.radians;
      }
    });
  }
}

export default (game) => {
  const scene = game.createScene();
  const world = scene.createWorld();
  scene.setGlobalLight({ ambientColor: [0.8, 0.8, 0.8, 1] });
  const camera = new CameraEntity();
  camera.components.push(new WorldCoordinateComponent({
    center: [100, 56.25],
    width: 200,
  }));
  camera.components.push(new ViewportComponent({
    array: [0, 0, 1280, 720],
  }));
  game.addCamera(camera);

  scene.setResources([
    './assets/images/bg.png',
    './assets/images/minion_sprite.png',
    './assets/images/dye_pack.png',
    './assets/images/platform.png',
    './assets/images/wall.png',
    './assets/fonts/system-default-font.fnt',
  ]);

  // create a few objects ...
  let i; let j; let rx; let ry; let obj; let dy;
  const dx = 80;
  ry = Math.random() * 5 + 20;
  for (i = 0; i < 4; i++) {
    rx = 20 + Math.random() * 160;
    obj = new MinionMap({ position: [rx, ry], size: [18, 14.4], isRigid: true });
    world.addEntity(obj);

    for (j = 0; j < 2; j++) {
      rx = 20 + (j * dx) + Math.random() * dx;
      dy = 10 * Math.random() - 5;
      obj = new Platform({ position: [rx, ry + dy] });
      world.addEntity(obj);
    }

    ry = ry + 20 + Math.random() * 10;
  }

  // the floor and ceiling
  rx = -15;
  for (i = 0; i < 9; i++) {
    obj = new Platform({ position: [rx, 2] });
    world.addEntity(obj);
    obj = new Platform({ position: [rx, 112] });
    world.addEntity(obj);
    rx += 30;
  }

  // the left and right walls
  ry = 12;
  for (i = 0; i < 8; i++) {
    obj = new Wall({ position: [5, ry] });
    world.addEntity(obj);

    obj = new Wall({ position: [195, ry] });
    world.addEntity(obj);
    ry += 16;
  }

  const hero = new Hero({ position: [16, 22], size: [18, 24], speed: -1 });
  hero.components.push(new TargetComponent());
  hero.components.push(new RigidRectangleComponent({
    mass: 0.7,
    restitution: 0.3,
    width: 16,
    height: 22,
    drawBounds: true,
    acceleration: [0, -50],
    drawColor: [0, 1, 0, 1],
  }));
  hero.components.push(new RotationKeysComponent({
    left: KeyboardKeys.Q,
    right: KeyboardKeys.E,
  }));
  world.addEntity(hero);

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

  scene.use(new LifespanSystem());
  scene.use(new KeyboardPhysicsMovementSystem());
  scene.use(new KeyboardRotationSystem());
  scene.use(new MouseObjectsCreationSystem());
  scene.use(new MouseMoveRigidShapesSystem());
  scene.use(new PointTargetSystem());
  scene.use(new MovementSystem());
  scene.use(new PhysicsControlSystem());
  scene.use(new PhysicsSystem());
};
