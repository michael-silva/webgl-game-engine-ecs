import simpleVertexShader from './GLSLShaders/SimpleVS.glsl';
import simpleFragmentShader from './GLSLShaders/SimpleFS.glsl';

export class RenderUtils {
  static getGL(canvas) {
    const gl = canvas.getContext('webgl', { alpha: false });
    if (!gl) throw new Error("Your browser don't suport a WEBGL");
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

    // Step A: Allocate and store vertex positions into the webGL context
    // Create a buffer on the gl context for our vertex positions
    const squareVertexBuffer = gl.createBuffer();
    // Step B: Activate vertexBuffer
    gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexBuffer);
    // Step C: Loads verticesOfSquare into the vertexBuffer
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(verticesOfSquare),
      gl.STATIC_DRAW,
    );

    return squareVertexBuffer;
  }

  /* static processImage(gl, textureName, image) {
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
  } */
}

// @component
export class SimpleShader {
  shader = null;

  shaderVertexPositionAttribute = null;

  pixelColor = null;
}

export class ShaderUtils {
  static loadAndCompileShader(gl, shaderSource, shaderType) {
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

  static createSimpleShader({ gl, glVertexBuffer }) {
    // Step A: load and compile the vertex and fragment shaders
    const vertexShader = ShaderUtils.loadAndCompileShader(gl, simpleVertexShader, gl.VERTEX_SHADER);
    const fragmentShader = ShaderUtils.loadAndCompileShader(
      gl,
      simpleFragmentShader,
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
    gl.bindBuffer(gl.ARRAY_BUFFER, glVertexBuffer);
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

    return {
      pixelColor,
      compiledShader,
      shaderVertexPositionAttribute,
    };
  }
}

export const Color = {
  White: [1, 1, 1, 1],
  Red: [1, 0, 0, 1],
};
