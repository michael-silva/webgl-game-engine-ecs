/* eslint-disable max-classes-per-file */

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

// @orchestrator
export class GameEngine {
  constructor(canvas) {
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
    this.use(new RenderSystem());
  }

  use(system) {
    this._game.systems.push(system);
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
