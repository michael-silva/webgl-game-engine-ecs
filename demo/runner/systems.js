/* eslint-disable max-classes-per-file */
import { TransformComponent, CameraUtils, BoundingUtils } from '@wge/core/utils';
import { TextComponent, RenderComponent } from '@wge/core/render-engine';
import { WorldCoordinateComponent, ViewportComponent } from '@wge/core/camera';
import { CollisionUtils, RigidRectangleComponent } from '@wge/core/physics-system';
import { AudioComponent } from '@wge/core/audio-system';
import {
  MovementComponent,
  MovementKeysComponent,
  AIMovementComponent,
  BoundaryComponent,
  ScoreComponent,
  SolidComponent,
  FadeComponent,
} from './components';
import { GameObject } from '../../src';


export const Scenes = Object.freeze({
  PLAY: 0,
  MENU: 1,
});

export class MovementSystem {
  run({ entities }) {
    entities.forEach((e) => {
      const transform = e.components.find((c) => c instanceof TransformComponent);
      const movement = e.components.find((c) => c instanceof MovementComponent);
      if (!transform || !movement) return;
      const [x, y] = transform.position;
      const [dx, dy] = movement.direction;
      const mx = dx * movement.speed;
      const my = dy * movement.speed;
      transform.position = [x + mx, y + my];
    });
  }
}

// Powerup;
// Collision;
// HealthSystem;
// Score;

export class KeyboardControlSystem {
  run({ entities }, { inputState }) {
    const { keyboard } = inputState;
    entities.forEach((e) => {
      const rigid = e.components.find((c) => c.rigidType >= 0);
      const movementKeys = e.components.find((c) => c instanceof MovementKeysComponent);
      if (!rigid || !movementKeys) return;
      if (keyboard.clickedKeys[movementKeys.up] && Math.floor(rigid.velocity[1]) === 0) {
        rigid.velocity[1] = 40;
      }
      if (keyboard.pressedKeys[movementKeys.left]) rigid.velocity[0] -= 1;
      if (keyboard.pressedKeys[movementKeys.right]) rigid.velocity[0] += 1;
      rigid.velocity[0] = Math.min(Math.max(rigid.velocity[0], 10), 45);
    });
  }
}


export class CameraPanComponent {
  constructor({ camIndex, zone }) {
    this.camIndex = camIndex;
    this.zone = zone;
  }
}

export class CameraPanSystem {
  run({ entities }, { cameras }) {
    cameras.forEach((camera, i) => {
      const worldCoordinate = camera.components.find((c) => c instanceof WorldCoordinateComponent);
      const viewport = camera.components.find((c) => c instanceof ViewportComponent);
      if (!worldCoordinate || !viewport) return;
      entities.forEach((e) => {
        const transform = e.components.find((c) => c instanceof TransformComponent);
        const pan = e.components.find((c) => c instanceof CameraPanComponent);
        if (!transform || !pan || pan.camIndex !== i) return;
        const { zone } = pan;
        const wcTransform = CameraUtils.getWcTransform(worldCoordinate, viewport, zone);
        const collideStatus = BoundingUtils.boundCollideStatus(wcTransform, transform);
        if (!BoundingUtils.isInside(collideStatus)) {
          const newCenter = [...wcTransform.position];
          const [collideLeft, collideRight] = collideStatus;
          if (collideRight !== 0) {
            newCenter[0] = transform.position[0]
              - (wcTransform.size[0] / 2) + (transform.size[0] / 2);
          }
          if (collideLeft !== 0) {
            newCenter[0] = transform.position[0]
              + (wcTransform.size[0] / 2) - (transform.size[0] / 2);
          }
          worldCoordinate.center = newCenter;
        }
      });
    });
  }
}


export class LevelGeneratorSystem {
  nextPoint = 0;

  run(world, game) {
    const camera = game.cameras[0];
    const worldCoordinate = camera.components.find((c) => c instanceof WorldCoordinateComponent);
    const viewport = camera.components.find((c) => c instanceof ViewportComponent);
    if (!worldCoordinate || !viewport) return;
    const wcTransform = CameraUtils.getWcTransform(worldCoordinate, viewport);
    const wcLeft = wcTransform.position[0] - (wcTransform.size[0] / 2);
    const wcBottom = wcTransform.position[1] - (wcTransform.size[1] / 2);
    const generateStepSize = wcTransform.size[0] * 2;
    if (wcLeft + generateStepSize > this.nextPoint) {
      const size = [
        generateStepSize - (Math.random() * (generateStepSize / 4)),
        20 - (Math.random() * 10),
      ];
      const platform = new GameObject();
      platform.components.push(new RenderComponent({
        color: [0, 0, 0, 1],
      }));
      platform.components.push(new TransformComponent({
        position: [this.nextPoint + (size[0] / 2), wcBottom + (size[1] / 2)],
        size,
      }));
      platform.components.push(new RigidRectangleComponent({
        width: size[0], height: size[1], mass: 0, drawColor: [0, 1, 0, 1], drawBounds: true,
      }));
      world.entities.push(platform);
      this.nextPoint += generateStepSize;
    }
  }
}

export class IAMovementSystem {
  run({ entities }) {
    entities.forEach((e) => {
      const movement = e.components.find((c) => c instanceof MovementComponent);
      const transform = e.components.find((c) => c instanceof TransformComponent);
      const ai = e.components.find((c) => c instanceof AIMovementComponent);
      if (!movement || !transform || !ai) return;
      const target = entities.find((e2) => ai.targetId === e2.id);
      if (!target) return;
      const targetTransform = target.components.find((c) => c instanceof TransformComponent);
      if (targetTransform.position[1] > transform.position[1]) movement.direction[1] = 1;
      if (targetTransform.position[1] < transform.position[1]) movement.direction[1] = -1;
      else movement.direction[0] = 0;
    });
  }
}

export class ScoreSystem {
  maxPoints = 1;

  run({ entities }, game) {
    const { scenes } = game;
    const collideds = [];
    entities.forEach((e) => {
      const boundary = e.components.find((c) => c instanceof BoundaryComponent);
      if (!boundary || !boundary.collisionStatus) return;
      collideds.push(boundary);
    });
    if (collideds.length === 0) return;
    entities.forEach((e) => {
      const audio = e.components.find((c) => c instanceof AudioComponent);
      const text = e.components.find((c) => c instanceof TextComponent);
      const score = e.components.find((c) => c instanceof ScoreComponent);
      if (!score) return;
      collideds.forEach((boundary) => {
        const [left, right, bottom, top] = boundary.collisionStatus;
        const [sleft, sright, sbottom, stop] = score.bounds;
        if ((top === 1 && stop === 1) || (right === 1 && sright === 1)
        || (bottom === 1 && sbottom === 1) || (left === 1 && sleft === 1)) {
          score.points++;
          if (audio) {
            audio.play = true;
          }
          if (text) {
            text.content = score.points.toString();
          }
          if (score.points > this.maxPoints) {
            scenes[Scenes.PLAY].paused = true;
            scenes[Scenes.MENU].active = true;
            scenes[Scenes.MENU].currentWorld = 2;
            scenes[Scenes.MENU].worlds[2].entities.forEach((e2) => {
              const render = e2.components.find((c) => c instanceof RenderComponent);
              const fade = e2.components.find((c) => c instanceof FadeComponent);
              if (!fade || !render) return;
              render.color[3] = fade.min;
            });
          }
        }
      });
    });
  }
}

export class RespawnSystem {
  run({ entities }, { cameras }) {
    entities.forEach((e) => {
      const transform = e.components.find((c) => c instanceof TransformComponent);
      const movement = e.components.find((c) => c instanceof MovementComponent);
      const boundary = e.components.find((c) => c instanceof BoundaryComponent);
      if (!transform || !boundary || !movement) return;
      const camera = cameras[boundary.cameraIndex];
      const worldCoordinate = camera.components.find((c) => c instanceof WorldCoordinateComponent);
      const viewport = camera.components.find((c) => c instanceof ViewportComponent);
      const wcTransform = CameraUtils
        .getWcTransform(worldCoordinate, viewport.array, boundary.zone);
      const status = BoundingUtils.boundCollideStatus(wcTransform, transform);
      boundary.collisionStatus = null;
      if (!BoundingUtils.isInside(status)) {
        boundary.collisionStatus = status;
        transform.position = [...worldCoordinate.center];
        const rx = Math.random() > 0.5 ? 1 : -1;
        const ry = Math.random() > 0.5 ? 1 : -1;
        movement.direction = [rx, ry];
        movement.speed = movement.defaultSystem;
      }
    });
  }
}

export class CollisionSystem {
  run({ entities }) {
    const tuples = [];
    entities.forEach((e) => {
      const transform = e.components.find((c) => c instanceof TransformComponent);
      const solid = e.components.find((c) => c instanceof SolidComponent);
      const movement = e.components.find((c) => c instanceof MovementComponent);
      const audios = e.components.filter((c) => c instanceof AudioComponent);
      if (!transform || !solid) return;
      tuples.push([transform, solid, movement, audios || []]);
    });

    tuples.forEach((e, i) => {
      const [transform, solid, movement, audios] = e;
      for (let j = 0; j < tuples.length; j++) {
        // eslint-disable-next-line no-continue
        if (!movement || i === j) continue;
        const [otherTransform, otherSolid] = tuples[j];
        const collision = CollisionUtils.collidedTransforms(transform, otherTransform);
        if (collision) {
          if (solid.kick) {
            if (collision.normal[0] !== 0) movement.direction[0] *= -1;
            if (collision.normal[1] !== 0) movement.direction[1] *= -1;
            if (otherSolid.acceleration) {
              movement.speed += otherSolid.acceleration;
              const audio = audios.find((a) => a.tags && a.tags.includes('hit'));
              if (audio) audio.play = true;
            }
            else {
              const audio = audios.find((a) => a.tags && a.tags.includes('wall'));
              if (audio) audio.play = true;
            }
          }
          else {
            if (collision.normal[0] === movement.direction[0]) {
              movement.direction[0] = 0;
            }
            if (collision.normal[1] === movement.direction[1]) {
              movement.direction[1] = 0;
            }
          }
        }
      }
    });
  }
}
