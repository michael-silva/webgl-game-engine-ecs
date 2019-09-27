import { TransformComponent, TransformUtils, Color } from '@wge/core/utils';

import {
  WorldCoordinateComponent, CameraEntity, ViewportComponent,
} from '@wge/core/camera';
import { AudioSystem } from '@wge/core/audio-system';
import { KeyboardKeys } from '@wge/core/input-engine';
import {
  MovementComponent, MovementKeysComponent,
  KeyboardMovementSystem, MovementSystem,
} from './shared';
import { Rectangle } from './objects';


class RotationComponent {
  constructor({ degree, radians }) {
    this.degree = degree;
    this.radians = radians;
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
  run({ entities }, { inputState }) {
    const { keyboard } = inputState;
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

class MovementPortalSystem {
  run({ entities }, { cameras }) {
    const [camera] = cameras;
    const worldCoordinate = camera.components.find((c) => c instanceof WorldCoordinateComponent);
    const MAX_X = worldCoordinate.center[0] + worldCoordinate.width / 2;
    const MIN_X = worldCoordinate.center[0] - worldCoordinate.width / 2;
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

class PulseComponent {
  constructor({ rate, minSize, maxSize }) {
    this.rate = rate;
    this.minSize = minSize || [];
    this.maxSize = maxSize || [];
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

export default (game) => {
  const scene = game.createScene();
  const camera = new CameraEntity();
  camera.components.push(new WorldCoordinateComponent({
    center: [20, 60],
    width: 20,
  }));
  camera.components.push(new ViewportComponent({
    array: [20, 40, 600, 300],
  }));
  scene.addCamera(camera);

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
  scene.addEntity(blueRect);
  const redTransform = new TransformComponent({
    position: [20, 60],
    size: [2, 2],
  });
  const redRect = new Rectangle({ color: Color.Red, transform: redTransform });
  redRect.components.push(new PulseComponent({ rate: 0.01, minSize: [2, 2], maxSize: [5, 5] }));
  scene.addEntity(redRect);


  const topRight = new Rectangle({
    color: Color.Green,
    transform: new TransformComponent({ position: [30, 65], size: [1, 1] }),
  });
  scene.addEntity(topRight);
  const topLeft = new Rectangle({
    color: Color.Green,
    transform: new TransformComponent({ position: [10, 65], size: [1, 1] }),
  });
  scene.addEntity(topLeft);
  const bottomRight = new Rectangle({
    color: Color.Green,
    transform: new TransformComponent({ position: [30, 55], size: [1, 1] }),
  });
  scene.addEntity(bottomRight);
  const bottomLeft = new Rectangle({
    color: Color.Green,
    transform: new TransformComponent({ position: [10, 55], size: [1, 1] }),
  });
  scene.addEntity(bottomLeft);

  scene.use(new KeyboardMovementSystem());
  scene.use(new KeyboardRotationSystem());
  scene.use(new MovementSystem());
  scene.use(new MovementPortalSystem());
  scene.use(new RotationSystem());
  scene.use(new PulseSystem());
  scene.use(new AudioSystem());
};
