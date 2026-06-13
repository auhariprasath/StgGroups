import type { CompanyId, ProductCategory } from "./types";

/**
 * Smart lead routing.
 *
 * Customers on JustDial / IndiaMart / phone describe the same machine in many
 * ways ("cherry picker" = boom lift, "vibro roller" = vibratory roller…). This
 * matcher normalises the free text and scores it against each category's
 * synonym list, so a lead auto-routes to the right company + executive.
 *
 * Rule-based on purpose: the synonym table is editable by non-engineers and
 * fully predictable — no ML black box. Add a new keyword → routing improves.
 */

export interface RouteMatch {
  categoryId: string;
  companyId: CompanyId;
  categoryName: string;
  score: number;
  matchedKeyword: string;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

export function matchCategories(
  text: string,
  categories: ProductCategory[],
): RouteMatch[] {
  const hay = normalize(text);
  if (!hay) return [];

  const matches: RouteMatch[] = [];
  for (const cat of categories) {
    let best = 0;
    let bestKw = "";
    for (const kw of [cat.name, ...cat.synonyms]) {
      const needle = normalize(kw);
      if (!needle) continue;
      if (hay.includes(needle)) {
        // longer keyword = more specific = higher confidence
        const score = needle.split(" ").length * 10 + needle.length;
        if (score > best) {
          best = score;
          bestKw = kw;
        }
      }
    }
    if (best > 0) {
      matches.push({
        categoryId: cat.id,
        companyId: cat.companyId,
        categoryName: cat.name,
        score: best,
        matchedKeyword: bestKw,
      });
    }
  }
  return matches.sort((a, b) => b.score - a.score);
}

/** Best single guess, or null when intake can't classify (→ manual routing). */
export function bestMatch(
  text: string,
  categories: ProductCategory[],
): RouteMatch | null {
  return matchCategories(text, categories)[0] ?? null;
}
