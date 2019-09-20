import { vec2 } from 'gl-matrix';
import { TransformComponent } from './utils';

export const RigidType = Object.freeze({
  RigidAbstract: 0,
  RigidCircle: 1,
  RigidRectangle: 2,
});

export class RigidShapeComponent {
  get invMass() { return this._mass; }

  set invMass(m) {
    if (m > 0) {
      this._mass = 1 / m;
    }
    else {
      this._mass = 0;
    }
  }

  constructor({
    padding, velocity, mass, restitution, friction,
    acceleration, drawBounds, drawColor,
    exceptions, group,
  }) {
    this.group = group;
    this.exceptions = exceptions || [];
    this.padding = padding || 0.25; // size of the position mark
    this.drawBounds = drawBounds || false;
    this.drawColor = drawColor || [1, 0, 0, 1];
    this.rigidType = RigidType.RigidAbstract;

    // physical properties
    this.invMass = mass !== undefined ? mass : 1;
    this.restitution = restitution !== undefined ? restitution : 0.8;
    this.velocity = velocity || vec2.fromValues(0, 0);
    this.friction = friction !== undefined ? friction : 0.3;
    this.acceleration = acceleration || [0, -50];
  }
}

export class RigidRectangleComponent extends RigidShapeComponent {
  constructor({ width, height, ...props }) {
    super(props);
    if (!height || !width) {
      throw new Error('It\'s required an height and width to create a rectangle rigid body');
    }
    this.rigidType = RigidType.RigidRectangle;
    this.width = width;
    this.height = height;
  }
}

export class RigidCircleComponent extends RigidShapeComponent {
  constructor({ radius, numSides, ...props }) {
    super(props);
    if (!radius) {
      throw new Error('It\'s required an radius to create a circle rigid body');
    }
    this.numSides = numSides || 16;
    this.radius = radius;
    this.rigidType = RigidType.RigidCircle;
  }
}

export class CollisionInfo {
  constructor({ depth, normal } = {}) {
    this.depth = depth || 0;
    this.normal = normal || [0, 0];
  }
}

export class CollisionUtils {
  static collidedRectangleAndCircle(rectShape, rectTransform, circShape, circTransform) {
    const vFrom1to2 = [0, 0];
    vec2.subtract(vFrom1to2, circTransform.position, rectTransform.position);
    const vec = vec2.clone(vFrom1to2);

    const alongX = rectShape.width / 2;
    const alongY = rectShape.height / 2;

    vec[0] = this.clamp(vec[0], -alongX, alongX);
    vec[1] = this.clamp(vec[1], -alongY, alongY);

    let isInside = false;
    if (CollisionUtils.containsPos(rectShape, rectTransform, circShape, circTransform)) {
      isInside = true;
      // Find closest axis
      if (Math.abs(vFrom1to2[0] - alongX) < Math.abs(vFrom1to2[1] - alongY)) {
        // Clamp to closest side
        if (vec[0] > 0) {
          vec[0] = alongX;
        }
        else {
          vec[0] = -alongX;
        }
      }
      else { // y axis is shorter
        // Clamp to closest side
        // eslint-disable-next-line no-lonely-if
        if (vec[1] > 0) {
          vec[1] = alongY;
        }
        else {
          vec[1] = -alongY;
        }
      }
    }

    const normal = [0, 0];
    vec2.subtract(normal, vFrom1to2, vec);

    const distSqr = vec2.squaredLength(normal);
    const rSqr = circShape.radius * circShape.radius;

    if (distSqr > rSqr && !isInside) {
      return false; // no collision exit before costly square root
    }

    const len = Math.sqrt(distSqr);
    let depth;

    vec2.scale(normal, normal, 1 / len); // normalize normal
    if (isInside) { // flip normal if inside the rect
      vec2.scale(normal, normal, -1);
      depth = circShape.radius + len;
    }
    else {
      depth = circShape.radius - len;
    }

    return new CollisionInfo({
      normal,
      depth,
    });
  }

  static collidedTwoRectangles(rectShape1, rectTransform1, rectShape2, rectTransform2) {
    const vFrom1to2 = vec2.fromValues(0, 0);
    vec2.sub(vFrom1to2, rectTransform2.position, rectTransform1.position);
    const xDepth = (rectShape1.width / 2) + (rectShape2.width / 2) - Math.abs(vFrom1to2[0]);
    if (xDepth > 0) {
      const yDepth = (rectShape1.height / 2) + (rectShape2.height / 2) - Math.abs(vFrom1to2[1]);
      const collisionInfo = new CollisionInfo();
      if (yDepth > 0) {
        // axis of least penetration
        if (xDepth < yDepth) {
          if (vFrom1to2[0] < 0) {
            collisionInfo.normal = [-1, 0];
          }
          else {
            collisionInfo.normal = [1, 0];
          }
          collisionInfo.depth = xDepth;
        }
        else {
          if (vFrom1to2[1] < 0) {
            collisionInfo.normal = [0, -1];
          }
          else {
            collisionInfo.normal = [0, 1];
          }

          collisionInfo.depth = yDepth;
        }
        return collisionInfo;
      }
    }
    return null;
  }


  static collidedTwoCircles(circShape1, circTransform1, circShape2, circTransform2) {
    const vFrom1to2 = [0, 0];
    vec2.sub(vFrom1to2, circTransform2.position, circTransform1.position);
    const rSum = circShape1.radius + circShape2.radius;
    const sqLen = vec2.squaredLength(vFrom1to2);
    if (sqLen > (rSum * rSum)) {
      return null;
    }
    const collisionInfo = new CollisionInfo();
    const dist = Math.sqrt(sqLen);
    if (dist !== 0) { // overlapping
      vec2.scale(vFrom1to2, vFrom1to2, 1 / dist);
      collisionInfo.normal = vFrom1to2;
      collisionInfo.depth = rSum - dist;
    }
    else { // same position
      collisionInfo.depth = rSum / 10;
      collisionInfo.normal = [0, 1];
    }
    return collisionInfo;
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
    let collision = null;
    if (otherShape.group && shape.exceptions.includes(otherShape.group)) return null;
    if (otherShape.rigidType === shape.rigidType) {
      if (shape.rigidType === RigidType.RigidCircle) {
        collision = CollisionUtils.collidedTwoCircles(shape, transform, otherShape, otherTransform);
      }
      if (shape.rigidType === RigidType.RigidRectangle) {
        collision = CollisionUtils.collidedTwoRectangles(shape,
          transform, otherShape, otherTransform);
      }
    }
    else if (shape.rigidType === RigidType.RigidCircle) {
      collision = CollisionUtils.collidedRectangleAndCircle(otherShape, otherTransform,
        shape, transform);
      if (collision) {
        collision.normal[0] *= -1;
        collision.normal[1] *= -1;
      }
    }
    else if (shape.rigidType === RigidType.RigidRectangle) {
      collision = CollisionUtils.collidedRectangleAndCircle(shape, transform,
        otherShape, otherTransform);
    }
    return collision;
  }

  static clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }
}

export class PhysicsSystem {
  constructor() {
    // physical system computation
    this.relaxationCount = 15; // number of relaxation iteration
    this.relaxationOffset = 1 / this.relaxationCount; // porportion to apply when scaling friction
    this.posCorrectionRate = 0.8; // percentage of separation to project objects
    this.systemtAcceleration = [0, -50]; // system-wide default acceleration

    this.relaxationLoopCount = 0; // the current relaxation count
    this.hasOneCollision = false;
    this.collisionInfo = new CollisionInfo();
  }

  run({ entities }, game) {
    const { loopState } = game;
    const frameTime = 1 / loopState.FPS;
    const tuples = [];
    entities.forEach((e) => {
      const transform = e.components.find((c) => c instanceof TransformComponent);
      const rigid = e.components.find((c) => c.rigidType >= 0);
      if (!transform || !rigid) return;
      this._updateRigidShape(frameTime, rigid, transform);
      tuples.push([transform, rigid]);
    });
    if (!this.continueRelaxation()) this.beginRelaxation();
    tuples.forEach((e, i) => {
      const [transform, rigid] = e;
      for (let j = 0; j < tuples.length; j++) {
        // eslint-disable-next-line no-continue
        if (rigid.invMass === 0 || i === j) continue;
        const [otherTransform, otherRigid] = tuples[j];
        const collisionInfo = CollisionUtils.collidedShapes(rigid, transform,
          otherRigid, otherTransform);
        if (collisionInfo) {
          this.resolveCollision(rigid, transform, otherRigid, otherTransform, collisionInfo);
        }
      }
    });
  }

  resolveCollision(s1, t1, s2, t2, collisionInfo) {
    // Step A: one collision has been found
    this.hasOneCollision = true;

    // Step B: correct positions
    this._positionalCorrection(s1, t1, s2, t2, collisionInfo);

    // collision normal direction is _against_ s2
    // Step C: apply friction
    const s1V = s1.velocity;
    const s2V = s2.velocity;
    const n = collisionInfo.normal;
    this._applyFriction(n, s1V, s1.friction, s1.invMass);
    this._applyFriction(n, s2V, -s2.friction, s2.invMass);

    // Step D: compute relatively velocity of the colliding objects
    const relativeVelocity = [0, 0];
    vec2.sub(relativeVelocity, s2V, s1V);

    // Step E: examine the component in the normal direction
    // Relative velocity in normal direction
    const rVelocityInNormal = vec2.dot(relativeVelocity, n);
    // if objects moving apart ignore
    if (rVelocityInNormal > 0) {
      return;
    }

    // Step F: compute and apply response impulses for each object
    const newRestituion = Math.min(s1.restitution, s2.restitution);
    // Calc impulse scalar
    let j = -(1 + newRestituion) * rVelocityInNormal;
    j /= (s1.invMass + s2.invMass);

    const impulse = [0, 0];
    vec2.scale(impulse, collisionInfo.normal, j);

    const newImpulse = [0, 0];
    vec2.scale(newImpulse, impulse, s1.invMass);
    vec2.sub(s1V, s1V, newImpulse);

    vec2.scale(newImpulse, impulse, s2.invMass);
    vec2.add(s2V, s2V, newImpulse);
  }

  beginRelaxation() {
    this.relaxationLoopCount = this.relaxationCount;
    this.hasOneCollision = true;
  }

  continueRelaxation() {
    const oneCollision = this.hasOneCollision;
    this.hasOneCollision = false;
    this.relaxationLoopCount -= 1;
    return ((this.relaxationLoopCount > 0) && oneCollision);
  }

  _applyFriction(normal, velocity, friction, mass) {
    const tangent = vec2.fromValues(normal[1], -normal[0]); // perpendicular to n
    const tComponent = vec2.dot(velocity, tangent);
    if (Math.abs(tComponent) < 0.01) return;
    const f = friction * mass * this.relaxationOffset;
    if (tComponent < 0) {
      vec2.scale(tangent, tangent, -f);
    }
    else {
      vec2.scale(tangent, tangent, f);
    }

    vec2.sub(velocity, velocity, tangent);
  }

  _positionalCorrection(solid1, transform1, solid2, transform2, collisionInfo) {
    const s1InvMass = solid1.invMass;
    const s2InvMass = solid2.invMass;
    const num = collisionInfo.depth / ((s1InvMass + s2InvMass) * this.posCorrectionRate);
    const correctionAmount = [0, 0];
    vec2.scale(correctionAmount, collisionInfo.normal, num);
    const ca = [0, 0];
    vec2.scale(ca, correctionAmount, s1InvMass);
    const s1Pos = transform1.position;
    vec2.subtract(s1Pos, s1Pos, ca);
    vec2.scale(ca, correctionAmount, s2InvMass);
    const s2Pos = transform2.position;
    vec2.add(s2Pos, s2Pos, ca);
  }

  _updateRigidShape(frameTime, shape, transform) {
  // Symplectic Euler
  //    v += (1/m * a) * dt
  //    x += v * dt
    const v = shape.velocity;
    vec2.scaleAndAdd(v, v, shape.acceleration, (shape.invMass * frameTime));
    vec2.scaleAndAdd(transform.position, transform.position, v, frameTime);
  }
}
