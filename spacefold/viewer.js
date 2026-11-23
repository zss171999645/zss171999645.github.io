/* Native WebGL and a software renderer share the same points, cameras and cuts. */
(() => {
  "use strict";
  const RAD = Math.PI / 180;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  // The original Figure 6 bedroom archive predates the per-scene displayCamera field.
  const bedroomCamera = { az: 48, el: 29, cut: [-1.76, -1.42, 1.83, 0.15], side: [1, 1] };
  const sceneCache = new Map();
  const bytes = (base64) => Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  function loadScript(id) {
    if (window.SpaceFoldScenes?.[id]) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "assets/scenes/" + id + ".js";
      script.onload = resolve;
      script.onerror = () => {
        script.remove();
        reject(new Error("Could not load scene " + id));
      };
      document.head.append(script);
    });
  }

  async function unpack(id) {
    await loadScript(id);
    const record = window.SpaceFoldScenes[id];
    const xyzBytes = bytes(record.xyz);
    const xyz = new Uint16Array(xyzBytes.buffer);
    const shade = bytes(record.shade);
    const behind = bytes(record.behind);
    if (
      xyz.length !== 3 * record.count ||
      shade.length !== record.count ||
      behind.length !== record.count
    ) {
      throw new Error("Unexpected point attribute length for " + id);
    }
    const image = new Image();
    image.src = record.panoData;
    await image.decode();
    const camera = record.displayCamera ?? (id === "f02" ? bedroomCamera : null);
    if (!camera) throw new Error("Missing display camera for " + id);
    const wallYaw = (camera.cutYaw ?? 0) * RAD;
    return {
      id,
      count: record.count,
      min: record.min,
      max: record.max,
      xyz,
      shade,
      behind,
      image,
      yaw: record.panoYaw,
      pitch: record.panoPitch,
      camera,
      wallAxes: [Math.cos(wallYaw), Math.sin(wallYaw)],
    };
  }

  function loadScene(id) {
    if (!sceneCache.has(id)) {
      sceneCache.set(
        id,
        unpack(id).catch((error) => {
          sceneCache.delete(id);
          throw error;
        }),
      );
    }
    return sceneCache.get(id);
  }

  const pointVertex = `
    attribute vec3 aPos;
    attribute float aShade;
    attribute float aBehind;
    uniform vec3 uMin, uMax, uCenter, uRight, uUp, uEye;
    uniform vec4 uCut;
    uniform vec2 uScale, uSide, uWallAxes;
    uniform float uDepth, uSize, uUseCut, uHighlight;
    varying vec3 vColor;
    varying float vDepth;
    void main() {
      vec3 p = mix(uMin, uMax, aPos);
      vec3 d = p - uCenter;
      vec2 local = vec2(dot(p.xy, uWallAxes), dot(p.xy, vec2(-uWallAxes.y, uWallAxes.x)));
      vec2 wallDistance = (local-uCut.xy)*uSide;
      bool wall = p.z > uCut.w && (wallDistance.x > 0.0 || wallDistance.y > 0.0);
      bool clipped = uUseCut > 0.5 && (p.z > uCut.z || wall);
      gl_Position = clipped ? vec4(4.0,4.0,4.0,1.0) : vec4(dot(d,uRight)*uScale.x, dot(d,uUp)*uScale.y, -dot(d,uEye)*uDepth, 1.0);
      gl_PointSize = uSize;
      vDepth=0.5+dot(d,uEye)*uDepth*0.43;
      float s = clamp((aShade-0.20)*1.60,0.0,1.0);
      float tint = clamp(0.18+0.76*aPos.x-0.25*aPos.y+0.24*aPos.z,0.0,1.0);
      vec3 material = mix(vec3(0.73,0.66,0.96),vec3(1.0,0.93,0.87),tint);
      vColor = mix(vec3(0.29,0.26,0.44),material,s);
      if (aBehind > 0.5 && uHighlight > 0.5) vColor = mix(vec3(0.57,0.25,0.16),vec3(1.0,0.78,0.55),s);
    }`;
  const pointFragment = `
    precision mediump float;
    varying vec3 vColor;
    varying float vDepth;
    void main() {
      vec2 r = gl_PointCoord*2.0-1.0;
      if (dot(r,r)>1.0) discard;
      gl_FragColor = vec4(vColor,vDepth);
    }`;
  const panoVertex = `
    attribute vec2 aCorner;
    varying vec2 vPlane;
    void main() { vPlane=aCorner; gl_Position=vec4(aCorner,0.0,1.0); }`;
  const panoFragment = `
    precision highp float;
    uniform sampler2D uImage;
    uniform vec3 uForward, uRight, uUp;
    uniform vec2 uFov;
    varying vec2 vPlane;
    const float PI=3.14159265359;
    void main() {
      vec3 ray=normalize(uForward+uRight*(vPlane.x*uFov.x)+uUp*(vPlane.y*uFov.y));
      vec2 uv=vec2(fract(0.5+atan(ray.x,ray.y)/(2.0*PI)),0.5-asin(clamp(ray.z,-1.0,1.0))/PI);
      gl_FragColor=texture2D(uImage,uv);
    }`;

  // Eye-dome lighting darkens recessed surfaces according to actual neighboring depths.
  const reliefFragment = `
    precision highp float;
    uniform sampler2D uBuffer;
    uniform vec2 uStep;
    varying vec2 vPlane;
    void main() {
      vec2 uv=0.5+vPlane*0.5;
      vec4 center=texture2D(uBuffer,uv);
      if (center.a<0.01) discard;
      float shadow=0.0;
      for(int i=0;i<8;i++) {
        float angle=float(i)*0.785398;
        float nearDepth=texture2D(uBuffer,uv+uStep*vec2(cos(angle),sin(angle))).a;
        shadow+=max(0.0,nearDepth-center.a-0.004);
      }
      float light=exp(-min(1.45,shadow*9.5));
      gl_FragColor=vec4(mix(vec3(0.17,0.15,0.25),center.rgb,light),1.0);
    }`;

  function program(gl, vertex, fragment, attributes, uniforms) {
    const linked = gl.createProgram();
    for (const [type, source] of [
      [gl.VERTEX_SHADER, vertex],
      [gl.FRAGMENT_SHADER, fragment],
    ]) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw new Error(gl.getShaderInfoLog(shader));
      gl.attachShader(linked, shader);
      gl.deleteShader(shader);
    }
    gl.linkProgram(linked);
    if (!gl.getProgramParameter(linked, gl.LINK_STATUS))
      throw new Error(gl.getProgramInfoLog(linked));
    const p = { handle: linked };
    for (const name of attributes) p[name] = gl.getAttribLocation(linked, name);
    for (const name of uniforms) p[name] = gl.getUniformLocation(linked, name);
    return p;
  }

  class GLRenderer {
    constructor(gl) {
      this.gl = gl;
      this.density = Math.min(devicePixelRatio || 1, 2);
      this.maxPixels = Math.min(
        gl.getParameter(gl.MAX_TEXTURE_SIZE),
        gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
      );
      this.points = program(
        gl,
        pointVertex,
        pointFragment,
        ["aPos", "aShade", "aBehind"],
        [
          "uMin",
          "uMax",
          "uCenter",
          "uRight",
          "uUp",
          "uEye",
          "uCut",
          "uScale",
          "uDepth",
          "uSize",
          "uSide",
          "uUseCut",
          "uWallAxes",
          "uHighlight",
        ],
      );
      this.pano = program(
        gl,
        panoVertex,
        panoFragment,
        ["aCorner"],
        ["uImage", "uForward", "uRight", "uUp", "uFov"],
      );
      this.relief = program(gl, panoVertex, reliefFragment, ["aCorner"], ["uBuffer", "uStep"]);
      this.buffers = {
        xyz: gl.createBuffer(),
        shade: gl.createBuffer(),
        behind: gl.createBuffer(),
        quad: gl.createBuffer(),
      };
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.quad);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      this.texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      for (const side of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T])
        gl.texParameteri(gl.TEXTURE_2D, side, gl.CLAMP_TO_EDGE);
      for (const key of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER])
        gl.texParameteri(gl.TEXTURE_2D, key, gl.LINEAR);
      this.framebuffer = gl.createFramebuffer();
      this.colorDepth = gl.createTexture();
      this.depth = gl.createRenderbuffer();
      gl.bindTexture(gl.TEXTURE_2D, this.colorDepth);
      for (const key of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER])
        gl.texParameteri(gl.TEXTURE_2D, key, gl.NEAREST);
      for (const key of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T])
        gl.texParameteri(gl.TEXTURE_2D, key, gl.CLAMP_TO_EDGE);
      gl.bindRenderbuffer(gl.RENDERBUFFER, this.depth);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        this.colorDepth,
        0,
      );
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depth);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.clearColor(0, 0, 0, 0);
    }
    setScene(scene) {
      const gl = this.gl;
      for (const name of ["xyz", "shade", "behind"]) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[name]);
        gl.bufferData(gl.ARRAY_BUFFER, scene[name], gl.STATIC_DRAW);
      }
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, scene.image);
    }
    attribute(location, buffer, size, type, normalize = false) {
      const gl = this.gl;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, size, type, normalize, 0, 0);
    }
    clear() {
      this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    }
    render(scene, view, width, height) {
      const gl = this.gl;
      gl.viewport(0, 0, width, height);
      this.clear();
      if (view.mode === "panorama") {
        const p = this.pano;
        gl.disable(gl.DEPTH_TEST);
        gl.useProgram(p.handle);
        this.attribute(p.aCorner, this.buffers.quad, 2, gl.FLOAT);
        gl.uniform3fv(p.uForward, view.eye);
        gl.uniform3fv(p.uRight, view.right);
        gl.uniform3fv(p.uUp, view.up);
        gl.uniform2fv(p.uFov, view.fov);
        gl.uniform1i(p.uImage, 0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.disableVertexAttribArray(p.aCorner);
        return;
      }
      const p = this.points;
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
      if (this.frameWidth !== width || this.frameHeight !== height) {
        gl.bindTexture(gl.TEXTURE_2D, this.colorDepth);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, this.depth);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
          throw new Error("Point lighting framebuffer is incomplete");
        this.frameWidth = width;
        this.frameHeight = height;
      }
      gl.bindTexture(gl.TEXTURE_2D, null);
      this.clear();
      gl.enable(gl.DEPTH_TEST);
      gl.useProgram(p.handle);
      this.attribute(p.aPos, this.buffers.xyz, 3, gl.UNSIGNED_SHORT, true);
      this.attribute(p.aShade, this.buffers.shade, 1, gl.UNSIGNED_BYTE, true);
      this.attribute(p.aBehind, this.buffers.behind, 1, gl.UNSIGNED_BYTE);
      gl.uniform3fv(p.uMin, scene.min);
      gl.uniform3fv(p.uMax, scene.max);
      gl.uniform3fv(p.uCenter, view.center);
      gl.uniform3fv(p.uRight, view.right);
      gl.uniform3fv(p.uUp, view.up);
      gl.uniform3fv(p.uEye, view.eye);
      gl.uniform2fv(p.uScale, view.scale);
      gl.uniform1f(p.uDepth, view.depth);
      gl.uniform1f(p.uSize, view.size);
      gl.uniform4fv(p.uCut, scene.camera.cut);
      gl.uniform2fv(p.uSide, scene.camera.side);
      gl.uniform2fv(p.uWallAxes, scene.wallAxes);
      gl.uniform1f(p.uUseCut, view.cut ? 1 : 0);
      gl.uniform1f(p.uHighlight, view.highlight ? 1 : 0);
      gl.drawArrays(gl.POINTS, 0, scene.count);
      for (const attr of [p.aPos, p.aShade, p.aBehind]) gl.disableVertexAttribArray(attr);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.disable(gl.DEPTH_TEST);
      const relief = this.relief;
      gl.useProgram(relief.handle);
      this.attribute(relief.aCorner, this.buffers.quad, 2, gl.FLOAT);
      gl.bindTexture(gl.TEXTURE_2D, this.colorDepth);
      gl.uniform1i(relief.uBuffer, 0);
      gl.uniform2f(relief.uStep, (2.5 * this.density) / width, (2.5 * this.density) / height);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disableVertexAttribArray(relief.aCorner);
    }
  }

  class SoftwareRenderer {
    constructor(canvas) {
      this.ctx = canvas.getContext("2d");
      this.density = 1;
      this.maxPixels = 760;
    }
    setScene(scene) {
      const source = document.createElement("canvas");
      source.width = scene.image.naturalWidth;
      source.height = scene.image.naturalHeight;
      const image = source.getContext("2d", { willReadFrequently: true });
      image.drawImage(scene.image, 0, 0);
      this.panorama = image.getImageData(0, 0, source.width, source.height);
    }
    clear() {
      this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    }
    render(scene, view, width, height) {
      const out = this.ctx.createImageData(width, height);
      if (view.mode === "panorama") this.drawPanorama(out, view);
      else this.drawPoints(out, scene, view);
      this.ctx.putImageData(out, 0, 0);
    }
    drawPanorama(out, v) {
      const src = this.panorama;
      for (let y = 0; y < out.height; y++) {
        const ny = (1 - (2 * (y + 0.5)) / out.height) * v.fov[1];
        const base = v.eye.map((e, k) => e + ny * v.up[k]);
        for (let x = 0; x < out.width; x++) {
          const nx = ((2 * (x + 0.5)) / out.width - 1) * v.fov[0];
          const a = base[0] + nx * v.right[0],
            b = base[1] + nx * v.right[1],
            c = base[2] + nx * v.right[2];
          const sx = Math.floor((1.5 + Math.atan2(a, b) / (2 * Math.PI)) * src.width) % src.width;
          const sy = clamp(
            Math.floor((0.5 - Math.atan2(c, Math.hypot(a, b)) / Math.PI) * src.height),
            0,
            src.height - 1,
          );
          const to = (y * out.width + x) * 4,
            from = (sy * src.width + sx) * 4;
          out.data[to] = src.data[from];
          out.data[to + 1] = src.data[from + 1];
          out.data[to + 2] = src.data[from + 2];
          out.data[to + 3] = 255;
        }
      }
    }
    drawPoints(out, scene, v) {
      const zBuffer = new Float32Array(out.width * out.height).fill(-Infinity);
      const step = scene.max.map((h, k) => (h - scene.min[k]) / 65535);
      const [sideX, sideY] = scene.camera.side;
      const [cosWall, sinWall] = scene.wallAxes;
      const [wx, wy, ceiling, floor] = scene.camera.cut;
      const radius = clamp(Math.ceil(v.size * 0.58), 1, 5);
      for (let i = 0; i < scene.count; i += 2) {
        const idx = i * 3;
        let x = scene.min[0] + scene.xyz[idx] * step[0],
          y = scene.min[1] + scene.xyz[idx + 1] * step[1],
          z = scene.min[2] + scene.xyz[idx + 2] * step[2];
        if (v.cut) {
          const localX = x * cosWall + y * sinWall;
          const localY = -x * sinWall + y * cosWall;
          if (
            z > ceiling ||
            (z > floor && ((localX - wx) * sideX > 0 || (localY - wy) * sideY > 0))
          )
            continue;
        }
        x -= v.center[0];
        y -= v.center[1];
        z -= v.center[2];
        const px = Math.round(
          ((1 + (x * v.right[0] + y * v.right[1]) * v.scale[0]) * out.width) / 2,
        );
        const py = Math.round(
          ((1 - (x * v.up[0] + y * v.up[1] + z * v.up[2]) * v.scale[1]) * out.height) / 2,
        );
        const depth = x * v.eye[0] + y * v.eye[1] + z * v.eye[2];
        const s = clamp((scene.shade[i] / 255 - 0.26) * 1.52, 0, 1);
        const warm = v.highlight && scene.behind[i];
        const r = warm ? 145 + 110 * s : 57 + 158 * s;
        const g = warm ? 64 + 135 * s : 52 + 145 * s;
        const b = warm ? 41 + 99 * s : 84 + 145 * s;
        for (let j = Math.max(0, py - radius); j <= Math.min(out.height - 1, py + radius); j++) {
          for (let k = Math.max(0, px - radius); k <= Math.min(out.width - 1, px + radius); k++) {
            const u = j * out.width + k;
            if (depth <= zBuffer[u] || (k - px) ** 2 + (j - py) ** 2 > radius * radius) continue;
            zBuffer[u] = depth;
            out.data[4 * u] = r;
            out.data[4 * u + 1] = g;
            out.data[4 * u + 2] = b;
            out.data[4 * u + 3] = 255;
          }
        }
      }
    }
  }

  class SceneViewer {
    constructor(stage, change) {
      this.stage = stage;
      this.change = change;
      this.canvas = stage.querySelector("canvas");
      this.mode = "geometry";
      this.highlight = false;
      this.ticket = 0;
      this.pendingFrame = 0;
      this.touches = new Map();
      const gl = this.canvas.getContext("webgl", {
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
      if (gl) {
        try {
          this.renderer = new GLRenderer(gl);
        } catch (error) {
          console.warn("Using software rendering after WebGL initialization failed.", error);
          this.useSoftware();
        }
        this.canvas.addEventListener(
          "webglcontextlost",
          (e) => {
            e.preventDefault();
            this.useSoftware();
          },
          { once: true },
        );
      } else {
        this.renderer = new SoftwareRenderer(this.canvas);
      }
      this.bindGestures();
      new ResizeObserver(() => this.draw()).observe(stage);
    }
    useSoftware() {
      const fallback = document.createElement("canvas");
      fallback.setAttribute("aria-hidden", "true");
      this.canvas.replaceWith(fallback);
      this.canvas = fallback;
      this.renderer = new SoftwareRenderer(fallback);
      if (this.scene) this.renderer.setScene(this.scene);
      this.draw();
    }
    async select(id) {
      if (this.wanted === id && (this.loading || this.scene)) return;
      this.wanted = id;
      this.scene = null;
      this.loading = true;
      this.failed = false;
      delete this.stage.dataset.ready;
      this.stage.setAttribute("aria-busy", "true");
      this.renderer.clear();
      this.change();
      const ticket = ++this.ticket;
      try {
        const scene = await loadScene(id);
        if (ticket !== this.ticket) return;
        this.renderer.setScene(scene);
        this.scene = scene;
        this.reset();
        this.stage.dataset.ready = id;
      } catch (error) {
        if (ticket !== this.ticket) return;
        this.failed = true;
        console.error(error);
      }
      this.loading = false;
      this.stage.setAttribute("aria-busy", "false");
      this.change();
    }
    reset() {
      if (!this.scene) return;
      const s = this.scene;
      this.az = s.camera.az * RAD;
      this.el = s.camera.el * RAD;
      this.zoom = 1;
      this.yaw = s.yaw * RAD;
      this.pitch = s.pitch * RAD;
      this.lens = 76;
      this.draw();
    }
    setMode(mode) {
      this.mode = mode;
      this.draw();
      this.change();
    }
    magnify(factor) {
      if (!this.scene) return;
      if (this.mode === "panorama") this.lens = clamp(this.lens / factor, 32, 103);
      else this.zoom = clamp(this.zoom * factor, 0.55, 4.8);
      this.draw();
    }
    rotate(dx, dy) {
      if (!this.scene) return;
      if (this.mode === "panorama") {
        this.yaw -= (dx * 0.0038 * this.lens) / 68;
        this.pitch = clamp(this.pitch + (dy * 0.0038 * this.lens) / 68, -1.51, 1.51);
      } else {
        this.az -= dx * 0.009;
        this.el = clamp(this.el + dy * 0.007, -1.18, 1.48);
      }
      this.draw();
    }
    bindGestures() {
      const stage = this.stage;
      stage.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        stage.focus({ preventScroll: true });
        stage.setPointerCapture(e.pointerId);
        this.touches.set(e.pointerId, [e.clientX, e.clientY]);
      });
      stage.addEventListener("pointermove", (e) => {
        const old = this.touches.get(e.pointerId);
        if (!old) return;
        const now = [e.clientX, e.clientY];
        this.touches.set(e.pointerId, now);
        if (this.touches.size === 1) this.rotate(now[0] - old[0], now[1] - old[1]);
        else if (this.touches.size === 2) {
          const other = [...this.touches.entries()].find(([id]) => id !== e.pointerId)[1];
          const last = Math.hypot(old[0] - other[0], old[1] - other[1]);
          const next = Math.hypot(now[0] - other[0], now[1] - other[1]);
          if (last > 3 && next > 3) this.magnify(next / last);
        }
      });
      const release = (e) => this.touches.delete(e.pointerId);
      stage.addEventListener("pointerup", release);
      stage.addEventListener("pointercancel", release);
      stage.addEventListener("lostpointercapture", release);
      stage.addEventListener(
        "wheel",
        (e) => {
          if (document.activeElement !== stage && !e.ctrlKey && !stage.closest(".is-expanded"))
            return;
          e.preventDefault();
          this.magnify(Math.exp(-clamp(e.deltaY, -100, 100) * 0.0026));
        },
        { passive: false },
      );
      stage.addEventListener("keydown", (e) => {
        const moves = {
          ArrowLeft: [-12, 0],
          ArrowRight: [12, 0],
          ArrowUp: [0, -9],
          ArrowDown: [0, 9],
        };
        if (moves[e.key]) this.rotate(...moves[e.key]);
        else if (e.key === "+" || e.key === "=") this.magnify(1.16);
        else if (e.key === "-") this.magnify(1 / 1.16);
        else if (e.key === "0" || e.key === "Home") this.reset();
        else return;
        e.preventDefault();
      });
    }
    view(width, height) {
      if (this.mode === "panorama") {
        const sy = Math.sin(this.yaw),
          cy = Math.cos(this.yaw),
          sp = Math.sin(this.pitch),
          cp = Math.cos(this.pitch);
        const half = Math.tan((this.lens * RAD) / 2);
        return {
          mode: this.mode,
          eye: [sy * cp, cy * cp, sp],
          right: [cy, -sy, 0],
          up: [-sy * sp, -cy * sp, cp],
          fov: [(half * width) / height, half],
        };
      }
      const s = this.scene,
        az = this.az,
        el = this.el;
      const span = s.max.map((v, k) => v - s.min[k]);
      const center = s.max.map((v, k) => (v + s.min[k]) / 2);
      const maxDepth = Math.hypot(...span);
      const ca = Math.cos(az),
        sa = Math.sin(az),
        ce = Math.cos(el),
        se = Math.sin(el);
      // Both geometry views use the full bounds so the same point stays in place when the cut changes.
      const a = s.camera.az * RAD,
        e = s.camera.el * RAD;
      const frameWidth = Math.abs(Math.sin(a)) * span[0] + Math.abs(Math.cos(a)) * span[1];
      const frameHeight =
        Math.sin(e) * (Math.abs(Math.cos(a)) * span[0] + Math.abs(Math.sin(a)) * span[1]) +
        Math.cos(e) * span[2];
      const pixels =
        this.zoom * Math.min((width * 0.86) / frameWidth, (height * 0.74) / frameHeight);
      return {
        mode: this.mode,
        right: [-sa, ca, 0],
        up: [-ca * se, -sa * se, ce],
        eye: [ca * ce, sa * ce, se],
        center,
        scale: [(2 * pixels) / width, (2 * pixels) / height],
        depth: 1.6 / maxDepth,
        size: clamp((3.55 * pixels * maxDepth) / Math.sqrt(s.count), 1.7, 16),
        cut: this.mode === "cutaway",
        highlight: this.highlight,
      };
    }
    draw() {
      if (!this.scene || this.pendingFrame) return;
      this.pendingFrame = requestAnimationFrame(() => {
        this.pendingFrame = 0;
        if (!this.scene) return;
        const rect = this.stage.getBoundingClientRect();
        const dpr = Math.min(
          this.renderer.density,
          this.renderer.maxPixels / Math.max(rect.width, rect.height, 1),
        );
        const w = Math.max(1, Math.round(rect.width * dpr)),
          h = Math.max(1, Math.round(rect.height * dpr));
        if (this.canvas.width !== w || this.canvas.height !== h) {
          this.canvas.width = w;
          this.canvas.height = h;
        }
        this.renderer.render(this.scene, this.view(w, h), w, h);
        this.stage.dataset.mode = this.mode;
      });
    }
  }
  window.SpaceFoldViewer = SceneViewer;
})();
