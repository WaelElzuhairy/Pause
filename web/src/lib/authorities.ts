export type AuthorityType =
  | "police"
  | "legal"
  | "telecom"
  | "women_support"
  | "child_protection"
  | "mental_health"
  | "none";

export interface Authority {
  id: AuthorityType;
  name: string;
  description: string;
  useCases: string[];
  severity: ("low" | "medium" | "high" | "critical")[];
  recommendedFor: string[];
  contact: {
    phone?: string;
    website?: string;
    notes?: string;
  };
}

// ── Human Trafficking specific contacts ──────────────────────────────────────

export interface HTContact {
  id: string;
  label: string;
  sublabel?: string;
  number?: string;
  facebook?: string;
  note: string;
}

export const HT_CONTACTS: HTContact[] = [
  {
    id: "police_ht",
    label: "Police Emergency",
    sublabel: "All trafficking types",
    number: "122",
    note: "Report immediately if in immediate danger or being held against your will.",
  },
  {
    id: "nccm",
    label: "National Council for Childhood & Motherhood",
    sublabel: "Child trafficking cases",
    number: "16000",
    note: "24/7 child helpline — mandatory for any case involving a minor.",
  },
  {
    id: "serious_crimes",
    label: "Report Serious Crimes Hotline",
    number: "16100",
    note: "Dedicated hotline for reporting serious criminal activity including trafficking.",
  },
  {
    id: "nccpim",
    label: "اللجنة الوطنية لمكافحة الهجرة غير الشرعية والاتجار بالبشر",
    sublabel: "National Committee to Combat Illegal Immigration and Human Trafficking",
    facebook: "https://www.facebook.com/NCCPIMandTIP",
    note: "Educational resources and official reporting channel for human trafficking cases.",
  },
];

// ── Egypt cyberbullying authorities ──────────────────────────────────────────

export const EGYPT_AUTHORITIES: Record<AuthorityType, Authority> = {
  police: {
    id: "police",
    name: "Ministry of Interior Egypt",
    description:
      "Handles cybercrime cases including threats, blackmail, extortion, and serious harassment.",
    useCases: ["blackmail", "threat", "extortion", "serious harassment", "privacy violation"],
    severity: ["high", "critical"],
    recommendedFor: [
      "User is being threatened",
      "Private data or images may be leaked",
      "Immediate danger or coercion",
    ],
    contact: {
      phone: "122",
      website: "https://www.interior.gov.eg",
      notes: "Visit nearest police station or cybercrime unit",
    },
  },

  legal: {
    id: "legal",
    name: "Public Prosecution Egypt",
    description:
      "Handles formal legal complaints and initiates legal proceedings.",
    useCases: ["defamation", "legal dispute", "evidence submission", "cybercrime escalation"],
    severity: ["high", "critical"],
    recommendedFor: [
      "User wants to file official complaint",
      "Legal documentation needed",
      "Case requires prosecution",
    ],
    contact: {
      notes: "Submit official report through prosecution channels",
    },
  },

  telecom: {
    id: "telecom",
    name: "National Telecom Regulatory Authority",
    description:
      "Handles complaints related to telecom abuse and digital communication violations.",
    useCases: ["spam", "harassment via phone", "telecom abuse", "SMS harassment"],
    severity: ["medium", "high"],
    recommendedFor: [
      "Repeated harassment via calls or SMS",
      "Issues related to telecom providers",
    ],
    contact: {
      website: "https://www.tra.gov.eg",
      notes: "File complaint through telecom authority channels",
    },
  },

  women_support: {
    id: "women_support",
    name: "National Council for Women Egypt",
    description:
      "Provides legal and psychological support for women facing harassment or abuse.",
    useCases: ["harassment", "gender-based abuse", "online exploitation"],
    severity: ["medium", "high", "critical"],
    recommendedFor: [
      "Victim is female",
      "Gender-based harassment",
      "User needs support services alongside legal help",
    ],
    contact: {
      phone: "15115",
      website: "https://ncw.gov.eg",
      notes: "Hotline available for legal assistance and support",
    },
  },

  child_protection: {
    id: "child_protection",
    name: "National Council for Childhood and Motherhood",
    description:
      "Protects minors from abuse, exploitation, and online threats.",
    useCases: ["child abuse", "minor harassment", "online exploitation of minors"],
    severity: ["medium", "high", "critical"],
    recommendedFor: ["Victim is a minor", "Case involves child safety"],
    contact: {
      phone: "16000",
      notes: "Child helpline — available 24/7",
    },
  },

  mental_health: {
    id: "mental_health",
    name: "General Secretariat of Mental Health",
    description:
      "Provides psychological support and counseling services.",
    useCases: ["emotional distress", "anxiety", "psychological harm"],
    severity: ["low", "medium"],
    recommendedFor: [
      "User shows signs of emotional distress",
      "User needs psychological support alongside other steps",
    ],
    contact: {
      notes: "Contact through mental health support services or local clinic",
    },
  },

  none: {
    id: "none",
    name: "No Authority Escalation Needed",
    description:
      "The situation does not currently require escalation to external authorities.",
    useCases: [],
    severity: ["low"],
    recommendedFor: ["Mild discomfort", "Non-harmful interaction"],
    contact: {},
  },
};
