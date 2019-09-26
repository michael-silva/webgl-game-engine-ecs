# WebGL Game Engine

A study of creating a javascript 2D game engine based on canvas WebGL

_Reference examples here <https://gamethemedgroup.github.io/GTCS-GameEngine/index.html>_

## ECS References

- <https://github.com/jslee02/awesome-entity-component-system>
- <https://fractalpixels.com/devblog/nez-and-ecs-basics>
- <https://github.com/chlablak/ecs-pong>

## Features

* Audio Engine
* Input Engine
* Render Engine / Cameras support / Text support / Textures support / Illumintation support / Shadders support
* Particles Engine
* Resource management
* Scenes management
* Physiscs engine
* Utils

## Improvements and Refactorings

* Create a pong demo
* Create a task board on github
* Do the final project game
* Add capability to turn on and off systems
* Add way to extend the existing engines adding new systems
* Add way to add new engines
* Do the samples with advanced particles
* Do the samples with advanced physics
* Do the samples with IDE editor
* Write documentation with demos and tutorials
* Do the unit tests

* Spaces Refactor 
  - Game has a list of active  scenes 
  - Scenes has just one current world
  - Scenes has a list of active cameras and systems
  - Worlds has components with values to be used in systems
  - States are a collection of active scenes and current worlds, and active systems / cameras
  - Change the states to update in next loop the scene or world


## Tech debits

* Think about use of typescript
* Add lerna to project spliting the source packages and demos
* Library of materials/lights/particles/etc...
