import { CameraComponent, GameObject } from '.';
import { SoundComponent } from './audio-system';

export class SceneParser {
  _maps = []

  parse(scene, {
    sound, resources, camera, worlds,
  }) {
    const { center, width, viewport } = camera;
    const component = new CameraComponent({ center, width, viewport });
    scene.addCamera(component);
    scene.setResources(resources);
    if (sound) {
      const { src, play } = sound;
      scene.setSound(new SoundComponent({ src, play }));
    }
    let currentWorld = null;
    worlds.forEach((world, i) => {
      if (i > 0) currentWorld = scene.createWorld();
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
