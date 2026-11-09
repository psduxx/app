/* DUMC website. No dependencies. Terrain shown in the hero is synthetic (seeded noise). */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduceMQ = matchMedia("(prefers-reduced-motion: reduce)");
  const lightMQ = matchMedia("(prefers-color-scheme: light)");
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } },
  };

  // Remove the old root-scope service worker left over from the previous app.
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => { if (new URL(r.scope).pathname === new URL(".", location).pathname) r.unregister(); });
    }).catch(() => {});
  }
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- theme ---------- */
  const themeBtn = $("#theme-btn");
  const themeNow = () => root.getAttribute("data-theme") || (lightMQ.matches ? "light" : "dark");
  const paintTheme = () => {
    const t = themeNow();
    if (themeBtn) {
      themeBtn.querySelector("use").setAttribute("href", t === "dark" ? "#i-sun" : "#i-moon");
      const label = t === "dark" ? "Switch to light theme" : "Switch to dark theme";
      themeBtn.setAttribute("aria-label", label);
      themeBtn.title = label;
    }
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.content = getComputedStyle(root).getPropertyValue("--chrome").trim() || "#181d23";
    document.dispatchEvent(new CustomEvent("dumc:theme"));
  };
  const setTheme = (t) => { root.setAttribute("data-theme", t); store.set("dumc-theme", t); paintTheme(); };
  const toggleTheme = () => setTheme(themeNow() === "dark" ? "light" : "dark");
  if (themeBtn) themeBtn.addEventListener("click", toggleTheme);
  lightMQ.addEventListener("change", () => { if (!root.getAttribute("data-theme")) paintTheme(); });
  paintTheme();

  /* ---------- bar sizes -> CSS vars (keeps content clear of fixed bars) ---------- */
  const topbar = $(".topbar"), bbar = $("#bbar");
  const measure = () => {
    if (topbar) root.style.setProperty("--tbh", topbar.offsetHeight + "px");
    if (bbar) root.style.setProperty("--bbh", bbar.offsetHeight + "px");
  };
  measure();
  if ("ResizeObserver" in window) {
    const ro = new ResizeObserver(measure);
    if (topbar) ro.observe(topbar);
    if (bbar) ro.observe(bbar);
  }

  /* ---------- tabs reflect the section in view ---------- */
  const tabs = $$(".tabs a");
  const tabSecs = tabs.map((a) => document.getElementById(a.hash.slice(1))).filter(Boolean);
  let curTab = null, spyQueued = false;
  const spy = () => {
    spyQueued = false;
    const line = (topbar ? topbar.offsetHeight : 0) + innerHeight * 0.32;
    let cur = null;
    for (const s of tabSecs) if (s.getBoundingClientRect().top <= line) cur = s;
    if (innerHeight + scrollY >= root.scrollHeight - 4 && tabSecs.length) cur = tabSecs[tabSecs.length - 1];
    const id = cur ? cur.id : null;
    if (id === curTab) return;
    curTab = id;
    tabs.forEach((a) => {
      const on = a.hash === "#" + id;
      a.classList.toggle("on", on);
      if (on) {
        a.setAttribute("aria-current", "location");
        const nav = a.parentElement;
        if (nav.scrollWidth > nav.clientWidth) nav.scrollTo({ left: a.offsetLeft - 24, behavior: reduceMQ.matches ? "auto" : "smooth" });
      } else a.removeAttribute("aria-current");
    });
  };
  addEventListener("scroll", () => { if (!spyQueued) { spyQueued = true; requestAnimationFrame(spy); } }, { passive: true });
  addEventListener("resize", spy);
  spy();

  /* ---------- contact form -> email ---------- */
  const interest = $("#f-interest");
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-interest]");
    if (a && interest) interest.value = a.dataset.interest;
  });
  const form = $("#contact-form"), formMsg = $("#form-msg");
  if (form) form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const d = Object.fromEntries(new FormData(form));
    const subject = `Enquiry: ${d.interest}${d.company ? " — " + d.company : ""}`;
    const body = [
      `Name: ${d.name}`,
      d.company ? `Company: ${d.company}` : null,
      `Email: ${d.email}`,
      d.phone ? `Phone: ${d.phone}` : null,
      `Interested in: ${d.interest}`,
      "",
      d.message,
    ].filter((x) => x !== null).join("\n");
    try {
      location.href = `mailto:info@dumc.com.au?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      formMsg.classList.remove("err");
      formMsg.textContent = "Your email app should open with this enquiry filled in. Send it from there.";
    } catch (err) {
      formMsg.classList.add("err");
      formMsg.textContent = "That didn't send. Please email info@dumc.com.au instead.";
    }
  });

  /* ---------- status bar clock (Queensland: AEST, no daylight saving) ---------- */
  const clock = $("#clock");
  if (clock) {
    let fmt;
    try { fmt = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Brisbane", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }); } catch (e) { fmt = null; }
    const tick = () => { if (!document.hidden) clock.textContent = fmt ? fmt.format(new Date()) : new Date().toTimeString().slice(0, 8); };
    tick(); setInterval(tick, 1000);
  }

  /* ---------- command line ---------- */
  const cmd = $("#cmd"), cmdMsg = $("#cmdmsg"), out = $("#cmdout"), outBody = $("#cmdout-body");
  const go = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: reduceMQ.matches ? "auto" : "smooth", block: "start" });
    try { history.replaceState(null, "", "#" + id); } catch (e) { /* file:// */ }
  };
  const COMMANDS = [
    ["help", "List available commands.", () => showHelp()],
    ["services", "Jump to our three ways to engage.", () => go("services")],
    ["capabilities", "Show what we build: 3D, forecasting, vision, networks, AI.", () => go("capabilities")],
    ["pricing", "Compare retainer, fixed-price and product models.", () => go("pricing")],
    ["process", "See how a project runs, from consult to support.", () => go("process")],
    ["contact", "Open the enquiry form.", () => { go("contact"); setTimeout(() => $("#f-name")?.focus({ preventScroll: true }), reduceMQ.matches ? 0 : 450); }],
    ["faq", "Read answers to common questions.", () => go("faq")],
    ["theme", "Switch between the light and dark theme.", () => toggleTheme()],
    ["top", "Back to the top of the page.", () => { scrollTo({ top: 0, behavior: reduceMQ.matches ? "auto" : "smooth" }); try { history.replaceState(null, "", location.pathname); } catch (e) { /* ignore */ } }],
  ];
  const ALIASES = { "?": "help", industries: "industries", home: "top", quote: "contact", engage: "services" };
  let msgTimer = 0;
  const say = (text, err) => {
    clearTimeout(msgTimer);
    cmdMsg.textContent = text;
    cmdMsg.classList.toggle("err", !!err);
    msgTimer = setTimeout(() => { cmdMsg.textContent = ""; }, 6000);
  };
  const hideOut = () => { if (out) out.hidden = true; };
  const showHelp = () => {
    const rows = COMMANDS.map(([n, d]) => `<tr><td><button type="button" data-run="${n}">${n}</button></td><td>${d}</td></tr>`).join("");
    outBody.innerHTML = `<table>${rows}</table><p class="foot-hint">Press / to focus the command line · Tab completes · Esc closes</p>`;
    out.hidden = false;
  };
  const run = (raw) => {
    const input = raw.trim();
    if (!input) return;
    let name = input.toLowerCase().split(/\s+/)[0];
    name = ALIASES[name] || name;
    if (name === "clear" || name === "cls") { hideOut(); say("Cleared."); return; }
    if (name === "industries") { hideOut(); go("industries"); say("Built for work that happens outside the office."); return; }
    const c = COMMANDS.find(([n]) => n === name);
    if (!c) { say(`Command not found: "${input}". Type "help" for options.`, true); return; }
    if (name !== "help") hideOut();
    c[2]();
    say(name === "theme" ? `Theme: ${themeNow()}.` : c[1]);
  };
  if (cmd) {
    const hist = [];
    let hi = 0;
    $("#cmdrow").addEventListener("submit", (e) => {
      e.preventDefault();
      const v = cmd.value;
      if (v.trim()) { hist.push(v.trim()); hi = hist.length; }
      cmd.value = "";
      run(v);
    });
    cmd.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { hideOut(); cmd.blur(); }
      else if (e.key === "ArrowUp" && hist.length) { e.preventDefault(); hi = Math.max(0, hi - 1); cmd.value = hist[hi]; }
      else if (e.key === "ArrowDown" && hist.length) { e.preventDefault(); hi = Math.min(hist.length, hi + 1); cmd.value = hist[hi] || ""; }
      else if (e.key === "Tab" && !e.shiftKey && cmd.value.trim()) {
        const p = cmd.value.trim().toLowerCase();
        const m = COMMANDS.map(([n]) => n).filter((n) => n.startsWith(p));
        if (m.length === 1 && m[0] !== p) { e.preventDefault(); cmd.value = m[0]; }
        else if (m.length > 1) { e.preventDefault(); say(m.join("  ")); }
      }
    });
    outBody.addEventListener("click", (e) => {
      const b = e.target.closest("[data-run]");
      if (b) run(b.dataset.run);
    });
    $("#cmdout-x").addEventListener("click", () => { hideOut(); cmd.focus(); });
    document.addEventListener("keydown", (e) => {
      const t = e.target;
      const typing = t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
      if (e.key === "/" && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); cmd.focus(); }
      else if (e.key === "Escape" && out && !out.hidden) hideOut();
    });
  }

  /* ---------- hero viewport ---------- */
  initViewport();

  function initViewport() {
    const vp = $("#vp"), cv = $("#gl");
    if (!vp || !cv) return;
    let gl = null;
    try { gl = cv.getContext("webgl", { antialias: true, alpha: false, powerPreference: "low-power" }); } catch (e) { gl = null; }
    if (!gl) { $("#nogl").hidden = false; return; }
    const deriv = !!gl.getExtension("OES_standard_derivatives");
    const hp = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    const fprec = hp && hp.precision > 0 ? "highp" : "mediump";

    /* --- terrain model (synthetic) --- */
    const EX = 1200, EY = 900, NX = 161, NY = 121, DX = EX / (NX - 1), DY = EY / (NY - 1);
    const VE = 1.5, Z0 = 150, ZLO = 184, ZHI = 312;
    const H = new Float32Array(NX * NY);
    const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const makeNoise = (seed) => {
      const R = mulberry(seed), perm = Array.from({ length: 256 }, (_, i) => i), p = new Uint8Array(512);
      for (let i = 255; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
      for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
      const G = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
      const g = (h, x, y) => { const v = G[h & 7]; return v[0] * x + v[1] * y; };
      const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
      return (x, y) => {
        const X = Math.floor(x), Y = Math.floor(y), xf = x - X, yf = y - Y, xi = X & 255, yi = Y & 255;
        const aa = p[p[xi] + yi], ab = p[p[xi] + yi + 1], ba = p[p[xi + 1] + yi], bb = p[p[xi + 1] + yi + 1];
        const u = fade(xf), v = fade(yf);
        const x1 = g(aa, xf, yf) + u * (g(ba, xf - 1, yf) - g(aa, xf, yf));
        const x2 = g(ab, xf, yf - 1) + u * (g(bb, xf - 1, yf - 1) - g(ab, xf, yf - 1));
        return x1 + v * (x2 - x1);
      };
    };
    const field = (n, x, y) => {
      const s = 1 / 560;
      const wx = n(x * s * 0.6 + 11.3, y * s * 0.6 - 4.1) * 170, wy = n(x * s * 0.6 - 7.7, y * s * 0.6 + 2.9) * 170;
      const px = (x + wx) * s, py = (y + wy) * s;
      let a = 1, f = 1, sum = 0, norm = 0;
      for (let o = 0; o < 4; o++) { sum += a * n(px * f + o * 17.1, py * f - o * 9.3); norm += a; a *= 0.42; f *= 2.03; }
      const r = 1 - Math.abs(n(px * 0.85 + 3.1, py * 0.85 + 8.2));
      return sum / norm + 0.42 * r * r + 0.12 * (x / EX);
    };
    const hAt = (x, y) => { // bilinear, local coords 0..EX, 0..EY
      const fx = Math.min(Math.max(x / DX, 0), NX - 1.0001), fy = Math.min(Math.max(y / DY, 0), NY - 1.0001);
      const i = fx | 0, j = fy | 0, tx = fx - i, ty = fy - j, k = j * NX + i;
      const a = H[k] + (H[k + 1] - H[k]) * tx, b = H[k + NX] + (H[k + NX + 1] - H[k + NX]) * tx;
      return a + (b - a) * ty;
    };

    /* --- GL programs --- */
    const VS_HEAD = `attribute vec3 aP;uniform vec3 uT,uR,uU,uD;uniform vec2 uS;uniform float uDep,uZ0,uVE;
      vec4 proj(vec3 w){vec3 q=vec3(w.xy,(w.z-uZ0)*uVE)-uT;return vec4(dot(q,uR)*uS.x,dot(q,uU)*uS.y,dot(q,uD)/uDep,1.0);}`;
    const SURF_VS = VS_HEAD + `attribute vec3 aN;attribute float aW;varying vec3 vN;varying float vH,vW;
      void main(){gl_Position=proj(aP);vN=aN;vH=aP.z-uZ0;vW=aW;}`;
    const SURF_FS = (deriv ? "#extension GL_OES_standard_derivatives : enable\n" : "") + `precision ${fprec} float;
      uniform vec3 uLo,uHi,uWallC,uBg,uLine,uL;uniform vec2 uCw;uniform float uCont,uWire,uPx,uHlo,uHhi;varying vec3 vN;varying float vH,vW;
      float cl(float v,float w){${deriv ? "float fw=max(fwidth(v),1e-5);float d=abs(fract(v-0.5)-0.5)/fw;return 1.0-smoothstep(w*0.5-0.5,w*0.5+0.6,d);" : "return 0.0;"}}
      void main(){vec3 n=normalize(vN);float sh=clamp(dot(n,uL),0.0,1.0);float t=clamp((vH-uHlo)/(uHhi-uHlo),0.0,1.0);
        vec3 c=vW>0.5?uWallC*(0.72+0.34*sh):mix(uLo,uHi,sh*0.8+t*0.2);
        if(uWire>0.5)c=mix(c,uBg,vW>0.5?0.55:0.86);
        if(uCont>0.5){float mi=cl(vH/5.0,uPx)*(1.0-vW);float ix=cl(vH/25.0,1.7*uPx);c=mix(c,uLine,max(mi*uCw.x,ix*uCw.y));}
        gl_FragColor=vec4(c,1.0);}`;
    const FLAT_VS = VS_HEAD + `attribute vec2 aO;uniform float uHW,uPt,uBias;
      void main(){vec4 p=proj(vec3(aP.xy+aO*uHW,aP.z));p.z-=uBias;gl_Position=p;gl_PointSize=uPt;}`;
    const FLAT_FS = `precision mediump float;uniform vec4 uC;uniform float uIsPt;
      void main(){if(uIsPt>0.5){vec2 q=abs(gl_PointCoord-0.5);float m=max(q.x,q.y);if(m>0.16&&m<0.31)discard;}gl_FragColor=uC;}`;
    const compile = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const program = (vs, fs) => {
      const p = gl.createProgram();
      gl.attachShader(p, compile(gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      const u = {}, a = {};
      for (let i = 0; i < gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i++) { const n = gl.getActiveUniform(p, i).name; u[n] = gl.getUniformLocation(p, n); }
      for (let i = 0; i < gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES); i++) { const n = gl.getActiveAttrib(p, i).name; a[n] = gl.getAttribLocation(p, n); }
      return { p, u, a };
    };
    let SP, FP;
    try { SP = program(SURF_VS, SURF_FS); FP = program(FLAT_VS, FLAT_FS); } catch (e) { $("#nogl").hidden = false; return; }

    const vbuf = gl.createBuffer(), ibufTri = gl.createBuffer(), ibufWire = gl.createBuffer(), ibufEdge = gl.createBuffer();
    const gridBuf = gl.createBuffer(), ptBuf = gl.createBuffer(), alBuf = gl.createBuffer(), bdBuf = gl.createBuffer();
    let nTri = 0, nWire = 0, nEdge = 0, nGrid = 0, nPts = 0, nAl = 0, nBd = 0;

    /* overlay geometry helpers */
    const catmull = (pts, closed, step) => {
      const out = [], n = pts.length, P = (i) => pts[closed ? (i + n) % n : Math.min(Math.max(i, 0), n - 1)];
      const segs = closed ? n : n - 1;
      for (let s = 0; s < segs; s++) {
        const p0 = P(s - 1), p1 = P(s), p2 = P(s + 1), p3 = P(s + 2);
        const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), m = Math.max(2, Math.ceil(len / step));
        for (let k = 0; k < m; k++) {
          const t = k / m, t2 = t * t, t3 = t2 * t;
          const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
          out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
        }
      }
      out.push(closed ? out[0].slice() : P(n - 1).slice());
      return out;
    };
    const ribbon = (line) => { // -> Float32 [x,y,z,ox,oy] * 2 per sample (centred coords)
      const n = line.length, f = new Float32Array(n * 10);
      for (let i = 0; i < n; i++) {
        const a = line[Math.max(0, i - 1)], b = line[Math.min(n - 1, i + 1)];
        let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
        const x = line[i][0], y = line[i][1], z = hAt(x, y) + 0.8;
        f.set([x - EX / 2, y - EY / 2, z, -ty, tx, x - EX / 2, y - EY / 2, z, ty, -tx], i * 10);
      }
      return f;
    };
    const polyLen = (l) => l.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - l[i - 1][0], p[1] - l[i - 1][1]) : 0), 0);
    const polyArea = (l) => Math.abs(l.reduce((s, p, i) => { const q = l[(i + 1) % l.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
    const nf = (v, d = 0) => v.toLocaleString("en-AU", { minimumFractionDigits: d, maximumFractionDigits: d }).replace(/,/g, " ");

    let seed = 0;
    const build = (s) => {
      seed = s >>> 0;
      const n = makeNoise(seed);
      let mn = Infinity, mx = -Infinity;
      for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const v = field(n, i * DX, j * DY); H[j * NX + i] = v; if (v < mn) mn = v; if (v > mx) mx = v; }
      for (let k = 0; k < H.length; k++) H[k] = ZLO + ((H[k] - mn) / (mx - mn)) * (ZHI - ZLO);

      // vertices: surface grid then four walls (top, bottom pairs). layout x,y,z,nx,ny,nz,wall
      const perim = 2 * (NX + NY);
      const V = new Float32Array((NX * NY + perim * 2) * 7);
      let o = 0;
      for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
        const k = j * NX + i;
        const dzdx = (H[j * NX + Math.min(i + 1, NX - 1)] - H[j * NX + Math.max(i - 1, 0)]) * VE / ((Math.min(i + 1, NX - 1) - Math.max(i - 1, 0)) * DX);
        const dzdy = (H[Math.min(j + 1, NY - 1) * NX + i] - H[Math.max(j - 1, 0) * NX + i]) * VE / ((Math.min(j + 1, NY - 1) - Math.max(j - 1, 0)) * DY);
        const l = Math.hypot(dzdx, dzdy, 1);
        V.set([i * DX - EX / 2, j * DY - EY / 2, H[k], -dzdx / l, -dzdy / l, 1 / l, 0], o); o += 7;
      }
      const tri = [], edge = [];
      const edges = [ // [list of grid indices, normal]
        [Array.from({ length: NX }, (_, i) => i), [0, -1]],
        [Array.from({ length: NX }, (_, i) => (NY - 1) * NX + i), [0, 1]],
        [Array.from({ length: NY }, (_, j) => j * NX), [-1, 0]],
        [Array.from({ length: NY }, (_, j) => j * NX + NX - 1), [1, 0]],
      ];
      let vi = NX * NY;
      for (const [ids, nrm] of edges) {
        const start = vi;
        for (const k of ids) {
          const x = V[k * 7], y = V[k * 7 + 1];
          V.set([x, y, H[k], nrm[0], nrm[1], 0, 1, x, y, Z0, nrm[0], nrm[1], 0, 1], vi * 7); vi += 2;
        }
        for (let m = 0; m < ids.length - 1; m++) {
          const a = start + m * 2, b = a + 2;
          tri.push(a, a + 1, b, b, a + 1, b + 1);
          edge.push(ids[m], ids[m + 1], a + 1, b + 1);
        }
        edge.push(start, start + 1, start + (ids.length - 1) * 2, start + (ids.length - 1) * 2 + 1);
      }
      for (let j = 0; j < NY - 1; j++) for (let i = 0; i < NX - 1; i++) {
        const k = j * NX + i;
        tri.push(k, k + 1, k + NX, k + NX, k + 1, k + NX + 1);
      }
      const wire = [];
      for (let j = 0; j < NY; j += 4) for (let i = 0; i < NX - 1; i++) wire.push(j * NX + i, j * NX + i + 1);
      for (let i = 0; i < NX; i += 4) for (let j = 0; j < NY - 1; j++) wire.push(j * NX + i, (j + 1) * NX + i);
      gl.bindBuffer(gl.ARRAY_BUFFER, vbuf); gl.bufferData(gl.ARRAY_BUFFER, V, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibufTri); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(tri), gl.STATIC_DRAW); nTri = tri.length;
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibufWire); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(wire), gl.STATIC_DRAW); nWire = wire.length;
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibufEdge); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(edge), gl.STATIC_DRAW); nEdge = edge.length;

      // plan grid, every 100 m, just above the highest point
      const G = [];
      for (let x = 100; x < EX; x += 100) G.push(x - EX / 2, -EY / 2, ZHI + 2, 0, 0, x - EX / 2, EY / 2, ZHI + 2, 0, 0);
      for (let y = 100; y < EY; y += 100) G.push(-EX / 2, y - EY / 2, ZHI + 2, 0, 0, EX / 2, y - EY / 2, ZHI + 2, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, gridBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(G), gl.STATIC_DRAW); nGrid = G.length / 5;

      // overlay layers (illustrative): monitoring nodes, a design alignment, a boundary
      const R = mulberry(seed ^ 0x9e3779b9);
      const P = [];
      for (let k = 0; k < 9; k++) {
        const x = 90 + R() * (EX - 180), y = 80 + R() * (EY - 160);
        P.push(x - EX / 2, y - EY / 2, hAt(x, y) + 3, 0, 0);
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, ptBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(P), gl.STATIC_DRAW); nPts = 9;
      const ctrl = [0, 0.22, 0.47, 0.72, 1].map((t) => [40 + t * (EX - 80), EY * (0.3 + 0.4 * R())]);
      const al = catmull(ctrl, false, 5);
      const alR = ribbon(al);
      gl.bindBuffer(gl.ARRAY_BUFFER, alBuf); gl.bufferData(gl.ARRAY_BUFFER, alR, gl.STATIC_DRAW); nAl = alR.length / 5;
      const cx = EX * (0.3 + 0.4 * R()), cy = EY * (0.35 + 0.3 * R());
      const bctrl = Array.from({ length: 7 }, (_, k) => { const a = (k / 7) * Math.PI * 2, r = 0.75 + 0.35 * R(); return [cx + Math.cos(a) * 230 * r, cy + Math.sin(a) * 150 * r]; })
        .map(([x, y]) => [Math.min(Math.max(x, 30), EX - 30), Math.min(Math.max(y, 30), EY - 30)]);
      const bd = catmull(bctrl, true, 5);
      const bdR = ribbon(bd);
      gl.bindBuffer(gl.ARRAY_BUFFER, bdBuf); gl.bufferData(gl.ARRAY_BUFFER, bdR, gl.STATIC_DRAW); nBd = bdR.length / 5;

      // readouts
      const cts = $$("#layers [data-ct]");
      if (cts[0]) cts[0].textContent = "9 nodes";
      if (cts[1]) cts[1].textContent = nf(polyLen(al) / 1000, 2) + " km";
      if (cts[2]) cts[2].textContent = nf(polyArea(bd.slice(0, -1)) / 10000, 1) + " ha";
      let lo = Infinity, hi = -Infinity; for (const v of H) { if (v < lo) lo = v; if (v > hi) hi = v; }
      const hex = "0x" + seed.toString(16).toUpperCase().padStart(4, "0").slice(-4);
      const rl = $('#surf-kv [data-k="rl"]'), sd = $('#surf-kv [data-k="seed"]');
      if (rl) rl.textContent = `${nf(lo, 1)} – ${nf(hi, 1)}`;
      if (sd) sd.textContent = hex;
      $$("[data-seed]").forEach((e) => { e.textContent = "seed " + hex; });
    };

    /* --- view state --- */
    const DEF = { az: 214, el: 33 };
    const st = { az: DEF.az, el: DEF.el, tx: 0, ty: 0, zoom: 1, plan: false, contours: true, wire: false, layers: [true, true, true], active: 0 };
    let W = 1, Hh = 1, dpr = 1, fit = 0.4, ppm = 0.4;
    let col = {};
    const hexRGB = (h) => { h = h.trim().replace("#", ""); if (h.length === 3) h = h.replace(/./g, "$&$&"); const n = parseInt(h.slice(0, 6), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
    const readColours = () => {
      const cs = getComputedStyle(root), v = (n) => hexRGB(cs.getPropertyValue(n) || "#000");
      const light = themeNow() === "light";
      col = {
        bg: v("--vp"), ink: v("--ink"), rule: v("--rule2"), muted: v("--muted"), sel: v("--sel"), acc: v("--accent"), ok: v("--ok"),
        lo: light ? [0.62, 0.66, 0.70] : [0.075, 0.09, 0.105],
        hi: light ? [0.985, 0.99, 0.995] : [0.47, 0.51, 0.55],
        wall: light ? [0.80, 0.83, 0.86] : [0.17, 0.2, 0.235],
        light,
      };
    };
    readColours();

    const basis = () => {
      const a = st.az * Math.PI / 180, e = st.el * Math.PI / 180;
      const D = [-Math.sin(a) * Math.cos(e), -Math.cos(a) * Math.cos(e), -Math.sin(e)];
      const Rv = [-Math.cos(a), Math.sin(a), 0];
      const U = [Rv[1] * D[2] - Rv[2] * D[1], Rv[2] * D[0] - Rv[0] * D[2], Rv[0] * D[1] - Rv[1] * D[0]];
      return { R: Rv, U, D };
    };
    const target = () => [st.tx, st.ty, ((ZLO + ZHI) / 2 - Z0) * VE];
    const computeFit = () => {
      const diag = Math.hypot(EX, EY), relief = (ZHI - Z0) * VE;
      const e = (st.plan ? 90 : DEF.el) * Math.PI / 180;
      const fw = st.plan ? EX : diag, fh = st.plan ? EY : diag * Math.sin(e) + relief * Math.cos(e);
      const narrow = W < 560 && !st.plan; // phones: let corners clip slightly so the surface reads larger
      fit = Math.min((W * (narrow ? 0.98 : 0.86)) / fw, (Hh * 0.8) / fh);
    };
    const resize = () => {
      const r = vp.getBoundingClientRect();
      W = Math.max(1, r.width); Hh = Math.max(1, r.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(W * dpr); cv.height = Math.round(Hh * dpr);
      computeFit();
      requestDraw();
    };

    const setCam = (P, b, T) => {
      gl.uniform3fv(P.u.uT, T); gl.uniform3fv(P.u.uR, b.R); gl.uniform3fv(P.u.uU, b.U); gl.uniform3fv(P.u.uD, b.D);
      gl.uniform2f(P.u.uS, (2 * ppm) / W, (2 * ppm) / Hh);
      gl.uniform1f(P.u.uDep, 1600); gl.uniform1f(P.u.uZ0, Z0); gl.uniform1f(P.u.uVE, VE);
    };
    const bindFlat = (buf, stride) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(FP.a.aP); gl.vertexAttribPointer(FP.a.aP, 3, gl.FLOAT, false, stride, 0);
      if (stride === 20) { gl.enableVertexAttribArray(FP.a.aO); gl.vertexAttribPointer(FP.a.aO, 2, gl.FLOAT, false, 20, 12); }
      else { gl.disableVertexAttribArray(FP.a.aO); gl.vertexAttrib2f(FP.a.aO, 0, 0); }
    };
    const draw = () => {
      ppm = fit * st.zoom;
      const b = basis(), T = target();
      gl.viewport(0, 0, cv.width, cv.height);
      gl.clearColor(col.bg[0], col.bg[1], col.bg[2], 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);

      // surface + walls
      gl.useProgram(SP.p); setCam(SP, b, T);
      gl.bindBuffer(gl.ARRAY_BUFFER, vbuf);
      gl.enableVertexAttribArray(SP.a.aP); gl.vertexAttribPointer(SP.a.aP, 3, gl.FLOAT, false, 28, 0);
      gl.enableVertexAttribArray(SP.a.aN); gl.vertexAttribPointer(SP.a.aN, 3, gl.FLOAT, false, 28, 12);
      gl.enableVertexAttribArray(SP.a.aW); gl.vertexAttribPointer(SP.a.aW, 1, gl.FLOAT, false, 28, 24);
      const sa = 315 * Math.PI / 180, se = 42 * Math.PI / 180;
      gl.uniform3f(SP.u.uL, Math.sin(sa) * Math.cos(se), Math.cos(sa) * Math.cos(se), Math.sin(se));
      gl.uniform3fv(SP.u.uLo, col.lo); gl.uniform3fv(SP.u.uHi, col.hi); gl.uniform3fv(SP.u.uWallC, col.wall);
      gl.uniform3fv(SP.u.uBg, col.bg); gl.uniform3fv(SP.u.uLine, col.ink);
      gl.uniform2f(SP.u.uCw, col.light ? 0.24 : 0.3, col.light ? 0.5 : 0.66);
      gl.uniform1f(SP.u.uCont, st.contours ? 1 : 0); gl.uniform1f(SP.u.uWire, st.wire ? 1 : 0);
      gl.uniform1f(SP.u.uPx, dpr); gl.uniform1f(SP.u.uHlo, ZLO - Z0); gl.uniform1f(SP.u.uHhi, ZHI - Z0);
      gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(1, 1);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibufTri); gl.drawElements(gl.TRIANGLES, nTri, gl.UNSIGNED_SHORT, 0);
      gl.disable(gl.POLYGON_OFFSET_FILL);
      gl.disableVertexAttribArray(SP.a.aN); gl.disableVertexAttribArray(SP.a.aW);

      // lines and overlays
      gl.useProgram(FP.p); setCam(FP, b, T);
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniform1f(FP.u.uIsPt, 0); gl.uniform1f(FP.u.uHW, 0); gl.uniform1f(FP.u.uPt, 1); gl.uniform1f(FP.u.uBias, 0);
      bindFlat(vbuf, 28);
      if (st.wire) {
        gl.uniform4f(FP.u.uC, col.ink[0], col.ink[1], col.ink[2], col.light ? 0.55 : 0.5);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibufWire); gl.drawElements(gl.LINES, nWire, gl.UNSIGNED_SHORT, 0);
      }
      gl.uniform4f(FP.u.uC, col.rule[0], col.rule[1], col.rule[2], 1);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibufEdge); gl.drawElements(gl.LINES, nEdge, gl.UNSIGNED_SHORT, 0);
      if (st.plan) {
        bindFlat(gridBuf, 20);
        gl.uniform4f(FP.u.uC, col.sel[0], col.sel[1], col.sel[2], 0.22);
        gl.drawArrays(gl.LINES, 0, nGrid);
      }
      const hw = (k) => ((st.active === k ? 2.1 : 1.3) * 1) / ppm;
      gl.uniform1f(FP.u.uBias, 0.004);
      if (st.layers[2]) { bindFlat(bdBuf, 20); gl.uniform1f(FP.u.uHW, hw(2)); gl.uniform4f(FP.u.uC, col.ok[0], col.ok[1], col.ok[2], 1); gl.drawArrays(gl.TRIANGLE_STRIP, 0, nBd); }
      if (st.layers[1]) { bindFlat(alBuf, 20); gl.uniform1f(FP.u.uHW, hw(1)); gl.uniform4f(FP.u.uC, col.acc[0], col.acc[1], col.acc[2], 1); gl.drawArrays(gl.TRIANGLE_STRIP, 0, nAl); }
      if (st.layers[0]) {
        bindFlat(ptBuf, 20); gl.uniform1f(FP.u.uHW, 0); gl.uniform1f(FP.u.uIsPt, 1);
        gl.uniform1f(FP.u.uPt, (st.active === 0 ? 14 : 11) * dpr);
        gl.uniform4f(FP.u.uC, col.sel[0], col.sel[1], col.sel[2], 1); gl.drawArrays(gl.POINTS, 0, nPts);
        gl.uniform1f(FP.u.uIsPt, 0);
      }
      gl.disable(gl.BLEND);
      gl.disableVertexAttribArray(FP.a.aO);
      overlays(b);
    };

    /* --- DOM overlays: compass, scale bar, HUD --- */
    const needle = $("#needle"), scBar = $("#sc-bar"), scLbl = $("#sc-lbl");
    const hudEl = {}; $$("#hud [data-h]").forEach((e) => { hudEl[e.dataset.h] = e; });
    const stEl = {}; $$(".st.cur [data-s]").forEach((e) => { stEl[e.dataset.s] = e; });
    const roView = $("#ro-view"), roLayer = $("#ro-layer");
    const overlays = (b) => {
      const ang = Math.atan2(b.R[1], b.U[1]) * 180 / Math.PI;
      needle.style.transform = `rotate(${ang.toFixed(2)}deg)`;
      const raw = Math.min(110, W * 0.24) / ppm, p10 = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p10;
      const L = (m >= 5 ? 5 : m >= 2 ? 2 : 1) * p10;
      scBar.style.width = (L * ppm).toFixed(1) + "px";
      scLbl.textContent = `${nf(L)} m`;
      hudEl.az.textContent = (((st.az % 360) + 360) % 360).toFixed(1) + "°";
      hudEl.el.textContent = st.el.toFixed(1) + "°";
    };
    const setHud = (p) => {
      const v = p ? [p[0].toFixed(1), p[1].toFixed(1), p[2].toFixed(2)] : ["—", "—", "—"];
      ["x", "y", "z"].forEach((k, i) => { hudEl[k].textContent = v[i]; if (stEl[k]) stEl[k].textContent = v[i]; });
    };
    const pick = (mx, my) => { // ray-march the heightfield along the view direction
      const b = basis(), T = target();
      const sx = (mx - W / 2) / ppm, sy = (Hh / 2 - my) / ppm, back = 1400;
      const O = [0, 1, 2].map((i) => T[i] + b.R[i] * sx + b.U[i] * sy - b.D[i] * back);
      const below = (t) => {
        const x = O[0] + b.D[0] * t + EX / 2, y = O[1] + b.D[1] * t + EY / 2, z = O[2] + b.D[2] * t;
        if (x < 0 || y < 0 || x > EX || y > EY) return null;
        return z <= (hAt(x, y) - Z0) * VE;
      };
      let prev = 0;
      for (let t = 0; t < back * 2; t += 2) {
        const r = below(t);
        if (r) {
          let lo = prev, hi = t;
          for (let k = 0; k < 14; k++) { const mid = (lo + hi) / 2; if (below(mid)) hi = mid; else lo = mid; }
          const x = O[0] + b.D[0] * hi + EX / 2, y = O[1] + b.D[1] * hi + EY / 2;
          return [x, y, hAt(x, y)];
        }
        prev = t;
      }
      return null;
    };
    const readouts = () => {
      roView.textContent = "VIEW: " + (st.plan ? "PLAN" : "ORBIT");
      roLayer.textContent = "LAYER: " + (st.contours && st.wire ? "CONTOURS + WIRE" : st.contours ? "CONTOURS" : st.wire ? "WIRE" : "SHADED");
    };

    /* --- loop: auto-orbit only while visible, on screen and motion allowed --- */
    let hudInit = false, raf = 0, last = 0, inView = true, dragging = false, resumeAt = 0, tween = null;
    const active = () => inView && !document.hidden;
    const orbiting = (now) => !reduceMQ.matches && !st.plan && !dragging && now >= resumeAt;
    const frame = (now) => {
      raf = 0;
      const dt = last ? Math.min(now - last, 64) : 16; last = now;
      if (tween) {
        const k = Math.min(1, (now - tween.t0) / tween.dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        for (const key in tween.to) st[key] = tween.from[key] + (tween.to[key] - tween.from[key]) * e;
        if (k >= 1) tween = null;
      } else if (active() && orbiting(now)) st.az += dt * 0.0042;
      draw();
      if (!hudInit) { const p = pick(W / 2, Hh / 2); if (p) { hudInit = true; setHud(p); } }
      if (active() && (tween || orbiting(now) || (now < resumeAt && !dragging && !reduceMQ.matches && !st.plan))) raf = requestAnimationFrame(frame);
      else last = 0;
    };
    function requestDraw() { if (!raf) raf = requestAnimationFrame(frame); }
    const animateTo = (to) => {
      if (reduceMQ.matches) { Object.assign(st, to); tween = null; requestDraw(); return; }
      const from = {}; for (const k in to) from[k] = st[k];
      tween = { from, to, t0: performance.now(), dur: 650 };
      requestDraw();
    };
    const nearAz = (t) => st.az + ((((t - st.az) % 360) + 540) % 360) - 180;

    /* --- controls --- */
    const btns = {}; $$(".vpb").forEach((b) => { btns[b.dataset.v] = b; });
    const syncBtns = () => {
      const on = { plan: st.plan, iso: !st.plan, contours: st.contours, wire: st.wire };
      for (const k in btns) { btns[k].classList.toggle("on", on[k]); btns[k].setAttribute("aria-pressed", on[k]); }
      readouts();
    };
    const setPlan = (plan) => {
      st.plan = plan; computeFit(); syncBtns();
      animateTo(plan ? { az: nearAz(180), el: 90, tx: 0, ty: 0, zoom: 1 } : { az: nearAz(DEF.az), el: DEF.el, tx: 0, ty: 0, zoom: 1 });
    };
    $(".vpbar").addEventListener("click", (e) => {
      const b = e.target.closest(".vpb"); if (!b) return;
      const v = b.dataset.v;
      if (v === "plan" && !st.plan) setPlan(true);
      else if (v === "iso" && st.plan) setPlan(false);
      else if (v === "contours") { st.contours = !st.contours; syncBtns(); requestDraw(); }
      else if (v === "wire") { st.wire = !st.wire; syncBtns(); requestDraw(); }
    });
    $("#compass").addEventListener("click", () => { computeFit(); animateTo(st.plan ? { az: nearAz(180), el: 90, tx: 0, ty: 0, zoom: 1 } : { az: nearAz(DEF.az), el: DEF.el, tx: 0, ty: 0, zoom: 1 }); });
    $("#reseed").addEventListener("click", () => { build((Math.random() * 0xffff) | 0); requestDraw(); });

    // layers panel
    const OFFERS = [
      ["AI technical support", "monthly retainer", "We set up the AI tools your team uses and keep them working, safely and within policy.", "#svc-ai"],
      ["Custom software", "fixed scope · fixed price", "Software built to your specification, quoted up front, paid by milestone, and yours once paid.", "#svc-sw"],
      ["Ready-made products", "subscription · licence · buy-out", "Software we've already built, configured for your data, so you start sooner than with a fresh build.", "#svc-pr"],
    ];
    const rows = $$("#layers .lyr");
    const selectLayer = (k) => {
      st.active = k;
      rows.forEach((r, i) => { r.classList.toggle("active", i === k); const nm = r.querySelector(".nm"); if (i === k) nm.setAttribute("aria-current", "true"); else nm.removeAttribute("aria-current"); });
      const o = OFFERS[k];
      $("#sel-name").textContent = o[0]; $("#sel-eng").textContent = o[1]; $("#sel-desc").textContent = o[2]; $("#sel-link").setAttribute("href", o[3]);
      requestDraw();
    };
    rows.forEach((r, i) => {
      r.querySelector(".nm").addEventListener("click", () => selectLayer(i));
      const t = r.querySelector(".tick");
      t.addEventListener("click", () => {
        st.layers[i] = !st.layers[i];
        t.setAttribute("aria-pressed", st.layers[i]);
        r.classList.toggle("off", !st.layers[i]);
        requestDraw();
      });
    });

    // pointer: drag to orbit (pan in plan), hover for HUD, scroll-zoom once the viewport is engaged
    let armed = false, lx = 0, ly = 0, ptype = "mouse", hoverQ = null, pillT = 0;
    const pill = $("#pill");
    const showPill = (html) => { pill.innerHTML = html; pill.classList.add("on"); clearTimeout(pillT); pillT = setTimeout(() => pill.classList.remove("on"), 1600); };
    cv.addEventListener("pointerdown", (e) => {
      if (e.button > 0) return;
      armed = true; dragging = true; ptype = e.pointerType; lx = e.clientX; ly = e.clientY; tween = null;
      try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      vp.classList.add("drag");
    });
    cv.addEventListener("pointermove", (e) => {
      if (dragging) {
        const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
        if (st.plan) {
          st.tx = Math.min(Math.max(st.tx - dx / ppm, -EX / 2), EX / 2);
          st.ty = Math.min(Math.max(st.ty + dy / ppm, -EY / 2), EY / 2);
        } else {
          st.az -= dx * 0.35;
          if (ptype !== "touch") st.el = Math.min(Math.max(st.el + dy * 0.25, 12), 89);
        }
        resumeAt = performance.now() + 2500;
        requestDraw();
      }
      if (ptype === "touch" && dragging) return;
      const r = cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
      if (!hoverQ) { hoverQ = requestAnimationFrame(() => { hoverQ = null; setHud(pick(mx, my)); }); }
    });
    const endDrag = () => { if (!dragging) return; dragging = false; vp.classList.remove("drag"); resumeAt = performance.now() + 2500; requestDraw(); };
    cv.addEventListener("pointerup", endDrag);
    cv.addEventListener("pointercancel", endDrag);
    cv.addEventListener("pointerleave", () => { armed = false; });
    cv.addEventListener("wheel", (e) => {
      if (!armed) { showPill("<b>Click</b> the viewport, then scroll to zoom"); return; }
      e.preventDefault();
      st.zoom = Math.min(Math.max(st.zoom * Math.exp(-e.deltaY * 0.0015), 0.6), 6);
      resumeAt = performance.now() + 2500;
      requestDraw();
    }, { passive: false });

    // pause off-screen / hidden; react to theme, motion preference and size
    if ("IntersectionObserver" in window) new IntersectionObserver(([en]) => { inView = en.isIntersecting; if (inView) requestDraw(); }).observe(vp);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) requestDraw(); });
    document.addEventListener("dumc:theme", () => { readColours(); requestDraw(); });
    reduceMQ.addEventListener("change", requestDraw);
    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(vp); else addEventListener("resize", resize);
    cv.addEventListener("webglcontextlost", (e) => e.preventDefault());

    build(0x2f7a);
    syncBtns();
    resize();
  }
})();
