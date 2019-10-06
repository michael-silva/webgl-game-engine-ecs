# Shadow runner

A simple side scroller running game, inspired by first vector game. The project try to demonstrate some about animation and light effects.

## Graphics

*Proposal 1*
Platforms, player and all others first plane objects darken as shadows to congrats with lights background and far plane objects

*Proposal 2*
First plane objects as shadows and darken scenaries like terror movies, just some lights contrasting and the player lanterns

## Mechanics

The game start paused with a phrase to press space to start the game.

The level is generated procedurally, it has multiples layers of background and black platforms. There are some power ups and killing objects to player collide.

The player keeps running to the right and he accelerate until reach a max speed end deaccelerate when collide with some obstacle. He can jump or crunch down to reach another platform is surpass some obstacle.

The game ends when player get killed by one level object or fell down from platforms.

*Proposal*
Darken scenaries and the player needs to get lights to see the platforms and don't die.

## Level objects

- Breaking objects: objects that break when collided, just to slow down the player.
- Killing objects: objects that kill player when collided, they can have movements like up and down or running against the player.
- Platforms: just to player stand on, they can have moving or falling movements.

## Implementation

### Scenes

Pause
Play

### Systems

Physics
KeyboardControlKeys
Powerup
Collision
HealthSystem
Score
MovementSystem
LevelGeneratorSystem
