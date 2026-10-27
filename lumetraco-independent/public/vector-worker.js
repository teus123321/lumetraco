/* Independent, deterministic color-region tracing engine. No remote API, no proprietary model. */
(function (root) {
  "use strict";
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const sq = (a, b) => (a - b) * (a - b);
  function paletteAndLabels(data, w, h, k, smoothing) {
    const n = w * h;
    const channels = new Uint8ClampedArray(data);
    if (smoothing > 0) {
      for (let pass = 0; pass < smoothing; pass++) {
        const prev = new Uint8ClampedArray(channels);
        for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
          const index = (y * w + x) * 4;
          if (prev[index + 3] < 16) continue;
          for (let c = 0; c < 3; c++) {
            let total = 0, denom = 0;
            for (let yy = -1; yy <= 1; yy++) for (let xx = -1; xx <= 1; xx++) {
              const z = ((y + yy) * w + x + xx) * 4;
              if (prev[z + 3] < 16) continue;
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
      if (channels[p + 3] >= 16) samples.push([channels[p], channels[p + 1], channels[p + 2]]);
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
        const d = sq(s[0], last[0]) + sq(s[1], last[1]) + sq(s[2], last[2]);
        if (d < distances[i]) distances[i] = d;
        if (distances[i] > farthest) { farthest = distances[i]; candidate = i; }
      }
      if (farthest < 1) break;
      colors.push([...samples[candidate]]);
    }
    for (let iteration = 0; iteration < 7; iteration++) {
      const totals = colors.map(() => [0, 0, 0, 0]);
      for (const s of samples) {
        let nearest = 0, best = Infinity;
        for (let j = 0; j < colors.length; j++) {
          const c = colors[j];
          const d = sq(s[0], c[0]) + sq(s[1], c[1]) + sq(s[2], c[2]);
          if (d < best) { best = d; nearest = j; }
        }
        const b = totals[nearest]; b[0] += s[0]; b[1] += s[1]; b[2] += s[2]; b[3]++;
      }
      colors.forEach((c, i) => {
        const t = totals[i];
        if (t[3]) for (let j = 0; j < 3; j++) c[j] = Math.round(t[j] / t[3]);
      });
    }
    const labels = new Int16Array(n).fill(-1);
    for (let i = 0; i < n; i++) {
      const p = i * 4;
      if (channels[p + 3] < 16) continue;
      let nearest = 0, best = Infinity;
      for (let j = 0; j < colors.length; j++) {
        const c = colors[j];
        const d = sq(channels[p], c[0]) + sq(channels[p + 1], c[1]) + sq(channels[p + 2], c[2]);
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
      if (neighbors.every(v => v === neighbors[0] && v >= 0) && old[i] !== neighbors[0]) labels[i] = neighbors[0];
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
      const simplified = simplifyClosed(points, detail);
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
  function vectorize(input) {
    const w = input.width, h = input.height;
    if (!Number.isInteger(w) || !Number.isInteger(h) || w < 1 || h < 1 || w * h > 350000) throw new Error("Invalid working dimensions");
    const count = clamp(Math.round(input.options.colors), 2, 24);
    const detail = clamp(Number(input.options.detail), 0.15, 3);
    const smoothing = clamp(Math.round(input.options.smoothing), 0, 2);
    const { colors, labels } = paletteAndLabels(input.pixels, w, h, count, smoothing);
    const paths = [];
    let totalLoops = 0;
    for (let c = 0; c < colors.length; c++) {
      const loops = traceLabel(labels, w, h, c, detail);
      if (!loops.length) continue;
      const hex = "#" + colors[c].map(v => Math.round(v).toString(16).padStart(2, "0")).join("");
      totalLoops += loops.length;
      paths.push(...editableRegions(hex, loops));
    }
    const svgPaths = paths.map(group => {
      const d = group.loops.map(loop => {
        let s = "M" + loop[0] + " " + loop[1];
        for (let i = 2; i < loop.length; i += 2) s += "L" + loop[i] + " " + loop[i + 1];
        return s + "Z";
      }).join(" ");
      return `<path fill="${group.color}" fill-rule="evenodd" d="${d}"/>`;
    }).join("\n");
    const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${input.outputWidth || w}" height="${input.outputHeight || h}" viewBox="0 0 ${w} ${h}">\n${svgPaths}\n</svg>`;
    return { svg, paths, width: w, height: h, originalWidth: input.outputWidth || w, originalHeight: input.outputHeight || h, totalLoops, paletteSize: new Set(paths.map(path => path.color)).size };
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
