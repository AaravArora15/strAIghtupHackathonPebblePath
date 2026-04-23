// Curated whitelist of research/reporting used to ground outcome narratives.
// Every source here is either authored by a woman or published by a body whose
// remit is research ON women. This is the filter that keeps citations from
// being male-default-framed or hallucinated — the LLM is told to cite only
// from this list and server-side we drop any ID it invents.

export type SourceTopic =
  | "career"
  | "fertility"
  | "caregiving"
  | "finance"
  | "health"
  | "relationships";

export interface Source {
  id: string;
  title: string;
  author: string; // individual or organisation
  topic: SourceTopic;
  year: number;
  url: string;
  // One-line context shown to the LLM so it can pick the right source per outcome.
  blurb: string;
}

export const SOURCES: Source[] = [
  {
    id: "goldin_career_family",
    title: "Career and Family: Women's Century-Long Journey Toward Equity",
    author: "Claudia Goldin",
    topic: "career",
    year: 2021,
    url: "https://press.princeton.edu/books/hardcover/9780691201788/career-and-family",
    blurb:
      "Nobel-winning economist's analysis of how career-vs-family trade-offs have shaped women's earnings across five generations.",
  },
  {
    id: "women_in_workplace",
    title: "Women in the Workplace (annual)",
    author: "LeanIn.Org & McKinsey",
    topic: "career",
    year: 2024,
    url: "https://womenintheworkplace.com/",
    blurb:
      "Largest longitudinal study of women in corporate roles — promotion gaps, burnout, the 'broken rung' at first manager step.",
  },
  {
    id: "correll_motherhood_penalty",
    title: "Getting a Job: Is There a Motherhood Penalty?",
    author: "Shelley J. Correll et al.",
    topic: "career",
    year: 2007,
    url: "https://web.stanford.edu/~mrosenfe/Correll_Motherhood_Penalty.pdf",
    blurb:
      "Landmark study quantifying the wage and callback penalty mothers face versus equivalent non-mothers and fathers.",
  },
  {
    id: "sg_women_white_paper",
    title: "White Paper on Singapore Women's Development",
    author: "Ministry of Social and Family Development (SG)",
    topic: "caregiving",
    year: 2022,
    url: "https://www.msf.gov.sg/media-room/article/White-Paper-on-Singapore-Womens-Development",
    blurb:
      "Singapore government's 25-action plan on caregiving load, workplace equality and protection from violence.",
  },
  {
    id: "pew_working_mothers",
    title: "Raising Kids and Running a Household: How Working Parents Share the Load",
    author: "Kim Parker & Gretchen Livingston (Pew Research)",
    topic: "caregiving",
    year: 2015,
    url: "https://www.pewresearch.org/social-trends/2015/11/04/raising-kids-and-running-a-household-how-working-parents-share-the-load/",
    blurb:
      "Data on how working mothers still carry the bulk of household management, even in dual-earner households.",
  },
  {
    id: "acog_age35",
    title: "Having a Baby After Age 35: How Aging Affects Fertility and Pregnancy",
    author: "American College of Obstetricians and Gynecologists",
    topic: "fertility",
    year: 2022,
    url: "https://www.acog.org/womens-health/faqs/having-a-baby-after-age-35",
    blurb:
      "Clinical reference on fertility decline by age, miscarriage risk, and the narrowing window for conception.",
  },
  {
    id: "nhs_fertility",
    title: "Infertility — Overview and Causes",
    author: "NHS (UK)",
    topic: "fertility",
    year: 2023,
    url: "https://www.nhs.uk/conditions/infertility/",
    blurb:
      "Publicly funded clinical guidance on fertility decline, IVF success rates, and age-banded probabilities.",
  },
  {
    id: "singhealth_fertility_sg",
    title: "Fertility Rate in Singapore & Age-Related Decline",
    author: "KK Women's & Children's Hospital (SingHealth)",
    topic: "fertility",
    year: 2023,
    url: "https://www.kkh.com.sg/patient-care/conditions-treatments/infertility",
    blurb:
      "Singapore-specific clinical guidance from the country's flagship women's hospital on age and fertility.",
  },
  {
    id: "dbs_women_finance",
    title: "NAV Your Finances — Women & Money",
    author: "DBS (Lorna Tan, Head of Financial Planning Literacy)",
    topic: "finance",
    year: 2023,
    url: "https://www.dbs.com.sg/personal/articles/nav/financial-planning/women-financial-planning",
    blurb:
      "Singapore-context financial planning for women across life stages — retirement gap, career breaks, caregiving costs.",
  },
  {
    id: "merrill_women_study",
    title: "Women & Financial Wellness: Beyond the Bottom Line",
    author: "Bank of America Merrill Lynch & Age Wave",
    topic: "finance",
    year: 2018,
    url: "https://mlaem.fs.ml.com/content/dam/ML/Articles/pdf/ml_Women-Study-ARMCWFF3-0418.pdf",
    blurb:
      "US data on women's lifetime earnings gap, career-break costs, and retirement savings shortfall.",
  },
  {
    id: "unwomen_progress_women",
    title: "Progress of the World's Women",
    author: "UN Women",
    topic: "caregiving",
    year: 2019,
    url: "https://www.unwomen.org/en/digital-library/progress-of-the-worlds-women",
    blurb:
      "Global data on unpaid care work, family structures, and the policies that widen or close the equity gap.",
  },
  {
    id: "who_womens_health",
    title: "Women's Health — Global Report",
    author: "World Health Organization",
    topic: "health",
    year: 2023,
    url: "https://www.who.int/health-topics/women-s-health",
    blurb:
      "WHO guidance on women's health across the life course — reproductive, mental, non-communicable.",
  },
];

export const SOURCE_BY_ID: Record<string, Source> = Object.fromEntries(
  SOURCES.map((s) => [s.id, s]),
);

// Drop any ID not in the whitelist; dedupe; cap at 2. The LLM is told to cite
// only from the whitelist but we enforce it mechanically — hallucinated IDs
// silently disappear rather than reaching the UI.
export function filterKnownSources(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of ids) {
    if (typeof raw !== "string") continue;
    if (!SOURCE_BY_ID[raw]) continue;
    if (seen.has(raw)) continue;
    seen.add(raw);
    out.push(raw);
    if (out.length >= 2) break;
  }
  return out;
}

// Compact text rendering for prompts — ID | topic | author — so the LLM can
// match outcome substance to a source without bloating token budget.
export function formatSourceWhitelistForPrompt(): string {
  return SOURCES.map(
    (s) => `  - ${s.id} [${s.topic}] ${s.author} — ${s.blurb}`,
  ).join("\n");
}
