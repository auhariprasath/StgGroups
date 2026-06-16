/**
 * Equipment-specific specification fields, keyed by product category.
 *
 * The brief asks that each product/service collect the right technical details
 * (a boom lift cares about reach & platform capacity; a tyre cares about size &
 * ply). These render as an extra "Specifications" group in the requirement form
 * once the lead's equipment category is known, and are stored alongside the
 * standard fields. Editable here as the catalog grows.
 */

export interface SpecField {
  key: string;
  label: string;
  placeholder?: string;
  hint?: string;
}

export const SPEC_FIELDS: Record<string, SpecField[]> = {
  // ── STG Rentals — access lifts ──
  "c-boom": [
    { key: "spec_reach", label: "Working / platform height", placeholder: "e.g. 45 ft" },
    { key: "spec_capacity", label: "Platform capacity", placeholder: "e.g. 230 kg" },
    { key: "spec_power", label: "Power type", placeholder: "Diesel / Electric / Hybrid" },
  ],
  "c-scissor": [
    { key: "spec_height", label: "Platform height", placeholder: "e.g. 12 m" },
    { key: "spec_capacity", label: "Platform capacity", placeholder: "e.g. 320 kg" },
    {
      key: "spec_power",
      label: "Indoor / Outdoor",
      placeholder: "Electric (indoor) / Diesel (rough terrain)",
    },
  ],
  "c-man": [
    { key: "spec_height", label: "Working height", placeholder: "e.g. 8 m" },
    { key: "spec_persons", label: "Capacity (persons)", placeholder: "1 / 2" },
  ],
  "c-spider": [
    { key: "spec_height", label: "Working height", placeholder: "e.g. 22 m" },
    { key: "spec_access", label: "Min. access width", placeholder: "e.g. 0.8 m gate" },
  ],
  // ── STG Infra — earth-moving / road / concrete ──
  "c-grader": [
    { key: "spec_blade", label: "Blade width", placeholder: "e.g. 3.7 m" },
    { key: "spec_power", label: "Engine power", placeholder: "e.g. 145 HP" },
  ],
  "c-vroller": [
    { key: "spec_drum", label: "Drum width", placeholder: "e.g. 2.1 m" },
    { key: "spec_weight", label: "Operating weight", placeholder: "e.g. 10 T" },
  ],
  "c-soil": [
    { key: "spec_type", label: "Drum type", placeholder: "Padfoot / Smooth" },
    { key: "spec_weight", label: "Operating weight", placeholder: "e.g. 11 T" },
  ],
  "c-tandem": [
    { key: "spec_drum", label: "Drum width", placeholder: "e.g. 1.0 m" },
    { key: "spec_weight", label: "Operating weight", placeholder: "e.g. 2.5 T" },
  ],
  "c-mixer": [
    { key: "spec_capacity", label: "Drum / batch capacity", placeholder: "e.g. 4 m³" },
    { key: "spec_output", label: "Output required", placeholder: "e.g. 12 m³/hr" },
  ],
  // ── STG Trading — spares ──
  "c-tyres": [
    { key: "spec_size", label: "Tyre size", placeholder: "e.g. 17.5-25" },
    { key: "spec_ply", label: "Ply rating / pattern", placeholder: "e.g. 16PR, L3" },
    { key: "spec_qty", label: "Quantity", placeholder: "e.g. 4" },
    { key: "spec_machine", label: "Fitted on (machine)", placeholder: "e.g. wheel loader" },
  ],
  "c-filters": [
    { key: "spec_type", label: "Filter type", placeholder: "Air / Oil / Fuel / Hydraulic" },
    { key: "spec_part", label: "Part number (if known)", placeholder: "OEM / aftermarket no." },
    { key: "spec_qty", label: "Quantity", placeholder: "e.g. 10 sets" },
    { key: "spec_machine", label: "Machine make & model", placeholder: "e.g. CAT 950H" },
  ],
};

export function specFieldsFor(categoryId: string | null | undefined): SpecField[] {
  return categoryId ? (SPEC_FIELDS[categoryId] ?? []) : [];
}

/**
 * Phase 5 — Company-specific requirement fields (Tab 0 replacement).
 * Each company gets its own set of fields that replace the generic Tab 0 fields.
 * Category-specific spec fields (from SPEC_FIELDS) are appended on top.
 */
export const COMPANY_FIELDS: Record<string, SpecField[]> = {
  "stg-rentals": [
    { key: "height", label: "Working / Platform Height", placeholder: "e.g. 45 ft" },
    { key: "capacity", label: "Capacity", placeholder: "e.g. 230 kg" },
    { key: "liftType", label: "Lift Type", placeholder: "Boom / Scissor / Spider / Man Lift" },
    { key: "duration", label: "Duration", placeholder: "e.g. 30 days" },
    { key: "operatorNeeded", label: "Operator Needed", placeholder: "Yes / No" },
    { key: "powerType", label: "Power Type", placeholder: "Diesel / Electric / Hybrid" },
    { key: "location", label: "Site Location", placeholder: "Project site address" },
  ],
  "stg-infra": [
    { key: "terrain", label: "Terrain", placeholder: "Hard ground / Soft soil / Hilly" },
    { key: "machineModel", label: "Machine Model", placeholder: "e.g. CAT 950H" },
    { key: "projectDuration", label: "Project Duration", placeholder: "e.g. 6 months" },
    { key: "siteCondition", label: "Site Condition", placeholder: "Wet / Dusty / Confined / Open" },
    { key: "operatorRequired", label: "Operator Required", placeholder: "Yes / No" },
  ],
  "stg-trading": [
    { key: "brand", label: "Brand", placeholder: "e.g. Bridgestone, Mahle" },
    { key: "productType", label: "Product Type", placeholder: "Tyres / Filters / Spares" },
    { key: "size", label: "Size", placeholder: "e.g. 17.5-25" },
    { key: "quantity", label: "Quantity", placeholder: "e.g. 4" },
    { key: "model", label: "Model / Part Number", placeholder: "e.g. CAT 950H, OEM no." },
  ],
};

export function companyFieldsFor(companyId: string): SpecField[] {
  return COMPANY_FIELDS[companyId] ?? [];
}
