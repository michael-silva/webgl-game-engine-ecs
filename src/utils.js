import {
  vec3, mat4, vec2,
} from 'gl-matrix';
import { CameraViewport, ViewportComponent } from './camera';

// @component
export class TransformComponent {
  constructor({
    position, z, size, rotationInRadians,
  } = {}) {
    this.z = z || 0;
    this.position = position || [0, 0];
    this.size = size || [1, 1];
    this.rotationInRadians = rotationInRadians || 0;
  }
}

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
    const {
      position = [0, 0], z = 0, size = [1, 1], rotationInRadians = 0,
    } = transform;
    const [x, y] = position;
    const [width, height] = size;
    const xform = mat4.create();
    // Step E: compute the white square transform
    mat4.translate(xform, xform, vec3.fromValues(x, y, z));
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

  static get3DPosition(transform) {
    return [...transform.position, transform.z];
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

export class CameraUtils {
  static getWcHeight(worldCoordinate, viewportArray) {
    if (!worldCoordinate.height) {
      // eslint-disable-next-line no-param-reassign
      worldCoordinate.height = worldCoordinate.width * (viewportArray[3] / viewportArray[2]);
    }
    return worldCoordinate.height;
  }

  static getWcTransform(worldCoordinate, viewportArray, zone = 1) {
    const position = worldCoordinate.center;
    const z = Array.isArray(zone) ? zone : [zone, zone];
    const height = CameraUtils.getWcHeight(worldCoordinate, viewportArray);
    const size = [worldCoordinate.width * z[0], height * z[1]];
    return {
      position,
      size,
    };
  }

  static panBy(worldCoordinate, delta) {
    return [
      worldCoordinate.center[0] + delta[0],
      worldCoordinate.center[1] + delta[1],
    ];
  }

  static zoomBy(worldCoordinate, zoom) {
    if (zoom > 0) {
      return worldCoordinate.width * zoom;
    }
    return worldCoordinate.width;
  }

  static zoomTowards(worldCoordinate, pos, zoom) {
    const delta = [];
    const center = [...worldCoordinate.center];
    vec2.sub(delta, pos, center);
    vec2.scale(delta, delta, zoom - 1);
    vec2.sub(center, center, delta);
    const width = CameraUtils.zoomBy(worldCoordinate, zoom);
    return {
      center,
      width,
    };
  }

  static getMouseWorldCoordinate(viewportArray, worldCoordinate, mouseState) {
    const height = CameraUtils.getWcHeight(worldCoordinate, viewportArray);
    const minWcX = worldCoordinate.center[0] - worldCoordinate.width / 2;
    const minWcY = worldCoordinate.center[1] - height / 2;
    const dcPosition = CameraUtils.getMouseDeviceCoordinate(viewportArray, mouseState);
    return [
      minWcX + (dcPosition[0] * (worldCoordinate.width / viewportArray[CameraViewport.Width])),
      minWcY + (dcPosition[1] * (height / viewportArray[CameraViewport.Height])),
    ];
  }

  static getMouseDeviceCoordinate(viewportArray, mouseState) {
    const { mousePosX, mousePosY } = mouseState;
    return [
      mousePosX - viewportArray[CameraViewport.X],
      mousePosY - viewportArray[CameraViewport.Y],
    ];
  }

  static isMouseInViewport(viewportArray, mouseState) {
    const [dcX, dcY] = CameraUtils.getMouseDeviceCoordinate(viewportArray, mouseState);
    return ((dcX >= 0) && (dcX < viewportArray[CameraViewport.Width])
                && (dcY >= 0) && (dcY < viewportArray[CameraViewport.Height]));
  }

  static fakeZInPixelSpace(camera, z) {
    return z * camera.renderCache.wcToPixelRatio;
  }

  static wcDirToPixel(camera, d) { // d is a vec3 direction in WC
    // Convert the position to pixel space
    const x = d[0] * camera.renderCache.wcToPixelRatio;
    const y = d[1] * camera.renderCache.wcToPixelRatio;
    const z = d[2];
    return vec3.fromValues(x, y, z);
  }

  static wcSizeToPixel(camera, s) {
    return (s * camera.renderCache.wcToPixelRatio) + 0.5;
  }

  static wcPosToPixel(camera, p) {
    const viewport = camera.components.find((c) => c instanceof ViewportComponent);
    // Convert the position to pixel space
    const x = viewport.array[CameraViewport.X]
      + ((p[0] - camera.renderCache.orgX)
      * camera.renderCache.wcToPixelRatio) + 0.5;
    const y = viewport.array[CameraViewport.Y]
      + ((p[1] - camera.renderCache.orgY)
      * camera.renderCache.wcToPixelRatio) + 0.5;
    const z = CameraUtils.fakeZInPixelSpace(camera, p[2]);
    return vec3.fromValues(x, y, z);
  }
}

export class RenderUtils {
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
