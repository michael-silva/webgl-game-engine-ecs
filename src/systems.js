import { RenderUtils, Color } from './utils';


// @component
export class RenderComponent {
  constructor({ color = Color.White } = {}) {
    this.color = color;
  }
}

// @system
export class RenderSystem {
  constructor(bgColor = [0.0, 0.8, 0.0, 1.0]) {
    this._bgColor = bgColor;
  }

  run({ entities }, { renderState }) {
    const { gl, shaders } = renderState;
    RenderUtils.clearCanvas(gl, this._bgColor);

    entities.forEach((e) => {
      const renderable = e.components.find((c) => c instanceof RenderComponent);
      if (!renderable) return;
      const { color } = renderable;
      this.activateShader(gl, shaders.simpleShader, color);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    });
  }

  activateShader(gl, shader, color) {
    gl.useProgram(shader.compiledShader);
    gl.enableVertexAttribArray(shader.shaderVertexPositionAttribute);
    gl.uniform4fv(shader.pixelColor, color);
  }
}
