/* eslint-disable max-classes-per-file */
import { TransformComponent, CameraUtils, BoundingUtils } from '@wge/core/utils';
import { TextComponent, RenderComponent } from '@wge/core/render-engine';
import { WorldCoordinateComponent, ViewportComponent } from '@wge/core/camera';
import { KeyboardKeys } from '@wge/core/input-engine';
import { CollisionUtils } from '@wge/core/physics-system';
import { AudioComponent } from '@wge/core/audio-system';
import {
  MovementComponent,
  MovementKeysComponent,
  AIMovementComponent,
  BoundaryComponent,
  ScoreComponent,
  SolidComponent,
  MenuOptionComponent,
  MenuConfigComponent,
  FadeComponent,
} from './components';


export const Scenes = Object.freeze({
  PLAY: 0,
  MENU: 1,
});

export class MovementSystem {
  run({ entities }) {
    entities.forEach((e) => {
      const transform = e.components.find((c) => c instanceof TransformComponent);
      const movement = e.components.find((c) => c instanceof MovementComponent);
      if (!transform || !movement) return;
      const [x, y] = transform.position;
      const [dx, dy] = movement.direction;
      const mx = dx * movement.speed;
      const my = dy * movement.speed;
      transform.position = [x + mx, y + my];
    });
  }
}

export class KeyboardMovementSystem {
  run({ entities }, { inputState }) {
    const { keyboard } = inputState;
    entities.forEach((e) => {
      const movement = e.components.find((c) => c instanceof MovementComponent);
      const movementKeys = e.components.find((c) => c instanceof MovementKeysComponent);
      if (!movement || !movementKeys) return;
      movement.direction = [0, 0];
      if (keyboard.pressedKeys[movementKeys.up]) movement.direction[1] = 1;
      if (keyboard.pressedKeys[movementKeys.down]) movement.direction[1] = -1;
      if (keyboard.pressedKeys[movementKeys.left]) movement.direction[0] = -1;
      if (keyboard.pressedKeys[movementKeys.right]) movement.direction[0] = 1;
    });
  }
}

export class IAMovementSystem {
  run({ entities }) {
    entities.forEach((e) => {
      const movement = e.components.find((c) => c instanceof MovementComponent);
      const transform = e.components.find((c) => c instanceof TransformComponent);
      const ai = e.components.find((c) => c instanceof AIMovementComponent);
      if (!movement || !transform || !ai) return;
      const target = entities.find((e2) => ai.targetId === e2.id);
      if (!target) return;
      const targetTransform = target.components.find((c) => c instanceof TransformComponent);
      if (targetTransform.position[1] > transform.position[1]) movement.direction[1] = 1;
      if (targetTransform.position[1] < transform.position[1]) movement.direction[1] = -1;
      else movement.direction[0] = 0;
    });
  }
}

export class ScoreSystem {
  maxPoints = 1;

  run({ entities }, game) {
    const { scenes } = game;
    const collideds = [];
    entities.forEach((e) => {
      const boundary = e.components.find((c) => c instanceof BoundaryComponent);
      if (!boundary || !boundary.collisionStatus) return;
      collideds.push(boundary);
    });
    if (collideds.length === 0) return;
    entities.forEach((e) => {
      const audio = e.components.find((c) => c instanceof AudioComponent);
      const text = e.components.find((c) => c instanceof TextComponent);
      const score = e.components.find((c) => c instanceof ScoreComponent);
      if (!score) return;
      collideds.forEach((boundary) => {
        const [left, right, bottom, top] = boundary.collisionStatus;
        const [sleft, sright, sbottom, stop] = score.bounds;
        if ((top === 1 && stop === 1) || (right === 1 && sright === 1)
        || (bottom === 1 && sbottom === 1) || (left === 1 && sleft === 1)) {
          score.points++;
          if (audio) {
            audio.play = true;
          }
          if (text) {
            text.content = score.points.toString();
          }
          if (score.points > this.maxPoints) {
            scenes[Scenes.PLAY].paused = true;
            scenes[Scenes.MENU].active = true;
            scenes[Scenes.MENU].currentWorld = 2;
            scenes[Scenes.MENU].worlds[2].entities.forEach((e2) => {
              const render = e2.components.find((c) => c instanceof RenderComponent);
              const fade = e2.components.find((c) => c instanceof FadeComponent);
              if (!fade || !render) return;
              render.color[3] = fade.min;
            });
          }
        }
      });
    });
  }
}

export class RespawnSystem {
  run({ entities }, { cameras }) {
    entities.forEach((e) => {
      const transform = e.components.find((c) => c instanceof TransformComponent);
      const movement = e.components.find((c) => c instanceof MovementComponent);
      const boundary = e.components.find((c) => c instanceof BoundaryComponent);
      if (!transform || !boundary || !movement) return;
      const camera = cameras[boundary.cameraIndex];
      const worldCoordinate = camera.components.find((c) => c instanceof WorldCoordinateComponent);
      const viewport = camera.components.find((c) => c instanceof ViewportComponent);
      const wcTransform = CameraUtils
        .getWcTransform(worldCoordinate, viewport.array, boundary.zone);
      const status = BoundingUtils.boundCollideStatus(wcTransform, transform);
      boundary.collisionStatus = null;
      if (!BoundingUtils.isInside(status)) {
        boundary.collisionStatus = status;
        transform.position = [...worldCoordinate.center];
        const rx = Math.random() > 0.5 ? 1 : -1;
        const ry = Math.random() > 0.5 ? 1 : -1;
        movement.direction = [rx, ry];
        movement.speed = movement.defaultSystem;
      }
    });
  }
}

export class FadeEffectSystem {
  run({ entities }) {
    entities.forEach((e) => {
      const render = e.components.find((c) => c instanceof RenderComponent);
      const fade = e.components.find((c) => c instanceof FadeComponent);
      if (!fade || !render) return;
      if (render.color[3] < fade.max) render.color[3] += fade.delta;
    });
  }
}

export class SolidCollisionSystem {
  run({ entities }) {
    const tuples = [];
    entities.forEach((e) => {
      const transform = e.components.find((c) => c instanceof TransformComponent);
      const solid = e.components.find((c) => c instanceof SolidComponent);
      const movement = e.components.find((c) => c instanceof MovementComponent);
      const audios = e.components.filter((c) => c instanceof AudioComponent);
      if (!transform || !solid) return;
      tuples.push([transform, solid, movement, audios || []]);
    });

    tuples.forEach((e, i) => {
      const [transform, solid, movement, audios] = e;
      for (let j = 0; j < tuples.length; j++) {
        // eslint-disable-next-line no-continue
        if (!movement || i === j) continue;
        const [otherTransform, otherSolid] = tuples[j];
        const collision = CollisionUtils.collidedTransforms(transform, otherTransform);
        if (collision) {
          if (solid.kick) {
            if (collision.normal[0] !== 0) movement.direction[0] *= -1;
            if (collision.normal[1] !== 0) movement.direction[1] *= -1;
            if (otherSolid.acceleration) {
              movement.speed += otherSolid.acceleration;
              const audio = audios.find((a) => a.tags && a.tags.includes('hit'));
              if (audio) audio.play = true;
            }
            else {
              const audio = audios.find((a) => a.tags && a.tags.includes('wall'));
              if (audio) audio.play = true;
            }
          }
          else {
            if (collision.normal[0] === movement.direction[0]) {
              movement.direction[0] = 0;
            }
            if (collision.normal[1] === movement.direction[1]) {
              movement.direction[1] = 0;
            }
          }
        }
      }
    });
  }
}


export const MenuTypes = Object.freeze({
  TITLE: 'title',
  PAUSE: 'pause',
  FINISH: 'finish',
});

function resetWorld(world) {
  const { entities } = world;
  entities.forEach((e) => {
    const score = e.components.find((c) => c instanceof ScoreComponent);
    const boundary = e.components.find((c) => c instanceof BoundaryComponent);
    const transform = e.components.find((c) => c instanceof TransformComponent);
    if (!(score || boundary) || !transform) return;
    if (score) {
      const text = e.components.find((c) => c instanceof TextComponent);
      score.points = 0;
      text.content = score.points.toString();
    }
    transform.position[1] = 37.5;
  });
}

export class TitleMenuSystem {
  run({ config }, game) {
    if (config.tag !== MenuTypes.TITLE || !config.selected) return;
    if (config.selectedIndex === 2) return;
    const { scenes } = game;
    scenes[Scenes.MENU].active = false;
    scenes[Scenes.PLAY].active = true;
    const player2 = this.getPlayer2(config, scenes[Scenes.PLAY]);
    if (config.selectedIndex === 0) {
      resetWorld(scenes[Scenes.PLAY].worlds[0]);
      if (!config.cacheKeys) {
        const keysIndex = player2.components.findIndex((c) => c instanceof MovementKeysComponent);
        // eslint-disable-next-line no-param-reassign,prefer-destructuring
        config.cacheKeys = player2.components.splice(keysIndex, 1)[0];
        if (config.cacheAI) player2.components.push(config.cacheAI);
      }
    }
    else if (config.selectedIndex === 1) {
      resetWorld(scenes[Scenes.PLAY].worlds[0]);
      if (!config.cacheAI) {
        const aiIndex = player2.components.findIndex((c) => c instanceof AIMovementComponent);
        // eslint-disable-next-line no-param-reassign,prefer-destructuring
        config.cacheAI = player2.components.splice(aiIndex, 1)[0];
        if (config.cacheKeys) player2.components.push(config.cacheKeys);
      }
    }
  }

  getPlayer2(menu, scene) {
    const { entities } = scene.worlds[0];
    const player2 = menu.player2Id
      ? entities.find((e) => e.id === menu.player2Id)
      : entities.find((e) => e.components.find((c) => c instanceof MovementKeysComponent)
        && e.components.find((c) => c instanceof AIMovementComponent));
    // eslint-disable-next-line no-param-reassign
    menu.player2Id = player2.id;
    return player2;
  }
}

export class PauseGameSystem {
  run(world, game) {
    const { keyboard } = game.inputState;
    const { scenes } = game;
    if (!scenes[Scenes.PLAY].paused && !scenes[Scenes.MENU].active
      && keyboard.clickedKeys[KeyboardKeys.Enter]) {
      scenes[Scenes.PLAY].paused = true;
      scenes[Scenes.MENU].active = true;
      scenes[Scenes.MENU].currentWorld = 1;
      scenes[Scenes.MENU].worlds[1].entities.forEach((e) => {
        const render = e.components.find((c) => c instanceof RenderComponent);
        const fade = e.components.find((c) => c instanceof FadeComponent);
        if (!fade || !render) return;
        render.color[3] = fade.min;
      });
    }
  }
}

export class PauseMenuSystem {
  run({ config }, game) {
    if (config.tag !== MenuTypes.PAUSE) return;
    const { scenes } = game;
    if (config.selected && config.selectedIndex === 0) {
      scenes[Scenes.PLAY].paused = false;
      scenes[Scenes.MENU].active = false;
    }
    else if (config.selected && config.selectedIndex === 1) {
      scenes[Scenes.PLAY].paused = false;
      scenes[Scenes.PLAY].active = false;
      scenes[Scenes.MENU].active = true;
      scenes[Scenes.MENU].currentWorld = 0;
    }
  }
}

export class EngGameMenuSystem {
  run({ config }, game) {
    const { scenes } = game;
    if (config.tag !== MenuTypes.FINISH) return;
    const tuples = [];
    let title = null;
    scenes[Scenes.PLAY].worlds[0].entities.forEach((e) => {
      const score = e.components.find((c) => c instanceof ScoreComponent);
      if (!score) return;
      const keys = e.components.find((c) => c instanceof MovementKeysComponent);
      const ai = e.components.find((c) => c instanceof AIMovementComponent);
      tuples.push([score, ai, keys]);
    });
    scenes[Scenes.MENU].worlds[2].entities.forEach((e) => {
      const text = e.components.find((c) => c instanceof TextComponent);
      const option = e.components.find((c) => c instanceof MenuOptionComponent);
      if (!text || option) return;
      title = text;
    });
    const [player1, player2] = tuples;
    let titleText = 'End game';
    if (player1[0].points > player2[0].points) {
      titleText = player2[1] ? 'You win' : 'Player 1 wins';
    }
    else {
      titleText = player2[1] ? 'You lose' : 'Player 2 wins';
    }
    title.content = titleText;

    if (config.selected && config.selectedIndex === 0) {
      scenes[Scenes.PLAY].paused = false;
      scenes[Scenes.MENU].active = false;
      resetWorld(scenes[Scenes.MENU]);
    }
    else if (config.selected && config.selectedIndex === 1) {
      scenes[Scenes.PLAY].paused = false;
      scenes[Scenes.PLAY].active = false;
      scenes[Scenes.MENU].currentWorld = 0;
    }
  }
}

export class TextMenuSystem {
  run(menu) {
    const { config } = menu;
    const { lastSelectedIndex } = config;

    const selectedText = menu.entities[config.selectedIndex]
      .components.find((c) => c instanceof TextComponent);
    selectedText.color = config.selectedColor;
    if (lastSelectedIndex !== config.selectedIndex) {
      const oldText = menu.entities[lastSelectedIndex]
        .components.find((c) => c instanceof TextComponent);
      oldText.color = config.defaultColor;
    }
  }
}

export class KeyboardMenuSystem {
  run(menu, game) {
    const { keyboard } = game.inputState;
    const { config } = menu;
    config.selected = false;
    config.lastSelectedIndex = config.selectedIndex;
    if (keyboard.clickedKeys[config.keys.next]) {
      config.selectedIndex++;
      if (config.selectedIndex === menu.entities.length) {
        config.selectedIndex = config.inLoop ? 0 : menu.entities.length - 1;
      }
    }
    else if (keyboard.clickedKeys[config.keys.prev]) {
      config.selectedIndex--;
      if (config.selectedIndex < 0) {
        config.selectedIndex = config.inLoop ? menu.entities.length - 1 : 0;
      }
    }
    else if (keyboard.clickedKeys[config.keys.enter]) {
      config.selected = true;
    }

    menu.entities.forEach((e, i) => {
      const option = e.components.find((c) => c instanceof MenuOptionComponent);
      option.selected = false;
      option.hovered = i === config.selectedIndex;
    });
  }
}

export class MenuEngine {
  systems = [];

  run(world, game) {
    this.systems.forEach((system) => {
      if (system.preRun) system.preRun(world, game);
    });
    const menus = {};
    const keys = [];
    world.entities.forEach((e) => {
      const option = e.components.find((c) => c instanceof MenuOptionComponent);
      const config = e.components.find((c) => c instanceof MenuConfigComponent);
      if (!option && !config) return;
      const { tag } = option || config;
      if (!menus[tag]) {
        menus[tag] = { entities: [], scene: world.scene };
        keys.push(tag);
      }
      if (option) menus[tag].entities.push(e);
      if (config) menus[tag].config = config;
    });

    keys.forEach((key) => {
      this.systems.forEach((system) => {
        if (system.run) system.run(menus[key], game);
      });
    });
    this.systems.forEach((system) => {
      if (system.posRun) system.posRun(world, game);
    });
  }
}
