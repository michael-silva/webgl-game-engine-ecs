/* eslint-disable max-classes-per-file */
import { TransformComponent, CameraUtils, BoundingUtils } from '@wge/core/utils';
import {
  RenderComponent, BackgroundRenderComponent,
  TextComponent,
} from '@wge/core/render-engine';
import {
  GameObject,
} from '@wge/core';
import {
  WorldCoordinateComponent, CameraEntity, ViewportComponent,
} from '@wge/core/camera';
import { KeyboardKeys } from '@wge/core/input-system';
import { CollisionUtils } from '@wge/core/physics-system';
import { AudioComponent, AudioSystem } from '@wge/core/audio-system';


class MovementComponent {
  constructor({ speed, direction }) {
    this.speed = speed;
    this.defaultSystem = this.speed;
    this.direction = direction || [0, 1];
  }
}

class MovementKeysComponent {
  constructor({
    up, down, left, right,
  }) {
    this.up = up;
    this.down = down;
    this.left = left;
    this.right = right;
  }
}

class MovementSystem {
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

class KeyboardMovementSystem {
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

class AIMovementComponent {
  constructor({ targetId }) {
    this.targetId = targetId;
  }
}

class IAMovementSystem {
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

class BoundaryComponent {
  constructor({ cameraIndex, zone }) {
    this.cameraIndex = cameraIndex;
    this.zone = zone || 1;
  }
}

class ScoreComponent {
  constructor({ bounds, points }) {
    this.points = points || 0;
    this.bounds = bounds;
  }
}

class ScoreSystem {
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

class RespawnSystem {
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

class SolidComponent {
  constructor({ kick, relative, acceleration } = {}) {
    this.kick = kick;
    this.acceleration = acceleration;
    this.relative = relative;
  }
}

class SolidCollisionSystem {
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

class KeyboardTextMenuComponent {
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

class KeyboardTextMenuSystem {
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

class MainMenuSystem {
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
        menu.cacheKeys = player2.components.splice(keysIndex, 1)[0];
        if (menu.cacheAI) player2.components.push(menu.cacheAI);
      }
      else if (menu.selectedIndex === 1) {
        const aiIndex = player2.components.findIndex((c) => c instanceof AIMovementComponent);
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

class PauseMenuSystem {
  run({ entities }, game) {
    const { keyboard } = game.inputState;
    const { worlds } = game.scenes[game.currentScene];
    if (!worlds[1].active && keyboard.clickedKeys[KeyboardKeys.Space]) {
      worlds[0].pause = true;
      worlds[1].active = true;
    }
    else {
      entities.forEach((e) => {
        const menu = e.components.find((c) => c instanceof KeyboardTextMenuComponent);
        if (!menu || !menu.selected) return;
        const options = entities.filter((e2) => menu.options.includes(e2.id));
        if (options.length === 0) return;
        if (menu.selectedIndex === 0) {
          worlds[0].pause = false;
          worlds[1].active = false;
        }
        else if (menu.selectedIndex === 1) {
          worlds[0].pause = false;
          worlds[1].active = false;
          game.currentScene = 0;
        }
      });
    }
  }
}

const createMenuScene = (game, camera) => {
  const menuScene = game.createScene();
  menuScene.addCamera(camera);
  menuScene.setResources([
    './assets/fonts/system-default-font.fnt',
  ]);

  const menuWorld = menuScene.getWorld();
  const option1 = new GameObject();
  option1.components.push(
    new TextComponent({
      content: 'Single player',
      position: [30, 50],
      size: 5,
      color: [1, 1, 1, 1],
      font: './assets/fonts/system-default-font.fnt',
    }),
  );
  menuWorld.addEntity(option1);
  const option2 = new GameObject();
  option2.components.push(
    new TextComponent({
      content: '2 Players',
      position: [30, 40],
      size: 5,
      color: [1, 1, 1, 1],
      font: './assets/fonts/system-default-font.fnt',
    }),
  );
  menuWorld.addEntity(option2);
  const option3 = new GameObject();
  option3.components.push(
    new TextComponent({
      content: 'Back to menu',
      position: [30, 30],
      size: 5,
      color: [1, 1, 1, 1],
      font: './assets/fonts/system-default-font.fnt',
    }),
  );
  menuWorld.addEntity(option3);
  const menu = new GameObject();
  menu.components.push(new KeyboardTextMenuComponent({
    options: [option1.id, option2.id, option3.id],
    selectedColor: [1, 0, 0, 1],
    defaultColor: [1, 1, 1, 1],
    keys: {
      next: KeyboardKeys.Down,
      prev: KeyboardKeys.Up,
      enter: KeyboardKeys.Enter,
    },
  }));
  menuWorld.addEntity(menu);
  menuScene.use(new KeyboardTextMenuSystem());
  menuScene.use(new MainMenuSystem());
};

const createPlayScene = (game, camera) => {
  const playScene = game.createScene();
  playScene.addCamera(camera);
  const world = playScene.getWorld();

  world.setResources([
    './assets/sounds/playerScore.mp3',
    './assets/sounds/enemyScore.mp3',
    './assets/sounds/wall.mp3',
    './assets/sounds/hit.mp3',
    './assets/fonts/system-default-font.fnt',
    './assets/images/bg.png',
  ]);

  const bg1 = new GameObject();
  bg1.components.push(new TransformComponent({
    size: [100, 60],
    position: [50, 37.5],
  }));
  bg1.components.push(new BackgroundRenderComponent({
    color: [0.8, 0.8, 0.8, 0],
    texture: './assets/images/bg.png',
    sharp: true,
  }));
  world.addEntity(bg1);

  const ball = new GameObject();
  ball.components.push(new TransformComponent({
    position: [50, 37.5],
    size: [1.5, 1.5],
  }));
  ball.components.push(new RenderComponent({
    color: [1, 1, 1, 1],
  }));
  ball.components.push(new MovementComponent({
    direction: [1, 1],
    speed: 0.2,
  }));
  ball.components.push(new SolidComponent({
    kick: true,
  }));
  ball.components.push(new BoundaryComponent({
    cameraIndex: 0,
  }));
  const audio1 = new AudioComponent({ src: './assets/sounds/wall.mp3' });
  audio1.tags = ['wall'];
  ball.components.push(audio1);
  const audio2 = new AudioComponent({ src: './assets/sounds/hit.mp3' });
  audio2.tags = ['hit'];
  ball.components.push(audio2);
  world.addEntity(ball);

  const player1 = new GameObject();
  player1.components.push(new TransformComponent({
    position: [6, 37.5],
    size: [2, 8],
  }));
  player1.components.push(new RenderComponent({
    color: [1, 1, 1, 1],
  }));
  player1.components.push(new MovementComponent({
    speed: 0.2,
  }));
  player1.components.push(new MovementKeysComponent({
    up: KeyboardKeys.W,
    down: KeyboardKeys.S,
  }));
  player1.components.push(new SolidComponent({
    relative: true,
    acceleration: 0.01,
  }));
  player1.components.push(new ScoreComponent({
    bounds: [1, 0, 0, 0],
  }));
  player1.components.push(new AudioComponent({
    src: './assets/sounds/enemyScore.mp3',
  }));
  player1.components.push(
    new TextComponent({
      content: '0',
      position: [55, 60],
      size: 5,
      color: [1, 1, 1, 1],
      font: './assets/fonts/system-default-font.fnt',
    }),
  );
  world.addEntity(player1);

  const player2 = new GameObject();
  player2.components.push(new TransformComponent({
    position: [94, 37.5],
    size: [2, 8],
  }));
  player2.components.push(new RenderComponent({
    color: [1, 1, 1, 1],
  }));
  player2.components.push(new MovementComponent({
    speed: 0.2,
  }));
  player2.components.push(new SolidComponent({
    relative: true,
    acceleration: 0.01,
  }));
  player2.components.push(new ScoreComponent({
    bounds: [0, 1, 0, 0],
  }));
  player2.components.push(new AudioComponent({
    src: './assets/sounds/playerScore.mp3',
  }));
  player2.components.push(new MovementKeysComponent({
    up: KeyboardKeys.Up,
    down: KeyboardKeys.Down,
  }));
  player2.components.push(new AIMovementComponent({
    targetId: ball.id,
  }));
  player2.components.push(
    new TextComponent({
      content: '0',
      position: [45, 60],
      size: 5,
      color: [1, 1, 1, 1],
      font: './assets/fonts/system-default-font.fnt',
    }),
  );
  world.addEntity(player2);

  const wall1 = new GameObject();
  wall1.components.push(new TransformComponent({
    position: [50, 11],
    size: [100, 0.5],
  }));
  wall1.components.push(new RenderComponent({
    color: [1, 1, 1, 0.6],
  }));
  wall1.components.push(new SolidComponent());
  world.addEntity(wall1);
  const wall2 = new GameObject();
  wall2.components.push(new TransformComponent({
    position: [50, 64],
    size: [100, 0.5],
  }));
  wall2.components.push(new RenderComponent({
    color: [1, 1, 1, 0.6],
  }));
  wall2.components.push(new SolidComponent());
  world.addEntity(wall2);


  const menuWorld = playScene.createWorld();
  const option1 = new GameObject();
  option1.components.push(
    new TextComponent({
      content: 'Continue',
      position: [30, 50],
      size: 5,
      color: [1, 1, 1, 1],
      font: './assets/fonts/system-default-font.fnt',
    }),
  );
  menuWorld.addEntity(option1);
  const option2 = new GameObject();
  option2.components.push(
    new TextComponent({
      content: 'Exit game',
      position: [30, 40],
      size: 5,
      color: [1, 1, 1, 1],
      font: './assets/fonts/system-default-font.fnt',
    }),
  );
  menuWorld.addEntity(option2);
  const menu = new GameObject();
  menu.components.push(new KeyboardTextMenuComponent({
    options: [option1.id, option2.id],
    selectedColor: [1, 0, 0, 1],
    defaultColor: [1, 1, 1, 1],
    keys: {
      next: KeyboardKeys.Down,
      prev: KeyboardKeys.Up,
      enter: KeyboardKeys.Enter,
    },
  }));
  menuWorld.addEntity(menu);

  playScene.use(new KeyboardMovementSystem());
  playScene.use(new IAMovementSystem());
  playScene.use(new SolidCollisionSystem());
  playScene.use(new MovementSystem());
  playScene.use(new RespawnSystem());
  playScene.use(new ScoreSystem());
  playScene.use(new AudioSystem());
  playScene.use(new KeyboardTextMenuSystem());
  playScene.use(new PauseMenuSystem());
};

export default (game) => {
  const camera = new CameraEntity();
  camera.components.push(new WorldCoordinateComponent({
    center: [50, 37.5],
    width: 100,
  }));
  camera.components.push(new ViewportComponent({
    array: [0, 0, 1280, 720],
  }));

  createMenuScene(game, camera);
  createPlayScene(game, camera);
};
