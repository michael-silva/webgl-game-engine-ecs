import { ResourceLoader, ImageLoader } from './resources-system';
import { Color, RenderUtils, FontUtils } from './utils';


// @component
export class RenderComponent {
  constructor({
    color = Color.White, texture, textureAsset, sprite,
  } = {}) {
    this.color = color;
    this.texture = texture;
    this.textureAsset = textureAsset;
    this.sprite = sprite;
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
export class GameLoopSystem {
  run(game) {
    const { loopState } = game;
    loopState.previousTime = Date.now();
    loopState.isLoopRunning = true;
    requestAnimationFrame(() => this._runLoop(game));
  }

  _runLoop(game) {
    const { loopState } = game;
    const ONE_SECOND = 1000;
    const MPF = ONE_SECOND / loopState.FPS;
    if (loopState.isLoopRunning) {
      requestAnimationFrame(() => this._runLoop(game));

      loopState.currentTime = Date.now();
      loopState.elapsedTime = loopState.currentTime - loopState.previousTime;
      loopState.previousTime = loopState.currentTime;
      loopState.lagTime += loopState.elapsedTime;
      loopState.frameRate = parseInt(ONE_SECOND / loopState.elapsedTime, 10);

      if (loopState.lagTime > ONE_SECOND) {
        console.log('Lag Time is too large. The loop stoped!');
        loopState.isLoopRunning = false;
      }
      while (loopState.lagTime >= MPF && loopState.isLoopRunning) {
        game.inputEngine.run(game);
        game.preSystems.forEach((s) => s.run(game));
        loopState.lagTime -= MPF;
        const scene = game.scenes[game.currentScene];
        scene.worlds.forEach((world) => {
          if (!world.active) return;
          scene.systems.forEach((s) => s.run(world, game));
        });
        game.posSystems.forEach((s) => s.run(game));
        game.renderEngine.run(game);
      }
    }
  }
}

// @system
export class LoaderSystem {
  _lastScene = -1;

  _currentScene = -1;

  constructor({ loadingScene } = {}) {
    this.loadingScene = loadingScene || 0;
  }

  run(game) {
    const { scenes, currentScene } = game;
    const scene = scenes[currentScene];
    if (this._lastScene !== currentScene && this._currentScene === -1) {
      this._currentScene = currentScene;
      // eslint-disable-next-line no-param-reassign
      game.currentScene = this.loadingScene;
      ResourceLoader.loadSceneResources(game, scene);
      if (this._lastScene >= 0) ResourceLoader.unloadResources(game, scenes[this._lastScene]);
    }
    else if (ResourceLoader.hasUnloadedResources(game, scene)) {
      ResourceLoader.loadWorldsResources(game, scene);
      ResourceLoader.unloadWorldsResources(game, scene);
    }
    else if (this._currentScene >= 0) {
      // eslint-disable-next-line no-param-reassign
      game.currentScene = this._currentScene;
      this._lastScene = this._currentScene;
      this._currentScene = -1;
    }
  }
}

// @system
export class GarbageCollectorSystem {
  run(game) {
    const { scenes, currentScene } = game;
    const scene = scenes[currentScene];
    scene.worlds.forEach((world) => {
      if (!world.active) return;
      // eslint-disable-next-line
      world.entities = world.entities.filter((e) => !e._destroyed);
    });
  }
}

export class FontLoader {
  _imageLoader = new ImageLoader();

  async loadFile(fileName, game) {
    const [texture, fontFile] = await Promise.all([
      this._imageLoader.loadFile(fileName.replace(/\.[a-z0-9]+$/, '.png'), game),
      fetch(fileName).then((res) => res.text()),
    ]);

    const parser = new DOMParser();
    const fontInfo = parser.parseFromString(fontFile, 'text/xml');
    fontInfo.texture = texture;

    return fontInfo;
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

export class TextSystem {
  run(game) {
    const { scenes, currentScene, resourceMap } = game;
    const scene = scenes[currentScene];
    scene.worlds.forEach((world) => {
      if (!world.active) return;
      world.entities.forEach((e) => {
        e.components
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
          });
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
