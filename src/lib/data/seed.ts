import type { Db } from "./types";

/**
 * Config seed — the real, non-transactional setup for STG Groups:
 *   • 3 companies (rentals + infra share one GSTIN; trading has its own)
 *   • the marketing-exec users (real contacts)
 *   • product catalogs with portal-keyword synonyms for smart routing
 *   • empty targets (goals set by the MD; achieved starts at 0)
 *
 * No sample leads / quotations / payments — the CRM starts clean and is filled
 * with real data through the app. GSTINs, addresses and bank details below are
 * placeholders to be edited in Settings with the real figures.
 */
export function buildSeed(): Db {
  return {
    companies: [
      {
        id: "stg-rentals",
        name: "STG Rentals",
        legalName: "STG Rentals",
        gstin: "29ABCDE1234F1Z5",
        quotePrefix: "STGR",
        accent: "#D81E27",
        billingAddress:
          "STG Rentals\nNo. 12, Industrial Estate, Peenya\nBengaluru, Karnataka 560058",
        bankDetails:
          "A/c Name: STG Rentals\nBank: HDFC Bank, Peenya\nA/c No: 5010 0123 4567\nIFSC: HDFC0001234",
      },
      {
        id: "stg-infra",
        name: "STG Infra Equipment",
        legalName: "STG Infra Equipment",
        gstin: "29ABCDE1234F1Z5",
        sharesGstWith: "stg-rentals",
        quotePrefix: "STGI",
        accent: "#C77900",
        billingAddress:
          "STG Infra Equipment\nNo. 12, Industrial Estate, Peenya\nBengaluru, Karnataka 560058",
        bankDetails:
          "A/c Name: STG Infra Equipment\nBank: HDFC Bank, Peenya\nA/c No: 5010 0987 6543\nIFSC: HDFC0001234",
      },
      {
        id: "stg-trading",
        name: "STG Trading Corporation",
        legalName: "STG Trading Corporation",
        gstin: "29ZZTTR5678K1Z2",
        quotePrefix: "STGT",
        accent: "#1769C0",
        billingAddress:
          "STG Trading Corporation\nNo. 47, Auto Spares Market, Yeshwanthpur\nBengaluru, Karnataka 560022",
        bankDetails:
          "A/c Name: STG Trading Corporation\nBank: ICICI Bank, Yeshwanthpur\nA/c No: 6020 1122 3344\nIFSC: ICIC0006020",
      },
    ],

    categories: [
      { id: "c-boom", companyId: "stg-rentals", name: "Boom Lift", synonyms: ["boom lift", "boomlift", "articulating boom", "telescopic boom", "cherry picker", "aerial boom"] },
      { id: "c-scissor", companyId: "stg-rentals", name: "Scissor Lift", synonyms: ["scissor lift", "scissorlift", "scissor platform", "scissor"] },
      { id: "c-man", companyId: "stg-rentals", name: "Man Lift", synonyms: ["man lift", "manlift", "personnel lift", "vertical mast", "single man lift"] },
      { id: "c-spider", companyId: "stg-rentals", name: "Spider Lift", synonyms: ["spider lift", "spiderlift", "tracked lift", "crawler lift"] },
      { id: "c-grader", companyId: "stg-infra", name: "Motor Grader", synonyms: ["motor grader", "grader", "road grader"] },
      { id: "c-vroller", companyId: "stg-infra", name: "Vibratory Roller", synonyms: ["vibratory roller", "vibro roller", "compactor roller", "drum roller"] },
      { id: "c-soil", companyId: "stg-infra", name: "Soil Compactor", synonyms: ["soil compactor", "soil compacter", "padfoot compactor", "sheep foot"] },
      { id: "c-tandem", companyId: "stg-infra", name: "Mini Tandem Roller", synonyms: ["mini tandem roller", "tandem roller", "tandem compactor", "baby roller"] },
      { id: "c-mixer", companyId: "stg-infra", name: "Self Loading Concrete Mixer", synonyms: ["self loading concrete mixer", "self loading mixer", "concrete mixer", "slcm", "mobile mixer"] },
      { id: "c-tyres", companyId: "stg-trading", name: "Tyres", synonyms: ["tyre", "tyres", "tire", "tires", "otr tyre"] },
      { id: "c-filters", companyId: "stg-trading", name: "Filters", synonyms: ["filter", "filters", "air filter", "oil filter", "fuel filter", "hydraulic filter"] },
    ],

    users: [
      { id: "u-md", name: "Managing Director", email: "stggroups2008smm@gmail.com", phone: "9000000000", role: "super_admin", companyId: null, title: "Super Admin / MD" },
      { id: "u-sanjay", name: "Sanjay", email: "rentals@stggroups.co.in", phone: "8939205909", role: "exec", companyId: "stg-rentals", title: "Marketing Executive — STG Rentals" },
      { id: "u-infra", name: "Infra Executive", email: "infra@stggroups.co.in", phone: "8939205900", role: "exec", companyId: "stg-infra", title: "Marketing Executive — STG Infra" },
      { id: "u-naveen", name: "Naveen", email: "stgtradingcooperation2026@gmail.com", phone: "9884115099", role: "exec", companyId: "stg-trading", title: "Marketing Executive — STG Trading" },
    ],

    // Targets are config (goals set by the MD); progress starts at zero.
    targets: [
      { userId: "u-sanjay", period: "Jun 2026", goal: 12, achieved: 0 },
      { userId: "u-infra", period: "Jun 2026", goal: 8, achieved: 0 },
      { userId: "u-naveen", period: "Jun 2026", goal: 10, achieved: 0 },
    ],

    // Transactional data starts empty — filled through the app.
    leads: [],
    activities: [],
    requirements: [],
    quotations: [],
    proformaInvoices: [],
    taxInvoices: [],
    payments: [],
    followUps: [],
    negotiations: [],
    notInterested: [],
    siteVisits: [],
    unserved: [],
    statusHistory: [],
  };
}
