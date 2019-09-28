import { mat4, vec2 } from 'gl-matrix';
import {
  GameLoopSystem, LoaderSystem,
  GarbageCollectorSystem,
} from './systems';
import { RenderEngine } from './render-engine';
import { InputEngine } from './input-engine';

// @component
export class GameWorldEntity {
  defaultLayer = 0;

  resources = [];

  sound = null;

  entities = [];

  components = [];
}

// @component
export class LoopState {
  isLoopRunning = false;

  previousTime = 0.0;

  lagTime = 0.0;

  FPS = 60;
}

export class GlobalLight {
  ambientColor = [1, 1, 1, 1];

  ambientIntensity = 1;
}

// @entity
export class GameSceneEntity {
  globalLight = new GlobalLight();

  resources = [];

  lights = [];

  worlds = [];

  currentWorld = 0;

  systems = [];

  constructor({ active, paused } = {}) {
    this.active = !!active;
    this.paused = !!paused;
  }
}


// @entity
export class GameEntity {
  loaders = [];

  resourceMap = {};

  renderState = null;

  inputState = null;

  loopState = new LoopState();

  preSystems = [];

  posSystems = [];

  scenes = [];

  cameras = [];
}

// @entity
export class GameObject {
  components = [];

  destroy() {
    this._destroyed = true;
  }
}


// @component
export class CameraComponent {
  constructor({
    center, width, bgColor, viewport,
  } = {}) {
    // WC and viewport position and size
    this.center = vec2.fromValues(...center);
    this.width = width;
    this.viewport = viewport; // [x, y, width, height]
    this.nearPlane = 0;
    this.farPlane = 1000;
    // transformation matrices
    this.viewMatrix = mat4.create();
    this.projMatrix = mat4.create();
    this.viewProjection = mat4.create();
    // background color
    this.bgColor = bgColor || [0.8, 0.8, 0.8, 1]; // RGB and Alpha
  }
}

class GameWorld {
  static _nextId = 0;

  static setEntityId(entity) {
    if (entity.id) return;
    // eslint-disable-next-line no-underscore-dangle
    GameWorld._nextId++;
    // eslint-disable-next-line no-underscore-dangle,no-param-reassign
    entity.id = GameWorld._nextId;
  }

  set defaultLayer(value) { this._world.defaultLayer = value; }

  constructor(world) {
    this._world = world;
  }

  addEntity(entity, layer) {
    GameWorld.setEntityId(entity);
    // eslint-disable-next-line no-param-reassign
    entity.layer = layer || this._world.defaultLayer;
    this._world.entities.push(entity);
  }

  addComponent(component) {
    this._world.components.push(component);
  }

  setResources(resources) {
    this._world.resources = resources || [];
  }

  setSound(sound) {
    this._world.sound = sound;
  }
}

class GameScene {
  static MAX_LIGHTS = 100;

  constructor(scene) {
    this._scene = scene;
  }

  use(system) {
    this._scene.systems.push(system);
  }

  setResources(resources) {
    this._scene.resources = resources || [];
  }

  setGlobalLight(light) {
    Object.assign(this._scene.globalLight, light);
  }

  addLight(light) {
    if (this._scene.lights.length === GameScene.MAX_LIGHTS) {
      throw new Error(`Isn't possible to add more lights, the maximum is ${GameScene.MAX_LIGHTS}`);
    }
    this._scene.lights.push(light);
  }

  createWorld() {
    const world = new GameWorldEntity();
    world.scene = this._scene;
    this._scene.worlds.push(world);
    return new GameWorld(world);
  }
}

// @orchestrator
export class GameEngine {
  constructor(canvas, {
    inputEngine = new InputEngine(canvas),
    renderEngine = new RenderEngine(canvas),
    loaderSystem = new LoaderSystem(),
  } = {}) {
    this._game = new GameEntity();
    this._loop = new GameLoopSystem();
    if (!this._game.inputState) this._game.inputState = inputEngine.state;
    if (!this._game.renderState) this._game.renderState = renderEngine.state;
    this.useBefore(loaderSystem);
    this.useBefore(inputEngine);
    this.useAfter(renderEngine);
    this.useAfter(new GarbageCollectorSystem());
  }

  addCamera(camera) {
    this._game.cameras.push(camera);
  }

  createScene(sceneParams) {
    const active = this._game.scenes.length === 0;
    const sceneEntity = new GameSceneEntity({ active, ...sceneParams });
    this._game.scenes.push(sceneEntity);
    const scene = new GameScene(sceneEntity);
    return scene;
  }

  useBefore(system) {
    this._game.preSystems.push(system);
  }

  useAfter(system) {
    this._game.posSystems.push(system);
  }

  mapLoader(map) {
    if (!(map.pattern instanceof RegExp) || !map.loader || typeof (map.loader.loadFile) !== 'function') {
      throw new Error('The loader must have and pattern regex property and a lofFile function');
    }
    this._game.loaders.push(map);
  }

  run() {
    this._loop.run(this._game);
  }
}
