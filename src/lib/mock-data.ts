export const kpis = {
  totalProjects: 12,
  activeWorkforce: 148,
  budgetVariance: -3.2,
  aiAlerts: 3,
};

export type AiAlert = {
  id: string;
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  suggestion: string;
};

export const aiAlerts: AiAlert[] = [
  {
    id: "a1",
    severity: "high",
    title: "Predicted 6-day delay on Project A (Villa 12)",
    detail:
      "Current masonry pace is 22% below baseline and weather forecast shows rain Oct 22–24. Projected handover slip: 6 days.",
    suggestion:
      "Reallocate 4 masons from Project C (Sunrise Block, 4 days ahead) to Project A starting Monday.",
  },
  {
    id: "a2",
    severity: "medium",
    title: "Cost overrun risk on Project D",
    detail:
      "Cement consumption is trending 11% above estimate at Foundation phase.",
    suggestion: "Audit mix ratios at Site D and lock supplier rate for next 30 days.",
  },
  {
    id: "a3",
    severity: "low",
    title: "Supplier lead-time warning — TMT Steel",
    detail: "BuildMart lead time increased from 3 to 7 days.",
    suggestion: "Place forward order for Phi 10 & Phi 20 by Friday.",
  },
];

export type ConsolidatedPO = {
  id: string;
  item: string;
  unit: string;
  totalQty: number;
  vendor: string;
  estSavings: string;
  sources: { house: string; qty: number }[];
};

export const consolidatedPOs: ConsolidatedPO[] = [
  {
    id: "po-001",
    item: "Red Clay Bricks",
    unit: "bricks",
    totalQty: 1000,
    vendor: "BuildMart Supplies",
    estSavings: "₹4,200",
    sources: [
      { house: "House A — Plot 7", qty: 500 },
      { house: "House B — Plot 14", qty: 300 },
      { house: "House C — Plot 21", qty: 200 },
    ],
  },
  {
    id: "po-002",
    item: "OPC 53 Cement",
    unit: "bags",
    totalQty: 240,
    vendor: "UltraCem",
    estSavings: "₹3,150",
    sources: [
      { house: "Villa 12", qty: 120 },
      { house: "Sunrise Block B", qty: 80 },
      { house: "House A — Plot 7", qty: 40 },
    ],
  },
  {
    id: "po-003",
    item: "TMT Steel — Phi 10",
    unit: "kg",
    totalQty: 3200,
    vendor: "SteelOne",
    estSavings: "₹8,900",
    sources: [
      { house: "Villa 12", qty: 1800 },
      { house: "House C — Plot 21", qty: 1400 },
    ],
  },
  {
    id: "po-004",
    item: "M-Sand",
    unit: "tonnes",
    totalQty: 18,
    vendor: "GreenAggregates",
    estSavings: "₹1,800",
    sources: [
      { house: "Sunrise Block B", qty: 10 },
      { house: "House B — Plot 14", qty: 8 },
    ],
  },
];

export type ProjectTimeline = {
  id: string;
  name: string;
  health: "on-track" | "at-risk" | "delayed";
  percent: number;
  phases: { name: string; start: number; end: number }[];
};

export const projects: ProjectTimeline[] = [
  {
    id: "p1",
    name: "Project A — Villa 12",
    health: "delayed",
    percent: 42,
    phases: [
      { name: "Foundation", start: 0, end: 20 },
      { name: "Structure", start: 20, end: 55 },
      { name: "Finishing", start: 55, end: 100 },
    ],
  },
  {
    id: "p2",
    name: "Project B — House Plot 14",
    health: "on-track",
    percent: 47,
    phases: [
      { name: "Foundation", start: 0, end: 18 },
      { name: "Structure", start: 18, end: 60 },
      { name: "Finishing", start: 60, end: 100 },
    ],
  },
  {
    id: "p3",
    name: "Project C — Sunrise Block",
    health: "on-track",
    percent: 71,
    phases: [
      { name: "Foundation", start: 0, end: 15 },
      { name: "Structure", start: 15, end: 55 },
      { name: "Finishing", start: 55, end: 100 },
    ],
  },
  {
    id: "p4",
    name: "Project D — Lakeview 3",
    health: "at-risk",
    percent: 28,
    phases: [
      { name: "Foundation", start: 0, end: 22 },
      { name: "Structure", start: 22, end: 65 },
      { name: "Finishing", start: 65, end: 100 },
    ],
  },
  {
    id: "p5",
    name: "Project E — Heritage Row",
    health: "on-track",
    percent: 88,
    phases: [
      { name: "Foundation", start: 0, end: 15 },
      { name: "Structure", start: 15, end: 50 },
      { name: "Finishing", start: 50, end: 100 },
    ],
  },
];

export const siteTasks = [
  { id: "t1", name: "Brickwork — Level 2 East wall", percent: 60 },
  { id: "t2", name: "Internal plastering — Bedroom 1 & 2", percent: 35 },
  { id: "t3", name: "Electrical rough-in — Ground floor", percent: 80 },
  { id: "t4", name: "Plumbing — Stack pipes", percent: 20 },
];

export type MaterialNode = {
  name: string;
  required?: string;
  received?: boolean;
  children?: MaterialNode[];
};

export const materialTree: MaterialNode[] = [
  {
    name: "Steel",
    children: [
      {
        name: "Concrete Steel",
        children: [
          { name: "Phi 5", required: "120 kg", received: true },
          { name: "Phi 10", required: "480 kg", received: false },
          { name: "Phi 20", required: "260 kg", received: false },
        ],
      },
    ],
  },
  {
    name: "Cement",
    children: [
      { name: "OPC 53", required: "40 bags", received: true },
      { name: "PPC", required: "12 bags", received: false },
    ],
  },
  {
    name: "Aggregates",
    children: [
      { name: "M-Sand", required: "3 tonnes", received: true },
      { name: "20mm Gravel", required: "2 tonnes", received: true },
    ],
  },
];

export const milestones = [
  { name: "Land preparation", status: "done", date: "Jun 2025" },
  { name: "Foundation", status: "done", date: "Aug 2025" },
  { name: "Structure", status: "current", date: "In progress" },
  { name: "Roofing", status: "upcoming", date: "Jan 2026" },
  { name: "Finishing & interiors", status: "upcoming", date: "Mar 2026" },
  { name: "Handover", status: "upcoming", date: "May 2026" },
] as const;

export const customerProject = {
  house: "House B — Plot 14",
  community: "Sunrise Estates",
  percent: 47,
  handover: "May 18, 2026",
  pm: "Ananya Rao",
};

export const galleryPhotos = [
  { date: "Oct 18, 2025", url: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&q=70" },
  { date: "Oct 17, 2025", url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=70" },
  { date: "Oct 16, 2025", url: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&q=70" },
  { date: "Oct 15, 2025", url: "https://images.unsplash.com/photo-1590725140246-20acdee442be?w=800&q=70" },
  { date: "Oct 14, 2025", url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&q=70" },
  { date: "Oct 13, 2025", url: "https://images.unsplash.com/photo-1517089152318-42ec560349c0?w=800&q=70" },
];

export const customerUpdates = [
  { date: "Oct 18", text: "Level 2 east wall brickwork at 60%. On track for week close." },
  { date: "Oct 15", text: "Electrical conduits inspected and approved by site engineer." },
  { date: "Oct 12", text: "Slab curing complete. Moving to structural framing." },
];
