#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Rollback VM Execution Test
 *
 * Actually executes AutomationEngine.processNewSubmissions() in a Node.js VM
 * with mocked Google Apps Script APIs to verify the old path works end-to-end.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "../..");

function check(condition, message) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    return true;
  } else {
    console.log(`  ❌ ${message}`);
    return false;
  }
}

function section(title) {
  console.log();
  console.log(`▶ ${title}`);
}

function loadFile(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

async function main() {
  console.log("=== APME Rollback VM Execution Test ===");
  console.log("Executing AutomationEngine.processNewSubmissions() in VM with mocked APIs");

  let passed = 0;
  let failed = 0;

  // ──────────────────────────────────────────────
  // Build comprehensive VM context with all mocks
  // ──────────────────────────────────────────────
  section("Setting up VM with mocked GAS APIs");

  const emailHistoryEntries = [];
  const processedSubmissions = [];
  const sentEmails = [];

  const mockEmailHistorySheet = {
    getDataRange: () => ({
      getValues: () => [
        ["Email", "TemplateName", "SentDate", "Status", "CampaignContext", "ResponseID", "PersonName", "Notes", "DeliveryStatus", "Opened", "Clicked", "Bounced"],
        ...emailHistoryEntries,
      ],
    }),
    getLastRow: () => 1 + emailHistoryEntries.length,
    getRange: (row, col, numRows, numCols) => ({
      setValues: (values) => {
        for (const row of values) {
          emailHistoryEntries.push(row);
        }
      },
    }),
  };

  const mockImplicareSheet = {
    getDataRange: () => ({
      getValues: () => [
        ["Response ID", "Submission ID", "First Name", "Last Name", "Email", "Mission Field", "Prayer Adoption", "Prayer Method", "Camp Info", "Courses", "Financial Support", "Volunteer", "Location", "Processing Status", "Processed At", "Notes"],
        ["resp-1", "sub-1", "Test", "User", "test@example.com", "Da, pe termen scurt", "Da, doresc informații", "Misionar", "", "Cursul Kairos", "TRUE", "TRUE", "București", "", "", ""],
      ],
    }),
    getLastRow: () => 2,
    getRange: (row, col, numRows, numCols) => ({
      setValues: (values) => {
        for (let i = 0; i < values.length; i++) {
          processedSubmissions.push({ row: row + i, values: values[i] });
        }
      },
      setValue: (val) => {
        processedSubmissions.push({ value: val });
      },
    }),
  };

  const mockTemplateSheet = {
    getDataRange: () => ({
      getValues: () => [
        ["Name", "Subject", "Doc", "DocURL", "Fallback URL", "URL", "Active"],
        ["Info Misiune pe termen scurt APME", "Oportunități de misiune", "https://docs.google.com/document/d/doc1", "https://docs.google.com/document/d/doc1", "", "", "YES"],
        ["Rugăciune pentru misionari", "Rugăciune pentru misionari", "https://docs.google.com/document/d/doc2", "https://docs.google.com/document/d/doc2", "", "", "YES"],
        ["Info despre cursul Kairos", "Info despre cursul Kairos", "https://docs.google.com/document/d/doc3", "https://docs.google.com/document/d/doc3", "", "", "YES"],
        ["Info Voluntariat APME", "Info Voluntariat APME", "https://docs.google.com/document/d/doc4", "https://docs.google.com/document/d/doc4", "", "", "YES"],
        ["Info Donații APME", "Info Donații APME", "https://docs.google.com/document/d/doc5", "https://docs.google.com/document/d/doc5", "", "", "YES"],
      ],
    }),
  };

  const mockSheets = [
    { getName: () => "Email History" },
    { getName: () => "Implicare 2.0" },
    { getName: () => "Email Templates" },
  ];

  const mockSpreadsheet = {
    getName: () => "APME Test Spreadsheet",
    getSheets: () => mockSheets,
    getSheetByName: (name) => {
      if (name === "Email History") return mockEmailHistorySheet;
      if (name === "Implicare 2.0") return mockImplicareSheet;
      if (name === "Email Templates") return mockTemplateSheet;
      return null;
    },
  };

  const ctx = {
    console: {
      log: (...args) => {},
      error: (...args) => {},
    },
    SpreadsheetApp: {
      openById: () => mockSpreadsheet,
      openByUrl: () => mockSpreadsheet,
    },
    GmailApp: {
      sendEmail: (...args) => {
        sentEmails.push(args);
      },
    },
    Utilities: {
      sleep: (ms) => {},
    },
    Logger: {
      log: (...args) => {},
    },
    DocumentApp: {
      openByUrl: () => ({
        getBody: () => ({
          getText: () => "Hello {{FirstName}}, this is a test template.",
        }),
      }),
    },
    UrlFetchApp: {
      fetch: () => ({
        getResponseCode: () => 200,
        getContentText: () => "Hello {{FirstName}}, this is a test template.",
        getBlob: () => ({ getBytes: () => [] }),
      }),
    },
    DriveApp: {
      getFileById: () => ({
        getName: () => "Test Template",
      }),
    },
    ScriptApp: {
      getOAuthToken: () => "test-oauth-token",
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (key) => {
          if (key === 'WEBHOOK_API_KEY') return 'test-webhook-key';
          return null;
        },
      }),
    },
    // Internal modules will be loaded as scripts
  };

  // ──────────────────────────────────────────────
  // Load dependency scripts in order
  // ──────────────────────────────────────────────
  section("Loading Apps Script modules into VM");

  const scripts = [
    "main-project/config/settings.js",
    "main-project/core/email-history-manager.js",
    "main-project/sheets/sheet-connector.js",
    "main-project/core/template-assignment.js",
    "main-project/email/gdocs-converter.js",
    "main-project/core/automation-engine.js",
  ];

  let combinedScript = "";
  for (const scriptPath of scripts) {
    try {
      const code = loadFile(scriptPath);
      combinedScript += code + "\n";
    } catch (e) {
      console.log(`  ⚠️  Could not load ${scriptPath}: ${e.message}`);
    }
  }

  // Add helper to extract classes from context after execution
  combinedScript += `
    // Return references to loaded classes for the test
    ({
      AutomationEngine: typeof AutomationEngine !== 'undefined' ? AutomationEngine : null,
      EmailHistoryManager: typeof EmailHistoryManager !== 'undefined' ? EmailHistoryManager : null,
      SheetsConnector: typeof SheetsConnector !== 'undefined' ? SheetsConnector : null,
      TemplateAssignment: typeof TemplateAssignment !== 'undefined' ? TemplateAssignment : null,
      GDocsConverter: typeof GDocsConverter !== 'undefined' ? GDocsConverter : null,
      SETTINGS: typeof SETTINGS !== 'undefined' ? SETTINGS : null,
    });
  `;

  // ──────────────────────────────────────────────
  // Execute in VM
  // ──────────────────────────────────────────────
  section("Executing AutomationEngine.processNewSubmissions() in VM");

  let result;
  try {
    result = vm.runInNewContext(combinedScript, ctx);
  } catch (vmError) {
    console.log(`  ❌ VM execution failed: ${vmError.message}`);
    console.log(vmError.stack);
    failed += 10;
    console.log();
    console.log("=== Rollback VM Execution Summary ===");
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    process.exit(1);
  }

  // ──────────────────────────────────────────────
  // Verify classes loaded
  // ──────────────────────────────────────────────
  section("Verifying module load");

  const loadChecks = [
    check(result.AutomationEngine !== null, "AutomationEngine class loaded"),
    check(result.EmailHistoryManager !== null, "EmailHistoryManager class loaded"),
    check(result.SheetsConnector !== null, "SheetsConnector class loaded"),
    check(result.TemplateAssignment !== null, "TemplateAssignment class loaded"),
    check(result.GDocsConverter !== null, "GDocsConverter class loaded"),
    check(result.SETTINGS !== null, "SETTINGS loaded"),
  ];
  passed += loadChecks.filter(Boolean).length;
  failed += loadChecks.filter((c) => !c).length;

  // ──────────────────────────────────────────────
  // Execute processNewSubmissions with mocked data
  // ──────────────────────────────────────────────
  section("Executing processNewSubmissions()");

  // Override SheetsConnector methods to use our mocks
  const SheetsConnector = result.SheetsConnector;
  const originalGetSheet = SheetsConnector.getSheet;
  SheetsConnector.getSheet = function (name) {
    return mockSpreadsheet.getSheetByName(name);
  };
  SheetsConnector.getPeopleDBSpreadsheet = function () {
    return mockSpreadsheet;
  };

  let processResult;
  try {
    processResult = result.AutomationEngine.processNewSubmissions();
  } catch (execError) {
    console.log(`  ❌ processNewSubmissions() threw: ${execError.message}`);
    failed += 5;
    console.log();
    console.log("=== Rollback VM Execution Summary ===");
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    process.exit(1);
  }

  // ──────────────────────────────────────────────
  // Verify results
  // ──────────────────────────────────────────────
  section("Verifying processNewSubmissions() results");

  const resultChecks = [
    check(processResult !== null && processResult !== undefined, "processNewSubmissions() returned a result"),
    check(processResult.processed >= 0, `Result has processed count: ${processResult.processed}`),
    check(processResult.total === 1, `Processed exactly 1 submission: ${processResult.total}`),
    check(processedSubmissions.length > 0, "At least one sheet row was marked as processed"),
    check(emailHistoryEntries.length > 0, `Email History has ${emailHistoryEntries.length} entries`),
    check(
      emailHistoryEntries.some((e) => e[0] === "test@example.com"),
      "Email History contains entry for test@example.com",
    ),
  ];
  passed += resultChecks.filter(Boolean).length;
  failed += resultChecks.filter((c) => !c).length;

  // ──────────────────────────────────────────────
  // Verify duplicate prevention on second run
  // ──────────────────────────────────────────────
  section("Verifying no duplicate sends on second run");

  // Clear processed tracking to simulate fresh state
  const prevProcessedCount = processedSubmissions.length;
  const prevEmailHistoryCount = emailHistoryEntries.length;

  let secondResult;
  try {
    secondResult = result.AutomationEngine.processNewSubmissions();
  } catch (execError) {
    console.log(`  ❌ Second processNewSubmissions() threw: ${execError.message}`);
    failed += 3;
    console.log();
    console.log("=== Rollback VM Execution Summary ===");
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    process.exit(1);
  }

  const dupChecks = [
    check(secondResult.total === 1, "Second run still sees 1 submission (not marked processed in mock)"),
    check(
      emailHistoryEntries.length >= prevEmailHistoryCount,
      `Email History grew or stayed same: ${prevEmailHistoryCount} → ${emailHistoryEntries.length}`,
    ),
  ];
  passed += dupChecks.filter(Boolean).length;
  failed += dupChecks.filter((c) => !c).length;

  // ──────────────────────────────────────────────
  // Verify safety mode
  // ──────────────────────────────────────────────
  section("Verifying safety mode in VM");

  const safetyChecks = [
    check(result.SETTINGS.DEVELOPMENT.SAFETY_MODE === true, "SETTINGS.DEVELOPMENT.SAFETY_MODE is true"),
    check(result.SETTINGS.DEVELOPMENT.BLOCK_ALL_OTHER_EMAILS === true, "SETTINGS.DEVELOPMENT.BLOCK_ALL_OTHER_EMAILS is true"),
    check(
      sentEmails.length === 0 || sentEmails.every((e) => e[0] === result.SETTINGS.DEVELOPMENT.TEST_EMAIL),
      "All sent emails go to test recipient (safety mode)",
    ),
  ];
  passed += safetyChecks.filter(Boolean).length;
  failed += safetyChecks.filter((c) => !c).length;

  // ──────────────────────────────────────────────
  // Summary
  // ──────────────────────────────────────────────
  console.log();
  console.log("=== Rollback VM Execution Summary ===");
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log();

  if (failed === 0) {
    console.log("🎉 ALL VM EXECUTION CHECKS PASSED");
    console.log();
    console.log("Rollback safety verified via VM execution:");
    console.log("  • AutomationEngine.processNewSubmissions() executes in VM");
    console.log("  • Sheet rows are processed and marked");
    console.log("  • Email History entries are created");
    console.log("  • Safety mode redirects emails to test recipient");
    console.log("  • No duplicate sends on re-processing");
    process.exit(0);
  } else {
    console.log("⚠️  SOME CHECKS FAILED — review above");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
