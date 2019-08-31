import { SpriteAnimation } from '../src/render-system';
import {
  MovementComponent, Rectangle, MovementKeysComponent,
  MovementSystem, KeyboardMovementSystem,
} from './shared';
import { CameraComponent, GameObject } from '../src';
import { Color, RenderUtils, AnimationType } from '../src/utils';
import { TransformComponent, RenderComponent, TextComponent } from '../src/systems';
import { KeyboardKeys } from '../src/input-system';

class ColorUpdateComponent {
  constructor({ color }) {
    this.color = color;
  }
}

class UpdatingColorSystem {
  run({ entities }) {
    entities.forEach((e) => {
      const text = e.components.find((c) => c instanceof TextComponent);
      const colorDelta = e.components.find((c) => c instanceof ColorUpdateComponent);
      if (!text || !colorDelta) return;
      // continously change texture tinting
      const { color } = text;
      color.forEach((value, i) => this.mergeChannel(color, colorDelta.color, i));
    });
  }

  mergeChannel(color1, color2, channel) {
    let ca = color1[channel] + color2[channel];
    if (ca > 1) {
      ca = 0;
    }
    // eslint-disable-next-line no-param-reassign
    color1[channel] = ca;
  }
}

class TextTrackComponent {
  constructor({ component }) {
    this.component = component;
  }
}

class TransformTrackedComponent {}


class TextTrackPositonSystem {
  run({ entities }) {
    entities.forEach((e) => {
      const text = e.components.find((c) => c instanceof TextComponent);
      const track = e.components.find((c) => c instanceof TextTrackComponent);
      if (!text || !track) return;
      const trackEntity = entities
        .find((en) => en.components.some((c) => c instanceof track.component));
      if (!trackEntity) return;
      const transform = trackEntity.components.find((c) => c instanceof TransformComponent);
      const [x, y] = transform.position;
      // continously change texture tinting
      text.content = `${x.toFixed(1)}, ${y.toFixed(1)}`;
    });
  }
}

class ResizeKeysComponent {
  constructor({ increase, decrease }) {
    this.increase = increase;
    this.decrease = decrease;
  }
}

class KeyboardUpdateSizeSystem {
  run({ entities }, scene, { keyboard }) {
    entities.forEach((e) => {
      const text = e.components.find((c) => c instanceof TextComponent);
      const resizeKeys = e.components.find((c) => c instanceof ResizeKeysComponent);
      if (!text || !resizeKeys) return;
      if (keyboard.pressedKeys[resizeKeys.increase]) text.size += 0.5;
      if (keyboard.pressedKeys[resizeKeys.decrease]) text.size -= 0.5;
    });
  }
}

class TextMovementSystem {
  run({ entities }) {
    entities.forEach((e) => {
      const transform = e.components.find((c) => c instanceof TextComponent);
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

class SpritePositionDeltaComponent {
  deltaTop = 0;

  deltaLeft = 0;

  deltaBottom = 0;

  deltaRight = 0;

  constructor(params) {
    if (params) Object.assign(this, params);
  }
}

class UpdateSpritePositionSystem {
  run({ entities }, scene, { resourceMap }) {
    entities.forEach((e) => {
      const renderable = e.components.find((c) => c instanceof RenderComponent);
      const deltaPosition = e.components.find((c) => c instanceof SpritePositionDeltaComponent);
      if (!renderable || !deltaPosition) return;
      const texture = resourceMap[renderable.texture];
      if (!texture || !texture.loaded || !renderable.sprite) return;
      let [left, right, bottom, top] = RenderUtils.fromPixelPositions(
        texture.asset,
        renderable.sprite.position,
      );
      bottom += deltaPosition.deltaBottom;
      if (bottom > 1) bottom = 0;
      if (bottom < 0) bottom = 1;
      right += deltaPosition.deltaRight;
      if (right > 1) right = 0;
      if (right < 0) right = 1;
      left += deltaPosition.deltaLeft;
      if (left > 1) left = 0;
      if (left < 0) left = 1;
      top += deltaPosition.deltaTop;
      if (top > 1) top = 0;
      if (top < 0) top = 1;

      renderable.sprite.position = RenderUtils.toPixelPositions(
        texture.asset,
        [left, right, bottom, top],
      );
    });
  }
}

const parseWorld2 = (scene) => {
  scene.setResources([
    './assets/fonts/system-default-font.fnt',
  ]);

  const message = new GameObject();
  message.components.push(
    new TextComponent({
      content: 'Game Over!',
      position: [22, 32],
      size: 10,
      font: './assets/fonts/system-default-font.fnt',
    }),
  );
  scene.addEntity(message);
};

const parseWorld1 = (scene) => {
  scene.setResources([
    './assets/images/minion_sprite.png',
    './assets/images/Consolas-72.png',
    './assets/fonts/system-default-font.fnt',
    './assets/fonts/Consolas-16.fnt',
    './assets/fonts/Consolas-24.fnt',
    './assets/fonts/Consolas-32.fnt',
    './assets/fonts/Consolas-72.fnt',
    './assets/fonts/Segment7-96.fnt',
  ]);

  const messageSys = new GameObject();
  messageSys.components.push(
    new TextComponent({
      content: 'System Font: in Red',
      position: [50, 60],
      size: 3,
      color: [1, 0, 0, 1],
      font: './assets/fonts/system-default-font.fnt',
    }),
  );

  messageSys.components.push(new TextTrackComponent({ component: TransformTrackedComponent }));
  scene.addEntity(messageSys);
  const message16 = new GameObject();
  message16.components.push(
    new TextComponent({
      content: 'Consolas 16: in black',
      position: [50, 55],
      size: 2,
      font: './assets/fonts/Consolas-16.fnt',
    }),
  );
  message16.components.push(new ResizeKeysComponent({
    increase: KeyboardKeys.Up,
    decrease: KeyboardKeys.Down,
  }));
  scene.addEntity(message16);
  const message24 = new GameObject();
  message24.components.push(
    new TextComponent({
      content: 'Consolas 24: in black',
      position: [50, 50],
      size: 3,
      font: './assets/fonts/Consolas-24.fnt',
    }),
  );
  scene.addEntity(message24);
  const message32 = new GameObject();
  message32.components.push(
    new TextComponent({
      content: 'Consolas 32: in white',
      position: [40, 40],
      size: 4,
      color: [1, 1, 1, 1],
      font: './assets/fonts/Consolas-32.fnt',
    }),
  );
  message32.components.push(new MovementComponent({ speed: 0.5, direction: [1, 0] }));
  message32.components.push(new MovementKeysComponent({
    right: KeyboardKeys.D,
    left: KeyboardKeys.A,
    up: KeyboardKeys.W,
    down: KeyboardKeys.S,
  }));
  scene.addEntity(message32);
  const message72 = new GameObject();
  message72.components.push(
    new TextComponent({
      content: 'Consolas 72: in blue',
      position: [30, 30],
      size: 6,
      color: [0, 0, 1, 1],
      font: './assets/fonts/Consolas-72.fnt',
    }),
  );
  scene.addEntity(message72);
  const message96 = new GameObject();
  message96.components.push(
    new TextComponent({
      content: 'Segment7',
      position: [30, 15],
      size: 7,
      color: [1, 1, 0, 1],
      font: './assets/fonts/Segment7-96.fnt',
    }),
  );
  message96.components.push(new ColorUpdateComponent({ color: [0.003, 0.001, 0, 0] }));
  scene.addEntity(message96);

  const fontSheet = new Rectangle({
    color: [1, 1, 1, 0],
    texture: './assets/images/Consolas-72.png',
    sprite: { position: [0, 512, 0, 512] },
    transform: new TransformComponent({
      position: [15, 50],
      size: [20, 20],
    }),
  });
  fontSheet.components.push(new SpritePositionDeltaComponent({
    deltaBottom: 0.001,
    deltaRight: -0.001,
    maxX: 512,
    maxY: 512,
    minX: 45,
    minY: 45,
  }));
  scene.addEntity(fontSheet);

  const hero = new Rectangle({
    color: Color.Transparent,
    texture: './assets/images/minion_sprite.png',
    sprite: { position: [0, 120, 0, 180] },
    transform: new TransformComponent({
      position: [35, 50],
      size: [12, 18],
    }),
  });
  hero.components.push(new MovementComponent({ speed: 0.5, direction: [1, 0] }));
  hero.components.push(new TransformTrackedComponent());
  hero.components.push(new MovementKeysComponent({
    right: KeyboardKeys.Right,
    left: KeyboardKeys.Left,
  }));
  scene.addEntity(hero);

  const leftMinion = new Rectangle({
    color: [1, 1, 1, 0],
    texture: './assets/images/minion_sprite.png',
    sprite: {
      position: [0, 204, 348, 512],
      animation: Object.assign(new SpriteAnimation(), {
        numFrames: 5,
        width: 204,
        height: 164,
        top: 512,
        left: 0,
        animationType: AnimationType.AnimateSwing,
        updateInterval: 15,
      }),
    },
    transform: new TransformComponent({
      position: [15, 25],
      size: [24, 19.2],
    }),
  });
  scene.addEntity(leftMinion);
};

export default (game) => {
  const scene = game.createScene();
  const camera = new CameraComponent({
    center: [50, 33],
    width: 100,
    viewport: [0, 0, 600, 400],
  });
  scene.addCamera(camera);

  parseWorld1(scene);
  const world2 = scene.createWorld();
  parseWorld2(world2);

  scene.use(new KeyboardMovementSystem());
  scene.use(new MovementSystem());
  scene.use(new TextMovementSystem());
  scene.use(new UpdatingColorSystem());
  scene.use(new UpdateSpritePositionSystem());
  scene.use(new TextTrackPositonSystem());
  scene.use(new KeyboardUpdateSizeSystem());
};
