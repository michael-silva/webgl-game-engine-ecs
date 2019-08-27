import { RenderUtils } from './utils';

export class ImageLoader {
  loadFile(fileName, { renderState }) {
    return new Promise((resolve) => {
      const image = new Image();
      image.addEventListener('load', () => {
        const data = RenderUtils.processImage(renderState.gl, fileName, image);
        resolve(data);
      });
      image.src = fileName;
    });
  }
}

export class JsonLoader {
  loadFile(fileName) {
    return fetch(fileName)
      .then((res) => res.json());
  }
}
export class AudioLoader {
  loadFile(fileName) {
    return fetch(fileName)
      .then((res) => res.arrayBuffer());
  }
}

export class WorldResourceCache {
  constructor({ active } = {}) {
    this.active = !!active;
  }
}

class ResourceEntry {
  ref = 0;

  asset = null;

  loaded = false;

  constructor({ key }) {
    this.key = key;
  }
}

export class ResourceLoader {
  static getActiveResources(scene) {
    const words = scene.worlds.filter((w) => w.active && w.resources);
    return [...scene.resources, ...words.flatMap((w) => w.resources)];
  }

  static updateResource(game, key) {
    const { resourceMap, loaders } = game;
    if (!resourceMap[key]) {
      resourceMap[key] = new ResourceEntry({ key, ref: 1 });
      const map = loaders.find((m) => m.pattern.test(key));
      if (!map) {
        throw new Error(`Haven't any loader to handle this file type: "${key}"`);
      }
      map.loader.loadFile(key, game)
        .then((asset) => {
          resourceMap[key].asset = asset;
          resourceMap[key].loaded = true;
        });
    }
    else {
      resourceMap[key].ref++;
    }
  }

  static loadSceneResources(game, scene) {
    scene.resources.forEach((key) => {
      ResourceLoader.updateResource(game, key);
    });
  }

  static loadWorldsResources(game, scene) {
    const worlds = scene.worlds.filter((w) => w.active && w.resources);
    worlds.forEach((world) => {
      world.resources.forEach((key) => ResourceLoader.updateResource(game, key));
      const cache = world.components.find((c) => c instanceof WorldResourceCache);
      if (!cache) world.components.push(new WorldResourceCache({ active: true }));
      else cache.active = true;
    });
  }

  static hasUnloadedResources(game, scene) {
    const { resourceMap } = game;
    const resources = ResourceLoader.getActiveResources(scene);
    return resources.length > 0
      && resources.some((key) => !resourceMap[key] || !resourceMap[key].loaded);
  }

  static unloadWorldsResources(game, scene) {
    const { resourceMap } = game;
    const worlds = scene.worlds.filter((world) => {
      const cache = world.components.find((c) => c instanceof WorldResourceCache);
      if (cache && cache.active && !world.active) {
        cache.active = false;
        return true;
      }
      return false;
    });
    const resources = [
      ...scene.resources,
      ...worlds.flatMap((world) => world.resources || []),
    ];

    resources.forEach((key) => {
      if (!resourceMap[key]) return;
      resourceMap[key].ref--;
      if (resourceMap[key].ref === 0) {
        delete resourceMap[key];
      }
    });
  }

  static unloadResources(game, scene) {
    const { resourceMap } = game;
    const resources = [
      ...scene.resources,
      ...scene.worlds.flatMap((world) => world.resources || []),
    ];
    scene.worlds.forEach((world) => {
      const cache = world.components.find((c) => c instanceof WorldResourceCache);
      if (cache) cache.active = false;
    });
    resources.forEach((key) => {
      if (!resourceMap[key]) return;
      resourceMap[key].ref--;
      if (resourceMap[key].ref === 0) {
        delete resourceMap[key];
      }
    });
  }
}
