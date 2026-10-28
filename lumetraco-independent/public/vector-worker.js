/* Independent, deterministic color-region tracing engine. No remote API, no proprietary model. */
(function (root) {
  "use strict";
  if (typeof importScripts === "function") importScripts("/vector-geometry.js", "/vendor/fit-curve.js", "/vector-topology.js", "/vector-edges.js");
  const geometry = typeof module !== "undefined" && module.exports ? require("./vector-geometry.js") : root.VectorGeometry;
  const fitCurve = typeof module !== "undefined" && module.exports ? require("./vendor/fit-curve.js") : root.fitCurve;
  const topology = typeof module !== "undefined" && module.exports ? require("./vector-topology.js") : root.VectorTopology;
  const edgeOperations = typeof module !== "undefined" && module.exports ? require("./vector-edges.js") : root.VectorEdges;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const sq = (a, b) => (a - b) * (a - b);
  function paletteAndLabels(data, w, h, k, smoothing, automatic = false) {
    const n = w * h;
    const channels = new Uint8ClampedArray(data);
    if (smoothing > 0) {
      for (let pass = 0; pass < smoothing; pass++) {
        const prev = new Uint8ClampedArray(channels);
        for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
          const index = (y * w + x) * 4;
          if (prev[index + 3] === 0) continue;
          for (let c = 0; c < 3; c++) {
            let total = 0, denom = 0;
            for (let yy = -1; yy <= 1; yy++) for (let xx = -1; xx <= 1; xx++) {
              const z = ((y + yy) * w + x + xx) * 4;
              if (prev[z + 3] === 0) continue;
              // Edge-aware averaging avoids inventing intermediate colors across strong boundaries.
              if (sq(prev[z],prev[index]) + sq(prev[z+1],prev[index+1]) + sq(prev[z+2],prev[index+2]) > 48 * 48) continue;
              total += prev[z + c] * (xx === 0 && yy === 0 ? 4 : 1);
              denom += xx === 0 && yy === 0 ? 4 : 1;
            }
            channels[index + c] = Math.round(total / (denom || 1));
          }
        }
      }
    }
    const step = Math.max(1, Math.floor(n / 5200));
    const samples = [];
    for (let i = 0; i < n; i += step) {
      const p = i * 4;
      if (channels[p + 3] > 0) samples.push([channels[p], channels[p + 1], channels[p + 2], channels[p + 3]]);
    }
    if (!samples.length) return { colors: [], labels: new Int16Array(n).fill(-1) };
    // Farthest-point seeding avoids random nonreproducible outputs.
    const colors = [[...samples[0]]];
    const distances = new Float64Array(samples.length).fill(Infinity);
    for (let z = 1; z < Math.min(k, samples.length); z++) {
      let candidate = 0, farthest = -1;
      const last = colors[colors.length - 1];
      for (let i = 0; i < samples.length; i++) {
        const s = samples[i];
        const d = sq(s[0], last[0]) + sq(s[1], last[1]) + sq(s[2], last[2]) + sq(s[3], last[3]);
        if (d < distances[i]) distances[i] = d;
        if (distances[i] > farthest) { farthest = distances[i]; candidate = i; }
      }
      if (farthest < (automatic ? 24 * 24 : 1)) break;
      colors.push([...samples[candidate]]);
    }
    for (let iteration = 0; iteration < 7; iteration++) {
      const totals = colors.map(() => [0, 0, 0, 0, 0]);
      for (const s of samples) {
        let nearest = 0, best = Infinity;
        for (let j = 0; j < colors.length; j++) {
          const c = colors[j];
          const d = sq(s[0], c[0]) + sq(s[1], c[1]) + sq(s[2], c[2]) + sq(s[3], c[3]);
          if (d < best) { best = d; nearest = j; }
        }
        const b = totals[nearest]; b[0] += s[0]; b[1] += s[1]; b[2] += s[2]; b[3] += s[3]; b[4]++;
      }
      colors.forEach((c, i) => {
        const t = totals[i];
        if (t[4]) for (let j = 0; j < 4; j++) c[j] = Math.round(t[j] / t[4]);
      });
    }
    const labels = new Int16Array(n).fill(-1);
    for (let i = 0; i < n; i++) {
      const p = i * 4;
      if (channels[p + 3] === 0) continue;
      let nearest = 0, best = Infinity;
      for (let j = 0; j < colors.length; j++) {
        const c = colors[j];
        const d = sq(channels[p], c[0]) + sq(channels[p + 1], c[1]) + sq(channels[p + 2], c[2]) + sq(channels[p + 3], c[3]);
        if (d < best) { best = d; nearest = j; }
      }
      labels[i] = nearest;
    }
    // Conservative 4-neighbor denoising of isolated pixels.
    const old = new Int16Array(labels);
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (old[i] === -1) continue;
      const neighbors = [old[i - 1], old[i + 1], old[i - w], old[i + w]];
      if (smoothing > 0 && neighbors.every(v => v === neighbors[0] && v >= 0) && old[i] !== neighbors[0]) labels[i] = neighbors[0];
    }
    // Absorb tiny connected islands into a neighboring color, never into/out of transparency.
    // Keep this optional: one-pixel artwork is meaningful with noise reduction disabled.
    if (smoothing > 0) {
      const visited = new Uint8Array(n), queue = new Int32Array(n);
      const snapshot = new Int16Array(labels), minimum = smoothing === 1 ? 4 : 12;
      for (let seed = 0; seed < n; seed++) {
        if (visited[seed] || snapshot[seed] < 0) continue;
        const label = snapshot[seed]; let head = 0, tail = 1;
        queue[0] = seed; visited[seed] = 1;
        const border = new Map();
        while (head < tail) {
          const i = queue[head++], x = i % w;
          for (const j of [x ? i-1 : -1, x+1<w ? i+1 : -1, i-w, i+w]) {
            if (j < 0 || j >= n || snapshot[j] < 0) continue;
            if (snapshot[j] === label) { if (!visited[j]) { visited[j]=1; queue[tail++]=j; } }
            else border.set(snapshot[j], (border.get(snapshot[j]) || 0)+1);
          }
        }
        if (tail > minimum || !border.size) continue;
        const candidate = [...border].sort((a,b)=>b[1]-a[1] || a[0]-b[0])[0][0];
        for (let i=0;i<tail;i++) labels[queue[i]]=candidate;
      }
    }
    return { colors, labels };
  }
  function dpOpen(points, tolerance) {
    if (points.length <= 2) return points;
    const keep = new Uint8Array(points.length); keep[0] = 1; keep[points.length - 1] = 1;
    const todo = [[0, points.length - 1]]; const t2 = tolerance * tolerance;
    while (todo.length) {
      const [a, b] = todo.pop();
      const ax = points[a][0], ay = points[a][1], bx = points[b][0], by = points[b][1];
      const len2 = sq(ax, bx) + sq(ay, by);
      let max = 0, target = -1;
      for (let i = a + 1; i < b; i++) {
        const px = points[i][0], py = points[i][1];
        const t = len2 ? clamp(((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / len2, 0, 1) : 0;
        const d = sq(px, ax + t * (bx - ax)) + sq(py, ay + t * (by - ay));
        if (d > max) { max = d; target = i; }
      }
      if (max > t2 && target !== -1) { keep[target] = 1; todo.push([a, target], [target, b]); }
    }
    return points.filter((_, i) => keep[i]);
  }
  function simplifyClosed(points, tolerance) {
    if (points.length < 5) return points;
    let far = 1, max = 0;
    for (let i = 1; i < points.length; i++) {
      const d = sq(points[0][0], points[i][0]) + sq(points[0][1], points[i][1]);
      if (d > max) { max = d; far = i; }
    }
    const first = dpOpen(points.slice(0, far + 1), tolerance);
    const second = dpOpen(points.slice(far).concat([points[0]]), tolerance);
    const combined = first.slice(0, -1).concat(second.slice(0, -1));
    return combined.length >= 3 ? combined : points;
  }
  function traceLabel(labels, w, h, color, detail) {
    const edges = [];
    const outgoing = new Map();
    const pitch = w + 1;
    function push(sx, sy, ex, ey, dir) {
      const start = sy * pitch + sx, end = ey * pitch + ex, id = edges.length;
      edges.push({ sx, sy, end, dir });
      let choices = outgoing.get(start);
      if (!choices) { choices = []; outgoing.set(start, choices); }
      choices.push(id);
    }
    const matches = (x, y) => x >= 0 && y >= 0 && x < w && y < h && labels[y * w + x] === color;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!matches(x, y)) continue;
      if (!matches(x, y - 1)) push(x, y, x + 1, y, 0);
      if (!matches(x + 1, y)) push(x + 1, y, x + 1, y + 1, 1);
      if (!matches(x, y + 1)) push(x + 1, y + 1, x, y + 1, 2);
      if (!matches(x - 1, y)) push(x, y + 1, x, y, 3);
    }
    const visited = new Uint8Array(edges.length);
    const loops = [];
    for (let i = 0; i < edges.length; i++) {
      if (visited[i]) continue;
      let current = i, cursor = 0;
      const points = [], start = edges[i].sy * pitch + edges[i].sx;
      while (cursor++ <= edges.length) {
        if (visited[current]) break;
        const edge = edges[current];
        visited[current] = 1;
        points.push([edge.sx, edge.sy]);
        if (edge.end === start) break;
        const next = (outgoing.get(edge.end) || []).filter(z => !visited[z]);
        if (!next.length) { points.length = 0; break; }
        // Right turn, straight, left turn, back: avoids joining diagonal regions.
        next.sort((a, b) => [1, 0, 3, 2].indexOf((edges[a].dir - edge.dir + 4) % 4) - [1, 0, 3, 2].indexOf((edges[b].dir - edge.dir + 4) % 4));
        current = next[0];
      }
      if (points.length < 3) continue;
      const simplified = detail === 0 ? points : simplifyClosed(points, detail);
      if (simplified.length >= 3) loops.push(simplified.flat());
    }
    return loops;
  }
  function signedArea(loop) {
    let area = 0;
    for (let i = 0; i < loop.length; i += 2) {
      const j = (i + 2) % loop.length;
      area += loop[i] * loop[j + 1] - loop[j] * loop[i + 1];
    }
    return area / 2;
  }
  function containsPoint(loop, x, y) {
    let inside = false;
    for (let i = 0, j = loop.length - 2; i < loop.length; j = i, i += 2) {
      const xi = loop[i], yi = loop[i + 1], xj = loop[j], yj = loop[j + 1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  // Connected positive outlines become individually editable paths; holes stay
  // attached to the smallest enclosing positive outline via even-odd fill.
  function editableRegions(color, loops) {
    const positives = loops.filter(loop => signedArea(loop) > 0).map(loop => ({color, loops: [loop], area: signedArea(loop)}));
    for (const hole of loops.filter(loop => signedArea(loop) < 0)) {
      const candidates = positives.filter(r => containsPoint(r.loops[0], hole[0] + 0.001, hole[1] + 0.001));
      if (candidates.length) {
        candidates.sort((a, b) => a.area - b.area);
        candidates[0].loops.push(hole);
      }
    }
    return positives.map(({color, loops}) => ({color, loops}));
  }
  function fitLoop(loop, tolerance, enabled) {
    const fallback = geometry.loopCommands(loop, {curves:enabled,tolerance});
    if (!enabled || loop.length < 12 || fallback.length === 6 && fallback.filter(c=>c[0]==="C").length === 4) return fallback;
    const points = [];
    for (let i=0;i<loop.length;i+=2) {
      const j=(i+2)%loop.length, length=Math.hypot(loop[j]-loop[i],loop[j+1]-loop[i+1]), steps=Math.max(1,Math.ceil(length));
      for (let k=0;k<steps;k++) points.push([loop[i]+(loop[j]-loop[i])*k/steps,loop[i+1]+(loop[j+1]-loop[i+1])*k/steps]);
    }
    // Use a wider tangent window so single raster steps are not mistaken for design corners.
    const corners=[]; const count=points.length, window=4;
    for(let i=0;i<count;i++) {
      const p=points[i],a=points[(i-window+count)%count],b=points[(i+window)%count];
      const u=[p[0]-a[0],p[1]-a[1]],v=[b[0]-p[0],b[1]-p[1]];
      const cosine=(u[0]*v[0]+u[1]*v[1])/(Math.hypot(...u)*Math.hypot(...v)||1);
      if(cosine<0.5 && (!corners.length || i-corners.at(-1)>window)) corners.push(i);
    }
    if(corners.length>1 && count-corners.at(-1)+corners[0]<=window)corners.pop();
    if(!corners.length)corners.push(0,Math.floor(count/2));
    else if(corners.length===1)corners.push((corners[0]+Math.floor(count/2))%count);
    corners.sort((a,b)=>a-b);
    const commands=[['M',...points[corners[0]]]];
    for(let c=0;c<corners.length;c++) {
      const start=corners[c],end=c+1<corners.length?corners[c+1]:corners[0]+count;
      const segment=[];for(let i=start;i<=end;i++)segment.push(points[i%count]);
      for(const curve of fitCurve(segment,tolerance*tolerance)) {
        if(curve.flat().some(v=>!Number.isFinite(v)))return fallback;
        commands.push(['C',...curve[1],...curve[2],...curve[3]]);
      }
    }
    commands.push(['Z']);
    // Never expand geometry outside the image's existing contour bounds.
    const flat=geometry.flatten(commands,.2).flat();
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    for(let i=0;i<loop.length;i+=2){minX=Math.min(minX,loop[i]);maxX=Math.max(maxX,loop[i]);minY=Math.min(minY,loop[i+1]);maxY=Math.max(maxY,loop[i+1]);}
    for(let i=0;i<flat.length;i+=2)if(flat[i]<minX-tolerance||flat[i]>maxX+tolerance||flat[i+1]<minY-tolerance||flat[i+1]>maxY+tolerance)return fallback;
    const rounded = commands.map(c=>c.map((v,i)=>i?Math.round(v*1000)/1000:v));
    // A fit is an optimization, not a mandatory expansion of every short polygon.
    return geometry.toSvg(rounded).length < geometry.toSvg(fallback).length ? rounded : fallback;
  }
  function vectorize(input) {
    const w = input.width, h = input.height;
    if (!Number.isInteger(w) || !Number.isInteger(h) || w < 1 || h < 1 || w * h > 600000) throw new Error("Invalid working dimensions");
    if (!input.pixels || input.pixels.length !== w * h * 4) throw new Error("Buffer de pixels inválido");
    if (!input.options || ![input.options.colors, input.options.detail, input.options.smoothing].every(Number.isFinite)) throw new Error("Opções de vetorização inválidas");
    const count = input.options.autoColors ? 32 : clamp(Math.round(input.options.colors), 2, 64);
    const detail = clamp(Number(input.options.detail), 0.15, 3);
    const smoothing = clamp(Math.round(input.options.smoothing), 0, 2);
    const { colors, labels } = paletteAndLabels(input.pixels, w, h, count, smoothing, Boolean(input.options.autoColors));
    let paths = [];
    let totalLoops = 0;
    for (let c = 0; c < colors.length; c++) {
      const loops = traceLabel(labels, w, h, c, 0);
      if (!loops.length) continue;
      const hex = "#" + colors[c].slice(0, 3).map(v => Math.round(v).toString(16).padStart(2, "0")).join("");
      totalLoops += loops.length;
      paths.push(...editableRegions(hex, loops).map(path => ({ ...path, opacity: colors[c][3] / 255, commands: [] })));
    }
    const graph = topology.build(paths, dpOpen, (loop, tolerance, enabled) => { const points=[];for(let i=0;i<loop.length;i+=2)points.push([loop[i],loop[i+1]]);return fitLoop(simplifyClosed(points,tolerance).flat(), Math.min(tolerance,.8), enabled); }, detail, input.options.curves !== false);
    paths = graph.paths.map(path => ({...path, loops: path.loops.map(loop => { const points=[]; for(let i=0;i<loop.length;i+=2)points.push([loop[i],loop[i+1]]); return simplifyClosed(points,0).flat(); })}));
    const svgPaths = paths.map(group => {
      const d = geometry.toSvg(group.commands);
      return `<path fill="${group.color}" fill-rule="evenodd" opacity="${group.opacity}" d="${d}"/>`;
    }).join("\n");
    const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${input.outputWidth || w}" height="${input.outputHeight || h}" viewBox="0 0 ${w} ${h}">\n${edgeOperations.gapSvg(paths)}${svgPaths}\n</svg>`;
    return { svg, paths, sharedBoundaryCount: graph.sharedBoundaryCount, nodeCount: paths.reduce((sum, p) => sum + p.commands.filter(c => c[0] !== "Z").length, 0), width: w, height: h, originalWidth: input.outputWidth || w, originalHeight: input.outputHeight || h, totalLoops, paletteSize: new Set(paths.map(path => path.color)).size };
  }
  // Node can test this engine without installing any external package.
  if (typeof module !== "undefined" && module.exports) module.exports = { vectorize, traceLabel, simplifyClosed };
  if (typeof root.addEventListener === "function" && typeof root.postMessage === "function") {
    root.addEventListener("message", event => {
      try { root.postMessage({ type: "done", result: vectorize(event.data) }); }
      catch (error) { root.postMessage({ type: "error", message: error instanceof Error ? error.message : String(error) }); }
    });
  }
})(typeof self !== "undefined" ? self : globalThis);
