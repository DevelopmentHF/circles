//#include "noise2D.glsl"
#include "noise3D.glsl"

/* glslViewer uniforms */
uniform vec2 u_resolution;
uniform float u_time;

/* constants */
const float GRID = 50.0;
const float SCRAMBLE_1 = 123.53;
const float SCRAMBLE_2 = 345.74;
const float SCRAMBLE_3 = 42.42;
const float NOISE_SPATIAL_FREQ = 0.05; // lower freq == smoother
const float RING_THICKNESS = 0.05;
const float TIME_FACTOR = 0.075;
const float MASK_LOW = 0.17;
const float MASK_HIGH = 0.55;
const float COL_SPREAD = 0.35; // how much colour changes near masked
const bool GREYSCALE = false;
const bool WIGGLE = true;
const bool FILLED_CIRCLES = false;
const bool INVERT = true;

/* prototypes */
float hash21(vec2 pos);
float ring(float hash, vec2 gPos, float thickness, float mask);

float sdRoundedX( in vec2 p, in float w, in float r )
{
    p = abs(p);
    return length(p-min(p.x+p.y,w)*0.5) - r;
}

void main() {
	// normalise and aspect correct
	vec2 uv = gl_FragCoord.xy / u_resolution.xy; // btm left 0,0, top right 1,1
	uv.x *= u_resolution.x / u_resolution.y; 

	// sine shit
	if (WIGGLE) {
		uv.y += sin(uv.x * 30.0 + u_time) * 0.002;
	}

	// create grid
	vec2 pos = uv * GRID; // [0.0, 28.0]
	vec2 id = floor(pos); // integer steps of grid cells (0,0), (0,1)..
	vec2 gPos = fract(pos) - 0.5; // internal cell coords. centered. [-0.5, 0.5]
	float hash = hash21(id);
	
	// noise
	float noise = snoise(vec3(
		id * NOISE_SPATIAL_FREQ + u_time*TIME_FACTOR*.2,
		u_time * TIME_FACTOR)) 
		* 0.5 + 0.5; // [0, 1]

	// decide whether or not to draw a circle
	float ink = 0.0;
	float mask;
	if (INVERT) {
		mask = smoothstep(MASK_HIGH, MASK_LOW, noise);
	} else {
		mask = smoothstep(MASK_LOW, MASK_HIGH, noise);
	}
	ink = ring(hash, gPos, RING_THICKNESS, mask) * mask;

	vec3 finalCol = vec3(ink);
	if (!GREYSCALE) {
		float colMask;

		if (INVERT) {
			colMask = smoothstep(MASK_HIGH+COL_SPREAD, MASK_LOW, noise);
		} else {
			colMask = smoothstep(MASK_LOW, MASK_HIGH+COL_SPREAD, noise);
		}

		//float foo = pos.x/GRID * sin(id.x * 100.0 + u_time)+0.2;
		float t = abs(fract(u_time * 0.1) * 2.0 - 1.0);

		vec3 ringCol = vec3(0.2, 0.4, 1.0*colMask*t + 0.3);
		finalCol = ringCol * ink;
	}
	
	gl_FragColor = vec4(finalCol, 1.0);
}

/* implementations */
/* creates a random hash for any cell coords */
float hash21(vec2 pos) {
	pos = fract(pos*vec2(SCRAMBLE_1, SCRAMBLE_2));
	// tie together to create big changes from small shifts
	pos += dot(pos, pos+SCRAMBLE_3);
	return fract(pos.x*pos.y);
}

float ring(float hash, vec2 gPos, float thickness, float mask) {
	float radius = mix(0.2, 0.5, hash);
	radius *= sin(hash * (u_time + SCRAMBLE_3)) * 0.5 + 0.5;
	float distance = length(gPos);
	
	float d;
	if (hash > 0.5) {
		d = distance - radius; // perfect ring has 0
	} else {
		d = abs(distance - radius); // perfect ring has 0
	}
	
	// tolerance (thickness allowance)
	return smoothstep(thickness, thickness-0.01, d);
}


