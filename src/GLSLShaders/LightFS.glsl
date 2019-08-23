precision mediump float;

// The object that fetches data from texture.
uniform sampler2D uSampler;

// Color of pixel
uniform vec4 uPixelColor;
uniform vec4 uGlobalAmbientColor; // this is shared globally
uniform float uGlobalAmbientIntensity;

// Light information
#define kGLSLuLightArraySize 4
 // GLSL Fragment shader requires loop control
 // variable to be a constant number. This number 4
 // says, this fragment shader will _ALWAYS_ process
 // all 4 light sources.
 // ***********WARNING***********************
 // This number must correspond to the constant with
 // the same name defined in LightShader.js file.
 // ***********WARNING**************************
 // To change this number MAKE SURE: to update the
 // kGLSLuLightArraySize
 // defined in LightShader.js file.
struct Light {
 vec4 Position; // in pixel space!
 vec4 Color;
 float Near; // distance in pixel space
 float Far; // distance in pixel space
 float Intensity;
 bool IsOn;
};
uniform Light uLights[kGLSLuLightArraySize];
 // Maximum array of lights this shader supports

vec4 LightEffect(Light lgt) {
 vec4 result = vec4(0);
 float atten = 0.0;
 float dist = length(lgt.Position.xyz - gl_FragCoord.xyz);
 if (dist <= lgt.Far) {
 if (dist <= lgt.Near)
 atten = 1.0; // no attenuation
 else {
 // simple quadratic drop off
 float n = dist - lgt.Near;
 float d = lgt.Far - lgt.Near;
 atten = smoothstep(0.0, 1.0, 1.0-(n*n)/(d*d)); // blended attenuation
 }
 }
 result = atten * lgt.Intensity * lgt.Color;
 return result;
}

// Light information
/*uniform bool uLightOn;
uniform vec4 uLightColor;
uniform vec4 uLightPosition; // in pixel space!
uniform float uLightRadius; // in pixel space!
*/
varying vec2 vTexCoord;

void main(void) {
  vec4 textureMapColor = texture2D(uSampler, vec2(vTexCoord.s, vTexCoord.t));
  vec4 lgtResults = uGlobalAmbientIntensity * uGlobalAmbientColor;
  
  // now decide if we should illuminate by the light
  /*if (uLightOn && (textureMapColor.a > 0.0)) {
    float dist = length(uLightPosition.xyz - gl_FragCoord.xyz);
    if (dist <= uLightRadius) {
      // lgtResults += uLightColor;
      lgtResults += (length(uLightColor.xyz) - ((length(uLightColor.xyz) / uLightRadius) * dist));
    }
  }*/
  // now decide if we should illuminate by the light
  if (textureMapColor.a > 0.0) {
    for (int i = 0; i < kGLSLuLightArraySize; i++) {
      if (uLights[i].IsOn) {
        lgtResults += LightEffect(uLights[i]);
      }
    }
  }
  lgtResults *= textureMapColor;
  
  // tint the textured area, and leave transparent area as defined by the texture
  vec3 r = vec3(lgtResults) * (1.0-uPixelColor.a) + vec3(uPixelColor) * uPixelColor.a;
  vec4 result = vec4(r, lgtResults.a);

  gl_FragColor = result;
}
