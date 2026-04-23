// PebblePath — live data seed. PROFILE / PROFILE_API are now populated at
// runtime from the onboarding flow (see Onboarding in components.jsx and
// applyProfileToWindow in app.jsx). Left unset here so a stale hardcoded
// profile can never leak into a real user's simulation.
window.PROFILE = null;
window.PROFILE_API = null;

// Stages to punctuate the trail visually
window.STAGES = [
  { atAge: 27, title: "Late 20s", sub: "early career · first big choices" },
  { atAge: 32, title: "Early 30s", sub: "settling · family · big moves" },
  { atAge: 40, title: "40s", sub: "build · pivot · consolidate" },
  { atAge: 55, title: "50s+", sub: "harvest · legacy · slow-down" },
];

// Live mode: pebbles start empty and are populated by API responses.
// Seed kept at module top for shape reference only.
window.PEBBLES = [];
window._MOCK_PEBBLES_UNUSED = [
  // ---- age 27: the first branch (Sarah already made this) ----
  {
    id: "p1",
    parent: null,
    type: "CHECKPOINT",
    state: "chosen",
    age: 27, months: 0,
    side: "center",
    title: "Stay at your agency job",
    subtitle: "Checkpoint · Career",
    scene: "You've been at the agency 3 years. A recruiter messages you about a Series-B role with 20% more pay but tighter hours. Your current work is steady but the growth has flattened.",
    choices: [
      { id: "a", label: "Stay — push for senior", hint: "Known path, slower growth", chosen: true, irl: true },
      { id: "b", label: "Jump to the Series-B", hint: "Risk / reward, more hours" },
      { id: "c", label: "Freelance for 6 months", hint: "Optionality, income gap" },
    ],
    outcome: {
      recap: "You stayed. Familiar rhythms, a new lead you respect, and a small raise. The plateau is still there, but so is your energy.",
      dimensions: [
        { label: "career", delta: 0, value: 3 },
        { label: "finances", delta: 1, value: 4 },
        { label: "emotional", delta: 1, value: 4 },
        { label: "lifestyle", delta: 0, value: 4 },
      ],
    },
    irl: { actionable: false, status: null },
  },

  // ---- age 27.5: first PATH (reflection) ----
  {
    id: "p2",
    parent: "p1",
    type: "PATH",
    state: "chosen",
    age: 27, months: 6,
    side: "right",
    title: "What does 'enough' look like?",
    subtitle: "Path · Reflection",
    scene: "Between pebbles, you're asked to write freely: *'When would you feel you have enough to slow down?'*",
    reflection: "Feels like \"enough\" is less about a number and more about not dreading Mondays. A paid-off flat by 45 and 20 hrs a week of meaningful work.",
    outcome: {
      recap: "A clearer inner compass. Finances feel less urgent once you named the real target.",
      dimensions: [
        { label: "emotional", delta: 1, value: 5 },
        { label: "career", delta: 0, value: 3 },
      ],
    },
  },

  // ---- age 28: forgone sibling (the alt you DIDN'T pick at p1) ----
  {
    id: "p1-alt",
    parent: null,
    type: "CHECKPOINT",
    state: "forgone",
    age: 27, months: 0,
    side: "left",
    title: "Jump to Series-B",
    subtitle: "Forgone branch",
    scene: "The timeline you didn't take. You can branch from here to restart from this point.",
    choices: [
      { id: "a", label: "Take the offer" },
      { id: "b", label: "Decline" },
    ],
  },

  // ---- age 28: CHECKPOINT ----
  {
    id: "p3",
    parent: "p2",
    type: "CHECKPOINT",
    state: "chosen",
    age: 28, months: 0,
    side: "center",
    title: "Move in with your partner?",
    subtitle: "Checkpoint · Relationships",
    scene: "2 years in, lease expiring on both sides. You both love the other's space for different reasons.",
    choices: [
      { id: "a", label: "Move in together", chosen: true, irl: true },
      { id: "b", label: "Keep separate places" },
      { id: "c", label: "A rented place together" },
    ],
    outcome: {
      recap: "You found a two-bedder in Tiong Bahru. Mornings are softer. You argue about the dishwasher. You're happy.",
      dimensions: [
        { label: "relationships", delta: 2, value: 5 },
        { label: "finances", delta: -1, value: 3 },
        { label: "lifestyle", delta: 1, value: 4 },
      ],
    },
    irl: { actionable: true, status: "done" },
  },

  // ---- age 29: the PINNED one — Sarah wants to act on this IRL ----
  {
    id: "p4",
    parent: "p3",
    type: "CHECKPOINT",
    state: "chosen",
    pinned: true,
    age: 29, months: 0,
    side: "right",
    title: "Start therapy",
    subtitle: "Checkpoint · Emotional · Pinned",
    scene: "The agency is bleeding late hours. You snapped at your partner twice last month. A friend recommends a therapist.",
    choices: [
      { id: "a", label: "Book a first session", chosen: true, irl: true },
      { id: "b", label: "Try meditation app first" },
      { id: "c", label: "Push through" },
    ],
    outcome: {
      recap: "You booked. It was uncomfortable for six weeks. Then it wasn't.",
      dimensions: [
        { label: "emotional", delta: 2, value: 5 },
        { label: "relationships", delta: 1, value: 5 },
        { label: "finances", delta: -1, value: 3 },
      ],
    },
    irl: { actionable: true, status: "not_yet" },
  },

  // ---- age 30: current active pebble (PENDING — next decision) ----
  {
    id: "p5",
    parent: "p4",
    type: "CHECKPOINT",
    state: "pending",
    current: true,
    age: 30, months: 0,
    side: "center",
    title: "A job offer in London",
    subtitle: "Checkpoint · Career & Lifestyle",
    scene: "A former colleague is hiring a design lead at her startup in London. 40% pay bump, visa sponsored, 2-year commitment. Your partner can work remote; your therapist is local; your parents are aging.",
    choices: [
      { id: "a", label: "Take the London role", hint: "Growth, distance from family", irl: true },
      { id: "b", label: "Negotiate to stay remote from SG", hint: "Best of both, harder to push" },
      { id: "c", label: "Decline — build locally", hint: "Safer, slower compounding" },
      { id: "d", label: "Counter with a 6-month trial", hint: "Hedge" },
    ],
  },

  // ---- age 31: forgone sibling of p5 branch (shown greyed) ----
  {
    id: "p5-alt",
    parent: "p4",
    type: "CHECKPOINT",
    state: "forgone",
    age: 30, months: 0,
    side: "left",
    title: "Turn it down quietly",
    subtitle: "Forgone branch",
    scene: "You didn't take the call. The offer expired without ceremony.",
  },

  // ---- age 31: pending future (after London decision would resolve) ----
  {
    id: "p6",
    parent: "p5",
    type: "PATH",
    state: "pending",
    age: 31, months: 0,
    side: "right",
    title: "Who do you miss?",
    subtitle: "Path · Reflection",
    scene: "A moment of stillness. Who are you missing most right now, and what would you say to them?",
  },

  // ---- age 32: COMPLETED-ALT (explored on a prior restart, now diverged) ----
  {
    id: "p7",
    parent: "p6",
    type: "CHECKPOINT",
    state: "completed-alt",
    age: 32, months: 0,
    side: "center",
    title: "Try for a child",
    subtitle: "Checkpoint · Fertility",
    scene: "You ran this branch once before — on a restart from age 29 — and decided to try.",
    choices: [
      { id: "a", label: "Try now" },
      { id: "b", label: "Wait 2 more years" },
      { id: "c", label: "Decide not to" },
    ],
    outcome: {
      recap: "(From an earlier explored branch) You tried. It took 14 months. It reshaped everything.",
      dimensions: [
        { label: "fertility", delta: 2, value: 5 },
        { label: "career", delta: -1, value: 3 },
      ],
    },
  },

  // ---- age 33: pending ----
  {
    id: "p8",
    parent: "p7",
    type: "CHECKPOINT",
    state: "pending",
    age: 33, months: 0,
    side: "left",
    title: "Buy your first flat",
    subtitle: "Checkpoint · Finances",
    scene: "CPF savings hit a threshold. The market is soft.",
  },

  // ---- age 40: far pending milestone ----
  {
    id: "p9",
    parent: "p8",
    type: "PATH",
    state: "pending",
    age: 40, months: 0,
    side: "right",
    title: "Mid-life gut-check",
    subtitle: "Path · Reflection",
    scene: "Thirteen years in. What would you tell your 27-year-old self?",
  },

  // ---- age 55: far pending ----
  {
    id: "p10",
    parent: "p9",
    type: "CHECKPOINT",
    state: "pending",
    age: 55, months: 0,
    side: "center",
    title: "Slow down early?",
    subtitle: "Checkpoint · Lifestyle",
    scene: "Semi-retire at 55, or ride it to 65?",
  },
];

// Retirement preview data
window.RETIREMENT = {
  finalAge: 65,
  years: 38,
  recap: "You stayed curious. You left the agency at 30 — not for London, but for a small studio you co-founded. You partnered, you parented, you therapised yourself back to whole more than once. The flat in Tiong Bahru got paid off at 52. You didn't optimize for comfort; you optimized for Mondays that didn't ache. On balance: a good life, told honestly.",
  stats: [
    { k: "career", v: "4.1", u: "avg / 5" },
    { k: "finances", v: "3.8", u: "avg / 5" },
    { k: "emotional", v: "4.4", u: "peak 5" },
    { k: "relationships", v: "4.6", u: "avg / 5" },
    { k: "fertility", v: "1", u: "child" },
    { k: "lifestyle", v: "4.2", u: "avg / 5" },
  ],
  achievements: [
    { id: "branches", t: "Explored 4 branches", s: "restart · forgone kept" },
    { id: "pinned5", t: "Pinned 7 pebbles", s: "6 acted on IRL" },
    { id: "therapy", t: "10y of therapy", s: "emotional ≥ 4 for a decade" },
    { id: "child35", t: "Had a child after 35", s: "fertility milestone" },
    { id: "paidoff", t: "Paid off home by 52", s: "finances landmark" },
    { id: "longcareer", t: "Career ≥ 4 for 15y", s: "sustained peak" },
  ],
};

// Pinned view is now derived from the live pebble list in app.jsx.
window.PINNED_VIEW = [];

// Source whitelist — mirror of src/lib/sources.ts. The server sends back
// only source IDs on each outcome (filtered against the canonical list on
// that file); this lookup renders them as human-readable pills. Keep the
// two files in sync — if an ID is here but not server-side the citation
// never reaches the client, and vice versa.
window.SOURCES_BY_ID = {
  goldin_career_family: {
    title: "Career and Family: Women's Century-Long Journey Toward Equity",
    author: "Claudia Goldin",
    year: 2021,
    url: "https://press.princeton.edu/books/hardcover/9780691201788/career-and-family",
  },
  women_in_workplace: {
    title: "Women in the Workplace (annual)",
    author: "LeanIn.Org & McKinsey",
    year: 2024,
    url: "https://womenintheworkplace.com/",
  },
  correll_motherhood_penalty: {
    title: "Getting a Job: Is There a Motherhood Penalty?",
    author: "Shelley J. Correll et al.",
    year: 2007,
    url: "https://web.stanford.edu/~mrosenfe/Correll_Motherhood_Penalty.pdf",
  },
  sg_women_white_paper: {
    title: "White Paper on Singapore Women's Development",
    author: "Ministry of Social and Family Development (SG)",
    year: 2022,
    url: "https://www.msf.gov.sg/media-room/article/White-Paper-on-Singapore-Womens-Development",
  },
  pew_working_mothers: {
    title: "Raising Kids and Running a Household",
    author: "Kim Parker & Gretchen Livingston (Pew)",
    year: 2015,
    url: "https://www.pewresearch.org/social-trends/2015/11/04/raising-kids-and-running-a-household-how-working-parents-share-the-load/",
  },
  acog_age35: {
    title: "Having a Baby After Age 35",
    author: "ACOG",
    year: 2022,
    url: "https://www.acog.org/womens-health/faqs/having-a-baby-after-age-35",
  },
  nhs_fertility: {
    title: "Infertility — Overview and Causes",
    author: "NHS (UK)",
    year: 2023,
    url: "https://www.nhs.uk/conditions/infertility/",
  },
  singhealth_fertility_sg: {
    title: "Fertility Rate in Singapore & Age-Related Decline",
    author: "KK Women's & Children's Hospital",
    year: 2023,
    url: "https://www.kkh.com.sg/patient-care/conditions-treatments/infertility",
  },
  dbs_women_finance: {
    title: "NAV Your Finances — Women & Money",
    author: "DBS · Lorna Tan",
    year: 2023,
    url: "https://www.dbs.com.sg/personal/articles/nav/financial-planning/women-financial-planning",
  },
  merrill_women_study: {
    title: "Women & Financial Wellness: Beyond the Bottom Line",
    author: "BoA Merrill Lynch & Age Wave",
    year: 2018,
    url: "https://mlaem.fs.ml.com/content/dam/ML/Articles/pdf/ml_Women-Study-ARMCWFF3-0418.pdf",
  },
  unwomen_progress_women: {
    title: "Progress of the World's Women",
    author: "UN Women",
    year: 2019,
    url: "https://www.unwomen.org/en/digital-library/progress-of-the-worlds-women",
  },
  who_womens_health: {
    title: "Women's Health — Global Report",
    author: "World Health Organization",
    year: 2023,
    url: "https://www.who.int/health-topics/women-s-health",
  },
};
