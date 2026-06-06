// ABOUTME: Tests Apps Script automation contracts that protect live email routing
// ABOUTME: Verifies prayer templates and email-history idempotency stay aligned with production behavior
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../../..");

function loadSettings() {
  const settingsPath = path.join(repoRoot, "main-project/config/settings.js");
  const code = `${fs.readFileSync(settingsPath, "utf8")}; SETTINGS;`;
  return vm.runInNewContext(code, {
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: () => null,
      }),
    },
  }) as {
    TEMPLATES: Record<string, string>;
  };
}

function loadEmailHistoryManager(data: unknown[][]) {
  const managerPath = path.join(
    repoRoot,
    "main-project/core/email-history-manager.js",
  );
  const code = `${fs.readFileSync(managerPath, "utf8")}; EmailHistoryManager;`;
  const EmailHistoryManager = vm.runInNewContext(code, {
    console,
    module: { exports: {} },
    SheetsConnector: {
      getPeopleDBSpreadsheet: () => ({
        getSheetByName: () => ({
          getDataRange: () => ({
            getValues: () => data,
          }),
        }),
      }),
    },
  }) as {
    hasReceivedTemplateRecently: (
      email: string,
      templateName: string,
      daysThreshold?: number,
    ) => boolean;
  };

  return EmailHistoryManager;
}

function loadAutomationEngine(sendLog: unknown[]) {
  const enginePath = path.join(repoRoot, "main-project/core/automation-engine.js");
  const code = `${fs.readFileSync(enginePath, "utf8")}\n; AutomationEngine;`;

  return vm.runInNewContext(code, {
    console,
    Utilities: { sleep: () => undefined },
    getSetting: (key: string, fallback?: unknown) => {
      const settings: Record<string, unknown> = {
        "EMAIL.SUBJECTS.VOLUNTEER_INFO": "Voluntariat APME - Oportunități",
      };
      return settings[key] ?? fallback;
    },
    getEmailRecipient: (email: string) => `test+${email}`,
    TemplateAssignment: {
      getFieldValue: (person: Record<string, string>, key: string) => {
        const fields: Record<string, string> = {
          EMAIL: "Email",
          FIRST_NAME: "FirstName",
          CONTEXT: "Context",
        };
        return person[fields[key] ?? key] ?? null;
      },
      getPersonalizationData: () => ({ FirstName: "Ana" }),
    },
    SheetsConnector: {
      getEmailTemplates: () => [
        {
          Name: "Info Voluntariat APME",
          Doc: "https://docs.google.com/document/d/test/edit",
        },
      ],
    },
    GDocsConverter: {
      sendEmailFromGDoc: () => ({ recipient: "test+ana@example.com" }),
    },
    EmailHistoryManager: {
      logEmailSent: (...args: unknown[]) => {
        sendLog.push(args);
        return true;
      },
    },
  }) as {
    sendTemplateEmail: (
      person: Record<string, string>,
      templateName: string,
    ) => { success: boolean; recipient: string };
  };
}

describe("Apps Script automation contract", () => {
  it("routes missionary prayer interest to the missionary prayer template", () => {
    const settings = loadSettings();

    expect(settings.TEMPLATES.PRAYER_MISSIONARY).toBe(
      "Info rugăciune pentru misionari",
    );
  });

  it("routes ethnic-group prayer interest to the ethnic-group prayer template", () => {
    const settings = loadSettings();

    expect(settings.TEMPLATES.PRAYER_ETHNIC).toBe(
      "Info rugăciune pentru grup etnic",
    );
  });

  it("treats '*' as any-template match for recent email checks", () => {
    const EmailHistoryManager = loadEmailHistoryManager([
      ["Email", "TemplateName", "SentDate"],
      ["ana@example.com", "Info Voluntariat APME", new Date()],
    ]);

    expect(
      EmailHistoryManager.hasReceivedTemplateRecently(
        "ana@example.com",
        "*",
        30,
      ),
    ).toBe(true);
  });

  it("logs successful automation sends to Email History", () => {
    const sendLog: unknown[] = [];
    const AutomationEngine = loadAutomationEngine(sendLog);

    const result = AutomationEngine.sendTemplateEmail(
      {
        Email: "ana@example.com",
        FirstName: "Ana",
        Context: "Conferință",
        "Submission ID": "sub-1",
      },
      "Info Voluntariat APME",
    );

    expect(result.success).toBe(true);
    expect(sendLog).toEqual([
      [
        "ana@example.com",
        "Info Voluntariat APME",
        "Conferință",
        "sub-1",
        "Ana",
        "Sent from automation engine to test+ana@example.com",
      ],
    ]);
  });
});
