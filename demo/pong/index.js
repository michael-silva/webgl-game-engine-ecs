import {
  WorldCoordinateComponent, CameraEntity, ViewportComponent,
} from '@wge/core/camera';
import { MenuScene, PlayScene } from './scenes';


export default (game) => {
  const camera = new CameraEntity();
  camera.components.push(new WorldCoordinateComponent({
    center: [50, 37.5],
    width: 100,
  }));
  camera.components.push(new ViewportComponent({
    array: [0, 0, 1280, 720],
  }));

  // eslint-disable-next-line no-new
  new MenuScene(game, camera);
  // eslint-disable-next-line no-new
  new PlayScene(game, camera);
};
