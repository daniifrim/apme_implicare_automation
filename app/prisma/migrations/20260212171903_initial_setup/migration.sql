-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'EDITOR', 'VIEWER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resource_id" TEXT,
    "old_value" JSONB,
    "new_value" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fillout_forms" (
    "id" TEXT NOT NULL,
    "form_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fillout_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fillout_questions" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "form_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fillout_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_mappings" (
    "id" TEXT NOT NULL,
    "canonical_key" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "description" TEXT,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "field_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "form_id" TEXT,
    "submission_time" TIMESTAMP(3) NOT NULL,
    "email" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "phone" TEXT,
    "location_type" TEXT,
    "city" TEXT,
    "country" TEXT,
    "church" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "processed_at" TIMESTAMP(3),
    "raw_data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_answers" (
    "id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "value" TEXT,
    "raw_value" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "signature" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "tags" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_versions" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "preheader" TEXT,
    "editor_state" JSONB NOT NULL,
    "html_content" TEXT NOT NULL,
    "text_content" TEXT,
    "placeholders" TEXT[],
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "published_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "template_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_variants" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "selection_type" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "condition_rules" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "template_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignments" (
    "id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "version_id" TEXT,
    "variant_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reason_codes" JSONB NOT NULL,
    "missing_fields" JSONB,
    "scheduled_at" TIMESTAMP(3),
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legacy_email_history" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "template_name" TEXT NOT NULL,
    "sent_date" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "campaign_context" TEXT,
    "response_id" TEXT,
    "person_name" TEXT,
    "notes" TEXT,
    "delivery_status" TEXT,
    "opened" TEXT DEFAULT 'UNKNOWN',
    "clicked" TEXT DEFAULT 'UNKNOWN',
    "bounced" TEXT DEFAULT 'NO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legacy_email_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_resource_resource_id_idx" ON "audit_logs"("resource", "resource_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "fillout_forms_form_id_key" ON "fillout_forms"("form_id");

-- CreateIndex
CREATE INDEX "fillout_questions_form_id_idx" ON "fillout_questions"("form_id");

-- CreateIndex
CREATE UNIQUE INDEX "fillout_questions_question_id_form_id_key" ON "fillout_questions"("question_id", "form_id");

-- CreateIndex
CREATE INDEX "field_mappings_question_id_idx" ON "field_mappings"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "field_mappings_canonical_key_key" ON "field_mappings"("canonical_key");

-- CreateIndex
CREATE UNIQUE INDEX "submissions_submission_id_key" ON "submissions"("submission_id");

-- CreateIndex
CREATE INDEX "submissions_form_id_idx" ON "submissions"("form_id");

-- CreateIndex
CREATE INDEX "submissions_submission_time_idx" ON "submissions"("submission_time");

-- CreateIndex
CREATE INDEX "submissions_email_idx" ON "submissions"("email");

-- CreateIndex
CREATE INDEX "submissions_status_idx" ON "submissions"("status");

-- CreateIndex
CREATE INDEX "submission_answers_submission_id_idx" ON "submission_answers"("submission_id");

-- CreateIndex
CREATE INDEX "submission_answers_question_id_idx" ON "submission_answers"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "submission_answers_submission_id_question_id_key" ON "submission_answers"("submission_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_event_id_key" ON "webhook_events"("event_id");

-- CreateIndex
CREATE INDEX "webhook_events_event_type_idx" ON "webhook_events"("event_type");

-- CreateIndex
CREATE INDEX "webhook_events_status_idx" ON "webhook_events"("status");

-- CreateIndex
CREATE INDEX "webhook_events_created_at_idx" ON "webhook_events"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "templates_slug_key" ON "templates"("slug");

-- CreateIndex
CREATE INDEX "templates_status_idx" ON "templates"("status");

-- CreateIndex
CREATE INDEX "template_versions_template_id_idx" ON "template_versions"("template_id");

-- CreateIndex
CREATE INDEX "template_versions_is_published_idx" ON "template_versions"("is_published");

-- CreateIndex
CREATE UNIQUE INDEX "template_versions_template_id_version_number_key" ON "template_versions"("template_id", "version_number");

-- CreateIndex
CREATE INDEX "template_variants_template_id_idx" ON "template_variants"("template_id");

-- CreateIndex
CREATE INDEX "assignments_submission_id_idx" ON "assignments"("submission_id");

-- CreateIndex
CREATE INDEX "assignments_template_id_idx" ON "assignments"("template_id");

-- CreateIndex
CREATE INDEX "assignments_status_idx" ON "assignments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "assignments_submission_id_template_id_key" ON "assignments"("submission_id", "template_id");

-- CreateIndex
CREATE INDEX "legacy_email_history_email_idx" ON "legacy_email_history"("email");

-- CreateIndex
CREATE INDEX "legacy_email_history_template_name_idx" ON "legacy_email_history"("template_name");

-- CreateIndex
CREATE INDEX "legacy_email_history_sent_date_idx" ON "legacy_email_history"("sent_date");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fillout_questions" ADD CONSTRAINT "fillout_questions_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "fillout_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_mappings" ADD CONSTRAINT "field_mappings_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "fillout_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "fillout_forms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_answers" ADD CONSTRAINT "submission_answers_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_answers" ADD CONSTRAINT "submission_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "fillout_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_versions" ADD CONSTRAINT "template_versions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_variants" ADD CONSTRAINT "template_variants_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "template_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
