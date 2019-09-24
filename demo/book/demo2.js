import { RenderComponent } from '@wge/core/render-engine';
import { AudioComponent, AudioSystem } from '@wge/core/audio-system';
import { SceneParser } from '@wge/core/scene-parser';
import { TransformComponent } from '@wge/core/utils';
import {
  MovementComponent, MovementKeysComponent, KeyboardMovementSystem,
  MovementSystem, MovementChangeLevelSystem, MovementAudioSystem,
} from './shared';

export default (game, data) => {
  const parser = new SceneParser();
  parser.map('transform', TransformComponent);
  parser.map('movement', MovementComponent);
  parser.map('movementKeys', MovementKeysComponent);
  parser.map('render', RenderComponent);
  parser.map('audio', AudioComponent);

  const scene2 = game.createScene();
  parser.parse(scene2, data);
  scene2.use(new KeyboardMovementSystem());
  scene2.use(new MovementSystem());
  scene2.use(new MovementChangeLevelSystem());
  scene2.use(new MovementAudioSystem());
  scene2.use(new AudioSystem());
};