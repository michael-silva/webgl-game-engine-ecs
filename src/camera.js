import { mat4 } from 'gl-matrix';

export const CameraViewport = Object.freeze({
  X: 0,
  Y: 1,
  Width: 2,
  Height: 3,
});

export class WorldCoordinateComponent {
  constructor({ center, width, z = 10 }) {
    this.center = center;
    this.width = width;
    this.z = z;
  }
}

export class ViewportComponent {
  constructor({
    array, bound = 0,
    farPlane = 1000, nearPlane = 0,
  }) {
    // [x, y, width, height]
    this.array = [...array];
    this.array[0] = array[0] + bound;
    this.array[1] = array[1] + bound;
    this.array[2] = array[2] - (2 * bound);
    this.array[3] = array[3] - (2 * bound);
    this.bounds = [...array];
    this.farPlane = farPlane;
    this.nearPlane = nearPlane;
  }
}

export class PerRenderCache {
  wcToPixelRatio = 1;

  // WC to pixel transformation
  orgX = 1;

  // Lower-left corner of camera in WC
  orgY = 1;

  posInPixelSpace = [0, 0, 0];
}


export class CameraEntity {
  components = []

  constructor() {
    this.renderCache = new PerRenderCache();
    // transformation matrices
    this.viewMatrix = mat4.create();
    this.projMatrix = mat4.create();
    this.viewProjection = mat4.create();
  }
}
