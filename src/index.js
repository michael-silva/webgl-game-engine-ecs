/* eslint-disable max-classes-per-file */

import { mat4, vec2 } from 'gl-matrix';
import { RenderUtils, ShaderUtils } from './utils';
import { GameLoopSystem } from './systems';
import { RenderSystem } from './render-system';
import { InputSystem } from './input-system';

// @component
export class GameRenderState {
  constructor(gl, glVertexBuffer) {
    this.gl = gl;
    this.glVertexBuffer = glVertexBuffer;
    this.shaders = {};
  }
}

// @component
export class GameWorldEntity {
  resources = [];

  entities = [];

  systems = [];

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
  cameras = [];

  keyboard = null; // reference

  mouse = null; // reference

  worlds = [];

  systems = [];
}


// @entity
export class GameEntity {
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
  constructor(world) {
    this._world = world;
  }

  addEntity(entity) {
    this._world.entities.push(entity);
  }
}

class GameScene {
  constructor(scene) {
    this._scene = scene;
  }

  use(system) {
    this._scene.systems.push(system);
  }

  addCamera(camera) {
    this._scene.cameras.push(camera);
  }

  addEntity(entity, world) {
    const theWorld = world || this._scene.worlds[0];
    theWorld.entities.push(entity);
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
    const vertexBuffer = RenderUtils.initSquareBuffer(gl);
    const state = new GameRenderState(gl, vertexBuffer);
    state.shaders = {
      simpleShader: ShaderUtils.createSimpleShader(state),
    };
    this._game.renderState = state;
    this._loop = new GameLoopSystem();
    this.useBefore(new InputSystem(canvas));
    this.useAfter(new RenderSystem(bgColor));
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

  start() {
    this._loop.run(this._game);
  }
}
