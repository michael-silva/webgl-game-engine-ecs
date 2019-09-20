import simpleVertexShader from './GLSLShaders/SimpleVS.glsl';
import simpleFragmentShader from './GLSLShaders/SimpleFS.glsl';
import lineFragmentShader from './GLSLShaders/LineFS.glsl';
import textureVertexShader from './GLSLShaders/TextureVS.glsl';
import lightFragmentShader from './GLSLShaders/LightFS.glsl';
import shadowReceiverFragmentShader from './GLSLShaders/ShadowReceiverFS.glsl';
import shadowCasterFragmentShader from './GLSLShaders/ShadowCasterFS.glsl';
import illuminationFragmentShader from './GLSLShaders/IlluminationFS.glsl';
import particleFragmentShader from './GLSLShaders/ParticleFS.glsl';

class GLShader {
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

  constructor({
    gl, buffer, vertexShaderSource, fragmentShaderSource,
  }) {
    // Step A: load and compile the vertex and fragment shaders
    const vertexShader = GLShader.compileShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = GLShader.compileShader(
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
    const globalAmbientColor = gl.getUniformLocation(compiledShader, 'uGlobalAmbientColor');
    const globalAmbientIntensity = gl.getUniformLocation(compiledShader, 'uGlobalAmbientIntensity');

    Object.assign(this, {
      pixelColor,
      compiledShader,
      vertexShader,
      fragmentShader,
      modelTransform,
      viewProjection,
      globalAmbientColor,
      globalAmbientIntensity,
      shaderVertexPositionAttribute,
    });
  }
}

export class SimpleShader extends GLShader {
  constructor({ gl, buffers }) {
    super({
      gl,
      buffer: buffers.vertexBuffer,
      vertexShaderSource: simpleVertexShader,
      fragmentShaderSource: simpleFragmentShader,
    });
  }
}

export class LineShader extends GLShader {
  constructor({ gl, buffers }) {
    super({
      gl,
      buffer: buffers.vertexBuffer,
      vertexShaderSource: simpleVertexShader,
      fragmentShaderSource: lineFragmentShader,
    });

    // point size uniform
    this.pointSizeRef = gl.getUniformLocation(this.compiledShader, 'uPointSize');
    this.pointSize = 1;
  }
}

export class TextureShader extends GLShader {
  constructor({ gl, buffers }) {
    super({
      gl,
      buffer: buffers.vertexBuffer,
      vertexShaderSource: textureVertexShader,
      fragmentShaderSource: lightFragmentShader,
    });

    this.shaderTextureCoordAttribute = gl.getAttribLocation(this.compiledShader, 'aTextureCoordinate');
    this.shaderSampler = gl.getUniformLocation(this.compiledShader, 'uSampler');
    this.lightsSize = gl.getUniformLocation(this.compiledShader, 'uLightsSize');
    this.lights = [];
  }
}

export class MaterialShader extends GLShader {
  constructor({ gl, buffers }) {
    super({
      gl,
      buffer: buffers.vertexBuffer,
      vertexShaderSource: textureVertexShader,
      fragmentShaderSource: illuminationFragmentShader,
    });
    const shaderTextureCoordAttribute = gl.getAttribLocation(this.compiledShader, 'aTextureCoordinate');
    const shaderSampler = gl.getUniformLocation(this.compiledShader, 'uSampler');
    const normalSampler = gl.getUniformLocation(this.compiledShader, 'uNormalSampler');
    const lightsSize = gl.getUniformLocation(this.compiledShader, 'uLightsSize');

    const materialAmbient = gl.getUniformLocation(this.compiledShader, 'uMaterial.Ka');
    const materialDiffuse = gl.getUniformLocation(this.compiledShader, 'uMaterial.Kd');
    const materialSpecular = gl.getUniformLocation(this.compiledShader, 'uMaterial.Ks');
    const materialShininess = gl.getUniformLocation(this.compiledShader, 'uMaterial.Shininess');

    const cameraPosition = gl.getUniformLocation(this.compiledShader, 'uCameraPosition');

    Object.assign(this, {
      shaderSampler,
      lightsSize,
      lights: [],
      materialAmbient,
      materialDiffuse,
      materialShininess,
      materialSpecular,
      cameraPosition,
      shaderTextureCoordAttribute,
      normalSampler,
    });
  }
}

export class ShadowCasterShader extends GLShader {
  constructor({ gl, buffers }) {
    super({
      gl,
      buffer: buffers.vertexBuffer,
      vertexShaderSource: textureVertexShader,
      fragmentShaderSource: shadowCasterFragmentShader,
    });
    this.shaderTextureCoordAttribute = gl.getAttribLocation(this.compiledShader, 'aTextureCoordinate');
    this.shaderSampler = gl.getUniformLocation(this.compiledShader, 'uSampler');
  }
}

export class ShadowReceiverShader extends GLShader {
  constructor({ gl, buffers }) {
    super({
      gl,
      buffer: buffers.vertexBuffer,
      vertexShaderSource: textureVertexShader,
      fragmentShaderSource: shadowReceiverFragmentShader,
    });
    this.shaderTextureCoordAttribute = gl.getAttribLocation(this.compiledShader, 'aTextureCoordinate');
    this.shaderSampler = gl.getUniformLocation(this.compiledShader, 'uSampler');
  }
}

export class ParticleShader extends GLShader {
  constructor({ gl, buffers }) {
    super({
      gl,
      buffer: buffers.vertexBuffer,
      vertexShaderSource: textureVertexShader,
      fragmentShaderSource: particleFragmentShader,
    });

    this.shaderTextureCoordAttribute = gl.getAttribLocation(this.compiledShader, 'aTextureCoordinate');
    this.shaderSampler = gl.getUniformLocation(this.compiledShader, 'uSampler');
  }
}
