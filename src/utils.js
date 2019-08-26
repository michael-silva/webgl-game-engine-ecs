import { vec3, mat4 } from 'gl-matrix';
import simpleVertexShader from './GLSLShaders/SimpleVS.glsl';
import simpleFragmentShader from './GLSLShaders/SimpleFS.glsl';

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

  static createSimpleShader({ gl, glVertexBuffer }) {
    // Step A: load and compile the vertex and fragment shaders
    const vertexShader = ShaderUtils.compileShader(gl, simpleVertexShader, gl.VERTEX_SHADER);
    const fragmentShader = ShaderUtils.compileShader(
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
}

class ResourceEntry {
  ref = 0;

  asset = null;

  loaded = false;

  constructor({ key }) {
    this.key = key;
  }
}

export class ResourceLoader {
  static getActiveResources(scene) {
    const words = scene.worlds.filter((w) => w.active && w.resources);
    return [...scene.resources, ...words.flatMap((w) => w.resources)];
  }

  static updateResource(game, key) {
    const { resourceMap } = game;
    if (!resourceMap[key]) {
      resourceMap[key] = new ResourceEntry({ key, ref: 1 });
      fetch(key)
        .then((res) => (key.endsWith('.json') ? res.json() : res.arrayBuffer()))
        .then((data) => {
          resourceMap[key].asset = data;
          resourceMap[key].loaded = true;
        });
    }
    else {
      resourceMap[key].ref++;
    }
  }

  static loadSceneResources(game, scene) {
    scene.resources.forEach((key) => {
      ResourceLoader.updateResource(game, key);
    });
  }

  static loadWorldsResources(game, scene) {
    const worlds = scene.worlds.filter((w) => w.active && w.resources);
    worlds.forEach((w) => {
      w.resources.forEach((key) => ResourceLoader.updateResource(game, key));
      if (!w._cache) w._cache = {};
      w._cache.active = true;
    });
  }

  static hasUnloadedResources(game, scene) {
    const { resourceMap } = game;
    const resources = ResourceLoader.getActiveResources(scene);
    return resources.length > 0
      && resources.some((key) => !resourceMap[key] || !resourceMap[key].loaded);
  }

  static unloadWorldsResources(game, scene) {
    const { resourceMap } = game;
    const worlds = scene.worlds.filter((w) => w._cache && w._cache.active && !w.active);
    const resources = [
      ...scene.resources,
      ...worlds.flatMap((world) => world.resources || []),
    ];

    worlds.forEach((w) => {
      w._cache.active = false;
    });
    resources.forEach((key) => {
      if (!resourceMap[key]) return;
      resourceMap[key].ref--;
      if (resourceMap[key].ref === 0) {
        delete resourceMap[key];
      }
    });
  }

  static unloadResources(game, scene) {
    const { resourceMap } = game;
    const resources = [
      ...scene.resources,
      ...scene.worlds.flatMap((world) => world.resources || []),
    ];
    scene.worlds.forEach((w) => {
      if (w._cache) w._cache.active = false;
    });
    resources.forEach((key) => {
      if (!resourceMap[key]) return;
      resourceMap[key].ref--;
      if (resourceMap[key].ref === 0) {
        delete resourceMap[key];
      }
    });
  }
}

export const Color = {
  White: [1, 1, 1, 1],
  Red: [1, 0, 0, 1],
  Blue: [0, 0, 1, 1],
  Green: [0, 1, 0, 1],
};
