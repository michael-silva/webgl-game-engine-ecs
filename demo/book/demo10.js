/* eslint-disable max-classes-per-file */
import { vec4 } from 'gl-matrix';
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
  CameraUtils, TransformUtils, BoundingUtils, TransformComponent, RenderUtils,
} from '@wge/core/utils';
import { RenderComponent, TextComponent, ParticleRenderComponent } from '@wge/core/render-engine';
import {
  ParticleLifecycleComponent, ParticlePhysicsSystem, ParticleUpdateSystem,
  ParticleShapeComponent, ParticleEmitterSystem, ParticleEmitterComponent,
} from '@wge/core/particles-system';
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
  static SHAPE_GROUP = 'dyepacks';

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
      radius: 1.5,
      mass: 0.1,
      acceleration: [0, 0],
      drawColor: [0, 1, 0, 1],
      drawBounds: true,
      group: DyePack.SHAPE_GROUP,
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

class Particle extends GameObject {
  constructor({
    position,
    size,
    velocity,
    sizeDelta,
    cyclesToLive,
  } = {}) {
    super();
    this.components.push(new ParticleRenderComponent({
      color: [1, 0, 0, 1],
      texture: './assets/images/particle.png',
    }));
    this.components.push(new TransformComponent({
      position,
      size,
    }));
    this.components.push(new ParticleLifecycleComponent({
      cyclesToLive,
      sizeDelta,
    }));
    this.components.push(new ParticleShapeComponent({
      velocity,
    }));
  }
}

class MouseObjectsCreationSystem {
  run(world, { inputState, cameras }) {
    const { mouse, keyboard } = inputState;
    if (mouse.pressedButtons[MouseButton.Left]) {
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
      else if (keyboard.pressedKeys[KeyboardKeys.C]) {
        const obj = this._createParticle(...position);
        world.entities.push(obj);
      }
      else if (mouse.clickedButtons[MouseButton.Left]) {
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

  _createParticle(atX, atY) {
    const cyclesToLive = 30 + Math.random() * 200;
    // size of the particle
    const r = 5.5 + Math.random() * 0.5;
    // final color
    const fr = 3.5 + Math.random();
    const fg = 0.4 + 0.1 * Math.random();
    const fb = 0.3 + 0.1 * Math.random();
    // velocity on the particle
    const fx = 10 - 20 * Math.random();
    const fy = 10 * Math.random();
    // size delta
    const sizeDelta = 0.98;
    const particle = new Particle({
      position: [atX, atY],
      size: [r, r],
      velocity: [fx, fy],
      sizeDelta,
      cyclesToLive,
    });

    this._setFinalColor(particle, [fr, fg, fb, 0.6]);
    return particle;
  }

  _setFinalColor(particle, value) {
    const renderable = particle.components.find((c) => c instanceof ParticleRenderComponent);
    const lifecycle = particle.components.find((c) => c instanceof ParticleLifecycleComponent);
    vec4.sub(lifecycle.deltaColor, value, renderable.color);
    if (lifecycle.cyclesToLive !== 0) {
      vec4.scale(lifecycle.deltaColor, lifecycle.deltaColor, 1 / lifecycle.cyclesToLive);
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

class Explosion extends GameObject {
  constructor({ position, size = 1 }) {
    super();
    this.components.push(new ParticleEmitterComponent({
      position,
      remains: 200 * size,
      createParticle: this._createParticle.bind(this),
    }));
  }

  _createParticle(atX, atY) {
    const cyclesToLive = 30 + Math.random() * 200;
    // size of the particle
    const r = 5.5 + Math.random() * 0.5;
    // final color
    const fr = 3.5 + Math.random();
    const fg = 0.4 + 0.1 * Math.random();
    const fb = 0.3 + 0.1 * Math.random();
    // velocity on the particle
    const fx = 10 - 20 * Math.random();
    const fy = 10 * Math.random();
    // size delta
    const sizeDelta = 0.98;
    const particle = new Particle({
      position: [atX, atY],
      size: [r, r],
      velocity: [fx, fy],
      sizeDelta,
      cyclesToLive,
    });

    this._setFinalColor(particle, [fr, fg, fb, 0.6]);
    return particle;
  }

  _setFinalColor(particle, value) {
    const renderable = particle.components.find((c) => c instanceof ParticleRenderComponent);
    const lifecycle = particle.components.find((c) => c instanceof ParticleLifecycleComponent);
    vec4.sub(lifecycle.deltaColor, value, renderable.color);
    if (lifecycle.cyclesToLive !== 0) {
      vec4.scale(lifecycle.deltaColor, lifecycle.deltaColor, 1 / lifecycle.cyclesToLive);
    }
  }
}

class PointTargetSystem {
  run({ entities }, game) {
    entities.forEach((e) => {
      const transform = e.components.find((c) => c instanceof TransformComponent);
      const renderable = e.components.find((c) => c instanceof RenderComponent);
      const pointTarget = e.components.find((c) => c instanceof PointTargetComponent);
      const movement = e.components.find((c) => c instanceof MovementComponent);
      if (!pointTarget || !transform || !movement || !renderable) return;
      const target = entities.find((t) => t.id === pointTarget.targetId);
      if (!target) return;
      const targetTransform = target.components.find((c) => c instanceof TransformComponent);
      const targetRenderable = target.components.find((c) => c instanceof RenderComponent);
      if (!targetTransform || !targetRenderable) return;
      const isCollided = BoundingUtils.intersectsBound(targetTransform, transform);
      if (isCollided) {
        const { gl } = game.renderState;
        const pixelTouch = this._getPixelTouch(gl, game.resourceMap, transform, renderable,
          targetTransform, targetRenderable);
        if (pixelTouch) {
          e.destroy();
          entities.push(new Explosion({ position: pixelTouch }));
        }
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

  _getPixelTouch(gl, resourceMap, transform, renderable, otherTransform, otherRenderable) {
    const textureInfo = resourceMap[renderable.texture].asset;
    const otherTextureInfo = resourceMap[otherRenderable.texture].asset;
    RenderUtils.readColorArray(gl, textureInfo);
    RenderUtils.readColorArray(gl, otherTextureInfo);
    return RenderUtils.pixelTouches(
      transform,
      textureInfo,
      renderable.sprite,
      otherTransform,
      otherTextureInfo,
      otherRenderable.sprite,
    );
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
    './assets/images/particle.png',
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
  const heroRect = new RigidRectangleComponent({
    mass: 0.7,
    restitution: 0.3,
    width: 16,
    height: 22,
    drawBounds: true,
    acceleration: [0, -50],
    drawColor: [0, 1, 0, 1],
    exceptions: [DyePack.SHAPE_GROUP],
  });
  heroRect.particleIgnore = true;
  hero.components.push(heroRect);
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
  scene.use(new ParticleEmitterSystem());
  scene.use(new ParticleUpdateSystem());
  scene.use(new ParticlePhysicsSystem());
  scene.use(new PhysicsControlSystem());
  scene.use(new PhysicsSystem());
};
