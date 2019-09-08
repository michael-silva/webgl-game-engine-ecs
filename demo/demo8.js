import {
  BackgroundComponent, WorldCoordinateComponent,
  CameraEntity, ViewportComponent,
} from '../src/camera';
import { Minion, Hero } from './objects';
import {
  RotationKeysComponent, KeyboardMovementSystem,
  KeyboardRotationSystem, MovementSystem,
} from './shared';
import { KeyboardKeys } from '../src/input-system';
import { GameObject, Light } from '../src';
import { TextComponent } from '../src/systems';

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
    size: [190, 100],
    position: [50, 35],
    // position: [0, 0],
    texture: './assets/images/bg.png',
  }));
  scene.addCamera(camera);

  scene.setResources([
    './assets/images/bg.png',
    './assets/images/minion_sprite.png',
    './assets/fonts/system-default-font.fnt',
  ]);

  // the light
  const light = new Light({
    radius: 8,
    position: [30, 30, 2],
    color: [0.9, 0.9, 0.2, 1],
  });
  scene.addLight(light);


  const minionLeft = new Minion(30, 30);
  scene.addEntity(minionLeft);
  const minionRight = new Minion(70, 30);
  scene.addEntity(minionRight);

  const hero = new Hero();
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
