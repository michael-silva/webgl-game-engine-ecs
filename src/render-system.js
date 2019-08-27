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

// @component
export class RenderComponent {
  constructor({ color = Color.White, texture } = {}) {
    this.color = color;
    this.texture = texture;
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
        const shader = shaders.textureShader;
        const { vertexBuffer, textureBuffer } = buffers;
        const { color, texture } = renderable;
        if (!shader || !shader.modelTransform) return;
        if (texture && (!resourceMap[texture] || !resourceMap[texture].loaded)) return;

        scene.cameras.forEach((camera) => {
          if (texture) this.activateTexture(gl, resourceMap[texture].asset);
          this.activateShader(gl, vertexBuffer, shader, color, camera);
          if (texture) this.activateTextureShader(gl, textureBuffer, shader, texture);
        });
        const xform = TransformUtils.getXForm(transform);
        gl.uniformMatrix4fv(shader.modelTransform, false, xform);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      });
    });
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
}
