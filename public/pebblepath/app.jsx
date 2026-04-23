const { useState, useEffect, useMemo, useCallback, useRef } = React;

const DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "branches": "all",
  "motion": "subtle",
  "density": "cozy"
}/*EDITMODE-END*/;

const API_BASE = "/api";

// -------------------------------------------------------------------------
// Session persistence — survives tab reload/close. Bumped on schema change.
// Keyed by profile so a different user on the same browser doesn't hydrate
// the previous user's run.
// -------------------------------------------------------------------------
const STORAGE_KEY = "pebblepath:session:v1";

function profileFingerprint() {
  const p = window.PROFILE_API || {};
  const name = (window.PROFILE && window.PROFILE.name) || "";
  return `${name}|${p.age ?? ""}|${p.location ?? ""}`;
}

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.profileKey !== profileFingerprint()) return null;
    if (!Array.isArray(parsed.pebbles) || parsed.pebbles.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

function clearSession() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

// -------------------------------------------------------------------------
// Profile persistence — captured via the Onboarding flow on first run, then
// mirrored onto window.PROFILE + window.PROFILE_API so downstream rendering
// (and the API payload shape) can read from the same globals it always has.
// The Root gate below blocks the simulation from mounting until a profile
// is present.
// -------------------------------------------------------------------------
const PROFILE_STORAGE_KEY = "pebblepath:profile:v1";

function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    // Required structured fields — if any are missing, treat as no profile
    // (forces re-onboarding rather than trying to repair a broken blob).
    if (
      typeof parsed.age !== "number" ||
      !parsed.location ||
      !parsed.relationship_status ||
      !parsed.wants_children ||
      !parsed.career_stage ||
      !parsed.income_band
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveProfile(profile) {
  try { localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile)); } catch {}
}

function clearProfile() {
  try { localStorage.removeItem(PROFILE_STORAGE_KEY); } catch {}
}

// Derive a 1–2 char initial set from a name. Falls back to "?" when blank
// so the profile chip never renders empty.
function initialsFor(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts.map((s) => s[0].toUpperCase()).join("").slice(0, 2);
}

// Hydrate window.PROFILE (UI-facing superset) + window.PROFILE_API (shape
// ProfileSchema validates). Call once on boot and again if the user
// re-onboards. Side-effecting by design — the rest of the app reads these
// globals directly.
function applyProfileToWindow(profile) {
  if (!profile) {
    window.PROFILE = null;
    window.PROFILE_API = null;
    return;
  }
  const displayName = profile.name && profile.name.trim() ? profile.name.trim() : "You";
  window.PROFILE = {
    name: displayName,
    initials: initialsFor(profile.name),
    age: profile.age,
    startAge: profile.age,
    retirementAge: profile.retirement_age ?? 65,
    location: profile.location,
    relationship: profile.relationship_status,
    wants_children: profile.wants_children,
    career_stage: profile.career_stage,
    income: profile.income_band,
  };
  window.PROFILE_API = {
    age: profile.age,
    location: profile.location,
    relationship_status: profile.relationship_status,
    wants_children: profile.wants_children,
    ...(profile.child_timeline ? { child_timeline: profile.child_timeline } : {}),
    career_stage: profile.career_stage,
    ...(profile.career_goals ? { career_goals: profile.career_goals } : {}),
    income_band: profile.income_band,
    ...(profile.financial_context ? { financial_context: profile.financial_context } : {}),
    ...(profile.extra_context ? { extra_context: profile.extra_context } : {}),
    retirement_age: profile.retirement_age ?? 65,
  };
}

// -------------------------------------------------------------------------
// Past-run persistence — separate storage key from the live session so runs
// survive the restart button (which wipes the live session). Each completed
// run is one entry: the retirement report snapshot + the user's own notes.
// Notes drive the AI's path-steering on later runs.
// -------------------------------------------------------------------------
const RUNS_STORAGE_KEY = "pebblepath:runs:v1";

function loadPastRuns() {
  try {
    const raw = localStorage.getItem(RUNS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePastRuns(runs) {
  try { localStorage.setItem(RUNS_STORAGE_KEY, JSON.stringify(runs)); } catch {}
}

// Condense the stored runs into the payload shape the server expects
// (PastRunNoteSchema). We only forward runs that actually carry notes —
// an empty reflection is noise, not signal. Cap at the 10 most recent.
function pastRunsForAI(runs) {
  if (!Array.isArray(runs) || runs.length === 0) return [];
  const withNotes = runs.filter((r) => r && typeof r.notes === "string" && r.notes.trim().length > 0);
  const recent = withNotes.slice(-10);
  return recent.map((r) => {
    const firstHeadline = (r.highlights || [])
      .map((h) => h && h.note)
      .filter(Boolean)
      .slice(-1)[0];
    return {
      run_name: (r.name || "Untitled run").slice(0, 100),
      notes: r.notes.slice(0, 2000),
      ...(typeof r.finalAge === "number" ? { final_age: r.finalAge } : {}),
      ...(typeof r.decisionCount === "number" ? { decision_count: r.decisionCount } : {}),
      ...(firstHeadline ? { closing_headline: String(firstHeadline).slice(0, 300) } : {}),
    };
  });
}

// -------------------------------------------------------------------------
// Tree model
// -------------------------------------------------------------------------
// An MCQ turn materialises a single QUESTION pebble (carrying scene/prompt)
// as the child of the last-chosen pebble, plus N option pebbles as children
// of that QUESTION. The QUESTION is display-only — it's chosen by default,
// never pending or forgone — so the live-spine walker passes through it.
// An OPEN turn materialises a single pebble under the last-chosen pebble
// (the prompt IS the node label, so no wrapper is needed). A synthetic START
// pebble anchors the root.
// -------------------------------------------------------------------------

function makeId(prefix = "p") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

// Materialise an API payload into sibling pebbles under `parentId`.
// Shared fields (scene, prompt, age, pre_state, pre_history) are copied
// onto each sibling so the inspector can open the decision panel from any
// sibling without extra lookups.
function materialisePebbles({ apiNext, parentId, age, pre_state, pre_history }) {
  if (!apiNext) return [];
  const groupId = makeId("g");
  const shared = {
    parentId: parentId || null,
    siblingGroupId: groupId,
    age,
    months: 0,
    scene: apiNext.scene,
    prompt: apiNext.prompt,
    pre_state,
    pre_history,
    actionableIrl: !!apiNext.actionable_irl,
    actionableIrlSummary: apiNext.actionable_irl_summary || null,
  };

  if (apiNext.type === "MCQ") {
    // One QUESTION pebble holds the scene/prompt; options branch from it.
    // QUESTION is chosen-on-creation because it's passive — it doesn't need
    // a user decision to resolve. The live spine walks straight through it.
    const questionId = makeId("q");
    const question = {
      ...shared,
      siblingGroupId: null,
      id: questionId,
      type: "QUESTION",
      state: "chosen",
      ghosted: false,
    };
    const options = apiNext.options.map((o, i) => ({
      ...shared,
      parentId: questionId,
      siblingGroupId: groupId,
      id: makeId("p"),
      type: "MCQ",
      state: "pending",
      ghosted: false,
      optionId: o.id,
      optionLabel: o.label,
      optionHint: o.consequence_hint,
      optionIsCombined: !!o.is_combined_path,
      optionIndex: i,
      irl: apiNext.actionable_irl && !o.is_combined_path
        ? { actionable: true, status: "not_yet", summary: apiNext.actionable_irl_summary }
        : { actionable: false, status: null },
    }));
    return [question, ...options];
  }
  if (apiNext.type === "OPEN") {
    // OPEN turn = display-only question wrapper (OPEN_Q) + a pending response
    // pebble beneath it. The wrapper is chosen-on-creation so the live spine
    // walks straight through (mirrors QUESTION for MCQ). The response is the
    // pebble the user writes into — and the anchor for every later response
    // sibling created by edits.
    const questionId = makeId("oq");
    const question = {
      ...shared,
      siblingGroupId: null,
      id: questionId,
      type: "OPEN_Q",
      state: "chosen",
      ghosted: false,
      openQuestion: apiNext.open_question,
    };
    const response = {
      ...shared,
      parentId: questionId,
      siblingGroupId: groupId,
      id: makeId("p"),
      type: "OPEN",
      state: "pending",
      ghosted: false,
      openQuestion: apiNext.open_question,
      irl: { actionable: false, status: null },
    };
    return [question, response];
  }
  return [];
}

// Map the API retirement payload → shape consumed by RetirementModal.
function mapRetirement(apiNext, startAge) {
  return {
    finalAge: apiNext.final_age,
    years: apiNext.final_age - startAge,
    recap: apiNext.recap,
    sources: Array.isArray(apiNext.sources) ? apiNext.sources : [],
    highlights: (apiNext.highlights || []).map((h) => ({
      chapter: h.chapter,
      note: h.note,
    })),
    achievements: (apiNext.achievements || []).map((a) => ({
      id: a.id,
      t: a.label,
      s: "earned",
    })),
  };
}

// History entry sent on each subsequent /pebble/choose — carries the previous
// outcome's headline forward so the LLM can reference it in its next
// continuity line.
function historyEntryFor(pebble, openAnswer, outcomeHeadline) {
  const base = {
    type: pebble.type === "MCQ" ? "MCQ" : "OPEN",
    age: pebble.age,
    outcome_headline: outcomeHeadline || null,
  };
  if (pebble.type === "MCQ") return { ...base, user_choice: pebble.optionLabel };
  return { ...base, open_question: pebble.openQuestion || pebble.prompt, user_open_answer: openAnswer };
}

// -------------------------------------------------------------------------

function App() {
  // Pull any saved session BEFORE the first render so lazy initialisers see
  // it. If it's present, the boot effect will skip the /api/world call.
  const saved = useRef(loadSession()).current;

  const [tweaks, setTweaks] = useState(DEFAULTS);
  const [editMode, setEditMode] = useState(false);
  const [pebbles, setPebbles] = useState(() => saved?.pebbles || []);
  const [selectedId, setSelectedId] = useState(() => saved?.selectedId || null);
  const [tab, setTab] = useState(() => saved?.tab || "pebble");
  const [retirementOpen, setRetirementOpen] = useState(() => !!saved?.retirementOpen);
  const [retirementData, setRetirementData] = useState(() => saved?.retirementData || null);
  const [stateSnapshot, setStateSnapshot] = useState(() => saved?.stateSnapshot || null);
  const [history, setHistory] = useState(() => saved?.history || []);
  const [fertilityBand, setFertilityBand] = useState(() => saved?.fertilityBand || null);
  const [scenario, setScenario] = useState(() => saved?.scenario || null);
  const [bootErr, setBootErr] = useState(null);
  const [committing, setCommitting] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [pastRuns, setPastRuns] = useState(loadPastRuns);
  // When set, the retirement modal shows this past run instead of the
  // current run's data. Null = show the current run (if retired).
  const [viewingPastRunId, setViewingPastRunId] = useState(null);
  // Stable id for the current run — lets retirement save/upsert target a
  // single entry even if the user re-retires after swapping. Persisted in
  // the session blob so reloads within the same run keep updating the
  // same past-run entry.
  const currentRunIdRef = useRef(saved?.runId || makeId("run"));
  const bootStarted = useRef(false);
  const toastTimers = useRef({});
  const bootReminderRef = useRef(false);

  // claude.ai/design edit-mode message bridge
  useEffect(() => {
    const handler = (ev) => {
      const d = ev.data || {};
      if (d.type === "__activate_edit_mode") setEditMode(true);
      else if (d.type === "__deactivate_edit_mode") setEditMode(false);
    };
    window.addEventListener("message", handler);
    window.parent.postMessage({ type: "__edit_mode_available" }, "*");
    return () => window.removeEventListener("message", handler);
  }, []);

  const setTweaksPersist = useCallback((next) => {
    setTweaks(next);
    window.parent.postMessage({ type: "__edit_mode_set_keys", edits: next }, "*");
  }, []);

  useEffect(() => {
    document.body.classList.toggle("dark", tweaks.theme === "dark");
  }, [tweaks.theme]);

  // ----- Bootstrap: START root + first turn's siblings -----------------
  useEffect(() => {
    if (bootStarted.current) return;
    bootStarted.current = true;
    // Hydrated from localStorage — skip the world fetch and continue the run.
    if (saved && Array.isArray(saved.pebbles) && saved.pebbles.length > 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/world`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profile: window.PROFILE_API,
            past_run_notes: pastRunsForAI(loadPastRuns()),
          }),
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`world ${res.status}: ${txt.slice(0, 240)}`);
        }
        const data = await res.json();
        if (cancelled) return;
        setScenario(data.scenario);
        setFertilityBand(data.fertility_band);
        setStateSnapshot(data.root_pebble.state_snapshot);

        const rootId = "start";
        const root = {
          id: rootId,
          parentId: null,
          siblingGroupId: null,
          type: "START",
          state: "chosen",
          age: window.PROFILE_API.age,
          months: 0,
          title: `${window.PROFILE.name}`,
          subtitle: `Starting point · age ${window.PROFILE_API.age}`,
        };

        const rootApi = {
          type: data.root_pebble.type,
          scene: data.root_pebble.scene,
          prompt: data.root_pebble.prompt,
          options: data.root_pebble.options,
          open_question: data.root_pebble.open_question,
          actionable_irl: false,
          actionable_irl_summary: null,
        };
        const siblings = materialisePebbles({
          apiNext: rootApi,
          parentId: rootId,
          age: window.PROFILE_API.age,
          pre_state: data.root_pebble.state_snapshot,
          pre_history: [],
        });
        setPebbles([root, ...siblings]);
        // Open the inspector on the first option. QUESTION / OPEN_Q are
        // display-only wrappers — skip them so the choice or reflection UI
        // shows immediately.
        const firstSelectable = siblings.find(
          (s) => s.type !== "QUESTION" && s.type !== "OPEN_Q",
        );
        setSelectedId(firstSelectable?.id || siblings[0]?.id || rootId);
      } catch (e) {
        if (!cancelled) setBootErr(e.message || String(e));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Persist session on every meaningful change. Skip while pebbles is empty
  // so we don't clobber saved runs during the initial render window.
  useEffect(() => {
    if (pebbles.length === 0) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        profileKey: profileFingerprint(),
        pebbles,
        selectedId,
        tab,
        stateSnapshot,
        history,
        fertilityBand,
        scenario,
        retirementData,
        retirementOpen,
        runId: currentRunIdRef.current,
      }));
    } catch {}
  }, [pebbles, selectedId, tab, stateSnapshot, history, fertilityBand, scenario, retirementData, retirementOpen]);

  const byId = useMemo(() => Object.fromEntries(pebbles.map((p) => [p.id, p])), [pebbles]);
  const childrenOf = useMemo(() => {
    const m = {};
    pebbles.forEach((p) => {
      if (!p.parentId) return;
      (m[p.parentId] = m[p.parentId] || []).push(p.id);
    });
    return m;
  }, [pebbles]);

  const selected = byId[selectedId];
  const selectedGroup = useMemo(() => {
    if (!selected || !selected.siblingGroupId) return selected ? [selected] : [];
    return pebbles.filter((p) => p.siblingGroupId === selected.siblingGroupId)
      .sort((a, b) => (a.optionIndex ?? 0) - (b.optionIndex ?? 0));
  }, [selected, pebbles]);

  // The "frontier" = the active sibling group whose members are all
  // pending AND not ghosted. Ghosted-pending pebbles belong to a preserved
  // alt-timeline and don't count.
  const frontierGroupId = useMemo(() => {
    const pending = pebbles.filter((p) => p.state === "pending" && !p.ghosted);
    return pending[0]?.siblingGroupId || null;
  }, [pebbles]);

  const handleTogglePin = (id) => {
    setPebbles((prev) => prev.map((p) => (p.id === id ? { ...p, pinned: !p.pinned } : p)));
  };

  // ----- Toasts -------------------------------------------------------
  // Lightweight in-app notification stack. Fires on pinned-status changes
  // and on boot when there are pending IRL tasks waiting.
  const pushToast = useCallback((toast) => {
    const id = Math.random().toString(36).slice(2);
    const ttl = toast.ttl ?? 4500;
    setToasts((prev) => [...prev, { ...toast, id }]);
    toastTimers.current[id] = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      delete toastTimers.current[id];
    }, ttl);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (toastTimers.current[id]) {
      clearTimeout(toastTimers.current[id]);
      delete toastTimers.current[id];
    }
  }, []);

  const handlePinnedStatus = useCallback((id, status) => {
    let title = "pebble";
    setPebbles((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        title = p.optionLabel || p.prompt || p.title || "pebble";
        return {
          ...p,
          irl: { ...(p.irl || {}), status, statusUpdatedAt: Date.now() },
        };
      })
    );
    if (status === "done") {
      pushToast({ kind: "success", title: "Nice — marked complete.", body: `“${title}” ✓`, ttl: 5000 });
    } else if (status === "not_yet") {
      pushToast({ kind: "info", title: "Saved as not-yet.", body: `We'll keep “${title}” on your radar.`, ttl: 4000 });
    } else if (status === "changed_mind") {
      pushToast({ kind: "info", title: "Skipped.", body: `“${title}” won't nudge anymore.`, ttl: 4000 });
    }
  }, [pushToast]);

  const nudgePinned = useCallback(() => {
    const pending = pebbles.filter(
      (p) => p.pinned && p.irl?.status !== "done" && p.irl?.status !== "changed_mind"
    );
    if (pending.length === 0) {
      pushToast({ kind: "success", title: "All caught up.", body: "No pinned tasks waiting.", ttl: 3500 });
      return;
    }
    const first = pending[0];
    const firstTitle = first.optionLabel || first.prompt || first.title || "Pebble";
    pushToast({
      kind: "reminder",
      title: `${pending.length} pinned task${pending.length === 1 ? "" : "s"} waiting`,
      body: `“${firstTitle}”${pending.length > 1 ? ` + ${pending.length - 1} more` : ""}`,
      ttl: 6000,
    });
  }, [pebbles, pushToast]);

  // Boot-time reminder — fires once when pebbles first hydrate and there
  // are pending pinned items. Gives returning users a visible nudge.
  useEffect(() => {
    if (pebbles.length === 0) return;
    if (bootReminderRef.current) return;
    bootReminderRef.current = true;
    const pending = pebbles.filter(
      (p) => p.pinned && p.irl?.status !== "done" && p.irl?.status !== "changed_mind"
    );
    if (pending.length === 0) return;
    pushToast({
      kind: "reminder",
      title: `${pending.length} pebble${pending.length === 1 ? "" : "s"} awaiting action`,
      body: "Open the Pinned tab to mark them done when you've followed through.",
      ttl: 6500,
    });
  }, [pebbles, pushToast]);

  // ----- Past-run save/upsert ------------------------------------------
  // Fires whenever retirementData changes (the user reaches or re-reaches
  // retirement). Upserts into pastRuns keyed on the stable currentRunId so
  // swapping and re-retiring within the same session updates a single
  // entry. User's `name` + `notes` are preserved across re-retires; the
  // report fields are overwritten with the latest data.
  useEffect(() => {
    if (!retirementData) return;
    const runId = currentRunIdRef.current;
    setPastRuns((prev) => {
      const existing = prev.find((r) => r.id === runId);
      const startAge = window.PROFILE_API?.age ?? null;
      const decisionCount = (history || []).length;
      const report = {
        finalAge: retirementData.finalAge ?? null,
        years: retirementData.years ?? null,
        recap: retirementData.recap || "",
        highlights: retirementData.highlights || [],
        achievements: retirementData.achievements || [],
        sources: Array.isArray(retirementData.sources) ? retirementData.sources : [],
      };
      const base = {
        id: runId,
        profileName: window.PROFILE?.name || "",
        startAge,
        decisionCount,
        history,
        ...report,
      };
      let next;
      if (existing) {
        next = prev.map((r) => (r.id === runId ? { ...r, ...base, updatedAt: Date.now() } : r));
      } else {
        const order = prev.length + 1;
        next = [
          ...prev,
          {
            ...base,
            name: `Run #${order}`,
            notes: "",
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ];
      }
      savePastRuns(next);
      return next;
    });
    // Intentionally only tracks retirementData — `history` is a closure read.
    // If user branches after retiring, we let the next retirement event (new
    // retirementData) trigger an updated save rather than saving stale
    // retirement data alongside fresh history during the traversal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retirementData]);

  const handleRenameRun = useCallback((runId, name) => {
    setPastRuns((prev) => {
      const next = prev.map((r) =>
        r.id === runId ? { ...r, name: (name || "").trim().slice(0, 100) || r.name, updatedAt: Date.now() } : r,
      );
      savePastRuns(next);
      return next;
    });
  }, []);

  const handleNotesChange = useCallback((runId, notes) => {
    setPastRuns((prev) => {
      const next = prev.map((r) =>
        r.id === runId ? { ...r, notes: (notes || "").slice(0, 2000), updatedAt: Date.now() } : r,
      );
      savePastRuns(next);
      return next;
    });
  }, []);

  // ----- Voluntary retirement ------------------------------------------
  // Lets the user end the sim at the current simulated age without waiting
  // for retirement_age. Calls /api/pebble/retire which LLM-authors a recap
  // over the history so far and stitches deterministic highlights on top.
  // Same resulting shape as a natural retirement → same modal, same save.
  const handleRetireNow = useCallback(async () => {
    if (committing) return;
    if (!stateSnapshot) {
      alert("Can't retire yet — the first pebble hasn't loaded.");
      return;
    }
    const age = stateSnapshot.age;
    if (!confirm(`Retire now at age ${age}? This ends the current path and generates a report. You can still swap to an earlier pebble afterward.`)) {
      return;
    }
    setCommitting(true);
    try {
      const res = await fetch(`${API_BASE}/pebble/retire`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: window.PROFILE_API,
          state: stateSnapshot,
          history,
          past_run_notes: pastRunsForAI(pastRuns),
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        alert(`Retire failed (${res.status}): ${txt.slice(0, 240)}`);
        return;
      }
      const body = await res.json();
      setRetirementData(mapRetirement(body, window.PROFILE_API.age));
      setRetirementOpen(true);
    } catch (e) {
      alert(`Network error while retiring: ${e.message || e}`);
    } finally {
      setCommitting(false);
    }
  }, [committing, stateSnapshot, history, pastRuns]);

  const handleDeleteRun = useCallback((runId) => {
    setPastRuns((prev) => {
      const next = prev.filter((r) => r.id !== runId);
      savePastRuns(next);
      return next;
    });
    setViewingPastRunId((cur) => (cur === runId ? null : cur));
  }, []);

  // Collect ALL descendant ids (and rootId itself) regardless of state.
  // Used to flip ghosted on/off across an entire subtree — preserving
  // every chosen/pending/forgone node so a swap-back fully restores the
  // path the user explored.
  function collectSubtree(pebs, rootId) {
    const childrenLocal = {};
    pebs.forEach((p) => { if (p.parentId) (childrenLocal[p.parentId] = childrenLocal[p.parentId] || []).push(p.id); });
    const out = new Set();
    const stack = [rootId];
    while (stack.length) {
      const id = stack.pop();
      if (out.has(id)) continue;
      out.add(id);
      for (const cid of (childrenLocal[id] || [])) stack.push(cid);
    }
    return out;
  }

  function setSubtreeGhosted(pebs, rootId, ghosted) {
    const ids = collectSubtree(pebs, rootId);
    return pebs.map((p) => (ids.has(p.id) ? { ...p, ghosted } : p));
  }

  // Walk from a node up to the root, returning [node, parent, ..., root].
  // QUESTION/START pebbles are included — they're part of the live spine,
  // so a swap must flip their flags too.
  function ancestorChainOf(pebs, id) {
    const byIdLocal = Object.fromEntries(pebs.map((p) => [p.id, p]));
    const chain = [];
    let curId = id;
    while (curId) {
      const n = byIdLocal[curId];
      if (!n) break;
      chain.push(n);
      curId = n.parentId;
    }
    return chain;
  }

  // Swap the live spine onto target's branch. For every ancestor of target
  // (and target itself), ghost any currently-live sibling's subtree on a
  // conflicting branch, then unghost the chain. Without walking the chain,
  // a deep click leaves levels 1..N-1 pointing at the old branch.
  function swapSpineToTarget(pebs, targetId) {
    const chain = ancestorChainOf(pebs, targetId);
    const chainIds = new Set(chain.map((n) => n.id));
    let next = pebs;
    for (const node of chain) {
      if (!node.siblingGroupId) continue; // QUESTION / START have no group
      const currentlyLive = next.find(
        (p) =>
          p.siblingGroupId === node.siblingGroupId &&
          p.id !== node.id &&
          p.state === "chosen" &&
          !p.ghosted,
      );
      if (currentlyLive) {
        next = setSubtreeGhosted(next, currentlyLive.id, true);
      }
    }
    return next.map((p) => (chainIds.has(p.id) ? { ...p, ghosted: false } : p));
  }

  // Find the deepest pending+!ghosted descendant of a (just-revived)
  // subtree. That's the active frontier we hand control back to.
  function findRevivedFrontier(pebs, rootId) {
    const ids = collectSubtree(pebs, rootId);
    const byIdLocal = Object.fromEntries(pebs.map((p) => [p.id, p]));
    let pending = null;
    for (const id of ids) {
      const n = byIdLocal[id];
      if (n && n.state === "pending" && !n.ghosted) {
        if (!pending || (n.age ?? 0) > (pending.age ?? 0)) pending = n;
      }
    }
    if (pending) return pending.id;
    // No pending node — the spine ended at a chosen terminal. Return the
    // deepest chosen+!ghosted node so the user can at least inspect it.
    let deepest = null;
    for (const id of ids) {
      const n = byIdLocal[id];
      if (n && n.state === "chosen" && !n.ghosted) {
        if (!deepest || (n.age ?? 0) > (deepest.age ?? 0)) deepest = n;
      }
    }
    return deepest?.id || rootId;
  }

  // ----- Commit / auto-swap -------------------------------------------
  // Unified entry for: (a) the user picking an option in the pending
  // frontier group, (b) submitting a reflection on a pending OPEN pebble,
  // (c) clicking a forgone sibling (auto-swap + re-simulate), (d) clicking
  // a ghosted sibling to revive its preserved subtree.
  const handleCommit = async (pebbleId, openText) => {
    if (committing) return;
    const target = byId[pebbleId];
    if (!target || target.type === "START") return;
    // OPEN_Q and QUESTION are display-only wrappers — clicks route to their
    // children via handleNodeClick, so they should never arrive here. Guard
    // anyway in case a stale selectedId falls through.
    if (target.type === "QUESTION" || target.type === "OPEN_Q") return;

    // Case: revive a previously-explored ghosted subtree. No API call —
    // we just flip ghosted flags. Every chosen/pending/forgone node in
    // the target subtree is preserved exactly as the user left it.
    if (target.ghosted) {
      // Walk the full ancestor chain: ghost conflicting live siblings at
      // every level (not just target's own group), then unghost the chain
      // itself so the spine connects root → target.
      let next = swapSpineToTarget(pebbles, target.id);
      // Unghost target's whole subtree (chosen, pending, forgone all come back).
      next = setSubtreeGhosted(next, target.id, false);
      setPebbles(next);
      // Rewind state/history to the deepest pending+!ghosted descendant
      // — that's where the user was in the simulation when they swapped
      // away. If no pending exists (terminal-chosen), rewind to its post-state.
      const frontierId = findRevivedFrontier(next, target.id);
      const frontierNode = next.find((p) => p.id === frontierId);
      if (frontierNode) {
        setStateSnapshot(frontierNode.pre_state || stateSnapshot);
        setHistory(frontierNode.pre_history || []);
      }
      setSelectedId(frontierId);
      setTab("pebble");
      return;
    }

    let basePebbles = pebbles;

    // Case: resubmit a previously-answered OPEN response. Instead of editing
    // in place, spawn a new pending sibling response under the SAME OPEN_Q
    // wrapper, ghost the old response + everything it led to, then fall
    // through to the standard pending-commit path below with the new sibling
    // as the target. The previous response and its subtree remain preserved
    // as a ghosted alt-branch the user can revive by clicking on it.
    let activeTarget = target;
    if (
      target.state === "chosen" &&
      target.type === "OPEN" &&
      typeof openText === "string" &&
      openText.trim().length > 0
    ) {
      const newResponseId = makeId("p");
      const newResponse = {
        id: newResponseId,
        parentId: target.parentId,
        siblingGroupId: target.siblingGroupId,
        type: "OPEN",
        state: "pending",
        ghosted: false,
        age: target.age,
        months: target.months || 0,
        scene: target.scene,
        prompt: target.prompt,
        pre_state: target.pre_state,
        pre_history: target.pre_history,
        openQuestion: target.openQuestion,
        actionableIrl: target.actionableIrl,
        actionableIrlSummary: target.actionableIrlSummary,
        irl: { actionable: false, status: null },
      };
      basePebbles = setSubtreeGhosted(basePebbles, target.id, true);
      basePebbles = [...basePebbles, newResponse];
      setPebbles(basePebbles);
      setSelectedId(newResponseId);
      setTab("pebble");
      activeTarget = newResponse;
    }

    // Case: forgone auto-swap — ghost current live sibling's subtree, then
    // re-commit activeTarget by calling API as if the user just picked it now.
    let baseState = activeTarget.pre_state ?? stateSnapshot;
    let baseHistory = activeTarget.pre_history ?? history;
    if (activeTarget.state === "forgone") {
      // Walk the chain up from activeTarget so any ancestor still live on
      // the old branch gets ghosted too. Ancestors of a non-ghosted forgone
      // are usually already live, but the chain walk is safe and uniform.
      basePebbles = swapSpineToTarget(basePebbles, activeTarget.id);
      // Bring activeTarget back to pending and use ITS pre_state/history.
      basePebbles = basePebbles.map((p) =>
        p.id === activeTarget.id ? { ...p, state: "pending", ghosted: false } : p
      );
      setPebbles(basePebbles);
      setSelectedId(activeTarget.id);
      setTab("pebble");
      // A swap abandons the old spine. Any retirement we stored belonged to
      // that spine — clear it so the Retirement pill / modal don't keep
      // showing the old life. If the new spine reaches retirement, the
      // API response below will repopulate retirementData.
      setRetirementData(null);
      setRetirementOpen(false);
    } else if (activeTarget.state !== "pending") {
      return; // chosen already, nothing to do
    }

    // Build the last_action for the API.
    let lastAction;
    if (activeTarget.type === "MCQ") {
      lastAction = {
        type: "MCQ",
        user_choice: activeTarget.optionLabel,
        was_combined_path: !!activeTarget.optionIsCombined,
      };
    } else {
      const answer = (openText || "").trim().slice(0, 150);
      if (!answer) return;
      lastAction = {
        type: "OPEN",
        open_question: activeTarget.openQuestion || activeTarget.prompt,
        user_open_answer: answer,
      };
    }

    setCommitting(true);
    try {
      const res = await fetch(`${API_BASE}/pebble/choose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: window.PROFILE_API,
          state: baseState,
          history: baseHistory,
          last_action: lastAction,
          past_run_notes: pastRunsForAI(pastRuns),
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        alert(`Commit failed (${res.status}): ${txt.slice(0, 240)}`);
        return;
      }
      const body = await res.json();

      // If the user navigated away during fetch, abandon this response.
      const stillPending = (basePebbles).some(
        (p) => p.id === activeTarget.id && p.state === "pending",
      );
      if (!stillPending) return;

      const outcome = {
        headline: body.outcome_summary.headline,
        narrative: body.outcome_summary.narrative,
        continuity: body.outcome_summary.continuity || null,
        sources: Array.isArray(body.outcome_summary.sources)
          ? body.outcome_summary.sources
          : [],
        combined_clamped: !!body.combined_path_clamped,
      };

      const newEntry = historyEntryFor(
        activeTarget.type === "MCQ"
          ? activeTarget
          : { ...activeTarget, openQuestion: lastAction.open_question },
        lastAction.type === "OPEN" ? lastAction.user_open_answer : null,
        body.outcome_summary.headline,
      );
      const nextHistory = [...baseHistory, newEntry];

      // Solidify activeTarget, mark siblings forgone, then append next turn's
      // siblings as children of activeTarget.
      let nextPebbles = basePebbles.map((p) => {
        if (p.id === activeTarget.id) {
          const resolved = { ...p, state: "chosen", outcome };
          if (p.type === "OPEN") resolved.reflection = lastAction.user_open_answer;
          return resolved;
        }
        if (p.siblingGroupId === activeTarget.siblingGroupId && p.state === "pending") {
          return { ...p, state: "forgone" };
        }
        return p;
      });

      let newFrontierId = null;
      if (body.next && body.next.type !== "RETIREMENT") {
        const nextAge = body.new_state?.age ?? activeTarget.age + 1;
        const newSiblings = materialisePebbles({
          apiNext: body.next,
          parentId: activeTarget.id,
          age: nextAge,
          pre_state: body.new_state,
          pre_history: nextHistory,
        });
        nextPebbles = [...nextPebbles, ...newSiblings];
        // Skip the QUESTION / OPEN_Q wrappers when picking the next selected pebble.
        const firstSelectable = newSiblings.find(
          (s) => s.type !== "QUESTION" && s.type !== "OPEN_Q",
        );
        newFrontierId = firstSelectable?.id || newSiblings[0]?.id || null;
      }

      setPebbles(nextPebbles);
      setHistory(nextHistory);
      if (body.new_state) setStateSnapshot(body.new_state);
      if (body.fertility_band_applied) setFertilityBand(body.fertility_band_applied);

      if (body.next?.type === "RETIREMENT") {
        setRetirementData(mapRetirement(body.next, window.PROFILE_API.age));
        setRetirementOpen(true);
      } else if (newFrontierId) {
        setSelectedId(newFrontierId);
      }
    } catch (e) {
      alert(`Network error: ${e.message || e}`);
    } finally {
      setCommitting(false);
    }
  };

  // Derive pinned view from live pebble list.
  const pinnedView = useMemo(
    () =>
      pebbles
        .filter((p) => p.pinned)
        .map((p) => ({
          pebbleId: p.id,
          title: p.optionLabel || p.prompt || p.title || "Pebble",
          sub: p.state === "pending" ? `current · age ${p.age}` : `age ${p.age}`,
          status: p.irl?.status || (p.state === "pending" ? "pending" : "not_yet"),
          statusUpdatedAt: p.irl?.statusUpdatedAt || null,
          initial: String(p.age),
        })),
    [pebbles]
  );

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <div className="logo">{LOGO}</div>
          <div>
            <strong>PebblePath</strong>
          </div>
          <span className="sub">life-path simulator</span>
        </div>
        <div className="topbar-center">
          <button className="pill-btn active"><Icon.Flag /> Trail</button>
          <button className="pill-btn" onClick={() => setTab("pinned")}>
            <Icon.Pin /> Pinned <span className="count">{pinnedView.length}</span>
          </button>
          <button
            className="pill-btn"
            onClick={() => {
              if (retirementData) setRetirementOpen(true);
              else handleRetireNow();
            }}
            disabled={committing || (!retirementData && !stateSnapshot)}
            title={
              retirementData
                ? "Open retirement report"
                : stateSnapshot
                  ? `Retire now at age ${stateSnapshot.age} and generate a report`
                  : "Retirement opens once the simulation has started"
            }
          >
            <Icon.Trophy /> {retirementData ? "Retirement" : committing ? "Retiring…" : "Retire now"}
          </button>
        </div>
        <div className="brand-right">
          <div className="profile-chip">
            <div className="avatar">{window.PROFILE.initials}</div>
            <div className="meta">
              <div className="name">{window.PROFILE.name}</div>
              <div className="age">age {window.PROFILE.age} · {window.PROFILE.location}</div>
            </div>
          </div>
          <button
            className="icon-btn"
            title="Restart — wipes this run and starts over"
            onClick={() => {
              if (confirm("Restart PebblePath? Your current run will be wiped.")) {
                clearSession();
                window.location.reload();
              }
            }}
          ><Icon.Restart /></button>
          <button className="icon-btn" onClick={() => setEditMode((v) => !v)}><Icon.Gear /></button>
        </div>
      </div>

      <Trail
        pebbles={pebbles}
        childrenOf={childrenOf}
        selectedId={selectedId}
        frontierGroupId={frontierGroupId}
        filter={tweaks.branches}
        setFilter={(v) => setTweaksPersist({ ...tweaks, branches: v })}
        onPick={(id) => { setSelectedId(id); setTab("pebble"); }}
        onSwap={(id) => handleCommit(id)}
        stages={window.STAGES}
        onOpenRetirement={() => retirementData && setRetirementOpen(true)}
        bootErr={bootErr}
        scenario={scenario}
        fertilityBand={fertilityBand}
        committing={committing}
        retirementReady={!!retirementData}
        retirementData={retirementData}
      />

      <Inspector
        tab={tab}
        setTab={setTab}
        selected={selected}
        group={selectedGroup}
        frontierGroupId={frontierGroupId}
        onCommit={handleCommit}
        onTogglePin={handleTogglePin}
        onPickSibling={(id) => { setSelectedId(id); setTab("pebble"); }}
        pinnedView={pinnedView}
        pebbles={pebbles}
        onOpenPeb={(id) => { setSelectedId(id); setTab("pebble"); }}
        onPinnedStatus={handlePinnedStatus}
        onNudge={nudgePinned}
        committing={committing}
        fertilityBand={fertilityBand}
        pastRuns={pastRuns}
        currentRunId={currentRunIdRef.current}
        onViewPastRun={(id) => setViewingPastRunId(id)}
        onRenameRun={handleRenameRun}
        onDeleteRun={handleDeleteRun}
      />

      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {/* Retirement modal: drives either the current run (most recent data
          pulled from retirementData, annotated with the saved name/notes) or
          a past run when the user opens one from the Runs tab. */}
      {(() => {
        const viewingPast = viewingPastRunId
          ? pastRuns.find((r) => r.id === viewingPastRunId)
          : null;
        const currentRunSaved = pastRuns.find((r) => r.id === currentRunIdRef.current);
        const modalOpen = !!viewingPast || (retirementOpen && !!retirementData);
        // For the current run, prefer the saved entry (has name/notes) and
        // fall back to retirementData fields while it's being upserted.
        const activeRun = viewingPast || (retirementData
          ? {
              id: currentRunIdRef.current,
              name: currentRunSaved?.name || "Current run",
              notes: currentRunSaved?.notes || "",
              finalAge: retirementData.finalAge,
              years: retirementData.years,
              recap: retirementData.recap,
              highlights: retirementData.highlights,
              achievements: retirementData.achievements,
              sources: retirementData.sources,
            }
          : null);
        if (!activeRun) return null;
        const isPastRun = !!viewingPast;
        const lastChosen = [...pebbles].reverse().find(
          (p) => p.state === "chosen" && p.type === "MCQ",
        );
        return (
          <RetirementModal
            visible={modalOpen}
            data={activeRun}
            isPastRun={isPastRun}
            onClose={() => {
              if (viewingPastRunId) setViewingPastRunId(null);
              else setRetirementOpen(false);
            }}
            onRename={(name) => handleRenameRun(activeRun.id, name)}
            onNotesChange={(notes) => handleNotesChange(activeRun.id, notes)}
            onDelete={isPastRun ? () => handleDeleteRun(activeRun.id) : null}
            branchAge={isPastRun ? null : (lastChosen?.age ?? null)}
            onBranchFromLast={isPastRun ? null : () => {
              // "Branch from last" = swap to an alternate sibling of the
              // most recent chosen MCQ. Pick the first forgone sibling.
              if (!lastChosen) return;
              const altSibling = pebbles.find(
                (p) => p.siblingGroupId === lastChosen.siblingGroupId &&
                       p.id !== lastChosen.id &&
                       (p.state === "forgone" || p.state === "completed-alt")
              );
              if (!altSibling) return;
              setRetirementOpen(false);
              handleCommit(altSibling.id);
            }}
            onRestart={isPastRun ? null : () => { clearSession(); window.location.reload(); }}
          />
        );
      })()}

      <Tweaks
        visible={editMode}
        tweaks={tweaks}
        set={setTweaksPersist}
        onClose={() => setEditMode(false)}
        onResetProfile={() => {
          clearProfile();
          clearSession();
          window.location.reload();
        }}
      />
    </div>
  );
}

// -------------------------------------------------------------------------
// Root — gates the main App on having a profile. On first load we try
// localStorage; if nothing's there, render the Onboarding form. Once the
// user submits, we save, hydrate window globals, and mount <App/>. App's
// internals (loadSession fingerprint check, API payloads, UI chip) all
// read window.PROFILE / window.PROFILE_API and were never structurally
// aware of where those globals came from.
// -------------------------------------------------------------------------
function Root() {
  const [profile, setProfile] = useState(() => {
    const loaded = loadProfile();
    if (loaded) applyProfileToWindow(loaded);
    return loaded;
  });

  const handleOnboardingSubmit = useCallback((submitted) => {
    // Trim the transient UI-only "preset" field before persisting — keeping
    // it means a future re-onboarding would see stale state; the resolved
    // relationship_status is the source of truth.
    const { relationship_status_preset: _omit, ...persisted } = submitted;
    saveProfile(persisted);
    applyProfileToWindow(persisted);
    setProfile(persisted);
  }, []);

  if (!profile) {
    return <Onboarding onSubmit={handleOnboardingSubmit} />;
  }

  return <App />;
}

ReactDOM.createRoot(document.getElementById("root")).render(<Root />);
