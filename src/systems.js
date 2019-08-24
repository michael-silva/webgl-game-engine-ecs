import { mat4 } from 'gl-matrix';
import { RenderUtils, Color, TransformUtils } from './utils';


// @component
export class RenderComponent {
  constructor({ color = Color.White } = {}) {
    this.color = color;
  }
}

// @component
export class TransformComponent {
  constructor({ position, size, rotationInRadians } = {}) {
    this.position = position || [0, 0];
    this.size = size || [1, 1];
    this.rotationInRadians = rotationInRadians || 0;
  }
}

// @system
export class RenderSystem {
  constructor(bgColor = [0.0, 0.8, 0.0, 1.0]) {
    this._bgColor = bgColor;
  }

  run({ entities }, { renderState, cameras }) {
    const { gl, glVertexBuffer, shaders } = renderState;
    RenderUtils.clearCanvas(gl, this._bgColor);
    cameras.forEach((camera) => {
      this.setupViewProjection(gl, camera);
    });

    entities.forEach((e) => {
      const renderable = e.components.find((c) => c instanceof RenderComponent);
      const transform = e.components.find((c) => c instanceof TransformComponent);
      if (!renderable || !transform) return;
      if (!shaders.simpleShader || !shaders.simpleShader.modelTransform) return;
      const { color } = renderable;
      const { simpleShader } = shaders;

      cameras.forEach((camera) => {
        this.activateShader(gl, glVertexBuffer, simpleShader, color, camera);
      });
      const xform = TransformUtils.getXForm(transform);
      gl.uniformMatrix4fv(simpleShader.modelTransform, false, xform);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    });
  }

  activateShader(gl, glVertexBuffer, shader, color, camera) {
    gl.useProgram(shader.compiledShader);
    gl.uniformMatrix4fv(shader.viewProjection, false, camera.viewProjection);

    gl.bindBuffer(gl.ARRAY_BUFFER, glVertexBuffer);
    gl.vertexAttribPointer(shader.shaderVertexPositionAttribute,
      3, // each element is a 3-float (x,y.z)
      gl.FLOAT, // data type is FLOAT
      false, // if the content is normalized vectors
      0, // number of bytes to skip in between elements
      0); // offsets to the first element

    gl.enableVertexAttribArray(shader.shaderVertexPositionAttribute);
    gl.uniform4fv(shader.pixelColor, color);
  }

  setupViewProjection(gl, camera) {
    // Step A: Set up and clear the Viewport
    // Step A1: Set up the viewport: area on canvas to be drawn
    gl.viewport(...camera.viewport);
    // y position of bottom-left corner
    // width of the area to be drawn
    // height of the area to be drawn
    // Step A2: set up the corresponding scissor area to limit clear area
    gl.scissor(...camera.viewport);
    // y position of bottom-left corner
    // width of the area to be drawn
    // height of the area to be drawn
    // Step A3: set the color to be clear to black
    gl.clearColor(...camera.bgColor); // set the color to be cleared

    // Step A4: enable and clear the scissor area
    gl.enable(gl.SCISSOR_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.SCISSOR_TEST);

    // Step B: Set up the View-Projection transform operator
    // Step B1: define the view matrix
    mat4.lookAt(camera.viewMatrix,
      [camera.center[0], camera.center[1], 10], // WC center
      [camera.center[0], camera.center[1], 0], //
      [0, 1, 0]); // orientation
    // Step B2: define the projection matrix
    const halfWCWidth = 0.5 * camera.width;
    const halfWCHeight = halfWCWidth * (camera.viewport[3] / camera.viewport[2]);
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
      camera.nearPlane, // z-distant to near plane
      camera.farPlane); // z-distant to far plane
    // Step B3: concatnate view and project matrices
    mat4.multiply(camera.viewProjection, camera.projMatrix, camera.viewMatrix);
  }
}
