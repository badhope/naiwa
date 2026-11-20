// dist/canvas-compat.js
function prepareGameCanvas(ctx2) {
  if (!ctx2) throw new Error("\u65E0\u6CD5\u521B\u5EFA\u6E38\u620F\u753B\u9762\uFF0C\u8BF7\u91CD\u65B0\u6253\u5F00\u6E38\u620F\u3002");
  if (typeof ctx2.roundRect !== "function") ctx2.roundRect = function(x, y, width, height, radius = 0) {
    if (typeof radius !== "number") throw new TypeError("Game roundRect expects one numeric radius");
    if (radius < 0) throw new RangeError("Corner radius cannot be negative");
    if (![x, y, width, height, radius].every(Number.isFinite)) return;
    if (width < 0) {
      x += width;
      width = -width;
    }
    if (height < 0) {
      y += height;
      height = -height;
    }
    const r = Math.min(radius, width / 2, height / 2), right = x + width, bottom = y + height;
    this.moveTo(x + r, y);
    this.lineTo(right - r, y);
    this.arcTo(right, y, right, y + r, r);
    this.lineTo(right, bottom - r);
    this.arcTo(right, bottom, right - r, bottom, r);
    this.lineTo(x + r, bottom);
    this.arcTo(x, bottom, x, bottom - r, r);
    this.lineTo(x, y + r);
    this.arcTo(x, y, x + r, y, r);
    this.closePath();
    this.moveTo(x, y);
  };
  return ctx2;
}

// dist/game-renderer.js
function gameRenderSize(cssWidth, cssHeight, dpr = 1, maxScale = 2) {
  const density = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  const width = Number.isFinite(cssWidth) && cssWidth > 0 ? cssWidth : 960;
  const height = Number.isFinite(cssHeight) && cssHeight > 0 ? cssHeight : 600;
  const cap = Number.isFinite(maxScale) && maxScale > 0 ? Math.min(2, maxScale) : 2;
  const scale = Math.max(1, Math.min(cap, Math.max(width / 960, height / 600) * density));
  const units = Math.min(120, Math.ceil(60 * scale));
  return { width: units * 16, height: units * 10, scale: units / 60 };
}
function createGameRenderer(canvas2, view = window, { maxScale = 2 } = {}) {
  const context = prepareGameCanvas(canvas2.getContext("2d"));
  let dirty = true, lastDpr, size, cap = Number.isFinite(maxScale) && maxScale > 0 ? Math.min(2, maxScale) : 2;
  const invalidate = () => {
    dirty = true;
  };
  view.addEventListener?.("resize", invalidate);
  view.visualViewport?.addEventListener?.("resize", invalidate);
  const observer = view.ResizeObserver ? new view.ResizeObserver(invalidate) : null;
  observer?.observe(canvas2);
  return {
    context,
    beginFrame() {
      const dpr = view.devicePixelRatio || 1;
      if (dirty || dpr !== lastDpr) {
        size = gameRenderSize(canvas2.clientWidth, canvas2.clientHeight, dpr, cap);
        if (canvas2.width !== size.width || canvas2.height !== size.height) {
          canvas2.width = size.width;
          canvas2.height = size.height;
        }
        dirty = false;
        lastDpr = dpr;
      }
      context.setTransform(size.scale, 0, 0, size.scale, 0, 0);
      context.imageSmoothingEnabled = false;
      context.clearRect(0, 0, 960, 600);
    },
    setMaxScale(value) {
      const next = Number.isFinite(value) && value > 0 ? Math.min(2, value) : 2;
      if (next !== cap) {
        cap = next;
        dirty = true;
      }
    },
    dispose() {
      observer?.disconnect();
      view.removeEventListener?.("resize", invalidate);
      view.visualViewport?.removeEventListener?.("resize", invalidate);
    }
  };
}

// dist/combat-values.js
var BOMB_DAMAGE = 20;
function itemCombatActive(room) {
  return !room.clear || room.sandboxTraining === true;
}
function itemCombatEncounter(room) {
  return room.sandboxTraining === true || !room.clear && ["fight", "challenge", "boss", "vault", "cache"].includes(room.type);
}

// dist/environment-props.js
var BARREL_RADIUS = 105;
function armBarrel(g, barrel) {
  if (barrel.kind !== "barrel" || barrel.fuse !== void 0) return;
  barrel.fuse = 0.85;
  g.emit("toast", { text: "\u7206\u88C2\u6876\u70B9\u71C3\uFF01\u79BB\u5F00\u7EA2\u5708\uFF0C\u53EF\u5F15\u602A\u8FDB\u5165\u7206\u70B8\u8303\u56F4\u3002" });
}
function updateBarrels(g, dt) {
  const lit = g.room.obstacles.filter((o) => o.kind === "barrel" && o.fuse !== void 0);
  for (const barrel of lit) {
    barrel.fuse -= dt;
    if (barrel.fuse > 0) continue;
    g.room.obstacles = g.room.obstacles.filter((o) => o !== barrel);
    g.boom(barrel.x, barrel.y, BARREL_RADIUS, 12);
  }
}
function drawBarrel(ctx2, o, floor) {
  const names3 = ["\u53D1\u9175\u5976\u6876", "\u8FC7\u8F7D\u97F3\u7BB1", "\u71C3\u6599\u8D27\u6876", "\u5E9F\u6599\u7206\u6876", "\u8B66\u6212\u7535\u6C60"];
  if (o.fuse !== void 0) {
    ctx2.fillStyle = "#d8543925";
    ctx2.strokeStyle = "#e27048";
    ctx2.lineWidth = 2;
    ctx2.beginPath();
    ctx2.arc(o.x, o.y, BARREL_RADIUS, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.stroke();
  }
  ctx2.fillStyle = o.fuse !== void 0 ? "#df8d5d" : "#ac7054";
  ctx2.strokeStyle = "#5c4337";
  ctx2.lineWidth = 3;
  ctx2.beginPath();
  ctx2.roundRect(o.x - 19, o.y - 22, 38, 44, 8);
  ctx2.fill();
  ctx2.stroke();
  ctx2.fillStyle = "#f5d98d";
  ctx2.fillRect(o.x - 17, o.y - 13, 34, 6);
  ctx2.fillRect(o.x - 17, o.y + 7, 34, 6);
  ctx2.textAlign = "center";
  ctx2.font = "bold 18px system-ui";
  ctx2.fillStyle = "#5c302b";
  ctx2.fillText("!", o.x, o.y + 6);
  ctx2.font = "10px system-ui";
  ctx2.fillText(o.fuse !== void 0 ? Math.max(0, o.fuse).toFixed(1) + "\u79D2" : names3[floor - 1], o.x, o.y - 29);
}

// dist/tactical-terrain.js
var tile = (c, r, kind, extra2 = {}) => ({ x: 116 + c * 52, y: 92 + r * 52, w: 48, h: 48, r: 24, kind, hp: kind === "crate" ? 3 : Infinity, ...extra2 });
var row = (c, r, n, kind) => Array.from({ length: n }, (_, i) => tile(c + i, r, kind));
var TACTICAL_LAYOUTS = [
  { id: "breach_court", name: "\u7834\u7BB1\u7A81\u56F4\u5EAD", profiles: [1, 3, 7], hint: "\u7BB1\u5899\u9694\u65AD\u706B\u7EBF\uFF1B\u51FB\u7206\u4E2D\u95F4\u7684\u6876\u53EF\u62C6\u5899\u4F24\u654C\uFF0C\u6CE8\u610F\u7EA2\u5708", build: () => [...row(5, 3, 5, "crate"), ...row(5, 5, 5, "crate"), tile(3, 3, "pillar"), tile(11, 5, "pillar"), tile(7, 4, "barrel", { w: 38, h: 44, r: 22, hp: 2 })], hazards: () => [] },
  { id: "bridge_choice", name: "\u70B8\u77F3\u642D\u6865\u6E20", profiles: [2, 5, 6], hint: "\u5916\u56F4\u53EF\u4EE5\u7ED5\u884C\uFF1B\u70B8\u6389\u6807\u6709\u7BAD\u5934\u7684\u6865\u77F3\uFF0C\u53EF\u586B\u5E73\u65C1\u8FB9\u5751\u6D1E\u5F00\u8FD1\u8DEF", build: () => [...row(3, 3, 4, "pit"), ...row(8, 5, 4, "pit"), tile(5, 2, "rock", { bridgeTo: { x: 376, y: 248 } }), tile(9, 6, "rock", { bridgeTo: { x: 584, y: 352 } }), tile(3, 6, "crate"), tile(11, 2, "crate")], hazards: () => [] },
  { id: "hook_corridor", name: "\u53CC\u94A9\u7ED5\u884C\u5ECA", profiles: [0, 4, 6], hint: "\u77F3\u5899\u8BA9\u8FFD\u5175\u7ED5\u8DEF\uFF1B\u628A\u602A\u5F15\u5411\u7206\u88C2\u6876\uFF0C\u8FDE\u9501\u7206\u70B8\u6709\u72EC\u7ACB\u9884\u8B66", build: () => [...row(3, 2, 3, "rock"), tile(5, 3, "rock"), tile(5, 4, "crate"), ...row(9, 6, 3, "rock"), tile(9, 5, "rock"), tile(9, 4, "crate"), tile(7, 3, "barrel", { w: 38, h: 44, r: 22, hp: 2 }), tile(7, 5, "barrel", { w: 38, h: 44, r: 22, hp: 2 })], hazards: () => [] },
  { id: "cover_exchange", name: "\u9519\u4F4D\u6362\u9632\u573A", profiles: [1, 3, 7], hint: "\u63A9\u4F53\u4E4B\u95F4\u7559\u6709\u6A2A\u5411\u901A\u8DEF\uFF0C\u6362\u63A9\u4F53\u63A5\u8FD1\u5C04\u624B\uFF1B\u62C6\u7BB1\u4E5F\u4F1A\u66B4\u9732\u81EA\u5DF1", build: () => [...row(3, 3, 2, "pillar"), ...row(10, 5, 2, "pillar"), ...row(6, 2, 3, "crate"), ...row(6, 6, 3, "crate"), tile(3, 6, "rock"), tile(11, 2, "rock")], hazards: () => [] }
];
var preferences = {
  shelves: [1, 3, 7],
  island: [2, 5],
  slalom: [0, 4, 6],
  cross: [1, 6, 7],
  bridge: [2, 5],
  bunker: [1, 3],
  shortcut: [0, 3, 4],
  banks: [1, 2, 5],
  twin_nests: [1, 3],
  broken_ring: [0, 4, 6],
  crate_steps: [0, 3, 7],
  split_pools: [2, 5],
  milk_valves: [2, 3],
  milk_reservoir: [2, 5],
  milk_aisles: [0, 4, 6],
  milk_drain: [1, 7],
  echo_lanes: [0, 2, 6],
  duet_stage: [1, 3],
  sound_stage: [4, 7],
  sound_wings: [1, 5],
  reversing_sorter: [0, 4, 6],
  lift_conveyors: [1, 7],
  belt_cross: [2, 5],
  loading_bay: [3, 4],
  assembly_feeders: [0, 2, 6],
  scrap_workshop: [3, 4],
  press_line: [1, 7],
  reject_bins: [2, 5],
  power_cells: [2, 3],
  prison_circuit: [1, 7],
  cage_cells: [0, 4],
  warden_cross: [5, 6]
};
function layoutAffinity(layout, profile) {
  return (layout.profiles || preferences[layout.id] || []).includes(profile) ? 1 : 0;
}
function selectLayouts(g, common, chapters) {
  const rooms = g.rooms.filter((r) => r.exists && ["fight", "challenge"].includes(r.type)), remaining = [...rooms], result = /* @__PURE__ */ new Map();
  function assign(layout) {
    const best2 = Math.max(...remaining.map((r) => layoutAffinity(layout, r.encounterProfile))), options = remaining.filter((r) => layoutAffinity(layout, r.encounterProfile) === best2);
    const room = options[Math.floor(g.random() * options.length)];
    result.set(room.id, layout);
    remaining.splice(remaining.indexOf(room), 1);
  }
  for (const layout of chapters) if (remaining.length) assign(layout);
  const tactical = TACTICAL_LAYOUTS.filter((l) => remaining.some((r) => layoutAffinity(l, r.encounterProfile)));
  if (remaining.length) assign(tactical[Math.floor(g.random() * tactical.length)] || TACTICAL_LAYOUTS[0]);
  const available = common.filter((l) => ![...result.values()].includes(l));
  for (const room of remaining) {
    const best2 = Math.max(...available.map((l) => layoutAffinity(l, room.encounterProfile))), options = available.filter((l) => layoutAffinity(l, room.encounterProfile) === best2), layout = options[Math.floor(g.random() * options.length)];
    result.set(room.id, layout);
    available.splice(available.indexOf(layout), 1);
  }
  return result;
}
function fillBridgeSlots(room, broken) {
  const filled = [];
  for (const rock of broken) {
    if (!rock.bridgeTo) continue;
    const pit = room.obstacles.find((o) => o.kind === "pit" && o.x === rock.bridgeTo.x && o.y === rock.bridgeTo.y);
    if (!pit) continue;
    room.obstacles = room.obstacles.filter((o) => o !== pit);
    const bridge = { x: pit.x, y: pit.y, w: pit.w, h: pit.h };
    (room.bridges ??= []).push(bridge);
    filled.push(bridge);
  }
  return filled;
}

// dist/encounter-budget.js
function encounterCount(room, floor) {
  const roll = Math.floor((room.seed || 0) / 3) % 3;
  if (room.type === "vault") return 4 + roll;
  if (room.type === "cache") return 3 + roll;
  return Math.max(4, 5 + floor + roll + (room.type === "challenge" ? 1 : 0) - (room.crowdingPenalty || 0));
}

// dist/mechanic-layouts.js
var tile2 = (c, r, kind) => ({ x: 116 + c * 52, y: 92 + r * 52, w: 48, h: 48, r: 24, kind, hp: kind === "crate" ? 3 : Infinity });
var row2 = (c, r, n, kind) => Array.from({ length: n }, (_, i) => tile2(c + i, r, kind));
var device = (x, y, kind, channel = "a") => ({ x, y, w: 40, h: 40, r: 20, device: true, kind, channel, hp: kind === "assembler" ? 6 : 4, maxHp: kind === "assembler" ? 6 : 4, disabled: 0, timer: 3.5, spawned: 0 });
var h = (x, y, w, height, kind, extra2 = {}) => ({ x, y, w, h: height, kind, phase: 0, ...extra2 });
var MECHANIC_LAYOUTS = [
  [
    { id: "milk_valves", name: "\u6CC4\u5976\u9600\u95F4", hint: "\u6253\u7834\u5976\u9600\uFF0C\u6E05\u8D70\u9644\u8FD1\u654C\u65B9\u5976\u8FF9\u5E76\u53CD\u5411\u55B7\u5976", build: () => [device(350, 190, "milkValve"), device(610, 410, "milkValve"), ...row2(3, 5, 3, "crate"), ...row2(9, 2, 3, "rock")] },
    { id: "milk_reservoir", name: "\u5976\u6C60\u6CC4\u6D41\u53E3", hint: "\u7ED5\u8FC7\u4E24\u5EA7\u5976\u6C60\uFF0C\u4ECE\u4FA7\u9762\u6253\u6389\u5976\u9600\u6E05\u51FA\u5B89\u5168\u5730\u9762", build: () => [...row2(3, 3, 4, "pit"), ...row2(8, 5, 4, "pit"), device(610, 195, "milkValve"), device(350, 410, "milkValve"), tile2(7, 2, "crate")] }
  ],
  [
    { id: "echo_lanes", name: "\u4E09\u62CD\u5171\u632F\u5ECA", hint: "\u4E09\u6761\u97F3\u6CE2\u5E26\u4F9D\u6B21\u4EAE\u8D77\uFF1B\u6253\u6389\u5171\u632F\u5668\u80FD\u505C\u673A 4 \u79D2", build: () => [device(220, 200, "resonator"), ...row2(10, 2, 2, "crate"), ...row2(3, 6, 2, "pillar")], hazards: () => [0, 1, 2].map((i) => h(480, 200 + i * 100, 340, 40, "resonance", { phase: i * 1.1, channel: "a" })) },
    { id: "duet_stage", name: "\u53CC\u58F0\u9053\u821E\u53F0", hint: "\u5DE6\u53F3\u821E\u53F0\u4EA4\u9519\u5171\u632F\uFF0C\u5206\u522B\u51FB\u6253\u4E24\u4FA7\u97F3\u7BB1\u5173\u95ED\u5BF9\u5E94\u533A\u57DF", build: () => [device(220, 180, "resonator", "a"), device(740, 420, "resonator", "b"), tile2(7, 2, "pillar"), tile2(7, 6, "pillar")], hazards: () => [h(300, 320, 200, 110, "resonance", { channel: "a" }), h(660, 280, 200, 110, "resonance", { phase: 1.9, channel: "b" })] }
  ],
  [
    { id: "reversing_sorter", name: "\u6362\u5411\u5206\u62E3\u5E26", hint: "\u4E24\u6761\u4F20\u9001\u5E26\u6BCF 4 \u79D2\u6362\u5411\uFF1B\u501F\u987A\u98CE\u7ED5\u5F00\u53C9\u8F66\u7684\u9501\u5B9A\u8DEF\u7EBF", build: () => [...row2(5, 2, 2, "crate"), ...row2(8, 6, 2, "crate"), tile2(3, 2, "pillar"), tile2(11, 6, "pillar")], hazards: () => [h(310, 300, 100, 300, "belt", { dx: 1, dy: 0, reverse: true, power: 120 }), h(650, 300, 100, 300, "belt", { dx: -1, dy: 0, reverse: true, power: 120 })] },
    { id: "lift_conveyors", name: "\u7EB5\u6A2A\u8F6C\u8FD0\u53E3", hint: "\u7AD6\u5411\u4F20\u9001\u5E26\u4F1A\u628A\u4F60\u9001\u5411\u4FA7\u8DEF\uFF0C\u5229\u7528\u8D27\u7BB1\u5207\u65AD\u6295\u5305\u88F9\u5DE5\u7684\u89C6\u7EBF", build: () => [...row2(4, 4, 2, "crate"), ...row2(9, 4, 2, "crate"), tile2(7, 2, "pillar"), tile2(7, 6, "pillar")], hazards: () => [h(280, 300, 95, 300, "belt", { dx: 0, dy: 1, reverse: true, power: 110 }), h(680, 300, 95, 300, "belt", { dx: 0, dy: -1, reverse: true, power: 110 })] }
  ],
  [
    { id: "assembly_feeders", name: "\u9020\u5076\u6295\u6599\u7EBF", hint: "\u9020\u602A\u53E3\u4F1A\u5410\u51FA\u788E\u5E03\u602A\uFF1B\u6253\u6389 6 \u8840\u7684\u673A\u5668\uFF0C\u6216\u5F15\u602A\u8D70\u8FDB\u538B\u673A", build: () => [device(240, 190, "assembler"), ...row2(8, 2, 3, "crate"), ...row2(3, 6, 3, "rock")], hazards: () => [h(400, 300, 95, 150, "press"), h(660, 300, 95, 150, "press", { phase: 2.25 })] },
    { id: "scrap_workshop", name: "\u5E9F\u5076\u8FD4\u4FEE\u95F4", hint: "\u4F18\u5148\u6467\u6BC1\u9020\u602A\u53E3\u3001\u6253\u65AD\u7F1D\u8865\u5DE5\uFF1B\u4E24\u7EC4\u538B\u673A\u4EA4\u66FF\u843D\u4E0B", build: () => [device(720, 190, "assembler"), tile2(4, 2, "pillar"), tile2(10, 6, "pillar"), ...row2(5, 5, 3, "crate")], hazards: () => [h(300, 290, 130, 90, "press"), h(660, 390, 130, 90, "press", { phase: 2.25 })] }
  ],
  [
    { id: "power_cells", name: "\u53CC\u8DEF\u4F9B\u7535\u7262\u623F", hint: "\u51FB\u574F\u7D2B\u8272\u4F9B\u7535\u67F1\u53EF\u5173\u95ED\u5BF9\u5E94\u7535\u7F51 4 \u79D2\uFF0C\u8D81\u65AD\u7535\u7A7F\u8D8A\u706B\u7EBF", build: () => [device(230, 190, "relay", "a"), device(730, 410, "relay", "b"), tile2(7, 2, "pillar"), tile2(7, 6, "pillar")], hazards: () => [h(330, 300, 55, 260, "electric", { channel: "a" }), h(630, 300, 55, 260, "electric", { phase: 1.9, channel: "b" })] },
    { id: "prison_circuit", name: "\u5DE1\u706F\u65AD\u7535\u5ECA", hint: "\u63A2\u7167\u773C\u4EA4\u53C9\u5C04\u51FB\uFF1B\u70B8\u5F39\u4E5F\u80FD\u6253\u65AD\u4F9B\u7535\uFF0C\u4E2D\u592E\u7559\u6709\u6362\u4F4D\u7F3A\u53E3", build: () => [device(220, 400, "relay"), device(740, 200, "relay", "b"), ...row2(4, 2, 2, "crate"), ...row2(9, 6, 2, "crate")], hazards: () => [h(310, 260, 220, 45, "electric", { channel: "a" }), h(650, 340, 220, 45, "electric", { phase: 1.9, channel: "b" })] }
  ]
];

// dist/mob-catalog.js
var CHAPTER_MOBS = {
  beatling: { name: "\u8E29\u62CD\u9F13\u4ED4", chapter: 2, color: "#bc91aa", mark: "\u62CD", speed: 150 },
  curdling: { name: "\u80C0\u5976\u56E2", chapter: 1, color: "#ded4a5", mark: "\u80C0", speed: 110 },
  milkSkater: { name: "\u6ED1\u5976\u4ED4", chapter: 1, color: "#9bbda8", mark: "\u6ED1", speed: 145 },
  echoBell: { name: "\u56DE\u58F0\u94C3", chapter: 2, color: "#b6a0d3", mark: "\u54CD", speed: 0, shoot: true },
  conductor: { name: "\u50AC\u62CD\u6307\u6325", chapter: 2, color: "#8c82b0", mark: "\u62CD", speed: 80, shoot: true },
  parcelThrower: { name: "\u6295\u5305\u88F9\u5DE5", chapter: 3, color: "#c9a077", mark: "\u5305", speed: 70, shoot: true },
  forklift: { name: "\u66B4\u8D70\u53C9\u8F66", chapter: 3, color: "#c5ad64", mark: "\u53C9", speed: 110, shoot: true },
  stitchMedic: { name: "\u7F1D\u8865\u5DE5", chapter: 4, color: "#b8bdaa", mark: "\u8865", speed: 70, shoot: true },
  scrapMine: { name: "\u53D1\u6761\u5E9F\u5076", chapter: 4, color: "#ce927e", mark: "\u7206", speed: 210 },
  lockSentry: { name: "\u5C01\u8DEF\u72F1\u5352", chapter: 5, color: "#9a82ad", mark: "\u9501", speed: 90, shoot: true },
  prismEye: { name: "\u63A2\u7167\u773C", chapter: 5, color: "#c0a573", mark: "\u5DE1", speed: 0, shoot: true }
};

// dist/encounter-profiles.js
var ENCOUNTER_PROFILES = [
  { id: "pursuit", name: "\u8FFD\u51FB\u7FA4", formation: "pincer", hint: "\u5730\u9762\u8FFD\u5175\u4E3A\u4E3B\uFF0C\u8FB9\u79FB\u52A8\u8FB9\u6E05\u51FA\u9000\u8DEF\u3002" },
  { id: "battery", name: "\u70AE\u53F0\u9635\u5730", formation: "rear", hint: "\u56FA\u5B9A\u706B\u529B\u5B88\u540E\u6392\uFF0C\u501F\u63A9\u4F53\u9010\u4E2A\u7A81\u7834\u3002" },
  { id: "hazard", name: "\u5C01\u8DEF\u5C0F\u961F", formation: "split", hint: "\u4F18\u5148\u5904\u7406\u5236\u9020\u5371\u9669\u533A\u57DF\u7684\u602A\uFF0C\u522B\u8BA9\u9000\u8DEF\u88AB\u5C01\u4F4F\u3002" },
  { id: "escort", name: "\u6838\u5FC3\u62A4\u536B", formation: "escort", hint: "\u6838\u5FC3\u602A\u8EB2\u5728\u62A4\u536B\u540E\u65B9\uFF0C\u7ED5\u4FA7\u9762\u5148\u5904\u7406\u5B83\u3002" },
  { id: "heavy", name: "\u91CD\u88C5\u961F", formation: "line", hint: "\u8010\u6253\u7684\u524D\u6392\u63A8\u8FDB\uFF0C\u5229\u7528\u969C\u788D\u5206\u5F00\u5B83\u4EEC\u3002" },
  { id: "airborne", name: "\u98DE\u6251\u5DE2", formation: "ring", hint: "\u98DE\u6251\u602A\u80FD\u8D8A\u8FC7\u5751\u6D1E\uFF0C\u4FDD\u6301\u79FB\u52A8\uFF0C\u4E0D\u8981\u4F9D\u8D56\u5730\u5F62\u6321\u8FFD\u5175\u3002" },
  { id: "flank", name: "\u4E24\u7FFC\u5939\u653B", formation: "pincer", hint: "\u4E24\u4FA7\u90FD\u6709\u8FFD\u5175\uFF0C\u5148\u96C6\u4E2D\u6E05\u6389\u4E00\u7FFC\u3002" },
  { id: "skirmish", name: "\u6E38\u51FB\u5C0F\u961F", formation: "split", hint: "\u79FB\u52A8\u5C04\u624B\u914D\u5408\u8FD1\u8EAB\u602A\uFF0C\u8FFD\u51FB\u65F6\u7559\u610F\u80CC\u540E\u3002" }
];
var ENCOUNTERS = [
  [
    ["runner", "milkSkater", "milkleak", "milkSkater", "milkleak", "milkSkater"],
    ["milkspitter", "turret", "milkspitter", "shooter", "shooter", "shooter"],
    ["curdling", "milkleak", "milkSkater", "curdling", "milkleak", "milkSkater"],
    ["milkspitter", "brute", "milkSkater", "brute", "milkSkater", "brute"],
    ["brute", "curdling", "brute", "curdling", "brute", "curdling"],
    ["hopper", "hopper", "milkSkater", "hopper", "hopper", "milkSkater"],
    ["runner", "curdling", "milkSkater", "curdling", "milkSkater", "curdling"],
    ["shooter", "milkleak", "shooter", "milkleak", "shooter", "milkleak"]
  ],
  [
    ["runner", "beatling", "beatling", "brute", "beatling", "beatling"],
    ["echoBell", "soundTurret", "echoBell", "shooter", "shooter", "shooter"],
    ["soundTurret", "beatling", "echoBell", "beatling", "beatling", "beatling"],
    ["conductor", "brute", "beatling", "brute", "beatling", "brute"],
    ["brute", "brute", "soundTurret", "brute", "brute", "brute"],
    ["hopper", "hopper", "beatling", "hopper", "hopper", "beatling"],
    ["runner", "beatling", "echoBell", "beatling", "echoBell", "beatling"],
    ["shooter", "conductor", "beatling", "shooter", "beatling", "shooter"]
  ],
  [
    ["runner", "loader", "loader", "forklift", "loader", "loader"],
    ["turret", "parcelThrower", "turret", "parcelThrower", "turret", "parcelThrower"],
    ["parcelThrower", "forklift", "loader", "parcelThrower", "loader", "loader"],
    ["parcelThrower", "brute", "loader", "brute", "loader", "brute"],
    ["forklift", "brute", "forklift", "brute", "brute", "brute"],
    ["hopper", "hopper", "loader", "hopper", "hopper", "loader"],
    ["runner", "forklift", "loader", "forklift", "loader", "loader"],
    ["shooter", "loader", "parcelThrower", "loader", "shooter", "loader"]
  ],
  [
    ["runner", "stitchling", "scrapMine", "stitchling", "scrapMine", "stitchling"],
    ["dollTurret", "shooter", "dollTurret", "shooter", "dollTurret", "shooter"],
    ["scrapMine", "scrapMine", "stitchling", "scrapMine", "scrapMine", "stitchling"],
    ["stitchMedic", "brute", "stitchling", "brute", "stitchling", "brute"],
    ["brute", "stitchling", "brute", "stitchling", "brute", "stitchling"],
    ["hopper", "hopper", "scrapMine", "hopper", "hopper", "scrapMine"],
    ["runner", "stitchling", "dollTurret", "stitchling", "dollTurret", "stitchling"],
    ["shooter", "scrapMine", "shooter", "stitchling", "shooter", "scrapMine"]
  ],
  [
    ["runner", "jailer", "jailer", "brute", "jailer", "jailer"],
    ["prismEye", "warden", "prismEye", "shooter", "shooter", "shooter"],
    ["lockSentry", "jailer", "lockSentry", "jailer", "lockSentry", "jailer"],
    ["lockSentry", "brute", "jailer", "brute", "jailer", "brute"],
    ["brute", "warden", "brute", "brute", "warden", "brute"],
    ["hopper", "hopper", "jailer", "hopper", "hopper", "jailer"],
    ["runner", "jailer", "prismEye", "jailer", "prismEye", "jailer"],
    ["shooter", "jailer", "lockSentry", "shooter", "jailer", "shooter"]
  ]
];
var CHAPTER_NAMES = [
  ["\u6ED1\u5976\u8FFD\u9010\u573A", "\u6295\u74F6\u70AE\u53F0\u9635", "\u6EA2\u5976\u5C01\u8DEF\u95F4", "\u5976\u74F6\u62A4\u9001\u961F", "\u80C0\u5976\u91CD\u88C5\u961F", "\u5976\u68DA\u98DE\u6251\u5DE2", "\u8857\u89D2\u4E24\u9762\u5939\u51FB", "\u6F0F\u5976\u6E38\u51FB\u961F"],
  ["\u8282\u62CD\u8FFD\u9010\u573A", "\u56DE\u58F0\u70AE\u53F0\u9635", "\u5C16\u5578\u5C01\u8DEF\u95F4", "\u6307\u6325\u62A4\u536B\u961F", "\u5267\u573A\u91CD\u88C5\u961F", "\u4FA7\u5E55\u98DE\u6251\u5DE2", "\u53CC\u7FFC\u5939\u594F\u95F4", "\u6D41\u52A8\u4E50\u961F"],
  ["\u642C\u8FD0\u8FFD\u9010\u573A", "\u88C5\u5378\u706B\u529B\u70B9", "\u5305\u88F9\u5C01\u8DEF\u95F4", "\u6295\u5305\u62A4\u536B\u961F", "\u53C9\u8F66\u91CD\u88C5\u961F", "\u9AD8\u67B6\u98DE\u6251\u5DE2", "\u4E24\u7EBF\u5305\u6284\u961F", "\u8FD0\u8F93\u6E38\u51FB\u961F"],
  ["\u5E9F\u5076\u8FFD\u9010\u573A", "\u62FC\u88C5\u70AE\u53F0\u9635", "\u81EA\u7206\u5E9F\u6599\u95F4", "\u7F1D\u8865\u62A4\u536B\u961F", "\u6B21\u54C1\u91CD\u88C5\u961F", "\u5E9F\u6599\u98DE\u6251\u5DE2", "\u4E24\u7FFC\u62FC\u7F1D\u961F", "\u5E9F\u5076\u6E38\u51FB\u961F"],
  ["\u72F1\u5352\u8FFD\u9010\u573A", "\u63A2\u7167\u70AE\u53F0\u9635", "\u5C01\u9501\u5DE1\u903B\u95F4", "\u5C01\u8DEF\u62A4\u536B\u961F", "\u7262\u7B3C\u91CD\u88C5\u961F", "\u7262\u9876\u98DE\u6251\u5DE2", "\u53CC\u4FA7\u8FFD\u6355\u961F", "\u5DE1\u903B\u6E38\u51FB\u961F"]
];
function profileIndex(room) {
  return room.encounterProfile ?? Math.floor(room.seed || 0) % ENCOUNTER_PROFILES.length;
}
function describeEncounter(room, floor) {
  const index2 = profileIndex(room);
  room.encounterName = CHAPTER_NAMES[floor - 1][index2];
  room.encounterHint = floor === 2 ? ["\u9F13\u4ED4\u505C\u987F\u540E\u4F1A\u51B2\u523A\uFF0C\u4FA7\u79FB\u8EB2\u5F00\u518D\u53CD\u51FB\u3002", "\u56DE\u58F0\u4F1A\u6298\u8FD4\uFF1B\u501F\u63A9\u4F53\u6321\u97F3\u7BB1\uFF0C\u522B\u6025\u7740\u56DE\u5230\u539F\u4F4D\u3002", "\u7559\u610F\u97F3\u7BB1\u706B\u7EBF\u4E0E\u56DE\u58F0\u7684\u56DE\u7A0B\uFF0C\u7ED5\u5F00\u4EA4\u53C9\u533A\u57DF\u3002", "\u5148\u6253\u6307\u6325\uFF0C\u53D6\u6D88\u5C1A\u672A\u53D1\u52A8\u7684\u5408\u62CD\u51B2\u523A\u3002", "\u91CD\u88C5\u602A\u903C\u8FD1\u65F6\u7559\u610F\u97F3\u7BB1\u84C4\u52BF\uFF0C\u7ED5\u67F1\u5206\u5F00\u5904\u7406\u3002", "\u98DE\u6251\u4E0E\u8E29\u62CD\u51B2\u523A\u8F6E\u6D41\u8FDB\u653B\uFF0C\u6293\u4F4F\u843D\u62CD\u7A7A\u6863\u3002", "\u4E24\u4FA7\u9F13\u4ED4\u4F1A\u51B2\u523A\uFF0C\u56DE\u58F0\u8FD8\u4F1A\u6298\u8FD4\uFF0C\u5148\u6E05\u6389\u4E00\u7FFC\u3002", "\u6307\u6325\u4F1A\u50AC\u52A8\u9644\u8FD1\u9F13\u4ED4\uFF0C\u5148\u5904\u7406\u8F85\u52A9\u518D\u8FFD\u5C04\u624B\u3002"][index2] : ENCOUNTER_PROFILES[index2].hint;
  return ENCOUNTER_PROFILES[index2];
}
function installEncounters(g) {
  const used = Array(ENCOUNTER_PROFILES.length).fill(0);
  let previous = -1;
  for (const room of g.rooms.filter((r) => r.exists && ["fight", "challenge"].includes(r.type))) {
    const neighborProfiles = new Set(g.neighbors(room.id).map((id) => g.rooms[id].encounterProfile));
    let options = used.map((_, i) => i).filter((i) => i !== previous && !neighborProfiles.has(i));
    const least = Math.min(...options.map((i) => used[i]));
    options = options.filter((i) => used[i] === least);
    const index2 = options[Math.floor(g.random() * options.length)];
    room.encounterProfile = index2;
    used[index2]++;
    previous = index2;
    describeEncounter(room, g.floor);
  }
}
var LIMITED = /* @__PURE__ */ new Set(["runner", "conductor", "stitchMedic"]);
var FIXED_FIRE = /* @__PURE__ */ new Set(["turret", "milkspitter", "soundTurret", "dollTurret", "warden", "echoBell", "prismEye"]);
function encounterRoster(room, floor, count2) {
  const types = ENCOUNTERS[floor - 1][profileIndex(room)], result = [];
  for (let i = 0; i < count2; i++) {
    const candidates = i < types.length ? [types[i]] : types.slice(1);
    const allowed = candidates.filter((t) => (!LIMITED.has(t) || !result.includes(t)) && (!FIXED_FIRE.has(t) || result.filter((v) => FIXED_FIRE.has(v)).length < 3));
    const fallback = types.filter((t) => !LIMITED.has(t) && !FIXED_FIRE.has(t));
    const pool2 = allowed.length ? allowed : fallback;
    result.push(pool2[(i + Math.floor((room.seed || 0) / 8)) % pool2.length]);
  }
  return result;
}
function formationTarget(profile, i, count2, player) {
  const dx = 480 - player.x, dy = 300 - player.y, horizontal = Math.abs(dx) >= Math.abs(dy), sign = (horizontal ? dx : dy) >= 0 ? 1 : -1;
  let depth = 0, lateral = 0;
  if (profile.formation === "rear") {
    depth = 0.65 - i % 3 * 0.18;
    lateral = -0.8 + 1.6 * Math.floor(i / 3) / Math.max(1, Math.ceil(count2 / 3) - 1);
  } else if (profile.formation === "escort") {
    depth = i === 0 ? 0.75 : 0.1 + Math.floor((i - 1) / 2) % 3 * 0.2;
    lateral = i === 0 ? 0 : i % 2 ? -0.55 : 0.55;
  } else if (profile.formation === "pincer") {
    depth = -0.1 + Math.floor(i / 2) * 0.16;
    lateral = i % 2 ? -0.7 : 0.7;
  } else if (profile.formation === "line") {
    depth = -0.05 + Math.floor(i / 3) * 0.22;
    lateral = (i % 3 - 1) * 0.6;
  } else if (profile.formation === "ring") {
    const angle = i * Math.PI * 2 / count2;
    depth = Math.cos(angle) * 0.6 + 0.1;
    lateral = Math.sin(angle) * 0.78;
  } else {
    depth = i % 2 ? 0.6 : 0;
    lateral = -0.8 + 1.6 * Math.floor(i / 2) / Math.max(1, Math.ceil(count2 / 2) - 1);
  }
  return horizontal ? { x: 480 + sign * depth * 300, y: 300 + lateral * 190 } : { x: 480 + lateral * 310, y: 300 + sign * depth * 190 };
}

// dist/chapter-content.js
var tile3 = (c, r, kind) => ({ x: 116 + c * 52, y: 92 + r * 52, w: 48, h: 48, r: 24, kind, hp: kind === "crate" ? 3 : Infinity });
var box = (c, r, w, h2, kind) => Array.from({ length: w * h2 }, (_, i) => tile3(c + i % w, r + Math.floor(i / w), kind));
var CHAPTER_LAYOUTS = [
  [
    { id: "milk_aisles", name: "\u5976\u74F6\u8D27\u5DF7", hint: "\u5976\u7BB1\u91CC\u53EF\u80FD\u85CF\u8865\u7ED9\uFF0C\u7559\u610F\u5730\u4E0A\u7684\u5976\u8FF9", build: () => [...box(4, 1, 1, 3, "crate"), ...box(10, 5, 1, 3, "crate"), ...box(4, 5, 1, 2, "rock"), ...box(10, 1, 1, 2, "rock")] },
    { id: "milk_drain", name: "\u6EA2\u5976\u6392\u6C34\u6C9F", hint: "\u6392\u6C34\u6C9F\u9694\u5F00\u706B\u7EBF\uFF0C\u4ECE\u4E2D\u95F4\u7F3A\u53E3\u7ED5\u5230\u6295\u74F6\u602A\u8EAB\u540E", build: () => [...box(3, 3, 4, 1, "pit"), ...box(8, 5, 4, 1, "pit"), tile3(3, 6, "crate"), tile3(11, 2, "crate"), tile3(7, 2, "rock")] }
  ],
  [
    { id: "sound_stage", name: "\u5171\u632F\u821E\u53F0", hint: "\u4EAE\u8D77\u7684\u5171\u632F\u533A\u5373\u5C06\u7206\u53D1\uFF0C\u8D81\u6697\u4E0B\u6765\u6362\u4F4D", build: () => [...box(3, 2, 1, 2, "pillar"), ...box(11, 5, 1, 2, "pillar"), ...box(6, 2, 3, 1, "crate"), ...box(6, 6, 3, 1, "crate")] },
    { id: "sound_wings", name: "\u4FA7\u5E55\u56DE\u5ECA", hint: "\u5229\u7528\u821E\u53F0\u4FA7\u7FFC\u6321\u97F3\u6CE2\uFF0C\u5C0F\u5FC3\u7AD9\u6869\u97F3\u7BB1", build: () => [...box(4, 1, 1, 3, "pillar"), ...box(10, 5, 1, 3, "pillar"), ...box(8, 2, 2, 1, "pit"), ...box(5, 6, 2, 1, "pit"), tile3(3, 6, "crate"), tile3(11, 2, "crate")] }
  ],
  [
    { id: "belt_cross", name: "\u4EA4\u53C9\u8F93\u9001\u7EBF", hint: "\u987A\u7740\u4F20\u9001\u5E26\u62C9\u5F00\u8DDD\u79BB\uFF0C\u9006\u7740\u8D70\u4F1A\u66F4\u6162", build: () => [...box(3, 2, 2, 1, "crate"), ...box(10, 6, 2, 1, "crate"), tile3(5, 6, "pillar"), tile3(9, 2, "pillar")] },
    { id: "loading_bay", name: "\u5206\u62E3\u88C5\u5378\u53E3", hint: "\u642C\u8FD0\u602A\u5B88\u7740\u7F3A\u53E3\uFF0C\u6253\u788E\u8D27\u7BB1\u6253\u5F00\u7B2C\u4E8C\u6761\u8DEF", build: () => [...box(5, 1, 1, 3, "rock"), ...box(9, 5, 1, 3, "rock"), ...box(5, 4, 1, 2, "crate"), ...box(9, 3, 1, 2, "crate")] }
  ],
  [
    { id: "press_line", name: "\u62FC\u88C5\u538B\u673A\u7EBF", hint: "\u7EA2\u6846\u5012\u8BA1\u65F6\u540E\u538B\u673A\u843D\u4E0B\uFF0C\u4E5F\u4F1A\u7838\u4F24\u602A\u7269", build: () => [...box(3, 2, 1, 2, "pillar"), ...box(11, 5, 1, 2, "pillar"), ...box(5, 6, 2, 1, "crate"), ...box(8, 2, 2, 1, "crate")] },
    { id: "reject_bins", name: "\u6B21\u54C1\u56DE\u6536\u6C60", hint: "\u62FC\u88C5\u602A\u4F1A\u88C2\u6210\u5C0F\u602A\uFF0C\u5229\u7528\u56DE\u6536\u6C60\u5206\u5F00\u8FFD\u5175", build: () => [...box(4, 2, 2, 2, "pit"), ...box(9, 5, 2, 2, "pit"), ...box(3, 6, 2, 1, "crate"), ...box(10, 2, 2, 1, "crate"), tile3(7, 4, "rock")] }
  ],
  [
    { id: "cage_cells", name: "\u7262\u7B3C\u9694\u95F4", hint: "\u7B49\u7535\u7F51\u7184\u706D\u518D\u7A7F\u8FC7\u53BB\uFF0C\u7AD9\u6869\u5B88\u536B\u5C04\u5F97\u5F88\u5FEB", build: () => [...box(4, 1, 1, 3, "pillar"), ...box(10, 5, 1, 3, "pillar"), ...box(4, 5, 1, 2, "rock"), ...box(10, 2, 1, 2, "rock"), tile3(7, 2, "crate")] },
    { id: "warden_cross", name: "\u5B88\u536B\u4EA4\u53C9\u53E3", hint: "\u7528\u7262\u67F1\u9694\u5F00\u5B88\u536B\u706B\u7EBF\uFF0C\u522B\u5728\u7535\u7F51\u65C1\u505C\u7559", build: () => [...box(3, 2, 2, 1, "pillar"), ...box(10, 6, 2, 1, "pillar"), ...box(5, 5, 2, 1, "pit"), ...box(8, 3, 2, 1, "pit"), tile3(3, 6, "crate"), tile3(11, 2, "crate")] }
  ]
];
var THEMED_ENEMIES = { milkleak: "\u6F0F\u5976\u602A", milkspitter: "\u6295\u74F6\u54E8\u5175", turret: "\u7AD9\u6869\u70AE\u53F0", soundTurret: "\u5C16\u5578\u97F3\u7BB1", beatling: "\u8282\u62CD\u602A", loader: "\u94C6\u9489\u88C5\u5378\u5DE5", dollTurret: "\u62FC\u88C5\u70AE\u53F0", stitchling: "\u62FC\u7F1D\u5A03\u5A03", tiny: "\u788E\u5E03\u5C0F\u602A", warden: "\u7262\u7B3C\u54E8\u5175", jailer: "\u8FFD\u6355\u5B88\u536B" };
Object.assign(THEMED_ENEMIES, Object.fromEntries(Object.entries(CHAPTER_MOBS).map(([id, d]) => [id, d.name])));
var roomDetails = {
  milk_valves: ["\u9519\u4F4D\u5976\u7BB1\u95F4", "\u6253\u788E\u5976\u7BB1\u6253\u5F00\u706B\u7EBF\uFF0C\u6CBF\u77F3\u5806\u7ED5\u884C"],
  milk_reservoir: ["\u53CC\u6C9F\u50A8\u5976\u95F4", "\u5229\u7528\u5751\u6C9F\u5206\u5F00\u8FFD\u5175\uFF0C\u4ECE\u7F3A\u53E3\u6362\u4F4D"],
  milk_aisles: ["\u5976\u74F6\u8D27\u5DF7", "\u6253\u788E\u5976\u7BB1\u5F00\u8DEF\uFF0C\u77F3\u5806\u6321\u4F4F\u8FFD\u5175\u4E0E\u706B\u7EBF"],
  milk_drain: ["\u65AD\u6C9F\u56DE\u5ECA", "\u4ECE\u5751\u6C9F\u7F3A\u53E3\u7ED5\u5230\u8FDC\u7A0B\u602A\u4FA7\u9762"],
  echo_lanes: ["\u4FA7\u53F0\u8FFD\u9010\u5ECA", "\u501F\u4E24\u4FA7\u63A9\u4F53\u6362\u4F4D\uFF0C\u907F\u514D\u88AB\u8FFD\u5175\u5939\u51FB"],
  duet_stage: ["\u53CC\u67F1\u821E\u53F0", "\u5229\u7528\u4E24\u6839\u821E\u53F0\u67F1\u5207\u65AD\u8FDC\u7A0B\u706B\u7EBF"],
  sound_stage: ["\u7BB1\u9635\u821E\u53F0", "\u6253\u788E\u7BB1\u9635\u83B7\u5F97\u65B0\u7684\u5C04\u51FB\u8DEF\u7EBF"],
  sound_wings: ["\u4FA7\u5E55\u56DE\u5ECA", "\u5229\u7528\u4FA7\u7FFC\u6321\u97F3\u6CE2\uFF0C\u4ECE\u7F3A\u53E3\u6362\u8FB9"],
  reversing_sorter: ["\u9519\u4F4D\u5206\u62E3\u95F4", "\u5229\u7528\u9519\u4F4D\u8D27\u5806\u62C6\u5206\u8FFD\u51FB\u8DEF\u7EBF"],
  lift_conveyors: ["\u7EB5\u6A2A\u8D27\u6808", "\u6253\u788E\u4E2D\u95F4\u8D27\u7BB1\uFF0C\u5207\u65AD\u6295\u5305\u88F9\u5DE5\u7684\u89C6\u7EBF"],
  belt_cross: ["\u4EA4\u53C9\u5806\u8D27\u573A", "\u7ED5\u8FC7\u8D27\u5806\u6362\u8FB9\uFF0C\u4FDD\u6301\u9000\u8DEF"],
  loading_bay: ["\u5206\u62E3\u88C5\u5378\u53E3", "\u6253\u788E\u8D27\u7BB1\u6253\u5F00\u7B2C\u4E8C\u6761\u8DEF"],
  assembly_feeders: ["\u96F6\u4EF6\u5806\u653E\u95F4", "\u5229\u7528\u7BB1\u5806\u4E0E\u77F3\u5806\u5207\u65AD\u706B\u7EBF"],
  scrap_workshop: ["\u5E9F\u5076\u8FD4\u4FEE\u95F4", "\u6253\u788E\u7BB1\u5899\u5F00\u8DEF\uFF0C\u4F18\u5148\u5904\u7406\u7F1D\u8865\u5DE5"],
  press_line: ["\u62FC\u88C5\u8F66\u95F4", "\u6CBF\u7ACB\u67F1\u7ED5\u884C\uFF0C\u4ECE\u4FA7\u9762\u63A5\u8FD1\u70AE\u53F0"],
  reject_bins: ["\u6B21\u54C1\u56DE\u6536\u6C60", "\u5229\u7528\u56DE\u6536\u6C60\u5206\u5F00\u8FFD\u5175"],
  power_cells: ["\u53CC\u67F1\u7262\u623F", "\u5229\u7528\u7262\u67F1\u6321\u5F39\uFF0C\u7559\u610F\u4E24\u4FA7\u8FFD\u5175"],
  prison_circuit: ["\u9519\u4F4D\u7262\u7BB1\u5ECA", "\u62C6\u5F00\u5C01\u7BB1\u6539\u53D8\u901A\u8DEF\uFF0C\u4ECE\u4FA7\u9762\u63A5\u8FD1\u5B88\u536B"],
  cage_cells: ["\u7262\u7B3C\u9694\u95F4", "\u5229\u7528\u7262\u67F1\u5206\u5272\u5B88\u536B\u706B\u7EBF"],
  warden_cross: ["\u5B88\u536B\u4EA4\u53C9\u53E3", "\u6CBF\u63A9\u4F53\u6362\u4F4D\uFF0C\u522B\u88AB\u8FFD\u5175\u5835\u5728\u5751\u8FB9"]
};
for (let i = 0; i < 5; i++) {
  const covers = MECHANIC_LAYOUTS[i].map(({ id, build }) => ({ id, build: () => build().filter((o) => !o.device) }));
  CHAPTER_LAYOUTS[i].unshift(...covers);
  for (const layout of CHAPTER_LAYOUTS[i]) {
    const [name, hint] = roomDetails[layout.id];
    Object.assign(layout, { name, hint });
  }
}

// dist/terrain.js
var CELL = 52;
var tile4 = (c, r, kind) => ({ x: 116 + c * CELL, y: 92 + r * CELL, w: 48, h: 48, r: 24, kind, hp: kind === "crate" ? 3 : Infinity });
var box2 = (c, r, w, h2, kind) => Array.from({ length: w * h2 }, (_, i) => tile4(c + i % w, r + Math.floor(i / w), kind));
var LAYOUTS = [
  { id: "shelves", name: "\u56DB\u89D2\u8D27\u67B6", hint: "\u501F\u8D27\u67B6\u6321\u5F39\uFF0C\u6253\u788E\u8D27\u7BB1\u6269\u5927\u8D70\u4F4D\u7A7A\u95F4", build: () => [
    ...box2(3, 2, 2, 1, "crate"),
    ...box2(10, 2, 2, 1, "crate"),
    ...box2(3, 6, 2, 1, "crate"),
    ...box2(10, 6, 2, 1, "crate"),
    tile4(3, 3, "rock"),
    tile4(11, 3, "rock"),
    tile4(3, 5, "rock"),
    tile4(11, 5, "rock")
  ] },
  { id: "island", name: "\u4E2D\u592E\u65AD\u6C60", hint: "\u97F3\u6CE2\u80FD\u8D8A\u8FC7\u5751\u6D1E\uFF0C\u5730\u9762\u602A\u9700\u8981\u7ED5\u884C", build: () => [
    ...box2(6, 3, 3, 3, "pit"),
    tile4(3, 2, "pillar"),
    tile4(11, 6, "pillar"),
    tile4(3, 6, "crate"),
    tile4(11, 2, "crate")
  ] },
  { id: "slalom", name: "\u9519\u4F4D\u7A84\u9053", hint: "\u7ED5\u8FC7\u4E24\u9053\u77F3\u5899\uFF0C\u6216\u7528\u70B8\u5F39\u6253\u901A\u8FD1\u8DEF", build: () => [
    ...box2(5, 1, 1, 5, "rock"),
    ...box2(9, 3, 1, 5, "rock"),
    tile4(3, 6, "crate"),
    tile4(11, 2, "crate")
  ] },
  { id: "cross", name: "\u5341\u5B57\u4EA4\u706B", hint: "\u56DB\u5757\u63A9\u4F53\u5206\u5272\u706B\u7EBF\uFF0C\u5C0F\u5FC3\u4FA7\u9762\u5305\u5939", build: () => [
    ...box2(3, 2, 2, 2, "crate"),
    ...box2(10, 2, 2, 2, "crate"),
    ...box2(3, 5, 2, 2, "rock"),
    ...box2(10, 5, 2, 2, "rock")
  ] },
  { id: "bridge", name: "\u65AD\u6C60\u7A84\u6865", hint: "\u4E2D\u592E\u7A84\u6865\u80FD\u901A\u884C\uFF0C\u4E5F\u53EF\u6CBF\u4E24\u4FA7\u7ED5\u8DEF", build: () => [
    ...box2(2, 4, 5, 1, "pit"),
    ...box2(8, 4, 5, 1, "pit"),
    tile4(5, 2, "pillar"),
    tile4(9, 6, "pillar"),
    tile4(3, 6, "crate"),
    tile4(11, 2, "crate")
  ] },
  { id: "bunker", name: "\u53CC\u5C42\u63A9\u4F53", hint: "\u56FA\u5B9A\u67F1\u4E0D\u80FD\u70B8\u6BC1\uFF0C\u5229\u7528\u95F4\u9699\u6362\u4F4D\u5C04\u51FB", build: () => [
    ...[3, 6, 8, 11].flatMap((c) => [tile4(c, 2, "pillar"), tile4(c, 6, "pillar")]),
    ...box2(5, 4, 1, 1, "crate"),
    tile4(9, 4, "crate")
  ] },
  { id: "shortcut", name: "\u5C01\u7BB1\u8FD1\u9053", hint: "\u8D27\u7BB1\u5C01\u4F4F\u76F4\u8DEF\uFF0C\u51FB\u788E\u540E\u53EF\u7A7F\u8FC7\uFF1B\u5916\u56F4\u59CB\u7EC8\u53EF\u8D70", build: () => [
    ...box2(7, 1, 1, 2, "pillar"),
    ...box2(7, 3, 1, 3, "crate"),
    ...box2(7, 6, 1, 2, "pillar"),
    tile4(4, 3, "rock"),
    tile4(10, 5, "rock")
  ] },
  { id: "banks", name: "\u65AD\u7EED\u6CB3\u5CB8", hint: "\u8FDC\u7A0B\u602A\u9694\u5751\u5C04\u51FB\uFF0C\u8FFD\u51FB\u602A\u4ECE\u7F3A\u53E3\u7ED5\u6765", build: () => [
    ...box2(3, 2, 3, 1, "pit"),
    ...box2(9, 6, 3, 1, "pit"),
    ...box2(5, 5, 2, 1, "pit"),
    ...box2(8, 3, 2, 1, "pit"),
    tile4(3, 6, "rock"),
    tile4(11, 2, "rock"),
    tile4(6, 2, "crate"),
    tile4(8, 6, "crate")
  ] }
];
LAYOUTS.push(
  { id: "twin_nests", name: "\u53CC\u7A9D\u706B\u529B\u573A", hint: "\u4E24\u4FA7\u63A9\u4F53\u62A4\u4F4F\u706B\u529B\u70B9\uFF0C\u4E2D\u8DEF\u53EF\u6362\u8FB9\u7A81\u7834", build: () => [...box2(3, 2, 2, 1, "pillar"), ...box2(10, 6, 2, 1, "pillar"), tile4(4, 5, "crate"), tile4(10, 3, "crate"), tile4(7, 2, "rock"), tile4(7, 6, "rock")] },
  { id: "broken_ring", name: "\u7F3A\u53E3\u56F4\u573A", hint: "\u73AF\u5F62\u65AD\u5899\u7559\u51FA\u56DB\u4E2A\u7F3A\u53E3\uFF0C\u522B\u88AB\u8FFD\u5175\u903C\u8FDB\u5185\u5708", build: () => [...box2(5, 2, 2, 1, "rock"), ...box2(8, 2, 2, 1, "crate"), ...box2(5, 6, 2, 1, "crate"), ...box2(8, 6, 2, 1, "rock"), tile4(4, 3, "pillar"), tile4(4, 5, "pillar"), tile4(10, 3, "pillar"), tile4(10, 5, "pillar")] },
  { id: "crate_steps", name: "\u9636\u68AF\u7BB1\u9635", hint: "\u9010\u6BB5\u6253\u788E\u8D27\u7BB1\uFF0C\u6539\u53D8\u8FFD\u5175\u8DEF\u7EBF\u548C\u5C04\u51FB\u89D2\u5EA6", build: () => [...box2(3, 2, 2, 1, "crate"), ...box2(6, 3, 2, 1, "crate"), ...box2(9, 4, 2, 1, "crate"), ...box2(6, 6, 2, 1, "crate"), tile4(3, 6, "pillar"), tile4(11, 2, "pillar")] },
  { id: "split_pools", name: "\u53CC\u6C60\u7ED5\u884C\u573A", hint: "\u5730\u9762\u602A\u6CBF\u6C60\u8FB9\u7ED5\u884C\uFF0C\u98DE\u6251\u602A\u76F4\u63A5\u8D8A\u8FC7\u6C34\u6C60", build: () => [...box2(4, 2, 2, 2, "pit"), ...box2(9, 5, 2, 2, "pit"), tile4(3, 6, "crate"), tile4(11, 2, "crate"), tile4(7, 3, "pillar"), tile4(7, 5, "pillar")] }
);
LAYOUTS.push(...TACTICAL_LAYOUTS);
function installLayouts(g) {
  installEncounters(g);
  const selected2 = selectLayouts(g, LAYOUTS, CHAPTER_LAYOUTS[g.floor - 1]);
  for (const room of g.rooms) {
    room.obstacles = [];
    room.hazards = [];
    if (!selected2.has(room.id)) continue;
    const layout = selected2.get(room.id);
    room.layoutId = layout.id;
    room.layoutName = layout.name;
    room.layoutHint = layout.hint;
    room.obstacles = layout.build();
    const nodes = navigationSnapshot(room), wide = nodes.filter((n) => n.free && n.distance >= 0 && !blocked(room, n.x, n.y, 44)).length;
    room.crowdingPenalty = wide / nodes.length < 0.66 ? 2 : wide / nodes.length < 0.72 ? 1 : 0;
  }
  const caches = g.rooms.filter((r) => r.exists && r.obstacles.some((o) => o.kind === "rock" && !o.bridgeTo));
  if (caches.length) {
    const room = caches[Math.floor(g.random() * caches.length)], rocks = room.obstacles.filter((o) => o.kind === "rock" && !o.bridgeTo);
    rocks[Math.floor(g.random() * rocks.length)].stash = true;
  }
}
function overlaps(o, x, y, r) {
  if (!o.w) return Math.hypot(o.x - x, o.y - y) < o.r + r;
  const dx = Math.max(Math.abs(x - o.x) - o.w / 2, 0), dy = Math.max(Math.abs(y - o.y) - o.h / 2, 0);
  return dx * dx + dy * dy < r * r;
}
function blocked(room, x, y, r = 24, flying = false) {
  return room.obstacles.some((o) => !(flying && o.kind === "pit") && overlaps(o, x, y, r));
}
var NX = 33;
var NY = 19;
var STEP = 26;
var point = (i) => ({ x: 64 + i % NX * STEP, y: 66 + Math.floor(i / NX) * STEP });
var index = (x, y) => Math.max(0, Math.min(NX - 1, Math.round((x - 64) / STEP))) + Math.max(0, Math.min(NY - 1, Math.round((y - 66) / STEP))) * NX;
function adjacent(i) {
  const c = i % NX, r = Math.floor(i / NX);
  return [c > 0 ? i - 1 : -1, c < NX - 1 ? i + 1 : -1, r > 0 ? i - NX : -1, r < NY - 1 ? i + NX : -1].filter((n) => n >= 0);
}
function grid(room, flying) {
  if (room.nav?.obstacles !== room.obstacles) room.nav = { obstacles: room.obstacles };
  const key = flying ? "air" : "ground";
  if (!room.nav[key]) {
    const free = Array.from({ length: NX * NY }, (_, i) => {
      const p = point(i);
      return !blocked(room, p.x, p.y, 24, flying);
    });
    room.nav[key] = { free, target: -1, dist: null };
  }
  return room.nav[key];
}
function closestFree(free, x, y) {
  let best2 = -1, d = Infinity;
  for (let i = 0; i < free.length; i++) if (free[i]) {
    const p = point(i), n = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (n < d) {
      d = n;
      best2 = i;
    }
  }
  return best2;
}
function field(room, target2, flying = false) {
  const data = grid(room, flying);
  let end2 = index(target2.x, target2.y);
  if (!data.free[end2]) end2 = closestFree(data.free, target2.x, target2.y);
  if (data.target !== end2 || !data.dist) {
    const dist = new Int16Array(NX * NY).fill(-1), q = [end2];
    dist[end2] = 0;
    for (let j = 0; j < q.length; j++) for (const n of adjacent(q[j])) if (data.free[n] && dist[n] < 0) {
      dist[n] = dist[q[j]] + 1;
      q.push(n);
    }
    data.target = end2;
    data.dist = dist;
  }
  return data;
}
function safeSpot(room, x, y, r = 24, avoid = null, used = [], score = null) {
  if (!room.layoutId) return { x, y };
  const { free, dist } = field(room, { x: 95, y: 300 });
  let best2 = null, d = Infinity;
  for (let i = 0; i < free.length; i++) if (free[i] && dist[i] >= 0) {
    const p = point(i);
    if (blocked(room, p.x, p.y, r) || (room.hazards || []).some((h2) => h2.kind !== "belt" && overlaps(h2, p.x, p.y, r)) || avoid && Math.hypot(p.x - avoid.x, p.y - avoid.y) < 150 || used.some((e) => Math.hypot(p.x - e.x, p.y - e.y) < 60)) continue;
    const n = (p.x - x) ** 2 + (p.y - y) ** 2 + (score ? score(p) : 0);
    if (n < d) {
      best2 = p;
      d = n;
    }
  }
  return best2 || { x: 95, y: 300 };
}
function shotLaneOpen(room, a, b) {
  return !room.obstacles.some((o) => {
    if (o.kind === "pit") return false;
    let near = 0, far = 1;
    for (const axis of ["x", "y"]) {
      const delta = b[axis] - a[axis], half = (axis === "x" ? o.w || o.r * 2 : o.h || o.r * 2) / 2 + 7, low = o[axis] - half, high = o[axis] + half;
      if (Math.abs(delta) < 1e-4) {
        if (a[axis] < low || a[axis] > high) return false;
        continue;
      }
      const t1 = (low - a[axis]) / delta, t2 = (high - a[axis]) / delta;
      near = Math.max(near, Math.min(t1, t2));
      far = Math.min(far, Math.max(t1, t2));
      if (near > far) return false;
    }
    return far >= 0 && near <= 1;
  });
}
function positionCost(room, type, player) {
  if (["conductor", "stitchMedic"].includes(type)) return (p) => shotLaneOpen(room, p, player) ? 7e4 : 0;
  if (!["shooter", "turret", "soundTurret", "dollTurret", "warden", "echoBell", "prismEye"].includes(type)) return null;
  return (p) => {
    const cover = room.obstacles.some((o) => o.kind !== "pit" && Math.hypot(o.x - p.x, o.y - p.y) < 140);
    return (shotLaneOpen(room, p, player) ? 0 : 9e4) + (Math.hypot(p.x - player.x, p.y - player.y) < 250 ? 5e4 : 0) - (cover ? 4e3 : 0);
  };
}
function clearLine(room, a, b, flying) {
  const length2 = Math.hypot(b.x - a.x, b.y - a.y), steps = Math.ceil(length2 / 13);
  for (let i = 1; i <= steps; i++) if (blocked(room, a.x + (b.x - a.x) * i / steps, a.y + (b.y - a.y) * i / steps, a.r + 1, flying)) return false;
  return true;
}
function steer(room, e, p) {
  const dx = p.x - e.x, dy = p.y - e.y, length2 = Math.hypot(dx, dy) || 1, flying = e.type === "hopper";
  if (e.type === "boss" || !room.obstacles.length || clearLine(room, e, p, flying)) {
    e.route = null;
    return { x: dx / length2, y: dy / length2 };
  }
  const { free, dist, target: target2 } = field(room, p, flying);
  if (!e.route || e.route.target !== target2 || e.route.obstacles !== room.obstacles || !e.route.points.length) {
    let at = -1, best2 = Infinity;
    for (let i = 0; i < free.length; i++) if (free[i] && dist[i] >= 0) {
      const node = point(i), distance2 = Math.hypot(node.x - e.x, node.y - e.y);
      if (distance2 > 90 || !clearLine(room, e, node, flying)) continue;
      const cost = dist[i] * STEP + distance2;
      if (cost < best2) {
        best2 = cost;
        at = i;
      }
    }
    if (at < 0) at = closestFree(free, e.x, e.y);
    const points = [point(at)];
    let guard = NX * NY;
    while (dist[at] > 0 && guard-- > 0) {
      const next2 = adjacent(at).find((n) => dist[n] >= 0 && dist[n] < dist[at]);
      if (next2 === void 0) break;
      at = next2;
      points.push(point(at));
    }
    e.route = { target: target2, obstacles: room.obstacles, points };
  }
  const route = e.route.points;
  while (route.length > 1 && Math.hypot(route[0].x - e.x, route[0].y - e.y) < 10) route.shift();
  let next = 0;
  for (let i = route.length - 1; i > 0; i--) if (clearLine(room, e, route[i], flying)) {
    next = i;
    break;
  }
  if (next) route.splice(0, next);
  const to = route[0], vx = to.x - e.x, vy = to.y - e.y, len = Math.hypot(vx, vy) || 1;
  if (!clearLine(room, e, to, flying)) {
    e.route = null;
    return { x: 0, y: 0 };
  }
  return { x: vx / Math.max(10, len), y: vy / Math.max(10, len) };
}
function moveOnTerrain(room, actor, fromX, fromY) {
  if (actor.type === "boss" && room.obstacles.some((o) => o.owner === actor)) room = { ...room, obstacles: room.obstacles.filter((o) => o.owner !== actor) };
  const flying = actor.type === "hopper", dx = actor.x - fromX, dy = actor.y - fromY, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8));
  let x = fromX, y = fromY;
  if (blocked(room, x, y, actor.r, flying)) {
    const safe = safeSpot(room, x, y, actor.r);
    x = safe.x;
    y = safe.y;
  }
  for (let i = 0; i < n; i++) {
    if (!blocked(room, x + dx / n, y, actor.r, flying)) x += dx / n;
    if (!blocked(room, x, y + dy / n, actor.r, flying)) y += dy / n;
  }
  actor.x = x;
  actor.y = y;
}
function terrainProjectile(g, b, hostile) {
  const obstacle = g.room.obstacles.find((o) => o.kind !== "pit" && !(hostile && o.kind === "hand" && o.owner === b.catcherPressure) && overlaps(o, b.x, b.y, b.r));
  if (!obstacle) return false;
  if (obstacle.kind === "barrel") {
    if (!hostile && obstacle.fuse === void 0) {
      obstacle.hp -= b.damage;
      if (obstacle.hp <= 0) armBarrel(g, obstacle);
    }
    return true;
  }
  if (obstacle.device) {
    if (!hostile) g.hitDevice(obstacle, b.damage);
    return true;
  }
  if (obstacle.kind === "crate" && !hostile) {
    obstacle.hp -= b.damage;
    if (obstacle.hp <= 0) {
      g.room.obstacles = g.room.obstacles.filter((o) => o !== obstacle);
      crateLoot(g, obstacle);
      g.burst(obstacle.x, obstacle.y, "#cfad79", 8);
    }
  }
  if (!hostile && b.bounce > 0) {
    const px = b.previousX ?? b.x - b.vx * 0.02, py = b.previousY ?? b.y - b.vy * 0.02;
    const horizontal = Math.abs(px - obstacle.x) / (obstacle.w / 2 + b.r) >= Math.abs(py - obstacle.y) / (obstacle.h / 2 + b.r);
    if (horizontal) b.vx *= -1;
    else b.vy *= -1;
    b.x = px;
    b.y = py;
    b.bounce--;
    g.onBulletBounce?.(b);
    return false;
  }
  return true;
}
function crateLoot(g, o) {
  if (o.lootRolled) return;
  o.lootRolled = true;
  if (g.random() >= 0.15) return;
  const roll = g.random(), type = roll < 0.5 ? "coin" : roll < 0.7 ? "key" : roll < 0.85 ? "bomb" : "heart";
  g.drop(type, o.x, o.y, 1);
}
function blastTerrain(g, x, y, radius) {
  const owners = new Set(g.room.obstacles.filter((o) => o.kind === "hand" && overlaps(o, x, y, radius)).map((o) => o.owner));
  if (owners.size) {
    for (const e of owners) {
      e.handDisabled = 3;
      if (e.hands) e.hands.cancelled = true;
    }
    g.room.obstacles = g.room.obstacles.filter((o) => !owners.has(o.owner));
    g.emit("toast", { text: "\u53CC\u624B\u88AB\u70B8\u9000\uFF01\u8D81\u73B0\u5728\u7A81\u7834\u5C01\u9501\u3002" });
  }
  const broken = [];
  g.room.obstacles = g.room.obstacles.filter((o) => {
    if (o.kind === "barrel") {
      if (overlaps(o, x, y, radius)) armBarrel(g, o);
      return true;
    }
    if (o.device || o.kind === "pit" || o.kind === "pillar" || !overlaps(o, x, y, radius)) return true;
    broken.push(o);
    return false;
  });
  if (fillBridgeSlots(g.room, broken).length) g.emit("toast", { text: "\u6865\u77F3\u586B\u5E73\u5751\u6D1E\uFF01\u8FD1\u8DEF\u6253\u5F00\u4E86\u3002" });
  for (const o of broken) {
    if (o.kind === "crate") crateLoot(g, o);
    if (o.stash && !o.lootRolled) {
      o.lootRolled = true;
      const roll = g.random(), type = roll < 0.5 ? "coin" : roll < 0.75 ? "key" : "bomb";
      g.drop(type, o.x, o.y, type === "coin" ? 3 : 1);
      g.emit("toast", { text: "\u84DD\u7EB9\u77F3\u91CC\u85CF\u7740\u8865\u7ED9\uFF01" });
    }
  }
  if (broken.some((o) => o.kind === "rock" && !o.stash) && g.random() < 0.15) g.drop("coin", x, y, 1);
  for (const o of broken) g.burst(o.x, o.y, "#b4a187", 6);
}
function spawnEncounter(g, room) {
  const count2 = encounterCount(room, g.floor);
  room.encounterSize = count2;
  const profile = describeEncounter(room, g.floor);
  room.encounterVariant = profileIndex(room);
  const types = encounterRoster(room, g.floor, count2), enemies = [];
  for (let i = 0; i < count2; i++) {
    const target2 = formationTarget(profile, i, count2, g.p), p = safeSpot(room, target2.x, target2.y, 24, g.p, enemies, positionCost(room, types[i], g.p));
    const enemy2 = g.spawn(types[i], p.x, p.y);
    enemy2.cd = Math.max(enemy2.cd, 0.65 + i % 4 * 0.22);
    enemies.push(enemy2);
  }
  return enemies;
}
function navigationSnapshot(room) {
  const data = field(room, { x: 95, y: 300 });
  return data.free.map((free, i) => ({ ...point(i), free, distance: data.dist[i] }));
}

// dist/frog-jump.js
var FROG_JUMP_SECONDS = 0.23;
var FROG_JUMP_SPEED = 730;
var clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function frogJumpLanding(room, x, y, toX, toY, r) {
  const dx = toX - x, dy = toY - y, steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 2));
  for (let i = steps; i >= 0; i--) {
    const point2 = { x: x + dx * i / steps, y: y + dy * i / steps };
    if (point2.x >= 49 && point2.x <= 911 && point2.y >= 49 && point2.y <= 551 && !blocked(room, point2.x, point2.y, r)) return point2;
  }
  return null;
}
function moveFrogOnTerrain(room, p, fromX, fromY, landing = false) {
  if (!(p.dash > 0)) {
    delete p.frogJump;
    moveOnTerrain(room, p, fromX, fromY);
    return;
  }
  let jump = p.frogJump;
  if (!jump || jump.roomId !== room.id) {
    const remaining = Math.min(FROG_JUMP_SECONDS, p.dash);
    const end2 = frogJumpLanding(
      room,
      fromX,
      fromY,
      clamp(fromX + p.dx * FROG_JUMP_SPEED * remaining, 49, 911),
      clamp(fromY + p.dy * FROG_JUMP_SPEED * remaining, 49, 551),
      p.r
    ) || safeSpot(room, fromX, fromY, p.r);
    jump = p.frogJump = { roomId: room.id, x: fromX, y: fromY, toX: end2.x, toY: end2.y };
  }
  const dx = jump.toX - jump.x, dy = jump.toY - jump.y, length2 = dx * dx + dy * dy;
  const progress = length2 ? clamp(((p.x - jump.x) * dx + (p.y - jump.y) * dy) / length2, 0, 1) : 1;
  p.x = jump.x + dx * progress;
  p.y = jump.y + dy * progress;
  if (landing) {
    const end2 = frogJumpLanding(room, jump.x, jump.y, jump.toX, jump.toY, p.r) || safeSpot(room, jump.x, jump.y, p.r);
    p.x = end2.x;
    p.y = end2.y;
    delete p.frogJump;
  }
}

// dist/floor-economy.js
function bindFloorEconomy(g) {
  g.floorEconomy ??= {};
  const state2 = g.floorEconomy[g.floor] ??= { exchanges: {}, stock: null, services: {}, sold: [] };
  for (const room of g.rooms) {
    if (!room.exists) continue;
    const fields = room.type === "start" ? { exchanges: "exchanges" } : room.type === "shop" ? { shopStock: "stock", serviceUses: "services", shopSold: "sold" } : {};
    for (const [field2, key] of Object.entries(fields)) Object.defineProperty(room, field2, { enumerable: true, configurable: true, get: () => state2[key], set: (value) => {
      state2[key] = value;
    } });
  }
}

// dist/room-wardrobe.js
var ROOM_WARDROBE = Object.freeze({ x: 730, y: 225, w: 104, h: 104, useX: 730, useY: 302, range: 96 });
function hasRoomWardrobe(g) {
  return g.floor >= 2 && g.floor <= g.finalFloor && g.room?.type === "start";
}
function canUseRoomWardrobe(g) {
  return g.mode === "play" && hasRoomWardrobe(g) && Math.hypot(g.p.x - ROOM_WARDROBE.useX, g.p.y - ROOM_WARDROBE.useY) < ROOM_WARDROBE.range;
}
function installRoomWardrobe(g) {
  if (g.floor < 2 || g.floor > g.finalFloor) return;
  const room = g.rooms.find((r) => r.exists && r.type === "start");
  if (room && !room.obstacles.some((o) => o.wardrobe)) room.obstacles.push({ x: ROOM_WARDROBE.x, y: ROOM_WARDROBE.y, w: ROOM_WARDROBE.w, h: ROOM_WARDROBE.h, r: 52, kind: "pillar", hp: Infinity, wardrobe: true });
}
function drawRoomWardrobe(c, g) {
  if (!hasRoomWardrobe(g)) return;
  const { x, y } = ROOM_WARDROBE, near = canUseRoomWardrobe(g);
  c.save();
  c.translate(x, y);
  c.fillStyle = "#24353235";
  c.fillRect(-54, 47, 120, 16);
  c.fillStyle = "#4d3d38";
  c.fillRect(-58, -79, 116, 126);
  c.fillRect(-48, 47, 14, 10);
  c.fillRect(34, 47, 14, 10);
  c.fillStyle = "#d7ad70";
  c.fillRect(-62, -85, 124, 10);
  c.fillRect(-54, -75, 108, 116);
  c.fillStyle = "#8b6852";
  c.fillRect(-46, -67, 90, 100);
  c.fillStyle = "#654d48";
  c.fillRect(0, -65, 4, 96);
  c.fillStyle = "#ae8865";
  c.fillRect(-42, -63, 36, 90);
  c.fillStyle = "#c2986c";
  c.fillRect(8, -63, 32, 90);
  c.fillStyle = "#e6c78b";
  for (const dy of [-56, 15]) {
    c.fillRect(-50, dy, 8, 10);
    c.fillRect(42, dy, 8, 10);
  }
  c.fillRect(-14, -12, 5, 12);
  c.fillRect(10, -12, 5, 12);
  c.fillStyle = "#f4e8bc";
  c.fillRect(-25, -67, 50, 28);
  c.fillStyle = "#5b7669";
  for (const [a, b, w, h2] of [[-8, -64, 16, 4], [-15, -60, 30, 4], [-20, -56, 40, 4], [-12, -52, 24, 10]]) c.fillRect(a, b, w, h2);
  if (near) {
    c.strokeStyle = "#f6dc83";
    c.lineWidth = 4;
    c.strokeRect(-62, -85, 124, 142);
  }
  c.textAlign = "center";
  c.fillStyle = "#f7edc9";
  c.fillRect(-82, -114, 164, 25);
  c.fillStyle = "#3c5146";
  c.font = "bold 18px system-ui";
  c.fillText("\u5976\u86D9\u7684\u8863\u67DC", 0, -95);
  if (near) {
    c.fillStyle = "#314f43";
    c.fillRect(-92, 88, 184, 28);
    c.fillStyle = "#fff2c3";
    c.font = "bold 16px system-ui";
    c.fillText("E / \u4E92\u52A8 \xB7 \u66F4\u6362\u65F6\u88C5", 0, 108);
  }
  c.restore();
}

// dist/item-vfx.js
var ink = "#29313d";
var cream = "#fff1c8";
var colors = { man: "#f3c75d", deep: "#83d9f2", ghost: "#bfa1e4", rhythm: "#70d5bd", gugu: "#95dcbe", wood: "#cfaa71", fade: "#e5b86b", rebound: "#b4dceb", heavy: "#bcace1", milk: "#b6e7ce", poison: "#b6d983", echo: "#91c9e5", elbow: "#e9c26e", plug: "#7edbdc", rice: "#e8f3ed", fedRice: "#f4d77f", basketball: "#e2a052", stone: "#a7b1b7", egg: "#f1d98a", wire: "#82ddd7" };
var block = (c, x, y, w, h2, color) => {
  c.fillStyle = color;
  c.fillRect(Math.round(x / 2) * 2, Math.round(y / 2) * 2, w, h2);
};
function ring(c, x, y, r, color) {
  for (let i = 0; i < 24; i++) {
    const a = i * Math.PI / 12;
    block(c, x + Math.cos(a) * r - 1, y + Math.sin(a) * r - 1, 2, 2, color);
  }
}
function diamond(c, x, y, r, color) {
  for (let i = -r; i <= r; i += 2) {
    block(c, x + i, y - r + Math.abs(i), 2, 2, color);
    block(c, x + i, y + r - Math.abs(i), 2, 2, color);
  }
}
function shotVariant(b) {
  return b.manBoost ? "man" : b.deepCharged ? "deep" : b.ghost ? "ghost" : b.rhythm || b.beat ? "rhythm" : b.gugu ? "gugu" : b.fadeBoost ? "fade" : b.ironBoost || b.reboundBoost ? "rebound" : b.wood ? "wood" : b.heavy ? "heavy" : b.milkBoost ? "milk" : b.poison ? "poison" : b.returnVoice ? "echo" : b.phoebePlug ? "plug" : null;
}
function add(g, f) {
  const count2 = g.effects.reduce((n, e) => n + Number(e.type === "itemCast" || e.type === "itemImpact"), 0);
  if (count2 >= 24) {
    const i = g.effects.findIndex((e) => e.type === "itemCast" || e.type === "itemImpact");
    g.effects.splice(i, 1);
  }
  g.effects.push(f);
}
function castItemVfx(g, start2, pet) {
  if (pet) return;
  const bullets = g.bullets.slice(start2);
  if (!bullets.length) return;
  const group = { nextHit: -Infinity };
  for (const b2 of bullets) b2.vfxVolley = group;
  const b = bullets[0], variant = shotVariant(b);
  if (!variant) return;
  add(g, { type: "itemCast", variant, x: b.x, y: b.y, angle: Math.atan2(b.vy, b.vx), radius: Math.min(24, b.r + 10), life: 0.18, max: 0.18 });
}
function hitItemVfx(g, e, b) {
  const variant = b.pet ? b.rice ? b.fed ? "fedRice" : "rice" : b.rollingRock ? "stone" : b.memePet === "kobe" ? "basketball" : b.eggShot ? "egg" : null : shotVariant(b);
  if (!variant) return;
  if (b.vfxVolley) {
    if (g.elapsed < b.vfxVolley.nextHit) return;
    b.vfxVolley.nextHit = g.elapsed + 0.07;
  }
  add(g, { type: "itemImpact", variant, x: e.x, y: e.y, angle: Math.atan2(b.vy, b.vx), radius: Math.min(30, b.r + 14), life: 0.24, max: 0.24 });
}
function bounceItemVfx(g, b) {
  if (b.pet || !b.ironBoost && !b.reboundBoost) return;
  add(g, { type: "itemImpact", variant: "rebound", x: b.x, y: b.y, angle: Math.atan2(b.vy, b.vx), radius: 19, life: 0.18, max: 0.18 });
}
function wireItemVfx(g, e) {
  add(g, { type: "itemImpact", variant: "wire", x: e.x, y: e.y, angle: 0, radius: 16, life: 0.18, max: 0.18 });
}
function elbowItemVfx(g, e) {
  add(g, { type: "itemImpact", variant: "elbow", x: e.x, y: e.y, angle: Math.atan2(g.p.dy, g.p.dx), life: 0.22, max: 0.22, radius: 28 });
}
function drawEnhancedShot(c, b) {
  const variant = shotVariant(b);
  if (b.pet || !variant) return false;
  const r = Math.max(4, Math.round(b.r)), color = colors[variant], a = Math.atan2(b.vy, b.vx);
  c.save();
  c.translate(Math.round(b.x / 2) * 2, Math.round(b.y / 2) * 2);
  c.rotate(a);
  for (let i = 1; i <= 3; i++) block(c, -r - i * 7, -2, 4, 4, i === 1 ? color : color + "70");
  if (b.wood) {
    block(c, -r - 3, -r + 2, r * 2 + 6, r * 2 - 4, ink);
    block(c, -r - 1, -r + 4, r * 2 + 2, r * 2 - 8, "#ba8d54");
    for (const y of [-r + 5, 0, r - 5]) block(c, -r + 1, y, r * 2 - 2, 2, "#e2bc7e");
    block(c, r - 3, -r + 3, 5, r * 2 - 6, "#f0d39b");
    block(c, r - 1, -3, 2, 6, ink);
  } else if (b.ghost) {
    for (const x of [-r, r - 3]) {
      block(c, x, -r, 4, r * 2, ink);
      block(c, x + 1, -r + 2, 2, r * 2 - 4, color);
    }
    for (const y of [-r, r - 3]) {
      block(c, -r, y, r * 2, 4, ink);
      block(c, -r + 2, y + 1, r * 2 - 4, 2, color);
    }
    block(c, -2, -2, 4, 4, "#e5d7ef");
  } else {
    block(c, -r, -r + 2, r * 2, r * 2 - 4, ink);
    block(c, -r + 2, -r, r * 2 - 4, r * 2, ink);
    block(c, -r + 2, -r + 2, r * 2 - 4, r * 2 - 4, color);
    block(c, -r + 4, -r + 3, Math.max(2, r - 3), 2, cream);
    if (b.heavy) {
      ring(c, 0, 0, Math.max(3, r - 4), ink);
      block(c, -2, -2, 4, 4, cream);
    }
  }
  if (b.ghost && b.wood) {
    for (const side of [-1, 1]) {
      block(c, -r - 4, side * (r + 4), r * 2 + 8, 2, "#bfa1e4");
      block(c, side * (r + 4), -r - 4, 2, r * 2 + 8, "#bfa1e4");
    }
  }
  if (b.phoebePlug) {
    for (const y of [-4, 2]) {
      block(c, r + 4, y, 6, 2, "#29485d");
      block(c, r + 6, y, 4, 2, "#9febdf");
    }
    block(c, -r - 6, -2, 4, 4, "#9febdf");
  }
  if (b.manBoost) {
    diamond(c, 0, 0, r + 4, "#e6b248");
    block(c, -3, -4, 2, 8, ink);
    block(c, 1, -4, 2, 8, ink);
    block(c, -1, -2, 2, 2, ink);
  }
  if (b.deepCharged) {
    for (const side of [-1, 1]) {
      block(c, -3, side * (r + 4), 8, 2, "#80d7ef");
      block(c, -5, side * (r + 2), 2, 2, "#c5f2ff");
    }
    block(c, r - 2, -2, 4, 4, "#d8f5ff");
  }
  if (b.beat || b.rhythm) {
    for (const side of [-1, 1]) {
      block(c, -3, side * (r + 4), 2, 6, "#65bba7");
      block(c, -5, side * (r + 4) + 4, 4, 2, "#b8efdc");
    }
  }
  if (b.gugu) for (let i = 0; i < 3; i++) block(c, -r - i * 6, -7 + i * 3, 3, 3, "#b8efdc");
  if (b.fadeBoost) {
    ring(c, 0, 0, Math.max(3, r - 2), "#634b37");
    block(c, -r + 3, -1, r * 2 - 6, 2, "#634b37");
    block(c, -1, -r + 3, 2, r * 2 - 6, "#634b37");
  }
  if (b.ironBoost || b.reboundBoost) {
    for (const y of [-r - 2, r + 2]) {
      block(c, -5, y, 6, 2, "#b6dce7");
      block(c, -1, y - 2, 2, 6, "#b6dce7");
    }
  }
  if (b.returnVoice) {
    for (const y of [-4, 4]) block(c, -r - 9, y, 6, 2, b.returning ? "#d3effa" : "#7595b0");
  }
  if (b.milkBoost) {
    block(c, -3, r + 3, 4, 4, "#c4eed9");
    block(c, 3, r + 1, 2, 2, "#85c9af");
  }
  if (b.poison) {
    block(c, -r - 5, 5, 3, 5, "#a5c86d");
    block(c, -r - 10, 8, 2, 3, "#7b9d52");
  }
  c.restore();
  return true;
}
function drawItemEffect(c, f) {
  if (f.type !== "itemCast" && f.type !== "itemImpact") return false;
  const t = Math.max(0, Math.min(1, 1 - f.life / f.max)), r = (f.radius || 24) * (f.type === "itemCast" ? 0.4 + t * 0.6 : t), color = colors[f.variant] || cream;
  c.save();
  c.globalAlpha *= Math.min(1, f.life / f.max * 2);
  c.translate(f.x, f.y);
  c.rotate(f.angle || 0);
  if (f.variant === "rice" || f.variant === "fedRice") {
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      block(c, Math.cos(a) * r, Math.sin(a) * r, 4, 2, color);
    }
    if (f.variant === "fedRice") diamond(c, 0, 0, r * 0.65, "#c6a353");
  } else if (f.variant === "stone") {
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5;
      block(c, Math.cos(a) * r - 2, Math.sin(a) * r - 2, 4, 4, ink);
      block(c, Math.cos(a) * r - 1, Math.sin(a) * r - 1, 2, 2, color);
    }
  } else if (f.variant === "basketball") {
    ring(c, 0, 0, r, color);
    for (const side of [-1, 1]) block(c, -r - 6, side * 5, 10, 2, ink);
  } else if (f.variant === "plug" || f.variant === "wire") {
    for (const side of [-1, 1]) for (let i = 0; i < 4; i++) block(c, side * (r - i * 3), i % 2 ? 0 : -4, 5, 2, i % 2 ? ink : color);
  } else if (f.variant === "egg") {
    for (const side of [-1, 1]) {
      diamond(c, side * r, 0, 4, color);
      block(c, side * r - 2, -1, 4, 2, ink);
    }
  } else if (f.variant === "ghost") {
    for (const side of [-1, 1]) {
      block(c, side * r, -r, 2, r * 2, color);
      block(c, side * r + (side < 0 ? 0 : -6), -r, 6, 2, color);
      block(c, side * r + (side < 0 ? 0 : -6), r, 6, 2, color);
    }
  } else if (f.variant === "deep") {
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) block(c, i * 5 - 8, side * (r - i * 3), 6, 2, color);
  } else if (f.variant === "wood") {
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      block(c, Math.cos(a) * r, Math.sin(a) * r, 6, 3, i % 2 ? color : "#8f6947");
    }
  } else if (f.variant === "man" || f.variant === "elbow") {
    diamond(c, 0, 0, r, ink);
    diamond(c, 0, 0, Math.max(0, r - 2), color);
    for (const y of [-5, 5]) block(c, -r - 9, y, 9, 2, color);
  } else if (f.variant === "rhythm" || f.variant === "gugu") {
    for (const side of [-1, 1]) {
      block(c, side * r, -7, 2, 12, color);
      block(c, side * r - 4, 3, 6, 3, color);
    }
  } else if (f.variant === "fade") {
    for (let i = 0; i < 12; i++) {
      const a = Math.PI * 0.25 + i * Math.PI / 12;
      block(c, Math.cos(a) * r, Math.sin(a) * r, 3, 3, color);
    }
  } else if (f.variant === "rebound") {
    for (const side of [-1, 1]) for (let i = 0; i < 4; i++) block(c, -i * 4, side * (r - i * 2), 4, 2, color);
  } else {
    ring(c, 0, 0, r, color);
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      block(c, Math.cos(a) * (r + 4), Math.sin(a) * (r + 4), 3, 3, color);
    }
  }
  c.restore();
  return true;
}
function drawItemReadiness(c, g) {
  if (!["play", "paused"].includes(g.mode)) return;
  c.save();
  const p = g.p;
  for (const e of g.room.enemies || []) if (!e.dead && e.ghostMarkedUntil > (g.actionClock ?? g.elapsed)) {
    const y = e.y - e.r - 15;
    diamond(c, e.x, y, 8, "#463451");
    diamond(c, e.x, y, 5, "#d0a0ed");
    for (const side of [-1, 1]) block(c, e.x + side * 12, y - 4, 3, 9, "#b67ed5");
  }
  for (const e of g.room.enemies || []) if (!e.dead && e.propertyMarkedUntil > (g.actionClock ?? g.elapsed)) {
    const y = e.y - e.r - 30;
    block(c, e.x - 7, y, 14, 13, "#334936");
    block(c, e.x - 4, y + 3, 8, 2, "#f0d982");
    block(c, e.x - 4, y + 7, 8, 2, "#f0d982");
  }
  if (g.has("man")) {
    for (let i = 0; i < 5; i++) {
      block(c, p.x - 14 + i * 6, p.y + 23, 4, 4, ink);
      if (g.manReady || g.manBurst > 0 || i < (g.manHits || 0)) block(c, p.x - 14 + i * 6, p.y + 23, 4, 2, "#f3c75d");
    }
    if (g.manReady) diamond(c, p.x, p.y + 16, 4, "#f3c75d");
  }
  if (g.has("man") && g.manBurst > 0) for (let i = 0; i < g.manBurst; i++) diamond(c, p.x - 5 + i * 10, p.y + 33, 3, "#f3c75d");
  c.restore();
}

// dist/empowered-shots.js
function empowerShot(b, factor) {
  const old = b.empowerScale || 1, next = Math.min(3, old * factor);
  b.damage *= next / old;
  b.empowerScale = next;
}

// dist/deepseek-items.js
var DEEPSEEK_ITEMS = [
  { id: "ricewhale", name: "\u5403\u767D\u996D\u7684\u84DD\u8272\u5927\u80A5\u9C7C", desc: "\u9CB8\u9C7C\u5A18\u5976\u4F34\uFF1A\u62AC\u52FA\u84C4\u52BF\u540E\u6295\u51FA\u996D\u56E2\uFF0C\u7EA6\u6BCF 1.4 \u79D2\u653B\u51FB\u4E00\u6B21\uFF0C\u4F24\u5BB3\u968F\u57FA\u7840\u653B\u51FB\u6210\u957F\uFF08\u4E0A\u9650 7.5\uFF09\u3002\u6E05\u7406\u6218\u6597\u623F\u540E\u5403\u9971\uFF0C\u63A5\u4E0B\u6765 3 \u6B21\u996D\u56E2\u4F24\u5BB3 +40%\u3002", short: "\u9CB8\u9C7C\u5A18\u5976\u4F34 \xB7 \u5403\u9971\u5F3A\u5316\u996D\u56E2" },
  { id: "ricebowl", name: "\u5C31\u4E00\u7897\u767D\u996D", desc: "\u6BCF\u6E05\u7406 4 \u4E2A\u6218\u6597\u623F\u6062\u590D 1 \u70B9\u751F\u547D\uFF1B\u6EE1\u8840\u65F6\u6539\u5F97 1 \u91D1\u5E01\uFF0C\u6BCF\u5C42\u6700\u591A\u7ED3\u7B97 2 \u6B21\u3002\u4E0E\u5927\u80A5\u9C7C\u642D\u914D\uFF0C\u5979\u7684\u653B\u51FB\u95F4\u9694\u7F29\u77ED 15%\u3002", short: "\u6E05\u623F\u5403\u996D \xB7 \u6EE1\u8840\u6362\u91D1\u5E01 \xB7 \u5582\u517B\u9CB8\u9C7C\u5A18" },
  { id: "tokenbag", name: "Token \u592A\u591A\u7528\u4E0D\u5B8C\u5566", desc: "\u6BCF 6 \u8F6E\u666E\u901A\u5C04\u51FB\u6709\u6548\u547D\u4E2D\uFF0C\u989D\u5916\u83B7\u5F97 4 \u70B9\u5927\u7206\u7B11\u5145\u80FD\uFF1B\u6BCF\u4E2A\u6218\u6597\u623F\u6700\u591A 3 \u6B21\u3002\u53CC\u53D1\u3001\u6247\u5F62\u3001\u7A7F\u900F\u548C\u5206\u88C2\u5171\u7528\u4E00\u8F6E\u8BA1\u6570\u3002", short: "\u6709\u6548\u547D\u4E2D\u6512 Token \xB7 \u989D\u5916\u7206\u7B11\u5145\u80FD" },
  { id: "deepthink", name: "\u5DF2\u601D\u8003\u4E09\u79D2", desc: "\u6218\u6597\u4E2D\u505C\u706B 3 \u79D2\uFF0C\u63A5\u4E0B\u6765 3 \u8F6E\u666E\u901A\u5C04\u51FB\u83B7\u5F97\u7A7F\u900F\u548C 150% \u989D\u5916\u4F24\u5BB3\uFF1B\u5F3A\u5316\u6253\u5B8C\u540E\u624D\u80FD\u518D\u6B21\u601D\u8003\u3002\u79FB\u52A8\u4E0D\u6253\u65AD\u601D\u8003\uFF1B\u4E0D\u80FD\u5728\u5B89\u5168\u623F\u63D0\u524D\u84C4\u529B\u3002", short: "\u505C\u706B\u601D\u8003 \xB7 \u8FDE\u7EED\u4E09\u8F6E\u5F3A\u5316\u7A7F\u900F" },
  { id: "wrongmodel", name: "\u7528\u6237\u522B\u8D70\uFF0C\u6211\u4E0A\u9519\u6A21\u578B\u4E86", desc: "\u65B0\u6218\u6597\u623F\u4EA4\u66FF\u5207\u6362\u6A21\u578B\uFF1A\u601D\u8003\u6863\u4F24\u5BB3 +35%\u3001\u653B\u51FB\u95F4\u9694 +20%\uFF1B\u5FEB\u901F\u6863\u4F24\u5BB3 -20%\u3001\u653B\u51FB\u95F4\u9694 -30%\u3002\u56DE\u8BBF\u4E0D\u5207\u6362\u3002", short: "\u9010\u623F\u5207\u6362 \xB7 \u91CD\u51FB\u6162\u5C04 / \u8F7B\u51FB\u5FEB\u5C04" }
].map((i) => ({ ...i, icon: "\u2726" }));
function resetDeepseek(g) {
  g.whale = null;
  g.deepThink = 0;
  g.deepReady = false;
  g.deepBurst = 0;
}
function enterDeepseek(g) {
  if (!g.has("wrongmodel") || !itemCombatEncounter(g.room) || g.room.deepModel) return;
  g.room.deepModel = (g.deepModelIndex || 0) % 2 ? "fast" : "think";
  g.deepModelIndex = (g.deepModelIndex || 0) + 1;
  g.emit("toast", { text: "\u4E0A\u9519\u6A21\u578B\u4E86\uFF1A\u672C\u623F\u4E3A" + (g.room.deepModel === "fast" ? "\u5FEB\u901F\u6863" : "\u601D\u8003\u6863") });
}
function deepStats(g) {
  const mode = g.has("wrongmodel") ? g.room.deepModel : null;
  return { damage: mode === "think" ? 1.35 : mode === "fast" ? 0.8 : 1, interval: mode === "think" ? 1.2 : mode === "fast" ? 0.7 : 1 };
}
function prepareDeepseekShot(g, start2, pet) {
  if (pet || g.bullets.length <= start2) return;
  const group = { counted: false }, ready2 = g.has("deepthink") && (g.deepReady || g.deepBurst > 0), stats = deepStats(g);
  if (g.deepReady && g.has("deepthink")) g.deepBurst = 3;
  g.deepReady = false;
  if (ready2) g.deepBurst--;
  g.deepThink = 0;
  for (const b of g.bullets.slice(start2)) {
    b.deepVolley = group;
    b.damage *= stats.damage;
    if (ready2) {
      empowerShot(b, 2.5);
      b.pierce = true;
      b.deepCharged = true;
      b.r += 2;
    }
  }
}
function hitDeepseek(g, e, b) {
  const r = g.room;
  if (b.pet || e.airborne || !itemCombatEncounter(r) || !g.has("tokenbag") || !b.deepVolley || b.deepVolley.counted) return;
  b.deepVolley.counted = true;
  if ((r.tokenGrants || 0) >= 3) return;
  r.tokenHits = (r.tokenHits || 0) + 1;
  if (r.tokenHits < 6) return;
  r.tokenHits = 0;
  r.tokenGrants = (r.tokenGrants || 0) + 1;
  g.activeCharge = Math.min(g.activeCost(), g.activeCharge + 4);
  g.effects.push({ type: "deepToken", x: e.x, y: e.y, tx: g.p.x, ty: g.p.y, life: 0.45, max: 0.45 });
}
function clearDeepseek(g, r) {
  if (!["fight", "challenge", "boss", "vault", "cache"].includes(r.type)) return;
  g.deepThink = 0;
  g.deepReady = false;
  g.deepBurst = 0;
  if (g.has("ricewhale")) {
    g.whaleFed = 3;
    if (g.whale) {
      g.whale.phase = "eat";
      g.whale.t = 0;
    }
    g.emit("toast", { text: "\u5927\u80A5\u9C7C\u5403\u9971\u4E86\uFF01\u63A5\u4E0B\u6765 3 \u6B21\u996D\u56E2\u5F3A\u5316\u3002" });
  }
  if (!g.has("ricebowl")) return;
  g.riceClears = (g.riceClears || 0) + 1;
  if (g.riceFloor !== g.floor) {
    g.riceFloor = g.floor;
    g.riceUses = 0;
  }
  if (g.riceClears % 4 || g.riceUses >= 2) return;
  g.riceUses++;
  if (g.p.hp < g.p.maxHp) {
    g.p.hp++;
    g.emit("heal");
    g.emit("toast", { text: "\u767D\u996D\u771F\u597D\u5403\uFF1A\u6062\u590D 1 \u70B9\u751F\u547D\u3002" });
  } else {
    g.coins++;
    g.emit("toast", { text: "\u5DF2\u7ECF\u5403\u9971\uFF1A\u767D\u996D\u6362\u5F97 1 \u91D1\u5E01\u3002" });
  }
}
function updateDeepseek(g, dt, playerDt, input) {
  if (g.has("deepthink") && itemCombatEncounter(g.room)) {
    if (input.fire) {
      g.deepThink = 0;
    } else if (!g.deepReady && !(g.deepBurst > 0)) {
      g.deepThink = Math.min(3, (g.deepThink || 0) + playerDt);
      if (g.deepThink >= 3) {
        g.deepReady = true;
        g.emit("toast", { text: "\u5DF2\u601D\u8003\u4E09\u79D2\uFF1A\u63A5\u4E0B\u6765\u4E09\u8F6E\u5F3A\u5316\u7A7F\u900F\uFF01" });
      }
    }
  } else {
    g.deepThink = 0;
    g.deepReady = false;
    g.deepBurst = 0;
  }
  if (!g.has("ricewhale")) return;
  const home = { x: Math.max(70, Math.min(890, g.p.x - 72)), y: Math.max(75, Math.min(525, g.p.y + 44)) }, s = g.whale ??= { ...safeSpot(g.room, home.x, home.y, 10), type: "pet", r: 10, cd: 0.5, t: 0, phase: "idle", face: 1, moving: false };
  s.t += dt;
  s.cd = Math.max(0, s.cd - dt);
  if (s.phase === "idle") {
    const d = Math.hypot(home.x - s.x, home.y - s.y), v = steer(g.room, s, home), x = s.x, y = s.y;
    s.x += v.x * Math.min(d, 270 * dt);
    s.y += v.y * Math.min(d, 270 * dt);
    moveOnTerrain(g.room, s, x, y);
    s.moving = Math.hypot(s.x - x, s.y - y) > 0.1;
    const target2 = g.room.enemies.filter((e) => !e.dead && !e.airborne && Math.hypot(e.x - s.x, e.y - s.y) < 450 && shotLaneOpen(g.room, s, e)).sort((a, b) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y))[0];
    if (target2 && s.cd <= 0) {
      s.target = target2;
      s.face = target2.x >= s.x ? 1 : -1;
      s.phase = "windup";
      s.t = 0;
    }
  } else if (s.phase === "windup" && s.t >= 0.32) {
    s.phase = "attack";
    s.t = 0;
    s.cd = 1.4 * (g.has("ricebowl") ? 0.85 : 1);
    const e = s.target;
    if (!e || e.dead || e.airborne) return;
    const x = s.x + s.face * 26, y = s.y - 18, a = Math.atan2(e.y - y, e.x - x), fed = (g.whaleFed || 0) > 0;
    if (fed) g.whaleFed--;
    g.bullets.push({ x, y, vx: Math.cos(a) * 330, vy: Math.sin(a) * 330, r: 7, life: 1.5, damage: Math.min(7.5, 2 + g.p.damage) * (fed ? 1.4 : 1), bounce: 0, pierce: false, pet: true, rice: true, fed, hits: /* @__PURE__ */ new Set() });
    g.effects.push({ type: "petMuzzle", x, y, life: 0.18, max: 0.18, radius: 10 });
  } else if (s.phase === "attack" && s.t >= 0.25 || s.phase === "eat" && s.t >= 0.8) {
    s.phase = "idle";
    s.t = 0;
  }
}
function deepCombos(g) {
  return [["\u767D\u996D\u5F00\u5DE5", ["ricewhale", "ricebowl"]], ["\u601D\u8003\u5927\u58F0\u70B9", ["deepthink", "heavyvoice"]], ["Token \u5FEB\u5145", ["tokenbag", "battery"]]].filter(([, ids]) => ids.every((id) => g.has(id))).map(([name]) => name);
}

// dist/meme-items.js
var MEME_ITEMS = [
  ["voidframe", "\u68CD\u6BCD\u7684\u7A7A\u76F8\u6846", "\u6BCF\u7B2C 3 \u6B21\u666E\u901A\u5C04\u51FB\u53D8\u4E3A\u865A\u5F71\u5F39\uFF0C\u4F24\u5BB3 +100%\uFF0C\u7A7F\u900F\u654C\u4EBA\u53CA\u623F\u5185\u969C\u788D\uFF1B\u53CC\u53D1\u548C\u6247\u5F62\u5171\u7528\u8BA1\u6570\u3002"],
  ["rollwood", "\u6EDA\u6728\u8C10\u97F3\u6897", "\u7B11\u5F39\u53D8\u6162\u3001\u53D8\u5927\uFF0C\u4F24\u5BB3 +55%\uFF0C\u653B\u51FB\u95F4\u9694 +25%\u3002"],
  ["penguin", "\u81ED\u4F01\u9E45\u7684\u77F3\u5934", "\u81ED\u4F01\u9E45\u5976\u4F34\uFF0C\u62AC\u7FC5\u63A8\u51FA\u5730\u9762\u6EDA\u77F3\uFF1A\u53EF\u649E\u51FB\u6700\u591A 3 \u4E2A\u5730\u9762\u654C\u4EBA\u5E76\u51FB\u9000\u666E\u901A\u602A\uFF0C\u5F39\u5899 1 \u6B21\uFF1B\u51B7\u5374 2.2 \u79D2\uFF0C\u4F24\u5BB3\u4E3A 2.4 + \u57FA\u7840\u653B\u51FB\uFF08\u4E0A\u9650 7\uFF09\u3002\u6EDA\u77F3\u4F1A\u843D\u5165\u5751\u6D1E\uFF0C\u4E0D\u6253\u98DE\u884C\u602A\u3002"],
  ["stonepouch", "\u7231\u6361\u77F3\u5934", "\u58F0\u6CE2\u591A\u53CD\u5F39\u4E00\u6B21\uFF0C\u4E0D\u964D\u4F4E\u4F24\u5BB3\uFF1B\u81ED\u4F01\u9E45\u7684\u77F3\u5934\u4E5F\u80FD\u53CD\u5F39\u3002"],
  ["gugucharm", "\u5495\u5495\u560E\u560E\u54E8", "\u6BCF\u7B2C 4 \u6B21\u666E\u901A\u5C04\u51FB\u53D8\u4E3A\u7D27\u5BC6\u4E09\u8FDE\u8282\u594F\u5F39\uFF1B\u4E2D\u592E\u5F39\u4FDD\u7559 100% \u4F24\u5BB3\uFF0C\u4E24\u4FA7\u5404 60%\uFF0C\u66F4\u5BB9\u6613\u96C6\u4E2D\u547D\u4E2D\u3002"],
  ["tempura", "\u5929\u7D20\u7F57\u867E\u5957", "\u8865\u7ED9\u578B\u5929\u7D20\u7F57\uFF1A\u6BCF\u4E2A\u6218\u6597\u623F\u6700\u591A\u5410\u51FA 2 \u4EFD\u867E\u7C73\u56E2\uFF0C\u843D\u5730\u540E\u9760\u8FD1\u62FE\u53D6\uFF0C\u83B7\u5F97 10 \u79D2\u4F24\u5BB3 +45%\u3001\u79FB\u901F +15%\u3002\u8865\u7ED9 14 \u79D2\u6D88\u5931\uFF0C\u9760\u8FD1 50 \u8303\u56F4\u62FE\u53D6\uFF0C\u4E0D\u76F4\u63A5\u653B\u51FB\u3002"],
  ["oyeye", "\u6B27\u8036\u8282\u62CD", "\u6BCF\u7B2C 4 \u6B21\u666E\u901A\u5C04\u51FB\u589E\u4F24 80%\uFF0C\u9996\u6B21\u547D\u4E2D\u8FD8\u4F1A\u9707\u54CD\uFF0C\u5BF9\u5468\u56F4 80 \u8303\u56F4\u7684\u5176\u4ED6\u654C\u4EBA\u9020\u6210 60% \u6E85\u5C04\u4F24\u5BB3\uFF08\u4E0A\u9650 5\uFF09\uFF0C\u4E0D\u7A7F\u969C\u788D\uFF1B\u6BCF\u8F6E\u53EA\u9707\u54CD\u4E00\u6B21\u3002\u4E0E\u8282\u62CD\u8D34\u540C\u8F6E\u589E\u4F24\u5408\u8BA1\u6700\u591A 140%\u3002"],
  ["shrimppaste", "\u867E\u7C73\u7CCA\u7CCA", "\u6BCF\u6E05\u7406 4 \u4E2A\u6218\u6597\u623F\u6062\u590D 1 \u70B9\u751F\u547D\uFF0C\u6EE1\u8840\u65F6\u4FDD\u7559\u4E00\u6B21\u5F85\u7528\u6062\u590D\uFF0C\u5728\u540E\u7EED\u6E05\u623F\u53D7\u4F24\u65F6\u7ED3\u7B97\uFF1B\u5929\u7D20\u7F57\u8865\u7ED9\u5F3A\u5316\u65F6\u95F4\u4ECE 10 \u79D2\u5EF6\u957F\u81F3 12 \u79D2\u3002"],
  ["shrimpfeet", "\u5929\u7D20\u7F57\u7684\u811A\u811A", "\u86D9\u8DF3\u843D\u5730\u8E29\u51FA 100 \u8303\u56F4\u51B2\u51FB\uFF0C\u9020\u6210 1.5 + \u57FA\u7840\u653B\u51FB\u4F24\u5BB3\uFF08\u4E0A\u9650 5\uFF09\uFF0C\u5E76\u7559\u4E0B 3 \u79D2\u811A\u5370\uFF0C\u4F7F\u8303\u56F4\u5185\u5730\u9762\u666E\u901A\u602A\u51CF\u901F 45%\uFF1B\u6700\u591A\u4FDD\u7559 3 \u5904\uFF0C\u4E0D\u7A7F\u969C\u788D\u3002\u642D\u914D\u6B27\u8036\u989D\u5916\u9020\u6210 1 \u70B9\u4F24\u5BB3\u3002"],
  ["sun", "\u5E26\u5E26\u5927\u5E08\u5144", "\u5B59\u7B11\u5DDD\u5976\u4F34\uFF0C\u4E3E\u8D77\u624B\u673A\u5411 380 \u8303\u56F4\u5185\u6700\u591A 2 \u4E2A\u654C\u4EBA\u53D1\u51FA\u6295\u8BC9\uFF0C\u4F18\u5148\u8FDC\u7A0B\u602A\u3002\u6BCF\u4E2A\u76EE\u6807\u53D7\u5230 2.5 + \u57FA\u7840\u653B\u51FB\xD71.2 \u4F24\u5BB3\uFF08\u4E0A\u9650 8\uFF09\uFF1B\u666E\u901A\u8FDC\u7A0B\u602A\u989D\u5916\u88AB\u5E72\u6270 2.6 \u79D2\u3002\u51B7\u5374 3.2 \u79D2\uFF0CBoss \u4E5F\u53D7\u4F24\u4F46\u4E0D\u88AB\u6253\u65AD\u3002"],
  ["propertycard", "\u90A3\u4F60\u53BB\u627E\u7269\u7BA1\u554A", "\u5927\u7206\u7B11\u6295\u8BC9 240 \u8303\u56F4\u5185\u654C\u4EBA\uFF0C\u4F7F\u5176\u53D7\u5230\u4F24\u5BB3 +15%\uFF0C\u6301\u7EED 4 \u79D2\uFF0C\u5BF9 Boss \u540C\u6837\u6709\u6548\uFF1B\u666E\u901A\u8FDC\u7A0B\u602A\u989D\u5916\u88AB\u5E72\u6270 1.5 \u79D2\u3002\u4E0D\u7A7F\u5899\u3001\u4E0D\u6E05\u5F39\u3002\u4E0E\u5927\u5E08\u5144\u642D\u914D\uFF0C\u4ED6\u4E00\u6B21\u6295\u8BC9 3 \u4E2A\u76EE\u6807\uFF0C\u51B7\u5374\u964D\u81F3 2.6 \u79D2\u3002"],
  ["quietbadge", "\u4F60\u543C\u90A3\u4E48\u5927\u58F0\u5E72\u4EC0\u4E48", "\u5927\u7206\u7B11\u5145\u80FD\u9700\u6C42\u51CF\u5C11 10 \u70B9\uFF0C\u6700\u4F4E 25\uFF0C\u7206\u7B11\u534A\u5F84\u4ECE 160 \u6269\u81F3 190\uFF1B\u4E0D\u964D\u4F4E\u666E\u901A\u58F0\u6CE2\u4F24\u5BB3\u3002"],
  ["kobe", "\u540E\u4EF0\u8DF3\u6295\xB724\u53F7", "\u79D1\u6BD4\u5976\u4F34\uFF0C\u84C4\u52BF\u8DF3\u8D77\u540E\u6295\u51FA\u53EF\u53CD\u5F39\u7BEE\u7403\uFF0C\u51B7\u5374 1.65 \u79D2\uFF0C\u4F24\u5BB3\u4E3A 3 + \u57FA\u7840\u653B\u51FB\xD71.2\uFF08\u4E0A\u9650 9\uFF09\u3002"],
  ["fadeaway", "\u540E\u4EF0\u6295\u7BEE\u5305", "\u6BCF\u6B21\u6210\u529F\u86D9\u8DF3\u7ACB\u5373\u5411\u516B\u4E2A\u65B9\u5411\u5404\u5C04\u51FA\u4E00\u53D1\u7BEE\u7403\u7B11\u5F39\uFF1B\u6BCF\u53D1\u9020\u6210 1 + \u57FA\u7840\u653B\u51FB\u7684 150% \u4F24\u5BB3\uFF08\u4E0A\u9650 8\uFF09\uFF0C\u81EA\u5E26\u7A7F\u900F\uFF0C\u7EE7\u627F\u6BD2\u548C\u53CD\u5F39\uFF0C\u5F39\u901F\u4E0E\u547D\u4E2D\u8303\u56F4\u63D0\u9AD8\u3002\u56FA\u5B9A 8 \u53D1\uFF0C\u4E0D\u6D88\u8017\u5176\u4ED6\u5F3A\u5316\uFF0C\u4E0D\u53D7\u53CC\u53D1\u6216\u6247\u5F62\u589E\u6B96\u3002"],
  ["ironrim", "\u6253\u94C1\u7BEE\u7B50", "\u58F0\u6CE2\u591A\u53CD\u5F39 1 \u6B21\uFF0C\u9996\u6B21\u53CD\u5F39\u540E\u4F24\u5BB3 +35%\uFF1B\u4E0E\u56DE\u5F39\u7259\u5957\u540C\u65F6\u89E6\u53D1\u65F6\uFF0C\u53CD\u5F39\u589E\u4F24\u5408\u8BA1\u6700\u591A 50%\u3002"],
  ["man", "Man\uFF01", "5 \u8F6E\u666E\u901A\u5C04\u51FB\u6709\u6548\u547D\u4E2D\u540E\uFF0C\u63A5\u4E0B\u6765 2 \u8F6E\u58F0\u6CE2\u589E\u4F24 100% \u5E76\u53D8\u5927\uFF1B\u540C\u8F6E\u591A\u53D1\u53EA\u8BA1\u4E00\u6B21\uFF0C\u5F3A\u5316\u8F6E\u4E0D\u4E3A\u81EA\u8EAB\u518D\u5145\u80FD\u3002\u591A\u79CD\u5468\u671F\u5F3A\u5316\u53E0\u52A0\u6700\u591A 3 \u500D\u4F24\u5BB3\u3002"],
  ["elbow", "\u8098\u51FB\u62A4\u8155", "\u86D9\u8DF3\u6CBF\u9014\u8098\u51FB\u9020\u6210 3 + \u57FA\u7840\u653B\u51FB\u7684 200% \u4F24\u5BB3\uFF08\u4E0A\u9650 12\uFF09\u5E76\u51FB\u9000\u666E\u901A\u602A\uFF1B\u6BCF\u6B21\u86D9\u8DF3\u6BCF\u4E2A\u654C\u4EBA\u53EA\u89E6\u53D1\u4E00\u6B21\uFF0CBoss \u4E0D\u4F1A\u88AB\u51FB\u9000\u3002"],
  ["fouram", "\u51CC\u6668\u56DB\u70B9\u95F9\u949F", "\u65B0\u6218\u6597\u623F\u5165\u573A 2 \u79D2\u540E\u83B7\u5F97 5 \u79D2\u70ED\u8EAB\uFF1A\u653B\u51FB\u95F4\u9694\u7F29\u77ED 15%\uFF1B\u56DE\u8BBF\u4E0D\u5237\u65B0\u3002"],
  ["mambaout", "Mamba out", "\u86D9\u8DF3\u7ED3\u675F\u540E\u83B7\u5F97 0.25 \u79D2\u843D\u5730\u65E0\u654C\uFF0C1.8 \u79D2\u5185\u79FB\u901F +25%\u3001\u653B\u51FB\u95F4\u9694\u7F29\u77ED 15%\uFF1B\u4E0E\u8098\u51FB\u7EC4\u5408\uFF0C\u547D\u4E2D\u540E\u86D9\u8DF3\u51B7\u5374\u51CF\u5C11 0.45 \u79D2\uFF0C\u6BCF\u6B21\u6700\u591A\u4E00\u6B21\u3002"],
  ["politesuit", "\u5112\u96C5\u968F\u548C\u897F\u88C5", "\u5355\u53D1\u4F24\u5BB3\u4E0D\u964D\u4F4E\uFF0C\u653B\u51FB\u95F4\u9694\u7F29\u77ED 20%\uFF1B\u4E0E\u5927\u5E08\u5144\u642D\u914D\uFF0C\u4ED6\u7684\u8FDC\u7A0B\u602A\u5E72\u6270\u5EF6\u957F\u5230 3.2 \u79D2\u3002"],
  ["ghostbuddha", "\u9B3C\u4F5B\u4F9B\u50CF", "\u5BF9 Boss \u5E38\u9A7B\u589E\u4F24 8%\uFF1B\u5B9E\u9645\u53D7\u4F24\u540E\u7559\u4E0B\u4E00\u5C0A\u9B3C\u4F5B\u5438\u5F15\u666E\u901A\u8FD1\u6218\u602A 3 \u79D2\uFF0C\u5E76\u7ED9\u672C\u623F\u5B58\u6D3B Boss \u548C 320 \u8303\u56F4\u5185\u53EF\u89C1\u666E\u901A\u602A\u65BD\u52A0 6 \u79D2\u5370\u8BB0\uFF0C\u589E\u4F24\u6539\u4E3A 35%\uFF08\u4E0D\u4E0E\u5E38\u9A7B\u589E\u4F24\u53E0\u52A0\uFF09\uFF1B\u51B7\u5374 10 \u79D2\u3002\u5370\u8BB0\u6309\u5B9E\u9645\u6218\u6597\u65F6\u95F4\u8BA1\u65F6\uFF0C\u4E0D\u6539\u53D8 Boss \u9884\u8B66\u3001\u4E0D\u6E05\u5F39\u3002"],
  ["sweetpenguin", "\u9999\u4F01\u9E45\u73A9\u5076", "\u9999\u4F01\u9E45\u5976\u4F34\uFF0C\u4F18\u5148\u62E6\u622A\u6B63\u5728\u98DE\u5411\u5976\u86D9\u7684\u5A01\u80C1\u5F39\uFF1B\u6325\u7FC5\u524D\u6447 0.14 \u79D2\uFF0C\u4E00\u6B21\u6700\u591A\u62E6 6 \u9897\uFF0C\u8303\u56F4 200\uFF0C\u51B7\u5374 2.5 \u79D2\u3002"]
].map(([id, name, desc]) => ({ id, name, desc, short: desc, icon: "\u2726" }));
var MEME_FOLLOWERS = ["penguin", "tempura", "sun", "kobe", "sweetpenguin"];
function memeDamage(g) {
  return (g.tempuraBuff > 0 ? 1.45 : 1) * (g.has("rollwood") ? 1.55 : 1);
}
var mambaActive = (g) => g.has("mambaout") && g.outUntil > (g.actionClock ?? g.elapsed);
function memeInterval(g) {
  return (mambaActive(g) ? 0.85 : 1) * (g.has("rollwood") ? 1.25 : 1) * (g.has("politesuit") ? 0.8 : 1) * (g.has("fouram") && g.room.warmStart <= g.elapsed && g.room.warmUntil > g.elapsed ? 0.85 : 1);
}
function prepareMemeShot(g, start2, pet) {
  if (pet || g.bullets.length <= start2) return;
  const seq = g.memeVolley = (g.memeVolley || 0) + 1, group = { counted: false, rhythmHit: false }, man = g.has("man") && (g.manReady || g.manBurst > 0);
  const manStart = man && !(g.manBurst > 0);
  if (manStart) g.manBurst = 2;
  if (man) g.manBurst--;
  g.manReady = false;
  group.manChargeable = !man;
  const original = g.bullets.splice(start2);
  if (manStart) g.emit("itemVoice", { key: "man" });
  if (g.has("oyeye") && seq % 4 === 0) g.emit("itemVoice", { key: "oyeye" });
  if (g.has("gugucharm") && seq % 4 === 0) g.emit("itemVoice", { key: "gugu" });
  for (const b of original) {
    b.memeGroup = group;
    b.manBoost = !!man;
    b.rhythm = !!(g.has("oyeye") && seq % 4 === 0);
    b.gugu = !!(g.has("gugucharm") && seq % 4 === 0);
    b.damage *= memeDamage(g);
    if (man) {
      empowerShot(b, 2);
      b.r += 3;
    }
    if (g.has("voidframe") && seq % 3 === 0) {
      b.pierce = true;
      empowerShot(b, 2);
      b.ghost = true;
    }
    if (g.has("rollwood")) {
      b.vx *= 0.75;
      b.vy *= 0.75;
      b.shotSpeed = (b.shotSpeed || 490) * 0.75;
      b.life /= 0.75;
      if (b.returnAfter) b.returnAfter /= 0.75;
      b.r += 3;
      b.wood = true;
    }
    if (g.has("stonepouch")) b.bounce++;
    if (g.has("ironrim")) b.bounce++;
    if (g.has("oyeye") && seq % 4 === 0) empowerShot(b, b.beat ? 2.4 / 1.85 : 1.8);
    if (g.has("gugucharm") && seq % 4 === 0) {
      for (const off of [-0.08, 0, 0.08]) {
        const a = Math.atan2(b.vy, b.vx) + off, v = Math.hypot(b.vx, b.vy);
        g.bullets.push({ ...b, vx: Math.cos(a) * v, vy: Math.sin(a) * v, damage: b.damage * (off === 0 ? 1 : 0.6), hits: /* @__PURE__ */ new Set() });
      }
    } else g.bullets.push(b);
  }
}
function hitMeme(g, e, b) {
  if (b.pet) return;
  const group = b.memeGroup;
  if (b.rhythm && group && !group.rhythmHit) {
    group.rhythmHit = true;
    g.effects.push({ type: "itemImpact", variant: "rhythm", x: e.x, y: e.y, angle: 0, radius: 80, life: 0.3, max: 0.3 });
    for (const target2 of [...g.room.enemies]) if (target2 !== e && !target2.dead && !target2.airborne && Math.hypot(target2.x - e.x, target2.y - e.y) <= 80 + target2.r && shotLaneOpen(g.room, e, target2)) g.damageEnemy(target2, Math.min(5, b.damage * 0.6), false);
  }
  if (!g.has("man") || !group || group.counted || group.manChargeable === false || g.manReady || g.manBurst > 0) return;
  group.counted = true;
  g.manHits = (g.manHits || 0) + 1;
  if (g.manHits >= 5) {
    g.manHits = 0;
    g.manReady = true;
    g.emit("toast", { text: "Man\uFF01\u63A5\u4E0B\u6765\u4E24\u8F6E\u5927\u7B11\u5F3A\u5316\u3002" });
  }
}
function fireDashVolley(g) {
  const p = g.p, group = { nextHit: -Infinity };
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    g.bullets.push({ x: p.x, y: p.y - 6, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, r: 11, life: 0.9, damage: Math.min(8, 1 + p.damage * 1.5), poison: g.has("eye"), pierce: true, bounce: (g.has("bubble") ? 2 : 0) + (g.has("stonepouch") ? 1 : 0) + (g.has("ironrim") ? 1 : 0) + (g.has("springteeth") ? 1 : 0), hits: /* @__PURE__ */ new Set(), pet: false, fadeBoost: true, dashShot: true, vfxVolley: group });
  }
  g.effects.push({ type: "itemImpact", variant: "basketball", x: p.x, y: p.y - 6, angle: 0, radius: 36, life: 0.3, max: 0.3 });
}
function bounceMeme(g, b) {
  if (!b.pet && g.has("ironrim") && !b.ironBoost) {
    b.ironBoost = true;
    b.damage *= g.has("springteeth") ? 1.5 / 1.2 : 1.35;
  }
}
function ghostDamageScale(g, e) {
  const now = g.actionClock ?? g.elapsed, ghost = g.has("ghostbuddha") ? e.ghostMarkedUntil > now ? 0.35 : e.type === "boss" ? 0.08 : 0 : 0, complaint = g.has("propertycard") && e.propertyMarkedUntil > now ? 0.15 : 0;
  return 1 + ghost + complaint;
}
function hurtMeme(g) {
  if (g.has("ghostbuddha") && !(g.ghostReadyAt > g.elapsed)) {
    g.ghostReadyAt = g.elapsed + 10;
    g.ghostDecoy = { x: g.p.x, y: g.p.y, until: g.elapsed + 3 };
    g.effects.push({ type: "ghostIdol", x: g.p.x, y: g.p.y, life: 3, max: 3 });
    for (const e of g.room.enemies) if (!e.dead && (e.type === "boss" || Math.hypot(e.x - g.p.x, e.y - g.p.y) < 320 && shotLaneOpen(g.room, g.p, e))) {
      e.ghostMarkedUntil = (g.actionClock ?? g.elapsed) + 6;
      g.effects.push({ type: "voiceChain", x: g.p.x, y: g.p.y, tx: e.x, ty: e.y, life: 0.3, max: 0.3 });
    }
  }
}
function clearMeme(g, r) {
  if (!["fight", "challenge", "boss", "vault", "cache"].includes(r.type) || !g.has("shrimppaste")) return;
  g.shrimpClears = Math.min(4, (g.shrimpClears || 0) + 1);
  if (g.shrimpClears >= 4 && g.p.hp < g.p.maxHp) {
    g.shrimpClears = 0;
    g.p.hp++;
    g.emit("heal");
  }
}
function nearestDashPoint(a, b, e) {
  const dx = b.x - a.x, dy = b.y - a.y, t = Math.max(0, Math.min(1, ((e.x - a.x) * dx + (e.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return { x: a.x + dx * t, y: a.y + dy * t };
}
var grounded = (e) => !e.dead && !e.airborne && !["fly", "hopper"].includes(e.type);
function footZoneScale(g, e) {
  return e !== g.p && e.type !== "boss" && grounded(e) && (g.footZones || []).some((z) => z.until > g.elapsed && Math.hypot(e.x - z.x, e.y - z.y) < 100 + e.r && shotLaneOpen(g.room, z, e)) ? 0.55 : 1;
}
function updateMeme(g, dt, origin = g.p) {
  g.tempuraBuff = Math.max(0, (g.tempuraBuff || 0) - dt);
  const p = g.p, dash = p.dash > 0;
  if (dash && !g.wasMemeDash) {
    g.elbowHits = /* @__PURE__ */ new Set();
    g.elbowRefund = false;
    if (g.has("fadeaway")) fireDashVolley(g);
  }
  if (g.wasMemeDash && !dash) {
    if (g.has("mambaout")) {
      if (itemCombatActive(g.room)) g.emit("itemVoice", { key: "mamba" });
      g.outUntil = (g.actionClock ?? g.elapsed) + 1.8;
      p.inv = Math.max(p.inv, 0.25);
    }
    if (g.has("shrimpfeet")) {
      if (itemCombatActive(g.room)) g.emit("itemVoice", { key: "shrimpfeet" });
      g.footZones ??= [];
      g.footZones.push({ x: p.x, y: p.y, until: g.elapsed + 3 });
      g.footZones = g.footZones.slice(-3);
      g.effects.push({ type: "shrimpFeet", x: p.x, y: p.y, life: 3, max: 3, radius: 100 });
      for (const e of [...g.room.enemies]) if (grounded(e) && Math.hypot(e.x - p.x, e.y - p.y) < 100 + e.r && shotLaneOpen(g.room, p, e)) g.damageEnemy(e, Math.min(5, 1.5 + p.damage) + (g.has("oyeye") ? 1 : 0));
    }
  }
  if (dash && g.has("elbow")) for (const e of [...g.room.enemies]) {
    const q = nearestDashPoint(origin, p, e);
    if (!e.dead && !e.airborne && !g.elbowHits.has(e) && Math.hypot(e.x - q.x, e.y - q.y) < p.r + e.r + 18 && shotLaneOpen(g.room, q, e)) {
      g.elbowHits.add(e);
      g.damageEnemy(e, Math.min(12, 3 + p.damage * 2));
      if (e.type !== "boss") {
        const a = Math.atan2(e.y - q.y, e.x - q.x);
        e.vx = Math.cos(a) * 350;
        e.vy = Math.sin(a) * 350;
        e.repelled = 0.22;
      }
      elbowItemVfx(g, e);
      if (g.has("mambaout") && !g.elbowRefund) {
        p.dashCD = Math.max(0, p.dashCD - 0.45);
        g.elbowRefund = true;
      }
    }
  }
  g.wasMemeDash = dash;
  g.footZones = (g.footZones || []).filter((z) => z.until > g.elapsed);
  if (g.ghostDecoy?.until <= g.elapsed) g.ghostDecoy = null;
}
function memeCombos(g) {
  return [["\u843D\u5730\u6B27\u8036", ["shrimpfeet", "oyeye"]], ["\u8DF3\u6295\u8098\u51FB", ["fadeaway", "elbow"]], ["\u6253\u94C1\u96C6\u706B", ["ironrim", "man"]], ["\u77F3\u5934\u5F39\u8DF3", ["penguin", "stonepouch"]], ["\u5582\u9971\u5929\u7D20\u7F57", ["tempura", "shrimppaste"]], ["\u7269\u7BA1\u52A0\u6025", ["sun", "propertycard"]], ["\u6587\u660E\u529D\u505C", ["sun", "politesuit"]], ["\u8098\u4E86\xB7Out", ["elbow", "mambaout"]]].filter(([, ids]) => ids.every((id) => g.has(id))).map(([name]) => name);
}

// dist/ranged-interrupt.js
function interruptRanged(g, e, duration) {
  if (!e || e.dead || e.type === "boss" || !(g.canEnemyShoot(e) || e.type === "shooter")) return false;
  e.phoneMutedUntil = Math.max(e.phoneMutedUntil || 0, g.elapsed + duration);
  e.cd = Math.max(e.cd || 0, duration);
  e.mobCast = null;
  e.sound = null;
  e.screech = null;
  e.gunCast = null;
  g.effects = g.effects.filter((f) => !(f.owner === e && ["mobZone", "milkBottle"].includes(f.type) && !f.triggered));
  return true;
}

// dist/crane-gates.js
var clamp2 = (v, a, b) => Math.max(a, Math.min(b, v));
function startCraneGate(g, e) {
  const rage2 = e.hp < e.maxHp * 0.5;
  e.hands = { mode: "gate", t: 0, wind: 1, placed: false, cancelled: false, fired: 0, rage: rage2, gap: clamp2(g.p.y, 165, 435), x: clamp2(g.p.x, 210, 750) };
  e.cd = rage2 ? 4.7 : 4.2;
  g.emit("toast", { text: "\u5206\u62E3\u5DE8\u94B3 \xB7 \u5C01\u7EBF\u6E05\u573A\uFF01\u7A7F\u8FC7\u53CC\u81C2\u95F4\u7684\u5F00\u53E3\uFF0C\u70B8\u638C\u53EF\u505C\u673A\u3002" });
  return true;
}
function craneArms(h2) {
  const gapSize = 156, top = h2.gap - gapSize / 2, bottom = h2.gap + gapSize / 2;
  return [{ x: h2.x, y: (55 + top) / 2, w: 62, h: top - 55, r: 31 }, { x: h2.x, y: (545 + bottom) / 2, w: 62, h: 545 - bottom, r: 31 }];
}
function updateCraneGate(g, e, dt) {
  const h2 = e.hands;
  if (h2?.mode !== "gate") return false;
  if (e.dead || h2.cancelled || e.handDisabled > 0) {
    g.room.obstacles = g.room.obstacles.filter((o) => o.owner !== e);
    g.enemyBullets = g.enemyBullets.filter((b) => b.catcherPressure !== e);
    e.hands = null;
    return true;
  }
  h2.t += dt;
  if (h2.t >= h2.wind && !h2.placed) {
    h2.placed = true;
    g.room.obstacles.push(...craneArms(h2).map((a) => ({ ...a, kind: "hand", owner: e })));
    for (const a of craneArms(h2)) if (overlaps(a, g.p.x, g.p.y, g.p.r)) {
      g.hurt();
      g.p.x = clamp2(a.x + (g.p.x < a.x ? -1 : 1) * (31 + g.p.r + 6), 72, 888);
    }
  }
  if (h2.t >= 1.3 + h2.fired * 0.85 && h2.fired < (h2.rage ? 4 : 3)) {
    const fromLeft = e.x < g.p.x, dir = fromLeft ? 1 : -1;
    for (let y = 70; y <= 530; y += 24) if (Math.abs(y - h2.gap) > 94) g.enemyBullets.push({ x: fromLeft ? 65 : 895, y, vx: dir * (h2.rage ? 285 : 245), vy: 0, r: 7, life: 4, catcherPressure: e });
    h2.fired++;
  }
  if (h2.t >= (h2.rage ? 4.35 : 3.8)) {
    g.room.obstacles = g.room.obstacles.filter((o) => o.owner !== e);
    e.hands = null;
  }
  return true;
}
function drawCraneGates(c, g) {
  for (const e of g.room.enemies) {
    const h2 = e.hands;
    if (e.dead || h2?.mode !== "gate" || h2.cancelled) continue;
    c.save();
    c.fillStyle = "#76c99940";
    c.fillRect(55, h2.gap - 78, 850, 156);
    c.strokeStyle = "#7cce9b";
    c.lineWidth = 3;
    c.strokeRect(55, h2.gap - 78, 850, 156);
    c.fillStyle = "#e8ae7255";
    c.fillRect(h2.x - 31, 55, 62, h2.gap - 133);
    c.fillRect(h2.x - 31, h2.gap + 78, 62, 467 - h2.gap);
    for (const a of craneArms(h2)) {
      c.save();
      c.beginPath();
      c.rect(55, 55, 850, h2.gap - 133);
      c.rect(55, h2.gap + 78, 850, 467 - h2.gap);
      c.clip();
      c.strokeStyle = "#4b4237";
      c.lineWidth = 18;
      c.beginPath();
      c.moveTo(e.x, e.y);
      c.lineTo(a.x, e.y);
      c.lineTo(a.x, a.y);
      c.stroke();
      c.strokeStyle = "#dab269";
      c.lineWidth = 10;
      c.stroke();
      c.restore();
      c.fillStyle = h2.placed ? "#cf9853" : "#cf985380";
      c.fillRect(a.x - a.w / 2, a.y - a.h / 2, a.w, a.h);
      c.strokeStyle = "#493c30";
      c.lineWidth = 3;
      c.strokeRect(a.x - a.w / 2, a.y - a.h / 2, a.w, a.h);
      for (let y = a.y - a.h / 2 + 8; y < a.y + a.h / 2 - 4; y += 20) {
        c.fillStyle = "#654e34";
        c.fillRect(a.x - 28, y, 56, 5);
      }
    }
    c.textAlign = "center";
    c.font = "bold 13px system-ui";
    c.fillStyle = "#294c39";
    c.fillText(h2.placed ? "\u7A7F\u8FC7\u94B3\u53E3 \xB7 \u70B8\u638C\u505C\u673A" : "\u94B3\u53E3\u9501\u5B9A \xB7 \u79FB\u5411\u7EFF\u8272\u5F00\u53E3", 480, h2.gap + 5);
    c.restore();
  }
}

// dist/atlas-regions.js
var ATLAS_CUTS = {
  "phoebe-electrician-v1.png": { x: [0, 443, 857, 1300, 1774], y: [0, 465, 887] },
  "deepseek-actions-v1.png": { x: [0, 515, 1030, 1555, 2172], y: [0, 724] },
  "gojo-manga-actions-v2.png": { x: [0, 550, 1120, 1640, 2172], y: [0, 724] },
  "followers-family-v2.png": { x: [0, 290, 545, 835, 1122], y: [0, 330, 593, 847, 1061, 1402] },
  "items-classic-v1.png": { x: [0, 206, 396, 585, 762, 964, 1148, 1354], y: [0, 212, 404, 599, 780, 968, 1161] },
  "items-memes-v1.png": { x: [0, 285, 554, 840, 1114, 1402], y: [0, 288, 562, 840, 1122] }
};
var FRAME_REGIONS = { "naiwa-pixel-v2.png": [[0, 0, 324, 312], [324, 0, 308, 311], [632, 0, 312, 313], [944, 0, 320, 314], [0, 312, 328, 302], [328, 311, 309, 303], [637, 313, 310, 295], [947, 314, 317, 302], [0, 614, 305, 329], [305, 614, 309, 299], [614, 608, 337, 338], [951, 616, 313, 305], [0, 943, 324, 301], [324, 913, 276, 331], [600, 946, 337, 298], [937, 921, 327, 323]], "meme-followers-v1.png": [[0, 0, 318, 315], [318, 0, 311, 315], [629, 0, 297, 325], [926, 0, 328, 315], [0, 315, 303, 310], [303, 315, 288, 312], [591, 325, 308, 309], [899, 315, 355, 312], [0, 625, 298, 319], [298, 627, 311, 325], [609, 634, 312, 327], [921, 627, 333, 310], [0, 944, 286, 310], [286, 952, 327, 302], [613, 961, 283, 293], [896, 937, 358, 317]], "penguins-actions-v1.png": [[0, 0, 426, 439], [426, 0, 443, 439], [869, 0, 419, 443], [1288, 0, 486, 447], [0, 439, 430, 448], [430, 439, 430, 448], [860, 443, 430, 444], [1290, 447, 484, 440]], "mobs-milk-v1.png": [[0, 0, 224, 237], [224, 0, 218, 234], [442, 0, 225, 237], [667, 0, 220, 228], [0, 237, 227, 211], [227, 234, 206, 210], [433, 237, 240, 210], [673, 228, 214, 206], [0, 448, 209, 227], [209, 444, 220, 229], [429, 447, 255, 226], [684, 434, 203, 231], [0, 675, 208, 223], [208, 673, 221, 225], [429, 673, 242, 221], [671, 665, 216, 227], [0, 898, 206, 221], [206, 898, 221, 220], [427, 894, 256, 227], [683, 892, 204, 225], [0, 1119, 211, 217], [211, 1118, 216, 215], [427, 1121, 248, 206], [675, 1117, 212, 213], [0, 1336, 214, 225], [214, 1333, 222, 227], [436, 1327, 225, 222], [661, 1330, 226, 218], [0, 1561, 203, 213], [203, 1560, 228, 214], [431, 1549, 229, 225], [660, 1548, 227, 226]], "mobs-stage-v1.png": [[0, 0, 225, 235], [225, 0, 208, 217], [433, 0, 231, 231], [664, 0, 223, 218], [0, 235, 223, 212], [223, 217, 219, 227], [442, 231, 216, 218], [658, 218, 229, 227], [0, 447, 213, 218], [213, 444, 229, 221], [442, 449, 214, 215], [656, 445, 231, 218], [0, 665, 215, 227], [215, 665, 216, 226], [431, 664, 239, 220], [670, 663, 217, 231], [0, 892, 227, 224], [227, 891, 210, 224], [437, 884, 227, 231], [664, 894, 223, 216], [0, 1116, 209, 225], [209, 1115, 215, 223], [424, 1115, 259, 225], [683, 1110, 204, 224], [0, 1341, 215, 224], [215, 1338, 223, 215], [438, 1340, 230, 215], [668, 1334, 219, 218], [0, 1565, 218, 209], [218, 1553, 222, 221], [440, 1555, 238, 219], [678, 1552, 209, 222]], "mobs-factory-v1.png": [[96, 0, 242, 150], [338, 0, 239, 150], [577, 0, 258, 146], [835, 0, 241, 152], [96, 150, 237, 171], [333, 150, 231, 171], [564, 146, 258, 169], [822, 152, 254, 167], [96, 321, 228, 128], [324, 321, 246, 129], [570, 315, 250, 138], [820, 319, 256, 132], [96, 449, 220, 157], [316, 450, 243, 155], [559, 453, 280, 152], [839, 451, 237, 154], [96, 606, 219, 142], [315, 605, 229, 144], [544, 605, 270, 143], [814, 605, 262, 143], [96, 748, 235, 141], [331, 749, 239, 141], [570, 748, 260, 141], [830, 748, 246, 139], [96, 889, 224, 142], [320, 890, 241, 140], [561, 889, 273, 138], [834, 887, 242, 140], [96, 1031, 228, 147], [324, 1030, 234, 148], [558, 1027, 261, 151], [819, 1027, 257, 151], [96, 1178, 229, 152], [325, 1178, 228, 152], [553, 1178, 274, 152], [827, 1178, 249, 152]], "items-classic-v1.png": [[0, 0, 195, 207], [195, 0, 201, 207], [396, 0, 213, 205], [609, 0, 138, 212], [747, 0, 223, 215], [970, 0, 183, 212], [1153, 0, 201, 217], [0, 207, 213, 200], [213, 207, 180, 204], [393, 205, 195, 190], [588, 212, 174, 194], [762, 215, 207, 178], [969, 212, 168, 195], [1137, 217, 217, 181], [0, 407, 195, 197], [195, 411, 200, 197], [395, 395, 180, 207], [575, 406, 207, 194], [782, 393, 173, 209], [955, 407, 190, 188], [1145, 398, 209, 207], [0, 604, 214, 171], [214, 608, 179, 168], [393, 602, 190, 186], [583, 600, 181, 183], [764, 602, 201, 187], [965, 595, 171, 187], [1136, 605, 218, 180], [0, 775, 210, 189], [210, 776, 177, 190], [387, 788, 189, 181], [576, 783, 187, 189], [763, 789, 203, 176], [966, 782, 174, 199], [1140, 785, 214, 177], [0, 964, 200, 197], [200, 966, 215, 195], [415, 969, 145, 192], [560, 972, 200, 189], [760, 965, 198, 196], [958, 981, 199, 180], [1157, 962, 197, 199]] };
function atlasRegion(file, cols, rows, row3, col, width, height) {
  const frames = FRAME_REGIONS[file];
  if (frames) {
    const [left, top, w, h2] = frames[row3 * cols + col];
    return { left, top, w, h: h2 };
  }
  const a = ATLAS_CUTS[file];
  if (a) return { left: a.x[col], top: a.y[row3], w: a.x[col + 1] - a.x[col], h: a.y[row3 + 1] - a.y[row3] };
  if (file === "chapter-bosses-v1.png") {
    const xs = [[0, 313, 625, 951, 1261], [0, 318, 624, 943, 1261], [0, 321, 616, 945, 1261], [0, 296, 618, 943, 1261]][row3], ys = [0, 310, 620, 932, 1247];
    return { left: xs[col], top: ys[row3], w: xs[col + 1] - xs[col], h: ys[row3 + 1] - ys[row3] };
  }
  return { left: col * width / cols, top: row3 * height / rows, w: width / cols, h: height / rows };
}

// dist/asset-webp.js
var WEBP = /* @__PURE__ */ new Set([
  "bull-actions-v2.png",
  "chapter-bosses-v1.png",
  "costume-anon-v1.png",
  "costume-apollyon-v1.png",
  "costume-astronaut-v1.png",
  "costume-belial-v3.png",
  "costume-bikini-v1.png",
  "costume-bluebaby-v1.png",
  "costume-cat-v1.png",
  "costume-conductor-v1.png",
  "costume-david-v1.png",
  "costume-deepseek-v2.png",
  "costume-gojo-v1.png",
  "costume-isaac-v4.png",
  "costume-keeper-v1.png",
  "costume-knight-v1.png",
  "costume-kobe-v1.png",
  "costume-kun-v1.png",
  "costume-lotusrain-v1.png",
  "costume-magician-v1.png",
  "costume-milkman-v1.png",
  "costume-newyear-v1.png",
  "costume-pajama-v1.png",
  "costume-patrick-v3.png",
  "costume-phoebe-v1.png",
  "costume-pink-v1.png",
  "costume-safety-v1.png",
  "costume-sakiko-v1.png",
  "costume-sponge-v1.png",
  "costume-squid-v3.png",
  "costume-stink-v1.png",
  "costume-sweet-v4.png",
  "costume-tempura-v1.png",
  "cover-rescue-v2.png",
  "deepseek-actions-v1.png",
  "deepseek-items-v1.png",
  "family-rescue-v2.png",
  "followers-family-v2.png",
  "ghostbuddha-v1.png",
  "gojo-manga-actions-v2.png",
  "gunners-actions-v1.png",
  "items-classic-v1.png",
  "items-memes-v1.png",
  "meishu-actions-v1.png",
  "meme-followers-v1.png",
  "mobs-factory-v1.png",
  "mobs-milk-v1.png",
  "mobs-stage-v1.png",
  "naiwa-pixel-v2.png",
  "penguins-actions-v1.png",
  "phoebe-electrician-v1.png",
  "rooms-bright-v1.png",
  "sandevistan-v1.png"
]);

// dist/asset-url.js
function assetFile(file) {
  return WEBP.has(file) ? file.replace(/\.png$/, ".webp") : file;
}
function assetUrl(file) {
  return new URL("./assets/" + assetFile(file), import.meta.url).href;
}
function assetPath(file) {
  return "assets/" + assetFile(file);
}
var held = null;
var release = null;
var queue = [];
var ready = new Promise((resolve) => {
  release = resolve;
});
function holding() {
  if (held === null) held = typeof document !== "undefined" && !!document.documentElement?.hasAttribute?.("data-art-hold");
  return held;
}
function loadArt(image, file) {
  image.assetName = file;
  image.crossOrigin = "anonymous";
  const url = assetUrl(file);
  if (holding()) queue.push(() => {
    image.src = url;
  });
  else image.src = url;
  return image;
}
function artReady() {
  return holding() ? ready : Promise.resolve();
}
function releaseArt() {
  if (!holding()) return;
  held = false;
  document.documentElement.removeAttribute("data-art-hold");
  for (const start2 of queue.splice(0)) start2();
  release();
}

// dist/sprite-art.js
var MOB_SHEETS = [
  ["mobs-milk-v1.png", ["brute", "hopper", "shooter", "runner", "milkleak", "milkspitter", "curdling", "milkSkater"]],
  ["mobs-stage-v1.png", ["soundTurret", "beatling", "echoBell", "conductor", "loader", "parcelThrower", "forklift", "turret"]],
  ["mobs-factory-v1.png", ["dollTurret", "stitchling", "tiny", "stitchMedic", "scrapMine", "warden", "jailer", "lockSentry", "prismEye"]]
];
var images = /* @__PURE__ */ new Map();
var cachedSpriteImage = (file) => images.get(file);
var bounds = /* @__PURE__ */ new Map();
function spriteRegion(image, cols, rows, row3, col) {
  return atlasRegion(image.assetName || image.src.split("/").at(-1), cols, rows, row3, col, image.naturalWidth, image.naturalHeight);
}
function rowBounds(image, cols, rows, row3) {
  const key = image.src + ":" + cols + ":" + rows + ":" + row3;
  if (bounds.has(key)) return bounds.get(key);
  const canvas2 = document.createElement("canvas"), c = canvas2.getContext("2d", { willReadFrequently: true }), frames = [];
  for (let col = 0; col < cols; col++) {
    const region = spriteRegion(image, cols, rows, row3, col), w = Math.floor(region.w), h2 = Math.floor(region.h);
    canvas2.width = w;
    canvas2.height = h2;
    c.drawImage(image, region.left, region.top, w, h2, 0, 0, w, h2);
    const data = c.getImageData(0, 0, w, h2).data;
    let left = w, top = h2, right = 0, bottom = 0;
    for (let y = 0; y < h2; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 96) {
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
    frames.push(right >= left ? { x: left, y: top, w: right - left + 1, h: bottom - top + 1 } : { x: 0, y: 0, w, h: h2 });
  }
  const result = { frames, extent: Math.max(...frames.flatMap((b) => [b.w, b.h])) };
  bounds.set(key, result);
  return result;
}
function spriteImage(file) {
  if (typeof Image === "undefined") return null;
  if (!images.has(file)) {
    const img = loadArt(new Image(), file);
    images.set(file, img);
  }
  return images.get(file);
}
function drawSprite(c, file, col, row3, cols, rows, x, y, size, { flip = false, alpha = 1, angle = 0, squash = 1 } = {}) {
  const image = spriteImage(file);
  if (!image?.complete || !image.naturalWidth) return false;
  const region = spriteRegion(image, cols, rows, row3, col), set = rowBounds(image, cols, rows, row3), b = set.frames[col], scale = size / set.extent, dw = b.w * scale, dh = b.h * scale;
  c.save();
  c.imageSmoothingEnabled = false;
  c.translate(Math.round(x), Math.round(y));
  c.rotate(angle);
  c.scale(flip ? -1 : 1, squash);
  c.globalAlpha *= alpha;
  c.drawImage(image, region.left + b.x, region.top + b.y, b.w, b.h, -dw / 2, size * 0.23 - dh, dw, dh);
  c.restore();
  return true;
}
function actorPose(e, t) {
  if (e.dead) return "dead";
  if (e.hit > 0) return "hurt";
  const skill = e.finalSkill || e.sound || e.hands || e.puppetSkill || e.gunCast || e.mobCast || e.beat || e.screech;
  if (skill) {
    const age = skill.age ?? skill.t ?? 0, wind = skill.wind ?? (skill.mode === "charge" ? skill.combo ? 1.05 : 0.8 : skill.mode === "stitch" ? 0.95 : 0.7);
    return age < wind ? "windup" : "attack";
  }
  if (e.longCharge) return "attack";
  if (e.wind > 0) return "windup";
  if ((e.artAttackUntil || 0) > t) return "attack";
  return e.artMoving ? "walk" : "idle";
}
function actorFrame(e, t) {
  const pose = actorPose(e, t), final = e.kind === "bull" || e.kind === "meishu";
  if (final) return pose === "dead" ? 7 : pose === "hurt" ? 6 : pose === "windup" ? 3 : pose === "attack" ? e.finalSkill?.mode === "stomp" || e.finalSkill?.mode === "cross" ? 5 : 4 : pose === "walk" ? 1 + Math.floor(t * 9) % 2 : 0;
  return pose === "dead" || pose === "hurt" ? 3 : pose === "attack" ? 2 : (e.type === "boss" || e.gunCast) && pose === "windup" ? 1 : pose === "walk" ? Math.floor(t * 9) % 2 : 0;
}
function enemyArtSize(e) {
  return e.type === "boss" ? 156 : e.type === "tiny" ? 42 : e.type === "forklift" ? 78 : 68;
}
function enemyIndicatorY(e) {
  return Math.round(e.y - enemyArtSize(e) * 0.77 - 11);
}
function drawAnimatedEnemy(c, e, t) {
  const boss = e.type === "boss", final = e.kind === "bull" || e.kind === "meishu";
  const gunner = e.type === "loader" || e.type === "shooter" && e.artChapter === 4;
  const sheet2 = gunner ? ["gunners-actions-v1.png", e.type === "loader" ? ["loader", "unused"] : ["unused", "shooter"]] : MOB_SHEETS.find(([, ids]) => ids.includes(e.type));
  const row3 = boss ? ["collector", "speaker", "catcher", "puppet"].indexOf(e.kind) : sheet2?.[1].indexOf(e.type);
  if (!boss && !sheet2 || boss && !final && row3 < 0) return false;
  const frame2 = actorFrame(e, t), pose = actorPose(e, t), deadAge = t - (e.deadAt ?? t);
  if (e.dead && !final && deadAge > 0.65) return true;
  const size = enemyArtSize(e);
  c.save();
  c.fillStyle = "#3a32452a";
  c.fillRect(Math.round(e.x - size * 0.28), Math.round(e.y + size * 0.16), Math.round(size * 0.56), boss ? 10 : 5);
  c.restore();
  const lift = e.airborne ? Math.sin(Math.min(1, (e.sound?.t || 0) / 0.8) * Math.PI) * 130 : pose === "walk" ? Math.round(Math.sin(t * 16)) * 2 : 0;
  return drawSprite(c, final ? e.kind === "bull" ? "bull-actions-v2.png" : "meishu-actions-v1.png" : boss ? "chapter-bosses-v1.png" : sheet2[0], frame2 % 4, final ? Math.floor(frame2 / 4) : row3, 4, final ? 2 : boss ? 4 : sheet2[1].length, e.x, e.y - lift, size, { flip: gunner ? (e.gunCast || (e.artAttackUntil || 0) > t ? e.gunFacing : e.artFacing) === -1 : e.artFacing === 1, alpha: e.dead ? final ? 0.6 : Math.max(0, 1 - deadAge / 0.65) : 1, angle: e.dead && !final ? deadAge * 1.6 : 0, squash: pose === "windup" ? 0.94 : 1 });
}
function drawFamily(c, who, frame2, x, y, size) {
  return drawSprite(c, "family-rescue-v2.png", frame2, who === "child" ? 0 : 1, 4, 2, x, y, size);
}
function drawBrightRoom(c, room, floor) {
  const image = spriteImage("rooms-bright-v1.png");
  if (!image?.complete || !image.naturalWidth) return false;
  const cell = room.type === "start" ? 5 : floor - 1, w = image.naturalWidth / 3, h2 = image.naturalHeight / 2, ox = cell % 3 * w, oy = Math.floor(cell / 3) * h2;
  const sx = [0, w * 0.085, w * 0.915, w], sy = [0, h2 * 0.25, h2 * 0.94, h2], dx = [0, 47, 913, 960], dy = [0, 47, 553, 600];
  c.save();
  c.imageSmoothingEnabled = false;
  for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) c.drawImage(image, ox + sx[x], oy + sy[y], sx[x + 1] - sx[x], sy[y + 1] - sy[y], dx[x], dy[y], dx[x + 1] - dx[x], dy[y + 1] - dy[y]);
  c.restore();
  return true;
}
function prepareChapterArt(floor) {
  const names3 = ["rooms-bright-v1.png", "mobs-milk-v1.png"];
  if (floor === 3 || floor === 4) names3.push("gunners-actions-v1.png");
  if (floor === 2 || floor === 3) names3.push("mobs-stage-v1.png");
  if (floor >= 4) names3.push("mobs-factory-v1.png");
  if (floor === 5) names3.push("family-rescue-v2.png");
  for (const file of names3) spriteImage(file);
}
function prepareBossArt(floor) {
  const names3 = floor <= 4 ? ["chapter-bosses-v1.png"] : ["bull-actions-v2.png", "meishu-actions-v1.png"];
  for (const file of names3) spriteImage(file);
}
function bossArtDue(rooms, roomId, roomType) {
  const boss = rooms?.find?.((r) => r.exists && r.type === "boss");
  if (!boss) return false;
  if (roomType === "boss") return true;
  const rows = Math.abs(Math.floor(boss.id / 5) - Math.floor(roomId / 5)), cols = Math.abs(boss.id % 5 - roomId % 5);
  return rows + cols <= 2;
}
prepareChapterArt(1);

// dist/meme-followers.js
function incomingThreats(g) {
  return g.enemyBullets.map((b) => {
    const dx = b.x - g.p.x, dy = b.y - g.p.y, vx = b.vx || 0, vy = b.vy || 0, v2 = vx * vx + vy * vy;
    const radius = g.p.r + (b.r || 6) + 14, time = v2 ? -(dx * vx + dy * vy) / v2 : 0;
    const close = Math.hypot(dx, dy) <= radius;
    if (Math.hypot(dx, dy) > 200 || !close && (time < 0 || time > 0.8)) return null;
    const t = Math.max(0, Math.min(0.8, time));
    return Math.hypot(dx + vx * t, dy + vy * t) <= radius ? { bullet: b, time: t } : null;
  }).filter(Boolean).sort((a, b) => a.time - b.time).map((v) => v.bullet);
}
function updateMemeFollowers(g, dt) {
  g.shrimpMeals = (g.shrimpMeals || []).filter((m) => {
    m.age += dt;
    m.life -= dt;
    if (m.life <= 0) return false;
    if (m.age >= 0.35 && Math.hypot(g.p.x - m.x, g.p.y - m.y) < 50) {
      g.tempuraBuff = g.has("shrimppaste") ? 12 : 10;
      g.effects.push({ type: "petCollect", x: m.x, y: m.y, life: 0.3, max: 0.3, radius: 18 });
      g.emit("toast", { text: "\u867E\u7C73\u8865\u7ED9\uFF1A\u4F24\u5BB3 +45%\uFF0C\u79FB\u901F +15%\uFF01" });
      return false;
    }
    return m.life > 0;
  });
  g.memePets ??= {};
  const ids = MEME_FOLLOWERS.filter((id) => g.has(id));
  for (const [i, id] of ids.entries()) {
    const a = 3.5 + i * 0.8, home = { x: Math.max(80, Math.min(880, g.p.x + Math.cos(a) * 85)), y: Math.max(80, Math.min(520, g.p.y + Math.sin(a) * 60)) };
    const s = g.memePets[id] ??= { ...safeSpot(g.room, home.x, home.y, 10), r: 10, type: "pet", cd: id === "tempura" ? 0.9 : 1 + i * 0.3, phase: "idle", t: 0 };
    s.t += dt;
    s.cd -= dt;
    if (s.phase === "idle") {
      const d = Math.hypot(home.x - s.x, home.y - s.y), v = steer(g.room, s, home), x = s.x, y = s.y;
      s.x += v.x * Math.min(d, 260 * dt);
      s.y += v.y * Math.min(d, 260 * dt);
      moveOnTerrain(g.room, s, x, y);
      s.moving = Math.hypot(s.x - x, s.y - y) > 0.1;
      const enemy2 = g.room.enemies.filter((e) => !e.dead && !e.airborne && (!["penguin", "kobe"].includes(id) || shotLaneOpen(g.room, s, e)) && (id !== "penguin" || !["fly", "hopper"].includes(e.type)) && (id !== "sun" || Math.hypot(e.x - s.x, e.y - s.y) < 380 && shotLaneOpen(g.room, s, e))).sort((a2, b) => Math.hypot(a2.x - s.x, a2.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y))[0];
      const device2 = id === "sun" ? g.room.obstacles.find((o) => ["resonator", "relay"].includes(o.kind) && !(o.disabled > 0) && Math.hypot(o.x - s.x, o.y - s.y) < 300) : null;
      const bullet2 = id === "sweetpenguin" ? incomingThreats(g)[0] : null;
      const canFeed = id === "tempura" && itemCombatActive(g.room) && (g.room.tempuraServings || 0) < 2 && !g.shrimpMeals.length;
      if (s.cd <= 0 && (id === "sweetpenguin" ? bullet2 : id === "tempura" ? canFeed : enemy2 || device2)) {
        s.target = device2 || bullet2 || enemy2 || g.p;
        s.device = !!device2;
        s.phase = "windup";
        s.t = 0;
        s.face = s.target.x >= s.x ? 1 : -1;
      }
    } else if (s.phase === "windup" && s.t >= (id === "sweetpenguin" ? 0.14 : 0.38)) {
      s.phase = "attack";
      s.t = 0;
      s.cd = id === "sun" ? s.device ? g.has("propertycard") ? 6 : 8 : g.has("propertycard") ? 2.6 : 3.2 : id === "sweetpenguin" ? 2.5 : id === "kobe" ? 1.65 : id === "tempura" ? 5.5 : 2.2;
      if (id === "sweetpenguin") {
        const threats = incomingThreats(g).slice(0, 6);
        if (!threats.length) s.cd = 0.35;
        for (const b of threats) {
          g.enemyBullets = g.enemyBullets.filter((v) => v !== b);
          g.effects.push({ type: "petBlock", x: b.x, y: b.y, life: 0.3, max: 0.3, radius: 24 }, { type: "voiceChain", x: s.x, y: s.y - 9, tx: b.x, ty: b.y, life: 0.2, max: 0.2 });
        }
      } else if (id === "tempura") {
        if (itemCombatActive(g.room) && (g.room.tempuraServings || 0) < 2 && !g.shrimpMeals.length) {
          g.room.tempuraServings = (g.room.tempuraServings || 0) + 1;
          g.emit("itemVoice", { key: "oyeye" });
          const q = safeSpot(g.room, s.x + (s.face || 1) * 24, s.y + 16, 8);
          g.shrimpMeals.push({ ...q, sx: s.x + (s.face || 1) * 14, sy: s.y - 16, age: 0, life: 14 });
        }
      } else if (s.device && g.room.obstacles.includes(s.target)) {
        s.target.disabled = 3;
        g.emit("itemVoice", { key: "quiet" });
        g.effects.push({ type: "voiceChain", x: s.x, y: s.y, tx: s.target.x, ty: s.target.y, life: 0.3, max: 0.3 });
      } else if (id === "sun") {
        const targets = g.room.enemies.filter((e) => !e.dead && !e.airborne && Math.hypot(e.x - s.x, e.y - s.y) < 380 && shotLaneOpen(g.room, s, e)).sort((a2, b) => Number(g.canEnemyShoot(b) && !(b.phoneMutedUntil > g.elapsed)) - Number(g.canEnemyShoot(a2) && !(a2.phoneMutedUntil > g.elapsed)) || Math.hypot(a2.x - s.x, a2.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y)).slice(0, g.has("propertycard") ? 3 : 2);
        if (targets.length) g.emit("itemVoice", { key: "quiet" });
        for (const e of targets) {
          interruptRanged(g, e, g.has("politesuit") ? 3.2 : 2.6);
          g.damageEnemy(e, Math.min(8, 2.5 + g.p.damage * 1.2), false);
          g.effects.push({ type: "voiceChain", x: s.x, y: s.y - 9, tx: e.x, ty: e.y - 12, life: 0.25, max: 0.25 });
        }
      } else if (s.target && !s.target.dead) {
        const rock = id === "penguin", sx = s.x + (s.face || 1) * (id === "kobe" ? 19 : 14), sy = rock ? s.y + 6 : s.y - 44;
        const a2 = Math.atan2(s.target.y - sy, s.target.x - sx), speed = rock ? 300 : 340;
        g.bullets.push({ x: sx, y: sy, vx: Math.cos(a2) * speed, vy: Math.sin(a2) * speed, r: rock ? 11 : 9, damage: rock ? Math.min(7, 2.4 + g.p.damage) : Math.min(9, 3 + g.p.damage * 1.2), life: rock ? 2.4 : 1.8, bounce: rock ? g.has("stonepouch") ? 2 : 1 : 1, pierce: rock, rollingRock: rock, age: 0, pet: true, hits: /* @__PURE__ */ new Set(), memePet: id });
        g.effects.push({ type: "petMuzzle", x: sx, y: sy, life: 0.18, max: 0.18, radius: 12 });
      }
    } else if (s.phase === "attack" && s.t >= 0.28) {
      s.phase = "idle";
      s.t = 0;
    }
  }
}
function drawMemeFollowers(c, g) {
  for (const m of g.shrimpMeals || []) {
    const t = Math.min(1, m.age / 0.35), x = m.sx + (m.x - m.sx) * t, y = m.sy + (m.y - m.sy) * t - Math.sin(t * Math.PI) * 20;
    c.save();
    c.fillStyle = "#6c595b";
    c.fillRect(x - 8, y - 5, 16, 11);
    c.fillStyle = "#f3cc83";
    c.fillRect(x - 6, y - 3, 12, 7);
    c.fillStyle = "#c47b67";
    for (let i = 0; i < 3; i++) c.fillRect(x - 5 + i * 4, y - 2, 2, 4);
    c.restore();
  }
  for (const e of g.room.enemies) if (!e.dead && e.phoneMutedUntil > g.elapsed) {
    c.save();
    c.fillStyle = "#39536d";
    c.fillRect(e.x - 7, e.y - 80, 14, 17);
    c.fillStyle = "#b7e2eb";
    c.fillRect(e.x - 4, e.y - 77, 8, 9);
    c.fillStyle = "#cf8ba9";
    for (let i = 0; i < 4; i++) c.fillRect(e.x - 7 + i * 4, e.y - 66 - i * 4, 4, 3);
    c.restore();
  }
  for (const id of MEME_FOLLOWERS.filter((id2) => g.has(id2))) {
    const s = g.memePets?.[id];
    if (!s) continue;
    const frame2 = s.phase === "windup" ? 2 : s.phase === "attack" ? 3 : s.moving ? Math.floor(g.elapsed * 9) % 2 : 0;
    const penguin = ["penguin", "sweetpenguin"].includes(id), row3 = penguin ? id === "penguin" ? 0 : 1 : ["unused", "tempura", "sun", "kobe"].indexOf(id);
    const lift = id === "kobe" && s.phase === "attack" ? Math.cos(s.t / 0.28 * Math.PI / 2) * 18 : 0;
    drawSprite(c, penguin ? "penguins-actions-v1.png" : "meme-followers-v1.png", frame2, row3, 4, penguin ? 2 : 4, s.x, s.y - lift, 48, { flip: s.face === -1 });
  }
}

// dist/resource-scenes.js
var EXCHANGES = [
  { id: "trade_key_bomb", icon: "\u26BF \u2192 \u2739", name: "2 \u628A\u94A5\u5319 \u2192 1 \u679A\u70B8\u5F39", desc: "\u6BCF\u5C42\u9650\u6362 1 \u6B21", cost: "keys", costAmount: 2, gain: "bombs", amount: 1, limit: 1 },
  { id: "trade_bomb_key", icon: "\u2739 \u2192 \u26BF", name: "2 \u679A\u70B8\u5F39 \u2192 1 \u628A\u94A5\u5319", desc: "\u6BCF\u5C42\u9650\u6362 1 \u6B21", cost: "bombs", costAmount: 2, gain: "keys", amount: 1, limit: 1 },
  { id: "trade_key_coin", icon: "\u26BF \u2192 \u25CF", name: "1 \u628A\u94A5\u5319 \u2192 2 \u91D1\u5E01", desc: "\u6BCF\u5C42\u9650\u6362 2 \u6B21", cost: "keys", gain: "coins", amount: 2, limit: 2 },
  { id: "trade_bomb_coin", icon: "\u2739 \u2192 \u25CF", name: "1 \u679A\u70B8\u5F39 \u2192 2 \u91D1\u5E01", desc: "\u6BCF\u5C42\u9650\u6362 2 \u6B21", cost: "bombs", gain: "coins", amount: 2, limit: 2 },
  { id: "trade_blood", icon: "\u2665 \u2192 \u25CF", name: "\u6D88\u8017 2 \u70B9\u751F\u547D \u2192 3 \u91D1\u5E01", desc: "\u6BCF\u5C42\u9650 1 \u6B21\uFF0C\u9700\u81F3\u5C11 3 \u70B9\u5F53\u524D\u751F\u547D\uFF1B\u62A4\u76FE\u4E0D\u80FD\u62B5\u6263", cost: "health", gain: "coins", amount: 3, costAmount: 2, limit: 1 }
];
function mainReachable(g, blocked2) {
  const reached = /* @__PURE__ */ new Set([12]), todo = [12];
  while (todo.length) for (const n of g.neighbors(todo.shift())) if (g.rooms[n].exists && !blocked2.has(n) && !reached.has(n)) {
    reached.add(n);
    todo.push(n);
  }
  return g.rooms.filter((r) => r.exists && !blocked2.has(r.id)).every((r) => reached.has(r.id));
}
function installResourceRooms(g) {
  const blocked2 = new Set(g.rooms.filter((r) => r.exists && r.locked).map((r) => r.id));
  for (const type of ["vault", "cache"]) {
    const adjacent2 = (r2) => g.neighbors(r2.id).filter((n) => g.rooms[n].exists);
    const empty2 = g.rooms.filter((r2) => !r2.exists && adjacent2(r2).length > 0 && (type === "cache" || adjacent2(r2).length === 1) && adjacent2(r2).every((n) => !blocked2.has(n) && g.rooms[n].type !== "boss"));
    const score = type === "cache" ? Math.max(0, ...empty2.map((r2) => adjacent2(r2).length)) : 1;
    const candidates = empty2.filter((r2) => adjacent2(r2).length === score);
    let r = candidates[Math.floor(g.random() * candidates.length)];
    if (!r) r = g.rooms.find((r2) => r2.exists && r2.type === "fight" && adjacent2(r2).every((n) => !blocked2.has(n) && g.rooms[n].type !== "boss") && mainReachable(g, /* @__PURE__ */ new Set([...blocked2, r2.id])));
    if (!r) continue;
    Object.assign(r, { exists: true, type, clear: true, enemies: [], locked: type === "vault", bombLocked: type === "cache", hidden: type === "cache", revealed: false, resourceClaimed: false, seen: type === "vault" && g.neighbors(12).includes(r.id), visited: false, obstacles: [], hazards: [] });
    blocked2.add(r.id);
  }
  for (const room of g.rooms) room.wallDecoys = [];
  const falseTargets = g.rooms.filter((r) => !r.exists && g.neighbors(r.id).some((n) => g.rooms[n].exists && g.rooms[n].type === "boss"));
  const choices = falseTargets.flatMap((target2) => g.neighbors(target2.id).filter((n) => g.rooms[n].exists && !blocked2.has(n) && g.rooms[n].type !== "boss").map((parent) => ({ parent, target: target2.id })));
  const usedRooms = /* @__PURE__ */ new Set(), usedTargets = /* @__PURE__ */ new Set();
  let count2 = 0;
  while (choices.length && count2 < 2) {
    const pick = choices.splice(Math.floor(g.random() * choices.length), 1)[0];
    if (usedRooms.has(pick.parent) || usedTargets.has(pick.target)) continue;
    const wall = roomSides(g, pick.parent).find((d) => d.id === pick.target);
    g.rooms[pick.parent].wallDecoys.push({ ...wall, spent: false });
    usedRooms.add(pick.parent);
    usedTargets.add(pick.target);
    count2++;
  }
  g.rooms[12].exchanges = {};
}
function enterResourceRoom(g) {
  const r = g.room;
  if (!["vault", "cache"].includes(r.type) || r.resourceStarted) return;
  r.resourceStarted = true;
  r.clear = false;
  const positions = [[220, 180], [740, 180], [320, 350], [640, 350], [480, 180], [220, 450], [740, 450], [480, 420], [350, 140], [610, 140]].filter(([x, y]) => Math.hypot(x - g.p.x, y - g.p.y) >= 160).slice(0, encounterCount(r, g.floor));
  const guardProfile = [1, 2, 3, 4, 7][Math.floor(r.seed || 0) % 5];
  const guards = encounterRoster({ ...r, encounterProfile: guardProfile }, g.floor, positions.length);
  r.enemies = positions.map(([x, y], i) => g.spawn(guards[i], x, y));
  if (r.type === "cache") {
    r.dangerTime = 12;
    r.fallTimer = 1.2;
  }
  g.emit("toast", { text: r.type === "vault" ? "\u8865\u7ED9\u5E93\u4F0F\u51FB\uFF01\u51FB\u8D25\u5E93\u623F\u5B88\u536B\u540E\u624D\u80FD\u62FF\u8D70\u8865\u7ED9\u3002" : "\u85CF\u5BA4\u574D\u584C\uFF01\u8EB2\u907F\u843D\u7269 12 \u79D2\u5E76\u6E05\u9664\u5B88\u536B\uFF0C\u8865\u7ED9\u624D\u4F1A\u89E3\u5C01\u3002" });
}
function claimResourceRoom(g) {
  const r = g.room;
  if (!["vault", "cache"].includes(r.type) || r.resourceClaimed) return;
  r.resourceClaimed = true;
  const roll = g.random();
  r.resourceOutcome = roll < 0.25 ? "empty" : "supplies";
  if (r.resourceOutcome === "empty") {
    g.emit("toast", { text: "\u767D\u8DD1\u4E00\u8D9F\uFF1A\u8865\u7ED9\u5DF2\u7ECF\u88AB\u642C\u7A7A\u4E86\uFF0C\u8FD9\u95F4\u6CA1\u6709\u6389\u843D\u3002" });
    return;
  }
  if (r.type === "cache") {
    if (roll < 0.5) {
      r.resourceOutcome = "coins";
      g.drop("coin", 480, 300, 6);
    } else if (roll < 0.75) {
      r.resourceOutcome = "tools";
      g.drop("key", 450, 300, 2);
      g.drop("bomb", 515, 300, 1);
    } else if (roll < 0.9) {
      r.resourceOutcome = "healing";
      g.drop("heart", 450, 300, 2);
      g.drop("coin", 515, 300, 3);
    } else {
      r.resourceOutcome = "item";
      g.offer("\u9690\u85CF\u85CF\u5BA4 \xB7 \u610F\u5916\u53D1\u73B0\u7684\u9053\u5177");
      if (!g.choices.length) {
        g.mode = "play";
        r.resourceOutcome = "coins";
        g.drop("coin", 480, 300, 6);
      }
    }
    g.emit("toast", { text: "\u85CF\u5BA4\u5DF2\u89E3\u5C01\uFF0C\u770B\u770B\u8FD9\u6B21\u7559\u4E0B\u4E86\u4EC0\u4E48\u3002" });
    return;
  }
  g.drop(r.type === "vault" ? "bomb" : "key", 450, 300, 2);
  g.drop("coin", 515, 300, 3);
  g.emit("toast", { text: r.type === "vault" ? "\u8865\u7ED9\u5E93\uFF1A2 \u679A\u70B8\u5F39\u548C 3 \u91D1\u5E01\uFF0C\u62FF\u8D70\u540E\u4E0D\u4F1A\u518D\u5237\u65B0\u3002" : "\u5C01\u5899\u85CF\u5BA4\uFF1A2 \u628A\u94A5\u5319\u548C 3 \u91D1\u5E01\uFF0C\u62FF\u8D70\u540E\u4E0D\u4F1A\u518D\u5237\u65B0\u3002" });
}
function updateResourceRoom(g, dt) {
  const r = g.room;
  if (r.type !== "cache" || r.clear || !(r.dangerTime > 0)) return;
  r.dangerTime = Math.max(0, r.dangerTime - dt);
  r.fallTimer -= dt;
  if (r.fallTimer <= 0) {
    r.fallTimer = 1.6;
    g.effects.push({ type: "mobZone", kind: "parcel", x: Math.max(110, Math.min(850, g.p.x)), y: Math.max(110, Math.min(490, g.p.y)), radius: 70, wind: 1, active: 0.2, life: 1.2, max: 1.2, triggered: false, sx: 480, sy: 60 });
  }
}
function suspiciousWalls(g) {
  if (!g.room.clear) return [];
  const real = roomNeighbors(g).filter((d) => {
    const r = g.rooms[d.id];
    return r.type === "cache" && r.hidden && !r.revealed && r.bombLocked;
  });
  return [...real, ...(g.room.wallDecoys || []).filter((d) => !d.spent)];
}
function roomSides(g, i = g.roomId) {
  return [{ id: i - 1, valid: i % 5 > 0, x: 47, y: 300, side: "left" }, { id: i + 1, valid: i % 5 < 4, x: 913, y: 300, side: "right" }, { id: i - 5, valid: i >= 5, x: 480, y: 47, side: "top" }, { id: i + 5, valid: i < 20, x: 480, y: 553, side: "bottom" }].filter((d) => d.valid);
}
function roomNeighbors(g) {
  return roomSides(g).filter((d) => g.rooms[d.id]?.exists);
}
function blastResourceDoors(g, x, y, radius) {
  if (!g.room.clear) return;
  for (const d of roomNeighbors(g)) {
    const next = g.rooms[d.id];
    if (next.bombLocked && Math.hypot(x - d.x, y - d.y) < radius) {
      next.bombLocked = false;
      next.hidden = false;
      next.revealed = true;
      next.seen = true;
      g.emit("toast", { text: "\u9690\u85CF\u5C01\u5899\u70B8\u5F00\u4E86\uFF01\u53EF\u4EE5\u8FDB\u5165\u85CF\u5BA4\u3002" });
      g.emit("room");
    }
  }
  for (const d of g.room.wallDecoys || []) if (!d.spent && Math.hypot(x - d.x, y - d.y) < radius) {
    d.spent = true;
    g.emit("toast", { text: "\u5899\u7070\u8131\u843D\u4E86\uFF0C\u540E\u9762\u662F\u5B9E\u5899\uFF0C\u6CA1\u6709\u9690\u85CF\u623F\u3002" });
  }
}
function offerExchange(g) {
  g.choices = EXCHANGES.filter((t) => (g.room.exchanges[t.id] || 0) < t.limit).map((t) => ({ ...t, desc: t.desc + " \xB7 \u5269\u4F59 " + (t.limit - (g.room.exchanges[t.id] || 0)) + " \u6B21" }));
  g.mode = "choice";
  g.emit("choice", { title: "\u8C46\u5305\u56DE\u6536\u53F0 \xB7 \u751F\u547D " + g.p.hp + " / \u94A5\u5319 " + g.keys + " / \u70B8\u5F39 " + g.bombs, choices: g.choices });
}
function chooseExchange(g, id) {
  const t = EXCHANGES.find((t2) => t2.id === id);
  if (!t) return null;
  if (g.room.type !== "start" || g.mode !== "choice" || !g.choices.some((c) => c.id === id)) return false;
  const used = g.room.exchanges[t.id] || 0;
  if (used >= t.limit) return false;
  const cost = t.costAmount || 1, available = t.cost === "health" ? g.p.hp : g[t.cost];
  if (available < cost || t.cost === "health" && available <= cost) {
    g.emit("toast", { text: t.cost === "health" ? "\u9700\u81F3\u5C11 3 \u70B9\u751F\u547D\uFF0C\u4E0D\u80FD\u7528\u6700\u540E\u7684\u751F\u547D\u5151\u6362\u3002" : t.cost === "keys" ? "\u9700\u8981 " + cost + " \u628A\u94A5\u5319\u3002" : "\u9700\u8981 " + cost + " \u679A\u70B8\u5F39\u3002" });
    return false;
  }
  if (t.cost === "health") g.p.hp -= cost;
  else g[t.cost] -= cost;
  g[t.gain] += t.amount;
  g.room.exchanges[t.id] = used + 1;
  g.mode = "play";
  g.emit("room");
  g.emit("toast", { text: "\u5151\u6362\u5B8C\u6210\uFF1A" + t.name });
  return true;
}

// dist/mouse-follower.js
var MOUSE = { damage: 1.5, cooldown: 3.2, range: 400, stashLimit: 3 };
var combat = (g) => itemCombatEncounter(g.room);
var grounded2 = (e) => e && !e.dead && !e.airborne && !["fly", "hopper"].includes(e.type);
function recover(s, cd = MOUSE.cooldown) {
  s.phase = "recover";
  s.clock = 0;
  s.cd = cd;
  s.target = null;
}
function steal(g, s) {
  const r = g.room;
  if (r.mouseSupplied || g.rooms.filter((room) => room.mouseSupplied).length >= MOUSE.stashLimit) return;
  const available = (type2) => g.rooms.reduce((n, room) => n + room.loot.filter((l) => l.type === type2).reduce((a, l) => a + l.amount, 0), 0);
  const type = g.keys + available("key") === 0 ? "key" : g.bombs + available("bomb") === 0 ? "bomb" : "coin", amount = type === "coin" ? 2 : 1;
  r.mouseSupplied = true;
  g.drop(type, s.x, s.y, amount);
  g.effects.push({ type: "mouseSteal", x: s.x, y: s.y - 12, resource: type, amount, life: 0.9, max: 0.9 });
  g.emit("room");
}
function updateMouse(g, s, home, dt, travel2) {
  s.secretDoor = null;
  const active = combat(g), target2 = s.target;
  if ((s.phase === "windup" || s.phase === "lunge") && (!active || !grounded2(target2) || !g.room.enemies.includes(target2) || Math.hypot(target2.x - g.p.x, target2.y - g.p.y) > 500)) recover(s, 0.65);
  if (s.phase === "windup") {
    s.face = target2.x > s.x ? 1 : -1;
    if (s.clock >= 0.16) {
      s.phase = "lunge";
      s.clock = 0;
    }
    return;
  }
  if (s.phase === "lunge") {
    if (s.clock > 1.4) {
      recover(s, 0.65);
      return;
    }
    travel2(g, s, target2, 440, dt);
    if (Math.hypot(target2.x - s.x, target2.y - s.y) < target2.r + 12 && shotLaneOpen(g.room, s, target2)) {
      steal(g, s);
      g.damageEnemy(target2, MOUSE.damage);
      g.effects.push({ type: "petImpact", x: s.x, y: s.y, life: 0.2, max: 0.2, radius: 17 });
      recover(s);
    }
    return;
  }
  if (s.phase === "recover" && s.clock < 0.28) {
    travel2(g, s, home, 330, dt);
    return;
  }
  const loot = g.room.loot.filter((l) => ["coin", "key", "bomb"].includes(l.type) && Math.hypot(l.x - g.p.x, l.y - g.p.y) < 360).sort((a, b) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y))[0];
  if (loot) {
    s.phase = "collect";
    travel2(g, s, loot, 390, dt);
    return;
  }
  if (active && s.cd <= 0) {
    const next = g.room.enemies.filter((e) => grounded2(e) && Math.hypot(e.x - g.p.x, e.y - g.p.y) < MOUSE.range).sort((a, b) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y))[0];
    if (next) {
      s.target = next;
      s.phase = "windup";
      s.clock = 0;
      s.face = next.x > s.x ? 1 : -1;
      return;
    }
  }
  const door = g.room.clear ? roomNeighbors(g).find((d) => {
    const r = g.rooms[d.id];
    return r.hidden && r.bombLocked && !r.revealed;
  }) : null;
  const sniff = door ? { x: Math.max(78, Math.min(882, door.x)), y: Math.max(78, Math.min(522, door.y)) } : null;
  travel2(g, s, sniff || home, 280, dt);
  s.phase = sniff ? "sniff" : "idle";
  s.secretDoor = door;
  if (door && Math.hypot(s.x - sniff.x, s.y - sniff.y) < 25 && g.room.mouseHint !== door.id) {
    g.room.mouseHint = door.id;
    g.emit("toast", { text: "\u5976\u9F20\u95FB\u5230\u4E86\u9690\u85CF\u95E8\uFF01\u8DDF\u7740\u5976\u9F20\uFF0C\u5230\u5B83\u6307\u5411\u7684\u5899\u8FB9\u653E\u70B8\u5F39\u3002" });
  }
}

// dist/phoebe-art.js
var square = (c, x, y, size, color) => {
  c.fillStyle = color;
  c.fillRect(Math.round(x / 2) * 2, Math.round(y / 2) * 2, size, size);
};
function cable(c, points, active, width = 5) {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 4));
    for (let j = 0; j <= n; j++) {
      const t = j / n, x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
      if (active) square(c, x - width, y - width, width * 2, "#83deed25");
      square(c, x - 3, y - 3, 6, "#29485d");
      square(c, x - 1, y - 1, 2, active ? "#c4f6ed" : "#728d9e");
    }
  }
  for (const p of [points[0], points.at(-1)]) {
    square(c, p.x - 5, p.y - 5, 10, "#34475b");
    square(c, p.x - 3, p.y - 3, 6, active ? "#f6d276" : "#82989c");
  }
}
function drawPhoebe(c, g) {
  c.save();
  for (const w of g.phoebeWires || []) {
    c.globalAlpha = Math.min(1, (w.until - g.elapsed) / 0.35);
    cable(c, w.points, true, w.width);
  }
  c.globalAlpha = 1;
  if (g.phoebeTrace?.length > 1) cable(c, g.phoebeTrace, false);
  const s = g.phoebe;
  if (s && g.has("phoebe")) {
    const frame2 = s.phase === "windup" ? 2 : s.phase === "unroll" || s.phase === "recover" ? 3 : s.moving ? Math.floor(g.elapsed * 8) % 2 : 0;
    drawSprite(c, "phoebe-electrician-v1.png", frame2, 0, 4, 2, s.x, s.y, 56, { flip: s.face < 0 });
    if (s.phase === "unroll" && s.cable) {
      const { from, to } = s.cable, t = Math.min(1, s.t / 0.4), p = { x: from.x + (to.x - from.x) * t, y: from.y - 24 + (to.y - from.y + 24) * t - Math.sin(t * Math.PI) * 24 };
      cable(c, [{ x: from.x, y: from.y - 24 }, p], false);
    }
  }
  for (const f of g.effects) if (f.type === "phoebeSoot") {
    drawSprite(c, "phoebe-electrician-v1.png", 2, 1, 4, 2, f.x, f.y - 30 - (1 - f.life / f.max) * 20, 36, { alpha: f.life / f.max });
  }
  c.restore();
}

// dist/deepseek-art.js
function drawDeepseek(c, g) {
  const s = g.whale;
  if (g.has("ricewhale") && s) {
    const frame2 = s.phase === "windup" || s.phase === "eat" ? 2 : s.phase === "attack" ? 3 : s.moving ? Math.floor(g.elapsed * 9) % 2 : 0;
    drawSprite(c, "deepseek-actions-v1.png", frame2, 0, 4, 1, s.x, s.y, 55, { flip: s.face < 0 });
    if (g.whaleFed > 0) {
      c.save();
      c.fillStyle = "#eaf6ff";
      for (let i = 0; i < g.whaleFed; i++) c.fillRect(s.x - 8 + i * 6, s.y - 50, 4, 4);
      c.restore();
    }
  }
  if (g.has("deepthink") && (g.deepThink > 0 || g.deepBurst > 0)) {
    c.save();
    for (let i = 0; i < 3; i++) {
      c.fillStyle = g.deepReady || g.deepThink >= i + 1 || g.deepBurst > i ? "#87ddff" : "#4d608a";
      c.fillRect(g.p.x - 9 + i * 7, g.p.y - 72, 5, 5);
    }
    c.restore();
  }
  for (const f of g.effects) if (f.type === "deepToken") {
    const t = 1 - f.life / f.max, x = f.x + (f.tx - f.x) * t, y = f.y + (f.ty - f.y) * t;
    c.save();
    c.fillStyle = "#27488e";
    c.fillRect(x - 5, y - 5, 10, 10);
    c.fillStyle = "#a0edff";
    c.fillRect(x - 3, y - 3, 6, 6);
    c.restore();
  }
}

// dist/followers.js
var FOLLOWERS = ["mouse", "dog", "egg", "turtle", "rabbit"];
function homeFollowerPoint(g, id) {
  if (id === "turtle") return { x: g.p.x + Math.cos(g.elapsed * 2) * 56, y: g.p.y + Math.sin(g.elapsed * 2) * 56 };
  const ids = FOLLOWERS.filter((k) => k !== "turtle" && g.has(k)), i = Math.max(0, ids.indexOf(id)), a = Math.PI * 0.7 + i * 0.5;
  return { x: Math.max(65, Math.min(895, g.p.x + Math.cos(a) * 65)), y: Math.max(70, Math.min(530, g.p.y + Math.sin(a) * 40 + 12)) };
}
function followerPoint(g, id) {
  const s = g.followerStates?.[id];
  return s ? { x: s.x, y: s.y } : homeFollowerPoint(g, id);
}
function drawFollowers(c, g) {
  drawMemeFollowers(c, g);
  drawDeepseek(c, g);
  drawPhoebe(c, g);
  for (const id of FOLLOWERS.filter((id2) => g.has(id2))) {
    const p = followerPoint(g, id), s = g.followerStates?.[id], frame2 = s?.phase === "windup" || s?.phase === "lunge" || s?.phase === "leap" ? 2 : s?.phase === "recover" || s?.flash > 0 ? 3 : s?.moving ? Math.floor(g.elapsed * 10) % 2 : 0;
    if (id === "mouse" && s?.secretDoor && s.phase === "sniff") {
      const d = s.secretDoor;
      c.save();
      c.strokeStyle = "#f9db78";
      c.lineWidth = 3;
      c.strokeRect(d.x - 14, d.y - 14, 28, 28);
      c.fillStyle = "#f9db78";
      c.font = "bold 16px system-ui";
      c.textAlign = "center";
      c.fillText("!", p.x, p.y - 38);
      c.restore();
    }
    c.save();
    c.fillStyle = "#4a3d3a2a";
    c.fillRect(p.x - 14, p.y + 10, 28, 5);
    c.restore();
    if (!drawSprite(c, "followers-family-v2.png", frame2, FOLLOWERS.indexOf(id), 4, 5, p.x, p.y - (s?.lift || 0), id === "egg" ? 40 : 48, { flip: s?.face === 1, squash: s?.phase === "windup" ? 0.88 : 1 })) {
      c.fillStyle = "#e9c861";
      c.fillRect(p.x - 12, p.y - 12, 24, 24);
      c.fillStyle = "#344535";
      c.fillRect(p.x - 7, p.y - 7, 4, 4);
      c.fillRect(p.x + 3, p.y - 7, 4, 4);
    }
  }
}

// dist/follower-combat.js
function travel(g, s, target2, speed, dt) {
  const d = Math.hypot(target2.x - s.x, target2.y - s.y);
  if (d < 1) return;
  const direction = steer(g.room, s, target2), x = s.x, y = s.y, step = Math.min(d, speed * dt);
  s.x += direction.x * step;
  s.y += direction.y * step;
  moveOnTerrain(g.room, s, x, y);
  s.moving = Math.hypot(s.x - x, s.y - y) > 0.1;
  if (Math.abs(direction.x) > 0.1) s.face = direction.x > 0 ? 1 : -1;
}
function resetFollowers(g) {
  g.followerStates = {};
  g.memePets = {};
  g.shrimpMeals = [];
  g.tempuraBuff = 0;
  g.rabbitWave = null;
  g.rabbitRequest = null;
}
function requestRabbit(g, targets) {
  if (!g.has("rabbit")) return;
  const nearby = g.room.enemies.filter((e) => !e.dead && !e.airborne && Math.hypot(e.x - g.p.x, e.y - g.p.y) < 280 + e.r && shotLaneOpen(g.room, g.p, e));
  if (!nearby.length) return;
  g.rabbitRequest = { x: g.p.x, y: g.p.y, targets: nearby };
}
function updateFollowers(g, dt) {
  updateMemeFollowers(g, dt);
  g.followerStates ??= {};
  const enemies = g.room.enemies.filter((e) => !e.dead && !e.airborne);
  for (const id of FOLLOWERS.filter((id2) => g.has(id2))) {
    const home = homeFollowerPoint(g, id);
    const s = g.followerStates[id] ??= { ...safeSpot(g.room, home.x, home.y, 10), r: 10, type: "pet", phase: "idle", clock: 0, cd: 0, face: -1 };
    s.clock += dt;
    s.cd = Math.max(0, s.cd - dt);
    s.flash = Math.max(0, (s.flash || 0) - dt);
    s.moving = false;
    if (id === "turtle") {
      s.x = home.x;
      s.y = home.y;
      let blocked2 = false;
      g.enemyBullets = g.enemyBullets.filter((b) => {
        if (Math.hypot(b.x - s.x, b.y - s.y) > 32 + b.r) return true;
        blocked2 = true;
        return false;
      });
      if (blocked2) {
        s.flash = 0.25;
        g.effects.push({ type: "petBlock", x: s.x, y: s.y, life: 0.24, max: 0.24, radius: 34 });
      }
      if (!(s.contactHits instanceof Map)) s.contactHits = /* @__PURE__ */ new Map();
      for (const [e, until] of s.contactHits) if (e.dead || until <= g.elapsed) s.contactHits.delete(e);
      for (const e of enemies) if (!["fly", "hopper"].includes(e.type) && !(s.contactHits.get(e) > g.elapsed) && Math.hypot(e.x - s.x, e.y - s.y) < e.r + 16 && shotLaneOpen(g.room, s, e)) {
        s.contactHits.set(e, g.elapsed + 0.5);
        g.damageEnemy(e, Math.min(4, 1.4 + g.p.damage * 0.6));
        s.flash = Math.max(s.flash, 0.18);
        g.effects.push({ type: "petImpact", x: s.x, y: s.y, life: 0.18, max: 0.18, radius: 20 });
      }
      continue;
    }
    if (id === "mouse") {
      updateMouse(g, s, home, dt, travel);
      continue;
    }
    if (id === "rabbit" && g.rabbitRequest) {
      const request = g.rabbitRequest;
      g.rabbitRequest = null;
      s.phase = "windup";
      s.clock = 0;
      s.request = request;
      s.sx = s.x;
      s.sy = s.y;
    }
    if (id === "rabbit" && s.phase === "windup" && s.clock >= 0.16) {
      s.phase = "leap";
      s.clock = 0;
    }
    if (id === "rabbit" && s.phase === "leap") {
      const progress = Math.min(1, s.clock / 0.3);
      s.x = s.sx + (s.request.x - s.sx) * progress;
      s.y = s.sy + (s.request.y - s.sy) * progress;
      s.lift = Math.sin(progress * Math.PI) * 35;
      if (progress === 1) {
        s.lift = 0;
        s.phase = "recover";
        s.clock = 0;
        g.rabbitWave = { x: s.x, y: s.y, t: 0, targets: s.request.targets, hits: /* @__PURE__ */ new Set() };
        g.effects.push({ type: "petWave", x: s.x, y: s.y, life: 0.45, max: 0.45, radius: 280 });
      }
      continue;
    }
    if (id === "rabbit" && s.phase === "windup") continue;
    if (id === "dog" || id === "egg") {
      if (s.phase === "idle" && s.cd <= 0 && enemies.length) {
        const target2 = enemies.filter((e) => id !== "egg" || shotLaneOpen(g.room, s, e)).sort((a, b) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y))[0];
        if (target2 && (id === "egg" || Math.hypot(target2.x - s.x, target2.y - s.y) < 360)) {
          s.target = target2;
          s.phase = "windup";
          s.clock = 0;
          s.face = target2.x > s.x ? 1 : -1;
        }
      }
      if (s.phase === "windup") {
        if (s.clock < (id === "dog" ? 0.18 : 0.25)) continue;
        if (!s.target || s.target.dead) {
          s.phase = "recover";
          s.clock = 0;
          continue;
        }
        if (id === "egg") {
          const dx = s.target.x - s.x, dy = s.target.y - s.y, len = Math.hypot(dx, dy) || 1;
          g.shoot(dx, dy, true);
          const shot2 = g.bullets.at(-1);
          shot2.x = s.x + dx / len * 18;
          shot2.y = s.y - 8 + dy / len * 18;
          shot2.eggShot = true;
          shot2.pierce = true;
          shot2.damage = Math.min(7, 2 + g.p.damage * 0.9);
          g.effects.push({ type: "petMuzzle", x: shot2.x, y: shot2.y, life: 0.18, max: 0.18, radius: 16 });
          s.phase = "recover";
          s.clock = 0;
          s.cd = 1.25;
        } else {
          s.phase = "lunge";
          s.clock = 0;
        }
      }
      if (id === "dog" && s.phase === "lunge") {
        if (s.target.dead || s.clock > 0.8) {
          s.phase = "recover";
          s.clock = 0;
          s.cd = 0.75;
          continue;
        }
        travel(g, s, s.target, 720, dt);
        if (Math.hypot(s.target.x - s.x, s.target.y - s.y) < s.target.r + 12 && !s.target.airborne && shotLaneOpen(g.room, s, s.target)) {
          g.damageEnemy(s.target, Math.min(8, 3.2 + g.p.damage * 0.9));
          g.effects.push({ type: "petImpact", x: s.x, y: s.y, life: 0.25, max: 0.25, radius: 30 });
          s.phase = "recover";
          s.clock = 0;
          s.cd = 0.75;
        }
        continue;
      }
    }
    if (s.phase === "recover" && s.clock > 0.28) {
      s.phase = "idle";
      s.clock = 0;
    }
    travel(g, s, home, 260, dt);
  }
  if (g.rabbitWave) {
    const w = g.rabbitWave;
    w.t += dt;
    const radius = Math.min(280, w.t / 0.45 * 280);
    for (const e of w.targets) if (!e.dead && !w.hits.has(e) && Math.hypot(e.x - w.x, e.y - w.y) < radius + e.r && !e.airborne && shotLaneOpen(g.room, w, e)) {
      w.hits.add(e);
      g.releasingLaugh = true;
      try {
        g.damageEnemy(e, Math.min(9, 4 + g.p.damage * 1.5));
      } finally {
        g.releasingLaugh = false;
      }
      g.effects.push({ type: "petImpact", x: e.x, y: e.y, life: 0.18, max: 0.18, radius: 20 });
    }
    if (w.t >= 0.45) g.rabbitWave = null;
  }
}

// dist/catcher-combos.js
var clamp3 = (n, a, b) => Math.max(a, Math.min(b, n));
var lanes = [180, 300, 420];
function installCatcherArena(g) {
  g.room.hazards = [-1, 1].map((s) => ({ kind: "belt", x: 480 + s * 170, y: 310, w: 100, h: 300, dx: 0, dy: s, power: 65, phase: 0, reverse: true, catcherBelt: true }));
}
function cleanup(g, e, interrupt = true) {
  g.room.obstacles = g.room.obstacles.filter((o) => o.owner !== e);
  g.effects = g.effects.filter((f) => f.type !== "cargoWave" || f.owner !== e);
  if (interrupt) g.enemyBullets = g.enemyBullets.filter((b) => b.catcherPressure !== e);
}
function catcherPhase(g, e, dt) {
  if (e.dead) {
    cleanup(g, e);
    return;
  }
  if (e.hp < e.maxHp * 0.5 && !e.catcherRage) {
    e.catcherRage = true;
    g.emit("toast", { text: "\u5206\u62E3\u7EBF\u8D85\u8F7D\uFF01\u4F20\u9001\u5E26\u52A0\u901F\uFF0C\u8D27\u7269\u5F00\u59CB\u53CC\u5411\u5939\u51FB\u3002" });
  }
  for (const h2 of g.room.hazards || []) if (h2.catcherBelt) h2.power = e.catcherRage ? 100 : 65;
  for (const f of g.effects) if (f.type === "cargoWave" && f.owner === e) {
    if (e.handDisabled > 0 || e.hands?.cancelled) {
      f.life = 0;
      continue;
    }
    f.x += f.vx * dt;
    if (overlaps({ x: f.x, y: f.y, w: 48, h: 64 }, g.p.x, g.p.y, g.p.r)) g.hurt();
  }
}
function startCatcherCombo(g, e, cycle) {
  if (cycle !== 2 && cycle !== 3 && cycle !== 6) return false;
  const mode = cycle === 2 ? "sweep" : "cargo";
  e.hands = { mode, x: 480, y: clamp3(g.p.y, 105, 495), t: 0, wind: 0.9, placed: false, cancelled: false, fired: 0, safe: (e.cargoCycle || 0) % 3, rage: e.hp < e.maxHp * 0.5 };
  if (mode === "cargo") e.cargoCycle = (e.cargoCycle || 0) + 1;
  e.cd = mode === "sweep" ? 3.2 : e.hands.rage ? 5.9 : 4.6;
  g.emit("toast", { text: mode === "sweep" ? "\u53CC\u81C2\u6A2A\u626B\uFF01\u79BB\u5F00\u6807\u8BB0\u5E26\uFF0C\u6216\u7A7F\u5165\u53CC\u638C\u4E4B\u95F4\u3002" : "\u8D27\u7269\u5217\u9635\uFF01\u7EFF\u8272\u901A\u9053\u907F\u5F00\u8D27\u7269\uFF0C\u8FD8\u8981\u6A2A\u79FB\u8EB2\u70B9\u5C04\uFF1B\u70B8\u624B\u53EF\u4E2D\u65AD\u3002" });
  return true;
}
function place(g, e, h2, arms) {
  g.room.obstacles = [...g.room.obstacles.filter((o) => o.owner !== e), ...arms.map((a) => ({ ...a, kind: "hand", owner: e, r: 32 }))];
  h2.placed = true;
  for (const a of arms) if (overlaps(a, g.p.x, g.p.y, g.p.r)) {
    g.hurt();
    g.p.y = clamp3(a.y + (g.p.y < a.y ? -1 : 1) * (a.h / 2 + g.p.r + 6), 75, 525);
  }
}
function updateCatcherCombo(g, e, dt) {
  const h2 = e.hands;
  if (!h2 || !["sweep", "cargo"].includes(h2.mode)) return false;
  if (e.dead || h2.cancelled || e.handDisabled > 0) {
    cleanup(g, e);
    e.hands = null;
    return true;
  }
  h2.t += dt;
  const pressureLimit = h2.mode === "sweep" ? h2.rage ? 2 : 1 : h2.rage ? 4 : 3;
  if (!h2.pressure && h2.t >= 1.05 + (h2.pressureCount || 0) * 1.05 && (h2.pressureCount || 0) < pressureLimit) {
    h2.pressure = { aim: Math.atan2(g.p.y - e.y, g.p.x - e.x), wind: 0.65 };
  }
  if (h2.pressure) {
    h2.pressure.wind -= dt;
    if (h2.pressure.wind <= 0) {
      const aim2 = h2.pressure.aim, speed = h2.rage ? 270 : 245;
      for (const off of h2.rage ? [-0.32, -0.16, 0, 0.16, 0.32] : [-0.16, 0, 0.16]) g.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(aim2 + off) * speed, vy: Math.sin(aim2 + off) * speed, r: 6, life: 4.5, catcherPressure: e });
      h2.pressure = null;
      h2.pressureCount = (h2.pressureCount || 0) + 1;
    }
  }
  if (h2.mode === "sweep") {
    if (h2.t >= h2.wind) {
      const progress = clamp3((h2.t - h2.wind) / 1.5, 0, 1);
      const arms = [{ x: 85 + progress * 290, y: h2.y, w: 70, h: 110 }, { x: 875 - progress * 290, y: h2.y, w: 70, h: 110 }];
      place(g, e, h2, arms);
      for (const arm of arms) if (overlaps(arm, g.p.x, g.p.y, g.p.r)) {
        g.hurt();
        const direction = g.p.y < h2.y ? -1 : 1;
        g.p.y = clamp3(h2.y + direction * (55 + g.p.r + 5), 75, 525);
      }
    }
    if (h2.t >= 2.9) {
      cleanup(g, e, false);
      e.hands = null;
    }
  } else {
    if (h2.t >= h2.wind && !h2.placed) place(g, e, h2, [{ x: 90, y: 300, w: 44, h: 90 }, { x: 870, y: 300, w: 44, h: 90 }]);
    const waves = h2.rage ? 2 : 1;
    if (h2.fired < waves && h2.t >= h2.wind + h2.fired * 1.3) {
      const direction = h2.fired % 2 ? -1 : 1;
      for (let i = 0; i < 3; i++) if (i !== h2.safe) g.effects.push({ type: "cargoWave", owner: e, x: direction > 0 ? 85 : 875, y: lanes[i], vx: direction * 250, life: 3.3, max: 3.3 });
      h2.fired++;
    }
    if (h2.t >= (h2.rage ? 5.6 : 4.3)) {
      cleanup(g, e, false);
      e.hands = null;
    }
  }
  return true;
}
function drawCatcherCombos(ctx2, g) {
  ctx2.save();
  ctx2.textAlign = "center";
  ctx2.font = "bold 12px system-ui";
  for (const e of g.room.enemies) {
    if (e.kind !== "catcher" || e.dead) continue;
    if (e.handDisabled > 0) {
      ctx2.fillStyle = "#a84842";
      ctx2.fillText("\u53CC\u81C2\u70B8\u9000 \xB7 \u6613\u4F24 +50% \xB7 " + e.handDisabled.toFixed(1) + "\u79D2", e.x, e.y - 110);
    }
    const h2 = e.hands;
    if (!h2 || h2.cancelled || !["sweep", "cargo"].includes(h2.mode)) continue;
    if (h2.mode === "sweep") {
      ctx2.fillStyle = h2.t < h2.wind ? "#d5836c38" : "#d5836c18";
      ctx2.strokeStyle = "#b76656";
      ctx2.setLineDash([8, 8]);
      for (const x of [50, 550]) {
        ctx2.fillRect(x, h2.y - 55, 360, 110);
        ctx2.strokeRect(x, h2.y - 55, 360, 110);
      }
      ctx2.setLineDash([]);
      ctx2.fillStyle = "#86c89835";
      ctx2.fillRect(410, h2.y - 55, 140, 110);
      ctx2.fillStyle = "#944e43";
      ctx2.fillText("\u53CC\u638C \u2192      \u7559\u9699      \u2190 \u53CC\u638C", 480, clamp3(h2.y - 68, 75, 520));
    } else for (let i = 0; i < 3; i++) {
      const safe = i === h2.safe;
      ctx2.fillStyle = safe ? "#86c89835" : "#cb8c712b";
      ctx2.fillRect(115, lanes[i] - 32, 730, 64);
      ctx2.fillStyle = safe ? "#416d48" : "#9b574b";
      ctx2.fillText(safe ? "\u8D27\u7269\u5B89\u5168\u7EBF \xB7 \u7559\u610F\u7784\u51C6" : h2.rage ? "\u2192 \u8D27\u7269\u5939\u51FB \u2190" : "\u8D27\u7269 \u2192", 480, lanes[i] + 4);
    }
    if (h2.pressure) {
      ctx2.strokeStyle = "#a64e45";
      ctx2.lineWidth = 2;
      ctx2.setLineDash([7, 7]);
      for (const off of h2.rage ? [-0.32, 0, 0.32] : [-0.16, 0, 0.16]) {
        const a = h2.pressure.aim + off;
        ctx2.beginPath();
        ctx2.moveTo(e.x, e.y);
        ctx2.lineTo(e.x + Math.cos(a) * 850, e.y + Math.sin(a) * 850);
        ctx2.stroke();
      }
      ctx2.setLineDash([]);
      ctx2.fillStyle = "#9b574b";
      ctx2.fillText("\u70B9\u5C04\u7784\u51C6 \xB7 \u6A2A\u79FB\u8EB2\u5F00", e.x, e.y - 85);
    }
    let arms = g.room.obstacles.filter((o) => o.owner === e);
    if (!h2.placed) arms = h2.mode === "sweep" ? [{ x: 85, y: h2.y, w: 70, h: 110 }, { x: 875, y: h2.y, w: 70, h: 110 }] : [{ x: 90, y: 300, w: 44, h: 90 }, { x: 870, y: 300, w: 44, h: 90 }];
    for (const a of arms) {
      ctx2.strokeStyle = "#aa8f68";
      ctx2.lineWidth = 13;
      ctx2.beginPath();
      ctx2.moveTo(e.x + (a.x < e.x ? -40 : 40), e.y);
      ctx2.quadraticCurveTo(a.x, e.y - 80, a.x, a.y);
      ctx2.stroke();
      ctx2.fillStyle = h2.placed ? "#d6b083" : "#d6b08380";
      ctx2.strokeStyle = "#80613e";
      ctx2.lineWidth = 3;
      ctx2.beginPath();
      ctx2.roundRect(a.x - a.w / 2, a.y - a.h / 2, a.w, a.h, 12);
      ctx2.fill();
      ctx2.stroke();
      ctx2.fillStyle = "#6d4e37";
      ctx2.fillText("\u70B8\u9000", a.x, a.y + 4);
    }
  }
  for (const f of g.effects) if (f.type === "cargoWave" && f.life > 0) {
    ctx2.fillStyle = "#b99564";
    ctx2.strokeStyle = "#6e5336";
    ctx2.lineWidth = 3;
    ctx2.fillRect(f.x - 24, f.y - 32, 48, 64);
    ctx2.strokeRect(f.x - 24, f.y - 32, 48, 64);
    ctx2.beginPath();
    ctx2.moveTo(f.x - 20, f.y - 28);
    ctx2.lineTo(f.x + 20, f.y + 28);
    ctx2.moveTo(f.x + 20, f.y - 28);
    ctx2.lineTo(f.x - 20, f.y + 28);
    ctx2.stroke();
  }
  ctx2.restore();
}

// dist/puppet.js
var clamp4 = (n, a, b) => Math.max(a, Math.min(b, n));
var target = (g) => ({ x: clamp4(g.p.x, 100, 860), y: clamp4(g.p.y, 100, 500) });
function throwPods(g, e, requested) {
  const alive = g.room.enemies.filter((m) => !m.dead && m !== e).length, pending3 = g.effects.filter((f) => f.type === "dollPod" && f.owner === e && !f.landed && f.life > 0).length;
  const amount = Math.max(0, Math.min(requested, 5 - alive - pending3));
  for (let i = 0; i < amount; i++) g.effects.push({ type: "dollPod", owner: e, x: clamp4(g.p.x + (i ? 65 : -20), 100, 860), y: clamp4(g.p.y, 100, 500), sx: e.x, sy: e.y, radius: 75, life: 1 + i * 0.28, max: 1 + i * 0.28, spawnType: ["brute", "runner", "stitchling"][((e.podCount || 0) + i) % 3] });
  e.podCount = (e.podCount || 0) + amount;
  return amount;
}
function startPuppetAttack(g, e) {
  if (e.puppetSkill) {
    e.cd = Math.max(e.cd, 0.25);
    return true;
  }
  const cycle = (e.puppetCycle || 0) % 4;
  e.puppetCycle = (e.puppetCycle || 0) + 1;
  const rage2 = e.hp < e.maxHp * 0.5;
  if (cycle === 0) {
    if (throwPods(g, e, rage2 ? 2 : 1)) {
      e.cd = rage2 ? 0.65 : 0.85;
      return true;
    }
  }
  const mode = cycle === 3 ? "loom" : cycle === 2 ? "stitch" : "needle";
  e.puppetSkill = { mode, t: 0, age: 0, wave: 0, fired: 0, rage: rage2, ...target(g), aim: Math.atan2(g.p.y - e.y, g.p.x - e.x), nextAimAt: 0.8 };
  e.cd = mode === "loom" ? rage2 ? 4.2 : 3.4 : mode === "stitch" ? rage2 ? 4.95 : 3.35 : rage2 ? 3.3 : 2.5;
  g.emit("toast", { text: mode === "loom" ? "\u62FC\u88C5\u5976\u5076 \xB7 \u7EC7\u673A\u5939\u5C04\uFF01\u4E0A\u4E0B\u9488\u5E55\u7559\u6709\u901A\u9053\uFF0C\u5C0F\u5FC3\u843D\u70B9\u3002" : mode === "needle" ? "\u62FC\u88C5\u5976\u5076 \xB7 \u7F1D\u9488\u8FDE\u5C04\uFF01\u79BB\u5F00\u865A\u7EBF\u6307\u5411\u3002" : "\u62FC\u88C5\u5976\u5076 \xB7 \u7F1D\u7EBF\u7A7A\u6295\uFF01\u659C\u5411\u79BB\u5F00\u6807\u8BB0\u5E26\uFF0C\u540C\u65F6\u8EB2\u5F00\u6295\u602A\u843D\u70B9\u3002" });
  return true;
}
function updatePuppet(g, e, dt) {
  if (e.dead) {
    e.puppetSkill = null;
    g.enemyBullets = g.enemyBullets.filter((b) => b.puppetOwner !== e);
    return;
  }
  const s = e.puppetSkill;
  if (!s) return;
  s.t += dt;
  s.age += dt;
  if (s.mode === "loom") {
    if (s.t >= 1 + s.fired * 0.75 && s.fired < (s.rage ? 4 : 3)) {
      const gap = clamp4(s.x, 170, 790), left = s.fired % 2 === 0;
      for (let x = 75; x <= 885; x += 27) if (Math.abs(x - gap) > 100) g.enemyBullets.push({ x, y: left ? 65 : 535, vx: 0, vy: (left ? 1 : -1) * (s.rage ? 290 : 250), r: 6, life: 3, needle: true, puppetOwner: e });
      s.fired++;
    }
    if (s.t >= 1.25 && !s.podThrown) {
      throwPods(g, e, 1);
      s.podThrown = true;
    }
    if (s.t >= (s.rage ? 3.9 : 3.15)) e.puppetSkill = null;
  } else if (s.mode === "needle") {
    const bursts = s.rage ? 4 : 3, count2 = s.rage ? 7 : 5;
    if (s.fired > 0 && s.fired < bursts && s.t >= s.nextAimAt) {
      s.aim = Math.atan2(g.p.y - e.y, g.p.x - e.x);
      s.nextAimAt = Infinity;
    }
    if (s.fired < bursts && s.t >= 0.7 + s.fired * 0.8) {
      for (let i = 0; i < count2; i++) {
        const a = s.aim + (i - (count2 - 1) / 2) * 0.19, speed = s.rage ? 315 : 285;
        g.enemyBullets.push({ x: e.x + Math.cos(a) * (e.r + 6), y: e.y + Math.sin(a) * (e.r + 6), vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 6, life: 4, needle: true, puppetOwner: e });
      }
      s.fired++;
      s.nextAimAt = 0.8 + (s.fired - 1) * 0.8;
    }
    if (s.t >= 0.7 + (bursts - 1) * 0.8 + 0.15) e.puppetSkill = null;
  } else {
    if (s.age >= 1.3 && !s.podThrown && (s.rage || s.wave === 0)) {
      throwPods(g, e, 1);
      s.podThrown = true;
    }
    if (s.age >= 0.95 && s.age < 1.25 && (overlaps({ x: 480, y: s.y, w: 850, h: 28 }, g.p.x, g.p.y, g.p.r) || overlaps({ x: s.x, y: 300, w: 28, h: 490 }, g.p.x, g.p.y, g.p.r))) g.hurt();
    if (s.age >= 1.6) {
      if (s.wave < (s.rage ? 2 : 1)) {
        s.wave++;
        s.age = 0;
        s.podThrown = false;
        Object.assign(s, target(g));
      } else e.puppetSkill = null;
    }
  }
}
function drawPuppetAttack(ctx2, g) {
  for (const e of g.room.enemies) {
    const s = e.puppetSkill;
    if (e.dead || !s) continue;
    ctx2.save();
    ctx2.font = "bold 13px system-ui";
    ctx2.textAlign = "center";
    if (s.mode === "loom") {
      const gap = clamp4(s.x, 170, 790);
      ctx2.fillStyle = "#874e9650";
      ctx2.fillRect(55, 55, gap - 155, 490);
      ctx2.fillRect(gap + 100, 55, 805 - gap, 490);
      ctx2.fillStyle = "#8fcfa62b";
      ctx2.fillRect(gap - 100, 55, 200, 490);
      ctx2.strokeStyle = "#f0c48c";
      ctx2.lineWidth = 4;
      ctx2.strokeRect(gap - 100, 55, 200, 490);
      for (let x = 75; x < 900; x += 27) {
        ctx2.fillStyle = "#8b5a7e";
        ctx2.fillRect(x - 4, 55, 8, 16);
        ctx2.fillRect(x - 4, 529, 8, 16);
      }
      ctx2.fillStyle = "#623b65";
      ctx2.fillText("\u7EC7\u673A\u5939\u5C04 \xB7 \u7559\u51FA\u4E2D\u7F1D\uFF0C\u907F\u5F00\u6295\u602A\u843D\u70B9", 480, 100);
    } else if (s.mode === "needle") {
      ctx2.strokeStyle = s.t < 0.7 + s.fired * 0.8 ? "#ae5684" : "#b15b8b77";
      ctx2.lineWidth = 2;
      ctx2.setLineDash([9, 7]);
      for (const offset of [-(s.rage ? 3 : 2) * 0.19, 0, (s.rage ? 3 : 2) * 0.19]) {
        const a = s.aim + offset;
        ctx2.beginPath();
        ctx2.moveTo(e.x, e.y);
        ctx2.lineTo(e.x + Math.cos(a) * 350, e.y + Math.sin(a) * 350);
        ctx2.stroke();
      }
      ctx2.setLineDash([]);
      ctx2.fillStyle = "#773f66";
      ctx2.fillText(s.t < 0.7 + s.fired * 0.8 ? "\u7F1D\u9488\u84C4\u52BF \xB7 \u5411\u4FA7\u9762\u8EB2" : "\u7F1D\u9488\u8FDE\u5C04", e.x, e.y - 65);
    } else {
      const active = s.age >= 0.95 && s.age < 1.25, warning = s.age < 0.95;
      ctx2.fillStyle = active ? "#bf4d8fc9" : "#c8789b30";
      ctx2.strokeStyle = active ? "#79335f" : "#a55780";
      ctx2.lineWidth = 2;
      ctx2.globalAlpha = warning || active ? 1 : 0.35;
      ctx2.setLineDash(warning ? [8, 6] : []);
      for (const r of [{ x: 55, y: s.y - 14, w: 850, h: 28 }, { x: s.x - 14, y: 55, w: 28, h: 490 }]) {
        ctx2.fillRect(r.x, r.y, r.w, r.h);
        ctx2.strokeRect(r.x, r.y, r.w, r.h);
      }
      ctx2.setLineDash([]);
      ctx2.strokeStyle = active ? "#fff0d6" : "#a55780";
      ctx2.lineWidth = 2;
      for (let x = 65; x < 900; x += 22) {
        ctx2.beginPath();
        ctx2.moveTo(x - 5, s.y - 8);
        ctx2.lineTo(x + 5, s.y + 8);
        ctx2.stroke();
      }
      for (let y = 65; y < 540; y += 22) {
        ctx2.beginPath();
        ctx2.moveTo(s.x - 8, y - 5);
        ctx2.lineTo(s.x + 8, y + 5);
        ctx2.stroke();
      }
      ctx2.fillStyle = "#773f66";
      ctx2.fillText(active ? "\u7F1D\u5408\uFF01" : s.wave ? "\u8FFD\u51FB\u7F1D\u7EBF \xB7 \u518D\u6B21\u8EB2\u5F00" : "\u5341\u5B57\u7F1D\u7EBF \xB7 \u659C\u5411\u8EB2\u5F00", 240, 112);
    }
    ctx2.restore();
  }
}

// dist/final-boss.js
var clamp5 = (n, a, b) => Math.max(a, Math.min(b, n));
var isFinal = (e) => e.kind === "bull" || e.kind === "meishu";
var rage = (e) => e.enraged || e.hp < e.maxHp * 0.5;
var aim = (g, e) => Math.atan2(g.p.y - e.y, g.p.x - e.x);
function bullet(g, e, a, speed = 245, x = e.x, y = e.y, combo = false) {
  g.enemyBullets.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 7, life: 4.4, finalOwner: e, finalCombo: combo });
}
function fan(g, e, s) {
  const count2 = e.kind === "bull" ? 5 : 7;
  for (let i = 0; i < count2; i++) {
    const a = s.aim + (i - (count2 - 1) / 2) * 0.22;
    bullet(g, e, a, s.rage ? 275 : 245, e.x + Math.cos(a) * (e.r + 9), e.y + Math.sin(a) * (e.r + 9));
  }
}
function lockCharge(g, e, s) {
  s.x = e.x;
  s.y = e.y;
  s.aim = aim(g, e);
  s.tx = clamp5(e.x + Math.cos(s.aim) * 390, 55 + e.r, 905 - e.r);
  s.ty = clamp5(e.y + Math.sin(s.aim) * 390, 55 + e.r, 545 - e.r);
  s.age = 0;
}
function lockTraps(g, s) {
  s.traps = Array.from({ length: s.rage ? 4 : 3 }, (_, i) => ({ x: clamp5(g.p.x + (i === 0 ? 0 : i === 1 ? -105 : i === 2 ? 105 : 0), 110, 850), y: clamp5(g.p.y + (i === 3 ? -110 : 0), 110, 490), delay: i * 0.2 }));
  s.age = 0;
}
function begin(g, e, mode, combo = false) {
  const s = { mode, combo, rage: rage(e), t: 0, age: 0, fired: 0, wave: 0, aim: aim(g, e), x: e.x, y: e.y };
  if (mode === "charge") {
    s.total = combo ? 3 : s.rage ? 3 : 2;
    lockCharge(g, e, s);
  }
  if (mode === "traps") lockTraps(g, s);
  if (mode === "stomp") {
    s.rings = Array.from({ length: s.rage ? 2 : 1 }, (_, i) => ({ delay: 0.85 + i * 0.8, hit: false }));
    s.debris = [];
  }
  e.finalSkill = s;
  e.vx = e.vy = 0;
  e.cd = 999;
  g.emit("bossVoice", { kind: e.kind, skill: mode, owner: e });
  return s;
}
function finish(e) {
  e.finalSkill = null;
  e.cd = rage(e) ? 0.32 : 0.45;
  e.vx = e.vy = 0;
}
function startFinalAttack(g, e) {
  if (e.dead) return true;
  const f = g.room.finalFight;
  if (e.finalSkill || f?.combo || f?.pending) {
    e.cd = Math.max(0.25, e.cd);
    return true;
  }
  const order = e.kind === "bull" ? ["charge", "stomp", "fan"] : ["traps", "cross", "fan"];
  const mode = order[(e.finalCycle || 0) % order.length];
  e.finalCycle = (e.finalCycle || 0) + 1;
  begin(g, e, mode);
  const labels = { charge: "\u725B\u6765 \xB7 \u8FDE\u73AF\u51B2\u649E\uFF01\u6BCF\u6B21\u7EA2\u7EBF\u9501\u5B9A\u540E\u4FA7\u79FB\u3002", stomp: "\u725B\u6765 \xB7 \u9707\u584C\u7262\u9876\uFF01\u8EB2\u5F00\u843D\u77F3\u6807\u8BB0\uFF0C\u86D9\u8DF3\u7A7F\u8FC7\u9707\u8361\u73AF\u3002", traps: "\u7F8E\u9F20 \xB7 \u8FDE\u73AF\u5939\u51FB\uFF01\u534A\u8840\u540E\u4F1A\u518D\u6B21\u8FFD\u8E2A\u843D\u70B9\u3002", cross: "\u7F8E\u9F20 \xB7 \u65CB\u8F6C\u5341\u5B57\u5F39\uFF01\u7ED5\u5F00\u9884\u8B66\u65B9\u5411\u3002", fan: "\u8FFD\u8E2A\u6247\u5C04 \xB7 \u6BCF\u6B21\u7784\u51C6\u540E\u5411\u4FA7\u9762\u8EB2\u5F00\uFF01" };
  g.emit("toast", { text: labels[mode] });
  return true;
}
function segmentDistance(p, x, y, tx, ty) {
  const dx = tx - x, dy = ty - y, t = clamp5(((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(p.x - x - t * dx, p.y - y - t * dy);
}
function tickSkill(g, e, dt) {
  const s = e.finalSkill;
  if (!s) return;
  const previous = s.age;
  s.t += dt;
  s.age += dt;
  if (s.mode === "charge") {
    if (e.repelled > 0) {
      e.finalSkill = null;
      e.cd = 0.8;
      return;
    }
    const wind = s.combo ? 1.05 : 0.8;
    if (s.age >= wind) {
      const progress = clamp5((s.age - wind) / 0.55, 0, 1), x = e.x, y = e.y;
      e.x = s.x + (s.tx - s.x) * progress;
      e.y = s.y + (s.ty - s.y) * progress;
      if (s.age <= wind + 0.55 + dt && segmentDistance(g.p, x, y, e.x, e.y) < e.r + g.p.r - 5) g.hurt();
    }
    if (s.age >= wind + 0.55 + 0.2) {
      s.wave++;
      if (s.wave < s.total) lockCharge(g, e, s);
      else finish(e);
    }
  } else if (s.mode === "stomp") {
    if (s.debris.length < (s.rage ? 2 : 1) && s.age >= 0.15 + s.debris.length * 0.8) s.debris.push({ x: clamp5(g.p.x, 100, 860), y: clamp5(g.p.y, 100, 500), at: s.age, hit: false });
    for (const rock of s.debris) if (!rock.hit && s.age >= rock.at + 0.9) {
      rock.hit = true;
      if (Math.hypot(g.p.x - rock.x, g.p.y - rock.y) < 60 + g.p.r) g.hurt();
    }
    for (const ring2 of s.rings) if (s.age >= ring2.delay && s.age <= ring2.delay + 0.95) {
      const min = 65 + Math.max(0, previous - ring2.delay) * 260, max = 65 + (s.age - ring2.delay) * 260, d = Math.hypot(g.p.x - s.x, g.p.y - s.y);
      if (!ring2.hit && d >= min - g.p.r - 9 && d <= max + g.p.r + 9) {
        g.hurt();
        ring2.hit = true;
      }
    }
    if (s.age >= s.rings.at(-1).delay + 1.15) finish(e);
  } else if (s.mode === "traps") {
    for (const trap of s.traps) {
      const age = s.age - trap.delay;
      if (age >= 1 && age < 1.65 && Math.hypot(g.p.x - trap.x, g.p.y - trap.y) < 48 + g.p.r) g.hurt();
    }
    if (s.age >= s.traps.at(-1).delay + 1.9) {
      if (s.rage && s.wave === 0) {
        s.wave++;
        lockTraps(g, s);
      } else finish(e);
    }
  } else if (s.mode === "fan") {
    const total = s.rage ? 4 : 3;
    if (s.fired > 0 && s.fired < total && s.age >= 0.85 + (s.fired - 1) * 0.8 && !s.reaimed) {
      s.aim = aim(g, e);
      s.reaimed = true;
    }
    if (s.fired < total && s.age >= 0.7 + s.fired * 0.8) {
      fan(g, e, s);
      s.fired++;
      s.reaimed = false;
    }
    if (s.age >= 0.7 + (total - 1) * 0.8 + 0.25) finish(e);
  } else if (s.mode === "cross") {
    const total = s.rage ? 6 : 4;
    while (s.fired < total && s.age >= 0.85 + s.fired * 0.25) {
      for (let i = 0; i < 4; i++) {
        const a = s.aim + i * Math.PI / 2 + s.fired * 0.2;
        bullet(g, e, a, s.rage ? 245 : 220, e.x + Math.cos(a) * (e.r + 9), e.y + Math.sin(a) * (e.r + 9));
      }
      s.fired++;
    }
    if (s.age >= 0.85 + (total - 1) * 0.25 + 0.3) finish(e);
  } else if (s.mode === "curtain") {
    while (s.fired < 2 && s.age >= 1.15 + s.fired * 0.7) {
      const left = s.fired === 0;
      for (let y = 75; y <= 525; y += 30) if (Math.abs(y - s.gap) > 120) bullet(g, e, left ? 0 : Math.PI, 210, left ? 65 : 895, y, true);
      s.fired++;
    }
    if (s.age >= 6) finish(e);
  }
}
function updateFinalFight(g, dt) {
  const bosses = g.room.enemies.filter(isFinal);
  if (!bosses.length) return;
  const live = bosses.filter((e) => !e.dead), f = g.room.finalFight ??= { next: 8, pending: false, combo: null };
  for (const e of bosses) if (e.dead) {
    e.finalSkill = null;
    e.vx = e.vy = 0;
  }
  g.enemyBullets = g.enemyBullets.filter((b) => !b.finalOwner?.dead);
  if (live.length === 1 && !live[0].enraged) {
    const e = live[0];
    e.enraged = true;
    e.finalSkill = null;
    e.vx = e.vy = 0;
    e.cd = 0.9;
    f.combo = null;
    f.pending = false;
    g.enemyBullets = g.enemyBullets.filter((b) => !b.finalCombo);
    g.emit("toast", { text: (e.kind === "bull" ? "\u725B\u6765" : "\u7F8E\u9F20") + "\u72EC\u81EA\u66B4\u8D70\uFF01\u8FDE\u62DB\u52A0\u5F3A\uFF0C\u6062\u590D\u65F6\u95F4\u7F29\u77ED\u3002" });
  }
  if (!live.length) {
    f.combo = null;
    f.pending = false;
    return;
  }
  if (live.length === 2) {
    if (f.combo) {
      f.combo.t += dt;
      if (f.combo.t >= 6.1) {
        f.combo = null;
        f.next = 8;
        for (const e of live) e.cd = e.kind === "bull" ? 0.45 : 0.8;
      }
    } else {
      f.next -= dt;
      if (f.next <= 0) f.pending = true;
      if (f.pending && live.every((e) => !e.finalSkill)) {
        const bull = live.find((e) => e.kind === "bull"), mouse2 = live.find((e) => e.kind === "meishu");
        const gap = clamp5(g.p.y, 180, 420);
        f.combo = { t: 0, gap };
        f.pending = false;
        begin(g, bull, "charge", true);
        const curtain = begin(g, mouse2, "curtain", true);
        curtain.gap = gap;
        g.emit("toast", { text: "\u725B\u9F20\u5408\u51FB \xB7 \u4E09\u8FDE\u51B2\u649E\uFF01\u5F39\u5899\u7559\u51FA\u7EFF\u8272\u901A\u9053\uFF0C\u6BCF\u6B21\u7EA2\u7EBF\u9501\u5B9A\u540E\u4FA7\u79FB\u3002" });
      }
    }
  }
  for (const e of live) tickSkill(g, e, dt);
}
function finalSpeed(g, e) {
  if (!isFinal(e)) return void 0;
  return e.finalSkill || g.room.finalFight?.combo ? 0 : e.enraged ? 90 : e.kind === "bull" ? 65 : 48;
}
function drawFinalFight(ctx2, g) {
  ctx2.save();
  ctx2.beginPath();
  ctx2.rect(50, 50, 860, 500);
  ctx2.clip();
  ctx2.font = "bold 13px system-ui";
  ctx2.textAlign = "center";
  const combo = g.room.finalFight?.combo;
  if (combo) {
    ctx2.fillStyle = "#8bc69b35";
    ctx2.fillRect(55, combo.gap - 120, 850, 240);
    ctx2.fillStyle = "#3c6d46";
    ctx2.fillText("\u5F39\u5899\u901A\u9053 \xB7 \u4ECD\u9700\u907F\u5F00\u725B\u6765\u51B2\u649E", 480, combo.gap - 92);
    for (const x of [65, 895]) {
      ctx2.strokeStyle = "#ad567e";
      ctx2.lineWidth = 5;
      ctx2.setLineDash([8, 6]);
      ctx2.beginPath();
      ctx2.moveTo(x, 55);
      ctx2.lineTo(x, combo.gap - 120);
      ctx2.moveTo(x, combo.gap + 120);
      ctx2.lineTo(x, 545);
      ctx2.stroke();
      ctx2.setLineDash([]);
    }
  }
  for (const e of g.room.enemies) {
    if (!isFinal(e) || e.dead) continue;
    const s = e.finalSkill;
    if (e.enraged) {
      ctx2.strokeStyle = "#c94f52";
      ctx2.lineWidth = 3;
      ctx2.beginPath();
      ctx2.arc(e.x, e.y, e.r + 10, 0, Math.PI * 2);
      ctx2.stroke();
      ctx2.fillStyle = "#8a303f";
      ctx2.fillText("\u66B4\u8D70", clamp5(e.x - e.r - 30, 85, 875), e.y + 4);
    }
    if (!s) continue;
    ctx2.strokeStyle = e.kind === "bull" ? "#b45d45" : "#a14c87";
    ctx2.fillStyle = e.kind === "bull" ? "#bb6a4333" : "#ad65952a";
    ctx2.lineWidth = 3;
    if (s.mode === "charge") {
      const warning = s.age < (s.combo ? 1.05 : 0.8);
      ctx2.strokeStyle = warning ? "#b9574f88" : "#b9574f33";
      ctx2.lineWidth = e.r * 2;
      ctx2.beginPath();
      ctx2.moveTo(s.x, s.y);
      ctx2.lineTo(s.tx, s.ty);
      ctx2.stroke();
      ctx2.strokeStyle = "#a2433e";
      ctx2.lineWidth = 3;
      ctx2.setLineDash([9, 8]);
      ctx2.beginPath();
      ctx2.moveTo(s.x, s.y);
      ctx2.lineTo(s.tx, s.ty);
      ctx2.stroke();
      ctx2.setLineDash([]);
      ctx2.fillStyle = "#833e37";
      ctx2.fillText(warning ? "\u51B2\u649E\u9884\u8B66 " + (s.wave + 1) + "/" + s.total : "\u51B2\u649E\uFF01", s.x, clamp5(s.y + 95, 110, 520));
    } else if (s.mode === "stomp") {
      if (s.age < 0.85) {
        ctx2.setLineDash([9, 9]);
        ctx2.beginPath();
        ctx2.arc(s.x, s.y, 80, 0, Math.PI * 2);
        ctx2.stroke();
        ctx2.setLineDash([]);
      }
      for (const ring2 of s.rings) {
        const t = s.age - ring2.delay;
        if (t >= 0 && t <= 0.95) {
          ctx2.lineWidth = 18;
          ctx2.beginPath();
          ctx2.arc(s.x, s.y, 65 + t * 260, 0, Math.PI * 2);
          ctx2.stroke();
        }
      }
      ctx2.fillStyle = "#833e37";
      ctx2.fillText("\u8DFA\u5730\u9707\u8361 \xB7 \u86D9\u8DF3\u7A7F\u73AF", s.x, clamp5(s.y + 95, 110, 520));
      for (const rock of s.debris) {
        const age = s.age - rock.at;
        if (age > 1.2) continue;
        ctx2.lineWidth = 2;
        ctx2.setLineDash(age < 0.9 ? [7, 6] : []);
        ctx2.fillStyle = age < 0.9 ? "#b96f4930" : "#b96f4990";
        ctx2.beginPath();
        ctx2.arc(rock.x, rock.y, 60, 0, Math.PI * 2);
        ctx2.fill();
        ctx2.stroke();
        ctx2.setLineDash([]);
        ctx2.fillStyle = "#833e37";
        ctx2.fillText(age < 0.9 ? "\u843D\u77F3\u9884\u8B66 \xB7 \u79FB\u52A8" : "\u843D\u77F3\uFF01", rock.x, rock.y - 70);
      }
    } else if (s.mode === "traps") {
      for (const trap of s.traps) {
        const t = s.age - trap.delay;
        if (t < 0 || t > 1.65) continue;
        ctx2.setLineDash(t < 1 ? [7, 6] : []);
        ctx2.fillStyle = t < 1 ? "#b95c8e25" : "#c14b8c99";
        ctx2.beginPath();
        ctx2.arc(trap.x, trap.y, 48, 0, Math.PI * 2);
        ctx2.fill();
        ctx2.stroke();
        ctx2.setLineDash([]);
        ctx2.fillStyle = "#7d3b6a";
        ctx2.fillText(t < 1 ? "\u5939\u51FB\u9884\u8B66" : "\u5939\uFF01", trap.x, trap.y + 4);
      }
    } else if (s.mode === "fan" || s.mode === "cross") {
      ctx2.setLineDash([8, 8]);
      const angles = s.mode === "cross" ? [0, Math.PI / 2, Math.PI, Math.PI * 1.5] : [-(e.kind === "bull" ? 2 : 3) * 0.22, 0, (e.kind === "bull" ? 2 : 3) * 0.22];
      for (const offset of angles) {
        const a = s.aim + offset;
        ctx2.beginPath();
        ctx2.moveTo(e.x, e.y);
        ctx2.lineTo(e.x + Math.cos(a) * 300, e.y + Math.sin(a) * 300);
        ctx2.stroke();
      }
      ctx2.setLineDash([]);
      ctx2.fillStyle = "#773d62";
      ctx2.fillText(s.mode === "cross" ? "\u65CB\u8F6C\u5341\u5B57\u5F39" : "\u8FFD\u8E2A\u6247\u5C04 \xB7 \u9501\u5B9A\u540E\u4FA7\u79FB", e.x, clamp5(e.y + 80, 110, 510));
    }
  }
  ctx2.restore();
}

// dist/chapter-mechanics.js
var DEVICES = /* @__PURE__ */ new Set(["milkValve", "resonator", "assembler", "relay"]);
function hitDevice(g, o, damage) {
  if (!DEVICES.has(o.kind)) return false;
  if (o.disabled > 0) return true;
  o.hp -= damage;
  if (o.hp > 0) return true;
  if (o.kind === "milkValve" || o.kind === "assembler") {
    g.room.obstacles = g.room.obstacles.filter((v) => v !== o);
    if (o.kind === "milkValve") {
      g.effects = g.effects.filter((f) => f.type !== "milkPool" || f.friendly || Math.hypot(f.x - o.x, f.y - o.y) > 170);
      for (const h2 of g.room.hazards || []) if (h2.kind === "milk" && Math.hypot(h2.x - o.x, h2.y - o.y) < 170) h2.drained = true;
      g.effects.push({ type: "milkPool", x: o.x, y: o.y, radius: 95, friendly: true, life: 4, max: 4, tick: 0 });
    }
    g.emit("toast", { text: o.kind === "milkValve" ? "\u5976\u9600\u7834\u88C2\uFF1A\u9644\u8FD1\u5976\u8FF9\u6E05\u9664\uFF0C\u53CD\u5411\u55B7\u5976\uFF01" : "\u9020\u602A\u53E3\u5DF2\u6467\u6BC1\uFF0C\u4E0D\u518D\u751F\u4EA7\u788E\u5E03\u602A\u3002" });
  } else {
    o.disabled = 4;
    o.hp = o.maxHp;
    g.emit("toast", { text: o.kind === "relay" ? "\u4F9B\u7535\u4E2D\u65AD 4 \u79D2\uFF0C\u5FEB\u7A7F\u8FC7\u7535\u7F51\uFF01" : "\u5171\u632F\u6682\u505C 4 \u79D2\uFF0C\u8D81\u673A\u8FDB\u653B\uFF01" });
  }
  g.burst(o.x, o.y, "#d6c99b", 10);
  return true;
}
function updateDevices(g, dt) {
  for (const o of g.room.obstacles) {
    if (!DEVICES.has(o.kind)) continue;
    o.disabled = Math.max(0, o.disabled - dt);
    if (o.kind !== "assembler" || g.room.clear || o.spawned >= 3) continue;
    o.timer -= dt;
    if (o.timer <= 0) {
      const alive = g.room.enemies.filter((e) => !e.dead).length;
      if (alive < 8) {
        const p = safeSpot(g.room, o.x, o.y + 65, 18, g.p, g.room.enemies.filter((e) => !e.dead)), m = g.spawn("tiny", p.x, p.y);
        m.hp = m.maxHp = 2;
        m.r = 12;
        m.summoned = true;
        g.room.enemies.push(m);
        o.spawned++;
        g.burst(p.x, p.y, "#c6b394", 6);
      }
      o.timer = 6;
    }
  }
}
function hazardEnabled(g, h2) {
  if (h2.drained || g.room.clear) return false;
  if (!h2.channel) return true;
  const source = g.room.obstacles.find((o) => (o.kind === "resonator" || o.kind === "relay") && o.channel === h2.channel);
  return !!source && !(source.disabled > 0);
}
function beltVector(g, h2) {
  const sign = h2.reverse && Math.floor((g.elapsed - (g.room.enteredAt || 0)) / 4) % 2 ? -1 : 1;
  return { x: (h2.dx || 0) * sign, y: (h2.dy || 0) * sign };
}
function blastDevices(g, x, y, radius) {
  for (const o of [...g.room.obstacles]) if (DEVICES.has(o.kind) && overlaps(o, x, y, radius)) hitDevice(g, o, 6);
}

// dist/screech.js
var names = { ring: "\u9519\u4F4D\u73AF\u5C04", fan: "\u7784\u51C6\u6247\u5C04", cross: "\u65CB\u8F6C\u5341\u5B57" };
function startScreech(g, e) {
  if (e.screech || e.dead) return;
  const cycle = e.screechCycle || 0, kind = ["ring", "fan", "cross"][cycle % 3], aim2 = Math.atan2(g.p.y - e.y, g.p.x - e.x), rotation = Math.floor(cycle / 3) * Math.PI / 6;
  const count2 = kind === "ring" ? 6 : kind === "fan" ? 5 : 4;
  const angles = Array.from({ length: count2 }, (_, i) => kind === "fan" ? aim2 + (i - 2) * 0.22 : aim2 + rotation + (kind === "cross" ? Math.PI / 4 : 0) + i * Math.PI * 2 / count2);
  e.screech = { kind, angles, t: 0, wind: 0.5 };
  e.screechCycle = cycle + 1;
  e.cd = 1.35;
}
function updateScreech(g, e, dt) {
  if (e.dead || e.repelled > 0) {
    e.screech = null;
    return;
  }
  const s = e.screech;
  if (!s) return;
  s.t += dt;
  if (s.t < s.wind) return;
  const speed = s.kind === "fan" ? 205 : 175;
  for (const a of s.angles) g.enemyBullets.push({ x: e.x + Math.cos(a) * (e.r + 5), y: e.y + Math.sin(a) * (e.r + 5), vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 7, life: 5, sound: s.kind === "ring" ? "ring" : "fan" });
  e.screech = null;
}
function drawScreech(ctx2, e) {
  const s = e.screech;
  if (e.dead || !s) return;
  ctx2.save();
  ctx2.strokeStyle = "#a77aab";
  ctx2.fillStyle = "#75537e";
  ctx2.lineWidth = 2;
  ctx2.setLineDash([5, 7]);
  for (const a of s.angles) {
    ctx2.beginPath();
    ctx2.moveTo(e.x + Math.cos(a) * 28, e.y + Math.sin(a) * 28);
    ctx2.lineTo(e.x + Math.cos(a) * 150, e.y + Math.sin(a) * 150);
    ctx2.stroke();
  }
  ctx2.setLineDash([]);
  ctx2.beginPath();
  ctx2.arc(e.x, e.y, e.r + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, s.t / s.wind));
  ctx2.lineWidth = 4;
  ctx2.stroke();
  ctx2.font = "11px system-ui";
  ctx2.textAlign = "center";
  ctx2.fillText(names[s.kind] + " \xB7 \u9884\u8B66", e.x, e.y - e.r - 35);
  ctx2.restore();
}

// dist/combat-content.js
var STATIONARY = /* @__PURE__ */ new Set(["turret", "milkspitter", "soundTurret", "dollTurret", "warden"]);
function milkPool(g, x, y, friendly = false, radius = 30, life = 3.5) {
  if (friendly) {
    const pools = g.effects.filter((f) => f.type === "milkPool" && f.friendly);
    if (pools.length >= 8) g.effects = g.effects.filter((f) => f !== pools[0]);
  }
  g.effects.push({ type: "milkPool", x, y, radius, friendly, life, max: life, tick: 0 });
}
function aimed(g, e, count2 = 1, spread = 0.22, speed = 220) {
  const aim2 = Math.atan2(g.p.y - e.y, g.p.x - e.x);
  for (let i = 0; i < count2; i++) {
    const a = aim2 + (i - (count2 - 1) / 2) * spread;
    g.enemyBullets.push({ x: e.x + Math.cos(a) * (e.r + 4), y: e.y + Math.sin(a) * (e.r + 4), vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 7, life: 5, ...e.kind === "catcher" ? { catcherPressure: e } : {} });
  }
}
function bottle(g, e, enhanced = false) {
  g.effects.push({ type: "milkBottle", owner: e, sx: e.x, sy: e.y - 45, x: g.p.x, y: g.p.y, radius: e.kind === "collector" ? enhanced ? 135 : 110 : 55, life: 1, max: 1, leavesMilk: true });
}
function specialAttack(g, e) {
  if (e.kind === "collector") {
    e.bottleCount = (e.bottleCount || 0) + 1;
    const enhanced = e.bottleCount % 3 === 0;
    e.cd = (enhanced ? 2.3 : 1.8) * (e.hp < e.maxHp * 0.5 ? 0.85 : 1);
    bottle(g, e, enhanced);
    if (enhanced) {
      e.bottleBurst = { left: 2, t: 0.25 };
      g.emit("toast", { text: "\u5976\u74F6\u6536\u7F34\u5458 \xB7 \u5F3A\u5316\u4E09\u8FDE\u6295\uFF01" });
    }
    return true;
  }
  if (e.kind === "catcher") {
    if (e.handDisabled > 0) {
      e.cd = 0.8;
      return true;
    }
    if (e.hands) {
      e.cd = 0.3;
      return true;
    }
    const cycle = (e.handCycle || 0) % 7;
    e.handCycle = (e.handCycle || 0) + 1;
    if (cycle === 0 || cycle === 4) return startCraneGate(g, e);
    if (startCatcherCombo(g, e, cycle)) return true;
    const mode = cycle % 2 ? "smash" : "block", x = mode === "smash" ? Math.max(110, Math.min(850, g.p.x)) : Math.max(200, Math.min(760, g.p.x)), y = mode === "smash" ? Math.max(90, Math.min(510, g.p.y)) : Math.max(170, Math.min(430, g.p.y));
    const total = e.hp < e.maxHp * 0.5 ? 3 : 2;
    e.hands = { mode, x, y, t: 0, wind: 0.8, fired: 0, placed: false, cancelled: false, wave: 0, total };
    e.cd = mode === "block" ? 3.25 : total * 1.2 + 0.2;
    return true;
  }
  if (e.kind === "puppet") return startPuppetAttack(g, e);
  if (e.kind === "bull" || e.kind === "meishu") return startFinalAttack(g, e);
  if (e.type === "milkspitter") {
    bottle(g, e);
    e.cd = 2.4;
    return true;
  }
  if (e.type === "soundTurret") {
    startScreech(g, e);
    return true;
  }
  if (e.type === "turret" || e.type === "dollTurret" || e.type === "warden") {
    aimed(g, e, e.type === "warden" ? 5 : e.type === "dollTurret" ? 3 : 1, 0.25, 230);
    e.cd = e.type === "warden" ? 1.15 : 0.85;
    return true;
  }
  if (e.type === "loader" || e.type === "shooter" && e.artChapter === 4) {
    e.gunCast = { t: 0, wind: 0.45, aim: Math.atan2(g.p.y - e.y, g.p.x - e.x) };
    e.gunFacing = g.p.x >= e.x ? 1 : -1;
    e.cd = 1.8;
    return true;
  }
  return false;
}
function removeHands(g, e) {
  g.room.obstacles = g.room.obstacles.filter((o) => o.owner !== e);
}
function updateActors(g, dt) {
  for (const e of [...g.room.enemies]) {
    if (e.kind === "puppet") updatePuppet(g, e, dt);
    if (e.kind === "catcher") catcherPhase(g, e, dt);
    if (e.type === "soundTurret") updateScreech(g, e, dt);
    if (!e.dead && e.gunCast) {
      const a = e.gunCast;
      a.t += dt;
      if (a.t >= a.wind) {
        const sx = e.x + e.gunFacing * 25, sy = e.y - 9;
        for (const off of [-0.22, 0, 0.22]) g.enemyBullets.push({ x: sx, y: sy, vx: Math.cos(a.aim + off) * 240, vy: Math.sin(a.aim + off) * 240, r: 6, life: 4, needle: e.artChapter === 4 });
        e.artAttackUntil = g.elapsed + 0.2;
        e.gunCast = null;
      }
    }
    if (e.dead) {
      if (e.hands) {
        removeHands(g, e);
        e.hands = null;
      }
      continue;
    }
    if (e.type === "milkleak" || e.kind === "collector") {
      const last2 = e.lastMilk || { x: e.x, y: e.y };
      const distance2 = Math.hypot(e.x - last2.x, e.y - last2.y);
      if (distance2 >= 24) {
        const count2 = Math.min(6, Math.ceil(distance2 / 26));
        for (let i = 1; i <= count2; i++) milkPool(g, last2.x + (e.x - last2.x) * i / count2, last2.y + (e.y - last2.y) * i / count2, false, e.kind === "collector" ? 30 : 23, e.kind === "collector" ? 4 : 3);
        e.lastMilk = { x: e.x, y: e.y };
      } else e.lastMilk = last2;
    }
    if (e.bottleBurst) {
      e.bottleBurst.t -= dt;
      if (e.bottleBurst.t <= 0) {
        bottle(g, e, true);
        e.bottleBurst.left--;
        e.bottleBurst.t = 0.25;
        if (!e.bottleBurst.left) e.bottleBurst = null;
      }
    }
    if (e.kind === "collector") {
      if (e.repelled > 0) {
        e.longCharge = null;
        e.wind = 0;
        continue;
      }
      e.chargeCD = (e.chargeCD ?? 4.5) - dt;
      if (e.chargeCD <= 0 && !e.longCharge) {
        const dx = g.p.x - e.x, dy = g.p.y - e.y, len = Math.hypot(dx, dy) || 1;
        e.dx = dx / len;
        e.dy = dy / len;
        e.longCharge = { t: 0 };
        e.chargeCD = 6.5;
      }
      if (e.longCharge) {
        e.longCharge.t += dt;
        const t = e.longCharge.t;
        e.wind = t < 0.85 ? 0.85 - t : 0;
        if (t >= 0.85 && t < 1.5) {
          e.vx = e.dx * 620;
          e.vy = e.dy * 620;
        } else {
          e.vx = 0;
          e.vy = 0;
        }
        if (t >= 1.5) e.longCharge = null;
      }
    }
    e.handDisabled = Math.max(0, (e.handDisabled || 0) - dt);
    if (e.kind === "catcher" && (updateCraneGate(g, e, dt) || updateCatcherCombo(g, e, dt))) continue;
    if (e.hands) {
      const h2 = e.hands;
      h2.t += dt;
      if (h2.cancelled || e.handDisabled > 0) {
        removeHands(g, e);
        g.enemyBullets = g.enemyBullets.filter((b) => b.catcherPressure !== e);
        e.hands = null;
        continue;
      }
      if (h2.t >= h2.wind && !h2.placed) {
        h2.placed = true;
        if (h2.mode === "block") {
          const arms = [-1, 1].map((s) => ({ kind: "hand", owner: e, x: h2.x + s * 110, y: h2.y, w: 62, h: 174, r: 32 }));
          g.room.obstacles = [...g.room.obstacles, ...arms];
          for (const o of arms) if (overlaps(o, g.p.x, g.p.y, g.p.r)) {
            g.hurt();
            g.p.x = o.x + (g.p.x < o.x ? -1 : 1) * (o.w / 2 + g.p.r + 5);
          }
        } else {
          if (h2.wave === h2.total - 1) {
            const away = Math.atan2(g.p.y - h2.y, g.p.x - h2.x);
            for (let i = 0; i < 20; i++) {
              const a = i * Math.PI / 10, d = Math.atan2(Math.sin(a - away), Math.cos(a - away));
              if (Math.abs(d) < 0.55) continue;
              g.enemyBullets.push({ x: h2.x, y: h2.y, vx: Math.cos(a) * 210, vy: Math.sin(a) * 210, r: 6, life: 4.5, catcherPressure: e });
            }
          }
          for (const x of [h2.x - 55, h2.x + 55]) {
            g.effects.push({ type: "handImpact", x, y: h2.y, radius: 65, life: 0.4, max: 0.4 });
            if (Math.hypot(g.p.x - x, g.p.y - h2.y) < 65 + g.p.r) g.hurt();
          }
        }
      }
      if (h2.mode === "block" && h2.placed && h2.fired < (e.hp < e.maxHp * 0.5 ? 4 : 3) && h2.t >= 1.05 + h2.fired * 0.55) {
        aimed(g, e, 5, 0.3, 210);
        h2.fired++;
      }
      if (h2.mode === "smash" && h2.t >= 1.2 && h2.wave < h2.total - 1) {
        h2.wave++;
        h2.t = 0;
        h2.placed = false;
        h2.x = Math.max(110, Math.min(850, g.p.x));
        h2.y = Math.max(90, Math.min(510, g.p.y));
      } else if (h2.t > (h2.mode === "block" ? 3.1 : 1.2)) {
        removeHands(g, e);
        e.hands = null;
      }
    }
  }
  for (const fx of [...g.effects]) if (fx.type === "dollPod") {
    if (fx.owner.dead) {
      fx.life = 0;
      continue;
    }
    if (fx.life <= dt && !fx.landed) {
      fx.landed = true;
      if (Math.hypot(g.p.x - fx.x, g.p.y - fx.y) < fx.radius + g.p.r) g.hurt();
      const p = safeSpot(g.room, fx.x, fx.y), m = g.spawn(fx.spawnType, p.x, p.y);
      m.hp = m.maxHp = 3;
      m.r = 17;
      m.summoned = true;
      g.room.enemies.push(m);
      g.effects.push({ type: "handImpact", x: fx.x, y: fx.y, radius: fx.radius, life: 0.35, max: 0.35 });
    }
  }
}
function hazardPhase(g, h2) {
  const duration = h2.kind === "press" ? 4.5 : 3.8;
  return ((g.elapsed - (g.room.enteredAt || 0) + h2.phase) % duration + duration) % duration;
}
function hazardActive(g, h2) {
  const p = hazardPhase(g, h2);
  return h2.kind === "milk" || h2.kind === "resonance" && p >= 0.65 && p < 1.65 || h2.kind === "press" && p >= 0.8 && p < 1.5 || h2.kind === "electric" && p >= 0.6 && p < 2.2;
}
function onMilk(g, actor) {
  return (g.room.hazards || []).some((h2) => h2.kind === "milk" && hazardEnabled(g, h2) && overlaps(h2, actor.x, actor.y, actor.r)) || g.effects.some((f) => f.type === "milkPool" && Math.hypot(actor.x - f.x, actor.y - f.y) < f.radius + actor.r);
}
function movementScale(g, actor) {
  if (actor.type === "hopper" || actor.type === "boss") return 1;
  return onMilk(g, actor) ? actor === g.p && g.has("milkboots") ? 1 : 0.72 : 1;
}
function groundDrift(g, actor) {
  if (actor.type === "hopper") return { x: 0, y: 0 };
  const belt = (g.room.hazards || []).find((h2) => h2.kind === "belt" && overlaps(h2, actor.x, actor.y, actor.r));
  const v = belt ? beltVector(g, belt) : { x: 0, y: 0 }, power = (belt?.power || 80) * (actor === g.p && g.has("milkboots") ? 0.5 : 1);
  return { x: v.x * power, y: v.y * power };
}
function updateGround(g, dt) {
  for (const fx of g.effects) if (fx.type === "milkPool") {
    if (fx.friendly) {
      fx.tick -= dt;
      if (fx.tick <= 0) {
        fx.tick = 0.5;
        for (const e of [...g.room.enemies]) if (!e.dead && !e.airborne && !(e.friendlyMilkUntil > g.elapsed) && Math.hypot(e.x - fx.x, e.y - fx.y) < fx.radius + e.r) {
          e.friendlyMilkUntil = g.elapsed + 0.5;
          g.damageEnemy(e, 1.2);
        }
      }
    } else if (Math.hypot(g.p.x - fx.x, g.p.y - fx.y) < fx.radius + g.p.r && !g.has("milkboots")) g.hurtGround ? g.hurtGround() : g.hurt();
  }
  if (g.elapsed - (g.room.enteredAt || 0) < 1) return;
  for (const h2 of g.room.hazards || []) {
    if (!hazardEnabled(g, h2)) continue;
    const phase = hazardPhase(g, h2), active = hazardActive(g, h2);
    if (active && overlaps(h2, g.p.x, g.p.y, g.p.r) && !(h2.kind === "milk" && g.has("milkboots"))) g.hurtGround ? g.hurtGround() : g.hurt();
    if (h2.kind === "press" && active) {
      const cycle = Math.floor((g.elapsed - (g.room.enteredAt || 0) + h2.phase) / 4.5);
      if (h2.lastCycle !== cycle) {
        h2.lastCycle = cycle;
        for (const e of [...g.room.enemies]) if (!e.dead && overlaps(h2, e.x, e.y, e.r)) g.damageEnemy(e, 4);
      }
    }
  }
}
function updateActive(g, dt, input) {
  const ready2 = input.active && !g.activeLatch && g.activeCharge >= g.activeCost();
  g.activeLatch = !!input.active;
  if (!ready2) return false;
  g.activeCharge = 0;
  const p = g.p, radius = g.has("quietbadge") ? 190 : 160;
  g.effects.push({ type: "laugh", x: p.x, y: p.y, radius, life: 0.45, max: 0.45 });
  requestRabbit(g, g.room.enemies.filter((e) => !e.dead && Math.hypot(e.x - p.x, e.y - p.y) < radius + e.r));
  g.releasingLaugh = true;
  try {
    for (const e of [...g.room.enemies]) if (!e.dead && Math.hypot(e.x - p.x, e.y - p.y) < radius + e.r) {
      g.damageEnemy(e, 4);
      const len = Math.hypot(e.x - p.x, e.y - p.y), dx = len ? (e.x - p.x) / len : 1, dy = len ? (e.y - p.y) / len : 0;
      e.vx = dx * 450;
      e.vy = dy * 450;
      e.repelled = 0.35;
    }
  } finally {
    g.releasingLaugh = false;
  }
  for (const b of g.enemyBullets) {
    const len = Math.hypot(b.x - p.x, b.y - p.y);
    if (len > radius + b.r) continue;
    const dx = len ? (b.x - p.x) / len : 1, dy = len ? (b.y - p.y) / len : 0;
    b.x = p.x + dx * Math.max(len, p.r + b.r + 10);
    b.y = p.y + dy * Math.max(len, p.r + b.r + 10);
    b.vx = dx * 320;
    b.vy = dy * 320;
  }
  if (g.has("propertycard")) {
    for (const o of g.room.obstacles) if (["resonator", "relay"].includes(o.kind) && Math.hypot(o.x - p.x, o.y - p.y) < radius + 30) o.disabled = 4;
    for (const e of g.room.enemies) if (!e.dead && Math.hypot(e.x - p.x, e.y - p.y) < 240 + e.r && shotLaneOpen(g.room, p, e)) {
      e.propertyMarkedUntil = (g.actionClock ?? g.elapsed) + 4;
      interruptRanged(g, e, 1.5);
      g.effects.push({ type: "voiceChain", x: p.x, y: p.y, tx: e.x, ty: e.y - 12, life: 0.22, max: 0.22 });
    }
  }
  if (g.has("spillcup")) milkPool(g, p.x, p.y, true, 95, 4);
  g.emit("laugh");
  return true;
}
function killedSpecial(g, e) {
  if (e.type === "stitchling" && !e.summoned) {
    for (const dx of [-26, 26]) {
      const p = safeSpot(g.room, e.x + dx, e.y), m = g.spawn("tiny", p.x, p.y);
      m.hp = m.maxHp = 2;
      m.r = 12;
      m.summoned = true;
      g.room.enemies.push(m);
    }
  }
}

// dist/item-combos.js
var COMBO_ITEMS = [
  ["mints", "\u2744", "\u5976\u86D9\u8584\u8377\u7CD6", "\u653B\u51FB\u95F4\u9694\u7F29\u77ED 15%\uFF0C\u5355\u53D1\u4F24\u5BB3\u964D\u4F4E 5%\uFF1B\u66F4\u5FEB\u89E6\u53D1\u8282\u62CD\u5F3A\u5316\u3002"],
  ["springteeth", "\u2197", "\u5976\u86D9\u56DE\u5F39\u7259\u5957", "\u58F0\u6CE2\u591A\u53CD\u5F39 1 \u6B21\uFF1B\u9996\u6B21\u53CD\u5F39\u540E\u4F24\u5BB3\u63D0\u5347 20%\u3002\u53EF\u53E0\u52A0\u6C60\u5858\u6CE1\u6CE1\u4E0E\u5976\u6CE1\u3002"],
  ["starbadge", "\u2606", "\u5976\u8C46\u661F\u661F\u8D34", "\u547D\u4E2D\u540E\u6807\u8BB0\u654C\u4EBA 2 \u79D2\uFF0C\u540E\u7EED\u58F0\u6CE2\u5BF9\u5B83\u589E\u4F24 20%\uFF1B\u7A7F\u900F\u4E0E\u56DE\u58F0\u4E5F\u80FD\u89E6\u53D1\u3002"],
  ["rattle", "\u266C", "\u5976\u86D9\u9707\u97F3\u94C3", "\u58F0\u6CE2\u63A8\u5F00\u666E\u901A\u654C\u4EBA\uFF0C\u540C\u4E00\u76EE\u6807\u6BCF 0.4 \u79D2\u89E6\u53D1\u4E00\u6B21\uFF1BBoss \u4E0D\u53D7\u5F71\u54CD\u3002"],
  ["sparebutton", "\u25C8", "\u8C46\u5305\u5907\u7528\u7EBD\u6263", "\u6BCF\u5C42\u4E00\u6B21\u62B5\u6321\u81F4\u547D\u4F24\uFF0C\u4FDD\u7559 1 \u70B9\u751F\u547D\u5E76\u83B7\u5F97 2 \u79D2\u65E0\u654C\uFF1B\u672C\u5C42\u4F7F\u7528\u540E\u4E0D\u4F1A\u91CD\u7F6E\u3002"],
  ["coinpouch", "\xA4", "\u5976\u9F20\u96F6\u94B1\u888B", "\u6301\u6709\u540E\u6BCF\u6E05\u5B8C 3 \u4E2A\u6218\u6597\u623F\u989D\u5916\u83B7\u5F97 2 \u91D1\u5E01\uFF1B\u56DE\u8BBF\u548C\u5B89\u5168\u623F\u4E0D\u8BA1\u6570\u3002"],
  ["papercup", "\u2301", "\u5976\u86D9\u4F20\u58F0\u7EB8\u676F", "\u58F0\u6CE2\u547D\u4E2D\u540E\u5411\u9644\u8FD1\u53E6\u4E00\u654C\u4EBA\u4F20\u9012 35% \u4F24\u5BB3\uFF1B\u6BCF\u675F\u53CA\u5176\u5206\u88C2\u5F39\u5171\u4EAB\u4E00\u6B21\u4F20\u58F0\uFF0C\u4E0D\u7A7F\u5899\u3002"],
  ["milkcap", "\u25D2", "\u5976\u86D9\u5976\u6CAB\u74F6\u76D6", "\u51FB\u6740\u654C\u4EBA\u540E\u7559\u4E0B 3 \u79D2\u53CB\u65B9\u5976\u8FF9\uFF0C\u6700\u591A\u4FDD\u7559 6 \u644A\uFF1B\u53EF\u642D\u914D\u5976\u8FF9\u6EE4\u82AF\u3002"],
  ["beatsticker", "\u266B", "\u5976\u8C46\u8282\u62CD\u8D34", "\u6BCF\u7B2C 4 \u6B21\u666E\u901A\u653B\u51FB\u53D8\u4E3A\u91CD\u62CD\u5F39\uFF0C\u589E\u4F24 85%\u3001\u5F39\u4F53\u53D8\u5927\uFF0C\u547D\u4E2D\u63A8\u5F00\u666E\u901A\u602A\uFF1B\u540C\u4E00\u76EE\u6807\u6BCF 0.4 \u79D2\u6700\u591A\u51FB\u9000\u4E00\u6B21\uFF0CBoss \u4E0D\u4F1A\u88AB\u51FB\u9000\u3002"],
  ["mending", "\u2307", "\u8C46\u5305\u7F1D\u8865\u7EBF", "\u6301\u6709\u540E\u7D2F\u8BA1\u9020\u6210 40 \u70B9\u6709\u6548\u4F24\u5BB3\uFF0C\u6062\u590D 1 \u70B9\u751F\u547D\uFF1B\u6BCF\u5C42\u6700\u591A\u6062\u590D 2 \u6B21\u3002"]
].map(([id, icon, name, desc]) => ({ id, icon, name, desc, short: desc }));
function gearDamage(g) {
  return (g.has("double") ? 0.7 : 1) * (g.has("mints") ? 0.95 : 1);
}
function gearInterval(g) {
  return g.has("mints") ? 0.85 : 1;
}
function prepareGearShot(g, start2, pet) {
  if (pet || g.bullets.length <= start2) return;
  const beat = g.has("beatsticker") && (g.beatShots = (g.beatShots || 0) + 1) % 4 === 0;
  for (const b of g.bullets.slice(start2)) {
    if (g.has("mints")) b.damage *= 0.95;
    if (g.has("springteeth")) b.bounce++;
    if (g.has("megaphone")) b.r += 2;
    b.chain = { left: g.has("papercup") ? 1 : 0 };
    if (beat) {
      empowerShot(b, 1.85);
      b.r += 4;
      b.beat = true;
    }
  }
}
function bouncedGear(g, b) {
  if (!b.pet && g.has("springteeth") && !b.reboundBoost) {
    b.damage *= 1.2;
    b.reboundBoost = true;
  }
}
function hitGear(g, e, b) {
  if (b.pet || e.airborne) return;
  if (g.has("starbadge") && !e.dead) e.starMark = 2;
  if ((g.has("rattle") || b.beat) && !e.dead && e.type !== "boss" && !(e.rattleCD > 0)) {
    const len = Math.hypot(b.vx || 0, b.vy || 0) || 1;
    e.vx = Math.max(-240, Math.min(240, e.vx + (b.vx || 0) / len * (b.beat ? 220 : 150)));
    e.vy = Math.max(-240, Math.min(240, e.vy + (b.vy || 0) / len * (b.beat ? 220 : 150)));
    e.rattleCD = 0.4;
  }
  if (b.chain?.left > 0) {
    const target2 = g.room.enemies.filter((m) => m !== e && !m.dead && !m.airborne && Math.hypot(m.x - e.x, m.y - e.y) <= 155 && shotLaneOpen(g.room, e, m)).sort((a, c) => Math.hypot(a.x - e.x, a.y - e.y) - Math.hypot(c.x - e.x, c.y - e.y))[0];
    if (target2) {
      b.chain.left--;
      g.damageEnemy(target2, b.damage * 0.35 * (g.has("starbadge") && target2.starMark > 0 ? 1.2 : 1));
      g.effects.push({ type: "voiceChain", x: e.x, y: e.y, tx: target2.x, ty: target2.y, life: 0.18, max: 0.18 });
    }
  }
}
function killedGear(g, e) {
  if (!g.has("milkcap")) return;
  const old = g.effects.filter((f) => f.capMilk);
  if (old.length >= 6) g.effects = g.effects.filter((f) => f !== old[0]);
  milkPool(g, e.x, e.y, true, 42, 3);
  g.effects.at(-1).capMilk = true;
}
function mendGear(g, damage) {
  if (!g.has("mending") || damage <= 0) return;
  if (g.mendFloor !== g.floor) {
    g.mendFloor = g.floor;
    g.mendUses = 0;
    g.mendDamage = 0;
  }
  if (g.mendUses >= 2) return;
  g.mendDamage = Math.min(40, (g.mendDamage || 0) + damage);
  if (g.mendDamage >= 40 && g.p.hp < g.p.maxHp && g.p.hp > 0) {
    g.mendDamage = 0;
    g.mendUses++;
    g.p.hp++;
    g.emit("heal");
  }
}
function saveWithButton(g) {
  if (!g.has("sparebutton") || g.buttonFloor === g.floor || g.p.hp !== 1 || g.p.inv > 0 || g.p.dash > 0 || g.p.shield) return false;
  g.buttonFloor = g.floor;
  g.p.inv = 2;
  g.emit("toast", { text: "\u8C46\u5305\u7684\u7EBD\u6263\u6321\u4F4F\u4E86\u81F4\u547D\u4F24\uFF01\u672C\u5C42\u5DF2\u4F7F\u7528\uFF0C\u83B7\u5F97 2 \u79D2\u65E0\u654C\u3002" });
  g.emit("shield");
  return true;
}
function clearGear(g, room) {
  if (g.has("coinpouch") && ["fight", "challenge", "boss", "vault", "cache"].includes(room.type)) {
    g.pouchClears = (g.pouchClears || 0) + 1;
    if (g.pouchClears % 3 === 0) {
      g.coins += 2;
      g.emit("toast", { text: "\u5976\u9F20\u96F6\u94B1\u888B\uFF1A\u6512\u4E0B 2 \u91D1\u5E01\u3002" });
    }
  }
}
function updateGear(g, dt) {
  for (const e of g.room.enemies) {
    e.starMark = Math.max(0, (e.starMark || 0) - dt);
    e.rattleCD = Math.max(0, (e.rattleCD || 0) - dt);
  }
}
function synergyText(g) {
  const combos = [["\u53CD\u5F39\u7559\u5976", ["milkfoam", "bubble"]], ["\u56DE\u5F39\u7559\u5976", ["milkfoam", "springteeth"]], ["\u5976\u6CAB\u589E\u4F24", ["milkcap", "milkfilter"]], ["\u5F80\u8FD4\u96C6\u706B", ["returnvoice", "starbadge"]], ["\u8D2F\u7A7F\u96C6\u706B", ["heavyvoice", "starbadge"]], ["\u5FEB\u653B\u5F3A\u62CD", ["mints", "beatsticker"]], ["\u6247\u5F62\u4F20\u58F0", ["fanvoice", "papercup"]], ["\u5206\u88C2\u4F20\u58F0", ["split", "papercup"]], ["\u516D\u675F\u6247\u7B11", ["fanvoice", "double"]], ["\u8FFD\u8E2A\u91CD\u5F39", ["heavyvoice", "homing"]], ["\u8F93\u51FA\u7F1D\u8865", ["mending", "returnvoice"]]];
  return combos.filter(([, ids]) => ids.every((id) => g.has(id))).map(([name]) => name).join(" \xB7 ") || "\u7EE7\u7EED\u6536\u96C6\u9053\u5177\uFF0C\u7EC4\u5408\u4E0D\u540C\u6548\u679C";
}

// dist/voice-builds.js
var VOICE_ITEMS = [
  { id: "fanvoice", icon: "\u224B", name: "\u5976\u86D9\u7684\u7B11\u5C94\u6C14", desc: "\u5927\u7B11\u53D8\u6210\u4E09\u675F\u6247\u5F62\u58F0\u6CE2\uFF1B\u4E2D\u592E\u675F\u4F24\u5BB3 115%\u3001\u4FDD\u7559\u6B63\u5E38\u5C04\u7A0B\uFF0C\u4E24\u4FA7\u8FD1\u7A0B\u675F\u5404 35%\uFF0C\u653B\u51FB\u95F4\u9694 +15%\u3002\u53EF\u4E0E\u53CC\u53D1\u3001\u5206\u88C2\u3001\u91CD\u578B\u7B11\u5F39\u53E0\u52A0\u3002", short: "\u4E2D\u592E\u8FDC\u5C04 \xB7 \u4E24\u4FA7\u8FD1\u7A0B \xB7 \u653B\u51FB\u7A0D\u6162" },
  { id: "heavyvoice", icon: "\u25CD", name: "\u5976\u86D9\u9F13\u816E\u9762\u7F69", desc: "\u58F0\u6CE2\u53D8\u4E3A\u6162\u901F\u5927\u578B\u7A7F\u900F\u7B11\u5F39\uFF1B\u4F24\u5BB3 \xD72.2\uFF0C\u653B\u51FB\u95F4\u9694 \xD71.8\u3002\u53EF\u4E0E\u6247\u5F62\u3001\u8FFD\u8E2A\u548C\u56DE\u58F0\u53E0\u52A0\u3002", short: "\u5927\u578B\u7A7F\u900F\u7B11\u5F39 \xB7 \u9AD8\u4F24\u6162\u5C04" },
  { id: "returnvoice", icon: "\u21B6", name: "\u5976\u86D9\u56DE\u58F0\u55D3", desc: "\u53BB\u7A0B\u58F0\u6CE2\u7559\u4E0B 2 \u79D2\u56DE\u58F0\u5370\u8BB0\uFF0C\u56DE\u7A0B\u518D\u547D\u4E2D\u65F6\u9707\u54CD\uFF1A\u5BF9\u5468\u56F4 72 \u8303\u56F4\u5185\u7684\u5176\u4ED6\u654C\u4EBA\u9020\u6210\u8BE5\u7B11\u5F39 50% \u7684\u6E85\u5C04\u4F24\u5BB3\uFF08\u4E0A\u9650 3\uFF09\uFF0C\u9707\u9000\u5468\u56F4\u666E\u901A\u602A\uFF0C\u4E2D\u5FC3\u76EE\u6807\u4E0D\u4F4D\u79FB\u3002\u5F80\u8FD4\u5404 65% \u4F24\u5BB3\uFF1B\u540C\u8F6E\u53CC\u53D1\u3001\u6247\u5F62\u548C\u5206\u88C2\u5171\u4EAB\u5370\u8BB0\uFF0C\u6BCF\u8F6E\u6700\u591A\u9707\u54CD 3 \u6B21\uFF0C\u6BCF\u4E2A\u654C\u4EBA\u6700\u591A\u53D7\u5230\u4E00\u6B21\u6E85\u5C04\uFF0C\u9707\u6CE2\u4E0D\u7A7F\u5899\u3002", short: "\u53BB\u7A0B\u6807\u8BB0 \xB7 \u56DE\u7A0B\u9707\u54CD \xB7 \u4E32\u8054\u654C\u7FA4" }
];
function voiceStats(g) {
  return { damage: (g.has("fanvoice") ? 1.15 : 1) * (g.has("heavyvoice") ? 2.2 : 1) * (g.has("returnvoice") ? 0.65 : 1), interval: (g.has("fanvoice") ? 1.15 : 1) * (g.has("heavyvoice") ? 1.8 : 1), shots: g.has("fanvoice") ? 3 : 1 };
}
function shapeVoice(g, start2) {
  const fan2 = g.has("fanvoice"), heavy = g.has("heavyvoice"), returning = g.has("returnvoice");
  if (!fan2 && !heavy && !returning) return;
  const stats = voiceStats(g), original = g.bullets.splice(start2), echo = returning ? { outbound: /* @__PURE__ */ new Map(), detonated: /* @__PURE__ */ new Set(), splashed: /* @__PURE__ */ new Set() } : void 0;
  for (const bullet2 of original) for (const offset of fan2 ? [-0.28, 0, 0.28] : [0]) {
    const a = Math.atan2(bullet2.vy, bullet2.vx) + offset, speed = heavy ? 270 : 490;
    const side = fan2 && offset !== 0;
    const rangeLife = side ? 0.42 * (g.has("megaphone") ? 1.4 : 1) * (g.has("tongue") ? 1.3 : 1) : bullet2.life;
    const travelScale = 490 / speed, life = rangeLife * travelScale;
    g.bullets.push({ ...bullet2, echo, chain: bullet2.chain ? { ...bullet2.chain } : void 0, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, shotSpeed: speed, damage: bullet2.damage * stats.damage * (side ? 0.35 / 1.15 : 1), r: heavy ? bullet2.r + 7 : bullet2.r, life: returning ? life + travelScale : life, pierce: heavy || returning || bullet2.pierce, hits: /* @__PURE__ */ new Set(), voice: true, heavy, returnVoice: returning, age: 0, returnAfter: Math.min(0.65, rangeLife * 0.65) * travelScale, returned: false, returning: false });
  }
}
function hitVoice(g, e, b) {
  if (!b.returnVoice || b.pet || e.airborne || !b.echo) return;
  const group = b.echo;
  if (!b.returning) {
    if (!e.dead && !group.detonated.has(e)) {
      const until = g.elapsed + 2;
      group.outbound.set(e, until);
      e.echoUntil = Math.max(e.echoUntil || 0, until);
    }
    return;
  }
  if (!(group.outbound.get(e) > g.elapsed) || group.detonated.has(e) || group.detonated.size >= 3) return;
  group.detonated.add(e);
  e.echoUntil = 0;
  g.effects.push({ type: "echoPulse", x: e.x, y: e.y, radius: 72, life: 0.36, max: 0.36 });
  for (const target2 of [...g.room.enemies]) {
    if (target2.dead || target2.airborne || Math.hypot(target2.x - e.x, target2.y - e.y) > 72 + target2.r || !shotLaneOpen(g.room, e, target2)) continue;
    if (target2 !== e) {
      if (group.splashed.has(target2)) continue;
      group.splashed.add(target2);
      g.damageEnemy(target2, Math.min(3, b.damage * 0.5), false);
    }
    if (target2 !== e && !target2.dead && target2.type !== "boss") {
      const a = Math.atan2(target2.y - e.y, target2.x - e.x);
      target2.vx = Math.cos(a) * 160;
      target2.vy = Math.sin(a) * 160;
      target2.repelled = 0.16;
    }
  }
}
function updateVoice(g, b, dt) {
  if (!b.returnVoice || b.pet) return;
  b.age = (b.age || 0) + dt;
  if (!b.returned && b.age >= b.returnAfter) {
    b.returned = true;
    b.returning = true;
    b.hits.clear();
  }
  if (b.returning) {
    const dx = g.p.x - b.x, dy = g.p.y - 6 - b.y, len = Math.hypot(dx, dy);
    if (len < g.p.r) {
      b.life = 0;
      return;
    }
    const speed = b.shotSpeed || 490;
    b.vx = dx / len * speed;
    b.vy = dy / len * speed;
  }
}

// dist/player-damage.js
function playerAttackDamage(g) {
  return g.p.damage * deepStats(g).damage * memeDamage(g) * voiceStats(g).damage * gearDamage(g) * (g.has("scarf") ? g.p.hp <= 2 ? 1.7 : 1.1 : 1) * (g.has("milkfilter") ? onMilk(g, g.p) ? 1.4 : 1.08 : 1);
}

// dist/phoebe-items.js
var PHOEBE_ITEMS = [
  { id: "phoebe", name: "\u83F2\u6BD4\u557E\u6BD4", desc: "\u7535\u5DE5\u83F2\u6BD4\u5976\u4F34\uFF1A\u62B1\u7EBF\u76D8\u8DDF\u968F\uFF0C\u84C4\u52BF\u540E\u7529\u51FA\u63D2\u5934\uFF0C\u7535\u7EBF\u5C55\u5F00\u63A5\u901A\u540E\u624D\u4F1A\u4F24\u654C\u3002\u5E03\u7EBF\u51B7\u5374 3.2 \u79D2\uFF0C\u6700\u957F\u94FA\u7EBF 320\uFF0C\u7535\u7EBF\u5728\u5F53\u524D\u623F\u95F4\u6301\u7EED\u5B58\u5728\uFF0C\u6301\u6709\u83F2\u6BD4\u65F6\u6240\u6709\u7535\u7EBF\u5171\u7528\u4E09\u6761\u4E0A\u9650\uFF0C\u65B0\u7EBF\u66FF\u6362\u6700\u65E9\u7684\u65E7\u7EBF\uFF1B\u6301\u6709\u83F2\u6BD4\u65F6\uFF0C\u5979\u7684\u7EBF\u8DEF\u6BCF 0.4 \u79D2\u9020\u6210 0.9 + \u5F53\u524D\u9762\u677F\u653B\u51FB\u7684 60% \u4F24\u5BB3\uFF08\u6BCF\u6B21\u4E0A\u9650 3.2\uFF09\uFF0C\u5DF2\u94FA\u7535\u7EBF\u968F\u5C5E\u6027\u5B9E\u65F6\u66F4\u65B0\uFF0C\u86D9\u8DF3\u7535\u7EBF\u4F24\u5BB3\u989D\u5916\u63D0\u9AD8 20%\u3002", short: "\u7535\u5DE5\u8DDF\u73ED \xB7 \u7529\u63D2\u5934\u5E03\u7EBF \xB7 \u63A7\u5236\u8FFD\u51FB\u8DEF\u7EBF" },
  { id: "phoebewire", name: "\u62C9\u7535\u7EBF\u54C8\u54C8", desc: "\u86D9\u8DF3\u6CBF\u5B9E\u9645\u79FB\u52A8\u8DEF\u7EBF\u94FA\u8BBE\u7535\u7EBF\uFF0C\u843D\u5730\u540E\u901A\u7535\uFF0C\u5728\u5F53\u524D\u623F\u95F4\u6301\u7EED\u5B58\u5728\uFF0C\u6700\u591A\u4FDD\u7559 2 \u6761\uFF0C\u65B0\u7EBF\u66FF\u6362\u6700\u65E9\u7684\u65E7\u7EBF\uFF0C\u6362\u623F\u6E05\u7A7A\u3002\u7535\u7EBF\u52A0\u5BBD\uFF0C\u8E29\u7EBF\u7684\u5730\u9762\u654C\u4EBA\u6BCF 0.4 \u79D2\u53D7\u5230 1.4 + \u5F53\u524D\u9762\u677F\u653B\u51FB\u7684 60% \u4F24\u5BB3\uFF0C\u65E0\u56FA\u5B9A\u4F24\u5BB3\u4E0A\u9650\uFF1B\u5DF2\u94FA\u7535\u7EBF\u5B9E\u65F6\u7EE7\u627F\u653B\u51FB\u5C5E\u6027\u4E0E\u4E34\u65F6\u589E\u4F24\uFF0C\u653B\u901F\u4E0D\u6539\u53D8\u7ED3\u7B97\u95F4\u9694\uFF0C\u4E0D\u89E6\u53D1\u666E\u901A\u5C04\u51FB\u7684\u5355\u6B21\u5F3A\u5316\uFF1B\u591A\u6761\u7EBF\u4E0D\u53E0\u4F24\uFF0C\u4E0D\u7A7F\u5899\uFF1B\u6301\u6709\u83F2\u6BD4\u65F6\u603B\u4E0A\u9650\u589E\u81F3 3 \u6761\uFF0C\u86D9\u8DF3\u7535\u7EBF\u4F24\u5BB3\u989D\u5916\u63D0\u9AD8 20%\u3002", short: "\u86D9\u8DF3\u5E03\u7EBF \xB7 \u5F15\u602A\u8E29\u7EBF \xB7 \u6700\u591A\u4E24\u6761" },
  { id: "phoebesoot", name: "\u7535\u7126\u4E86\u54C8\u54C8", desc: "\u6BCF\u4E2A\u6218\u6597\u623F\u62B5\u6321\u4E00\u6B21\u5730\u9762\u4F24\u5BB3\uFF0C\u5192\u70DF\u4F46\u4E0D\u6263\u8840\uFF0C\u5E76\u83B7\u5F97 0.8 \u79D2\u65E0\u654C\u30011.5 \u79D2\u79FB\u901F +20%\u3002\u4E0D\u62B5\u6321\u5B50\u5F39\u6216\u78B0\u649E\uFF1B\u56DE\u8BBF\u4E0D\u91CD\u7F6E\u3002\u96E8\u9774\u53EF\u7528\u65F6\u5148\u6D88\u8017\u96E8\u9774\u3002", short: "\u6BCF\u623F\u4E00\u6B21\u5730\u9762\u9632\u62A4 \xB7 \u7535\u7126\u52A0\u901F\u9003\u79BB" },
  { id: "phoebeplug", name: "\u63A5\u6839\u5927\u7684\u54C8\u54C8", desc: "\u666E\u901A\u58F0\u6CE2\u5F39\u901F +15%\u3001\u5C04\u7A0B\u7EA6 +20%\uFF1B\u4E0E\u62C9\u7535\u7EBF\u642D\u914D\u65F6\uFF0C\u7535\u7EBF\u6709\u6548\u5BBD\u5EA6\u589E\u52A0\u3002\u4E0D\u589E\u52A0\u58F0\u6CE2\u4F24\u5BB3\uFF0C\u8DDF\u73ED\u5F39\u4E0D\u53D7\u5F71\u54CD\u3002", short: "\u66F4\u5FEB\u66F4\u8FDC\u7684\u7B11\u5F39 \xB7 \u52A0\u5BBD\u7535\u7EBF" }
].map((i) => ({ ...i, icon: "\u2726" }));
var combat2 = (g) => itemCombatEncounter(g.room);
function resetPhoebe(g) {
  g.phoebe = null;
  g.phoebeWires = [];
  g.phoebeTrace = null;
  g.phoebeWasDash = false;
  g.phoebeBoost = 0;
}
function clearPhoebe(g) {
  g.phoebeTrace = null;
  g.phoebeWasDash = false;
}
function preparePhoebeShot(g, start2, pet) {
  if (pet || !g.has("phoebeplug")) return;
  for (const b of g.bullets.slice(start2)) {
    b.vx *= 1.15;
    b.vy *= 1.15;
    b.shotSpeed = (b.shotSpeed || 490) * 1.15;
    b.life *= 1.2 / 1.15;
    if (b.returnVoice) b.returnAfter *= 1.2 / 1.15;
    b.phoebePlug = true;
  }
}
function guardPhoebe(g) {
  if (!g.has("phoebesoot") || !combat2(g) || g.room.phoebeSootUsed || g.p.inv > 0 || g.p.dash > 0) return false;
  g.room.phoebeSootUsed = true;
  g.emit("itemVoice", { key: "phoebesoot" });
  g.p.inv = 0.8;
  g.phoebeBoost = 1.5;
  g.effects.push({ type: "phoebeSoot", x: g.p.x, y: g.p.y, life: 0.8, max: 0.8 });
  g.emit("toast", { text: "\u7535\u7126\u4E86\u54C8\u54C8\uFF01\u672C\u623F\u5730\u9762\u9632\u62A4\u5DF2\u7528\uFF0C\u5FEB\u8DD1\uFF01" });
  return true;
}
function nearest(a, b, p) {
  const dx = b.x - a.x, dy = b.y - a.y, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return { x: a.x + dx * t, y: a.y + dy * t };
}
function wireDamageAt(g, e) {
  if (e.dead || e.airborne || ["fly", "hopper"].includes(e.type)) return 0;
  let damage = 0;
  for (const w of g.phoebeWires || []) {
    if (w.until <= g.elapsed) continue;
    for (let i = 1; i < w.points.length; i++) {
      const q = nearest(w.points[i - 1], w.points[i], e);
      if (Math.hypot(q.x - e.x, q.y - e.y) <= e.r + w.width && shotLaneOpen(g.room, q, e)) {
        damage = Math.max(damage, w.damage ?? companionWireDamage(g));
        break;
      }
    }
  }
  return damage;
}
function touchesPhoebeWire(g, e) {
  return wireDamageAt(g, e) > 0;
}
function companionWireDamage(g) {
  return Math.min(3.2, 0.9 + playerAttackDamage(g) * 0.6);
}
function playerWireDamage(g) {
  return (1.4 + playerAttackDamage(g) * 0.6) * (g.has("phoebe") ? 1.2 : 1);
}
function updateWires(g, origin) {
  g.phoebeWires = (g.phoebeWires || []).filter((w) => w.until > g.elapsed);
  const dash = g.p.dash > 0;
  if (g.has("phoebewire") && combat2(g)) {
    if (dash && !g.phoebeWasDash) g.phoebeTrace = [{ x: origin.x, y: origin.y }];
    if (g.phoebeTrace && (dash || g.phoebeWasDash)) {
      const points = g.phoebeTrace, last2 = points.at(-1), p = { x: g.p.x, y: g.p.y };
      if (Math.hypot(p.x - last2.x, p.y - last2.y) >= 5 && shotLaneOpen(g.room, last2, p)) points.push(p);
      if (points.length > 28) points.shift();
    }
    if (!dash && g.phoebeWasDash && g.phoebeTrace) {
      const points = g.phoebeTrace, length2 = points.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - points[i].x, p.y - points[i].y), 0);
      if (length2 >= 24) {
        g.emit("itemVoice", { key: "phoebe" });
        g.phoebeWires.push({ points, until: Infinity, width: g.has("phoebeplug") ? 14 : 9, source: "player", damage: playerWireDamage(g) });
        g.phoebeWires = g.phoebeWires.slice(-(g.has("phoebe") ? 3 : 2));
      }
      g.phoebeTrace = null;
    }
  }
  g.phoebeWasDash = dash;
  for (const w of g.phoebeWires) {
    if (w.source === "player") w.damage = playerWireDamage(g);
    else if (w.source === "phoebe") w.damage = companionWireDamage(g);
  }
  for (const e of [...g.room.enemies]) if (!(e.phoebeWireUntil > g.elapsed) && touchesPhoebeWire(g, e)) {
    e.phoebeWireUntil = g.elapsed + 0.4;
    g.damageEnemy(e, wireDamageAt(g, e), false);
    wireItemVfx(g, e);
  }
}
function updatePhoebe(g, dt, playerDt, origin) {
  g.phoebeBoost = Math.max(0, (g.phoebeBoost || 0) - playerDt);
  updateWires(g, origin);
  if (!g.has("phoebe")) return;
  const home = { x: Math.max(70, Math.min(890, g.p.x + 70)), y: Math.max(75, Math.min(525, g.p.y + 48)) }, s = g.phoebe ??= { ...safeSpot(g.room, home.x, home.y, 10), r: 10, type: "pet", phase: "idle", t: 0, cd: 0.6, face: 1 };
  s.t += dt;
  s.cd = Math.max(0, s.cd - dt);
  if (s.phase === "idle") {
    const d = Math.hypot(s.x - home.x, s.y - home.y), v = steer(g.room, s, home), x = s.x, y = s.y;
    s.x += v.x * Math.min(d, 260 * dt);
    s.y += v.y * Math.min(d, 260 * dt);
    moveOnTerrain(g.room, s, x, y);
    s.moving = Math.hypot(s.x - x, s.y - y) > 0.1;
    const e = g.room.enemies.filter((e2) => !e2.dead && !e2.airborne && !["fly", "hopper"].includes(e2.type) && Math.hypot(e2.x - s.x, e2.y - s.y) < 400 && shotLaneOpen(g.room, s, e2)).sort((a, b) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y))[0];
    if (e && s.cd <= 0) {
      s.target = e;
      s.face = e.x >= s.x ? 1 : -1;
      s.phase = "windup";
      s.t = 0;
    }
  } else if (s.phase === "windup" && s.t >= 0.35) {
    const e = s.target;
    s.t = 0;
    if (!e || e.dead || e.airborne || !shotLaneOpen(g.room, s, e)) {
      s.phase = "recover";
      s.cd = 0.5;
      return;
    }
    const from = { x: s.x + s.face * 22, y: s.y }, dx = e.x - from.x, dy = e.y - from.y, d = Math.hypot(dx, dy) || 1;
    const to = { x: from.x + dx * Math.min(1, 320 / d), y: from.y + dy * Math.min(1, 320 / d) };
    if (d < 24 || !shotLaneOpen(g.room, from, to)) {
      s.phase = "recover";
      s.cd = 0.5;
      return;
    }
    s.cable = { from, to };
    s.phase = "unroll";
  } else if (s.phase === "unroll" && s.t >= 0.4) {
    const { from, to } = s.cable;
    if (combat2(g) && shotLaneOpen(g.room, from, to)) {
      g.emit("itemVoice", { key: "phoebe" });
      g.phoebeWires.push({ points: [from, to], until: Infinity, source: "phoebe", damage: companionWireDamage(g), width: g.has("phoebeplug") ? 11 : 7 });
      g.phoebeWires = g.phoebeWires.slice(-(g.has("phoebe") ? 3 : 2));
      g.effects.push({ type: "petMuzzle", x: to.x, y: to.y, life: 0.18, max: 0.18, radius: 12 });
    }
    s.phase = "recover";
    s.cd = 3.2;
    s.t = 0;
    s.cable = null;
  } else if (s.phase === "recover" && s.t >= 0.25) {
    s.phase = "idle";
    s.t = 0;
  }
}
function phoebeCombos(g) {
  return [["\u901A\u7535\u557E\u6BD4", ["phoebe", "phoebewire"]], ["\u63A5\u6839\u5927\u7684", ["phoebewire", "phoebeplug"]], ["\u7535\u5DE5\u9003\u751F", ["phoebewire", "phoebesoot"]]].filter(([, ids]) => ids.every((id) => g.has(id))).map(([name]) => name);
}

// dist/gojo-fusion.js
var GOJO = { cooldown: 8, redDamage: 6, blueDamage: 4, purpleDamage: BOMB_DAMAGE * 2, radius: 130, warning: 0.85, redRange: 210 };
var distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function touchOrb(g, orb2, kind, dt) {
  for (const e of [...g.room.enemies]) {
    if (e.dead || e.airborne || !shotLaneOpen(g.room, orb2, e)) continue;
    const d = distance(e, orb2);
    if (kind === "blue" && d > 12 && d < 95 && e.type !== "boss" && !["fly", "hopper"].includes(e.type)) {
      const x = e.x, y = e.y, step = Math.min(d - 12, 100 * dt);
      e.x += (orb2.x - x) / d * step;
      e.y += (orb2.y - y) / d * step;
      moveOnTerrain(g.room, e, x, y);
    }
    if (d > e.r + 14 || orb2.hits.has(e)) continue;
    orb2.hits.add(e);
    g.damageEnemy(e, kind === "red" ? GOJO.redDamage : GOJO.blueDamage, false);
    if (kind === "red" && e.type !== "boss") {
      const dx = e.x - orb2.x, dy = e.y - orb2.y, n = Math.hypot(dx, dy) || 1;
      e.vx = dx / n * 190;
      e.vy = dy / n * 190;
      e.repelled = 0.16;
    }
    g.effects.push({ type: "petImpact", x: e.x, y: e.y, life: 0.16, max: 0.16, radius: 18 });
  }
}
function detonate(g, s) {
  const p = s.purple;
  g.effects.push({ type: "gojoBlast", x: p.x, y: p.y, radius: GOJO.radius, life: 0.55, max: 0.55 });
  for (const e of [...g.room.enemies]) if (!e.dead && !e.airborne && distance(e, p) <= GOJO.radius + e.r) g.damageEnemy(e, GOJO.purpleDamage, false);
  blastResourceDoors(g, p.x, p.y, GOJO.radius);
  blastDevices(g, p.x, p.y, GOJO.radius);
  blastTerrain(g, p.x, p.y, GOJO.radius);
  g.effects = g.effects.filter((f) => f.type !== "milkPool" || distance(f, p) > GOJO.radius + f.radius);
  if (distance(g.p, p) <= GOJO.radius + g.p.r) g.hurt();
  g.emit("gojoBlast");
  s.phase = "spent";
  s.left = 0.35;
  s.purple = null;
  g.emit("room");
}
function updateGojoFusion(g, dt, origin) {
  const dash = g.p.dash > 0, started = dash && !g.chronoDash, landed = !dash && g.chronoDash, clock = g.actionClock || 0;
  g.chronoDash = dash;
  if (started && g.has("gojohalf") && itemCombatActive(g.room) && !(g.gojoReadyAt > clock)) {
    g.gojoReadyAt = clock + GOJO.cooldown;
    g.gojo = { version: 2, x: origin.x, y: origin.y, face: g.p.face, left: 6, phase: "takeoff", t: 0, feet: null, red: null, blue: null, purple: null };
    g.emit("gojoSplit");
  }
  const s = g.gojo;
  if (!s) return;
  if (s.version !== 2 || !itemCombatActive(g.room) || !g.has("gojohalf")) {
    g.gojo = null;
    return;
  }
  s.left -= dt;
  s.t += dt;
  if (s.left <= 0) {
    g.gojo = null;
    return;
  }
  if (s.phase === "takeoff") {
    if (landed) {
      s.feet = { x: g.p.x, y: g.p.y, face: g.p.face };
      s.phase = "redWindup";
      s.t = 0;
    }
    return;
  }
  if (s.phase === "redWindup" && s.t >= 0.2) {
    const angle = g.random() * Math.PI * 2;
    s.red = { x: s.feet.x, y: s.feet.y - 10, dx: Math.cos(angle), dy: Math.sin(angle), travel: 0, hits: /* @__PURE__ */ new Set() };
    s.phase = "redFlight";
    s.t = 0;
  }
  if (s.phase === "redHold" || s.phase === "blueFlight") touchOrb(g, s.red, "red", dt);
  if (s.phase === "redFlight") {
    const r = s.red, step = Math.min(330 * dt, GOJO.redRange - r.travel), next = { x: r.x + r.dx * step, y: r.y + r.dy * step };
    const blocked2 = next.x < 62 || next.x > 898 || next.y < 62 || next.y > 538 || !shotLaneOpen(g.room, r, next);
    if (!blocked2) {
      r.x = next.x;
      r.y = next.y;
      r.travel += step;
    }
    touchOrb(g, r, "red", dt);
    if (blocked2 || r.travel >= GOJO.redRange - 0.01) {
      s.phase = "redHold";
      s.t = 0;
    }
  } else if (s.phase === "redHold" && s.t >= 0.25) {
    s.blue = { x: s.x, y: s.y - 14, hits: /* @__PURE__ */ new Set() };
    s.phase = "blueFlight";
    s.t = 0;
  } else if (s.phase === "blueFlight") {
    const b = s.blue, r = s.red, d = distance(b, r), step = Math.min(d, 520 * dt);
    if (d > 0) {
      b.x += (r.x - b.x) / d * step;
      b.y += (r.y - b.y) / d * step;
    }
    touchOrb(g, b, "blue", dt);
    if (distance(b, r) <= 24) {
      s.purple = { x: r.x, y: r.y, t: 0 };
      s.red = null;
      s.blue = null;
      s.phase = "fusion";
      s.t = 0;
      g.emit("gojoFuse");
    }
  } else if (s.phase === "fusion") {
    s.purple.t += dt;
    if (s.purple.t >= GOJO.warning) detonate(g, s);
  }
}

// dist/chrono-items.js
var CHRONO_ITEMS = [
  { id: "gojohalf", icon: "\u2726", name: "\u4E8C\u70B9\u4E94\u6761\u609F", desc: "\u86D9\u8DF3\u5728\u8D77\u8DF3\u70B9\u7559\u4E0B\u4E0A\u534A\u8EAB\u3001\u843D\u5730\u70B9\u7559\u4E0B\u4E0B\u534A\u8EAB\u3002\u4E0B\u534A\u8EAB\u5148\u5411\u968F\u673A\u65B9\u5411\u53D1\u5C04\u8D6B\uFF086 \u70B9\u4F24\u5BB3\uFF09\uFF0C\u8D6B\u98DE\u51FA\u540E\u505C\u4F4F\uFF0C\u63A5\u89E6\u4ECD\u53EF\u4F24\u654C\uFF1B\u4E0A\u534A\u8EAB\u968F\u540E\u53D1\u5C04\u82CD\uFF084 \u70B9\u4F24\u5BB3\uFF09\u8FFD\u5411\u8D6B\u5E76\u8F7B\u5FAE\u5438\u9644\u666E\u901A\u602A\u3002\u82CD\u8D6B\u6BCF\u4E2A\u654C\u4EBA\u5404\u547D\u4E2D\u4E00\u6B21\uFF0C\u78B0\u649E\u5408\u6210\u8308\uFF0C\u9884\u8B66 0.85 \u79D2\u540E\u5728 130 \u8303\u56F4\u5185\u7206\u70B8\uFF0C\u4E0D\u53D7\u63A9\u4F53\u906E\u6321\uFF0C\u80FD\u70B8\u788E\u7BB1\u5B50\u548C\u5CA9\u77F3\u5E76\u89E6\u53D1\u7206\u70B8\u673A\u5173\u3002\u9020\u6210\u666E\u901A\u70B8\u5F39\u4E24\u500D\u7684 40 \u70B9\u4F24\u5BB3\uFF0C\u4E5F\u4F1A\u5BF9\u5976\u86D9\u9020\u6210 1 \u683C\u81EA\u4F24\uFF0C\u53EF\u7528\u86D9\u8DF3\u65E0\u654C\u5E27\u8EB2\u907F\u3002\u51B7\u5374 8 \u79D2\uFF0C\u6362\u623F\u6E05\u9664\u3002", short: "\u968F\u673A\u8D6B \u2192 \u82CD\u8FFD\u51FB \u2192 \u8308\u7206\u70B8 40 \u4F24\u5BB3 \xB7 \u53EF\u7834\u969C \xB7 \u6CE8\u610F\u81EA\u4F24" },
  { id: "sandevistan", icon: "\u03DF", name: "\u65AF\u5B89\u5A01\u65AF\u5766", desc: "\u6BCF\u4E2A\u672A\u6E05\u7406\u6218\u6597\u623F\u9996\u6B21\u5B9E\u9645\u53D7\u4F24\u540E\uFF0C\u8FDB\u5165 3 \u79D2\u8D85\u901F\uFF1A\u77ED\u6682\u505C\u987F\u540E\u4E16\u754C\u7EA6\u4EE5 18% \u901F\u5EA6\u8FD0\u884C\uFF0C\u81EA\u8EAB\u79FB\u901F +35%\uFF1B\u524D 2 \u79D2\u653B\u901F\u63D0\u5347\u81F3 3 \u500D\uFF08\u8D85\u9891\u95F4\u9694\u4E0B\u9650 0.055 \u79D2\uFF0C\u539F\u672C\u66F4\u5FEB\u5219\u4E0D\u964D\u901F\uFF09\uFF0C\u6700\u540E 1 \u79D2\u653B\u51FB\u95F4\u9694 -20%\uFF0C\u671F\u95F4\u4E0D\u518D\u53D7\u4F24\u3002\u89E6\u53D1\u7684\u90A3\u6B21\u4F24\u5BB3\u4ECD\u6263\u8840\uFF0C\u81F4\u547D\u4F24\u4E0D\u89E6\u53D1\u3002", short: "\u53D7\u51FB\u8D85\u901F 3 \u79D2 \xB7 \u524D 2 \u79D2\u4E09\u500D\u653B\u901F \xB7 \u6BCF\u6218\u6597\u623F\u4E00\u6B21" }
];
var sandyActive = (g) => (g.sandy?.left || 0) > 0;
var sandyBurst = (g) => sandyActive(g) && g.sandy.age < 2;
var chronoAttackInterval = (g, base) => sandyBurst(g) ? Math.max(Math.min(base, 0.055), base / 3) : base * (sandyActive(g) ? 0.8 : 1);
function resetChronoRoom(g) {
  g.sandy = null;
  g.sandyTrails = [];
  g.gojo = null;
  g.chronoDash = false;
}
function triggerSandy(g) {
  if (!g.has("sandevistan") || !itemCombatActive(g.room) || g.room.sandyUsed || g.p.hp <= 0 || g.mode !== "play") return false;
  g.room.sandyUsed = true;
  g.sandy = { left: 3, age: 0, origin: { x: g.p.x, y: g.p.y, face: g.p.face }, sample: 0 };
  g.sandyTrails = [];
  g.p.shot = Math.min(g.p.shot, g.attackInterval?.() ?? g.p.rate / 3);
  g.emit("sandyStart");
  return true;
}
function chronoStep(g, dt) {
  if (!(dt > 0)) return 1;
  g.actionClock = (g.actionClock || 0) + dt;
  g.sandyTrails = (g.sandyTrails || []).filter((s2) => (s2.age += dt) < 0.8);
  if (!sandyActive(g)) return 1;
  const s = g.sandy, activeDt = Math.min(dt, s.left);
  s.left = Math.max(0, s.left - dt);
  s.age += activeDt;
  if (s.left === 0) g.emit("sandyEnd");
  const scale = s.age < 0.12 ? 0.03 : s.left < 0.3 ? 0.18 + 0.82 * (1 - s.left / 0.3) : 0.18;
  return (activeDt * scale + (dt - activeDt)) / dt;
}
function afterChronoStep(g, dt, origin) {
  const clock = g.actionClock || 0;
  if (sandyActive(g)) {
    const s = g.sandy;
    s.sample -= dt;
    const last2 = g.sandyTrails?.at(-1);
    if (s.sample <= 0 && (!last2 || Math.hypot(g.p.x - last2.x, g.p.y - last2.y) > 6)) {
      s.sample = 0.045;
      g.sandyTrails.push({ x: g.p.x, y: g.p.y, face: g.p.face, frame: g.p.dash > 0 ? 13 : 4 + Math.floor(clock * 12) % 4, age: 0 });
      g.sandyTrails = g.sandyTrails.slice(-18);
    }
  }
  updateGojoFusion(g, dt, origin);
}

// dist/rescue.js
var RESCUE_GOAL = 24;
function startRescue(g) {
  if (g.rescue) return;
  g.mode = "rescue";
  g.bullets = [];
  g.enemyBullets = [];
  g.effects = [];
  g.explosives = [];
  g.pickup = null;
  g.rescue = { phase: "caged", t: 0, presses: 0, goal: RESCUE_GOAL, pulse: 0, cooldown: 0, phaseTime: 0 };
  g.emit("rescue");
}
function rescueLaugh(g) {
  const r = g.rescue;
  if (g.mode !== "rescue" || !r || r.phase !== "caged" || r.cooldown > 0) return false;
  r.presses = Math.min(r.goal, r.presses + 1);
  r.pulse = 1;
  r.cooldown = 0.075;
  g.emit("rescueLaugh", { progress: r.presses / r.goal });
  if (r.presses === r.goal) {
    r.phase = "breaking";
    r.phaseTime = 0;
    g.emit("cageBreak");
  }
  return true;
}
function updateRescue(g, dt) {
  if (g.mode !== "rescue" || !g.rescue) return;
  const r = g.rescue;
  dt = Math.max(0, Math.min(0.04, dt));
  r.t += dt;
  r.phaseTime += dt;
  r.cooldown = Math.max(0, r.cooldown - dt);
  r.pulse = Math.max(0, r.pulse - dt * 3);
  if (r.phase === "breaking" && r.phaseTime >= 1.6) {
    r.phase = "reunion";
    r.phaseTime = 0;
    g.emit("reunion");
  } else if (r.phase === "reunion" && r.phaseTime >= 3.5) {
    r.phase = "complete";
    g.mode = "win";
    g.emit("end", { win: true });
  }
}
function isRescueKey(e) {
  return !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey && !["Shift", "Control", "Alt", "Meta", "Tab", "Escape", "CapsLock", "F1", "F5", "F11", "F12"].includes(e.key) && e.key.toLowerCase() !== "p";
}

// dist/shop-services.js
var SERVICES = [
  { id: "service_reroll", icon: "\u21BB", name: "\u5237\u65B0\u9053\u5177 \xB7 4 \u91D1\u5E01", desc: "\u66FF\u6362\u5546\u5E97\u5269\u4F59\u7684\u88AB\u52A8\u9053\u5177\uFF0C\u6BCF\u5C42\u9650 2 \u6B21", cost: 4, limit: 2 },
  { id: "service_shield", icon: "\u25C8", name: "\u4E00\u6B21\u6027\u62A4\u76FE \xB7 5 \u91D1\u5E01", desc: "\u62B5\u6321\u4E0B\u4E00\u6B21\u4F24\u5BB3\uFF0C\u6BCF\u5C42\u9650 1 \u6B21\uFF1B\u5DF2\u6709\u62A4\u76FE\u65F6\u4E0D\u53EF\u4E70", cost: 5, limit: 1 },
  { id: "service_charge", icon: "\u03DF", name: "\u7206\u7B11\u5145\u80FD \xB7 4 \u91D1\u5E01", desc: "\u8865\u6EE1 Q \u4E3B\u52A8\u7206\u7B11\uFF0C\u6BCF\u5C42\u9650 1 \u6B21\uFF1B\u5DF2\u6EE1\u65F6\u4E0D\u53EF\u4E70", cost: 4, limit: 1 },
  { id: "service_map", icon: "\u2318", name: "\u9690\u85CF\u623F\u95F4\u60C5\u62A5 \xB7 3 \u91D1\u5E01", desc: "\u76F4\u63A5\u6807\u8BB0\u672C\u5C42\u771F\u85CF\u5BA4\uFF0C\u7701\u53BB\u8FA8\u8BA4\u771F\u5047\u5899\u7F1D\uFF1B\u4ECD\u9700\u70B8\u5899\uFF0C\u5956\u52B1\u53EF\u80FD\u4E3A\u7A7A\uFF0C\u6BCF\u5C42\u9650 1 \u6B21", cost: 3, limit: 1 }
];
function shopServices(g) {
  return SERVICES.filter((s) => (g.room.serviceUses?.[s.id] || 0) < s.limit).map((s) => ({ ...s, desc: s.desc + " \xB7 \u5269\u4F59 " + (s.limit - (g.room.serviceUses?.[s.id] || 0)) + " \u6B21" }));
}
function chooseService(g, id) {
  const s = SERVICES.find((s2) => s2.id === id);
  if (!s) return null;
  if (g.room.type !== "shop" || g.mode !== "choice" || !g.choices.some((c) => c.id === id)) return false;
  const used = g.room.serviceUses?.[id] || 0;
  if (used >= s.limit) return false;
  const refuse = (text) => {
    g.emit("toast", { text });
    return false;
  };
  if (g.coins < s.cost) return refuse("\u91D1\u5E01\u4E0D\u8DB3\uFF0C\u9700\u8981 " + s.cost + " \u91D1\u5E01\u3002");
  if (id === "service_shield" && g.p.shield) return refuse("\u5DF2\u6709\u62A4\u76FE\uFF0C\u65E0\u6CD5\u91CD\u590D\u8D2D\u4E70\u3002");
  if (id === "service_charge" && g.activeCharge >= g.activeCost()) return refuse("\u7206\u7B11\u5DF2\u7ECF\u5145\u6EE1\uFF0C\u4E0D\u9700\u8981\u8D2D\u4E70\u3002");
  if (id === "service_map" && !g.rooms.some((r) => r.exists && r.type === "cache" && !r.revealed && !r.visited)) return refuse("\u672C\u5C42\u9690\u85CF\u85CF\u5BA4\u5DF2\u7ECF\u53D1\u73B0\uFF0C\u4E0D\u9700\u8981\u8D2D\u4E70\u60C5\u62A5\u3002");
  let stock;
  if (id === "service_reroll") {
    if (!g.room.shopStock?.length) return refuse("\u9053\u5177\u5DF2\u552E\u7F44\uFF0C\u6CA1\u6709\u53EF\u5237\u65B0\u7684\u8D27\u67B6\u3002");
    const previous = new Set(g.room.shopStock.map((i) => i.id));
    stock = g.drawItems(100).filter((i) => !previous.has(i.id)).slice(0, g.room.shopStock.length);
    if (stock.length < g.room.shopStock.length) return refuse("\u53EF\u66FF\u6362\u9053\u5177\u4E0D\u8DB3\uFF0C\u4FDD\u7559\u91D1\u5E01\u3002");
  }
  g.coins -= s.cost;
  g.room.serviceUses ??= {};
  g.room.serviceUses[id] = used + 1;
  if (id === "service_reroll") g.room.shopStock = stock;
  if (id === "service_shield") g.p.shield = true;
  if (id === "service_charge") g.activeCharge = g.activeCost();
  if (id === "service_map") {
    for (const r of g.rooms) if (r.exists && r.type === "cache") {
      r.seen = true;
      r.revealed = true;
    }
  }
  g.mode = "play";
  g.emit("room");
  g.emit("toast", { text: id === "service_reroll" ? "\u8D27\u67B6\u5DF2\u5237\u65B0\uFF0C\u6309 E \u67E5\u770B\u65B0\u9053\u5177\u3002" : "\u5DF2\u8D2D\u4E70\uFF1A" + s.name });
  return true;
}

// dist/sound-mobs.js
function beginBeat(g, e, source = null) {
  e.beat = { t: 0, wind: 0.65, aim: Math.atan2(g.p.y - e.y, g.p.x - e.x), source };
  e.vx = 0;
  e.vy = 0;
}
function conductSquad(g, conductor) {
  let orders = 0;
  for (const m of g.room.enemies.filter((m2) => m2 !== conductor && !m2.dead && m2.type !== "boss" && Math.hypot(m2.x - conductor.x, m2.y - conductor.y) < 175)) {
    m.rallied = 2;
    m.rallyOwner = conductor;
    if (orders >= 3 || m.repelled > 0) continue;
    if (m.type === "beatling" && !m.beat) {
      beginBeat(g, m, conductor);
      orders++;
    } else if (["echoBell", "soundTurret"].includes(m.type) && !m.mobCast && !m.screech) {
      m.cd = Math.min(m.cd, 0.35);
      orders++;
    }
  }
}
function updateSoundMobs(g, dt) {
  for (const e of g.room.enemies) {
    if (e.rallyOwner?.dead) {
      e.rallied = 0;
      e.rallyOwner = null;
    }
    if (e.type !== "beatling") continue;
    if (e.dead || e.repelled > 0) {
      e.beat = null;
      e.beatDelay = 1.1;
      if (e.dead) {
        e.vx = 0;
        e.vy = 0;
      }
      continue;
    }
    const s = e.beat;
    if (!s) {
      e.beatDelay = (e.beatDelay ?? 0.6 + (e.t || 0) % 1) - dt;
      if (e.beatDelay <= 0) beginBeat(g, e);
      continue;
    }
    if (s.source?.dead && s.t < s.wind) {
      e.beat = null;
      e.beatDelay = 1.1;
      continue;
    }
    s.t += dt;
    if (s.t >= s.wind && s.t < s.wind + 0.3) {
      e.vx = Math.cos(s.aim) * 340;
      e.vy = Math.sin(s.aim) * 340;
    } else {
      e.vx = 0;
      e.vy = 0;
    }
    if (s.t >= s.wind + 0.75) {
      e.beat = null;
      e.beatDelay = e.rallied > 0 ? 0.65 : 1.1;
    }
  }
  for (const b of g.enemyBullets) {
    if (!b.echoOwner) continue;
    if (b.echoOwner.dead || b.echoOwner.repelled > 0) {
      b.life = 0;
      continue;
    }
    b.echoAge = (b.echoAge || 0) + dt;
    if (b.echoAge >= 1.35 && b.echoAge < 1.65) {
      b.vx = 0;
      b.vy = 0;
      b.echoTurning = true;
    } else if (b.echoAge >= 1.65 && !b.echoReturned) {
      b.vx = -b.echoVX;
      b.vy = -b.echoVY;
      b.echoReturned = true;
      b.echoTurning = false;
    }
  }
}
function drawSoundMobs(ctx2, g) {
  ctx2.save();
  ctx2.font = "bold 11px system-ui";
  ctx2.textAlign = "center";
  for (const e of g.room.enemies) {
    if (e.dead) continue;
    if (e.type === "beatling" && e.beat) {
      const s = e.beat;
      ctx2.strokeStyle = s.source ? "#b16ed0" : "#9874b3";
      ctx2.fillStyle = "#755084";
      ctx2.lineWidth = 2;
      if (s.t < s.wind) {
        ctx2.setLineDash([7, 6]);
        ctx2.beginPath();
        ctx2.moveTo(e.x, e.y);
        ctx2.lineTo(e.x + Math.cos(s.aim) * 130, e.y + Math.sin(s.aim) * 130);
        ctx2.stroke();
        ctx2.setLineDash([]);
        ctx2.fillText(s.source ? "\u5408\u62CD\u51B2\u523A \xB7 \u9884\u8B66" : "\u8E29\u62CD\u84C4\u52BF \xB7 \u4FA7\u79FB", e.x, e.y - 44);
      } else if (s.t >= s.wind + 0.3) ctx2.fillText("\u843D\u62CD \xB7 \u7834\u7EFD", e.x, e.y - 44);
    }
    if (e.type === "conductor" && e.mobCast?.kind === "conduct") {
      ctx2.strokeStyle = "#b08bcd";
      ctx2.lineWidth = 2;
      ctx2.setLineDash([4, 6]);
      for (const m of g.room.enemies) if (m !== e && !m.dead && m.type !== "boss" && Math.hypot(m.x - e.x, m.y - e.y) < 175) {
        ctx2.beginPath();
        ctx2.moveTo(e.x, e.y);
        ctx2.lineTo(m.x, m.y);
        ctx2.stroke();
      }
      ctx2.setLineDash([]);
    }
  }
  for (const b of g.enemyBullets) if (b.echoOwner && b.life > 0) {
    ctx2.strokeStyle = b.echoReturned ? "#f2cf8d" : "#bd9bdf";
    ctx2.lineWidth = b.echoTurning ? 3 : 1.5;
    ctx2.beginPath();
    ctx2.arc(b.x, b.y, b.r + (b.echoTurning ? 10 : 4), 0, Math.PI * 2);
    ctx2.stroke();
    if (b.echoTurning) {
      ctx2.fillStyle = "#815c91";
      ctx2.fillText("\u8FD4", b.x, b.y - 17);
    }
  }
  ctx2.restore();
}

// dist/chapter-mobs.js
var clamp6 = (v, a, b) => Math.max(a, Math.min(b, v));
var inMilk = (g, e) => g.effects.some((f) => f.type === "milkPool" && Math.hypot(e.x - f.x, e.y - f.y) < e.r + f.radius) || (g.room.hazards || []).some((h2) => h2.kind === "milk" && !h2.drained && !g.room.clear && overlaps(h2, e.x, e.y, e.r));
function shot(g, e, a, speed = 205) {
  g.enemyBullets.push({ x: e.x + Math.cos(a) * (e.r + 5), y: e.y + Math.sin(a) * (e.r + 5), vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 7, life: 4 });
}
function zone(g, e, kind, x, y, radius, wind, active) {
  g.effects.push({ type: "mobZone", owner: e, kind, x, y, radius, wind, active, life: wind + active, max: wind + active, triggered: false });
}
function mobSpeed(g, e) {
  const def = CHAPTER_MOBS[e.type];
  if (!def) return;
  if (e.mobCast || e.type === "beatling" && e.beat) return 0;
  if (e.type === "milkSkater") return inMilk(g, e) ? 205 : def.speed;
  return def.speed;
}
function mobContact(g, e) {
  if (e.type !== "scrapMine" || e.dead) return false;
  e.mobCast = null;
  g.effects.push({ type: "bombBlast", x: e.x, y: e.y, radius: 85, life: 0.4, max: 0.4 });
  g.burst(e.x, e.y, "#f4dd99", 18);
  g.damageEnemy(e, e.hp, false);
  g.hurt();
  return true;
}
function mobAttack(g, e) {
  if (!CHAPTER_MOBS[e.type]?.shoot) return false;
  if (e.mobCast) {
    e.cd = 0.2;
    return true;
  }
  const aim2 = Math.atan2(g.p.y - e.y, g.p.x - e.x);
  if (e.type === "echoBell") {
    e.mobCast = { kind: "echo", t: 0, wind: 0.65, aim: aim2, fired: 0 };
    e.cd = 2.8;
  }
  if (e.type === "conductor") {
    e.mobCast = { kind: "conduct", t: 0, wind: 0.75 };
    e.cd = 4.2;
  }
  if (e.type === "parcelThrower") {
    zone(g, e, "parcel", clamp6(g.p.x, 95, 865), clamp6(g.p.y, 95, 505), 65, 1, 0.25);
    e.cd = 3;
  }
  if (e.type === "forklift") {
    e.mobCast = { kind: "rush", t: 0, wind: 0.75, aim: aim2 };
    e.cd = 3.8;
  }
  if (e.type === "stitchMedic") {
    const target2 = g.room.enemies.filter((m) => m !== e && !m.dead && m.type !== "boss" && m.hp < m.maxHp && Math.hypot(m.x - e.x, m.y - e.y) < 185).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    if (target2) {
      e.mobCast = { kind: "mend", t: 0, wind: 0.9, target: target2 };
      e.cd = 3.2;
    } else {
      e.cd = 1;
    }
  }
  if (e.type === "lockSentry") {
    zone(g, e, "electric", clamp6(g.p.x, 110, 850), clamp6(g.p.y, 110, 490), 60, 0.85, 1.35);
    e.cd = 3.3;
  }
  if (e.type === "prismEye") {
    e.mobCast = { kind: "cross", t: 0, wind: 0.8, aim: (e.crossCycle || 0) * Math.PI / 8 };
    e.crossCycle = ((e.crossCycle || 0) + 1) % 4;
    e.cd = 2.4;
  }
  return true;
}
function updateMobs(g, dt) {
  updateSoundMobs(g, dt);
  for (const e of g.room.enemies) e.rallied = Math.max(0, (e.rallied || 0) - dt);
  for (const e of [...g.room.enemies]) {
    if (e.dead) {
      e.mobCast = null;
      continue;
    }
    if (e.repelled > 0) continue;
    const c = e.mobCast;
    if (!c) continue;
    c.t += dt;
    if (c.kind === "rush") {
      if (c.t >= c.wind && c.t < c.wind + 0.5) {
        e.vx = Math.cos(c.aim) * 410;
        e.vy = Math.sin(c.aim) * 410;
      } else {
        e.vx = 0;
        e.vy = 0;
      }
      if (c.t >= c.wind + 0.5) e.mobCast = null;
    } else if (c.kind === "echo") {
      while (c.fired < 3 && c.t >= c.wind + c.fired * 0.28) {
        shot(g, e, c.aim, 260);
        const b = g.enemyBullets.at(-1);
        Object.assign(b, { echoOwner: e, echoAge: 0, echoVX: b.vx, echoVY: b.vy, sound: "echo" });
        c.fired++;
      }
      if (c.fired === 3) e.mobCast = null;
    } else if (c.t >= c.wind) {
      if (c.kind === "conduct") conductSquad(g, e);
      if (c.kind === "mend" && !c.target.dead && Math.hypot(c.target.x - e.x, c.target.y - e.y) < 185) {
        c.target.hp = Math.min(c.target.maxHp, c.target.hp + 2);
        g.effects.push({ type: "mobHeal", x: c.target.x, y: c.target.y, life: 0.5, max: 0.5 });
      }
      if (c.kind === "cross") for (let i = 0; i < 4; i++) shot(g, e, c.aim + i * Math.PI / 2, 195);
      e.mobCast = null;
    }
  }
  for (const f of [...g.effects]) if (f.type === "mobZone") {
    if (f.owner?.dead && f.kind !== "curd") {
      f.life = 0;
      continue;
    }
    const age = f.max - f.life;
    if (age + dt >= f.wind && f.life > 0) {
      if (f.kind === "curd" && !f.triggered) {
        g.effects.push({ type: "milkPool", x: f.x, y: f.y, radius: f.radius, friendly: false, life: 3, max: 3, tick: 0 });
      }
      if (f.kind === "electric" || f.kind === "parcel" && !f.triggered) {
        if (Math.hypot(g.p.x - f.x, g.p.y - f.y) < f.radius + g.p.r) g.hurt();
      }
      f.triggered = true;
    }
  }
}
function mobKilled(g, e) {
  if (e.type === "curdling") zone(g, e, "curd", e.x, e.y, 65, 0.7, 0.2);
}

// dist/engine.js
var W = 960;
var H = 600;
var ITEMS = [
  { id: "eye", icon: "\u25C9", name: "\u7EFF\u773C\u73E0", desc: "\u6CEA\u6EF4\u67D3\u7EFF\uFF0C\u9644\u5E26\u6301\u7EED\u86D9\u6BD2", short: "\u6BD2\u6CEA \xB7 \u6301\u7EED\u4F24\u5BB3" },
  { id: "laugh", icon: "\u263B", name: "\u5927\u7B11\u5634", desc: "\u6BCF 4 \u79D2\u7206\u53D1\u5927\u7B11\u58F0\u6CE2\uFF0C\u4F24\u5BB3\u5E76\u63A8\u5F00\u654C\u4EBA", short: "\u81EA\u52A8\u5927\u7B11 \xB7 \u8303\u56F4\u4F24\u5BB3" },
  { id: "feet", icon: "\u2667", name: "\u5927\u86D9\u8E7C", desc: "\u79FB\u52A8\u901F\u5EA6 +25%\uFF0C\u86D9\u8DF3\u51B7\u5374\u7F29\u77ED", short: "\u79FB\u52A8\u52A0\u901F \xB7 \u86D9\u8DF3\u66F4\u5FEB" },
  { id: "milk", icon: "\u265C", name: "\u5428\u5428\u5976\u74F6", desc: "\u751F\u547D\u4E0A\u9650 +2\uFF0C\u7ACB\u523B\u6062\u590D 3 \u70B9\u751F\u547D", short: "\u751F\u547D\u4E0A\u9650 +2" },
  { id: "double", icon: "\u25CE", name: "\u5BF9\u773C\u773C\u955C", desc: "\u4E24\u53EA\u773C\u775B\u4E00\u8D77\u54ED\uFF01\u6BCF\u6B21\u53D1\u5C04\u53CC\u6CEA\u6EF4", short: "\u53CC\u53D1\u6CEA\u6EF4" },
  { id: "tissue", icon: "\u25B1", name: "\u7B11\u54ED\u7EB8\u5DFE", desc: "\u7B11\u5230\u505C\u4E0D\u4E0B\u6765\uFF0C\u653B\u51FB\u901F\u5EA6\u63D0\u5347 35%", short: "\u653B\u51FB\u901F\u5EA6 +35%" },
  { id: "belly", icon: "\u25CF", name: "\u5706\u6EDA\u6EDA\u809A\u76AE", desc: "\u6CEA\u6EF4\u5A01\u529B +35%\uFF0C\u4F53\u79EF\u4E5F\u53D8\u5F97\u66F4\u5927", short: "\u6CEA\u6EF4\u5A01\u529B +35%" },
  { id: "lotus", icon: "\u2740", name: "\u5934\u9876\u8377\u53F6", desc: "\u6BCF\u7D2F\u8BA1 12 \u79D2\u6218\u6597\u65F6\u95F4\u957F\u51FA\u4E00\u7247\u62A4\u76FE\uFF0C\u62B5\u6321\u4E00\u6B21\u4F24\u5BB3", short: "\u53EF\u518D\u751F\u8377\u53F6\u62A4\u76FE" },
  { id: "tongue", icon: "\u301C", name: "\u5F39\u5F39\u86D9\u820C", desc: "\u6CEA\u6EF4\u7A7F\u900F\u654C\u4EBA\uFF0C\u5C04\u7A0B\u5EF6\u957F", short: "\u7A7F\u900F\u6CEA\u6EF4" },
  { id: "bubble", icon: "\u25CC", name: "\u6C60\u5858\u6CE1\u6CE1", desc: "\u6CEA\u6EF4\u78B0\u5230\u5899\u58C1\u53CD\u5F39\u4E24\u6B21", short: "\u5F39\u8DF3\u6CEA\u6EF4" },
  { id: "tadpole", icon: "\u2767", name: "\u5C0F\u874C\u86AA\u6302\u4EF6", desc: "\u4E00\u53EA\u5C0F\u874C\u86AA\u966A\u4F60\u4F5C\u6218\uFF0C\u81EA\u52A8\u7784\u51C6\u653B\u51FB\uFF1B\u6BCF 0.48 \u79D2\u4E00\u53D1\uFF0C\u4F24\u5BB3\u4E3A 0.6 + \u57FA\u7840\u653B\u51FB\xD70.4\uFF08\u4E0A\u9650 2\uFF09", short: "\u874C\u86AA\u4F19\u4F34" },
  { id: "crown", icon: "\u265B", name: "\u6B6A\u6B6A\u86D9\u51A0", desc: "\u6CEA\u6EF4\u5A01\u529B +20%\uFF0C\u653B\u51FB\u901F\u5EA6 +12%", short: "\u5A01\u529B\u4E0E\u653B\u901F\u63D0\u5347" }
];
var clamp7 = (x, a, b) => Math.max(a, Math.min(b, x));
function applyItemStats(p, id) {
  if (id === "feet") p.speed *= 1.25;
  if (id === "milk") p.maxHp += 2;
  if (id === "tissue") p.rate /= 1.35;
  if (id === "belly") p.damage *= 1.35;
  if (id === "crown") {
    p.damage *= 1.2;
    p.rate /= 1.12;
  }
}
var Game = class {
  constructor(random = Math.random) {
    this.random = random;
    this.mode = "title";
    this.events = [];
    this.floor = 1;
    this.kills = 0;
    this.elapsed = 0;
    this.items = [];
    this.p = { x: 480, y: 300, r: 21, hp: 6, maxHp: 6, speed: 220, damage: 1, rate: 0.28, shot: 0, inv: 0, dash: 0, dashCD: 0, shield: false, shieldCD: 0, laugh: 0, petCD: 0, face: 1 };
    this.bullets = [];
    this.enemyBullets = [];
    this.particles = [];
    this.effects = [];
    this.generate();
  }
  emit(type, data = {}) {
    this.events.push({ type, ...data });
  }
  rand(a, b) {
    return a + this.random() * (b - a);
  }
  generate() {
    const pool2 = [0, 1, 2, 3, 5, 6, 7, 8];
    for (let i = pool2.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [pool2[i], pool2[j]] = [pool2[j], pool2[i]];
    }
    const boss = pool2.find((i) => [0, 2, 6, 8].includes(i));
    const treasure = pool2.find((i) => i !== boss);
    this.rooms = Array.from({ length: 9 }, (_, i) => ({ id: i, type: i === 4 ? "start" : i === boss ? "boss" : i === treasure ? "treasure" : "fight", visited: i === 4, clear: i === 4, enemies: null, reward: false, obstacles: i === 4 ? [] : [{ x: 240 + i % 2 * 45, y: 190, r: 29 }, { x: 705 - i % 3 * 20, y: 405, r: 33 }], seed: this.rand(0, 1e3) }));
    this.roomId = 4;
    this.rooms[4].enemies = [];
    this.p.x = 480;
    this.p.y = 300;
    this.bullets = [];
    this.enemyBullets = [];
    this.effects = [];
    this.pickup = null;
    this.emit("room");
  }
  get room() {
    return this.rooms[this.roomId];
  }
  has(id) {
    return this.items.includes(id);
  }
  start() {
    this.mode = "play";
    this.emit("room");
  }
  spawn(type, x, y) {
    let hp = type === "boss" ? 65 + this.floor * 25 : type === "shooter" ? 3 + this.floor : type === "slime" ? 2 + this.floor : 1 + this.floor;
    return { type, x, y, r: type === "boss" ? 56 : type === "slime" ? 23 : 19, hp, maxHp: hp, t: this.rand(0, 6), cd: this.rand(0.8, 2), poison: 0, poisonTick: 0, hit: 0, vx: 0, vy: 0, phase: 0 };
  }
  enter(id, side) {
    if (!this.rooms[id]) return;
    this.roomId = id;
    const r = this.room;
    r.visited = true;
    this.bullets = [];
    this.enemyBullets = [];
    this.effects = [];
    this.pickup = null;
    this.p.x = side === "left" ? 865 : side === "right" ? 95 : 480;
    this.p.y = side === "top" ? 510 : side === "bottom" ? 90 : 300;
    this.p.dash = 0;
    delete this.p.frogJump;
    this.p.inv = 1;
    if (!r.enemies) {
      r.enemies = [];
      if (r.type === "boss") {
        r.enemies = [this.spawn("boss", 480, 225)];
      } else if (r.type === "fight") {
        const count2 = 3 + this.floor + Math.floor(this.rand(0, 2));
        for (let i = 0; i < count2; i++) {
          const x = 190 + i % 3 * 285, y = 170 + Math.floor(i / 3) * (this.gridSize === 5 ? 130 : 245);
          r.enemies.push(this.spawn(["slime", "fly", "shooter"][Math.floor(this.rand(0, 3))], x, y));
        }
      } else if (r.type === "treasure") {
        r.clear = true;
      }
    }
    if (r.type === "boss" && r.clear && this.floor < (this.finalFloor || 2)) this.pickup = { type: "portal", x: 480, y: 300 };
    if (r.type === "treasure" && !r.reward) {
      r.reward = true;
      this.offer("\u8377\u53F6\u4E0B\uFF0C\u85CF\u7740\u4EC0\u4E48\uFF1F");
    }
    this.emit("room");
  }
  doors() {
    const i = this.roomId;
    return { left: i % 3 > 0, right: i % 3 < 2, top: i >= 3, bottom: i < 6 };
  }
  offer(title2) {
    const available = ITEMS.filter((i) => !this.has(i.id));
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [available[i], available[j]] = [available[j], available[i]];
    }
    this.choices = available.slice(0, 3);
    this.mode = "choice";
    this.emit("choice", { title: title2, choices: this.choices });
  }
  choose(id) {
    if (this.mode !== "choice" || !this.choices.some((i) => i.id === id)) return false;
    this.items.push(id);
    const p = this.p;
    applyItemStats(p, id);
    if (id === "milk") p.hp = Math.min(p.maxHp, p.hp + 3);
    if (id === "lotus") {
      p.shield = true;
      p.shieldCD = 12;
    }
    this.mode = "play";
    this.emit("item", { id });
    return true;
  }
  burst(x, y, color, n = 12) {
    for (let i = 0; i < n; i++) {
      const a = this.rand(0, Math.PI * 2), v = this.rand(25, 150);
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: this.rand(0.25, 0.7), color, r: this.rand(2, 6) });
    }
  }
  damageEnemy(e, n) {
    if (e.dead || e.airborne) return;
    e.hp -= n;
    e.hit = 0.1;
    if (e.hp <= 0 && !e.dead) {
      e.dead = true;
      this.kills++;
      this.burst(e.x, e.y, e.type === "boss" ? "#f4d96f" : "#b9d28a", e.type === "boss" ? 45 : 14);
      this.emit("kill");
      this.onEnemyKilled?.(e);
    }
  }
  hurt() {
    const p = this.p;
    if (p.inv > 0 || p.dash > 0) return;
    if (p.shield) {
      p.shield = false;
      p.shieldCD = 12;
      p.inv = 0.6;
      this.burst(p.x, p.y, "#bad37e");
      this.emit("shield");
      return;
    }
    p.hp--;
    p.inv = 1.25;
    this.emit("hurt");
    this.burst(p.x, p.y, "#f0a18a", 8);
    if (p.hp <= 0) {
      this.mode = "dead";
      this.emit("end", { win: false });
    }
  }
  shoot(dx, dy, pet = false) {
    const p = this.p, len = Math.hypot(dx, dy);
    if (len < 0.01) return;
    dx /= len;
    dy /= len;
    const x = pet ? p.x - 35 : p.x, y = pet ? p.y + 25 : p.y - 6;
    for (const off of !pet && this.has("double") ? [-11, 11] : [0]) {
      this.bullets.push({ x: x - dy * off + dx * 20, y: y + dx * off + dy * 20, vx: dx * 490, vy: dy * 490, r: pet ? 5 : this.has("belly") ? 10 : 7, life: this.has("tongue") ? 2.7 : 1.6, damage: pet ? 0.65 : p.damage * (this.has("double") ? 0.7 : 1), poison: !pet && this.has("eye"), pierce: !pet && this.has("tongue"), bounce: this.has("bubble") ? 2 : 0, hits: /* @__PURE__ */ new Set(), pet });
    }
    if (!pet) this.emit("shoot");
  }
  update(dt, input = {}, playerDt = dt) {
    dt = Math.min(dt, 0.04);
    playerDt = Math.min(playerDt, 0.04);
    if (this.mode !== "play") return;
    this.elapsed += dt;
    const p = this.p, r = this.room;
    p.inv = Math.max(0, p.inv - playerDt);
    p.shot -= playerDt;
    p.dashCD = Math.max(0, p.dashCD - playerDt);
    let mx = input.mx || 0, my = input.my || 0, mag = Math.hypot(mx, my);
    if (mag > 1) {
      mx /= mag;
      my /= mag;
    }
    if (mx) p.face = mx < 0 ? -1 : 1;
    if (input.dash && p.dashCD <= 0 && p.dash <= 0) {
      p.dash = FROG_JUMP_SECONDS;
      p.dashCD = this.has("feet") ? 1.3 : 2;
      p.dx = mx || (!my ? p.face : 0);
      p.dy = my;
      delete p.frogJump;
      this.emit("dash");
    }
    const previousX = p.x, previousY = p.y, dashing = p.dash > 0, jumpDt = Math.min(p.dash, playerDt);
    const scale = this.moveScale?.(p) ?? 1, drift = dashing ? { x: 0, y: 0 } : this.groundDrift?.(p) || { x: 0, y: 0 };
    p.x += dashing ? p.dx * FROG_JUMP_SPEED * jumpDt : (mx * p.speed * scale + drift.x) * playerDt;
    p.y += dashing ? p.dy * FROG_JUMP_SPEED * jumpDt : (my * p.speed * scale + drift.y) * playerDt;
    p.x = clamp7(p.x, 49, 911);
    p.y = clamp7(p.y, 49, 551);
    const landing = dashing && p.dash <= playerDt;
    if (this.resolveTerrain) this.resolveTerrain(p, previousX, previousY, landing);
    else if (dashing) moveFrogOnTerrain(r, p, previousX, previousY, landing);
    else for (const o of r.obstacles) {
      const dx = p.x - o.x, dy = p.y - o.y, l = Math.hypot(dx, dy), min = o.r + p.r - 4;
      if (l < min) {
        p.x = o.x + dx / (l || 1) * min;
        p.y = o.y + dy / (l || 1) * min;
      }
    }
    p.dash = Math.max(0, p.dash - playerDt);
    if (landing) p.inv = Math.max(p.inv, 0.12);
    if (input.fire && p.shot <= 0) {
      let ax = input.ax || 0, ay = input.ay || 0;
      if (input.auto) {
        const e = r.enemies.filter((e2) => !e2.dead).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
        ax = e ? e.x - p.x : p.face;
        ay = e ? e.y - p.y : 0;
      }
      this.shoot(ax, ay);
      p.shot = this.attackInterval?.() ?? p.rate;
    }
    if (this.has("lotus") && !p.shield && itemCombatActive(r)) {
      p.shieldCD -= dt;
      if (p.shieldCD <= 0) p.shield = true;
    }
    if (this.has("laugh") && itemCombatActive(r)) {
      p.laugh -= dt;
      if (p.laugh <= 0) {
        p.laugh = 4;
        this.effects.push({ type: "laugh", x: p.x, y: p.y, life: 0.6, max: 0.6 });
        for (const e of r.enemies) {
          if (!e.dead && Math.hypot(e.x - p.x, e.y - p.y) < 190) {
            this.damageEnemy(e, 3);
            const len = Math.hypot(e.x - p.x, e.y - p.y) || 1;
            e.vx = (e.x - p.x) / len * 260;
            e.vy = (e.y - p.y) / len * 260;
          }
        }
        this.emit("laugh");
      }
    }
    if (this.has("tadpole")) {
      p.petCD -= dt;
      if (p.petCD <= 0) {
        const e = r.enemies.find((e2) => !e2.dead);
        if (e) {
          this.shoot(e.x - (p.x - 35), e.y - (p.y + 25), true);
          const shot2 = this.bullets.at(-1);
          if (shot2) shot2.damage = Math.min(2, 0.6 + p.damage * 0.4);
          p.petCD = 0.48;
        }
      }
    }
    for (const e of r.enemies) {
      if (e.dead) continue;
      e.t += dt;
      e.cd -= dt;
      e.hit = Math.max(0, e.hit - dt);
      if (e.poison > 0) {
        e.poison -= dt;
        e.poisonTick -= dt;
        if (e.poisonTick <= 0) {
          e.poisonTick = 0.5;
          this.damageEnemy(e, 0.45);
        }
      }
      const dx = p.x - e.x, dy = p.y - e.y, len = Math.hypot(dx, dy) || 1;
      let speed = e.type === "fly" ? 115 : e.type === "slime" ? 64 : e.type === "boss" ? 42 : 25;
      if (e.type === "boss" && e.hp < e.maxHp * 0.5) speed = 65;
      speed = (this.enemySpeed?.(e) ?? speed) * (this.moveScale?.(e) ?? 1);
      const oldX = e.x, oldY = e.y, heading = this.enemyHeading?.(e) || { x: dx / len, y: dy / len }, drift2 = this.groundDrift?.(e) || { x: 0, y: 0 };
      e.x += (heading.x * speed + e.vx + drift2.x) * dt;
      e.y += (heading.y * speed + e.vy + drift2.y) * dt;
      e.vx *= Math.exp(-dt * 7);
      e.vy *= Math.exp(-dt * 7);
      e.x = clamp7(e.x, 55 + e.r, 905 - e.r);
      e.y = clamp7(e.y, 55 + e.r, 545 - e.r);
      if (this.resolveTerrain) this.resolveTerrain(e, oldX, oldY);
      else for (const o of r.obstacles) {
        const ox = e.x - o.x, oy = e.y - o.y, ol = Math.hypot(ox, oy), mr = o.r + e.r - 3;
        if (ol < mr) {
          e.x = o.x + ox / (ol || 1) * mr;
          e.y = o.y + oy / (ol || 1) * mr;
        }
      }
      if (e.cd <= 0 && (e.type === "shooter" || e.type === "boss" || this.canEnemyShoot?.(e))) {
        e.cd = e.type === "boss" ? e.hp < e.maxHp * 0.5 ? 1.1 : 1.7 : 2.1;
        if (this.enemyAttack?.(e)) {
        } else if (e.type === "boss") {
          const count2 = e.hp < e.maxHp * 0.5 ? 12 : 8;
          for (let n = 0; n < count2; n++) {
            const a = n * Math.PI * 2 / count2 + e.t * 0.3;
            this.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, r: 8, life: 5 });
          }
          this.effects.push({ type: "bossLaugh", x: e.x, y: e.y, life: 0.5, max: 0.5 });
        } else this.enemyBullets.push({ x: e.x, y: e.y, vx: dx / len * 175, vy: dy / len * 175, r: 7, life: 5 });
      }
      if (!e.dead && !e.airborne && Math.hypot(e.x - p.x, e.y - p.y) < e.r + p.r - 5) {
        if (!this.enemyContact?.(e)) this.hurt();
      }
    }
    for (const b of this.bullets) {
      b.previousX = b.x;
      b.previousY = b.y;
      const bulletDt = b.pet ? dt : playerDt;
      b.x += b.vx * bulletDt;
      b.y += b.vy * bulletDt;
      b.life -= bulletDt;
      if (b.x < 47 || b.x > 913 || b.y < 47 || b.y > 553) {
        if (b.bounce > 0) {
          if (b.x < 47 || b.x > 913) b.vx *= -1;
          if (b.y < 47 || b.y > 553) b.vy *= -1;
          b.x = clamp7(b.x, 47, 913);
          b.y = clamp7(b.y, 47, 553);
          b.bounce--;
          this.onBulletBounce?.(b);
        } else b.life = 0;
      }
      if (this.projectileBlocked ? this.projectileBlocked(b, false) : r.obstacles.some((o) => Math.hypot(o.x - b.x, o.y - b.y) < o.r + b.r)) b.life = 0;
      if (b.life <= 0) continue;
      for (const e of r.enemies) {
        if (!e.dead && !b.hits.has(e) && (this.canBulletHit?.(e, b) ?? true) && Math.hypot(e.x - b.x, e.y - b.y) < e.r + b.r) {
          this.damageEnemy(e, this.bulletDamage?.(e, b) ?? b.damage);
          b.hits.add(e);
          this.onBulletHit?.(e, b);
          if (b.poison) {
            if (!(e.poison > 0)) e.poisonTick = 0.1;
            e.poison = 3;
          }
          this.burst(b.x, b.y, b.poison ? "#b4df76" : "#c9ebeb", 4);
          if (!b.pierce) {
            b.life = 0;
            break;
          }
        }
      }
    }
    this.bullets = this.bullets.filter((b) => b.life > 0);
    for (const b of this.enemyBullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.x < 45 || b.x > 915 || b.y < 45 || b.y > 555 || (this.projectileBlocked ? this.projectileBlocked(b, true) : r.obstacles.some((o) => Math.hypot(o.x - b.x, o.y - b.y) < o.r + b.r))) b.life = 0;
      if (b.life > 0 && Math.hypot(b.x - p.x, b.y - p.y) < p.r + b.r - 6) {
        this.hurt();
        b.life = 0;
      }
    }
    this.enemyBullets = this.enemyBullets.filter((b) => b.life > 0);
    for (const v of this.particles) {
      v.x += v.vx * dt;
      v.y += v.vy * dt;
      v.life -= dt;
    }
    this.particles = this.particles.filter((v) => v.life > 0);
    for (const e of this.effects) e.life -= dt;
    this.effects = this.effects.filter((e) => e.life > 0);
    if (this.mode !== "play") return;
    if (!r.clear && r.enemies.every((e) => e.dead || e.dummy) && (this.canClearRoom?.(r) ?? true)) {
      r.clear = true;
      this.enemyBullets = [];
      this.emit("clear", { room: r });
      if (r.type === "boss") {
        if (this.floor === (this.finalFloor || 2)) {
          if (this.onFinalBossDefeated) this.onFinalBossDefeated();
          else {
            this.mode = "win";
            this.emit("end", { win: true });
          }
        } else {
          this.pickup = { type: "portal", x: 480, y: 300 };
          this.emit("toast", { text: "\u5173\u672B\u654C\u4EBA\u5DF2\u51FB\u8D25\uFF01\u4E2D\u592E\u51FA\u53E3\u901A\u5F80\u4E0B\u4E00\u7AE0\u3002" });
        }
      } else {
        if (!this.onRoomCleared) this.pickup = { type: "heart", x: 480, y: 300 };
        if (!r.reward) {
          r.reward = true;
          if (!this.onRoomCleared && this.rooms.filter((r2) => r2.type === "fight" && r2.clear).length % 2 === 0) this.offer("\u86D9\u86D9\u7684\u6218\u5229\u54C1 \xB7 \u9009\u62E9\u4E00\u4E2A");
        }
      }
      this.emit("room");
      this.onRoomCleared?.(r);
    }
    if (this.mode === "play" && this.pickup && Math.hypot(p.x - this.pickup.x, p.y - this.pickup.y) < 38) {
      if (this.pickup.type === "heart") {
        if (p.hp < p.maxHp) {
          p.hp = Math.min(p.maxHp, p.hp + 1);
          this.pickup = null;
          this.emit("heal");
        }
      } else {
        this.floor++;
        p.hp = Math.min(p.maxHp, p.hp + 2);
        this.generate();
        this.emit("toast", { text: "\u8FDB\u5165\u4E0B\u4E00\u7AE0\uFF0C\u6062\u590D 2 \u70B9\u751F\u547D\u3002" });
        return;
      }
    }
    if (r.clear && this.mode === "play") {
      const d = this.doors();
      if (p.x < 58 && Math.abs(p.y - 300) < 48 && d.left) {
        this.enter(this.roomId - 1, "left");
        return;
      }
      if (p.x > 902 && Math.abs(p.y - 300) < 48 && d.right) {
        this.enter(this.roomId + 1, "right");
        return;
      }
      if (p.y < 58 && Math.abs(p.x - 480) < 48 && d.top) {
        this.enter(this.roomId - (this.gridSize || 3), "top");
        return;
      }
      if (p.y > 542 && Math.abs(p.x - 480) < 48 && d.bottom) {
        this.enter(this.roomId + (this.gridSize || 3), "bottom");
        return;
      }
    }
  }
};

// dist/speaker.js
var names2 = { ring: "\u73AF\u5F62\u97F3\u6CE2", fan: "\u6247\u5F62\u8FDE\u53D1", bass: "\u4F4E\u97F3\u9707\u8361", slam: "\u9AD8\u7A7A\u8DF3\u7838" };
var colors2 = { ring: "#66c9bf", fan: "#b38be8", bass: "#ef9474", slam: "#ee847e" };
function startSpeakerAttack(g, e) {
  if (e.dead) return;
  const rage2 = e.hp < e.maxHp * 0.5, order = rage2 ? ["ring", "fan", "bass", "slam"] : ["ring", "fan", "bass"];
  const kind = order[(e.soundCycle || 0) % order.length];
  e.soundCycle = (e.soundCycle || 0) + 1;
  const wind = kind === "slam" ? 0.8 : kind === "bass" ? 0.9 : kind === "fan" ? 0.7 : 0.65;
  const volleys = kind === "ring" ? rage2 ? 2 : 1 : kind === "fan" ? rage2 ? 4 : 3 : 0;
  const duration = kind === "slam" ? 1.4 : kind === "bass" ? wind + 1.45 : wind + Math.max(0, volleys - 1) * 0.3 + 0.2;
  e.sound = { kind, rage: rage2, wind, volleys, duration, t: 0, fired: 0, x: e.x, y: e.y, aim: Math.atan2(g.p.y - e.y, g.p.x - e.x), hit: false };
  if (kind === "slam") {
    e.airborne = true;
    e.sound.targetX = Math.max(120, Math.min(840, g.p.x));
    e.sound.targetY = Math.max(120, Math.min(480, g.p.y));
  }
  e.cd = duration + (rage2 ? 0.32 : 0.4);
  e.vx = 0;
  e.vy = 0;
  g.emit("bossSound", { kind });
}
function fireVolley(g, s) {
  const count2 = s.kind === "ring" ? s.rage ? 14 : 10 : s.rage ? 7 : 5, speed = s.kind === "ring" ? 200 : 255;
  for (let i = 0; i < count2; i++) {
    const angle = s.kind === "ring" ? s.aim + (i + 0.5 + s.fired * 0.5) * Math.PI * 2 / count2 : s.aim + (i - (count2 - 1) / 2) * 0.21;
    g.enemyBullets.push({ x: s.x + Math.cos(angle) * 58, y: s.y + Math.sin(angle) * 58, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: 8, life: 5, sound: s.kind });
  }
}
function updateSpeaker(g, e, dt) {
  const s = e.sound;
  e.muted = false;
  if (e.dead) {
    e.sound = null;
    e.airborne = false;
    return;
  }
  if (!s) return;
  const previous = s.t;
  s.t += dt;
  e.muted = s.kind === "ring" && s.t < s.wind;
  if (e.muted) g.bullets = g.bullets.filter((b) => Math.hypot(b.x - e.x, b.y - e.y) > 85);
  if (s.kind === "slam") {
    if (s.t >= s.wind && !s.landed) {
      s.landed = true;
      e.airborne = false;
      e.x = s.targetX;
      e.y = s.targetY;
      if (Math.hypot(g.p.x - e.x, g.p.y - e.y) < 85 + g.p.r) g.hurt();
      for (let i = 0; i < 22; i++) {
        const a = (i + 0.5) * Math.PI * 2 / 22;
        g.enemyBullets.push({ x: e.x + Math.cos(a) * 58, y: e.y + Math.sin(a) * 58, vx: Math.cos(a) * 190, vy: Math.sin(a) * 190, r: 7, life: 5, sound: "fan" });
      }
    }
  } else if (s.kind === "bass") {
    if (s.t >= s.wind) {
      const min = 70 + Math.max(0, previous - s.wind) / 1.45 * 330;
      const max = 70 + Math.min(1, (s.t - s.wind) / 1.45) * 330;
      const distance2 = Math.hypot(g.p.x - s.x, g.p.y - s.y), margin = g.p.r + 9;
      if (!s.hit && distance2 >= min - margin && distance2 <= max + margin) {
        g.hurt();
        s.hit = true;
      }
    }
  } else {
    while (s.fired < s.volleys && s.t >= s.wind + s.fired * 0.3) {
      fireVolley(g, s);
      s.fired++;
    }
  }
  if (s.t >= s.duration) {
    e.sound = null;
    e.muted = false;
    e.airborne = false;
  }
}
function drawSpeakerAttack(ctx2, e) {
  const s = e.sound;
  if (!s || e.dead) return;
  const warning = s.t < s.wind, color = colors2[s.kind];
  ctx2.save();
  ctx2.beginPath();
  ctx2.rect(47, 47, 866, 506);
  ctx2.clip();
  ctx2.strokeStyle = color;
  ctx2.fillStyle = color + "25";
  ctx2.lineWidth = 3;
  if (s.kind === "slam") {
    ctx2.fillStyle = warning ? "#ef847e35" : "#ffe2bf99";
    ctx2.beginPath();
    ctx2.arc(s.targetX, s.targetY, 85, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.stroke();
    ctx2.fillStyle = "#ad4847";
    ctx2.font = "bold 13px system-ui";
    ctx2.textAlign = "center";
    ctx2.fillText(warning ? "\u8DF3\u7838\u843D\u70B9 \xB7 \u5FEB\u8EB2\u5F00" : "\u843D\u5730\u5F39\u5E55\uFF01", s.targetX, s.targetY + 105);
  } else if (s.kind === "fan") {
    const spread = s.rage ? 0.73 : 0.52;
    ctx2.beginPath();
    ctx2.moveTo(s.x, s.y);
    ctx2.arc(s.x, s.y, 330, s.aim - spread, s.aim + spread);
    ctx2.closePath();
    ctx2.fill();
    ctx2.setLineDash([8, 10]);
    ctx2.stroke();
    ctx2.setLineDash([]);
  } else if (s.kind === "bass") {
    const radius = warning ? 400 : 70 + Math.min(1, (s.t - s.wind) / 1.45) * 330;
    if (warning) ctx2.setLineDash([10, 12]);
    ctx2.beginPath();
    ctx2.arc(s.x, s.y, radius, 0, Math.PI * 2);
    ctx2.lineWidth = warning ? 3 : 18;
    ctx2.stroke();
    ctx2.setLineDash([]);
    if (!warning) {
      ctx2.beginPath();
      ctx2.arc(s.x, s.y, radius, 0, Math.PI * 2);
      ctx2.strokeStyle = "#fff3d9";
      ctx2.lineWidth = 3;
      ctx2.stroke();
    }
  } else {
    ctx2.beginPath();
    ctx2.arc(s.x, s.y, 85, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.stroke();
  }
  ctx2.fillStyle = "#fff3d4";
  ctx2.textAlign = "center";
  ctx2.font = "bold 14px system-ui";
  ctx2.fillText(names2[s.kind] + (warning ? " \xB7 \u84C4\u80FD\u4E2D" : s.kind === "bass" ? " \xB7 \u86D9\u8DF3\u7A7F\u73AF" : " \xB7 \u53D1\u5C04"), s.x, s.y - 110);
  if (warning) {
    ctx2.beginPath();
    ctx2.arc(s.x, s.y, 65, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * s.t / s.wind);
    ctx2.strokeStyle = color;
    ctx2.lineWidth = 5;
    ctx2.stroke();
  }
  ctx2.restore();
}

// dist/campaign.js
var CHAPTERS = ["\u5976\u74F6\u8857", "\u7981\u7B11\u5267\u573A", "\u5976\u4F34\u8FD0\u8F93\u7AD9", "\u5047\u5976\u8C46\u5DE5\u5382", "\u6700\u540E\u7684\u7262\u7B3C"];
var BOSS_NAMES = ["\u5976\u74F6\u6536\u7F34\u5458", "\u9759\u97F3\u7BB1", "\u5206\u62E3\u5DE8\u94B3", "\u62FC\u88C5\u5976\u5076", "\u725B\u6765\u4E0E\u7F8E\u9F20"];
for (const item of [...VOICE_ITEMS, ...COMBO_ITEMS, ...MEME_ITEMS, ...CHRONO_ITEMS, ...DEEPSEEK_ITEMS, ...PHOEBE_ITEMS]) if (!ITEMS.some((i) => i.id === item.id)) ITEMS.push(item);
var extra = [
  ["milkboots", "\u2667", "\u8C46\u5305\u96E8\u9774", "\u514D\u75AB\u5976\u8FF9\u4F24\u5BB3\u4E0E\u51CF\u901F\uFF1B\u4F20\u9001\u5E26\u63A8\u529B\u51CF\u534A\uFF1B\u6BCF 8 \u79D2\u62B5\u6321\u4E00\u6B21\u5730\u9762\u673A\u5173\u4F24\u5BB3"],
  ["milkfilter", "\u25C9", "\u5976\u8FF9\u6EE4\u82AF", "\u58F0\u6CE2\u4F24\u5BB3\u5E38\u9A7B +8%\uFF1B\u7AD9\u5728\u5976\u8FF9\u4E0A\u65F6\u6539\u4E3A +40%\uFF0C\u4E24\u8005\u4E0D\u53E0\u52A0"],
  ["spillcup", "\u25A3", "\u6253\u7FFB\u7684\u5976\u676F", "\u4E3B\u52A8\u7206\u7B11\u5B8C\u6210\u540E\u7559\u4E0B\u6301\u7EED\u4F24\u5BB3\u654C\u4EBA\u7684\u53CB\u65B9\u5976\u8FF9"],
  ["milkfoam", "\u25CC", "\u5976\u6CE1\u53D1\u58F0\u5668", "\u7B11\u58F0\u547D\u4E2D\u654C\u4EBA\u65F6\u6709 20% \u6982\u7387\u7559\u4E0B\u53CB\u65B9\u5976\u8FF9"],
  ["mouse", "\u25D6", "\u5976\u9F20\u7684\u5976\u916A", "\u5976\u9F20\u8FD1\u8EAB\u5543\u54AC\u5730\u9762\u654C\u4EBA\uFF0C\u57FA\u7840\u4F24\u5BB3\u56FA\u5B9A 1.5\uFF0C\u4E0D\u968F\u653B\u51FB\u5C5E\u6027\u589E\u957F\uFF0C\u51B7\u5374 3.2 \u79D2\uFF0C\u5BF9\u843D\u5730 Boss \u4E5F\u6709\u6548\u3002\u547D\u4E2D\u53EF\u5077\u8865\u7ED9\uFF0C\u6BCF\u623F 1 \u6B21\u3001\u6BCF\u5C42\u6700\u591A 3 \u6B21\uFF1A\u94A5\u5319\u89C1\u5E95\u4F18\u5148\u7ED9 1 \u628A\uFF0C\u5176\u6B21\u70B8\u5F39\u89C1\u5E95\u7ED9 1 \u679A\uFF0C\u5426\u5219\u7ED9 2 \u91D1\u5E01\uFF08\u5DF2\u6709\u5730\u9762\u6389\u843D\u4E5F\u7B97\u5E93\u5B58\uFF09\u3002\u4FDD\u7559 360 \u8303\u56F4\u62FE\u53D6\u548C\u771F\u5B9E\u9690\u85CF\u95E8\u5F15\u5BFC\uFF0C\u4ECD\u9700\u70B8\u5F39\u5F00\u95E8\u3002"],
  ["dog", "\u2667", "\u5976\u72D7\u9879\u5708", "\u5976\u72D7\u4E3B\u52A8\u6251\u51FB 360 \u8303\u56F4\u5185\u654C\u4EBA\uFF0C\u547D\u4E2D\u9020\u6210 3.2 + \u57FA\u7840\u653B\u51FB\xD70.9 \u4F24\u5BB3\uFF08\u4E0A\u9650 8\uFF09\uFF0C\u6251\u51FB\u51B7\u5374 0.75 \u79D2"],
  ["egg", "\u25CF", "\u5976\u86CB\u6447\u7BEE", "\u5976\u86CB\u84C4\u52BF\u540E\u53D1\u5C04\u7A7F\u900F\u58F0\u6CE2\uFF0C\u51B7\u5374 1.25 \u79D2\uFF1B\u4F24\u5BB3\u4E3A 2 + \u57FA\u7840\u653B\u51FB\xD70.9\uFF08\u4E0A\u9650 7\uFF09"],
  ["turtle", "\u25C9", "\u5976\u9F9F\u5C0F\u58F3", "\u5976\u9F9F\u4EE5\u539F\u901F\u7ED5\u8EAB\u65CB\u8F6C\uFF0C\u6321\u5F39\u534A\u5F84\u6269\u5927\u81F3 32\uFF1B\u78B0\u5230\u5B83\u7684\u654C\u5F39\u7ACB\u5373\u6D88\u9664\uFF0C\u6CA1\u6709\u6321\u5F39\u95F4\u9694\uFF1B\u63A5\u89E6\u5730\u9762\u654C\u4EBA\u9020\u6210 1.4 + \u57FA\u7840\u653B\u51FB\u7684 60% \u4F24\u5BB3\uFF08\u4E0A\u9650 4\uFF09\uFF0C\u540C\u4E00\u654C\u4EBA\u6BCF 0.5 \u79D2\u6700\u591A\u53D7\u4F24\u4E00\u6B21\uFF0C\u4E0D\u7A7F\u969C\u788D"],
  ["rabbit", "\u2667", "\u5976\u5154\u95F9\u949F", "\u5927\u7206\u7B11\u89E6\u53D1\u5976\u5154\u8DF3\u8DC3\u6CE2\u7EB9\uFF0C\u8FFD\u51FB 280 \u8303\u56F4\u5185\u654C\u4EBA\uFF1B\u4F24\u5BB3\u4E3A 4 + \u57FA\u7840\u653B\u51FB\xD71.5\uFF08\u4E0A\u9650 9\uFF09\uFF0C\u4E0D\u7A7F\u5899\uFF0C\u4E0D\u4E3A\u5927\u7206\u7B11\u81EA\u5145\u80FD"],
  ["lunch", "\u25A3", "\u8C46\u5305\u7684\u4FBF\u5F53", "\u6BCF\u6E05\u7A7A 3 \u4E2A\u6218\u6597\u623F\uFF0C\u6062\u590D 1 \u70B9\u751F\u547D"],
  ["scarf", "\u2661", "\u5976\u8C46\u7684\u5C0F\u56F4\u515C", "\u58F0\u6CE2\u4F24\u5BB3\u5E38\u9A7B +10%\uFF1B\u751F\u547D\u4E0D\u9AD8\u4E8E 2 \u70B9\u65F6\u6539\u4E3A +70%\uFF0C\u4E24\u8005\u4E0D\u53E0\u52A0"],
  ["megaphone", "\u25B7", "\u5927\u7B11\u6269\u97F3\u5668", "\u58F0\u6CE2\u5C04\u7A0B +40%\uFF0C\u4F53\u79EF\u589E\u5927"],
  ["battery", "\u03DF", "\u7B11\u58F0\u7535\u6C60", "\u5927\u7206\u7B11\u6240\u9700\u4F24\u5BB3\u5145\u80FD\u4ECE 45 \u964D\u4E3A 30"],
  ["homing", "\u2726", "\u56DE\u5BB6\u7684\u65B9\u5411", "\u7B11\u58F0\u81EA\u52A8\u8F6C\u5411\u9644\u8FD1\u654C\u4EBA"],
  ["split", "\u2733", "\u7B11\u5230\u5206\u53C9", "\u547D\u4E2D\u540E\u5206\u88C2\u4E24\u675F\u5404 35% \u4F24\u5BB3\u7684\u5C0F\u58F0\u6CE2\uFF1B\u5206\u88C2\u5F39\u4E0D\u518D\u5206\u88C2"],
  ["bargain", "\xA4", "\u8C46\u5305\u4F18\u60E0\u5238", "\u5546\u5E97\u9053\u5177\u4EF7\u683C\u4ECE 10 \u91D1\u5E01\u964D\u81F3 7 \u91D1\u5E01"]
];
for (const [id, icon, name, desc] of extra) if (!ITEMS.some((i) => i.id === id)) ITEMS.push({ id, icon, name, desc, short: desc });
for (const i of ITEMS) {
  i.desc = i.desc.replaceAll("\u6CEA\u6EF4", "\u58F0\u6CE2").replaceAll("\u6BD2\u6CEA", "\u6BD2\u7B11");
  i.short = i.short.replaceAll("\u6CEA\u6EF4", "\u58F0\u6CE2").replaceAll("\u6BD2\u6CEA", "\u6BD2\u7B11");
}
Object.assign(ITEMS.find((i) => i.id === "double"), { name: "\u53CC\u58F0\u9053\u5587\u53ED", desc: "\u540C\u65F6\u53D1\u51FA\u4E24\u9053\u58F0\u6CE2\uFF0C\u5404\u9020\u6210 70% \u4F24\u5BB3\uFF0C\u53EF\u4E0E\u6247\u5F62\u53E0\u52A0", short: "\u53CC\u53D1 \xB7 \u6BCF\u675F 70% \u4F24\u5BB3" });
var SUPPLIES = [{ id: "supply_key", icon: "\u26BF", name: "\u94A5\u5319 \xB7 3 \u91D1\u5E01", desc: "\u8D2D\u4E70 1 \u628A\u94A5\u5319", resource: "keys" }, { id: "supply_bomb", icon: "\u2739", name: "\u70B8\u5F39 \xB7 3 \u91D1\u5E01", desc: "\u8D2D\u4E70 1 \u679A\u70B8\u5F39", resource: "bombs" }, { id: "supply_heart", icon: "\u2665", name: "\u8865\u8840\u5305 \xB7 3 \u91D1\u5E01", desc: "\u6062\u590D 2 \u70B9\u751F\u547D", resource: "health" }];
var clamp8 = (n, a, b) => Math.max(a, Math.min(b, n));
var Game2 = class extends Game {
  constructor(random = Math.random) {
    super(random);
    this.finalFloor = 5;
    this.coins = 0;
    this.keys = 1;
    this.bombs = 2;
    this.activeCharge = 0;
    this.clears = 0;
    this.resources = [];
    this.explosives = [];
    this.bombLatch = false;
    this.useLatch = false;
    this.activeLatch = false;
    this.petTimers = {};
    this.seedLabel = Math.floor(this.rand(1e5, 999999));
  }
  neighbors(i) {
    return [i % 5 > 0 ? i - 1 : -1, i % 5 < 4 ? i + 1 : -1, i >= 5 ? i - 5 : -1, i < 20 ? i + 5 : -1].filter((n) => n >= 0);
  }
  generate() {
    resetChronoRoom(this);
    resetFollowers(this);
    resetDeepseek(this);
    resetPhoebe(this);
    this.keyDryRooms = 0;
    this.gridSize = 5;
    const ids = /* @__PURE__ */ new Set([12]);
    while (ids.size < 12 + Math.min(this.floor, 3)) {
      const edge = [...ids].flatMap((i) => this.neighbors(i)).filter((i) => !ids.has(i));
      ids.add(edge[Math.floor(this.rand(0, edge.length))]);
    }
    const dist = { 12: 0 }, q = [12];
    while (q.length) {
      const i = q.shift();
      for (const n of this.neighbors(i)) if (ids.has(n) && dist[n] === void 0) {
        dist[n] = dist[i] + 1;
        q.push(n);
      }
    }
    const ordered = [...ids].filter((i) => i !== 12).sort((a, b) => dist[b] - dist[a]);
    const boss = ordered.shift();
    const treasure = ordered.find((candidate) => {
      const reached = /* @__PURE__ */ new Set([12]), todo = [12];
      while (todo.length) {
        for (const n of this.neighbors(todo.shift())) if (ids.has(n) && n !== candidate && !reached.has(n)) {
          reached.add(n);
          todo.push(n);
        }
      }
      return reached.size === ids.size - 1;
    });
    ordered.splice(ordered.indexOf(treasure), 1);
    const shop = ordered.pop(), challenge = ordered.shift();
    this.rooms = Array.from({ length: 25 }, (_, i) => ({ id: i, exists: ids.has(i), type: i === 12 ? "start" : i === boss ? "boss" : i === treasure ? "treasure" : i === shop ? "shop" : i === challenge ? "challenge" : "fight", visited: i === 12, seen: i === 12 || this.neighbors(12).includes(i), clear: i === 12 || i === shop || i === treasure, enemies: null, reward: false, locked: i === treasure && this.floor > 1, obstacles: [], seed: this.rand(0, 1e3), loot: [], shopStock: null }));
    installResourceRooms(this);
    bindFloorEconomy(this);
    installLayouts(this);
    installRoomWardrobe(this);
    this.roomId = 12;
    this.rooms[12].enemies = [];
    this.p.x = 480;
    this.p.y = 300;
    this.p.dash = 0;
    delete this.p.frogJump;
    this.p.inv = 1;
    this.bullets = [];
    this.enemyBullets = [];
    this.particles = [];
    this.effects = [];
    this.pickup = null;
    this.explosives = [];
    this.doorMessage = 0;
    this.emit("room");
  }
  doors() {
    const i = this.roomId, visible = (n) => this.rooms[n]?.exists && (!this.rooms[n].hidden || this.rooms[n].revealed);
    return { left: i % 5 > 0 && visible(i - 1), right: i % 5 < 4 && visible(i + 1), top: i >= 5 && visible(i - 5), bottom: i < 20 && visible(i + 5) };
  }
  enter(id, side) {
    const next = this.rooms[id];
    if (!next?.exists) return;
    const p = this.p;
    if (next.bombLocked) {
      p.x = clamp8(p.x, 70, 890);
      p.y = clamp8(p.y, 70, 530);
      this.emit("toast", { text: "\u5371\u9669\u85CF\u5BA4\uFF1AB \u70B8\u5899\uFF0C\u6E05\u602A\u5E76\u8EB2\u843D\u7269 12 \u79D2\uFF1B25% \u53EF\u80FD\u4E3A\u7A7A\u3002" });
      return;
    }
    if (next.locked) {
      if (!this.keys) {
        p.x = clamp8(p.x, 70, 890);
        p.y = clamp8(p.y, 70, 530);
        this.emit("toast", { text: next.type === "vault" ? "\u5B88\u536B\u8865\u7ED9\u5E93\uFF1A1 \u628A\u94A5\u5319\u5165\u573A\uFF0C\u6E05\u9664\u4F0F\u51FB\u540E\u6709 75% \u6982\u7387\u83B7\u8865\u7ED9\uFF0C25% \u4E3A\u7A7A\u3002" : "\u9053\u5177\u623F\u4E0A\u9501\uFF1A\u9700\u8981 1 \u628A\u94A5\u5319\u3002\u53EF\u4EE5\u5148\u63A2\u7D22\u5176\u4ED6\u623F\u95F4\u3002" });
        return;
      }
      this.keys--;
      next.locked = false;
    }
    resetChronoRoom(this);
    resetFollowers(this);
    resetDeepseek(this);
    resetPhoebe(this);
    this.footZones = [];
    this.ghostDecoy = null;
    this.wasMemeDash = this.p.dash > 0;
    const fresh = !next.enemies;
    this.room.savedPickup = this.pickup;
    this.explosives = [];
    const oldFloor = this.floor;
    super.enter(id, side);
    if (this.room.savedPickup) this.pickup = this.room.savedPickup;
    this.room.enteredAt = this.elapsed;
    this.room.seen = true;
    for (const n of this.neighbors(id)) if (this.rooms[n].exists) this.rooms[n].seen = true;
    if (fresh && ["fight", "challenge"].includes(this.room.type)) {
      this.room.enemies = spawnEncounter(this, this.room);
    }
    if (this.room.type === "boss" && !this.room.clear) {
      const types = ["collector", "speaker", "catcher", "puppet"];
      if (oldFloor === 5) this.room.enemies = [this.makeBoss("bull", 340, 220), this.makeBoss("meishu", 660, 220)];
      else if (!this.room.bossSet) this.room.enemies = [this.makeBoss(types[oldFloor - 1], 480, 220)];
      this.room.bossSet = true;
      if (oldFloor === 3 && !this.room.hazards?.some((h2) => h2.catcherBelt)) installCatcherArena(this);
    }
    enterResourceRoom(this);
    enterDeepseek(this);
    if (fresh && !this.room.clear) {
      this.room.warmStart = this.elapsed + 2;
      this.room.warmUntil = this.elapsed + 7;
    }
    this.p.inv = Math.max(this.p.inv, 2);
    for (const enemy2 of this.room.enemies) {
      enemy2.cd = Math.max(enemy2.cd || 0, 1.5);
      enemy2.attack = Math.max(enemy2.attack || 0, 1.5);
      enemy2.chargeCD = Math.max(enemy2.chargeCD || 0, 1.5);
    }
    if (this.room.type === "shop") {
      this.room.enemies = [];
      this.room.clear = true;
      this.emit("toast", { text: "\u5546\u5E97\uFF1A\u8D70\u8FD1\u67DC\u53F0\uFF0C\u6309 E \u9009\u8D2D\uFF1B\u91D1\u5E01\u4E0D\u4F1A\u81EA\u52A8\u6263\u9664\u3002" });
    }
    this.emit("room", { room: this.room });
  }
  spawn(type, x, y) {
    if (type === "slime" || type === "shield") type = "brute";
    if (type === "fly") type = "hopper";
    const e = super.spawn(type, x, y);
    e.artChapter = this.floor;
    e.hp = e.maxHp = type === "brute" ? 4 + this.floor : type === "runner" ? 2 + this.floor : 3 + this.floor;
    if (type === "runner") e.r = 17;
    e.wind = 0;
    e.attack = 0;
    e.dx = 1;
    e.dy = 0;
    if (["fight", "challenge", "vault", "cache"].includes(this.room.type)) {
      const extraHp = { brute: 2, forklift: 3, stitchling: 2, warden: 2, loader: 1 }[type] || 0;
      e.hp = e.maxHp = e.maxHp + extraHp;
      e.cd = this.rand(0.65, 1.2);
    }
    return e;
  }
  enemySpeed(e) {
    if (e.repelled > 0) return 0;
    const finaleSpeed = finalSpeed(this, e);
    if (finaleSpeed !== void 0) return finaleSpeed;
    const chapterSpeed = mobSpeed(this, e);
    if (chapterSpeed !== void 0) return chapterSpeed;
    if (STATIONARY.has(e.type)) return 0;
    if (e.type === "tiny") return 175;
    if (e.type === "milkleak") return 140;
    if (e.type === "loader") return 100;
    if (e.type === "stitchling") return 170;
    if (e.type === "jailer") return 185;
    if (e.kind === "collector" && e.longCharge) return 0;
    if (e.kind === "speaker") return e.sound ? 0 : 45;
    if (e.kind === "puppet" && e.puppetSkill) return 0;
    if (e.kind === "catcher") return e.hands || e.handDisabled > 0 ? 0 : 25;
    if (e.type === "boss") return e.wind > 0 ? 0 : e.enraged ? 85 : e.hp < e.maxHp * 0.5 ? 75 : 55;
    if (e.type === "runner") return 190 + this.floor * 4;
    if (e.type === "hopper") return e.wind > 0 ? 0 : 155 + this.floor * 4;
    if (e.type === "brute") return 120 + this.floor * 5;
    if (e.type === "shooter") return 65 + this.floor * 3;
  }
  enemyAttack(e) {
    if (e.type !== "boss" && e.phoneMutedUntil > this.elapsed) {
      e.cd = Math.max(0.1, e.phoneMutedUntil - this.elapsed);
      return true;
    }
    e.artAttackUntil = this.elapsed + 0.3;
    let handled = mobAttack(this, e);
    if (!handled && e.kind === "speaker") {
      startSpeakerAttack(this, e);
      handled = true;
    }
    if (!handled) handled = specialAttack(this, e);
    if (e.type !== "boss" && ["fight", "challenge", "vault", "cache"].includes(this.room.type)) e.cd *= 0.85;
    return handled;
  }
  updateMilkBottles(dt) {
    for (const fx of [...this.effects]) {
      if (fx.type !== "milkBottle") continue;
      if (fx.owner.dead) {
        fx.life = 0;
        continue;
      }
      if (fx.life > 0 && fx.life <= dt && !fx.exploded) {
        fx.exploded = true;
        if (fx.leavesMilk) milkPool(this, fx.x, fx.y, false, fx.radius * 0.6, 3.5);
        this.effects.push({ type: "milkSplash", x: fx.x, y: fx.y, radius: fx.radius, life: 0.35, max: 0.35 });
        this.burst(fx.x, fx.y, "#fff3cf", 22);
        if (Math.hypot(this.p.x - fx.x, this.p.y - fx.y) < fx.radius + this.p.r) this.hurt();
      }
    }
  }
  makeBoss(kind, x, y) {
    const e = super.spawn("boss", x, y);
    e.kind = kind;
    e.hp = e.maxHp = { collector: 100, speaker: 150, catcher: 220, puppet: 290, bull: 280, meishu: 250 }[kind];
    e.cd = kind === "meishu" ? 2.2 : 1.4;
    e.wind = 0;
    e.attack = 0;
    return e;
  }
  offer(title2) {
    if (this.room.type === "fight") return;
    if (this.room.type === "shop") {
      this.room.shopStock ??= this.drawItems(3);
      this.choices = [...this.room.shopStock.map((i) => ({ ...i, name: i.name + " \xB7 " + this.price() + " \u91D1\u5E01" })), ...SUPPLIES, ...shopServices(this)];
      this.mode = "choice";
      this.emit("choice", { title: `\u5546\u5E97 \xB7 \u6301\u6709 ${this.coins} \u91D1\u5E01`, choices: this.choices });
      return;
    }
    this.choices = this.drawItems(this.room.type === "challenge" ? 3 : 1);
    this.mode = "choice";
    this.emit("choice", { title: this.room.type === "treasure" ? "\u53D1\u73B0\u9053\u5177 \xB7 \u62FF\u53D6\u6216\u7559\u5728\u539F\u5730" : title2, choices: this.choices });
  }
  drawItems(n) {
    const available = ITEMS.filter((i) => !this.has(i.id) && i.id !== "tadpole");
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(this.rand(0, i + 1));
      [available[i], available[j]] = [available[j], available[i]];
    }
    return available.slice(0, n);
  }
  price() {
    return this.has("bargain") ? 7 : 10;
  }
  choose(id) {
    const service = chooseService(this, id);
    if (service !== null) return service;
    const exchanged = chooseExchange(this, id);
    if (exchanged !== null) return exchanged;
    const supply = SUPPLIES.find((i) => i.id === id);
    if (supply) {
      if (this.room.type !== "shop" || this.mode !== "choice" || !this.choices.some((i) => i.id === id)) return false;
      if (this.coins < 3) {
        this.emit("toast", { text: "\u8865\u7ED9\u9700\u8981 3 \u91D1\u5E01\u3002" });
        return false;
      }
      if (supply.resource === "health" && this.p.hp >= this.p.maxHp) {
        this.emit("toast", { text: "\u751F\u547D\u5DF2\u6EE1\uFF0C\u4E0D\u9700\u8981\u8D2D\u4E70\u8865\u8840\u5305\u3002" });
        return false;
      }
      this.coins -= 3;
      if (supply.resource === "health") this.p.hp = Math.min(this.p.maxHp, this.p.hp + 2);
      else this[supply.resource]++;
      this.mode = "play";
      this.emit("room");
      this.emit("toast", { text: "\u8865\u7ED9\u5DF2\u653E\u5165\u80CC\u5305\u3002" });
      return true;
    }
    if (this.room.type === "shop") {
      if (this.mode !== "choice" || !this.choices.some((i) => i.id === id)) return false;
      if (!this.room.shopStock?.some((i) => i.id === id)) return false;
      if (this.coins < this.price()) {
        this.emit("toast", { text: "\u91D1\u5E01\u4E0D\u8DB3\uFF0C\u53EF\u4EE5\u7A0D\u540E\u56DE\u6765\u3002" });
        return false;
      }
      this.coins -= this.price();
      this.room.shopSold.push(this.room.shopStock.find((i) => i.id === id));
      this.room.shopStock = this.room.shopStock.filter((i) => i.id !== id);
    }
    const ok = super.choose(id);
    if (ok) this.activeCharge = Math.min(this.activeCost(), this.activeCharge);
    if (ok && this.room.type !== "shop") this.room.pendingItem = false;
    return ok;
  }
  leaveChoice() {
    if (this.mode !== "choice") return;
    if (this.room.type === "start") {
      this.mode = "play";
      return;
    }
    if (this.room.type !== "shop") {
      this.room.pendingItem = true;
      this.room.savedChoices = this.choices;
    }
    this.mode = "play";
  }
  interact() {
    if (this.mode !== "play") return;
    if (canUseRoomWardrobe(this)) {
      this.emit("wardrobe");
      return;
    }
    if (this.room.type === "start" && Math.hypot(this.p.x - 480, this.p.y - 260) < 145 && !this.room.loot.some((l) => l.type === "chest" && Math.hypot(l.x - this.p.x, l.y - this.p.y) < 70)) {
      offerExchange(this);
      return;
    }
    if (this.room.type === "shop" && Math.hypot(this.p.x - 480, this.p.y - 260) < 145) {
      this.offer("\u5546\u5E97");
      return;
    }
    if (this.room.pendingItem) {
      this.choices = this.room.savedChoices;
      this.mode = "choice";
      this.emit("choice", { title: "\u7559\u4E0B\u7684\u9053\u5177", choices: this.choices });
      return;
    }
    const chest = this.room.loot.find((l) => l.type === "chest" && Math.hypot(l.x - this.p.x, l.y - this.p.y) < 70);
    if (chest) {
      if (!this.keys) {
        this.emit("toast", { text: "\u5B9D\u7BB1\u9700\u8981 1 \u628A\u94A5\u5319\u3002" });
        return;
      }
      this.keys--;
      this.room.loot = this.room.loot.filter((l) => l !== chest);
      this.drop("coin", chest.x - 25, chest.y, 5);
      this.drop("bomb", chest.x + 25, chest.y, 1);
      this.drop("heart", chest.x, chest.y + 35, 2);
      this.emit("room");
    }
  }
  drop(type, x, y, amount = 1) {
    const point2 = safeSpot(this.room, x, y);
    this.room.loot.push({ type, x: point2.x, y: point2.y, amount });
  }
  resolveTerrain(actor, x, y, landing = false) {
    if (actor === this.p) moveFrogOnTerrain(this.room, actor, x, y, landing);
    else moveOnTerrain(this.room, actor, x, y);
  }
  enemyContact(e) {
    return mobContact(this, e);
  }
  enemyHeading(e) {
    const ghost = this.ghostDecoy, target2 = ghost && ghost.until > this.elapsed && e.type !== "boss" && !this.canEnemyShoot(e) && e.type !== "shooter" && Math.hypot(e.x - ghost.x, e.y - ghost.y) < 300 ? ghost : this.p;
    return steer(this.room, e, target2);
  }
  hitDevice(o, damage) {
    return hitDevice(this, o, damage);
  }
  projectileBlocked(b, hostile) {
    if (!hostile && b.ghost) return false;
    if (b.rollingRock && this.room.obstacles.some((o) => o.kind === "pit" && overlaps(o, b.x, b.y, b.r))) return true;
    return terrainProjectile(this, b, hostile);
  }
  canBulletHit(e, b) {
    return !(b.rollingRock && (b.hits.size >= 3 || e.airborne || ["fly", "hopper"].includes(e.type)));
  }
  canEnemyShoot(e) {
    return CHAPTER_MOBS[e.type]?.shoot || STATIONARY.has(e.type) || e.type === "loader";
  }
  moveScale(actor) {
    const scale = actor.type === "milkSkater" ? 1 : movementScale(this, actor);
    return scale * (actor === this.p && this.tempuraBuff > 0 ? 1.15 : 1) * (actor === this.p && this.phoebeBoost > 0 ? 1.2 : 1) * (actor === this.p && sandyActive(this) ? 1.35 : 1) * (actor === this.p && mambaActive(this) ? 1.25 : 1) * footZoneScale(this, actor) * (actor !== this.p && actor.rallied > 0 ? 1.3 : 1) * (actor !== this.p && actor.type !== "boss" && ["fight", "challenge", "vault", "cache"].includes(this.room.type) ? 1.1 : 1);
  }
  groundDrift(actor) {
    return groundDrift(this, actor);
  }
  onEnemyKilled(e) {
    e.deadAt = this.elapsed;
    killedGear(this, e);
    mobKilled(this, e);
    killedSpecial(this, e);
  }
  shoot(dx, dy, pet = false) {
    const before = this.bullets.length;
    super.shoot(dx, dy, pet);
    for (const b of this.bullets.slice(before)) {
      b.r += 3;
      if (!pet && this.has("milkfilter")) {
        const wet = onMilk(this, this.p);
        b.damage *= wet ? 1.4 : 1.08;
        b.milkBoost = wet;
      }
      b.life = (this.has("tongue") ? 2.7 : 1.35) * (this.has("megaphone") ? 1.4 : 1);
      if (!pet && this.has("scarf")) b.damage *= this.p.hp <= 2 ? 1.7 : 1.1;
      b.split = this.has("split") && !pet;
      b.homing = this.has("homing");
    }
    prepareGearShot(this, before, pet);
    if (!pet) shapeVoice(this, before);
    prepareMemeShot(this, before, pet);
    prepareDeepseekShot(this, before, pet);
    preparePhoebeShot(this, before, pet);
    castItemVfx(this, before, pet);
  }
  attackInterval() {
    return chronoAttackInterval(this, this.p.rate * voiceStats(this).interval * gearInterval(this) * memeInterval(this) * deepStats(this).interval);
  }
  onBulletBounce(b) {
    bouncedGear(this, b);
    bounceMeme(this, b);
    bounceItemVfx(this, b);
    if (!b.pet && this.has("milkfoam")) milkPool(this, b.x, b.y, true, 42, 2.5);
  }
  hurt() {
    if (sandyActive(this)) return;
    const hp = this.p.hp;
    if (!saveWithButton(this)) super.hurt();
    if (this.p.hp < hp && this.p.hp > 0) {
      hurtMeme(this);
      triggerSandy(this);
    }
  }
  hurtGround() {
    if (this.p.inv > 0 || this.p.dash > 0) return;
    if (this.has("milkboots") && !(this.bootGuardCD > 0)) {
      this.bootGuardCD = 8;
      this.p.inv = 0.65;
      this.emit("toast", { text: "\u8C46\u5305\u96E8\u9774\u6321\u4F4F\u4E86\u5730\u9762\u673A\u5173\uFF018 \u79D2\u540E\u6062\u590D\u3002" });
      return;
    }
    if (guardPhoebe(this)) return;
    this.hurt();
  }
  activeCost() {
    return Math.max(25, (this.has("battery") ? 30 : 45) - (this.has("quietbadge") ? 10 : 0));
  }
  damageEnemy(e, n, credit = true) {
    const before = Math.max(0, e.hp);
    super.damageEnemy(e, n * ghostDamageScale(this, e) * (e.kind === "catcher" && e.handDisabled > 0 ? 1.5 : 1));
    const dealt = Math.max(0, before - Math.max(0, e.hp));
    if (credit) mendGear(this, dealt);
    if (credit && !this.releasingLaugh && dealt > 0) this.activeCharge = Math.min(this.activeCost(), (this.activeCharge || 0) + dealt);
  }
  bulletDamage(e, b) {
    return b.damage * (!b.pet && this.has("starbadge") && e.starMark > 0 ? 1.2 : 1);
  }
  onBulletHit(e, b) {
    hitItemVfx(this, e, b);
    if (b.rollingRock) {
      if (b.hits.size >= 3) b.life = 0;
      if (e.type !== "boss") {
        const a = Math.atan2(b.vy, b.vx);
        e.vx = Math.cos(a) * 180;
        e.vy = Math.sin(a) * 180;
        e.repelled = 0.2;
      }
    }
    hitVoice(this, e, b);
    hitGear(this, e, b);
    hitMeme(this, e, b);
    hitDeepseek(this, e, b);
    if (!b.pet && this.has("milkfoam") && this.random() < 0.2) milkPool(this, e.x, e.y, true, 48, 3);
    if (!b.split) return;
    b.split = false;
    for (const sign of [-1, 1]) {
      const a = Math.atan2(b.vy, b.vx) + sign * 0.7;
      this.bullets.push({ ...b, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420, damage: b.damage * 0.35, r: 5, life: 0.6, shotSpeed: 420, age: 0, returnAfter: 0.25, returned: b.returned, returning: false, hits: new Set(b.hits), split: false });
    }
  }
  canClearRoom(r) {
    return !(r.type === "cache" && r.dangerTime > 0);
  }
  onRoomCleared(r) {
    if (r.clearRewarded) return;
    clearMeme(this, r);
    resetChronoRoom(this);
    r.clearRewarded = true;
    clearGear(this, r);
    clearDeepseek(this, r);
    clearPhoebe(this);
    this.shrimpMeals = [];
    claimResourceRoom(this);
    for (const e of r.enemies) {
      e.sound = null;
      e.muted = false;
      e.hands = null;
    }
    r.obstacles = r.obstacles.filter((o) => o.kind !== "hand");
    this.effects = this.effects.filter((fx) => !["milkBottle", "milkSplash", "dollPod", "milkPool", "mobZone", "mobHeal", "cargoWave"].includes(fx.type));
    this.clears++;
    if (this.has("lunch") && this.clears % 3 === 0) this.p.hp = Math.min(this.p.maxHp, this.p.hp + 1);
    if (r.type === "fight") {
      const needsKey = this.keys === 0 && !this.rooms.some((room) => room.loot.some((l) => l.type === "key"));
      this.keyDryRooms = needsKey ? (this.keyDryRooms || 0) + 1 : 0;
      const roll = this.random();
      const type = this.keyDryRooms >= 3 ? "key" : roll < 0.4 ? null : roll < 0.75 ? "coin" : roll < 0.85 ? "key" : roll < 0.93 ? "bomb" : "heart";
      if (type) {
        this.drop(type, 480, 320, type === "coin" && this.random() >= 0.75 ? 2 : 1);
        if (type === "key") this.keyDryRooms = 0;
      }
    } else if (r.type === "challenge") {
      if (this.random() < 0.5) this.drop("chest", 480, 370);
      else this.offer("\u6311\u6218\u5B8C\u6210 \xB7 \u9009\u62E9\u4E00\u4EF6\u5956\u52B1");
    } else if (r.type === "boss" && this.floor < 5) this.offer("\u5173\u672B\u5956\u52B1 \xB7 \u5E26\u4E0A\u5B83\u7EE7\u7EED\u6551\u5976\u8C46");
    this.emit("room");
  }
  boom(x, y, radius = 130, damage = BOMB_DAMAGE) {
    this.effects.push({ type: "bombBlast", x, y, radius, life: 0.6, max: 0.6 });
    this.burst(x, y, "#f4dd99", 30);
    for (const e of this.room.enemies || []) if (!e.dead && Math.hypot(e.x - x, e.y - y) < radius + e.r) this.damageEnemy(e, damage);
    blastResourceDoors(this, x, y, radius);
    blastDevices(this, x, y, radius);
    blastTerrain(this, x, y, radius);
    this.effects = this.effects.filter((f) => f.type !== "milkPool" || Math.hypot(f.x - x, f.y - y) > radius + f.radius);
    if (Math.hypot(this.p.x - x, this.p.y - y) < radius - 15) this.hurt();
    this.emit("room");
  }
  onFinalBossDefeated() {
    startRescue(this);
  }
  rescueLaugh() {
    return rescueLaugh(this);
  }
  update(dt, input = {}) {
    if (this.mode === "rescue") {
      updateRescue(this, dt);
      return;
    }
    if (this.mode !== "play") return;
    dt = Math.min(dt, 0.04);
    const playerDt = dt, origin = { x: this.p.x, y: this.p.y };
    dt *= chronoStep(this, playerDt);
    const p = this.p, r = this.room;
    for (const e of r.enemies) {
      e.artX = e.x;
      e.artY = e.y;
    }
    if (input.bomb && !this.bombLatch && this.bombs > 0) {
      this.bombs--;
      this.explosives.push({ x: p.x, y: p.y, t: 1.3 });
      this.emit("room");
    }
    this.bombLatch = !!input.bomb;
    if (input.use && !this.useLatch) this.interact();
    this.useLatch = !!input.use;
    if (this.mode !== "play") return;
    updateGear(this, dt);
    this.bootGuardCD = Math.max(0, (this.bootGuardCD || 0) - dt);
    updateActive(this, playerDt, input);
    updateBarrels(this, dt);
    if (this.mode !== "play") return;
    updateResourceRoom(this, dt);
    updateDevices(this, dt);
    updateActors(this, dt);
    updateFinalFight(this, dt);
    updateMobs(this, dt);
    updateGround(this, dt);
    for (const bomb of this.explosives) {
      bomb.t -= dt;
      if (bomb.t <= 0) this.boom(bomb.x, bomb.y);
    }
    this.explosives = this.explosives.filter((b) => b.t > 0);
    for (const e of r.enemies || []) {
      if (e.dead) continue;
      const dx = p.x - e.x, dy = p.y - e.y, len = Math.hypot(dx, dy) || 1;
      e.repelled = Math.max(0, (e.repelled || 0) - dt);
      if (e.type === "brute") e.r = 23;
      if (!(e.repelled > 0) && e.type === "hopper") {
        e.attack = (e.attack || 0) - dt;
        if (e.attack <= 0 && e.wind <= 0) {
          e.wind = e.type === "hopper" ? 0.65 : 0.75;
          e.dx = dx / len;
          e.dy = dy / len;
          e.attack = e.type === "hopper" ? 2.6 : e.enraged ? 2.2 : 2.7;
        }
        if (e.wind > 0) {
          e.wind -= dt;
          if (e.wind <= 0) {
            e.vx = e.dx * (e.type === "hopper" ? 600 : 800);
            e.vy = e.dy * (e.type === "hopper" ? 600 : 800);
          }
        }
      }
      if (e.kind === "speaker") {
        e.r = 54;
        updateSpeaker(this, e, dt);
      }
    }
    this.updateMilkBottles(dt);
    for (const fx of this.effects) if (fx.type === "trap" && fx.life < 0.3 && Math.hypot(p.x - fx.x, p.y - fx.y) < 60) this.hurt();
    const enemies = r.enemies.filter((e) => !e.dead);
    updateFollowers(this, dt);
    updateDeepseek(this, dt, playerDt, input);
    for (const b of this.bullets) {
      const shotDt = b.pet ? dt : playerDt;
      if (b.rollingRock) b.age += dt;
      updateVoice(this, b, shotDt);
      if (b.homing && !b.returning && enemies.length) {
        const e = enemies.reduce((a2, e2) => Math.hypot(a2.x - b.x, a2.y - b.y) < Math.hypot(e2.x - b.x, e2.y - b.y) ? a2 : e2), a = Math.atan2(e.y - b.y, e.x - b.x);
        b.vx += (Math.cos(a) * (b.shotSpeed || 490) - b.vx) * shotDt * 3;
        b.vy += (Math.sin(a) * (b.shotSpeed || 490) - b.vy) * shotDt * 3;
      }
    }
    const oldFloor = this.floor;
    super.update(dt, input, playerDt);
    if (this.room === r && this.mode === "play") {
      updateMeme(this, playerDt, origin);
      afterChronoStep(this, playerDt, origin);
      updatePhoebe(this, dt, playerDt, origin);
    }
    for (const e of r.enemies) {
      const dx = e.x - (e.artX ?? e.x), dy = e.y - (e.artY ?? e.y);
      e.artMoving = Math.hypot(dx, dy) > 0.08;
      if (Math.abs(dx) > 0.08) e.artFacing = dx > 0 ? 1 : -1;
    }
    if (this.floor !== oldFloor) {
      this.emit("toast", { text: `\u7B2C ${this.floor} \u7AE0\uFF1A${CHAPTERS[this.floor - 1]}\u3002\u7EE7\u7EED\u5BFB\u627E\u5976\u8C46\u3002` });
      return;
    }
    if (this.mode !== "play" || this.room !== r) return;
    r.loot = r.loot.filter((l) => {
      if (l.type === "chest") return true;
      const mouse2 = this.followerStates?.mouse, collectedByMouse = mouse2 && ["coin", "key", "bomb"].includes(l.type) && Math.hypot(mouse2.x - l.x, mouse2.y - l.y) < 20;
      if (Math.hypot(p.x - l.x, p.y - l.y) > 32 && !collectedByMouse) return true;
      if (collectedByMouse) {
        mouse2.flash = 0.25;
        this.effects.push({ type: "petCollect", x: l.x, y: l.y, life: 0.3, max: 0.3, radius: 20 });
      }
      if (l.type === "heart") {
        if (p.hp >= p.maxHp) return true;
        p.hp = Math.min(p.maxHp, p.hp + l.amount);
      } else if (l.type === "coin") this.coins += l.amount;
      else if (l.type === "key") this.keys += l.amount;
      else if (l.type === "bomb") this.bombs += l.amount;
      this.emit("room");
      return false;
    });
  }
};

// dist/run-save.js
var RUN_SAVE_KEY = "naiwa-run-v1";
var VERSION = 1;
var MAX_BYTES = 4e6;
var MAX_NODES = 6e4;
var modes = /* @__PURE__ */ new Set(["play", "choice", "rescue", "dead"]);
var unsafe = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
var itemIds = new Set(ITEMS.map((i) => i.id));
var typed = new Map([Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array].map((C) => [C.name, C]));
function encode(root) {
  const seen = /* @__PURE__ */ new Map(), nodes = [];
  function value(v) {
    if (v === void 0) return { special: "undefined" };
    if (typeof v === "number" && !Number.isFinite(v)) return { special: String(v) };
    if (v === null || typeof v !== "object") {
      if (!["string", "number", "boolean"].includes(typeof v) && v !== null) throw Error("Unsupported saved value");
      return v;
    }
    if (seen.has(v)) return { ref: seen.get(v) };
    if (nodes.length >= MAX_NODES) throw Error("Run too large");
    const id = nodes.length;
    seen.set(v, id);
    nodes.push(null);
    if (ArrayBuffer.isView(v) && typed.has(v.constructor.name)) nodes[id] = { type: v.constructor.name, data: Array.from(v) };
    else if (v instanceof Set) nodes[id] = { type: "set", data: [...v].map(value) };
    else if (v instanceof Map) nodes[id] = { type: "map", data: [...v].map(([k, x]) => [value(k), value(x)]) };
    else if (Array.isArray(v)) nodes[id] = { type: "array", data: v.map(value) };
    else nodes[id] = { type: "object", data: Object.entries(v).filter(([k, x]) => !unsafe.has(k) && typeof x !== "function").map(([k, x]) => [k, value(x)]) };
    return { ref: id };
  }
  return { root: value(root), nodes };
}
function decode(graph) {
  if (!graph || !Array.isArray(graph.nodes) || graph.nodes.length > MAX_NODES) throw Error("Invalid graph");
  const objects = graph.nodes.map((n) => {
    if (!n || !Array.isArray(n.data)) throw Error("Invalid node");
    if (typed.has(n.type)) {
      if (!n.data.every(Number.isFinite)) throw Error("Invalid typed array");
      return new (typed.get(n.type))(n.data);
    }
    switch (n.type) {
      case "object":
        return {};
      case "array":
        return [];
      case "set":
        return /* @__PURE__ */ new Set();
      case "map":
        return /* @__PURE__ */ new Map();
      default:
        throw Error("Unknown node");
    }
  });
  function value(v) {
    if (v === null || ["string", "boolean", "number"].includes(typeof v)) return v;
    if (!v || typeof v !== "object") throw Error("Invalid value");
    if (Number.isInteger(v.ref) && v.ref >= 0 && v.ref < objects.length) return objects[v.ref];
    if (v.special === "Infinity") return Infinity;
    if (v.special === "-Infinity") return -Infinity;
    if (v.special === "NaN") return NaN;
    if (v.special === "undefined") return void 0;
    throw Error("Invalid reference");
  }
  graph.nodes.forEach((n, i) => {
    const o = objects[i];
    if (typed.has(n.type)) return;
    if (n.type === "array") for (const x of n.data) o.push(value(x));
    else if (n.type === "set") for (const x of n.data) o.add(value(x));
    else for (const entry of n.data) {
      if (!Array.isArray(entry) || entry.length !== 2) throw Error("Invalid entry");
      const [k, v] = entry;
      if (n.type === "map") o.set(value(k), value(v));
      else {
        if (typeof k !== "string" || unsafe.has(k)) throw Error("Invalid property");
        o[k] = value(v);
      }
    }
  });
  return value(graph.root);
}
function validate(s) {
  if (!s || !modes.has(s.mode) || !Number.isInteger(s.floor) || s.floor < 1 || s.floor > 5 || !Array.isArray(s.rooms) || s.rooms.length !== 25 || !Number.isInteger(s.roomId) || !s.rooms[s.roomId]?.exists || !Array.isArray(s.items) || !s.items.every((id) => itemIds.has(id)) || !s.p) throw Error("Invalid run");
  for (const k of ["x", "y", "hp", "maxHp", "damage", "rate", "speed", "r"]) if (!Number.isFinite(s.p[k])) throw Error("Invalid player");
  for (const k of ["elapsed", "coins", "keys", "bombs", "activeCharge", "kills"]) if (!Number.isFinite(s[k]) || s[k] < 0) throw Error("Invalid counters");
  if (s.p.maxHp < 1 || s.p.hp > s.p.maxHp || s.p.damage <= 0 || s.p.rate <= 0 || s.p.speed <= 0 || s.p.hp < 0 || (s.mode === "dead" ? s.p.hp !== 0 || s.reviveUsed : s.p.hp <= 0)) throw Error("Invalid health");
  for (const k of ["bullets", "enemyBullets", "effects", "particles", "explosives"]) if (!Array.isArray(s[k])) throw Error("Invalid combat state");
  for (const b of s.bullets) if (!(b.hits instanceof Set)) throw Error("Invalid hit history");
  if (s.mode === "choice" && !Array.isArray(s.choices)) throw Error("Invalid choice");
  if (s.mode === "rescue" && !["caged", "breaking", "reunion"].includes(s.rescue?.phase)) throw Error("Invalid rescue");
  for (const [i, r] of s.rooms.entries()) {
    if (r.id !== i || !Array.isArray(r.obstacles) || !Array.isArray(r.loot) || !(r.enemies === null || Array.isArray(r.enemies))) throw Error("Invalid room");
    for (const e of r.enemies || []) if (!Number.isFinite(e.hp) || !Number.isFinite(e.x) || !Number.isFinite(e.y)) throw Error("Invalid enemy");
  }
  if (!Array.isArray(s.rooms[s.roomId].enemies)) throw Error("Unentered room");
}
function serializeRun(game2, { mode = game2.mode, costume = "original", now = Date.now() } = {}) {
  if (mode === "revive") mode = "dead";
  if (mode === "win" || mode === "dead" && game2.reviveUsed) return null;
  if (!modes.has(mode)) throw Error("Cannot save this screen");
  const state2 = { ...game2, mode, events: [], reviveWatch: null };
  delete state2.random;
  validate(state2);
  const text = JSON.stringify({ version: VERSION, savedAt: now, costume, graph: encode(state2) });
  if (text.length > MAX_BYTES) throw Error("Run exceeds storage budget");
  return text;
}
function deserializeRun(text) {
  if (typeof text !== "string" || text.length > MAX_BYTES) throw Error("Invalid save");
  const saved = JSON.parse(text);
  if (saved.version !== VERSION || !Number.isFinite(saved.savedAt)) throw Error("Unsupported save");
  const state2 = decode(saved.graph);
  validate(state2);
  const game2 = Object.create(Game2.prototype);
  for (const [k, v] of Object.entries(state2)) {
    if (k === "room" || k === "random" || k in Game2.prototype) throw Error("Invalid run property");
    game2[k] = v;
  }
  game2.random = Math.random;
  game2.events = [];
  game2.bombLatch = game2.useLatch = game2.activeLatch = false;
  bindFloorEconomy(game2);
  return { game: game2, costume: typeof saved.costume === "string" ? saved.costume : "original", savedAt: saved.savedAt };
}
function createRunStore(storage) {
  return {
    read() {
      let text;
      try {
        text = storage.getItem(RUN_SAVE_KEY);
      } catch {
        return { status: "error", storageBlocked: true };
      }
      try {
        return text ? { status: "ok", ...deserializeRun(text) } : { status: "empty" };
      } catch {
        return { status: "error" };
      }
    },
    write(game2, options) {
      try {
        const text = serializeRun(game2, options);
        if (text === null) storage.removeItem(RUN_SAVE_KEY);
        else storage.setItem(RUN_SAVE_KEY, text);
        return true;
      } catch {
        return false;
      }
    },
    clear() {
      try {
        storage.removeItem(RUN_SAVE_KEY);
        return true;
      } catch {
        return false;
      }
    }
  };
}

// dist/costumes.js
var COSTUMES = Object.freeze([
  { id: "original", name: "\u7ECF\u5178\u5976\u86D9", detail: "\u539F\u6C41\u539F\u5473\uFF0C\u633A\u7740\u809A\u5B50\u53BB\u5192\u9669\u3002", file: "naiwa-pixel-v2.png", accent: "#e8c468" },
  { id: "kobe", name: "\u79D1\u6BD4\u7248\u5976\u86D9", detail: "24 \u53F7\u7D2B\u91D1\u7403\u8863 \xB7 \u7BEE\u7403\u978B", file: "costume-kobe-v1.png", accent: "#b399dc" },
  { id: "kun", name: "\u8521\u5F90\u5764\u7248\u5976\u86D9", detail: "\u4E2D\u5206\u53D1\u578B \xB7 \u9ED1\u886B\u4E0E\u7070\u8272\u80CC\u5E26\u88E4", file: "costume-kun-v1.png", accent: "#aeb9c4" },
  { id: "david", name: "\u5927\u536B\u7248\u5976\u86D9", detail: "\u5243\u9B13\u523A\u53D1 \xB7 \u591C\u4E4B\u57CE\u9EC4\u5939\u514B", file: "costume-david-v1.png", accent: "#89dfce" },
  { id: "phoebe", name: "\u83F2\u6BD4\u7248\u5976\u86D9", detail: "\u91D1\u8272\u957F\u53D1 \xB7 \u767D\u5E3D\u4E0E\u84DD\u767D\u793C\u670D", file: "costume-phoebe-v1.png", accent: "#bcb3ee" },
  { id: "stink", name: "\u81ED\u4F01\u9E45\u7248\u5976\u86D9", detail: "\u7070\u7D2B\u77ED\u53D1 \xB7 \u9AD8\u677E\u706F\u4F01\u9E45\u670D", file: "costume-stink-v1.png", accent: "#b7a7c4" },
  { id: "sweet", name: "\u9999\u4F01\u9E45\u7248\u5976\u86D9", detail: "\u9ED1\u8272\u9F50\u5218\u6D77 \xB7 \u7BA1\u7406\u5458\u4F01\u9E45\u5E3D", file: "costume-sweet-v4.png", accent: "#a3c5cf" },
  { id: "deepseek", name: "DeepSeek \u5A18\u7248\u5976\u86D9", detail: "\u84DD\u8272\u957F\u53D1 \xB7 \u9CB8\u9C7C\u5973\u4EC6\u88D9", file: "costume-deepseek-v2.png", accent: "#91b8ed" },
  { id: "gojo", name: "\u4E94\u6761\u609F\u7248\u5976\u86D9", detail: "\u767D\u8272\u523A\u53D1 \xB7 \u58A8\u955C\u4E0E\u9AD8\u9886\u5236\u670D", file: "costume-gojo-v1.png", accent: "#b8b4e0" },
  { id: "belial", name: "\u8D1D\u5229\u4E9A\u7248\u5976\u86D9", detail: "\u8D1D\u5229\u4E9A\u5C16\u9876\u5934\u578B \xB7 \u72ED\u957F\u53D1\u5149\u773C\u4E0E\u9ED1\u7EA2\u5706\u809A", file: "costume-belial-v3.png", accent: "#cf697c" },
  { id: "sponge", name: "\u6D77\u7EF5\u5B9D\u5B9D\u7248\u5976\u86D9", detail: "\u767D\u886C\u886B\u7EA2\u9886\u5E26 \xB7 \u65B9\u88E4\u4E0E\u6761\u7EB9\u889C", file: "costume-sponge-v1.png", accent: "#f2cd67" },
  { id: "patrick", name: "\u6D3E\u5927\u661F\u7248\u5976\u86D9", detail: "\u7C89\u8272\u5706\u5C16\u5934 \xB7 \u7EFF\u5E95\u7D2B\u82B1\u77ED\u88E4", file: "costume-patrick-v3.png", accent: "#eda4b6" },
  { id: "squid", name: "\u7AE0\u9C7C\u54E5\u7248\u5976\u86D9", detail: "\u9752\u7EFF\u5927\u9F3B\u5B50 \xB7 \u68D5\u8272\u7FFB\u9886\u886B", file: "costume-squid-v3.png", accent: "#9bcbc2" },
  { id: "cat", name: "\u5446\u732B\u7248\u5976\u86D9", detail: "\u84DD\u8272\u732B\u8033\u5957\u88C5 \xB7 \u5976\u6CB9\u809A\u515C", file: "costume-cat-v1.png", accent: "#8dace3" },
  { id: "isaac", name: "\u4EE5\u6492\u7248\u5976\u86D9", detail: "\u4EE5\u6492\u5149\u5934\u4E0E\u9ED1\u773C \xB7 \u84DD\u8272\u6CEA\u75D5 \xB7 \u7EA2\u8272 D6", file: "costume-isaac-v4.png", accent: "#efc4bc" },
  { id: "bluebaby", name: "\u5C0F\u84DD\u4EBA\u7248\u5976\u86D9", detail: "\u84DD\u8272\u76AE\u80A4 \xB7 \u53C9\u5F62\u773C\u775B \xB7 \u4FDD\u7559\u5976\u86D9\u5706\u809A", file: "costume-bluebaby-v1.png", accent: "#8cbde3" },
  { id: "keeper", name: "\u5E97\u4E3B\u7248\u5976\u86D9", detail: "\u7070\u8272\u5706\u5934 \xB7 \u9ED1\u8272\u773C\u6D1E\u4E0E\u5634\u6D1E \xB7 \u65E0\u7FC5\u8180", file: "costume-keeper-v1.png", accent: "#b4b6bf" },
  { id: "apollyon", name: "\u4E9A\u6CE2\u4F26\u7248\u5976\u86D9", detail: "\u7070\u8272\u77F3\u50CF \xB7 \u53CC\u77ED\u89D2\u4E0E\u5C0F\u7FC5\u8180 \xB7 \u5976\u86D9\u5706\u809A", file: "costume-apollyon-v1.png", accent: "#adb0b8" },
  { id: "anon", name: "\u5343\u65E9\u7231\u97F3\u7248\u5976\u86D9", detail: "\u7C89\u8272\u957F\u53D1 \xB7 \u7FBD\u4E18\u6821\u670D", file: "costume-anon-v1.png", accent: "#efb4cf" },
  { id: "sakiko", name: "\u4E30\u5DDD\u7965\u5B50\u7248\u5976\u86D9", detail: "\u84DD\u53D1\u7F16\u8FAB\u4E0E\u9ED1\u7F0E\u5E26 \xB7 \u7FBD\u4E18\u6821\u670D", file: "costume-sakiko-v1.png", accent: "#aab9e7" },
  { id: "tempura", name: "\u5929\u82CF\u7F57\u7248\u5976\u86D9", detail: "\u6D45\u68D5\u77ED\u53D1 \xB7 \u91D1\u9EC4\u867E\u5957\u4E0E\u867E\u5C3E\u978B", file: "costume-tempura-v1.png", accent: "#e8c37c" },
  { id: "pink", name: "\u5976\u7C89", detail: "\u5976\u7C89\u7C89\u8272 \xB7 \u4FDD\u7559\u7ECF\u5178\u5976\u86D9\u8F6E\u5ED3", file: "costume-pink-v1.png", accent: "#eeb7ca" },
  { id: "bikini", name: "\u6BD4\u57FA\u5C3C\u5976\u86D9", detail: "\u7EA2\u767D\u6CE2\u70B9\u6CF3\u88C5 \xB7 \u633A\u7740\u809A\u5B50\u53BB\u6D77\u8FB9", file: "costume-bikini-v1.png", accent: "#ef9e9a" },
  { id: "lotusrain", name: "\u8377\u53F6\u96E8\u8863", detail: "\u8377\u53F6\u96E8\u8863 \xB7 \u5C0F\u7EA2\u96E8\u9774", file: "costume-lotusrain-v1.png", accent: "#8fc58a" },
  { id: "milkman", name: "\u5976\u74F6\u8857\u9001\u5976\u5458", detail: "\u767D\u84DD\u6761\u7EB9\u886B \xB7 \u5976\u6EF4\u5C0F\u5E3D", file: "costume-milkman-v1.png", accent: "#9cc7e8" },
  { id: "magician", name: "\u7B11\u573A\u9B54\u672F\u5E08", detail: "\u8FF7\u4F60\u793C\u5E3D \xB7 \u71D5\u5C3E\u670D", file: "costume-magician-v1.png", accent: "#d9707a" },
  { id: "conductor", name: "\u8FD0\u8F93\u7AD9\u5217\u8F66\u5458", detail: "\u85CF\u9752\u5236\u670D \xB7 \u91D1\u8FB9\u5E3D", file: "costume-conductor-v1.png", accent: "#7f95c9" },
  { id: "safety", name: "\u5DE5\u5382\u5B89\u5168\u5458", detail: "\u6A59\u8272\u5B89\u5168\u5E3D \xB7 \u53CD\u5149\u80CC\u5FC3", file: "costume-safety-v1.png", accent: "#f0a24a" },
  { id: "knight", name: "\u7262\u7B3C\u9A91\u58EB", detail: "\u74F6\u76D6\u5934\u76D4 \xB7 \u7EB8\u677F\u94E0\u7532", file: "costume-knight-v1.png", accent: "#b9c2cf" },
  { id: "astronaut", name: "\u5B87\u822A\u86D9", detail: "\u767D\u8272\u5B87\u822A\u670D \xB7 \u9C7C\u7F38\u5934\u76D4", file: "costume-astronaut-v1.png", accent: "#f2b45a" },
  { id: "newyear", name: "\u65B0\u6625\u5510\u88C5", detail: "\u7EA2\u8272\u5510\u88C5 \xB7 \u91D1\u8272\u76D8\u6263", file: "costume-newyear-v1.png", accent: "#e0544f" },
  { id: "pajama", name: "\u661F\u661F\u7761\u8863", detail: "\u661F\u6708\u7761\u8863 \xB7 \u957F\u7761\u5E3D", file: "costume-pajama-v1.png", accent: "#a9b8ee" }
]);
var COSTUME_KEY = "naiwa-costume-v1";
function costumeById(id) {
  return COSTUMES.find((c) => c.id === id) || COSTUMES[0];
}
function readCostume(storage) {
  try {
    if (storage === void 0) storage = globalThis.localStorage;
    return costumeById(storage?.getItem(COSTUME_KEY)).id;
  } catch {
    return "original";
  }
}
var selected = readCostume();
var selectedCostume = () => selected;
function setCostume(id, storage) {
  selected = costumeById(id).id;
  try {
    if (storage === void 0) storage = globalThis.localStorage;
    storage?.setItem(COSTUME_KEY, selected);
  } catch {
  }
  return selected;
}
var sheets = /* @__PURE__ */ new Map();
var pending = /* @__PURE__ */ new Map();
function costumeImage(id) {
  const def = costumeById(id);
  if (!sheets.has(def.id) && typeof Image !== "undefined") {
    const im = new Image();
    sheets.set(def.id, im);
    loadArt(im, def.file);
  }
  return sheets.get(def.id) || null;
}
function loadCostume(id) {
  const def = costumeById(id), im = costumeImage(def.id);
  if (!im) return Promise.reject(new Error("Images unavailable"));
  if (im.complete && im.naturalWidth) return Promise.resolve(im);
  if (pending.has(def.id)) return pending.get(def.id);
  const wait = new Promise((resolve, reject) => {
    const done = () => {
      cleanup2();
      resolve(im);
    }, fail = () => {
      cleanup2();
      sheets.delete(def.id);
      reject(new Error("Costume failed to load"));
    };
    const cleanup2 = () => {
      im.removeEventListener("load", done);
      im.removeEventListener("error", fail);
      pending.delete(def.id);
    };
    im.addEventListener("load", done, { once: true });
    im.addEventListener("error", fail, { once: true });
    if (im.complete && !im.naturalWidth && im.src) queueMicrotask(fail);
  });
  pending.set(def.id, wait);
  return wait;
}

// dist/creator.js
var CREATOR = { name: "Done", douyin: "35280680285", repository: "https://github.com/kol-mm/naiwa", image: "assets/creator-douyin.jpg" };
function creatorLinks() {
  return `<div class="creator-links" aria-label="\u4F5C\u8005\u4E0E\u6E90\u7801"><button type="button" data-creator-open>\u5173\u6CE8\u4F5C\u8005 @${CREATOR.name}</button><span aria-hidden="true">\xB7</span><a href="${CREATOR.repository}" target="_blank" rel="noopener noreferrer">GitHub \u6E90\u7801 \u2197</a></div>`;
}
var dialog;
function openCreator() {
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.className = "creator-dialog";
    dialog.setAttribute("aria-labelledby", "creator-title");
    dialog.innerHTML = `<button type="button" class="creator-close" aria-label="\u5173\u95ED\u4F5C\u8005\u540D\u7247">\u5173\u95ED \u2715</button><div class="creator-body"><a class="creator-image" href="${CREATOR.image}" target="_blank" rel="noopener" aria-label="\u6253\u5F00\u6296\u97F3\u7801\u539F\u56FE"><img src="${CREATOR.image}" width="1125" height="1680" alt="Done \u7684\u6296\u97F3\u4E2A\u4EBA\u540D\u7247\uFF0C\u6296\u97F3\u53F7 ${CREATOR.douyin}"></a><section class="creator-info"><span class="creator-eyebrow">\u6C60\u5858\u80CC\u540E\u7684\u4F5C\u8005</span><h2 id="creator-title">@${CREATOR.name}</h2><p>\u559C\u6B22\u8FD9\u53EA\u5976\u86D9\u7684\u8BDD\uFF0C\u6B22\u8FCE\u6765\u6296\u97F3\u627E\u6211\u3002</p><label for="creator-account">\u6296\u97F3\u53F7</label><input id="creator-account" value="${CREATOR.douyin}" readonly aria-label="\u4F5C\u8005\u6296\u97F3\u53F7"><div class="creator-actions"><button type="button" data-creator-copy>\u590D\u5236\u6296\u97F3\u53F7</button><a href="${CREATOR.image}" download="Done-\u6296\u97F3\u540D\u7247.jpg">\u4FDD\u5B58\u540D\u7247</a><a href="${CREATOR.repository}" target="_blank" rel="noopener noreferrer">\u67E5\u770B GitHub \u4ED3\u5E93 \u2197</a></div><p class="creator-hint">\u53EF\u7528\u6296\u97F3\u626B\u4E00\u626B\uFF1B\u540C\u4E00\u90E8\u624B\u673A\u53EF\u4FDD\u5B58\u56FE\u7247\u540E\u4ECE\u76F8\u518C\u8BC6\u522B\uFF0C\u4E5F\u53EF\u4EE5\u76F4\u63A5\u641C\u7D22\u6296\u97F3\u53F7\u3002</p><p class="creator-status" role="status" aria-live="polite"></p></section></div>`;
    document.body.append(dialog);
    dialog.querySelector(".creator-close").onclick = () => dialog.close();
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) {
        const r = dialog.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();
      }
    });
    dialog.querySelector("[data-creator-copy]").onclick = async () => {
      const status = dialog.querySelector(".creator-status");
      try {
        await navigator.clipboard.writeText(CREATOR.douyin);
        status.textContent = "\u6296\u97F3\u53F7\u5DF2\u590D\u5236";
      } catch {
        const input = dialog.querySelector("input");
        input.focus();
        input.select();
        status.textContent = "\u8BF7\u957F\u6309\u6216\u6309 Ctrl+C \u590D\u5236\u5DF2\u9009\u4E2D\u7684\u6296\u97F3\u53F7";
      }
    };
    window.addEventListener("keydown", (e) => {
      if (!dialog.open) return;
      e.stopImmediatePropagation();
      if (e.key === "Escape") {
        e.preventDefault();
        dialog.close();
      }
    }, true);
  }
  dialog.querySelector(".creator-status").textContent = "";
  if (!dialog.open) dialog.showModal();
}
function bindCreatorLinks(root) {
  root.querySelectorAll("[data-creator-open]").forEach((button) => button.onclick = openCreator);
}

// dist/costume-regions.js
var COSTUME_REGIONS = { "costume-kobe-v1.png": [[0, 0, 325, 313], [325, 0, 307, 312], [632, 0, 311, 314], [943, 0, 322, 317], [0, 313, 326, 300], [326, 312, 307, 303], [633, 314, 315, 293], [948, 317, 317, 299], [0, 613, 307, 332], [307, 615, 310, 298], [617, 607, 333, 341], [950, 616, 315, 307], [0, 945, 324, 299], [324, 913, 273, 331], [597, 948, 341, 296], [938, 923, 327, 321]], "costume-kun-v1.png": [[0, 0, 319, 308], [319, 0, 302, 308], [621, 0, 309, 308], [930, 0, 335, 310], [0, 308, 319, 301], [319, 308, 302, 301], [621, 308, 313, 301], [934, 310, 331, 300], [0, 609, 297, 325], [297, 609, 299, 299], [596, 609, 339, 329], [935, 610, 330, 302], [0, 934, 315, 310], [315, 908, 337, 336], [652, 938, 270, 306], [922, 912, 343, 332]], "costume-david-v1.png": [[0, 0, 324, 305], [324, 0, 301, 307], [625, 0, 303, 306], [928, 0, 337, 308], [0, 305, 326, 301], [326, 307, 301, 301], [627, 306, 302, 300], [929, 308, 336, 300], [0, 606, 299, 330], [299, 608, 305, 303], [604, 606, 332, 332], [936, 608, 329, 302], [0, 936, 316, 308], [316, 911, 274, 333], [590, 938, 333, 306], [923, 910, 342, 334]], "costume-phoebe-v1.png": [[0, 0, 324, 312], [324, 0, 310, 314], [634, 0, 315, 314], [949, 0, 305, 316], [0, 312, 326, 311], [326, 314, 307, 309], [633, 314, 315, 307], [948, 316, 306, 306], [0, 623, 303, 333], [303, 623, 309, 309], [612, 621, 331, 339], [943, 622, 311, 313], [0, 956, 310, 298], [310, 932, 276, 322], [586, 960, 333, 294], [919, 935, 335, 319]], "costume-stink-v1.png": [[0, 0, 313, 312], [313, 0, 309, 312], [622, 0, 316, 312], [938, 0, 316, 313], [0, 312, 311, 311], [311, 312, 306, 313], [617, 312, 320, 311], [937, 313, 317, 313], [0, 623, 290, 335], [290, 625, 309, 305], [599, 623, 337, 337], [936, 626, 318, 310], [0, 958, 311, 296], [311, 930, 340, 324], [651, 960, 263, 294], [914, 936, 340, 318]], "costume-sweet-v4.png": [[0, 0, 329, 312], [329, 0, 300, 311], [629, 0, 309, 310], [938, 0, 327, 313], [0, 312, 328, 306], [328, 311, 298, 308], [626, 310, 306, 307], [932, 313, 333, 309], [0, 618, 303, 333], [303, 619, 310, 302], [613, 617, 320, 333], [933, 622, 332, 304], [0, 951, 329, 293], [329, 921, 259, 323], [588, 950, 338, 294], [926, 926, 339, 318]], "costume-deepseek-v2.png": [[0, 0, 327, 307], [327, 0, 310, 307], [637, 0, 311, 307], [948, 0, 317, 310], [0, 307, 328, 305], [328, 307, 306, 304], [634, 307, 310, 303], [944, 310, 321, 302], [0, 612, 308, 325], [308, 611, 309, 298], [617, 610, 331, 334], [948, 612, 317, 306], [0, 937, 325, 307], [325, 909, 267, 335], [592, 944, 336, 300], [928, 918, 337, 326]], "costume-gojo-v1.png": [[0, 0, 314, 306], [314, 0, 305, 305], [619, 0, 312, 305], [931, 0, 334, 306], [0, 306, 316, 300], [316, 305, 303, 302], [619, 305, 312, 301], [931, 306, 334, 298], [0, 606, 296, 328], [296, 607, 305, 297], [601, 606, 334, 328], [935, 604, 330, 308], [0, 934, 316, 310], [316, 904, 271, 340], [587, 934, 338, 310], [925, 912, 340, 332]], "costume-belial-v3.png": [[0, 0, 319, 307], [319, 0, 304, 307], [623, 0, 309, 307], [932, 0, 333, 307], [0, 307, 320, 300], [320, 307, 305, 304], [625, 307, 309, 302], [934, 307, 331, 301], [0, 607, 304, 330], [304, 611, 308, 299], [612, 609, 329, 327], [941, 608, 324, 303], [0, 937, 316, 306], [316, 910, 274, 333], [590, 936, 336, 307], [926, 911, 339, 332]], "costume-sponge-v1.png": [[0, 0, 321, 308], [321, 0, 307, 308], [628, 0, 315, 308], [943, 0, 322, 310], [0, 308, 323, 301], [323, 308, 308, 301], [631, 308, 312, 300], [943, 310, 322, 298], [0, 609, 300, 328], [300, 609, 308, 295], [608, 608, 340, 329], [948, 608, 317, 302], [0, 937, 318, 307], [318, 904, 271, 340], [589, 937, 342, 307], [931, 910, 334, 334]], "costume-patrick-v3.png": [[0, 0, 323, 310], [323, 0, 306, 309], [629, 0, 313, 310], [942, 0, 323, 312], [0, 310, 322, 304], [322, 309, 311, 306], [633, 310, 311, 298], [944, 312, 321, 301], [0, 614, 301, 326], [301, 615, 311, 297], [612, 608, 337, 336], [949, 613, 316, 306], [0, 940, 321, 304], [321, 912, 342, 332], [663, 944, 275, 300], [938, 919, 327, 325]], "costume-squid-v3.png": [[0, 0, 326, 312], [326, 0, 307, 312], [633, 0, 313, 313], [946, 0, 319, 315], [0, 312, 327, 302], [327, 312, 310, 303], [637, 313, 311, 293], [948, 315, 317, 300], [0, 614, 303, 331], [303, 615, 313, 298], [616, 606, 337, 343], [953, 615, 312, 305], [0, 945, 323, 299], [323, 913, 275, 331], [598, 949, 342, 295], [940, 920, 325, 324]], "costume-cat-v1.png": [[0, 0, 324, 309], [324, 0, 308, 308], [632, 0, 312, 308], [944, 0, 321, 311], [0, 309, 330, 305], [330, 308, 310, 306], [640, 308, 309, 305], [949, 311, 316, 304], [0, 614, 306, 324], [306, 614, 310, 298], [616, 613, 321, 333], [937, 615, 328, 305], [0, 938, 330, 306], [330, 912, 329, 332], [659, 946, 273, 298], [932, 920, 333, 324]], "costume-isaac-v4.png": [[0, 0, 319, 311], [319, 0, 293, 311], [612, 0, 300, 312], [912, 0, 353, 314], [0, 311, 323, 300], [323, 311, 288, 299], [611, 312, 302, 296], [913, 314, 352, 298], [0, 611, 332, 330], [332, 610, 259, 299], [591, 608, 325, 338], [916, 612, 349, 306], [0, 941, 316, 302], [316, 909, 261, 334], [577, 946, 329, 297], [906, 918, 359, 325]], "costume-bluebaby-v1.png": [[0, 0, 317, 318], [317, 0, 306, 318], [623, 0, 311, 317], [934, 0, 331, 320], [0, 318, 319, 297], [319, 318, 305, 300], [624, 317, 308, 296], [932, 320, 333, 301], [0, 615, 305, 336], [305, 618, 304, 305], [609, 613, 330, 337], [939, 621, 326, 305], [0, 951, 315, 292], [315, 923, 272, 320], [587, 950, 337, 293], [924, 926, 341, 317]], "costume-keeper-v1.png": [[0, 0, 312, 316], [312, 0, 307, 316], [619, 0, 311, 317], [930, 0, 335, 318], [0, 316, 311, 303], [311, 316, 307, 307], [618, 317, 313, 300], [931, 318, 334, 306], [0, 619, 292, 332], [292, 623, 314, 305], [606, 617, 328, 332], [934, 624, 331, 302], [0, 951, 303, 292], [303, 928, 271, 315], [574, 949, 344, 294], [918, 926, 347, 317]], "costume-apollyon-v1.png": [[0, 0, 327, 321], [327, 0, 308, 320], [635, 0, 310, 322], [945, 0, 320, 324], [0, 321, 328, 297], [328, 320, 305, 299], [633, 322, 311, 292], [944, 324, 321, 296], [0, 618, 310, 331], [310, 619, 304, 307], [614, 614, 327, 332], [941, 620, 324, 304], [0, 949, 318, 294], [318, 926, 339, 317], [657, 946, 260, 297], [917, 924, 348, 319]], "costume-anon-v1.png": [[0, 0, 329, 308], [329, 0, 309, 308], [638, 0, 310, 308], [948, 0, 317, 310], [0, 308, 328, 305], [328, 308, 303, 307], [631, 308, 313, 302], [944, 310, 321, 305], [0, 613, 305, 327], [305, 615, 311, 297], [616, 610, 328, 335], [944, 615, 321, 302], [0, 940, 323, 304], [323, 912, 273, 332], [596, 945, 334, 299], [930, 917, 335, 327]], "costume-sakiko-v1.png": [[0, 0, 328, 308], [328, 0, 310, 307], [638, 0, 313, 307], [951, 0, 314, 310], [0, 308, 331, 308], [331, 307, 296, 310], [627, 307, 319, 304], [946, 310, 319, 307], [0, 616, 305, 332], [305, 617, 309, 303], [614, 611, 322, 337], [936, 617, 329, 308], [0, 948, 327, 296], [327, 920, 270, 324], [597, 948, 334, 296], [931, 925, 334, 319]], "costume-tempura-v1.png": [[0, 0, 321, 308], [321, 0, 308, 307], [629, 0, 310, 308], [939, 0, 326, 308], [0, 308, 323, 303], [323, 307, 305, 302], [628, 308, 316, 299], [944, 308, 321, 303], [0, 611, 305, 326], [305, 609, 308, 300], [613, 607, 336, 333], [949, 611, 316, 307], [0, 937, 315, 307], [315, 909, 281, 335], [596, 940, 334, 304], [930, 918, 335, 326]], "costume-pink-v1.png": [[0, 0, 323, 310], [323, 0, 309, 310], [632, 0, 311, 312], [943, 0, 322, 313], [0, 310, 325, 303], [325, 310, 312, 304], [637, 312, 311, 294], [948, 313, 317, 302], [0, 613, 306, 330], [306, 614, 307, 298], [613, 606, 338, 340], [951, 615, 314, 305], [0, 943, 324, 301], [324, 912, 274, 332], [598, 946, 340, 298], [938, 920, 327, 324]], "costume-bikini-v1.png": [[0, 0, 326, 311], [326, 0, 307, 311], [633, 0, 315, 313], [948, 0, 317, 314], [0, 311, 329, 302], [329, 311, 310, 300], [639, 313, 310, 292], [949, 314, 316, 298], [0, 613, 303, 331], [303, 611, 312, 301], [615, 605, 336, 341], [951, 612, 314, 308], [0, 944, 321, 300], [321, 912, 282, 332], [603, 946, 336, 298], [939, 920, 326, 324]], "costume-lotusrain-v1.png": [[67, 4, 202, 288], [368, 5, 203, 287], [668, 3, 204, 289], [973, 4, 205, 287], [61, 310, 217, 281], [368, 314, 203, 276], [669, 315, 216, 276], [975, 315, 212, 275], [41, 622, 240, 274], [320, 622, 258, 276], [625, 621, 282, 275], [948, 623, 249, 274], [48, 963, 227, 255], [345, 918, 229, 228], [599, 970, 298, 248], [936, 924, 274, 294]], "costume-milkman-v1.png": [[75, 4, 191, 291], [384, 4, 190, 291], [690, 3, 193, 292], [1e3, 6, 192, 289], [71, 312, 192, 285], [384, 314, 186, 283], [693, 316, 187, 281], [1005, 318, 187, 278], [56, 621, 212, 279], [339, 621, 240, 280], [646, 616, 270, 284], [978, 621, 222, 279], [65, 965, 202, 252], [371, 912, 198, 231], [624, 966, 287, 251], [961, 924, 245, 293]], "costume-magician-v1.png": [[79, 11, 188, 283], [386, 11, 184, 283], [693, 10, 188, 284], [1002, 11, 196, 283], [71, 318, 208, 276], [384, 319, 186, 276], [691, 318, 206, 277], [1002, 323, 203, 272], [57, 617, 220, 280], [340, 614, 252, 283], [645, 615, 266, 284], [978, 619, 222, 276], [69, 967, 202, 250], [372, 914, 199, 235], [626, 974, 286, 244], [956, 926, 255, 289]], "costume-conductor-v1.png": [[73, 5, 190, 290], [379, 5, 191, 290], [684, 6, 190, 289], [993, 7, 192, 288], [65, 318, 197, 279], [380, 318, 183, 280], [682, 319, 191, 277], [992, 320, 191, 274], [56, 618, 210, 281], [334, 619, 242, 281], [633, 617, 272, 284], [966, 621, 222, 278], [64, 965, 199, 254], [367, 914, 191, 234], [617, 969, 283, 251], [943, 925, 248, 293]], "costume-safety-v1.png": [[78, 4, 189, 292], [376, 4, 190, 292], [676, 4, 193, 292], [983, 8, 191, 288], [69, 311, 198, 285], [382, 311, 184, 285], [674, 313, 194, 283], [985, 315, 186, 281], [53, 607, 216, 293], [333, 608, 243, 292], [639, 606, 266, 294], [965, 614, 224, 286], [65, 953, 202, 264], [368, 907, 194, 238], [616, 959, 289, 261], [946, 919, 253, 298]], "costume-knight-v1.png": [[75, 6, 183, 289], [369, 6, 183, 289], [683, 4, 184, 290], [998, 8, 185, 287], [62, 311, 198, 286], [374, 311, 179, 286], [678, 314, 191, 283], [1001, 314, 185, 279], [47, 607, 217, 292], [324, 607, 244, 292], [636, 605, 262, 296], [961, 607, 238, 293], [62, 959, 199, 260], [363, 918, 189, 235], [616, 963, 283, 256], [951, 918, 249, 301]], "costume-astronaut-v1.png": [[74, 7, 204, 286], [378, 5, 206, 287], [682, 4, 209, 289], [998, 9, 199, 284], [66, 313, 207, 283], [383, 313, 197, 283], [689, 314, 202, 282], [999, 315, 202, 281], [53, 619, 223, 283], [337, 617, 250, 285], [640, 615, 275, 288], [973, 623, 234, 279], [62, 974, 209, 243], [367, 916, 205, 229], [611, 983, 297, 236], [948, 929, 268, 289]], "costume-newyear-v1.png": [[76, 19, 192, 274], [385, 19, 188, 274], [691, 19, 192, 274], [1003, 23, 191, 270], [71, 328, 196, 268], [387, 328, 187, 268], [700, 332, 183, 264], [1011, 334, 187, 261], [54, 631, 216, 269], [340, 634, 244, 266], [647, 619, 272, 281], [983, 636, 220, 262], [68, 988, 204, 230], [376, 926, 197, 218], [628, 993, 286, 224], [963, 943, 249, 272]], "costume-pajama-v1.png": [[72, 2, 193, 295], [373, 2, 189, 295], [676, 2, 197, 295], [987, 5, 196, 292], [65, 313, 201, 285], [374, 314, 197, 285], [677, 315, 203, 283], [993, 319, 201, 279], [48, 619, 233, 280], [327, 620, 258, 279], [635, 616, 272, 286], [964, 623, 232, 275], [62, 971, 202, 248], [364, 913, 201, 229], [606, 974, 296, 243], [943, 937, 268, 283]] };

// dist/hero-art.js
var sheet = typeof Image === "undefined" ? null : new Image();
if (sheet) loadArt(sheet, "naiwa-pixel-v2.png");
var tinted = /* @__PURE__ */ new Map();
function heroFrame(g) {
  if (g.sandy?.left > 0) return g.p.dash > 0 ? 13 : g.heroMoving ? 4 + Math.floor((g.actionClock || 0) * 12) % 4 : 8 + Math.floor((g.actionClock || 0) * 12) % 4;
  const p = g.p, t = g.elapsed;
  if ((g.heroHurtUntil || 0) > t) return 15;
  if (p.dash > 0) return p.dash > 0.17 ? 12 : 13;
  if ((g.heroLandUntil || 0) > t) return 14;
  if ((g.heroLaughUntil || 0) > t) return 8 + Math.floor(t * 12) % 4;
  if (g.heroMoving) return 4 + Math.floor(t * 10) % 4;
  return Math.floor(t * 3) % 4;
}
function drawHero(c, g, x, y, size = 1, ghost = false, style = {}) {
  const id = style.costumeId ?? selectedCostume(), costume = costumeById(id), candidate = id === "original" ? sheet : costumeImage(id);
  const active = candidate?.complete && candidate.naturalWidth ? candidate : sheet;
  if (!active?.complete || !active.naturalWidth) return false;
  const file = active === sheet ? "naiwa-pixel-v2.png" : costume.file;
  const frame2 = style.frame ?? heroFrame(g), r = heroDrawRect(active, frame2, file);
  c.save();
  c.translate(Math.round(x), Math.round(y));
  c.scale(size, size);
  if (!ghost) {
    c.fillStyle = "#25343c35";
    c.fillRect(-19, 19, 38, 6);
  }
  if (!ghost && style.frame === void 0 && g.p.dash > 0) c.translate(0, -Math.round(Math.sin(Math.PI * (1 - Math.min(1, g.p.dash / FROG_JUMP_SECONDS))) * 30));
  if ((style.face ?? g.p.face) > 0) c.scale(-1, 1);
  c.imageSmoothingEnabled = false;
  if (style.tint) {
    const key = file + frame2 + style.tint;
    let tile5 = tinted.get(key);
    if (!tile5) {
      if (tinted.size >= 160) tinted.clear();
      tile5 = document.createElement("canvas");
      tile5.width = tile5.height = 140;
      const tc = tile5.getContext("2d");
      tc.imageSmoothingEnabled = false;
      tc.drawImage(active, r.left, r.top, r.w, r.h, r.dx + 70, r.dy + 90, r.dw, r.dh);
      tc.globalCompositeOperation = "source-in";
      tc.fillStyle = style.tint;
      tc.fillRect(0, 0, 140, 140);
      tinted.set(key, tile5);
    }
    c.drawImage(tile5, -70, -90, 140, 140);
  } else c.drawImage(active, r.left, r.top, r.w, r.h, r.dx, r.dy, r.dw, r.dh);
  c.restore();
  return true;
}
function heroDrawRect(image, frame2, file = "naiwa-pixel-v2.png") {
  const col = frame2 % 4, row3 = Math.floor(frame2 / 4), cw = image.naturalWidth / 4, ch = image.naturalHeight / 4;
  if (COSTUME_REGIONS[file]) {
    const [left, top, w, h2] = COSTUME_REGIONS[file][frame2], scale = 90 / ch;
    return { left, top, w, h: h2, dx: (left - (col + 0.5) * cw) * scale, dy: (top - (row3 + 1) * ch) * scale + 25, dw: w * scale, dh: h2 * scale };
  }
  const r = atlasRegion(file, 4, 4, row3, col, image.naturalWidth, image.naturalHeight);
  return { ...r, dx: -45 + (r.left - col * cw) * 90 / cw, dy: -65 + (r.top - row3 * ch) * 90 / ch, dw: r.w * 90 / cw, dh: r.h * 90 / ch };
}

// dist/rotate-view.js
var ROTATE_KEY = "naiwa-rotate-direction";
var EDGES = { cw: { top: "right", right: "bottom", bottom: "left", left: "top" }, ccw: { top: "left", right: "top", bottom: "right", left: "bottom" } };
var state = { dir: null, width: 0, height: 0 };
var watchers = /* @__PURE__ */ new Set();
var sessionDirections = /* @__PURE__ */ new WeakMap();
function savedDirection(view) {
  if (sessionDirections.has(view)) return sessionDirections.get(view);
  try {
    return view.localStorage?.getItem(ROTATE_KEY) === "ccw" ? "ccw" : "cw";
  } catch {
    return "cw";
  }
}
function flipDirection(view) {
  const next = savedDirection(view) === "cw" ? "ccw" : "cw";
  sessionDirections.set(view, next);
  try {
    view.localStorage?.setItem(ROTATE_KEY, next);
  } catch {
  }
}
function sidewaysDirection(view, size) {
  if (!(size.height > size.width)) return null;
  let coarse = false;
  try {
    coarse = !!view.matchMedia?.("(pointer:coarse)")?.matches;
  } catch {
  }
  return coarse ? savedDirection(view) : null;
}
function toVirtualPoint(x, y) {
  if (state.dir === "cw") return { x: y, y: state.width - x };
  if (state.dir === "ccw") return { x: state.height - y, y: x };
  return { x, y };
}
function toVirtualDelta(dx, dy) {
  if (state.dir === "cw") return { x: dy, y: -dx };
  if (state.dir === "ccw") return { x: -dy, y: dx };
  return { x: dx, y: dy };
}
function virtualRect(element) {
  const r = element.getBoundingClientRect();
  if (!state.dir) return r;
  const a = toVirtualPoint(r.left, r.top), b = toVirtualPoint(r.left + r.width, r.top + r.height);
  const left = Math.min(a.x, b.x), top = Math.min(a.y, b.y), width = Math.abs(a.x - b.x), height = Math.abs(a.y - b.y);
  return { left, top, width, height, right: left + width, bottom: top + height, x: left, y: top };
}
var length = (value) => {
  const m = /^(-?\d*\.?\d+)(px|em|rem)?$/.exec(value.trim());
  return m ? parseFloat(m[1]) * (m[2] && m[2] !== "px" ? 16 : 1) : NaN;
};
function evaluateMedia(text, { width, height, real }) {
  const queries = String(text).split(",");
  let any = false;
  for (const query of queries) {
    let s = query.trim().toLowerCase(), negate = false, ok = true;
    if (!s) continue;
    if (s.startsWith("only ")) s = s.slice(5).trim();
    if (s.startsWith("not ")) {
      negate = true;
      s = s.slice(4).trim();
    }
    for (const part of s.split(/\s+and\s+/)) {
      if (part === "all" || part === "screen") continue;
      if (/^[a-z-]+$/.test(part)) {
        ok = false;
        continue;
      }
      const m = /^\(\s*([a-z-]+)\s*(?::\s*([^()]*?))?\s*\)$/.exec(part);
      if (!m) return null;
      const [, name, value = ""] = m;
      let result;
      if (/^(min|max)-(width|height)$/.test(name)) {
        const limit = length(value);
        if (Number.isNaN(limit)) return null;
        const size = name.endsWith("width") ? width : height;
        result = name.startsWith("min") ? size >= limit : size <= limit;
      } else if (name === "orientation") result = value === (width > height ? "landscape" : "portrait");
      else if (/width|height|aspect-ratio|resolution|device-/.test(name)) return null;
      else result = !!real(value ? `(${name}:${value})` : `(${name})`);
      ok = ok && result;
    }
    if (negate ? !ok : ok) any = true;
  }
  return any;
}
var UNITS = /(^|[^\w.-])(-?(?:\d+\.?\d*|\.\d+))(dvh|svh|lvh|vh|dvw|svw|lvw|vw|dvmin|svmin|lvmin|vmin|dvmax|svmax|lvmax|vmax)(?![\w-])/g;
var INSETS = /env\(\s*safe-area-inset-(top|right|bottom|left)/g;
var PAN_Y = /touch-action\s*:\s*pan-y(?=\s*(?:;|!|$))/g;
var NEEDS = /\d(?:dvh|svh|lvh|vh|dvw|svw|lvw|vw|dvmin|svmin|lvmin|vmin|dvmax|svmax|lvmax|vmax)(?![\w-])|safe-area-inset|touch-action\s*:\s*pan-y/;
function rotateStyleText(text, dir) {
  const edge = EDGES[dir];
  if (!edge) return text;
  return text.replace(UNITS, (match, before, number, unit) => {
    const axis = unit.includes("min") ? "min" : unit.includes("max") ? "max" : unit.endsWith("h") ? "h" : "w";
    const base = axis === "h" ? "var(--game-vh)" : axis === "w" ? "var(--game-vw)" : `${axis}(var(--game-vw), var(--game-vh))`;
    const k = parseFloat(number) / 100;
    return before + (k === 1 ? base : `calc(${base} * ${+k.toFixed(6)})`);
  }).replace(INSETS, (match, side) => `env(safe-area-inset-${edge[side]}`).replace(PAN_Y, "touch-action: pan-x pan-y");
}
var seenSheets = /* @__PURE__ */ new WeakSet();
var mediaRules = [];
var styleRules = [];
function collect(doc) {
  for (const sheet2 of doc.styleSheets || []) {
    if (seenSheets.has(sheet2)) continue;
    let rules;
    try {
      rules = sheet2.cssRules;
    } catch {
      continue;
    }
    if (!rules) continue;
    seenSheets.add(sheet2);
    const walk = (list) => {
      for (const rule of list) {
        if (rule.media && rule.cssRules && !rule.styleSheet) mediaRules.push({ rule, text: rule.media.mediaText, applied: rule.media.mediaText });
        if (rule.style && NEEDS.test(rule.style.cssText)) styleRules.push({ rule, text: rule.style.cssText, dir: null });
        if (rule.cssRules) walk(rule.cssRules);
      }
    };
    walk(rules);
  }
}
function applySheets(doc, view) {
  collect(doc);
  const { dir } = state, real = (query) => {
    try {
      return view.matchMedia(query).matches;
    } catch {
      return false;
    }
  };
  for (const entry of styleRules) {
    if (entry.dir === dir) continue;
    entry.rule.style.cssText = dir ? rotateStyleText(entry.text, dir) : entry.text;
    entry.dir = dir;
  }
  for (const entry of mediaRules) {
    let next = entry.text;
    if (dir) {
      const result = evaluateMedia(entry.text, { width: state.height, height: state.width, real });
      if (result !== null) next = result ? "all" : "not all";
    }
    if (next !== entry.applied) {
      entry.rule.media.mediaText = next;
      entry.applied = next;
    }
  }
}
function applyRotation({ doc, view, dir, width, height }) {
  const was = state.dir;
  Object.assign(state, { dir: dir || null, width, height });
  if (!state.dir && !was) return false;
  const root = doc.documentElement;
  if (root.dataset) {
    if (state.dir) root.dataset.rotated = state.dir;
    else delete root.dataset.rotated;
  }
  root.style?.setProperty?.("--real-w", width + "px");
  root.style?.setProperty?.("--real-h", height + "px");
  applySheets(doc, view);
  watchers.forEach((check) => check());
  return state.dir !== was;
}
function viewportMedia(query, view = window) {
  const real = view.matchMedia(query), listeners = /* @__PURE__ */ new Set();
  const evaluate = () => {
    const v = view.visualViewport, size = { width: Math.round(v?.width > 0 ? v.width : view.innerWidth), height: Math.round(v?.height > 0 ? v.height : view.innerHeight) };
    if (!sidewaysDirection(view, size)) return real.matches;
    const result = evaluateMedia(query, { width: size.height, height: size.width, real: (q) => view.matchMedia(q).matches });
    return result === null ? real.matches : result;
  };
  let last2 = evaluate();
  const check = () => {
    const now = evaluate();
    if (now === last2) return;
    last2 = now;
    const event = { matches: now, media: query };
    listeners.forEach((fn) => fn(event));
  };
  real.addEventListener("change", check);
  watchers.add(check);
  return { media: query, get matches() {
    return evaluate();
  }, addEventListener(type, fn) {
    if (type === "change") listeners.add(fn);
  }, removeEventListener(type, fn) {
    listeners.delete(fn);
  } };
}

// dist/wardrobe.js
function createWardrobe({ onOpen, onClose }) {
  const layer = document.createElement("div");
  layer.className = "wardrobe-layer";
  layer.hidden = true;
  layer.innerHTML = `<section class="wardrobe" role="dialog" aria-modal="true" aria-labelledby="wardrobeTitle">
 <header class="wardrobe-heading"><div><span>NAIWA'S WARDROBE</span><h2 id="wardrobeTitle">\u5976\u86D9\u7684\u8863\u6A71</h2></div><button class="wardrobe-close" aria-label="\u5173\u95ED\u8863\u6A71">\u8FD4\u56DE \xD7</button></header>
 <div class="wardrobe-body"><div class="wardrobe-stage"><div class="wardrobe-preview" data-state="equipped"><span class="wardrobe-badge"></span><canvas width="240" height="240" aria-label="\u65F6\u88C5\u52A8\u4F5C\u9884\u89C8"></canvas><strong class="wardrobe-name"></strong><p class="wardrobe-detail"></p><div class="wardrobe-poses" aria-label="\u9884\u89C8\u52A8\u4F5C">${["\u7AD9\u7ACB", "\u8D70\u8DEF", "\u5927\u7B11", "\u86D9\u8DF3", "\u53D7\u4F24"].map((n, i) => `<button data-pose="${i}" aria-pressed="${i === 0}">${n}</button>`).join("")}</div></div>
 <div class="wardrobe-footer"><div><span class="wardrobe-status" role="status"></span><small>\u4EC5\u6539\u53D8\u5916\u89C2 \xB7 \u5168\u90E8\u53EF\u7A7F\u6234 \xB7 \u81EA\u52A8\u8BB0\u4F4F\u9009\u62E9</small></div><button class="wardrobe-equip">\u7A7F\u4E0A\u8FD9\u5957</button></div></div>
 <div class="wardrobe-selection"><div class="wardrobe-scroll-hint"><strong>\u5168\u90E8 ${COSTUMES.length} \u5957</strong><span>\u70B9\u5361\u7247\u9884\u89C8 \xB7 \u4E0A\u4E0B\u6ED1\u52A8 \u2193</span></div><div class="wardrobe-catalog" aria-label="\u9009\u62E9\u65F6\u88C5">${COSTUMES.map((c) => `<button class="costume-card" data-costume="${c.id}" aria-pressed="false" style="--costume-accent:${c.accent}"><canvas width="110" height="110" aria-hidden="true"></canvas><strong>${c.name}</strong><span class="costume-tag"></span></button>`).join("")}</div></div></div></section>`;
  document.body.append(layer);
  const q = (s) => layer.querySelector(s), cards = [...layer.querySelectorAll("[data-costume]")], preview = q(".wardrobe-preview canvas"), ctx2 = preview.getContext("2d"), fake = { p: { face: -1 } };
  let open = false, choice = selectedCostume(), pose = 0, tick = 0, raf = 0, last2 = 0, token = 0, previousFocus, available = false;
  function labels() {
    const worn = selectedCostume();
    for (const b of cards) {
      b.setAttribute("aria-pressed", String(b.dataset.costume === choice));
      b.dataset.equipped = String(b.dataset.costume === worn);
      b.querySelector(".costume-tag").textContent = b.dataset.costume === worn ? "\u5DF2\u7A7F\u6234" : b.dataset.costume === choice ? "\u9884\u89C8\u4E2D" : "\u8BD5\u7A7F";
    }
    q(".wardrobe-preview").dataset.state = choice === worn ? "equipped" : "preview";
    q(".wardrobe-badge").textContent = choice === worn ? "\u5F53\u524D\u7A7F\u6234" : "\u9884\u89C8\u4E2D \xB7 \u5C1A\u672A\u7A7F\u4E0A";
    q(".wardrobe-equip").disabled = !available || choice === selectedCostume();
    q(".wardrobe-equip").textContent = choice === selectedCostume() ? "\u5DF2\u7A7F\u6234" : "\u7A7F\u4E0A\u8FD9\u5957";
  }
  function paint(canvas2, id, frame3, size, x, y) {
    const c = canvas2.getContext("2d");
    c.clearRect(0, 0, canvas2.width, canvas2.height);
    c.imageSmoothingEnabled = false;
    drawHero(c, fake, x, y, size, true, { frame: frame3, costumeId: id, face: -1 });
  }
  async function select(id) {
    choice = costumeById(id).id;
    available = false;
    const own = ++token, c = costumeById(choice);
    q(".wardrobe-name").textContent = c.name;
    q(".wardrobe-detail").textContent = c.detail;
    q(".wardrobe-status").textContent = "\u6B63\u5728\u51C6\u5907\u52A8\u4F5C\u56FE\u2026";
    labels();
    try {
      await loadCostume(choice);
      if (!open || own !== token) return;
      available = true;
      q(".wardrobe-status").textContent = choice === selectedCostume() ? "\u6B63\u5728\u7A7F\u6234\u8FD9\u5957\u65F6\u88C5" : "\u5148\u8BD5\u7A7F\uFF0C\u6EE1\u610F\u540E\u70B9\u51FB\u7A7F\u6234";
      labels();
    } catch {
      if (open && own === token) q(".wardrobe-status").textContent = "\u52A8\u4F5C\u56FE\u672A\u52A0\u8F7D\u6210\u529F\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9\u91CD\u8BD5\u3002";
    }
  }
  function frame2(now) {
    if (!open) return;
    tick += Math.max(0, Math.min(0.05, (now - last2) / 1e3 || 0));
    last2 = now;
    const sequences = [[0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11], [12, 13, 13, 14, 0], [15, 15, 0, 0]], seq = sequences[pose], index2 = seq[Math.floor(tick * (pose === 0 ? 3 : 8)) % seq.length];
    ctx2.clearRect(0, 0, 240, 240);
    if (available) paint(preview, choice, index2, 2.35, 120, 176);
    raf = requestAnimationFrame(frame2);
  }
  const painted = /* @__PURE__ */ new Set();
  async function thumbnail(b) {
    if (painted.has(b)) return;
    try {
      await loadCostume(b.dataset.costume);
      paint(b.querySelector("canvas"), b.dataset.costume, 0, 1.1, 55, 80);
      painted.add(b);
      observer?.unobserve(b);
    } catch {
      b.querySelector(".costume-tag").textContent = "\u52A0\u8F7D\u5931\u8D25 \xB7 \u70B9\u51FB\u91CD\u8BD5";
    }
  }
  const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver((entries2) => {
    for (const e of entries2) if (e.isIntersecting) thumbnail(e.target);
  }, { root: q(".wardrobe-catalog"), rootMargin: "100px" });
  function observeCards() {
    for (const b of cards) if (!b.hidden && !painted.has(b)) {
      if (observer) observer.observe(b);
      else thumbnail(b);
    }
  }
  function close() {
    if (!open) return;
    open = false;
    token++;
    observer?.disconnect();
    cancelAnimationFrame(raf);
    layer.hidden = true;
    onClose();
    previousFocus?.focus({ preventScroll: true });
  }
  cards.forEach((b) => b.onclick = () => select(b.dataset.costume));
  layer.querySelectorAll("[data-pose]").forEach((b) => b.onclick = () => {
    pose = Number(b.dataset.pose);
    tick = 0;
    layer.querySelectorAll("[data-pose]").forEach((p) => p.setAttribute("aria-pressed", String(p === b)));
  });
  q(".wardrobe-close").onclick = close;
  layer.addEventListener("click", (e) => {
    if (e.target === layer) close();
  });
  q(".wardrobe-equip").onclick = () => {
    if (!available) return;
    setCostume(choice);
    labels();
    q(".wardrobe-status").textContent = "\u5DF2\u7A7F\u4E0A\uFF1A" + costumeById(choice).name;
  };
  window.addEventListener("keydown", (e) => {
    if (!open) return;
    e.stopImmediatePropagation();
    if (["escape", "p"].includes(e.key.toLowerCase())) {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      const targets = [...layer.querySelectorAll("button:not(:disabled)")].filter((el) => !el.hidden && el.getClientRects().length), first = targets[0], last3 = targets.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last3.focus();
      } else if (!e.shiftKey && document.activeElement === last3) {
        e.preventDefault();
        first.focus();
      }
    }
  }, true);
  window.addEventListener("keyup", (e) => {
    if (open) e.stopImmediatePropagation();
  }, true);
  viewportMedia("(orientation:portrait)").addEventListener("change", close);
  return { open() {
    if (open || onOpen() === false) return;
    previousFocus = document.activeElement;
    open = true;
    layer.hidden = false;
    last2 = performance.now();
    select(selectedCostume());
    q(".wardrobe-close").focus();
    observeCards();
    raf = requestAnimationFrame(frame2);
  }, close, isOpen: () => open };
}

// dist/laugh-ready.js
var states = /* @__PURE__ */ new WeakMap();
function updateLaughReady(g, dt = 0) {
  let s = states.get(g);
  if (!s) {
    s = { ready: false, flash: 0, phase: 0 };
    states.set(g, s);
  }
  if (g.mode !== "play") return s;
  const ready2 = g.activeCharge >= g.activeCost();
  s.phase += Math.max(0, dt);
  s.flash = ready2 && !s.ready ? 0.8 : ready2 ? Math.max(0, s.flash - Math.max(0, dt)) : 0;
  s.ready = ready2;
  return s;
}
function laughReadyState(g) {
  return states.get(g) || { ready: false, flash: 0, phase: 0 };
}
var block2 = (c, x, y, w, h2, color) => {
  c.fillStyle = color;
  c.fillRect(Math.round(x / 2) * 2, Math.round(y / 2) * 2, w, h2);
};
function drawLaughReady(c, g, reducedMotion2 = false) {
  const s = laughReadyState(g);
  if (g.mode !== "play" || !s.ready || g.activeCharge < g.activeCost()) return;
  const x = g.p.x, y = Math.max(24, g.p.y - 77), gold2 = "#ffd66e", cream4 = "#fff6c9", ink5 = "#473e2e";
  c.save();
  block2(c, x - 16, y - 12, 32, 24, ink5);
  block2(c, x - 14, y - 10, 28, 20, gold2);
  block2(c, x - 10, y - 3, 4, 6, ink5);
  block2(c, x - 6, y - 6, 4, 12, ink5);
  for (const side of [-1, 1]) {
    block2(c, x + 2, y + side * 4, 4, 2, ink5);
    block2(c, x + 6, y + side * 7, 4, 2, ink5);
  }
  block2(c, x + 4, y - 2, 2, 4, ink5);
  block2(c, x + 10, y - 5, 2, 10, ink5);
  if (s.flash > 0 && !reducedMotion2) {
    const t = 1 - s.flash / 0.8, r = 30 + t * 26;
    c.globalAlpha = Math.min(1, s.flash * 2.5);
    for (const side of [-1, 1]) {
      const sx = x + side * r, sy = g.p.y - 25;
      block2(c, sx, sy - 12, 4, 24, ink5);
      block2(c, sx, sy - 10, 2, 20, gold2);
      for (const v of [-1, 1]) {
        block2(c, sx - side * 6, sy + v * 14, 8, 4, ink5);
        block2(c, sx - side * 4, sy + v * 14, 4, 2, cream4);
      }
      block2(c, x + side * (18 + t * 28), y - 20 - t * 10, 4, 4, gold2);
    }
  }
  c.restore();
}

// dist/audio-unlock.js
var pending2 = /* @__PURE__ */ new WeakSet();
var SILENT_PRIME = Symbol("silent media priming");
function unlockSilent(audio, isActive) {
  if (pending2.has(audio) || isActive()) return;
  pending2.add(audio);
  audio.muted = true;
  const finish2 = () => {
    pending2.delete(audio);
    if (!isActive()) {
      audio.muted = true;
      audio.pause();
      audio.currentTime = 0;
    }
  };
  audio[SILENT_PRIME] = true;
  try {
    const result = audio.play();
    audio.pause();
    audio.currentTime = 0;
    Promise.resolve(result).then(finish2, finish2);
  } catch {
    finish2();
  } finally {
    audio[SILENT_PRIME] = false;
  }
}

// dist/buffered-audio.js
var BufferedAudio = class extends EventTarget {
  constructor(url, { getContext, fetchAudio = (url2) => artReady().then(() => fetch(url2)) } = {}) {
    super();
    this.url = url;
    this.getContext = getContext;
    this.fetchAudio = fetchAudio;
    this.paused = true;
    this.ended = false;
    this._muted = true;
    this._volume = 1;
    this.offset = 0;
    this.serial = 0;
  }
  set preload(value) {
    if (value === "auto") this.load().catch(() => {
    });
  }
  get muted() {
    return this._muted;
  }
  set muted(value) {
    this._muted = !!value;
    this.syncGain();
  }
  get volume() {
    return this._volume;
  }
  set volume(value) {
    this._volume = value;
    this.syncGain();
  }
  get currentTime() {
    return this.source ? this.offset + Math.max(0, this.getContext().currentTime - this.started) : this.offset;
  }
  set currentTime(value) {
    this.offset = value;
  }
  syncGain() {
    if (this.gain) this.gain.gain.value = this.muted ? 0 : this.volume;
  }
  load() {
    if (!this.loading) this.loading = Promise.resolve().then(() => this.fetchAudio(this.url)).then((r) => {
      if (!r.ok) throw new Error("Recorded audio download failed");
      return r.arrayBuffer();
    }).then((data) => this.getContext().decodeAudioData(data)).then((buffer) => this.buffer = buffer).catch((error) => {
      this.loading = null;
      throw error;
    });
    return this.loading;
  }
  unlock() {
    try {
      const c = this.getContext();
      if (c.state !== "running") {
        this.unlocking = Promise.resolve(c.resume());
        this.unlocking.catch(() => {
        });
      }
      this.load().catch(() => {
      });
    } catch {
    }
  }
  async play() {
    const ticket = ++this.serial, c = this.getContext();
    this.paused = false;
    this.ended = false;
    if (c.state !== "running" && this.unlocking) await this.unlocking;
    if (c.state !== "running") {
      this.paused = true;
      throw new Error("Audio context needs a user gesture");
    }
    const buffer = await this.load();
    if (ticket !== this.serial || this.paused) throw new Error("Audio playback cancelled");
    if (c.state !== "running") {
      this.paused = true;
      throw new Error("Audio context interrupted");
    }
    this.disconnect();
    const source = c.createBufferSource(), gain = c.createGain();
    this.source = source;
    this.gain = gain;
    source.buffer = buffer;
    this.syncGain();
    source.connect(gain);
    gain.connect(c.destination);
    this.started = c.currentTime;
    source.onended = () => {
      if (this.source !== source) return;
      this.disconnect();
      this.paused = true;
      this.ended = true;
      this.offset = 0;
      this.dispatchEvent(new Event("ended"));
    };
    source.start(0, this.offset);
    this.dispatchEvent(new Event("playing"));
  }
  disconnect() {
    const source = this.source, gain = this.gain;
    this.source = null;
    this.gain = null;
    if (gain) {
      gain.gain.value = 0;
      gain.disconnect();
    }
    if (source) {
      source.onended = null;
      try {
        source.stop();
      } catch {
      }
      source.disconnect();
    }
  }
  pause() {
    this.serial++;
    this.offset = this.currentTime;
    this.paused = true;
    this.disconnect();
  }
};

// dist/sound-mixer.js
var SoundMixer = class {
  constructor({ createAudio: createAudio2 = (url) => new Audio(url), createContext = () => new (window.AudioContext || window.webkitAudioContext)() } = {}) {
    this.makeAudio = createAudio2;
    this.makeContext = createContext;
    this.voice = null;
    this.tone = null;
    this.context = null;
    this.enabled = true;
    this.batching = false;
    this.pending = null;
    this.master = 1;
    this.tracked = /* @__PURE__ */ new Set();
    this.baseVolume = /* @__PURE__ */ new WeakMap();
  }
  getContext() {
    return this.context ??= this.makeContext();
  }
  createBufferedAudio(url) {
    return this.trackAudio(new BufferedAudio(url, { getContext: () => this.getContext() }));
  }
  createAudio(url) {
    return this.trackAudio(this.makeAudio(url));
  }
  trackAudio(a) {
    const play = a.play.bind(a), pause2 = a.pause.bind(a);
    let ticket = 0;
    a.muted = true;
    this.tracked.add(a);
    const release2 = () => {
      if (this.voice === a) this.voice = null;
    };
    a.pause = () => {
      ticket++;
      a.muted = true;
      pause2();
      release2();
    };
    a.play = () => {
      const attempt = ++ticket;
      if (!this.baseVolume.has(a)) this.baseVolume.set(a, a.volume);
      this.applyVolume(a);
      if (!a[SILENT_PRIME]) {
        if (this.voice && this.voice !== a) this.voice.pause();
        this.stopTone();
        this.voice = a;
      }
      const failed = () => {
        if (ticket === attempt) release2();
      };
      try {
        const result = play();
        result?.then?.(() => {
        }, failed);
        return result;
      } catch (error) {
        failed();
        throw error;
      }
    };
    a.addEventListener?.("ended", release2);
    a.addEventListener?.("playing", () => {
      if (this.voice !== a) a.pause();
    });
    return a;
  }
  setEnabled(value) {
    this.enabled = !!value;
    if (!value) {
      if (this.voice) this.voice.muted = true;
      this.stopTone();
    }
  }
  // 0 mutes every clip; 1 keeps the shipped mix untouched.
  setVolume(value) {
    this.master = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 1));
    for (const a of this.tracked) this.applyVolume(a);
  }
  applyVolume(a) {
    if (!this.baseVolume.has(a)) this.baseVolume.set(a, a.volume);
    const base = this.baseVolume.get(a), next = Math.max(0, Math.min(1, base * this.master));
    if (a.volume !== next) a.volume = next;
  }
  beginFrame() {
    this.batching = true;
    this.pending = null;
  }
  endFrame() {
    const cue = this.pending;
    this.batching = false;
    this.pending = null;
    if (cue) this.playTone(cue);
  }
  cue(freq = 500, dur = 0.07, type = "sine", volume = 0.025, priority = 1) {
    if (!this.enabled || this.voice) return false;
    const cue = { freq, dur, type, volume: Math.min(volume, 0.025), priority };
    if (this.batching) {
      if (!this.pending || priority > this.pending.priority) this.pending = cue;
      return true;
    }
    return this.playTone(cue);
  }
  stopTone() {
    this.pending = null;
    const t = this.tone;
    this.tone = null;
    if (t) {
      try {
        t.osc.stop();
      } catch {
      }
      t.osc.disconnect();
      t.gain.disconnect();
    }
  }
  playTone(cue) {
    if (!this.enabled || this.voice) return false;
    if (this.tone) {
      if (cue.priority <= this.tone.priority) return false;
      this.stopTone();
    }
    try {
      const c = this.context ??= this.makeContext();
      if (c.state === "suspended") {
        c.resume()?.catch?.(() => {
        });
        return false;
      }
      if (c.state === "closed") return false;
      const osc = c.createOscillator(), gain = c.createGain(), t = { osc, gain, priority: cue.priority };
      this.tone = t;
      osc.type = cue.type;
      osc.frequency.setValueAtTime(cue.freq, c.currentTime);
      osc.frequency.exponentialRampToValueAtTime(cue.freq * 0.6, c.currentTime + cue.dur);
      gain.gain.setValueAtTime(cue.volume, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(1e-3, c.currentTime + cue.dur);
      osc.connect(gain).connect(c.destination);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
        if (this.tone === t) this.tone = null;
      };
      osc.start();
      osc.stop(c.currentTime + cue.dur);
      return true;
    } catch {
      this.stopTone();
      return false;
    }
  }
};

// dist/combat-audio.js
function playPlayerLaugh({ voice: voice2, bossVoice: bossVoice2, itemVoice: itemVoice2 }, options) {
  if (!voice2.enabled) return false;
  bossVoice2.stop();
  itemVoice2.stop();
  return voice2.laugh(options);
}
function requestBossCue({ voice: voice2, bossVoice: bossVoice2, itemVoice: itemVoice2 }, event) {
  if (voice2.playing) return false;
  const accepted = bossVoice2.request(event.kind, event.skill, event.owner);
  if (accepted || bossVoice2.current) itemVoice2.stop();
  return accepted;
}
function createRoomVoiceBoundary({ bossVoice: bossVoice2, itemVoice: itemVoice2 }) {
  let previous;
  return (room) => {
    if (room === previous) return false;
    previous = room;
    bossVoice2.stop();
    itemVoice2.stop();
    return true;
  };
}
function setGameSound(enabled, { voice: voice2, bossVoice: bossVoice2, itemVoice: itemVoice2, soundMix: soundMix2 }, reviving = false) {
  soundMix2.setEnabled(enabled);
  voice2.setEnabled(enabled);
  bossVoice2.setEnabled(enabled);
  itemVoice2.setEnabled(enabled);
  if (enabled && !reviving) {
    voice2.unlock();
    bossVoice2.unlock();
    itemVoice2.unlock();
  }
}

// dist/item-audio.js
var ITEM_VOICES = {
  man: { file: "item-man-v1.mp3", label: "Man\uFF01", cooldown: 8e3, maxMs: 1400 },
  mamba: { file: "item-mamba-v1.mp3", label: "Mamba out", cooldown: 1e4, maxMs: 3e3 },
  quiet: { file: "item-quiet-v1.mp3", label: "\u4F60\u543C\u90A3\u4E48\u5927\u58F0\u5E72\u4EC0\u4E48", cooldown: 14e3, maxMs: 2600, priority: 60 },
  phoebe: { file: "item-phoebe-v1.mp3", label: "\u83F2\u6BD4\u557E\u6BD4", cooldown: 16e3, maxMs: 4e3, priority: 80 },
  phoebesoot: { file: "item-phoebesoot-v1.mp3", label: "\u6211\u518D\u4E5F\u4E0D\u62C9\u7535\u7EBF\u4E86", cooldown: 14e3, maxMs: 3200, priority: 90 },
  oyeye: { file: "item-oyeye-v1.mp3", label: "\u6B27\u8036", cooldown: 1e4, maxMs: 2e3, priority: 20 },
  shrimpfeet: { file: "item-shrimpfeet-v1.mp3", label: "\u6700\u795E\u7684\u811A\u811A", cooldown: 14e3, maxMs: 4e3, priority: 50 },
  gugu: { file: "item-gugu-v1.mp3", label: "\u5495\u5495\u560E\u560E", cooldown: 12e3, maxMs: 4400, priority: 10 }
};
var ITEM_VOICE_OWNERS = { man: ["man"], mamba: ["mambaout"], quiet: ["quietbadge", "sun"], phoebe: ["phoebe", "phoebewire"], phoebesoot: ["phoebesoot"], oyeye: ["oyeye", "tempura"], shrimpfeet: ["shrimpfeet"], gugu: ["gugucharm"] };
function ownsItemVoice(g, key) {
  return (ITEM_VOICE_OWNERS[key] || []).some((id) => g.has(id));
}
var ItemAudio = class {
  constructor({ createAudio: createAudio2 = (url) => new Audio(url), now = () => performance.now(), isBusy = () => false, canPlay = () => true } = {}) {
    this.now = now;
    this.isBusy = isBusy;
    this.canPlay = canPlay;
    this.enabled = true;
    this.current = null;
    this.last = {};
    this.lastAny = -Infinity;
    this.generation = 0;
    this.clips = {};
    for (const [key, v] of Object.entries(ITEM_VOICES)) {
      const a = createAudio2(new URL("./assets/" + v.file, import.meta.url).href);
      a.preload = "auto";
      a.volume = 0.38;
      this.clips[key] = a;
    }
  }
  setEnabled(enabled) {
    this.enabled = !!enabled;
    if (!this.enabled) this.stop();
  }
  stop() {
    this.generation++;
    this.current = null;
    for (const a of Object.values(this.clips)) {
      a.pause();
      a.currentTime = 0;
    }
  }
  reset() {
    this.stop();
    this.last = {};
    this.lastAny = -Infinity;
  }
  // Pick one current-frame cue; nothing is retained for a later frame.
  requestMany(keys2) {
    for (const key of [...new Set(keys2)].filter((k) => ITEM_VOICES[k]).sort((a, b) => (ITEM_VOICES[b].priority ?? 30) - (ITEM_VOICES[a].priority ?? 30))) if (this.request(key)) return key;
    return null;
  }
  unlock() {
    if (!this.enabled) return;
    for (const a of Object.values(this.clips)) {
      if (a.unlock) a.unlock();
      else unlockSilent(a, () => this.current?.audio === a);
    }
  }
  request(key) {
    const def = ITEM_VOICES[key], time = this.now();
    this.update(true);
    if (!this.enabled || !def || !this.canPlay(key) || this.isBusy() || this.current || time - this.lastAny < 4500 || time - (this.last[key] ?? -Infinity) < def.cooldown) return false;
    const a = this.clips[key], generation = ++this.generation, oldAny = this.lastAny, oldLast = this.last[key];
    this.lastAny = time;
    this.last[key] = time;
    this.current = { key, audio: a, requested: time, started: null };
    a.currentTime = 0;
    a.muted = false;
    const failed = () => {
      if (generation !== this.generation) return;
      a.pause();
      a.currentTime = 0;
      this.current = null;
      this.lastAny = oldAny;
      if (oldLast === void 0) delete this.last[key];
      else this.last[key] = oldLast;
    };
    const started = () => {
      if (generation === this.generation && this.current) this.current.started = this.lastAny = this.last[key] = this.now();
    };
    this.current.failed = failed;
    try {
      const result = a.play();
      if (result?.then) result.then(started, failed);
      else started();
    } catch {
      failed();
      return false;
    }
    return true;
  }
  update(playing) {
    if (!playing || !this.enabled || this.isBusy()) {
      if (this.current) this.stop();
      return;
    }
    const c = this.current;
    if (c && !this.canPlay(c.key)) {
      this.stop();
      return;
    }
    if (c?.started === null && this.now() - c.requested >= 8e3) {
      c.failed();
      this.generation++;
      return;
    }
    if (c && (c.audio.ended || c.started !== null && this.now() - c.started >= ITEM_VOICES[c.key].maxMs)) {
      c.audio.pause();
      c.audio.currentTime = 0;
      this.current = null;
      this.generation++;
    }
  }
};

// dist/pixel-art.js
var ink2 = "#29313d";
var cream2 = "#fff1c8";
var PIXEL_THEMES = [
  { floor: "#b6bfa0", tile: "#a8b590", wall: "#526759", edge: "#344944", light: "#d4d9b4", accent: "#e9d49a" },
  { floor: "#aaa5bc", tile: "#9c96af", wall: "#514c69", edge: "#333348", light: "#d2c6db", accent: "#d9b3d6" },
  { floor: "#b8ad91", tile: "#a99e83", wall: "#685b45", edge: "#3e3b36", light: "#d8c69d", accent: "#e9b95d" },
  { floor: "#a6b4bd", tile: "#97a6b1", wall: "#4c6072", edge: "#303d4e", light: "#cbd5d9", accent: "#dfb0bd" },
  { floor: "#af9ca8", tile: "#a08b9a", wall: "#594858", edge: "#322d3c", light: "#d1b8c6", accent: "#d7a378" }
];
var rect = (c, x, y, w, h2, color) => {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), w, h2);
};
function box3(c, x, y, w, h2, color) {
  rect(c, x, y, w, h2, ink2);
  rect(c, x + 1, y + 1, w - 2, h2 - 2, color);
  rect(c, x + 2, y + 1, w - 4, 1, "#fff7df55");
}
function body(c, color, w = 20, h2 = 18) {
  rect(c, -w / 2 + 3, -h2 / 2 - 1, w - 6, h2 + 2, ink2);
  rect(c, -w / 2, -h2 / 2 + 3, w, h2 - 6, ink2);
  rect(c, -w / 2 + 1, -h2 / 2 + 2, w - 2, h2 - 4, color);
  rect(c, -w / 2 + 3, -h2 / 2, w - 6, h2, color);
  rect(c, -w / 2 + 4, -h2 / 2 + 1, w - 8, 2, "#fff3c655");
  rect(c, -w / 2 + 3, h2 / 2 - 2, w - 6, 2, "#29313d33");
}
function eyes(c, y = -4, angry = false) {
  for (const x of [-6, 3]) {
    rect(c, x, y, 4, 5, cream2);
    rect(c, x + 2, y + 1, 2, 3, ink2);
    if (angry) rect(c, x, y - 1, 4, 1, ink2);
  }
}
function speaker(c) {
  box3(c, -10, -12, 20, 25, "#655b81");
  for (const y of [-6, 5]) {
    box3(c, -6, y - 4, 12, 9, "#b8a4cb");
    box3(c, -3, y - 2, 6, 5, ink2);
  }
  rect(c, -11, 13, 22, 3, ink2);
}
function drawPixelEnemy(c, e, t = 0) {
  if (drawAnimatedEnemy(c, e, t)) return;
  c.save();
  c.translate(Math.round(e.x), Math.round(e.y));
  const boss = e.type === "boss", s = boss ? 3 : 2;
  rect(c, boss ? -44 : -22, boss ? 34 : 18, boss ? 88 : 44, boss ? 10 : 6, "#25343935");
  const bob = boss ? 0 : Math.round(Math.sin((e.t || t) * 7));
  const lift = e.airborne ? Math.sin(Math.min(1, (e.sound?.t || 0) / 0.8) * Math.PI) * 130 : 0;
  c.translate(0, bob - lift);
  c.scale(s, s);
  const k = e.kind || e.type;
  if (boss) {
    body(c, { collector: "#dfc27c", speaker: "#786c8e", catcher: "#bc9868", puppet: "#c79ba5", bull: "#c08859", meishu: "#c9ae65" }[k] || "#b2ae92", 30, 28);
    if (k === "speaker") {
      c.save();
      c.scale(1.3, 1.3);
      speaker(c);
      c.restore();
      rect(c, -18, -7, 3, 15, "#b594c9");
      rect(c, 15, -7, 3, 15, "#b594c9");
    } else {
      eyes(c, -6, true);
      box3(c, -7, 3, 14, 6, ink2);
      rect(c, -5, 4, 10, 2, cream2);
    }
    if (k === "collector") {
      box3(c, -18, 9, 36, 9, "#5e6c6d");
      for (const x of [-14, 9]) box3(c, x, 16, 7, 5, ink2);
      box3(c, -4, -24, 8, 12, cream2);
      rect(c, -3, -26, 6, 3, "#df8f69");
    }
    if (k === "catcher") {
      for (const d of [-1, 1]) {
        rect(c, d < 0 ? -26 : 15, -3, 11, 5, "#916d51");
        box3(c, d < 0 ? -29 : 24, 0, 5, 13, "#c6a97c");
        box3(c, d < 0 ? -31 : 23, 10, 8, 7, "#e6c69a");
      }
      rect(c, -11, -17, 22, 4, "#e6b24f");
      rect(c, -2, -20, 4, 4, cream2);
    }
    if (k === "puppet") {
      for (let y = -13; y < 14; y += 4) {
        rect(c, 0, y, 1, 3, ink2);
        rect(c, -2, y + 1, 5, 1, ink2);
      }
      box3(c, -11, -9, 7, 7, "#d4c8b2");
      rect(c, -9, -7, 3, 3, ink2);
      rect(c, 9, 7, 5, 6, "#92b9af");
      rect(c, -3, -21, 6, 6, "#8f657c");
      rect(c, 0, -27, 1, 6, ink2);
    }
    if (k === "bull") {
      for (const d of [-1, 1]) {
        rect(c, d < 0 ? -20 : 14, -20, 6, 10, cream2);
        rect(c, d < 0 ? -22 : 19, -25, 3, 10, cream2);
      }
      box3(c, -10, 0, 20, 10, "#d5ab7b");
      rect(c, -6, 3, 3, 3, ink2);
      rect(c, 3, 3, 3, 3, ink2);
      rect(c, -13, -15, 26, 3, "#a74c4d");
    }
    if (k === "meishu") {
      for (const x of [-15, 8]) {
        box3(c, x, -27, 7, 16, "#d9bc76");
        rect(c, x + 2, -24, 3, 10, "#d38b99");
      }
      rect(c, -14, -8, 28, 6, ink2);
      rect(c, -10, -7, 7, 2, "#d2e4df");
      rect(c, 3, -7, 7, 2, "#d2e4df");
      rect(c, 14, 6, 7, 3, "#c294ae");
      rect(c, 19, 1, 3, 7, "#c294ae");
    }
  } else if (["soundTurret", "echoBell", "beatling", "conductor"].includes(k)) {
    if (k === "soundTurret") speaker(c);
    if (k === "echoBell") {
      rect(c, -2, -16, 4, 4, ink2);
      body(c, "#b8a0d1", 16, 19);
      rect(c, -12, 7, 24, 4, ink2);
      rect(c, -10, 7, 20, 2, "#e0c4ed");
      rect(c, -2, 11, 4, 3, "#e8cb8b");
      eyes(c, -4);
    }
    if (k === "beatling") {
      box3(c, -12, -8, 24, 17, "#b785a6");
      rect(c, -11, -7, 22, 3, "#ecd3bd");
      rect(c, -11, 5, 22, 3, "#ecd3bd");
      for (const x of [-9, -3, 3, 9]) rect(c, x, -3, 1, 7, ink2);
      box3(c, -10, -16, 3, 9, "#e5ce9b");
      box3(c, 7, -16, 3, 9, "#e5ce9b");
      eyes(c, -3);
    }
    if (k === "conductor") {
      body(c, "#9684bb", 17, 20);
      rect(c, -11, -12, 22, 3, ink2);
      box3(c, -7, -20, 14, 9, "#625574");
      eyes(c, -5);
      rect(c, -1, 2, 2, 9, cream2);
      rect(c, 9, -8, 10, 2, cream2);
      rect(c, 17, -12, 2, 5, cream2);
    }
  } else if (["turret", "milkspitter", "dollTurret", "warden", "prismEye"].includes(k)) {
    const color = k === "milkspitter" ? "#eddbb6" : k === "dollTurret" ? "#b58b9e" : k === "warden" ? "#9d89aa" : "#7e9d97";
    box3(c, -11, -11, 22, 23, color);
    rect(c, -13, 11, 26, 4, ink2);
    box3(c, -7, -7, 14, 14, "#e8dec3");
    box3(c, -3, -3, 6, 6, ink2);
    if (k === "milkspitter") {
      box3(c, -4, -19, 8, 8, cream2);
      rect(c, -4, -20, 8, 3, "#cc8b67");
    }
    if (k === "warden") {
      rect(c, -13, -14, 26, 4, ink2);
      rect(c, -2, -14, 4, 3, "#e2b969");
    }
    if (k === "prismEye") {
      rect(c, -2, -18, 4, 6, "#d9b66a");
      rect(c, -2, 14, 4, 4, "#d9b66a");
      rect(c, -18, -2, 6, 4, "#d9b66a");
      rect(c, 12, -2, 6, 4, "#d9b66a");
      rect(c, -1, -2, 2, 4, "#eb8590");
    }
  } else if (k === "forklift") {
    box3(c, -12, -9, 24, 19, "#d4b45c");
    box3(c, -8, -15, 16, 10, "#697d85");
    rect(c, -6, -13, 12, 3, "#c9d8cb");
    for (const x of [-12, 7]) box3(c, x, 8, 5, 6, ink2);
    rect(c, -13, 1, 26, 3, ink2);
    rect(c, 10, 5, 10, 3, "#e4ce97");
    rect(c, 17, -1, 3, 6, "#e4ce97");
    rect(c, -2, -18, 4, 3, "#dd805c");
  } else {
    const palette = { brute: "#91ac6e", hopper: "#6e8792", runner: "#cf916b", milkleak: "#e4c78e", curdling: "#eddfaf", milkSkater: "#93bdb0", loader: "#bfa471", parcelThrower: "#bf986e", stitchling: "#c4a2ab", tiny: "#c6b7a7", stitchMedic: "#a8bdb0", scrapMine: "#c98985", jailer: "#ae90a2", lockSentry: "#9786b2" };
    if (k === "hopper") {
      rect(c, -18, -10, 12, 5, "#e0eee4");
      rect(c, 6, -10, 12, 5, "#e0eee4");
      rect(c, -16, -5, 8, 3, "#abc8cd");
      rect(c, 8, -5, 8, 3, "#abc8cd");
    }
    body(c, palette[k] || "#91a68b", k === "tiny" ? 12 : 21, k === "tiny" ? 12 : 20);
    eyes(c, -4, k === "runner" || k === "jailer");
    rect(c, -3, 5, 6, 2, ink2);
    const stride = Math.sin((e.t || t) * 12) > 0 ? 1 : -1;
    rect(c, -8, 10 + stride, 6, 3, ink2);
    rect(c, 3, 10 - stride, 6, 3, ink2);
    if (["milkleak", "curdling"].includes(k)) {
      box3(c, -4, -17, 8, 8, cream2);
      rect(c, -5, -19, 10, 3, "#d89e76");
      rect(c, -6, 4, 4, 6, cream2);
      rect(c, 4, 6, 4, 4, cream2);
    }
    if (k === "milkSkater") {
      rect(c, -13, 12, 26, 3, ink2);
      rect(c, -10, 15, 4, 3, "#719a9c");
      rect(c, 6, 15, 4, 3, "#719a9c");
      rect(c, -11, -11, 22, 3, "#e5cc87");
    }
    if (k === "runner") {
      rect(c, -11, 2, 22, 3, "#c95565");
      rect(c, -18, 0, 8, 3, "#c95565");
      rect(c, -20, -2, 5, 3, "#c95565");
    }
    if (["loader", "parcelThrower"].includes(k)) {
      rect(c, -12, -11, 24, 4, "#e5ba64");
      box3(c, 5, 0, 13, 12, "#c39865");
      rect(c, 10, 1, 2, 10, "#efdab0");
    }
    if (["stitchling", "tiny", "stitchMedic", "scrapMine"].includes(k)) {
      for (let y = -9; y < 10; y += 4) {
        rect(c, 0, y, 1, 3, ink2);
        rect(c, -2, y + 1, 5, 1, ink2);
      }
      if (k === "stitchMedic") {
        box3(c, -7, -16, 14, 7, cream2);
        rect(c, -1, -15, 2, 5, "#ad5e6b");
        rect(c, -3, -13, 6, 1, "#ad5e6b");
      }
      if (k === "scrapMine") {
        box3(c, -4, -17, 8, 6, "#d2b671");
        rect(c, -1, -20, 2, 5, ink2);
      }
    }
    if (["jailer", "lockSentry"].includes(k)) {
      rect(c, -12, -13, 24, 4, ink2);
      rect(c, -2, -14, 4, 3, "#e3bf7b");
      box3(c, 10, 0, 8, 9, "#d4bd7b");
      rect(c, 12, 2, 4, 3, ink2);
    }
  }
  c.restore();
}
function drawPixelFloor(c, room, floor) {
  if (drawBrightRoom(c, room, floor)) return;
  const p = PIXEL_THEMES[floor - 1];
  rect(c, 0, 0, 960, 600, p.edge);
  rect(c, 20, 20, 920, 560, p.wall);
  rect(c, 38, 38, 884, 524, p.light);
  rect(c, 47, 47, 866, 506, p.floor);
  c.save();
  c.beginPath();
  c.rect(47, 47, 866, 506);
  c.clip();
  for (let y = 48; y < 553; y += 48) for (let x = 48; x < 913; x += 48) {
    const n = Math.floor((x * 13 + y * 7 + (room.seed || 0) * 3) % 17);
    if (n < 6) rect(c, x, y, 47, 47, p.tile);
    rect(c, x, y, 48, 2, p.light + "45");
    rect(c, x, y, 2, 48, p.light + "25");
    if (n === 4) {
      rect(c, x + 31, y + 12, 8, 2, p.wall + "30");
      rect(c, x + 37, y + 14, 2, 5, p.wall + "30");
    }
  }
  c.restore();
  for (let x = 24; x < 930; x += 48) for (const y of [23, 558]) {
    rect(c, x, y, 42, 18, p.edge);
    rect(c, x + 2, y + 2, 38, 11, p.wall);
    rect(c, x + 4, y + 2, 32, 2, p.light + "50");
  }
  for (let y = 70; y < 550; y += 64) for (const x of [23, 919]) {
    rect(c, x, y, 18, 44, p.edge);
    rect(c, x + 3, y + 3, 12, 38, p.wall);
    rect(c, x + 4, y + 5, 3, 20, p.light + "50");
  }
  for (const x of [160, 800]) {
    if (floor === 1) {
      rect(c, x, 22, 24, 16, p.accent);
      rect(c, x + 7, 18, 10, 5, cream2);
    }
    if (floor === 2) {
      rect(c, x, 23, 32, 16, "#372e49");
      for (let i = 0; i < 4; i++) rect(c, x + 5 + i * 6, 26, 3, 8, p.accent);
    }
    if (floor === 3) {
      for (let i = 0; i < 6; i++) rect(c, x + i * 7, 23, 4, 15, i % 2 ? ink2 : p.accent);
    }
    if (floor === 4) {
      rect(c, x, 24, 36, 14, "#72818e");
      rect(c, x + 5, 26, 7, 7, p.accent);
      rect(c, x + 18, 29, 13, 3, p.light);
    }
    if (floor === 5) {
      for (let i = 0; i < 5; i++) rect(c, x + i * 7, 20, 3, 22, p.light);
    }
  }
}
function drawPixelShot(c, b, hostile = false) {
  if (!hostile && drawEnhancedShot(c, b)) return;
  const r = Math.max(3, Math.round(b.r)), x = Math.round(b.x), y = Math.round(b.y), a = Math.atan2(b.vy, b.vx);
  if (b.rollingRock) {
    rect(c, x - 12, y + 9, 24, 4, "#39434238");
    box3(c, x - 11, y - 10, 22, 20, "#8794a0");
    const shift = Math.floor((b.age || 0) * 12) % 3 * 3;
    rect(c, x - 7 + shift, y - 6, 4, 5, "#c5d0d1");
    rect(c, x + 3 - shift, y + 2, 4, 5, "#4e5965");
    rect(c, x - Math.cos(a) * 16, y + 8, 4, 3, "#b3a896");
    return;
  }
  if (b.rice) {
    box3(c, x - 7, y - 5, 14, 10, b.fed ? "#fff4c7" : "#eaf5ff");
    rect(c, x - 3, y - 3, 6, 3, "#fffdf1");
    rect(c, x + 2, y + 1, 3, 3, "#739ac6");
    return;
  }
  if (b.deepCharged) {
    box3(c, x - r - 2, y - 3, (r + 2) * 2, 6, "#9fe5ff");
    box3(c, x - 3, y - r - 2, 6, (r + 2) * 2, "#c5f4ff");
  }
  if (b.gojo) {
    rect(c, x - 10, y - 3, 20, 6, "#7749ad");
    rect(c, x - 5, y - 5, 10, 10, "#c48bfa");
    rect(c, x - 2, y - 2, 4, 4, "#fff1ff");
    return;
  }
  if (!hostile && b.memePet) {
    const colors4 = { kobe: "#e69d43", penguin: "#888f9a", tempura: "#f4cd78", sun: "#fff0ce" };
    const color2 = colors4[b.memePet] || cream2;
    box3(c, x - r, y - r, r * 2, r * 2, color2);
    if (b.memePet === "kobe") {
      rect(c, x - 1, y - r, 2, r * 2, ink2);
      rect(c, x - r, y - 1, r * 2, 2, ink2);
      rect(c, x - r + 3, y - r + 2, 2, 4, cream2);
    }
    if (b.memePet === "sun") {
      for (let i = 0; i < 3; i++) rect(c, x - r + 3, y - r + 3 + i * 3, r * 2 - 6, 1, ink2);
    }
    if (b.memePet === "penguin") {
      rect(c, x - r + 2, y - r + 2, Math.max(3, r), 3, "#cbd4da");
      rect(c, x + 1, y + 2, 3, 2, "#535b65");
    }
    if (b.memePet === "tempura") for (let i = 0; i < 3; i++) rect(c, x - 4 + i * 3, y - 2 + i % 2 * 3, 2, 2, "#bf8053");
    return;
  }
  const color = hostile ? b.needle ? "#ed7ca5" : b.echoReturned ? "#e9bc62" : b.sound ? "#ce9eeb" : b.finalOwner?.kind === "meishu" ? "#e58abb" : "#ed976c" : b.returning ? "#8bbfea" : b.poison ? "#b4df69" : b.pet ? "#f2d388" : b.heavy ? "#c9b7f1" : "#b7e6df";
  if (!hostile && b.returning) {
    for (let i = 1; i <= 3; i++) {
      c.save();
      c.globalAlpha *= 1 - i * 0.2;
      pixelRing(c, x - Math.cos(a) * i * 12, y - Math.sin(a) * i * 12, Math.max(3, r - i), "#85cdeb", 2);
      c.restore();
    }
  }
  for (let i = 3; i > 0; i--) rect(c, x - Math.round(Math.cos(a) * i * 6) - 2, y - Math.round(Math.sin(a) * i * 6) - 2, 4, 4, color + (i === 1 ? "90" : "40"));
  rect(c, x - r, y - r + 2, r * 2, r * 2 - 4, ink2);
  rect(c, x - r + 2, y - r, r * 2 - 4, r * 2, ink2);
  rect(c, x - r + 2, y - r + 2, r * 2 - 4, r * 2 - 4, color);
  rect(c, x - r + 3, y - r + 3, Math.max(2, r - 2), 2, cream2);
  if (!hostile && !b.pet) {
    c.fillStyle = ink2;
    c.font = `bold ${Math.max(10, r * 2)}px monospace`;
    c.textAlign = "center";
    c.fillText("\u54C8", x, y + 4);
  }
  if (b.needle) {
    rect(c, x - 1, y - 1, 3, 3, cream2);
  }
}
function pixelRing(c, x, y, r, color, size = 4) {
  c.fillStyle = color;
  const count2 = Math.max(16, Math.ceil(r / 3));
  for (let i = 0; i < count2; i++) {
    const a = i * Math.PI * 2 / count2;
    c.fillRect(Math.round((x + Math.cos(a) * r) / 2) * 2 - size / 2, Math.round((y + Math.sin(a) * r) / 2) * 2 - size / 2, size, size);
  }
}

// dist/gojo-art.js
var block3 = (c, x, y, w, h2, color) => {
  c.fillStyle = color;
  c.fillRect(Math.round(x / 2) * 2, Math.round(y / 2) * 2, w, h2);
};
function orb(c, p, color, label, t) {
  const r = 12 + Math.sin(t * 12) * 2;
  pixelRing(c, p.x, p.y, r + 5, "#34263f", 4);
  pixelRing(c, p.x, p.y, r, color, 5);
  block3(c, p.x - 7, p.y - 7, 14, 14, color);
  block3(c, p.x - 3, p.y - 5, 6, 8, "#fff3f1");
  for (let i = 0; i < 5; i++) {
    const a = t * 3 + i * Math.PI * 2 / 5;
    block3(c, p.x + Math.cos(a) * (r + 8) - 2, p.y + Math.sin(a) * (r + 8) - 2, 4, 4, color);
  }
  c.font = "bold 20px system-ui";
  c.textAlign = "center";
  c.strokeStyle = "#2d2538";
  c.lineWidth = 3;
  c.strokeText(label, p.x, p.y - 25);
  c.fillStyle = "#fff4dd";
  c.fillText(label, p.x, p.y - 25);
}
function drawGojo(c, g) {
  const s = g.gojo;
  if (!s || s.version !== 2) return;
  c.save();
  const t = g.actionClock || 0;
  const casting = s.phase === "redHold" || s.phase === "blueFlight", alpha = Math.min(1, s.left / 0.3);
  drawSprite(c, "gojo-manga-actions-v2.png", casting ? 1 : 0, 0, 4, 1, s.x, s.y, 68, { flip: s.face < 0, alpha });
  if (s.feet) drawSprite(c, "gojo-manga-actions-v2.png", s.phase === "redWindup" || s.phase === "redFlight" ? 3 : 2, 0, 4, 1, s.feet.x, s.feet.y, 36, { flip: s.feet.face < 0, alpha });
  if (s.red) orb(c, s.red, "#fa617a", "\u8D6B", t);
  if (s.blue) orb(c, s.blue, "#5ed5ff", "\u82CD", t);
  if (s.purple) {
    const p = s.purple, progress = Math.min(1, p.t / GOJO.warning);
    c.globalAlpha = 0.1 + progress * 0.12;
    c.fillStyle = "#b27ef5";
    c.beginPath();
    c.arc(p.x, p.y, GOJO.radius, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 1;
    pixelRing(c, p.x, p.y, GOJO.radius, "#4d294e", 10);
    pixelRing(c, p.x, p.y, GOJO.radius, "#e7b0ff", 6);
    pixelRing(c, p.x, p.y, GOJO.radius * (1 - progress), "#c87bff", 3);
    orb(c, p, "#bb77fa", "\u8308", t);
    const labelX = Math.max(230, Math.min(730, p.x)), labelY = p.y > 475 ? p.y - 45 : p.y + 44;
    c.font = "bold 20px system-ui";
    c.textAlign = "center";
    c.strokeStyle = "#382039";
    c.lineWidth = 3;
    c.strokeText("\u5373\u5C06\u7206\u70B8 \xB7 \u4F1A\u4F24\u5230\u81EA\u5DF1", labelX, labelY);
    c.fillStyle = "#fff2b9";
    c.fillText("\u5373\u5C06\u7206\u70B8 \xB7 \u4F1A\u4F24\u5230\u81EA\u5DF1", labelX, labelY);
  }
  c.restore();
}

// dist/chrono-art.js
var colors3 = ["#b8ff3d", "#52ff8d", "#28e8dd", "#3c9dff", "#9872ff"];
function drawChrono(c, g) {
  const active = sandyActive(g), s = g.sandy;
  if (active) {
    c.save();
    c.fillStyle = "#063a483e";
    c.fillRect(47, 47, 866, 506);
    c.fillStyle = "#73ff6b17";
    c.fillRect(47, 47, 866, 506);
    c.strokeStyle = s.age < 0.16 ? "#caff8e" : "#61f2b0";
    c.lineWidth = s.age < 0.16 ? 7 : 3;
    c.strokeRect(50, 50, 860, 500);
    c.fillStyle = "#83ffcc16";
    for (let y = 52; y < 550; y += 8) c.fillRect(50, y, 860, 1);
    c.fillStyle = "#5cffa9";
    for (let i = 0; i < 8; i++) {
      const y = 75 + i * 59;
      c.fillRect(53, y, 12 + i % 3 * 6, 3);
      c.fillRect(892 - i % 3 * 6, y, 12 + i % 3 * 6, 3);
    }
    c.globalAlpha = 0.2;
    drawHero(c, g, s.origin.x, s.origin.y, 1, true, { frame: 15, face: s.origin.face, tint: "#a2ffcf" });
    c.restore();
  }
  for (const p of g.sandyTrails || []) {
    c.save();
    c.globalAlpha = (1 - p.age / 0.8) * 0.65;
    const index2 = Math.min(4, Math.floor(p.age / 0.16));
    drawHero(c, g, p.x, p.y, 1, true, { frame: p.frame, face: p.face, tint: colors3[index2] });
    c.restore();
  }
  if (active) {
    c.save();
    c.fillStyle = "#102e39dc";
    c.fillRect(65, 509, 190, 34);
    c.fillStyle = "#b2ff5b";
    c.font = "bold 12px monospace";
    c.textAlign = "left";
    c.fillText((s.age < 2 ? "\u8D85\u9891 \xD73 " : "\u65AF\u5B89\u5A01\u65AF\u5766 ") + (s.age < 2 ? 2 - s.age : s.left).toFixed(1) + "s", 73, 524);
    c.fillStyle = "#304f58";
    c.fillRect(73, 532, 170, 4);
    c.fillStyle = "#94ff58";
    c.fillRect(73, 532, 170 * (s.age < 2 ? (2 - s.age) / 2 : s.left), 4);
    c.restore();
  }
  drawGojo(c, g);
}

// dist/resource-icons.js
var ink3 = "#39443f";
var gold = "#f1c568";
var light = "#fff2c6";
var rect2 = (x, y, w, h2, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h2}" fill="${c}"/>`;
var path = (d, c) => `<path d="${d}" fill="${c}"/>`;
var shapes = {
  key: rect2(3, 4, 14, 14, ink3) + rect2(6, 7, 8, 8, gold) + rect2(9, 10, 2, 2, ink3) + rect2(13, 15, 16, 5, gold) + rect2(21, 18, 4, 6, gold) + rect2(27, 18, 3, 5, gold),
  bomb: rect2(7, 10, 18, 18, ink3) + rect2(4, 14, 24, 10, ink3) + rect2(9, 12, 14, 13, "#77838a") + rect2(10, 13, 5, 5, light) + rect2(13, 5, 6, 6, "#b59365") + rect2(18, 3, 6, 3, gold) + rect2(24, 1, 3, 6, "#e59b61"),
  heart: path("M4 7H12V10H20V7H28V19H24V23H20V27H12V23H8V19H4Z", ink3) + path("M6 9H11V12H21V9H26V18H22V22H18V25H14V21H10V17H6Z", "#df7b83") + rect2(8, 10, 3, 5, light),
  coin: rect2(7, 3, 18, 26, ink3) + rect2(4, 7, 24, 18, ink3) + rect2(9, 5, 14, 22, gold) + rect2(6, 9, 20, 14, gold) + rect2(14, 8, 4, 16, light),
  shield: path("M4 5H28V19H24V24H20V28H12V24H8V19H4Z", ink3) + path("M7 8H25V18H21V22H17V25H15V22H11V18H7Z", "#8dbda2") + rect2(14, 10, 4, 10, light),
  charge: rect2(7, 4, 18, 25, ink3) + rect2(12, 1, 8, 3, ink3) + rect2(9, 6, 14, 21, "#98bb8c") + path("M17 7H12V17H16L13 25L22 14H17Z", gold),
  map: rect2(3, 4, 26, 24, ink3) + rect2(5, 6, 22, 20, "#ced5ac") + rect2(7, 9, 5, 5, "#749287") + rect2(14, 9, 5, 5, "#749287") + rect2(14, 16, 5, 5, "#749287") + rect2(21, 16, 5, 5, gold) + rect2(21, 23, 5, 3, gold),
  reroll: path("M7 5H25V11H29L23 17L17 11H21V9H7Z", "#829e83") + path("M25 27H7V21H3L9 15L15 21H11V23H25Z", gold)
};
var singles = { supply_key: "key", supply_bomb: "bomb", supply_heart: "heart", service_reroll: "reroll", service_shield: "shield", service_charge: "charge", service_map: "map" };
var trades = { trade_key_bomb: ["key", "bomb"], trade_bomb_key: ["bomb", "key"], trade_key_coin: ["key", "coin"], trade_bomb_coin: ["bomb", "coin"], trade_blood: ["heart", "coin"] };
function resourceIcon(id) {
  const pair = trades[id], shape = shapes[singles[id]];
  if (!shape && !pair) return null;
  const drawing = pair ? `<g transform="translate(0 1) scale(.55)">${shapes[pair[0]]}</g><g transform="translate(14 14) scale(.55)">${shapes[pair[1]]}</g>` + path("M16 8H23V5L30 11L23 17V14H16Z", ink3) : shape;
  return `<span class="item-texture resource-texture" aria-hidden="true"><svg viewBox="0 0 32 32" width="100%" height="100%" shape-rendering="crispEdges" focusable="false">${drawing}</svg></span>`;
}

// dist/item-icons.js
var classic = "eye laugh feet milk double tissue belly lotus tongue bubble tadpole crown fanvoice heavyvoice returnvoice mints springteeth starbadge rattle sparebutton coinpouch papercup milkcap beatsticker mending milkboots milkfilter spillcup milkfoam mouse dog egg turtle rabbit lunch scarf megaphone battery homing split bargain".split(" ");
function itemTexture(id) {
  const phoebeIndex = ["phoebe", "phoebewire", "phoebesoot", "phoebeplug"].indexOf(id);
  if (phoebeIndex >= 0) return { file: "phoebe-electrician-v1.png", cols: 4, rows: 2, index: 4 + phoebeIndex };
  if (id === "ricewhale") return { file: "deepseek-actions-v1.png", cols: 4, rows: 1, index: 0 };
  const deepIndex = ["ricebowl", "tokenbag", "deepthink", "wrongmodel"].indexOf(id);
  if (deepIndex >= 0) return { file: "deepseek-items-v1.png", cols: 2, rows: 2, index: deepIndex };
  if (id === "gojohalf") return { file: "gojo-manga-actions-v2.png", cols: 4, rows: 1, index: 0 };
  if (id === "sandevistan") return { file: "sandevistan-v1.png", cols: 1, rows: 1, index: 0 };
  if (id === "ghostbuddha") return { file: "ghostbuddha-v1.png", cols: 1, rows: 1, index: 0 };
  if (id === "penguin" || id === "sweetpenguin") return { file: "penguins-actions-v1.png", cols: 4, rows: 2, index: id === "penguin" ? 0 : 4 };
  const i = classic.indexOf(id);
  if (i >= 0) return { file: "items-classic-v1.png", cols: 7, rows: 6, index: i };
  const m = MEME_ITEMS.findIndex((v) => v.id === id);
  if (m >= 0 && m < 20) return { file: "items-memes-v1.png", cols: 5, rows: 4, index: m };
  return null;
}
function itemIcon(item) {
  const t = itemTexture(item.id);
  if (!t) return resourceIcon(item.id) || `<span class="resource-symbol" aria-hidden="true">${item.icon || "\u2726"}</span>`;
  const col = t.index % t.cols, row3 = Math.floor(t.index / t.cols), a = ATLAS_CUTS[t.file];
  const frames = FRAME_REGIONS[t.file], width = a ? a.x.at(-1) : frames ? Math.max(...frames.map((r) => r[0] + r[2])) : t.cols, height = a ? a.y.at(-1) : frames ? Math.max(...frames.map((r) => r[1] + r[3])) : t.rows;
  const { left, top, w, h: h2 } = atlasRegion(t.file, t.cols, t.rows, row3, col, width, height), m = Math.max(w, h2);
  return `<span class="item-texture" aria-hidden="true"><span class="item-paint" style="display:inline-block;width:${w / m * 100}%;height:${h2 / m * 100}%;background-image:url('./${assetPath(t.file)}');background-size:${width / w * 100}% ${height / h2 * 100}%;background-position:${width === w ? 0 : left / (width - w) * 100}% ${height === h2 ? 0 : top / (height - h2) * 100}%"></span></span>`;
}

// dist/boss-audio.js
var BOSS_VOICES = {
  bull: { file: "bull-call.mp3", label: "\u725B\u6765 \xB7 \u5988\u2014\u2014\u5988\u2014\u2014", duration: 3.5 },
  bullRage: { file: "bull-rage.mp3", label: "\u725B\u6765 \xB7 \u66B4\u8D70\u558A\u58F0", duration: 3.1 },
  meishu: { file: "meishu-taunt.mp3?v=single", label: "\u7F8E\u9F20 \xB7 \u4F60\u7684\u80C6\u5B50\u771F\u662F\u80A5\u561F\u561F\u7684", duration: 2.095 }
};
function bossVoiceKey(kind, skill) {
  return kind === "bull" ? skill === "stomp" || skill === "rage" ? "bullRage" : skill === "charge" ? "bull" : null : kind === "meishu" && ["traps", "curtain", "rage"].includes(skill) ? "meishu" : null;
}
var BossAudio = class {
  constructor({ createAudio: createAudio2 = (url) => new Audio(url), now = () => performance.now() } = {}) {
    this.enabled = true;
    this.now = now;
    this.clips = {};
    this.last = {};
    this.current = null;
    this.pending = null;
    this.generation = 0;
    for (const [key, v] of Object.entries(BOSS_VOICES)) {
      const a = createAudio2(new URL("./assets/" + v.file, import.meta.url).href);
      a.preload = "auto";
      a.volume = 0.52;
      this.clips[key] = a;
    }
  }
  setEnabled(value) {
    this.enabled = !!value;
    if (!this.enabled) this.stop();
  }
  stop() {
    this.generation++;
    this.pending = null;
    this.current = null;
    for (const a of Object.values(this.clips)) {
      a.pause();
      a.currentTime = 0;
    }
  }
  reset() {
    this.stop();
    this.last = {};
  }
  unlock() {
    if (!this.enabled) return;
    for (const a of Object.values(this.clips)) {
      if (a.unlock) a.unlock();
      else unlockSilent(a, () => this.current?.audio === a);
    }
  }
  request(kind, skill, owner) {
    const key = bossVoiceKey(kind, skill), now = this.now();
    if (!this.enabled || !key || owner?.dead || now - (this.last[key] ?? -Infinity) < 11e3) return false;
    const cue = { key, kind, owner, expires: now + 4500 };
    if (this.current) {
      if (this.pending?.kind === kind) return false;
      this.pending = cue;
      return false;
    }
    return this.play(cue);
  }
  play(cue) {
    if (!this.enabled || cue.owner?.dead) return false;
    const a = this.clips[cue.key], generation = ++this.generation;
    this.current = { ...cue, audio: a, requested: this.now(), started: null };
    this.last[cue.key] = this.now();
    a.currentTime = 0;
    a.muted = false;
    const failed = () => {
      if (generation !== this.generation) return;
      a.pause();
      a.currentTime = 0;
      this.current = null;
      delete this.last[cue.key];
    };
    const started = () => {
      if (generation === this.generation && this.current) this.current.started = this.last[cue.key] = this.now();
    };
    this.current.failed = failed;
    try {
      const p = a.play();
      if (p?.then) p.then(started, failed);
      else started();
    } catch {
      failed();
      return false;
    }
    return true;
  }
  update(playing) {
    if (!playing) {
      if (this.current || this.pending) this.stop();
      return;
    }
    const now = this.now();
    if (this.current) {
      const c = this.current;
      if (c.started === null && now - c.requested >= 8e3) {
        c.failed();
        this.generation++;
      } else if (c.owner?.dead || c.audio.ended || c.started !== null && now - c.started > 6e3) {
        c.audio.pause();
        c.audio.currentTime = 0;
        this.current = null;
        this.generation++;
      } else return;
    }
    const cue = this.pending;
    this.pending = null;
    if (cue && cue.expires >= now && !cue.owner?.dead && now - (this.last[cue.key] ?? -Infinity) >= 11e3) this.play(cue);
  }
};

// dist/revive.js
var REVIVE_SECONDS = 10;
function canRevive(g) {
  return g.mode === "dead" && !g.reviveUsed;
}
function beginRevive(g) {
  if (!canRevive(g)) return false;
  g.reviveWatch = { elapsed: 0 };
  g.mode = "revive";
  return true;
}
function advanceRevive(g, seconds) {
  if (g.mode !== "revive" || g.reviveUsed || !g.reviveWatch || !Number.isFinite(seconds)) return false;
  g.reviveWatch.elapsed = Math.min(REVIVE_SECONDS, g.reviveWatch.elapsed + Math.max(0, Math.min(0.25, seconds)));
  return g.reviveWatch.elapsed >= REVIVE_SECONDS;
}
function cancelRevive(g) {
  if (g.mode !== "revive") return false;
  g.reviveWatch = null;
  g.mode = "dead";
  return true;
}
function finishRevive(g) {
  if (g.mode !== "revive" || g.reviveUsed || !(g.reviveWatch?.elapsed >= REVIVE_SECONDS)) return false;
  g.reviveUsed = true;
  g.reviveWatch = null;
  g.p.hp = Math.max(1, Math.ceil(g.p.maxHp / 2));
  g.p.inv = 3;
  g.p.dash = 0;
  g.p.dashCD = 0;
  g.p.shot = 0;
  g.bullets = [];
  g.enemyBullets = [];
  g.explosives = [];
  g.bombLatch = false;
  g.useLatch = false;
  g.activeLatch = false;
  g.mode = "play";
  g.emit("room");
  return true;
}
var WatchClock = class {
  reset() {
    this.previous = null;
    this.active = false;
  }
  constructor() {
    this.reset();
  }
  sample({ time, duration = Infinity, playing, visible, seeking = false }) {
    const eligible = playing && visible && !seeking && Number.isFinite(time), previous = this.previous, active = this.active;
    this.previous = time;
    this.active = eligible;
    if (!eligible || !active || previous === null) return 0;
    let delta = time - previous;
    if (delta < 0 && Number.isFinite(duration)) delta = duration - previous + time;
    return delta > 0 && delta <= 0.5 ? Math.min(delta, 0.25) : 0;
  }
};

// dist/revive-ui.js
function createRevivePlayer({ getGame, overlay: overlay2, getSound, onSound, onCancel, onRevive, createAudio: createAudio2 = (url) => new Audio(url) }) {
  let g = null, media = null, token = 0, message = "", clock = new WatchClock();
  const active = () => g && getGame() === g && g.mode === "revive";
  function controls() {
    if (!active()) return;
    const elapsed = g.reviveWatch.elapsed, ready2 = elapsed >= REVIVE_SECONDS, button = overlay2.querySelector("#reviveAction");
    if (!button) return;
    const paused = media.paused;
    button.disabled = !ready2 && !paused;
    button.textContent = ready2 ? "\u534A\u8840\u590D\u6D3B \u2192" : paused ? "\u7EE7\u7EED\u89C2\u770B" : `\u89C2\u770B\u4E2D \xB7 ${Math.ceil(REVIVE_SECONDS - elapsed)} \u79D2`;
    overlay2.querySelector("#reviveProgress").value = elapsed;
    overlay2.querySelector("#reviveStatus").textContent = ready2 ? "\u5927\u7B11\u80FD\u91CF\u5145\u6EE1\u4E86\uFF01" : message || (paused ? "\u89C2\u770B\u5DF2\u6682\u505C\uFF0C\u70B9\u51FB\u7EE7\u7EED\u3002" : "\u5976\u9F99\u6B63\u5728\u5927\u7B11\u2026\u2026");
    overlay2.querySelector("#reviveCountdown").textContent = ready2 ? `\u6062\u590D ${Math.ceil(g.p.maxHp / 2)} / ${g.p.maxHp} \u751F\u547D` : `\u8FD8\u9700\u89C2\u770B ${Math.ceil(REVIVE_SECONDS - elapsed)} \u79D2`;
    const mute = overlay2.querySelector("#reviveMute");
    mute.textContent = "\u58F0\u97F3 " + (getSound() ? "\u5F00" : "\u5173");
    if (mute.dataset) mute.dataset.on = String(getSound());
    if (button.dataset) button.dataset.ready = String(ready2);
  }
  function stop() {
    token++;
    if (media) {
      media.pause();
      media.currentTime = 0;
      media.onplaying = media.onwaiting = media.onerror = media.onseeking = null;
    }
    media = null;
    g = null;
    clock.reset();
  }
  function pause2() {
    if (!active() || g.reviveWatch.elapsed >= REVIVE_SECONDS) return;
    token++;
    media.pause();
    clock.reset();
    message = "\u89C2\u770B\u5DF2\u6682\u505C\uFF0C\u70B9\u51FB\u7EE7\u7EED\u3002";
    controls();
  }
  function play() {
    if (!active() || document.hidden || g.reviveWatch.elapsed >= REVIVE_SECONDS) return;
    const generation = ++token;
    clock.reset();
    message = "\u6B63\u5728\u52A0\u8F7D\u5927\u7B11\u2026\u2026";
    media.muted = !getSound();
    const failed = () => {
      if (generation !== token || !active()) return;
      media.pause();
      clock.reset();
      message = "\u64AD\u653E\u672A\u5F00\u59CB\uFF0C\u8BF7\u70B9\u51FB\u7EE7\u7EED\u91CD\u8BD5\u3002";
      controls();
    };
    const started = () => {
      if (generation === token && active() && !media.paused) {
        message = "";
        controls();
      }
    };
    try {
      if (media.error) media.load();
      const result = media.play();
      if (result?.then) result.then(started, failed);
      else started();
    } catch {
      failed();
    }
    controls();
  }
  function open() {
    stop();
    const current = getGame();
    if (!beginRevive(current)) return false;
    g = current;
    overlay2.innerHTML = `<section class="modal revive-modal" role="dialog" aria-modal="true" aria-labelledby="reviveHeading"><h2 id="reviveHeading">\u5976\u9F99\u5927\u7B11 \xB7 \u590D\u6D3B\u5E7F\u544A</h2><div class="revive-body"><canvas id="reviveScene" width="480" height="240" aria-label="\u5976\u9F99\u5927\u7B11\u52A8\u753B"></canvas><div class="revive-info"><p id="reviveStatus" role="status">\u6B63\u5728\u52A0\u8F7D\u5927\u7B11\u2026\u2026</p><progress id="reviveProgress" max="10" value="0" aria-label="\u5E7F\u544A\u89C2\u770B\u8FDB\u5EA6"></progress><strong id="reviveCountdown">\u8FD8\u9700\u89C2\u770B 10 \u79D2</strong><p class="revive-note">\u6BCF\u5C40\u4E00\u6B21 \xB7 \u590D\u6D3B\u6062\u590D\u534A\u8840<br>\u5207\u5230\u540E\u53F0\u6682\u505C\u8BA1\u65F6</p><button id="reviveAction" class="primary" disabled>\u89C2\u770B\u4E2D \xB7 10 \u79D2</button><div class="revive-options"><button id="reviveMute" class="secondary">\u58F0\u97F3 \u5F00</button><button id="reviveCancel" class="secondary">\u653E\u5F03\u89C2\u770B</button></div></div></div></section>`;
    media = createAudio2(new URL("./assets/nailong-laugh.mp3", import.meta.url).href);
    media.loop = true;
    media.preload = "auto";
    media.volume = 0.55;
    media.onplaying = () => {
      message = "";
      clock.reset();
      controls();
    };
    media.onwaiting = () => {
      message = "\u5927\u7B11\u52A0\u8F7D\u4E2D\uFF0C\u8BA1\u65F6\u6682\u505C\u2026\u2026";
      controls();
    };
    media.onerror = () => {
      media.pause();
      message = "\u5927\u7B11\u52A0\u8F7D\u5931\u8D25\uFF0C\u8BF7\u70B9\u51FB\u7EE7\u7EED\u91CD\u8BD5\u3002";
      clock.reset();
      controls();
    };
    media.onseeking = () => clock.reset();
    overlay2.querySelector("#reviveAction").onclick = () => {
      if (g.reviveWatch.elapsed < REVIVE_SECONDS) {
        play();
        return;
      }
      const current2 = g;
      if (finishRevive(current2)) {
        stop();
        onRevive();
      }
    };
    overlay2.querySelector("#reviveCancel").onclick = () => {
      const current2 = g;
      cancelRevive(current2);
      stop();
      onCancel();
    };
    overlay2.querySelector("#reviveMute").onclick = () => {
      const wasPlaying = !media.paused;
      onSound();
      media.muted = !getSound() || !wasPlaying;
      if (wasPlaying) play();
      controls();
    };
    spriteImage("naiwa-pixel-v2.png");
    play();
    return true;
  }
  function update() {
    if (!active()) return;
    media.muted = !getSound() || media.paused;
    const canvas2 = overlay2.querySelector("#reviveScene");
    if (!canvas2) {
      pause2();
      return;
    }
    const image = spriteImage("naiwa-pixel-v2.png"), loaded = !!(image?.complete && image.naturalWidth), elapsed = g.reviveWatch.elapsed;
    const delta = clock.sample({ time: media.currentTime, duration: media.duration, playing: !media.paused && media.readyState >= 2, visible: !document.hidden && loaded, seeking: media.seeking });
    if (elapsed < REVIVE_SECONDS && advanceRevive(g, delta)) {
      media.pause();
      message = "";
      clock.reset();
    }
    const t = g.reviveWatch.elapsed, c = canvas2.getContext("2d");
    c.imageSmoothingEnabled = false;
    c.fillStyle = "#f5e5b5";
    c.fillRect(0, 0, 480, 240);
    for (let y = 0; y < 240; y += 24) for (let x = 0; x < 480; x += 24) if ((x + y) % 48 === 0) {
      c.fillStyle = "#eddaa5";
      c.fillRect(x, y, 24, 24);
    }
    c.fillStyle = "#809369";
    c.fillRect(0, 206, 480, 34);
    drawSprite(c, "naiwa-pixel-v2.png", Math.floor(t * 10) % 4, 2, 4, 4, 240, 174, 170, { flip: true });
    c.fillStyle = "#80623e";
    c.font = "bold 26px system-ui";
    c.textAlign = "center";
    for (let i = 0; i < 4; i++) {
      const side = i % 2 ? -1 : 1;
      c.fillText("\u54C8", 240 + side * (90 + (i > 1 ? 45 : 0)), 90 + Math.sin(t * 7 + i) * 12 + (i > 1 ? 65 : 0));
    }
    controls();
  }
  window.addEventListener("blur", pause2);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pause2();
  });
  return { open, stop, pause: pause2, update };
}

// dist/fullscreen.js
function isGameFullscreen(doc = document) {
  return !!(doc.fullscreenElement || doc.webkitFullscreenElement);
}
function canGoFullscreen(doc = document) {
  const root = doc.documentElement;
  return !!(root?.requestFullscreen || root?.webkitRequestFullscreen) && doc.fullscreenEnabled !== false && doc.webkitFullscreenEnabled !== false;
}
var inflight = null;
var expectedTurn = null;
function consumeFullscreenTurn(portrait, doc = document) {
  if (!expectedTurn || expectedTurn.doc !== doc) return false;
  expectedTurn = null;
  return !portrait && isGameFullscreen(doc);
}
function requestGameFullscreen(options) {
  if (inflight) return inflight;
  const request = enterGameFullscreen(options);
  inflight = request;
  request.finally(() => {
    if (inflight === request) inflight = null;
  });
  return request;
}
async function enterGameFullscreen({ mobile = true, doc = document, view = window } = {}) {
  if (isGameFullscreen(doc)) return "already";
  const root = doc.documentElement, request = root.requestFullscreen || root.webkitRequestFullscreen;
  if (!request || doc.fullscreenEnabled === false || doc.webkitFullscreenEnabled === false) return "unsupported";
  const orientation = mobile ? view.screen?.orientation : null;
  const turn = orientation?.lock && view.matchMedia?.("(orientation:portrait)")?.matches ? { doc } : null;
  if (turn) expectedTurn = turn;
  let locked = false;
  try {
    await request.call(root);
    try {
      if (orientation?.lock) {
        await orientation.lock("landscape");
        locked = true;
      }
    } catch {
    }
    return "entered";
  } catch {
    return "denied";
  } finally {
    if (turn && expectedTurn === turn) {
      const clear = () => {
        if (expectedTurn === turn) expectedTurn = null;
      };
      if (locked && view.requestAnimationFrame) view.requestAnimationFrame(() => view.requestAnimationFrame(clear));
      else clear();
    }
  }
}
async function toggleGameFullscreen({ mobile = true, doc = document, view = window } = {}) {
  if (!isGameFullscreen(doc)) {
    keeper.on = true;
    return requestGameFullscreen({ mobile, doc, view });
  }
  keeper.on = false;
  try {
    const exit = doc.exitFullscreen || doc.webkitExitFullscreen;
    if (!exit) return "unsupported";
    await exit.call(doc);
    return "exited";
  } catch {
    return "denied";
  }
}
var keeper = { on: false, pending: false, refusals: 0 };
function keepGameFullscreen(on) {
  keeper.on = !!on;
  keeper.refusals = 0;
}
function installFullscreenKeeper({ doc = document, view = window, isMobile }) {
  const tap = () => {
    if (!keeper.on || keeper.pending || keeper.refusals >= 2 || !isMobile() || isGameFullscreen(doc) || !canGoFullscreen(doc)) return;
    keeper.pending = true;
    requestGameFullscreen({ doc, view }).then((result) => {
      keeper.refusals = result === "entered" || result === "already" ? 0 : keeper.refusals + 1;
    }).finally(() => {
      keeper.pending = false;
    });
  };
  doc.addEventListener("touchend", tap, true);
  doc.addEventListener("click", tap, true);
}

// dist/pixel-effects.js
var ink4 = "#42384b";
var cream3 = "#fff3c6";
var block4 = (c, x, y, w, h2, color) => {
  c.fillStyle = color;
  c.fillRect(Math.round(x / 2) * 2, Math.round(y / 2) * 2, w, h2);
};
function drawPickup(c, type, x, y) {
  c.save();
  c.translate(Math.round(x), Math.round(y));
  if (type === "coin") {
    block4(c, -8, -11, 16, 22, ink4);
    block4(c, -11, -8, 22, 16, ink4);
    block4(c, -7, -9, 14, 18, "#e9ad46");
    block4(c, -9, -6, 18, 12, "#f7cf68");
    block4(c, -3, -7, 4, 14, cream3);
  } else if (type === "key") {
    block4(c, -11, -10, 15, 14, ink4);
    block4(c, -8, -7, 9, 8, "#f6ce76");
    block4(c, -5, -4, 3, 3, ink4);
    block4(c, 0, 0, 14, 5, ink4);
    block4(c, 1, 0, 12, 2, "#f6ce76");
    block4(c, 8, 3, 4, 5, "#f6ce76");
  } else if (type === "heart") {
    const rows = ["0110110", "1111111", "1111111", "0111110", "0011100", "0001000"];
    for (let yy = 0; yy < 6; yy++) for (let xx = 0; xx < 7; xx++) if (rows[yy][xx] === "1") block4(c, xx * 4 - 14, yy * 4 - 12, 4, 4, "#d56279");
    block4(c, -8, -8, 4, 4, "#ffe3c1");
  } else if (type === "chest") {
    block4(c, -15, -12, 30, 25, ink4);
    block4(c, -12, -9, 24, 19, "#c18b51");
    block4(c, -12, -1, 24, 3, ink4);
    block4(c, -3, -3, 6, 9, "#ffe3a1");
  } else {
    block4(c, -8, -9, 16, 20, ink4);
    block4(c, -11, -6, 22, 14, ink4);
    block4(c, -7, -6, 14, 14, "#68707e");
    block4(c, -5, -5, 4, 4, "#c0d2cf");
    block4(c, -2, -14, 4, 6, "#a77a4e");
    block4(c, 2, -18, 4, 4, "#ffca74");
  }
  c.restore();
}
function sparks(c, x, y, progress, radius, color, count2 = 8) {
  for (let i = 0; i < count2; i++) {
    const a = i * Math.PI * 2 / count2, dist = 5 + progress * radius;
    block4(c, x + Math.cos(a) * dist - 2, y + Math.sin(a) * dist - 2, 4, 4, color);
  }
}
var FOREGROUND_EFFECTS = /* @__PURE__ */ new Set(["mouseSteal", "gojoBlast", "echoPulse", "ghostIdol", "shrimpFeet", "laugh", "bombBlast", "bossLaugh", "voiceChain", "petBlock", "petCollect", "petWave", "petMuzzle", "petImpact"]);
function drawPixelEffect(c, f) {
  if (drawItemEffect(c, f)) return true;
  if (!FOREGROUND_EFFECTS.has(f.type)) return false;
  const progress = Math.max(0, Math.min(1, 1 - f.life / f.max)), radius = f.radius || 190;
  c.save();
  c.globalAlpha *= Math.min(1, f.life / f.max * 2);
  if (f.type === "mouseSteal") {
    const y = f.y - 20 - progress * 20;
    drawPickup(c, f.resource, f.x - 9, y);
    c.fillStyle = cream3;
    c.strokeStyle = ink4;
    c.lineWidth = 3;
    c.font = "bold 16px system-ui";
    c.textAlign = "left";
    c.strokeText("+" + f.amount, f.x + 7, y + 5);
    c.fillText("+" + f.amount, f.x + 7, y + 5);
  } else if (f.type === "ghostIdol") {
    drawSprite(c, "ghostbuddha-v1.png", 0, 0, 1, 1, f.x, f.y, 65, { alpha: 0.8 });
  } else if (f.type === "shrimpFeet") {
    pixelRing(c, f.x, f.y, f.radius || 65, "#dcad68", 2);
    for (const d of [-1, 1]) {
      block4(c, f.x + d * 12 - 4, f.y - 5, 8, 14, "#f7c66f");
      for (let i = 0; i < 3; i++) block4(c, f.x + d * 12 - 6 + i * 4, f.y - 10, 3, 4, cream3);
    }
  } else if (f.type === "echoPulse") {
    pixelRing(c, f.x, f.y, radius * progress, ink4, 5);
    pixelRing(c, f.x, f.y, radius * progress, "#83cbe9", 3);
    pixelRing(c, f.x, f.y, radius * Math.max(0, progress - 0.22), "#d5efff", 3);
    sparks(c, f.x, f.y, progress, radius, "#abd4fb", 8);
  } else if (f.type === "voiceChain") {
    const length2 = Math.hypot(f.tx - f.x, f.ty - f.y), steps = Math.max(1, Math.ceil(length2 / 6));
    for (let i = 0; i <= steps; i++) {
      const p = i / steps, offset = i % 2 ? 3 : -3;
      block4(c, f.x + (f.tx - f.x) * p, f.y + (f.ty - f.y) * p + offset, 4, 4, "#efc563");
    }
  } else if (f.type === "laugh" || f.type === "bossLaugh" || f.type === "petWave") {
    const color = f.type === "bossLaugh" ? "#d9768b" : f.type === "petWave" ? "#f1c75e" : "#fff0aa";
    pixelRing(c, f.x, f.y, radius * progress, ink4, 5);
    pixelRing(c, f.x, f.y, radius * progress, color, 3);
    if (progress > 0.2) pixelRing(c, f.x, f.y, radius * Math.max(0, progress - 0.18), color, 3);
    sparks(c, f.x, f.y, progress, radius, color, 12);
  } else if (f.type === "gojoBlast") {
    pixelRing(c, f.x, f.y, radius * Math.min(1, progress * 2), "#45294e", 8);
    pixelRing(c, f.x, f.y, radius * Math.min(1, progress * 2), "#c78bff", 5);
    pixelRing(c, f.x, f.y, radius * progress * 0.8, "#f3d9ff", 3);
    sparks(c, f.x, f.y, progress, radius, "#d993ff", 18);
  } else if (f.type === "bombBlast") {
    pixelRing(c, f.x, f.y, radius * progress, "#9c555b", 8);
    pixelRing(c, f.x, f.y, radius * progress, "#ffcd78", 4);
    sparks(c, f.x, f.y, progress, radius, "#fff0b4", 16);
    for (let i = 0; i < 6; i++) {
      const a = i * 2.4;
      block4(c, f.x + Math.cos(a) * progress * radius * 0.7 - 6, f.y + Math.sin(a) * progress * radius * 0.7 - 6, 12 * (1 - progress) + 2, 12 * (1 - progress) + 2, "#bf857d");
    }
  } else if (f.type === "petBlock") {
    pixelRing(c, f.x, f.y, 12 + progress * 12, "#aee2c4", 4);
    sparks(c, f.x, f.y, progress, 26, cream3, 6);
  } else if (f.type === "petCollect") {
    for (const d of [-1, 1]) {
      block4(c, f.x + d * 8 - 2, f.y - progress * 25, 4, 12, "#ffe3a0");
      block4(c, f.x + d * 8 - 6, f.y + 4 - progress * 25, 12, 4, "#ffe3a0");
    }
  } else {
    sparks(c, f.x, f.y, progress, f.radius || 20, f.type === "petMuzzle" ? "#ffe3a0" : "#f5bf77");
    block4(c, f.x - 3, f.y - 3, 6, 6, cream3);
  }
  c.restore();
  return true;
}

// dist/game-audio.js
var GameAudio = class {
  constructor({ createAudio: createAudio2 = (url) => new Audio(url), schedule = (fn, ms) => setTimeout(fn, ms), cancel = (id) => clearTimeout(id), onError = () => {
  } } = {}) {
    this.schedule = schedule;
    this.cancel = cancel;
    this.onError = onError;
    this.enabled = true;
    this.lastShort = -Infinity;
    this.longPlaying = false;
    this.playing = false;
    this.generation = 0;
    this.voice = createAudio2(new URL("./assets/nailong-laugh.mp3", import.meta.url).href);
    this.voice.preload = "auto";
    this.voice.addEventListener?.("ended", () => {
      this.longPlaying = false;
      this.playing = false;
    });
    this.voice.volume = 0.48;
  }
  setEnabled(value) {
    this.enabled = !!value;
    if (!value) this.stop();
  }
  stop() {
    this.generation++;
    this.cancel(this.timer);
    this.cancel(this.loadTimer);
    this.timer = null;
    this.loadTimer = null;
    this.voice.pause();
    this.voice.currentTime = 0;
    this.longPlaying = false;
    this.playing = false;
  }
  // Called from user gestures so iOS/Android can unlock media playback.
  unlock() {
    if (!this.enabled) return;
    if (this.voice.unlock) this.voice.unlock();
    else unlockSilent(this.voice, () => this.playing);
  }
  laugh({ long = false, now = performance.now() } = {}) {
    if (!this.enabled) return false;
    if (!long && (this.longPlaying && !this.voice.ended || now - this.lastShort < 650)) return false;
    const generation = ++this.generation;
    this.cancel(this.timer);
    this.cancel(this.loadTimer);
    this.timer = null;
    this.loadTimer = null;
    this.lastShort = now;
    this.longPlaying = long;
    this.playing = true;
    this.voice.muted = false;
    this.voice.volume = long ? 0.55 : 0.35;
    if (long || this.voice.paused || this.voice.ended) this.voice.currentTime = 0;
    const started = () => {
      if (generation !== this.generation || !this.playing) return;
      this.cancel(this.loadTimer);
      this.loadTimer = null;
      if (long) return;
      this.timer = this.schedule(() => {
        if (generation === this.generation && !this.longPlaying) this.stop();
      }, 1100);
      this.timer?.unref?.();
    };
    const failed = (error) => {
      if (generation !== this.generation) return;
      this.stop();
      this.lastShort = -Infinity;
      this.onError(error);
    };
    this.loadTimer = this.schedule(() => failed(new Error("Laugh playback timed out")), 8e3);
    this.loadTimer?.unref?.();
    try {
      const result = this.voice.play();
      if (result?.then) result.then(started, failed);
      else started();
    } catch (error) {
      failed(error);
      return false;
    }
    return true;
  }
};

// dist/rescue-art.js
function drawRescue(c, r, { complete = false } = {}) {
  const t = r?.t || 0, phase = complete ? "complete" : r?.phase || "caged", progress = (r?.presses || 0) / (r?.goal || 24), breaking = phase === "breaking", reunion = ["reunion", "complete"].includes(phase), run = phase === "complete" ? 1 : Math.min(1, (r?.phaseTime || 0) / 1.5);
  c.clearRect(0, 0, 640, 260);
  c.fillStyle = "#e9d8aa";
  c.fillRect(0, 0, 640, 260);
  for (let y = 0; y < 260; y += 26) for (let x = 0; x < 640; x += 32) {
    c.fillStyle = (x / 32 + y / 26) % 2 ? "#f4e7bf" : "#ecdcb2";
    c.fillRect(x + 1, y + 1, 30, 24);
  }
  c.fillStyle = "#d1b787";
  c.fillRect(0, 205, 640, 55);
  c.fillStyle = "#a88766";
  c.fillRect(0, 205, 640, 4);
  const heroX = reunion ? 180 + run * 150 : 180, childX = reunion ? 448 - run * 92 : 448;
  const heroRow = reunion || r?.pulse > 0 ? 2 : 0, heroCol = Math.floor(t * 9) % 4;
  if (selectedCostume() === "original" || !drawHero(c, { p: { face: 1 } }, heroX, 178, 1.4, true, { frame: heroRow * 4 + heroCol })) drawSprite(c, "naiwa-pixel-v2.png", heroCol, heroRow, 4, 4, heroX, 182, 124, { flip: true });
  if (!reunion || run < 1) drawFamily(c, "child", reunion ? 2 : progress > 0.4 ? 1 : 0, childX, 184, 82);
  drawFamily(c, "mother", reunion && run >= 1 ? 2 : reunion ? 1 : 0, reunion ? 380 : 92, 185, reunion && run >= 1 ? 115 : 100);
  if (!reunion) {
    c.save();
    c.translate(448 + (r?.pulse || 0) * Math.sin(t * 60) * 3, 0);
    const spread = breaking ? Math.min(1, (r.phaseTime || 0) / 1.1) : 0;
    for (let i = -2; i <= 2; i++) {
      const x = i * 25, y = 73;
      c.save();
      c.translate(x + spread * i * 55, y + spread * spread * 180);
      c.rotate(spread * i * 0.45);
      c.fillStyle = "#61556b";
      c.fillRect(-4, 0, 8, 131);
      c.fillStyle = "#b9acb0";
      c.fillRect(-2, 0, 2, 129);
      if (progress > 0.3 && i % 2 === 0) {
        c.fillStyle = "#f4e7bf";
        c.fillRect(-4, 45, 5, 4);
        c.fillRect(-1, 49, 5, 4);
      }
      if (progress > 0.65) {
        c.fillStyle = "#f4e7bf";
        c.fillRect(-4, 81, 6, 4);
        c.fillRect(0, 85, 4, 5);
      }
      c.restore();
    }
    if (!breaking) {
      c.fillStyle = "#61556b";
      c.fillRect(-66, 68, 132, 10);
      c.fillRect(-66, 197, 132, 10);
      c.fillStyle = "#e9bb66";
      c.fillRect(-10, 138, 20, 22);
      c.fillStyle = "#61556b";
      c.fillRect(-3, 143, 6, 11);
    }
    c.restore();
  }
  if (r?.pulse > 0 && !reunion) {
    const travel2 = 1 - r.pulse;
    pixelRing(c, 224 + travel2 * 215, 135, 10 + travel2 * 42, "#fff7cf", 4);
  }
  if (breaking || reunion) {
    for (let i = 0; i < 26; i++) {
      const x = (i * 83 + t * 12) % 640, y = (i * 37 + t * (15 + i % 3 * 7)) % 235;
      c.fillStyle = ["#e8a66d", "#f7c75c", "#b4d0a2", "#baaccd"][i % 4];
      c.fillRect(Math.round(x / 2) * 2, Math.round(y / 2) * 2, 4, 6);
    }
  }
}
function renderRescueUI(overlay2, g, { onPress, onPause, onSound, sound: sound2 }) {
  overlay2.innerHTML = `<div class="modal rescue-modal"><div class="mini">ONE LAST LAUGH</div><h2>\u5976\u8C46\u5C31\u5728\u7262\u7B3C\u91CC\uFF01</h2><canvas id="rescueScene" width="640" height="260" aria-label="\u5976\u86D9\u548C\u8C46\u5305\u7528\u5927\u7B11\u6253\u7834\u7262\u7B3C\u6551\u51FA\u5976\u8C46"></canvas><p id="rescueMessage" aria-live="polite">\u53CD\u590D\u6309\u952E\uFF0C\u6216\u70B9\u51FB\u4E0B\u65B9\u6309\u94AE\uFF0C\u7528\u5927\u7B11\u9707\u788E\u7262\u7B3C\u3002</p><progress id="rescueProgress" max="${g.rescue.goal}" value="${g.rescue.presses}" aria-label="\u7834\u7B3C\u8FDB\u5EA6"></progress><div class="rescue-controls"><button class="primary" id="rescueLaugh">\u5927\u7B11\uFF01 <span id="rescueCount"></span></button><button class="secondary" id="rescueSound">\u58F0\u97F3 ${sound2 ? "\u5F00" : "\u5173"}</button><button class="secondary" id="rescuePause">\u6682\u505C</button></div><small>\u6BCF\u6B21\u6309\u4E0B\u7B97\u4E00\u6B21\uFF0C\u957F\u6309\u4E0D\u8FDE\u53D1 \xB7 P / Esc \u6682\u505C</small></div>`;
  overlay2.querySelector("#rescueLaugh").onclick = onPress;
  overlay2.querySelector("#rescuePause").onclick = onPause;
  overlay2.querySelector("#rescueSound").onclick = onSound;
}
var scenes = /* @__PURE__ */ new WeakMap();
function updateRescueUI(overlay2, g) {
  const target2 = overlay2.querySelector("#rescueScene");
  if (!target2) return;
  let buffer = scenes.get(target2);
  if (!buffer) {
    buffer = document.createElement("canvas");
    buffer.width = 320;
    buffer.height = 130;
    scenes.set(target2, buffer);
  }
  const c = buffer.getContext("2d");
  c.setTransform(0.5, 0, 0, 0.5, 0, 0);
  drawRescue(c, g.rescue, { complete: g.mode === "win" });
  const dest = target2.getContext("2d");
  dest.imageSmoothingEnabled = false;
  dest.clearRect(0, 0, 640, 260);
  dest.drawImage(buffer, 0, 0, 640, 260);
  const r = g.rescue;
  if (!r) return;
  const progress = overlay2.querySelector("#rescueProgress");
  if (progress) progress.value = r.presses;
  const count2 = overlay2.querySelector("#rescueCount");
  if (count2) count2.textContent = `${r.presses} / ${r.goal}`;
  const button = overlay2.querySelector("#rescueLaugh");
  if (button) button.disabled = r.phase !== "caged";
  const msg = overlay2.querySelector("#rescueMessage"), text = r.phase === "caged" ? "\u53CD\u590D\u6309\u952E\uFF0C\u6216\u70B9\u51FB\u4E0B\u65B9\u6309\u94AE\uFF0C\u7528\u5927\u7B11\u9707\u788E\u7262\u7B3C\u3002" : r.phase === "breaking" ? "\u518D\u4E5F\u6CA1\u6709\u7262\u7B3C\u80FD\u5173\u4F4F\u8FD9\u4E00\u5BB6\u4EBA\u7684\u7B11\u58F0\uFF01" : "\u5976\u8C46\uFF0C\u6211\u4EEC\u56DE\u5BB6\uFF01";
  if (msg && msg.textContent !== text) msg.textContent = text;
}

// dist/purchase-ui.js
function purchaseQuote(game2, item) {
  const exchange = game2.room.type === "start", resource = exchange ? item.cost : "coins";
  const cost = exchange ? item.costAmount || 1 : item.cost ?? (item.resource ? 3 : game2.price());
  const available = resource === "health" ? game2.p.hp : game2[resource];
  const unit = { coins: "\u91D1\u5E01", keys: "\u628A\u94A5\u5319", bombs: "\u679A\u70B8\u5F39", health: "\u70B9\u751F\u547D" }[resource];
  let reason = available < cost ? "\u8D44\u6E90\u4E0D\u8DB3" : resource === "health" && available <= cost ? "\u5151\u6362\u540E\u81F3\u5C11\u4FDD\u7559 1 \u70B9\u751F\u547D" : "";
  if (item.resource === "health" && game2.p.hp >= game2.p.maxHp) reason = "\u751F\u547D\u5DF2\u6EE1";
  if (item.id === "service_shield" && game2.p.shield) reason = "\u5DF2\u6709\u62A4\u76FE";
  if (item.id === "service_charge" && game2.activeCharge >= game2.activeCost()) reason = "\u7206\u7B11\u5DF2\u5145\u6EE1";
  if (item.id === "service_map" && !game2.rooms.some((r) => r.exists && r.type === "cache" && !r.revealed && !r.visited)) reason = "\u5DF2\u53D1\u73B0\u9690\u85CF\u623F\u95F4";
  return { cost, available, unit, remaining: available - cost, reason, verb: exchange ? "\u5151\u6362" : "\u8D2D\u4E70" };
}
function createPurchaseSelection(game2) {
  let selected2 = null, selectedRoom = null, selectedChoices = null, selectedFloor = null;
  return {
    select(id) {
      selectedRoom = game2.room;
      selectedChoices = game2.choices;
      selectedFloor = game2.floor;
      selected2 = game2.mode === "choice" ? game2.choices.find((i) => i.id === id) || null : null;
      return selected2;
    },
    quote() {
      return selected2 ? purchaseQuote(game2, selected2) : null;
    },
    confirm() {
      const item = selected2;
      selected2 = null;
      if (!item || game2.room !== selectedRoom || game2.floor !== selectedFloor || game2.choices !== selectedChoices || game2.mode !== "choice" || !game2.choices.some((i) => i.id === item.id) || purchaseQuote(game2, item).reason) return false;
      return game2.choose(item.id);
    }
  };
}
var plainName = (item) => item.name.replace(/ · \d+ 金币$/, "");
function tag(doc, className, text) {
  const el = doc.createElement("span");
  el.className = className;
  el.textContent = text;
  return el;
}
function renderPurchaseDialog(root, { game: game2, title: title2, choices, onChoose, onLeave }) {
  const selection = createPurchaseSelection(game2), exchange = game2.room.type === "start";
  root.innerHTML = `<div class="modal purchase-modal" role="dialog" aria-modal="true" aria-labelledby="purchaseTitle"><div class="purchase-heading"><div class="purchase-title"><h2 id="purchaseTitle"></h2><p></p></div><button class="secondary purchase-leave">\u79BB\u5F00\u5546\u5E97 / \u56DE\u6536\u53F0</button></div><div class="purchase-body"><div class="purchase-shelf"><div class="purchase-list" aria-label="\u5546\u54C1\u8D27\u67B6"></div></div><div class="purchase-detail" data-empty="true"><div class="purchase-detail-head"><span class="purchase-detail-icon" aria-hidden="true"></span><strong class="purchase-name">\u5C1A\u672A\u9009\u62E9\u5546\u54C1</strong></div><p class="purchase-description">\u70B9\u5DE6\u4FA7\u5546\u54C1\uFF0C\u67E5\u770B\u6548\u679C\u548C\u6D88\u8017\u3002\u6ED1\u52A8\u8D27\u67B6\u4E0D\u4F1A\u8D2D\u4E70\u3002</p><div class="purchase-checkout"><div class="purchase-cost" role="status"></div><button class="primary purchase-confirm" disabled>\u8BF7\u9009\u62E9\u5546\u54C1</button></div></div></div></div>`;
  const doc = root.ownerDocument, q = (s) => root.querySelector(s);
  q("h2").textContent = title2;
  q(".purchase-title p").textContent = exchange ? "\u672C\u5C42\u9650\u91CF\uFF0C\u8FDB\u51FA\u623F\u95F4\u4E0D\u4F1A\u8865\u8D27\uFF1B\u4E0B\u4E00\u5C42\u6062\u590D\u6B21\u6570\u3002" : "\u672C\u5C42\u9053\u5177\u552E\u51FA\u4E0D\u8865\u8D27\uFF1B\u4EC5\u4ED8\u8D39\u5237\u65B0\u5269\u4F59\u9053\u5177\u3002\u5148\u9009\u62E9\uFF0C\u518D\u786E\u8BA4\u8D2D\u4E70\u3002";
  const list = q(".purchase-list"), confirm = q(".purchase-confirm"), cost = q(".purchase-cost"), detail = q(".purchase-detail");
  function costCell(label, value, className = "") {
    const cell = doc.createElement("span");
    cell.className = "purchase-cost-cell " + className;
    cell.append(tag(doc, "purchase-cost-label", label), tag(doc, "purchase-cost-value", value));
    return cell;
  }
  function select(item, button) {
    selection.select(item.id);
    const quote = selection.quote();
    for (const b of list.children) b.setAttribute("aria-pressed", String(b === button));
    detail.dataset.empty = "false";
    detail.dataset.blocked = String(!!quote.reason);
    q(".purchase-detail-icon").innerHTML = itemIcon(item);
    q(".purchase-name").textContent = plainName(item);
    q(".purchase-description").textContent = item.desc;
    q(".purchase-description").scrollTop = 0;
    cost.replaceChildren(costCell("\u6D88\u8017", `${quote.cost} ${quote.unit}`), costCell("\u5F53\u524D", String(quote.available)), quote.reason ? costCell(`\u65E0\u6CD5${quote.verb}`, quote.reason, "is-reason") : costCell(`${quote.verb}\u540E\u5269\u4F59`, String(quote.remaining), "is-remaining"));
    cost.setAttribute("aria-label", `\u6D88\u8017 ${quote.cost} ${quote.unit} \xB7 \u5F53\u524D ${quote.available}${quote.reason ? " \xB7 " + quote.reason : " \xB7 \u5269\u4F59 " + quote.remaining}`);
    confirm.disabled = !!quote.reason;
    confirm.textContent = quote.reason || `\u786E\u8BA4${quote.verb} \xB7 ${quote.cost} ${quote.unit}`;
  }
  for (const item of choices) {
    const quote = purchaseQuote(game2, item), button = doc.createElement("button");
    button.className = "purchase-item";
    button.setAttribute("aria-pressed", "false");
    if (quote.reason) button.dataset.blocked = "true";
    button.innerHTML = itemIcon(item);
    const text = tag(doc, "purchase-item-text", "");
    text.append(tag(doc, "purchase-item-name", plainName(item)), tag(doc, "purchase-item-effect", item.short || item.desc));
    const price = tag(doc, "purchase-price", exchange ? `\u5269 ${Math.max(0, item.limit - (game2.room.exchanges[item.id] || 0))} \u6B21` : `${quote.cost} ${quote.unit}`);
    button.append(text, price);
    button.addEventListener("click", () => select(item, button));
    list.append(button);
  }
  const sold = exchange ? EXCHANGES.filter((t) => (game2.room.exchanges[t.id] || 0) >= t.limit) : game2.room.shopSold || [];
  for (const item of sold) {
    const button = doc.createElement("button");
    button.className = "purchase-item is-sold";
    button.disabled = true;
    button.innerHTML = itemIcon(item);
    const text = tag(doc, "purchase-item-text", "");
    text.append(tag(doc, "purchase-item-name", plainName(item)));
    button.append(text, tag(doc, "purchase-price", exchange ? "\u672C\u5C42\u5DF2\u5151\u5B8C" : "\u672C\u5C42\u5DF2\u552E\u51FA"));
    list.append(button);
  }
  confirm.addEventListener("click", () => {
    confirm.disabled = true;
    const success = selection.confirm();
    if (!success) {
      confirm.textContent = "\u8BF7\u91CD\u65B0\u9009\u62E9\u5546\u54C1";
      cost.textContent = "\u672A\u5B8C\u6210\u8D2D\u4E70\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9\u5E76\u68C0\u67E5\u8D44\u6E90\u3002";
    }
    onChoose(success);
  });
  q(".purchase-leave").addEventListener("click", onLeave);
}

// dist/mobile-viewport.js
var MOBILE_QUERY = "(max-width:780px), (pointer:coarse), (max-width:1100px) and (max-height:600px)";
function visibleGameSize(view) {
  const v = view.visualViewport;
  return { width: Math.round(v?.width > 0 ? v.width : view.innerWidth), height: Math.round(v?.height > 0 ? v.height : view.innerHeight) };
}
function canScrollVertically(node, delta) {
  const max = node.scrollHeight - node.clientHeight;
  return max > 1 && (delta > 0 ? node.scrollTop > 0 : delta < 0 ? node.scrollTop < max - 1 : false);
}
function installMobileViewport({ view = window, doc = document, media, resetInput }) {
  let previous = "", previousMobile = null, previousDir = null, scheduled = false;
  const fingers = /* @__PURE__ */ new Map(), root = doc.documentElement;
  function sync() {
    scheduled = false;
    const real = visibleGameSize(view), dir = sidewaysDirection(view, real), size = dir ? { width: real.height, height: real.width } : real, key = `${size.width}:${size.height}:${media.matches}:${dir}`;
    if (previousMobile !== media.matches) {
      previousMobile = media.matches;
      resetInput();
    }
    if (previousDir !== dir) {
      previousDir = dir;
      resetInput();
      fingers.clear();
    }
    if (key !== previous) {
      previous = key;
      root.style.setProperty("--game-vw", size.width + "px");
      root.style.setProperty("--game-vh", size.height + "px");
      applyRotation({ doc, view, dir, ...real });
    }
    if (media.matches && (view.scrollX || view.scrollY)) view.scrollTo(0, 0);
  }
  const schedule = () => {
    if (!scheduled) {
      scheduled = true;
      view.requestAnimationFrame(sync);
    }
  };
  const rotate = () => {
    resetInput();
    fingers.clear();
    schedule();
  };
  view.addEventListener("resize", schedule);
  view.addEventListener("orientationchange", rotate);
  view.screen?.orientation?.addEventListener?.("change", rotate);
  view.addEventListener("scroll", schedule, { passive: true });
  view.visualViewport?.addEventListener("resize", schedule);
  view.visualViewport?.addEventListener("scroll", schedule);
  doc.addEventListener("fullscreenchange", schedule);
  doc.addEventListener("webkitfullscreenchange", schedule);
  media.addEventListener("change", schedule);
  const scrollable = (target2, delta) => {
    if (!target2?.closest?.(".modal,dialog[open],aside[data-open-panel],.mobile-menu-sheet,.wardrobe")) return false;
    for (let node = target2; node && node !== doc.body; node = node.parentElement) {
      if (canScrollVertically(node, delta) && /auto|scroll/.test(view.getComputedStyle(node).overflowY)) return true;
    }
    return false;
  };
  doc.addEventListener("touchstart", (e) => {
    for (const t of e.changedTouches) fingers.set(t.identifier, { x: t.clientX, y: t.clientY });
  }, { passive: true });
  doc.addEventListener("touchmove", (e) => {
    if (!media.matches) return;
    let permit = e.touches.length === 1;
    for (const t of e.changedTouches) {
      const old = fingers.get(t.identifier) || { x: t.clientX, y: t.clientY }, move2 = toVirtualDelta(t.clientX - old.x, t.clientY - old.y);
      fingers.set(t.identifier, { x: t.clientX, y: t.clientY });
      if (Math.abs(move2.x) > Math.abs(move2.y) || !scrollable(t.target || e.target, move2.y)) permit = false;
    }
    if (!permit && e.cancelable) e.preventDefault();
  }, { passive: false });
  const release2 = (e) => {
    for (const t of e.changedTouches) fingers.delete(t.identifier);
  };
  doc.addEventListener("touchend", release2, { passive: true });
  doc.addEventListener("touchcancel", release2, { passive: true });
  doc.addEventListener("wheel", (e) => {
    if (media.matches && !scrollable(e.target, -e.deltaY) && e.cancelable) e.preventDefault();
  }, { passive: false });
  view.addEventListener("blur", () => fingers.clear());
  view.addEventListener("load", () => {
    previous = "";
    schedule();
  });
  sync();
  return { refresh() {
    previous = "";
    sync();
  } };
}

// dist/mobile-ui.js
function bindHoldControl(element, press, release2, { move: move2 = () => {
} } = {}) {
  let pointer = null;
  const doc = element.ownerDocument, view = doc?.defaultView, seen = /* @__PURE__ */ new WeakSet();
  element.addEventListener("pointerdown", (e) => {
    if (pointer !== null || e.button !== 0) return;
    e.preventDefault();
    pointer = e.pointerId;
    try {
      element.setPointerCapture?.(pointer);
    } catch {
    }
    element.classList?.add("held");
    press(e);
  });
  const reset = () => {
    if (pointer === null) return;
    const id = pointer;
    pointer = null;
    element.classList?.remove("held");
    try {
      if (element.hasPointerCapture?.(id)) element.releasePointerCapture(id);
    } catch {
    }
    release2();
  };
  const end2 = (e) => {
    if (e.pointerId !== pointer) return;
    reset();
  };
  const moving = (e) => {
    if (e.pointerId !== pointer || seen.has(e)) return;
    seen.add(e);
    if (e.pointerType === "mouse" && e.buttons === 0) {
      reset();
      return;
    }
    e.preventDefault();
    move2(e);
  };
  for (const target2 of new Set([element, view].filter(Boolean))) {
    for (const type of ["pointerup", "pointercancel"]) target2.addEventListener(type, end2, true);
    target2.addEventListener("pointermove", moving, { capture: true, passive: false });
  }
  element.addEventListener("lostpointercapture", () => {
    if (element.isConnected === false || !view) reset();
  });
  view?.addEventListener("blur", reset);
  view?.addEventListener("pagehide", reset);
  doc?.addEventListener?.("visibilitychange", () => {
    if (doc.hidden) reset();
  });
  element.addEventListener("contextmenu", (e) => e.preventDefault());
  return reset;
}
function stickVector(dx, dy, radius, deadZone = 7) {
  const length2 = Math.hypot(dx, dy);
  if (length2 <= deadZone) return { x: 0, y: 0 };
  const strength = Math.min(1, (length2 - deadZone) / Math.max(1, radius - deadZone));
  return { x: dx / length2 * strength, y: dy / length2 * strength };
}
function ringPlacement(zone2, size, point2) {
  const half = size / 2, cx = Math.max(point2.x - zone2.left, half), cy = Math.min(point2.y - zone2.top, zone2.height - half);
  return { left: cx - half, bottom: zone2.height - cy - half };
}
function bindStickControl(element, change, { deadZone = 7 } = {}) {
  let origin = null, radius = 0;
  const ring2 = element.querySelector?.("em") || null, style = element.style, view = element.ownerDocument?.defaultView;
  function place2() {
    if (!origin || !ring2 || !style?.setProperty) return;
    const at = ringPlacement(virtualRect(element), virtualRect(ring2).width, toVirtualPoint(origin.x, origin.y));
    style.setProperty("--ring-x", at.left + "px");
    style.setProperty("--ring-y", at.bottom + "px");
  }
  const rest = () => {
    style?.removeProperty?.("--ring-x");
    style?.removeProperty?.("--ring-y");
  };
  if (view?.ResizeObserver && ring2) {
    const observer = new view.ResizeObserver(place2);
    observer.observe(element);
    observer.observe(ring2);
  } else if (view?.requestAnimationFrame) {
    const afterLayout = () => view.requestAnimationFrame(() => view.requestAnimationFrame(place2));
    view.addEventListener("resize", afterLayout);
    view.visualViewport?.addEventListener("resize", afterLayout);
  }
  return bindHoldControl(element, (e) => {
    origin = { x: e.clientX, y: e.clientY };
    radius = (ring2 ? virtualRect(ring2).width + 12 : virtualRect(element).width) * 0.32;
    place2();
    change({ x: 0, y: 0 }, true);
  }, () => {
    origin = null;
    rest();
    change({ x: 0, y: 0 }, false);
  }, { move: (e) => {
    if (!origin) return;
    const delta = toVirtualDelta(e.clientX - origin.x, e.clientY - origin.y);
    change(stickVector(delta.x, delta.y, radius, deadZone), true);
  } });
}
function createTouchActions() {
  const pending3 = /* @__PURE__ */ new Set();
  return { press(action, playing = true) {
    if (playing) pending3.add(action);
  }, take() {
    const actions = Object.fromEntries([...pending3].map((key) => [key, true]));
    pending3.clear();
    return actions;
  }, clear() {
    pending3.clear();
  } };
}
function cardinalAim(x, y, previous = { x: 0, y: 0 }, hysteresis = 0) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || !x && !y) return { x: 0, y: 0 };
  const horizontal = previous.x ? Math.abs(y) <= Math.abs(x) * (1 + hysteresis) : previous.y ? Math.abs(x) > Math.abs(y) * (1 + hysteresis) : Math.abs(x) >= Math.abs(y);
  return horizontal ? { x: Math.sign(x), y: 0 } : { x: 0, y: Math.sign(y) };
}
function bindAttackStick(element, change, { deadZone = 12 } = {}) {
  let center = null, aim2 = { x: 0, y: 0 };
  const update = (e) => {
    if (!center) return;
    const { x, y } = toVirtualDelta(e.clientX - center.x, e.clientY - center.y);
    aim2 = Math.hypot(x, y) <= deadZone ? { x: 0, y: 0 } : cardinalAim(x, y, aim2, 0.15);
    change(aim2, true);
  };
  const reset = bindHoldControl(element, (e) => {
    const r = element.getBoundingClientRect();
    center = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    update(e);
  }, () => {
    center = null;
    aim2 = { x: 0, y: 0 };
    change(aim2, false);
  }, { move: update });
  return reset;
}
function mobileAttack({ held: held2, aim: aim2, playing }) {
  const direction = cardinalAim(aim2.x, aim2.y), fire = !!(playing && held2 && (direction.x || direction.y));
  return { fire, auto: false, ax: fire ? direction.x : 0, ay: fire ? direction.y : 0 };
}
function bindPanelShortcuts(target2, { isOpen, close }) {
  target2.addEventListener("keydown", (e) => {
    if (!isOpen() || !["escape", "p"].includes(e.key.toLowerCase())) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (!e.repeat) close();
  }, true);
}
function bindMapShortcut(target2, { canToggle, toggle: toggle2 }) {
  target2.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() !== "m" || e.ctrlKey || e.altKey || e.metaKey || e.isComposing) return;
    if (e.target?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(e.target?.tagName) || !canToggle()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (!e.repeat) toggle2();
  }, true);
}
function setupMobileUI({ suspend, resume: resume2, resetInput, pause: pause2, notify, canOpenMap = () => false }) {
  const media = matchMedia(MOBILE_QUERY);
  const layoutOptions = [...document.querySelectorAll("[data-touch-layout-option]")];
  function applyTouchLayout(value) {
    const layout2 = value === "wide" ? "wide" : "balanced";
    document.documentElement.dataset.touchLayout = layout2;
    layoutOptions.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.touchLayoutOption === layout2)));
    return layout2;
  }
  try {
    applyTouchLayout(localStorage.getItem("naiwa-touch-layout"));
  } catch {
    applyTouchLayout("balanced");
  }
  layoutOptions.forEach((b) => b.onclick = () => {
    resetInput();
    const layout2 = applyTouchLayout(b.dataset.touchLayoutOption);
    try {
      localStorage.setItem("naiwa-touch-layout", layout2);
    } catch {
    }
    ;
    scaleReadout();
  });
  const scaleOptions = [...document.querySelectorAll("[data-touch-scale-option]")], readout = document.querySelector("#touchScaleReadout");
  function applyTouchScale(value) {
    const step = Math.min(5, Math.max(1, Math.round(Number(value)) || 3));
    document.documentElement.dataset.touchScale = String(step);
    scaleOptions.forEach((b) => b.setAttribute("aria-checked", String(Number(b.dataset.touchScaleOption) === step)));
    return step;
  }
  function scaleReadout() {
    if (!readout) return;
    requestAnimationFrame(() => {
      const room = virtualRect(document.querySelector("#game")), fire = document.querySelector("#touchFire"), pad = virtualRect(fire).width - 2 * (parseFloat(getComputedStyle(fire).getPropertyValue("--slop")) || 0);
      readout.textContent = media.matches && room.width ? `\u623F\u95F4 ${Math.round(room.width)} \xD7 ${Math.round(room.height)} \xB7 \u653B\u51FB\u952E ${Math.round(pad)} px` : "";
    });
  }
  try {
    applyTouchScale(localStorage.getItem("naiwa-touch-scale") ?? 3);
  } catch {
    applyTouchScale(3);
  }
  scaleOptions.forEach((b) => b.onclick = () => {
    resetInput();
    const step = applyTouchScale(b.dataset.touchScaleOption);
    try {
      localStorage.setItem("naiwa-touch-scale", String(step));
    } catch {
    }
    ;
    scaleReadout();
  });
  const portrait = viewportMedia("(orientation:portrait)"), aside = document.querySelector("aside"), backdrop = document.querySelector("#mobileBackdrop");
  const buttons = [...document.querySelectorAll("[data-mobile-panel]")];
  let suspended = false, previousFocus = null;
  const menu = document.querySelector("#mobileMenuLayer"), menuToggle = document.querySelector("#mobileMenuToggle");
  let menuSuspended = false;
  function menuLabels() {
    for (const [target2, source] of [["menuSound", "sound"]]) {
      const b = document.getElementById(target2), s = document.getElementById(source);
      b.textContent = s.textContent;
    }
    scaleReadout();
  }
  function closeMenu() {
    if (menu.hidden) return;
    menu.hidden = true;
    menuToggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("mobile-panel-open");
    if (menuSuspended) resume2();
    menuSuspended = false;
    resetInput();
    menuToggle.focus({ preventScroll: true });
  }
  menuToggle.onclick = () => {
    if (!menu.hidden) {
      closeMenu();
      return;
    }
    close();
    menuSuspended = suspend();
    resetInput();
    menu.hidden = false;
    menuToggle.setAttribute("aria-expanded", "true");
    document.body.classList.add("mobile-panel-open");
    menuLabels();
    document.querySelector("#mobileMenuClose").focus({ preventScroll: true });
  };
  document.querySelector("#mobileMenuClose").onclick = closeMenu;
  menu.addEventListener("click", (e) => {
    if (e.target === menu) closeMenu();
  });
  menu.querySelectorAll("[data-menu-action]").forEach((b) => b.onclick = () => {
    const action = b.dataset.menuAction;
    if (action === "sound") {
      document.getElementById(action).click();
      menuLabels();
      return;
    }
    if (action === "rotate") {
      flipSideways();
      return;
    }
    closeMenu();
    if (["map", "stats", "inventory"].includes(action)) document.querySelector(`[data-mobile-panel="${action}"]`).click();
    else document.getElementById(action).click();
  });
  function close() {
    if (!aside.dataset.openPanel) return;
    delete aside.dataset.openPanel;
    aside.removeAttribute("role");
    aside.removeAttribute("aria-modal");
    document.body.classList.remove("mobile-panel-open");
    backdrop.hidden = true;
    buttons.forEach((b) => b.setAttribute("aria-expanded", "false"));
    resetInput();
    if (suspended) resume2();
    suspended = false;
    previousFocus?.focus({ preventScroll: true });
  }
  buttons.forEach((button) => button.addEventListener("click", () => {
    if (aside.dataset.openPanel === button.dataset.mobilePanel) {
      close();
      return;
    }
    if (!aside.dataset.openPanel) {
      previousFocus = media.matches ? button : document.activeElement;
      suspended = suspend();
      resetInput();
    }
    aside.dataset.openPanel = button.dataset.mobilePanel;
    aside.setAttribute("role", "dialog");
    aside.setAttribute("aria-modal", "true");
    document.body.classList.add("mobile-panel-open");
    backdrop.hidden = false;
    buttons.forEach((b) => b.setAttribute("aria-expanded", String(b === button)));
    document.querySelector("#closeMobilePanel").focus({ preventScroll: true });
  }));
  document.querySelector("#closeMobilePanel").addEventListener("click", close);
  backdrop.addEventListener("click", close);
  bindPanelShortcuts(window, { isOpen: () => !menu.hidden || !!aside.dataset.openPanel, close: () => {
    if (!menu.hidden) closeMenu();
    else close();
  } });
  bindMapShortcut(window, { canToggle: () => menu.hidden && (!!aside.dataset.openPanel || canOpenMap()), toggle: () => document.querySelector('[data-mobile-panel="map"]').click() });
  function layout() {
    if (!media.matches || portrait.matches) {
      close();
      closeMenu();
    }
    if (media.matches && portrait.matches) {
      resetInput();
      pause2();
    }
  }
  media.addEventListener("change", layout);
  portrait.addEventListener("change", layout);
  layout();
  matchMedia("(orientation:portrait)").addEventListener("change", (event) => {
    if (media.matches && matchMedia("(pointer:coarse)").matches && !consumeFullscreenTurn(event.matches)) {
      resetInput();
      pause2();
    }
  });
  let viewport = null;
  function flipSideways() {
    flipDirection(window);
    resetInput();
    viewport?.refresh();
    scaleReadout();
  }
  if (!canGoFullscreen()) document.querySelector('[data-menu-action="mobileFullscreen"]')?.setAttribute("hidden", "");
  document.querySelector("#mobileFullscreen").addEventListener("click", async () => {
    const result = await toggleGameFullscreen({ mobile: matchMedia("(pointer:coarse)").matches });
    if (result === "unsupported") notify("\u6B64\u6D4F\u89C8\u5668\u4E0D\u652F\u6301\u7F51\u9875\u5168\u5C4F\uFF0C\u5DF2\u4F7F\u7528\u6A2A\u5C4F\u94FA\u6EE1\u5E03\u5C40\u3002");
    else if (result === "denied") notify("\u6D4F\u89C8\u5668\u672A\u5141\u8BB8\u5168\u5C4F\uFF0C\u53EF\u7EE7\u7EED\u6A2A\u5C4F\u6E38\u73A9\u6216\u6536\u8D77\u5730\u5740\u680F\u3002");
  });
  document.querySelector("#quickFullscreen").onclick = () => document.querySelector("#mobileFullscreen").click();
  for (const type of ["selectstart", "contextmenu", "dragstart"]) document.querySelector(".game-column").addEventListener(type, (e) => e.preventDefault());
  document.querySelector("#game").addEventListener("pointerdown", (e) => e.preventDefault());
  viewport = installMobileViewport({ media, resetInput });
}

// dist/hazard-art.js
function drawHazards(c, g, t) {
  c.save();
  c.font = "bold 11px system-ui";
  c.textAlign = "center";
  for (const h2 of g.room.hazards || []) {
    const x = h2.x - h2.w / 2, y = h2.y - h2.h / 2, p = hazardPhase(g, h2), on = hazardEnabled(g, h2), active = on && hazardActive(g, h2), warning = on && !active && p < (h2.kind === "resonance" ? 0.65 : h2.kind === "electric" ? 0.6 : 0.8);
    if (h2.channel) {
      const src = g.room.obstacles.find((o) => o.device && o.channel === h2.channel);
      if (src) {
        c.strokeStyle = on ? "#956baf" : "#657d6f";
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(src.x, src.y);
        c.lineTo(h2.x, src.y);
        c.lineTo(h2.x, h2.y);
        c.stroke();
      }
    }
    c.fillStyle = "#283d42";
    c.fillRect(x - 4, y - 4, h2.w + 8, h2.h + 8);
    if (h2.kind === "milk") {
      c.fillStyle = on ? "#fff0c3" : "#82958a";
      c.fillRect(x, y, h2.w, h2.h);
      c.fillStyle = on ? "#e0c796" : "#6c8076";
      for (let i = 8; i < h2.w; i += 25) {
        c.fillRect(x + i, y + 9, 12, 4);
        c.fillRect(x + i, y + h2.h - 14, 8, 4);
      }
      c.fillStyle = "#9e7754";
      for (let i = 0; i < 4; i++) c.fillRect(h2.x - 13 + i * 8, h2.y - 8, 3, 16);
    } else if (h2.kind === "belt") {
      const v = beltVector(g, h2), vertical = !!v.y, sign = vertical ? v.y : v.x, extent = vertical ? h2.h : h2.w;
      c.fillStyle = "#555e60";
      c.fillRect(x, y, h2.w, h2.h);
      c.save();
      c.beginPath();
      c.rect(x, y, h2.w, h2.h);
      c.clip();
      for (let n = -28; n < extent + 28; n += 28) {
        const q = n + t * sign * 45 % 28;
        c.fillStyle = "#93968b";
        if (vertical) c.fillRect(x + 5, y + q, h2.w - 10, 3);
        else c.fillRect(x + q, y + 5, 3, h2.h - 10);
      }
      c.restore();
      c.strokeStyle = "#f1d366";
      c.lineWidth = 4;
      for (let n = 24; n < extent - 8; n += 48) {
        const ax = vertical ? h2.x : x + n, ay = vertical ? y + n : h2.y;
        c.beginPath();
        c.moveTo(ax - v.x * 9 - v.y * 9, ay - v.y * 9 + v.x * 9);
        c.lineTo(ax + v.x * 8, ay + v.y * 8);
        c.lineTo(ax - v.x * 9 + v.y * 9, ay - v.y * 9 - v.x * 9);
        c.stroke();
      }
      c.fillStyle = "#d6b865";
      if (vertical) {
        c.fillRect(x - 3, y, 5, h2.h);
        c.fillRect(x + h2.w - 2, y, 5, h2.h);
      } else {
        c.fillRect(x, y - 3, h2.w, 5);
        c.fillRect(x, y + h2.h - 2, h2.w, 5);
      }
      if (h2.reverse) {
        c.fillStyle = "#eadba8";
        c.fillText("\u6362\u5411 " + (4 - Math.floor((g.elapsed - (g.room.enteredAt || 0)) % 4)), h2.x, y - 9);
      }
    } else {
      const color = h2.kind === "resonance" ? "#b391d2" : h2.kind === "press" ? "#b99b67" : "#9b94e0";
      c.fillStyle = active ? "#e98578" : warning ? "#f3d58c" : on ? "#536a71" : "#4a6257";
      c.fillRect(x, y, h2.w, h2.h);
      c.strokeStyle = active ? "#fff0b9" : color;
      c.lineWidth = 3;
      c.strokeRect(x, y, h2.w, h2.h);
      if (h2.kind === "resonance") {
        for (let i = 8; i < h2.w - 8; i += 16) {
          const size = active ? Math.round(10 + Math.abs(Math.sin(t * 15 + i)) * Math.min(34, h2.h - 16)) : 4;
          c.fillStyle = active ? "#fbe3ff" : color;
          c.fillRect(x + i, h2.y - size / 2, 7, size);
        }
        for (const sx of [x - 12, x + h2.w + 4]) {
          c.fillStyle = "#45365b";
          c.fillRect(sx, y + 5, 8, h2.h - 10);
          c.fillStyle = color;
          c.fillRect(sx + 2, h2.y - 8, 4, 16);
        }
      } else if (h2.kind === "press") {
        for (let i = 0; i < h2.w; i += 12) {
          c.fillStyle = i % 24 ? "#3f4145" : "#edbc59";
          c.fillRect(x + i, y, Math.min(12, h2.w - i), 8);
          c.fillRect(x + i, y + h2.h - 8, Math.min(12, h2.w - i), 8);
        }
        for (const sx of [x + 7, x + h2.w - 15]) {
          c.fillStyle = "#303f4b";
          c.fillRect(sx, y + 12, 8, h2.h - 24);
          c.fillStyle = "#b8c7c3";
          c.fillRect(sx + 2, y + 12, 4, active ? h2.h - 24 : warning ? Math.max(4, p / 0.8 * (h2.h - 24)) : 8);
        }
        if (active) {
          c.fillStyle = "#b3bab7";
          c.fillRect(x + 18, y + 12, h2.w - 36, h2.h - 24);
          c.fillStyle = "#6c787a";
          for (let yy = y + 20; yy < y + h2.h - 18; yy += 16) c.fillRect(x + 21, yy, h2.w - 42, 4);
        }
      } else {
        const vertical = h2.h > h2.w, len = vertical ? h2.h : h2.w;
        c.strokeStyle = active ? "#ecf3ff" : "#9b94bd";
        c.lineWidth = active ? 4 : 2;
        c.beginPath();
        for (let n = 0; n <= len; n += 10) {
          const zig = active ? Math.floor(n / 10) % 2 ? 9 : -9 : 0, ax = h2.x + (vertical ? zig : n - len / 2), ay = h2.y + (vertical ? n - len / 2 : zig);
          if (n === 0) c.moveTo(ax, ay);
          else c.lineTo(ax, ay);
        }
        c.stroke();
        for (const end2 of [-1, 1]) {
          const ax = h2.x + (vertical ? 0 : end2 * h2.w / 2), ay = h2.y + (vertical ? end2 * h2.h / 2 : 0);
          c.fillStyle = "#433855";
          c.fillRect(ax - 9, ay - 9, 18, 18);
          c.fillStyle = on ? "#e9cb8d" : "#6c8e78";
          c.fillRect(ax - 4, ay - 4, 8, 8);
        }
      }
      if (warning) {
        c.fillStyle = "#4e463e";
        c.fillRect(x + 5, y + h2.h - 5, (h2.w - 10) * (p / (h2.kind === "resonance" ? 0.65 : h2.kind === "electric" ? 0.6 : 0.8)), 3);
      }
    }
  }
  c.restore();
}

// dist/mob-art.js
function drawMobCues(ctx2, g) {
  drawSoundMobs(ctx2, g);
  ctx2.save();
  ctx2.font = "11px system-ui";
  ctx2.textAlign = "center";
  ctx2.lineWidth = 2;
  for (const e of g.room.enemies) {
    if (e.dead || !e.mobCast) continue;
    const c = e.mobCast;
    ctx2.strokeStyle = "#b36369";
    ctx2.fillStyle = "#e8a56824";
    ctx2.setLineDash([6, 6]);
    if (["rush", "echo", "cross"].includes(c.kind)) {
      const count2 = c.kind === "cross" ? 4 : 1;
      for (let i = 0; i < count2; i++) {
        const a = c.aim + i * Math.PI / 2, l = c.kind === "rush" ? 220 : 320;
        ctx2.beginPath();
        ctx2.moveTo(e.x, e.y);
        ctx2.lineTo(e.x + Math.cos(a) * l, e.y + Math.sin(a) * l);
        ctx2.stroke();
      }
    } else if (c.kind === "mend") {
      ctx2.strokeStyle = "#5a9a7c";
      ctx2.beginPath();
      ctx2.moveTo(e.x, e.y);
      ctx2.lineTo(c.target.x, c.target.y);
      ctx2.stroke();
    } else {
      ctx2.beginPath();
      ctx2.arc(e.x, e.y, c.kind === "conduct" ? 175 : 85, 0, 7);
      ctx2.fill();
      ctx2.stroke();
    }
    ctx2.setLineDash([]);
    ctx2.fillStyle = "#8f4953";
    ctx2.fillText({ rush: "\u51B2\u950B\u9501\u5B9A", echo: "\u56DE\u58F0\u4E09\u8FDE \xB7 \u5C0F\u5FC3\u6298\u8FD4", cross: "\u5341\u5B57\u9884\u8B66", mend: "\u6B63\u5728\u7F1D\u8865", conduct: "\u5408\u594F\u9884\u5907 \xB7 \u4F18\u5148\u6253\u65AD", detonate: "\u5373\u5C06\u81EA\u7206" }[c.kind], e.x, e.y - 50);
  }
  for (const f of g.effects) {
    if (f.type === "mobHeal") {
      ctx2.fillStyle = "#41946b";
      ctx2.font = "bold 18px system-ui";
      ctx2.fillText("+2", f.x, f.y - 25 - (1 - f.life / f.max) * 18);
    }
    if (f.type !== "mobZone") continue;
    const active = f.max - f.life >= f.wind;
    ctx2.fillStyle = active ? "#e4917777" : "#e4ba862b";
    ctx2.strokeStyle = f.kind === "electric" ? "#9571b1" : "#b58365";
    ctx2.setLineDash(active ? [] : [5, 5]);
    ctx2.beginPath();
    ctx2.arc(f.x, f.y, f.radius, 0, 7);
    ctx2.fill();
    ctx2.stroke();
    ctx2.setLineDash([]);
    ctx2.fillStyle = "#735056";
    ctx2.font = "11px system-ui";
    ctx2.fillText({ curd: "\u5976\u56E2\u5C06\u6E85\u5F00", parcel: "\u5305\u88F9\u843D\u70B9", electric: active ? "\u901A\u7535" : "\u7535\u7F51\u9884\u8B66" }[f.kind], f.x, f.y + 5);
    if (f.kind === "parcel") {
      const p = Math.min(1, (f.max - f.life) / f.wind), x = (f.owner?.x ?? f.sx) + (f.x - (f.owner?.x ?? f.sx)) * p, y = (f.owner?.y ?? f.sy) + (f.y - (f.owner?.y ?? f.sy)) * p - Math.sin(p * Math.PI) * 90;
      ctx2.fillStyle = "#c9a077";
      ctx2.fillRect(x - 12, y - 12, 24, 24);
      ctx2.strokeRect(x - 12, y - 12, 24, 24);
    }
  }
  ctx2.restore();
}

// dist/content-art.js
function pool(ctx2, x, y, radius, fill, edge, alpha = 1) {
  ctx2.save();
  ctx2.globalAlpha = alpha;
  ctx2.fillStyle = fill;
  for (let yy = -radius; yy <= radius; yy += 4) {
    const half = Math.sqrt(Math.max(0, radius * radius - yy * yy));
    ctx2.fillRect(Math.round((x - half) / 2) * 2, Math.round((y + yy) / 2) * 2, Math.round(half) * 2, 4);
  }
  pixelRing(ctx2, x, y, radius, edge, 3);
  for (let i = 0; i < 6; i++) {
    const a = i * 2.4, r = radius * (0.25 + i * 0.07);
    ctx2.fillStyle = "#ffffff55";
    ctx2.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), 6, 2);
  }
  ctx2.restore();
}
function drawContent(ctx2, g, t) {
  drawMobCues(ctx2, g);
  for (const e of g.room.enemies) if (e.type === "soundTurret") drawScreech(ctx2, e);
  ctx2.save();
  ctx2.textAlign = "center";
  ctx2.font = "11px system-ui";
  drawHazards(ctx2, g, t);
  for (const e of g.room.enemies) if (!e.dead && e.gunCast) {
    const a = e.gunCast.aim;
    ctx2.fillStyle = "#e6b56b";
    for (let d = 30; d < 130; d += 12) ctx2.fillRect(Math.round(e.x + Math.cos(a) * d), Math.round(e.y - 9 + Math.sin(a) * d), 4, 4);
  }
  for (const fx of g.effects) {
    if (fx.type === "milkPool") pool(ctx2, fx.x, fx.y, fx.radius, fx.friendly ? "#a3e1ca9c" : "#fff2d3ad", fx.friendly ? "#519a82" : "#b76f72", Math.min(1, fx.life / 0.8));
    if (fx.type === "handImpact") pool(ctx2, fx.x, fx.y, fx.radius, "#c7a18866", "#976350", fx.life / fx.max);
    if (fx.type === "dollPod") {
      pool(ctx2, fx.x, fx.y, fx.radius, "#be8eaa30", "#ae617c");
      ctx2.fillStyle = "#8b425c";
      ctx2.fillText("\u602A\u7269\u843D\u70B9", fx.x, fx.y + fx.radius + 15);
      const a = 1 - fx.life / fx.max, x = fx.sx + (fx.x - fx.sx) * a, y = fx.sy + (fx.y - fx.sy) * a - Math.sin(a * Math.PI) * 100;
      ctx2.fillStyle = "#d4b193";
      ctx2.strokeStyle = "#805b59";
      ctx2.beginPath();
      ctx2.roundRect(x - 17, y - 18, 34, 36, 8);
      ctx2.fill();
      ctx2.stroke();
      ctx2.fillStyle = "#514240";
      ctx2.fillRect(x - 9, y - 7, 5, 6);
      ctx2.fillRect(x + 5, y - 7, 5, 6);
    }
  }
  for (const e of g.room.enemies) {
    if (e.dead || !e.hands) continue;
    const h2 = e.hands;
    if (h2.cancelled || ["sweep", "cargo", "gate"].includes(h2.mode)) continue;
    const offset = h2.mode === "block" ? 110 : 55;
    if (h2.mode === "smash") {
      ctx2.fillStyle = "#944e43";
      ctx2.fillText("\u8FFD\u51FB\u7838\u624B " + (h2.wave + 1) + "/" + h2.total + " \xB7 \u843D\u70B9\u9501\u5B9A\u540E\u79FB\u52A8", h2.x, h2.y - 80);
      for (const x of [h2.x - 55, h2.x + 55]) {
        ctx2.setLineDash(h2.t < h2.wind ? [7, 6] : []);
        ctx2.strokeStyle = "#b76656";
        ctx2.beginPath();
        ctx2.arc(x, h2.y, 65, 0, Math.PI * 2);
        ctx2.stroke();
        ctx2.setLineDash([]);
      }
    }
    for (const s of [-1, 1]) {
      const x = h2.x + s * offset, y = h2.y;
      ctx2.strokeStyle = "#b59972";
      ctx2.lineWidth = 14;
      ctx2.beginPath();
      ctx2.moveTo(e.x + s * 40, e.y);
      ctx2.quadraticCurveTo(e.x + s * 110, y - 70, x, y);
      ctx2.stroke();
      ctx2.fillStyle = h2.t < h2.wind ? "#d49f6e55" : "#d6b083";
      ctx2.strokeStyle = h2.t < h2.wind ? "#c56e58" : "#866643";
      ctx2.lineWidth = 3;
      const w = h2.mode === "block" ? 62 : 90, hh = h2.mode === "block" ? 174 : 110;
      ctx2.beginPath();
      ctx2.roundRect(x - w / 2, y - hh / 2, w, hh, 15);
      ctx2.fill();
      ctx2.stroke();
      ctx2.fillStyle = "#75533f";
      ctx2.font = "11px system-ui";
      ctx2.fillText(h2.t < h2.wind ? "\u5373\u5C06\u843D\u624B" : h2.mode === "block" ? "\u70B8\u5F39\u53EF\u51FB\u9000" : "\u7838\uFF01", x, y);
    }
  }
  drawCatcherCombos(ctx2, g);
  drawCraneGates(ctx2, g);
  drawPuppetAttack(ctx2, g);
  drawFinalFight(ctx2, g);
  ctx2.restore();
}

// dist/terrain-art.js
var themes = [
  { crate: "#c6a477", edge: "#77583c", rock: "#9a9d86", pillar: "#858d7c", pit: "#384d4a", label: "\u5976\u7BB1" },
  { crate: "#a799ba", edge: "#665675", rock: "#93909e", pillar: "#626578", pit: "#343447", label: "\u97F3\u7BB1" },
  { crate: "#b5986e", edge: "#6c573b", rock: "#9f987f", pillar: "#74796c", pit: "#443f34", label: "\u8D27\u7BB1" },
  { crate: "#aaaabc", edge: "#68677d", rock: "#9b9ca8", pillar: "#707c8c", pit: "#343e4a", label: "\u96F6\u4EF6" },
  { crate: "#b18a8b", edge: "#704d58", rock: "#9e9292", pillar: "#7c6872", pit: "#46313d", label: "\u5C01\u7BB1" }
];
function drawTerrain(ctx2, room, floor) {
  const theme = themes[floor - 1];
  ctx2.save();
  for (const b of room.bridges || []) {
    ctx2.fillStyle = theme.rock;
    ctx2.fillRect(b.x - 26, b.y - 26, 52, 52);
    ctx2.strokeStyle = theme.edge;
    ctx2.lineWidth = 2;
    for (let i = -18; i <= 18; i += 12) {
      ctx2.beginPath();
      ctx2.moveTo(b.x - 22, b.y + i);
      ctx2.lineTo(b.x + 22, b.y + i + 5);
      ctx2.stroke();
    }
  }
  for (const o of room.obstacles) {
    if (o.kind !== "pit") continue;
    const neighbor = (dx, dy) => room.obstacles.some((p) => p.kind === "pit" && p.x === o.x + dx && p.y === o.y + dy);
    ctx2.fillStyle = "#182728";
    ctx2.fillRect(o.x - 26, o.y - 26, 52, 52);
    ctx2.fillStyle = theme.pit;
    ctx2.fillRect(o.x - 26, o.y - 14, 52, 31);
    ctx2.strokeStyle = "#c2bda0";
    ctx2.lineWidth = 3;
    ctx2.beginPath();
    if (!neighbor(0, -52)) {
      ctx2.moveTo(o.x - 26, o.y - 26);
      ctx2.lineTo(o.x + 26, o.y - 26);
    }
    if (!neighbor(0, 52)) {
      ctx2.moveTo(o.x - 26, o.y + 26);
      ctx2.lineTo(o.x + 26, o.y + 26);
    }
    if (!neighbor(-52, 0)) {
      ctx2.moveTo(o.x - 26, o.y - 26);
      ctx2.lineTo(o.x - 26, o.y + 26);
    }
    if (!neighbor(52, 0)) {
      ctx2.moveTo(o.x + 26, o.y - 26);
      ctx2.lineTo(o.x + 26, o.y + 26);
    }
    ctx2.stroke();
    ctx2.strokeStyle = "#131d2555";
    ctx2.lineWidth = 2;
    ctx2.beginPath();
    ctx2.moveTo(o.x - 10, o.y + 4);
    ctx2.lineTo(o.x + 10, o.y + 4);
    ctx2.stroke();
  }
  for (const o of room.obstacles) {
    if (o.kind === "pit" || o.kind === "hand" || o.wardrobe) continue;
    const w = o.w || o.r * 2, h2 = o.h || o.r * 2, x = o.x - w / 2, y = o.y - h2 / 2;
    if (o.kind === "barrel") {
      drawBarrel(ctx2, o, floor);
      continue;
    }
    if (o.device) {
      ctx2.fillStyle = o.disabled > 0 ? "#777d78" : o.kind === "milkValve" ? "#ecdfb0" : o.kind === "assembler" ? "#b79a7f" : "#a18ab9";
      ctx2.strokeStyle = "#51485b";
      ctx2.lineWidth = 3;
      ctx2.beginPath();
      ctx2.rect(x, y, w, h2);
      ctx2.fill();
      ctx2.stroke();
      ctx2.fillStyle = "#423d47";
      ctx2.fillRect(x + 6, y + 7, w - 12, h2 - 14);
      ctx2.fillStyle = o.disabled > 0 ? "#8c9690" : o.kind === "assembler" && o.timer < 0.9 ? "#f2a07f" : "#e6d59e";
      ctx2.beginPath();
      ctx2.arc(o.x, o.y, 9, 0, 7);
      ctx2.fill();
      ctx2.textAlign = "center";
      ctx2.font = "bold 11px system-ui";
      ctx2.fillStyle = "#56415b";
      const name = { milkValve: "\u5976\u9600", resonator: "\u5171\u632F\u5668", assembler: "\u9020\u602A\u53E3", relay: "\u4F9B\u7535\u67F1" }[o.kind];
      ctx2.fillText(o.disabled > 0 ? name + " \xB7 \u505C " + Math.ceil(o.disabled) + "\u79D2" : name + (o.kind === "assembler" ? " " + o.spawned + "/3" : ""), o.x, y - 9);
      ctx2.fillStyle = "#625c6b";
      ctx2.fillRect(x, y + h2 + 6, w, 4);
      ctx2.fillStyle = "#e9c681";
      ctx2.fillRect(x, y + h2 + 6, w * Math.max(0, o.hp / o.maxHp), 4);
      continue;
    }
    ctx2.fillStyle = "#28393230";
    ctx2.fillRect(x + 4, y + 9, w, h2);
    ctx2.fillStyle = o.kind === "crate" ? theme.crate : o.kind === "pillar" ? theme.pillar : theme.rock;
    ctx2.strokeStyle = theme.edge;
    ctx2.lineWidth = 2;
    ctx2.beginPath();
    ctx2.rect(x, y, w, h2);
    ctx2.fill();
    ctx2.stroke();
    ctx2.fillStyle = "#ffffff18";
    ctx2.fillRect(x + 3, y + 3, w - 6, 7);
    if (o.kind === "crate") {
      ctx2.strokeStyle = theme.edge;
      ctx2.lineWidth = 3;
      ctx2.strokeRect(x + 5, y + 5, w - 10, h2 - 10);
      for (let n = 6; n < w - 6; n += 4) {
        ctx2.fillStyle = theme.edge;
        ctx2.fillRect(x + n, y + h2 - n - 4, 4, 4);
      }
      ctx2.fillStyle = "#f5e9c7";
      ctx2.fillRect(o.x - 12, o.y - 9, 24, 17);
      ctx2.fillStyle = theme.edge;
      ctx2.textAlign = "center";
      ctx2.font = "9px system-ui";
      ctx2.fillText(theme.label, o.x, o.y + 3);
      if (o.hp < 3) {
        ctx2.strokeStyle = "#573b36";
        ctx2.lineWidth = 2;
        ctx2.beginPath();
        ctx2.moveTo(o.x - 3, y + 3);
        ctx2.lineTo(o.x + 4, o.y - 5);
        ctx2.lineTo(o.x - 4, o.y + 7);
        ctx2.lineTo(o.x + 2, y + h2 - 2);
        ctx2.stroke();
      }
    } else if (o.kind === "pillar") {
      ctx2.strokeStyle = "#e7e7dc45";
      ctx2.strokeRect(x + 7, y + 7, w - 14, h2 - 14);
      ctx2.fillStyle = "#e3dcc0";
      for (const dx of [-14, 14]) for (const dy of [-14, 14]) {
        ctx2.beginPath();
        ctx2.arc(o.x + dx, o.y + dy, 2, 0, Math.PI * 2);
        ctx2.fill();
      }
    } else {
      ctx2.strokeStyle = "#525947";
      ctx2.beginPath();
      ctx2.moveTo(o.x - 5, y + 4);
      ctx2.lineTo(o.x + 3, o.y - 4);
      ctx2.lineTo(o.x - 4, o.y + 6);
      ctx2.lineTo(o.x + 10, y + h2 - 6);
      ctx2.stroke();
      if (o.bridgeTo) {
        ctx2.fillStyle = "#f5df99";
        ctx2.textAlign = "center";
        ctx2.font = "bold 21px system-ui";
        ctx2.fillText(o.bridgeTo.y > o.y ? "\u2193" : "\u2191", o.x, o.y + 8);
        ctx2.font = "10px system-ui";
        ctx2.fillText("\u6865\u77F3", o.x, y - 5);
      }
      if (o.stash) {
        ctx2.strokeStyle = "#7ae2eb";
        ctx2.lineWidth = 4;
        ctx2.beginPath();
        ctx2.moveTo(x + 8, y + 8);
        ctx2.lineTo(o.x + 4, o.y - 2);
        ctx2.lineTo(x + w - 7, y + 7);
        ctx2.moveTo(o.x + 4, o.y - 2);
        ctx2.lineTo(o.x - 2, y + h2 - 6);
        ctx2.stroke();
        ctx2.fillStyle = "#b7f4ec";
        ctx2.textAlign = "center";
        ctx2.font = "bold 10px system-ui";
        ctx2.fillText("\u85CF", o.x, y + h2 - 7);
      }
    }
  }
  ctx2.restore();
}

// dist/stats.js
function createStatsPanel(panel, compact = null) {
  const compactFields = compact ? [...compact.querySelectorAll("[data-compact-stat]")] : [];
  const fields = Object.fromEntries([...panel.querySelectorAll("[data-stat]")].map((el) => [el.dataset.stat, el]));
  const flashed = /* @__PURE__ */ new Set(["health", "damage", "rate", "speed", "shots"]);
  const flash = (el) => {
    if (el.dataset) el.dataset.flash = el.dataset.flash === "a" ? "b" : "a";
  };
  const set = (key, value) => {
    if (fields[key].textContent !== value) {
      fields[key].textContent = value;
      if (flashed.has(key)) flash(fields[key]);
    }
  };
  const remaining = (seconds) => `${Math.max(0.1, Math.ceil(seconds * 10) / 10).toFixed(1)} \u79D2`;
  return (game2) => {
    const p = game2.p, voice2 = voiceStats(game2);
    set("state", { title: "\u5C1A\u672A\u51FA\u53D1", play: "\u5B9E\u65F6\u66F4\u65B0", paused: "\u5DF2\u6682\u505C", help: "\u67E5\u770B\u8BF4\u660E", choice: "\u9009\u62E9\u9053\u5177", revive: "\u89C2\u770B\u590D\u6D3B\u5E7F\u544A", dead: "\u672C\u5C40\u7ED3\u675F", win: "\u5DF2\u901A\u5173", rescue: "\u5927\u7B11\u6551\u63F4\u4E2D" }[game2.mode]);
    set("health", `${p.hp} / ${p.maxHp}`);
    set("damage", playerAttackDamage(game2).toFixed(2));
    set("rate", `${(1 / chronoAttackInterval(game2, p.rate * voice2.interval * gearInterval(game2) * memeInterval(game2) * deepStats(game2).interval)).toFixed(2)} \u6B21/\u79D2`);
    set("speed", `${Math.round(p.speed * (mambaActive(game2) ? 1.25 : 1) * (sandyActive(game2) ? 1.35 : 1) * (game2.phoebeBoost > 0 ? 1.2 : 1) * (game2.tempuraBuff > 0 ? 1.15 : 1))}`);
    set("shots", `${(game2.has("double") ? 2 : 1) * voice2.shots} \u53D1`);
    set("shield", p.shield ? game2.has("lotus") ? "\u5DF2\u5C31\u7EEA \xB7 \u62B5\u6321 1 \u6B21" : "\u4E00\u6B21\u6027 \xB7 \u62B5\u6321 1 \u6B21" : !game2.has("lotus") ? "\u672A\u83B7\u5F97" : `${remaining(p.shieldCD)}\u540E\u6062\u590D`);
    set("dash", p.dash > 0 ? "\u86D9\u8DF3\u4E2D \xB7 \u65E0\u654C" : p.dashCD > 0 ? `${remaining(p.dashCD)}\u540E\u5C31\u7EEA` : "\u5DF2\u5C31\u7EEA");
    if (fields.active) {
      set("active", `${Math.floor(game2.activeCharge)} / ${game2.activeCost()}`);
      panel.querySelector('[data-meter="active"]').value = game2.activeCharge / game2.activeCost();
    }
    set("laugh", game2.has("laugh") ? p.laugh > 0 ? `${remaining(p.laugh)}\u540E\u89E6\u53D1` : "\u5373\u5C06\u89E6\u53D1" : "\u672A\u83B7\u5F97");
    set("effects", [...PHOEBE_ITEMS.map((i) => [i.id, i.name]), ...DEEPSEEK_ITEMS.map((i) => [i.id, i.name]), ...CHRONO_ITEMS.map((i) => [i.id, i.name]), ...MEME_ITEMS.map((i) => [i.id, i.name]), ...COMBO_ITEMS.map((i) => [i.id, i.name]), ["fanvoice", "\u6247\u5F62\u8FD1\u6218"], ["heavyvoice", "\u91CD\u578B\u7A7F\u900F\u7B11\u5F39"], ["returnvoice", "\u5F80\u8FD4\u58F0\u6CE2"], ["eye", "\u6BD2\u7B11"], ["double", "\u53CC\u53D1"], ["tongue", "\u7A7F\u900F"], ["bubble", "\u53CD\u5F39"], ["homing", "\u8FFD\u8E2A"], ["split", "\u5206\u88C2"], ["mouse", "\u5976\u9F20"], ["dog", "\u5976\u72D7"], ["egg", "\u5976\u86CB"], ["turtle", "\u5976\u9F9F"], ["rabbit", "\u5976\u5154"], ["milkboots", "\u5976\u8FF9\u514D\u75AB"], ["milkfilter", "\u5976\u8FF9\u589E\u4F24"], ["spillcup", "\u7206\u7B11\u7559\u5976"], ["milkfoam", "\u5976\u6CE1\u7559\u75D5"], ["tadpole", "\u874C\u86AA\u4F19\u4F34"]].filter(([id]) => game2.has(id)).map(([, name]) => name).join(" \xB7 ") || "\u666E\u901A\u5927\u7B11");
    if (sandyActive(game2) && game2.mode === "play") set("state", `\u65AF\u5B89\u5A01\u65AF\u5766 ${game2.sandy.left.toFixed(1)}\u79D2`);
    if (fields.synergies) {
      const combos = [synergyText(game2), ...memeCombos(game2), ...deepCombos(game2), ...phoebeCombos(game2)].filter((t) => !t.startsWith("\u7EE7\u7EED\u6536\u96C6"));
      set("synergies", combos.join(" \xB7 ") || "\u7EE7\u7EED\u6536\u96C6\u9053\u5177\uFF0C\u7EC4\u5408\u4E0D\u540C\u6548\u679C");
    }
    if (fields.groundguard) {
      const guards = [];
      if (game2.has("milkboots")) guards.push(game2.bootGuardCD > 0 ? "\u96E8\u9774 " + remaining(game2.bootGuardCD) + "\u540E\u6062\u590D" : "\u96E8\u9774\u5C31\u7EEA");
      if (game2.has("phoebesoot")) guards.push(game2.room.phoebeSootUsed ? "\u7535\u7126\u672C\u623F\u5DF2\u7528" : "\u7535\u7126\u672C\u623F\u53EF\u7528");
      set("groundguard", guards.join(" \xB7 ") || "\u672A\u83B7\u5F97");
    }
    if (mambaActive(game2)) set("effects", fields.effects.textContent + " \xB7 \u843D\u5730\u5F3A\u5316 " + remaining(game2.outUntil - (game2.actionClock ?? game2.elapsed)));
    if (game2.tempuraBuff > 0) set("effects", fields.effects.textContent + " \xB7 \u867E\u7C73\u5F3A\u5316 " + remaining(game2.tempuraBuff));
    if (fields.button) set("button", !game2.has("sparebutton") ? "\u672A\u83B7\u5F97" : game2.buttonFloor === game2.floor ? "\u672C\u5C42\u5DF2\u7528" : "\u672C\u5C42\u53EF\u7528");
    for (const el of compactFields) {
      const key = el.dataset.compactStat;
      let value = fields[key]?.textContent || "\u2014";
      if (key === "rate") value = value.replace(" \u6B21/\u79D2", "/s");
      if (key === "shield") value = p.shield ? "\u5C31\u7EEA" : game2.has("lotus") ? Math.ceil(Math.max(0, p.shieldCD)) + "s" : "\u65E0";
      if (el.textContent !== value) {
        el.textContent = value;
        if (key !== "shield") flash(el);
      }
    }
    fields.shield.dataset.ready = String(p.shield);
    fields.dash.dataset.ready = String(p.dashCD <= 0);
    fields.health.dataset.low = String(p.hp <= 2);
    const shieldBar = panel.querySelector('[data-meter="shield"]');
    const dashBar = panel.querySelector('[data-meter="dash"]');
    shieldBar.value = p.shield ? 1 : !game2.has("lotus") ? 0 : Math.max(0, 1 - p.shieldCD / 12);
    dashBar.value = Math.max(0, 1 - p.dashCD / (game2.has("feet") ? 1.3 : 2));
  };
}

// dist/resource-art.js
function drawResources(ctx2, g) {
  ctx2.save();
  ctx2.textAlign = "center";
  for (const d of suspiciousWalls(g)) {
    ctx2.save();
    ctx2.translate(d.x, d.y);
    if (d.side === "left" || d.side === "right") ctx2.rotate(Math.PI / 2);
    ctx2.fillStyle = "#675c4c";
    for (const [x, y, w, h2] of [[-10, -12, 6, 4], [-6, -8, 4, 10], [-2, -2, 8, 4], [4, 2, 4, 9], [8, 9, 6, 4]]) ctx2.fillRect(x, y, w, h2);
    ctx2.fillStyle = "#dbcc9b";
    ctx2.fillRect(-15, 13, 5, 3);
    ctx2.fillRect(13, -15, 4, 3);
    ctx2.restore();
    if (Math.hypot(g.p.x - d.x, g.p.y - d.y) < 105) {
      ctx2.fillStyle = "#e9dfbd";
      ctx2.fillRect(d.side === "left" ? 65 : d.side === "right" ? 685 : 365, d.side === "top" ? 132 : d.side === "bottom" ? 440 : 340, 230, 25);
      ctx2.fillStyle = "#625843";
      ctx2.font = "12px system-ui";
      ctx2.fillText("\u5899\u7070\u677E\u52A8\u4E86\u2026\u2026\u4E5F\u8BB8\u503C\u5F97\u68C0\u67E5", d.side === "left" ? 180 : d.side === "right" ? 800 : 480, d.side === "top" ? 149 : d.side === "bottom" ? 457 : 357);
    }
  }
  for (const d of roomNeighbors(g)) {
    const r = g.rooms[d.id];
    if (r.hidden && !r.revealed || !g.room.clear || !r.bombLocked && !r.locked) continue;
    const vertical = d.side === "left" || d.side === "right", w = vertical ? 42 : 82, h2 = vertical ? 82 : 42;
    ctx2.fillStyle = r.bombLocked ? "#8b8477" : "#cbb578";
    ctx2.strokeStyle = "#5b554c";
    ctx2.lineWidth = 3;
    ctx2.fillRect(d.x - w / 2, d.y - h2 / 2, w, h2);
    ctx2.strokeRect(d.x - w / 2, d.y - h2 / 2, w, h2);
    if (r.bombLocked) {
      ctx2.beginPath();
      ctx2.moveTo(d.x - 8, d.y - h2 / 2 + 4);
      ctx2.lineTo(d.x + 7, d.y - 7);
      ctx2.lineTo(d.x - 7, d.y + 10);
      ctx2.lineTo(d.x + 6, d.y + h2 / 2 - 4);
      ctx2.stroke();
    }
    ctx2.fillStyle = "#fff1bd";
    ctx2.font = "bold 16px system-ui";
    ctx2.fillText(r.bombLocked ? "\u2739" : "\u26BF", d.x, d.y + 5);
    const x = d.side === "left" ? 112 : d.side === "right" ? 848 : 480, y = d.side === "top" ? 92 : d.side === "bottom" ? 520 : 255;
    ctx2.fillStyle = "#554d40";
    ctx2.font = "bold 12px system-ui";
    ctx2.fillText(r.bombLocked ? "B \u70B8\u5899 \xB7 25% \u7A7A" : r.type === "vault" ? "1 \u94A5\u5319 \xB7 25% \u7A7A" : "1 \u94A5\u5319 \xB7 \u9053\u5177\u623F", x, y);
    if (r.type === "vault" || r.type === "cache") {
      ctx2.fillStyle = "#9b4f48";
      ctx2.font = "11px system-ui";
      ctx2.fillText(r.type === "vault" ? "4\u20136 \u540D\u5B88\u536B\u4F0F\u51FB" : "\u5B88\u536B + 12 \u79D2\u843D\u7269", x, y + 15);
    }
  }
  if (g.room.type === "start") {
    ctx2.fillStyle = "#59745c";
    ctx2.fillRect(360, 225, 240, 60);
    ctx2.fillStyle = "#fff0bf";
    ctx2.font = "bold 18px system-ui";
    ctx2.fillText("\u8C46\u5305\u7684\u8D44\u6E90\u56DE\u6536\u53F0", 480, 248);
    ctx2.font = "bold 15px system-ui";
    ctx2.fillText("E \xB7 \u94A5\u5319 \u21C4 \u70B8\u5F39 / \u6362\u91D1\u5E01", 480, 272);
  }
  if (["vault", "cache"].includes(g.room.type)) {
    ctx2.fillStyle = g.room.type === "vault" ? "#b29a68" : "#8a8f7d";
    ctx2.fillRect(370, 180, 220, 62);
    ctx2.strokeStyle = "#655b43";
    ctx2.lineWidth = 3;
    ctx2.strokeRect(370, 180, 220, 62);
    ctx2.fillStyle = "#fff2cf";
    ctx2.font = "bold 16px system-ui";
    ctx2.fillText(g.room.type === "vault" ? "\u94A5\u5319\u8865\u7ED9\u5E93" : "\u70B8\u5F00\u7684\u9690\u85CF\u85CF\u5BA4", 480, 207);
    ctx2.font = "12px system-ui";
    ctx2.fillText(!g.room.clear ? g.room.type === "vault" ? "\u5B88\u536B\u4F0F\u51FB \xB7 25% \u53EF\u80FD\u4E3A\u7A7A" : "\u5371\u9669\u671F " + Math.ceil(g.room.dangerTime || 0) + " \u79D2 \xB7 \u6E05\u9664\u5B88\u536B" : g.room.resourceOutcome === "empty" ? "\u7A7A\u5E93 \xB7 \u6CA1\u6709\u6389\u843D" : g.room.type === "vault" ? "2 \u679A\u70B8\u5F39 + 3 \u91D1\u5E01" : { coins: "\u85CF\u7740\u91D1\u5E01", tools: "\u85CF\u7740\u94A5\u5319\u4E0E\u70B8\u5F39", healing: "\u85CF\u7740\u56DE\u8840\u8865\u7ED9", item: "\u53D1\u73B0\u4E00\u4EF6\u9053\u5177" }[g.room.resourceOutcome] || "\u5956\u52B1\u5C1A\u672A\u63ED\u6653", 480, 229);
  }
  ctx2.restore();
}

// dist/campaign-art.js
function drawCampaign(ctx2, g, t) {
  const p = g.p;
  ctx2.save();
  ctx2.textAlign = "center";
  drawContent(ctx2, g, t);
  drawResources(ctx2, g);
  for (const e of g.room.enemies || []) if (e.kind === "speaker") drawSpeakerAttack(ctx2, e);
  for (const fx of g.effects) {
    if (fx.type !== "milkBottle" && fx.type !== "milkSplash") continue;
    const flight = fx.type === "milkBottle", progress = 1 - fx.life / fx.max;
    ctx2.save();
    ctx2.beginPath();
    ctx2.arc(fx.x, fx.y, fx.radius, 0, Math.PI * 2);
    ctx2.fillStyle = flight ? "#eb875c35" : "#fff1c9cc";
    ctx2.fill();
    ctx2.strokeStyle = flight ? "#bd573d" : "#d6a96a";
    ctx2.lineWidth = 3;
    ctx2.stroke();
    if (flight) {
      ctx2.beginPath();
      ctx2.arc(fx.x, fx.y, fx.radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
      ctx2.strokeStyle = "#fff3c0";
      ctx2.lineWidth = 5;
      ctx2.stroke();
      ctx2.font = "bold 13px system-ui";
      ctx2.fillStyle = "#93432f";
      ctx2.fillText("\u5976\u74F6\u843D\u70B9 \xB7 \u5FEB\u8EB2\u5F00", fx.x, fx.y + fx.radius + 19);
      const bx = fx.sx + (fx.x - fx.sx) * progress, by = fx.sy + (fx.y - fx.sy) * progress - Math.sin(progress * Math.PI) * 100;
      ctx2.translate(bx, by);
      ctx2.rotate(progress * Math.PI * 2);
      ctx2.fillStyle = "#fff9e5";
      ctx2.strokeStyle = "#906848";
      ctx2.lineWidth = 2;
      ctx2.beginPath();
      ctx2.roundRect(-11, -16, 22, 34, 6);
      ctx2.fill();
      ctx2.stroke();
      ctx2.fillStyle = "#e49d69";
      ctx2.fillRect(-7, -23, 14, 8);
      ctx2.fillStyle = "#cfb98a";
      ctx2.fillRect(-7, -3, 14, 3);
    } else {
      ctx2.globalAlpha = Math.max(0, 1 - progress);
      ctx2.strokeStyle = "#fff9e8";
      ctx2.lineWidth = 7;
      ctx2.beginPath();
      ctx2.arc(fx.x, fx.y, fx.radius * (0.65 + progress * 0.35), 0, Math.PI * 2);
      ctx2.stroke();
    }
    ctx2.restore();
  }
  for (const fx of g.effects) if (fx.type === "trap") {
    ctx2.beginPath();
    ctx2.arc(fx.x, fx.y, 60, 0, Math.PI * 2);
    ctx2.fillStyle = fx.life < 0.3 ? "#ef4c5399" : "#ef4c532a";
    ctx2.fill();
    ctx2.strokeStyle = "#a83844";
    ctx2.lineWidth = 3;
    ctx2.stroke();
    ctx2.fillStyle = "#932f3b";
    ctx2.fillText(fx.life < 0.3 ? "\u5939\uFF01" : "\u5FEB\u8EB2\u5F00", fx.x, fx.y);
  }
  for (const e of g.room.enemies || []) {
    if (e.dead) continue;
    if (e.muted) {
      ctx2.beginPath();
      ctx2.arc(e.x, e.y, 85, 0, Math.PI * 2);
      ctx2.strokeStyle = "#a9a5cb";
      ctx2.lineWidth = 6;
      ctx2.stroke();
      ctx2.fillStyle = "#eee3ff";
      ctx2.fillText("\u5438\u6536\u7B11\u58F0", e.x, e.y - 100);
    }
  }
  ctx2.textAlign = "center";
  ctx2.font = "bold 16px system-ui";
  for (const l of g.room.loot) {
    drawPickup(ctx2, l.type, l.x, l.y);
    ctx2.fillStyle = "#56435b";
    ctx2.font = "bold 14px system-ui";
    ctx2.fillText(l.type === "chest" ? "E \xB7 1 \u94A5\u5319" : l.amount > 1 ? "\xD7" + l.amount : "", l.x, l.y + 25);
  }
  if (g.room.type === "shop") {
    ctx2.fillStyle = "#46614b";
    ctx2.fillRect(350, 220, 260, 65);
    ctx2.fillStyle = "#fff4d2";
    ctx2.font = "bold 18px system-ui";
    ctx2.fillText("\u8C46\u5305\u7684\u8865\u7ED9\u67DC\u53F0", 480, 247);
    ctx2.font = "bold 15px system-ui";
    ctx2.fillText("E \xB7 \u67E5\u770B\u5546\u54C1\u4E0E\u670D\u52A1", 480, 271);
  }
  if (g.room.pendingItem) {
    ctx2.fillStyle = "#f9e28c";
    ctx2.fillText("\u2726 \u9053\u5177\u7559\u5728\u8FD9\u91CC \xB7 E \u62FF\u53D6", 480, 345);
  }
  for (const b of g.explosives) {
    drawPickup(ctx2, "bomb", b.x, b.y);
    ctx2.fillStyle = b.t < 0.5 ? "#c24e67" : "#594854";
    ctx2.fillText(b.t.toFixed(1), b.x, b.y - 23);
  }
  for (const e of g.room.enemies || []) if (!e.dead && e.wind > 0) {
    ctx2.setLineDash([8, 9]);
    ctx2.strokeStyle = "#be594e";
    ctx2.lineWidth = 4;
    ctx2.beginPath();
    ctx2.moveTo(e.x, e.y);
    ctx2.lineTo(e.x + (e.dx || 1) * 300, e.y + (e.dy || 0) * 300);
    ctx2.stroke();
    ctx2.setLineDash([]);
  }
  drawFollowers(ctx2, g);
  ctx2.restore();
}

// dist/boss-duel.js
var W2 = 960;
var H2 = 600;
var GROUND = 410;
var NAMES = ["\u5976\u74F6\u6536\u7F34\u5458", "\u9759\u97F3\u7BB1", "\u5206\u62E3\u5DE8\u94B3", "\u62FC\u88C5\u5976\u5076", "\u725B\u6765\u4E0E\u7F8E\u9F20"];
var TIPS = ["\u5148\u770B\u5B83\u7684\u8D77\u624B\uFF0C\u518D\u51B3\u5B9A\u662F\u8DF3\u8FD8\u662F\u66FF\u8EAB\u3002", "\u4E0D\u8981\u4E00\u76F4\u8D34\u8138\uFF0C\u91CD\u51FB\u540E\u7684\u786C\u76F4\u591F\u5B83\u53CD\u6253\u3002", "\u5B83\u62AC\u624B\u65F6\u5F80\u5B83\u8EAB\u540E\u8D70\uFF0C\u6247\u5F62\u5F39\u4F1A\u7A7A\u3002", "\u8840\u91CF\u8FC7\u534A\u4F1A\u52A0\u901F\uFF0C\u7559\u4E00\u6B21\u66FF\u8EAB\u7ED9\u72C2\u66B4\u3002", "\u4E24\u4E2A\u90FD\u5012\u4E0B\u4E86\uFF0C\u95E8\u624D\u4F1A\u5F00\u3002"];
var clamp9 = (v, a, b) => Math.max(a, Math.min(b, v));
var fmt = (n) => Math.max(0, Math.round(n));
function makeOverlay() {
  const wrap = document.querySelector(".canvas-wrap");
  if (!wrap) return null;
  const old = wrap.querySelector(".duel-overlay");
  if (old) old.remove();
  const node = document.createElement("div");
  node.className = "duel-overlay";
  node.setAttribute("aria-hidden", "true");
  node.innerHTML = '<canvas aria-label="Boss \u623F\u6A2A\u7248\u51B3\u6597"></canvas><div class="duel-controls" role="group" aria-label="\u51B3\u6597\u64CD\u4F5C"><div class="duel-move" role="group" aria-label="\u79FB\u52A8\u4E0E\u8DF3\u8DC3"><button type="button" data-duel-hold="left" aria-label="\u5411\u5DE6\u79FB\u52A8">\u2190</button><button type="button" data-duel-hold="right" aria-label="\u5411\u53F3\u79FB\u52A8">\u2192</button><button type="button" class="duel-jump" data-duel-action="jump">\u8DF3</button></div><div class="duel-actions" role="group" aria-label="\u653B\u51FB\u4E0E\u6280\u80FD"><button type="button" class="special" data-duel-action="skill">\u6280\u80FD</button><button type="button" class="special" data-duel-action="ultimate">\u5965\u4E49</button><button type="button" data-duel-action="dash">\u66FF\u8EAB</button><button type="button" class="duel-primary" data-duel-action="light">\u666E\u653B</button><button type="button" data-duel-action="heavy">\u91CD\u51FB</button></div></div>';
  wrap.append(node);
  return { node, canvas: node.querySelector("canvas"), ctx: node.querySelector("canvas").getContext("2d", { alpha: true }) };
}
function drawBar(ctx2, x, y, w, h2, ratio, back = "#1b2a22", fill = "#64a96d") {
  ctx2.fillStyle = "#0b1510";
  ctx2.fillRect(x - 2, y - 2, w + 4, h2 + 4);
  ctx2.fillStyle = back;
  ctx2.fillRect(x, y, w, h2);
  ctx2.fillStyle = fill;
  ctx2.fillRect(x, y, w * clamp9(ratio, 0, 1), h2);
  ctx2.fillStyle = "#fff6da55";
  ctx2.fillRect(x, y, w * clamp9(ratio, 0, 1), 2);
}
function createBossDuel({ getGame, onStart, onFinish } = {}) {
  const host = makeOverlay();
  if (!host) return { check() {
  }, reset() {
  }, active: false };
  const { node, canvas: canvas2, ctx: ctx2 } = host;
  const held2 = /* @__PURE__ */ new Set();
  let active = false, game2 = null;
  let time = 0, raf = 0, last2 = 0;
  let px = 300, py = GROUND, vy = 0, pface = 1, moving = false;
  let attack = null, dash = 0, dashCD = 0, invUntil = 0, energy = 0, combo = 0, comboT = 0, skillCD = 0, ultCD = 0;
  let bx = 650, by = GROUND, bfacing = -1, bstate = "idle", btimer = 1.1, bwind = 0, bhit = 0, bhitUntil = 0, benraged = false;
  let intro = 0;
  let boss = null, bossHp = 100, bossMax = 100, queue2 = [], result = null, resultAt = 0, shake2 = 0, flash = 0;
  let playerWasHit = false;
  const pshots = [], projectiles = [], particles = [], trail = [];
  function sizeCanvas() {
    const base = document.querySelector("#game");
    if (!base || !canvas2) return;
    const w = Math.max(1, Math.round(base.width)), h2 = Math.max(1, Math.round(base.height));
    if (canvas2.width !== w || canvas2.height !== h2) {
      canvas2.width = w;
      canvas2.height = h2;
    }
  }
  function contextTransform() {
    sizeCanvas();
    const sx = canvas2.width / W2, sy = canvas2.height / H2;
    ctx2.setTransform(sx, 0, 0, sy, 0, 0);
    ctx2.imageSmoothingEnabled = false;
  }
  function bossName() {
    return NAMES[Math.max(0, Math.min(4, (game2?.floor || 1) - 1))];
  }
  function bossPrompt() {
    return TIPS[Math.max(0, Math.min(4, (game2?.floor || 1) - 1))];
  }
  function clearTransient() {
    pshots.length = 0;
    projectiles.length = 0;
    particles.length = 0;
    trail.length = 0;
    shake2 = 0;
    flash = 0;
  }
  function publishState() {
    if (!boss) return;
    boss.hp = Math.max(0, boss.maxHp * (bossHp / bossMax));
    if (bossHp <= 0) {
      boss.hp = 0;
      boss.dead = true;
    }
  }
  function start2(which) {
    if (!which) return;
    game2 = getGame();
    if (!game2) return;
    boss = which;
    bossMax = 100;
    bossHp = 100;
    queue2 = (game2.room?.enemies || []).filter((e) => e.type === "boss" && !e.dead);
    px = 300;
    py = GROUND;
    vy = 0;
    pface = 1;
    moving = false;
    attack = null;
    dash = 0;
    dashCD = 0;
    invUntil = 0;
    energy = 0;
    combo = 0;
    comboT = 0;
    skillCD = 0;
    ultCD = 0;
    bx = 650;
    by = GROUND;
    bfacing = -1;
    bstate = "idle";
    btimer = 1.1;
    bwind = 0;
    bhit = 0;
    bhitUntil = 0;
    benraged = false;
    clearTransient();
    result = null;
    resultAt = 0;
    intro = 1.15;
    game2.p.inv = Math.max(game2.p.inv || 0, 0.35);
    active = true;
    time = 0;
    last2 = 0;
    game2.mode = "duel";
    node.classList.add("show");
    node.setAttribute("aria-hidden", "false");
    document.body.classList.add("duel-active");
    const bar = document.querySelector("#bossbar");
    if (bar) bar.hidden = true;
    onStart?.();
    if (!raf) raf = requestAnimationFrame(loop);
  }
  function startNext() {
    const next = queue2.find((e) => e.type === "boss" && !e.dead);
    if (next) {
      start2(next);
      return;
    }
    finish2("win");
  }
  function finish2(kind) {
    if (!active) return;
    active = false;
    cancelAnimationFrame(raf);
    raf = 0;
    node.classList.remove("show");
    node.setAttribute("aria-hidden", "true");
    document.body.classList.remove("duel-active");
    const g = game2;
    if (kind === "win") {
      if (g) {
        const bar = document.querySelector("#bossbar");
        if (bar) bar.hidden = false;
        g.mode = "play";
        g.p.inv = Math.max(g.p.inv || 0, 1.6);
        g.update(0, {});
        g.emit("toast", { text: "Boss \u623F\u5DF2\u6E05\u7A7A\u3002\u95E8\u5F00\u4E86\u3002" });
      }
    } else if (g) {
      g.p.hp = 0;
      g.mode = "dead";
      g.emit("end", { win: false });
    }
    onFinish?.(kind);
  }
  function reset() {
    active = false;
    cancelAnimationFrame(raf);
    raf = 0;
    node.classList.remove("show");
    node.setAttribute("aria-hidden", "true");
    document.body.classList.remove("duel-active");
    clearTransient();
  }
  function check() {
    const g = getGame();
    if (active && g !== game2) {
      reset();
      return;
    }
    if (active) return;
    if (!g || g.mode !== "play" || g.room?.type !== "boss" || g.room.clear) return;
    const bosses = (g.room.enemies || []).filter((e) => e.type === "boss" && !e.dead);
    if (!bosses.length) return;
    start2(bosses[0]);
  }
  function resultWin() {
    if (result) return;
    result = "win";
    resultAt = 1.35;
    bhit = 0;
    bossHp = 0;
    publishState();
    shake2 = 18;
    flash = 0.55;
    particles.push({ x: bx, y: by - 70, r: 3, color: "#ffe28a" });
  }
  function resultLose() {
    if (result) return;
    result = "lose";
    resultAt = 1.35;
    flash = 0.4;
  }
  function hitBoss(dmg, kind = "light") {
    if (result || bossHp <= 0) return;
    const dmgScale = Math.max(1, bossMax / 100);
    bossHp = Math.max(0, bossHp - dmg / dmgScale);
    bhit = 0.12;
    bhitUntil = time + 0.16;
    energy = Math.min(100, energy + dmg * 0.55);
    combo++;
    comboT = 1.05;
    shake2 = Math.min(14, 4 + dmg * 0.25);
    flash = 0.12;
    for (let i = 0; i < (kind === "ultimate" ? 24 : 8); i++) {
      const a = Math.random() * Math.PI * 2, v = 80 + Math.random() * 180;
      particles.push({ x: bx, y: by - 65, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.3 + Math.random() * 0.3, r: 2 + Math.random() * 3, color: kind === "ultimate" ? "#ffe28a" : "#fff2bf" });
    }
    publishState();
    if (bossHp <= 0) resultWin();
  }
  function hitPlayer() {
    if (result) return;
    const p = game2?.p;
    if (!p) return;
    if (p.inv > 0 || dash > 0) return;
    if (p.shield) {
      p.shield = false;
      p.shieldCD = 12;
      p.inv = 0.6;
      shake2 = 6;
      flash = 0.15;
      for (let i = 0; i < 10; i++) {
        const a = Math.random() * Math.PI * 2, v = 40 + Math.random() * 110;
        particles.push({ x: px, y: py - 45, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.3 + Math.random() * 0.3, r: 2 + Math.random() * 3, color: "#bad37e" });
      }
      return;
    }
    p.hp = Math.max(0, p.hp - 1);
    p.inv = 1.1;
    playerWasHit = true;
    combo = 0;
    comboT = 0;
    shake2 = 9;
    flash = 0.25;
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2, v = 40 + Math.random() * 130;
      particles.push({ x: px, y: py - 45, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.3 + Math.random() * 0.3, r: 2 + Math.random() * 3, color: "#f09a86" });
    }
    if (p.hp <= 0) resultLose();
  }
  function light2() {
    if (result || attack || dash > 0) return;
    pface = bx >= px ? 1 : -1;
    attack = { t: 0, dur: 0.3, hit: false, dmg: Math.max(8, Math.round(6 * (game2.p.damage || 1))), range: 132, heavy: false };
  }
  function heavy() {
    if (result || attack || dash > 0) return;
    pface = bx >= px ? 1 : -1;
    attack = { t: 0, dur: 0.52, hit: false, dmg: Math.max(16, Math.round(12 * (game2.p.damage || 1))), range: 150, heavy: true };
  }
  function jump() {
    if (result || attack || dash > 0 || py < GROUND - 1) return;
    vy = -440;
  }
  function doDash() {
    if (result || dash > 0 || dashCD > 0) return;
    dash = 0.32;
    dashCD = 2.2;
    invUntil = Math.max(invUntil, time + 0.2);
    trail.length = 0;
  }
  function skill() {
    if (result || skillCD > 0) return;
    skillCD = 5;
    pshots.push({ x: px + pface * 48, y: py - 42, vx: pface * 560, vy: 0, life: 1.4, dmg: 12, r: 20 });
  }
  function ultimate() {
    if (result || energy < 100) return;
    energy = 0;
    flash = 0.6;
    shake2 = 14;
    dash = 0.08;
    invUntil = time + 0.25;
    pshots.push({ x: px, y: py - 30, vx: 0, vy: 0, life: 0.6, dmg: 0, r: 250, ultimate: true });
    if (Math.abs(bx - px) < 300) hitBoss(Math.max(35, Math.round(24 * (game2.p.damage || 1))), "ultimate");
  }
  function action(name) {
    if (!active || result) return;
    if (name === "jump") jump();
    else if (name === "light") light2();
    else if (name === "heavy") heavy();
    else if (name === "dash") doDash();
    else if (name === "skill") skill();
    else if (name === "ultimate") ultimate();
  }
  function syncButtons() {
    const blocked2 = { jump: !!result || intro > 0 || !!attack || dash > 0 || py < GROUND - 1, light: !!result || intro > 0 || !!attack || dash > 0, heavy: !!result || intro > 0 || !!attack || dash > 0, dash: !!result || intro > 0 || dash > 0 || dashCD > 0, skill: !!result || intro > 0 || skillCD > 0, ultimate: !!result || intro > 0 || energy < 100 };
    for (const b of node.querySelectorAll("[data-duel-action]")) {
      const off = !!blocked2[b.dataset.duelAction];
      b.classList.toggle("is-off", off);
      b.setAttribute("aria-disabled", String(off));
    }
  }
  function chooseBossAttack() {
    const n = Math.random();
    if (benraged) {
      btimer = 0.55;
      if (n < 0.42) return bstart("charge");
      if (n < 0.64) return bstart("stomp");
      return bstart("fan");
    }
    btimer = 1.15;
    if (n < 0.34) bstart("charge");
    else if (n < 0.67) bstart("stomp");
    else bstart("fan");
  }
  function bstart(kind) {
    bstate = kind + "Wind";
    bwind = kind === "fan" ? 0.55 : 0.72;
  }
  function fan2() {
    const dx = px - bx, dy = py - 70 - by;
    const len = Math.max(1, Math.hypot(dx, dy));
    const base = Math.atan2(dy, dx);
    for (const a of [-0.28, 0, 0.28]) projectiles.push({ x: bx, y: by - 70, vx: Math.cos(base + a) * 320, vy: Math.sin(base + a) * 320, r: 14, life: 2.4, dmg: 1 });
  }
  function stomp() {
    shake2 = 12;
    flash = 0.2;
    if (Math.abs(px - bx) < 230 && py > GROUND - 100) hitPlayer();
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 160;
      particles.push({ x: bx, y: by, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.35 + Math.random() * 0.25, r: 2 + Math.random() * 3, color: "#f4d36f" });
    }
  }
  function updateBoss(dt) {
    bhit = Math.max(0, bhit - dt);
    if (result) return;
    if (benraged && bossHp > 0 && bossHp <= 50) benraged = true;
    if (bstate === "idle" || bstate === "walk") {
      btimer -= dt;
      if (btimer <= 0) chooseBossAttack();
      const dx = px - bx;
      if (Math.abs(dx) > 150) {
        bstate = "walk";
        bfacing = dx > 0 ? 1 : -1;
        bx += bfacing * (benraged ? 120 : 90) * dt;
      } else bstate = "idle";
    } else if (bstate.endsWith("Wind")) {
      bwind -= dt;
      if (bwind <= 0) {
        const kind = bstate.replace("Wind", "");
        if (kind === "charge") {
          bstate = "charge";
          bwind = 0.36;
          const dir = px >= bx ? 1 : -1;
          bfacing = dir;
        } else if (kind === "stomp") {
          bstate = "idle";
          stomp();
          btimer = benraged ? 0.6 : 1.15;
        } else {
          bstate = "fan";
          bwind = 0.35;
          fan2();
        }
      }
    } else if (bstate === "charge") {
      const dir = px >= bx ? 1 : -1;
      bfacing = dir;
      bx = clamp9(bx + dir * (benraged ? 430 : 360) * dt, 90, 870);
      bwind -= dt;
      if (Math.abs(px - bx) < 70 && Math.abs(py - by) < 90) hitPlayer();
      if (bwind <= 0) {
        bstate = "idle";
        btimer = benraged ? 0.55 : 1;
      }
    } else if (bstate === "fan") {
      bwind -= dt;
      if (bwind <= 0) {
        bstate = "idle";
        btimer = benraged ? 0.55 : 1.15;
      }
    }
    if (bossHp <= 50 && bossHp > 0) benraged = true;
    bx = clamp9(bx, 90, 870);
  }
  function updatePlayer(dt) {
    if (result) return;
    const p = game2.p;
    if (p.inv > 0) p.inv = Math.max(0, p.inv - dt);
    if (dash > 0) {
      dash = Math.max(0, dash - dt);
      px = clamp9(px + pface * 420 * dt, 70, 890);
    }
    if (dashCD > 0) dashCD = Math.max(0, dashCD - dt);
    if (skillCD > 0) skillCD = Math.max(0, skillCD - dt);
    let mx = 0;
    if (held2.has("left")) mx -= 1;
    if (held2.has("right")) mx += 1;
    if (mx) {
      px = clamp9(px + mx * 260 * dt, 70, 890);
      pface = mx;
      moving = true;
    } else moving = false;
    if (py < GROUND || vy < 0) {
      vy += 1100 * dt;
      py += vy * dt;
      if (py >= GROUND) {
        py = GROUND;
        vy = 0;
      }
    }
    if (attack) {
      attack.t += dt;
      if (!attack.hit && attack.t >= attack.dur * 0.44) {
        attack.hit = true;
        if (Math.abs(bx - px) < attack.range + 60 && Math.abs(py - by) < 115) hitBoss(attack.dmg, attack.heavy ? "heavy" : "light");
      }
      if (attack.t >= attack.dur) attack = null;
    }
    if (comboT > 0) {
      comboT -= dt;
      if (comboT <= 0) combo = 0;
    }
    if (energy < 100) energy = Math.min(100, energy + dt * 0.35);
    if (Math.abs(bx - px) < 72) {
      if (px < bx) px = bx - 72;
      else px = bx + 72;
      px = clamp9(px, 70, 890);
    }
    for (const s of pshots) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      if (!s.ultimate && !s.hitDone && Math.abs(s.x - bx) < 80 && Math.abs(s.y - (by - 70)) < 110) {
        s.hitDone = true;
        s.life = 0;
        hitBoss(s.dmg, "skill");
      }
    }
    for (const b of projectiles) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (Math.hypot(b.x - px, b.y - (py - 45)) < b.r + 26) hitPlayer();
    }
    for (const q of particles) {
      q.x += (q.vx || 0) * dt;
      q.y += (q.vy || 0) * dt;
      q.life -= dt;
    }
    pshots.splice(0, pshots.length, ...pshots.filter((s) => s.life > 0 && !s.hitDone));
    projectiles.splice(0, projectiles.length, ...projectiles.filter((b) => b.life > 0));
    particles.splice(0, particles.length, ...particles.filter((q) => q.life > 0));
    shake2 *= Math.pow(0.92, dt * 60);
    if (shake2 < 0.2) shake2 = 0;
    flash = Math.max(0, flash - dt * 2.2);
  }
  function update(dt) {
    if (!active) return;
    time += dt;
    if (result) {
      resultAt -= dt;
      if (resultAt <= 0) {
        if (result === "win") {
          const next = queue2.find((e) => e.type === "boss" && !e.dead && e !== boss);
          if (next) {
            result = null;
            start2(next);
          } else finish2("win");
        } else finish2("lose");
      }
      return;
    }
    if (intro > 0) {
      intro = Math.max(0, intro - dt);
      syncButtons();
      return;
    }
    updatePlayer(dt);
    updateBoss(dt);
    syncButtons();
  }
  function drawBackground() {
    const bg = ctx2.createLinearGradient(0, 0, 0, H2);
    bg.addColorStop(0, "#0e2019");
    bg.addColorStop(0.45, "#19382a");
    bg.addColorStop(1, "#07110c");
    ctx2.fillStyle = bg;
    ctx2.fillRect(0, 0, W2, H2);
    ctx2.fillStyle = "#234d34";
    ctx2.beginPath();
    ctx2.arc(480, 300, 235, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.fillStyle = "#2f6844";
    ctx2.beginPath();
    ctx2.arc(480, 300, 178, 0, Math.PI * 2);
    ctx2.fill();
    ctx2.fillStyle = "#ffffff08";
    for (let i = 0; i < 7; i++) ctx2.fillRect(90 + i * 120, 140, 42, 360);
    ctx2.fillStyle = "#0b1710";
    ctx2.fillRect(0, GROUND, W2, H2 - GROUND);
    ctx2.strokeStyle = "#78a46955";
    ctx2.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      ctx2.beginPath();
      ctx2.moveTo(i * 90, GROUND);
      ctx2.lineTo(i * 90 - 80, H2);
      ctx2.stroke();
    }
    ctx2.fillStyle = "#f4d36f";
    ctx2.font = "900 11px ui-monospace,monospace";
    ctx2.textAlign = "center";
    ctx2.fillText("BOSS ROOM \xB7 NO ESCAPE", 480, 54);
    ctx2.fillStyle = "#fff6da88";
    ctx2.font = "900 10px ui-monospace,monospace";
    ctx2.fillText("THE BINDING OF NAIWA \xB7 BOSS DUEL", 480, 72);
  }
  function drawFighterBars() {
    const p = game2.p;
    drawBar(ctx2, 70, 30, 350, 16, p.hp / p.maxHp, "#1b2a22", "#68ad70");
    drawBar(ctx2, 540, 30, 350, 16, bossHp / bossMax, "#2b1b1b", "#c8554f");
    ctx2.fillStyle = "#fff6da";
    ctx2.font = "900 12px system-ui";
    ctx2.textAlign = "left";
    ctx2.fillText("\u5976\u86D9 \xB7 \u73A9\u5BB6", 70, 22);
    ctx2.textAlign = "right";
    ctx2.fillText(bossName(), 890, 22);
    ctx2.textAlign = "center";
    ctx2.fillStyle = "#f4d36f";
    ctx2.font = "900 11px ui-monospace,monospace";
    ctx2.fillText("ROUND 1", 480, 25);
    ctx2.fillStyle = "#fff6da99";
    ctx2.font = "700 11px system-ui";
    ctx2.textAlign = "left";
    ctx2.fillText(`${Math.max(0, p.hp)} / ${p.maxHp}`, 70, 62);
    ctx2.textAlign = "right";
    ctx2.fillText(`${fmt(bossHp)}%`, 890, 62);
  }
  function drawHUD() {
    drawFighterBars();
    ctx2.fillStyle = "#d9ead1aa";
    ctx2.font = "700 10px system-ui";
    ctx2.textAlign = "left";
    ctx2.fillText("A/D \u79FB\u52A8 \xB7 W/\u7A7A\u683C \u8DF3 \xB7 J \u666E\u653B \xB7 K \u91CD\u51FB \xB7 L \u66FF\u8EAB \xB7 U \u6280\u80FD \xB7 R \u5965\u4E49", 70, 88);
    drawBar(ctx2, 70, H2 - 96, 180, 9, energy / 100, "#1b2a22", "#f4d36f");
    ctx2.fillStyle = "#fff6da";
    ctx2.font = "800 10px system-ui";
    ctx2.fillText(`\u5965\u4E49\u69FD ${fmt(energy)}%`, 70, H2 - 104);
    if (combo > 1 && comboT > 0) {
      ctx2.save();
      ctx2.translate(480, 155);
      ctx2.rotate(-0.05);
      ctx2.fillStyle = "#ffe88c";
      ctx2.font = "900 30px system-ui";
      ctx2.textAlign = "center";
      ctx2.fillText(combo + " HIT", 0, 0);
      ctx2.restore();
    }
    const dashLeft = dashCD > 0 ? Math.ceil(dashCD) : 0;
    ctx2.fillStyle = dashCD > 0 ? "#d9ead188" : "#bde8cb";
    ctx2.font = "700 10px system-ui";
    ctx2.textAlign = "right";
    ctx2.fillText(dashCD > 0 ? `\u66FF\u8EAB ${dashLeft}s` : "\u66FF\u8EAB\u5C31\u7EEA", 890, H2 - 104);
    if (!result && time < 4) {
      ctx2.fillStyle = "#fff6daaa";
      ctx2.font = "700 11px system-ui";
      ctx2.textAlign = "center";
      ctx2.fillText(bossPrompt(), 480, H2 - 28);
    }
    if (intro > 0) {
      ctx2.fillStyle = "rgba(8,17,13,.72)";
      ctx2.fillRect(0, 0, W2, H2);
      ctx2.textAlign = "center";
      ctx2.fillStyle = "#f4d36f";
      ctx2.font = "900 11px ui-monospace,monospace";
      ctx2.fillText("BOSS DUEL", 480, 245);
      ctx2.fillStyle = "#fff6da";
      ctx2.font = "900 44px system-ui";
      ctx2.fillText("\u5976\u86D9 VS " + bossName(), 480, 300);
      ctx2.fillStyle = "#bde8cb";
      ctx2.font = "900 12px ui-monospace,monospace";
      ctx2.fillText("ROUND 1", 480, 335);
    }
    if (result) {
      ctx2.fillStyle = "#08110de8";
      ctx2.fillRect(0, 0, W2, H2);
      ctx2.textAlign = "center";
      ctx2.fillStyle = result === "win" ? "#f4d36f" : "#f09a86";
      ctx2.font = "900 54px system-ui";
      ctx2.fillText(result === "win" ? "K.O." : "\u4F60\u5012\u4E86", 480, 275);
      ctx2.fillStyle = "#fff6da";
      ctx2.font = "800 15px system-ui";
      ctx2.fillText(result === "win" ? bossName() + "\u540E\u9000\u534A\u6B65\u3002\u95E8\u5F00\u4E86\u3002" : bossName() + "\uFF1A\u5988\u2014\u2014\u5988\u2014\u2014\u3002\u518D\u8BD5\u4E00\u6B21\uFF1F", 480, 320);
      ctx2.fillStyle = "#d9ead188";
      ctx2.font = "700 11px system-ui";
      ctx2.fillText(result === "win" ? "\u6B63\u5728\u7ED3\u7B97\u2026" : "\u6B63\u5728\u56DE\u5230\u590D\u6D3B\u70B9\u2026", 480, 360);
    }
  }
  function draw2() {
    if (!active) return;
    contextTransform();
    ctx2.clearRect(0, 0, W2, H2);
    ctx2.save();
    if (shake2 > 0) ctx2.translate((Math.random() - 0.5) * shake2, (Math.random() - 0.5) * shake2);
    drawBackground();
    for (const s of pshots) {
      ctx2.save();
      ctx2.globalAlpha = Math.min(1, s.life);
      if (s.ultimate) {
        ctx2.strokeStyle = "#ffe28a";
        ctx2.lineWidth = 10;
        ctx2.beginPath();
        ctx2.arc(px, py - 45, s.r * (1 - s.life / 0.6) + 20, 0, Math.PI * 2);
        ctx2.stroke();
      } else {
        ctx2.fillStyle = "#bff1d0";
        ctx2.beginPath();
        ctx2.ellipse(s.x, s.y, s.r, 10, 0, 0, Math.PI * 2);
        ctx2.fill();
        ctx2.strokeStyle = "#fff6da";
        ctx2.lineWidth = 3;
        ctx2.stroke();
      }
      ctx2.restore();
    }
    for (const p of projectiles) {
      ctx2.fillStyle = "#ef9c76";
      ctx2.beginPath();
      ctx2.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.strokeStyle = "#ffe5b4";
      ctx2.lineWidth = 2;
      ctx2.stroke();
    }
    const fakeBoss = { ...boss, x: bx, y: by, artFacing: bfacing, artMoving: bstate === "walk" || bstate === "charge", artAttackUntil: bstate.endsWith("Wind") || bstate === "charge" ? time + 1 : 0, hit: bhit, dead: false, deadAt: 0, finalSkill: null };
    drawAnimatedEnemy(ctx2, fakeBoss, time);
    const fakeHero = { p: { ...game2.p, face: pface, dash: 0 }, elapsed: time, heroMoving: moving, heroHurtUntil: game2.p.inv > 0 ? time + 1 : 0, heroLandUntil: 0, heroLaughUntil: 0, actionClock: time };
    if (dash > 0) {
      for (let i = 1; i < 4; i++) {
        ctx2.globalAlpha = 0.13 / i;
        drawHero(ctx2, fakeHero, px - pface * i * 19, py, 1.25, true, { face: pface });
      }
      ctx2.globalAlpha = 1;
    }
    drawHero(ctx2, fakeHero, px, py, 1.25, false, { face: pface });
    for (const q of particles) {
      ctx2.globalAlpha = Math.max(0, q.life * 2);
      ctx2.fillStyle = q.color;
      ctx2.fillRect(q.x, q.y, q.r, q.r);
    }
    ctx2.globalAlpha = 1;
    if (flash > 0) {
      ctx2.fillStyle = `rgba(255,246,218,${flash * 0.65})`;
      ctx2.fillRect(0, 0, W2, H2);
    }
    ctx2.restore();
    drawHUD();
  }
  function loop(now) {
    if (!active) return;
    if (!last2) last2 = now;
    const dt = Math.min(0.04, (now - last2) / 1e3);
    last2 = now;
    update(dt);
    draw2();
    raf = requestAnimationFrame(loop);
  }
  const keyMap = { a: "left", d: "right", w: "jump", j: "light", k: "heavy", l: "dash", u: "skill", r: "ultimate", " ": "jump" };
  function onKeyDown(e) {
    if (!active) return;
    const k = e.key.toLowerCase();
    if (!(k in keyMap)) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.repeat) return;
    const a = keyMap[k];
    if (a === "left" || a === "right") held2.add(a);
    else action(a);
  }
  function onKeyUp(e) {
    const k = e.key.toLowerCase();
    if (k === "a") held2.delete("left");
    if (k === "d" || k === "arrowright") held2.delete("right");
  }
  function releaseHeld() {
    held2.clear();
  }
  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("keyup", onKeyUp, true);
  window.addEventListener("pointerup", releaseHeld);
  window.addEventListener("pointercancel", releaseHeld);
  window.addEventListener("blur", releaseHeld);
  for (const b of node.querySelectorAll("[data-duel-hold]")) {
    const dir = b.dataset.duelHold;
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      try {
        b.setPointerCapture?.(e.pointerId);
      } catch {
      }
      held2.add(dir);
    });
    for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) b.addEventListener(ev, () => held2.delete(dir));
  }
  for (const b of node.querySelectorAll("[data-duel-action]")) b.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    action(b.dataset.duelAction);
  });
  window.addEventListener("resize", sizeCanvas);
  return { check, reset, get active() {
    return active;
  }, start: start2, finish: finish2, _debug: { get game() {
    return game2;
  }, get boss() {
    return boss;
  }, get state() {
    return { px, py, bossHp, energy, result, active };
  }, hitBoss, hitPlayer } };
}

// dist/preferences.js
var STORAGE_KEY = "naiwa-preferences";
var QUALITY_LEVELS = { battery: 1, standard: 1.5, sharp: 2 };
var DEFAULT_PREFERENCES = Object.freeze({ volume: 1, shake: 1, quality: "sharp", gamepad: true });
var has = (key) => Object.prototype.hasOwnProperty.call(QUALITY_LEVELS, key);
function normalizePreferences(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const volume = Number(source.volume), shake2 = Number(source.shake);
  return {
    volume: Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : DEFAULT_PREFERENCES.volume,
    shake: Number.isFinite(shake2) ? Math.min(1, Math.max(0, shake2)) : DEFAULT_PREFERENCES.shake,
    quality: has(source.quality) ? source.quality : DEFAULT_PREFERENCES.quality,
    gamepad: source.gamepad !== false
  };
}
function renderCap(quality) {
  return QUALITY_LEVELS[quality] ?? QUALITY_LEVELS[DEFAULT_PREFERENCES.quality];
}
function readPreferences(storage) {
  try {
    return normalizePreferences(JSON.parse(storage?.getItem?.(STORAGE_KEY) || "{}"));
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}
function writePreferences(prefs2, storage) {
  try {
    storage?.setItem?.(STORAGE_KEY, JSON.stringify(normalizePreferences(prefs2)));
  } catch {
  }
}

// dist/gamepad.js
var PAD_DEADZONE = 0.3;
var clampAxis = (value) => Math.max(-1, Math.min(1, Number.isFinite(value) ? value : 0));
function readGamepad(pad) {
  if (!pad?.connected) return null;
  const axes = pad.axes || [], buttons = pad.buttons || [];
  const dead = (value) => Math.abs(value) >= PAD_DEADZONE ? value : 0;
  const mx = dead(clampAxis(axes[0])), my = dead(clampAxis(axes[1]));
  let ax = dead(clampAxis(axes[2])), ay = dead(clampAxis(axes[3]));
  for (const [index2, x, y] of [[12, 0, -1], [13, 1, 0], [14, 0, 1], [15, -1, 0]]) if (buttons[index2]?.pressed) {
    ax = x;
    ay = y;
  }
  const pressed = (index2) => !!buttons[index2]?.pressed;
  return { mx, my, ax, ay, fire: !!(ax || ay), dash: pressed(0) || pressed(5), bomb: pressed(1) || pressed(4), use: pressed(2), active: pressed(3), pause: pressed(9) };
}
function pickGamepad(pads) {
  if (!pads?.length) return null;
  for (const pad of pads) if (pad?.connected) return pad;
  return null;
}

// dist/settings-ui.js
var QUALITY_LABELS = {
  battery: "\u7701\u7535 \xB7 \u6700\u8F7B\u7684\u753B\u9762",
  standard: "\u6807\u51C6 \xB7 \u6E05\u6670\u4E0E\u6027\u80FD\u517C\u987E",
  sharp: "\u6E05\u6670 \xB7 \u539F\u751F\u5206\u8FA8\u7387"
};
var percent = (value) => Math.round(value * 100);
function settingsHTML(prefs2) {
  const quality = Object.entries(QUALITY_LABELS).map(([key, label]) => `<option value="${key}"${prefs2.quality === key ? " selected" : ""}>${label}</option>`).join("");
  return `<div class="modal settings-modal" role="dialog" aria-modal="true" aria-labelledby="settingsTitle"><div class="mini">SETTINGS</div><h2 id="settingsTitle">\u6E38\u620F\u8BBE\u7F6E</h2>
 <div class="settings-row"><label for="setVolume">\u97F3\u91CF</label><input id="setVolume" type="range" min="0" max="100" step="1" value="${percent(prefs2.volume)}" aria-label="\u97F3\u91CF"><output id="setVolumeOut">${percent(prefs2.volume)}%</output></div>
 <div class="settings-row"><label for="setShake">\u9707\u5C4F</label><input id="setShake" type="range" min="0" max="100" step="5" value="${percent(prefs2.shake)}" aria-label="\u9707\u5C4F\u5F3A\u5EA6"><output id="setShakeOut">${percent(prefs2.shake)}%</output></div>
 <div class="settings-row"><label for="setQuality">\u753B\u9762</label><select id="setQuality" aria-label="\u753B\u9762\u8D28\u91CF">${quality}</select></div>
 <div class="settings-row settings-toggle"><label for="setGamepad">\u624B\u67C4</label><input id="setGamepad" type="checkbox"${prefs2.gamepad ? " checked" : ""}></div>
 <p class="settings-note">\u624B\u67C4\uFF1A\u5DE6\u6447\u6746\u79FB\u52A8\uFF0C\u53F3\u6447\u6746\u7784\u51C6\u5E76\u5C04\u51FB\uFF1BA \u86D9\u8DF3 / B \u70B8\u5F39 / X \u4E92\u52A8 / Y \u5927\u7206\u7B11 / Start \u6682\u505C\u3002\u8BBE\u7F6E\u4F1A\u8BB0\u5728\u8FD9\u53F0\u8BBE\u5907\u4E0A\u3002</p>
 <button class="primary" id="settingsClose">\u56DE\u5230\u6E38\u620F \u2192</button></div>`;
}
function bindSettings(root, prefs2, onChange) {
  const find = (selector) => root.querySelector(selector);
  const commit = (patch) => {
    Object.assign(prefs2, normalizePreferences({ ...prefs2, ...patch }));
    onChange(prefs2);
  };
  const volume = find("#setVolume"), volumeOut = find("#setVolumeOut");
  volume.oninput = () => {
    const value = Number(volume.value) / 100;
    volumeOut.textContent = percent(value) + "%";
    commit({ volume: value });
  };
  const shake2 = find("#setShake"), shakeOut = find("#setShakeOut");
  shake2.oninput = () => {
    const value = Number(shake2.value) / 100;
    shakeOut.textContent = percent(value) + "%";
    commit({ shake: value });
  };
  const quality = find("#setQuality");
  quality.onchange = () => commit({ quality: quality.value });
  const gamepad = find("#setGamepad");
  gamepad.onchange = () => commit({ gamepad: !!gamepad.checked });
  return { close: find("#settingsClose") };
}

// dist/sandbox.js
var SANDBOX_TABS = [["scene", "\u573A\u666F"], ["enemies", "\u654C\u4EBA"], ["items", "\u9053\u5177"], ["frog", "\u5976\u86D9"], ["dev", "\u5F00\u53D1\u8005"]];
var SANDBOX_ROOMS = [["boss", "Boss \u623F"], ["shop", "\u8865\u7ED9\u5546\u5E97"], ["treasure", "\u9053\u5177\u623F"], ["challenge", "\u6311\u6218\u623F"], ["vault", "\u94A5\u5319\u8865\u7ED9\u5E93"], ["cache", "\u5C01\u5899\u85CF\u5BA4"], ["start", "\u63A5\u5E94\u70B9"]];
var GENERIC = { runner: "\u62A2\u5976\u8DD1\u817F\u602A", brute: "\u5706\u809A\u602A", hopper: "\u98DE\u6251\u602A", shooter: "\u8FDC\u7A0B\u602A" };
var MAX_SPAWNED = 24;
var DUMMY_HP = 999999;
var BASE_STATS = { speed: 220, damage: 1, rate: 0.28, maxHp: 6 };
function createSandboxState() {
  return { active: false, god: false, oneHit: false, hitboxes: false, info: false, speed: 1, tab: "scene", falls: 0 };
}
function enemyName(type) {
  return CHAPTER_MOBS[type]?.name || THEMED_ENEMIES[type] || GENERIC[type] || type;
}
function chapterEnemies(floor) {
  return [...new Set(ENCOUNTERS[floor - 1].flat())].map((type) => ({ type, name: enemyName(type) }));
}
function sandboxItems() {
  return ITEMS.filter((i) => i.id !== "tadpole");
}
function revealFloor(g) {
  for (const r of g.rooms) if (r.exists) {
    r.seen = true;
    if (r.hidden) r.revealed = true;
  }
}
function installSandbox(g, state2) {
  const proto = Object.getPrototypeOf(g);
  g.sandbox = true;
  g.hurt = function() {
    if (state2.god) return;
    const shield = this.p.shield;
    proto.hurt.call(this);
    if (shield && !this.p.shield) this.sandboxExtraShield = false;
    if (this.mode !== "dead") return;
    for (let i = this.events.length - 1; i >= 0; i--) if (this.events[i].type === "end") this.events.splice(i, 1);
    this.mode = "play";
    this.p.hp = this.p.maxHp;
    this.p.inv = 2;
    state2.falls++;
    this.emit("toast", { text: "\u6C99\u76D2\u4FDD\u62A4\uFF1A\u5976\u86D9\u5012\u4E0B\u540E\u5DF2\u6EE1\u8840\u7AD9\u8D77\u3002" });
    this.emit("heal");
  };
  g.choose = function(id) {
    const shield = this.p.shield, ownedLotus = this.has("lotus"), ok = proto.choose.call(this, id);
    if (ok && (id === "service_shield" || id === "lotus" && shield && !ownedLotus)) this.sandboxExtraShield = true;
    return ok;
  };
  g.damageEnemy = function(e, n, credit = true) {
    if (e.dummy) {
      const before = e.hp;
      proto.damageEnemy.call(this, e, n, credit);
      logDummy(this, e, before - e.hp);
      if (e.hp < DUMMY_HP / 2) e.hp = DUMMY_HP;
      return;
    }
    return proto.damageEnemy.call(this, e, state2.oneHit && n > 0 && !e.dead ? DUMMY_HP : n, credit);
  };
  g.enemySpeed = function(e) {
    return e.dummy ? 0 : proto.enemySpeed.call(this, e);
  };
  g.enemyAttack = function(e) {
    if (e.dummy) {
      e.cd = 99;
      return true;
    }
    return proto.enemyAttack.call(this, e);
  };
  g.enemyContact = function(e) {
    return e.dummy ? true : proto.enemyContact.call(this, e);
  };
  g.generate = function() {
    proto.generate.call(this);
    revealFloor(this);
  };
  g.update = function(dt, input) {
    const duration = Math.min(dt, 0.04) * state2.speed, steps = Math.max(1, Math.ceil(duration / 0.04));
    for (let i = 0; i < steps; i++) {
      const enemies = this.room.enemies || [], dummies = enemies.filter((e) => e.dummy && !e.dead);
      this.room.sandboxTraining = enemies.some((e) => e.sandboxSpawned && !e.dead);
      for (const e of dummies) {
        e.attack = 99;
        e.cd = 99;
        e.wind = 0;
        e.vx = 0;
        e.vy = 0;
      }
      proto.update.call(this, duration / steps, input);
      for (const e of dummies) {
        e.x = e.anchorX;
        e.y = e.anchorY;
      }
    }
  };
  revealFloor(g);
}
function startSandbox(g, state2) {
  g.start();
  installSandbox(g, state2);
  g.coins = 30;
  g.keys = 5;
  g.bombs = 5;
  g.emit("room");
  return g;
}
function logDummy(g, e, dealt) {
  if (!(dealt > 0)) return;
  const now = g.actionClock ?? g.elapsed;
  e.dummySince ??= now;
  e.dummyTotal += dealt;
  e.dummyLog.push({ t: now, dealt });
  while (e.dummyLog.length && e.dummyLog[0].t < now - 5) e.dummyLog.shift();
}
function dummyDps(g, e) {
  const now = g.actionClock ?? g.elapsed, span = Math.max(1, Math.min(5, now - (e.dummySince ?? now)));
  return (e.dummyLog || []).reduce((sum, h2) => sum + (h2.t >= now - 5 ? h2.dealt : 0), 0) / span;
}
function setSandboxChapter(g, floor) {
  if (!Number.isInteger(floor) || floor < 1 || floor > CHAPTERS.length) return false;
  g.rescue = null;
  g.mode = g.mode === "rescue" ? "play" : g.mode;
  g.floor = floor;
  g.generate();
  return true;
}
function enterSandboxRoom(g, destination) {
  const room = g.rooms.find((r) => r.exists && (r.type === destination || String(r.id) === String(destination)));
  if (!room) return false;
  g.rescue = null;
  if (g.mode === "rescue") g.mode = "play";
  Object.assign(room, { locked: false, bombLocked: false, seen: true });
  if (room.hidden) {
    room.hidden = false;
    room.revealed = true;
  }
  g.enter(room.id, "top");
  return g.roomId === room.id;
}
function sandboxBoss(g, floor) {
  return setSandboxChapter(g, floor) && enterSandboxRoom(g, "boss");
}
function spawnPoint(g, used) {
  let best2 = null, bestScore = -1;
  for (const cell of navigationSnapshot(g.room)) {
    const { x, y } = cell;
    if (!cell.free || cell.distance < 0 || x < 90 || x > 870 || y < 90 || y > 510) continue;
    const away = Math.hypot(x - g.p.x, y - g.p.y);
    if (away < 150 || used.some((e) => Math.hypot(e.x - x, e.y - y) < e.r + 36)) continue;
    if ((g.room.hazards || []).some((h2) => h2.kind !== "belt" && overlaps(h2, x, y, 24))) continue;
    if (away > bestScore) {
      bestScore = away;
      best2 = { x, y };
    }
  }
  return best2;
}
function spawnSandboxEnemy(g, type, { dummy = false, flying = false } = {}) {
  const room = g.room;
  room.enemies ||= [];
  const live = room.enemies.filter((e2) => !e2.dead);
  if (live.length >= MAX_SPAWNED) return null;
  const spot = spawnPoint(g, live);
  if (!spot) return null;
  const e = g.spawn(dummy ? flying ? "hopper" : "brute" : type, spot.x, spot.y);
  e.sandboxSpawned = true;
  e.cd = Math.max(e.cd || 0, 1.2);
  e.attack = Math.max(e.attack || 0, 1.2);
  e.chargeCD = Math.max(e.chargeCD || 0, 1.2);
  if (dummy) {
    Object.assign(e, { dummy: flying ? "fly" : "ground", anchorX: e.x, anchorY: e.y, hp: DUMMY_HP, maxHp: DUMMY_HP, cd: 99, dummyTotal: 0, dummyLog: [] });
  }
  room.enemies.push(e);
  room.sandboxTraining = true;
  if (!dummy && !(room.type === "boss" && room.clear)) room.clear = false;
  g.emit("room");
  return e;
}
function clearSandboxEnemies(g, { dummies = true } = {}) {
  let n = 0;
  for (const e of g.room.enemies || []) if (!e.dead && (dummies || !e.dummy)) {
    e.dead = true;
    e.deadAt = g.elapsed;
    g.burst(e.x, e.y, "#b9d28a", 10);
    n++;
  }
  g.room.sandboxTraining = g.room.enemies.some((e) => e.sandboxSpawned && !e.dead);
  g.enemyBullets = [];
  g.explosives = [];
  g.emit("room");
  return n;
}
function resetSandboxRoom(g) {
  const room = g.room;
  if (!["fight", "challenge"].includes(room.type)) return false;
  clearSandboxEnemies(g);
  room.enemies = spawnEncounter(g, room);
  room.clear = false;
  room.warmStart = g.elapsed + 1;
  room.warmUntil = g.elapsed + 4;
  for (const e of room.enemies) {
    e.cd = Math.max(e.cd || 0, 1.2);
    e.attack = Math.max(e.attack || 0, 1.2);
    e.chargeCD = Math.max(e.chargeCD || 0, 1.2);
  }
  g.emit("room");
  return true;
}
function grant(g, item) {
  const mode = g.mode, choices = g.choices;
  g.mode = "choice";
  g.choices = [item];
  const ok = Game.prototype.choose.call(g, item.id);
  g.mode = mode;
  g.choices = choices;
  return ok;
}
function itemStats(ids) {
  const stats = { ...BASE_STATS };
  for (const id of ids) applyItemStats(stats, id);
  return stats;
}
function removeItems(g, keep) {
  const old = g.items, previous = itemStats(old), next = itemStats(keep), p = g.p;
  const lost = (id) => old.includes(id) && !keep.includes(id);
  g.items = keep;
  p.speed = next.speed;
  p.rate = next.rate;
  p.damage = next.damage;
  p.maxHp += next.maxHp - previous.maxHp;
  p.hp = Math.min(p.hp, p.maxHp);
  if (lost("lotus")) {
    p.shield = !!g.sandboxExtraShield && p.shield;
    p.shieldCD = 0;
  }
  if (!keep.length) {
    resetChronoRoom(g);
    resetFollowers(g);
    resetDeepseek(g);
    resetPhoebe(g);
  } else {
    for (const id of old) if (!keep.includes(id)) {
      delete g.followerStates?.[id];
      delete g.memePets?.[id];
    }
    if (lost("gojohalf")) g.gojo = null;
    if (lost("sandevistan")) {
      g.sandy = null;
      g.sandyTrails = [];
    }
    if (lost("ricewhale")) g.whale = null;
    if (lost("deepthink")) {
      g.deepThink = 0;
      g.deepReady = false;
      g.deepBurst = 0;
    }
    if (lost("rabbit")) {
      g.rabbitWave = null;
      g.rabbitRequest = null;
    }
    if (lost("tempura")) {
      g.shrimpMeals = [];
      g.tempuraBuff = 0;
    }
    if (lost("phoebe")) g.phoebe = null;
    if (lost("phoebewire")) clearPhoebe(g);
    if (lost("phoebe") || lost("phoebewire")) {
      g.phoebeWires = (g.phoebeWires || []).filter((w) => w.source === "player" ? g.has("phoebewire") : g.has("phoebe")).slice(-(g.has("phoebe") ? 3 : 2));
    }
  }
  if (lost("phoebesoot")) g.phoebeBoost = 0;
  g.activeCharge = Math.min(g.activeCost(), g.activeCharge);
  g.emit("room");
}
function setSandboxItem(g, id, on) {
  const item = ITEMS.find((i) => i.id === id);
  if (!item || on === g.has(id)) return false;
  if (on) {
    if (id === "lotus" && g.p.shield) g.sandboxExtraShield = true;
    const ok = grant(g, item);
    if (ok) g.activeCharge = Math.min(g.activeCost(), g.activeCharge);
    return ok;
  }
  removeItems(g, g.items.filter((i) => i !== id));
  return true;
}
function clearSandboxItems(g) {
  removeItems(g, []);
}
function sandboxResource(g, kind) {
  const p = g.p;
  if (kind === "coins") g.coins += 10;
  else if (kind === "keys") g.keys += 3;
  else if (kind === "bombs") g.bombs += 3;
  else if (kind === "heal") p.hp = p.maxHp;
  else if (kind === "laugh") g.activeCharge = g.activeCost();
  else if (kind === "shield") {
    p.shield = true;
    g.sandboxExtraShield = true;
  } else if (kind === "maxhp") {
    if (p.maxHp >= 24) return false;
    p.maxHp++;
    p.hp++;
  } else return false;
  g.emit("room");
  return true;
}
var esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
var toggle = (key, label, on, hint) => `<button class="sandbox-toggle" data-sandbox="toggle" data-key="${key}" aria-pressed="${on}"><b>${label}</b><small>${hint}</small></button>`;
function sceneTab(g) {
  const rooms = g.rooms.filter((r) => r.exists), names3 = new Map(SANDBOX_ROOMS);
  return `<h3>\u7AE0\u8282</h3><div class="sandbox-row">${CHAPTERS.map((name, i) => `<button data-sandbox="chapter" data-value="${i + 1}" aria-pressed="${g.floor === i + 1}"><b>${i + 1}</b>${name}</button>`).join("")}</div>
<p class="sandbox-note">\u5207\u6362\u7AE0\u8282\u4F1A\u751F\u6210\u65B0\u7684\u697C\u5C42\uFF0C\u9053\u5177\u548C\u8D44\u6E90\u4FDD\u7559\u3002</p>
<h3>\u76F4\u8FBE\u672C\u5C42\u623F\u95F4</h3><div class="sandbox-row">${rooms.map((r) => `<button data-sandbox="room" data-value="${r.type}" data-room-id="${r.id}"${g.roomId === r.id ? ' aria-current="true"' : ""}><b>#${r.id}</b>${esc(names3.get(r.type) || r.encounterName || "\u6218\u6597\u623F")}</button>`).join("")}</div>
<h3>Boss \u6311\u6218</h3><div class="sandbox-row">${BOSS_NAMES.map((name, i) => `<button data-sandbox="boss" data-value="${i + 1}"><b>${i + 1}</b>${name}</button>`).join("")}</div>`;
}
function enemiesTab(g) {
  const live = (g.room.enemies || []).filter((e) => !e.dead).length, full = live >= MAX_SPAWNED, fight = ["fight", "challenge"].includes(g.room.type);
  return `<h3>\u7B2C ${g.floor} \u7AE0\u654C\u4EBA <small>\u672C\u623F ${live} / ${MAX_SPAWNED}</small></h3><div class="sandbox-row">${chapterEnemies(g.floor).map((e) => `<button data-sandbox="spawn" data-value="${e.type}"${full ? " disabled" : ""}>${esc(e.name)}</button>`).join("")}</div>
<h3>\u8BAD\u7EC3\u9776 <small>\u4E0D\u52A8\u3001\u4E0D\u653B\u51FB\uFF0C\u663E\u793A\u7D2F\u8BA1\u4F24\u5BB3\u548C\u79D2\u4F24</small></h3><div class="sandbox-row"><button data-sandbox="dummy" data-value="ground"${full ? " disabled" : ""}>\u5730\u9762\u8BAD\u7EC3\u9776</button><button data-sandbox="dummy" data-value="fly"${full ? " disabled" : ""}>\u98DE\u884C\u8BAD\u7EC3\u9776</button></div>
<h3>\u672C\u623F</h3><div class="sandbox-row"><button data-sandbox="clearEnemies"${live ? "" : " disabled"}>\u6E05\u7A7A\u654C\u4EBA</button><button data-sandbox="resetRoom"${fight ? "" : " disabled"}>\u91CD\u65B0\u751F\u6210\u672C\u623F\u654C\u4EBA</button></div>
<p class="sandbox-note">\u8981\u6362\u7AE0\u8282\u7684\u654C\u4EBA\uFF0C\u5148\u5728\u201C\u573A\u666F\u201D\u5207\u6362\u7AE0\u8282\u3002</p>`;
}
function itemsTab(g) {
  return `<h3>\u9053\u5177 <small>\u5DF2\u62E5\u6709 ${g.items.length} \u4EF6 \xB7 \u70B9\u4E00\u4E0B\u62FF\u53D6\u6216\u653E\u4E0B</small></h3><div class="sandbox-items">${sandboxItems().map((i) => `<button data-sandbox="item" data-value="${i.id}" aria-pressed="${g.has(i.id)}" title="${esc(i.desc)}">${itemIcon(i)}<span>${esc(i.name)}</span></button>`).join("")}</div>
<div class="sandbox-row"><button data-sandbox="clearItems"${g.items.length ? "" : " disabled"}>\u6E05\u7A7A\u5168\u90E8\u9053\u5177</button></div>`;
}
function frogTab(g, state2) {
  const p = g.p;
  return `<h3>\u8D44\u6E90 <small>\u751F\u547D ${p.hp}/${p.maxHp} \xB7 \u91D1\u5E01 ${g.coins} \xB7 \u94A5\u5319 ${g.keys} \xB7 \u70B8\u5F39 ${g.bombs}</small></h3><div class="sandbox-row">
<button data-sandbox="resource" data-value="heal">\u56DE\u6EE1\u751F\u547D</button><button data-sandbox="resource" data-value="maxhp"${p.maxHp >= 24 ? " disabled" : ""}>\u751F\u547D\u4E0A\u9650 +1</button><button data-sandbox="resource" data-value="shield">\u4E00\u6B21\u6027\u62A4\u76FE</button><button data-sandbox="resource" data-value="laugh">\u5145\u6EE1\u5927\u7206\u7B11</button><button data-sandbox="resource" data-value="coins">\u91D1\u5E01 +10</button><button data-sandbox="resource" data-value="keys">\u94A5\u5319 +3</button><button data-sandbox="resource" data-value="bombs">\u70B8\u5F39 +3</button></div>
<h3>\u89C4\u5219</h3><div class="sandbox-toggles">${toggle("god", "\u65E0\u654C", state2.god, "\u4E0D\u53D7\u4EFB\u4F55\u4F24\u5BB3")}${toggle("oneHit", "\u4E00\u51FB\u5FC5\u6740", state2.oneHit, "\u8BAD\u7EC3\u9776\u9664\u5916")}</div>
<p class="sandbox-note">\u5173\u6389\u65E0\u654C\u65F6\uFF0C\u5976\u86D9\u5012\u4E0B\u4F1A\u7ACB\u523B\u6EE1\u8840\u7AD9\u8D77\uFF0C\u6C99\u76D2\u4E0D\u4F1A\u7ED3\u675F\u3002</p>`;
}
function devTab(g, state2) {
  return `<h3>\u8C03\u8BD5\u663E\u793A</h3><div class="sandbox-toggles">${toggle("hitboxes", "\u78B0\u649E\u8303\u56F4", state2.hitboxes, "\u89D2\u8272\u3001\u5B50\u5F39\u548C\u969C\u788D\u7684\u5224\u5B9A")}${toggle("info", "\u8C03\u8BD5\u4FE1\u606F", state2.info, "\u5E27\u7387\u3001\u6570\u91CF\u3001\u623F\u95F4\u4E0E\u79CD\u5B50")}</div>
<h3>\u6E38\u620F\u901F\u5EA6</h3><div class="sandbox-row sandbox-speed">${[0.5, 1, 2].map((v) => `<button data-sandbox="speed" data-value="${v}" aria-pressed="${state2.speed === v}">${v === 0.5 ? "\u6162\u52A8\u4F5C \xD70.5" : v === 1 ? "\u6B63\u5E38 \xD71" : "\u52A0\u901F \xD72"}</button>`).join("")}</div>
<p class="sandbox-note">\u623F\u95F4 #${g.roomId} \xB7 ${esc(g.room.type)}${g.room.layoutName ? " \xB7 " + esc(g.room.layoutName) : ""} \xB7 \u79CD\u5B50 ${g.seedLabel}</p>`;
}
function sandboxPanelHTML(g, state2) {
  const body2 = { scene: sceneTab, enemies: enemiesTab, items: itemsTab, frog: frogTab, dev: devTab }[state2.tab] || sceneTab;
  return `<div class="modal sandbox-modal" role="dialog" aria-modal="true" aria-labelledby="sandboxTitle"><div class="mini">SANDBOX \xB7 \u4E0D\u4FDD\u5B58 \xB7 \u4E0D\u5F71\u54CD\u6B63\u5F0F\u5B58\u6863</div><h2 id="sandboxTitle">\u6C99\u76D2\u5DE5\u5177\u7BB1</h2>
<div class="sandbox-tabs" role="tablist">${SANDBOX_TABS.map(([id, name]) => `<button role="tab" data-sandbox-tab="${id}" aria-selected="${state2.tab === id}">${name}</button>`).join("")}</div>
<div class="sandbox-body" role="tabpanel">${body2(g, state2)}</div>
<div class="sandbox-actions"><button class="primary" id="sandboxClose">\u56DE\u5230\u6C99\u76D2 \u2192</button><button class="secondary" id="sandboxExit">\u9000\u51FA\u6C99\u76D2</button></div></div>`;
}
function runSandboxAction(g, state2, action, value) {
  switch (action) {
    case "chapter":
      return { done: setSandboxChapter(g, Number(value)), close: true, text: `\u5DF2\u5207\u6362\u5230\u7B2C ${value} \u7AE0 \xB7 ${CHAPTERS[value - 1]}` };
    case "room":
      return { done: enterSandboxRoom(g, value), close: true };
    case "boss":
      return { done: sandboxBoss(g, Number(value)), close: true, text: `Boss \u6311\u6218 \xB7 ${BOSS_NAMES[value - 1]}` };
    case "spawn":
      return { done: !!spawnSandboxEnemy(g, value) };
    case "dummy":
      return { done: !!spawnSandboxEnemy(g, null, { dummy: true, flying: value === "fly" }) };
    case "clearEnemies":
      return { done: clearSandboxEnemies(g) > 0 };
    case "resetRoom":
      return { done: resetSandboxRoom(g), close: true };
    case "item":
      return { done: setSandboxItem(g, value, !g.has(value)) };
    case "clearItems":
      clearSandboxItems(g);
      return { done: true };
    case "resource":
      return { done: sandboxResource(g, value) };
    case "toggle":
      if (!["god", "oneHit", "hitboxes", "info"].includes(value)) return { done: false };
      state2[value] = !state2[value];
      return { done: true };
    case "speed": {
      const v = Number(value);
      if (![0.5, 1, 2].includes(v)) return { done: false };
      state2.speed = v;
      return { done: true };
    }
  }
  return { done: false };
}
function drawSandboxOverlay(ctx2, g, state2, fps2) {
  const live = (g.room.enemies || []).filter((e) => !e.dead);
  ctx2.save();
  for (const e of live) if (e.dummy) {
    ctx2.fillStyle = "#fff3d1";
    ctx2.strokeStyle = "#1d2b26";
    ctx2.lineWidth = 4;
    ctx2.font = "bold 15px system-ui";
    ctx2.textAlign = "center";
    const label = `${e.dummy === "fly" ? "\u98DE\u884C" : "\u5730\u9762"}\u8BAD\u7EC3\u9776 \xB7 \u7D2F\u8BA1 ${(e.dummyTotal || 0).toFixed(1)} \xB7 \u79D2\u4F24 ${dummyDps(g, e).toFixed(1)}`;
    ctx2.strokeText(label, e.x, e.y - e.r - 24);
    ctx2.fillText(label, e.x, e.y - e.r - 24);
  }
  if (state2.hitboxes) {
    ctx2.lineWidth = 2;
    ctx2.strokeStyle = "#ffcf4a";
    for (const o of g.room.obstacles || []) {
      ctx2.beginPath();
      if (o.w) ctx2.rect(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h);
      else ctx2.arc(o.x, o.y, o.r, 0, Math.PI * 2);
      ctx2.stroke();
    }
    ctx2.strokeStyle = "#ff6f6f";
    for (const e of live) {
      ctx2.beginPath();
      ctx2.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx2.stroke();
    }
    ctx2.strokeStyle = "#ff9a3c";
    for (const b of g.enemyBullets) {
      ctx2.beginPath();
      ctx2.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx2.stroke();
    }
    ctx2.strokeStyle = "#7fe3ff";
    for (const b of g.bullets) {
      ctx2.beginPath();
      ctx2.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx2.stroke();
    }
    ctx2.strokeStyle = "#8dff8a";
    ctx2.beginPath();
    ctx2.arc(g.p.x, g.p.y, g.p.r, 0, Math.PI * 2);
    ctx2.stroke();
    ctx2.fillStyle = "#fff3d1";
    ctx2.font = "bold 12px system-ui";
    ctx2.textAlign = "center";
    for (const e of live) if (!e.dummy) ctx2.fillText(`${Math.max(0, e.hp).toFixed(1)}/${e.maxHp}`, e.x, e.y + e.r + 14);
  }
  if (state2.info) {
    const lines = [`${Math.round(fps2)} FPS \xB7 \u901F\u5EA6 \xD7${state2.speed}`, `\u654C\u4EBA ${live.length} \xB7 \u654C\u5F39 ${g.enemyBullets.length} \xB7 \u7B11\u58F0 ${g.bullets.length} \xB7 \u7279\u6548 ${g.effects.length}`, `\u7B2C ${g.floor} \u7AE0 \xB7 \u623F\u95F4 #${g.roomId} ${g.room.type}${g.room.layoutName ? " \xB7 " + g.room.layoutName : ""}`, `\u79CD\u5B50 ${g.seedLabel} \xB7 \u5012\u4E0B ${state2.falls} \u6B21`];
    ctx2.fillStyle = "#0c1413c4";
    ctx2.fillRect(56, 56, 350, 18 * lines.length + 12);
    ctx2.fillStyle = "#d9f2c4";
    ctx2.font = "bold 13px ui-monospace,monospace";
    ctx2.textAlign = "left";
    ctx2.textBaseline = "alphabetic";
    lines.forEach((t, i) => ctx2.fillText(t, 66, 76 + i * 18));
  }
  ctx2.restore();
}

// dist/codex.js
var CODEX_KEY = "naiwa-codex-v1";
var CODEX_ENEMIES = [
  ["runner", 1, "\u7EA2\u56F4\u5DFE\uFF0C\u9AD8\u901F\u8FFD\u51FB\uFF0C\u8840\u91CF\u8F83\u4F4E\u3002\u770B\u5230\u5B83\u5148\u5904\u7406\u3002"],
  ["milkSkater", 1, "\u5728\u666E\u901A\u5730\u9762\u79FB\u901F\u4E3A 145\uFF0C\u6ED1\u4E0A\u5976\u8FF9\u540E\u4F1A\u52A0\u901F\u5230 205\u3002"],
  ["milkleak", 1, "\u8FB9\u8D70\u8FB9\u6F0F\u5976\uFF0C\u7559\u4E0B\u7684\u654C\u65B9\u5976\u8FF9\u4F1A\u51CF\u901F\u5E76\u4F24\u5BB3\u5976\u86D9\u3002"],
  ["milkspitter", 1, "\u7AD9\u6869\u6295\u74F6\uFF0C\u5976\u74F6\u843D\u5730\u6E85\u51FA\u5976\u8FF9\u3002"],
  ["turret", 1, "\u7AD9\u7740\u4E0D\u52A8\uFF0C\u6BCF 0.85 \u79D2\u7784\u51C6\u5C04\u51FB\u4E00\u6B21\uFF0C\u6BD4\u666E\u901A\u8FDC\u7A0B\u602A\u66F4\u79EF\u6781\u3002"],
  ["shooter", 1, "\u4FDD\u6301\u8DDD\u79BB\u53D1\u5C04\u5F39\u5E55\uFF1B\u7B2C\u56DB\u7AE0\u4F1A\u6362\u4E0A\u8FDE\u5C04\u67AA\u3002"],
  ["curdling", 1, "\u88AB\u6253\u5012\u540E\u9884\u8B66 0.7 \u79D2\uFF0C\u968F\u540E\u5411\u56DB\u5468\u6E85\u5976\u3002"],
  ["brute", 1, "\u5706\u6EDA\u6EDA\u7684\u8FD1\u6218\u602A\uFF0C\u8840\u6BD4\u666E\u901A\u5C0F\u602A\u539A\uFF0C\u6CA1\u6709\u51CF\u4F24\u3002"],
  ["hopper", 1, "\u51B2\u523A\u524D\u663E\u793A\u7EA2\u7EBF\uFF0C\u80FD\u98DE\u8FC7\u5751\u6D1E\uFF0C\u522B\u6307\u671B\u5730\u5F62\u6321\u4F4F\u5B83\u3002"],
  ["beatling", 2, "\u8E29\u7740\u8282\u62CD\u505C\u987F 0.65 \u79D2\u7784\u51C6\uFF0C\u7136\u540E\u5411\u4F60\u51B2\u649E\uFF1B\u6307\u6325\u5728\u573A\u65F6\u51B2\u5F97\u66F4\u52E4\u3002"],
  ["echoBell", 2, "\u9884\u8B66\u540E\u671D\u9501\u5B9A\u65B9\u5411\u8FDE\u5C04\u4E09\u8F6E\uFF0C\u5F39\u5E55\u4F1A\u6298\u8FD4\u3002"],
  ["soundTurret", 2, "\u8F6E\u6362\u9519\u4F4D\u73AF\u5C04\u3001\u7784\u51C6\u6247\u5C04\u548C\u65CB\u8F6C\u5341\u5B57\uFF0C\u865A\u7EBF\u9884\u8B66\u540E\u53D1\u5C04\u3002"],
  ["conductor", 2, "\u8BA9\u9644\u8FD1\u540C\u4F34\u52A0\u901F 30%\uFF0C\u6301\u7EED 2 \u79D2\uFF0C\u8FD8\u4F1A\u50AC\u9F13\u4ED4\u548C\u97F3\u7BB1\u63D0\u524D\u51FA\u624B\u3002"],
  ["loader", 3, "\u5B88\u5728\u7F3A\u53E3\u9644\u8FD1\u7684\u88C5\u5378\u5DE5\uFF0C\u62AC\u67AA\u9884\u8B66 0.45 \u79D2\u540E\u5C04\u51FB\u3002"],
  ["forklift", 3, "\u9501\u5B9A\u65B9\u5411\u9884\u8B66 0.75 \u79D2\u540E\u51B2\u950B\uFF0C\u649E\u5899\u5C31\u505C\u3002"],
  ["parcelThrower", 3, "\u5148\u6807\u51FA\u8303\u56F4\uFF0C\u5305\u88F9\u968F\u540E\u7838\u5411\u843D\u70B9\u3002"],
  ["stitchling", 4, "\u88AB\u6253\u5012\u65F6\u88C2\u6210\u4E24\u53EA\u788E\u5E03\u5C0F\u602A\u3002"],
  ["tiny", 4, "\u62FC\u7F1D\u5A03\u5A03\u548C\u9020\u602A\u53E3\u7559\u4E0B\u7684\u5C0F\u788E\u5E03\uFF0C\u8DD1\u5F97\u5F88\u5FEB\u4F46\u5F88\u8106\u3002"],
  ["scrapMine", 4, "\u9AD8\u901F\u8FFD\u51FB\uFF0C\u78B0\u5230\u5976\u86D9\u4F1A\u7ACB\u5373\u7206\u70B8\u3002\u62C9\u5F00\u8DDD\u79BB\u51FB\u5012\u5B83\u53EF\u4EE5\u963B\u6B62\u7206\u70B8\u3002"],
  ["dollTurret", 4, "\u7AD9\u6869\u4E09\u8FDE\u5C04\uFF0C\u8EB2\u8FDB\u63A9\u4F53\u7B49\u5B83\u505C\u706B\u3002"],
  ["stitchMedic", 4, "\u5B9A\u70B9\u7ED9\u540C\u4F34\u56DE\u8840\uFF0C\u6253\u65AD\u5B83\u5C31\u80FD\u4E2D\u6B62\u6CBB\u7597\u3002"],
  ["jailer", 5, "\u79FB\u52A8\u6781\u5FEB\u7684\u8FFD\u6355\u5B88\u536B\uFF0C\u522B\u88AB\u5B83\u8D34\u8EAB\u3002"],
  ["warden", 5, "\u7AD9\u6869\u4E94\u8FDE\u5C04\uFF0C\u5C04\u5F97\u5F88\u5FEB\uFF0C\u7528\u7262\u67F1\u6321\u4F4F\u706B\u7EBF\u3002"],
  ["lockSentry", 5, "\u9884\u8B66\u540E\u653E\u51FA\u77ED\u6682\u7535\u7F51\uFF0C\u7B49\u7535\u7F51\u7184\u706D\u518D\u7A7F\u8FC7\u3002"],
  ["prismEye", 5, "\u5341\u5B57\u5C04\u51FB\uFF0C\u6BCF\u4E00\u8F6E\u90FD\u6362\u4E00\u4E2A\u89D2\u5EA6\u3002"]
];
var CODEX_BOSSES = [
  { id: "collector", kinds: ["collector"], floor: 1, text: "\u79FB\u52A8\u65F6\u7559\u4E0B\u5976\u8FF9\u3002\u4E24\u6B21\u666E\u901A\u6295\u74F6\u540E\u63A5\u4E00\u6B21\u5F3A\u5316\u4E09\u8FDE\u6295\uFF1B\u9884\u8B66 0.85 \u79D2\u540E\u957F\u8DDD\u79BB\u51B2\u523A\u3002" },
  { id: "speaker", kinds: ["speaker"], floor: 2, text: "\u73AF\u5F62\u97F3\u6CE2\u3001\u6247\u5F62\u8FDE\u53D1\u548C\u4F4E\u97F3\u9707\u8361\u8F6E\u6D41\u6765\uFF1B\u534A\u8840\u540E\u9AD8\u7A7A\u8DF3\u7838\uFF0C\u843D\u5730\u653E\u51FA\u4E00\u5708\u5F39\u5E55\u3002" },
  { id: "catcher", kinds: ["catcher"], floor: 3, text: "\u53CC\u624B\u5C01\u4F4F\u5DE6\u53F3\uFF0C\u53EA\u7559\u4E0A\u4E0B\u9003\u751F\u7A7A\u95F4\u5E76\u5B9A\u5411\u8FDE\u5C04\uFF0C\u8FD8\u4F1A\u53CC\u624B\u7838\u5730\u3002\u70B8\u5F39\u80FD\u628A\u53CC\u624B\u70B8\u9000 3 \u79D2\u3002" },
  { id: "puppet", kinds: ["puppet"], floor: 4, text: "\u8F6E\u6362\u6295\u602A\u3001\u7F1D\u9488\u8FDE\u5C04\u548C\u5341\u5B57\u7F1D\u7EBF\uFF1B\u53EC\u5524\u7269\u6700\u591A 5 \u53EA\uFF0C\u7A7A\u4E2D\u7684\u602A\u7269\u70AE\u5F39\u4E5F\u7B97\u5728\u5185\u3002" },
  { id: "final", kinds: ["bull", "meishu"], floor: 5, text: "\u725B\u6765\u4E24\u8FDE\u649E\u3001\u8DFA\u5730\u9707\u8361\u3001\u725B\u89D2\u6247\u5C04\uFF1B\u7F8E\u9F20\u4E09\u8FDE\u5939\u51FB\u3001\u65CB\u8F6C\u5341\u5B57\u5F39\u3002\u4E24\u4EBA\u5B9A\u65F6\u5408\u51FB\uFF0C\u53D1\u52A8\u5F39\u5899\u4E0E\u51B2\u649E\uFF0C\u5269\u4E0B\u4E00\u4E2A\u65F6\u4F1A\u66B4\u8D70\u3002" }
];
var catalogItems = ITEMS.filter((i) => i.id !== "tadpole");
var itemIds2 = new Set(catalogItems.map((i) => i.id));
var enemyIds = new Set(CODEX_ENEMIES.map(([id]) => id));
var bossIds = new Set(CODEX_BOSSES.map((b) => b.id));
var bossesByKind = new Map(CODEX_BOSSES.flatMap((b) => b.kinds.map((kind) => [kind, b.id])));
var empty = () => ({ items: {}, enemies: {}, bosses: {} });
var prefix = CODEX_KEY + ":";
var journal = /* @__PURE__ */ new WeakMap();
var validRun = (id) => typeof id === "string" && /^[a-zA-Z0-9_-]{1,96}$/.test(id);
var count = (n) => Number.isSafeInteger(n) && n >= 0 ? n : 0;
function victories(c, id) {
  if (!journal.has(c)) journal.set(c, /* @__PURE__ */ new Map());
  const book = journal.get(c);
  if (!book.has(id)) book.set(id, /* @__PURE__ */ new Set());
  return book.get(id);
}
function meetBoss(c, id) {
  return c.bosses[id] ??= { met: 1, defeated: 0 };
}
function addWin(c, id, run) {
  const wins = victories(c, id);
  if (wins.has(run)) return false;
  wins.add(run);
  const row3 = meetBoss(c, id);
  row3.defeated = Math.min(Number.MAX_SAFE_INTEGER, row3.defeated + 1);
  return true;
}
function readFact(c, key) {
  const [kind, id, run] = key.split(":");
  if ((kind === "seen" || kind === "owned") && itemIds2.has(id)) c.items[id] = Math.max(c.items[id] || 0, kind === "owned" ? 2 : 1);
  else if (kind === "enemy" && enemyIds.has(id)) c.enemies[id] = 1;
  else if (kind === "boss" && bossIds.has(id)) meetBoss(c, id);
  else if (kind === "win" && bossIds.has(id) && validRun(run)) addWin(c, id, run);
}
function readCodex(storage) {
  const c = empty();
  try {
    if (storage === void 0) storage = globalThis.localStorage;
    let d;
    try {
      d = JSON.parse(storage?.getItem(CODEX_KEY) || "null");
    } catch {
    }
    for (const id of itemIds2) {
      const v = d?.items?.[id];
      if (v === 1 || v === 2) c.items[id] = v;
    }
    for (const id of enemyIds) if (d?.enemies?.[id] === 1) c.enemies[id] = 1;
    for (const id of bossIds) {
      const row3 = d?.bosses?.[id], tokens = d?.victories?.[id];
      if (row3?.met === 1 || count(row3?.defeated) > 0) c.bosses[id] = { met: 1, defeated: count(row3.defeated) };
      if (Array.isArray(tokens)) {
        const set = victories(c, id);
        for (const run of tokens) if (validRun(run)) set.add(run);
        if (set.size) {
          const boss = meetBoss(c, id);
          boss.defeated = Math.max(boss.defeated, set.size);
        }
      }
    }
    for (let i = 0; i < (storage?.length || 0); i++) {
      const key = storage.key(i);
      if (key?.startsWith(prefix)) readFact(c, key.slice(prefix.length));
    }
  } catch {
  }
  return c;
}
function mergeCodex(c, other) {
  for (const [id, v] of Object.entries(other.items)) c.items[id] = Math.max(c.items[id] || 0, v);
  Object.assign(c.enemies, other.enemies);
  for (const [id, row3] of Object.entries(other.bosses)) {
    const local = meetBoss(c, id), ours = victories(c, id), theirs = victories(other, id);
    const baseline = Math.max(0, local.defeated - ours.size, row3.defeated - theirs.size);
    for (const run of theirs) ours.add(run);
    local.defeated = Math.min(Number.MAX_SAFE_INTEGER, baseline + ours.size);
  }
  return c;
}
function saveCodex(c, storage) {
  try {
    if (storage === void 0) storage = globalThis.localStorage;
    if (!storage) return false;
    const saved = readCodex(storage);
    const write = (key) => storage.setItem(prefix + key, "1");
    for (const [id, v] of Object.entries(c.items)) if (v > (saved.items[id] || 0)) write((v === 2 ? "owned:" : "seen:") + id);
    for (const id of Object.keys(c.enemies)) if (!saved.enemies[id]) write("enemy:" + id);
    for (const id of Object.keys(c.bosses)) {
      if (!saved.bosses[id]) write("boss:" + id);
      const existing = victories(saved, id);
      for (const run of victories(c, id)) if (!existing.has(run)) write("win:" + id + ":" + run);
    }
    mergeCodex(c, saved);
    const tokens = {};
    for (const id of Object.keys(c.bosses)) {
      const set = victories(c, id);
      if (set.size) tokens[id] = [...set];
    }
    storage.setItem(CODEX_KEY, JSON.stringify({ ...c, victories: tokens }));
    return true;
  } catch {
    return false;
  }
}
function recordCodex(c, g, room = g.room, choices = g.mode === "choice" ? g.choices : []) {
  if (g.sandbox) return false;
  if (!validRun(g.codexRunId)) g.codexRunId = globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
  let changed = false;
  const markItem = (id, level) => {
    if (itemIds2.has(id) && level > (c.items[id] || 0)) {
      c.items[id] = level;
      changed = true;
    }
  };
  for (const id of g.items) markItem(id, 2);
  for (const item of choices || []) markItem(item.id, 1);
  for (const e of room?.enemies || []) {
    if (e.dummy || e.sandboxSpawned) continue;
    if (e.type === "boss") {
      const id = bossesByKind.get(e.kind);
      if (!id) continue;
      if (!c.bosses[id]) {
        meetBoss(c, id);
        changed = true;
      }
      if (room.clear && room.enemies.every((x) => x.type !== "boss" || x.dead) && addWin(c, id, g.codexRunId)) changed = true;
    } else if (enemyIds.has(e.type) && !c.enemies[e.type]) {
      c.enemies[e.type] = 1;
      changed = true;
    }
  }
  return changed;
}
function codexProgress(c) {
  return {
    items: Object.keys(c.items).filter((id) => itemIds2.has(id)).length,
    itemsTotal: catalogItems.length,
    enemies: Object.keys(c.enemies).filter((id) => enemyIds.has(id)).length,
    enemiesTotal: enemyIds.size,
    bosses: CODEX_BOSSES.filter((b) => c.bosses[b.id]?.met).length,
    bossesTotal: CODEX_BOSSES.length
  };
}
var esc2 = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
var CODEX_TABS = [["items", "\u9053\u5177"], ["enemies", "\u654C\u4EBA"], ["bosses", "\u5173\u672B"]];
function entries(codex2, tab) {
  if (tab === "items") return catalogItems.map((i) => ({ id: i.id, known: !!codex2.items[i.id], owned: codex2.items[i.id] === 2, name: i.name, text: i.desc, icon: codex2.items[i.id] ? itemIcon(i) : "" }));
  if (tab === "enemies") return CODEX_ENEMIES.map(([type, floor, text]) => ({ id: type, known: !!codex2.enemies[type], name: enemyName(type), text, floor, art: { type, floor } }));
  return CODEX_BOSSES.map((b) => {
    const row3 = codex2.bosses[b.id];
    return { id: b.id, known: !!row3?.met, defeated: row3?.defeated || 0, name: BOSS_NAMES[b.floor - 1], text: b.text, floor: b.floor, art: { boss: b.kinds, floor: b.floor } };
  });
}
function codexHTML(codex2, state2) {
  const tab = state2.tab || "items", list = entries(codex2, tab), p = codexProgress(codex2);
  const pick = list.find((e) => e.id === state2.pick && e.known) || list.find((e) => e.owned) || list.find((e) => e.known) || null;
  const count2 = { items: `${p.items}/${p.itemsTotal}`, enemies: `${p.enemies}/${p.enemiesTotal}`, bosses: `${p.bosses}/${p.bossesTotal}` };
  const detail = pick ? `<div class="codex-detail"><div class="codex-detail-art">${pick.icon || `<canvas width="120" height="120" data-codex-art="${esc2(pick.id)}"></canvas>`}</div><div><h3>${esc2(pick.name)}</h3><p class="codex-meta">${tab === "items" ? pick.owned ? "\u5DF2\u83B7\u5F97" : "\u89C1\u8FC7 \xB7 \u5C1A\u672A\u62FF\u5230" : tab === "enemies" ? `\u7B2C ${pick.floor} \u7AE0 \xB7 ${esc2(CHAPTERS[pick.floor - 1])}` : `\u7B2C ${pick.floor} \u7AE0\u5173\u672B \xB7 ${pick.defeated ? `\u51FB\u8D25 ${pick.defeated} \u6B21` : "\u5C1A\u672A\u51FB\u8D25"}`}</p><p>${esc2(pick.text)}</p></div></div>` : `<div class="codex-detail codex-empty"><p>\u8FD8\u6CA1\u6709\u8BB0\u5F55\u3002\u5F00\u59CB\u5192\u9669\uFF0C\u9047\u5230\u7684${tab === "items" ? "\u9053\u5177" : tab === "enemies" ? "\u654C\u4EBA" : "\u5173\u672B\u654C\u4EBA"}\u4F1A\u51FA\u73B0\u5728\u8FD9\u91CC\u3002</p></div>`;
  const cells = list.map((e) => `<button class="codex-cell${e.known ? "" : " unknown"}" data-codex-pick="${esc2(e.id)}"${e.known ? "" : " disabled"} aria-pressed="${pick?.id === e.id}" aria-label="${e.known ? esc2(e.name) : "\u672A\u53D1\u73B0"}">${e.known ? e.icon || `<canvas width="64" height="64" data-codex-art="${esc2(e.id)}"></canvas>` : '<span class="codex-unknown" aria-hidden="true">?</span>'}<span>${e.known ? esc2(e.name) : "\uFF1F\uFF1F\uFF1F"}</span>${e.owned ? '<i class="codex-owned" aria-hidden="true">\u2713</i>' : ""}</button>`).join("");
  return `<div class="modal codex-modal" role="dialog" aria-modal="true" aria-labelledby="codexTitle"><div class="mini">POND FIELD NOTES</div><h2 id="codexTitle">\u5976\u86D9\u56FE\u9274</h2>
<div class="codex-tabs" role="tablist">${CODEX_TABS.map(([id, name]) => `<button role="tab" data-codex-tab="${id}" aria-selected="${tab === id}">${name}<small>${count2[id]}</small></button>`).join("")}</div>
<div class="codex-body" role="tabpanel"><div class="codex-reading" aria-live="polite">${detail}</div><div class="codex-list"><div class="codex-grid">${cells}</div><p class="codex-note">\u53EA\u8BB0\u5F55\u6B63\u5F0F\u5192\u9669\uFF0C\u6C99\u76D2\u8BD5\u73A9\u4E0D\u8BA1\u5165\u3002${state2.sessionOnly ? "\u6D4F\u89C8\u5668\u6682\u65F6\u65E0\u6CD5\u4FDD\u5B58\uFF0C\u5F53\u524D\u8BB0\u5F55\u4EC5\u5728\u672C\u6B21\u6E38\u620F\u4E2D\u4FDD\u7559\u3002" : "\u8BB0\u5F55\u4FDD\u5B58\u5728\u8FD9\u53F0\u8BBE\u5907\u7684\u8FD9\u4E2A\u6D4F\u89C8\u5668\u91CC\u3002"}</p></div></div>
<button class="primary" id="codexClose">\u5408\u4E0A\u56FE\u9274</button></div>`;
}
function paintCodexArt(root, list = CODEX_ENEMIES) {
  for (const canvas2 of root.querySelectorAll("canvas[data-codex-art]")) {
    const id = canvas2.dataset.codexArt, c = canvas2.getContext("2d"), w = canvas2.width;
    c.clearRect(0, 0, w, w);
    c.imageSmoothingEnabled = false;
    const boss = CODEX_BOSSES.find((b) => b.id === id), floor = boss ? boss.floor : (list.find(([t]) => t === id) || [])[1] || 1;
    const actors = boss ? boss.kinds.map((kind, i, all) => ({ type: "boss", kind, x: all.length > 1 ? (i ? 0.68 : 0.32) * w : w / 2, y: w * 0.72 })) : [{ type: id, x: w / 2, y: w * 0.78 }];
    const size = boss ? 156 : id === "tiny" ? 42 : id === "forklift" ? 78 : 68, scale = w / (boss ? boss.kinds.length > 1 ? 300 : 190 : size * 1.1);
    c.save();
    c.scale(scale, scale);
    for (const a of actors) drawPixelEnemy(c, { ...a, x: a.x / scale, y: a.y / scale, r: boss ? 56 : 19, t: 0, hp: 1, maxHp: 1, artChapter: floor, artFacing: -1, gunFacing: -1, dead: false }, 0);
    c.restore();
  }
}
var CODEX_SHEETS = ["mobs-milk-v1.png", "mobs-stage-v1.png", "mobs-factory-v1.png", "gunners-actions-v1.png", "chapter-bosses-v1.png", "bull-actions-v2.png", "meishu-actions-v1.png"];
function whenCodexArt(root, callback) {
  const waiting = [];
  if (root.querySelector("canvas[data-codex-art]")) for (const file of CODEX_SHEETS) {
    const img = cachedSpriteImage(file);
    if (img && !img.complete) {
      img.addEventListener("load", callback, { once: true });
      waiting.push(img);
    }
  }
  return () => {
    for (const img of waiting) img.removeEventListener("load", callback);
  };
}

// dist/game.js
var $ = (s) => document.querySelector(s);
var prefs = readPreferences(typeof localStorage !== "undefined" ? localStorage : void 0);
var canvas = $("#game");
var renderer = createGameRenderer(canvas, window, { maxScale: renderCap(prefs.quality) });
var ctx = renderer.context;
var overlay = $("#overlay");
var soundMix = new SoundMixer();
var createAudio = (url) => soundMix.createAudio(url);
var createVoiceAudio = (url) => soundMix.createBufferedAudio(url);
soundMix.setVolume(prefs.volume);
var bossVoice = new BossAudio({ createAudio: createVoiceAudio });
var bossDemo = new URLSearchParams(location.search).get("boss-demo") === "1";
var bossFloor = Number(new URLSearchParams(location.search).get("duel-floor") || 0);
var voice = new GameAudio({ createAudio: createVoiceAudio, onError: () => toast("\u5927\u7B11\u97F3\u6548\u6682\u672A\u5C31\u7EEA\uFF0C\u8BF7\u518D\u6B21\u70B9\u51FB\u64CD\u4F5C\u952E\u3002") });
var itemVoice = new ItemAudio({ createAudio: createVoiceAudio, canPlay: (key) => game.mode === "play" && ownsItemVoice(game, key), isBusy: () => !!bossVoice.current || voice.playing });
var syncRoomVoices = createRoomVoiceBoundary({ bossVoice, itemVoice });
var pauseMode = "play";
var panelResumeMode = null;
var updateStats = createStatsPanel($(".stats-panel"), $("#mobileStats"));
var game = new Game2();
var keys = /* @__PURE__ */ new Set();
var mouse = { x: 700, y: 300, down: false };
var move = { x: 0, y: 0 };
var touchFire = false;
var touchAim = { x: 0, y: 0 };
var last = 0;
var sound = true;
var shake = 0;
var toastTimer;
var oldMode = "play";
var best = 0;
var duel = createBossDuel({ getGame: () => game, onStart: () => {
  voice.stop();
  bossVoice.stop();
  itemVoice.stop();
  soundMix.stopTone();
}, onFinish: () => {
  last = performance.now();
} });
if (new URLSearchParams(location.search).get("duel-debug") === "1") window.__bossDuel = duel;
try {
  sound = localStorage.getItem("naiwa-sound") !== "false";
} catch {
}
voice.setEnabled(sound);
bossVoice.setEnabled(sound);
itemVoice.setEnabled(sound);
soundMix.setEnabled(sound);
try {
  best = Number(localStorage.getItem("naiwa-best") || 0);
} catch {
}
var touchActions = createTouchActions();
var touchResets = [];
var runStore = createRunStore({ getItem: (key) => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value), removeItem: (key) => localStorage.removeItem(key) });
var hasRun = false;
var lastSaveAt = 0;
var saveFailed = false;
var sandbox = createSandboxState();
var SANDBOX_CLOSING = /* @__PURE__ */ new Set(["chapter", "room", "boss", "resetRoom"]);
var fps = 60;
var codex = readCodex();
var codexState = { tab: "items", pick: null };
var codexCheckedAt = 0;
var codexRecording = () => hasRun && !sandbox.active && !bossDemo;
var codexReturn = null;
var stopCodexArt = null;
var codexDirty = false;
var codexRetryAt = 0;
function observeCodex(room, choices) {
  if (codexRecording() && recordCodex(codex, game, room, choices)) codexDirty = true;
}
function noteCodex() {
  observeCodex();
  if (codexDirty && performance.now() >= codexRetryAt) {
    codexDirty = !saveCodex(codex);
    codexState.sessionOnly = codexDirty;
    codexRetryAt = codexDirty ? performance.now() + 5e3 : 0;
  }
}
function refreshCodexCount() {
  const badge = $("#titleCodex small");
  if (badge) badge.textContent = codexCount();
}
window.addEventListener("storage", (e) => {
  if (e.key !== CODEX_KEY && e.key !== null) return;
  if (e.key === null && !codexDirty) codex = readCodex();
  else mergeCodex(codex, readCodex());
  if (codexReturn) renderCodex(true);
  else refreshCodexCount();
});
function unlockGameplayAudio() {
  if (sound && ["play", "rescue"].includes(game.mode)) voice.unlock();
}
window.addEventListener("pointerdown", unlockGameplayAudio, { capture: true, passive: true });
window.addEventListener("keydown", unlockGameplayAudio, { capture: true });
$("#desktopFullscreen").onclick = () => toggleGameFullscreen({ mobile: false }).then((result) => {
  if (result === "denied" || result === "unsupported") toast("\u6D4F\u89C8\u5668\u672A\u8FDB\u5165\u5168\u5C4F\uFF0C\u5DF2\u4F7F\u7528\u94FA\u6EE1\u7A97\u53E3\u5E03\u5C40\u3002");
});
var syncFullscreen = () => {
  $("#desktopFullscreen").textContent = document.fullscreenElement || document.webkitFullscreenElement ? "\u9000\u51FA\u5168\u5C4F" : "\u26F6 \u5168\u5C4F";
};
document.addEventListener("fullscreenchange", syncFullscreen);
document.addEventListener("webkitfullscreenchange", syncFullscreen);
var reducedMotion = matchMedia("(prefers-reduced-motion:reduce)");
var mobileMedia = matchMedia("(max-width:780px), (pointer:coarse), (max-width:1100px) and (max-height:600px)");
var touchPointer = matchMedia("(pointer:coarse)");
var revivePlayer = createRevivePlayer({ createAudio, getGame: () => game, overlay, getSound: () => sound, onSound: toggleSound, onCancel: () => end(false), onRevive: () => {
  voice.unlock();
  bossVoice.unlock();
  itemVoice.unlock();
  overlay.innerHTML = "";
  resetTouchInput();
  updateUI();
  canvas.focus();
  last = performance.now();
  saveCurrentRun();
  toast("\u5927\u7B11\u590D\u6D3B\uFF01\u6062\u590D\u534A\u8840\uFF0C3 \u79D2\u65E0\u654C\u4FDD\u62A4\u3002");
} });
var wardrobeOwner = null;
var wardrobeMode = null;
var wardrobe = createWardrobe({ onOpen: () => {
  if (!canUseRoomWardrobe(game)) return false;
  if (game.mode === "revive") {
    toast("\u89C2\u770B\u7ED3\u675F\u540E\u518D\u6362\u88C5\u3002");
    return false;
  }
  wardrobeOwner = game;
  wardrobeMode = game.mode;
  game.mode = "wardrobe";
  resetTouchInput();
  voice.stop();
  bossVoice.stop();
  itemVoice.stop();
  soundMix.stopTone();
  return true;
}, onClose: () => {
  if (game === wardrobeOwner && game.mode === "wardrobe") game.mode = wardrobeMode;
  resetTouchInput();
  last = performance.now();
} });
var frogSVG = '<div class="hero-frog hero-original" role="img" aria-label="\u5976\u86D9\u50CF\u7D20\u52A8\u4F5C\u5F62\u8C61"></div>';
function beep(freq = 500, dur = 0.07, type = "sine", volume = 0.025, priority = 1) {
  return soundMix.cue(freq, dur, type, volume, priority);
}
function toast(text) {
  $("#toast").textContent = text;
  $("#toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 3e3);
}
function title() {
  keepGameFullscreen(false);
  leaveSandbox();
  $("#settingsOpen").hidden = true;
  const saved = bossDemo ? { status: "empty" } : runStore.read(), available = saved.status === "ok";
  if (saved.storageBlocked) codexState.sessionOnly = true;
  overlay.innerHTML = `<section class="title-cover ${available ? "has-save" : ""}" aria-labelledby="coverTitle"><img class="cover-art" src="${assetPath("cover-rescue-v2.png")}" alt="\u5976\u86D9\u7528\u5927\u7B11\u95EF\u5411\u5730\u7262\uFF0C\u725B\u6765\u4E0E\u7F8E\u9F20\u5B88\u7740\u5173\u4F4F\u5976\u8C46\u7684\u7262\u7B3C" fetchpriority="high"><div class="cover-copy"><div class="cover-kicker">\u6C60\u5858\u5947\u9047 \xB7 \u6551\u56DE\u5976\u8C46</div><h2 id="coverTitle">\u5976\u86D9<span>\u7684\u7ED3\u5408</span></h2><p class="cover-story">\u725B\u6765\u548C\u7F8E\u9F20\u6293\u8D70\u4E86\u5976\u8C46\u3002<br>\u8FD9\u4E00\u6B21\uFF0C\u7528\u5927\u7B11\u628A\u5B69\u5B50\u5E26\u56DE\u5BB6\u3002</p>${available ? `<div class="cover-save"><span class="cover-save-label">\u4E0A\u6B21\u7684\u5192\u9669 \xB7 \u5DF2\u81EA\u52A8\u4FDD\u5B58</span><p class="cover-save-info"><b>\u7B2C ${saved.game.floor} \u7AE0 \xB7 ${CHAPTERS[saved.game.floor - 1]}</b><span>${saved.game.mode === "dead" ? "\u590D\u6D3B\u5F85\u5904\u7406" : `\u751F\u547D ${saved.game.p.hp}/${saved.game.p.maxHp} \xB7 \u9053\u5177 ${saved.game.items.length} \u4EF6`} \xB7 ${Math.floor(saved.game.elapsed / 60)}:${String(Math.floor(saved.game.elapsed % 60)).padStart(2, "0")}</span></p><button class="primary" id="continueRun">\u7EE7\u7EED\u6E38\u620F <span aria-hidden="true">\u2192</span></button></div>` : ""}<div class="cover-actions"><button class="${available ? "cover-restart" : "primary"}" id="start">${available ? "\u91CD\u65B0\u5F00\u59CB" : '\u51FA\u53D1\u6551\u5976\u8C46 <span aria-hidden="true">\u2192</span>'}</button><button class="cover-help" id="titleHelp">\u73A9\u6CD5\u8BF4\u660E</button><button class="cover-sandbox" id="sandboxStart">\u6C99\u76D2\u8BD5\u73A9</button><button class="cover-help" id="coverSettings">\u2699 \u8BBE\u7F6E</button></div><p class="cover-hint">${saved.storageBlocked ? "\u5F53\u524D\u6D4F\u89C8\u5668\u9650\u5236\u5B58\u50A8\uFF0C\u672C\u6B21\u5192\u9669\u53EF\u6B63\u5E38\u6E38\u73A9\u3002" : saved.status === "error" ? "\u5B58\u6863\u6682\u65F6\u65E0\u6CD5\u8BFB\u53D6\u3002\u53EF\u5C1D\u8BD5\u91CD\u65B0\u6253\u5F00\u6E38\u620F\u3002" : "\u6BCF 2 \u79D2\u81EA\u52A8\u4FDD\u5B58 \xB7 \u672C\u673A\u7EE7\u7EED\u5192\u9669"}</p></div><span class="cover-edition">THE BINDING OF NAIWA</span>${bossDemo ? "" : `<button class="cover-codex" id="titleCodex" aria-label="\u6253\u5F00\u5976\u86D9\u56FE\u9274">\u56FE\u9274<small>${codexCount()}</small></button>`}</section>`;
  const privacy = document.createElement("a");
  privacy.href = "./privacy.html";
  privacy.textContent = "\u9690\u79C1\u653F\u7B56";
  privacy.style.color = "inherit";
  $(".cover-hint").append(" \xB7 ", privacy);
  if (bossDemo) {
    $("#sandboxStart").remove();
    $("#start").firstChild.textContent = "\u5F00\u59CB\u53CC Boss \u6F14\u793A ";
    $(".cover-story").innerHTML = "\u76F4\u63A5\u8FDB\u5165\u6700\u7EC8\u623F\u95F4\uFF0C\u8BD5\u542C\u6280\u80FD\u539F\u58F0\u3002<br>\u6F14\u793A\u4E2D\u5976\u86D9\u65E0\u654C\uFF0C\u4E0D\u8BA1\u5165\u6700\u4F73\u8BB0\u5F55\u3002";
  }
  const cover = $(".cover-art");
  if (cover.complete) releaseArt();
  else {
    cover.addEventListener("load", releaseArt, { once: true });
    cover.addEventListener("error", releaseArt, { once: true });
  }
  $("#start").onclick = requestNewRun;
  $("#titleHelp").onclick = help;
  $("#coverSettings").onclick = openSettings;
  $("#titleCodex")?.addEventListener("click", openCodex);
  $("#sandboxStart")?.addEventListener("click", startSandboxRun);
  if (available) $("#continueRun").onclick = continueRun;
}
function savedMode() {
  let mode = game.mode;
  if (mode === "help") mode = oldMode;
  if (mode === "wardrobe") mode = wardrobeMode;
  if (mode === "paused") mode = panelResumeMode || pauseMode;
  return mode;
}
function saveCurrentRun() {
  if (!hasRun || bossDemo || sandbox.active || game.mode === "title") return true;
  noteCodex();
  const mode = savedMode(), ok = runStore.write(game, { mode, costume: selectedCostume() });
  lastSaveAt = performance.now();
  if (!ok && !saveFailed) toast("\u8FDB\u5EA6\u672A\u80FD\u4FDD\u5B58\uFF0C\u8BF7\u68C0\u67E5\u8BBE\u5907\u5B58\u50A8\u7A7A\u95F4\uFF1B\u6682\u65F6\u4E0D\u8981\u9000\u51FA\u3002");
  saveFailed = !ok;
  if (ok && (mode === "win" || mode === "dead" && game.reviveUsed)) hasRun = false;
  return ok;
}
function continueRun() {
  const saved = runStore.read();
  if (saved.status !== "ok") {
    title();
    toast("\u5B58\u6863\u65E0\u6CD5\u8BFB\u53D6\uFF0C\u8BF7\u5C1D\u8BD5\u91CD\u65B0\u6253\u5F00\u6E38\u620F\u3002");
    return;
  }
  revivePlayer.stop();
  voice.stop();
  bossVoice.stop();
  itemVoice.stop();
  soundMix.stopTone();
  bossVoice.reset();
  itemVoice.reset();
  resetTouchInput();
  leaveSandbox();
  releaseArt();
  $("#settingsOpen").hidden = false;
  game = saved.game;
  hasRun = true;
  saveFailed = false;
  lastSaveAt = performance.now();
  panelResumeMode = null;
  setCostume(saved.costume);
  if (!game.codexRunId) game.codexRunId = "legacy-" + saved.savedAt.toString(36);
  noteCodex();
  keepGameFullscreen(true);
  void requestGameFullscreen({ mobile: touchPointer.matches });
  updateUI();
  last = performance.now();
  voice.unlock();
  bossVoice.unlock();
  itemVoice.unlock();
  if (game.mode === "choice") showChoices("\u7EE7\u7EED\u9009\u62E9 \xB7 \u4E0A\u6B21\u7559\u4E0B\u7684\u9053\u5177", game.choices);
  else if (game.mode === "dead") end(false);
  else if (game.mode === "win") end(true);
  else if (game.mode === "rescue") showRescue();
  else {
    game.mode = "play";
    overlay.innerHTML = "";
    canvas.focus();
    last = performance.now();
  }
}
function requestNewRun() {
  const saved = runStore.read();
  if (bossDemo || !hasRun && (saved.status === "empty" || saved.storageBlocked)) {
    start();
    return;
  }
  const previous = game.mode;
  if (["play", "rescue"].includes(previous)) pause();
  overlay.innerHTML = '<div class="modal confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="confirmNewRunTitle"><div class="mini">START OVER?</div><h2 id="confirmNewRunTitle">\u91CD\u65B0\u5F00\u59CB\u4E00\u5C40\uFF1F</h2><p>\u5F53\u524D\u5B58\u6863\u4F1A\u88AB\u65B0\u7684\u4E00\u5C40\u66FF\u6362\uFF0C\u65E0\u6CD5\u627E\u56DE\u3002</p><div class="confirm-actions"><button class="primary keep-run" id="cancelNewRun">\u4FDD\u7559\u8FDB\u5EA6\uFF0C\u8FD4\u56DE</button><button class="danger" id="confirmNewRun">\u66FF\u6362\u5B58\u6863\uFF0C\u91CD\u65B0\u5F00\u59CB</button></div></div>';
  $("#cancelNewRun").focus({ preventScroll: true });
  $("#confirmNewRun").onclick = start;
  $("#cancelNewRun").onclick = () => {
    if (previous === "title") title();
    else {
      game.mode = pauseMode;
      pause();
    }
  };
}
function saveAndTitle() {
  if (!saveCurrentRun()) return;
  revivePlayer.stop();
  voice.stop();
  bossVoice.stop();
  itemVoice.stop();
  soundMix.stopTone();
  resetTouchInput();
  hasRun = false;
  game.mode = "title";
  panelResumeMode = null;
  title();
}
window.naiwaSaveAndPause = () => {
  window.dispatchEvent(new Event("blur"));
  return saveCurrentRun();
};
window.addEventListener("pagehide", saveCurrentRun);
window.addEventListener("blur", saveCurrentRun);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) saveCurrentRun();
});
function start() {
  $("#settingsOpen").hidden = false;
  duel.reset();
  revivePlayer.stop();
  voice.stop();
  bossVoice.stop();
  itemVoice.stop();
  soundMix.stopTone();
  bossVoice.reset();
  itemVoice.reset();
  voice.unlock();
  bossVoice.unlock();
  itemVoice.unlock();
  keepGameFullscreen(true);
  void requestGameFullscreen({ mobile: touchPointer.matches });
  resetTouchInput();
  leaveSandbox();
  releaseArt();
  game = new Game2();
  game.start();
  hasRun = true;
  panelResumeMode = null;
  last = performance.now();
  if (bossDemo) {
    game.floor = bossFloor || 5;
    game.generate();
    game.enter(game.rooms.find((r) => r.exists && r.type === "boss").id, "top");
    game.hurt = () => {
    };
    game.p.damage = 3;
  }
  overlay.innerHTML = "";
  keys.clear();
  mouse.down = false;
  updateUI();
  canvas.focus();
  beep(650, 0.15);
  toast(matchMedia("(pointer:coarse), (max-width:780px), (max-width:1100px) and (max-height:600px)").matches ? "\u5DE6\u624B\u79FB\u52A8 \xB7 \u53F3\u624B\u5341\u5B57\u952E\u5C04\u51FB" : "\u65B9\u5411\u952E\u5927\u7B11\uFF1BE \u4E92\u52A8\uFF1BB \u70B8\u5F39\uFF1B\u9020\u6210\u4F24\u5BB3\u5145\u80FD\uFF0CQ \u5927\u7206\u7B11\u51FB\u9000\u3002");
  saveCurrentRun();
}
function syncSandboxChrome() {
  document.documentElement.toggleAttribute("data-sandbox", sandbox.active);
  $("#sandboxTools").hidden = !sandbox.active;
  const item = document.querySelector('[data-menu-action="sandboxTools"]');
  if (item) item.hidden = !sandbox.active;
}
function leaveSandbox() {
  if (!sandbox.active) return;
  sandbox.active = false;
  sandbox.speed = 1;
  syncSandboxChrome();
}
function startSandboxRun() {
  revivePlayer.stop();
  voice.stop();
  bossVoice.stop();
  itemVoice.stop();
  soundMix.stopTone();
  bossVoice.reset();
  itemVoice.reset();
  voice.unlock();
  bossVoice.unlock();
  itemVoice.unlock();
  keepGameFullscreen(true);
  void requestGameFullscreen({ mobile: touchPointer.matches });
  resetTouchInput();
  releaseArt();
  hasRun = false;
  Object.assign(sandbox, createSandboxState(), { active: true });
  game = startSandbox(new Game2(), sandbox);
  panelResumeMode = null;
  last = performance.now();
  overlay.innerHTML = "";
  keys.clear();
  mouse.down = false;
  syncSandboxChrome();
  updateUI();
  canvas.focus();
  beep(650, 0.15);
  toast(mobileMedia.matches ? "\u6C99\u76D2\u8BD5\u73A9\uFF1A\u70B9\u83DC\u5355 \u2630 \u91CC\u7684\u201C\u6C99\u76D2\u5DE5\u5177\u201D\u5207\u6362\u7AE0\u8282\u3001\u751F\u6210\u654C\u4EBA\u3001\u62FF\u653E\u9053\u5177\u3002" : "\u6C99\u76D2\u8BD5\u73A9\uFF1A\u6309 T \u6253\u5F00\u6C99\u76D2\u5DE5\u5177\uFF0C\u5207\u6362\u7AE0\u8282\u3001\u751F\u6210\u654C\u4EBA\u3001\u62FF\u653E\u9053\u5177\u3002");
}
function sandboxPanelOpen() {
  return game.mode === "paused" && !!overlay.querySelector(".sandbox-modal");
}
function toggleSandboxPanel() {
  if (document.body.classList.contains("mobile-panel-open")) return;
  if (sandboxPanelOpen()) resume();
  else openSandboxPanel();
}
function openSandboxPanel() {
  if (!sandbox.active || document.body.classList.contains("mobile-panel-open")) return;
  if (game.mode === "paused" && !sandboxPanelOpen() && !overlay.querySelector("#pauseSandboxTools")) return;
  if (["play", "rescue"].includes(game.mode)) {
    pauseMode = game.mode;
    voice.stop();
    bossVoice.stop();
    itemVoice.stop();
    soundMix.stopTone();
    game.mode = "paused";
  } else if (game.mode !== "paused") return;
  resetTouchInput();
  renderSandboxPanel(false);
  overlay.querySelector('[data-sandbox-tab][aria-selected="true"]')?.focus({ preventScroll: true });
}
function renderSandboxPanel(keepScroll) {
  const old = overlay.querySelector(".sandbox-body"), top = keepScroll && old ? old.scrollTop : 0, focused = document.activeElement?.closest?.(".sandbox-modal") ? document.activeElement : null, focusKey = focused && [focused.dataset.sandbox, focused.dataset.roomId ?? focused.dataset.value ?? focused.dataset.key, focused.dataset.sandboxTab].join("|");
  overlay.innerHTML = sandboxPanelHTML(game, sandbox);
  const body2 = overlay.querySelector(".sandbox-body");
  body2.scrollTop = top;
  overlay.querySelectorAll("[data-sandbox-tab]").forEach((b) => b.onclick = () => {
    sandbox.tab = b.dataset.sandboxTab;
    renderSandboxPanel(false);
    overlay.querySelector('[data-sandbox-tab][aria-selected="true"]')?.focus({ preventScroll: true });
  });
  overlay.querySelectorAll("[data-sandbox]").forEach((b) => b.onclick = () => {
    const action = b.dataset.sandbox, value = b.dataset.roomId ?? b.dataset.key ?? b.dataset.value, closing = SANDBOX_CLOSING.has(action);
    if (closing) {
      pauseMode = "play";
      resume();
    }
    const result = runSandboxAction(game, sandbox, action, value);
    processEvents();
    updateUI();
    if (result.text) toast(result.text);
    if (!closing) renderSandboxPanel(true);
  });
  $("#sandboxClose").onclick = resume;
  $("#sandboxExit").onclick = saveAndTitle;
  if (focusKey) {
    for (const b of overlay.querySelectorAll(".sandbox-modal button")) if ([b.dataset.sandbox, b.dataset.roomId ?? b.dataset.value ?? b.dataset.key, b.dataset.sandboxTab].join("|") === focusKey) {
      b.focus({ preventScroll: true });
      break;
    }
  }
}
$("#sandboxTools").onclick = openSandboxPanel;
$("#settingsOpen").onclick = openSettings;
function pause() {
  if (game.mode === "revive") {
    revivePlayer.pause();
    return;
  }
  resetTouchInput();
  if (["play", "rescue"].includes(game.mode)) {
    pauseMode = game.mode;
    voice.stop();
    bossVoice.stop();
    itemVoice.stop();
    soundMix.stopTone();
    game.mode = "paused";
    overlay.innerHTML = sandbox.active ? `<div class="modal"><div class="mini">SANDBOX \xB7 PAUSED</div><h2>\u6C99\u76D2\u6682\u505C</h2><p>\u6C99\u76D2\u4E0D\u4FDD\u5B58\u8FDB\u5EA6\uFF0C\u4E5F\u4E0D\u4F1A\u5F71\u54CD\u6B63\u5F0F\u5B58\u6863\u548C\u6700\u4F73\u8BB0\u5F55\u3002</p><button class="primary" id="resume">\u7EE7\u7EED\u8BD5\u73A9 \u2192</button><button class="secondary" id="pauseSandboxTools">\u6253\u5F00\u6C99\u76D2\u5DE5\u5177</button><button class="secondary" id="pauseSettings">\u6E38\u620F\u8BBE\u7F6E</button><button class="secondary" id="pauseCodex">\u5976\u86D9\u56FE\u9274</button><button class="secondary" id="restart">\u91CD\u7F6E\u6C99\u76D2</button><button class="secondary" id="saveExit">\u9000\u51FA\u6C99\u76D2\uFF0C\u8FD4\u56DE\u5C01\u9762</button></div>` : `<div class="modal"><div class="mini">TAKE A LITTLE BREATH</div><h2>\u86D9\u86D9\u6B47\u4E00\u4F1A\u513F</h2><p>\u672C\u673A\u81EA\u52A8\u4FDD\u5B58\u8FDB\u5EA6\uFF0C\u56DE\u6765\u53EF\u4EE5\u7EE7\u7EED\u3002</p><button class="primary" id="resume">\u7EE7\u7EED\u5192\u9669 \u2192</button><button class="secondary" id="pauseSettings">\u6E38\u620F\u8BBE\u7F6E</button><button class="secondary" id="pauseCodex">\u5976\u86D9\u56FE\u9274</button><button class="secondary" id="saveExit">\u4FDD\u5B58\u5E76\u8FD4\u56DE\u5C01\u9762</button><button class="secondary" id="restart">\u91CD\u65B0\u5F00\u59CB\u672C\u5C40</button></div>`;
    $("#resume").onclick = resume;
    $("#pauseSettings").onclick = openSettings;
    $("#pauseCodex").onclick = openCodex;
    $("#restart").onclick = sandbox.active ? startSandboxRun : requestNewRun;
    $("#saveExit").onclick = saveAndTitle;
    if (sandbox.active) $("#pauseSandboxTools").onclick = openSandboxPanel;
    keys.clear();
    mouse.down = false;
    saveCurrentRun();
  } else if (game.mode === "paused") resume();
}
function resume() {
  game.mode = pauseMode;
  overlay.innerHTML = "";
  if (game.mode === "rescue") showRescue();
  voice.unlock();
  bossVoice.unlock();
  itemVoice.unlock();
  canvas.focus();
  last = performance.now();
}
function help() {
  if (["help", "revive"].includes(game.mode)) return;
  voice.stop();
  bossVoice.stop();
  itemVoice.stop();
  soundMix.stopTone();
  resetTouchInput();
  oldMode = game.mode;
  game.mode = "help";
  overlay.innerHTML = `<div class="modal help-modal"><div class="mini">A FROG'S FIELD GUIDE</div><h2>\u6C60\u5858\u751F\u5B58\u6307\u5357</h2><div class="instructions"><b>\u5B58\u6863\uFF1A</b>\u6BCF 2 \u79D2\u81EA\u52A8\u4FDD\u5B58\uFF1B\u6362\u623F\u3001\u8D2D\u4E70\u3001\u53D7\u4F24\u548C\u5207\u5230\u540E\u53F0\u65F6\u4E5F\u4F1A\u4FDD\u5B58\u3002\u5C01\u9762\u70B9\u201C\u7EE7\u7EED\u6E38\u620F\u201D\uFF0C\u51C6\u5907\u597D\u540E\u6062\u590D\u6218\u6597\u3002\u6682\u505C\u83DC\u5355\u53EF\u4FDD\u5B58\u5E76\u8FD4\u56DE\u5C01\u9762\u3002\u4EC5\u4FDD\u5B58\u5728\u5F53\u524D\u8BBE\u5907\u4E0E\u5F53\u524D\u6D4F\u89C8\u5668\u4E2D\uFF0C\u6E05\u9664\u5E94\u7528\u6570\u636E\u4F1A\u4E22\u5931\uFF1B\u5F00\u59CB\u65B0\u7684\u4E00\u5C40\u4F1A\u8986\u76D6\u65E7\u5B58\u6863\u3002\u6B7B\u4EA1\u540E\u82E5\u8FD8\u80FD\u590D\u6D3B\uFF0C\u8FD4\u56DE\u4ECD\u662F\u6B7B\u4EA1\u753B\u9762\uFF0C\u89C2\u770B\u9700\u4ECE\u5934\u5F00\u59CB\u3002<br><b>\u79FB\u52A8\uFF1A</b>WASD\uFF1B\u624B\u673A\u5728\u5DE6\u4E0B\u65B9\u4EFB\u610F\u4F4D\u7F6E\u6309\u4F4F\u62D6\u52A8\uFF0C\u6447\u6746\u4F1A\u51FA\u73B0\u5728\u62C7\u6307\u4E0B\uFF0C\u677E\u624B\u56DE\u5230\u539F\u5904\u3002<br><b>\u653B\u51FB\uFF1A</b>\u53EA\u80FD\u5411\u4E0A\u3001\u4E0B\u3001\u5DE6\u3001\u53F3\u5C04\u51FB\u3002\u65B9\u5411\u952E\u6309\u4F4F\u53D1\u5C04\uFF1B\u9F20\u6807\u6309\u4F4F\uFF0C\u6309\u6240\u5728\u65B9\u4F4D\u53D6\u56DB\u5411\u3002\u624B\u673A\u6309\u4F4F\u53F3\u4FA7\u5341\u5B57\u6447\u6746\u7684\u65B9\u5411\u6301\u7EED\u5C04\u51FB\uFF0C\u6ED1\u52A8\u6362\u5411\uFF0C\u56DE\u5230\u4E2D\u5FC3\u6216\u677E\u624B\u505C\u6B62\u3002<br><b>\u62A2\u5976\u8DD1\u817F\u602A\uFF1A</b>\u7EA2\u56F4\u5DFE\u3001\u9AD8\u901F\u8FFD\u51FB\u3001\u8840\u91CF\u8F83\u4F4E\uFF0C\u4F18\u5148\u5904\u7406\u3002<br><b>\u5706\u809A\u602A\uFF1A</b>\u5DF2\u53D6\u6D88\u76FE\u724C\uFF1B\u98DE\u6251\u602A\u51B2\u523A\u524D\u4F1A\u663E\u793A\u7EA2\u7EBF\u3002\u7AD9\u6869\u70AE\u53F0\u5C04\u51FB\u66F4\u9891\u7E41\uFF1B\u5C16\u5578\u97F3\u7BB1\u8F6E\u6362\u9519\u4F4D\u73AF\u5C04\u3001\u7784\u51C6\u6247\u5C04\u3001\u65CB\u8F6C\u5341\u5B57\uFF0C\u865A\u7EBF\u9884\u8B66\u540E\u53D1\u5C04\u3002<br><b>\u86D9\u8DF3\uFF1A</b>\u7A7A\u683C\u6216\u624B\u673A\u86D9\u8DF3\u6309\u94AE\uFF0C\u6CBF\u79FB\u52A8\u65B9\u5411\u8D8A\u8FC7\u77ED\u969C\u788D\u548C\u7A84\u5751\uFF0C\u77ED\u6682\u65E0\u654C\uFF0C\u51B7\u5374 2 \u79D2\u3002\u9700\u8981\u5728\u8DF3\u8DC3\u8DDD\u79BB\u5185\u627E\u5230\u7A7A\u5730\u843D\u811A\uFF1B\u5BBD\u5751\u548C\u623F\u95F4\u5916\u5899\u4E0D\u80FD\u8D8A\u8FC7\u3002<br><b>\u5730\u5F62\uFF1A</b>\u8D27\u7BB1\u53EF\u7528\u7B11\u58F0\u51FB\u788E\uFF0C\u6709 15% \u6982\u7387\u6389\u8865\u7ED9\uFF1B\u84DD\u7EB9\u85CF\u5B9D\u77F3\u70B8\u5F00\u5FC5\u6709\u8865\u7ED9\uFF1B\u88C2\u7EB9\u77F3\u5806\u9700\u70B8\u5F39\uFF1B\u94C6\u9489\u67F1\u4E0D\u80FD\u7834\u574F\uFF1B\u6DF1\u8272\u5751\u6D1E\u4E0D\u80FD\u6B65\u884C\u901A\u8FC7\uFF0C\u7A84\u5751\u53EF\u7528\u86D9\u8DF3\u8D8A\u8FC7\uFF1B\u97F3\u6CE2\u53EF\u4EE5\u98DE\u8FC7\u3002<br><b>\u623F\u95F4\u5E03\u5C40\uFF1A</b>\u666E\u901A\u623F\u95F4\u901A\u8FC7\u8D27\u7BB1\u3001\u5CA9\u77F3\u3001\u56FA\u5B9A\u67F1\u548C\u5751\u6D1E\u5206\u5272\u8DEF\u7EBF\u4E0E\u706B\u7EBF\u3002\u602A\u7269\u653B\u51FB\u4F1A\u7559\u4E0B\u77ED\u6682\u5371\u9669\u533A\u57DF\uFF0CBoss \u623F\u6709\u4E13\u5C5E\u6280\u80FD\u673A\u5173\u3002<br><b>\u7279\u8272\u602A\uFF1A</b>\u80C0\u5976\u56E2\u6B7B\u540E\u5EF6\u8FDF\u6E85\u5976\uFF1B\u6ED1\u5976\u4ED4\u8E29\u5976\u52A0\u901F\uFF1B\u6307\u6325\u602A\u50AC\u62CD\u52A0\u901F\u961F\u53CB\uFF1B\u56DE\u58F0\u94C3\u9501\u5B9A\u65B9\u5411\u4E09\u8FDE\u5C04\uFF1B\u53C9\u8F66\u9884\u8B66\u540E\u51B2\u950B\uFF1B\u6295\u5305\u88F9\u5DE5\u7838\u5411\u843D\u70B9\uFF1B\u7F1D\u8865\u5DE5\u4F1A\u56DE\u8840\u7ED9\u540C\u4F34\uFF1B\u53D1\u6761\u5E9F\u5076\u9AD8\u901F\u8FFD\u51FB\uFF0C\u63A5\u89E6\u7ACB\u5373\u81EA\u7206\uFF0C\u53EF\u63D0\u524D\u51FB\u6740\u6216\u86D9\u8DF3\u8EB2\u4F24\u5BB3\uFF1B\u72F1\u5352\u653E\u7535\u7F51\uFF1B\u63A2\u7167\u773C\u53D1\u5C04\u65CB\u8F6C\u5341\u5B57\u5F39\u5E55\u3002<br><b>\u8D44\u6E90\u8DEF\u7EBF\uFF1A</b>\u6BCF\u5C42\u589E\u52A0\u94A5\u5319\u8865\u7ED9\u5E93\u4E0E\u5C01\u5899\u85CF\u5BA4\u3002\u8865\u7ED9\u5E93\u6D88\u8017 1 \u628A\u94A5\u5319\uFF0C\u51FB\u8D254\u20136 \u540D\u5B88\u536B\u540E\u83B7 2 \u679A\u70B8\u5F39\u4E0E 3 \u91D1\u5E01\uFF1B\u5728\u88C2\u5899\u95E8\u53E3\u6309 B \u653E\u70B8\u5F39\u3001\u9000\u5F00\uFF0C\u70B8\u5F00\u85CF\u5BA4\u540E\u987B\u6E05\u602A\u5E76\u8EB2\u907F\u843D\u7269 12 \u79D2\uFF0C\u624D\u4F1A\u63ED\u6653\u968F\u673A\u5956\u52B1\uFF1A\u91D1\u5E01\u3001\u94A5\u5319\u70B8\u5F39\u3001\u56DE\u8840\u8865\u7ED9\u6216\u9053\u5177\u3002\u63A5\u5E94\u70B9\u7684 E \u56DE\u6536\u53F0\u53EF\u7528 2 \u94A5\u5319\u6362 1 \u70B8\u5F39\uFF0C\u6216 2 \u70B8\u5F39\u6362 1 \u94A5\u5319\uFF0C\u4E5F\u80FD\u6362\u91D1\u5E01\uFF0C\u6BCF\u5C42\u9650\u91CF\uFF1B\u4E5F\u53EF\u6D88\u8017 2 \u70B9\u751F\u547D\u6362 3 \u91D1\u5E01\uFF08\u4E0D\u80FD\u81F4\u6B7B\u3001\u62A4\u76FE\u4E0D\u62B5\u6263\uFF09\uFF1B\u5546\u5E97\u8FD8\u80FD\u82B1\u91D1\u5E01\u8865\u8D27\u3002\u8D44\u6E90\u623F\u5747\u4E3A\u53EF\u9009\u8DEF\u7EBF\uFF0C\u6E05\u5B8C\u6709 25% \u6982\u7387\u4E3A\u7A7A\uFF0C75% \u83B7\u5F97\u8865\u7ED9\uFF08\u9690\u85CF\u85CF\u5BA4\u968F\u673A\uFF09\uFF1B\u7ED3\u679C\u53EA\u7ED3\u7B97\u4E00\u6B21\u3002<br><b>\u5730\u56FE\uFF1A</b>\u7535\u8111\u6309 M \u6253\u5F00\u6216\u5173\u95ED\u5730\u56FE\uFF0C\u67E5\u770B\u65F6\u6682\u505C\u6218\u6597\uFF1B\u4E5F\u53EF\u6309 Esc \u5173\u95ED\u3002<br><b>\u63A2\u7D22\uFF1A</b>\u6E05\u7A7A\u5C0F\u602A\uFF0C\u8D70\u5230\u95E8\u53E3\u8FDB\u5165\u76F8\u90BB\u623F\u95F4\u3002<br><b>\u81EA\u5DF1\u627E\u9690\u85CF\u623F\uFF1A</b>\u4F18\u5148\u68C0\u67E5\u5730\u56FE\u4E0A\u88AB\u4E24\u4E09\u95F4\u623F\u56F4\u4F4F\u7684\u7A7A\u4F4D\uFF0C\u771F\u85CF\u5BA4\u4E0D\u4F1A\u7D27\u8D34 Boss \u623F\u6216\u4E0A\u9501\u8D44\u6E90\u623F\u3002\u6E05\u623F\u540E\u89C2\u5BDF\u5899\u4E2D\u592E\u7684\u7EC6\u88C2\u7EB9\u4E0E\u788E\u5899\u7070\uFF0C\u9760\u8FD1\u4F1A\u6709\u63D0\u793A\uFF1B\u7528\u70B8\u5F39\u9A8C\u8BC1\u3002\u6BCF\u5C42\u6700\u591A 2 \u5904\u5047\u88C2\u7EB9\uFF0C\u6307\u5411\u7D27\u8D34 Boss \u623F\u7684\u7A7A\u4F4D\uFF0C\u70B8\u9519\u53EA\u4F1A\u9732\u51FA\u5B9E\u5899\u3002\u60C5\u62A5\u53EF\u76F4\u63A5\u6807\u51FA\u771F\u623F\u95F4\uFF0C\u4F46\u4E0D\u662F\u5165\u573A\u8981\u6C42\u3002<br><b>\u9053\u5177\uFF1A</b>\u9053\u5177\u623F\u62FF\u968F\u673A\u9053\u5177\uFF1B\u6311\u6218\u623F\u968F\u673A\u83B7\u5F97\u5B9D\u7BB1\u6216\u4E09\u9009\u4E00\u9053\u5177\u3002\u666E\u901A\u623F\u95F4\u6709 40% \u6982\u7387\u65E0\u6389\u843D\uFF0C\u5426\u5219\u53EA\u7ED9\u4E00\u79CD\u5C0F\u8865\u7ED9\u3002\u94A5\u5319\u5F00\u623F\u95F4\u548C\u5B9D\u7BB1\uFF0C\u91D1\u5E01\u8D2D\u4E70\u5546\u5E97\u9053\u5177\u3002<br><b>\u91D1\u5E01\u670D\u52A1\uFF1A</b>\u5546\u5E97\u53EF\u82B1 4 \u91D1\u5E01\u5237\u65B0\u9053\u5177\uFF08\u6BCF\u5C42 2 \u6B21\uFF09\u30015 \u91D1\u5E01\u4E70\u4E00\u6B21\u6027\u62A4\u76FE\u30014 \u91D1\u5E01\u8865\u6EE1\u7206\u7B11\u30013 \u91D1\u5E01\u4E70\u672C\u5C42\u9690\u85CF\u623F\u95F4\u60C5\u62A5\uFF08\u4EC5\u6807\u51FA\u85CF\u5BA4\uFF0C\u4ECD\u9700\u70B8\u5899\uFF1B\u540E\u4E09\u9879\u6BCF\u5C42\u5404 1 \u6B21\uFF09\u3002\u5DF2\u6709\u62A4\u76FE\u3001\u6EE1\u5145\u80FD\u6216\u9690\u85CF\u85CF\u5BA4\u5DF2\u53D1\u73B0\u65F6\u4E0D\u4F1A\u6263\u94B1\u3002<br><b>\u590D\u6D3B\uFF1A</b>\u6BCF\u5C40\u53EF\u5728\u6B7B\u4EA1\u540E\u89C2\u770B 10 \u79D2\u5976\u9F99\u5927\u7B11\uFF0C\u5B8C\u6210\u540E\u624B\u52A8\u9886\u53D6\u534A\u8840\u590D\u6D3B\uFF08\u5947\u6570\u751F\u547D\u4E0A\u9650\u5411\u4E0A\u53D6\u6574\uFF09\uFF0C\u9644\u5E26 3 \u79D2\u65E0\u654C\u3002\u540E\u53F0\u6682\u505C\u8BA1\u65F6\uFF0C\u4E2D\u9014\u653E\u5F03\u4E0D\u6D88\u8017\u673A\u4F1A\uFF0C\u4F46\u91CD\u65B0\u89C2\u770B\u4ECE\u5934\u5F00\u59CB\u3002<br><b>\u901A\u5173\uFF1A</b>\u51FB\u8D25\u6700\u7EC8\u53CC Boss \u540E\uFF0C\u53CD\u590D\u6309\u952E\u6216\u70B9\u51FB\u5927\u7B11\uFF0C\u6253\u7834\u7262\u7B3C\uFF1B\u957F\u6309\u4E0D\u8FDE\u53D1\u3002\u968F\u540E\u5976\u8C46\u4E0E\u8C46\u5305\u56E2\u805A\u3002<br><b>\u8D44\u6E90\uFF1A</b>E \u4E92\u52A8\uFF0CB \u653E\u70B8\u5F39\uFF08\u4F1A\u70B8\u4F24\u81EA\u5DF1\uFF09\uFF0CQ \u5373\u65F6\u5927\u7206\u7B11\uFF0C\u534A\u5F84 160\u3001\u4F24\u5BB3 4\uFF0C\u5C06\u9644\u8FD1\u654C\u4EBA\u4E0E\u5B50\u5F39\u5411\u5916\u63A8\u3002\u5B9E\u9645\u9020\u6210 45 \u70B9\u4F24\u5BB3\u5145\u6EE1\u4E00\u6B21\uFF08\u7535\u6C60\u964D\u5230 30\uFF09\uFF0C\u521D\u59CB\u7A7A\u5145\u80FD\uFF1B\u5927\u7206\u7B11\u672C\u8EAB\u4E0D\u8FD4\u8FD8\u5145\u80FD\u3002<br><b>\u5976\u86D9\u56FE\u9274\uFF1A</b>\u6B63\u5F0F\u5192\u9669\u4E2D\u9047\u5230\u7684\u9053\u5177\u3001\u654C\u4EBA\u548C\u5173\u672B\u654C\u4EBA\u4F1A\u8BB0\u8FDB\u56FE\u9274\uFF0C\u6362\u5C40\u4E5F\u4FDD\u7559\uFF1B\u5C01\u9762\u53F3\u4E0A\u89D2\u3001\u6682\u505C\u83DC\u5355\u548C\u624B\u673A\u83DC\u5355\u90FD\u80FD\u6253\u5F00\u3002<br><b>\u6C99\u76D2\u8BD5\u73A9\uFF1A</b>\u5C01\u9762\u70B9\u201C\u6C99\u76D2\u8BD5\u73A9\u201D\u81EA\u7531\u4F53\u9A8C\uFF1A\u5207\u6362\u7AE0\u8282\u3001\u76F4\u8FBE\u4EFB\u610F\u623F\u95F4\u6216 Boss\u3001\u751F\u6210\u672C\u7AE0\u654C\u4EBA\u548C\u8BAD\u7EC3\u9776\u3001\u968F\u610F\u62FF\u653E\u9053\u5177\u3001\u5F00\u5173\u65E0\u654C\u4E0E\u4E00\u51FB\u5FC5\u6740\uFF0C\u8FD8\u80FD\u663E\u793A\u78B0\u649E\u8303\u56F4\u548C\u8C03\u8BD5\u4FE1\u606F\u3002\u7535\u8111\u6309 T \u6253\u5F00\u6C99\u76D2\u5DE5\u5177\uFF0C\u624B\u673A\u5728\u83DC\u5355 \u2630 \u91CC\u6253\u5F00\u3002\u6C99\u76D2\u4E0D\u4FDD\u5B58\uFF0C\u4E5F\u4E0D\u5F71\u54CD\u6B63\u5F0F\u5B58\u6863\u548C\u6700\u4F73\u8BB0\u5F55\u3002</div><button class="primary" id="closeHelp">\u77E5\u9053\u5566</button>${creatorLinks()}</div>`;
  bindCreatorLinks(overlay);
  $("#closeHelp").onclick = leaveHelp;
  const helpScroll = overlay.querySelector(".help-modal .instructions"), helpModal = overlay.querySelector(".help-modal");
  if (helpScroll && helpModal && helpScroll.scrollHeight > helpScroll.clientHeight + 4) {
    helpModal.dataset.scroll = "more";
    const hint = document.createElement("span");
    hint.className = "help-scroll-hint";
    hint.textContent = "\u4E0B\u6ED1\u67E5\u770B";
    helpModal.appendChild(hint);
    helpScroll.addEventListener("scroll", () => {
      helpModal.dataset.scroll = helpScroll.scrollTop + helpScroll.clientHeight >= helpScroll.scrollHeight - 4 ? "end" : "more";
    });
  }
  keys.clear();
  mouse.down = false;
}
function leaveHelp() {
  game.mode = oldMode;
  if (oldMode === "title") title();
  else if (oldMode === "choice") showChoices("\u86D9\u86D9\u7684\u6218\u5229\u54C1 \xB7 \u9009\u62E9\u4E00\u4E2A", game.choices);
  else if (oldMode === "paused") {
    game.mode = pauseMode;
    pause();
  } else if (oldMode === "rescue") showRescue();
  else if (oldMode === "win" || oldMode === "dead") end(oldMode === "win");
  else overlay.innerHTML = "";
  canvas.focus();
}
var settingsReturn = null;
function openSettings() {
  if (["help", "settings", "revive", "wardrobe", "rescue", "choice", "dead", "win"].includes(game.mode) || document.body.classList.contains("mobile-panel-open")) return;
  voice.stop();
  bossVoice.stop();
  itemVoice.stop();
  soundMix.stopTone();
  resetTouchInput();
  settingsReturn = { mode: game.mode };
  game.mode = "settings";
  overlay.innerHTML = settingsHTML(prefs);
  const binding = bindSettings(overlay, prefs, (p) => {
    soundMix.setVolume(p.volume);
    renderer.setMaxScale(renderCap(p.quality));
    writePreferences(p, typeof localStorage !== "undefined" ? localStorage : void 0);
  });
  binding.close.onclick = closeSettings;
  binding.close.focus?.({ preventScroll: true });
}
function closeSettings() {
  if (!settingsReturn) return;
  const previous = settingsReturn.mode;
  settingsReturn = null;
  if (previous === "paused") {
    game.mode = pauseMode;
    pause();
  } else if (previous === "title") title();
  else {
    game.mode = previous;
    overlay.innerHTML = "";
    canvas.focus();
  }
}
function codexCount() {
  const p = codexProgress(codex);
  return `${p.items + p.enemies + p.bosses}/${p.itemsTotal + p.enemiesTotal + p.bossesTotal}`;
}
function openCodex() {
  if (codexReturn || ["help", "revive", "wardrobe"].includes(game.mode) || document.body.classList.contains("mobile-panel-open")) return;
  voice.stop();
  bossVoice.stop();
  itemVoice.stop();
  soundMix.stopTone();
  resetTouchInput();
  noteCodex();
  mergeCodex(codex, readCodex());
  const content = document.createDocumentFragment();
  codexReturn = { content, mode: game.mode, oldMode, focus: document.activeElement };
  while (overlay.firstChild) content.append(overlay.firstChild);
  oldMode = game.mode;
  game.mode = "help";
  renderCodex(false);
  $("#codexClose").focus({ preventScroll: true });
}
function closeCodex() {
  if (!codexReturn) return;
  const previous = codexReturn;
  codexReturn = null;
  stopCodexArt?.();
  stopCodexArt = null;
  overlay.replaceChildren(previous.content);
  game.mode = previous.mode;
  oldMode = previous.oldMode;
  resetTouchInput();
  last = performance.now();
  refreshCodexCount();
  (previous.focus?.isConnected && previous.focus !== document.body ? previous.focus : canvas).focus({ preventScroll: true });
}
function renderCodex(keep) {
  const top = keep ? overlay.querySelector(".codex-list")?.scrollTop || 0 : 0;
  const focus = document.activeElement, focusTab = focus?.dataset.codexTab, focusPick = focus?.dataset.codexPick, focusClose = focus?.id === "codexClose";
  stopCodexArt?.();
  overlay.innerHTML = codexHTML(codex, codexState);
  overlay.querySelector(".codex-list").scrollTop = top;
  paintCodexArt(overlay);
  stopCodexArt = whenCodexArt(overlay, () => paintCodexArt(overlay));
  overlay.querySelectorAll("[data-codex-tab]").forEach((b) => b.onclick = () => {
    codexState.tab = b.dataset.codexTab;
    codexState.pick = null;
    renderCodex(false);
    overlay.querySelector('[data-codex-tab][aria-selected="true"]').focus({ preventScroll: true });
  });
  overlay.querySelectorAll("[data-codex-pick]:enabled").forEach((b) => b.onclick = () => {
    codexState.pick = b.dataset.codexPick;
    renderCodex(true);
    overlay.querySelector('[data-codex-pick="' + codexState.pick + '"]').focus({ preventScroll: true });
  });
  $("#codexClose").onclick = closeCodex;
  if (keep) {
    const target2 = focusPick ? overlay.querySelector('[data-codex-pick="' + focusPick + '"]:enabled') : focusTab ? overlay.querySelector('[data-codex-tab="' + focusTab + '"]') : null;
    if (target2 || focusClose) (target2 || $("#codexClose")).focus({ preventScroll: true });
  }
}
function codexKey(e) {
  if (e.key === "Escape") {
    e.preventDefault();
    if (!e.repeat) closeCodex();
    return;
  }
  if (e.key !== "Tab") return;
  const fields = overlay.querySelectorAll("button:enabled"), first = fields[0], last2 = fields[fields.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last2.focus();
  }
  if (!e.shiftKey && document.activeElement === last2) {
    e.preventDefault();
    first.focus();
  }
}
$("#codexOpen").onclick = openCodex;
function showChoices(title2, choices) {
  resetTouchInput();
  if (["shop", "start"].includes(game.room.type)) {
    renderPurchaseDialog(overlay, { game, title: title2, choices, onLeave: () => {
      game.leaveChoice();
      saveCurrentRun();
      overlay.innerHTML = "";
      canvas.focus();
    }, onChoose: (success) => {
      if (success) {
        overlay.innerHTML = "";
        resetTouchInput();
        canvas.focus();
      }
      processEvents();
    } });
    return;
  }
  overlay.innerHTML = `<div class="modal reward-modal" role="dialog" aria-modal="true" aria-labelledby="rewardTitle"><div class="reward-ribbon">\u514D\u8D39\u5956\u52B1 \xB7 \u9009\u4E00\u4EF6\u5E26\u8D70</div><h2 id="rewardTitle">${title2}</h2><p>${game.room.type === "start" ? "\u6309\u6807\u4EF7\u6D88\u8017\u8D44\u6E90\uFF0C\u6BCF\u5C42\u5151\u6362\u6B21\u6570\u6709\u9650\u3002" : "\u9053\u5177\u6548\u679C\u53EF\u4EE5\u53E0\u52A0\uFF1B\u5546\u5E97\u8865\u7ED9\u8D2D\u4E70\u540E\u7ACB\u5373\u751F\u6548\u3002"}</p><div class="choice-list">${choices.map((i) => `<button class="choice" data-item="${i.id}">${itemIcon(i)}<strong>${i.name}</strong><small>${i.desc}</small></button>`).join("")}</div><button class="secondary" id="leaveChoice">\u6682\u65F6\u4E0D\u62FF / \u79BB\u5F00</button></div>`;
  $("#leaveChoice").onclick = () => {
    game.leaveChoice();
    saveCurrentRun();
    overlay.innerHTML = "";
    canvas.focus();
  };
  overlay.querySelectorAll("[data-item]").forEach((b) => b.onclick = () => {
    if (game.choose(b.dataset.item)) {
      overlay.innerHTML = "";
      mouse.down = false;
      keys.clear();
      canvas.focus();
    }
    processEvents();
  });
}
function end(win) {
  saveCurrentRun();
  revivePlayer.stop();
  voice.stop();
  bossVoice.stop();
  itemVoice.stop();
  soundMix.stopTone();
  resetTouchInput();
  best = Math.max(best, bossDemo || sandbox.active ? 0 : game.kills);
  if (!sandbox.active) try {
    localStorage.setItem("naiwa-best", String(best));
  } catch {
  }
  const min = Math.floor(game.elapsed / 60), sec = Math.floor(game.elapsed % 60).toString().padStart(2, "0");
  const revive = !win && !sandbox.active && canRevive(game), summary = `<dl class="run-summary"><div><dt>\u8D76\u8D70\u5C0F\u602A</dt><dd>${game.kills}</dd></div><div><dt>\u6536\u96C6\u9053\u5177</dt><dd>${game.items.length}</dd></div><div><dt>\u7528\u65F6</dt><dd>${min}:${sec}</dd></div><div><dt>\u6700\u4F73\u8BB0\u5F55</dt><dd>${sandbox.active ? "\u6C99\u76D2\u4E0D\u8BA1" : best + " \u53EA"}</dd></div></dl>`, heading = `<div class="mini">${win ? "A VERY HAPPY ENDING" : "EVERY FROG GETS ANOTHER CHANCE"}</div><h2 id="endTitle">${win ? "\u5976\u8C46\uFF0C\u6211\u4EEC\u56DE\u5BB6\uFF01" : "\u5976\u86D9\u5148\u8EBA\u4E00\u4F1A\u513F"}</h2><p>${win ? "\u725B\u6765\u4E0E\u7F8E\u9F20\u5012\u4E0B\u4E86\u3002\u8C46\u5305\u62B1\u4F4F\u5976\u8C46\uFF0C\u4E00\u5BB6\u4EBA\u7EC8\u4E8E\u56E2\u805A\u3002" : "\u6CA1\u5173\u7CFB\uFF0C\u4E0B\u4E00\u5C40\u53C8\u662F\u4E00\u53EA\u597D\u86D9\u3002"}</p>`;
  overlay.innerHTML = `<div class="modal end-modal ${win ? "rescue-ending" : "defeat-modal"}" role="dialog" aria-modal="true" aria-labelledby="endTitle"><div class="end-story">${win ? '<canvas id="rescueScene" width="640" height="260" aria-label="\u4E00\u5BB6\u56E2\u805A"></canvas>' : frogSVG + heading + summary}</div><div class="end-actions">${win ? heading + summary : ""}${revive ? '<button class="death-revive" id="watchRevive"><span>\u770B\u5976\u9F99\u5927\u7B11 10 \u79D2 \xB7 \u534A\u8840\u590D\u6D3B</span><small>\u6BCF\u5C40\u4EC5\u4E00\u6B21 \xB7 \u770B\u5B8C\u53EF\u590D\u6D3B</small></button>' : !win ? '<p class="death-revive-note">\u672C\u5C40\u590D\u6D3B\u673A\u4F1A\u5DF2\u4F7F\u7528</p>' : ""}<button class="${revive ? "end-secondary" : "primary"}" id="again">${sandbox.active ? "\u518D\u5F00\u4E00\u5C40\u6C99\u76D2 \u2192" : revive ? "\u653E\u5F03\u590D\u6D3B\uFF0C\u518D\u8DF3\u4E00\u6B21" : "\u518D\u8DF3\u4E00\u6B21 \u2192"}</button>${sandbox.active ? '<button class="end-secondary" id="sandboxEndExit">\u9000\u51FA\u6C99\u76D2\uFF0C\u8FD4\u56DE\u5C01\u9762</button>' : ""}${creatorLinks()}</div></div>`;
  bindCreatorLinks(overlay);
  $("#again").onclick = sandbox.active ? startSandboxRun : start;
  if ($("#sandboxEndExit")) $("#sandboxEndExit").onclick = saveAndTitle;
  if ($("#watchRevive")) $("#watchRevive").onclick = () => {
    voice.stop();
    bossVoice.stop();
    itemVoice.stop();
    soundMix.stopTone();
    resetTouchInput();
    revivePlayer.open();
  };
  beep(win ? 850 : 180, 0.4, "triangle");
}
var heartPath = "M1 0h2v1H1zM6 0h2v1H6zM0 1h4v1H0zM5 1h4v1H5zM0 2h9v2H0zM1 4h7v1H1zM2 5h5v1H2zM3 6h3v1H3zM4 7h1v1H4z";
var heartIcon = (full) => `<svg class="heart${full ? "" : " empty"}" viewBox="0 0 9 8" aria-hidden="true"><path d="${heartPath}"/>${full ? '<path class="heart-shine" d="M1 1h2v1H1zM1 2h1v1H1z"/>' : ""}</svg>`;
var heartsKey = "";
var heartsHp = null;
function renderHearts(p) {
  const el = $("#hearts"), many = p.maxHp > (mobileMedia.matches ? 6 : 12), key = `${p.hp}/${p.maxHp}/${many}`;
  if (key !== heartsKey) {
    el.innerHTML = many ? heartIcon(true) + `<span class="heart-count">${p.hp} / ${p.maxHp}</span>` : Array.from({ length: p.maxHp }, (_, i) => heartIcon(i < p.hp)).join("");
    if (heartsHp !== null && p.hp < heartsHp) el.dataset.hit = el.dataset.hit === "a" ? "b" : "a";
    heartsKey = key;
    heartsHp = p.hp;
  }
  el.dataset.low = String(p.hp <= 2);
}
function prefetchBossArt() {
  if (!bossArtDue(game.rooms, game.roomId, game.room?.type)) return;
  prepareBossArt(game.floor);
}
function updateUI() {
  prepareChapterArt(game.floor);
  prefetchBossArt();
  const p = game.p;
  renderHearts(p);
  $("#hearts").setAttribute("aria-label", `\u751F\u547D ${p.hp} / ${p.maxHp}`);
  $("#floor").textContent = `0${game.floor} / ${CHAPTERS[game.floor - 1]}`;
  const names3 = { start: "\u8C46\u5305\u7684\u63A5\u5E94\u70B9", fight: "\u8FFD\u8E2A\u7EBF\u7D22", treasure: "\u9053\u5177\u623F", shop: "\u8865\u7ED9\u5546\u5E97", vault: "\u94A5\u5319\u8865\u7ED9\u5E93", cache: "\u5C01\u5899\u85CF\u5BA4", challenge: "\u6311\u6218\u623F", boss: BOSS_NAMES[game.floor - 1] };
  $("#room").textContent = (game.room.encounterName || names3[game.room.type]) + (game.room.layoutName ? " / " + game.room.layoutName : "") + " \xB7 " + (game.room.clear ? "\u95E8\u5DF2\u6253\u5F00" : "\u6E05\u7A7A\u5C0F\u602A\u540E\u5F00\u95E8");
  $("#killcount").textContent = String(game.kills).padStart(2, "0");
  $("#explored").textContent = game.rooms.filter((r) => r.visited).length + " / " + game.rooms.filter((r) => r.exists).length;
  $("#map").innerHTML = game.rooms.map((r) => '<div class="map-cell ' + (!r.exists || !r.seen || r.hidden && !r.revealed && !r.visited ? "fog " : (r.visited ? "visited " : "seen ") + "t-" + r.type + " ") + (r.id === game.roomId ? "here" : "") + '" title="' + (r.seen && r.exists && (!r.hidden || r.revealed || r.visited) ? r.encounterName || names3[r.type] : "\u672A\u77E5") + '">' + (!r.exists || !r.seen || r.hidden && !r.revealed && !r.visited ? "" : r.id === game.roomId ? "\u25CF" : r.type === "treasure" ? "\u2727" : r.type === "shop" ? "\xA4" : r.type === "vault" ? "\u26BF" : r.type === "cache" ? "\u2739" : r.type === "boss" ? "\u265B" : r.type === "challenge" ? "!" : "\xB7") + "</div>").join("");
  updateMiniMap();
  updateStats(game);
  $("#itemcount").textContent = game.items.length + " \u4EF6";
  $("#inventory").innerHTML = game.items.length ? game.items.map((id) => {
    const i = ITEMS.find((i2) => i2.id === id);
    return `<div class="item-row"><div class="item-icon">${itemIcon(i)}</div><div><strong>${i.name}</strong><small>${i.short}</small></div></div>`;
  }).join("") : '<div class="empty-bag">\u2727<p>\u73B0\u5728\u8FD8\u662F\u4E00\u53EA\u666E\u901A\u5976\u86D9\u3002<br>\u53BB\u627E\u5230\u4F60\u7684\u7B2C\u4E00\u4EF6\u602A\u4E1C\u897F\u3002</p></div>';
}
function playLaugh(options) {
  return playPlayerLaugh({ voice, bossVoice, itemVoice }, options);
}
function pressRescue() {
  if (game.rescueLaugh()) {
    playLaugh();
    processEvents();
  }
}
function showRescue() {
  clearTimeout(toastTimer);
  $("#toast").classList.remove("show");
  resetTouchInput();
  renderRescueUI(overlay, game, { onPress: pressRescue, onPause: pause, onSound: toggleSound, sound });
  canvas.focus();
}
function toggleSound() {
  sound = !sound;
  setGameSound(sound, { voice, bossVoice, itemVoice, soundMix }, game.mode === "revive");
  try {
    localStorage.setItem("naiwa-sound", String(sound));
  } catch {
  }
  syncSound();
}
function syncSound() {
  for (const id of ["sound", "rescueSound"]) {
    const b = $("#" + id);
    if (b) b.textContent = "\u58F0\u97F3 " + (sound ? "\u5F00" : "\u5173");
  }
}
function processEvents() {
  let saveNeeded = false;
  soundMix.beginFrame();
  const changedRoom = syncRoomVoices(game.room), itemCues = [];
  for (const e of game.events.splice(0)) {
    if (e.type === "clear" || e.type === "room" && e.room) observeCodex(e.room, []);
    if (e.type === "choice") observeCodex(game.room, e.choices);
    if (["room", "item", "hurt", "shield", "heal", "clear", "end", "rescue", "choice"].includes(e.type)) saveNeeded = true;
    if (e.type === "bossVoice" && game.mode === "play") {
      requestBossCue({ voice, bossVoice, itemVoice }, e);
    }
    if (e.type === "itemVoice" && game.mode === "play") itemCues.push(e.key);
    if (e.type === "sandyStart") {
      shake = 2;
      beep(85, 0.35, "sine", 0.025, 3);
    }
    if (e.type === "sandyEnd") beep(260, 0.22, "triangle", 0.025);
    if (e.type === "gojoSplit") beep(760, 0.15, "triangle", 0.02);
    if (e.type === "gojoFuse") beep(390, 0.16, "sine", 0.02, 2);
    if (e.type === "gojoBlast") {
      shake = 4;
      beep(90, 0.2, "triangle", 0.025, 3);
    }
    if (e.type === "room" && changedRoom) itemCues.length = 0;
    if (e.type === "wardrobe") wardrobe.open();
    if (e.type === "rescue") showRescue();
    if (e.type === "cageBreak") playLaugh({ long: true });
    if (e.type === "choice") showChoices(e.title, e.choices);
    if (e.type === "end") end(e.win);
    if (e.type === "toast") toast(e.text);
    if (e.type === "item" || e.type === "choice") codexCheckedAt = 0;
    if (e.type === "item") {
      if (e.id === "phoebe") itemCues.push("phoebe");
      if (e.id === "quietbadge") itemCues.push("quiet");
      const i = ITEMS.find((i2) => i2.id === e.id);
      toast(i.name + " \xB7 " + i.short);
      beep(900, 0.2, "triangle", 0.025, 3);
      $("#frog-note").textContent = "\u201C" + i.name + "\uFF1F\u6709\u70B9\u602A\uFF0C\u518D\u6361\u4E00\u4E2A\uFF01\u201D";
    }
    if (e.type === "hurt") {
      game.heroHurtUntil = game.elapsed + 0.24;
      shake = 5;
      beep(120, 0.18, "sawtooth", 0.025, 5);
    }
    if (e.type === "shoot") {
      game.heroLaughUntil = game.elapsed + 0.22;
      beep(520, 0.045);
    }
    if (e.type === "kill") beep(240, 0.08, "triangle");
    if (e.type === "clear" && game.mode !== "rescue") {
      toast("\u623F\u95F4\u6E05\u7A7A\uFF01\u95E8\u5F00\u4E86\uFF0C\u7EE7\u7EED\u63A2\u7D22\u3002");
      beep(760, 0.15, "triangle", 0.025, 3);
    }
    if (e.type === "dash") beep(360, 0.12, "triangle", 0.025, 2);
    if (e.type === "laugh") {
      playLaugh();
      game.heroLaughUntil = game.elapsed + 0.5;
      beep(150, 0.25, "square", 0.012);
    }
    if (e.type === "heal") beep(1e3, 0.18, "sine", 0.025, 4);
    if (e.type !== "shoot") updateUI();
  }
  if (game.mode === "play") itemVoice.requestMany(itemCues);
  soundMix.endFrame();
  if (saveNeeded) saveCurrentRun();
}
function ellipse(x, y, rx, ry, color, stroke = null, lw = 2) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}
function line(points, color, width = 2) {
  ctx.beginPath();
  points.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p));
  ctx.lineWidth = width;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = color;
  ctx.stroke();
}
function roundRect(x, y, w, h2, r, color, stroke) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h2, r);
  ctx.fillStyle = color;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}
function frog(x, y, size, t, boss = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  const bounce = Math.sin(t * 8) * 1.5;
  ellipse(0, 28, 30, 8, "#24433335");
  ctx.translate(0, bounce);
  const body2 = boss ? "#d9bd67" : "#efd66e", edge = "#485333";
  ellipse(-25, 21, 13, 8, "#7f8b50", edge);
  ellipse(25, 21, 13, 8, "#7f8b50", edge);
  ellipse(-27, 6, 8, 14, body2, edge);
  ellipse(27, 6, 8, 14, body2, edge);
  ellipse(0, 5, 29, 29, body2, edge, 2.2);
  ellipse(0, 16, 20, 14, "#f6e4a1");
  ellipse(-16, -18, 16, 18, body2, edge, 2.2);
  ellipse(16, -18, 16, 18, body2, edge, 2.2);
  ellipse(-16, -18, 12, 13, "#bdcf7c");
  ellipse(16, -18, 12, 13, "#bdcf7c");
  ellipse(-14, -17, 4, 7, "#2c4230");
  ellipse(14, -17, 4, 7, "#2c4230");
  ellipse(-15, -19, 1.3, 2, "#fffbe0");
  ellipse(13, -19, 1.3, 2, "#fffbe0");
  ctx.beginPath();
  ctx.moveTo(-20, 2);
  ctx.quadraticCurveTo(0, 14, 20, 2);
  ctx.quadraticCurveTo(0, 39, -20, 2);
  ctx.fillStyle = "#3c4930";
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-15, 7);
  ctx.quadraticCurveTo(0, 14, 15, 7);
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#fff2c8";
  ctx.stroke();
  ellipse(0, 21, 8, 3, "#cb8f68");
  if (boss || game.has("crown") && size < 1.5) {
    ctx.beginPath();
    ctx.moveTo(-15, -34);
    ctx.lineTo(-20, -52);
    ctx.lineTo(-4, -44);
    ctx.lineTo(3, -58);
    ctx.lineTo(11, -42);
    ctx.lineTo(22, -48);
    ctx.lineTo(17, -33);
    ctx.closePath();
    ctx.fillStyle = "#dfab4e";
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.stroke();
    ellipse(4, -40, 3, 3, "#b86050");
  }
  ctx.restore();
}
function lily(x, y, size = 1, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(size, size);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, 20, 0.15, Math.PI * 2 - 0.35);
  ctx.closePath();
  ctx.fillStyle = "#557c5b";
  ctx.fill();
  line([[0, 0], [-15, -10]], "#6f9268", 1);
  line([[0, 0], [-16, 8]], "#6f9268", 1);
  ctx.restore();
}
function roomDraw(t) {
  const r = game.room;
  drawPixelFloor(ctx, r, game.floor);
  const d = game.doors();
  for (const side of ["left", "right", "top", "bottom"]) {
    if (!d[side]) continue;
    ctx.save();
    ctx.translate(side === "left" ? 35 : side === "right" ? 925 : 480, side === "top" ? 35 : side === "bottom" ? 565 : 300);
    if (side === "left" || side === "right") ctx.rotate(Math.PI / 2);
    roundRect(-49, -25, 98, 50, 10, "#374d37", "#60754e");
    if (r.clear) {
      roundRect(-37, -27, 74, 54, 5, "#d4d7aa");
      line([[-30, -15], [30, -15]], "#a9b381", 2);
      line([[-30, 0], [30, 0]], "#a9b381", 2);
      line([[-30, 15], [30, 15]], "#a9b381", 2);
      ellipse(0, 0, 4, 4, "#ecedc3");
    } else {
      roundRect(-37, -18, 74, 36, 3, "#7b8260");
      for (let i = -24; i <= 24; i += 16) line([[i, -17], [i, 17]], "#4e6547", 5);
      ellipse(0, 0, 8, 9, "#d1bd71", "#5f6545");
    }
    ctx.restore();
  }
  drawTerrain(ctx, r, game.floor);
  drawRoomWardrobe(ctx, game);
  if (r.type === "start") {
    ctx.textAlign = "center";
    ctx.fillStyle = "#617455";
    ctx.font = "600 17px system-ui";
    ctx.fillText("\u8C46 \u5305 \u63A5 \u5E94 \u70B9", 480, 190);
    ctx.font = "12px system-ui";
    ctx.fillText("E \u56DE\u6536\u8D44\u6E90 \xB7 \u53BB\u95E8\u53E3\u5F00\u59CB\u5192\u9669", 480, 410);
    lily(480, 300, 2, 0.13);
  }
  if (r.type === "treasure") {
    ellipse(480, 300, 68, 30, "#9aa977");
    lily(480, 300, 2.3);
    ctx.textAlign = "center";
    ctx.font = "30px serif";
    ctx.fillStyle = "#eee6ad";
    ctx.fillText("\u2727", 480, 310);
  }
  if (game.pickup) {
    const q = game.pickup;
    if (q.type === "heart") {
      ellipse(q.x, q.y + 16, 15, 5, "#50674425");
      ctx.font = "bold 31px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#ec9984";
      ctx.strokeStyle = "#af6e62";
      ctx.lineWidth = 2;
      ctx.strokeText("\u2665", q.x, q.y + 7 + Math.sin(t * 4) * 4);
      ctx.fillText("\u2665", q.x, q.y + 7 + Math.sin(t * 4) * 4);
    } else {
      ellipse(q.x, q.y, 64 + Math.sin(t * 3) * 3, 35, "#729b78");
      lily(q.x, q.y, 2.4);
      ctx.fillStyle = "#f0edb6";
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("\u2193 \u4E0B\u4E00\u5C42", q.x, q.y + 5);
    }
  }
}
function enemy(e, t) {
  if (e.dead && t - (e.deadAt ?? 0) > 0.65) return;
  ctx.save();
  if (e.hit > 0) ctx.globalAlpha = 0.65;
  drawPixelEnemy(ctx, e, t);
  if (!e.dead && e.echoUntil > game.elapsed) {
    pixelRing(ctx, e.x - 27, enemyIndicatorY(e) - 9, 5, "#294d79", 3);
    pixelRing(ctx, e.x - 27, enemyIndicatorY(e) - 9, 8, "#86cdec", 2);
  }
  if (!e.dead && e.poison > 0) {
    ctx.fillStyle = "#b8e877";
    ctx.fillRect(e.x - 3, enemyIndicatorY(e) - 8, 6, 6);
  }
  if (!e.dead && e.type !== "boss" && e.hp < e.maxHp) {
    ctx.fillStyle = "#303a42";
    ctx.fillRect(e.x - 18, enemyIndicatorY(e), 36, 5);
    ctx.fillStyle = "#f5cb89";
    ctx.fillRect(e.x - 17, enemyIndicatorY(e) + 1, 34 * Math.max(0, e.hp / e.maxHp), 3);
  }
  ctx.restore();
}
function draw(t) {
  renderer.beginFrame();
  ctx.save();
  if (shake > 0) {
    const amount = shake * prefs.shake;
    if (amount > 0) ctx.translate(Math.sin(t * 70) * amount, Math.cos(t * 85) * amount);
    shake *= 0.87;
    if (shake < 0.2) shake = 0;
  }
  roomDraw(t);
  drawCampaign(ctx, game, t);
  for (const e of game.room.enemies) if (!e.dead && e.starMark > 0) {
    ctx.fillStyle = "#f5d877";
    ctx.font = "bold 18px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("\u2606", e.x, enemyIndicatorY(e) - 7);
  }
  for (const b of game.bullets) {
    drawPixelShot(ctx, b, false);
  }
  for (const e of game.room.enemies || []) enemy(e, t);
  const p = game.p;
  drawChrono(ctx, game);
  if (p.dash > 0) {
    for (let i = 1; i < 4; i++) {
      ctx.globalAlpha = 0.16 / i;
      drawHero(ctx, game, p.x - p.dx * i * 19, p.y - p.dy * i * 19, 1, true);
    }
    ctx.globalAlpha = 1;
  }
  if (sandyActive(game) || p.inv <= 0 || Math.floor(t * 14) % 2 === 0) {
    if (!drawHero(ctx, game, p.x, p.y)) frog(p.x, p.y, 1, t);
    if (p.shield) {
      pixelRing(ctx, p.x, p.y, 44, "#bde8cb", 3);
      for (let i = 0; i < 4; i++) {
        const a = t * 1.5 + i * Math.PI / 2;
        ctx.fillStyle = "#fff1b1";
        ctx.fillRect(p.x + Math.cos(a) * 44 - 3, p.y + Math.sin(a) * 44 - 3, 6, 6);
      }
    }
    if (game.has("tadpole")) {
      const px = p.x - 37, py = p.y + 25 + Math.sin(t * 5) * 5;
      line([[px, py], [px - 15, py + 8], [px - 25, py + Math.sin(t * 10) * 8]], "#4a7264", 5);
      ellipse(px, py, 10, 12, "#749e88", "#4e7765");
      ellipse(px + 3, py - 3, 3, 4, "#e8efc7");
    }
  }
  drawItemReadiness(ctx, game);
  drawLaughReady(ctx, game, reducedMotion.matches);
  for (const e of game.effects) drawPixelEffect(ctx, e);
  for (const v of game.particles) {
    ctx.globalAlpha = Math.min(1, v.life * 3);
    ctx.fillStyle = v.color;
    ctx.fillRect(Math.round(v.x), Math.round(v.y), Math.max(2, Math.round(v.r)), Math.max(2, Math.round(v.r)));
  }
  ctx.globalAlpha = 1;
  for (const b of game.enemyBullets) {
    drawPixelShot(ctx, b, true);
  }
  if (mouse.down && game.mode === "play") {
    const pc = game.p;
    ctx.save();
    ctx.strokeStyle = "#f5f5d733";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 7]);
    ctx.beginPath();
    ctx.moveTo(pc.x, pc.y - 6);
    ctx.lineTo(mouse.x, mouse.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "#f5f5d7cc";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(mouse.x, mouse.y, 6, 0, Math.PI * 2);
    ctx.stroke();
    line([[mouse.x - 11, mouse.y], [mouse.x - 4, mouse.y]], "#f5f5d7cc");
    line([[mouse.x + 4, mouse.y], [mouse.x + 11, mouse.y]], "#f5f5d7cc");
    ctx.restore();
  }
  ctx.restore();
  const bosses = game.room.enemies?.filter((e) => e.type === "boss" && !e.dead) || [];
  const boss = bosses[0];
  $("#bossbar").hidden = !boss;
  if (boss) {
    $("#bossbar span").textContent = BOSS_NAMES[game.floor - 1];
    $("#bossbar i").style.width = Math.max(0, bosses.reduce((s, e) => s + e.hp, 0) / game.room.enemies.filter((e) => e.type === "boss").reduce((s, e) => s + e.maxHp, 0) * 100) + "%";
  }
  $("#dashStatus").textContent = p.dashCD > 0 ? `\u86D9\u8DF3\u51B7\u5374 \xB7 ${p.dashCD.toFixed(1)}s` : "\u7A7A\u683C \xB7 \u86D9\u8DF3\u5C31\u7EEA";
}
function readPadInput() {
  if (!prefs.gamepad || typeof navigator === "undefined" || !navigator.getGamepads) return null;
  return readGamepad(pickGamepad(navigator.getGamepads()));
}
var padPaused = false;
function frame(now) {
  if (now > last) fps += (Math.min(240, 1e3 / (now - last)) - fps) * 0.08;
  const dt = Math.max(0, Math.min((now - last) / 1e3 || 0.016, 0.04));
  last = now;
  duel.check();
  const pad = game.mode === "play" || game.mode === "rescue" ? readPadInput() : null, clampInput = (value) => Math.max(-1, Math.min(1, value));
  if (pad?.pause && !padPaused && game.mode === "play") {
    padPaused = true;
    pause();
    requestAnimationFrame(frame);
    return;
  }
  padPaused = !!pad?.pause;
  const mx = clampInput((keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0) + move.x + (pad?.mx || 0)), my = clampInput((keys.has("s") ? 1 : 0) - (keys.has("w") ? 1 : 0) + move.y + (pad?.my || 0));
  let ax = (keys.has("arrowright") ? 1 : 0) - (keys.has("arrowleft") ? 1 : 0), ay = (keys.has("arrowdown") ? 1 : 0) - (keys.has("arrowup") ? 1 : 0), fire = !!(ax || ay);
  if (pad && (pad.ax || pad.ay)) {
    ax = pad.ax;
    ay = pad.ay;
    fire = true;
  }
  if (mouse.down && !fire) {
    ax = mouse.x - game.p.x;
    ay = mouse.y - game.p.y;
    fire = true;
  }
  const attack = mobileAttack({ held: touchFire, aim: touchAim, playing: game.mode === "play" }), actions = touchActions.take();
  if (!fire && attack.fire) {
    ax = attack.ax;
    ay = attack.ay;
    fire = true;
  }
  const direction = cardinalAim(ax, ay);
  ax = direction.x;
  ay = direction.y;
  fire = fire && !!(ax || ay);
  const wasDash = game.p.dash > 0, oldX = game.p.x, oldY = game.p.y;
  game.update(dt, { mx, my, ax, ay, fire, auto: false, dash: keys.has(" ") || actions.dash || !!pad?.dash, bomb: keys.has("b") || actions.bomb || !!pad?.bomb, use: keys.has("e") || actions.use || !!pad?.use, active: keys.has("q") || actions.active || !!pad?.active });
  game.heroMoving = game.mode === "play" && Math.hypot(game.p.x - oldX, game.p.y - oldY) > 0.1;
  if (wasDash && game.p.dash <= 0) game.heroLandUntil = game.elapsed + 0.12;
  processEvents();
  bossVoice.update(game.mode === "play");
  itemVoice.update(game.mode === "play");
  updateStats(game);
  updateLaughReady(game, dt);
  updateTouchStatus();
  $("#resources").textContent = "\u91D1\u5E01 " + game.coins + "\u3000\u94A5\u5319 " + game.keys + "\u3000\u70B8\u5F39 " + game.bombs + "\u3000\u7206\u7B11 " + Math.floor(game.activeCharge) + "/" + game.activeCost();
  if (duel.active) {
    const bb = $("#bossbar");
    if (bb) bb.hidden = true;
  } else draw(game.elapsed);
  if (!duel.active && sandbox.active) drawSandboxOverlay(ctx, game, sandbox, fps);
  updateRescueUI(overlay, game);
  revivePlayer.update();
  if (hasRun && now - lastSaveAt >= 2e3) saveCurrentRun();
  if (now - codexCheckedAt >= 500) {
    codexCheckedAt = now;
    noteCodex();
  }
  requestAnimationFrame(frame);
}
window.addEventListener("keydown", (e) => {
  if (duel.active) return;
  if (game.mode === "settings" && (e.key === "Escape" || e.key === "p" || e.key === "P")) {
    e.preventDefault();
    closeSettings();
    return;
  }
  if (codexReturn) {
    codexKey(e);
    return;
  }
  const k = e.key.toLowerCase();
  if (k === "t" && sandbox.active && !e.ctrlKey && !e.metaKey && !e.altKey && !e.isComposing) {
    e.preventDefault();
    if (!e.repeat) toggleSandboxPanel();
    return;
  }
  if (game.mode === "rescue" && (document.activeElement?.id === "rescueLaugh" || !["BUTTON", "INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) && k !== "p" && k !== "escape") {
    if (e.repeat) {
      if ([" ", "enter"].includes(k)) e.preventDefault();
      return;
    }
    if (isRescueKey(e)) {
      e.preventDefault();
      pressRescue();
      return;
    }
  }
  if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k) && !["BUTTON", "INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) e.preventDefault();
  if ((k === "p" || k === "escape") && !e.repeat) pause();
  keys.add(k);
});
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener("blur", () => {
  voice.stop();
  bossVoice.stop();
  itemVoice.stop();
  soundMix.stopTone();
  resetTouchInput();
  if (["play", "rescue"].includes(game.mode)) pause();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    voice.stop();
    bossVoice.stop();
    itemVoice.stop();
    soundMix.stopTone();
    resetTouchInput();
    if (["play", "rescue"].includes(game.mode)) pause();
  }
});
canvas.addEventListener("pointermove", pointMouseAim);
canvas.addEventListener("pointerdown", beginMouseAim);
canvas.addEventListener("pointerup", endMouseAim);
canvas.addEventListener("pointercancel", endMouseAim);
$("#stick").addEventListener("pointerdown", (e) => {
  if (e.button !== 0 || e.pointerType === "touch" || game.mode !== "play") return;
  const r = canvas.getBoundingClientRect();
  if (e.clientX < r.left || e.clientX >= r.right || e.clientY < r.top || e.clientY >= r.bottom) return;
  e.stopImmediatePropagation();
  beginMouseAim(e);
}, true);
function pointMouseAim(e) {
  if (e.pointerType === "touch") return;
  const r = virtualRect(canvas), p = toVirtualPoint(e.clientX, e.clientY);
  mouse.x = (p.x - r.left) / r.width * W;
  mouse.y = (p.y - r.top) / r.height * H;
}
function beginMouseAim(e) {
  if (e.button !== 0 || e.pointerType === "touch" || game.mode !== "play") return;
  e.preventDefault();
  pointMouseAim(e);
  mouse.down = true;
  canvas.focus();
  canvas.setPointerCapture(e.pointerId);
}
function endMouseAim(e) {
  if (e.pointerType !== "touch") mouse.down = false;
}
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
$("#pause").onclick = pause;
$("#help").onclick = help;
$("#sound").onclick = toggleSound;
syncSound();
function resetTouchInput() {
  touchResets.forEach((reset) => reset());
  touchActions.clear();
  keys.clear();
  mouse.down = false;
  touchFire = false;
  touchAim = { x: 0, y: 0 };
  move = { x: 0, y: 0 };
}
touchResets.push(bindStickControl($("#stick"), (vector) => {
  move = vector;
  $("#stick span").style.transform = `translate(${vector.x * 32}px,${vector.y * 32}px)`;
}));
touchResets.push(bindAttackStick($("#touchFire"), (vector, held2) => {
  touchFire = held2;
  touchAim = vector;
  $("#touchFire").style.setProperty("--aim-x", `${vector.x * 12}px`);
  $("#touchFire").style.setProperty("--aim-y", `${vector.y * 12}px`);
  $("#touchFire").dataset.direction = vector.x > 0 ? "right" : vector.x < 0 ? "left" : vector.y > 0 ? "down" : vector.y < 0 ? "up" : "none";
}));
for (const [id, action] of [["touchDash", "dash"], ["touchBomb", "bomb"], ["touchUse", "use"], ["touchActive", "active"]]) {
  const button = $("#" + id), press = () => {
    if (button.getAttribute("aria-disabled") === "true") return;
    touchActions.press(action, game.mode === "play");
  };
  touchResets.push(bindHoldControl(button, press, () => {
  }));
  button.addEventListener("click", (e) => {
    if (e.detail === 0) press();
  });
}
function updateMiniMap() {
  const mini = $("#mobileMiniMap");
  if (!mini) return;
  mini.innerHTML = game.rooms.map((r) => {
    const hidden = !r.exists || !r.seen || r.hidden && !r.revealed && !r.visited;
    return `<i class="${hidden ? "fog" : r.id === game.roomId ? "here" : r.type === "boss" ? "boss" : r.type === "treasure" ? "treasure" : ""}"></i>`;
  }).join("");
}
function updateTouchStatus() {
  for (const key of ["coins", "keys", "bombs"]) {
    const el = document.querySelector(`[data-resource="${key}"]`);
    if (el.textContent !== String(game[key])) el.textContent = String(game[key]);
  }
  const playing = game.mode === "play", p = game.p, cost = game.activeCost();
  const status = (id, text, ready2) => {
    const b = $("#" + id), label = b.querySelector("small");
    if (label.textContent !== text) label.textContent = text;
    b.setAttribute("aria-disabled", String(!playing || !ready2));
    b.dataset.ready = String(ready2);
  };
  status("touchDash", p.dashCD > 0 ? `${p.dashCD.toFixed(1)}\u79D2` : "\u5C31\u7EEA", p.dashCD <= 0);
  status("touchActive", game.activeCharge >= cost ? "\u5C31\u7EEA \xB7 \u91CA\u653E" : `${Math.floor(game.activeCharge)}/${cost}`, game.activeCharge >= cost);
  $("#touchActive").dataset.readyFlash = String(playing && laughReadyState(game).flash > 0);
  $("#touchActive").dataset.playing = String(playing);
  status("touchBomb", `${game.bombs} \u679A`, game.bombs > 0);
  const nearby = Math.hypot(p.x - 480, p.y - 260) < 145, place2 = canUseRoomWardrobe(game) ? "\u66F4\u6362\u65F6\u88C5" : nearby && game.room.type === "start" ? "\u8D44\u6E90\u56DE\u6536" : nearby && game.room.type === "shop" ? "\u8865\u7ED9\u5546\u5E97" : game.room.pendingItem ? "\u62FF\u53D6\u9053\u5177" : game.room.loot.some((l) => l.type === "chest" && Math.hypot(l.x - p.x, l.y - p.y) < 70) ? "\u5F00\u542F\u5B9D\u7BB1" : null;
  status("touchUse", place2 || "\u9760\u8FD1\u53EF\u4E92\u52A8", !!place2);
  $("#touchDash").style.setProperty("--cooldown", `${Math.max(0, Math.min(100, (1 - p.dashCD / (game.has("feet") ? 1.3 : 2)) * 100))}%`);
  $("#touchActive").style.setProperty("--charge", `${Math.min(100, game.activeCharge / cost * 100)}%`);
}
canvas.addEventListener("lostpointercapture", () => mouse.down = false);
mobileMedia.addEventListener("change", resetTouchInput);
installFullscreenKeeper({ isMobile: () => touchPointer.matches });
setupMobileUI({ canOpenMap: () => game.mode === "play", suspend: () => {
  if (!["play", "rescue"].includes(game.mode)) return false;
  panelResumeMode = game.mode;
  game.mode = "paused";
  voice.stop();
  bossVoice.stop();
  itemVoice.stop();
  soundMix.stopTone();
  return true;
}, resume: () => {
  if (game.mode === "paused" && panelResumeMode) {
    game.mode = panelResumeMode;
    panelResumeMode = null;
    last = performance.now();
  }
}, resetInput: resetTouchInput, pause: () => {
  if (["play", "rescue"].includes(game.mode)) pause();
}, notify: toast });
setTimeout(releaseArt, 4e3);
title();
updateUI();
requestAnimationFrame(frame);
export {
  game,
  processEvents,
  start
};
