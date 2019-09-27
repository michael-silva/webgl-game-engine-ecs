import {
  WorldCoordinateComponent, CameraEntity, ViewportComponent,
} from '@wge/core/camera';
import { createPlayScene, createMenuScene } from './scenes';

export default (game) => {
  const camera = new CameraEntity();
  camera.components.push(new WorldCoordinateComponent({
    center: [50, 37.5],
    width: 100,
  }));
  camera.components.push(new ViewportComponent({
    array: [0, 0, 1280, 720],
  }));

  game.addCamera(camera);
  createPlayScene(game);
  createMenuScene(game);
};
