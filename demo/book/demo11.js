import { vec2 } from 'gl-matrix';
import {
  WorldCoordinateComponent,
  CameraEntity, ViewportComponent,
} from '@wge/core/camera';
import { KeyboardKeys } from '@wge/core/input-engine';
import { GameObject } from '@wge/core';
import { TransformComponent } from '@wge/core/utils';
import {
  ShadowReceiverComponent, ShadowCasterComponent, TextComponent,
  Material, Light, LightType, BackgroundTypes,
} from '@wge/core/render-engine';
import {
  RotationKeysComponent, KeyboardMovementSystem,
  KeyboardRotationSystem, MovementSystem, CameraPanComponent,
  CameraPanSystem, CameraBoundarySystem, InterpolationSystem,
  WorldCoordinateInterpolation, Interpolation, InterpolationArray, MultipleCameraComponent,
} from './shared';
import {
  Rectangle, MinionMap, HeroMap, Hero, Background,
} from './objects';

const LevelLayers = Object.freeze({
  Background: 0,
  Actors: 1,
  Front: 2,
});

export class ParallaxMovementComponent {
  constructor({
    speed, direction, camIndex, scale,
  }) {
    this.speed = speed;
    this.direction = direction || [0, 1];
    this.camIndex = camIndex;
    this.scale = scale;
    this.wcCenterCache = [0, 0];
  }
}

export class ParallaxMovementSystem {
  run({ entities }, { cameras }) {
    entities.forEach((e) => {
      const transform = e.components.find((c) => c instanceof TransformComponent);
      const movement = e.components.find((c) => c instanceof ParallaxMovementComponent);
      if (!transform || !movement) return;
      const [x, y] = transform.position;
      const [dx, dy] = movement.direction;

      const camera = cameras[movement.camIndex];
      const worldCoordinate = camera.components.find((c) => c instanceof WorldCoordinateComponent);
      this._refPosUpdate(transform, movement, worldCoordinate);

      const mx = dx * movement.speed * movement.parallaxScale;
      const my = dy * movement.speed * movement.parallaxScale;
      transform.position = [x + mx, y + my];
    });
  }

  _refPosUpdate(transform, movement, worldCoordinate) {
    // eslint-disable-next-line no-param-reassign
    movement.parallaxScale = 1 / movement.scale;
    // now check for reference movement
    const deltaT = [0, 0];
    vec2.sub(deltaT, movement.wcCenterCache, worldCoordinate.center);
    this._setWCTranslationBy(transform, movement, deltaT);
    // now update WC center ref position
    vec2.sub(movement.wcCenterCache, movement.wcCenterCache, deltaT);
  }

  _setWCTranslationBy(transform, movement, delta) {
    const f = (1 - movement.parallaxScale);
    // eslint-disable-next-line no-param-reassign
    transform.position[0] += -delta[0] * f;
    // eslint-disable-next-line no-param-reassign
    transform.position[1] += -delta[1] * f;
  }
}

export default (game) => {
  const scene = game.createScene();
  const world = scene.createWorld();
  world.defaultLayer = LevelLayers.Actors;
  world.addComponent(new MultipleCameraComponent({ count: 2 }));
  scene.setGlobalLight({ ambientColor: [0.3, 0.3, 0.3, 1] });
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
    array: [0, 0, 1280, 720],
  }));
  game.addCamera(camera);

  const heroCamera = new CameraEntity();
  heroCamera.components.push(new WorldCoordinateComponent({
    center: [20, 30.5],
    width: 14,
  }));
  heroCamera.components.push(new ViewportComponent({
    array: [0, 420, 300, 300],
    bound: 2,
  }));
  game.addCamera(heroCamera);

  scene.setResources([
    './assets/images/bg.png',
    './assets/images/bg_normal.png',
    './assets/images/bgLayer.png',
    './assets/images/bgLayer_normal.png',
    './assets/images/minion_sprite.png',
    './assets/images/minion_sprite_normal.png',
    './assets/fonts/system-default-font.fnt',
  ]);

  const bg1 = new Background({
    transform: {
      size: [30, 30],
      position: [0, 0],
      z: -10,
    },
    render: {
      type: BackgroundTypes.Tiled,
      color: [0.8, 0.8, 0.8, 0],
      texture: './assets/images/bg.png',
      normalMap: './assets/images/bg_normal.png',
      material: new Material({
        shininess: 50,
        specular: [0.2, 0.1, 0.1, 1],
      }),
    },
  });
  bg1.components.push(new ParallaxMovementComponent({
    direction: [0, -1],
    speed: 0.1,
    camIndex: 0,
    scale: 5,
  }));
  world.addEntity(bg1, LevelLayers.Background);

  const bg2 = new Background({
    shadowReceiver: true,
    transform: {
      size: [25, 25],
      position: [0, 0],
      z: 0,
    },
    render: {
      type: BackgroundTypes.Tiled,
      color: [0.8, 0.8, 0.8, 0],
      texture: './assets/images/bgLayer.png',
      normalMap: './assets/images/bgLayer_normal.png',
      material: new Material({
        shininess: 10,
        specular: [0.2, 0.2, 0.5, 1],
      }),
    },
  });
  bg2.components.push(new ParallaxMovementComponent({
    direction: [0, -1],
    speed: 0.1,
    camIndex: 0,
    scale: 3,
  }));
  world.addEntity(bg2, LevelLayers.Background);

  const bg3 = new Background({
    transform: {
      size: [30, 30],
      position: [0, 0],
      z: 10,
    },
    render: {
      type: BackgroundTypes.Tiled,
      illumination: false,
      color: [0.8, 0.8, 0.8, 0],
      texture: './assets/images/bgLayer.png',
      normalMap: './assets/images/bgLayer_normal.png',
    },
  });
  bg3.components.push(new ParallaxMovementComponent({
    direction: [0, 1],
    speed: 0,
    camIndex: 0,
    scale: 3,
  }));
  world.addEntity(bg3, LevelLayers.Front);

  // the light
  const light1 = new Light({
    near: 8,
    far: 20,
    cosInner: 0.1,
    cosOuter: 0.2,
    dropOff: 1,
    intensity: 5,
    lightType: LightType.PointLight,
    direction: [0, 0, -1],
    position: [20, 25, 10],
    color: [0.6, 1.0, 0.0, 1],
  });
  scene.addLight(light1);
  const light2 = new Light({
    near: 500, // near anf far distances: essentially switch this off
    far: 500,
    cosInner: 0.1,
    cosOuter: 0.2,
    dropOff: 1,
    intensity: 2,
    lightType: LightType.DirectionalLight,
    direction: [0, 0, -1],
    position: [15, 50, 10],
    color: [0.7, 0.7, 0.0, 1],
  });
  scene.addLight(light2);
  const light3 = new Light({
    near: 20,
    far: 40,
    cosInner: 1.9,
    cosOuter: 2,
    dropOff: 1.2,
    intensity: 5,
    lightType: LightType.SpotLight,
    direction: [-0.02, 0.02, -1],
    position: [40, 30, 12],
    color: [0.5, 0.5, 0.5, 1],
  });
  scene.addLight(light3);
  const light4 = new Light({
    near: 20,
    far: 40,
    cosInner: 1.2,
    cosOuter: 1.3,
    dropOff: 1.5,
    intensity: 2,
    lightType: LightType.SpotLight,
    direction: [0.02, -0.02, -1],
    position: [60, 40, 12],
    color: [0.8, 0.8, 0.2, 1],
  });
  scene.addLight(light4);

  const block1 = new Rectangle({
    color: [1, 0, 0, 1],
    transform: new TransformComponent({
      size: [5, 5],
      position: [30, 50],
    }),
  });
  world.addEntity(block1);

  const block2 = new Rectangle({
    color: [0, 1, 0, 1],
    transform: new TransformComponent({
      size: [5, 5],
      position: [70, 50],
    }),
  });
  world.addEntity(block2);

  const minionLeft = new MinionMap({ size: [9, 7.2], position: [25, 40], z: 2 });
  minionLeft.components.push(new ShadowReceiverComponent());
  minionLeft.components.push(new ShadowCasterComponent());
  world.addEntity(minionLeft);
  const minionRight = new MinionMap({
    size: [9, 7.2], position: [65, 25], z: 2, noMap: true,
  });
  minionRight.components.push(new ShadowReceiverComponent());
  minionLeft.components.push(new ShadowCasterComponent());
  world.addEntity(minionRight);

  const hero = new HeroMap({ position: [40, 30], size: [9, 12], z: 5 });
  hero.components.push(new CameraPanComponent({ camIndex: 0, zone: 0.9 }));
  hero.components.push(new ShadowReceiverComponent());
  hero.components.push(new ShadowCasterComponent());
  hero.components.push(new RotationKeysComponent({
    left: KeyboardKeys.Q,
    right: KeyboardKeys.E,
  }));
  world.addEntity(hero);

  const hero2 = new Hero({
    position: [60, 40],
    z: 5,
    size: [9, 12],
    keys: {
      left: KeyboardKeys.Left,
      right: KeyboardKeys.Right,
      up: KeyboardKeys.Up,
      down: KeyboardKeys.Down,
    },
  });
  hero2.components.push(new ShadowCasterComponent());
  world.addEntity(hero2);

  const message = new GameObject();
  message.components.push(
    new TextComponent({
      content: 'Status Message',
      position: [2, 4],
      size: 3,
      color: [1, 0, 0, 1],
      font: './assets/fonts/system-default-font.fnt',
    }),
  );
  world.addEntity(message);

  scene.use(new InterpolationSystem());
  scene.use(new KeyboardMovementSystem());
  scene.use(new KeyboardRotationSystem());
  scene.use(new MovementSystem());
  scene.use(new ParallaxMovementSystem());
  scene.use(new CameraBoundarySystem());
  scene.use(new CameraPanSystem());
};
