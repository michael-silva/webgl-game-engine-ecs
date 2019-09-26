# WebGL Game Engine

A study of creating a javascript 2D game engine based on canvas WebGL

_Reference examples here <https://gamethemedgroup.github.io/GTCS-GameEngine/index.html>_

## ECS References

- <https://github.com/jslee02/awesome-entity-component-system>
- <https://fractalpixels.com/devblog/nez-and-ecs-basics>
- <https://github.com/chlablak/ecs-pong>

## Features

- Audio Engine
- Input Engine
- Render Engine / Cameras support / Text support / Textures support / Illumintation support / Shadders support
- Particles Engine
- Resource management
- Scenes management
- Physiscs engine
- Utils

## Task to complete version 1

-[] Create a pong demo
-[] refactor the spaces
  - Game has a list of active scenes
  - Scenes has just one current world
  - Scenes has a list of active cameras and systems
  - Worlds has components with values to be used in systems
  - States are a collection of active scenes and current worlds, and active systems / cameras
  - Change the states to update in next loop the scene or world
-[] Create the final project game
-[] Add capability to turn on and off systems
-[] Add way to extend the existing engines adding new systems
-[] Add way to add new engines
-[] Do the samples with advanced particles
-[] Do the samples with advanced physics
-[] Do the samples with IDE editor
-[] Create the angry birds clone demo
-[] Create the side scroll runner demo
-[] Create the spaceshooter demo
-[] Create the 2d platform demo
-[] Create the fight demo
-[] Create the rpg demo
-[] Add lerna to project spliting the source packages and demos
-[] Create the unit tests

## Futher Improvements

- Think about use of typescript
- Library of materials/lights/particles/etc...
- Write documentation with demos and tutorials
- Split the proccess in multiple threads using web workers
- Easy api to do animations and trasitions
