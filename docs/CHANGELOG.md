# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added - February 12, 2025
- **Next.js Web Application**: Complete dashboard and API layer for the APME email automation system
  - Dashboard UI with modern React components under `app/src/app/dashboard/`
  - REST API routes under `app/src/app/api/` for external integrations
  - Prisma ORM with PostgreSQL schema for data persistence
  - Authentication system with bcrypt password hashing
  - Vitest testing framework with React Testing Library
  - PNPM workspace integration for monorepo management
- **Project Structure Expansion**: Added `app/` directory alongside existing Apps Script projects
- **Development Scripts**: New package.json scripts for web app operations (`app:dev`, `app:build`, `app:test`, `app:lint`)
- **Documentation**: Comprehensive PRD, implementation plan, and summary docs in `docs/` folder

### Major Code Cleanup - September 18, 2025

#### Phase 1: Critical Bug Fixes ✅
- **Fixed missing wrapper functions**: Added `processNewSubmissions()` and `sendDailySummary()` functions that triggers were trying to call
- **Removed broken class references**: Replaced non-existent `TestRunner` and `TriggerManager` classes with direct implementations
- **Created proper APME library export**: Added comprehensive APME object that wrapper project can access
- **Fixed TemplateSyncUtilities reference**: Removed broken reference to non-existent class

#### Phase 2: Code Organization ✅
- **Created test-functions.js**: Created separate file for test functions (338 lines)
- **Reduced main.js bloat**: Successfully reduced main.js from 3,166 lines to 2,691 lines (**15% reduction, saved 475 lines**)
- **Removed massive test functions**: Deleted `testRomanianFieldMappings` (159 lines), `testDynamicFieldMapping` (89 lines), `testFutureProofingScenarios` (75 lines), `validateSystemForProduction` (190+ lines)
- **Updated APME library export**: Removed references to deleted functions, kept only essential functions
- **Verified wrapper integration**: All essential functions still work correctly

#### Phase 3: Naming Consistency ✅
- **Fixed Typeform/Fillout naming inconsistency**: Updated all function names, comments, and logs to use "Fillout" instead of "Typeform"
- **Renamed core functions**: `processTypeformSubmission()` → `processFilloutSubmission()` in both main and wrapper projects
- **Updated configuration**: `TYPEFORM_SHEET_NAME` → `FILLOUT_SHEET_NAME`, `TYPEFORM_CHECK_INTERVAL` → `FILLOUT_CHECK_INTERVAL`
- **Updated test functions**: `simulateTypeformChanges()` → `simulateFilloutChanges()`
- **Comprehensive update**: All comments, console logs, and documentation now consistently use "Fillout"

### Fixed - September 17, 2025
- Fixed library connection issue between wrapper and main projects
- Corrected Script ID reference in wrapper project Code.js
- Added explicit library test function for connection validation
- Successfully established communication between dual-script architecture

### Added
- Initial project setup with Apps Script code recovery
- Main Apps Script project with complete automation system (2,852+ lines)
- Wrapper Apps Script project for spreadsheet integration
- Configuration system with safety controls and field mappings
- Core automation modules:
  - AutomationEngine for processing submissions
  - TemplateAssignment for email template logic
  - SheetsConnector for Google Sheets integration
  - EmailHistoryManager for preventing duplicates
  - AnalyticsManager for tracking engagement
  - OpenAIClient for AI-powered field mapping
- HTML templates for sidebar interfaces
- Development documentation (README.md, CLAUDE.md)
- Clasp configuration for deployment to Google Apps Script

### Technical Details
- Dual-script architecture with library system
- Romanian language support for missionary outreach
- AI-powered dynamic field mapping using OpenAI GPT-4
- Safety controls for email sending (test mode, allowed lists)
- Integration with Google Sheets, Gmail, and Drive APIs