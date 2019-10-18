import { vec2 } from 'gl-matrix';
import { TransformComponent } from './utils';

export const RigidType = Object.freeze({
  RigidAbstract: 0,
  RigidCircle: 1,
  RigidRectangle: 2,
});

/**
 * Rotate a 2D vector (around the z-axis)
 * @param {vec2} out The receiving vec3
 * @param {vec2} a The vec2 point to rotate
 * @param {vec2} b The origin of the rotation
 * @param {Number} c The angle of rotation
 * @returns {vec2} out
 */
vec2.rotateWRT = (out, a, c, pt) => {
  const r = [];

  vec2.subtract(r, a, pt);
  vec2.rotate(r, r, c);
  vec2.add(r, r, pt);

  // eslint-disable-next-line no-param-reassign
  out = [...r];

  return r;
};

export class RigidShapeComponent {
  get invMass() { return this._mass; }

  set invMass(m) {
    if (m > 0) {
      this._mass = 1 / m;
    }
    else {
      this._mass = 0;
      this.acceleration = [0, 0];
    }
  }

  constructor({
    padding,
    velocity,
    mass = 1,
    restitution = 0.2,
    friction = 0.8,
    inertia,
    acceleration,
    drawBounds,
    drawColor,
    exceptions,
    group,
  }) {
    this.group = group;
    this.exceptions = exceptions || [];

    this.padding = padding || 0.25; // size of the position mark
    this.drawBounds = drawBounds || false;
    this.drawColor = drawColor || [1, 0, 0, 1];
    this.rigidType = RigidType.RigidAbstract;

    // physical properties
    this.invMass = mass;
    this.restitution = restitution;
    this.velocity = velocity || [0, 0];
    this.friction = friction;
    this.inertia = inertia || 0;
    this.acceleration = acceleration || [0, -20];

    this.angularVelocity = 0;
    this.boundRadius = 0;
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
    this.boundRadius = Math.sqrt(width * width + height * height) / 2;
    this.vertex = [];
    this.faceNormal = [];
    if (this.invMass === 0) {
      this.inertia = 0;
    }
    else {
      // inertia=mass*width^2+height^2
      // this.inertia = (1 / this.invMass) * ((width * width + height * height) / 12);
      // this.inertia = 1 / this.inertia;
    }
  }

  setVertices(transform) {
    const center = transform.position;
    const hw = this.width / 2;
    const hh = this.height / 2;
    // 0--TopLeft;1--TopRight;2--BottomRight;3--BottomLeft
    this.vertex[0] = [center[0] - hw, center[1] - hh];
    this.vertex[1] = [center[0] + hw, center[1] - hh];
    this.vertex[2] = [center[0] + hw, center[1] + hh];
    this.vertex[3] = [center[0] - hw, center[1] + hh];
  }

  computeFaceNormals() {
    // 0--Top;1--Right;2--Bottom;3--Left
    // mFaceNormal is normal of face toward outside of rectangle
    for (let i = 0; i < 4; i++) {
      const v = (i + 1) % 4;
      const nv = (i + 2) % 4;
      this.faceNormal[i] = vec2.clone(this.vertex[v]);
      vec2.subtract(this.faceNormal[i], this.faceNormal[i], this.vertex[nv]);
      vec2.normalize(this.faceNormal[i], this.faceNormal[i]);
    }
  }

  rotateVertices(transform) {
    const center = transform.position;
    const r = transform.rotationInRadians;
    for (let i = 0; i < 4; i++) {
      vec2.rotateWRT(this.vertex[i], this.vertex[i], r, center);
    }
    this.computeFaceNormals();
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
    this.boundRadius = radius;
    this.rigidType = RigidType.RigidCircle;
    if (this.invMass === 0) {
      this.inertia = 0;
    }
    else {
      // this.mInvMass is inverted!!
      // Inertia=mass * radius^2
      // 12 is a constant value that can be changed
      this.inertia = (1 / this.invMass) * ((this.radius * this.radius) / 12);
    }
  }
}

export class CollisionInfo {
  constructor({ depth, normal } = {}) {
    this.depth = depth || 0;
    this.normal = normal || [0, 0];
    this.start = [0, 0];
    this.end = [0, 0];
  }

  setInfo(d, n, s) {
    this.depth = d;
    this.normal = [...n];
    this.start = [...s];
    vec2.scaleAndAdd(this.end, s, n, d);
  }
}

class SupportStruct {
  constructor() {
    this.supportPoint = null;
    this.supportPointDist = 0;
  }
}

export class CollisionUtils {
  static _checkCircRecVertex(v, circPos, circRadius) {
    // the center of circle is in corner region of mVertex[nearestEdge]
    const dis = vec2.length(v);
    // compare the distance with radium to decide collision
    if (dis > circRadius) return null;
    const radiusVec = [0, 0];
    const ptAtCirc = [0, 0];
    vec2.scale(v, v, 1 / dis); // normalize
    vec2.scale(radiusVec, v, -circRadius);
    vec2.add(ptAtCirc, circPos, radiusVec);
    const collisionInfo = new CollisionInfo();
    collisionInfo.setInfo(circRadius - dis, v, ptAtCirc);
    return collisionInfo;
  }

  static collidedRectangleAndCircle(rectShape, rectTransform, circShape, circTransform) {
    let collisionInfo = null;
    let outside = false;
    let bestDistance = -Number.MAX_VALUE;
    let nearestEdge = 0;
    const vToC = [0, 0];
    let circ2Pos = [0, 0];
    let projection;
    let i = 0;
    while ((!outside) && (i < 4)) {
      // find the nearest face for center of circle
      circ2Pos = circTransform.position;
      vec2.subtract(vToC, circ2Pos, rectShape.vertex[i]);
      projection = vec2.dot(vToC, rectShape.faceNormal[i]);
      if (projection > bestDistance) {
        outside = (projection > 0); // if projection < 0, inside
        bestDistance = projection;
        nearestEdge = i;
      }
      i++;
    }
    let dis;
    const radiusVec = [0, 0];
    const ptAtCirc = [0, 0];

    if (!outside) { // inside
      // the center of circle is inside of rectangle
      vec2.scale(radiusVec, rectShape.faceNormal[nearestEdge], circShape.radius);
      dis = circShape.radius - bestDistance; // bestDist is -ve
      vec2.subtract(ptAtCirc, circ2Pos, radiusVec);
      collisionInfo = new CollisionInfo();
      collisionInfo.setInfo(dis, rectShape.faceNormal[nearestEdge], ptAtCirc);
      return collisionInfo;
    }
    // the center of circle is outside of rectangle

    // v1 is from left vertex of face to center of circle
    // v2 is from left vertex of face to right vertex of face
    const v1 = [0, 0];
    const v2 = [0, 0];
    vec2.subtract(v1, circ2Pos, rectShape.vertex[nearestEdge]);
    vec2.subtract(v2, rectShape.vertex[(nearestEdge + 1) % 4], rectShape.vertex[nearestEdge]);
    let dot = vec2.dot(v1, v2);

    if (dot < 0) {
      return this._checkCircRecVertex(v1, circ2Pos, circShape.radius);
    }
    // the center of circle is in corner region of mVertex[nearestEdge+1]

    // v1 is from right vertex of face to center of circle
    // v2 is from right vertex of face to left vertex of face
    vec2.subtract(v1, circ2Pos, rectShape.vertex[(nearestEdge + 1) % 4]);
    vec2.scale(v2, v2, -1);
    dot = vec2.dot(v1, v2);
    if (dot < 0) {
      return this._checkCircRecVertex(v1, circ2Pos, circShape.radius);
    }
    // the center of circle is in face region of face[nearestEdge]
    if (bestDistance < circShape.radius) {
      vec2.scale(radiusVec, rectShape.faceNormal[nearestEdge], circShape.radius);
      dis = circShape.radius - bestDistance;
      vec2.subtract(ptAtCirc, circ2Pos, radiusVec);
      collisionInfo = new CollisionInfo();
      collisionInfo.setInfo(dis, rectShape.faceNormal[nearestEdge], ptAtCirc);
    }

    return collisionInfo;
  }

  static collidedTransforms(transform1, transform2) {
    const vFrom1to2 = vec2.fromValues(0, 0);
    vec2.sub(vFrom1to2, transform2.position, transform1.position);
    const xDepth = (transform1.size[0] / 2) + (transform2.size[0] / 2)
      - Math.abs(vFrom1to2[0]);
    if (xDepth > 0) {
      const yDepth = (transform1.size[1] / 2) + (transform2.size[1] / 2)
        - Math.abs(vFrom1to2[1]);
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

  static _findSupportPoint(rect, dir, ptOnEdge) {
    // the longest project length
    const vToEdge = [0, 0];
    let projection;
    const tmpSupport = new SupportStruct();
    tmpSupport.supportPointDist = -Number.MAX_VALUE;
    tmpSupport.supportPoint = null;
    // check each vector of other object
    for (let i = 0; i < rect.vertex.length; i++) {
      vec2.subtract(vToEdge, rect.vertex[i], ptOnEdge);
      projection = vec2.dot(vToEdge, dir);

      // find the longest distance with certain edge
      // dir is -n direction, so the distance should be positive
      if ((projection > 0) && (projection > tmpSupport.supportPointDist)) {
        tmpSupport.supportPoint = rect.vertex[i];
        tmpSupport.supportPointDist = projection;
      }
    }
    return tmpSupport;
  }

  static _findAxisLeastPenetration(rect, otherRect) {
    let n;
    let supportPoint;

    let bestDistance = Number.MAX_VALUE;
    let bestIndex = null;

    let hasSupport = true;
    let i = 0;

    const dir = [0, 0];
    let tmpSupport;
    while ((hasSupport) && (i < rect.faceNormal.length)) {
      // Retrieve a face normal from A
      n = rect.faceNormal[i];

      // use -n as direction and the vectex on edge i as point on edge
      vec2.scale(dir, n, -1);
      const ptOnEdge = rect.vertex[i];
      // find the support on B
      // the point has longest distance with edge i
      tmpSupport = this._findSupportPoint(otherRect, dir, ptOnEdge);
      hasSupport = (tmpSupport.supportPoint !== null);

      // get the shortest support point depth
      if ((hasSupport) && (tmpSupport.supportPointDist < bestDistance)) {
        bestDistance = tmpSupport.supportPointDist;
        bestIndex = i;
        supportPoint = tmpSupport.supportPoint;
      }
      i += 1;
    }
    if (hasSupport) {
      // all four directions have support point
      const bestVec = [0, 0];
      vec2.scale(bestVec, rect.faceNormal[bestIndex], bestDistance);
      const atPos = [0, 0];
      vec2.add(atPos, supportPoint, bestVec);
      const collisionInfo = new CollisionInfo();
      collisionInfo.setInfo(bestDistance, rect.faceNormal[bestIndex], atPos);
      return collisionInfo;
    }
    return null;
  }

  // eslint-disable-next-line no-unused-vars
  static collidedTwoRectangles(rectShape1, rectTransform1, rectShape2, rectTransform2) {
    let collisionInfo = null;
    // find Axis of Separation for both rectangle
    const collisionInfoR1 = this._findAxisLeastPenetration(rectShape1, rectShape2);
    if (collisionInfoR1) {
      const collisionInfoR2 = this._findAxisLeastPenetration(rectShape2, rectShape1);
      if (collisionInfoR2) {
        const depthVec = [0, 0];
        // if both of rectangles are overlapping, choose the shorter normal as the normal
        if (collisionInfoR1.depth < collisionInfoR2.depth) {
          vec2.scale(depthVec, collisionInfoR1.normal, collisionInfoR1.depth);
          const pos = [0, 0];
          vec2.subtract(pos, collisionInfoR1.start, depthVec);
          collisionInfo = new CollisionInfo();
          collisionInfo.setInfo(collisionInfoR1.depth, collisionInfoR1.normal, pos);
        }
        else {
          vec2.scale(depthVec, collisionInfoR2.normal, -1);
          collisionInfo = new CollisionInfo();
          collisionInfo.setInfo(collisionInfoR2.depth, depthVec, collisionInfoR2.start);
        }
      }
    }
    return collisionInfo;
  }

  static collidedTwoCircles(circShape1, circTransform1, circShape2, circTransform2) {
    const vFrom1to2 = [0, 0];
    vec2.sub(vFrom1to2, circTransform2.position, circTransform1.position);
    const rSum = circShape1.radius + circShape2.radius;
    const dist = vec2.length(vFrom1to2);
    if (dist > Math.sqrt(rSum * rSum)) {
      // not overlapping
      return null;
    }
    let collisionInfo = null;
    if (dist !== 0) { // overlapping
      vec2.normalize(vFrom1to2, vFrom1to2);
      const vToC2 = [0, 0];
      vec2.scale(vToC2, vFrom1to2, -circShape2.radius);
      vec2.add(vToC2, circTransform2.position, vToC2);
      collisionInfo = new CollisionInfo();
      collisionInfo.setInfo(rSum - dist, vFrom1to2, vToC2);
    }
    else {
      const n = [0, -1];
      // same position
      if (circShape1.radius > circShape2.radius) {
        const pC1 = circTransform1.position;
        const ptOnC1 = [pC1[0], pC1[1] + circShape1.radius];
        collisionInfo = new CollisionInfo();
        collisionInfo.setInfo(rSum, n, ptOnC1);
      }
      else {
        const pC2 = circShape2.position;
        const ptOnC2 = [pC2[0], pC2[1] + circShape2.radius];
        collisionInfo = new CollisionInfo();
        collisionInfo.setInfo(rSum, n, ptOnC2);
      }
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
    this.systemtAcceleration = [0, -20]; // system-wide default acceleration

    this.relaxationLoopCount = 0; // the current relaxation count
    this.hasOneCollision = false;
    this.correctPosition = true;
    this.hasMotion = true;
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
      for (let j = i + 1; j < tuples.length; j++) {
        const [otherTransform, otherRigid] = tuples[j];
        // eslint-disable-next-line no-continue
        if (rigid.invMass === 0 && otherRigid.invMass === 0) continue;
        // eslint-disable-next-line no-continue
        if (!this.boundTest(rigid, transform, otherRigid, otherTransform)) continue;
        const collisionInfo = CollisionUtils.collidedShapes(rigid, transform,
          otherRigid, otherTransform);
        if (collisionInfo) {
          // make sure info is always from i towards j
          const towards = [0, 0];
          vec2.subtract(towards, otherTransform.position, transform.position);
          if (vec2.dot(towards, collisionInfo.normal) < 0) {
            vec2.scale(collisionInfo.normal, collisionInfo.normal, -1);
            const n = collisionInfo.start;
            collisionInfo.start = collisionInfo.end;
            collisionInfo.end = n;
          }
          this.positionalCorrection(rigid, transform, otherRigid, otherTransform, collisionInfo);
          this.resolveCollision(rigid, transform, otherRigid, otherTransform, collisionInfo);
        }
      }
    });
  }

  boundTest(shape, transform, otherShape, otherTransform) {
    const vFrom1to2 = [0, 0];
    vec2.subtract(vFrom1to2, otherTransform.position, transform.position);
    const rSum = shape.boundRadius + otherShape.boundRadius;
    const dist = vec2.length(vFrom1to2);
    return (dist <= rSum);
  }

  positionalCorrection(s1, t1, s2, t2, collisionInfo) {
    if (!this.correctPosition) { return; }

    const s1InvMass = s1.invMass;
    const s2InvMass = s2.invMass;

    const num = collisionInfo.depth / ((s1InvMass + s2InvMass) * this.posCorrectionRate);
    const correctionAmount = [0, 0];
    vec2.scale(correctionAmount, collisionInfo.normal, num);
    this.adjustPositionBy(s1, t1, correctionAmount, -s1InvMass);
    this.adjustPositionBy(s2, t2, correctionAmount, s2InvMass);
  }

  adjustPositionBy(shape, transform, v, delta) {
    const p = transform.position;
    vec2.scaleAndAdd(p, p, v, delta);
    if (shape.rigidType === RigidType.RigidRectangle) {
      shape.setVertices(transform);
      shape.rotateVertices(transform);
    }
  }

  resolveCollision(s1, t1, s2, t2, collisionInfo) {
    const n = collisionInfo.normal;

    // the direction of collisionInfo is always from s1 to s2
    // but the Mass is inversed, so start scale with s2 and end scale with s1
    const invSum = 1 / (s1.invMass + s2.invMass);
    const start = [0, 0];
    const end = [0, 0];
    const p = [0, 0];
    vec2.scale(start, collisionInfo.start, s2.invMass * invSum);
    vec2.scale(end, collisionInfo.end, s1.invMass * invSum);
    vec2.add(p, start, end);

    // r is vector from center of object to collision point
    const r1 = [0, 0];
    const r2 = [0, 0];
    vec2.subtract(r1, p, t1.position);
    vec2.subtract(r2, p, t2.position);

    // newV = V + mAngularVelocity cross R
    const v1 = [-1 * s1.angularVelocity * r1[1],
      s1.angularVelocity * r1[0]];
    vec2.add(v1, v1, s1.velocity);

    const v2 = [-1 * s2.angularVelocity * r2[1],
      s2.angularVelocity * r2[0]];
    vec2.add(v2, v2, s2.velocity);

    const relativeVelocity = [0, 0];
    vec2.subtract(relativeVelocity, v2, v1);

    // Relative velocity in normal direction
    const rVelocityInNormal = vec2.dot(relativeVelocity, n);

    // if objects moving apart ignore
    if (rVelocityInNormal > 0) {
      return;
    }

    // compute and apply response impulses for each object
    const newRestituion = Math.min(s1.restitution, s2.restitution);
    const newFriction = Math.min(s1.friction, s2.friction);

    // R cross N
    const R1crossN = r1[0] * n[1] - r1[1] * n[0]; // r1 cross n
    const R2crossN = r2[0] * n[1] - r2[1] * n[0]; // r2 cross n

    // Calc impulse scalar
    // the formula of jN can be found in http://www.myphysicslab.com/collision.html
    let jN = -(1 + newRestituion) * rVelocityInNormal;
    jN /= (s1.invMass + s2.invMass
            + R1crossN * R1crossN * s1.inertia
            + R2crossN * R2crossN * s2.inertia);

    // impulse is in direction of normal ( from s1 to s2)
    const impulse = [0, 0];
    vec2.scale(impulse, n, jN);
    // impulse = F dt = m * ?v
    // ?v = impulse / m
    vec2.scaleAndAdd(s1.velocity, s1.velocity, impulse, -s1.invMass);
    vec2.scaleAndAdd(s2.velocity, s2.velocity, impulse, s2.invMass);

    // eslint-disable-next-line no-param-reassign
    s1.angularVelocity += -R1crossN * jN * s1.inertia;
    // eslint-disable-next-line no-param-reassign
    s2.angularVelocity += R2crossN * jN * s2.inertia;

    const tangent = [0, 0];
    vec2.scale(tangent, n, rVelocityInNormal);
    vec2.subtract(tangent, tangent, relativeVelocity);
    vec2.normalize(tangent, tangent);

    const R1crossT = r1[0] * tangent[1] - r1[1] * tangent[0]; // r1.cross(tangent);
    const R2crossT = r2[0] * tangent[1] - r2[1] * tangent[0]; // r2.cross(tangent);
    const rVelocityInTangent = vec2.dot(relativeVelocity, tangent);

    let jT = -(1 + newRestituion) * rVelocityInTangent * newFriction;
    jT /= (s1.invMass + s2.invMass
                + R1crossT * R1crossT * s1.inertia
                + R2crossT * R2crossT * s2.inertia);

    // friction should less than force in normal direction
    if (jT > jN) {
      jT = jN;
    }

    // impulse is from s1 to s2 (in opposite direction of velocity)
    vec2.scale(impulse, tangent, jT);
    vec2.scaleAndAdd(s1.velocity, s1.velocity, impulse, -s1.invMass);
    vec2.scaleAndAdd(s2.velocity, s2.velocity, impulse, s2.invMass);

    // eslint-disable-next-line no-param-reassign
    s1.angularVelocity += -R1crossT * jT * s1.inertia;
    // eslint-disable-next-line no-param-reassign
    s2.angularVelocity += R2crossT * jT * s2.inertia;
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

  _travelShape(frameTime, shape, transform) {
    // update acceleration
    vec2.scaleAndAdd(shape.velocity, shape.velocity, shape.acceleration, frameTime);

    // s += v*t  with new velocity
    // linear motion
    const p = transform.position;
    vec2.scaleAndAdd(p, p, shape.velocity, frameTime);

    // eslint-disable-next-line no-param-reassign
    transform.rotationInRadians += shape.angularVelocity * frameTime;
  }

  _updateRigidShape(frameTime, shape, transform) {
    if (shape.rigidType === RigidType.RigidRectangle) {
      shape.setVertices(transform);
      shape.rotateVertices(transform);
    }
    if (shape.invMass === 0) return;
    if (this.hasMotion) this._travelShape(frameTime, shape, transform);
  }
}
