/**
 * ABOUTME: Legacy inference rules for template assignment based on submission raw data.
 * Implements the business logic from main-project/core/template-assignment.js
 * to infer which templates should have been assigned to processed submissions
 * that don't have email history records.
 */

// Exclusions based on main-project/config/settings.js
const EXCLUSIONS = {
  MISSION_INVOLVEMENT: new Set([
    "Nu acum, poate mai târziu",
    "NU",
    "Nu am resurse financiare",
    "Nu acum,\u00a0poate mai târziu",
  ]),
  CAMP_INFO: new Set([
    "Nu sunt interesat/ă",
    "Am participat, doresc să mai fiu informat și pe viitor",
    "Nu sunt interesat/ă ",
  ]),
};

// Course to slug mapping
const COURSE_SLUG_MAP = {
  "Cursul Kairos": "info-despre-cursul-kairos",
  "Cursul Mobilizează": "info-despre-cursul-mobilizeaza",
  "Împuternicit pentru a influența":
    "info-despre-cursul-imputernicit-pentru-a-influenta",
  "Curs de coordonatori Kairos": "info-despre-cursul-de-coordonatori-kairos",
};

// Template slug to canonical name mapping
const SLUG_TO_NAME = {
  "info-misiune-pe-termen-scurt-apme": "Info Misiune pe termen scurt APME",
  "info-rugaciune-pentru-misionari": "Info rugăciune pentru misionari",
  "info-rugaciune-pentru-grup-etnic": "Info rugăciune pentru grup etnic",
  "info-tabere-misiune-apme": "Info Tabere Misiune APME",
  "info-despre-cursul-kairos": "Info despre cursul Kairos",
  "info-despre-cursul-mobilizeaza": "Info despre cursul Mobilizează",
  "info-despre-cursul-imputernicit-pentru-a-influenta":
    "Info despre cursul Împuternicit pentru a influența",
  "info-despre-cursul-de-coordonatori-kairos":
    "Info despre cursul de coordonatori Kairos",
  "info-donatii-apme": "Info Donații APME",
  "info-voluntariat-apme": "Info Voluntariat APME",
};

/**
 * Trim and normalize string values from raw data
 */
function t(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

/**
 * Check if value represents TRUE (case insensitive)
 */
function isTrue(v) {
  const s = t(v).toUpperCase();
  return s === "TRUE" || s === "DA";
}

/**
 * Infer templates that should be assigned based on raw submission data
 * @param {Object} rawData - The rawData field from submission
 * @returns {Array<{slug: string, name: string, reason: string}>} - Array of template assignments
 */
function inferTemplatesFromRawData(rawData) {
  const r = rawData || {};
  const templates = [];

  // Mission field involvement
  const missionField = t(
    r[
      "Vrei să fii informat(ă) despre oportunitățile de a merge pe câmpul de misiune?"
    ],
  );
  if (missionField && !EXCLUSIONS.MISSION_INVOLVEMENT.has(missionField)) {
    templates.push({
      slug: "info-misiune-pe-termen-scurt-apme",
      name: SLUG_TO_NAME["info-misiune-pe-termen-scurt-apme"],
      reason: "User interested in mission field opportunities",
    });
  }

  // Prayer adoption
  const prayerAdoption = t(
    r[
      "Vrei să adopți în rugăciune un misionar sau un popor neatins cu Evanghelia ?"
    ],
  );
  if (prayerAdoption === "Misionar") {
    const missionarySelection = t(r["Pentru ce misionar vrei să te rogi?"]);
    if (missionarySelection) {
      templates.push({
        slug: "info-rugaciune-pentru-misionari",
        name: SLUG_TO_NAME["info-rugaciune-pentru-misionari"],
        reason: `User wants to pray for missionary: ${missionarySelection}`,
      });
    }
  } else if (prayerAdoption === "Popor neatins cu Evanghelia") {
    const ethnicGroupSelection = t(
      r["Pentru care popor neatins vrei să te rogi?"],
    );
    if (ethnicGroupSelection) {
      templates.push({
        slug: "info-rugaciune-pentru-grup-etnic",
        name: SLUG_TO_NAME["info-rugaciune-pentru-grup-etnic"],
        reason: `User wants to pray for ethnic group: ${ethnicGroupSelection}`,
      });
    }
  }

  // Camp info
  const campInfo = t(
    r["Vrei să primești informații despre taberele de misiune APME?"],
  );
  if (campInfo && !EXCLUSIONS.CAMP_INFO.has(campInfo)) {
    templates.push({
      slug: "info-tabere-misiune-apme",
      name: SLUG_TO_NAME["info-tabere-misiune-apme"],
      reason: "User interested in camp information",
    });
  }

  // Course interest
  const courseInterest = t(
    r[
      "Ești interesat(ă) să participi la anumite cursuri de pregătire când vor fi disponibile în zona ta?"
    ],
  );
  const courseSlug = COURSE_SLUG_MAP[courseInterest];
  if (courseSlug) {
    templates.push({
      slug: courseSlug,
      name: SLUG_TO_NAME[courseSlug],
      reason: `User interested in course: ${courseInterest}`,
    });
  }

  // Financial support
  if (isTrue(r["Dorești să ajuți financiar lucrările și misionarii APME?"])) {
    templates.push({
      slug: "info-donatii-apme",
      name: SLUG_TO_NAME["info-donatii-apme"],
      reason: "User wants to support financially",
    });
  }

  // Volunteer interest
  if (isTrue(r["Dorești să te implici ca voluntar APME?"])) {
    templates.push({
      slug: "info-voluntariat-apme",
      name: SLUG_TO_NAME["info-voluntariat-apme"],
      reason: "User interested in volunteering",
    });
  }

  // Remove duplicates by slug while preserving first occurrence
  const seen = new Set();
  return templates.filter((tmpl) => {
    if (seen.has(tmpl.slug)) return false;
    seen.add(tmpl.slug);
    return true;
  });
}

/**
 * Get all template slugs that can be inferred
 * @returns {string[]} Array of slugs
 */
function getInferableTemplateSlugs() {
  return Object.keys(SLUG_TO_NAME);
}

/**
 * Get template name from slug
 * @param {string} slug
 * @returns {string|null}
 */
function getTemplateNameFromSlug(slug) {
  return SLUG_TO_NAME[slug] || null;
}

module.exports = {
  inferTemplatesFromRawData,
  getInferableTemplateSlugs,
  getTemplateNameFromSlug,
  EXCLUSIONS,
  COURSE_SLUG_MAP,
  SLUG_TO_NAME,
};
