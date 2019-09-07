import { vec3, mat4, vec2 } from 'gl-matrix';
import simpleVertexShader from './GLSLShaders/SimpleVS.glsl';
import simpleFragmentShader from './GLSLShaders/SimpleFS.glsl';
import textureVertexShader from './GLSLShaders/TextureVS.glsl';
import textureFragmentShader from './GLSLShaders/TextureFS.glsl';

export class BoundingUtils {
  static getBound(transform) {
    const { size, position } = transform;
    const left = position[0] - (size[0] / 2);
    const right = left + size[0];
    const bottom = position[1] - (size[1] / 2);
    const top = bottom + size[1];

    return [left, right, bottom, top];
  }

  static containsPoint(transform, [x, y]) {
    const [left, right, bottom, top] = BoundingUtils.getBound(transform);
    return ((x > left) && (x < right)
      && (y > bottom) && (y < top));
  }

  static intersectsBound(transform, otherTransform) {
    const [left, right, bottom, top] = BoundingUtils.getBound(transform);
    const [oleft, oright, obottom, otop] = BoundingUtils.getBound(otherTransform);
    return ((left < oright) && (right > oleft)
      && (bottom < otop) && (top > obottom));
  }

  static boundCollideStatus(transform, otherTransform) {
    const [left, right, bottom, top] = BoundingUtils.getBound(transform);
    const [oleft, oright, obottom, otop] = BoundingUtils.getBound(otherTransform);
    let collideStatus = [0, 0, 0, 0];
    if (BoundingUtils.intersectsBound(transform, otherTransform)) {
      if (oleft < left) { collideStatus[0] = 1; }
      if (oright > right) { collideStatus[1] = 1; }
      if (obottom < bottom) { collideStatus[2] = 1; }
      if (otop > top) { collideStatus[3] = 1; }
      // if the bounds intersects and yet none of the sides overlaps
      // otherBound is completely inside thisBound
      if (collideStatus.every((s) => s === 0)) {
        collideStatus = collideStatus.map(() => 1);
      }
    }
    return collideStatus;
  }

  static isInside(collideStatus) {
    return collideStatus && collideStatus.length > 0 && collideStatus.every((s) => s === 1);
  }
}

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

  static resize(tranform, zone) {
    return {
      ...tranform,
      size: [
        tranform.size[0] * zone,
        tranform.size[1] * zone,
      ],
    };
  }

  static degreeToRadians(degree) {
    return degree * (Math.PI / 180.0);
  }

  static rotate(a, c) {
    const r = [];
    // perform rotation
    r[0] = a[0] * Math.cos(c) - a[1] * Math.sin(c);
    r[1] = a[0] * Math.sin(c) + a[1] * Math.cos(c);
    return r;
  }

  static rotateObjPointTo(position, direction, target, rate) {
    const result = {
      direction,
      radians: 0,
    };
    // Step A: determine if reach the destination position p
    const dir = [];
    vec2.sub(dir, target, position);
    const len = vec2.length(dir);
    if (len < Number.MIN_VALUE) return result; // we are there.
    vec2.scale(dir, dir, 1 / len);

    // Step B: compute the angle to rotate
    const fdir = direction;
    let cosTheta = vec2.dot(dir, fdir);
    if (cosTheta > 0.999999) return result; // almost exactly the same direction

    // Step C: clamp the cosTheda to -1 to 1
    // in a perfect world, this would never happen! BUT ...
    if (cosTheta > 1) { cosTheta = 1; }
    else if (cosTheta < -1) { cosTheta = -1; }

    // Step D: compute whether to rotate clockwise, or counterclockwise
    const dir3d = vec3.fromValues(dir[0], dir[1], 0);
    const f3d = vec3.fromValues(fdir[0], fdir[1], 0);
    const r3d = [];
    vec3.cross(r3d, f3d, dir3d);
    let rad = Math.acos(cosTheta); // radian to roate
    if (r3d[2] < 0) { rad = -rad; }

    // Step E: rotate the facing direction with the angle and rate
    rad *= rate; // actual angle need to rotate from Obj's front
    result.direction = TransformUtils.rotate(direction, rad);
    result.radians = rad;

    return result;
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

  static readColorArray(gl, texInfo) {
    if (texInfo.colorArray === null) {
      // create a framebuffer, bind it to the texture, and read the color content
      const fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        texInfo.texID,
        0,
      );
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE) {
        const pixels = new Uint8Array(texInfo.width * texInfo.height * 4);
        const { width, height } = texInfo;
        const { RGBA, UNSIGNED_BYTE } = gl;
        gl.readPixels(0, 0, width, height, RGBA, UNSIGNED_BYTE, pixels);
        // eslint-disable-next-line
        texInfo.colorArray = pixels;
      }
      else {
        throw new Error(`Error when try to get color array from texture ${texInfo.textureName}`);
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.deleteFramebuffer(fb);
    }
    return texInfo.colorArray;
  }

  static processTexture(textureInfo, sprite) {
    const [left, right, bottom, top] = sprite
      ? sprite.position
      : [0, textureInfo.width, 0, textureInfo.height];

    return {
      colorArray: textureInfo.colorArray,
      left,
      bottom,
      top,
      right,
      width: (right - left) + 1,
      height: (top - bottom) + 1,
      fullWidth: textureInfo.width,
      fullHeight: textureInfo.height,
    };
  }

  static getPixelAlpha(textureData, x, y) {
    const i = (x + textureData.left) * 4;
    const j = (y + textureData.bottom) * 4;
    return textureData.colorArray[(j * textureData.fullWidth) + i + 3];
  }

  static indexToWCPosition(transform, textureData, i, j, dirX, dirY) {
    const x = i * (transform.size[0] / (textureData.width - 1));
    const y = j * (transform.size[1] / (textureData.height - 1));

    const dispX = x - (transform.size[0] * 0.5);
    const dispY = y - (transform.size[1] * 0.5);

    const dirDispX = [
      dirX[0] * dispX,
      dirX[1] * dispX,
    ];
    const dirDispY = [
      dirY[0] * dispY,
      dirY[1] * dispY,
    ];

    return [
      transform.position[0] + dirDispX[0] + dirDispY[0],
      transform.position[1] + dirDispX[1] + dirDispY[1],
    ];
  }

  static wcPositionToIndex(transform, textureData, wcPosition, dirX, dirY) {
    const returnIndex = [
      wcPosition[0] - transform.position[0],
      wcPosition[1] - transform.position[1],
    ];
    // use wcPos to compute the corresponding returnIndex[0 and 1]
    const xDisp = returnIndex[0] * dirX[0] + returnIndex[1] * dirX[1];
    const yDisp = returnIndex[0] * dirY[0] + returnIndex[1] * dirY[1];
    returnIndex[0] = textureData.width * (xDisp / transform.size[0]);
    returnIndex[1] = textureData.height * (yDisp / transform.size[1]);
    // recall that xForm.getPosition() returns center, yet Texture origin is at lower-left corner!
    returnIndex[0] += textureData.width / 2;
    returnIndex[1] += textureData.height / 2;

    returnIndex[0] = Math.floor(returnIndex[0]);
    returnIndex[1] = Math.floor(returnIndex[1]);

    return returnIndex;
  }

  static pixelTouches(
    transform, textureInfo, sprite, otherTransform, otherTextureInfo, otherSprite,
  ) {
    const pixelTouch = null;
    const textureData = RenderUtils.processTexture(textureInfo, sprite);
    const otherTextureData = RenderUtils.processTexture(otherTextureInfo, otherSprite);
    let xIndex = 0;
    let yIndex = 0;
    const xDir = [1, 0];
    const yDir = [0, 1];
    const otherXDir = [1, 0];
    const otherYDir = [0, 1];
    vec2.rotate(xDir, xDir, [0, 0], transform.rotationInRadians);
    vec2.rotate(yDir, yDir, [0, 0], transform.rotationInRadians);
    vec2.rotate(otherXDir, otherXDir, [0, 0], otherTransform.rotationInRadians);
    vec2.rotate(otherYDir, otherYDir, [0, 0], otherTransform.rotationInRadians);

    while ((!pixelTouch) && (xIndex < textureData.width)) {
      yIndex = 0;
      while ((!pixelTouch) && (yIndex < textureData.height)) {
        if (RenderUtils.getPixelAlpha(textureData, xIndex, yIndex) > 0) {
          const wcTouchPos = RenderUtils.indexToWCPosition(
            transform, textureData, xIndex, yIndex, xDir, yDir,
          );
          const otherIndex = RenderUtils.wcPositionToIndex(
            otherTransform, otherTextureData, wcTouchPos, otherXDir, otherYDir,
          );
          if ((otherIndex[0] > 0) && (otherIndex[0] < otherTextureData.width)
                    && (otherIndex[1] > 0) && (otherIndex[1] < otherTextureData.height)) {
            // eslint-disable-next-line
            if (RenderUtils.getPixelAlpha(otherTextureData, otherIndex[0], otherIndex[1]) > 0) {
              return wcTouchPos;
            }
          }
        }
        yIndex++;
      }
      xIndex++;
    }
    return null;
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

export class CharacterInfo {
  constructor() {
    // in texture coordinate (0 to 1) maps to the entier image
    this.texCoordLeft = 0;
    this.texCoordRight = 1;
    this.texCoordBottom = 0;
    this.texCoordTop = 0;

    // nominal character size, 1 is "standard width/height" of a char
    this.charWidth = 1;
    this.charHeight = 1;
    this.charWidthOffset = 0;
    this.charHeightOffset = 0;

    // reference of char width/height ration
    this.charAspectRatio = 1;
  }
}

export class FontUtils {
  static getCharInfo(fontInfo, character) {
    // eslint-disable-next-line no-param-reassign
    if (!fontInfo.chars) fontInfo.chars = [];
    if (fontInfo.chars[character]) return fontInfo.chars[character];
    let returnInfo = null;
    const commonPath = 'font/common';
    let commonInfo = fontInfo.evaluate(commonPath, fontInfo, null, XPathResult.ANY_TYPE, null);
    commonInfo = commonInfo.iterateNext();
    if (commonInfo === null) {
      return returnInfo;
    }
    const charSize = commonInfo.getAttribute('base');

    const charPath = `font/chars/char[@id=${character}]`;
    let charInfo = fontInfo.evaluate(charPath, fontInfo, null, XPathResult.ANY_TYPE, null);
    charInfo = charInfo.iterateNext();

    if (charInfo === null) {
      return returnInfo;
    }

    returnInfo = new CharacterInfo();
    const texInfo = fontInfo.texture;
    const leftPixel = Number(charInfo.getAttribute('x'));
    const rightPixel = leftPixel + Number(charInfo.getAttribute('width')) - 1;
    const topPixel = (texInfo.height - 1) - Number(charInfo.getAttribute('y'));
    const bottomPixel = topPixel - Number(charInfo.getAttribute('height')) + 1;

    // texture coordinate information
    returnInfo.texCoordLeft = leftPixel / (texInfo.width - 1);
    returnInfo.texCoordTop = topPixel / (texInfo.height - 1);
    returnInfo.texCoordRight = rightPixel / (texInfo.width - 1);
    returnInfo.texCoordBottom = bottomPixel / (texInfo.height - 1);

    returnInfo.charWidthOffset = 0;
    returnInfo.xAdvance = 0;

    // relative character size
    returnInfo.charWidth = charInfo.getAttribute('width') / charSize;
    returnInfo.charHeight = charInfo.getAttribute('height') / charSize;

    if (returnInfo.charWidth > 0) {
      returnInfo.charWidthOffset = charInfo.getAttribute('xoffset') / charSize;
      returnInfo.xAdvance = charInfo.getAttribute('xadvance') / charInfo.getAttribute('width');
    }
    else {
      returnInfo.charWidth = charInfo.getAttribute('xadvance') / charSize;
      returnInfo.xAdvance = 1.0;
    }
    returnInfo.charHeightOffset = charInfo.getAttribute('yoffset') / charSize;
    // returnInfo.charAspectRatio = charWidth / charHeight;

    returnInfo.charHeightOffset = charInfo.getAttribute('yoffset') / charSize;

    // eslint-disable-next-line no-param-reassign
    fontInfo.chars[character] = returnInfo;
    return returnInfo;
  }
}

export class CameraUtils {
  static getWcTransform(worldCoordinate, viewport, zone = 1) {
    const position = worldCoordinate.center;
    const height = worldCoordinate.width * (viewport.array[3] / viewport.array[2]);
    const size = [worldCoordinate.width * zone, height * zone];
    return {
      position,
      size,
    };
  }

  static panBy(worldCoordinate, delta) {
    // eslint-disable-next-line no-param-reassign
    worldCoordinate.center[0] += delta[0];
    // eslint-disable-next-line no-param-reassign
    worldCoordinate.center[1] += delta[1];
  }

  static panTo(worldCoordinate, center) {
    // eslint-disable-next-line no-param-reassign
    worldCoordinate.center = [...center];
  }

  static zoomBy(worldCoordinate, zoom) {
    if (zoom > 0) {
      // eslint-disable-next-line no-param-reassign
      worldCoordinate.width *= zoom;
    }
  }

  static zoomTowards(worldCoordinate, pos, zoom) {
    const delta = [];
    vec2.sub(delta, pos, worldCoordinate.center);
    vec2.scale(delta, delta, zoom - 1);
    vec2.sub(worldCoordinate.center, worldCoordinate.center, delta);
    CameraUtils.zoomBy(worldCoordinate, zoom);
  }
}
