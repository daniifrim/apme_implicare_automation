#!/usr/bin/env node
// ABOUTME: Re-imports CSV submissions using the updated buildAssignmentAnswersFromCsvRow logic
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const { PrismaClient } = require("@prisma/client");

const dataDir = path.join(process.cwd(), "..", "docs", "data");
const csvPath = path.join(dataDir, "implicare-data.csv");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(path.join(process.cwd(), ".env"));

function hasPositiveIntent(value) {
  if (!value) return false;
  const normalized = value.toLowerCase().trim();
  if (!normalized || normalized.includes("nu sunt interesat")) return false;
  if (normalized === "nu") return false;
  if (normalized.includes("am participat, doresc să mai fiu informat"))
    return false;
  if (normalized.includes("nu acum, poate mai târziu")) return false;
  if (normalized.includes("nu am resurse financiare")) return false;
  return normalized.includes("da") || normalized.length > 0;
}

function isStrictBooleanTrue(value) {
  if (!value) return false;
  const normalized = value.toString().trim().toUpperCase();
  return normalized === "TRUE" || normalized === "1" || normalized === "YES";
}

function uniqueValues(values) {
  return [...new Set(values)];
}

function buildAssignmentAnswersFromCsvRow(row) {
  const answers = [];
  const missionInterests = [];
  const courseInterests = [];
  const prayerMethods = [];

  const missionField = row["Vrei să fii informat(ă) despre oportunitățile de a merge pe câmpul de misiune?"];
  if (hasPositiveIntent(missionField)) {
    const normalized = missionField?.toLowerCase() ?? "";
    if (normalized.includes("termen scurt")) missionInterests.push("short_term");
    if (normalized.includes("termen lung")) {
      answers.push({
        questionId: "desired_role",
        value: missionField ?? null,
        rawValue: "missionary",
      });
    }
  }

  const campInfo = row["Vrei să primești informații despre taberele de misiune APME?"];
  if (hasPositiveIntent(campInfo)) missionInterests.push("camps");

  const volunteer = row["Dorești să te implici ca voluntar APME?"];
  if (isStrictBooleanTrue(volunteer)) missionInterests.push("volunteer");

  const donation = row["Dorești să ajuți financiar lucrările și misionarii APME?"];
  if (isStrictBooleanTrue(donation)) {
    answers.push({
      questionId: "support_interests",
      value: donation ?? null,
      rawValue: ["donate"],
    });
  }

  const courses = row["Ești interesat(ă) să participi la anumite cursuri de pregătire când vor fi disponibile în zona ta?"];
  if (hasPositiveIntent(courses)) {
    const normalized = (courses ?? "")
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    if (normalized.includes("kairos")) courseInterests.push("kairos");
    if (normalized.includes("mobilize") || normalized.includes("imputernicit")) courseInterests.push("mobilizeaza");
    if (normalized.includes("crst")) courseInterests.push("crst");
  }

  const prayerAdoption = row["Vrei să adopți în rugăciune un misionar sau un popor neatins cu Evanghelia ?"];
  if (hasPositiveIntent(prayerAdoption)) {
    const missionaryChoice = row["Pentru ce misionar vrei să te rogi?"];
    if (hasPositiveIntent(missionaryChoice)) prayerMethods.push("missionary");

    const ethnicGroupChoice = row["Pentru care popor neatins vrei să te rogi?"];
    if (hasPositiveIntent(ethnicGroupChoice)) {
      prayerMethods.push("adopt");
      answers.push({
        questionId: "ethnic_group_choice",
        value: ethnicGroupChoice ?? null,
        rawValue: ethnicGroupChoice ?? "",
      });
    }
  }

  if (missionInterests.length > 0) {
    answers.push({
      questionId: "mission_interests",
      value: uniqueValues(missionInterests).join(","),
      rawValue: uniqueValues(missionInterests),
    });
  }

  if (courseInterests.length > 0) {
    answers.push({
      questionId: "course_interests",
      value: uniqueValues(courseInterests).join(","),
      rawValue: uniqueValues(courseInterests),
    });
  }

  if (prayerMethods.length > 0) {
    answers.push({
      questionId: "prayer_method",
      value: uniqueValues(prayerMethods).join(","),
      rawValue: uniqueValues(prayerMethods),
    });
  }

  return answers;
}

async function main() {
  if (!fs.existsSync(csvPath)) {
    console.error("CSV not found:", csvPath);
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    const csvContent = fs.readFileSync(csvPath, "utf8");
    const records = parse(csvContent, { columns: true, skip_empty_lines: true });

    const form = await prisma.filloutForm.findFirst();
    if (!form) {
      console.error("No form found");
      process.exit(1);
    }

    // Get canonical question IDs
    const canonicalQuestions = {};
    for (const key of ["mission_interests", "course_interests", "support_interests", "prayer_method", "ethnic_group_choice", "desired_role"]) {
      const q = await prisma.filloutQuestion.findFirst({
        where: { questionId: key, formId: form.id },
      });
      if (q) canonicalQuestions[key] = q.id;
    }

    let updated = 0;
    let deleted = 0;
    let created = 0;

    for (const row of records) {
      const submissionId = row["Submission ID"];
      if (!submissionId) continue;

      const submission = await prisma.submission.findUnique({
        where: { submissionId },
        select: { id: true },
      });

      if (!submission) continue;

      // Delete existing canonical answers
      const canonicalQuestionIds = Object.values(canonicalQuestions);
      const delResult = await prisma.submissionAnswer.deleteMany({
        where: {
          submissionId: submission.id,
          questionId: { in: canonicalQuestionIds },
        },
      });
      deleted += delResult.count;

      // Build new canonical answers
      const newAnswers = buildAssignmentAnswersFromCsvRow(row);

      for (const answer of newAnswers) {
        const questionId = canonicalQuestions[answer.questionId];
        if (!questionId) continue;

        await prisma.submissionAnswer.create({
          data: {
            submissionId: submission.id,
            questionId: questionId,
            value: answer.value,
            rawValue: answer.rawValue,
          },
        });
        created++;
      }

      updated++;
    }

    console.log(`Updated ${updated} submissions`);
    console.log(`Deleted ${deleted} old canonical answers`);
    console.log(`Created ${created} new canonical answers`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
