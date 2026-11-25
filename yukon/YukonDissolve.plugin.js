/**
 * @name Yukon
 * @author Zanf
 * @version 0.1.0
 * @description Adds an animated Spotify album artwork wallpaper. Requires the Yukon theme.
 */

/* Requiere: "Mostrar Spotify como tu estado". */
module.exports = class YukonDissolve {
  start() {
    "use strict";
    const cleanups = (this.cleanups = []);

    const UserStore = BdApi.Webpack.getStore("UserStore");
    const PresenceStore = BdApi.Webpack.getStore("PresenceStore");
    if (!UserStore || !PresenceStore) {
      BdApi.UI.showToast("YukonDissolve: no encontré PresenceStore/UserStore", { type: "error" });
      return;
    }

    const WALLPAPER_ID = "Yukon-album-wallpaper";
    const TEX_SIZE = 128;
    const FADE_MS = 1000;

    const root = document.documentElement;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const cssNum = (name, fallback) => {
      const v = parseFloat(getComputedStyle(root).getPropertyValue(name));
      return Number.isFinite(v) ? v : fallback;
    };
    const readSettings = () => ({
      brightness: cssNum("--sg-wallpaper-brightness", 1),
      contrast: cssNum("--sg-wallpaper-contrast", 1.3),
      saturation: cssNum("--sg-wallpaper-saturation", 1.9),
      warp: cssNum("--sg-wallpaper-warp", 1),
      speed: cssNum("--sg-wallpaper-speed", 1),
      fps: Math.min(60, Math.max(5, cssNum("--sg-wallpaper-fps", 30))),
      softness: cssNum("--sg-wallpaper-softness", 10),
      res: Math.min(1, Math.max(0.15, cssNum("--sg-wallpaper-res", 1)))
    });
    let settings = readSettings();

    /* ---------- Contenedor ---------- */
    const getWallpaper = () => {
      const host = document.body || root;
      let layer = document.getElementById(WALLPAPER_ID);
      if (!layer) {
        layer = document.createElement("div");
        layer.id = WALLPAPER_ID;
        layer.setAttribute("aria-hidden", "true");
      }
      if (layer.parentElement !== host) host.prepend(layer);
      return layer;
    };

    /* ---------- Portada desde la presencia de Discord ---------- */
    const asHttpUrl = (value) => {
      if (typeof value !== "string" || !value.trim()) return "";
      const raw = value.trim();
      if (raw.startsWith("spotify:image:")) {
        return `https://i.scdn.co/image/${raw.slice("spotify:image:".length)}`;
      }
      if (raw.startsWith("spotify:")) {            
        return `https://i.scdn.co/image/${raw.slice("spotify:".length)}`;
      }
      const internal = raw.match(/^\/?image\/([a-zA-Z0-9]+)(?:\.[a-zA-Z]+)?$/);
      if (internal) return `https://i.scdn.co/image/${internal[1]}`;
      try {
        const url = new URL(raw);
        return ["https:", "http:"].includes(url.protocol) ? url.href : "";
      } catch {
        return "";
      }
    };

    const getActivity = () => {
      const me = UserStore.getCurrentUser()?.id;
      if (!me) return null;
      const acts = PresenceStore.getActivities(me) ?? [];
      return acts.find((a) => a?.name === "Spotify" || String(a?.id ?? "").startsWith("spotify:")) ?? null;
    };

    const failedCovers = new Set();
    const coverFromPresence = () => {
      const a = getActivity();
      const candidates = [a?.assets?.large_image, a?.assets?.small_image];
      return candidates.map(asHttpUrl).find((u) => u && !failedCovers.has(u)) ?? "";
    };

    /* ---------- Preparar la textura (cover → canvas 2D pequeño y suave) ---------- */
    const loadImage = (url) =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
      });

    // BdApi.Net.fetch evita el CSP de Discord; si no existe, fetch normal.
    const fetchBlob = async (url) => {
      const bdFetch = window.BdApi?.Net?.fetch;
      if (bdFetch) {
        try {
          const r = await bdFetch(url);
          if (r.ok) return await r.blob();
        } catch {}
      }
      const res = await fetch(url, { priority: "high" });
      if (!res.ok) throw new Error(String(res.status));
      return await res.blob();
    };

    const prepareCover = async (url, softness) => {
      let bitmap;
      try {
        bitmap = await createImageBitmap(await fetchBlob(url));
      } catch {
        bitmap = await loadImage(url);
      }
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = TEX_SIZE;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      ctx.filter = `blur(${softness}px)`;
      const side = Math.min(bitmap.width, bitmap.height);
      const sx = (bitmap.width - side) / 2;
      const sy = (bitmap.height - side) / 2;
      const pad = softness * 2;
      ctx.drawImage(bitmap, sx, sy, side, side, -pad, -pad, TEX_SIZE + pad * 2, TEX_SIZE + pad * 2);
      bitmap.close?.();
      return canvas;
    };

    /* ---------- WebGL ---------- */
    const VERT = `
      attribute vec2 a_pos;
      varying vec2 v_uv;
      void main() { v_uv = a_pos * 0.5 + 0.5; gl_Position = vec4(a_pos, 0.0, 1.0); }`;

    const FRAG = `
      precision mediump float;
      varying vec2 v_uv;
      uniform sampler2D u_a;
      uniform sampler2D u_b;
      uniform float u_mix, u_time, u_aspect, u_warp, u_sat, u_bright, u_contrast;

      float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

      vec3 tex(sampler2D t, vec2 c, float rot) {
        float s = sin(rot), co = cos(rot);
        c = mat2(co, -s, s, co) * c;
        return texture2D(t, c * 0.9 + 0.5).rgb;
      }

      void main() {
        // "cover" de una textura cuadrada sobre pantalla de cualquier proporción
        vec2 c = v_uv - 0.5;
        if (u_aspect >= 1.0) c.y /= u_aspect; else c.x *= u_aspect;

        float t = u_time;
        vec2 w = vec2(
          sin(c.y * 3.1 + t * 0.55) + sin(c.x * 2.3 - t * 0.41 + 1.7),
          cos(c.x * 2.7 + t * 0.47) + cos(c.y * 1.9 - t * 0.36 + 0.6));
        c += w * 0.09 * u_warp;

        float rot = 0.35 * sin(t * 0.13) + length(c) * 0.9 * sin(t * 0.09);
        vec3 col = mix(tex(u_a, c, rot), tex(u_b, c, rot), u_mix);

        float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col = mix(vec3(l), col, u_sat);
        col = (col - 0.5) * u_contrast + 0.5;
        col *= u_bright;
        col += (hash(gl_FragCoord.xy + fract(t)) - 0.5) * 0.016; // dithering anti-banding
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
      }`;

    const gl_ = { gl: null, prog: null, u: {}, texA: null, texB: null };
    let canvas = null;
    let sources = { a: null, b: null };
    let mode = "none"; // "webgl" | "css"

    const compile = (gl, type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.warn("[Yukon Dissolve] shader:", gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    };

    const makeTexture = (gl) => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([12, 12, 17, 255]));
      return t;
    };

    const upload = (tex, source) => {
      const gl = gl_.gl;
      if (!gl || !tex || !source) return;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    };

    const initGL = () => {
      const gl = canvas.getContext("webgl", {
        alpha: false, antialias: false, depth: false, stencil: false,
        powerPreference: "low-power"
      });
      if (!gl) return false;
      const vs = compile(gl, gl.VERTEX_SHADER, VERT);
      const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
      if (!vs || !fs) return false;
      const prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
      gl.useProgram(prog);

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, "a_pos");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      gl_.gl = gl;
      gl_.prog = prog;
      for (const n of ["u_a", "u_b", "u_mix", "u_time", "u_aspect", "u_warp", "u_sat", "u_bright", "u_contrast"]) {
        gl_.u[n] = gl.getUniformLocation(prog, n);
      }
      gl_.texA = makeTexture(gl);
      gl_.texB = makeTexture(gl);
      gl.uniform1i(gl_.u.u_a, 0);
      gl.uniform1i(gl_.u.u_b, 1);
      upload(gl_.texA, sources.a);
      upload(gl_.texB, sources.b);
      resize();
      return true;
    };

    /* ---------- Render loop ---------- */
    const anim = { time: 0, speed: 1, targetSpeed: 1, mix: 1, fading: false, fadeStart: 0, last: 0, raf: 0, dirty: true };

    const draw = () => {
      const gl = gl_.gl;
      if (!gl || gl.isContextLost()) return;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, gl_.texA);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, gl_.texB);
      gl.uniform1f(gl_.u.u_mix, anim.mix);
      gl.uniform1f(gl_.u.u_time, anim.time);
      gl.uniform1f(gl_.u.u_aspect, canvas.width / canvas.height);
      gl.uniform1f(gl_.u.u_warp, settings.warp);
      gl.uniform1f(gl_.u.u_sat, settings.saturation);
      gl.uniform1f(gl_.u.u_bright, settings.brightness);
      gl.uniform1f(gl_.u.u_contrast, settings.contrast);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      anim.dirty = false;
    };

    const frame = (now) => {
      anim.raf = requestAnimationFrame(frame);
      const interval = 1000 / settings.fps;
      if (anim.last && now - anim.last < interval - 1) return;
      const dt = anim.last ? Math.min((now - anim.last) / 1000, 0.1) : 0;
      anim.last = now;

      anim.speed += (anim.targetSpeed - anim.speed) * Math.min(1, dt * 2);
      anim.time += dt * anim.speed;

      if (anim.fading) {
        const p = Math.min(1, (now - anim.fadeStart) / FADE_MS);
        anim.mix = p * p * (3 - 2 * p);
        if (p >= 1) anim.fading = false;
        anim.dirty = true;
      }
      if (anim.dirty || (!reduceMotion.matches && anim.speed > 0.001)) draw();
    };

    const startLoop = () => {
      if (anim.raf || mode !== "webgl" || document.hidden) return;
      anim.last = 0;
      anim.raf = requestAnimationFrame(frame);
    };
    const stopLoop = () => {
      cancelAnimationFrame(anim.raf);
      anim.raf = 0;
    };

    const resize = () => {
      if (!canvas) return;
      const w = Math.max(2, Math.round(window.innerWidth * settings.res));
      const h = Math.max(2, Math.round(window.innerHeight * settings.res));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl_.gl?.viewport(0, 0, w, h);
      anim.dirty = true;
      if (mode === "webgl" && !anim.raf) draw();
    };

    // Play/pausa: en Discord, la actividad de Spotify existe mientras suena algo.
    const applyPlayState = () => {
      const playing = !!getActivity();
      anim.targetSpeed = reduceMotion.matches ? 0 : settings.speed * (playing ? 1 : 0.1);
    };

    /* ---------- Mostrar una portada nueva ---------- */
    const showWebGL = (source) => {
      if (!sources.a) {
        sources.a = sources.b = source;
        upload(gl_.texA, source);
        upload(gl_.texB, source);
        anim.mix = 1;
        anim.fading = false;
        anim.dirty = true;
        draw();
        canvas.classList.add("is-ready");
      } else {
        [gl_.texA, gl_.texB] = [gl_.texB, gl_.texA];
        sources.a = sources.b;
        sources.b = source;
        upload(gl_.texB, source);
        anim.mix = 0;
        anim.fading = true;
        anim.fadeStart = performance.now();
      }
      startLoop();
    };

    const showFallback = (url, wallpaper) => {
      const layer = document.createElement("div");
      layer.className = "sg-fallback-layer";
      layer.style.setProperty("--sg-cover-url", `url("${url.replace(/["\\\n\r]/g, "")}")`);
      const previous = wallpaper.querySelectorAll(".sg-fallback-layer");
      wallpaper.append(layer);
      setTimeout(() => previous.forEach((p) => p.remove()), FADE_MS + 200);
    };

    /* ---------- Actualización ---------- */
    let currentCover = "";
    let pendingCover = "";

    const update = async () => {
      const wallpaper = getWallpaper();
      const url = coverFromPresence();
      if (!url || url === currentCover || url === pendingCover) return;
      pendingCover = url;
      root.dataset.yukonDissolveCover = "loading";
      settings = readSettings();
      applyPlayState();
      try {
        const source = await prepareCover(url, settings.softness);
        if (pendingCover !== url) return;
        currentCover = url;
        pendingCover = "";
        if (mode === "webgl") showWebGL(source);
        else showFallback(url, wallpaper);
        root.dataset.yukonDissolveCover = "loaded";
      } catch {
        if (pendingCover === url) pendingCover = "";
        failedCovers.add(url);
        root.dataset.yukonDissolveCover = "failed";
        update();
      }
    };

    const onPresence = () => { applyPlayState(); update(); };

    /* ---------- Arranque ---------- */
    root.dataset.yukonDissolveJs = "running";
    const wallpaper = getWallpaper();

    canvas = document.createElement("canvas");
    wallpaper.append(canvas);
    mode = initGL() ? "webgl" : "css";
    if (mode === "css") canvas.remove();
    root.dataset.yukonDissolveMode = mode;

    if (mode === "webgl") {
      const onLost = (e) => { e.preventDefault(); stopLoop(); };
      const onRestored = () => { if (initGL()) { draw(); startLoop(); } };
      let resizeTimer = 0;
      const onResize = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 150); };
      const onVis = () => (document.hidden ? stopLoop() : startLoop());
      const onMotion = () => { applyPlayState(); anim.dirty = true; };

      canvas.addEventListener("webglcontextlost", onLost);
      canvas.addEventListener("webglcontextrestored", onRestored);
      window.addEventListener("resize", onResize);
      document.addEventListener("visibilitychange", onVis);
      reduceMotion.addEventListener?.("change", onMotion);
      cleanups.push(() => {
        clearTimeout(resizeTimer);
        canvas.removeEventListener("webglcontextlost", onLost);
        canvas.removeEventListener("webglcontextrestored", onRestored);
        window.removeEventListener("resize", onResize);
        document.removeEventListener("visibilitychange", onVis);
        reduceMotion.removeEventListener?.("change", onMotion);
      });
    }

    PresenceStore.addChangeListener(onPresence);
    cleanups.push(() => PresenceStore.removeChangeListener(onPresence));

    // Releer las variables CSS por si el tema se inyectó después del plugin.
    const lateSettings = setTimeout(() => { settings = readSettings(); applyPlayState(); resize(); }, 1500);
    cleanups.push(() => clearTimeout(lateSettings));

    const poll = setInterval(update, 2500);
    cleanups.push(() => clearInterval(poll));

    applyPlayState();
    update();

    cleanups.push(() => {
      stopLoop();
      document.getElementById(WALLPAPER_ID)?.remove();
      delete root.dataset.yukonDissolveJs;
      delete root.dataset.yukonDissolveMode;
      delete root.dataset.yukonDissolveCover;
    });
  }

  stop() {
    (this.cleanups ?? []).reverse().forEach((fn) => { try { fn(); } catch {} });
    this.cleanups = [];
  }
};