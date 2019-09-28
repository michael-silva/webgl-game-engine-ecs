import { GameObject } from '.';
import { SoundComponent } from './audio-system';
import {
  CameraEntity, WorldCoordinateComponent,
  ViewportComponent,
} from './camera';

export class WorldParser {
  _maps = []

  constructor(game) {
    this._game = game;
  }

  parse(scene, {
    resources, camera, worlds,
  }) {
    const camEntity = this.parseCamera(camera);
    this._game.addCamera(camEntity);
    scene.setResources(resources);
    let currentWorld = null;
    worlds.forEach((world) => {
      currentWorld = scene.createWorld();
      currentWorld.setResources(world.resources);
      if (world.sound) {
        const { src, play } = world.sound;
        currentWorld.setSound(new SoundComponent({ src, play }));
      }
      world.objects.forEach((object) => {
        const entity = this.parseObject(object);
        currentWorld.addEntity(entity);
      });
    });
  }

  map(id, component) {
    this._maps[id] = component;
  }

  parseCamera({ center, width, viewport }) {
    const camera = new CameraEntity();
    camera.components.push(new WorldCoordinateComponent({
      center,
      width,
    }));
    camera.components.push(new ViewportComponent({
      array: viewport,
    }));
    return camera;
  }

  parseObject(data) {
    const object = new GameObject();
    Object.entries(data).forEach(([key, value]) => {
      if (!this._maps[key]) return;
      const comp = new this._maps[key](value);
      // Object.assign(comp, value);
      object.components.push(comp);
    });
    return object;
  }
}
