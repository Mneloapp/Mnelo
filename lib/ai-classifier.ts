import { classifyBoqSystem, getSystemRuleOptions, type SystemClassification } from "@/lib/classification";

type AiBoqItemInput = {
  id: string;
  description: string;
  quantity: number | null;
  unit: string | null;
  rate?: number | null;
  amount?: number | null;
  currentSystem?: string | null;
  currentCategory?: string | null;
};

type AiClassificationOutput = {
  item_id: string;
  system_name: string;
  category_name: string;
  supplier_type: string;
  confidence_score: number;
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

function clampConfidence(value: unknown) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 0.62;
  }

  return Math.min(0.98, Math.max(0.2, numericValue));
}

function normalizeAiClassification(item: AiBoqItemInput, output?: Partial<AiClassificationOutput>) {
  if (!output?.system_name || !output.category_name) {
    return classifyBoqSystem(item.description, item.currentSystem, item.currentCategory);
  }

  return {
    categoryName: String(output.category_name).trim() || "Needs review",
    confidenceScore: clampConfidence(output.confidence_score),
    supplierType: String(output.supplier_type || "Specialist supplier").trim(),
    systemName: String(output.system_name).trim() || "Needs Review",
  } satisfies SystemClassification;
}

export async function classifyBoqItemsWithAi(items: AiBoqItemInput[]) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || items.length === 0) {
    return {
      classifications: new Map<string, SystemClassification>(),
      error: apiKey ? null : "OPENAI_API_KEY is not configured.",
    };
  }

  const knownSystems = Array.from(
    new Map(getSystemRuleOptions().map((option) => [option.systemName, option])).values(),
  );
  const model = process.env.OPENAI_CLASSIFICATION_MODEL || "gpt-4o-mini";
  const response = await fetch("https://api.openai.com/v1/responses", {
    body: JSON.stringify({
      input: [
        {
          content: [
            {
              text: `You classify BOQ / bill of quantities line items for an industry-agnostic estimation and procurement workspace.

Rules:
- Classify by the product or work described, not by the project type.
- Support Georgian, English, Russian, and mixed-language descriptions.
- Prefer a specific system and category whenever the description contains a recognizable product, material, equipment, or work scope.
- Use "Needs Review" only when the item is truly impossible to classify from the text.
- Keep system names industry-agnostic and procurement-friendly.
- You may use one of these known systems when suitable: ${knownSystems
                .map((option) => `${option.systemName} (${option.categoryName})`)
                .join(", ")}.
- You may create a better generic system/category when none of the known systems fit.
- Return JSON only.`,
              type: "input_text",
            },
            {
              text: JSON.stringify({
                items: items.map((item) => ({
                  amount: item.amount,
                  current_category: item.currentCategory,
                  current_system: item.currentSystem,
                  description: item.description,
                  id: item.id,
                  quantity: item.quantity,
                  rate: item.rate,
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
      temperature: 0.1,
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
                    category_name: { type: "string" },
                    confidence_score: { maximum: 1, minimum: 0, type: "number" },
                    item_id: { type: "string" },
                    supplier_type: { type: "string" },
                    system_name: { type: "string" },
                  },
                  required: ["item_id", "system_name", "category_name", "supplier_type", "confidence_score"],
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
  });

  if (!response.ok) {
    const errorText = await response.text();

    return {
      classifications: new Map<string, SystemClassification>(),
      error: `OpenAI classification failed: ${response.status} ${errorText}`,
    };
  }

  const payload = (await response.json()) as OpenAITextResponse;
  const responseText = getResponseText(payload);

  if (!responseText) {
    return {
      classifications: new Map<string, SystemClassification>(),
      error: "OpenAI classification returned an empty response.",
    };
  }

  try {
    const parsed = JSON.parse(responseText) as { classifications?: AiClassificationOutput[] };
    const classifications = new Map<string, SystemClassification>();

    for (const item of items) {
      const output = parsed.classifications?.find((classification) => classification.item_id === item.id);

      classifications.set(item.id, normalizeAiClassification(item, output));
    }

    return { classifications, error: null };
  } catch (error) {
    return {
      classifications: new Map<string, SystemClassification>(),
      error: error instanceof Error ? error.message : "Could not parse OpenAI classification response.",
    };
  }
}
