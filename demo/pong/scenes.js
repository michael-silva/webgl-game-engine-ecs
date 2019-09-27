import { TextComponent, RenderComponent, BackgroundRenderComponent } from '@wge/core/render-engine';
import { TransformComponent } from '@wge/core/utils';
import { GameObject } from '@wge/core';
import { KeyboardKeys } from '@wge/core/input-engine';
import { AudioComponent, AudioSystem } from '@wge/core/audio-system';
import {
  KeyboardMovementSystem,
  IAMovementSystem,
  SolidCollisionSystem,
  MovementSystem,
  RespawnSystem,
  ScoreSystem,
  MenuEngine,
  TitleMenuSystem,
  KeyboardMenuSystem,
  PauseMenuSystem,
  EngGameMenuSystem,
  MenuTypes,
  TextMenuSystem,
  PauseGameSystem,
  FadeEffectSystem,
} from './systems';
import {
  MenuConfigComponent,
  SolidComponent,
  BoundaryComponent,
  MovementComponent,
  MovementKeysComponent,
  ScoreComponent,
  AIMovementComponent,
  MenuOptionComponent,
  FadeComponent,
} from './components';

const selectedColor = [0.3, 0.9, 0.3, 1];
const defaultColor = [1, 1, 1, 1];

export const createMenuScene = (game) => {
  const menuScene = game.createScene({ active: true });
  menuScene.setResources([
    './assets/fonts/system-default-font.fnt',
  ]);

  const mainMenu = menuScene.createWorld();
  const title = new GameObject();
  title.components.push(
    new TextComponent({
      content: 'PONG',
      position: [40, 55],
      size: 10,
      color: [1, 1, 1, 1],
      font: './assets/fonts/system-default-font.fnt',
    }),
  );
  mainMenu.addEntity(title);
  const opt1 = new GameObject();
  opt1.components.push(new MenuOptionComponent({ tag: MenuTypes.TITLE }));
  opt1.components.push(
    new TextComponent({
      content: 'Single player',
      position: [30, 40],
      size: 5,
      color: [1, 1, 1, 1],
      font: './assets/fonts/system-default-font.fnt',
    }),
  );
  mainMenu.addEntity(opt1);
  const opt2 = new GameObject();
  opt2.components.push(new MenuOptionComponent({ tag: MenuTypes.TITLE }));
  opt2.components.push(
    new TextComponent({
      content: '2 Players',
      position: [30, 30],
      size: 5,
      color: [1, 1, 1, 1],
      font: './assets/fonts/system-default-font.fnt',
    }),
  );
  mainMenu.addEntity(opt2);
  const opt3 = new GameObject();
  opt3.components.push(new MenuOptionComponent({ tag: MenuTypes.TITLE }));
  opt3.components.push(
    new TextComponent({
      content: 'Back to menu',
      position: [30, 20],
      size: 5,
      color: [1, 1, 1, 1],
      font: './assets/fonts/system-default-font.fnt',
    }),
  );
  mainMenu.addEntity(opt3);
  const menu1 = new GameObject();
  menu1.components.push(new MenuConfigComponent({
    tag: MenuTypes.TITLE,
    selectedColor,
    defaultColor,
    keys: {
      next: KeyboardKeys.Down,
      prev: KeyboardKeys.Up,
      enter: KeyboardKeys.Enter,
    },
  }));
  mainMenu.addEntity(menu1);

  const pauseMenu = menuScene.createWorld();
  const bgMenu = new GameObject();
  bgMenu.components.push(new FadeComponent({ max: 0.5, delta: 0.05 }));
  bgMenu.components.push(new TransformComponent({
    position: [50, 37.5],
    size: [100, 75],
  }));
  bgMenu.components.push(new RenderComponent({
    color: [0.1, 0.1, 0.1, 0.5],
  }));
  pauseMenu.addEntity(bgMenu);
  const option1 = new GameObject();
  option1.components.push(new MenuOptionComponent({ tag: MenuTypes.PAUSE }));
  option1.components.push(
    new TextComponent({
      content: 'Continue',
      position: [30, 50],
      size: 5,
      color: [1, 1, 1, 1],
      font: './assets/fonts/system-default-font.fnt',
    }),
  );
  pauseMenu.addEntity(option1);
  const option2 = new GameObject();
  option2.components.push(new MenuOptionComponent({ tag: MenuTypes.PAUSE }));
  option2.components.push(
    new TextComponent({
      content: 'Exit game',
      position: [30, 40],
      size: 5,
      color: [1, 1, 1, 1],
      font: './assets/fonts/system-default-font.fnt',
    }),
  );
  pauseMenu.addEntity(option2);
  const menu = new GameObject();
  menu.components.push(new MenuConfigComponent({
    tag: MenuTypes.PAUSE,
    selectedColor,
    defaultColor,
    keys: {
      next: KeyboardKeys.Down,
      prev: KeyboardKeys.Up,
      enter: KeyboardKeys.Enter,
    },
  }));
  pauseMenu.addEntity(menu);

  const endgameMenu = menuScene.createWorld();
  const bgMenu1 = new GameObject();
  bgMenu1.components.push(new FadeComponent({ max: 0.5, delta: 0.01 }));
  bgMenu1.components.push(new TransformComponent({
    position: [50, 37.5],
    size: [100, 75],
  }));
  bgMenu1.components.push(new RenderComponent({
    color: [0.1, 0.1, 0.1, 0.5],
  }));
  endgameMenu.addEntity(bgMenu1);
  const title2 = new GameObject();
  title2.components.push(
    new TextComponent({
      content: 'End Game',
      position: [30, 55],
      size: 10,
      color: [1, 1, 1, 1],
      font: './assets/fonts/system-default-font.fnt',
    }),
  );
  endgameMenu.addEntity(title2);
  const op1 = new GameObject();
  op1.components.push(new MenuOptionComponent({ tag: MenuTypes.FINISH }));
  op1.components.push(
    new TextComponent({
      content: 'Play again',
      position: [30, 40],
      size: 5,
      color: [1, 1, 1, 1],
      font: './assets/fonts/system-default-font.fnt',
    }),
  );
  endgameMenu.addEntity(op1);
  const op2 = new GameObject();
  op2.components.push(new MenuOptionComponent({ tag: MenuTypes.FINISH }));
  op2.components.push(
    new TextComponent({
      content: 'Exit game',
      position: [30, 30],
      size: 5,
      color: [1, 1, 1, 1],
      font: './assets/fonts/system-default-font.fnt',
    }),
  );
  endgameMenu.addEntity(op2);
  const menu2 = new GameObject();
  menu2.components.push(new MenuConfigComponent({
    tag: MenuTypes.FINISH,
    selectedColor,
    defaultColor,
    keys: {
      next: KeyboardKeys.Down,
      prev: KeyboardKeys.Up,
      enter: KeyboardKeys.Enter,
    },
  }));
  endgameMenu.addEntity(menu2);

  const menuEngine = new MenuEngine();
  menuEngine.systems.push(new KeyboardMenuSystem());
  menuEngine.systems.push(new TextMenuSystem());
  menuEngine.systems.push(new TitleMenuSystem());
  menuEngine.systems.push(new PauseMenuSystem());
  menuEngine.systems.push(new EngGameMenuSystem());
  menuScene.use(new FadeEffectSystem());
  menuScene.use(menuEngine);
};

export const createPlayScene = (game) => {
  const playScene = game.createScene({ active: false });
  playScene.setResources([
    './assets/fonts/system-default-font.fnt',
  ]);

  const world = playScene.createWorld();
  world.setResources([
    './assets/sounds/playerScore.mp3',
    './assets/sounds/enemyScore.mp3',
    './assets/sounds/wall.mp3',
    './assets/sounds/hit.mp3',
    './assets/images/bg.png',
  ]);

  const bg1 = new GameObject();
  bg1.components.push(new TransformComponent({
    size: [100, 60],
    position: [50, 37.5],
  }));
  bg1.components.push(new BackgroundRenderComponent({
    color: [0.8, 0.8, 0.8, 0],
    texture: './assets/images/bg.png',
    sharp: true,
  }));
  world.addEntity(bg1);

  const ball = new GameObject();
  ball.components.push(new TransformComponent({
    position: [50, 37.5],
    size: [1.5, 1.5],
  }));
  ball.components.push(new RenderComponent({
    color: [1, 1, 1, 1],
  }));
  ball.components.push(new MovementComponent({
    direction: [1, 1],
    speed: 0.2,
  }));
  ball.components.push(new SolidComponent({
    kick: true,
  }));
  ball.components.push(new BoundaryComponent({
    cameraIndex: 0,
  }));
  const audio1 = new AudioComponent({ src: './assets/sounds/wall.mp3' });
  audio1.tags = ['wall'];
  ball.components.push(audio1);
  const audio2 = new AudioComponent({ src: './assets/sounds/hit.mp3' });
  audio2.tags = ['hit'];
  ball.components.push(audio2);
  world.addEntity(ball);

  const player1 = new GameObject();
  player1.components.push(new TransformComponent({
    position: [6, 37.5],
    size: [2, 8],
  }));
  player1.components.push(new RenderComponent({
    color: [1, 1, 1, 1],
  }));
  player1.components.push(new MovementComponent({
    speed: 0.2,
  }));
  player1.components.push(new MovementKeysComponent({
    up: KeyboardKeys.W,
    down: KeyboardKeys.S,
  }));
  player1.components.push(new SolidComponent({
    relative: true,
    acceleration: 0.01,
  }));
  player1.components.push(new ScoreComponent({
    bounds: [1, 0, 0, 0],
  }));
  player1.components.push(new AudioComponent({
    src: './assets/sounds/enemyScore.mp3',
  }));
  player1.components.push(
    new TextComponent({
      content: '0',
      position: [55, 60],
      size: 5,
      color: [1, 1, 1, 1],
      font: './assets/fonts/system-default-font.fnt',
    }),
  );
  world.addEntity(player1);

  const player2 = new GameObject();
  player2.components.push(new TransformComponent({
    position: [94, 37.5],
    size: [2, 8],
  }));
  player2.components.push(new RenderComponent({
    color: [1, 1, 1, 1],
  }));
  player2.components.push(new MovementComponent({
    speed: 0.2,
  }));
  player2.components.push(new SolidComponent({
    relative: true,
    acceleration: 0.01,
  }));
  player2.components.push(new ScoreComponent({
    bounds: [0, 1, 0, 0],
  }));
  player2.components.push(new AudioComponent({
    src: './assets/sounds/playerScore.mp3',
  }));
  player2.components.push(new MovementKeysComponent({
    up: KeyboardKeys.Up,
    down: KeyboardKeys.Down,
  }));
  player2.components.push(new AIMovementComponent({
    targetId: ball.id,
  }));
  player2.components.push(
    new TextComponent({
      content: '0',
      position: [45, 60],
      size: 5,
      color: [1, 1, 1, 1],
      font: './assets/fonts/system-default-font.fnt',
    }),
  );
  world.addEntity(player2);

  const wall1 = new GameObject();
  wall1.components.push(new TransformComponent({
    position: [50, 11],
    size: [100, 0.5],
  }));
  wall1.components.push(new RenderComponent({
    color: [1, 1, 1, 0.6],
  }));
  wall1.components.push(new SolidComponent());
  world.addEntity(wall1);
  const wall2 = new GameObject();
  wall2.components.push(new TransformComponent({
    position: [50, 64],
    size: [100, 0.5],
  }));
  wall2.components.push(new RenderComponent({
    color: [1, 1, 1, 0.6],
  }));
  wall2.components.push(new SolidComponent());
  world.addEntity(wall2);


  playScene.use(new KeyboardMovementSystem());
  playScene.use(new IAMovementSystem());
  playScene.use(new SolidCollisionSystem());
  playScene.use(new MovementSystem());
  playScene.use(new RespawnSystem());
  playScene.use(new ScoreSystem());
  playScene.use(new AudioSystem());
  playScene.use(new PauseGameSystem());
};
