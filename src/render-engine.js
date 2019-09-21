/* eslint-disable max-classes-per-file */
import {
  mat4, vec3, vec4,
} from 'gl-matrix';
import {
  CameraUtils, TransformUtils, Color, FontUtils, TransformComponent,
} from './utils';
import {
  WorldCoordinateComponent, ViewportComponent, CameraViewport, BackgroundComponent,
} from './camera';
import { RigidRectangleComponent, RigidCircleComponent } from './physics-system';
import {
  SimpleShader, TextureShader, MaterialShader,
  ShadowReceiverShader, ShadowCasterShader, LineShader, ParticleShader,
} from './shaders';


// Assumption: first sprite in an animation is always the left-most element.
export const AnimationType = Object.freeze({
  AnimateRight: 0, // Animate from left to right, then restart to left
  AnimateLeft: 1, // Animate from right to left, then restart to right
  AnimateSwing: 2, // Animate first left to right, then animates backwards
});

export const LightType = Object.freeze({
  PointLight: 0,
  DirectionalLight: 1,
  SpotLight: 2,
});

export class Light {
  constructor({
    color,
    position = [0, 0, 5],
    near, far, intensity,
    lightType = LightType.SpotLight,
    dropOff, cosInner, cosOuter,
    direction = [0, 0, -1],
  }) {
    this.color = color || [1, 1, 1, 1]; // light color
    this.position = position; // light position in WC
    this.direction = direction; // light position in WC
    this.near = near || 5; // within Near is fully lighted
    this.far = far || 10; // farther than Far is not lighted
    this.cosInner = cosInner || 0.1;
    this.cosOuter = cosOuter || 0.3;
    this.dropOff = dropOff || 1;
    this.lightType = lightType;
    this.intensity = intensity || 1;
    this.isOn = true;
    this.castShadow = true;
  }
}

class RenderUtils {
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
  /** ******************************* */

  static getElementUVCoordinateArray([left, right, bottom, top]) {
    return [
      right, top,
      left, top,
      right, bottom,
      left, bottom,
    ];
  }

  static selectShader(shaders, textureAsset, { normalMap, material }) {
    if (textureAsset && (material || normalMap)) return shaders.materialShader;
    if (textureAsset) return shaders.textureShader;
    return shaders.simpleShader;
  }

  static renderEntity(game, camera, renderable, transform, optShader) {
    const { resourceMap, scenes, currentScene } = game;
    const { ambientColor, ambientIntensity } = scenes[currentScene].globalLight;
    const { gl, buffers, shaders } = game.renderState;
    const { vertexBuffer, textureBuffer, spriteBuffer } = buffers;
    const {
      color, texture, sprite,
      normalMap, material,
    } = renderable;
    const textureAsset = texture ? resourceMap[texture].asset : renderable.textureAsset;
    const shader = optShader || RenderUtils.selectShader(shaders, textureAsset, renderable);

    if (textureAsset) {
      RenderUtils.activateTexture(gl, textureAsset);
    }
    RenderUtils.activateShader(gl, vertexBuffer, shader, color, camera);
    RenderUtils.activateGlobalLight(gl, shader, ambientColor, ambientIntensity);
    if (textureAsset) {
      if (sprite) {
        const { position, animation } = sprite;
        if (animation) RenderUtils.updateAnimation(sprite);
        const pixelPosition = RenderUtils.fromPixelPositions(textureAsset, position);
        const texCoordinate = RenderUtils.getElementUVCoordinateArray(pixelPosition);
        RenderUtils.setTextureCoordinate(gl, spriteBuffer, texCoordinate);
        RenderUtils.activateTextureShader(gl, spriteBuffer, shader);
      }
      else {
        RenderUtils.activateTextureShader(gl, textureBuffer, shader);
      }
      if (shader.lights) {
        const scene = scenes[currentScene];
        RenderUtils.activateLightsArray(gl, shader, scene);
        scene.lights.forEach((light, i) => {
          if (light.isOn) {
            if (!shader.lights[i]) {
              shader.lights[i] = RenderUtils.initializeShaderLight(gl, shader, i);
            }
            RenderUtils.activateLight(gl, shader.lights[i], light, camera);
          }
        });
      }
      else if (shader.light && shader.light.isOn) {
        if (!shader.lightShader) {
          shader.lightShader = RenderUtils.initializeShaderLight(gl, shader, 0);
        }
        RenderUtils.activateLight(gl, shader.lightShader, shader.light, camera);
      }

      if ((normalMap && resourceMap[normalMap] && resourceMap[normalMap].loaded)
        || renderable.normalMapAsset) {
        const normalMapAsset = renderable.normalMapAsset || resourceMap[normalMap].asset;
        RenderUtils.activateNormalMapShader(gl, shader);
        RenderUtils.activateNormalMap(gl, normalMapAsset);
        if (material) {
          RenderUtils.activateMaterial(gl, shader, material, camera);
        }
      }
    }

    const xform = TransformUtils.getXForm(transform);
    gl.uniformMatrix4fv(shader.modelTransform, false, xform);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  static initializeShaderLight(gl, shader, index) {
    const lightColor = gl.getUniformLocation(shader.compiledShader, `uLights[${index}].Color`);
    const lightDirection = gl.getUniformLocation(shader.compiledShader, `uLights[${index}].Direction`);
    const lightPosition = gl.getUniformLocation(shader.compiledShader, `uLights[${index}].Position`);
    const lightNear = gl.getUniformLocation(shader.compiledShader, `uLights[${index}].Near`);
    const lightFar = gl.getUniformLocation(shader.compiledShader, `uLights[${index}].Far`);
    const lightCosInner = gl.getUniformLocation(shader.compiledShader, `uLights[${index}].CosInner`);
    const lightCosOuter = gl.getUniformLocation(shader.compiledShader, `uLights[${index}].CosOuter`);
    const lightIntensity = gl.getUniformLocation(shader.compiledShader, `uLights[${index}].Intensity`);
    const lightDropOff = gl.getUniformLocation(shader.compiledShader, `uLights[${index}].DropOff`);
    const lightLightType = gl.getUniformLocation(shader.compiledShader, `uLights[${index}].LightType`);
    const lightOn = gl.getUniformLocation(shader.compiledShader, `uLights[${index}].IsOn`);

    return {
      lightColor,
      lightDirection,
      lightCosInner,
      lightCosOuter,
      lightDropOff,
      lightLightType,
      lightFar,
      lightNear,
      lightIntensity,
      lightOn,
      lightPosition,
    };
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

  static activateGlobalLight(gl, shader, ambientColor, ambientIntensity) {
    gl.uniform4fv(shader.globalAmbientColor, ambientColor);
    gl.uniform1f(shader.globalAmbientIntensity, ambientIntensity);
  }

  static activateLineShader(gl, buffer, shader, color, camera) {
    gl.useProgram(shader.compiledShader);
    gl.uniformMatrix4fv(shader.viewProjection, false, camera.viewProjection);

    gl.uniform1f(shader.pointSizeRef, shader.pointSize);
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
    gl.uniform1i(shader.shaderSampler, 0); // binds to texture unit 0
  }

  static activateNormalMapShader(gl, shader) {
    gl.uniform1i(shader.normalSampler, 1); // binds to texture unit 1
  }

  static activateMaterial(gl, shader, material, camera) {
    gl.uniform4fv(shader.materialAmbient, material.ambient);
    gl.uniform4fv(shader.materialDiffuse, material.diffuse);
    gl.uniform4fv(shader.materialSpecular, material.specular);
    gl.uniform1f(shader.materialShininess, material.shininess);

    gl.uniform3fv(shader.cameraPosition, camera.renderCache.posInPixelSpace);
  }

  static activateLightsArray(gl, shader, scene) {
    gl.uniform1i(shader.lightsSize, scene.lights.length);
  }

  static activateLight(gl, shaderLight, light, camera) {
    gl.uniform1i(shaderLight.lightOn, light.isOn);
    if (light.isOn) {
      const p = CameraUtils.wcPosToPixel(camera, light.position);
      const ic = CameraUtils.wcSizeToPixel(camera, light.near);
      const oc = CameraUtils.wcSizeToPixel(camera, light.far);

      gl.uniform4fv(shaderLight.lightColor, light.color);
      gl.uniform4fv(shaderLight.lightPosition, vec4.fromValues(p[0], p[1], p[2], 1));
      gl.uniform1f(shaderLight.lightCosInner, 0);
      gl.uniform1f(shaderLight.lightCosOuter, 0);
      gl.uniform1f(shaderLight.lightDropOff, 0);
      gl.uniform1f(shaderLight.lightNear, ic);
      gl.uniform1f(shaderLight.lightFar, oc);
      gl.uniform1f(shaderLight.lightIntensity, light.intensity);
      gl.uniform1i(shaderLight.lightLightType, light.lightType);

      if (light.lightType === LightType.PointLight) {
        gl.uniform3fv(shaderLight.lightDirection, vec3.fromValues(0, 0, 0));
      }
      else {
        // either spot or directional lights: must compute direction
        const d = CameraUtils.wcDirToPixel(camera, light.direction);
        gl.uniform3fv(shaderLight.lightDirection, vec3.fromValues(d[0], d[1], d[2]));
        if (light.lightType === LightType.SpotLight) {
          // stores cosine of half of inner angle
          gl.uniform1f(shaderLight.lightCosInner, Math.cos(0.5 * light.cosInner));
          // stores cosine of half of outer cone
          gl.uniform1f(shaderLight.lightCosOuter, Math.cos(0.5 * light.cosOuter));
          gl.uniform1f(shaderLight.lightDropOff, light.dropOff);
        }
      }
    }
  }

  static setTextureCoordinate(gl, buffer, textureCoordinate) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(textureCoordinate));
  }

  static activateTexture(gl, textureInfo) {
    // Binds our texture reference to the current webGL texture functionality
    gl.activeTexture(gl.TEXTURE0);
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

  static activateNormalMap(gl, textureInfo) {
    // Binds our texture reference to the current webGL texture functionality
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textureInfo.texID);
    // To prevent texture wrappings
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // Handles how magnification and minimization filters will work.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  }
}

export class Material {
  constructor({
    shininess, ambient, specular, diffuse,
  } = {}) {
    this.ambient = ambient || [0, 0, 0, 0];
    this.specular = specular || [0.2, 0.2, 0.2, 1];
    this.diffuse = diffuse || [1, 1, 1, 1];
    this.shininess = shininess || 20;
  }
}

export const BackgroundTypes = Object.freeze({
  Fixed: 'static',
  Normal: 'normal',
  Tiled: 'tiled',
});

// @component
export class BackgroundRenderComponent {
  constructor({
    color = Color.White, texture,
    textureAsset, sprite,
    normalMap, normapMapAsset,
    material, type,
  } = {}) {
    this.type = type || BackgroundTypes.Normal;
    this.color = color;
    this.texture = texture;
    this.textureAsset = textureAsset;
    this.normalMap = normalMap;
    this.normapMapAsset = normapMapAsset;
    this.sprite = sprite;
    this.material = material;
  }
}

// @component
export class RenderComponent {
  constructor({
    color = Color.White, texture,
    textureAsset, sprite,
    normalMap, normapMapAsset,
    material,
  } = {}) {
    this.color = color;
    this.texture = texture;
    this.textureAsset = textureAsset;
    this.normalMap = normalMap;
    this.normapMapAsset = normapMapAsset;
    this.sprite = sprite;
    this.material = material;
  }
}

export class ShadowCasterComponent {
  constructor() {
    this.shadowColor = [0, 0, 0, 0.2];
    this.saveXform = new TransformComponent();
    this.casterMaxScale = 3; // maximum size a caster will be scaled
    this.verySmall = 0.001; //
    this.distanceFudge = 0.01;
    // Ensure shadow caster is not at the same depth as receiver
    this.receiverDistanceFudge = 0.6;
    // Reduce the projection size increase of the caster
  }
}

export class ShadowReceiverComponent {
  constructor() {
    this.shadowStencilBit = 0x01; // The stencil bit to switch on/off for shadow
    this.shadowStencilMask = 0xFF; // The stencil mask
  }
}

export class SpriteAnimation {
  firstSpriteLeft = 0.0; // 0.0 is left corner of image

  top = 1.0;// 1.0 is top corner of image

  // default sprite element size is the entire image
  width = 1.0;

  height = 1.0;

  padding = 0.0;

  numFrames = 1;

  // number of elements in an animation
  // per animation settings
  animationType = AnimationType.AnimateRight;

  updateInterval = 1;

  // how often to advance
  // current animation state
  currentAnimAdvance = -1;

  currentSprite = 0;

  currentTick = 0;
}

export class LineShape {
  firstVertex = [0, 0];

  secondVertex = [0, 0];

  pointSize = 1

  drawVertices = false;

  showLine = true;
}

// @system
export class RigidShapeRenderSystem {
  render(entity, camera, game) {
    const { gl, shaders, buffers } = game.renderState;
    const shader = shaders.lineShader;
    const { lineBuffer } = buffers;
    const transform = entity.components.find((c) => c instanceof TransformComponent);
    const shape = entity.components.find((c) => c.rigidType >= 0);
    if (!transform || !shape || !shape.drawBounds) return;
    const line = new LineShape();
    line.color = shape.drawColor;
    // calculation for the X at the center of the shape
    const x = transform.position[0];
    const y = transform.position[1];
    line.firstVertex = [x - shape.padding, y + shape.padding];
    // TOP LEFT
    line.secondVertex = [x + shape.padding, y - shape.padding];
    // BOTTOM RIGHT
    this._renderLine(gl, shader, lineBuffer, camera, transform, line);
    line.firstVertex = [x + shape.padding, y + shape.padding];
    // TOP RIGHT
    line.secondVertex = [x - shape.padding, y - shape.padding];
    // BOTTOM LEFT
    this._renderLine(gl, shader, lineBuffer, camera, transform, line);

    if (shape instanceof RigidRectangleComponent) {
      const w = shape.width / 2;
      const h = shape.height / 2;
      line.firstVertex = [x - w, y + h]; // TOP LEFT
      line.secondVertex = [x + w, y + h]; // TOP RIGHT
      this._renderLine(gl, shader, lineBuffer, camera, transform, line);
      line.firstVertex = [x + w, y - h]; // BOTTOM RIGHT
      this._renderLine(gl, shader, lineBuffer, camera, transform, line);
      line.secondVertex = [x - w, y - h]; // BOTTOM LEFT
      this._renderLine(gl, shader, lineBuffer, camera, transform, line);
      line.firstVertex = [x - w, y + h]; // TOP LEFT
      this._renderLine(gl, shader, lineBuffer, camera, transform, line);
    }
    else if (shape instanceof RigidCircleComponent) {
      // kNumSides forms the circle.
      const { position } = transform;
      const prevPoint = [...position];
      const deltaTheta = (Math.PI * 2.0) / shape.numSides;
      let theta = deltaTheta;
      prevPoint[0] += shape.radius;
      let i; let x2; let y2;
      for (i = 1; i <= shape.numSides; i++) {
        x2 = position[0] + shape.radius * Math.cos(theta);
        y2 = position[1] + shape.radius * Math.sin(theta);
        line.firstVertex = [prevPoint[0], prevPoint[1]];
        line.secondVertex = [x2, y2];
        this._renderLine(gl, shader, lineBuffer, camera, transform, line);
        theta += deltaTheta;
        prevPoint[0] = x2;
        prevPoint[1] = y2;
      }
    }
  }

  _renderLine(gl, shader, buffer, camera, transform, line) {
    // eslint-disable-next-line
    shader.pointSize = line.pointSize;
    // Draw line instead of triangle!

    RenderUtils.activateShader(gl, buffer, shader, line.color, camera);

    const sx = line.firstVertex[0] - line.secondVertex[0];
    const sy = line.firstVertex[1] - line.secondVertex[1];
    const cx = line.firstVertex[0] - sx / 2;
    const cy = line.firstVertex[1] - sy / 2;
    const xform = TransformUtils.getXForm({ ...transform, position: [cx, cy], size: [sx, sy] });
    gl.uniformMatrix4fv(shader.modelTransform, false, xform);
    if (line.showLine) {
      gl.drawArrays(gl.LINE_STRIP, 0, 2);
    }
    if (!line.showLine || line.drawVertices) {
      gl.drawArrays(gl.POINTS, 0, 2);
    }
  }
}
export class TextComponent {
  rendered = '';

  characters = [];

  constructor({
    content, color, font, size, position,
  } = {}) {
    this.content = content || '';
    this.color = color || [0, 0, 0, 1];
    this.font = font;
    this.size = size || 1;
    this.position = position || [0, 0];
  }
}

// @system
export class TextRenderSystem {
  render(entity, camera, game) {
    const { resourceMap } = game;
    entity.components
      .filter((c) => c instanceof TextComponent)
      .forEach((text) => {
        if (!text || !resourceMap[text.font] || !resourceMap[text.font].loaded) return;
        const charTransform = text.characters.length > 0 && text.characters[0].transform;
        const hasChanges = text.content !== text.rendered
              || !charTransform
              || text.size !== charTransform.size[1]
              || text.position[0] !== charTransform.position[0]
              || text.position[1] !== charTransform.position[1];
        if (hasChanges) {
          this._updateCharacters(text, resourceMap[text.font].asset);
        }
        text.characters.forEach((char) => {
          const { renderable, transform } = char;
          RenderUtils.renderEntity(game, camera, renderable, transform);
        });
      });
  }

  _updateCharacters(text, fontInfo) {
    // eslint-disable-next-line no-param-reassign
    text.characters = [];

    const yPos = text.position[1];
    // let xPos = this._transform.x - (charWidth / 2) + (charWidth * 0.5);
    let xPos = text.position[0];

    for (let i = 0; i < text.content.length; i++) {
      const char = text.content.charCodeAt(i);
      const charInfo = FontUtils.getCharInfo(fontInfo, char);

      // set the texture coordinate
      const spritePosition = [charInfo.texCoordLeft,
        charInfo.texCoordRight, charInfo.texCoordBottom, charInfo.texCoordTop];
      // now the size of the char
      const charWidth = text.size * charInfo.charWidth;
      const charHeight = text.size * charInfo.charHeight;
      const size = [charWidth, charHeight];
      // how much to offset from the center
      const xOffset = 0.5 * charWidth * charInfo.charWidthOffset;
      const yOffset = 0.5 * text.size * charInfo.charHeightOffset;
      if (i !== 0) {
        xPos += 0.5 * charWidth * charInfo.xAdvance;
      }

      const position = [xPos + xOffset, yPos - yOffset];
      // Advance to the middle of this char
      xPos += 0.5 * charWidth * charInfo.xAdvance;

      const charTransform = new TransformComponent({ size, position });
      const renderChar = new RenderComponent({
        color: text.color,
        textureAsset: fontInfo.texture,
        sprite: { position: RenderUtils.toPixelPositions(fontInfo.texture, spritePosition) },
      });
      const charObj = {
        renderable: renderChar,
        transform: charTransform,
      };
      text.characters.push(charObj);
    }
    // eslint-disable-next-line no-param-reassign
    text.rendered = text.content;
  }
}

// @system
export class TextureRenderSystem {
  render(entity, camera, game) {
    const { renderState } = game;
    const renderable = entity.components.find((c) => c instanceof RenderComponent);
    const transform = entity.components.find((c) => c instanceof TransformComponent);
    if (!renderable || !transform) return;
    const { texture } = renderable;
    const shader = texture
      ? renderState.shaders.textureShader
      : renderState.shaders.simpleShader;
    if (!shader || !shader.modelTransform) return;
    if (texture && (!game.resourceMap[texture] || !game.resourceMap[texture].loaded)) return;
    RenderUtils.renderEntity(game, camera, renderable, transform);
  }
}

export class ShadowRenderUtils {
  static renderReceiverShadow(game, camera, receiver, transform, renderable, casters) {
    const { shaders, gl } = game.renderState;
    const { texture } = renderable;
    if (texture && (!game.resourceMap[texture] || !game.resourceMap[texture].loaded)) return;
    // A: draw receiver as a regular renderable
    ShadowRenderUtils.shadowRecieverStencilOn(gl, receiver); // B1;
    const shader = shaders.shadowReceiverShader;
    RenderUtils.renderEntity(game, camera, renderable, transform, shader); // B2
    ShadowRenderUtils.shadowRecieverStencilOff(gl, receiver); // B3
    // C + D: now draw shadow color to the pixels in the stencil that are switched on
    for (let i = 0; i < casters.length; i++) {
      const casterRenderable = casters[i].components.find((c) => c instanceof RenderComponent);
      const casterTransform = casters[i].components.find((c) => c instanceof TransformComponent);
      if (casterRenderable && casterTransform && casterTransform.z > transform.z) {
        const caster = casters[i].components.find((c) => c instanceof ShadowCasterComponent);
        ShadowRenderUtils.renderShadowCaster(game, camera, transform,
          caster, casterRenderable, casterTransform);
      }
    }
    // switch off stencil checking
    ShadowRenderUtils.shadowRecieverStencilDisable(gl);
  }

  static renderShadowCaster(game, camera, receiverTransform, caster,
    casterRenderable, casterTransform) {
    const scene = game.scenes[game.currentScene];
    const color = [...casterRenderable.color];
    // eslint-disable-next-line no-param-reassign
    casterRenderable.color = caster.shadowColor;

    for (let l = 0; l < scene.lights.length; l++) {
      const lgt = scene.lights[l];
      const shader = game.renderState.shaders.shadowCasterShader;
      if (lgt.isOn && lgt.castShadow) {
        // eslint-disable-next-line no-underscore-dangle
        const transform = ShadowRenderUtils._computeShadowGeometry(lgt, caster,
          casterTransform, receiverTransform);
        if (transform) {
          // eslint-disable-next-line no-param-reassign
          shader.light = lgt;
          RenderUtils.renderEntity(game, camera, casterRenderable, transform, shader); // B2
        }
      }
    }
    // eslint-disable-next-line no-param-reassign
    casterRenderable.color = [...color];
  }

  static _computeShadowGeometry(light, caster, casterTransform, receiverTransform) {
    // vector from light to caster
    const lgtToCaster = vec3.create();
    let lgtToReceiverZ;
    let distToCaster;
    let distToReceiver; // measured along the lgtToCaster vector
    let scale;
    const offset = vec3.fromValues(0, 0, 0);
    const receiverToCasterZ = receiverTransform.z - casterTransform.z;

    if (light.lightType === LightType.DirectionalLight) {
      // Region 2: parallel projection based on the directional light
      if ((Math.abs(light.direction[2]) < caster.verySmall)
         || (receiverToCasterZ * light.direction[2]) < 0) {
        return false; // direction light casting side way or
        // caster and receiver on different sides of light in Z
      }
      vec3.copy(lgtToCaster, light.direction);
      vec3.normalize(lgtToCaster, lgtToCaster);
      distToReceiver = Math.abs(receiverToCasterZ / lgtToCaster[2]);
      // distant measured along lgtToCaster
      scale = Math.abs(1 / lgtToCaster[2]);
    }
    else {
      // Region 3: projection from a point (point light or spot light position)
      vec3.sub(lgtToCaster, TransformUtils.get3DPosition(casterTransform), light.position);
      lgtToReceiverZ = receiverTransform.z - light.position[2];
      if ((lgtToReceiverZ * lgtToCaster[2]) < 0) {
        return null; // caster and receiver on different sides of light in Z
      }
      if ((Math.abs(lgtToReceiverZ) < caster.verySmall)
          || ((Math.abs(lgtToCaster[2]) < caster.verySmall))) {
        // alomst the same Z, can't see shadow
        return null;
      }
      distToCaster = vec3.length(lgtToCaster);
      vec3.scale(lgtToCaster, lgtToCaster, 1 / distToCaster);
      // normalize lgtToCaster
      distToReceiver = Math.abs(receiverToCasterZ / lgtToCaster[2]);
      // distant measured along lgtToCaster
      scale = (distToCaster + (distToReceiver * caster.receiverDistanceFudge))
                 / distToCaster;
    }
    // Region 4: sets the cxf transform
    vec3.scaleAndAdd(offset, TransformUtils.get3DPosition(casterTransform), lgtToCaster,
      distToReceiver + caster.distanceFudge);

    return {
      rotationInRadians: casterTransform.rotationInRadians,
      position: [offset[0], offset[1]],
      z: offset[2],
      size: [
        casterTransform.size[0] * scale,
        casterTransform.size[1] * scale,
      ],
    };
  }

  static shadowRecieverStencilOn(gl, receiver) {
    gl.clear(gl.STENCIL_BUFFER_BIT);
    gl.enable(gl.STENCIL_TEST);
    gl.colorMask(false, false, false, false);
    gl.depthMask(false);
    gl.stencilFunc(gl.NEVER, receiver.shadowStencilBit, receiver.shadowStencilMask);
    gl.stencilOp(gl.REPLACE, gl.KEEP, gl.KEEP);
    gl.stencilMask(receiver.shadowStencilMask);
  }

  static shadowRecieverStencilOff(gl, receiver) {
    gl.depthMask(gl.TRUE);
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
    gl.stencilFunc(gl.EQUAL, receiver.shadowStencilBit, receiver.shadowStencilMask);
    gl.colorMask(true, true, true, true);
  }

  static shadowRecieverStencilDisable(gl) {
    gl.disable(gl.STENCIL_TEST);
  }
}

// @system
export class ShadowRenderSystem {
  preRender(world) {
    this.casters = world.entities
      .filter((e) => e.components.some((c) => c instanceof ShadowCasterComponent));
  }

  render(entity, camera, game) {
    if (this.casters.length === 0) return;
    const renderable = entity.components.find((c) => c instanceof RenderComponent);
    const transform = entity.components.find((c) => c instanceof TransformComponent);
    const receiver = entity.components.find((c) => c instanceof ShadowReceiverComponent);
    if (!renderable || !transform || !receiver) return;

    ShadowRenderUtils.renderReceiverShadow(game, camera, receiver,
      transform, renderable, this.casters);
  }
}


// @component
export class ParticleRenderComponent {
  constructor({ color = Color.White, texture, textureAsset }) {
    this.color = color;
    this.texture = texture;
    this.textureAsset = textureAsset;
  }
}

export class ParticleRenderSystem {
  render(e, camera, game) {
    const { gl, shaders } = game.renderState;
    const { resourceMap } = game;
    const transform = e.components.find((c) => c instanceof TransformComponent);
    const renderable = e.components.find((c) => c instanceof ParticleRenderComponent);
    if (!transform || !renderable
      || !resourceMap[renderable.texture] || !resourceMap[renderable.texture].loaded) return;

    gl.blendFunc(gl.ONE, gl.ONE); // for additive blending!
    RenderUtils.renderEntity(game, camera, renderable, transform, shaders.particleShader);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); // restore alpha blending
  }
}

export class BackgroundRenderSystem {
  preRender(world, camera, game) {
    const background = camera.components.find((c) => c instanceof BackgroundComponent);
    const { texture, type } = background;
    if (texture && (!game.resourceMap[texture] || !game.resourceMap[texture].loaded)) return;
    const worldCoordinate = camera.components.find((c) => c instanceof WorldCoordinateComponent);
    let { position } = background;
    if (type === BackgroundTypes.Fixed) {
      position = [
        position[0] + worldCoordinate.center[0],
        position[1] + worldCoordinate.center[1],
      ];
    }
    const transform = {
      size: background.size,
      position,
      z: 0,
    };
    RenderUtils.renderEntity(game, camera, background, transform);

    const casters = world.entities
      .filter((e) => e.components.some((c) => c instanceof ShadowCasterComponent));
    if (background.shadowReceiver && casters.length > 0) {
      ShadowRenderUtils.renderReceiverShadow(game, camera,
        background.shadowReceiver, transform, background, casters);
    }
  }
}

// @system
export class BackgroundRenderSystem2 {
  preRender(world) {
    this.casters = world.entities
      .filter((e) => e.components.some((c) => c instanceof ShadowCasterComponent));
  }

  render(entity, camera, game) {
    const { renderState } = game;
    const renderable = entity.components.find((c) => c instanceof BackgroundRenderComponent);
    const transform = entity.components.find((c) => c instanceof TransformComponent);
    if (!renderable || !transform) return;
    const { texture } = renderable;
    const shader = texture
      ? renderState.shaders.textureShader
      : renderState.shaders.simpleShader;
    if (!shader || !shader.modelTransform) return;
    if (texture && (!game.resourceMap[texture] || !game.resourceMap[texture].loaded)) return;

    this._renderEntity(game, camera, renderable, transform);

    const shadowReceiver = entity.components.find((c) => c instanceof ShadowReceiverComponent);
    if (shadowReceiver && this.casters.length > 0) {
      this._renderReceiverShadow(game, camera, shadowReceiver,
        transform, renderable, this.casters);
    }
  }

  _renderEntity(game, camera, renderable, transform, shader) {
    if (renderable.type === BackgroundTypes.Tiled) {
      this._drawTile(game, camera, transform, renderable, shader);
    }
    else {
      const worldCoordinate = camera.components.find((c) => c instanceof WorldCoordinateComponent);
      const position = renderable.type !== BackgroundTypes.Fixed
        ? transform.position
        : [
          transform.position[0] + worldCoordinate.center[0],
          transform.position[1] + worldCoordinate.center[1],
        ];
      RenderUtils.renderEntity(game, camera, renderable, { ...transform, position }, shader);
    }
  }

  _drawTile(game, camera, transform, renderable, shader) {
    const worldCoordinate = camera.components.find((c) => c instanceof WorldCoordinateComponent);
    const viewport = camera.components.find((c) => c instanceof ViewportComponent);
    // Step A: Compute the positions and dimensions of tiling object.
    const w = transform.size[0];
    const h = transform.size[1];
    const pos = transform.position;
    const left = pos[0] - (w / 2);
    let right = left + w;
    let top = pos[1] + (h / 2);
    const bottom = top - h;

    // Step B: Get the world positions and dimensions of the drawing camera.
    const wcHeight = CameraUtils.getWcHeight(worldCoordinate, viewport.array);
    const wcPos = worldCoordinate.center;
    const wcLeft = wcPos[0] - (worldCoordinate.width / 2);
    const wcRight = wcLeft + worldCoordinate.width;
    const wcBottom = wcPos[1] - (wcHeight / 2);
    const wcTop = wcBottom + wcHeight;

    // Step C: Determine the offset to the camera window's lower left corner.
    let dx = 0; let dy = 0; // offset to the lower left corner
    // left/right boundary?
    if (right < wcLeft) { // left of WC left
      dx = Math.ceil((wcLeft - right) / w) * w;
    }
    else if (left > wcLeft) { // not touching the left side
      dx = -Math.ceil((left - wcLeft) / w) * w;
    }
    // top/bottom boundary
    if (top < wcBottom) { // Lower than the WC bottom
      dy = Math.ceil((wcBottom - top) / h) * h;
    }
    else if (bottom > wcBottom) { // not touching the bottom
      dy = -Math.ceil((bottom - wcBottom) / h) * h;
    }

    // Step D: Save the original position of the tiling object.
    const sX = pos[0];
    const sY = pos[1];

    // Step E: Offset tiling object and modify the related position variables.
    // eslint-disable-next-line no-param-reassign
    transform.position[0] += dx;
    // eslint-disable-next-line no-param-reassign
    transform.position[1] += dy;
    right = pos[0] + (w / 2);
    top = pos[1] + (h / 2);

    // Step F: Determine the number of times to tile in the x and y directions.
    let nx = 1; let ny = 1; // number of times to draw in the x and y directions
    nx = Math.ceil((wcRight - right) / w);
    ny = Math.ceil((wcTop - top) / h);

    // Step G: Loop through each location to draw a tile
    let cx = nx;
    const xPos = pos[0];
    while (ny >= 0) {
      cx = nx;
      pos[0] = xPos;
      while (cx >= 0) {
        RenderUtils.renderEntity(game, camera, renderable, transform, shader);
        // eslint-disable-next-line no-param-reassign
        transform.position[0] += w;
        --cx;
      }
      // eslint-disable-next-line no-param-reassign
      transform.position[1] += h;
      --ny;
    }

    // Step H: Reset the tiling object to its original position.
    pos[0] = sX;
    pos[1] = sY;
  }

  _renderReceiverShadow(game, camera, receiver, transform, renderable, casters) {
    const { shaders, gl } = game.renderState;
    const { texture } = renderable;
    if (texture && (!game.resourceMap[texture] || !game.resourceMap[texture].loaded)) return;
    // A: draw receiver as a regular renderable
    ShadowRenderUtils.shadowRecieverStencilOn(gl, receiver); // B1;
    const shader = shaders.shadowReceiverShader;
    this._renderEntity(game, camera, renderable, transform, shader); // B2
    ShadowRenderUtils.shadowRecieverStencilOff(gl, receiver); // B3
    // C + D: now draw shadow color to the pixels in the stencil that are switched on
    for (let i = 0; i < casters.length; i++) {
      const casterRenderable = casters[i].components.find((c) => c instanceof RenderComponent);
      const casterTransform = casters[i].components.find((c) => c instanceof TransformComponent);
      if (casterRenderable && casterTransform && casterTransform.z > transform.z) {
        const caster = casters[i].components.find((c) => c instanceof ShadowCasterComponent);
        ShadowRenderUtils.renderShadowCaster(game, camera, transform,
          caster, casterRenderable, casterTransform);
      }
    }
    // switch off stencil checking
    ShadowRenderUtils.shadowRecieverStencilDisable(gl);
  }
}

export class RenderState {
  constructor({ gl, shaders, buffers }) {
    this.gl = gl;
    this.shaders = shaders;
    this.buffers = buffers;
  }
}

// @system
export class RenderEngine {
  constructor(canvas, bgColor = [0.8, 0.8, 0.8, 1]) {
    const gl = this._getGL(canvas);
    const buffers = this._initBuffers(gl);
    const shaders = {
      simpleShader: new SimpleShader({ gl, buffers }),
      textureShader: new TextureShader({ gl, buffers }),
      materialShader: new MaterialShader({ gl, buffers }),
      shadowReceiverShader: new ShadowReceiverShader({ gl, buffers }),
      shadowCasterShader: new ShadowCasterShader({ gl, buffers }),
      lineShader: new LineShader({ gl, buffers }),
      particleShader: new ParticleShader({ gl, buffers }),
    };

    this.bgColor = bgColor;
    this.state = new RenderState({
      gl,
      shaders,
      buffers,
    });
    this.systems = [
      new BackgroundRenderSystem2(),
      new TextureRenderSystem(),
      new TextRenderSystem(),
      new ShadowRenderSystem(),
      new ParticleRenderSystem(),
      new RigidShapeRenderSystem(),
    ];
  }

  run(game) {
    const scene = game.scenes[game.currentScene];

    scene.cameras.forEach((camera) => {
      this._setupViewProjection(this.state.gl, camera);
      scene.worlds.forEach((world) => {
        if (!world.active) return;
        this.systems.forEach((system) => {
          if (system.preRender) system.preRender(world, camera, game);
        });
        world.entities.forEach((e) => {
          this.systems.forEach((system) => {
            if (system.render) system.render(e, camera, game);
          });
        });
        this.systems.forEach((system) => {
          if (system.posRender) system.posRender(world, camera, game);
        });
      });
    });
  }

  _getGL(canvas) {
    const gl = canvas.getContext('webgl', { alpha: false, depth: true, stencil: true });
    if (!gl) throw new Error("Your browser don't suport a WEBGL");
    // Allows transperency with textures.
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);
    // Set images to flip the y axis to match the texture coordinate space.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    // make sure depth testing is enabled
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    return gl;
  }

  _cleanUpBuffer(gl, buffer) {
    gl.deleteBuffer(buffer);
  }

  _cleanUp(gl, shader) {
    const { compiledShader, vertexShader, fragmentShader } = shader;
    gl.detachShader(compiledShader, vertexShader);
    gl.detachShader(compiledShader, fragmentShader);
    gl.deleteBuffer(vertexShader);
    gl.deleteBuffer(fragmentShader);
  }

  _clearCanvas(gl, color) {
    gl.clearColor(...color);
    // eslint-disable-next-line no-bitwise
    gl.clear(gl.COLOR_BUFFER_BIT | gl.STENCIL_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  _initBuffers(gl) {
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

    // this is to support the debugging of physics engine
    const verticesOfLine = [
      0.5, 0.5, 0.0,
      -0.5, -0.5, 0.0,
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

    // Create a buffer on the gGL context for our vertex positions
    const lineBuffer = gl.createBuffer();

    // Connect the vertexBuffer to the ARRAY_BUFFER global gl binding point.
    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);

    // Put the verticesOfSquare into the vertexBuffer, as non-changing drawing data (STATIC_DRAW)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verticesOfLine), gl.STATIC_DRAW);

    return {
      vertexBuffer,
      textureBuffer,
      spriteBuffer,
      lineBuffer,
    };
  }

  _setupViewProjection(gl, camera) {
    const worldCoordinate = camera.components.find((c) => c instanceof WorldCoordinateComponent);
    const viewport = camera.components.find((c) => c instanceof ViewportComponent);

    // Step A: Set up and clear the Viewport
    // Step A1: Set up the viewport: area on canvas to be drawn
    gl.viewport(...viewport.array);
    // y position of bottom-left corner
    // width of the area to be drawn
    // height of the area to be drawn
    // Step A2: set up the corresponding scissor area to limit clear area
    gl.scissor(...viewport.bounds);
    // y position of bottom-left corner
    // width of the area to be drawn
    // height of the area to be drawn
    // Step A3: set the color to be clear to black
    gl.clearColor(...this.bgColor); // set the color to be cleared
    // this._clearCanvas(gl, background.color);

    // Step A4: enable and clear the scissor area
    gl.enable(gl.SCISSOR_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.SCISSOR_TEST);

    // Step B: Set up the View-Projection transform operator
    // Step B1: define the view matrix
    mat4.lookAt(camera.viewMatrix,
      [worldCoordinate.center[0], worldCoordinate.center[1], worldCoordinate.z], // WC center
      [worldCoordinate.center[0], worldCoordinate.center[1], 0], //
      [0, 1, 0]); // orientation
    // Step B2: define the projection matrix
    const halfWCWidth = 0.5 * worldCoordinate.width;
    const halfWCHeight = halfWCWidth * (viewport.array[3] / viewport.array[2]);
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
      viewport.nearPlane, // z-distant to near plane
      viewport.farPlane); // z-distant to far plane
    // Step B3: concatnate view and project matrices
    mat4.multiply(camera.viewProjection, camera.projMatrix, camera.viewMatrix);

    // Step B4: compute and cache per-rendering information
    const wcHeight = CameraUtils.getWcHeight(worldCoordinate, viewport.array);
    const wcWidth = worldCoordinate.width;
    // eslint-disable-next-line no-param-reassign
    camera.renderCache.wcToPixelRatio = viewport.array[CameraViewport.Width] / wcWidth;
    // eslint-disable-next-line no-param-reassign
    camera.renderCache.orgX = worldCoordinate.center[0] - (wcWidth / 2);
    // eslint-disable-next-line no-param-reassign
    camera.renderCache.orgY = worldCoordinate.center[1] - (wcHeight / 2);

    const p = CameraUtils.wcPosToPixel(camera, worldCoordinate.center);
    // eslint-disable-next-line no-param-reassign
    camera.renderCache.posInPixelSpace = [
      p[0],
      p[1],
      CameraUtils.fakeZInPixelSpace(camera, worldCoordinate.z),
    ];
  }
}
