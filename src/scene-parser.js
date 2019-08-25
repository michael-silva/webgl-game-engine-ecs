import { CameraComponent, GameObject } from '.';

export class SceneParser {
  _maps = []

  parse(scene, { camera, objects }, world) {
    const { center, width, viewport } = camera;
    const component = new CameraComponent({ center, width, viewport });
    scene.addCamera(component);
    objects.forEach((object) => {
      const entity = this.parseObject(object);
      if (world) world.addEntity(entity);
      else scene.addEntity(entity);
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
