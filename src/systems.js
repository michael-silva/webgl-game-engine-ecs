import { ResourceLoader, ImageLoader } from './resources-system';

// @system
export class GameLoopSystem {
  run(game) {
    const { loopState } = game;
    loopState.previousTime = Date.now();
    loopState.isLoopRunning = true;
    requestAnimationFrame(() => this._runLoop(game));
  }

  _runLoop(game) {
    const { loopState } = game;
    const ONE_SECOND = 1000;
    const MPF = ONE_SECOND / loopState.FPS;
    if (loopState.isLoopRunning) {
      requestAnimationFrame(() => this._runLoop(game));

      loopState.currentTime = Date.now();
      loopState.elapsedTime = loopState.currentTime - loopState.previousTime;
      loopState.previousTime = loopState.currentTime;
      loopState.lagTime += loopState.elapsedTime;
      loopState.frameRate = parseInt(ONE_SECOND / loopState.elapsedTime, 10);

      if (loopState.lagTime > ONE_SECOND) {
        console.log('Lag Time is too large. The loop stoped!');
        loopState.isLoopRunning = false;
      }
      while (loopState.lagTime >= MPF && loopState.isLoopRunning) {
        game.preSystems.forEach((s) => !s.disabled && s.run(game));
        loopState.lagTime -= MPF;
        const scenes = game.scenes.filter((s) => s.active && !s.paused);
        scenes.forEach((scene) => {
          const world = scene.worlds[scene.currentWorld];
          scene.systems.forEach((s) => !s.disabled && s.run(world, game));
        });
        game.posSystems.forEach((s) => !s.disabled && s.run(game));
      }
    }
  }
}

// @system
export class LoaderSystem {
  constructor({ loadingScene } = {}) {
    this.loadingScene = loadingScene;
  }

  run(game) {
    game.scenes.forEach((scene) => {
      if (!scene.active && !(scene.loaded || scene.loading)) return;
      /* eslint-disable no-param-reassign */
      if (!scene.active && scene.loaded) {
        scene.loaded = false;
        ResourceLoader.unloadResources(game, scene);
      }
      else if (!scene.loaded && !scene.loading) {
        scene.loading = true;
        scene.active = false;
        ResourceLoader.loadSceneResources(game, scene);
        ResourceLoader.loadWorldsResources(game, scene);
      }
      else if (!scene.loaded && !ResourceLoader.hasUnloadedResources(game, scene)) {
        scene.loading = false;
        scene.loaded = true;
        scene.active = true;
      }
      /* eslint-enable no-param-reassign */
    });
    ResourceLoader.deleteUnusedResources(game);
  }
}

// @system
export class GarbageCollectorSystem {
  run(game) {
    const { scenes } = game;
    scenes.forEach((scene) => {
      if (!scene.active) return;
      const world = scene.worlds[scene.currentWorld];
      // eslint-disable-next-line
      world.entities = world.entities.filter((e) => !e._destroyed);
    });
  }
}

export class FontLoader {
  _imageLoader = new ImageLoader();

  async loadFile(fileName, game) {
    const [texture, fontFile] = await Promise.all([
      this._imageLoader.loadFile(fileName.replace(/\.[a-z0-9]+$/, '.png'), game),
      fetch(fileName).then((res) => res.text()),
    ]);

    const parser = new DOMParser();
    const fontInfo = parser.parseFromString(fontFile, 'text/xml');
    fontInfo.texture = texture;

    return fontInfo;
  }
}
