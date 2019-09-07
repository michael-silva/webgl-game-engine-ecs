import { GameObject } from '.';
import { SoundComponent } from './audio-system';
import {
  CameraEntity, WorldCoordinateComponent,
  ViewportComponent, BackgroundComponent,
} from './camera';

export class SceneParser {
  _maps = []

  parse(scene, {
    sound, resources, camera, worlds,
  }) {
    const camEntity = this.parseCamera(camera);
    scene.addCamera(camEntity);
    scene.setResources(resources);
    if (sound) {
      const { src, play } = sound;
      scene.setSound(new SoundComponent({ src, play }));
    }
    let currentWorld = null;
    worlds.forEach((world, i) => {
      currentWorld = (i === 0) ? scene.getWorld() : scene.createWorld();
      currentWorld.setResources(world.resources);
      world.objects.forEach((object) => {
        const entity = this.parseObject(object);
        if (currentWorld) currentWorld.addEntity(entity);
        else scene.addEntity(entity);
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
    camera.components.push(new BackgroundComponent());
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
