/*
  Warnings:

  - A unique constraint covering the columns `[email,template_name,sent_date]` on the table `legacy_email_history` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "send_jobs" (
    "id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "template_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "send_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "send_jobs_idempotency_key_key" ON "send_jobs"("idempotency_key");

-- CreateIndex
CREATE INDEX "send_jobs_status_idx" ON "send_jobs"("status");

-- CreateIndex
CREATE INDEX "send_jobs_submission_id_idx" ON "send_jobs"("submission_id");

-- CreateIndex
CREATE INDEX "send_jobs_idempotency_key_idx" ON "send_jobs"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "legacy_email_history_email_template_name_sent_date_key" ON "legacy_email_history"("email", "template_name", "sent_date");

-- AddForeignKey
ALTER TABLE "send_jobs" ADD CONSTRAINT "send_jobs_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "send_jobs" ADD CONSTRAINT "send_jobs_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
