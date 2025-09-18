# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an APME (Association for Missions and Evangelism) email automation system built on Google Apps Script. The system processes Typeform submissions from missionaries and automatically sends personalized follow-up emails based on user interests and responses.

## Architecture

The project uses a **dual-script architecture**:

### Main Project (`main-project/`)
- **Script ID**: `14cAHJIREVfcKY5zRtoiAwulqXqVOSHx1mX0hUPFJXqfYQwaS-r0tWDxm`
- Contains the core automation logic (~2,850 lines in main.js + 10 additional modules)
- Deployed as a library for reuse across multiple spreadsheets
- **Library ID**: `1Q32fzhqvPJytC0B2TLFruj4RRCBnNKMJy-BQJjrpoHCgvMu2b2DzaVAN`

### Wrapper Project (`wrapper-project/`)
- **Script ID**: `1AhAu_f7ob86gVECxGExu9bKqiRTtRrDR06aVF0oosr5s2mgse1-KUQEd`
- Bound to the main spreadsheet, provides menu interface
- Calls main project functions via library reference
- Creates spreadsheet menu: "🎯 Mission Emailer"

## Core Components

### Configuration (`config/settings.js`)
- **CRITICAL**: All settings in one place, including safety controls
- **Safety Mode**: `DEVELOPMENT.TEST_MODE = true` redirects all emails to test address
- Field mappings for Romanian Typeform questions to standardized keys
- Template assignments, email batching, and OpenAI integration settings

### Automation Engine (`core/automation-engine.js`)
- Main orchestrator for processing new submissions
- Handles batching, rate limiting, and error recovery
- Entry point: `AutomationEngine.processNewSubmissions()`

### Key Modules
- **Template Assignment** (`core/template-assignment.js`): Maps user responses to email templates
- **Sheets Connector** (`sheets/sheet-connector.js`): Google Sheets integration
- **Email History** (`core/email-history-manager.js`): Prevents duplicate emails
- **Analytics Manager** (`core/analytics-manager.js`): Tracks engagement metrics
- **OpenAI Client** (`utils/openai-client.js`): AI-powered field mapping for dynamic forms

## Development Commands

### Quick Deployment
```bash
npm run push-clasp          # Push both projects to Apps Script only
npm run push-clasp-github   # Push to Apps Script + commit to GitHub
```

### Individual Project Commands
```bash
npm run push-main           # Push main project only
npm run push-wrapper        # Push wrapper project only
npm run pull-main           # Pull main project from Apps Script
npm run pull-wrapper        # Pull wrapper project from Apps Script
```

### Direct Clasp Commands
```bash
cd main-project && clasp open    # Open main project in browser
cd wrapper-project && clasp open # Open wrapper project in browser
```

### Authentication
- Uses account: `mobilizare@apme.ro`
- Login: `clasp login` (should already be configured)

## Critical Safety Features

### Email Safety
- **TEST_MODE**: When enabled, all emails redirect to `DEVELOPMENT.TEST_EMAIL`
- **SAFETY_MODE**: Blocks emails to unauthorized recipients
- **ALLOWED_EMAILS**: Whitelist of emails that can receive emails even in production

### Field Mapping System
- **Primary mappings**: Exact Romanian question text matches
- **Pattern matching**: Fuzzy matching for variations
- **AI fallback**: OpenAI-powered mapping for unknown fields
- **Dynamic cache**: Stores successful mappings for reuse

## Key Integration Points

### Google Services Required
- **Sheets API v4**: Main data storage and processing
- **Gmail API v1**: Email sending
- **Drive API v3**: Template document access
- **OAuth Scopes**: Comprehensive permissions in `appsscript.json`

### External APIs
- **OpenAI GPT-4**: Dynamic field mapping for form variations
- **Typeform**: Source data from missionary interest forms

## Data Flow

1. **Form Submission**: Romanian missionaries fill Typeform
2. **Sheet Import**: Data appears in "Implicare 2.0" spreadsheet
3. **Processing**: AutomationEngine identifies unprocessed entries
4. **Field Mapping**: AI/pattern matching maps questions to standard fields
5. **Template Assignment**: Business logic determines relevant email templates
6. **Personalization**: Templates populated with user-specific data
7. **Email Sending**: Gmail API with safety controls and rate limiting
8. **Analytics**: Engagement tracking and summary reporting

## Development Notes

### When Working with Templates
- Templates stored in spreadsheet "Email Templates" sheet
- Use `{{FirstName}}`, `{{Missionary}}`, `{{EthnicGroup}}` placeholders
- Template assignment logic in `TemplateAssignment.assignTemplates()`

### When Modifying Field Mapping
- Update `SETTINGS.FIELD_MAPPING.PRIMARY` for exact matches
- Add patterns to `SETTINGS.FIELD_MAPPING.PATTERNS` for fuzzy matching
- Test with `TemplateAssignment.getFieldValue(person, fieldKey)`

### Testing
- Always verify `TEST_MODE` is enabled before running automation
- Use `testSheetsConnection()` to validate sheet access
- Check Analytics sheet for processing results

### Deployment Strategy
**Production Deployment:**
1. Use `npm run push-clasp-github` for full deployment (Apps Script + GitHub)
2. Use `npm run push-clasp` for Apps Script-only deployment during development
3. Always test in spreadsheet menu after main project changes (affects library)

**Development Workflow:**
- For feature development: Use `npm run push-clasp` to test in Apps Script
- For production releases: Use `npm run push-clasp-github` to deploy and commit

## Important Constraints
- Google Apps Script execution time limits (6 minutes)
- Gmail API daily sending limits (configured in settings)
- Romanian language support throughout the system
- GDPR compliance considerations for EU users