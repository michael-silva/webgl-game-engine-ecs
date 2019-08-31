import { RenderUtils, AnimationType } from './utils';
import { TransformComponent, RenderComponent } from './systems';

// @system
export class PreRenderSystem {
  constructor(bgColor = [0.0, 0.8, 0.0, 1.0]) {
    this._bgColor = bgColor;
  }

  run(game) {
    const { gl } = game.renderState;
    const scene = game.scenes[game.currentScene];
    RenderUtils.clearCanvas(gl, this._bgColor);
    scene.cameras.forEach((camera) => {
      RenderUtils.setupViewProjection(gl, camera);
    });
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
  constructor(bgColor = [0.0, 0.8, 0.0, 1.0]) {
    this._bgColor = bgColor;
  }

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
