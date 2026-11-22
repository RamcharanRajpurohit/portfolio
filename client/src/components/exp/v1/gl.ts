// A tiny WebGL2 renderer for v1 (no dependencies): procedural meshes, one "print" shader.
// The shader draws like a vintage print, not CGI: three toon bands, a screen-space 45° halftone
// for shadows, paper grain, and an inverted-hull ink outline (each mesh is drawn a second time,
// pushed out along its normals with front faces culled; constant width in pixels).
// Proof -> print: fragments below uRoll (a pixel row) are one-colour ink on cream stock (the proof);
// fragments above it are printed in colour, the colour halftone shifted by uMis (misregistration).

export type V3 = [number, number, number];
export type M4 = Float32Array;

// ---- matrices (column-major) ----
export const m4 = (): M4 => { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; };
export function mul(a: M4, b: M4): M4 {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
        let s = 0;
        for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
        o[c * 4 + r] = s;
    }
    return o;
}
export const chain = (...ms: M4[]) => ms.reduce((a, b) => mul(a, b), m4());
export function T(x: number, y: number, z: number) { const m = m4(); m[12] = x; m[13] = y; m[14] = z; return m; }
export function S(x: number, y = x, z = x) { const m = m4(); m[0] = x; m[5] = y; m[10] = z; return m; }
export function RX(a: number) { const m = m4(), c = Math.cos(a), s = Math.sin(a); m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m; }
export function RY(a: number) { const m = m4(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[2] = -s; m[8] = s; m[10] = c; return m; }
export function RZ(a: number) { const m = m4(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[1] = s; m[4] = -s; m[5] = c; return m; }
export function perspective(fovy: number, aspect: number, near: number, far: number) {
    const f = 1 / Math.tan(fovy / 2), m = new Float32Array(16);
    m[0] = f / aspect; m[5] = f; m[10] = (far + near) / (near - far); m[11] = -1; m[14] = (2 * far * near) / (near - far);
    return m;
}
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export function lookAt(eye: V3, at: V3, up: V3 = [0, 1, 0]) {
    const z = norm(sub(eye, at)), x = norm(cross(up, z)), y = cross(z, x);
    const m = m4();
    m[0] = x[0]; m[4] = x[1]; m[8] = x[2];
    m[1] = y[0]; m[5] = y[1]; m[9] = y[2];
    m[2] = z[0]; m[6] = z[1]; m[10] = z[2];
    m[12] = -(x[0] * eye[0] + x[1] * eye[1] + x[2] * eye[2]);
    m[13] = -(y[0] * eye[0] + y[1] * eye[1] + y[2] * eye[2]);
    m[14] = -(z[0] * eye[0] + z[1] * eye[1] + z[2] * eye[2]);
    return m;
}
export function apply(m: M4, p: V3): [number, number, number, number] {
    const [x, y, z] = p;
    return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14], m[3] * x + m[7] * y + m[11] * z + m[15]];
}

// ---- geometry ----
export type Geo = { p: number[]; n: number[]; uv: number[]; i: number[] };
const empty = (): Geo => ({ p: [], n: [], uv: [], i: [] });

// a parametric surface f(u, v), u,v in [0,1]; normals from the partial derivatives
export function grid(f: (u: number, v: number) => V3, nu: number, nv: number, flip = false): Geo {
    const g = empty(), e = 1e-3;
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
        const u = i / nu, v = j / nv, p = f(u, v);
        const du = sub(f(Math.min(1, u + e), v), f(Math.max(0, u - e), v)), dv = sub(f(u, Math.min(1, v + e)), f(u, Math.max(0, v - e)));
        let n = norm(cross(du, dv));
        if (flip) n = [-n[0], -n[1], -n[2]];
        g.p.push(...p); g.n.push(...n); g.uv.push(u, v);
    }
    // degenerate points (a cap centre, a cone tip, a pole) borrow the normal of their neighbour along v
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
        const k = (j * (nu + 1) + i) * 3;
        if (Math.hypot(g.n[k], g.n[k + 1], g.n[k + 2]) > 0.5) continue;
        const q = ((j === 0 ? 1 : j - 1) * (nu + 1) + i) * 3;
        g.n[k] = g.n[q]; g.n[k + 1] = g.n[q + 1]; g.n[k + 2] = g.n[q + 2];
    }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
        const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
        if (flip) g.i.push(a, c, b, b, c, d); else g.i.push(a, b, c, b, d, c);
    }
    return g;
}

// rounded box: each face is a grid; points are pulled onto the rounded shell
export function rbox(w: number, h: number, d: number, r: number, seg = 3): Geo {
    const half: V3 = [w / 2, h / 2, d / 2], out = empty();
    const samples = (hh: number) => {
        const s: number[] = [];
        for (let k = 0; k <= seg; k++) s.push(-hh + r * (1 - Math.cos((k / seg) * Math.PI / 2)) * 1);
        for (let k = seg; k >= 0; k--) s.push(hh - r * (1 - Math.cos((k / seg) * Math.PI / 2)));
        return s.filter((v, i, a) => i === 0 || Math.abs(v - a[i - 1]) > 1e-6);
    };
    const faces: [number, number, number, number][] = [[0, 1, 2, 1], [0, 1, 2, -1], [1, 2, 0, 1], [1, 2, 0, -1], [2, 0, 1, 1], [2, 0, 1, -1]];
    for (const [ax, a1, a2, sg] of faces) {
        const s1 = samples(half[a1]), s2 = samples(half[a2]), base = out.p.length / 3;
        for (let j = 0; j < s2.length; j++) for (let i = 0; i < s1.length; i++) {
            const q: V3 = [0, 0, 0];
            q[ax] = sg * half[ax]; q[a1] = s1[i]; q[a2] = s2[j];
            const inner = q.map((v, k) => Math.max(-half[k] + r, Math.min(half[k] - r, v))) as V3;
            const n = norm(sub(q, inner));
            out.p.push(inner[0] + n[0] * r, inner[1] + n[1] * r, inner[2] + n[2] * r);
            out.n.push(...n); out.uv.push(i / (s1.length - 1), j / (s2.length - 1));
        }
        for (let j = 0; j < s2.length - 1; j++) for (let i = 0; i < s1.length - 1; i++) {
            const a = base + j * s1.length + i, b = a + 1, c = a + s1.length, dd = c + 1;
            if (sg > 0) out.i.push(a, b, c, b, dd, c); else out.i.push(a, c, b, b, c, dd);
        }
    }
    return out;
}

export function cylinder(r: number, h: number, seg = 20, caps = true): Geo {
    const side = grid((u, v) => [r * Math.cos(u * Math.PI * 2), (v - 0.5) * h, -r * Math.sin(u * Math.PI * 2)], seg, 1);
    if (!caps) return side;
    const cap = (y: number, up: boolean) => grid((u, v) => { const rr = r * Math.max(0.002, v); return [rr * Math.cos(u * Math.PI * 2), y, -rr * Math.sin(u * Math.PI * 2) * (up ? -1 : 1)]; }, seg, 1, false);
    return merge([[side, m4()], [cap(h / 2, true), m4()], [cap(-h / 2, false), m4()]]);
}

// a tube along a polyline (parallel-transport frames)
export function tube(pts: V3[], r: number, rs = 8): Geo {
    const n = pts.length, tang: V3[] = pts.map((_, i) => norm(sub(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)])));
    let nrm = norm(cross(tang[0], Math.abs(tang[0][1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
    const frames: [V3, V3][] = [];
    for (let i = 0; i < n; i++) {
        const b = norm(cross(tang[i], nrm));
        nrm = norm(cross(b, tang[i]));
        frames.push([nrm, b]);
    }
    // explicit radial normals (a parametric grid would see zero length along v between samples)
    const g: Geo = { p: [], n: [], uv: [], i: [] };
    for (let j = 0; j < n; j++) for (let k = 0; k <= rs; k++) {
        const ang = (k / rs) * Math.PI * 2, [a, b] = frames[j], c = Math.cos(ang), sn = Math.sin(ang);
        const d: V3 = [c * a[0] + sn * b[0], c * a[1] + sn * b[1], c * a[2] + sn * b[2]];
        g.p.push(pts[j][0] + r * d[0], pts[j][1] + r * d[1], pts[j][2] + r * d[2]); g.n.push(...d); g.uv.push(k / rs, j / (n - 1));
    }
    for (let j = 0; j < n - 1; j++) for (let k = 0; k < rs; k++) {
        const a = j * (rs + 1) + k, b = a + 1, c = a + rs + 1, d = c + 1;
        g.i.push(a, b, c, b, d, c);
    }
    return g;
}

// bakes each part's matrix into its vertices (normals by the matrix's linear part); runs over every static
// vertex at build time, so it is written allocation-free
export function merge(list: [Geo, M4][]): Geo {
    const o = empty();
    for (const [g, m] of list) {
        const base = o.p.length / 3, id = m.every((v, i) => v === (i % 5 ? 0 : 1));
        for (let k = 0; k < g.p.length; k += 3) {
            const x = g.p[k], y = g.p[k + 1], z = g.p[k + 2], nx = g.n[k], ny = g.n[k + 1], nz = g.n[k + 2];
            if (id) { o.p.push(x, y, z); o.n.push(nx, ny, nz); continue; }
            o.p.push(m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]);
            const a = m[0] * nx + m[4] * ny + m[8] * nz, b = m[1] * nx + m[5] * ny + m[9] * nz, c = m[2] * nx + m[6] * ny + m[10] * nz, l = Math.hypot(a, b, c) || 1;
            o.n.push(a / l, b / l, c / l);
        }
        for (let k = 0; k < g.uv.length; k++) o.uv.push(g.uv[k]);
        for (let k = 0; k < g.i.length; k++) o.i.push(g.i[k] + base);
    }
    return o;
}

// ---- renderer ----
// Lighting aims for a real, physical look in print colours: a warm key light with soft shadow-mapped
// shadows (5x5 PCF), a sky/ground ambient, a soft highlight, contact darkening where things meet the
// board, a light paper grain, and a faint halftone left in the shadows as the print's signature.
// Proof -> print: below uRoll (a pixel row) surfaces are unpainted stock (a clay proof); above it they
// carry their print colour, with the colour halftone shifted by uMis (misregistration) until it snaps in.
const VS = `#version 300 es
in vec3 aP; in vec3 aN; in vec2 aUv;
uniform mat4 uM, uV, uP; uniform float uOut;
out vec3 vN; out vec2 vUv; out float vZ; out vec3 vW;
void main() {
  vec4 w = uM * vec4(aP, 1.0);
  vec3 n = normalize(mat3(uM) * aN);
  vec4 v = uV * w;
  if (uOut > 0.0) v.xyz += normalize(mat3(uV) * n) * uOut * max(0.05, -v.z);
  vN = n; vUv = aUv; vZ = -v.z; vW = w.xyz;
  gl_Position = uP * v;
}`;
const FS = `#version 300 es
precision highp float;
precision highp sampler2DShadow;
in vec3 vN; in vec2 vUv; in float vZ; in vec3 vW;
uniform vec3 uProof, uPrint, uInk, uLight, uDotC, uEye; uniform float uTone, uDot, uRoll, uAlpha, uGlow, uHatch, uFog, uHasShadow; uniform vec2 uMis;
uniform int uMode; uniform sampler2D uTex, uPaper; uniform sampler2DShadow uShadow; uniform mat4 uLVP;
out vec4 o;
float dots(vec2 px, float shade) {
  vec2 q = mat2(.7071, -.7071, .7071, .7071) * px / uDot;
  float d = length(fract(q) - .5);
  float r = sqrt(clamp(shade, 0.0, 1.0)) * .56;
  return 1.0 - smoothstep(r - .08, r + .08, d);
}
float shadowAt(vec3 n) {
  if (uHasShadow < .5) return 1.0;
  vec4 p = uLVP * vec4(vW + n * .012, 1.0);
  vec3 q = p.xyz / p.w * .5 + .5;
  if (q.x < 0.0 || q.x > 1.0 || q.y < 0.0 || q.y > 1.0 || q.z > 1.0) return 1.0;
  float s = 0.0;
  // 3x3 taps, each a hardware-filtered 2x2 compare: soft edges at a third of the cost of 5x5
  for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) s += texture(uShadow, vec3(q.xy + vec2(i, j) * (1.5 / 1024.0), q.z - .0018));
  return s / 9.0;
}
void main() {
  if (uMode == 1) { o = vec4(uInk, 1.0) * uAlpha; return; }
  vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
  float g = texture(uPaper, gl_FragCoord.xy / 512.0).r;
  vec3 c; float ta = 1.0;
  if (uMode == 2) {
    c = texture(uTex, vUv).rgb;
  } else {
    vec3 L = normalize(uLight);
    float ndl = dot(n, L);
    float sh = mix(.42, 1.0, shadowAt(n)); // soft: bounce light fills the shade
    float diff = max(ndl, 0.0) * sh;
    vec3 amb = mix(vec3(.5, .45, .38), vec3(1.0, .97, .9), n.y * .5 + .5);
    float ao = mix(mix(.55, 1.0, smoothstep(0.0, .14, vW.y)), 1.0, step(.7, n.y));
    vec3 V = normalize(uEye - vW), H = normalize(L + V);
    float spec = pow(max(dot(n, H), 0.0), 36.0) * .16 * sh;
    float printed = step(uRoll, gl_FragCoord.y);
    // mode 3: printed lettering, an alpha mask in the uPrint ink, lit and shadowed like the board it sits on
    if (uMode == 3) ta = texture(uTex, vUv).a;
    vec3 base = uMode == 3 ? uPrint : mix(mix(uProof, uInk, uTone * .55), uPrint, printed);
    c = base * (amb * .5 * ao + vec3(1.0, .93, .8) * diff * .72) + spec;
    // the print's signature: a faint halftone in the shadows (ink on the proof, the colour plate on the print)
    float shade = clamp(1.0 - (diff * .85 + .15), 0.0, 1.0) * .85;
    float k = dots(gl_FragCoord.xy, shade);
    vec3 dc = uDotC.r < 0.0 ? uPrint * .45 : uDotC;
    if (uMode != 3) c = mix(c, mix(c * .62, dc * (amb * .5 + .2), .5), mix(k * .28, dots(gl_FragCoord.xy + uMis, shade) * .32, printed));
    float hatch = uHatch > 0.0 ? 1.0 - smoothstep(.035, .075, abs(fract(vUv.y * uHatch) - .5) - .41) : 0.0;
    c = mix(c, uInk, hatch * .35);
  }
  c *= .94 + .12 * g;
  c += uGlow * vec3(1.0, .55, .15);
  c = mix(c, uProof, clamp((vZ - uFog) / (uFog * 2.0 + .001), 0.0, 1.0) * .55 * step(.001, uFog));
  o = vec4(c * uAlpha * ta, uAlpha * ta);
}`;
const DVS = `#version 300 es
in vec3 aP; uniform mat4 uM, uLVP;
void main() { gl_Position = uLVP * uM * vec4(aP, 1.0); }`;
const DFS = `#version 300 es
precision mediump float; void main() {}`;
export function ortho(h: number, near: number, far: number) {
    const m = m4();
    m[0] = 1 / h; m[5] = 1 / h; m[10] = -2 / (far - near); m[14] = -(far + near) / (far - near);
    return m;
}

export type Mat = { proof: V3; print: V3; dot?: V3; tone?: number; hatch?: number; glow?: number; mode?: 0 | 2 | 3; tex?: WebGLTexture; alpha?: number; outline?: boolean; cull?: "back" | "none"; shadow?: false };
export type Mesh = { vao: WebGLVertexArrayObject; count: number };
export type Item = { mesh: Mesh; mat: Mat; model: () => M4; show?: () => boolean; frac?: () => number; bs?: [number, number, number, number] };
export const hex = (h: string): V3 => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];

export class Renderer {
    gl: WebGL2RenderingContext;
    prog: WebGLProgram;
    dprog: WebGLProgram;
    du: Record<string, WebGLUniformLocation | null>;
    smap: WebGLTexture;
    fbo: WebGLFramebuffer;
    u: Record<string, WebGLUniformLocation | null> = {};
    paper: WebGLTexture;
    meshes: WebGLBuffer[] = [];
    vaos: WebGLVertexArrayObject[] = [];
    texes: WebGLTexture[] = [];
    canvas: HTMLCanvasElement;
    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const gl = canvas.getContext("webgl2", { alpha: true, antialias: true, premultipliedAlpha: true });
        if (!gl) throw new Error("no webgl2");
        this.gl = gl;
        const sh = (type: number, src: string) => {
            const s = gl.createShader(type)!;
            gl.shaderSource(s, src); gl.compileShader(s);
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
            return s;
        };
        const link = (vs: string, fs: string) => {
            const p = gl.createProgram()!;
            gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
            gl.bindAttribLocation(p, 0, "aP"); gl.bindAttribLocation(p, 1, "aN"); gl.bindAttribLocation(p, 2, "aUv");
            gl.linkProgram(p);
            if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? "link");
            return p;
        };
        const p = (this.prog = link(VS, FS));
        for (const k of ["uM", "uV", "uP", "uOut", "uProof", "uPrint", "uInk", "uLight", "uTone", "uDot", "uRoll", "uAlpha", "uGlow", "uHatch", "uFog", "uMis", "uMode", "uTex", "uPaper", "uDotC", "uEye", "uHasShadow", "uShadow", "uLVP"]) this.u[k] = gl.getUniformLocation(p, k);
        // shadow map: a depth texture rendered from the key light, compared in hardware
        this.dprog = link(DVS, DFS);
        this.du = { uM: gl.getUniformLocation(this.dprog, "uM"), uLVP: gl.getUniformLocation(this.dprog, "uLVP") };
        this.smap = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, this.smap);
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, 1024, 1024);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
        this.texes.push(this.smap);
        this.fbo = gl.createFramebuffer()!;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.smap, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        this.paper = this.texture();
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([128, 128, 128, 255]));
        const img = new Image();
        img.onload = () => { gl.bindTexture(gl.TEXTURE_2D, this.paper); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); gl.generateMipmap(gl.TEXTURE_2D); this.onPaper?.(); };
        img.src = "/art/paper.webp";
        gl.enable(gl.DEPTH_TEST);
    }
    onPaper?: () => void;
    texture(repeat = true) {
        const gl = this.gl, t = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, t);
        const w = repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, w); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, w);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        this.texes.push(t);
        return t;
    }
    upload(t: WebGLTexture, src: TexImageSource) {
        const gl = this.gl;
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    }
    mipmap(t: WebGLTexture) {
        const gl = this.gl;
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    }
    mesh(g: Geo): Mesh {
        const gl = this.gl, vao = gl.createVertexArray()!;
        gl.bindVertexArray(vao);
        const buf = (data: ArrayBufferView, loc: number, size: number) => {
            const b = gl.createBuffer()!;
            this.meshes.push(b);
            gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
            gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
        };
        buf(new Float32Array(g.p), 0, 3); buf(new Float32Array(g.n), 1, 3); buf(new Float32Array(g.uv), 2, 2);
        const ib = gl.createBuffer()!;
        this.meshes.push(ib);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(g.i), gl.STATIC_DRAW);
        gl.bindVertexArray(null);
        this.vaos.push(vao);
        return { vao, count: g.i.length };
    }
    // frame state shared by all items
    frameNo = 0;
    lvp: M4 | null = null;
    draw(items: Item[], view: M4, proj: M4, f: { ink: V3; light: V3; dot: number; roll: number; mis: [number, number]; outline: number; fog: number; eye?: V3; shadowAt?: V3; shadowSize?: number; far?: number }) {
        const gl = this.gl, u = this.u;
        const vis = (it: Item) => (it.mat.alpha ?? 1) >= 1 && !(it.show && !it.show());
        // cull by bounding sphere: behind the camera or beyond the fog
        const e = f.eye ?? [0, 0, 0], fd: V3 = [-view[2], -view[6], -view[10]], far = f.far ?? 1e9;
        const near = (it: Item, m: M4, c: V3, lim: number) => {
            if (!it.bs) return true;
            const w = apply(m, [it.bs[0], it.bs[1], it.bs[2]]), r = it.bs[3] * Math.hypot(m[0], m[1], m[2]);
            return Math.hypot(w[0] - c[0], w[1] - c[1], w[2] - c[2]) < lim + r;
        };
        const ahead = (it: Item, m: M4) => {
            if (!it.bs) return true;
            const w = apply(m, [it.bs[0], it.bs[1], it.bs[2]]), r = it.bs[3] * Math.hypot(m[0], m[1], m[2]);
            const dx = w[0] - e[0], dy = w[1] - e[1], dz = w[2] - e[2];
            return dx * fd[0] + dy * fd[1] + dz * fd[2] > -r && Math.hypot(dx, dy, dz) < far + r;
        };
        const cnt = (it: Item) => (it.frac ? Math.floor((it.mesh.count * Math.min(1, Math.max(0, it.frac()))) / 6) * 6 : it.mesh.count);
        // shadow pass: an orthographic view from the light, centred on what the camera looks at (snapped to texels);
        // re-rendered every other frame (shadows lag at most one frame while moving)
        let lvp: M4 | null = f.shadowAt ? this.lvp : null;
        if (f.shadowAt && (this.frameNo++ % 2 === 0 || !lvp)) {
            const h = f.shadowSize ?? 3.2, L = norm(f.light), snap = (2 * h) / 1024;
            const c: V3 = [Math.round(f.shadowAt[0] / snap) * snap, Math.round(f.shadowAt[1] / snap) * snap, Math.round(f.shadowAt[2] / snap) * snap];
            lvp = mul(ortho(h, 0.1, 40), lookAt([c[0] + L[0] * 15, c[1] + L[1] * 15, c[2] + L[2] * 15], c, [0, 0, -1]));
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
            gl.viewport(0, 0, 1024, 1024);
            gl.clear(gl.DEPTH_BUFFER_BIT);
            gl.useProgram(this.dprog);
            gl.uniformMatrix4fv(this.du.uLVP, false, lvp);
            gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND); gl.depthMask(true);
            gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(2, 4);
            for (const it of items) {
                if (!vis(it) || it.mat.mode === 2 || it.mat.shadow === false) continue;
                const n = cnt(it), m = it.model();
                if (!n || !near(it, m, f.shadowAt, h * 1.5)) continue;
                gl.uniformMatrix4fv(this.du.uM, false, m);
                gl.bindVertexArray(it.mesh.vao);
                gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_INT, 0);
            }
            gl.disable(gl.POLYGON_OFFSET_FILL);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            this.lvp = lvp;
        }
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(this.prog);
        gl.uniformMatrix4fv(u.uV, false, view); gl.uniformMatrix4fv(u.uP, false, proj);
        gl.uniform3fv(u.uInk, f.ink); gl.uniform3fv(u.uLight, f.light);
        gl.uniform1f(u.uDot, f.dot); gl.uniform1f(u.uRoll, f.roll); gl.uniform2fv(u.uMis, f.mis); gl.uniform1f(u.uFog, f.fog);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.paper); gl.uniform1i(u.uPaper, 1); gl.uniform1i(u.uTex, 0);
        gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.smap); gl.uniform1i(u.uShadow, 2);
        gl.uniform1f(u.uHasShadow, lvp ? 1 : 0); if (lvp) gl.uniformMatrix4fv(u.uLVP, false, lvp);
        gl.uniform3fv(u.uEye, f.eye ?? [0, 0, 0]);
        gl.enable(gl.CULL_FACE);
        const pass = (transparent: boolean) => {
            for (const it of items) {
                const a = it.mat.alpha ?? 1;
                if ((a < 1) !== transparent || a <= 0.001 || (it.show && !it.show())) continue;
                const m = it.mat, model = it.model(), count = it.frac ? Math.floor((it.mesh.count * Math.min(1, Math.max(0, it.frac()))) / 6) * 6 : it.mesh.count;
                if (!count || !ahead(it, model)) continue;
                gl.uniformMatrix4fv(u.uM, false, model);
                gl.bindVertexArray(it.mesh.vao);
                if (m.outline !== false && f.outline > 0 && !transparent) {
                    gl.cullFace(gl.FRONT); gl.uniform1i(u.uMode, 1); gl.uniform1f(u.uOut, f.outline); gl.uniform1f(u.uAlpha, 1);
                    gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_INT, 0);
                }
                if (m.cull === "none") gl.disable(gl.CULL_FACE); else { gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); }
                gl.uniform1i(u.uMode, m.mode ?? 0); gl.uniform1f(u.uOut, 0); gl.uniform1f(u.uAlpha, a);
                gl.uniform3fv(u.uProof, m.proof); gl.uniform3fv(u.uPrint, m.print); gl.uniform3fv(u.uDotC, m.dot ?? [-1, -1, -1]);
                gl.uniform1f(u.uTone, m.tone ?? 0); gl.uniform1f(u.uHatch, m.hatch ?? 0); gl.uniform1f(u.uGlow, m.glow ?? 0);
                if (m.tex) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, m.tex); }
                gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_INT, 0);
                gl.enable(gl.CULL_FACE);
            }
        };
        gl.depthMask(true); gl.disable(gl.BLEND);
        pass(false);
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
        pass(true);
        gl.depthMask(true);
        gl.bindVertexArray(null);
    }
    dispose() {
        const gl = this.gl;
        this.meshes.forEach((b) => gl.deleteBuffer(b));
        this.vaos.forEach((v) => gl.deleteVertexArray(v));
        this.texes.forEach((t) => gl.deleteTexture(t));
        gl.deleteProgram(this.prog); gl.deleteProgram(this.dprog); gl.deleteFramebuffer(this.fbo);
    }
}
