const { useState, useEffect, useMemo, useRef, useCallback } = React;

const Icon = {
  Check: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="20 6 9 17 4 12"/></svg>),
  Pin: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M14 4l6 6-4 1-4 4-1-5-4-1 3-3 4-2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><line x1="10" y1="14" x2="5" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>),
  Flag: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 22V4M4 4h13l-2 4 2 4H4"/></svg>),
  Book: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>),
  Sparkle: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/></svg>),
  Menu: (p) => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>),
  Gear: (p) => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>),
  Trophy: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM17 4h3v2a3 3 0 0 1-3 3M7 4H4v2a3 3 0 0 0 3 3"/></svg>),
  Restart: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 12a9 9 0 1 0 3-6.7"/><polyline points="3 4 3 10 9 10"/></svg>),
  Profile: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>),
  Map: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6z"/><line x1="9" y1="4" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="20"/></svg>),
  Close: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>),
  Expand: (p) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>),
};

const LOGO = (<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><ellipse cx="12" cy="14" rx="7" ry="5"/><ellipse cx="7" cy="8" rx="3" ry="2.4"/><ellipse cx="17" cy="9" rx="2.5" ry="2"/></svg>);

// =========================================================================
// Sources — citation pills rendered beside outcome / retirement narrative.
// =========================================================================
// IDs come from the LLM (filtered server-side against a whitelist). The
// lookup table lives in data.js. Unknown IDs are skipped silently so a
// stale server response never prints broken pills.
function Sources({ ids, compact }) {
  if (!Array.isArray(ids) || ids.length === 0) return null;
  const table = (typeof window !== "undefined" && window.SOURCES_BY_ID) || {};
  const rendered = ids.map((id) => ({ id, meta: table[id] })).filter((x) => x.meta);
  if (rendered.length === 0) return null;
  return (
    <div className={`sources ${compact ? "compact" : ""}`}>
      <span className="sources-lead">Grounded in</span>
      {rendered.map(({ id, meta }) => (
        <a
          key={id}
          className="source-pill"
          href={meta.url}
          target="_blank"
          rel="noopener noreferrer"
          title={`${meta.title} — ${meta.author}${meta.year ? ` (${meta.year})` : ""}`}
        >
          <span className="source-dot" aria-hidden="true" />
          <span className="source-author">{meta.author}</span>
          {meta.year && <span className="source-year">· {meta.year}</span>}
        </a>
      ))}
    </div>
  );
}

// =========================================================================
// Pebble — renders one tree node.
// =========================================================================
// Pebble is a pure render. Interaction (click, drag) happens on the
// tree-node wrapper in Trail so that pan/zoom/drag can coexist cleanly.
function Pebble({ node, selected, frontier }) {
  const isOption = node.type === "MCQ" || node.type === "OPEN";
  const isStart = node.type === "START";
  const isQuestion = node.type === "QUESTION";
  const isOpenQ = node.type === "OPEN_Q";
  const cls = [
    "pebble",
    node.type === "OPEN" ? "path" : "checkpoint",
    isStart ? "start" : "",
    (isQuestion || isOpenQ) ? "question" : "",
    isOpenQ ? "open-q" : "",
    node.state,
    node.ghosted ? "ghosted" : "",
    selected ? "active" : "",
    frontier && node.state === "pending" && !node.ghosted ? "current" : "",
    node.pinned ? "pinned" : "",
  ].filter(Boolean).join(" ");

  const innerGlyph = (() => {
    if (isStart) return window.PROFILE?.initials || "•";
    if (isQuestion) return "?";
    if (isOpenQ) return <Icon.Book />;
    if (node.state === "chosen" && !node.ghosted) return <Icon.Check />;
    if (node.state === "chosen" && node.ghosted) return "●";
    if (node.type === "OPEN" && !node.ghosted) return <Icon.Book />;
    if (node.state === "forgone") return "×";
    return "?";
  })();

  const label = (() => {
    if (isStart) return { t: node.title, s: node.subtitle };
    if (isQuestion) return { t: node.prompt || "Decision", s: `age ${node.age} · question` };
    if (isOpenQ) return { t: node.openQuestion || node.prompt || "Reflect", s: `age ${node.age} · prompt` };
    if (node.type === "MCQ") return { t: node.optionLabel, s: `age ${node.age}` };
    if (node.type === "OPEN") {
      // Once answered, the response text IS the node label. Before that, the
      // parent OPEN_Q carries the question and this slot reads as "pending".
      const answered = node.reflection;
      return {
        t: answered ? `"${node.reflection}"` : "Your response",
        s: `age ${node.age} · ${answered ? "response" : "awaiting"}`,
      };
    }
    return { t: node.title || "", s: node.subtitle || "" };
  })();

  return (
    <div className={cls}>
      {node.pinned && <div className="pin-badge"><Icon.Pin /></div>}
      {node.irl?.status === "done" && !node.pinned && <div className="irl-badge"><Icon.Check /></div>}
      <div className="pebble-body">
        <div className="inner">
          <span>{innerGlyph}</span>
          {!isStart && <span className="age">AGE {node.age}</span>}
        </div>
      </div>
      <div className="pebble-label">
        <div className="title">{label.t}</div>
        <div className="sub">{label.s}</div>
      </div>
    </div>
  );
}

// =========================================================================
// Tree layout (tidy-tree, slot-based)
// =========================================================================
const SLOT_W = 108;
const ROW_H = 128;
const PAD_X = 28;
const PAD_Y = 20;

function computeLayout(pebbles, childrenOf) {
  const byId = Object.fromEntries(pebbles.map((p) => [p.id, p]));
  const rootIds = pebbles.filter((p) => !p.parentId).map((p) => p.id);

  const slotsCache = {};
  const slotsOf = (id) => {
    if (slotsCache[id] != null) return slotsCache[id];
    const kids = (childrenOf[id] || [])
      .map((k) => byId[k])
      .filter(Boolean)
      .sort((a, b) => (a.optionIndex ?? 0) - (b.optionIndex ?? 0));
    if (kids.length === 0) return (slotsCache[id] = 1);
    const sum = kids.reduce((s, k) => s + slotsOf(k.id), 0);
    return (slotsCache[id] = Math.max(1, sum));
  };

  const positions = {};
  const place = (id, depth, leftSlot) => {
    const node = byId[id];
    if (!node) return;
    const kids = (childrenOf[id] || [])
      .map((k) => byId[k])
      .filter(Boolean)
      .sort((a, b) => (a.optionIndex ?? 0) - (b.optionIndex ?? 0));
    if (kids.length === 0) {
      positions[id] = { slot: leftSlot + 0.5, depth };
      return;
    }
    let cur = leftSlot;
    for (const k of kids) {
      place(k.id, depth + 1, cur);
      cur += slotsOf(k.id);
    }
    const first = positions[kids[0].id].slot;
    const last = positions[kids[kids.length - 1].id].slot;
    positions[id] = { slot: (first + last) / 2, depth };
  };

  let cursor = 0;
  for (const r of rootIds) {
    place(r, 0, cursor);
    cursor += slotsOf(r);
  }

  const width = Math.max(1, cursor) * SLOT_W + PAD_X * 2;
  const maxDepth = Math.max(0, ...Object.values(positions).map((p) => p.depth));
  const height = (maxDepth + 1) * ROW_H + PAD_Y * 2 + 80;

  const toPx = (slot) => slot * SLOT_W + PAD_X;
  const toY = (depth) => depth * ROW_H + PAD_Y;

  const nodeXY = {};
  for (const id in positions) {
    nodeXY[id] = { x: toPx(positions[id].slot), y: toY(positions[id].depth), depth: positions[id].depth };
  }
  return { nodeXY, width, height };
}

// =========================================================================
// Trail — the whole tree panel
// =========================================================================
function Trail({
  pebbles, childrenOf, selectedId, frontierGroupId, filter, setFilter,
  onPick, onSwap, stages, onOpenRetirement, bootErr, fertilityBand,
  committing, retirementReady, retirementData,
}) {
  const viewportRef = useRef(null);

  // Pan/zoom transform. World→screen = world * scale + (tx, ty).
  const [viewT, setViewT] = useState({ scale: 1, tx: 0, ty: 0 });
  // Per-node user drag offsets in world coords (on top of computed layout).
  const [overrides, setOverrides] = useState({});
  const centeredFrontierRef = useRef(null);
  // Local dismiss for the retirement preview card — re-shows if the
  // underlying run changes (new finalAge / recap).
  const [previewDismissed, setPreviewDismissed] = useState(false);
  const lastPreviewKeyRef = useRef(null);
  const previewKey = `${retirementData?.finalAge ?? ""}|${retirementData?.recap ?? ""}`;
  useEffect(() => {
    if (lastPreviewKeyRef.current !== previewKey) {
      lastPreviewKeyRef.current = previewKey;
      setPreviewDismissed(false);
    }
  }, [previewKey]);

  const visible = useMemo(() => {
    if (filter === "all") return pebbles;
    // "path" filter: live spine only — chosen+!ghosted, pending+!ghosted, START.
    return pebbles.filter((p) =>
      p.type === "START" ||
      (!p.ghosted && (p.state === "chosen" || p.state === "pending"))
    );
  }, [pebbles, filter]);

  const visibleChildrenOf = useMemo(() => {
    const allowed = new Set(visible.map((p) => p.id));
    const m = {};
    visible.forEach((p) => {
      if (!p.parentId || !allowed.has(p.parentId)) return;
      (m[p.parentId] = m[p.parentId] || []).push(p.id);
    });
    return m;
  }, [visible]);

  const { nodeXY: baseXY, width, height } = useMemo(
    () => computeLayout(visible, visibleChildrenOf),
    [visible, visibleChildrenOf],
  );

  // Apply user drag offsets. Edges auto-re-route since they read from this.
  const nodeXY = useMemo(() => {
    const out = {};
    for (const id in baseXY) {
      const base = baseXY[id];
      const ov = overrides[id];
      out[id] = ov ? { ...base, x: base.x + ov.dx, y: base.y + ov.dy } : base;
    }
    return out;
  }, [baseXY, overrides]);

  // Build edges: every non-root visible pebble draws an edge from its parent.
  const edges = useMemo(() => {
    const list = [];
    for (const p of visible) {
      if (!p.parentId) continue;
      const from = nodeXY[p.parentId];
      const to = nodeXY[p.id];
      if (!from || !to) continue;
      list.push({
        id: p.id,
        from, to,
        state: p.state,
        ghosted: !!p.ghosted,
        isChosenEdge: p.state === "chosen" && !p.ghosted,
      });
    }
    return list;
  }, [visible, nodeXY]);

  const byId = useMemo(() => Object.fromEntries(pebbles.map((p) => [p.id, p])), [pebbles]);

  const counts = useMemo(() => {
    const c = {};
    pebbles.forEach((p) => {
      if (p.type === "START") return;
      if (p.type === "QUESTION" || p.type === "OPEN_Q") {
        c.question = (c.question || 0) + 1;
        return;
      }
      const key = p.ghosted ? "ghosted" : p.state;
      c[key] = (c[key] || 0) + 1;
      if (p.pinned) c.pinned_count = (c.pinned_count || 0) + 1;
    });
    return c;
  }, [pebbles]);

  // Progress follows the CURRENT live spine only — walk root → chosen+!ghosted
  // child at each level. Swaps drop progress back to wherever the newly-live
  // path actually reaches. Ghosted alt-spines are ignored.
  const liveSpine = useMemo(() => {
    const root = pebbles.find((p) => !p.parentId);
    if (!root) return [];
    const spine = [root];
    let curId = root.id;
    // Guard against cycles / runaway loops.
    for (let i = 0; i < pebbles.length + 2; i++) {
      const kids = (childrenOf[curId] || [])
        .map((id) => pebbles.find((p) => p.id === id))
        .filter(Boolean);
      const nextLive = kids.find((k) => k.state === "chosen" && !k.ghosted);
      if (!nextLive) break;
      spine.push(nextLive);
      curId = nextLive.id;
    }
    return spine;
  }, [pebbles, childrenOf]);
  const liveChosen = liveSpine.filter(
    (p) => p.type !== "START" && p.type !== "QUESTION" && p.type !== "OPEN_Q",
  );
  const ageFrom = window.PROFILE?.startAge ?? pebbles[0]?.age ?? 27;
  const ageTo = window.PROFILE?.retirementAge ?? 65;
  const ageHi = liveChosen.length ? liveChosen[liveChosen.length - 1].age : ageFrom;
  const span = Math.max(1, ageTo - ageFrom);
  const rawPct = Math.round(((ageHi - ageFrom) / span) * 100);
  const pct = retirementReady ? 100 : Math.max(0, Math.min(100, rawPct));

  // When the frontier group changes, pan so the group sits in the middle
  // of the viewport. Only fires on actual changes (not on re-renders).
  useEffect(() => {
    if (!frontierGroupId || !viewportRef.current) return;
    if (centeredFrontierRef.current === frontierGroupId) return;
    const targets = visible.filter((p) => p.siblingGroupId === frontierGroupId);
    if (targets.length === 0) return;
    const avgX = targets.reduce((s, p) => s + (nodeXY[p.id]?.x || 0), 0) / targets.length;
    const avgY = targets.reduce((s, p) => s + (nodeXY[p.id]?.y || 0), 0) / targets.length;
    const rect = viewportRef.current.getBoundingClientRect();
    setViewT((prev) => ({
      ...prev,
      tx: rect.width / 2 - avgX * prev.scale,
      ty: Math.max(40, rect.height / 2 - avgY * prev.scale),
    }));
    centeredFrontierRef.current = frontierGroupId;
  }, [frontierGroupId, visible, nodeXY]);

  const handleNodeClick = (id) => {
    const p = byId[id];
    if (!p) return;
    // QUESTION / OPEN_Q are display-only wrappers. Route clicks to an option
    // (MCQ) or response (OPEN) child so the Inspector opens the right view.
    if (p.type === "QUESTION" || p.type === "OPEN_Q") {
      const kids = (childrenOf[id] || []).map((cid) => byId[cid]).filter(Boolean);
      const preferred =
        kids.find((k) => !k.ghosted && k.state === "pending") ||
        kids.find((k) => !k.ghosted && k.state === "chosen") ||
        kids.find((k) => !k.ghosted) ||
        kids[0];
      if (preferred) {
        if (preferred.ghosted || preferred.state === "forgone") onSwap(preferred.id);
        else onPick(preferred.id);
        return;
      }
    }
    if (p.ghosted || p.state === "forgone") onSwap(id);
    else onPick(id);
  };

  // ---------- Pan / zoom / drag handlers ----------
  const panState = useRef(null);
  const dragState = useRef(null);

  const onViewportPointerDown = (e) => {
    if (e.target.closest(".pebble")) return; // node drag handles its own events
    if (e.target.closest(".zoom-controls")) return;
    panState.current = {
      x: e.clientX, y: e.clientY,
      tx: viewT.tx, ty: viewT.ty,
    };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
    e.currentTarget.classList.add("panning");
  };
  const onViewportPointerMove = (e) => {
    const s = panState.current;
    if (!s) return;
    setViewT((prev) => ({ ...prev, tx: s.tx + (e.clientX - s.x), ty: s.ty + (e.clientY - s.y) }));
  };
  const onViewportPointerUp = (e) => {
    panState.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}
    e.currentTarget.classList.remove("panning");
  };

  // Native wheel listener — React's synthetic wheel is passive on some
  // browsers, which would block preventDefault() and let the page scroll.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const handler = (e) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      setViewT((prev) => {
        const newScale = Math.max(0.12, Math.min(2.5, prev.scale * factor));
        const actual = newScale / prev.scale;
        return {
          scale: newScale,
          tx: mx - (mx - prev.tx) * actual,
          ty: my - (my - prev.ty) * actual,
        };
      });
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  const applyZoom = (factor) => {
    if (!viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const cx = rect.width / 2, cy = rect.height / 2;
    setViewT((prev) => {
      const newScale = Math.max(0.12, Math.min(2.5, prev.scale * factor));
      const actual = newScale / prev.scale;
      return {
        scale: newScale,
        tx: cx - (cx - prev.tx) * actual,
        ty: cy - (cy - prev.ty) * actual,
      };
    });
  };
  const resetView = () => {
    if (!viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    setViewT({
      scale: 1,
      tx: rect.width / 2 - width / 2,
      ty: 30,
    });
    setOverrides({});
    centeredFrontierRef.current = null;
  };
  // Compute a scale that shows the whole tree at once + centers it. Used by
  // the "See whole map" button the user asked for — especially useful once
  // the trail has grown beyond one screen.
  const fitToView = () => {
    if (!viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const padX = 48;
    const padY = 48;
    const sx = (rect.width - padX * 2) / Math.max(1, width);
    const sy = (rect.height - padY * 2) / Math.max(1, height);
    const scale = Math.max(0.12, Math.min(1.2, Math.min(sx, sy)));
    setViewT({
      scale,
      tx: rect.width / 2 - (width * scale) / 2,
      ty: rect.height / 2 - (height * scale) / 2,
    });
    setOverrides({});
    centeredFrontierRef.current = null;
  };

  const onNodePointerDown = (id, e) => {
    e.stopPropagation();
    dragState.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      baseDx: overrides[id]?.dx || 0,
      baseDy: overrides[id]?.dy || 0,
      moved: false,
    };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
  };
  const onNodePointerMove = (e) => {
    const s = dragState.current;
    if (!s) return;
    const rawDx = (e.clientX - s.startX) / viewT.scale;
    const rawDy = (e.clientY - s.startY) / viewT.scale;
    const threshold = 4 / viewT.scale;
    if (!s.moved && (Math.abs(rawDx) > threshold || Math.abs(rawDy) > threshold)) s.moved = true;
    if (s.moved) {
      setOverrides((prev) => ({ ...prev, [s.id]: { dx: s.baseDx + rawDx, dy: s.baseDy + rawDy } }));
    }
  };
  const onNodePointerUp = (id, e) => {
    const s = dragState.current;
    dragState.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}
    if (s && !s.moved) handleNodeClick(id);
  };

  const clearOneOverride = (id) => {
    setOverrides((prev) => {
      if (!prev[id]) return prev;
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  };

  return (
    <div className="trail-col">
      <div className="trail-top">
        <div className="progress">
          <span>Progress</span>
          <div className="bar"><span style={{ width: `${pct}%` }} /></div>
          <span className="pct">{pct}%</span>
          <span className="age-range">· age {retirementReady ? (retirementData?.finalAge ?? ageTo) : ageHi} → {ageTo}{retirementReady ? " · retired" : ""}</span>
          {fertilityBand && (
            <span className="fert-pill" title={fertilityBand.clinical_note}>
              fertility: <b>{fertilityBand.label}</b> · {fertilityBand.monthly_probability}
            </span>
          )}
        </div>
        <div className="filter-group">
          <button className={`filter-btn ${filter==="path"?"active":""}`} onClick={() => setFilter("path")}><Icon.Check /> My Path</button>
          <button className={`filter-btn ${filter==="all"?"active":""}`} onClick={() => setFilter("all")}>All Branches</button>
        </div>
      </div>

      <div
        className="trail-viewport"
        ref={viewportRef}
        onPointerDown={onViewportPointerDown}
        onPointerMove={onViewportPointerMove}
        onPointerUp={onViewportPointerUp}
        onPointerCancel={onViewportPointerUp}
      >
        {pebbles.length > 0 && (
          <button
            type="button"
            className="fit-view-btn"
            onClick={fitToView}
            title="See the whole map"
          >
            <Icon.Expand /> Fit map
          </button>
        )}
        {pebbles.length === 0 && !bootErr && (
          <div className="trail-empty">
            <div className="spinner" />
            <div className="t">Generating your world…</div>
            <div className="s">Your first pebble is being drawn from your profile. This usually takes ~8–15s.</div>
          </div>
        )}
        {bootErr && (
          <div className="trail-empty err">
            <div className="t">Couldn't reach the simulator.</div>
            <div className="s">{bootErr}</div>
            <button className="btn sm" onClick={() => window.location.reload()}>Retry</button>
          </div>
        )}

        {pebbles.length > 0 && (
          <div
            className="tree-canvas"
            style={{
              width: `${width}px`,
              height: `${height}px`,
              position: "absolute",
              left: 0, top: 0,
              transform: `translate(${viewT.tx}px, ${viewT.ty}px) scale(${viewT.scale})`,
              transformOrigin: "0 0",
            }}
          >
            <svg
              className="tree-edges"
              width={width}
              height={height}
              style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
            >
              {edges.map((e) => {
                const my = (e.from.y + e.to.y) / 2;
                const d = `M ${e.from.x} ${e.from.y + 44} C ${e.from.x} ${my}, ${e.to.x} ${my}, ${e.to.x} ${e.to.y - 44}`;
                let stroke, dashed, w, opacity;
                if (e.isChosenEdge) {
                  stroke = "var(--chosen)"; dashed = false; w = 4; opacity = 0.85;
                } else if (e.ghosted && e.state === "chosen") {
                  stroke = "var(--forgone)"; dashed = false; w = 3; opacity = 0.6;
                } else if (e.ghosted) {
                  stroke = "var(--forgone)"; dashed = true; w = 2; opacity = 0.4;
                } else {
                  stroke = "var(--forgone)"; dashed = true; w = 2; opacity = 0.5;
                }
                return (
                  <path
                    key={e.id}
                    d={d}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={w}
                    strokeLinecap="round"
                    strokeDasharray={dashed ? "2 8" : undefined}
                    opacity={opacity}
                  />
                );
              })}
            </svg>

            {visible.map((p) => {
              const pos = nodeXY[p.id];
              if (!pos) return null;
              const hasOverride = !!overrides[p.id];
              return (
                <div
                  key={p.id}
                  className={`tree-node ${hasOverride ? "moved" : ""}`}
                  style={{
                    position: "absolute",
                    left: `${pos.x}px`,
                    top: `${pos.y}px`,
                    transform: "translate(-50%, -50%)",
                  }}
                  onPointerDown={(e) => onNodePointerDown(p.id, e)}
                  onPointerMove={onNodePointerMove}
                  onPointerUp={(e) => onNodePointerUp(p.id, e)}
                  onPointerCancel={(e) => onNodePointerUp(p.id, e)}
                  onDoubleClick={(e) => { e.stopPropagation(); clearOneOverride(p.id); }}
                  title={hasOverride ? "Double-click to snap back to auto-position" : ""}
                >
                  <Pebble
                    node={p}
                    selected={p.id === selectedId}
                    frontier={p.siblingGroupId === frontierGroupId}
                  />
                </div>
              );
            })}
          </div>
        )}

        {pebbles.length > 0 && (
          <div className="zoom-controls" onPointerDown={(e) => e.stopPropagation()}>
            <button onClick={() => applyZoom(1.2)} title="Zoom in">+</button>
            <button onClick={() => applyZoom(1 / 1.2)} title="Zoom out">−</button>
            <div className="zoom-pct">{Math.round(viewT.scale * 100)}%</div>
            <button onClick={resetView} title="Reset view (center tree, clear drags)">⌂</button>
          </div>
        )}

        <div className="pan-hint">scroll to zoom · drag empty space to pan · drag a pebble to move it · double-click to snap back</div>
      </div>

      <Legend counts={counts} />
      {retirementReady && !previewDismissed && (
        <RetirementPreview
          onOpen={onOpenRetirement}
          onDismiss={() => setPreviewDismissed(true)}
          retirementData={retirementData}
        />
      )}
    </div>
  );
}

function Legend({ counts }) {
  const [collapsed, setCollapsed] = useState(true);
  return (
    <div className={`legend ${collapsed?"collapsed":""}`} onClick={collapsed ? () => setCollapsed(false) : undefined}>
      <h5>Pebble States</h5>
      {!collapsed && (
        <button className="legend-toggle" onClick={(e) => { e.stopPropagation(); setCollapsed(true); }}>−</button>
      )}
      <div className="legend-row"><div className="swatch chosen" /><span>Live path</span><span className="count">{counts.chosen || 0}</span></div>
      <div className="legend-row"><div className="swatch ghosted" /><span>Explored, swapped away</span><span className="count">{counts.ghosted || 0}</span></div>
      <div className="legend-row"><div className="swatch forgone" /><span>Unchosen option</span><span className="count">{counts.forgone || 0}</span></div>
      <div className="legend-row"><div className="swatch pending" /><span>Awaiting choice</span><span className="count">{counts.pending || 0}</span></div>
      <div className="legend-row"><div className="swatch question" /><span>Question nodes</span><span className="count">{counts.question || 0}</span></div>
      <div className="legend-row"><div className="swatch pinned" /><span>Pinned</span><span className="count">{counts.pinned_count || 0}</span></div>
    </div>
  );
}

function RetirementPreview({ onOpen, onDismiss, retirementData }) {
  const finalAge = retirementData?.finalAge ?? window.PROFILE?.retirementAge ?? window.RETIREMENT?.finalAge;
  const years = retirementData?.years ?? window.RETIREMENT?.years;
  return (
    <div className="retirement-card">
      <div className="ret-icon"><Icon.Trophy /></div>
      <div className="ret-copy">
        <div className="k">Final chapter preview</div>
        <div className="v">Retirement at {finalAge} <span className="sub">· {years} simulated years</span></div>
      </div>
      <button className="btn sm" onClick={onOpen}>View report →</button>
      {onDismiss && (
        <button
          type="button"
          className="retirement-card-close"
          onClick={onDismiss}
          aria-label="Dismiss retirement preview"
          title="Dismiss"
        >
          <Icon.Close />
        </button>
      )}
    </div>
  );
}

// =========================================================================
// Inspector — works on sibling-group level
// =========================================================================
function Inspector({
  tab, setTab, selected, group, frontierGroupId,
  onCommit, onTogglePin, onPickSibling,
  pinnedView, pebbles, onOpenPeb, onPinnedStatus, onNudge,
  committing, fertilityBand,
  pastRuns, currentRunId, onViewPastRun, onRenameRun, onDeleteRun,
}) {
  const runsCount = Array.isArray(pastRuns) ? pastRuns.length : 0;
  return (
    <div className="inspector">
      <div className="insp-tabs">
        <button className={`insp-tab ${tab==="pebble"?"active":""}`} onClick={() => setTab("pebble")}>Pebble</button>
        <button className={`insp-tab ${tab==="pinned"?"active":""}`} onClick={() => setTab("pinned")}>Pinned <span className="badge">{pinnedView.length}</span></button>
        <button className={`insp-tab ${tab==="path"?"active":""}`} onClick={() => setTab("path")}>My Path</button>
        <button className={`insp-tab ${tab==="runs"?"active":""}`} onClick={() => setTab("runs")}>Runs <span className="badge">{runsCount}</span></button>
      </div>
      <div className="insp-body">
        {tab === "pebble" && (
          <GroupInspector
            selected={selected}
            group={group}
            isFrontier={selected?.siblingGroupId === frontierGroupId}
            onCommit={onCommit}
            onTogglePin={onTogglePin}
            onPickSibling={onPickSibling}
            committing={committing}
            fertilityBand={fertilityBand}
          />
        )}
        {tab === "pinned" && (
          <PinnedView
            items={pinnedView}
            onOpenPeb={onOpenPeb}
            onStatusChange={onPinnedStatus}
            onNudge={onNudge}
          />
        )}
        {tab === "path" && <PathSummary pebbles={pebbles} />}
        {tab === "runs" && (
          <RunsList
            runs={pastRuns || []}
            currentRunId={currentRunId}
            onView={onViewPastRun}
            onRename={onRenameRun}
            onDelete={onDeleteRun}
          />
        )}
      </div>
    </div>
  );
}

function GroupInspector({
  selected, group, isFrontier,
  frontierPebbleId,
  onCommit, onTogglePin, onPickSibling, onGoToFrontier,
  committing, fertilityBand,
}) {
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [reflection, setReflection] = useState("");
  // Edit mode for already-chosen OPEN responses — swaps the read-only
  // reflection block for a textarea so a new response can be submitted.
  // Submitting spawns a sibling response node under the same OPEN_Q; the
  // previous response and everything it led to is preserved (ghosted) and
  // can be revived by clicking it in the tree.
  const [editingResponse, setEditingResponse] = useState(false);

  // Smooth-scroll the outcome block into view whenever an outcome surfaces.
  // Fires on commit (pending → chosen with outcome) AND when the user
  // navigates back to a previously-committed pebble. Tiny delay so React
  // finishes laying out the updated modal first.
  const outcomeRef = useRef(null);
  const scrollScheduled = useRef(null);

  useEffect(() => {
    setSelectedOptionId(null);
    setReflection("");
    setEditingResponse(false);
  }, [selected?.id, selected?.state]);

  if (!selected) return <div style={{color:"var(--text-mute)"}}>Tap a pebble to inspect.</div>;

  if (selected.type === "START") {
    return (
      <div>
        <div className="insp-eyebrow">
          <span className="state-tag chosen"><span className="dot" /> STARTING POINT</span>
          <span className="insp-age">age <b>{selected.age}</b></span>
        </div>
        <h2 className="insp-title">{selected.title}</h2>
        <p className="insp-scene">Your life begins here. Every pebble below is a decision you'll make — and every dotted sibling is a path you didn't take (but can swap to anytime).</p>
      </div>
    );
  }

  const isMCQ = selected.type === "MCQ";
  const isOpen = selected.type === "OPEN";
  const siblings = group || [selected];
  const liveChosen = siblings.find((s) => s.state === "chosen" && !s.ghosted);
  const ghostedChosen = siblings.find((s) => s.state === "chosen" && s.ghosted);
  const chosenInGroup = liveChosen || ghostedChosen;
  const groupResolved = !!chosenInGroup;
  const groupPending = !groupResolved && siblings.every((s) => s.state === "pending" && !s.ghosted);

  // Outcome on display: the live chosen sibling's outcome, or the selected
  // sibling's own cached outcome if it has one (a previously-lived path).
  const outcomePebble = liveChosen || (selected.outcome ? selected : ghostedChosen);

  // When an outcome appears (commit completes or user navigates back to a
  // chosen pebble), smooth-scroll it into view inside the modal. Short
  // delay so React's layout pass catches up before we measure.
  useEffect(() => {
    if (scrollScheduled.current) {
      clearTimeout(scrollScheduled.current);
      scrollScheduled.current = null;
    }
    const headline = outcomePebble?.outcome?.headline;
    if (!headline) return;
    scrollScheduled.current = setTimeout(() => {
      outcomeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      scrollScheduled.current = null;
    }, 120);
    return () => {
      if (scrollScheduled.current) clearTimeout(scrollScheduled.current);
    };
  }, [outcomePebble?.id, outcomePebble?.outcome?.headline]);

  const isGhostSel = !!selected.ghosted;
  const stateTagClass = isGhostSel ? "ghosted" : selected.state;
  const stateLabel = isGhostSel
    ? (selected.state === "chosen" ? "GHOSTED · LIVED" : "GHOSTED · ALTERNATIVE")
    : ({chosen:"CHOSEN", forgone:"FORGONE", pending:"PENDING"}[selected.state] || selected.state.toUpperCase());

  // Edit applies when the live chosen OPEN response is being rewritten.
  // Only the currently-live response can be edited; stale/ghosted ones are
  // revived via click instead.
  const canEditOpen =
    isOpen && !isGhostSel && selected.state === "chosen" && selected === liveChosen;
  const openEditActive = canEditOpen && editingResponse;

  const canCommit =
    (groupPending && (isMCQ ? !!selectedOptionId : reflection.trim().length > 0)) ||
    (openEditActive && reflection.trim().length > 0);

  const handleCommitClick = () => {
    if (isMCQ) {
      const chosen = siblings.find((s) => s.optionId === selectedOptionId);
      if (chosen) onCommit(chosen.id);
    } else {
      onCommit(selected.id, reflection);
      // Don't clear editingResponse locally — the reset fires when selection
      // moves to the newly-created pending sibling.
    }
  };

  return (
    <div>
      <div className="insp-eyebrow">
        <span className={`state-tag ${stateTagClass} ${selected.pinned?"pinned":""}`}>
          <span className="dot" /> {selected.pinned ? "PINNED · " + stateLabel : stateLabel}
        </span>
        <span>{isOpen ? "REFLECTION" : "CHECKPOINT"}</span>
        <span className="insp-age">age <b>{selected.age}</b></span>
      </div>
      <h2 className="insp-title">{selected.prompt || selected.optionLabel}</h2>
      <p className="insp-scene">{selected.scene}</p>

      {/* Swap banner: visible whenever the selected pebble isn't the live
          chosen one in its group. Two flavours: revive a preserved alt-spine,
          or simulate a never-explored option. */}
      {!groupPending && selected !== liveChosen && (isGhostSel || selected.state === "forgone") && (
        <div className="swap-banner">
          <div className="q">
            {isGhostSel
              ? "A path you already explored — preserved exactly as you left it."
              : "A path you didn't take."}
          </div>
          <div className="swap-sub">
            {isGhostSel
              ? "Swap back: this entire subtree returns. Your current live path will ghost out (also preserved)."
              : "Swap to this option: the current path will ghost out and this branch will simulate fresh."}
          </div>
          <button
            className="btn primary sm"
            disabled={committing}
            onClick={() => onCommit(selected.id)}
          >
            {committing ? "Swapping…" : isGhostSel ? "Revive this path →" : "Swap to this path →"}
          </button>
        </div>
      )}

      {isMCQ && (
        <div className="mcq">
          {siblings.map((s, i) => {
            const isLive = s.state === "chosen" && !s.ghosted;
            const isGhost = s.ghosted;
            const isForgone = s.state === "forgone";
            const isSelectedLocal = groupPending && selectedOptionId === s.optionId;
            const isViewed = s.id === selected.id;
            const locked = !groupPending || committing;
            const cls = [
              "choice",
              isLive ? "selected committed" : "",
              isSelectedLocal ? "selected" : "",
              s.optionIsCombined ? "combined" : "",
              isGhost ? "ghosted" : "",
              isForgone && !isGhost ? "forgone" : "",
              isViewed ? "viewed" : "",
            ].filter(Boolean).join(" ");
            return (
              <button
                key={s.id}
                className={cls}
                onClick={() => {
                  if (groupPending && !committing) {
                    setSelectedOptionId(s.optionId);
                  } else {
                    onPickSibling(s.id);
                  }
                }}
                disabled={locked && !onPickSibling}
              >
                <div className="mark">{isLive ? "✓" : isGhost ? "●" : isForgone ? "×" : String.fromCharCode(65+i)}</div>
                <div className="body">
                  <div className="label">{s.optionLabel}</div>
                  {s.optionHint && <div className="hint">{s.optionHint}</div>}
                </div>
                <div className="badges">
                  {s.optionIsCombined && <div className="meta combined">COMBINED</div>}
                  {s.irl?.actionable && <div className="meta irl">IRL</div>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {isOpen && (
        selected.reflection && !openEditActive ? (
          <div className="outcome response-block">
            <div className="outcome-head">
              <h4>Your response</h4>
              {canEditOpen && (
                <button
                  className="btn ghost sm"
                  onClick={() => { setReflection(""); setEditingResponse(true); }}
                  disabled={committing}
                  title="Write a new response — creates a new branch from this prompt"
                >
                  ✎ New response
                </button>
              )}
            </div>
            <p style={{fontStyle:"normal", color:"var(--text)"}}>“{selected.reflection}”</p>
          </div>
        ) : (
          <div className="mcq">
            <div className="choice" style={{display:"block", cursor:"default"}}>
              <div className="label" style={{marginBottom:4}}>{selected.openQuestion || "Write freely…"}</div>
              <div className="hint" style={{marginBottom:8}}>
                {openEditActive
                  ? "Submitting creates a new branch from this prompt. Your previous response stays preserved — click it in the tree to swap back."
                  : "Max 150 chars. Colours your outcomes — doesn't steer the story."}
              </div>
              <textarea
                value={reflection}
                maxLength={150}
                onChange={(e) => setReflection(e.target.value)}
                disabled={(!groupPending && !openEditActive) || committing}
                placeholder="A few sentences. No wrong answers."
                style={{width:"100%", minHeight:80, border:"1px solid var(--border-soft)", borderRadius:8, background:"var(--bg-elev)", padding:10, font:"inherit", fontSize:13, color:"var(--text)", resize:"vertical"}}
              />
              <div className="hint" style={{textAlign:"right", marginTop:4}}>
                {reflection.length}/150
                {openEditActive && (
                  <button
                    className="btn ghost sm"
                    onClick={() => { setReflection(""); setEditingResponse(false); }}
                    disabled={committing}
                    style={{marginLeft:8}}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      )}

      {outcomePebble?.outcome && (
        <div className="outcome" ref={outcomeRef}>
          <div className="outcome-head">
            <h4>Outcome {outcomePebble === liveChosen ? "· reveal" : "· (from a preserved timeline)"}</h4>
            <div className="clamps">
              {outcomePebble.outcome.combined_clamped && (
                <span className="clamp-pill" title="Combined-path realism: strain applied because you tried to do it all">realism · combined</span>
              )}
            </div>
          </div>
          {outcomePebble.outcome.headline && (
            <div className="outcome-headline">{outcomePebble.outcome.headline}</div>
          )}
          {outcomePebble.outcome.narrative && (
            <p className="outcome-narrative">{outcomePebble.outcome.narrative}</p>
          )}
          {outcomePebble.outcome.continuity && (
            <div className="continuity-line">
              <span className="cont-mark">↳</span>
              <em>{outcomePebble.outcome.continuity}</em>
            </div>
          )}
          <Sources ids={outcomePebble.outcome.sources} />
        </div>
      )}

      <div className="insp-actions" style={{padding:0, border:0, marginTop:4}}>
        <button className={`btn pin ${selected.pinned?"active":""}`} onClick={() => onTogglePin(selected.id)}>
          <Icon.Pin /> {selected.pinned ? "Pinned" : "Pin for IRL"}
        </button>
        {(groupPending || openEditActive) && (
          <button
            className="btn primary"
            disabled={!canCommit || committing}
            onClick={handleCommitClick}
          >
            {committing
              ? "Thinking…"
              : isMCQ
                ? "Commit choice →"
                : openEditActive
                  ? "Submit new response →"
                  : "Submit reflection →"}
          </button>
        )}
      </div>

      {/* Next decision — surfaces after an outcome is visible and there's a
          downstream frontier to move on to. Lets the user sit with the
          outcome before advancing instead of auto-jumping. */}
      {outcomePebble?.outcome && frontierPebbleId && frontierPebbleId !== selected.id && onGoToFrontier && (
        <div className="next-decision-row">
          <button
            type="button"
            className="btn primary next-decision-btn"
            onClick={onGoToFrontier}
          >
            Next decision →
          </button>
        </div>
      )}
    </div>
  );
}

function PinnedView({ items, onOpenPeb, onStatusChange, onNudge }) {
  const doneCount = items.filter((it) => it.status === "done").length;
  const pendingCount = items.filter(
    (it) => it.status !== "done" && it.status !== "changed_mind"
  ).length;
  const statusLabel = (s) =>
    s === "done" ? "Done" :
    s === "not_yet" ? "Not yet" :
    s === "changed_mind" ? "Skipped" :
    "Pending";
  return (
    <div>
      <div className="insp-eyebrow">
        <span className="state-tag pinned"><span className="dot" /> PINNED</span>
        <span>{doneCount}/{items.length} completed</span>
      </div>
      <h2 className="insp-title">What you want to act on</h2>
      <p className="insp-scene">Pebbles you flagged to follow through on IRL. Mark each one done once you've acted on it — we'll confirm and nudge you when things are still waiting.</p>
      {items.length > 0 && (
        <div className="pinned-nudge-row">
          <span className="pinned-nudge-sub">
            {pendingCount > 0
              ? `${pendingCount} waiting for you`
              : "You're all caught up."}
          </span>
          <button className="btn sm ghost" onClick={onNudge}>Nudge me now</button>
        </div>
      )}
      <div className="pinned-list">
        {items.map((it) => {
          const isDone = it.status === "done";
          const isSkipped = it.status === "changed_mind";
          return (
            <div className={`pin-item ${isDone ? "is-done" : ""} ${isSkipped ? "is-skipped" : ""}`} key={it.pebbleId}>
              <div className="dot-mini" onClick={() => onOpenPeb(it.pebbleId)}>{it.initial}</div>
              <div className="pin-item-body" onClick={() => onOpenPeb(it.pebbleId)}>
                <div className="t-title">{it.title}</div>
                <div className="t-sub">{it.sub}</div>
              </div>
              <div className="pin-actions">
                <div className={`t-status ${it.status}`}>{statusLabel(it.status)}</div>
                <div className="pin-btns">
                  {!isDone ? (
                    <button
                      className="btn sm primary"
                      onClick={(e) => { e.stopPropagation(); onStatusChange(it.pebbleId, "done"); }}
                    >Mark done</button>
                  ) : (
                    <button
                      className="btn sm ghost"
                      onClick={(e) => { e.stopPropagation(); onStatusChange(it.pebbleId, "not_yet"); }}
                    >Undo</button>
                  )}
                  {!isDone && !isSkipped && (
                    <button
                      className="btn sm ghost"
                      onClick={(e) => { e.stopPropagation(); onStatusChange(it.pebbleId, "changed_mind"); }}
                    >Skip</button>
                  )}
                  {isSkipped && (
                    <button
                      className="btn sm ghost"
                      onClick={(e) => { e.stopPropagation(); onStatusChange(it.pebbleId, "not_yet"); }}
                    >Undo</button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ToastStack({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;
  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind || "info"}`}>
          <div className="toast-body">
            <div className="toast-title">{t.title}</div>
            {t.body && <div className="toast-sub">{t.body}</div>}
          </div>
          <button className="toast-close" onClick={() => onDismiss(t.id)} aria-label="Dismiss">×</button>
        </div>
      ))}
    </div>
  );
}

function PathSummary({ pebbles, onOpenPeb }) {
  const chosen = (pebbles || []).filter(
    (p) =>
      p.state === "chosen" &&
      !p.ghosted &&
      p.type !== "START" &&
      p.type !== "QUESTION" &&
      p.type !== "OPEN_Q",
  );
  const sorted = [...chosen].sort((a, b) => (a.age ?? 0) - (b.age ?? 0));
  const ageLo = sorted[0]?.age ?? window.PROFILE?.startAge ?? 27;
  const ageHi = sorted[sorted.length - 1]?.age ?? ageLo;
  if (sorted.length === 0) {
    return (
      <div>
        <div className="insp-eyebrow">
          <span className="state-tag chosen"><span className="dot" /> DECISION PATH</span>
          <span>0 choices</span>
        </div>
        <h2 className="insp-title">Your path starts with your next choice.</h2>
        <p className="insp-scene">
          Head back to the Life Map and pick an option at the current frontier.
          Every decision you commit will land here — a clean timeline of the
          life you're actually living in this run.
        </p>
      </div>
    );
  }
  return (
    <div>
      <div className="insp-eyebrow">
        <span className="state-tag chosen"><span className="dot" /> DECISION PATH</span>
        <span>{sorted.length} choice{sorted.length === 1 ? "" : "s"} · age {ageLo} → {ageHi}</span>
      </div>
      <h2 className="insp-title">Your path so far</h2>
      <p className="insp-scene">The sequence of choices you're actually on. This is the context we feed forward.</p>
      <div className="pinned-list">
        {sorted.map((p) => (
          <div
            className="pin-item"
            key={p.id}
            style={onOpenPeb ? { cursor: "pointer" } : { cursor: "default" }}
            onClick={onOpenPeb ? () => onOpenPeb(p.id) : undefined}
          >
            <div className="dot-mini" style={{background:"var(--chosen)"}}>{p.age}</div>
            <div>
              <div className="t-title">
                {p.type === "OPEN"
                  ? (p.reflection ? `"${p.reflection}"` : p.openQuestion || p.prompt)
                  : (p.optionLabel || p.prompt)}
              </div>
              <div className="t-sub">
                {p.type === "OPEN"
                  ? (p.openQuestion ? `response · ${p.openQuestion}` : "response")
                  : "checkpoint"}
              </div>
            </div>
            <div className="t-status done">Chosen</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =========================================================================
// Runs — past-run list. Each entry opens its own retirement modal; name is
// editable inline; delete removes both the report and the notes that feed
// the AI. Sorted most-recent first.
// =========================================================================
function RunsList({ runs, currentRunId, onView, onRename, onDelete }) {
  const sorted = useMemo(
    () => [...(runs || [])].sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0)),
    [runs],
  );
  if (sorted.length === 0) {
    return (
      <div>
        <div className="insp-eyebrow">
          <span className="state-tag chosen"><span className="dot" /> PAST RUNS</span>
          <span>0 saved</span>
        </div>
        <h2 className="insp-title">Your library is empty.</h2>
        <p className="insp-scene">
          When you reach retirement in a simulation, the report gets saved here
          — give it a name, jot down what stuck with you, and those notes
          quietly shape how the AI steers your next run.
        </p>
      </div>
    );
  }
  const fmtDate = (ts) => {
    if (!ts) return "";
    try {
      const d = new Date(ts);
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch { return ""; }
  };
  return (
    <div>
      <div className="insp-eyebrow">
        <span className="state-tag chosen"><span className="dot" /> PAST RUNS</span>
        <span>{sorted.length} saved</span>
      </div>
      <h2 className="insp-title">Your retirement reports</h2>
      <p className="insp-scene">Tap a run to reopen its report. Notes you write get fed into future simulations — use them to tell the AI what to try differently.</p>
      <div className="runs-list">
        {sorted.map((r) => {
          const isCurrent = r.id === currentRunId;
          const span =
            r.startAge != null && r.finalAge != null
              ? `age ${r.startAge} → ${r.finalAge}`
              : (r.finalAge != null ? `retired at ${r.finalAge}` : "in progress");
          const notePreview = (r.notes || "").trim();
          return (
            <RunRow
              key={r.id}
              run={r}
              span={span}
              isCurrent={isCurrent}
              notePreview={notePreview}
              dateLabel={fmtDate(r.updatedAt || r.createdAt)}
              onView={onView}
              onRename={onRename}
              onDelete={onDelete}
            />
          );
        })}
      </div>
    </div>
  );
}

function RunRow({ run, span, isCurrent, notePreview, dateLabel, onView, onRename, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(run.name || "");
  const commit = () => {
    setEditing(false);
    const next = draft.trim();
    if (next && next !== run.name) onRename(run.id, next);
    else setDraft(run.name || "");
  };
  return (
    <div className={`run-row ${isCurrent ? "current" : ""}`}>
      <div className="run-main" onClick={() => !editing && onView(run.id)}>
        <div className="run-header">
          {editing ? (
            <input
              className="run-name-input"
              value={draft}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                else if (e.key === "Escape") { setDraft(run.name || ""); setEditing(false); }
              }}
              onClick={(e) => e.stopPropagation()}
              maxLength={100}
            />
          ) : (
            <>
              <span className="run-name">{run.name || "Untitled run"}</span>
              {isCurrent && <span className="run-badge live">current</span>}
              {notePreview && <span className="run-badge notes">notes</span>}
            </>
          )}
        </div>
        <div className="run-meta">{span}{dateLabel ? ` · ${dateLabel}` : ""}{run.decisionCount ? ` · ${run.decisionCount} decisions` : ""}</div>
        {notePreview && <div className="run-notes-preview">“{notePreview.slice(0, 140)}{notePreview.length > 140 ? "…" : ""}”</div>}
      </div>
      <div className="run-actions">
        <button
          className="btn ghost sm"
          onClick={(e) => { e.stopPropagation(); setEditing(true); setDraft(run.name || ""); }}
          title="Rename"
        >✎</button>
        {onDelete && !isCurrent && (
          <button
            className="btn ghost sm danger"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Delete "${run.name || "this run"}"? Notes feeding the AI will also be removed.`)) {
                onDelete(run.id);
              }
            }}
            title="Delete"
          >×</button>
        )}
      </div>
    </div>
  );
}

// =========================================================================
// Retirement modal
// =========================================================================
function RetirementModal({
  visible, data, isPastRun,
  onClose, onBranchFromLast, onRestart, branchAge,
  onRename, onNotesChange, onDelete,
}) {
  // Local drafts so typing stays responsive even while the parent persists.
  // Name commits on blur (with Enter shortcut); notes commit on every keystroke
  // — the parent already throttles by batching through React state.
  const [nameDraft, setNameDraft] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const [savedHint, setSavedHint] = useState(false);
  const savedTimer = useRef(null);

  const runKey = `${data?.id || ""}|${visible ? "v" : "h"}`;
  useEffect(() => {
    setNameDraft(data?.name || "");
    setNotesDraft(data?.notes || "");
    setSavedHint(false);
    return () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
    // runKey covers id + visibility transitions so reopening a run resets
    // the drafts from the latest saved data.
  }, [runKey]);

  const flashSaved = () => {
    setSavedHint(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSavedHint(false), 1400);
  };

  const commitName = () => {
    const next = nameDraft.trim();
    if (!next) { setNameDraft(data?.name || ""); return; }
    if (next !== data?.name && onRename) { onRename(next); flashSaved(); }
  };

  const handleNotesChange = (e) => {
    const v = e.target.value.slice(0, 2000);
    setNotesDraft(v);
    if (onNotesChange) onNotesChange(v);
    flashSaved();
  };

  return (
    <div className={`retirement-modal ${visible?"":"hidden"}`} onClick={onClose}>
      <div className="retirement-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="ret-hero">
          <div className="eyebrow">
            Retirement Report · {data?.profileName || window.PROFILE?.name || ""}
            {isPastRun && <span className="eyebrow-tag"> · saved run</span>}
          </div>
          {onRename ? (
            <input
              className="ret-name-input"
              value={nameDraft}
              maxLength={100}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                else if (e.key === "Escape") { setNameDraft(data?.name || ""); e.currentTarget.blur(); }
              }}
              placeholder="Name this life"
              aria-label="Run name"
            />
          ) : (
            <h1>{data?.name || "The life you lived."}</h1>
          )}
          <div className="years">
            {data?.finalAge != null && `Age ${data.finalAge}`}
            {data?.years != null && ` · ${data.years} simulated years`}
          </div>
        </div>
        <div className="ret-body">
          <div className="ret-recap">“{data?.recap || ""}”</div>
          <Sources ids={data?.sources} compact />

          {Array.isArray(data?.highlights) && data.highlights.length > 0 && (
            <div className="ret-section">
              <h3>Chapters</h3>
              <div className="ret-highlights">
                {data.highlights.map((h, i) => (
                  <div className="highlight" key={`${h.chapter}-${i}`}>
                    <div className="chapter">{h.chapter}</div>
                    <div className="note">{h.note}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {Array.isArray(data?.achievements) && data.achievements.length > 0 && (
            <div className="ret-section">
              <h3>Achievements</h3>
              <div className="ret-ach">
                {data.achievements.map((a) => (
                  <div className="ach" key={a.id}>
                    <div className="icon"><Icon.Trophy /></div>
                    <div>
                      <div className="t">{a.t}</div>
                      {a.s && <div className="s">{a.s}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes — saved per-run and forwarded to the AI on later calls so
              it can bias path selection toward what the user said they'd
              want to try differently. Max 2000 chars; server re-caps. */}
          <div className="ret-section ret-notes">
            <h3>
              Your notes
              <span className="ret-notes-hint">
                These get fed into future simulations to steer your other paths.
                {savedHint && <span className="ret-saved-pill">saved</span>}
              </span>
            </h3>
            <textarea
              className="ret-notes-input"
              value={notesDraft}
              maxLength={2000}
              onChange={handleNotesChange}
              placeholder="What stuck with you? What would you want the AI to try differently next time? e.g. 'don't push the combined path so early', 'I want more space for family', 'explore the startup branch more'."
              disabled={!onNotesChange}
            />
            <div className="ret-notes-meta">{notesDraft.length}/2000</div>
          </div>
        </div>
        <div className="ret-actions">
          <button className="btn ghost" onClick={onClose}>Close</button>
          {isPastRun ? (
            onDelete && (
              <button
                className="btn ghost danger"
                onClick={() => {
                  if (confirm("Delete this run? Notes will stop feeding the AI.")) onDelete();
                }}
              >
                Delete run
              </button>
            )
          ) : (
            <>
              <button
                className="btn"
                onClick={onBranchFromLast}
                disabled={!onBranchFromLast || branchAge == null}
                title={branchAge == null ? "No earlier checkpoint to branch from" : ""}
              >
                {branchAge != null ? `Swap at age ${branchAge}` : "Swap from earlier"}
              </button>
              <button
                className="btn primary"
                onClick={onRestart || (() => window.location.reload())}
              >
                Start a new life →
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// Tweaks
// =========================================================================
function Tweaks({ visible, tweaks, set, onClose, onResetProfile }) {
  // Sound toggle reads from PebbleSounds' own localStorage (it manages its
  // own pref). Local state mirrors so the row re-renders instantly when
  // toggled; the audio helper is the source of truth.
  const [soundOn, setSoundOn] = useState(() => window.PebbleSounds?.isEnabled?.() ?? true);
  if (!visible) return null;
  const Row = ({ label, opts, value, onChange }) => (
    <div className="tweak-row">
      <span className="tw-label">{label}</span>
      <div className="seg">{opts.map(o => <button key={o.v} className={value===o.v?"active":""} onClick={()=>onChange(o.v)}>{o.l}</button>)}</div>
    </div>
  );
  return (
    <div className="tweaks visible">
      <h3><span>Tweaks</span><button className="close" onClick={onClose}>×</button></h3>
      <Row label="theme" value={tweaks.theme} opts={[{l:"light",v:"light"},{l:"dark",v:"dark"}]} onChange={(v)=>set({...tweaks, theme:v})} />
      <Row label="branches" value={tweaks.branches} opts={[{l:"show all",v:"all"},{l:"path only",v:"path"}]} onChange={(v)=>set({...tweaks, branches:v})} />
      <Row label="motion" value={tweaks.motion} opts={[{l:"subtle",v:"subtle"},{l:"lots",v:"lots"},{l:"off",v:"off"}]} onChange={(v)=>set({...tweaks, motion:v})} />
      <Row label="density" value={tweaks.density} opts={[{l:"cozy",v:"cozy"},{l:"compact",v:"compact"}]} onChange={(v)=>set({...tweaks, density:v})} />
      <Row
        label="sound"
        value={soundOn ? "on" : "off"}
        opts={[{ l: "on", v: "on" }, { l: "off", v: "off" }]}
        onChange={(v) => {
          const enabled = v === "on";
          window.PebbleSounds?.setEnabled?.(enabled);
          setSoundOn(enabled);
          if (enabled) window.PebbleSounds?.tap?.();
        }}
      />
      {onResetProfile && (
        <div className="tweak-row tweak-row-action">
          <span className="tw-label">profile</span>
          <button
            className="btn ghost sm danger"
            onClick={() => {
              if (confirm("Reset profile? Your answers from onboarding will be erased and the simulation will restart. Past runs stay saved.")) {
                onResetProfile();
              }
            }}
          >
            Reset & re-onboard
          </button>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// Onboarding — first-run intake form. Collects the fields the ProfileSchema
// requires (age, location, relationship, family, career stage, income) plus
// three optional free-text blocks (career goals, financial context,
// anything-else) that the LLM gets as grounding context. Submits a single
// profile object; persistence + hydration is handled by the parent (app.jsx).
//
// Field + Seg live at module scope deliberately. Defining them inside
// Onboarding makes React see fresh component identities on every render,
// which unmounts the focused input on every keystroke. Hoisting keeps the
// input mounted and focus stable while the user types.
// =========================================================================
function OnbField({ id, label, hint, error, showError, children }) {
  return (
    <div className={`ob-field ${showError && error ? "has-error" : ""}`}>
      <label htmlFor={id} className="ob-label">{label}</label>
      {hint && <div className="ob-hint">{hint}</div>}
      {children}
      {showError && error && <div className="ob-error">{error}</div>}
    </div>
  );
}

function OnbSeg({ id, value, options, onChange }) {
  return (
    <div className="ob-seg" role="radiogroup" id={id}>
      {options.map((o) => (
        <button
          type="button"
          key={o.v}
          role="radio"
          aria-checked={value === o.v}
          className={`ob-seg-btn ${value === o.v ? "active" : ""}`}
          onClick={() => onChange(o.v)}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

function Onboarding({ initial, onSubmit }) {
  const [name, setName] = useState(initial?.name || "");
  const [age, setAge] = useState(initial?.age != null ? String(initial.age) : "");
  const [location, setLocation] = useState(initial?.location || "Singapore");
  const [careerStage, setCareerStage] = useState(initial?.career_stage || "");
  const [careerGoals, setCareerGoals] = useState(initial?.career_goals || "");
  const [relationship, setRelationship] = useState(initial?.relationship_status_preset || "");
  const [relationshipOther, setRelationshipOther] = useState(
    initial?.relationship_status && !["single","dating","partnered","married","separated"].includes(initial.relationship_status)
      ? initial.relationship_status
      : "",
  );
  const [wantsChildren, setWantsChildren] = useState(initial?.wants_children || "");
  const [childTimeline, setChildTimeline] = useState(initial?.child_timeline || "");
  const [incomeBand, setIncomeBand] = useState(initial?.income_band || "");
  const [financialContext, setFinancialContext] = useState(initial?.financial_context || "");
  const [extraContext, setExtraContext] = useState(initial?.extra_context || "");
  const [retirementAge, setRetirementAge] = useState(
    initial?.retirement_age != null ? String(initial.retirement_age) : "65",
  );
  const [submitted, setSubmitted] = useState(false);

  const ageNum = Number.parseInt(age, 10);
  const retirementNum = Number.parseInt(retirementAge, 10);
  const relationshipResolved =
    relationship === "other" ? relationshipOther.trim() : relationship;

  // Field-level errors surface only after the user tries to submit — lets
  // them type freely without a wall of red on first paint.
  const errors = {
    age:
      Number.isFinite(ageNum) && ageNum >= 18 && ageNum <= 45
        ? null
        : "Enter an age between 18 and 45.",
    location: location.trim() ? null : "Where do you live?",
    careerStage: careerStage ? null : "Pick one.",
    relationship: relationshipResolved ? null : "Pick one (or fill 'Other').",
    wantsChildren: wantsChildren ? null : "Pick one.",
    incomeBand: incomeBand ? null : "Pick one.",
    retirementAge:
      Number.isFinite(retirementNum) && retirementNum >= 50 && retirementNum <= 75
        ? null
        : "Between 50 and 75.",
  };
  const hasErrors = Object.values(errors).some((e) => e != null);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (hasErrors) return;
    onSubmit({
      name: name.trim(),
      age: ageNum,
      location: location.trim(),
      relationship_status: relationshipResolved,
      relationship_status_preset: relationship,
      wants_children: wantsChildren,
      child_timeline: childTimeline.trim() || null,
      career_stage: careerStage,
      career_goals: careerGoals.trim() || null,
      income_band: incomeBand,
      financial_context: financialContext.trim() || null,
      extra_context: extraContext.trim() || null,
      retirement_age: retirementNum,
    });
  };

  return (
    <div className="onboarding">
      <div className="onboarding-sheet">
        <div className="ob-hero">
          <div className="ob-brand">
            <span className="ob-logo">{LOGO}</span>
            <strong>PebblePath</strong>
          </div>
          <h1>Tell us who you are — and where you're starting from.</h1>
          <p className="ob-sub">
            Six short sections, about two minutes. Your answers stay on this
            device and shape the crossroads the simulation puts in front of
            you. Free-text boxes are optional — use them when you want the AI
            to know something that isn't on the form.
          </p>
        </div>

        <form className="ob-form" onSubmit={handleSubmit} noValidate>
          <OnbField
            id="ob-name"
            label="What should we call you?"
            hint="Used only for the profile chip and your retirement hero — leave blank for 'You'."
          >
            <input
              id="ob-name"
              type="text"
              className="ob-input"
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe"
            />
          </OnbField>

          {/* --- 1. Age -------------------------------------------------- */}
          <section className="ob-section">
            <div className="ob-section-head">
              <span className="ob-step">1</span>
              <h2>Age</h2>
            </div>
            <div className="ob-grid-2">
              <OnbField id="ob-age" label="Your current age" error={errors.age} showError={submitted} hint="18–45. The simulation runs forward from here.">
                <input
                  id="ob-age"
                  type="number"
                  className="ob-input"
                  value={age}
                  min={18}
                  max={45}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="28"
                />
              </OnbField>
              <OnbField id="ob-location" label="Where you live" error={errors.location} showError={submitted} hint="City or country — grounds scene tone.">
                <input
                  id="ob-location"
                  type="text"
                  className="ob-input"
                  value={location}
                  maxLength={80}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </OnbField>
            </div>
          </section>

          {/* --- 2. Career path + Goals --------------------------------- */}
          <section className="ob-section">
            <div className="ob-section-head">
              <span className="ob-step">2</span>
              <h2>Career path &amp; goals</h2>
            </div>
            <OnbField id="ob-career-stage" label="Career stage" error={errors.careerStage} showError={submitted}>
              <OnbSeg
                id="ob-career-stage"
                value={careerStage}
                onChange={setCareerStage}
                options={[
                  { v: "student", l: "Student" },
                  { v: "early", l: "Early career" },
                  { v: "mid", l: "Mid career" },
                  { v: "senior", l: "Senior" },
                  { v: "not-working", l: "Not working" },
                ]}
              />
            </OnbField>
            <OnbField
              id="ob-career-goals"
              label="What you want from work over the next 5 years"
              hint="Optional. A sentence or two. e.g. 'pivot from engineer to product lead', 'go remote and freelance', 'back to school for a masters'."
            >
              <textarea
                id="ob-career-goals"
                className="ob-textarea"
                value={careerGoals}
                maxLength={500}
                onChange={(e) => setCareerGoals(e.target.value)}
                placeholder="Free text. Shapes the options the simulation puts in front of you."
              />
              <div className="ob-count">{careerGoals.length}/500</div>
            </OnbField>
          </section>

          {/* --- 3. Current relationships -------------------------------- */}
          <section className="ob-section">
            <div className="ob-section-head">
              <span className="ob-step">3</span>
              <h2>Current relationships</h2>
            </div>
            <OnbField id="ob-rel" label="Where are you with partnership?" error={errors.relationship} showError={submitted}>
              <OnbSeg
                id="ob-rel"
                value={relationship}
                onChange={setRelationship}
                options={[
                  { v: "single", l: "Single" },
                  { v: "dating", l: "Dating" },
                  { v: "partnered", l: "Partnered" },
                  { v: "married", l: "Married" },
                  { v: "separated", l: "Separated / divorced" },
                  { v: "other", l: "Other…" },
                ]}
              />
              {relationship === "other" && (
                <input
                  type="text"
                  className="ob-input ob-input-inline"
                  value={relationshipOther}
                  maxLength={60}
                  onChange={(e) => setRelationshipOther(e.target.value)}
                  placeholder="In your own words"
                />
              )}
            </OnbField>
          </section>

          {/* --- 4. Family goals ---------------------------------------- */}
          <section className="ob-section">
            <div className="ob-section-head">
              <span className="ob-step">4</span>
              <h2>Family goals</h2>
            </div>
            <OnbField id="ob-family" label="Do you want children?" error={errors.wantsChildren} showError={submitted}>
              <OnbSeg
                id="ob-family"
                value={wantsChildren}
                onChange={setWantsChildren}
                options={[
                  { v: "yes", l: "Yes" },
                  { v: "maybe", l: "Maybe" },
                  { v: "no", l: "No" },
                ]}
              />
            </OnbField>
            {wantsChildren !== "no" && wantsChildren !== "" && (
              <OnbField
                id="ob-timeline"
                label="Timeline or conditions"
                hint="Optional. e.g. 'within 3 years if the right partner', 'ideally before 35', 'open but not planning'."
              >
                <textarea
                  id="ob-timeline"
                  className="ob-textarea"
                  value={childTimeline}
                  maxLength={500}
                  onChange={(e) => setChildTimeline(e.target.value)}
                />
                <div className="ob-count">{childTimeline.length}/500</div>
              </OnbField>
            )}
          </section>

          {/* --- 5. Current financial data ------------------------------ */}
          <section className="ob-section">
            <div className="ob-section-head">
              <span className="ob-step">5</span>
              <h2>Current financial data</h2>
            </div>
            <OnbField id="ob-income" label="Annual income (SGD)" error={errors.incomeBand} showError={submitted}>
              <OnbSeg
                id="ob-income"
                value={incomeBand}
                onChange={setIncomeBand}
                options={[
                  { v: "under-15k", l: "Under $15k" },
                  { v: "15k-30k", l: "$15k–$30k" },
                  { v: "30k-50k", l: "$30k–$50k" },
                  { v: "50k-80k", l: "$50k–$80k" },
                  { v: "over-80k", l: "$80k+" },
                ]}
              />
            </OnbField>
            <OnbField
              id="ob-fin-context"
              label="Savings, debts, dependents — anything specific"
              hint="Optional. e.g. '$20k saved, $30k student loan, supporting parents $500/mo'."
            >
              <textarea
                id="ob-fin-context"
                className="ob-textarea"
                value={financialContext}
                maxLength={500}
                onChange={(e) => setFinancialContext(e.target.value)}
              />
              <div className="ob-count">{financialContext.length}/500</div>
            </OnbField>
          </section>

          {/* --- 6. Anything else --------------------------------------- */}
          <section className="ob-section">
            <div className="ob-section-head">
              <span className="ob-step">6</span>
              <h2>Anything else we should know</h2>
            </div>
            <OnbField
              id="ob-extra"
              label="Anything that shapes your decisions — health, family obligations, values, constraints"
              hint="Optional. This is where to put things the other boxes don't capture."
            >
              <textarea
                id="ob-extra"
                className="ob-textarea ob-textarea-tall"
                value={extraContext}
                maxLength={1000}
                onChange={(e) => setExtraContext(e.target.value)}
                placeholder="Free text. Everything here is passed to the AI as grounding context."
              />
              <div className="ob-count">{extraContext.length}/1000</div>
            </OnbField>
          </section>

          {/* --- Retirement age (footer setting) ------------------------ */}
          <section className="ob-section ob-section-inline">
            <OnbField id="ob-retire" label="Retirement age" error={errors.retirementAge} showError={submitted} hint="Default 65. The simulation ends here.">
              <input
                id="ob-retire"
                type="number"
                className="ob-input ob-input-narrow"
                value={retirementAge}
                min={50}
                max={75}
                onChange={(e) => setRetirementAge(e.target.value)}
              />
            </OnbField>
          </section>

          <div className="ob-actions">
            {submitted && hasErrors && (
              <div className="ob-error-summary">
                Fix the fields above before we start.
              </div>
            )}
            <button type="submit" className="btn primary ob-submit">
              Start simulation →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =========================================================================
// BottomNav — fixed four-item bottom navigation. Replaces the duplicated
// Pinned pill in the topbar + inspector tabs. Each item switches the main
// section; the pebble inspector is a modal now (PebbleModal) and not a nav
// destination.
// =========================================================================
function BottomNav({ active, onChange, pinnedCount, runsCount }) {
  const items = [
    { key: "map", label: "Life Map", Icon: Icon.Map },
    { key: "path", label: "My Path", Icon: Icon.Check },
    { key: "pinned", label: "Pinned", Icon: Icon.Pin, badge: pinnedCount },
    { key: "runs", label: "Runs", Icon: Icon.Trophy, badge: runsCount },
    { key: "profile", label: "Profile", Icon: Icon.Profile },
  ];
  return (
    <nav className="bottom-nav" role="tablist">
      {items.map((item) => {
        const IconComp = item.Icon;
        const hasBadge = typeof item.badge === "number" && item.badge > 0;
        return (
          <div className="bn-item-wrap" key={item.key}>
            <button
              type="button"
              role="tab"
              aria-selected={active === item.key}
              className={`bn-item ${active === item.key ? "active" : ""}`}
              onClick={() => onChange(item.key)}
            >
              <IconComp />
              <span>{item.label}</span>
            </button>
            {hasBadge && <span className="bn-badge">{item.badge > 99 ? "99+" : item.badge}</span>}
          </div>
        );
      })}
    </nav>
  );
}

// =========================================================================
// PebbleModal — the pebble inspector as a centered modal with blurred
// backdrop. Wraps GroupInspector so all commit / swap / reflection / pin /
// outcome logic stays untouched; only the container changes. ESC + backdrop
// click close the modal.
// =========================================================================
function PebbleModal({
  open, selected, group, frontierGroupId, frontierPebbleId,
  onCommit, onTogglePin, onPickSibling, onGoToFrontier, onClose,
  committing, fertilityBand,
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    // Lock body scroll while modal is open so backdrop clicks don't leak.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Soft whoosh on open.
    window.PebbleSounds?.whoosh?.();
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || !selected) return null;
  return (
    <div className="pebble-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="pebble-modal-card" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="pebble-modal-close"
          onClick={onClose}
          aria-label="Close"
          title="Close (Esc)"
        >
          <Icon.Close />
        </button>
        <GroupInspector
          selected={selected}
          group={group}
          isFrontier={selected?.siblingGroupId === frontierGroupId}
          frontierPebbleId={frontierPebbleId}
          onCommit={onCommit}
          onTogglePin={onTogglePin}
          onPickSibling={onPickSibling}
          onGoToFrontier={onGoToFrontier}
          committing={committing}
          fertilityBand={fertilityBand}
        />
      </div>
    </div>
  );
}

// =========================================================================
// ProfileView — read-only summary of the user's onboarding profile. Phase 2
// turns this into an editable memory panel (Claude-style) with PDF export.
// Renders in the bottom-nav "Profile" section.
// =========================================================================
const CAREER_LABELS = {
  student: "Student",
  early: "Early career",
  mid: "Mid career",
  senior: "Senior",
  "not-working": "Not working",
};
const INCOME_LABELS = {
  "under-15k": "Under $15k / yr",
  "15k-30k": "$15k–$30k / yr",
  "30k-50k": "$30k–$50k / yr",
  "50k-80k": "$50k–$80k / yr",
  "over-80k": "$80k+ / yr",
};
const WANT_LABELS = { yes: "Yes", maybe: "Maybe", no: "No" };

// Segmented-enum picker used throughout ProfileView.
function PvSeg({ value, options, onChange }) {
  return (
    <div className="pv-seg">
      {options.map((o) => (
        <button
          type="button"
          key={o.v}
          className={`pv-seg-btn ${value === o.v ? "active" : ""}`}
          onClick={() => onChange(o.v)}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

const RELATIONSHIP_PRESETS = ["single", "dating", "partnered", "married", "separated"];

// Profile → Markdown, for "Download as Markdown" + to populate the PDF body.
function profileToMarkdown(profile, pastRunsCount) {
  if (!profile) return "";
  const lines = [];
  const name = profile.name?.trim() || "You";
  lines.push(`# PebblePath profile — ${name}`);
  lines.push("");
  lines.push(`_${pastRunsCount || 0} past simulation${pastRunsCount === 1 ? "" : "s"} saved._`);
  lines.push("");
  lines.push(`## Basics`);
  lines.push(`- **Starting age:** ${profile.age}`);
  lines.push(`- **Location:** ${profile.location}`);
  lines.push(`- **Relationship:** ${profile.relationship_status}`);
  lines.push(`- **Career stage:** ${CAREER_LABELS[profile.career_stage] || profile.career_stage}`);
  lines.push(`- **Income:** ${INCOME_LABELS[profile.income_band] || profile.income_band}`);
  lines.push(`- **Wants children:** ${WANT_LABELS[profile.wants_children] || profile.wants_children}`);
  lines.push(`- **Retirement age:** ${profile.retirement_age ?? 65}`);
  lines.push("");
  const ft = [
    ["Career goals", profile.career_goals],
    ["Family timeline", profile.child_timeline],
    ["Financial context", profile.financial_context],
    ["Anything else", profile.extra_context],
  ].filter(([_k, v]) => v && String(v).trim());
  for (const [k, v] of ft) {
    lines.push(`## ${k}`);
    lines.push(`> ${String(v).trim()}`);
    lines.push("");
  }
  lines.push(`---`);
  lines.push(`_Exported from PebblePath on ${new Date().toISOString().slice(0, 10)}._`);
  return lines.join("\n");
}

function downloadBlob(filename, mime, content) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function ProfileView({ profile, pastRunsCount, onChange, onResetProfile, onReplayTutorial }) {
  // Local drafts for free-text fields — avoid firing onChange on every
  // keystroke; commit on blur. Enums commit immediately (a click is a
  // decision). Drafts re-initialise from the parent profile whenever it
  // changes externally (e.g. after re-apply from window hydration).
  const [nameDraft, setNameDraft] = useState(profile?.name || "");
  const [locationDraft, setLocationDraft] = useState(profile?.location || "");
  const [careerGoalsDraft, setCareerGoalsDraft] = useState(profile?.career_goals || "");
  const [childTimelineDraft, setChildTimelineDraft] = useState(profile?.child_timeline || "");
  const [financialDraft, setFinancialDraft] = useState(profile?.financial_context || "");
  const [extraDraft, setExtraDraft] = useState(profile?.extra_context || "");
  const [ageDraft, setAgeDraft] = useState(profile?.age != null ? String(profile.age) : "");
  const [retireDraft, setRetireDraft] = useState(profile?.retirement_age != null ? String(profile.retirement_age) : "65");
  const [relationshipOtherDraft, setRelationshipOtherDraft] = useState(
    profile?.relationship_status && !RELATIONSHIP_PRESETS.includes(profile.relationship_status)
      ? profile.relationship_status
      : "",
  );
  const [showOther, setShowOther] = useState(
    !!profile?.relationship_status && !RELATIONSHIP_PRESETS.includes(profile.relationship_status),
  );
  const [savedHint, setSavedHint] = useState(false);
  const savedTimer = useRef(null);
  const pdfRef = useRef(null);

  // Keep drafts synced when parent profile changes from outside
  // (e.g. when window hydration runs after applyProfileToWindow).
  const profileKey = profile && `${profile.name}|${profile.age}|${profile.location}|${profile.relationship_status}|${profile.career_stage}|${profile.income_band}|${profile.wants_children}|${profile.retirement_age}`;
  useEffect(() => {
    if (!profile) return;
    setNameDraft(profile.name || "");
    setLocationDraft(profile.location || "");
    setCareerGoalsDraft(profile.career_goals || "");
    setChildTimelineDraft(profile.child_timeline || "");
    setFinancialDraft(profile.financial_context || "");
    setExtraDraft(profile.extra_context || "");
    setAgeDraft(String(profile.age ?? ""));
    setRetireDraft(String(profile.retirement_age ?? 65));
    const isOther = profile.relationship_status && !RELATIONSHIP_PRESETS.includes(profile.relationship_status);
    setShowOther(!!isOther);
    setRelationshipOtherDraft(isOther ? profile.relationship_status : "");
  }, [profileKey]);

  const flashSaved = () => {
    setSavedHint(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSavedHint(false), 1200);
  };
  useEffect(() => () => { if (savedTimer.current) clearTimeout(savedTimer.current); }, []);

  if (!profile) {
    return (
      <div className="profile-view">
        <h2>No profile yet</h2>
        <div className="pv-sub">Complete onboarding to see your profile here.</div>
      </div>
    );
  }

  const commit = (patch) => {
    if (!onChange) return;
    // Skip no-op commits so we don't flash "saved" for every blur on
    // an unchanged field.
    let changed = false;
    for (const k of Object.keys(patch)) {
      if ((profile[k] ?? null) !== (patch[k] ?? null)) { changed = true; break; }
    }
    if (!changed) return;
    onChange(patch);
    flashSaved();
  };

  const commitText = (key, value) => {
    const v = (value || "").trim();
    commit({ [key]: v || null });
  };

  const commitName = () => {
    const v = nameDraft.trim();
    commit({ name: v });
  };

  const commitAge = () => {
    const n = parseInt(ageDraft, 10);
    if (Number.isFinite(n) && n >= 18 && n <= 45) {
      commit({ age: n });
    } else {
      setAgeDraft(String(profile.age));
    }
  };

  const commitRetire = () => {
    const n = parseInt(retireDraft, 10);
    if (Number.isFinite(n) && n >= 50 && n <= 75) {
      commit({ retirement_age: n });
    } else {
      setRetireDraft(String(profile.retirement_age ?? 65));
    }
  };

  const currentRelationshipPreset = showOther
    ? "other"
    : (RELATIONSHIP_PRESETS.includes(profile.relationship_status) ? profile.relationship_status : "");

  const handleRelationshipPreset = (v) => {
    if (v === "other") {
      setShowOther(true);
      // Don't commit yet — wait for text. Show the input.
      return;
    }
    setShowOther(false);
    setRelationshipOtherDraft("");
    commit({ relationship_status: v });
  };

  const handleExportMarkdown = () => {
    const md = profileToMarkdown(profile, pastRunsCount);
    const name = (profile.name || "you").toLowerCase().replace(/\s+/g, "-");
    downloadBlob(`pebblepath-profile-${name}.md`, "text/markdown;charset=utf-8", md);
  };

  const handleExportPdf = () => {
    if (!pdfRef.current) return;
    const lib = window.html2pdf;
    if (!lib) {
      alert("PDF engine not ready — check your connection and try again.");
      return;
    }
    const name = (profile.name || "you").toLowerCase().replace(/\s+/g, "-");
    lib()
      .set({
        margin: [16, 16, 16, 16],
        filename: `pebblepath-profile-${name}.pdf`,
        image: { type: "jpeg", quality: 0.95 },
        html2canvas: { scale: 2, backgroundColor: "#ffffff" },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(pdfRef.current)
      .save();
  };

  return (
    <div className="profile-view editable" ref={pdfRef}>
      <div className="pv-header">
        <h2>
          {nameDraft.trim() || "You"}
          {savedHint && <span className="pv-saved">saved</span>}
        </h2>
        <div className="pv-sub">
          Your profile · {pastRunsCount || 0} past run{pastRunsCount === 1 ? "" : "s"} saved.
          Everything here feeds the AI — edit any field and the next simulation will see the new value.
        </div>
      </div>

      <div className="pv-block">
        <h3>Basics</h3>

        <div className="pv-field">
          <label>Name</label>
          <input
            type="text"
            className="pv-input"
            value={nameDraft}
            maxLength={60}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitName}
            placeholder="You"
          />
        </div>

        <div className="pv-field-row">
          <div className="pv-field">
            <label>Starting age</label>
            <input
              type="number"
              className="pv-input pv-input-narrow"
              value={ageDraft}
              min={18}
              max={45}
              onChange={(e) => setAgeDraft(e.target.value)}
              onBlur={commitAge}
            />
          </div>
          <div className="pv-field">
            <label>Retirement age</label>
            <input
              type="number"
              className="pv-input pv-input-narrow"
              value={retireDraft}
              min={50}
              max={75}
              onChange={(e) => setRetireDraft(e.target.value)}
              onBlur={commitRetire}
            />
          </div>
        </div>

        <div className="pv-field">
          <label>Location</label>
          <input
            type="text"
            className="pv-input"
            value={locationDraft}
            maxLength={80}
            onChange={(e) => setLocationDraft(e.target.value)}
            onBlur={() => commitText("location", locationDraft)}
          />
        </div>

        <div className="pv-field">
          <label>Relationship</label>
          <PvSeg
            value={currentRelationshipPreset}
            options={[
              { v: "single", l: "Single" },
              { v: "dating", l: "Dating" },
              { v: "partnered", l: "Partnered" },
              { v: "married", l: "Married" },
              { v: "separated", l: "Separated" },
              { v: "other", l: "Other…" },
            ]}
            onChange={handleRelationshipPreset}
          />
          {showOther && (
            <input
              type="text"
              className="pv-input"
              style={{ marginTop: 6 }}
              value={relationshipOtherDraft}
              maxLength={60}
              onChange={(e) => setRelationshipOtherDraft(e.target.value)}
              onBlur={() => {
                const v = relationshipOtherDraft.trim();
                if (v) commit({ relationship_status: v });
              }}
              placeholder="In your own words"
            />
          )}
        </div>

        <div className="pv-field">
          <label>Career stage</label>
          <PvSeg
            value={profile.career_stage}
            options={[
              { v: "student", l: "Student" },
              { v: "early", l: "Early" },
              { v: "mid", l: "Mid" },
              { v: "senior", l: "Senior" },
              { v: "not-working", l: "Not working" },
            ]}
            onChange={(v) => commit({ career_stage: v })}
          />
        </div>

        <div className="pv-field">
          <label>Annual income band</label>
          <PvSeg
            value={profile.income_band}
            options={[
              { v: "under-15k", l: "Under $15k" },
              { v: "15k-30k", l: "$15k–$30k" },
              { v: "30k-50k", l: "$30k–$50k" },
              { v: "50k-80k", l: "$50k–$80k" },
              { v: "over-80k", l: "$80k+" },
            ]}
            onChange={(v) => commit({ income_band: v })}
          />
        </div>

        <div className="pv-field">
          <label>Wants children</label>
          <PvSeg
            value={profile.wants_children}
            options={[
              { v: "yes", l: "Yes" },
              { v: "maybe", l: "Maybe" },
              { v: "no", l: "No" },
            ]}
            onChange={(v) => commit({ wants_children: v })}
          />
        </div>
      </div>

      <div className="pv-block">
        <h3>Goals &amp; context <span className="pv-hint-inline">— edit these as your thinking evolves</span></h3>

        <div className="pv-field">
          <label>Career goals</label>
          <textarea
            className="pv-textarea"
            value={careerGoalsDraft}
            maxLength={500}
            onChange={(e) => setCareerGoalsDraft(e.target.value)}
            onBlur={() => commitText("career_goals", careerGoalsDraft)}
            placeholder="What you want from work over the next 5 years."
          />
        </div>

        {profile.wants_children !== "no" && (
          <div className="pv-field">
            <label>Family timeline</label>
            <textarea
              className="pv-textarea"
              value={childTimelineDraft}
              maxLength={500}
              onChange={(e) => setChildTimelineDraft(e.target.value)}
              onBlur={() => commitText("child_timeline", childTimelineDraft)}
              placeholder="Timeline, conditions, wishes."
            />
          </div>
        )}

        <div className="pv-field">
          <label>Financial context</label>
          <textarea
            className="pv-textarea"
            value={financialDraft}
            maxLength={500}
            onChange={(e) => setFinancialDraft(e.target.value)}
            onBlur={() => commitText("financial_context", financialDraft)}
            placeholder="Savings, debts, dependents, constraints."
          />
        </div>

        <div className="pv-field">
          <label>Anything else</label>
          <textarea
            className="pv-textarea pv-textarea-tall"
            value={extraDraft}
            maxLength={1000}
            onChange={(e) => setExtraDraft(e.target.value)}
            onBlur={() => commitText("extra_context", extraDraft)}
            placeholder="Values, health, obligations — anything that shapes decisions."
          />
        </div>
      </div>

      <div className="pv-actions">
        <button type="button" className="btn sm" onClick={handleExportPdf}>
          📄 Download PDF
        </button>
        <button type="button" className="btn ghost sm" onClick={handleExportMarkdown}>
          ↓ Download Markdown
        </button>
        {onReplayTutorial && (
          <button type="button" className="btn ghost sm" onClick={onReplayTutorial}>
            ↻ Replay tutorial
          </button>
        )}
        {onResetProfile && (
          <button
            type="button"
            className="btn ghost sm danger"
            onClick={() => {
              if (confirm("Reset profile? Your onboarding answers will be erased and the simulation will restart. Past runs stay saved.")) {
                onResetProfile();
              }
            }}
          >
            Reset &amp; re-onboard
          </button>
        )}
      </div>
    </div>
  );
}

// =========================================================================
// TutorialOverlay — post-onboarding walkthrough. 6 stepper cards explaining
// the core mental model (checkpoint pebble, reflection, branching, report).
// Fires once when a freshly-created profile has no tutorial_seen flag;
// user can replay anytime from Profile → Replay tutorial.
// =========================================================================
const TUTORIAL_STEPS = [
  {
    key: "welcome",
    title: "Welcome to PebblePath.",
    body: "A grounded life-path simulator. From today's age to retirement, you'll walk the crossroads that shape a life — career, family, money, and the real cost of each choice.",
    visual: "welcome",
  },
  {
    key: "checkpoint",
    title: "Every choice is a pebble.",
    body: "Each decision point offers 2–3 distinct paths plus one 'do it all' combined option. Pick one, live with it, and watch the outcome play out in a short written scene.",
    visual: "checkpoint",
  },
  {
    key: "reflection",
    title: "Some moments ask you to reflect.",
    body: "A reflection pebble asks a free-text question — what success means, what you're afraid of giving up. Your answer colours the outcome, but it doesn't steer the story.",
    visual: "reflection",
  },
  {
    key: "branching",
    title: "Every path is preserved.",
    body: "Didn't like where a choice led? Click a dashed sibling to swap. The old path stays saved, greyed out. You can revive it any time — the simulation remembers what you didn't pick.",
    visual: "branch",
  },
  {
    key: "report",
    title: "The retirement report is the payoff.",
    body: "When you retire (or hit 'Retire now'), the simulation writes a reflective report on the life you lived. Name it, annotate it — your notes quietly shape how the AI steers your next run.",
    visual: "trophy",
  },
  {
    key: "ready",
    title: "Your world is waiting.",
    body: "Decisions compound. Take them as you would the real ones — this is practice. When you're ready, we'll start from the first moment of this life.",
    visual: "ready",
  },
];

function TutorialVisual({ kind }) {
  if (kind === "welcome") {
    return (
      <div className="tv tv-welcome">
        <div className="tv-pebble small" />
        <div className="tv-line" />
        <div className="tv-pebble medium" />
        <div className="tv-line" />
        <div className="tv-pebble large" />
      </div>
    );
  }
  if (kind === "checkpoint") {
    return (
      <div className="tv tv-checkpoint">
        <div className="tv-pebble big chosen"><Icon.Check /></div>
        <div className="tv-tag">AGE 28</div>
      </div>
    );
  }
  if (kind === "reflection") {
    return (
      <div className="tv tv-reflection">
        <div className="tv-pebble big reflective"><Icon.Book /></div>
        <div className="tv-speech">
          <span>“what does success look like to you?”</span>
        </div>
      </div>
    );
  }
  if (kind === "branch") {
    return (
      <svg className="tv tv-branch" viewBox="0 0 220 120" fill="none">
        <path d="M 110 10 C 110 40, 50 60, 50 110" stroke="var(--chosen)" strokeWidth="4" strokeLinecap="round" />
        <path d="M 110 10 C 110 40, 170 60, 170 110" stroke="var(--forgone)" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 8" />
        <circle cx="110" cy="10" r="10" fill="var(--chosen)" />
        <circle cx="50" cy="110" r="11" fill="var(--chosen)" />
        <circle cx="170" cy="110" r="10" fill="var(--forgone-soft)" stroke="var(--forgone)" strokeWidth="2" strokeDasharray="2 4" />
      </svg>
    );
  }
  if (kind === "trophy") {
    return (
      <div className="tv tv-trophy">
        <div className="tv-trophy-icon"><Icon.Trophy /></div>
      </div>
    );
  }
  return (
    <div className="tv tv-ready">
      <div className="tv-start-flag"><Icon.Flag /></div>
    </div>
  );
}

function TutorialOverlay({ profile, onComplete }) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState("fwd"); // fwd | back — for slide dir
  const total = TUTORIAL_STEPS.length;
  const current = TUTORIAL_STEPS[step];

  // Keyboard nav: ArrowRight/Enter advance, ArrowLeft goes back, Esc skips.
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowRight" || e.key === "Enter") {
        if (step < total - 1) { setDirection("fwd"); setStep(step + 1); }
        else onComplete();
      } else if (e.key === "ArrowLeft") {
        if (step > 0) { setDirection("back"); setStep(step - 1); }
      } else if (e.key === "Escape") {
        onComplete();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [step, total, onComplete]);

  const firstName = (profile?.name || "").trim().split(/\s+/)[0] || "You";
  const goNext = () => {
    window.PebbleSounds?.tap?.();
    if (step < total - 1) { setDirection("fwd"); setStep(step + 1); }
    else onComplete();
  };
  const goBack = () => {
    window.PebbleSounds?.tap?.();
    if (step > 0) { setDirection("back"); setStep(step - 1); }
  };

  return (
    <div className="tutorial-overlay">
      <div className="tutorial-sheet">
        <div className="tut-topbar">
          <div className="tut-brand">
            <span className="ob-logo">{LOGO}</span>
            <strong>PebblePath</strong>
          </div>
          <button type="button" className="btn ghost sm" onClick={onComplete}>
            Skip →
          </button>
        </div>

        <div
          key={current.key}
          className={`tut-card tut-${direction}`}
        >
          <TutorialVisual kind={current.visual} />
          <h2 className="tut-title">
            {step === 0 && firstName !== "You"
              ? `${firstName}, ${current.title[0].toLowerCase()}${current.title.slice(1)}`
              : current.title}
          </h2>
          <p className="tut-body">{current.body}</p>
        </div>

        <div className="tut-progress">
          {TUTORIAL_STEPS.map((_, i) => (
            <span
              key={i}
              className={`tut-dot ${i === step ? "active" : ""} ${i < step ? "done" : ""}`}
            />
          ))}
        </div>

        <div className="tut-actions">
          <button
            type="button"
            className="btn ghost"
            onClick={goBack}
            disabled={step === 0}
          >
            ← Back
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={goNext}
          >
            {step < total - 1 ? "Next →" : "Start simulation →"}
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Icon, LOGO, Pebble, Trail, Inspector, PathSummary, PinnedView, RunsList, RetirementModal, Tweaks, Onboarding, BottomNav, PebbleModal, ProfileView, TutorialOverlay });
