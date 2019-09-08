
precision mediump float;   // sets the precision for floating point computation

uniform vec4 uPixelColor;  // to transform the vertex position

uniform vec4 uGlobalAmbientColor; // this is shared globally 
uniform float uGlobalAmbientIntensity; // this is shared globally

void main(void) {
    gl_FragColor = uPixelColor * uGlobalAmbientIntensity * uGlobalAmbientColor;
}
