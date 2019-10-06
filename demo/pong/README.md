# Pong

A clone of classic Atari pong game. The project try to demonstrate how to build basic game.

## Mechanic

The playing stage consist of two walls  (top and down) and a background image. There atwo paddles one on each side(left and right) of stage.

The paddles can move top and down until reach the wallls, it needs to hit the ball and bounces it back to other things

The game has a board with top and down walls, it have two paddles one on right and the other at left and also one ball at center.

The ball start moving from center of screen and when collide the top or down wall they invert its direction. If the ball collide with a paddle the speed increase a little and the position invert based in collision angle.

Padles can move up or down until reach the wall, the paddle needs to collide with the ball throw it back, if it miss and the ball get out of screen the last paddle collided gains a point and a new round start.

Wins the game the first paddle to match 10 points.

## Play modes

- Single player 
  A paddle can be moved by keyboard and the IA moves another
- Multiplayer
  Both paddle are moved with keyboard.


## Implementation

### Scenes

Menu
Board

### Systems

Movement
KeyboardMovementKeys
PaddleIAMovement
BallCollisionSystem
ScoreSystem
ClampSystem

