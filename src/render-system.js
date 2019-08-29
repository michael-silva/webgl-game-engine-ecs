import { RenderUtils, Color, TransformUtils } from './utils';
import { TransformComponent } from './systems';

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

// Assumption: first sprite in an animation is always the left-most element.
export const AnimationType = Object.freeze({
  AnimateRight: 0, // Animate from left to right, then restart to left
  AnimateLeft: 1, // Animate from right to left, then restart to right
  AnimateSwing: 2, // Animate first left to right, then animates backwards
});

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

// @component
export class RenderComponent {
  constructor({ color = Color.White, texture, sprite } = {}) {
    this.color = color;
    this.texture = texture;
    this.sprite = sprite;
  }
}

// @system
export class RenderSystem {
  constructor(bgColor = [0.0, 0.8, 0.0, 1.0]) {
    this._bgColor = bgColor;
  }

  run(game) {
    const { resourceMap } = game;
    const { gl, buffers, shaders } = game.renderState;
    const scene = game.scenes[game.currentScene];

    // TODO: Refactor this logic to split the texture and no texture, make this extensibility
    scene.worlds.forEach((world) => {
      if (!world.active) return;
      world.entities.forEach((e) => {
        const renderable = e.components.find((c) => c instanceof RenderComponent);
        const transform = e.components.find((c) => c instanceof TransformComponent);
        if (!renderable || !transform) return;
        const { vertexBuffer, textureBuffer, spriteBuffer } = buffers;
        const { color, texture, sprite } = renderable;
        const shader = texture ? shaders.textureShader : shaders.simpleShader;
        if (!shader || !shader.modelTransform) return;
        if (texture && (!resourceMap[texture] || !resourceMap[texture].loaded)) return;

        scene.cameras.forEach((camera) => {
          if (texture) this.activateTexture(gl, resourceMap[texture].asset);
          this.activateShader(gl, vertexBuffer, shader, color, camera);
          if (texture) {
            if (sprite) {
              const { position, animation } = sprite;
              const textureAsset = resourceMap[texture].asset;
              if (animation) this.updateAnimation(sprite);
              const pixelPosition = RenderUtils.fromPixelPositions(textureAsset, position);
              const texCoordinate = RenderUtils.getElementUVCoordinateArray(pixelPosition);
              this.setTextureCoordinate(gl, spriteBuffer, texCoordinate);
              this.activateTextureShader(gl, spriteBuffer, shader);
            }
            else this.activateTextureShader(gl, textureBuffer, shader);
          }
        });
        const xform = TransformUtils.getXForm(transform);
        gl.uniformMatrix4fv(shader.modelTransform, false, xform);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      });
    });
  }

  updateAnimation(sprite) {
    const { animation } = sprite;
    animation.currentTick++;
    if (animation.currentTick >= animation.updateInterval) {
      animation.currentTick = 0;
      animation.currentSprite += animation.currentAnimAdvance;
      if (animation.currentSprite >= 0
        && animation.currentSprite < animation.numFrames
        // eslint-disable-next-line no-underscore-dangle
        && animation._type === animation.animationType) {
        // eslint-disable-next-line no-param-reassign
        sprite.position = this.getSpriteElement(animation);
      }
      else {
        animation.currentTick = 0;
        switch (animation.animationType) {
          case AnimationType.AnimateRight:
          default:
            animation.currentSprite = 0;
            animation.currentAnimAdvance = 1;
            break;
          case AnimationType.AnimateSwing:
            animation.currentAnimAdvance *= -1;
            animation.currentSprite += 2 * animation.currentAnimAdvance;
            break;
          case AnimationType.AnimateLeft:
            animation.currentSprite = animation.numFrames - 1;
            animation.currentAnimAdvance = -1;
            break;
        }
        // eslint-disable-next-line no-param-reassign,no-underscore-dangle
        animation._type = animation.animationType;
      }
    }
  }

  getSpriteElement(animation) {
    const left = animation.firstSpriteLeft
      + (animation.currentSprite * (animation.width + animation.padding));
    return [left,
      left + animation.width,
      animation.top - animation.height,
      animation.top];
  }

  activateShader(gl, buffer, shader, color, camera) {
    gl.useProgram(shader.compiledShader);
    gl.uniformMatrix4fv(shader.viewProjection, false, camera.viewProjection);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(shader.shaderVertexPositionAttribute,
      3, // each element is a 3-float (x,y.z)
      gl.FLOAT, // data type is FLOAT
      false, // if the content is normalized vectors
      0, // number of bytes to skip in between elements
      0); // offsets to the first element

    gl.enableVertexAttribArray(shader.shaderVertexPositionAttribute);
    gl.uniform4fv(shader.pixelColor, color);
  }

  activateTextureShader(gl, buffer, shader) {
    const { shaderTextureCoordAttribute } = shader;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(shaderTextureCoordAttribute);
    gl.vertexAttribPointer(shaderTextureCoordAttribute, 2, gl.FLOAT, false, 0, 0);
  }

  setTextureCoordinate(gl, buffer, textureCoordinate) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(textureCoordinate));
  }

  activateTexture(gl, textureInfo) {
    // Binds our texture reference to the current webGL texture functionality
    gl.bindTexture(gl.TEXTURE_2D, textureInfo.texID);
    // To prevent texture wrappings
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // Handles how magnification and minimization filters will work.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    // For pixel-graphics where you want the texture to look "sharp"
    //     do the following:
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  }

  cleanUpBuffer(gl, buffer) {
    gl.deleteBuffer(buffer);
  }

  cleanUp(gl, shader) {
    const { compiledShader, vertexShader, fragmentShader } = shader;
    gl.detachShader(compiledShader, vertexShader);
    gl.detachShader(compiledShader, fragmentShader);
    gl.deleteBuffer(vertexShader);
    gl.deleteBuffer(fragmentShader);
  }
}
