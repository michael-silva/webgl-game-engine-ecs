/* eslint-disable max-classes-per-file */

import { GameEngine, GameObject, CameraComponent } from '../src';
import { Color, TransformUtils } from '../src/utils';
import { TransformComponent } from '../src/systems';
import { RenderComponent } from '../src/render-system';
import { KeyboardKeys } from '../src/input-system';
import { SceneParser } from '../src/scene-parser';
import { AudioComponent, AudioSystem, SoundSystem } from '../src/audio-system';

export class Rectangle extends GameObject {
  constructor({ color, transform }) {
    super();
    this.components = [
      new RenderComponent({ color }),
      new TransformComponent(transform),
    ];
  }
}

class MovementComponent {
  constructor({ speed, direction }) {
    this.speed = speed;
    this.direction = direction || [0, 0];
  }
}

class PulseComponent {
  constructor({ rate, minSize, maxSize }) {
    this.rate = rate;
    this.minSize = minSize || [];
    this.maxSize = maxSize || [];
  }
}

class RotationComponent {
  constructor({ degree, radians }) {
    this.degree = degree;
    this.radians = radians;
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

class RotationKeysComponent {
  constructor({
    increase, decrease,
  }) {
    this.increase = increase;
    this.decrease = decrease;
    this.direction = 0;
  }
}

class RotationSystem {
  run({ entities }) {
    entities.forEach((e) => {
      const transform = e.components.find((c) => c instanceof TransformComponent);
      const rotation = e.components.find((c) => c instanceof RotationComponent);
      if (!transform || !rotation) return;
      if (rotation.radians) {
        transform.rotationInRadians += rotation.radians * rotation.direction;
      }
      if (rotation.degree) {
        const r = rotation.degree * rotation.direction;
        transform.rotationInRadians += TransformUtils.degreeToRadians(r);
      }
    });
  }
}

class KeyboardRotationSystem {
  run({ entities }, scene, { keyboard }) {
    entities.forEach((e) => {
      const transform = e.components.find((c) => c instanceof TransformComponent);
      const rotation = e.components.find((c) => c instanceof RotationComponent);
      const rotationKeys = e.components.find((c) => c instanceof RotationKeysComponent);
      if (!transform || !rotation || !rotationKeys) return;
      rotation.direction = 0;
      if (keyboard.pressedKeys[rotationKeys.increase]) rotation.direction = -1;
      else if (keyboard.pressedKeys[rotationKeys.decrease]) rotation.direction = 1;
    });
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
  run({ entities }, scene, { keyboard }) {
    entities.forEach((e) => {
      const movement = e.components.find((c) => c instanceof MovementComponent);
      const movementKeys = e.components.find((c) => c instanceof MovementKeysComponent);
      if (!movement || !movementKeys) return;
      movement.direction = [0, 0];
      if (keyboard.pressedKeys[movementKeys.up]) movement.direction[1] = -1;
      if (keyboard.pressedKeys[movementKeys.down]) movement.direction[1] = 1;
      if (keyboard.pressedKeys[movementKeys.left]) movement.direction[0] = -1;
      if (keyboard.pressedKeys[movementKeys.right]) movement.direction[0] = 1;
    });
  }
}

class MovementPortalSystem {
  run({ entities }, { cameras }) {
    const [camera] = cameras;
    const MAX_X = camera.center[0] + camera.width / 2;
    const MIN_X = camera.center[0] - camera.width / 2;
    entities.forEach((e) => {
      const transform = e.components.find((c) => c instanceof TransformComponent);
      const movement = e.components.find((c) => c instanceof MovementComponent);
      if (!transform || !movement) return;
      const [x] = transform.position;
      if (x > MAX_X) transform.position[0] = MIN_X;
      if (x < MIN_X) transform.position[0] = MAX_X;
    });
  }
}

class PulseSystem {
  run({ entities }) {
    entities.forEach((e) => {
      const transform = e.components.find((c) => c instanceof TransformComponent);
      const pulse = e.components.find((c) => c instanceof PulseComponent);
      if (!transform || !pulse) return;
      const [width, height] = transform.size;
      const { rate, minSize, maxSize } = pulse;
      if (width > maxSize[0]) transform.size = minSize;
      else transform.size = [width + width * rate, height + height * rate];
    });
  }
}

class KeyboardChangeDemoSystem {
  run(game) {
    const { keyboard } = game;
    if (keyboard.pressedKeys[KeyboardKeys.One]) {
      // eslint-disable-next-line no-param-reassign
      game.currentScene = 0;
    }
    if (keyboard.pressedKeys[KeyboardKeys.Two]) {
      // eslint-disable-next-line no-param-reassign
      game.currentScene = 1;
    }
  }
}

class MovementChangeLevelSystem {
  run({ entities }, { cameras, worlds }) {
    const [camera] = cameras;
    const MAX_X = camera.center[0] + camera.width / 2;
    const MIN_X = camera.center[0] - camera.width / 2;
    let worldActiveIndex = worlds.findIndex((w) => w.active);
    entities.forEach((e) => {
      const transform = e.components.find((c) => c instanceof TransformComponent);
      const movement = e.components.find((c) => c instanceof MovementComponent);
      if (!transform || !movement) return;
      const [x] = transform.position;
      if (x > MAX_X || x < MIN_X) {
        // eslint-disable-next-line
        worlds[worldActiveIndex].active = false;
        if (++worldActiveIndex === worlds.length) worldActiveIndex = 0;
        // eslint-disable-next-line
        worlds[worldActiveIndex].active = true;
      }
    });
  }
}

class MovementAudioSystem {
  run({ entities }) {
    entities.forEach((e) => {
      const movement = e.components.find((c) => c instanceof MovementComponent);
      const audio = e.components.find((c) => c instanceof AudioComponent);
      if (!movement || !audio) return;
      if (movement.direction[0] !== 0) {
        audio.play = true;
      }
    });
  }
}


function parseDemo1(game) {
  const camera = new CameraComponent({
    center: [20, 60],
    width: 20,
    viewport: [20, 40, 600, 300],
  });
  game.addCamera(camera);

  const blueTransform = new TransformComponent({
    position: [20, 60],
    size: [5, 5],
    rotationInRadians: 0.2,
  });
  const blueRect = new Rectangle({ color: Color.Blue, transform: blueTransform });
  blueRect.components.push(new MovementComponent({ speed: 0.05, direction: [1, 0] }));
  blueRect.components.push(new MovementKeysComponent({
    right: KeyboardKeys.Right,
    left: KeyboardKeys.Left,
  }));
  blueRect.components.push(new RotationComponent({ degree: 1 }));
  blueRect.components.push(new RotationKeysComponent({
    increase: KeyboardKeys.Up,
    decrease: KeyboardKeys.Down,
  }));
  game.addEntity(blueRect);
  const redTransform = new TransformComponent({
    position: [20, 60],
    size: [2, 2],
  });
  const redRect = new Rectangle({ color: Color.Red, transform: redTransform });
  redRect.components.push(new PulseComponent({ rate: 0.01, minSize: [2, 2], maxSize: [5, 5] }));
  game.addEntity(redRect);


  const topRight = new Rectangle({
    color: Color.Green,
    transform: new TransformComponent({ position: [30, 65], size: [1, 1] }),
  });
  game.addEntity(topRight);
  const topLeft = new Rectangle({
    color: Color.Green,
    transform: new TransformComponent({ position: [10, 65], size: [1, 1] }),
  });
  game.addEntity(topLeft);
  const bottomRight = new Rectangle({
    color: Color.Green,
    transform: new TransformComponent({ position: [30, 55], size: [1, 1] }),
  });
  game.addEntity(bottomRight);
  const bottomLeft = new Rectangle({
    color: Color.Green,
    transform: new TransformComponent({ position: [10, 55], size: [1, 1] }),
  });
  game.addEntity(bottomLeft);
}

function main() {
  const canvas = document.querySelector('#canvas');

  const game = new GameEngine(canvas, { bgColor: [0.9, 0.9, 0.9, 1] });
  game.useBefore(new KeyboardChangeDemoSystem());
  fetch('assets/scenes/demo1/scene.json')
    .then((res) => res.json())
    .then((data) => {
      const scene1 = game.createScene();
      parseDemo1(scene1);
      scene1.use(new KeyboardMovementSystem());
      scene1.use(new KeyboardRotationSystem());
      scene1.use(new MovementSystem());
      scene1.use(new MovementPortalSystem());
      scene1.use(new RotationSystem());
      scene1.use(new PulseSystem());
      scene1.use(new AudioSystem());

      const parser = new SceneParser();
      parser.map('transform', TransformComponent);
      parser.map('movement', MovementComponent);
      parser.map('movementKeys', MovementKeysComponent);
      parser.map('render', RenderComponent);
      parser.map('audio', AudioComponent);

      const scene2 = game.createScene();
      parser.parse(scene2, data);
      scene2.use(new KeyboardMovementSystem());
      scene2.use(new MovementSystem());
      scene2.use(new MovementChangeLevelSystem());
      scene2.use(new MovementAudioSystem());
      scene2.use(new AudioSystem());

      game.useAfter(new SoundSystem());
      game.start();
    });
}

window.addEventListener('load', main);
