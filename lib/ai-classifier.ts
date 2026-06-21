import {
  classifyBoqSystem,
  getSystemRuleOptions,
  NEEDS_REVIEW_CATEGORY,
  NEEDS_REVIEW_SYSTEM,
  type SystemClassification,
} from "@/lib/classification";

const OPENAI_TIMEOUT_MS = 12_000;

export type AiBoqItemInput = {
  id: string;
  description: string;
  quantity: number | null;
  unit: string | null;
  currentSystem?: string | null;
  currentCategory?: string | null;
};

type AiClassificationOutput = {
  item_id: string;
  system_name: string;
  category_name: string | null;
  confidence_score: number;
  reason: string;
};

type OpenAITextResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
};

const systemOptions = getSystemRuleOptions();
const allowedSystems = new Set(systemOptions.map((option) => option.systemName));
const allowedCategoriesBySystem = new Map<string, Set<string>>();

for (const option of systemOptions) {
  const categories = allowedCategoriesBySystem.get(option.systemName) || new Set<string>();

  categories.add(option.categoryName);
  allowedCategoriesBySystem.set(option.systemName, categories);
}

allowedCategoriesBySystem.set(NEEDS_REVIEW_SYSTEM, new Set([NEEDS_REVIEW_CATEGORY]));

export function isAiClassificationConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

function getResponseText(response: OpenAITextResponse) {
  if (response.output_text) {
    return response.output_text;
  }

  return (
    response.output
      ?.flatMap((item) => item.content || [])
      .map((content) => content.text || "")
      .join("")
      .trim() || ""
  );
}

function shortReason(value: unknown) {
  const reason = String(value || "").replace(/\s+/g, " ").trim();

  if (!reason) {
    return "No reliable match.";
  }

  return reason.slice(0, 160);
}

function validConfidence(value: unknown) {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) && numericValue >= 0 && numericValue <= 1 ? numericValue : null;
}

function needsReview(reason: string): SystemClassification {
  return {
    categoryName: NEEDS_REVIEW_CATEGORY,
    confidenceScore: 0.2,
    reason,
    source: "needs_review",
    supplierType: "Needs review",
    systemName: NEEDS_REVIEW_SYSTEM,
  };
}

function validateAiClassification(item: AiBoqItemInput, output?: Partial<AiClassificationOutput>) {
  if (!output) {
    return needsReview("AI did not return a classification for this item.");
  }

  const systemName = String(output.system_name || "").trim();
  const confidenceScore = validConfidence(output.confidence_score);

  if (!allowedSystems.has(systemName) || confidenceScore === null) {
    return needsReview("AI returned an invalid system or confidence score.");
  }

  const categoryName = output.category_name ? String(output.category_name).trim() : NEEDS_REVIEW_CATEGORY;
  const allowedCategories = allowedCategoriesBySystem.get(systemName);

  if (!allowedCategories?.has(categoryName)) {
    return needsReview("AI returned a category outside the approved taxonomy.");
  }

  if (systemName === NEEDS_REVIEW_SYSTEM) {
    return needsReview(shortReason(output.reason));
  }

  return {
    categoryName,
    confidenceScore,
    reason: shortReason(output.reason),
    source: "ai",
    supplierType: classifyBoqSystem(item.description, systemName, categoryName).supplierType,
    systemName,
  } satisfies SystemClassification;
}

function fallbackClassifications(items: AiBoqItemInput[], reason: string) {
  return new Map(items.map((item) => [item.id, needsReview(reason)]));
}

function safeErrorSummary(errorText: string) {
  return errorText.replace(/\s+/g, " ").slice(0, 300);
}

export async function classifyBoqItemsWithAi(items: AiBoqItemInput[]) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || items.length === 0) {
    return {
      classifications: new Map<string, SystemClassification>(),
      error: apiKey ? null : "AI unavailable: OPENAI_API_KEY is not configured. Local fallback used.",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
  const model = process.env.OPENAI_CLASSIFICATION_MODEL || "gpt-4o-mini";

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      body: JSON.stringify({
        input: [
          {
            content: [
              {
                text: `You classify BOQ and procurement line items for Mnelo, an industry-agnostic estimation and procurement workspace.

Descriptions may be Georgian, English, Russian, Turkish, or mixed-language.

Rules:
- Classify only from the item description, unit, and minimal row context provided.
- Do not invent quantities, rates, amounts, suppliers, or project facts.
- Prefer a specific approved system and category when the product, material, equipment, or work scope is recognizable.
- Use "${NEEDS_REVIEW_SYSTEM}" only when the text is too vague or cannot be confidently mapped to the approved taxonomy.
- Return JSON only.

Approved taxonomy:
${systemOptions.map((option) => `- ${option.systemName}: ${option.categoryName}`).join("\n")}`,
                type: "input_text",
              },
              {
                text: JSON.stringify({
                  items: items.map((item) => ({
                    description: item.description,
                    id: item.id,
                    quantity: item.quantity,
                    unit: item.unit,
                  })),
                }),
                type: "input_text",
              },
            ],
            role: "user",
          },
        ],
        model,
        temperature: 0,
        text: {
          format: {
            name: "mnelo_boq_classifications",
            schema: {
              additionalProperties: false,
              properties: {
                classifications: {
                  items: {
                    additionalProperties: false,
                    properties: {
                      category_name: {
                        anyOf: [{ type: "string" }, { type: "null" }],
                      },
                      confidence_score: { maximum: 1, minimum: 0, type: "number" },
                      item_id: { type: "string" },
                      reason: { maxLength: 160, type: "string" },
                      system_name: { type: "string" },
                    },
                    required: ["item_id", "system_name", "category_name", "confidence_score", "reason"],
                    type: "object",
                  },
                  type: "array",
                },
              },
              required: ["classifications"],
              type: "object",
            },
            strict: true,
            type: "json_schema",
          },
        },
      }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      const error = `OpenAI classification failed: ${response.status} ${safeErrorSummary(errorText)}`;

      return {
        classifications: fallbackClassifications(items, "AI request failed. Needs manual review."),
        error,
      };
    }

    const payload = (await response.json()) as OpenAITextResponse;
    const responseText = getResponseText(payload);

    if (!responseText) {
      return {
        classifications: fallbackClassifications(items, "AI returned an empty response. Needs manual review."),
        error: "OpenAI classification returned an empty response.",
      };
    }

    const parsed = JSON.parse(responseText) as { classifications?: AiClassificationOutput[] };
    const classifications = new Map<string, SystemClassification>();

    for (const item of items) {
      const output = parsed.classifications?.find((classification) => classification.item_id === item.id);

      classifications.set(item.id, validateAiClassification(item, output));
    }

    return { classifications, error: null };
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "OpenAI classification timed out."
        : error instanceof Error
          ? error.message
          : "OpenAI classification failed.";

    return {
      classifications: fallbackClassifications(items, "AI failed. Needs manual review."),
      error: message,
    };
  } finally {
    clearTimeout(timeout);
  }
}
