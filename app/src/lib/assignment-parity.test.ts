// ABOUTME: Guards parity between app assignment slugs and legacy Apps Script template names
// ABOUTME: Executes both engines on representative no-send fixtures to prevent wrong-template regressions
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { describe, expect, it } from "vitest";

import { AssignmentEngine, type NormalizedSubmission } from "@/lib/assignment-engine";

const repoRoot = path.resolve(__dirname, "../../..");

type AppsScriptRuntime = {
  SETTINGS: { TEMPLATES: Record<string, string> };
  TemplateAssignment: {
    assignTemplates: (person: Record<string, unknown>) => string[];
  };
};

type ParityCase = {
  name: string;
  appAnswers: Record<string, unknown>;
  appsScriptPerson: Record<string, unknown>;
  nextSlug: string;
  legacyName: string;
};

function loadAppsScriptRuntime(): AppsScriptRuntime {
  const settingsPath = path.join(repoRoot, "main-project/config/settings.js");
  const assignmentPath = path.join(
    repoRoot,
    "main-project/core/template-assignment.js",
  );
  const code = `${fs.readFileSync(settingsPath, "utf8")}
${fs.readFileSync(assignmentPath, "utf8")}
;({ SETTINGS, TemplateAssignment });`;

  return vm.runInNewContext(code, {
    console,
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: () => null,
      }),
    },
  }) as AppsScriptRuntime;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 50);
}

function getImportedTemplateSlugs(): Set<string> {
  const templatesDir = path.join(repoRoot, "docs/email-templates");
  return new Set(
    fs
      .readdirSync(templatesDir)
      .filter((filename) => filename.endsWith(".txt"))
      .map((filename) => slugify(filename.replace(".txt", ""))),
  );
}

function createSubmission(
  answers: Record<string, unknown>,
  overrides: Partial<NormalizedSubmission> = {},
): NormalizedSubmission {
  return {
    id: "fixture-submission",
    email: "ana@example.com",
    firstName: "Ana",
    lastName: "Popescu",
    locationType: "romania",
    city: "Cluj-Napoca",
    country: "Romania",
    church: "Test Church",
    answers,
    ...overrides,
  };
}

function createAppsScriptPerson(overrides: Record<string, unknown> = {}) {
  return {
    "Bună, cum te numești?": "Ana Popescu",
    Email: "ana@example.com",
    "Unde locuiești ?": "În România",
    "Cum ai vrea să te rogi mai mult pentru misiune? ": "Nu sunt interesat/ă",
    "Vrei să adopți în rugăciune un misionar sau un popor neatins cu Evanghelia?":
      "NU",
    "Pentru care misionar vrei să te rogi ?": "",
    "Pentru care popor vrei să te rogi ?": "",
    "Vrei să primești informații despre taberele de misiune APME ?":
      "Nu sunt interesat/ă",
    "Dorești să te implici ca voluntar APME?": "FALSE",
    "Dorești să ajuți financiar lucrările și misionarii APME?": "FALSE",
    "Vrei să fii informat(ă) despre oportunitățile de a merge pe câmpul de misiune?":
      "Nu acum, poate mai târziu",
    "Ești interesat(ă) să participi la anumite cursuri de pregătire când vor fi disponibile în zona ta?":
      "Nu sunt interesat/ă",
    "Dorești mai multe informații despre CRST (școala de misiune de la Agigea, CT)? ":
      "FALSE",
    ...overrides,
  };
}

describe("Apps Script to Next assignment parity", () => {
  const engine = new AssignmentEngine();
  const appsScript = loadAppsScriptRuntime();
  const appsScriptTemplates = appsScript.SETTINGS.TEMPLATES;
  const importedTemplateSlugs = getImportedTemplateSlugs();

  const parityCases: ParityCase[] = [
    {
      name: "missionary prayer",
      appAnswers: { prayer_method: ["missionary"] },
      appsScriptPerson: createAppsScriptPerson({
        "Vrei să adopți în rugăciune un misionar sau un popor neatins cu Evanghelia?":
          "Misionar",
        "Pentru care misionar vrei să te rogi ?": "Familia Popescu",
      }),
      nextSlug: "info-rugaciune-pentru-misionari",
      legacyName: appsScriptTemplates.PRAYER_MISSIONARY,
    },
    {
      name: "ethnic group prayer",
      appAnswers: { ethnic_group_choice: "Afgani" },
      appsScriptPerson: createAppsScriptPerson({
        "Vrei să adopți în rugăciune un misionar sau un popor neatins cu Evanghelia?":
          "Popor neatins cu Evanghelia",
        "Pentru care popor vrei să te rogi ?": "Afgani",
      }),
      nextSlug: "info-rugaciune-pentru-grup-etnic",
      legacyName: appsScriptTemplates.PRAYER_ETHNIC,
    },
    {
      name: "donation interest",
      appAnswers: { support_interests: ["donate"] },
      appsScriptPerson: createAppsScriptPerson({
        "Dorești să ajuți financiar lucrările și misionarii APME?": "TRUE",
      }),
      nextSlug: "info-donatii-apme",
      legacyName: appsScriptTemplates.DONATION_INFO,
    },
    {
      name: "short-term mission interest",
      appAnswers: { mission_interests: ["short_term"] },
      appsScriptPerson: createAppsScriptPerson({
        "Vrei să fii informat(ă) despre oportunitățile de a merge pe câmpul de misiune?":
          "Da, pe termen scurt (2-4 săptămâni)",
      }),
      nextSlug: "info-misiune-pe-termen-scurt-apme",
      legacyName: appsScriptTemplates.MISSION_SHORT_TERM,
    },
    {
      name: "camp interest",
      appAnswers: { mission_interests: ["camps"] },
      appsScriptPerson: createAppsScriptPerson({
        "Vrei să primești informații despre taberele de misiune APME ?":
          "Nu am participat, doresc informații",
      }),
      nextSlug: "info-tabere-misiune-apme",
      legacyName: appsScriptTemplates.CAMP_INFO,
    },
    {
      name: "Kairos course interest",
      appAnswers: { course_interests: ["kairos"] },
      appsScriptPerson: createAppsScriptPerson({
        "Ești interesat(ă) să participi la anumite cursuri de pregătire când vor fi disponibile în zona ta?":
          "Cursul Kairos",
      }),
      nextSlug: "info-despre-cursul-kairos",
      legacyName: appsScriptTemplates.COURSE_KAIROS,
    },
    {
      name: "Mobilizeaza course interest",
      appAnswers: { course_interests: ["mobilizeaza"] },
      appsScriptPerson: createAppsScriptPerson({
        "Ești interesat(ă) să participi la anumite cursuri de pregătire când vor fi disponibile în zona ta?":
          "Cursul Mobilizează",
      }),
      nextSlug: "info-despre-cursul-mobilizeaza",
      legacyName: appsScriptTemplates.COURSE_MOBILIZE,
    },
    {
      name: "volunteer interest",
      appAnswers: { mission_interests: ["volunteer"] },
      appsScriptPerson: createAppsScriptPerson({
        "Dorești să te implici ca voluntar APME?": "TRUE",
      }),
      nextSlug: "info-voluntariat-apme",
      legacyName: appsScriptTemplates.VOLUNTEER_INFO,
    },
  ];

  it.each(parityCases)(
    "matches Apps Script and Next decisions for $name",
    ({ appAnswers, appsScriptPerson, nextSlug, legacyName }) => {
      const nextTemplates = engine
        .assignTemplates(createSubmission(appAnswers))
        .map((result) => result.templateSlug);
      const appsScriptTemplateNames =
        appsScript.TemplateAssignment.assignTemplates(appsScriptPerson);

      expect(nextTemplates).toContain(nextSlug);
      expect(importedTemplateSlugs).toContain(nextSlug);
      expect(appsScriptTemplateNames).toContain(legacyName);
    },
  );

  it("does not assign location-only templates that are absent from the imported catalog", () => {
    expect(engine.getLocationSpecificTemplates("romania")).toEqual([]);
    expect(engine.getLocationSpecificTemplates("diaspora")).toEqual([]);
  });

  it("covers newsletter as not applicable: no newsletter template or rule exists", () => {
    const nextTemplates = engine.assignTemplates(
      createSubmission({ newsletter: true }),
    );
    const importedNewsletterTemplates = [...importedTemplateSlugs].filter((slug) =>
      slug.includes("newsletter"),
    );
    const legacyNewsletterTemplates = Object.values(appsScriptTemplates).filter(
      (templateName) => templateName.toLowerCase().includes("newsletter"),
    );

    expect(nextTemplates).toEqual([]);
    expect(importedNewsletterTemplates).toEqual([]);
    expect(legacyNewsletterTemplates).toEqual([]);
  });

  it("documents current intentional parity differences", () => {
    const results = engine.assignTemplates(
      createSubmission({ desired_role: "missionary" }),
    );

    expect(results.map((result) => result.templateSlug)).toContain(
      "info-misiune-pe-termen-lung-apme",
    );
    expect(appsScriptTemplates.MISSION_LONG_TERM).toBeUndefined();
  });
});
