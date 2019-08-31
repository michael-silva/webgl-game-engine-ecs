import { vec3, mat4 } from 'gl-matrix';
import simpleVertexShader from './GLSLShaders/SimpleVS.glsl';
import simpleFragmentShader from './GLSLShaders/SimpleFS.glsl';
import textureVertexShader from './GLSLShaders/TextureVS.glsl';
import textureFragmentShader from './GLSLShaders/TextureFS.glsl';

export class TransformUtils {
  static getXForm(transform) {
    const { position = [0, 0], size = [1, 1], rotationInRadians = 0 } = transform;
    const [x, y] = position;
    const [width, height] = size;
    const xform = mat4.create();
    // Step E: compute the white square transform
    mat4.translate(xform, xform, vec3.fromValues(x, y, 0.0));
    mat4.rotateZ(xform, xform, rotationInRadians);
    mat4.scale(xform, xform, vec3.fromValues(width, height, 1.0));

    return xform;
  }

  static degreeToRadians(degree) {
    return degree * (Math.PI / 180.0);
  }
}

export class TextureInfo {
  constructor(name, width, height, id) {
    this.name = name;
    this.width = width;
    this.height = height;
    this.texID = id;
    this.colorArray = null;
  }
}


// Assumption: first sprite in an animation is always the left-most element.
export const AnimationType = Object.freeze({
  AnimateRight: 0, // Animate from left to right, then restart to left
  AnimateLeft: 1, // Animate from right to left, then restart to right
  AnimateSwing: 2, // Animate first left to right, then animates backwards
});

export class RenderUtils {
  static getGL(canvas) {
    const gl = canvas.getContext('webgl', { alpha: false });
    if (!gl) throw new Error("Your browser don't suport a WEBGL");
    // Allows transperency with textures.
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);
    // Set images to flip the y axis to match the texture coordinate space.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    return gl;
  }

  static clearCanvas(gl, color) {
    gl.clearColor(...color);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  static initBuffers(gl) {
    const verticesOfSquare = [
      0.5, 0.5, 0.0,
      -0.5, 0.5, 0.0,
      0.5, -0.5, 0.0,
      -0.5, -0.5, 0.0,
    ];

    const textureCoordinates = [
      1.0, 1.0,
      0.0, 1.0,
      1.0, 0.0,
      0.0, 0.0,
    ];

    // Step A: Allocate and store vertex positions into the webGL context
    // Create a buffer on the gl context for our vertex positions
    const vertexBuffer = gl.createBuffer();
    // Step B: Activate vertexBuffer
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    // Step C: Loads verticesOfSquare into the vertexBuffer
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(verticesOfSquare),
      gl.STATIC_DRAW,
    );

    // Step B: Allocate and store texture coordinates
    // Create a buffer on the gGL context for our vertex positions
    const textureBuffer = gl.createBuffer();
    // Activate vertexBuffer
    gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
    // Loads verticesOfSquare into the vertexBuffer
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(textureCoordinates),
      gl.STATIC_DRAW,
    );

    // Step B: Allocate and store texture coordinates
    // Create a buffer on the gGL context for our vertex positions
    const spriteBuffer = gl.createBuffer();
    // Activate vertexBuffer
    gl.bindBuffer(gl.ARRAY_BUFFER, spriteBuffer);
    // Loads verticesOfSquare into the vertexBuffer
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(textureCoordinates),
      gl.DYNAMIC_DRAW,
    );

    return {
      vertexBuffer,
      textureBuffer,
      spriteBuffer,
    };
  }

  static setupViewProjection(gl, camera) {
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

  static processImage(gl, textureName, image) {
    if (image instanceof TextureInfo) return image;
    const textureID = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, textureID);

    // Load the texture into the texture data structure with descriptive info.
    // Parameters:
    // 1: Which "binding point" or target the texture is being loaded to.
    // 2: Level of detail. Used for mipmapping. 0 is base texture level.
    // 3: Internal format. The composition of each element, i.e. pixels.
    // 4: Format of texel data. Must match internal format.
    // 5: The data type of the texel data.
    // 6: Texture Data.
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      image,
    );

    // Creates a mipmap for this texture.
    gl.generateMipmap(gl.TEXTURE_2D);
    // Tells WebGL we are done manipulating data at the mGL.TEXTURE_2D target.
    gl.bindTexture(gl.TEXTURE_2D, null);
    const texInfo = new TextureInfo(
      textureName,
      image.naturalWidth,
      image.naturalHeight,
      textureID,
    );
    return texInfo;
  }

  static getElementUVCoordinateArray([left, right, bottom, top]) {
    return [
      right, top,
      left, top,
      right, bottom,
      left, bottom,
    ];
  }

  // the expected texture cooridnate array is an array of 8 floats where:
  //  [0] [1]: is u/v cooridnate of Top-Right
  //  [2] [3]: is u/v coordinate of Top-Left
  //  [4] [5]: is u/v coordinate of Bottom-Right
  //  [6] [7]: is u/v coordinate of Bottom-Left
  static TextureCoordinateArray = Object.freeze({
    Left: 2,
    Right: 0,
    Top: 1,
    Bottom: 5,
  });

  static fromPixelPositions(texture, [left, right, bottom, top]) {
    // entire image width, height
    const imageW = texture.width;
    const imageH = texture.height;
    const texLeft = left / imageW;
    const texRight = right / imageW;
    const texBottom = bottom / imageH;
    const texTop = top / imageH;
    return [
      texLeft,
      texRight,
      texBottom,
      texTop,
    ];
  }

  static toPixelPositions(texture, [left, right, bottom, top]) {
    // entire image width, height
    const imageW = texture.width;
    const imageH = texture.height;
    const texLeft = imageW * left;
    const texRight = imageW * right;
    const texBottom = imageH * bottom;
    const texTop = imageH * top;
    return [
      texLeft,
      texRight,
      texBottom,
      texTop,
    ];
  }

  static renderEntity(game, renderable, transform) {
    const { resourceMap } = game;
    const { gl, buffers, shaders } = game.renderState;
    const scene = game.scenes[game.currentScene];
    const { vertexBuffer, textureBuffer, spriteBuffer } = buffers;
    const { color, texture, sprite } = renderable;
    const textureAsset = texture ? resourceMap[texture].asset : renderable.textureAsset;
    const shader = textureAsset ? shaders.textureShader : shaders.simpleShader;

    scene.cameras.forEach((camera) => {
      if (textureAsset) RenderUtils.activateTexture(gl, textureAsset);
      RenderUtils.activateShader(gl, vertexBuffer, shader, color, camera);
      if (textureAsset) {
        if (sprite) {
          const { position, animation } = sprite;
          if (animation) RenderUtils.updateAnimation(sprite);
          const pixelPosition = RenderUtils.fromPixelPositions(textureAsset, position);
          const texCoordinate = RenderUtils.getElementUVCoordinateArray(pixelPosition);
          RenderUtils.setTextureCoordinate(gl, spriteBuffer, texCoordinate);
          RenderUtils.activateTextureShader(gl, spriteBuffer, shader);
        }
        else RenderUtils.activateTextureShader(gl, textureBuffer, shader);
      }
    });

    const xform = TransformUtils.getXForm(transform);
    gl.uniformMatrix4fv(shader.modelTransform, false, xform);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  static updateAnimation(sprite) {
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
        sprite.position = RenderUtils.getSpriteElement(animation);
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

  static getSpriteElement(animation) {
    const left = animation.firstSpriteLeft
      + (animation.currentSprite * (animation.width + animation.padding));
    return [left,
      left + animation.width,
      animation.top - animation.height,
      animation.top];
  }

  static activateShader(gl, buffer, shader, color, camera) {
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

  static activateTextureShader(gl, buffer, shader) {
    const { shaderTextureCoordAttribute } = shader;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(shaderTextureCoordAttribute);
    gl.vertexAttribPointer(shaderTextureCoordAttribute, 2, gl.FLOAT, false, 0, 0);
  }

  static setTextureCoordinate(gl, buffer, textureCoordinate) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(textureCoordinate));
  }

  static activateTexture(gl, textureInfo) {
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

  static cleanUpBuffer(gl, buffer) {
    gl.deleteBuffer(buffer);
  }

  static cleanUp(gl, shader) {
    const { compiledShader, vertexShader, fragmentShader } = shader;
    gl.detachShader(compiledShader, vertexShader);
    gl.detachShader(compiledShader, fragmentShader);
    gl.deleteBuffer(vertexShader);
    gl.deleteBuffer(fragmentShader);
  }
}

// @component
export class SimpleShader {
  shader = null;

  shaderVertexPositionAttribute = null;

  pixelColor = null;
}

export class ShaderUtils {
  static compileShader(gl, shaderSource, shaderType) {
    // Step B: Create the shader based on the source type: vertex or fragment
    const compiledShader = gl.createShader(shaderType);
    // Step C: Compile the created shader
    gl.shaderSource(compiledShader, shaderSource);
    gl.compileShader(compiledShader);
    // Step D: check for error and return result
    if (!gl.getShaderParameter(compiledShader, gl.COMPILE_STATUS)) {
      throw new Error(`A shader compiling error occurred: ${gl.getShaderInfoLog(compiledShader)}`);
    }
    return compiledShader;
  }

  static createShader({
    gl, buffer, vertexShaderSource, fragmentShaderSource,
  }) {
    // Step A: load and compile the vertex and fragment shaders
    const vertexShader = ShaderUtils.compileShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = ShaderUtils.compileShader(
      gl,
      fragmentShaderSource,
      gl.FRAGMENT_SHADER,
    );
    // Step B: Create and link the shaders into a program.
    const compiledShader = gl.createProgram();
    gl.attachShader(compiledShader, vertexShader);
    gl.attachShader(compiledShader, fragmentShader);
    gl.linkProgram(compiledShader);
    // Step C: check for error
    if (!gl.getProgramParameter(compiledShader, gl.LINK_STATUS)) {
      throw new Error('Error linking shader');
    }
    // Step D: Gets a reference to the aSquareVertexPosition attribute
    const shaderVertexPositionAttribute = gl.getAttribLocation(compiledShader, 'aSquareVertexPosition');
    // Step E: Activates the vertex buffer loaded in VertexBuffer.js
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    // Step F: Describe the characteristic of the vertex position attribute
    gl.vertexAttribPointer(shaderVertexPositionAttribute,
      3, // each vertex element is a 3-float (x,y,z)
      gl.FLOAT, // data type is FLOAT
      false, // if the content is normalized vectors
      0, // number of bytes to skip in between elements
      0); // offsets to the first element

    // Step G: Gets a reference to the uniform variable uPixelColor in the
    // fragment shader
    const pixelColor = gl.getUniformLocation(compiledShader, 'uPixelColor');
    const modelTransform = gl.getUniformLocation(compiledShader, 'uModelTransform');
    const viewProjection = gl.getUniformLocation(compiledShader, 'uViewProjTransform');

    return {
      pixelColor,
      compiledShader,
      vertexShader,
      fragmentShader,
      modelTransform,
      viewProjection,
      shaderVertexPositionAttribute,
    };
  }

  static createSimpleShader({ gl, buffers }) {
    const shader = ShaderUtils.createShader({
      gl,
      buffer: buffers.vertexBuffer,
      vertexShaderSource: simpleVertexShader,
      fragmentShaderSource: simpleFragmentShader,
    });

    return shader;
  }

  static createTextureShader({ gl, buffers }) {
    const shader = ShaderUtils.createShader({
      gl,
      buffer: buffers.vertexBuffer,
      vertexShaderSource: textureVertexShader,
      fragmentShaderSource: textureFragmentShader,
    });
    const shaderTextureCoordAttribute = gl.getAttribLocation(shader.compiledShader, 'aTextureCoordinate');

    return {
      ...shader,
      shaderTextureCoordAttribute,
    };
  }
}

export const Color = {
  White: [1, 1, 1, 1],
  Red: [1, 0, 0, 1],
  Blue: [0, 0, 1, 1],
  Green: [0, 1, 0, 1],
  Transparent: [0, 0, 0, 0],
};
