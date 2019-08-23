
precision mediump float;   // sets the precision for floating point computation
uniform vec4 uPixelColor;  // to transform the vertex position
void main(void) {
    gl_FragColor = uPixelColor;
}
