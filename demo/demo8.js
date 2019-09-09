import {
  BackgroundComponent, WorldCoordinateComponent,
  CameraEntity, ViewportComponent,
} from '../src/camera';
import {
  Rectangle, MinionMap, HeroMap,
} from './objects';
import {
  RotationKeysComponent, KeyboardMovementSystem,
  KeyboardRotationSystem, MovementSystem,
} from './shared';
import { KeyboardKeys } from '../src/input-system';
import { GameObject, Light } from '../src';
import { TextComponent, TransformComponent } from '../src/systems';

class GlobalLightControlSystem {
  run(world, { inputState, scenes, currentScene }) {
    const { keyboard } = inputState;
    const scene = scenes[currentScene];
    const { globalLight } = scene;
    const delta = 0.05;
    if (keyboard.clickedKeys[KeyboardKeys.Up]) {
      const intensity = globalLight.ambientIntensity + delta;
      scene.globalLight.ambientIntensity = intensity > 1 ? 0 : intensity;
    }
    if (keyboard.clickedKeys[KeyboardKeys.Down]) {
      const intensity = globalLight.ambientIntensity - delta;
      scene.globalLight.ambientIntensity = intensity < 0 ? 1 : intensity;
    }
    if (keyboard.clickedKeys[KeyboardKeys.Right]) {
      const red = globalLight.ambientColor[0] + delta;
      scene.globalLight.ambientColor[0] = red > 1 ? 0 : red;
    }
    if (keyboard.clickedKeys[KeyboardKeys.Left]) {
      const red = globalLight.ambientColor[0] - delta;
      scene.globalLight.ambientColor[0] = red < 0 ? 1 : red;
    }
  }
}

export default (game) => {
  const scene = game.createScene();
  scene.setGlobalLight({ ambientColor: [0.3, 0.3, 0.3, 1] });
  const camera = new CameraEntity();
  camera.components.push(new WorldCoordinateComponent({
    center: [50, 37.5],
    width: 100,
  }));
  camera.components.push(new ViewportComponent({
    array: [0, 0, 640, 480],
  }));
  camera.components.push(new BackgroundComponent({
    // type: BackgroundTypes.Fixed,
    color: [0.8, 0.8, 0.8, 0],
    size: [100, 100],
    position: [50, 35],
    // position: [0, 0],
    texture: './assets/images/bg.png',
    normalMap: './assets/images/bg_normal.png',
  }));
  scene.addCamera(camera);

  scene.setResources([
    './assets/images/bg.png',
    './assets/images/bg_normal.png',
    './assets/images/minion_sprite.png',
    './assets/images/minion_sprite_normal.png',
    './assets/fonts/system-default-font.fnt',
  ]);

  // the light
  const light1 = new Light({
    near: 20,
    far: 50,
    intensity: 5.5,
    position: [21, 58, 5],
    color: [0.2, 0.2, 0.8, 1],
  });
  scene.addLight(light1);
  const light2 = new Light({
    near: 20,
    far: 45,
    intensity: 2.8,
    position: [24, 24, 8],
    color: [0.4, 0.7, 0.4, 1],
  });
  scene.addLight(light2);
  const light3 = new Light({
    near: 10,
    far: 35,
    intensity: 3,
    position: [66, 23, 10],
    color: [0.7, 0.7, 0.7, 1],
  });
  scene.addLight(light3);
  const light4 = new Light({
    near: 15,
    far: 40,
    intensity: 3,
    position: [72, 57, 6],
    color: [0.8, 0.6, 0.6, 1],
  });
  scene.addLight(light4);

  const block1 = new Rectangle({
    color: [1, 0, 0, 1],
    transform: new TransformComponent({
      size: [5, 5],
      position: [30, 50],
    }),
  });
  scene.addEntity(block1);

  const block2 = new Rectangle({
    color: [0, 1, 0, 1],
    transform: new TransformComponent({
      size: [5, 5],
      position: [70, 50],
    }),
  });
  scene.addEntity(block2);

  const minionLeft = new MinionMap({ position: [17, 15] });
  scene.addEntity(minionLeft);
  const minionRight = new MinionMap({ position: [87, 15], noMap: true });
  scene.addEntity(minionRight);

  const hero = new HeroMap();
  hero.components.push(new RotationKeysComponent({
    left: KeyboardKeys.Q,
    right: KeyboardKeys.E,
  }));
  scene.addEntity(hero);

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
  scene.addEntity(message);

  scene.use(new KeyboardMovementSystem());
  scene.use(new KeyboardRotationSystem());
  scene.use(new MovementSystem());
  scene.use(new GlobalLightControlSystem());
};
