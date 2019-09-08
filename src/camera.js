import { mat4 } from 'gl-matrix';

export const BackgroundTypes = Object.freeze({
  Fixed: 'static',
  Normal: 'normal',
});

export const CameraViewport = Object.freeze({
  X: 0,
  Y: 1,
  Width: 2,
  Height: 3,
});

export class BackgroundComponent {
  constructor({
    type, texture, position, size, color,
  } = {}) {
    this.type = type || BackgroundTypes.Normal;
    this.texture = texture;
    this.position = position;
    this.size = size;
    this.color = color || [0.8, 0.8, 0.8, 1];
  }
}

export class WorldCoordinateComponent {
  constructor({ center, width }) {
    this.center = center;
    this.width = width;
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

export class CameraEntity {
  components = []

  constructor() {
    // transformation matrices
    this.viewMatrix = mat4.create();
    this.projMatrix = mat4.create();
    this.viewProjection = mat4.create();
  }
}
