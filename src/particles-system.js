import { vec2, vec4 } from 'gl-matrix';
import { TransformComponent } from './utils';
import { ParticleRenderComponent } from './render-engine';
import { RigidType } from './physics-system';

export class ParticleShapeComponent {
  constructor({ velocity }) {
    this.padding = 0.5; // for drawing particle bounds
    this.velocity = velocity || [0, 0];
    this.acceleration = [0, -50];
    this.drag = 0.95;
    this.drawBounds = false;
  }
}

export class ParticlePhysicsSystem {
  run({ entities }, game) {
    const { loopState } = game;
    const frameTime = 1 / loopState.FPS;
    const rigids = [];
    entities.forEach((e) => {
      const shape = e.components.find((c) => c.rigidType >= 0);
      const transform = e.components.find((c) => c instanceof TransformComponent);
      if (shape && transform) rigids.push([shape, transform]);
    });
    entities.forEach((e) => {
      const particle = e.components.find((c) => c instanceof ParticleShapeComponent);
      const transform = e.components.find((c) => c instanceof TransformComponent);
      if (!particle || !transform) return;
      vec2.scaleAndAdd(particle.velocity, particle.velocity, particle.acceleration, frameTime);
      vec2.scale(particle.velocity, particle.velocity, particle.drag);
      vec2.scaleAndAdd(transform.position, transform.position, particle.velocity, frameTime);
      rigids.forEach(([shape, shapeTransform]) => {
        if (shape.rigidType === RigidType.RigidCircle) {
          this._resolveCirclePos(transform, shape, shapeTransform);
        }
        else if (shape.rigidType === RigidType.RigidRectangle) {
          this._resolveRectPos(transform, shape, shapeTransform);
        }
      });
    });
  }

  _resolveCirclePos(transform, circShape, circTransform) {
    // the follows are scratch workspace for vec2
    const from1to2 = [0, 0];
    let collided = false;
    const pos = transform.position;
    const cPos = circTransform.position;
    vec2.subtract(from1to2, pos, cPos);
    const dist = vec2.length(from1to2);
    if (dist < circShape.radius) {
      vec2.scale(from1to2, from1to2, 1 / dist);
      vec2.scaleAndAdd(pos, cPos, from1to2, circShape.radius);
      collided = true;
    }
    return collided;
  }

  _resolveRectPos(transform, rectShape, rectTransform) {
    // the follows are scratch workspace for vec2
    const from1to2 = [0, 0];
    const normal = [0, 0];
    let collided = false;
    const alongX = rectShape.width / 2;
    const alongY = rectShape.height / 2;

    const pos = transform.position;
    const rectPos = rectTransform.position;

    const rectMinX = rectPos[0] - alongX;
    const rectMaxX = rectPos[0] + alongX;
    const rectMinY = rectPos[1] - alongY;
    const rectMaxY = rectPos[1] + alongY;

    collided = ((rectMinX < pos[0]) && (rectMinY < pos[1])
                    && (rectMaxX > pos[0]) && (rectMaxY > pos[1]));

    if (collided) {
      vec2.subtract(from1to2, pos, rectPos);
      const vec = [...from1to2];

      // Find closest axis
      if (Math.abs(from1to2[0] - alongX) < Math.abs(from1to2[1] - alongY)) {
        // Clamp to closest side
        normal[0] = 0;
        normal[1] = 1;
        if (vec[0] > 0) {
          vec[0] = alongX;
        }
        else {
          vec[0] = -alongX;
        }
      }
      else { // y axis is shorter
        normal[0] = 1;
        normal[1] = 0;
        // Clamp to closest side
        if (vec[1] > 0) {
          vec[1] = alongY;
        }
        else {
          vec[1] = -alongY;
        }
      }

      vec2.subtract(vec, vec, from1to2);
      vec2.add(pos, pos, vec); // remember pos is particle position
    }
    return collided;
  }
}

// @component
export class ParticleLifecycleComponent {
  constructor({
    deltaColor = [0, 0, 0, 0],
    sizeDelta = 0,
    cyclesToLive,
  } = {}) {
    this.deltaColor = deltaColor;
    this.sizeDelta = sizeDelta;
    this.cyclesToLive = cyclesToLive;
  }
}

export class ParticleUpdateSystem {
  run({ entities }) {
    entities.forEach((e) => {
      const particle = e.components.find((c) => c instanceof ParticleLifecycleComponent);
      const transform = e.components.find((c) => c instanceof TransformComponent);
      const renderable = e.components.find((c) => c instanceof ParticleRenderComponent);
      if (!particle || !transform || !renderable) return;
      particle.cyclesToLive--;
      const c = renderable.color;
      vec4.add(c, c, particle.deltaColor);
      const s = transform.size[0] * particle.sizeDelta;
      transform.size = [s, s];
      if (particle.cyclesToLive <= 0) e.destroy();
    });
  }
}
