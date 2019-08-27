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

  static initSquareBuffer(gl) {
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

    return {
      vertexBuffer,
      textureBuffer,
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
