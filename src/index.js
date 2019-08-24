/* eslint-disable max-classes-per-file */

import { mat4, vec2 } from 'gl-matrix';
import { RenderUtils, ShaderUtils } from './utils';
import { RenderSystem } from './systems';

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
}

// @entity
export class GameElement {
  cameras = [];

  renderState = null;

  currentWorld = 0;

  worlds = [];

  systems = [];
}

// @entity
export class GameObject {
  components = []
}

// @system
export class GameLoop {
  run(game) {
    // TODO: smell
    const world = game.worlds[game.currentWorld];
    world.systems.forEach((s) => s.run(world, game));
    game.systems.forEach((s) => s.run(world, game));
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
    const defaultWorld = new GameWorld();
    this._game.worlds.push(defaultWorld);
    this._loop = new GameLoop();
    this.use(new RenderSystem(bgColor));
  }

  use(system) {
    this._game.systems.push(system);
  }

  addCamera(camera) {
    this._game.cameras.push(camera);
  }

  addEntity(entity) {
    // TODO: smell
    this._game.worlds[this._game.currentWorld].entities.push(entity);
  }

  addScene(scene) {
    this._game.worlds.push(scene);
  }

  start() {
    this._loop.run(this._game);
  }
}
