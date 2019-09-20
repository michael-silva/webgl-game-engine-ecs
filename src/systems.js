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
        game.inputEngine.run(game);
        game.preSystems.forEach((s) => s.run(game));
        loopState.lagTime -= MPF;
        const scene = game.scenes[game.currentScene];
        scene.worlds.forEach((world) => {
          if (!world.active) return;
          scene.systems.forEach((s) => s.run(world, game));
        });
        game.posSystems.forEach((s) => s.run(game));
        game.renderEngine.run(game);
      }
    }
  }
}

// @system
export class LoaderSystem {
  _lastScene = -1;

  _currentScene = -1;

  constructor({ loadingScene } = {}) {
    this.loadingScene = loadingScene || 0;
  }

  run(game) {
    const { scenes, currentScene } = game;
    const scene = scenes[currentScene];
    if (this._lastScene !== currentScene && this._currentScene === -1) {
      this._currentScene = currentScene;
      // eslint-disable-next-line no-param-reassign
      game.currentScene = this.loadingScene;
      ResourceLoader.loadSceneResources(game, scene);
      if (this._lastScene >= 0) ResourceLoader.unloadResources(game, scenes[this._lastScene]);
    }
    else if (ResourceLoader.hasUnloadedResources(game, scene)) {
      ResourceLoader.loadWorldsResources(game, scene);
      ResourceLoader.unloadWorldsResources(game, scene);
    }
    else if (this._currentScene >= 0) {
      // eslint-disable-next-line no-param-reassign
      game.currentScene = this._currentScene;
      this._lastScene = this._currentScene;
      this._currentScene = -1;
    }
  }
}

// @system
export class GarbageCollectorSystem {
  run(game) {
    const { scenes, currentScene } = game;
    const scene = scenes[currentScene];
    scene.worlds.forEach((world) => {
      if (!world.active) return;
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
