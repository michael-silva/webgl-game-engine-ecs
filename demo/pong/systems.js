import { TransformComponent, CameraUtils, BoundingUtils } from '@wge/core/utils';
import { TextComponent } from '@wge/core/render-engine';
import { WorldCoordinateComponent, ViewportComponent } from '@wge/core/camera';
import { KeyboardKeys } from '@wge/core/input-system';
import { CollisionUtils } from '@wge/core/physics-system';
import { AudioComponent } from '@wge/core/audio-system';
import {
  MovementComponent,
  MovementKeysComponent,
  AIMovementComponent,
  BoundaryComponent,
  ScoreComponent,
  SolidComponent,
} from './components';

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
  run({ entities }) {
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
        }
      });
    });
  }
}

export class RespawnSystem {
  run({ entities }, { scenes, currentScene }) {
    const { cameras } = scenes[currentScene];
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

export class KeyboardTextMenuComponent {
  constructor({
    keys, defaultColor, selectedColor,
    options, onSelect,
  }) {
    this.keys = keys;
    this.options = options;
    this.selectedColor = selectedColor;
    this.defaultColor = defaultColor;
    this.onSelect = onSelect;
    this.selectedIndex = 0;
    this.inLoop = true;
  }
}

export class KeyboardTextMenuSystem {
  run({ entities }, game) {
    const { keyboard } = game.inputState;
    entities.forEach((e) => {
      const menu = e.components.find((c) => c instanceof KeyboardTextMenuComponent);
      if (!menu) return;
      const options = entities.filter((e2) => menu.options.includes(e2.id));
      if (options.length === 0) return;
      const { selectedIndex } = menu;
      menu.selected = false;
      if (keyboard.clickedKeys[menu.keys.next]) {
        menu.selectedIndex++;
        if (menu.selectedIndex === options.length) {
          menu.selectedIndex = menu.inLoop ? 0 : options.length - 1;
        }
      }
      else if (keyboard.clickedKeys[menu.keys.prev]) {
        menu.selectedIndex--;
        if (menu.selectedIndex < 0) {
          menu.selectedIndex = menu.inLoop ? options.length - 1 : 0;
        }
      }
      else if (keyboard.clickedKeys[menu.keys.enter]) {
        menu.selected = true;
      }
      const selectedText = options[menu.selectedIndex]
        .components.find((c) => c instanceof TextComponent);
      selectedText.color = menu.selectedColor;
      if (selectedIndex !== menu.selectedIndex) {
        const oldText = options[selectedIndex].components.find((c) => c instanceof TextComponent);
        oldText.color = menu.defaultColor;
      }
    });
  }
}

export class MainMenuSystem {
  run({ entities }, game) {
    entities.forEach((e) => {
      const menu = e.components.find((c) => c instanceof KeyboardTextMenuComponent);
      if (!menu || !menu.selected) return;
      const options = entities.filter((e2) => menu.options.includes(e2.id));
      if (options.length === 0) return;
      // eslint-disable-next-line no-param-reassign
      game.currentScene = menu.selectedIndex === 2 ? 0 : 1;
      const player2 = this.getPlayer2(menu, game);
      if (menu.selectedIndex === 0) {
        const keysIndex = player2.components.findIndex((c) => c instanceof MovementKeysComponent);
        // eslint-disable-next-line prefer-destructuring
        menu.cacheKeys = player2.components.splice(keysIndex, 1)[0];
        if (menu.cacheAI) player2.components.push(menu.cacheAI);
      }
      else if (menu.selectedIndex === 1) {
        const aiIndex = player2.components.findIndex((c) => c instanceof AIMovementComponent);
        // eslint-disable-next-line prefer-destructuring
        menu.cacheAI = player2.components.splice(aiIndex, 1)[0];
        if (menu.cacheKeys) player2.components.push(menu.cacheKeys);
      }
    });
  }

  getPlayer2(menu, game) {
    const scene = game.scenes[game.currentScene];
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

export class PauseMenuSystem {
  run({ entities }, game) {
    const { keyboard } = game.inputState;
    const { worlds } = game.scenes[game.currentScene];
    if (!worlds[1].active && keyboard.clickedKeys[KeyboardKeys.Enter]) {
      worlds[0].paused = true;
      worlds[1].active = true;
    }
    else {
      entities.forEach((e) => {
        const menu = e.components.find((c) => c instanceof KeyboardTextMenuComponent);
        if (!menu || !menu.selected) return;
        const options = entities.filter((e2) => menu.options.includes(e2.id));
        if (options.length === 0) return;
        if (menu.selectedIndex === 0) {
          worlds[0].paused = false;
          worlds[1].active = false;
        }
        else if (menu.selectedIndex === 1) {
          worlds[0].paused = false;
          worlds[1].active = false;
          // eslint-disable-next-line no-param-reassign
          game.currentScene = 0;
        }
      });
    }
  }
}
