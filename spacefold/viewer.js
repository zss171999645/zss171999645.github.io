/* Native WebGL and a software renderer share the same points, cameras and cuts. */
(() => {
  "use strict";
  const RAD = Math.PI / 180;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  // The original Figure 6 bedroom archive predates the per-scene displayCamera field.
  const bedroomCamera = { az: 48, el: 29, cut: [-1.76, -1.42, 1.83, 0.15], side: [1, 1] };
  const sceneCache = new Map();
  const surfaceRooms = new Set([
    "round-table-bedroom",
    "paired-armchair-lounge",
    "dining-chairs",
    "desk-frame-bedroom",
  ]);
  const bytes = (base64) => Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  function loadScript(id, surface) {
    const registry = surface ? "SpaceFoldSurfaces" : "SpaceFoldScenes";
    if (window[registry]?.[id]) return Promise.resolve(window[registry][id]);
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "assets/scenes/" + id + (surface ? "-surface.js" : ".js");
      script.onload = () => {
        const record = window[registry]?.[id];
        if (record) resolve(record);
        else reject(new Error("Missing scene data for " + id));
      };
      script.onerror = () => {
        script.remove();
        reject(new Error("Could not load scene " + id));
      };
      document.head.append(script);
    });
  }

  async function unpack(id) {
    const surface =
      surfaceRooms.has(id) &&
      typeof DecompressionStream === "function" &&
      typeof window.decodeSpaceFoldSurface === "function";
    const record = await loadScript(id, surface);
    const attributes = surface
      ? await window.decodeSpaceFoldSurface(record)
      : {
          xyz: new Uint16Array(bytes(record.xyz).buffer),
          shade: bytes(record.shade),
          behind: bytes(record.behind),
        };
    const { xyz, shade, behind, normalOct, support } = attributes;
    if (
      xyz.length !== 3 * record.count ||
      (!surface && shade.length !== record.count) ||
      behind.length !== record.count ||
      (surface &&
        (normalOct?.length !== 2 * record.count ||
          support?.length !== record.count ||
          !(attributes.supportMaxM > 0)))
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
      normalOct,
      support,
      supportMaxM: attributes.supportMaxM,
      lighting: attributes.lighting,
      image,
      yaw: record.panoYaw,
      pitch: record.panoPitch,
      camera,
      wallAxes: [Math.cos(wallYaw), Math.sin(wallYaw)],
    };
  }

  // A diffuse off-white material lit from above left. Both renderers look up
  // the same colour from the (camera-facing) normal of each measured surface.
  const materialSize = 128;
  function studioMaterial() {
    const rgba = new Uint8Array(materialSize * materialSize * 4);
    const srgb = (value) => Math.round(255 * clamp(1.055 * Math.pow(value, 1 / 2.4) - 0.055, 0, 1));
    for (let y = 0; y < materialSize; y++) {
      for (let x = 0; x < materialSize; x++) {
        let nx = (2 * x + 1) / materialSize - 1;
        let ny = (2 * y + 1) / materialSize - 1;
        const length = Math.max(1, Math.hypot(nx, ny));
        nx /= length;
        ny /= length;
        const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
        const key = Math.max(0, -0.64 * nx + 0.65 * ny + 0.41 * nz);
        const fill = Math.max(0, 0.8 * nx + 0.18 * ny + 0.57 * nz);
        const sky = 0.5 + 0.5 * ny;
        const sheen = 0.085 * Math.pow(Math.max(0, -0.38 * nx + 0.39 * ny + 0.84 * nz), 20);
        const i = (y * materialSize + x) * 4;
        rgba[i] = srgb(0.074 + 0.55 * key + 0.142 * fill + 0.094 * sky + sheen);
        rgba[i + 1] = srgb(0.081 + 0.502 * key + 0.157 * fill + 0.087 * sky + sheen);
        rgba[i + 2] = srgb(0.105 + 0.457 * key + 0.193 * fill + 0.092 * sky + sheen);
        rgba[i + 3] = 255;
      }
    }
    return rgba;
  }
  const materialPixels = studioMaterial();

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
    attribute vec2 aNormal;
    attribute vec2 aLighting;
    attribute float aShade, aBehind, aSupport;
    uniform vec3 uMin, uMax, uCenter, uRight, uUp, uEye;
    uniform vec4 uCut;
    uniform vec2 uScale, uSide, uWallAxes;
    uniform float uDepth, uSize, uUseCut, uSurface;
    varying vec4 vMaterial;
    varying vec4 vEllipse;
    varying vec2 vDistance;
    vec3 octNormal(vec2 encoded) {
      vec2 f = encoded * 2.0 - 1.0;
      vec3 n = vec3(f, 1.0 - abs(f.x) - abs(f.y));
      n.xy += clamp(-n.z, 0.0, 1.0) * (1.0 - 2.0 * step(vec2(0.0), f));
      return normalize(n);
    }
    void main() {
      vec3 p = mix(uMin, uMax, aPos);
      vec3 d = p - uCenter;
      vec2 local = vec2(dot(p.xy, uWallAxes), dot(p.xy, vec2(-uWallAxes.y, uWallAxes.x)));
      vec2 wallDistance = (local-uCut.xy)*uSide;
      bool wall = p.z > uCut.w && (wallDistance.x > 0.0 || wallDistance.y > 0.0);
      bool clipped = uUseCut > 0.5 && (p.z > uCut.z || wall);
      gl_Position = clipped ? vec4(4.0,4.0,4.0,1.0) : vec4(dot(d,uRight)*uScale.x, dot(d,uUp)*uScale.y, -dot(d,uEye)*uDepth, 1.0);
      float radius = 0.5 * uSize * aSupport;
      vec3 normal = octNormal(aNormal);
      vec3 n = vec3(dot(normal,uRight), dot(normal,uUp), dot(normal,uEye));
      float contact = n.z < 0.0 ? floor(aLighting.x/16.0) : mod(aLighting.x,16.0);
      float directShadow = uUseCut > 0.5 ? floor(aLighting.y/16.0) : mod(aLighting.y,16.0);
      if (n.z < 0.0) n = -n;
      if (uSurface < 0.5) n = vec3(0.0,0.0,1.0);
      float tilt = length(n.xy);
      vec2 axis = tilt > 0.0001 ? n.xy / tilt : vec2(1.0,0.0);
      // Project the physical disk into an ellipse. A subpixel reconstruction
      // filter keeps edge-on samples visible at the output resolution.
      float major = sqrt(radius*radius + 0.50);
      float minor = sqrt(radius*radius*n.z*n.z + 0.50);
      gl_PointSize = 2.0 * major;
      vEllipse = vec4(axis, major/minor, major);
      vDistance = vec2(0.5 + dot(d,uEye)*uDepth*0.43, -tilt / max(n.z,0.17));
      vec2 material = uSurface > 0.5 ? 0.5 + 0.5*n.xy : vec2(aShade, aPos.x);
      float ambient = min(0.65, (contact/15.0)*(contact/15.0));
      float shadow = directShadow/15.0;
      vMaterial = vec4(material, aBehind, 1.0-0.245*shadow-(0.15+0.06*shadow)*ambient);
    }`;
  function pointFragment(fragmentDepth) {
    return (
      (fragmentDepth ? "#extension GL_EXT_frag_depth : enable\n" : "") +
      `
    precision highp float;
    uniform float uDepthPerPixel;
    uniform float uSurface, uHighlight;
    uniform sampler2D uMaterial;
    varying vec4 vMaterial;
    varying vec4 vEllipse;
    varying vec2 vDistance;
    void main() {
      vec2 r = (gl_PointCoord * 2.0 - 1.0) * vec2(1.0,-1.0);
      float along = dot(r, vEllipse.xy);
      float across = dot(r, vec2(-vEllipse.y, vEllipse.x));
      if (across*across + along*along*vEllipse.z*vEllipse.z > 1.0) discard;
      float dz = clamp(along * vDistance.y, -1.0, 1.0) * vEllipse.w * uDepthPerPixel;
      ${fragmentDepth ? "gl_FragDepthEXT = clamp(gl_FragCoord.z - 0.5 * dz, 0.0, 1.0);" : ""}
      vec3 color;
      if (uSurface > 0.5) color = texture2D(uMaterial,vMaterial.xy).rgb;
      else color = mix(vec3(0.37,0.36,0.43), vec3(0.94,0.91,0.87),
                       clamp((vMaterial.x-0.2)*1.6,0.0,1.0));
      if (uHighlight > 0.5 && vMaterial.z > 0.5) {
        float light = dot(color,vec3(0.2126,0.7152,0.0722));
        color = vec3(0.29,0.08,0.025) + light*vec3(0.85,0.62,0.44);
      }
      color *= vMaterial.w + (1.0-vMaterial.w)*vec3(-0.055,0.0,0.065);
      gl_FragColor = vec4(color, vDistance.x + 0.43*dz);
    }`
    );
  }
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

  // Only average pixels that already belong to the same visible surface.
  // Silhouettes, unsupported gaps and foreground/background edges stay separate.
  const reliefFragment = `
    precision highp float;
    uniform sampler2D uBuffer;
    uniform vec2 uTexel;
    uniform float uMetres, uHighlight;
    varying vec2 vPlane;
    void main() {
      vec2 uv = 0.5 + vPlane*0.5;
      vec4 center = texture2D(uBuffer,uv);
      if (center.a < 0.01) discard;
      vec3 color = center.rgb;
      float total = 1.0;
      vec3 sameSurface = vec3(0.0);
      float support = 0.0, moment = 0.0;
      const vec3 luminance = vec3(0.2126,0.7152,0.0722);
      for (int i=0; i<8; i++) {
        float angle = float(i)*0.78539816;
        vec2 dir = vec2(cos(angle),sin(angle));
        vec4 p = texture2D(uBuffer,uv + 1.35*uTexel*dir);
        vec3 difference = p.rgb-center.rgb;
        float neighbour = 1.0-smoothstep(0.015,0.060,abs(p.a-center.a)*uMetres);
        if (uHighlight > 0.5 && abs(difference.r-difference.b) > 0.20) neighbour = 0.0;
        float weight = 0.43*(1.0-smoothstep(0.004,0.042,dot(difference,difference)))*neighbour;
        color += p.rgb*weight;
        total += weight;
        float light = dot(p.rgb,luminance);
        sameSurface += p.rgb*neighbour;
        moment += light*light*neighbour;
        support += neighbour;
      }
      sameSurface /= max(0.001,support);
      float average = dot(sameSurface,luminance);
      float variance = max(0.0,moment/max(0.001,support) - average*average);
      float agreement = smoothstep(4.0,7.4,support)*(1.0-smoothstep(0.002,0.014,variance));
      gl_FragColor = vec4(mix(color/total,sameSurface,0.72*agreement),1.0);
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
      this.density = clamp(devicePixelRatio || 1, 1.4, 2);
      this.maxPixels = Math.min(
        2800,
        gl.getParameter(gl.MAX_TEXTURE_SIZE),
        gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
      );
      this.maxDiameter = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1] - 1;
      gl.disable(gl.DITHER);
      this.points = program(
        gl,
        pointVertex,
        pointFragment(Boolean(gl.getExtension("EXT_frag_depth"))),
        ["aPos", "aNormal", "aShade", "aBehind", "aSupport", "aLighting"],
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
          "uSurface",
          "uDepthPerPixel",
          "uHighlight",
          "uMaterial",
        ],
      );
      this.pano = program(
        gl,
        panoVertex,
        panoFragment,
        ["aCorner"],
        ["uImage", "uForward", "uRight", "uUp", "uFov"],
      );
      this.relief = program(
        gl,
        panoVertex,
        reliefFragment,
        ["aCorner"],
        ["uBuffer", "uTexel", "uMetres", "uHighlight"],
      );
      this.buffers = {
        xyz: gl.createBuffer(),
        shade: gl.createBuffer(),
        behind: gl.createBuffer(),
        normalOct: gl.createBuffer(),
        support: gl.createBuffer(),
        lighting: gl.createBuffer(),
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
      this.material = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.material);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        materialSize,
        materialSize,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        materialPixels,
      );
      for (const key of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER])
        gl.texParameteri(gl.TEXTURE_2D, key, gl.LINEAR);
      for (const side of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T])
        gl.texParameteri(gl.TEXTURE_2D, side, gl.CLAMP_TO_EDGE);
      gl.clearColor(0, 0, 0, 0);
    }
    setScene(scene) {
      const gl = this.gl;
      for (const name of ["xyz", "shade", "behind", "normalOct", "support", "lighting"]) {
        if (!scene[name]) continue;
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
      gl.activeTexture(gl.TEXTURE0);
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
      if (scene.shade) this.attribute(p.aShade, this.buffers.shade, 1, gl.UNSIGNED_BYTE, true);
      else gl.vertexAttrib1f(p.aShade, 0);
      this.attribute(p.aBehind, this.buffers.behind, 1, gl.UNSIGNED_BYTE);
      if (scene.lighting) this.attribute(p.aLighting, this.buffers.lighting, 2, gl.UNSIGNED_BYTE);
      else gl.vertexAttrib2f(p.aLighting, 0, 0);
      if (scene.normalOct) {
        this.attribute(p.aNormal, this.buffers.normalOct, 2, gl.UNSIGNED_BYTE, true);
        this.attribute(p.aSupport, this.buffers.support, 1, gl.UNSIGNED_BYTE, true);
      } else {
        gl.vertexAttrib2f(p.aNormal, 0.5, 0.5);
        gl.vertexAttrib1f(p.aSupport, 1);
      }
      gl.uniform3fv(p.uMin, scene.min);
      gl.uniform3fv(p.uMax, scene.max);
      gl.uniform3fv(p.uCenter, view.center);
      gl.uniform3fv(p.uRight, view.right);
      gl.uniform3fv(p.uUp, view.up);
      gl.uniform3fv(p.uEye, view.eye);
      gl.uniform2fv(p.uScale, view.scale);
      gl.uniform1f(p.uDepth, view.depth);
      const pixels = (view.scale[0] * width) / 2;
      const diameter = scene.normalOct ? 2 * scene.supportMaxM * pixels : view.size;
      gl.uniform1f(p.uSize, Math.min(this.maxDiameter, diameter));
      gl.uniform1f(p.uDepthPerPixel, view.depth / pixels);
      gl.uniform4fv(p.uCut, scene.camera.cut);
      gl.uniform2fv(p.uSide, scene.camera.side);
      gl.uniform2fv(p.uWallAxes, scene.wallAxes);
      gl.uniform1f(p.uUseCut, view.cut ? 1 : 0);
      gl.uniform1f(p.uSurface, scene.normalOct ? 1 : 0);
      gl.uniform1f(p.uHighlight, view.highlight ? 1 : 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.material);
      gl.uniform1i(p.uMaterial, 1);
      gl.drawArrays(gl.POINTS, 0, scene.count);
      for (const attr of [p.aPos, p.aShade, p.aBehind, p.aNormal, p.aSupport, p.aLighting])
        gl.disableVertexAttribArray(attr);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.disable(gl.DEPTH_TEST);
      const relief = this.relief;
      gl.useProgram(relief.handle);
      this.attribute(relief.aCorner, this.buffers.quad, 2, gl.FLOAT);
      gl.bindTexture(gl.TEXTURE_2D, this.colorDepth);
      gl.uniform1i(relief.uBuffer, 0);
      gl.uniform2f(relief.uTexel, 1 / width, 1 / height);
      gl.uniform1f(relief.uMetres, 1 / (view.depth * 0.43));
      gl.uniform1f(relief.uHighlight, view.highlight ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disableVertexAttribArray(relief.aCorner);
      gl.activeTexture(gl.TEXTURE0);
    }
  }

  class SoftwareRenderer {
    constructor(canvas) {
      this.ctx = canvas.getContext("2d");
      this.density = 1;
      this.maxPixels = 760;
      this.colors = new Uint32Array(65536);
      this.hiddenColors = new Uint32Array(65536);
      this.axes = new Float32Array(65536 * 4);
      this.backFace = new Uint8Array(65536);
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
    surfaceStyle(key, v) {
      let x = (key >> 8) / 127.5 - 1,
        y = (key & 255) / 127.5 - 1;
      const z = 1 - Math.abs(x) - Math.abs(y);
      if (z < 0) {
        x -= (x < 0 ? -1 : 1) * -z;
        y -= (y < 0 ? -1 : 1) * -z;
      }
      const inverse = 1 / Math.hypot(x, y, z);
      let nz = (x * v.eye[0] + y * v.eye[1] + z * v.eye[2]) * inverse;
      this.backFace[key] = nz < 0;
      const sign = nz < 0 ? -inverse : inverse;
      nz = Math.abs(nz);
      const nx = (x * v.right[0] + y * v.right[1]) * sign;
      const ny = (x * v.up[0] + y * v.up[1] + z * v.up[2]) * sign;
      const tilt = Math.hypot(nx, ny);
      const k = 4 * key;
      this.axes[k] = tilt > 0.0001 ? nx / tilt : 1;
      this.axes[k + 1] = tilt > 0.0001 ? ny / tilt : 0;
      this.axes[k + 2] = nz * nz;
      this.axes[k + 3] = -tilt / Math.max(nz, 0.17);
      const tx = clamp(Math.floor((0.5 + 0.5 * nx) * materialSize), 0, materialSize - 1);
      const ty = clamp(Math.floor((0.5 + 0.5 * ny) * materialSize), 0, materialSize - 1);
      const p = 4 * (ty * materialSize + tx);
      const r = materialPixels[p],
        g = materialPixels[p + 1],
        b = materialPixels[p + 2];
      this.colors[key] = (255 << 24) | (b << 16) | (g << 8) | r;
      const light = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      this.hiddenColors[key] =
        (255 << 24) |
        (Math.round(6 + 0.44 * light) << 16) |
        (Math.round(20 + 0.62 * light) << 8) |
        Math.min(255, Math.round(74 + 0.85 * light));
    }
    drawPoints(out, scene, v) {
      const zBuffer = new Float32Array(out.width * out.height).fill(-Infinity);
      const pixels = new Uint32Array(out.data.buffer);
      const step = scene.max.map((h, k) => (h - scene.min[k]) / 65535);
      const [sideX, sideY] = scene.camera.side;
      const [cosWall, sinWall] = scene.wallAxes;
      const [wx, wy, ceiling, floor] = scene.camera.cut;
      const pixelsPerMetre = (v.scale[0] * out.width) / 2;
      const surface = scene.normalOct;
      const radiusScale = surface ? (scene.supportMaxM * pixelsPerMetre) / 255 : 0;
      const legacyRadius = Math.ceil(v.size * 0.58);
      this.colors.fill(0);
      for (let i = 0; i < scene.count; i += surface ? 1 : 2) {
        const radius = surface ? scene.support[i] * radiusScale : legacyRadius;
        const major2 = radius * radius + 0.5,
          major = Math.sqrt(major2);
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
        const px = out.width / 2 + (x * v.right[0] + y * v.right[1]) * pixelsPerMetre;
        const py = out.height / 2 - (x * v.up[0] + y * v.up[1] + z * v.up[2]) * pixelsPerMetre;
        if (px < -major || px > out.width + major || py < -major || py > out.height + major)
          continue;
        const depth = x * v.eye[0] + y * v.eye[1] + z * v.eye[2];
        const warm = v.highlight && scene.behind[i];
        let color,
          ax = 1,
          ay = 0,
          stretch = 1,
          slope = 0;
        if (surface) {
          const key = (surface[2 * i] << 8) | surface[2 * i + 1];
          if (!this.colors[key]) this.surfaceStyle(key, v);
          color = warm ? this.hiddenColors[key] : this.colors[key];
          if (scene.lighting) {
            const sides = scene.lighting[2 * i],
              modes = scene.lighting[2 * i + 1];
            const occlusion = this.backFace[key] ? sides >> 4 : sides & 15;
            const shade = v.cut ? modes >> 4 : modes & 15;
            const ambient = Math.min(0.65, (occlusion / 15) ** 2);
            const shadow = shade / 15;
            const dim = 0.245 * shadow + (0.15 + 0.06 * shadow) * ambient;
            const r = Math.round((color & 255) * (1 - 1.055 * dim));
            const g = Math.round(((color >> 8) & 255) * (1 - dim));
            const b = Math.round(((color >> 16) & 255) * (1 - 0.935 * dim));
            color = (255 << 24) | (b << 16) | (g << 8) | r;
          }
          ax = this.axes[4 * key];
          ay = this.axes[4 * key + 1];
          stretch = major2 / (radius * radius * this.axes[4 * key + 2] + 0.5);
          slope = this.axes[4 * key + 3];
        } else {
          const s = clamp((scene.shade[i] / 255 - 0.2) * 1.6, 0, 1);
          const r = warm ? 145 + 110 * s : 94 + 145 * s;
          const g = warm ? 64 + 135 * s : 92 + 140 * s;
          const b = warm ? 41 + 99 * s : 110 + 112 * s;
          color = (255 << 24) | (b << 16) | (g << 8) | r;
        }
        const left = Math.max(0, Math.ceil(px - major - 0.5));
        const right = Math.min(out.width - 1, Math.floor(px + major - 0.5));
        const top = Math.max(0, Math.ceil(py - major - 0.5));
        const bottom = Math.min(out.height - 1, Math.floor(py + major - 0.5));
        for (let j = top; j <= bottom; j++) {
          const dy = py - j - 0.5;
          for (let k = left; k <= right; k++) {
            const dx = k + 0.5 - px;
            const along = dx * ax + dy * ay,
              across = dy * ax - dx * ay;
            if (across * across + along * along * stretch > major2) continue;
            const u = j * out.width + k;
            const z = depth + clamp(along * slope, -major, major) / pixelsPerMetre;
            if (z <= zBuffer[u]) continue;
            zBuffer[u] = z;
            pixels[u] = color;
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
