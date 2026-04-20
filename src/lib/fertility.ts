// Deterministic fertility risk bands — NOT LLM-generated.
// Sources: ACOG Committee Opinion 589, NHS fertility guidance, Singapore MOH.
// These facts are injected into every LLM call as stated constraints; the model
// cannot override them.

export type FertilityBandLabel =
  | "low"
  | "low-moderate"
  | "moderate"
  | "moderate-high"
  | "high";

export interface FertilityBand {
  label: FertilityBandLabel;
  age_range: string;
  monthly_probability: string; // e.g. "20–25%"
  ivf_success?: string;        // e.g. "40–50%"
  clinical_note: string;
  recommend_specialist: boolean;
}

const BANDS: ReadonlyArray<{ max: number; band: FertilityBand }> = [
  {
    max: 29,
    band: {
      label: "low",
      age_range: "≤29",
      monthly_probability: "25–30%",
      clinical_note:
        "Conception typically occurs within 6–12 months of trying. Fertility risk is low at this age range.",
      recommend_specialist: false,
    },
  },
  {
    max: 32,
    band: {
      label: "low-moderate",
      age_range: "30–32",
      monthly_probability: "20–25%",
      clinical_note:
        "Fertility begins to decline gradually from age 32. Most couples still conceive within a year.",
      recommend_specialist: false,
    },
  },
  {
    max: 35,
    band: {
      label: "moderate",
      age_range: "33–35",
      monthly_probability: "15–20%",
      ivf_success: "40–50%",
      clinical_note:
        "Fertility decline accelerates. Couples trying for 6+ months without success are typically advised to consult a specialist.",
      recommend_specialist: false,
    },
  },
  {
    max: 38,
    band: {
      label: "moderate-high",
      age_range: "36–38",
      monthly_probability: "10–15%",
      ivf_success: "30–40%",
      clinical_note:
        "Egg freezing or specialist consultation is commonly recommended at this age range if children are desired.",
      recommend_specialist: true,
    },
  },
  {
    max: Infinity,
    band: {
      label: "high",
      age_range: "39+",
      monthly_probability: "5–10%",
      ivf_success: "15–25%",
      clinical_note:
        "Fertility decline is significant. Specialist consultation is advised before attempting conception.",
      recommend_specialist: true,
    },
  },
];

export function getFertilityBand(age: number): FertilityBand {
  for (const { max, band } of BANDS) {
    if (age <= max) return band;
  }
  // Unreachable — Infinity catches all — but satisfy TS.
  return BANDS[BANDS.length - 1].band;
}
