import type {
  DecisionCenterModel,
  DecisionCenterSource,
  DecisionItem,
  ProcurementDecision,
} from "@/components/decision-center/types";

export function buildDecisionCenterModel({ boqItems, projectName }: DecisionCenterSource): DecisionCenterModel {
  const itemRows = boqItems.filter((item) => item.rowType === "item");
  const reviewItems = itemRows.filter((item) => item.needsReview || item.confidenceScore < 0.82);
  const affectedItems = (reviewItems.length > 0 ? reviewItems : itemRows).slice(0, 8).map((item): DecisionItem => {
    const suggestedSystem = item.category && item.category !== "Needs Review" ? item.category : "Electrical";
    const suggestedCategory = item.subcategory && item.subcategory !== "Needs review" ? item.subcategory : "Lighting";
    const suggestedSubcategory = item.classificationSubcategory || item.inheritedSubcategory || "Light Fixtures";

    return {
      confidence: Math.max(68, Math.round((item.confidenceScore || 0.78) * 100)),
      currentClassification: `${item.category || "Unclassified"} / ${item.subcategory || "Unclassified"} / ${
        item.classificationSubcategory || "Unclassified"
      }`,
      description: item.description,
      id: item.id,
      matchReason: getMatchReason(item.description),
      quantity: `${item.quantity ?? "—"} ${item.unit || ""}`.trim(),
      suggestedClassification: `${suggestedSystem} / ${suggestedCategory} / ${suggestedSubcategory}`,
      warning: getFamilyWarning(item.description),
    };
  });
  const decisionsNeedingApproval = Math.max(1, Math.min(6, reviewItems.length || 6));
  const classifiedCount = Math.max(0, itemRows.length - reviewItems.length);

  return {
    aiStatus: itemRows.length > 0 ? Math.min(94, Math.round((classifiedCount / itemRows.length) * 100)) : 94,
    completedSummary: [
      "Parsed tender documents and BOQ source rows",
      "Prepared requirement groups from available classifications",
      "Identified decisions that need human approval before RFQ preparation",
    ],
    decisions: [
      buildClassificationDecision({ affectedItems, classifiedCount, reviewCount: reviewItems.length || decisionsNeedingApproval }),
      {
        affectedItems: [],
        affectedRequirements: 3,
        approvedOutcome: "Three requirement groups become ready for package preparation.",
        confidence: 88,
        explanation: "AI believes multiple BOQ rows describe the same purchasing needs, but source descriptions vary.",
        id: "consolidation",
        impact: "14 BOQ rows may become 3 requirements",
        primaryAction: "Review grouping",
        status: "Needs approval",
        suggestion: { category: "Requirement Groups", subcategory: "Consolidated needs", system: "Project" },
        title: "Requirement consolidation",
        type: "Consolidation Decision",
        whyAttention: "AI found duplicate source rows that may represent the same requirement.",
      },
      {
        affectedItems: [],
        affectedRequirements: 1,
        approvedOutcome: "The package becomes ready for supplier RFQ preparation.",
        confidence: 92,
        explanation: "The requirement group has enough quantity, unit, and classification data to prepare a supplier-facing package.",
        id: "package",
        impact: "1 package readiness status",
        primaryAction: "Review package",
        status: "Needs approval",
        suggestion: { category: "Package", subcategory: "Ready for RFQ", system: "Procurement" },
        title: "Package readiness",
        type: "Package Decision",
        whyAttention: "AI prepared a package, but humans approve packaging before suppliers receive requests.",
      },
      {
        affectedItems: [],
        affectedRequirements: 1,
        approvedOutcome: "RFQ recipients are approved for the next sourcing step.",
        confidence: 86,
        explanation: "Suppliers are suggested based on package type, expected scope, and likely availability.",
        id: "rfq",
        impact: "3 suggested RFQ recipients",
        primaryAction: "Review recipients",
        status: "Needs approval",
        suggestion: { category: "RFQ", subcategory: "Recipients", system: "Sourcing" },
        title: "RFQ recipients",
        type: "RFQ Decision",
        whyAttention: "AI selected possible recipients, but supplier communication requires human approval.",
      },
      {
        affectedItems: [],
        affectedRequirements: 1,
        approvedOutcome: "The selected quote can become the pricing source for tender and procurement planning.",
        confidence: 79,
        explanation: "One supplier is lower cost, while another has better lead time and clearer compliance.",
        id: "quote",
        impact: "1 commercial recommendation",
        primaryAction: "Compare quotes",
        status: "Needs review",
        suggestion: { category: "Quote", subcategory: "Commercial selection", system: "Sourcing" },
        title: "Quote recommendation",
        type: "Quote Decision",
        whyAttention: "AI found a tradeoff between price and lead time.",
        warning: "Commercial decision needs human review.",
      },
      {
        affectedItems: [],
        affectedRequirements: 2,
        approvedOutcome: "Approved requirements become ready for purchase order preparation.",
        confidence: 84,
        explanation: "Awarded project requirements have enough source data to continue into procurement.",
        id: "procurement",
        impact: "2 procurement actions",
        primaryAction: "Review PO readiness",
        status: "Needs approval",
        suggestion: { category: "Procurement", subcategory: "PO readiness", system: "Project" },
        title: "Purchase order readiness",
        type: "Procurement Decision",
        whyAttention: "AI prepared the next procurement action, but PO creation must be approved.",
      },
    ],
    projectName,
  };
}

function buildClassificationDecision({
  affectedItems,
  classifiedCount,
  reviewCount,
}: {
  affectedItems: DecisionItem[];
  classifiedCount: number;
  reviewCount: number;
}): ProcurementDecision {
  return {
    affectedItems,
    affectedRequirements: Math.max(1, Math.ceil(affectedItems.length / 4)),
    approvedOutcome: "Selected items become ready for requirement grouping and package preparation.",
    confidence: 91,
    explanation:
      "AI classified most rows automatically and isolated only the items that need approval before downstream procurement work can continue.",
    id: "classification",
    impact: `${affectedItems.length || reviewCount} items affected`,
    primaryAction: "Review Decision",
    status: "Needs approval",
    suggestion: { category: "Lighting", subcategory: "Light Fixtures", system: "Electrical" },
    title: "Lighting equipment classification",
    type: "Classification Decision",
    whyAttention: `AI classified ${classifiedCount} items automatically. ${reviewCount} items still need review before RFQ generation.`,
    warning: affectedItems.some((item) => item.warning) ? "Some affected items may have different product families." : undefined,
  };
}

function getMatchReason(description: string) {
  const markers = description.match(/\b\d+(?:[.,]\d+)?\s?(?:W|KW|V|MM|CM|M|K)\b|[Øø]\s?\d+/gi);
  if (markers?.length) {
    return `Similar classification pattern with preserved marker ${markers[0]}.`;
  }
  return "Similar wording and classification context.";
}

function getFamilyWarning(description: string) {
  const hasMultipleMarkers = (description.match(/\b\d+(?:[.,]\d+)?\s?(?:W|KW|V|MM|CM|M|K)\b|[Øø]\s?\d+/gi) || []).length > 1;
  return hasMultipleMarkers ? "Different technical markers detected. Review before approval." : undefined;
}
