-- CreateTable
CREATE TABLE "shadow_decisions" (
    "id" TEXT NOT NULL,
    "submission_id" TEXT,
    "email" TEXT NOT NULL,
    "app_template_slugs" JSONB NOT NULL,
    "legacy_template_names" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "reason_codes" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shadow_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "app_name" TEXT NOT NULL DEFAULT 'APME Implicare',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Bucharest',
    "date_format" TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
    "language" TEXT NOT NULL DEFAULT 'ro',
    "logo_url" TEXT,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "email_on_new_submission" BOOLEAN NOT NULL DEFAULT true,
    "email_on_assignment_failure" BOOLEAN NOT NULL DEFAULT true,
    "email_on_user_action" BOOLEAN NOT NULL DEFAULT false,
    "email_digest" TEXT NOT NULL DEFAULT 'daily',
    "push_enabled" BOOLEAN NOT NULL DEFAULT false,
    "webhook_enabled" BOOLEAN NOT NULL DEFAULT true,
    "min_password_length" INTEGER NOT NULL DEFAULT 8,
    "require_uppercase" BOOLEAN NOT NULL DEFAULT true,
    "require_numbers" BOOLEAN NOT NULL DEFAULT true,
    "require_special_chars" BOOLEAN NOT NULL DEFAULT true,
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "session_timeout" INTEGER NOT NULL DEFAULT 30,
    "max_login_attempts" INTEGER NOT NULL DEFAULT 5,
    "lockout_duration" INTEGER NOT NULL DEFAULT 30,
    "auto_process_enabled" BOOLEAN NOT NULL DEFAULT true,
    "auto_retry_enabled" BOOLEAN NOT NULL DEFAULT true,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "retry_delay" INTEGER NOT NULL DEFAULT 60,
    "processing_timeout" INTEGER NOT NULL DEFAULT 300,
    "batch_size" INTEGER NOT NULL DEFAULT 100,
    "maintenance_mode" BOOLEAN NOT NULL DEFAULT false,
    "auto_backup_enabled" BOOLEAN NOT NULL DEFAULT true,
    "backup_frequency" TEXT NOT NULL DEFAULT 'daily',
    "backup_retention_days" INTEGER NOT NULL DEFAULT 30,
    "include_attachments" BOOLEAN NOT NULL DEFAULT true,
    "last_backup_at" TIMESTAMP(3),
    "api_key" TEXT NOT NULL DEFAULT 'sk_live_apme_xxxxxxxxxxxxxxxx',
    "fillout_webhook_secret" TEXT,
    "smtp_host" TEXT,
    "smtp_port" INTEGER,
    "smtp_secure" BOOLEAN NOT NULL DEFAULT true,
    "smtp_user" TEXT,
    "smtp_from" TEXT,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "sidebar_collapsed" BOOLEAN NOT NULL DEFAULT false,
    "dense_mode" BOOLEAN NOT NULL DEFAULT false,
    "accent_color" TEXT NOT NULL DEFAULT 'blue',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shadow_decisions_submission_id_idx" ON "shadow_decisions"("submission_id");

-- CreateIndex
CREATE INDEX "shadow_decisions_email_idx" ON "shadow_decisions"("email");

-- CreateIndex
CREATE INDEX "shadow_decisions_status_idx" ON "shadow_decisions"("status");

-- CreateIndex
CREATE INDEX "shadow_decisions_created_at_idx" ON "shadow_decisions"("created_at");

-- AddForeignKey
ALTER TABLE "shadow_decisions" ADD CONSTRAINT "shadow_decisions_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
