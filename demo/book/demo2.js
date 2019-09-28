import { RenderComponent } from '@wge/core/render-engine';
import { AudioComponent, AudioSystem, SoundSystem } from '@wge/core/audio-system';
import { WorldParser } from '@wge/core/world-parser';
import { TransformComponent } from '@wge/core/utils';
import {
  MovementComponent, MovementKeysComponent, KeyboardMovementSystem,
  MovementSystem, MovementChangeLevelSystem, MovementAudioSystem,
} from './shared';

export default (game, data) => {
  const parser = new WorldParser(game);
  parser.map('transform', TransformComponent);
  parser.map('movement', MovementComponent);
  parser.map('movementKeys', MovementKeysComponent);
  parser.map('render', RenderComponent);
  parser.map('audio', AudioComponent);

  const scene = game.createScene();
  parser.parse(scene, data);
  scene.use(new KeyboardMovementSystem());
  scene.use(new MovementSystem());
  scene.use(new MovementChangeLevelSystem());
  scene.use(new MovementAudioSystem());
  scene.use(new AudioSystem());
  scene.use(new SoundSystem());
};
