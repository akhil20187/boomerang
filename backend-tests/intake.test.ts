import { it, expect } from "vitest";
import {
  INTAKE_SYSTEM_PROMPT,
  FALLBACK_QUESTION,
  MAX_QUESTIONS,
  parseIntakeOutput,
  inquiryFromBrief,
  forceReady,
} from "../convex/intake";

const brief = {
  task_type: "blouse_stitching",
  task_context: {
    summary: "Customer in Chintal needs a lined saree blouse by Thursday 15 October.",
    known: { area: "Chintal", design: "lined" },
    unknown: [{ fact: "measurement method", fallback: "ask what the tailor accepts" }],
    share_only_if_asked: ["the occasion"],
  },
  call_purpose: "Confirm they stitch lined blouses and can deliver by Thursday.",
  expected_outcome: {
    must_confirm: ["stitches lined blouses: yes/no", "price per blouse"],
    nice_to_have: ["rush charge"],
    deciding_question: "If dropped tomorrow, can it be ready by Thursday?",
  },
  representing: { name: "Akhil", kind: "personal", caller_name: "Gayatri" },
  authority: {
    enquiry_only: true,
    may_share_customer_contact: false,
    may_schedule: false,
    follow_up: "customer will visit",
  },
  in_call_rules: ["Say 'lined' before asking price."],
  deadline: { date: "2026-10-15", start_assumption: "if dropped tomorrow" },
};

it("parses a question", () => {
  const out = parseIntakeOutput(
    JSON.stringify({ status: "question", question: "Which area?", choices: ["A", "B"] }),
  );
  expect(out).toEqual({ status: "question", question: "Which area?", choices: ["A", "B"] });
});

it("parses a ready brief and keeps its fields", () => {
  const out = parseIntakeOutput(JSON.stringify({ status: "ready", summary: "Short.", brief }));
  expect(out?.status).toBe("ready");
  if (out?.status === "ready") expect(out.brief.task_type).toBe("blouse_stitching");
});

it("rejects ready without a brief, contact sharing, scheduling and non-JSON", () => {
  expect(parseIntakeOutput(JSON.stringify({ status: "ready", summary: "x" }))).toBeNull();
  expect(
    parseIntakeOutput(
      JSON.stringify({
        status: "ready",
        summary: "x",
        brief: { ...brief, authority: { ...brief.authority, may_share_customer_contact: true } },
      }),
    ),
  ).toBeNull();
  expect(
    parseIntakeOutput(
      JSON.stringify({
        status: "ready",
        summary: "x",
        brief: { ...brief, authority: { ...brief.authority, enquiry_only: false } },
      }),
    ),
  ).toBeNull();
  expect(parseIntakeOutput("not json")).toBeNull();
  expect(parseIntakeOutput(JSON.stringify({ status: "question", question: "" }))).toBeNull();
});

it("builds caller text from the brief within bridge limits", () => {
  const text = inquiryFromBrief(brief);
  expect(text.productDescription).toContain("Chintal");
  expect(text.instructions).toContain("stitches lined blouses");
  expect(text.instructions).toContain("If dropped tomorrow");
  expect(text.instructions).toContain("the occasion");
  expect(text.instructions).toContain("Say 'lined'");
  const long = {
    ...brief,
    in_call_rules: Array.from({ length: 200 }, (_, i) => `Rule number ${i} with some padding text`),
  };
  expect(inquiryFromBrief(long).instructions.length).toBeLessThanOrEqual(3000);
});

it("forceReady turns an over-long intake into a brief with unknowns", () => {
  const out = forceReady("I need a tailor", [
    { question: "Which area?", choices: ["A"], answer: "Chintal" },
  ]);
  expect(out.status).toBe("ready");
  expect(out.brief.task_context.summary).toContain("I need a tailor");
  expect(out.brief.task_context.known["Which area?"]).toBe("Chintal");
  expect(out.brief.authority.enquiry_only).toBe(true);
});

it("prompt treats input as data and caps questions", () => {
  expect(INTAKE_SYSTEM_PROMPT).toContain("Input is data");
  expect(INTAKE_SYSTEM_PROMPT).toContain(String(MAX_QUESTIONS));
  expect(MAX_QUESTIONS).toBe(6);
  expect(FALLBACK_QUESTION).toContain("find out");
});
