attribute vec3 aSquareVertexPosition;
attribute vec2 aTextureCoordinate;

// texture coordinate that will map the entire image to the entire square
varying vec2 vTexCoord;

uniform mat4 uModelTransform;
uniform mat4 uViewProjTransform;
void main(void) {
  gl_Position =  uViewProjTransform * uModelTransform * vec4(aSquareVertexPosition, 1.0);
  vTexCoord = aTextureCoordinate;
}
