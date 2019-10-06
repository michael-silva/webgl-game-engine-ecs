import { RenderComponent, SpriteAnimation } from '@wge/core/render-engine';
import { TransformComponent } from '@wge/core/utils';
import { GameObject } from '@wge/core';
import { RigidRectangleComponent, PhysicsSystem } from '@wge/core/physics-system';
import {
  MovementSystem,
  LevelGeneratorSystem,
  CameraPanComponent,
  CameraPanSystem,
  KeyboardControlSystem,
} from './systems';
import {
  MovementKeysComponent,
} from './components';
import { KeyboardKeys } from '../../src/input-engine';

export const createPlayScene = (game) => {
  const scene = game.createScene();
  scene.setResources([
    './assets/fonts/system-default-font.fnt',
  ]);

  const world = scene.createWorld();
  world.setResources([
    './assets/images/sprite-animation1.png',
  ]);

  const player = new GameObject();
  player.components.push(new TransformComponent({
    position: [30, 37.5],
    size: [4, 8],
  }));
  player.components.push(new RenderComponent({
    color: [1, 1, 1, 0],
    sprite: {
      position: [0, 42.6, 204.9, 256],
      animation: Object.assign(new SpriteAnimation(), {
        rows: 5,
        numFrames: 30,
        width: 42.6,
        height: 51.2,
        top: 204.9,
        left: 0,
        updateInterval: 2,
      }),
    },
    texture: './assets/images/sprite-animation1.png',
  }));
  player.components.push(new RigidRectangleComponent({
    width: 2.5,
    height: 6,
    mass: 0.6,
    restitution: 0.5,
    acceleration: [0.5, -50],
    drawColor: [0, 1, 0, 1],
    drawBounds: true,
  }));
  player.components.push(new MovementKeysComponent({
    right: KeyboardKeys.D,
    left: KeyboardKeys.A,
    up: KeyboardKeys.W,
    down: KeyboardKeys.S,
  }));
  player.components.push(new CameraPanComponent({
    camIndex: 0, zone: [0.5, 1],
  }));
  world.addEntity(player);

  scene.use(new KeyboardControlSystem());
  scene.use(new LevelGeneratorSystem());
  scene.use(new MovementSystem());
  scene.use(new PhysicsSystem());
  scene.use(new CameraPanSystem());
};
