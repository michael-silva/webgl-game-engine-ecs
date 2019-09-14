
export const RigidType = Object.freeze({
  RigidAbstract: 0,
  RigidCircle: 1,
  RigidRectangle: 2,
});

export class RigidShapeComponent {
  constructor({ padding, drawBounds, drawColor }) {
    this.padding = padding || 0.25; // size of the position mark
    this.drawBounds = drawBounds || false;
    this.drawColor = drawColor || [1, 0, 0, 1];
    this.rigidType = RigidType.RigidAbstract;
  }
}

export class RigidRectangleComponent extends RigidShapeComponent {
  constructor({ width, height, ...props }) {
    super(props);
    this.rigidType = RigidType.RigidRectangle;
    this.width = width;
    this.height = height;
  }
}

export class RigidCircleComponent extends RigidShapeComponent {
  constructor({ radius, numSides, ...props }) {
    super(props);
    this.numSides = numSides || 16;
    this.radius = radius;
    this.rigidType = RigidType.RigidCircle;
  }
}
