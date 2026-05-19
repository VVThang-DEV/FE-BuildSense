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
    suggestion: "Reallocate 4 masons from Project C (Sunrise Block, 4 days ahead) to Project A starting Monday.",
  },
  {
    id: "a2",
    severity: "medium",
    title: "Cost overrun risk on Project D",
    detail: "Cement consumption is trending 11% above estimate at Foundation phase.",
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
  status: "pending" | "approved" | "ordered" | "delivered";
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
    status: "pending",
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
    status: "pending",
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
    status: "approved",
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
    status: "ordered",
    sources: [
      { house: "Sunrise Block B", qty: 10 },
      { house: "House B — Plot 14", qty: 8 },
    ],
  },
];

export type ProjectTimeline = {
  id: string;
  name: string;
  customer: string;
  health: "on-track" | "at-risk" | "delayed";
  percent: number;
  budget: number;
  spent: number;
  start: string;
  end: string;
  phases: { name: string; start: number; end: number }[];
};

export const projects: ProjectTimeline[] = [
  {
    id: "p1",
    name: "Project A — Villa 12",
    customer: "Rakesh Iyer",
    health: "delayed",
    percent: 42,
    budget: 8500000,
    spent: 3920000,
    start: "Jun 2025",
    end: "May 2026",
    phases: [
      { name: "Foundation", start: 0, end: 20 },
      { name: "Structure", start: 20, end: 55 },
      { name: "Finishing", start: 55, end: 100 },
    ],
  },
  {
    id: "p2",
    name: "Project B — House Plot 14",
    customer: "Meera Nair",
    health: "on-track",
    percent: 47,
    budget: 6200000,
    spent: 2910000,
    start: "Jul 2025",
    end: "May 2026",
    phases: [
      { name: "Foundation", start: 0, end: 18 },
      { name: "Structure", start: 18, end: 60 },
      { name: "Finishing", start: 60, end: 100 },
    ],
  },
  {
    id: "p3",
    name: "Project C — Sunrise Block",
    customer: "Sunrise Estates",
    health: "on-track",
    percent: 71,
    budget: 14200000,
    spent: 10080000,
    start: "Feb 2025",
    end: "Mar 2026",
    phases: [
      { name: "Foundation", start: 0, end: 15 },
      { name: "Structure", start: 15, end: 55 },
      { name: "Finishing", start: 55, end: 100 },
    ],
  },
  {
    id: "p4",
    name: "Project D — Lakeview 3",
    customer: "Lakeview Holdings",
    health: "at-risk",
    percent: 28,
    budget: 9800000,
    spent: 2745000,
    start: "Aug 2025",
    end: "Jul 2026",
    phases: [
      { name: "Foundation", start: 0, end: 22 },
      { name: "Structure", start: 22, end: 65 },
      { name: "Finishing", start: 65, end: 100 },
    ],
  },
  {
    id: "p5",
    name: "Project E — Heritage Row",
    customer: "Heritage Trust",
    health: "on-track",
    percent: 88,
    budget: 11500000,
    spent: 10120000,
    start: "Oct 2024",
    end: "Jan 2026",
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
  id: string;
  name: string;
  unit?: string;
  stock?: number;
  reorderAt?: number;
  children?: MaterialNode[];
};

export const materialTree: MaterialNode[] = [
  {
    id: "steel",
    name: "Steel (Sắt)",
    children: [
      {
        id: "steel-concrete",
        name: "Concrete Steel (Sắt đổ bê tông)",
        children: [
          { id: "phi5", name: "Phi 5", unit: "kg", stock: 320, reorderAt: 150 },
          { id: "phi10", name: "Phi 10", unit: "kg", stock: 90, reorderAt: 200 },
          { id: "phi20", name: "Phi 20", unit: "kg", stock: 410, reorderAt: 150 },
        ],
      },
      { id: "steel-box", name: "Box Steel (Sắt hộp)", unit: "m", stock: 240, reorderAt: 80 },
      { id: "steel-sheet", name: "Sheet Steel (Sắt lá)", unit: "sheets", stock: 60, reorderAt: 20 },
      { id: "steel-angle", name: "Angle Steel (Sắt lờ)", unit: "m", stock: 180, reorderAt: 50 },
    ],
  },
  {
    id: "cement",
    name: "Cement (Xi măng)",
    children: [
      { id: "opc53", name: "OPC 53", unit: "bags", stock: 420, reorderAt: 100 },
      { id: "ppc", name: "PPC", unit: "bags", stock: 75, reorderAt: 80 },
    ],
  },
  {
    id: "agg",
    name: "Aggregates",
    children: [
      { id: "msand", name: "M-Sand", unit: "tonnes", stock: 22, reorderAt: 10 },
      { id: "gravel20", name: "20mm Gravel", unit: "tonnes", stock: 18, reorderAt: 10 },
    ],
  },
  {
    id: "brick",
    name: "Bricks",
    children: [
      { id: "red-clay", name: "Red Clay Brick", unit: "bricks", stock: 1200, reorderAt: 800 },
      { id: "fly-ash", name: "Fly Ash Brick", unit: "bricks", stock: 4500, reorderAt: 1500 },
    ],
  },
  {
    id: "finish",
    name: "Finishing (Late phase)",
    children: [
      { id: "door", name: "Doors", unit: "units", stock: 0, reorderAt: 5 },
      { id: "window", name: "Windows", unit: "units", stock: 0, reorderAt: 5 },
      { id: "light", name: "Light Fixtures", unit: "units", stock: 0, reorderAt: 10 },
      { id: "mirror", name: "Mirrors", unit: "units", stock: 0, reorderAt: 3 },
    ],
  },
];

export type Phase = "Foundation" | "Structure" | "Roofing" | "Finishing";

export type MaterialPlanRow = {
  materialId: string;
  materialName: string;
  qty: number;
  unit: string;
  neededAt: Phase;
  neededBy: string;
  delivered: number;
};

export const projectMaterialPlan: Record<string, MaterialPlanRow[]> = {
  p1: [
    { materialId: "opc53", materialName: "OPC 53 Cement", qty: 120, unit: "bags", neededAt: "Foundation", neededBy: "Sep 5", delivered: 120 },
    { materialId: "phi10", materialName: "Phi 10 Steel", qty: 480, unit: "kg", neededAt: "Foundation", neededBy: "Sep 8", delivered: 220 },
    { materialId: "phi20", materialName: "Phi 20 Steel", qty: 260, unit: "kg", neededAt: "Structure", neededBy: "Oct 28", delivered: 0 },
    { materialId: "red-clay", materialName: "Red Clay Bricks", qty: 4500, unit: "bricks", neededAt: "Structure", neededBy: "Nov 2", delivered: 2200 },
    { materialId: "door", materialName: "Doors", qty: 8, unit: "units", neededAt: "Finishing", neededBy: "Mar 1", delivered: 0 },
    { materialId: "light", materialName: "Light Fixtures", qty: 24, unit: "units", neededAt: "Finishing", neededBy: "Mar 10", delivered: 0 },
  ],
  p2: [
    { materialId: "opc53", materialName: "OPC 53 Cement", qty: 80, unit: "bags", neededAt: "Foundation", neededBy: "Sep 15", delivered: 80 },
    { materialId: "phi10", materialName: "Phi 10 Steel", qty: 320, unit: "kg", neededAt: "Structure", neededBy: "Oct 30", delivered: 60 },
    { materialId: "red-clay", materialName: "Red Clay Bricks", qty: 3000, unit: "bricks", neededAt: "Structure", neededBy: "Nov 5", delivered: 1200 },
    { materialId: "window", materialName: "Windows", qty: 10, unit: "units", neededAt: "Finishing", neededBy: "Mar 20", delivered: 0 },
  ],
};

export type MaterialNeed = {
  id: string;
  project: string;
  material: string;
  qty: number;
  unit: string;
  neededBy: string;
};

export const upcomingNeeds: MaterialNeed[] = [
  { id: "n1", project: "House A — Plot 7", material: "Red Clay Bricks", qty: 500, unit: "bricks", neededBy: "Oct 24" },
  { id: "n2", project: "House B — Plot 14", material: "Red Clay Bricks", qty: 300, unit: "bricks", neededBy: "Oct 25" },
  { id: "n3", project: "House C — Plot 21", material: "Red Clay Bricks", qty: 200, unit: "bricks", neededBy: "Oct 26" },
  { id: "n4", project: "Villa 12", material: "Phi 10 Steel", qty: 260, unit: "kg", neededBy: "Oct 28" },
  { id: "n5", project: "Sunrise Block B", material: "M-Sand", qty: 10, unit: "tonnes", neededBy: "Oct 27" },
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

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Project Manager" | "System Staff" | "Field Engineer" | "Customer";
  project: string;
  status: "active" | "invited" | "disabled";
};

export const users: UserRow[] = [
  { id: "u1", name: "Priya Mehta", email: "priya.admin@buildsense.ai", role: "Admin", project: "All", status: "active" },
  { id: "u2", name: "Ananya Rao", email: "ananya.pm@buildsense.ai", role: "Project Manager", project: "Villa 12, House B", status: "active" },
  { id: "u3", name: "Karthik Iyer", email: "karthik.pm@buildsense.ai", role: "Project Manager", project: "Sunrise Block", status: "active" },
  { id: "u4", name: "Vikram Shah", email: "vikram.staff@buildsense.ai", role: "System Staff", project: "All", status: "active" },
  { id: "u5", name: "Rahul Kumar", email: "rahul.site@buildsense.ai", role: "Field Engineer", project: "Villa 12", status: "active" },
  { id: "u6", name: "Sunita Devi", email: "sunita.site@buildsense.ai", role: "Field Engineer", project: "House B", status: "active" },
  { id: "u7", name: "Meera Nair", email: "meera.client@gmail.com", role: "Customer", project: "House B", status: "active" },
  { id: "u8", name: "Rakesh Iyer", email: "rakesh@gmail.com", role: "Customer", project: "Villa 12", status: "active" },
  { id: "u9", name: "Anil Verma", email: "anil.new@buildsense.ai", role: "Field Engineer", project: "Lakeview 3", status: "invited" },
];

export const attendance = [
  { id: "att1", date: "Oct 20", checkIn: "08:02", checkOut: "17:14", site: "Villa 12", hours: 9.2 },
  { id: "att2", date: "Oct 19", checkIn: "08:11", checkOut: "17:30", site: "Villa 12", hours: 9.3 },
  { id: "att3", date: "Oct 18", checkIn: "07:58", checkOut: "17:02", site: "Villa 12", hours: 9.1 },
  { id: "att4", date: "Oct 17", checkIn: "08:20", checkOut: "16:45", site: "Villa 12", hours: 8.4 },
  { id: "att5", date: "Oct 16", checkIn: "08:05", checkOut: "17:10", site: "Villa 12", hours: 9.1 },
];

export const dailyReports = [
  { date: "Oct 19", weather: "Sunny, 32°C", headcount: 24, work: "Brickwork L2 east — 1.4m raised. Internal plastering bedroom 2 complete.", blockers: "Awaiting Phi 10 steel delivery for slab." },
  { date: "Oct 18", weather: "Partly cloudy", headcount: 22, work: "Plumbing stack pipes routed ground floor. Electrical conduits passed inspection.", blockers: "—" },
];

export const alertThresholds = [
  { id: "th1", metric: "Cement variance vs. estimate", value: 10, unit: "%", severity: "high" },
  { id: "th2", metric: "Stock minimum — Phi 10", value: 200, unit: "kg", severity: "medium" },
  { id: "th3", metric: "Schedule slip per task", value: 3, unit: "days", severity: "high" },
  { id: "th4", metric: "Supplier lead time delta", value: 2, unit: "days", severity: "medium" },
  { id: "th5", metric: "Daily attendance shortfall", value: 15, unit: "%", severity: "low" },
];

export const notificationRules = [
  { id: "nr1", event: "PO awaiting approval > 24h", channels: ["Email", "In-app"], recipients: "Project Manager" },
  { id: "nr2", event: "Material stock below threshold", channels: ["Email", "SMS"], recipients: "Admin, PM" },
  { id: "nr3", event: "AI delay forecast > 3 days", channels: ["Email", "In-app", "Customer Portal"], recipients: "PM, Customer" },
  { id: "nr4", event: "Daily site report submitted", channels: ["In-app"], recipients: "PM" },
  { id: "nr5", event: "Attendance shortfall on site", channels: ["Email"], recipients: "PM, Admin" },
];

export const aiChatSeed: { role: "user" | "ai"; text: string }[] = [
  { role: "user", text: "Why is Villa 12 forecast to slip?" },
  {
    role: "ai",
    text:
      "Villa 12 is tracking 22% below masonry baseline for the last 7 days. Combined with the rain forecast (Oct 22–24) my model projects a 6-day handover slip. Two levers: (1) reallocate 4 masons from Sunrise Block (4 days ahead), (2) approve Phi 10 PO today so steel arrives before the wet window.",
  },
  { role: "user", text: "Draft a procurement email for the consolidated 1,000-brick PO." },
  {
    role: "ai",
    text:
      "Drafted. Subject: 'Consolidated PO — 1,000 Red Clay Bricks (Plots 7, 14, 21)'. Body summarises split, delivery window (Oct 24–26), and asks BuildMart to confirm by EOD. Want me to send it?",
  },
];

export const reportTemplates = [
  { id: "r1", name: "Weekly Plan vs Actual", format: "PDF", lastRun: "Oct 18, 2025" },
  { id: "r2", name: "Monthly Cost Variance", format: "Excel", lastRun: "Sep 30, 2025" },
  { id: "r3", name: "Investor Brief", format: "PDF", lastRun: "Oct 15, 2025" },
  { id: "r4", name: "Material Consumption", format: "Excel", lastRun: "Oct 17, 2025" },
];

export const scheduledReports = [
  { id: "s1", name: "Weekly Plan vs Actual", cadence: "Every Mon 08:00", recipients: "Manager group", enabled: true },
  { id: "s2", name: "Investor Brief", cadence: "1st of month 09:00", recipients: "Investors", enabled: true },
  { id: "s3", name: "Customer Progress Email", cadence: "Every Fri 17:00", recipients: "All customers", enabled: false },
];

export const wbsRows = [
  { code: "1.0", name: "Foundation", budget: 1200000, baselineStart: "Aug 1", baselineEnd: "Sep 30", actualPct: 100 },
  { code: "1.1", name: "Excavation", budget: 320000, baselineStart: "Aug 1", baselineEnd: "Aug 10", actualPct: 100 },
  { code: "1.2", name: "Footings & Plinth", budget: 880000, baselineStart: "Aug 11", baselineEnd: "Sep 30", actualPct: 100 },
  { code: "2.0", name: "Structure", budget: 3400000, baselineStart: "Oct 1", baselineEnd: "Jan 31", actualPct: 35 },
  { code: "2.1", name: "RCC framing", budget: 1900000, baselineStart: "Oct 1", baselineEnd: "Dec 15", actualPct: 48 },
  { code: "2.2", name: "Masonry", budget: 1500000, baselineStart: "Nov 1", baselineEnd: "Jan 31", actualPct: 22 },
  { code: "3.0", name: "Finishing", budget: 2800000, baselineStart: "Feb 1", baselineEnd: "Apr 30", actualPct: 0 },
];
