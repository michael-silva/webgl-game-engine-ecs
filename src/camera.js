import { mat4 } from 'gl-matrix';

export class BackgroundComponent {
  constructor({
    texture, position, size, color,
  } = {}) {
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
  constructor({ array, farPlane = 1000, nearPlane = 0 }) {
    this.array = array;
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
