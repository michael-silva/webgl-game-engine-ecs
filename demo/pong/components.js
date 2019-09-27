export class MovementComponent {
  constructor({ speed, direction }) {
    this.speed = speed;
    this.defaultSystem = this.speed;
    this.direction = direction || [0, 0];
  }
}

export class MovementKeysComponent {
  constructor({
    up, down, left, right,
  }) {
    this.up = up;
    this.down = down;
    this.left = left;
    this.right = right;
  }
}

export class AIMovementComponent {
  constructor({ targetId }) {
    this.targetId = targetId;
  }
}

export class BoundaryComponent {
  constructor({ cameraIndex, zone }) {
    this.cameraIndex = cameraIndex;
    this.zone = zone || 1;
  }
}

export class ScoreComponent {
  constructor({ bounds, points }) {
    this.points = points || 0;
    this.bounds = bounds;
  }
}

export class SolidComponent {
  constructor({ kick, relative, acceleration } = {}) {
    this.kick = kick;
    this.acceleration = acceleration;
    this.relative = relative;
  }
}

export class FadeComponent {
  constructor({ min = 0, max = 1, delta = 0.1 } = {}) {
    this.min = min;
    this.max = max;
    this.delta = delta;
  }
}

export class MenuOptionComponent {
  constructor({ tag }) {
    this.tag = tag;
  }
}

export class MenuConfigComponent {
  constructor({
    tag, keys, defaultColor, selectedColor,
  }) {
    this.tag = tag;
    this.keys = keys;
    this.selectedColor = selectedColor;
    this.defaultColor = defaultColor;
    this.selectedIndex = 0;
    this.inLoop = true;
  }
}
