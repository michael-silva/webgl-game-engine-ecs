/* eslint-disable max-classes-per-file */

import { mat4, vec2 } from 'gl-matrix';
import {
  GameLoopSystem, LoaderSystem,
  TextSystem, GarbageCollectorSystem,
} from './systems';
import { RenderEngine } from './render-system';
import { InputEngine } from './input-system';

// @component
export class GameWorldEntity {
  resources = [];

  entities = [];

  systems = [];

  components = [];

  constructor({ active, paused } = {}) {
    this.active = !!active;
    this.paused = !!paused;
  }
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

export class Light {
  constructor({
    color, position = [0, 0],
    near, far, intensity,
  }) {
    this.color = color || [0.1, 0.1, 0.1, 1]; // light color
    this.position = [...position, 5]; // light position in WC
    this.near = near || 5; // within Near is fully lighted
    this.far = far || 10; // farther than Far is not lighted
    this.intensity = intensity || 1;
    this.isOn = true;
  }
}


// @entity
export class GameSceneEntity {
  sound = null;

  globalLight = new GlobalLight();

  resources = [];

  cameras = [];

  lights = [];

  worlds = [];

  systems = [];
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

  currentScene = 0;
}

// @entity
export class GameObject {
  components = []

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

  constructor(world) {
    this._world = world;
  }

  addEntity(entity) {
    GameWorld.setEntityId(entity);
    this._world.entities.push(entity);
  }

  setResources(resources) {
    this._world.resources = resources || [];
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

  setSound(sound) {
    this._scene.sound = sound;
  }

  addLight(light) {
    if (this._scene.lights.length === GameScene.MAX_LIGHTS) {
      throw new Error(`Isn't possible to add more lights, the maximum is ${GameScene.MAX_LIGHTS}`);
    }
    this._scene.lights.push(light);
  }

  setGlobalLight(light) {
    Object.assign(this._scene.globalLight, light);
  }

  addCamera(camera) {
    this._scene.cameras.push(camera);
  }

  addEntity(entity, world) {
    const theWorld = world || this._scene.worlds[0];
    GameWorld.setEntityId(entity);
    theWorld.entities.push(entity);
  }

  getWorld() {
    return new GameWorld(this._scene.worlds[0]);
  }

  createWorld() {
    const world = new GameWorldEntity({ active: this._scene.worlds.length === 0 });
    this._scene.worlds.push(world);
    return new GameWorld(world);
  }
}

// @orchestrator
export class GameEngine {
  constructor(canvas) {
    this._game = new GameEntity();
    // TODO: Refactor to create a generic system of engines
    this._game.renderEngine = new RenderEngine(canvas);
    this._game.renderState = this._game.renderEngine.state;
    this._game.inputEngine = new InputEngine(canvas);
    this._game.inputState = this._game.inputEngine.state;
    this._loop = new GameLoopSystem();
    this.useBefore(new LoaderSystem());
    this.useAfter(new TextSystem());
    this.useAfter(new GarbageCollectorSystem());
  }

  createScene() {
    const sceneEntity = new GameSceneEntity();
    this._game.scenes.push(sceneEntity);
    const scene = new GameScene(sceneEntity);
    scene.createWorld();
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

  run({ scene = 0 } = {}) {
    this._game.currentScene = scene;
    this._loop.run(this._game);
  }
}
