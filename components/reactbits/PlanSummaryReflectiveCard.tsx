'use client';

import React, { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import './PlanSummaryReflectiveCard.css';

export const CheckmarkBadgeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1.2 14.2l-3.5-3.5 1.41-1.41 2.09 2.08 5.3-5.3 1.41 1.41-6.71 6.72z" />
  </svg>
);

export const FingerPrintIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
    <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
    <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
    <path d="M2 12a10 10 0 0 1 18-6" />
    <path d="M2 16h.01" />
    <path d="M21.8 16c.2-2 .131-5.354 0-6" />
    <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
    <path d="M8.65 22c.21-.66.45-1.32.57-2" />
    <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
  </svg>
);

const THEMES = {
  dark: {
    '--rc-base': '#1d1c22',
    '--rc-shadow': '0 22px 44px -20px rgba(0, 0, 0, 0.8), 0 6px 16px -8px rgba(0, 0, 0, 0.5)',
    '--rc-ink': '#f4f4f5',
    '--rc-muted': 'rgba(244, 244, 245, 0.65)',
    '--rc-tile': 'linear-gradient(180deg, #3a3644 0%, #27242f 100%)',
    '--rc-tile-edge': 'rgba(255, 255, 255, 0.07)',
    '--rc-tile-highlight': 'rgba(255, 255, 255, 0.12)',
    '--rc-tile-shadow': '0 4px 10px -4px rgba(0, 0, 0, 0.7)',
    '--rc-rim': 'rgba(255, 255, 255, 0.07)',
    '--rc-rim-highlight': 'rgba(255, 255, 255, 0.1)'
  },
  light: {
    '--rc-base': 'rgba(30, 41, 59, 0.82)',
    '--rc-shadow': '0 12px 28px -8px rgba(0, 0, 0, 0.18), 0 4px 12px -4px rgba(0, 0, 0, 0.08)',
    '--rc-ink': '#ffffff',
    '--rc-muted': 'rgba(255, 255, 255, 0.75)',
    '--rc-tile': 'linear-gradient(180deg, rgba(71, 85, 105, 0.6) 0%, rgba(30, 41, 59, 0.8) 100%)',
    '--rc-tile-edge': 'rgba(255, 255, 255, 0.12)',
    '--rc-tile-highlight': 'rgba(255, 255, 255, 0.22)',
    '--rc-tile-shadow': '0 4px 10px -4px rgba(0, 0, 0, 0.2)',
    '--rc-rim': 'rgba(255, 255, 255, 0.14)',
    '--rc-rim-highlight': 'rgba(255, 255, 255, 0.25)'
  }
};

const VIEW_DISTANCE = 900;
const OVERSCAN = 1.2;
const INTRO_MS = 1400;
const FADE_SECONDS = 0.35;

const VERTEX = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const CAPTURE = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uVideo;
uniform sampler2D uCam;
uniform vec4 uVideoMap;
uniform vec4 uCamMap;
uniform vec2 uWeights;
uniform vec2 uLod;
float level(sampler2D source) {
  vec3 mean = pow(textureLod(source, vec2(0.5), 14.0).rgb, vec3(2.2));
  return pow(dot(mean, vec3(0.2126, 0.7152, 0.0722)), 1.0 / 2.2);
}
void main() {
  vec3 color = vec3(0.0);
  float mean = 0.0;
  if (uWeights.x > 0.0) {
    color += textureLod(uVideo, vUv * uVideoMap.xy + uVideoMap.zw, uLod.x).rgb * uWeights.x;
    mean += level(uVideo) * uWeights.x;
  }
  if (uWeights.y > 0.0) {
    color += textureLod(uCam, vUv * uCamMap.xy + uCamMap.zw, uLod.y).rgb * uWeights.y;
    mean += level(uCam) * uWeights.y;
  }
  fragColor = vec4(color, mean);
}`;

const BLUR = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTexture;
uniform vec2 uStep;
uniform float uSigma;
void main() {
  vec4 sum = texture(uTexture, vUv);
  if (uSigma < 0.35) {
    fragColor = sum;
    return;
  }
  float falloff = -0.5 / (uSigma * uSigma);
  int radius = int(min(ceil(uSigma * 2.8), 40.0));
  float total = 1.0;
  for (int i = 1; i <= 40; i++) {
    if (i > radius) break;
    float offset = float(i);
    float weight = exp(offset * offset * falloff);
    sum += (texture(uTexture, vUv + uStep * offset) + texture(uTexture, vUv - uStep * offset)) * weight;
    total += 2.0 * weight;
  }
  fragColor = sum / total;
}`;

const PLATE = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uEnv;
uniform vec2 uEnvSize;
uniform vec2 uSize;
uniform float uRadius;
uniform float uScale;
uniform mat3 uRotate;
uniform float uCapture;
uniform float uBlur;
uniform float uRough;
uniform float uMetal;
uniform vec3 uTint;
uniform float uGray;
uniform float uWarp;
uniform float uWarpScale;
uniform float uShine;
uniform float uBevel;
uniform float uGlare;
uniform vec2 uPointer;
uniform float uTheme;

const float VIEW = ${VIEW_DISTANCE.toFixed(1)};
const float OVERSCAN = ${OVERSCAN.toFixed(2)};
const float CONTENT = 46.0;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 hash2(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.103, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy) * 2.0 - 1.0;
}

vec3 gradientNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
  vec2 ga = hash2(i);
  vec2 gb = hash2(i + vec2(1.0, 0.0));
  vec2 gc = hash2(i + vec2(0.0, 1.0));
  vec2 gd = hash2(i + vec2(1.0, 1.0));
  float va = dot(ga, f);
  float vb = dot(gb, f - vec2(1.0, 0.0));
  float vc = dot(gc, f - vec2(0.0, 1.0));
  float vd = dot(gd, f - vec2(1.0, 1.0));
  float k = va - vb - vc + vd;
  float value = va + u.x * (vb - va) + u.y * (vc - va) + u.x * u.y * k;
  vec2 slope = ga + u.x * (gb - ga) + u.y * (gc - ga) + u.x * u.y * (ga - gb - gc + gd) + du * (u.yx * k + vec2(vb, vc) - va);
  return vec3(value, slope);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float erf(float x) {
  float x2 = x * x;
  return sign(x) * sqrt(1.0 - exp(-x2 * (1.2732395 + 0.147 * x2) / (1.0 + 0.147 * x2)));
}

float band(float x, float halfWidth, float sigma) {
  float s = 1.4142136 * max(sigma, 0.0001);
  return 0.5 * (erf((x + halfWidth) / s) - erf((x - halfWidth) / s));
}

float strip(vec2 q, vec2 center, vec2 dir, float halfWidth, vec2 sigma) {
  vec2 normal = vec2(-dir.y, dir.x);
  return band(dot(q - center, normal), halfWidth, length(sigma * normal));
}

const vec2 SWEEP = vec2(0.5, 0.86);
const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

float softbox(vec2 q, vec2 sigma) {
  float key = strip(q, vec2(-0.1, -0.16), normalize(SWEEP), 0.022, sigma + 0.018);
  float top = band(q.y + 0.6, 0.12, sigma.y + 0.05);
  float side = band(q.x - 0.46, 0.05, sigma.x + 0.05);
  return key + top * 0.8 + side * 0.35;
}

float room(vec2 q, vec2 sigma) {
  float fall = smoothstep(-0.55, 0.5, q.y);
  float flag = strip(q, vec2(0.24, -0.02), normalize(SWEEP), 0.09, sigma + 0.08);
  return mix(0.85, 0.12, fall) * (1.0 - 0.6 * flag);
}

vec4 sampleEnv(vec2 uv) {
  vec2 st = uv * uEnvSize - 0.5;
  vec2 i = floor(st);
  vec2 f = st - i;
  vec2 f2 = f * f;
  vec2 f3 = f2 * f;
  vec2 w0 = (1.0 - 3.0 * f + 3.0 * f2 - f3) / 6.0;
  vec2 w1 = (4.0 - 6.0 * f2 + 3.0 * f3) / 6.0;
  vec2 w2 = (1.0 + 3.0 * f + 3.0 * f2 - 3.0 * f3) / 6.0;
  vec2 w3 = f3 / 6.0;
  vec2 g0 = w0 + w1;
  vec2 g1 = w2 + w3;
  vec2 c0 = (i + 0.5 + w1 / g0 - 1.0) / uEnvSize;
  vec2 c1 = (i + 0.5 + w3 / g1 + 1.0) / uEnvSize;
  vec4 a = texture(uEnv, c0) * g0.x + texture(uEnv, vec2(c1.x, c0.y)) * g1.x;
  vec4 b = texture(uEnv, vec2(c0.x, c1.y)) * g0.x + texture(uEnv, c1) * g1.x;
  return a * g0.y + b * g1.y;
}

vec3 toLinear(vec3 c) {
  return pow(max(c, 0.0), vec3(2.2));
}

void main() {
  vec2 p = vec2(vUv.x - 0.5, 0.5 - vUv.y) * uSize;
  vec2 halfSize = uSize * 0.5;
  float r = min(uRadius, min(halfSize.x, halfSize.y));
  vec2 corner = abs(p) - halfSize + r;
  vec2 side = vec2(p.x >= 0.0 ? 1.0 : -1.0, p.y >= 0.0 ? 1.0 : -1.0);
  float d;
  vec2 outward;
  if (corner.x > 0.0 && corner.y > 0.0) {
    d = length(corner) - r;
    outward = normalize(corner) * side;
  } else if (corner.x > corner.y) {
    d = corner.x - r;
    outward = vec2(side.x, 0.0);
  } else {
    d = corner.y - r;
    outward = vec2(side.y, 0.0);
  }
  float coverage = clamp(0.5 - d * uScale, 0.0, 1.0);

  float chamferWidth = min(uBevel, max(r, 1.0));
  float chamfer = chamferWidth > 0.01 ? 1.0 - smoothstep(0.0, chamferWidth, -d) : 0.0;
  vec2 slope = outward * chamfer;

  vec2 wp = p / (220.0 * uWarpScale);
  vec3 w1 = gradientNoise(wp);
  vec3 w2 = gradientNoise(wp * 2.07 + 13.7);
  vec2 ripple = (w1.yz + w2.yz * 0.5) * uWarp;
  slope += ripple * 0.008;

  float grain = valueNoise(vec2(p.x * 0.008, p.y * 0.55)) * 0.45 + valueNoise(vec2(p.x * 0.019 + 3.7, p.y * 0.23)) * 0.35 + valueNoise(vec2(p.x * 0.004 + 9.2, p.y * 0.09)) * 0.2;
  float brush = uRough * uRough;
  slope.y += (grain - 0.5) * brush * 0.004;

  vec3 normal = uRotate * normalize(vec3(slope, 1.0));
  vec3 position = uRotate * vec3(p, 0.0);
  vec3 view = normalize(position - vec3(0.0, 0.0, VIEW));
  vec3 bounce = reflect(view, normal);
  vec2 q = bounce.xy / max(bounce.z, 0.2);

  vec2 footprint = fwidth(q);
  vec2 sigma = sqrt(vec2(uBlur / VIEW) * vec2(uBlur / VIEW) + footprint * footprint * 0.5);
  sigma += vec2(0.004, 0.05) * uRough;

  vec2 shift = clamp((q - p / VIEW) * CONTENT + ripple * 10.0, -uSize, uSize);
  vec2 cp = (p + shift) / (uSize * OVERSCAN);
  vec4 reflected = uCapture > 0.0 ? sampleEnv(vec2(0.5 + cp.x, 0.5 - cp.y)) : vec4(0.0, 0.0, 0.0, 1.0);
  vec3 captured = toLinear(reflected.rgb) * (0.5 / max(pow(reflected.a, 2.2), 0.02));
  captured = mix(vec3(dot(captured, LUMA)), captured, 1.0 - uGray);
  captured = pow(max(captured * 1.2, 0.0), vec3(mix(2.0, 1.5, uTheme)));

  vec3 scene = mix(vec3(room(q, sigma)), captured, uCapture * (1.0 - chamfer) * mix(1.0, 0.6, uTheme));
  scene *= 1.0 + (grain - 0.5) * brush * 0.3;

  vec2 toPointer = (uPointer - p) / (120.0 + uBlur * 4.0);
  vec2 spread = toPointer * vec2(1.0, 1.0 / (1.0 + 2.5 * uRough));
  float reach = dot(spread, spread);
  float glint = max(1.0 + 3.0 * dot(slope, toPointer), 0.0);
  float glare = (exp(-reach * 1.6) + exp(-reach * 0.35) * 0.15) * glint * uGlare * (1.0 + 0.8 * (grain - 0.5) * brush);
  float highlight = (softbox(q, sigma) * uShine + glare) * mix(0.4, 1.0, uMetal);

  vec3 dark = vec3(0.005, 0.005, 0.006) + uTint * (scene * 0.05 * uMetal + highlight * 0.36);
  vec3 basePlate = vec3(0.92, 0.93, 0.95) * (1.0 - 0.22 * uMetal * (1.0 - clamp(scene, 0.0, 1.0)));
  vec3 light = mix(basePlate, basePlate * uTint, 0.12) + uTint * highlight * 0.35;
  vec3 color = mix(dark, light, uTheme);
  color = min(color, 0.7) + 0.3 * (1.0 - exp(-max(color - 0.7, 0.0) / 0.3));
  color = pow(clamp(color, 0.0, 1.0), vec3(1.0 / 2.2));

  color += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  color = clamp(color, 0.0, 1.0);
  fragColor = vec4(color * coverage, coverage);
}`;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const toPx = (value: number | string | undefined): string => {
  if (value === undefined) return '100%';
  if (typeof value === 'number') return `${value}px`;
  return String(value);
};

const parseColor = (value: string | undefined): number[] => {
  const text = String(value || '').trim();
  const hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text);
  if (hex) {
    const full = hex[1].length === 3 ? hex[1].replace(/./g, (digit) => digit + digit) : hex[1];
    return [0, 2, 4].map((index) => parseInt(full.slice(index, index + 2), 16) / 255);
  }
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(text);
  if (rgb) return [rgb[1], rgb[2], rgb[3]].map((channel) => clamp(parseFloat(channel) / 255, 0, 1));
  return [1, 1, 1];
};

const compile = (gl: WebGL2RenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
};

const link = (gl: WebGL2RenderingContext, frag: string) => {
  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fs = compile(gl, gl.FRAGMENT_SHADER, frag);
  if (!vs || !fs) return null;
  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  const uniforms: Record<string, WebGLUniformLocation | null> = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i);
    if (info) uniforms[info.name] = gl.getUniformLocation(program, info.name);
  }
  return { program, uniforms };
};

const makeMipmapLod = (envWidth: number, envHeight: number, renderWidth: number, renderHeight: number): number => {
  if (!envWidth || !envHeight) return 0;
  const visible = Math.min(renderWidth, renderHeight) * OVERSCAN;
  return Math.max(0, Math.log2(Math.max(1, visible / Math.max(1, envWidth))) - 0.5);
};

interface Target {
  texture: WebGLTexture;
  framebuffer: WebGLFramebuffer;
  width: number;
  height: number;
}

interface SourceInfo {
  element: HTMLVideoElement;
  src: string;
  time: number;
  ready: boolean;
  failed: boolean;
  width: number;
  height: number;
  mix: number;
}

const createRenderer = (canvas: HTMLCanvasElement) => {
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'default'
  });
  if (!gl) return null;
  const captureProgram = link(gl, CAPTURE);
  const blurProgram = link(gl, BLUR);
  const plateProgram = link(gl, PLATE);
  if (!captureProgram || !blurProgram || !plateProgram) {
    for (const item of [captureProgram, blurProgram, plateProgram]) {
      if (item) gl.deleteProgram(item.program);
    }
    return null;
  }

  const createTexture = (mipmaps: boolean, wrap: number) => {
    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mipmaps ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    return texture;
  };

  const createTarget = (): Target => {
    const texture = createTexture(false, gl.MIRRORED_REPEAT);
    const framebuffer = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { texture, framebuffer, width: 1, height: 1 };
  };

  const allocate = (target: Target, width: number, height: number) => {
    if (target.width === width && target.height === height) return;
    target.width = width;
    target.height = height;
    gl.bindTexture(gl.TEXTURE_2D, target.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  };

  const vao = gl.createVertexArray()!;
  gl.bindVertexArray(vao);
  const buffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.disable(gl.BLEND);
  gl.disable(gl.DEPTH_TEST);

  const textures = { video: createTexture(true, gl.CLAMP_TO_EDGE), cam: createTexture(true, gl.CLAMP_TO_EDGE) };
  const capture = createTarget();
  const blur = createTarget();

  const updateSourceTexture = (source: SourceInfo, texture: WebGLTexture) => {
    const element = source.element;
    const ready = element.readyState >= 2 && element.videoWidth > 0 && element.videoHeight > 0;
    source.ready = ready;
    if (!ready) return;
    source.width = element.videoWidth;
    source.height = element.videoHeight;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, element);
    gl.generateMipmap(gl.TEXTURE_2D);
  };

  return {
    gl,
    vao,
    programs: { capture: captureProgram, blur: blurProgram, plate: plateProgram },
    textures,
    targets: { capture, blur },
    updateSourceTexture,
    allocate,
    destroy() {
      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vao);
      gl.deleteTexture(textures.video);
      gl.deleteTexture(textures.cam);
      gl.deleteTexture(capture.texture);
      gl.deleteFramebuffer(capture.framebuffer);
      gl.deleteTexture(blur.texture);
      gl.deleteFramebuffer(blur.framebuffer);
      gl.deleteProgram(captureProgram.program);
      gl.deleteProgram(blurProgram.program);
      gl.deleteProgram(plateProgram.program);
    }
  };
};

export interface PlanSummaryReflectiveCardProps {
  children?: React.ReactNode;
  theme?: 'dark' | 'light';
  videoSrc?: string;
  webcam?: boolean;
  onWebcamError?: (error: unknown) => void;
  tint?: string;
  metalness?: number;
  roughness?: number;
  blurStrength?: number;
  grayscale?: number;
  warp?: number;
  warpScale?: number;
  shine?: number;
  bevel?: number;
  glare?: number;
  enableTilt?: boolean;
  tiltStrength?: number;
  intro?: boolean;
  width?: number | string;
  height?: number | string;
  radius?: number;
  className?: string;
  bodyClassName?: string;
  style?: React.CSSProperties;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export const PlanSummaryReflectiveCard: React.FC<PlanSummaryReflectiveCardProps> = ({
  children,
  theme = 'dark',
  videoSrc,
  webcam = false,
  onWebcamError,
  tint = '#ffffff',
  metalness = 1,
  roughness = 0.3,
  blurStrength = 6,
  grayscale = 1,
  warp = 0.6,
  warpScale = 1,
  shine = 1,
  bevel = 3,
  glare = 0.5,
  enableTilt = true,
  tiltStrength = 12,
  intro = true,
  width = '100%',
  height = '100%',
  radius = 24,
  className = '',
  bodyClassName = '',
  style,
  onClick
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const camRef = useRef<HTMLVideoElement>(null);
  const wakeRef = useRef<(() => void) | null>(null);
  const errorRef = useRef(onWebcamError);

  const palette = theme === 'light' ? 'light' : 'dark';
  const settings = {
    tint: parseColor(tint).map((channel) => Math.pow(channel, 2.2)),
    metalness: clamp(metalness, 0, 1),
    roughness: clamp(roughness, 0, 1),
    blurStrength: clamp(blurStrength, 0, 40),
    grayscale: clamp(grayscale, 0, 1),
    warp: clamp(warp, 0, 2),
    warpScale: clamp(warpScale, 0.2, 4),
    shine: clamp(shine, 0, 3),
    bevel: clamp(bevel, 0, 16),
    glare: clamp(glare, 0, 1),
    enableTilt,
    tiltStrength: clamp(tiltStrength, 0, 30),
    radius: Math.max(0, radius),
    theme: palette === 'light' ? 1 : 0,
    intro
  };
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  errorRef.current = onWebcamError;

  useEffect(() => {
    wakeRef.current?.();
  });

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !settingsRef.current.intro) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    root.style.setProperty('--rc-presence', '0');
    root.style.setProperty('--rc-lift', '14px');
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const body = bodyRef.current;
    const canvas = canvasRef.current;
    const videoElement = videoRef.current;
    const camElement = camRef.current;
    if (!root || !body || !canvas || !videoElement || !camElement) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const renderer = createRenderer(canvas);
    const x = { p: 0, v: 0, target: 0 };
    const y = { p: 0, v: 0, target: 0 };
    const light = { p: 0, target: 0 };
    const pointer = { x: 0, y: 0 };
    const size = { width: body.offsetWidth, height: body.offsetHeight, scale: 1 };
    const makeSource = (element: HTMLVideoElement): SourceInfo => ({
      element,
      src: '',
      time: -1,
      ready: false,
      failed: false,
      width: 0,
      height: 0,
      mix: 0
    });
    const videoSource = makeSource(videoElement);
    const camSource = makeSource(camElement);

    let animationFrame = 0;
    let lastTime = 0;
    let running = true;
    let introRunning = settingsRef.current.intro && !reduced;
    const introStart = performance.now();

    const updatePresence = (now: number) => {
      if (!introRunning) return;
      const elapsed = now - introStart;
      const progress = clamp(elapsed / INTRO_MS, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      root.style.setProperty('--rc-presence', eased.toFixed(4));
      root.style.setProperty('--rc-lift', `${((1 - eased) * 14).toFixed(2)}px`);
      if (progress >= 1) introRunning = false;
    };

    const updatePhysics = (dt: number) => {
      const stiffness = 130;
      const damping = 17;
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / steps;
      for (let i = 0; i < steps; i++) {
        for (const axis of [x, y]) {
          axis.v += (stiffness * (axis.target - axis.p) - damping * axis.v) * h;
          axis.p += axis.v * h;
        }
      }
      const tau = light.target > light.p ? 0.16 : 0.4;
      light.p += (light.target - light.p) * (1 - Math.exp(-dt / tau));
    };

    const isMoving = () =>
      Math.abs(x.target - x.p) > 0.0005 ||
      Math.abs(y.target - y.p) > 0.0005 ||
      Math.abs(x.v) > 0.0005 ||
      Math.abs(y.v) > 0.0005 ||
      Math.abs(light.target - light.p) > 0.002 ||
      introRunning;

    const render = (now: number) => {
      animationFrame = 0;
      if (!running || !renderer) return;

      const dt = Math.min(0.05, (now - lastTime) / 1000 || 0.016);
      lastTime = now;
      updatePresence(now);
      updatePhysics(dt);

      const moving = isMoving();
      if (!moving) {
        x.p = x.target;
        y.p = y.target;
        x.v = 0;
        y.v = 0;
        light.p = light.target;
      }

      const currentSettings = settingsRef.current;
      const rotAngle = currentSettings.enableTilt && !reduced ? currentSettings.tiltStrength : 0;
      root.style.setProperty('--rc-rotate-x', `${(y.p * rotAngle).toFixed(3)}deg`);
      root.style.setProperty('--rc-rotate-y', `${(-x.p * rotAngle).toFixed(3)}deg`);

      renderer.updateSourceTexture(videoSource, renderer.textures.video);
      renderer.updateSourceTexture(camSource, renderer.textures.cam);

      const gl = renderer.gl;
      const widthDpr = Math.max(1, Math.round(size.width * size.scale));
      const heightDpr = Math.max(1, Math.round(size.height * size.scale));

      if (canvas.width !== widthDpr || canvas.height !== heightDpr) {
        canvas.width = widthDpr;
        canvas.height = heightDpr;
      }

      const captureWidth = Math.max(1, Math.round(widthDpr * OVERSCAN));
      const captureHeight = Math.max(1, Math.round(heightDpr * OVERSCAN));
      renderer.allocate(renderer.targets.capture, captureWidth, captureHeight);

      gl.bindFramebuffer(gl.FRAMEBUFFER, renderer.targets.capture.framebuffer);
      gl.viewport(0, 0, captureWidth, captureHeight);
      gl.useProgram(renderer.programs.capture.program);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, renderer.textures.video);
      gl.uniform1i(renderer.programs.capture.uniforms.uVideo, 0);

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, renderer.textures.cam);
      gl.uniform1i(renderer.programs.capture.uniforms.uCam, 1);

      gl.uniform4f(renderer.programs.capture.uniforms.uVideoMap, 1, -1, 0, 1);
      gl.uniform4f(renderer.programs.capture.uniforms.uCamMap, 1, -1, 0, 1);
      gl.uniform2f(renderer.programs.capture.uniforms.uWeights, 1, 0);
      gl.uniform2f(
        renderer.programs.capture.uniforms.uLod,
        makeMipmapLod(videoSource.width, videoSource.height, size.width, size.height),
        0
      );

      gl.bindVertexArray(renderer.vao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      gl.bindTexture(gl.TEXTURE_2D, renderer.targets.capture.texture);
      gl.generateMipmap(gl.TEXTURE_2D);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, widthDpr, heightDpr);
      gl.useProgram(renderer.programs.plate.program);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, renderer.targets.capture.texture);
      gl.uniform1i(renderer.programs.plate.uniforms.uEnv, 0);

      gl.uniform2f(renderer.programs.plate.uniforms.uEnvSize, captureWidth, captureHeight);
      gl.uniform2f(renderer.programs.plate.uniforms.uSize, size.width, size.height);
      gl.uniform1f(renderer.programs.plate.uniforms.uRadius, currentSettings.radius);
      gl.uniform1f(renderer.programs.plate.uniforms.uScale, size.scale);

      const degX = (y.p * rotAngle * Math.PI) / 180;
      const degY = ((-x.p * rotAngle) * Math.PI) / 180;
      const cx = Math.cos(degX);
      const sx = Math.sin(degX);
      const cy = Math.cos(degY);
      const sy = Math.sin(degY);

      gl.uniformMatrix3fv(renderer.programs.plate.uniforms.uRotate, false, [
        cy, sx * sy, -cx * sy,
        0, cx, sx,
        sy, -sx * cy, cx * cy
      ]);

      gl.uniform1f(renderer.programs.plate.uniforms.uCapture, 1);
      gl.uniform1f(renderer.programs.plate.uniforms.uBlur, currentSettings.blurStrength);
      gl.uniform1f(renderer.programs.plate.uniforms.uRough, currentSettings.roughness);
      gl.uniform1f(renderer.programs.plate.uniforms.uMetal, currentSettings.metalness);
      gl.uniform3fv(renderer.programs.plate.uniforms.uTint, currentSettings.tint);
      gl.uniform1f(renderer.programs.plate.uniforms.uGray, currentSettings.grayscale);
      gl.uniform1f(renderer.programs.plate.uniforms.uWarp, currentSettings.warp);
      gl.uniform1f(renderer.programs.plate.uniforms.uWarpScale, currentSettings.warpScale);
      gl.uniform1f(renderer.programs.plate.uniforms.uShine, currentSettings.shine);
      gl.uniform1f(renderer.programs.plate.uniforms.uBevel, currentSettings.bevel);
      gl.uniform1f(renderer.programs.plate.uniforms.uGlare, currentSettings.glare * light.p);
      gl.uniform2f(renderer.programs.plate.uniforms.uPointer, pointer.x, pointer.y);
      gl.uniform1f(renderer.programs.plate.uniforms.uTheme, currentSettings.theme);

      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (moving || videoSource.ready || (videoSrc && !videoSource.failed)) {
        animationFrame = requestAnimationFrame(render);
      }
    };

    const wake = () => {
      if (animationFrame) return;
      lastTime = performance.now();
      animationFrame = requestAnimationFrame(render);
    };
    wakeRef.current = wake;

    const updateSize = () => {
      size.width = body.offsetWidth;
      size.height = body.offsetHeight;
      size.scale = Math.min(window.devicePixelRatio || 1, 2);
      wake();
    };
    updateSize();

    const ro = new ResizeObserver(updateSize);
    ro.observe(body);

    const onEnter = () => {
      light.target = 1;
      wake();
    };
    const onMove = (e: PointerEvent) => {
      const rect = body.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      pointer.x = px - rect.width * 0.5;
      pointer.y = rect.height * 0.5 - py;
      x.target = clamp((px / rect.width) * 2 - 1, -1, 1);
      y.target = clamp((py / rect.height) * 2 - 1, -1, 1);
      light.target = 1;
      wake();
    };
    const onLeave = () => {
      x.target = 0;
      y.target = 0;
      light.target = 0;
      wake();
    };

    root.addEventListener('pointerenter', onEnter);
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerleave', onLeave);

    wake();

    return () => {
      running = false;
      cancelAnimationFrame(animationFrame);
      wakeRef.current = null;
      ro.disconnect();
      root.removeEventListener('pointerenter', onEnter);
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerleave', onLeave);
      renderer?.destroy();
    };
  }, [videoSrc]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSrc) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.src = videoSrc;
    video.load();

    const onVideoReady = () => {
      wakeRef.current?.();
    };

    video.addEventListener('loadedmetadata', onVideoReady);
    video.addEventListener('loadeddata', onVideoReady);
    video.addEventListener('canplay', onVideoReady);
    video.addEventListener('playing', onVideoReady);
    video.addEventListener('timeupdate', onVideoReady);

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            wakeRef.current?.();
          })
          .catch(() => {
            const onFirstInteraction = () => {
              video.play().then(() => wakeRef.current?.()).catch(() => {});
              window.removeEventListener('pointerdown', onFirstInteraction);
              window.removeEventListener('touchstart', onFirstInteraction);
              window.removeEventListener('scroll', onFirstInteraction);
            };
            window.addEventListener('pointerdown', onFirstInteraction, { once: true, passive: true });
            window.addEventListener('touchstart', onFirstInteraction, { once: true, passive: true });
            window.addEventListener('scroll', onFirstInteraction, { once: true, passive: true });
          });
      }
    }
    wakeRef.current?.();

    return () => {
      video.removeEventListener('loadedmetadata', onVideoReady);
      video.removeEventListener('loadeddata', onVideoReady);
      video.removeEventListener('canplay', onVideoReady);
      video.removeEventListener('playing', onVideoReady);
      video.removeEventListener('timeupdate', onVideoReady);
      video.pause();
    };
  }, [videoSrc]);

  const corner = Math.max(0, radius);
  const cardStyle = {
    ...THEMES[palette],
    '--rc-width': toPx(width),
    '--rc-height': toPx(height),
    '--rc-radius': `${corner}px`,
    '--rc-pad': `${Math.round(clamp(corner * 0.8, 16, 22))}px`,
    '--rc-tile-radius': `${Math.round(clamp(corner * 0.5, 8, 14))}px`
  } as unknown as React.CSSProperties;

  return (
    <div
      ref={rootRef}
      onClick={onClick}
      className={`plan-reflective-card ${className}`.trim()}
      style={{ ...cardStyle, ...style }}
    >
      <div ref={bodyRef} className={`plan-reflective-card__body ${bodyClassName}`.trim()}>
        <canvas ref={canvasRef} className="plan-reflective-card__canvas" aria-hidden="true" />
        <div className="plan-reflective-card__content">
          {children}
        </div>
        <span className="plan-reflective-card__rim" />
      </div>
      <video
        ref={videoRef}
        className="plan-reflective-card__media"
        autoPlay
        muted
        loop
        playsInline
        crossOrigin={videoSrc?.startsWith('http') ? 'anonymous' : undefined}
        aria-hidden="true"
      />
      <video ref={camRef} className="plan-reflective-card__media" muted playsInline aria-hidden="true" />
    </div>
  );
};

export default memo(PlanSummaryReflectiveCard);
