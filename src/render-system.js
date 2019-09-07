import { mat4 } from 'gl-matrix';
import { RenderUtils, AnimationType } from './utils';
import { TransformComponent, RenderComponent } from './systems';
import {
  WorldCoordinateComponent, ViewportComponent, BackgroundComponent, BackgroundTypes,
} from './camera';

// @system
export class PreRenderSystem {
  run(game) {
    const { gl } = game.renderState;
    const scene = game.scenes[game.currentScene];
    // RenderUtils.clearCanvas(gl, this._bgColor);
    scene.cameras.forEach((camera) => {
      this.setupViewProjection(gl, camera);
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
      RenderUtils.renderEntity(game, background, transform);
    });
  }

  setupViewProjection(gl, camera) {
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
    gl.scissor(...viewport.array);
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
  }
}

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
export class RenderSystem {
  run(game) {
    const { resourceMap } = game;
    const { shaders } = game.renderState;
    const scene = game.scenes[game.currentScene];

    // TODO: Refactor this logic to split the texture and no texture, make this extensibility
    scene.worlds.forEach((world) => {
      if (!world.active) return;
      world.entities.forEach((e) => {
        const renderable = e.components.find((c) => c instanceof RenderComponent);
        const transform = e.components.find((c) => c instanceof TransformComponent);
        if (!renderable || !transform) return;
        const { texture } = renderable;
        const shader = texture ? shaders.textureShader : shaders.simpleShader;
        if (!shader || !shader.modelTransform) return;
        if (texture && (!resourceMap[texture] || !resourceMap[texture].loaded)) return;
        RenderUtils.renderEntity(game, renderable, transform);
      });
    });
  }
}
