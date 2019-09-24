import { TextComponent, RenderComponent, BackgroundRenderComponent } from '@wge/core/render-engine';
import { TransformComponent } from '@wge/core/utils';
import { GameObject } from '@wge/core';
import { KeyboardKeys } from '@wge/core/input-system';
import { AudioComponent, AudioSystem } from '@wge/core/audio-system';
import {
  KeyboardTextMenuSystem,
  MainMenuSystem,
  KeyboardTextMenuComponent,
  KeyboardMovementSystem,
  IAMovementSystem,
  SolidCollisionSystem,
  MovementSystem,
  RespawnSystem,
  ScoreSystem,
  PauseMenuSystem,
} from './systems';
import {
  SolidComponent,
  BoundaryComponent,
  MovementComponent,
  MovementKeysComponent,
  ScoreComponent,
  AIMovementComponent,
} from './components';


export class MenuScene {
  constructor(game, camera) {
    const menuScene = game.createScene();
    menuScene.addCamera(camera);
    menuScene.setResources([
      './assets/fonts/system-default-font.fnt',
    ]);

    const menuWorld = menuScene.getWorld();
    const option1 = new GameObject();
    option1.components.push(
      new TextComponent({
        content: 'Single player',
        position: [30, 50],
        size: 5,
        color: [1, 1, 1, 1],
        font: './assets/fonts/system-default-font.fnt',
      }),
    );
    menuWorld.addEntity(option1);
    const option2 = new GameObject();
    option2.components.push(
      new TextComponent({
        content: '2 Players',
        position: [30, 40],
        size: 5,
        color: [1, 1, 1, 1],
        font: './assets/fonts/system-default-font.fnt',
      }),
    );
    menuWorld.addEntity(option2);
    const option3 = new GameObject();
    option3.components.push(
      new TextComponent({
        content: 'Back to menu',
        position: [30, 30],
        size: 5,
        color: [1, 1, 1, 1],
        font: './assets/fonts/system-default-font.fnt',
      }),
    );
    menuWorld.addEntity(option3);
    const menu = new GameObject();
    menu.components.push(new KeyboardTextMenuComponent({
      options: [option1.id, option2.id, option3.id],
      selectedColor: [1, 0, 0, 1],
      defaultColor: [1, 1, 1, 1],
      keys: {
        next: KeyboardKeys.Down,
        prev: KeyboardKeys.Up,
        enter: KeyboardKeys.Enter,
      },
    }));
    menuWorld.addEntity(menu);
    menuScene.use(new KeyboardTextMenuSystem());
    menuScene.use(new MainMenuSystem());
  }
}

export class PlayScene {
  constructor(game, camera) {
    const playScene = game.createScene();
    playScene.addCamera(camera);
    playScene.setResources([
      './assets/fonts/system-default-font.fnt',
    ]);

    const world = playScene.getWorld();
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


    const menuWorld = playScene.createWorld();
    const option1 = new GameObject();
    option1.components.push(
      new TextComponent({
        content: 'Continue',
        position: [30, 50],
        size: 5,
        color: [1, 1, 1, 1],
        font: './assets/fonts/system-default-font.fnt',
      }),
    );
    menuWorld.addEntity(option1);
    const option2 = new GameObject();
    option2.components.push(
      new TextComponent({
        content: 'Exit game',
        position: [30, 40],
        size: 5,
        color: [1, 1, 1, 1],
        font: './assets/fonts/system-default-font.fnt',
      }),
    );
    menuWorld.addEntity(option2);
    const menu = new GameObject();
    menu.components.push(new KeyboardTextMenuComponent({
      options: [option1.id, option2.id],
      selectedColor: [1, 0, 0, 1],
      defaultColor: [1, 1, 1, 1],
      keys: {
        next: KeyboardKeys.Down,
        prev: KeyboardKeys.Up,
        enter: KeyboardKeys.Enter,
      },
    }));
    menuWorld.addEntity(menu);

    playScene.use(new KeyboardMovementSystem());
    playScene.use(new IAMovementSystem());
    playScene.use(new SolidCollisionSystem());
    playScene.use(new MovementSystem());
    playScene.use(new RespawnSystem());
    playScene.use(new ScoreSystem());
    playScene.use(new AudioSystem());
    playScene.use(new PauseMenuSystem());
    playScene.use(new KeyboardTextMenuSystem());
  }
}
