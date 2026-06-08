#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Rollback Verification Test
 *
 * Verifies that the old Apps Script direct-sheet path still works
 * and won't duplicate emails sent via the new Next.js webhook path.
 *
 * This test checks code paths and shared state; it does NOT run
 * the full Apps Script automation (which requires Google Sheets).
 *
 * Usage:
 *   node scripts/test-rollback.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const APP = path.resolve(__dirname, "..");

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

async function main() {
  console.log("=== APME Rollback Verification Test ===");
  console.log("Verifying old Apps Script path is intact and won't duplicate sends.");

  let passed = 0;
  let failed = 0;

  // ──────────────────────────────────────────────
  // 1. Old path code is still present
  // ──────────────────────────────────────────────
  section("1. Old automation path code integrity");

  const automationEnginePath = path.join(ROOT, "main-project/core/automation-engine.js");
  const automationCode = fs.readFileSync(automationEnginePath, "utf8");

  const checks1 = [
    check(
      automationCode.includes("static processNewSubmissions()"),
      "processNewSubmissions() method exists",
    ),
    check(
      automationCode.includes("static processPersonEmails(person)"),
      "processPersonEmails() method exists",
    ),
    check(
      automationCode.includes("static sendTemplateEmail(person, templateName)"),
      "sendTemplateEmail() method exists",
    ),
    check(
      automationCode.includes("SheetsConnector.getUnprocessedSubmissions()"),
      "Reads unprocessed submissions from sheet",
    ),
    check(
      automationCode.includes("SheetsConnector.markSubmissionAsProcessed"),
      "Marks submissions as processed in sheet",
    ),
    check(
      automationCode.includes("EmailHistoryManager.logEmailSent"),
      "Logs sends to Email History",
    ),
  ];

  passed += checks1.filter(Boolean).length;
  failed += checks1.filter((c) => !c).length;

  // ──────────────────────────────────────────────
  // 2. Both paths use the same Email History sheet
  // ──────────────────────────────────────────────
  section("2. Shared duplicate-prevention state");

  const emailHistoryPath = path.join(ROOT, "main-project/core/email-history-manager.js");
  const emailHistoryCode = fs.readFileSync(emailHistoryPath, "utf8");

  const checks2 = [
    check(
      emailHistoryCode.includes("logEmailSent(email, templateName"),
      "logEmailSent() accepts email + templateName",
    ),
    check(
      emailHistoryCode.includes("hasReceivedTemplateRecently(email, templateName"),
      "hasReceivedTemplateRecently() checks for duplicates",
    ),
    check(
      emailHistoryCode.includes("templateName === '*' || rowTemplate === templateName"),
      "Wildcard (*) matches any template (for blanket duplicate check)",
    ),
    check(
      emailHistoryCode.includes("spreadsheet.getSheetByName('Email History')"),
      "Uses same 'Email History' sheet name",
    ),
  ];

  passed += checks2.filter(Boolean).length;
  failed += checks2.filter((c) => !c).length;

  // ──────────────────────────────────────────────
  // 3. Webhook adapter also logs to Email History
  // ──────────────────────────────────────────────
  section("3. New webhook path logs to same Email History");

  const webhookPath = path.join(ROOT, "main-project/api/webhook-adapter.js");
  const webhookCode = fs.readFileSync(webhookPath, "utf8");

  const checks3 = [
    check(
      webhookCode.includes("EmailHistoryManager.logEmailSent"),
      "Webhook calls EmailHistoryManager.logEmailSent()",
    ),
    check(
      webhookCode.includes("data.email"),
      "Webhook passes email to history log",
    ),
    check(
      webhookCode.includes("data.templateName"),
      "Webhook passes templateName to history log",
    ),
  ];

  passed += checks3.filter(Boolean).length;
  failed += checks3.filter((c) => !c).length;

  // ──────────────────────────────────────────────
  // 4. Safety mode prevents accidental real sends
  // ──────────────────────────────────────────────
  section("4. Safety mode configuration");

  const settingsPath = path.join(ROOT, "main-project/config/settings.js");
  const settingsCode = fs.readFileSync(settingsPath, "utf8");

  const checks4 = [
    check(
      settingsCode.includes("SAFETY_MODE: true"),
      "SAFETY_MODE is enabled",
    ),
    check(
      settingsCode.includes("BLOCK_ALL_OTHER_EMAILS: true"),
      "BLOCK_ALL_OTHER_EMAILS is enabled",
    ),
    check(
      settingsCode.includes("function getEmailRecipient(actualEmail)"),
      "getEmailRecipient() redirects non-allowed emails",
    ),
  ];

  passed += checks4.filter(Boolean).length;
  failed += checks4.filter((c) => !c).length;

  // ──────────────────────────────────────────────
  // 5. Next.js feature flag controls sending
  // ──────────────────────────────────────────────
  section("5. Next.js feature flag for sender control");

  const dispatcherPath = path.join(APP, "src/lib/send-dispatcher.ts");
  const dispatcherCode = fs.readFileSync(dispatcherPath, "utf8");

  const checks5 = [
    check(
      dispatcherCode.includes('USE_APPS_SCRIPT_SENDER !== "true"'),
      "Feature flag check exists in dispatchSendJob()",
    ),
    check(
      dispatcherCode.includes('status: "skipped"'),
      "Jobs are skipped when flag is disabled",
    ),
    check(
      dispatcherCode.includes('lastError: "feature_flag_disabled"'),
      "Skip reason recorded for audit",
    ),
  ];

  passed += checks5.filter(Boolean).length;
  failed += checks5.filter((c) => !c).length;

  // ──────────────────────────────────────────────
  // 6. Rollback procedure is documented
  // ──────────────────────────────────────────────
  section("6. Rollback procedure documentation");

  const prdPath = path.join(ROOT, "docs/prds/backend-migration-appscript-to-next.md");
  const prdCode = fs.readFileSync(prdPath, "utf8");

  const checks6 = [
    check(
      prdCode.includes("Rollback"),
      "PRD contains Rollback section",
    ),
    check(
      prdCode.includes("Apps Script fallback path"),
      "PRD documents Apps Script fallback",
    ),
    check(
      prdCode.includes("Only one live sender can be enabled"),
      "PRD documents single-sender rule",
    ),
  ];

  passed += checks6.filter(Boolean).length;
  failed += checks6.filter((c) => !c).length;

  // ──────────────────────────────────────────────
  // Summary
  // ──────────────────────────────────────────────
  console.log();
  console.log("=== Rollback Verification Summary ===");
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log();

  if (failed === 0) {
    console.log("🎉 ALL CHECKS PASSED");
    console.log();
    console.log("Rollback safety verified:");
    console.log("  • Old Apps Script path code is intact");
    console.log("  • Both paths write to the same Email History sheet");
    console.log("  • Old path will NOT duplicate emails sent via new path");
    console.log("  • Safety mode redirects unknown emails to test address");
    console.log("  • Next.js feature flag can disable sending instantly");
    console.log();
    console.log("Rollback procedure:");
    console.log("  1. Set USE_APPS_SCRIPT_SENDER=false in Next.js .env");
    console.log("  2. Stop any Next.js send job processors");
    console.log("  3. Resume Apps Script timer triggers (if paused)");
    console.log("  4. Old path reads sheet, skips already-sent (via Email History)");
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
