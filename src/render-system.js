import { mat4 } from 'gl-matrix';
import {
  RenderUtils, AnimationType, ShaderUtils, CameraUtils,
} from './utils';
import { TransformComponent, RenderComponent, TextComponent } from './systems';
import {
  WorldCoordinateComponent, ViewportComponent, BackgroundComponent,
  BackgroundTypes, CameraViewport,
} from './camera';

export class SpriteAnimation {
  firstSpriteLeft = 0.0; // 0.0 is left corner of image

  top = 1.0;// 1.0 is top corner of image

  // default sprite element size is the entire image
  width = 1.0;

  height = 1.0;

  padding = 0.0;

  numFrames = 1;

  // number of elements in an animation
  // per animation settings
  animationType = AnimationType.AnimateRight;

  updateInterval = 1;

  // how often to advance
  // current animation state
  currentAnimAdvance = -1;

  currentSprite = 0;

  currentTick = 0;
}

// @system
export class TextRenderSystem {
  render(world, camera, renderState, game) {
    world.entities.forEach((e) => {
      e.components
        .filter((c) => c instanceof TextComponent)
        .forEach((text) => {
          if (!text || !game.resourceMap[text.font] || !game.resourceMap[text.font].loaded) return;
          text.characters.forEach((char) => {
            const { renderable, transform } = char;
            RenderUtils.renderEntity(game, camera, renderable, transform);
          });
        });
    });
  }
}

// @system
export class TextureRenderSystem {
  render(world, camera, renderState, game) {
    world.entities.forEach((e) => {
      const renderable = e.components.find((c) => c instanceof RenderComponent);
      const transform = e.components.find((c) => c instanceof TransformComponent);
      if (!renderable || !transform) return;
      const { texture } = renderable;
      const shader = texture
        ? renderState.shaders.textureShader
        : renderState.shaders.simpleShader;
      if (!shader || !shader.modelTransform) return;
      if (texture && (!game.resourceMap[texture] || !game.resourceMap[texture].loaded)) return;
      RenderUtils.renderEntity(game, camera, renderable, transform);
    });
  }
}

export class RenderState {
  constructor({ gl, shaders, buffers }) {
    this.gl = gl;
    this.shaders = shaders;
    this.buffers = buffers;
    this.systems = [];
  }
}

// @system
export class RenderEngine {
  constructor(canvas) {
    const gl = RenderUtils.getGL(canvas);
    const buffers = RenderUtils.initBuffers(gl);
    const shaders = {
      simpleShader: ShaderUtils.createSimpleShader({ gl, buffers }),
      textureShader: ShaderUtils.createTextureShader({ gl, buffers }),
      materialShader: ShaderUtils.createMaterialShader({ gl, buffers }),
    };

    this.state = new RenderState({
      gl,
      shaders,
      buffers,
    });
    this.state.systems.push(new TextureRenderSystem());
    this.state.systems.push(new TextRenderSystem());
  }

  run(game) {
    const scene = game.scenes[game.currentScene];

    scene.cameras.forEach((camera) => {
      this._preRenderSetup(game, camera);
      scene.worlds.forEach((world) => {
        if (!world.active) return;
        this.state.systems.forEach((system) => {
          system.render(world, camera, this.state, game);
        });
      });
    });
  }

  _preRenderSetup(game, camera) {
    this._setupViewProjection(this.state.gl, camera);
    const background = camera.components.find((c) => c instanceof BackgroundComponent);
    const { texture, type } = background;
    if (texture && (!game.resourceMap[texture] || !game.resourceMap[texture].loaded)) return;
    const worldCoordinate = camera.components.find((c) => c instanceof WorldCoordinateComponent);
    let { position } = background;
    if (type === BackgroundTypes.Fixed) {
      position = [
        position[0] + worldCoordinate.center[0],
        position[1] + worldCoordinate.center[1],
      ];
    }
    const transform = {
      size: background.size,
      position,
    };
    RenderUtils.renderEntity(game, camera, background, transform);
  }

  _setupViewProjection(gl, camera) {
    const worldCoordinate = camera.components.find((c) => c instanceof WorldCoordinateComponent);
    const viewport = camera.components.find((c) => c instanceof ViewportComponent);
    const background = camera.components.find((c) => c instanceof BackgroundComponent);

    // Step A: Set up and clear the Viewport
    // Step A1: Set up the viewport: area on canvas to be drawn
    gl.viewport(...viewport.array);
    // y position of bottom-left corner
    // width of the area to be drawn
    // height of the area to be drawn
    // Step A2: set up the corresponding scissor area to limit clear area
    gl.scissor(...viewport.bounds);
    // y position of bottom-left corner
    // width of the area to be drawn
    // height of the area to be drawn
    // Step A3: set the color to be clear to black
    gl.clearColor(...background.color); // set the color to be cleared

    // Step A4: enable and clear the scissor area
    gl.enable(gl.SCISSOR_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.SCISSOR_TEST);

    // Step B: Set up the View-Projection transform operator
    // Step B1: define the view matrix
    mat4.lookAt(camera.viewMatrix,
      [worldCoordinate.center[0], worldCoordinate.center[1], 10], // WC center
      [worldCoordinate.center[0], worldCoordinate.center[1], 0], //
      [0, 1, 0]); // orientation
    // Step B2: define the projection matrix
    const halfWCWidth = 0.5 * worldCoordinate.width;
    const halfWCHeight = halfWCWidth * (viewport.array[3] / viewport.array[2]);
    // WCHeight = WCWidth * viewportHeight / viewportWidth
    mat4.ortho(camera.projMatrix,
      -halfWCWidth,
      halfWCWidth,
      // distant to left of WC
      // distant to right of WC
      // distant to bottom of WC
      // distant to top of WC
      -halfWCHeight,
      halfWCHeight,
      viewport.nearPlane, // z-distant to near plane
      viewport.farPlane); // z-distant to far plane
    // Step B3: concatnate view and project matrices
    mat4.multiply(camera.viewProjection, camera.projMatrix, camera.viewMatrix);

    // Step B4: compute and cache per-rendering information
    const wcHeight = CameraUtils.getWcHeight(worldCoordinate, viewport.array);
    const wcWidth = worldCoordinate.width;
    // eslint-disable-next-line no-param-reassign
    camera.renderCache.wcToPixelRatio = viewport.array[CameraViewport.Width] / wcWidth;
    // eslint-disable-next-line no-param-reassign
    camera.renderCache.orgX = worldCoordinate.center[0] - (wcWidth / 2);
    // eslint-disable-next-line no-param-reassign
    camera.renderCache.orgY = worldCoordinate.center[1] - (wcHeight / 2);

    const p = CameraUtils.wcPosToPixel(camera, worldCoordinate.center);
    // eslint-disable-next-line no-param-reassign
    camera.renderCache.posInPixelSpace = [
      p[0],
      p[1],
      CameraUtils.fakeZInPixelSpace(camera, camera.cameraZ),
    ];
  }
}
