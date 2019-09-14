import {
  BackgroundComponent, WorldCoordinateComponent,
  CameraEntity, ViewportComponent,
} from '../src/camera';
import {
  Hero, Platform, MinionMap,
} from './objects';
import {
  RotationKeysComponent, KeyboardMovementSystem,
  KeyboardRotationSystem, MovementSystem,
} from './shared';
import { KeyboardKeys } from '../src/input-system';
import { GameObject } from '../src';
import {
  TextComponent, RenderComponent,
} from '../src/systems';
import { RigidCircleComponent } from '../src/collision-engine';

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

class ToogleMaterialComponent {
  constructor({ material, key }) {
    this.key = key;
    this.material = material;
  }
}

class ToogleMaterialSystem {
  run(game, { scenes, currentScene, inputState }) {
    const { cameras } = scenes[currentScene];
    const { keyboard } = inputState;
    cameras.forEach((camera) => {
      const background = camera.components.find((c) => c instanceof BackgroundComponent);
      const toggleMaterial = camera.components.find((c) => c instanceof ToogleMaterialComponent);
      if (!background || !toggleMaterial) return;
      if (keyboard.clickedKeys[toggleMaterial.key]) {
        background.material = background.material ? null : toggleMaterial.material;
      }
    });
  }
}

class TrackEntityMaterialComponent {
  constructor({ entityId }) {
    this.entityId = entityId;
  }
}

class TrackMaterialSystem {
  run({ entities }) {
    entities.forEach((e) => {
      const track = e.components.find((c) => c instanceof TrackEntityMaterialComponent);
      const text = e.components.find((c) => c instanceof TextComponent);
      if (!text || !track) return;
      const trackEntity = entities.find((e2) => e2.id === track.entityId);
      if (!trackEntity) return;
      const { material } = trackEntity.components.find((c) => c instanceof RenderComponent);
      text.content = `n(${material.shininess.toFixed(2)}) ${this._materialArraysToString(material)}`;
    });
  }

  _materialArraysToString({ ambient, diffuse, specular }) {
    return `A(${this._arrayToString(ambient)}) D(${this._arrayToString(diffuse)}) S(${this._arrayToString(specular)})`;
  }

  _arrayToString([a, b, c]) {
    return `${a.toFixed(1)},${b.toFixed(1)},${c.toFixed(1)}`;
  }
}

class MaterialControlComponent {
  constructor(params) {
    Object.assign(this, params);
  }
}

class MaterialControlSystem {
  _channel = 0

  run({ entities }, { inputState }) {
    const { keyboard } = inputState;
    entities.forEach((e) => {
      const control = e.components.find((c) => c instanceof MaterialControlComponent);
      const renderable = e.components.find((c) => c instanceof RenderComponent);
      if (!control || !renderable) return;
      const delta = 0.01;
      if (keyboard.pressedKeys[control.shininessInc]) {
        renderable.material.shininess += delta;
      }
      if (keyboard.pressedKeys[control.shininessDec]) {
        renderable.material.shininess -= delta;
      }
      if (keyboard.pressedKeys[control.changeChannel]) {
        this._channel++;
        if (this._channel > 2) this._channel = 0;
      }
      const channel = this._selectChannel(renderable.material);
      if (keyboard.pressedKeys[control.channel0Inc]) {
        channel[0] += delta;
      }
      if (keyboard.pressedKeys[control.channel0Dec]) {
        channel[0] -= delta;
      }
      if (keyboard.pressedKeys[control.channel1Inc]) {
        channel[1] += delta;
      }
      if (keyboard.pressedKeys[control.channel1Dec]) {
        channel[1] -= delta;
      }
      if (keyboard.pressedKeys[control.channel2Inc]) {
        channel[2] += delta;
      }
      if (keyboard.pressedKeys[control.channel2Dec]) {
        channel[2] -= delta;
      }
    });
  }

  _selectChannel(material) {
    if (this._channel === 0) return material.ambient;
    if (this._channel === 1) return material.diffuse;
    return material.specular;
  }
}

export default (game, canvas) => {
  // eslint-disable-next-line no-param-reassign
  canvas.width = 1280;
  // eslint-disable-next-line no-param-reassign
  canvas.height = 720;
  const scene = game.createScene();
  scene.setGlobalLight({ ambientColor: [0.8, 0.8, 0.8, 1] });
  const camera = new CameraEntity();
  camera.components.push(new WorldCoordinateComponent({
    center: [100, 56.25],
    width: 200,
  }));
  camera.components.push(new ViewportComponent({
    array: [0, 0, 1280, 720],
  }));
  camera.components.push(new BackgroundComponent({
    color: [0.8, 0.8, 0.8, 0],
  }));
  scene.addCamera(camera);

  scene.setResources([
    './assets/images/bg.png',
    './assets/images/minion_sprite.png',
    './assets/images/platform.png',
    './assets/fonts/system-default-font.fnt',
  ]);

  // create a few objects ...
  let i; let rx; let ry; let obj;
  ry = Math.random() * 5 + 20;
  for (i = 0; i < 4; i++) {
    rx = 20 + Math.random() * 80;
    obj = new Hero({ position: [rx, ry], size: [18, 24] });
    obj.components.push(new RigidCircleComponent({
      radius: 9,
      drawBounds: true,
      drawColor: [0, 1, 0, 1],
    }));
    scene.addEntity(obj);

    rx = rx + 20 + Math.random() * 80;
    obj = new MinionMap({ position: [rx, ry], size: [18, 14.4], isRigid: true });
    scene.addEntity(obj);

    rx = 20 + Math.random() * 160;
    obj = new Platform({ position: [rx, ry], size: [30, 3.75] });
    scene.addEntity(obj);

    ry = ry + 20 + Math.random() * 10;
  }

  const minion = new MinionMap({ position: [rx, ry], size: [18, 14.4], isRigid: true });
  scene.addEntity(minion);

  const platform = new Platform({ position: [20, 30], size: [30, 3.75] });
  scene.addEntity(platform);

  const hero = new Hero({ position: [20, 30], size: [18, 24] });
  hero.components.push(new RigidCircleComponent({
    radius: 9,
    drawBounds: true,
    drawColor: [0, 1, 0, 1],
  }));
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
  scene.use(new ToogleMaterialSystem());
  scene.use(new MaterialControlSystem());
  scene.use(new TrackMaterialSystem());
};
