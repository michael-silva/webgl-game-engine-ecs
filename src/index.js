/* eslint-disable max-classes-per-file */

import { mat4, vec2 } from 'gl-matrix';
import { RenderUtils, ShaderUtils } from './utils';
import {
  GameLoopSystem, LoaderSystem,
  TextSystem, GarbageCollectorSystem,
} from './systems';
import { RenderSystem, PreRenderSystem } from './render-system';
import { InputSystem } from './input-system';

// @component
export class GameRenderState {
  constructor(gl, buffers) {
    this.gl = gl;
    this.buffers = buffers;
    this.shaders = {};
  }
}

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


// @entity
export class GameSceneEntity {
  sound = null;

  resources = [];

  cameras = [];

  keyboard = null; // reference

  mouse = null; // reference

  worlds = [];

  systems = [];
}


// @entity
export class GameEntity {
  loaders = [];

  resourceMap = {};

  renderState = null;

  loopState = new LoopState();

  keyboard = null; // reference

  mouse = null; // reference

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
  constructor(canvas, { bgColor }) {
    this._game = new GameEntity();
    const gl = RenderUtils.getGL(canvas);
    const vertexBuffer = RenderUtils.initBuffers(gl);
    const state = new GameRenderState(gl, vertexBuffer);
    state.shaders = {
      simpleShader: ShaderUtils.createSimpleShader(state),
      textureShader: ShaderUtils.createTextureShader(state),
    };
    this._game.renderState = state;
    this._loop = new GameLoopSystem();
    this.useBefore(new LoaderSystem());
    this.useBefore(new InputSystem(canvas));
    this.useAfter(new PreRenderSystem(bgColor));
    this.useAfter(new RenderSystem());
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

  start({ scene = 0 } = {}) {
    this._game.currentScene = scene;
    this._loop.run(this._game);
  }
}
