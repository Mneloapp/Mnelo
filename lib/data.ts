export type ProjectStatus = "Estimating" | "Procurement" | "Awarded";

export type BoqItem = {
  id: string;
  system: string;
  description: string;
  quantity: number;
  unit: string;
  unitRate: number;
  confidence: number;
  supplier: string;
};

export type Project = {
  id: string;
  name: string;
  client: string;
  location: string;
  status: ProjectStatus;
  updatedAt: string;
  value: string;
  progress: number;
  drawings: number;
  trade: string;
  risk: "Low" | "Medium" | "High";
  boq: BoqItem[];
};

export const projects: Project[] = [
  {
    id: "downtown-medical-center",
    name: "Downtown Medical Center",
    client: "Helio Health Group",
    location: "Austin, TX",
    status: "Estimating",
    updatedAt: "2 hours ago",
    value: "$4.8M",
    progress: 78,
    drawings: 148,
    trade: "Mechanical + Electrical",
    risk: "Medium",
    boq: [
      {
        id: "M-104",
        system: "HVAC",
        description: "Variable air volume terminal with reheat coil",
        quantity: 42,
        unit: "ea",
        unitRate: 1840,
        confidence: 94,
        supplier: "Trane",
      },
      {
        id: "E-221",
        system: "Electrical",
        description: "LED troffer fixture, 2x4, dimmable driver",
        quantity: 318,
        unit: "ea",
        unitRate: 128,
        confidence: 91,
        supplier: "Acuity",
      },
      {
        id: "P-048",
        system: "Plumbing",
        description: "Copper domestic cold water pipe, type L",
        quantity: 1840,
        unit: "lf",
        unitRate: 18,
        confidence: 88,
        supplier: "Ferguson",
      },
      {
        id: "FP-030",
        system: "Fire Protection",
        description: "Upright sprinkler head with escutcheon",
        quantity: 612,
        unit: "ea",
        unitRate: 32,
        confidence: 86,
        supplier: "Victaulic",
      },
    ],
  },
  {
    id: "harbor-logistics-hub",
    name: "Harbor Logistics Hub",
    client: "Northline Industrial",
    location: "Savannah, GA",
    status: "Procurement",
    updatedAt: "Yesterday",
    value: "$7.1M",
    progress: 92,
    drawings: 211,
    trade: "Electrical",
    risk: "Low",
    boq: [
      {
        id: "E-118",
        system: "Electrical",
        description: "Copper feeder cable, 600V, THHN",
        quantity: 9200,
        unit: "lf",
        unitRate: 9,
        confidence: 96,
        supplier: "Southwire",
      },
      {
        id: "E-309",
        system: "Electrical",
        description: "Panelboard, 480Y/277V, 42 circuit",
        quantity: 16,
        unit: "ea",
        unitRate: 4120,
        confidence: 93,
        supplier: "Schneider",
      },
    ],
  },
  {
    id: "westbank-residential-tower",
    name: "Westbank Residential Tower",
    client: "Crestpoint Developments",
    location: "Denver, CO",
    status: "Awarded",
    updatedAt: "3 days ago",
    value: "$11.6M",
    progress: 100,
    drawings: 326,
    trade: "Full MEP",
    risk: "Low",
    boq: [
      {
        id: "M-402",
        system: "HVAC",
        description: "Fan coil unit, concealed ceiling",
        quantity: 188,
        unit: "ea",
        unitRate: 1120,
        confidence: 95,
        supplier: "Daikin",
      },
      {
        id: "P-205",
        system: "Plumbing",
        description: "PVC sanitary waste pipe, schedule 40",
        quantity: 6400,
        unit: "lf",
        unitRate: 12,
        confidence: 92,
        supplier: "Charlotte Pipe",
      },
    ],
  },
];

export const getProject = (id: string) => projects.find((project) => project.id === id);

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
