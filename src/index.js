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
export class GameWorld {
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
export class GameElement {
  cameras = [];

  renderState = null;

  loopState = new LoopState();

  keyboard = null;

  mouse = null;

  worlds = [];

  systems = [];

  renderSystem = null;

  inputSystem = null;
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

// @orchestrator
export class GameEngine {
  constructor(canvas, { bgColor }) {
    this._game = new GameElement();
    const gl = RenderUtils.getGL(canvas);
    const vertexBuffer = RenderUtils.initSquareBuffer(gl);
    const state = new GameRenderState(gl, vertexBuffer);
    state.shaders = {
      simpleShader: ShaderUtils.createSimpleShader(state),
    };
    this._game.renderState = state;
    const defaultWorld = new GameWorld({ active: true });
    this._game.worlds.push(defaultWorld);
    this._loop = new GameLoopSystem();
    this.useInput(new InputSystem(canvas));
    this.useRender(new RenderSystem(bgColor));
  }

  useInput(system) {
    this._game.inputSystem = system;
  }

  useRender(system) {
    this._game.renderSystem = system;
  }

  use(system) {
    this._game.systems.push(system);
  }

  addCamera(camera) {
    this._game.cameras.push(camera);
  }

  addEntity(entity) {
    const world = this._game.worlds.find((w) => w.active);
    world.entities.push(entity);
  }

  addScene(scene) {
    this._game.worlds.push(scene);
  }

  start() {
    this._loop.run(this._game);
  }
}
