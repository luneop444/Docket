/**
 * Liquid glass on the graphics chip, so it bends the page live on every frame, scrolling
 * and sliding included, in every browser. It is Aave's glass ("Building glass for the
 * web") as a shader, as Aave itself runs it in Safari where SVG filters can't: for each
 * pixel, red and green in a lens map say where the page is read from (128 is still), each
 * colour reading a little further than the next (the colour split), and blue shades the rim.
 *
 * The page is a picture of the screen (taken once, see TabBar.web.tsx) uploaded as a
 * texture; each frame only says where the page, the bar and the pill are now.
 */

const VERT = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform sampler2D page;   // the frosted picture of the screen
uniform sampler2D barMap; // lens map over the bar
uniform sampler2D lensMap;// lens map over the pill
uniform vec2 pageOrigin;  // where the picture's top-left is now, viewport px
uniform vec2 pageSize;    // the picture's size, css px
uniform vec2 barOrigin;   // the bar's top-left, viewport px
uniform vec2 barSize;
uniform vec2 pillOrigin;  // the pill's top-left, viewport px
uniform vec2 pillSize;
uniform vec2 outOrigin;   // this canvas's top-left, viewport px
uniform vec2 outSize;     // this canvas, css px
uniform float scale;      // device px per css px
uniform vec2 barK;        // bar bend, px across and down
uniform vec2 lensK;       // pill bend, px across and down
uniform vec3 chroma;      // how far red, green and blue read (blue = 1)
uniform float spec;       // rim shading strength
uniform vec4 barTint;     // colour and strength of the bar's tint
uniform vec4 pillTint;    // colour and strength of the pill's tint
uniform float isPill;     // 0 draws the bar, 1 draws the pill

vec3 readPage(vec2 at) {
  // Past the picture (the screen's edge, or the end of a piece) the nearest edge carries on.
  vec2 uv = clamp((at - pageOrigin) / pageSize, vec2(0.0), vec2(1.0));
  return texture2D(page, uv).rgb;
}

// One colour channel through the bar's glass at a viewport point.
float throughBar(vec2 at, int ch, float k) {
  vec2 local = (at - barOrigin) / barSize;
  vec2 d = vec2(0.0);
  if (local.x >= 0.0 && local.y >= 0.0 && local.x <= 1.0 && local.y <= 1.0) {
    vec4 m = texture2D(barMap, local);
    d = (m.rg - 0.5) * barK * k;
  }
  vec3 c = readPage(at + d);
  return ch == 0 ? c.r : (ch == 1 ? c.g : c.b);
}

float barShade(vec2 at) {
  vec2 local = (at - barOrigin) / barSize;
  if (local.x < 0.0 || local.y < 0.0 || local.x > 1.0 || local.y > 1.0) return 1.0;
  return max(0.0, 1.0 + spec * 128.0 / 255.0 - spec * texture2D(barMap, local).b);
}

void main() {
  vec2 css = vec2(gl_FragCoord.x, outSize.y * scale - gl_FragCoord.y) / scale;
  vec2 at = outOrigin + css;
  vec3 col;
  if (isPill < 0.5) {
    col = vec3(throughBar(at, 0, chroma.r), throughBar(at, 1, chroma.g), throughBar(at, 2, chroma.b));
    col *= barShade(at);
    col = mix(col, barTint.rgb, barTint.a);
  } else {
    // Glass on glass: the pill bends what the bar shows, so a point goes through both lenses.
    vec4 m = texture2D(lensMap, (at - pillOrigin) / pillSize);
    vec2 d = (m.rg - 0.5) * lensK;
    vec3 c;
    c.r = throughBar(at + d * chroma.r, 0, chroma.r);
    c.g = throughBar(at + d * chroma.g, 1, chroma.g);
    c.b = throughBar(at + d * chroma.b, 2, chroma.b);
    c *= barShade(at + d);
    c = mix(c, barTint.rgb, barTint.a);
    c *= max(0.0, 1.0 + spec * 128.0 / 255.0 - spec * m.b);
    col = mix(c, pillTint.rgb, pillTint.a);
  }
  gl_FragColor = vec4(min(col, vec3(1.0)), 1.0);
}
`;

export interface Frame {
  pageOrigin: [number, number];
  pageSize: [number, number];
  barOrigin: [number, number];
  barSize: [number, number];
  pillOrigin: [number, number];
  pillSize: [number, number];
  outOrigin: [number, number];
  outSize: [number, number];
  scale: number;
  barK: [number, number];
  lensK: [number, number];
  chroma: [number, number, number];
  spec: number;
  barTint: [number, number, number, number];
  pillTint: [number, number, number, number];
  isPill: boolean;
}

export interface Glass {
  setPage(src: TexImageSource): void;
  setMaps(bar: ImageData, lens: ImageData): void;
  draw(f: Frame): void;
  ready(): boolean;
}

/** A WebGL glass on one canvas; null where WebGL isn't available. */
export function createGlass(canvas: HTMLCanvasElement): Glass | null {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: false, antialias: false, preserveDrawingBuffer: false });
  if (!gl) return null;
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'link');
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = (n: string) => gl.getUniformLocation(prog, n);

  const tex = (unit: number) => {
    const t = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return t;
  };
  const pageT = tex(0), barT = tex(1), lensT = tex(2);
  gl.uniform1i(u('page'), 0);
  gl.uniform1i(u('barMap'), 1);
  gl.uniform1i(u('lensMap'), 2);
  let hasPage = false, hasMaps = false;

  const upload = (unit: number, t: WebGLTexture, src: TexImageSource) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
  };

  return {
    setPage(src) {
      upload(0, pageT, src);
      hasPage = true;
    },
    setMaps(bar, lens) {
      upload(1, barT, bar);
      upload(2, lensT, lens);
      hasMaps = true;
    },
    ready: () => hasPage && hasMaps,
    draw(f) {
      const w = Math.max(1, Math.round(f.outSize[0] * f.scale)), h = Math.max(1, Math.round(f.outSize[1] * f.scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      gl.uniform2f(u('pageOrigin'), ...f.pageOrigin);
      gl.uniform2f(u('pageSize'), ...f.pageSize);
      gl.uniform2f(u('barOrigin'), ...f.barOrigin);
      gl.uniform2f(u('barSize'), ...f.barSize);
      gl.uniform2f(u('pillOrigin'), ...f.pillOrigin);
      gl.uniform2f(u('pillSize'), ...f.pillSize);
      gl.uniform2f(u('outOrigin'), ...f.outOrigin);
      gl.uniform2f(u('outSize'), ...f.outSize);
      gl.uniform1f(u('scale'), f.scale);
      gl.uniform2f(u('barK'), ...f.barK);
      gl.uniform2f(u('lensK'), ...f.lensK);
      gl.uniform3f(u('chroma'), ...f.chroma);
      gl.uniform1f(u('spec'), f.spec);
      gl.uniform4f(u('barTint'), ...f.barTint);
      gl.uniform4f(u('pillTint'), ...f.pillTint);
      gl.uniform1f(u('isPill'), f.isPill ? 1 : 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
  };
}
