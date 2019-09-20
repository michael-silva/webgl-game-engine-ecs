import { SpriteAnimation, RenderComponent, AnimationType } from '../src/render-engine';
import {
  MovementComponent, MovementKeysComponent,
  MovementSystem, KeyboardMovementSystem,
} from './shared';
import {
  Color, RenderUtils, TransformComponent,
} from '../src/utils';
import { KeyboardKeys } from '../src/input-system';
import { Rectangle } from './objects';
import {
  CameraEntity, WorldCoordinateComponent, ViewportComponent, BackgroundComponent,
} from '../src/camera';

class ColorUpdateComponent {
  constructor({ color }) {
    this.color = color;
  }
}

class UpdatingColorSystem {
  run({ entities }) {
    entities.forEach((e) => {
      const renderable = e.components.find((c) => c instanceof RenderComponent);
      const colorDelta = e.components.find((c) => c instanceof ColorUpdateComponent);
      if (!renderable || !colorDelta) return;
      // continously change texture tinting
      const { color } = renderable;
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
  run({ entities }, { resourceMap }) {
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
  camera.components.push(new BackgroundComponent());
  scene.addCamera(camera);

  scene.setResources([
    './assets/images/minion_sprite.png',
    './assets/images/Consolas-72.png',
  ]);

  const portal = new Rectangle({
    color: Color.Transparent,
    texture: './assets/images/minion_sprite.png',
    sprite: { position: [130, 310, 0, 180] },
    transform: new TransformComponent({
      position: [25, 60],
      size: [3, 3],
    }),
  });
  scene.addEntity(portal);
  const collector = new Rectangle({
    color: [1, 0, 0, 0],
    texture: './assets/images/minion_sprite.png',
    sprite: { position: [315, 495, 0, 180] },
    transform: new TransformComponent({
      position: [15, 60],
      size: [3, 3],
    }),
  });
  collector.components.push(new ColorUpdateComponent({ color: [0, 0, 0, 0.02] }));
  scene.addEntity(collector);

  const fontSheet = new Rectangle({
    color: [1, 1, 1, 0],
    texture: './assets/images/Consolas-72.png',
    sprite: { position: [0, 512, 0, 512] },
    transform: new TransformComponent({
      position: [13, 62],
      size: [4, 4],
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
      position: [20, 60],
      size: [2, 2],
    }),
  });
  hero.components.push(new MovementComponent({ speed: 0.05, direction: [1, 0] }));
  hero.components.push(new MovementKeysComponent({
    right: KeyboardKeys.Right,
    left: KeyboardKeys.Left,
  }));
  scene.addEntity(hero);


  const rightMinion = new Rectangle({
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
        updateInterval: 50,
      }),
    },
    transform: new TransformComponent({
      position: [26, 56.5],
      size: [4, 3.2],
    }),
  });
  scene.addEntity(rightMinion);
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
        updateInterval: 10,
      }),
    },
    transform: new TransformComponent({
      position: [15, 56.5],
      size: [4, 3.2],
    }),
  });
  scene.addEntity(leftMinion);
  scene.use(new KeyboardMovementSystem());
  scene.use(new MovementSystem());
  scene.use(new UpdatingColorSystem());
  scene.use(new UpdateSpritePositionSystem());
};
