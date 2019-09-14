import { vec2 } from 'gl-matrix';

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

export class CollisionUtils {
  static collidedRectangleAndCircle(rectShape, rectTransform, circShape, circTransform) {
    if (CollisionUtils.containsPos(rectShape, rectTransform, circTransform.position)
      || CollisionUtils.containsPos(circShape, circTransform, rectTransform.position)) {
      return true;
    }
    const vFrom1to2 = [0, 0];
    vec2.subtract(vFrom1to2, circTransform.position, rectTransform.position);
    const vec = vec2.clone(vFrom1to2);
    const alongX = rectShape.width / 2;
    const alongY = rectShape.height / 2;
    vec[0] = this.clamp(vec[0], -alongX, alongX);
    vec[1] = this.clamp(vec[1], -alongY, alongY);
    const normal = [0, 0];
    vec2.subtract(normal, vFrom1to2, vec);
    const distSqr = vec2.squaredLength(normal);
    const rSqr = circShape.radius * circShape.radius;
    return (distSqr < rSqr);
  }

  static collidedTwoRectangles(rectShape1, rectTransform1, rectShape2, rectTransform2) {
    const r1Pos = rectTransform1.position;
    const r1MinX = r1Pos[0] - rectShape1.width / 2;
    const r1MaxX = r1Pos[0] + rectShape1.width / 2;
    const r1MinY = r1Pos[1] - rectShape1.height / 2;
    const r1MaxY = r1Pos[1] + rectShape1.height / 2;
    const r2Pos = rectTransform2.position;
    const r2MinX = r2Pos[0] - rectShape2.width / 2;
    const r2MaxX = r2Pos[0] + rectShape2.width / 2;
    const r2MinY = r2Pos[1] - rectShape2.height / 2;
    const r2MaxY = r2Pos[1] + rectShape2.height / 2;
    return ((r1MaxX > r2MinX) && (r1MinX < r2MaxX) && (r1MaxY > r2MinY) && (r1MinY < r2MaxY));
  }


  static collidedTwoCircles(circShape1, circTransform1, circShape2, circTransform2) {
    const vecToCenter = [0, 0];
    vec2.sub(vecToCenter, circTransform1.position, circTransform2.position);
    const rSum = circShape1.radius + circShape2.radius;
    return (vec2.squaredLength(vecToCenter) < (rSum * rSum));
  }

  static containsPos(shape, transform, pos) {
    if (shape.rigidType === RigidType.RigidRectangle) {
      const rPos = transform.position;
      const rMinX = rPos[0] - shape.width / 2;
      const rMaxX = rPos[0] + shape.width / 2;
      const rMinY = rPos[1] - shape.height / 2;
      const rMaxY = rPos[1] + shape.height / 2;
      return ((rMinX < pos[0]) && (rMaxX > pos[0])
            && (rMinY < pos[1] && rMaxY > pos[1]));
    }
    if (shape.rigidType === RigidType.RigidCircle) {
      const dist = vec2.distance(transform.position, pos);
      return (dist < shape.radius);
    }

    return false;
  }

  static collidedShapes(shape, transform, otherShape, otherTransform) {
    if (otherShape.rigidType === shape.rigidType) {
      if (shape.rigidType === RigidType.RigidCircle) {
        return CollisionUtils.collidedTwoCircles(shape, transform, otherShape, otherTransform);
      }
      if (shape.rigidType === RigidType.RigidRectangle) {
        return CollisionUtils.collidedTwoRectangles(shape, transform, otherShape, otherTransform);
      }
    }
    else {
      if (shape.rigidType === RigidType.RigidCircle) {
        return this.collidedRectangleAndCircle(otherShape, otherTransform, shape, transform);
      }
      return this.collidedRectangleAndCircle(shape, transform, otherShape, otherTransform);
    }
    return null;
  }

  static clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }
}
