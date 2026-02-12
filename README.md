# APME Implicare Automation

## Project Structure

```
├── app/                   # Next.js web app (dashboard + API routes + Prisma)
├── main-project/           # Main Apps Script project with core automation logic
│   ├── config/            # Configuration files
│   ├── core/             # Core automation modules
│   ├── email/            # Email handling modules
│   ├── sheets/           # Google Sheets integration
│   ├── utils/            # Utility functions
│   ├── main.js           # Main entry point
│   └── *.html            # HTML templates for sidebars
│
├── wrapper-project/       # Wrapper script bound to the spreadsheet
│   └── Code.js           # Wrapper that calls main project as library
│
└── details.md            # Project documentation
```

## Web App (Next.js)

The web app lives in `app/` and includes:
- Dashboard UI under `app/src/app/dashboard/*`
- API routes under `app/src/app/api/*`
- Prisma schema under `app/prisma/schema.prisma`

Common commands:
```bash
pnpm -C app dev
pnpm -C app test
pnpm -C app build
```

## Apps Script IDs

- **Main Project**: `14cAHJIREVfcKY5zRtoiAwulqXqVOSHx1mX0hUPFJXqfYQwaS-r0tWDxm`
- **Wrapper Project**: `1AhAu_f7ob86gVECxGExu9bKqiRTtRrDR06aVF0oosr5s2mgse1-KUQEd`
- **Library ID** (used in wrapper): `1Q32fzhqvPJytC0B2TLFruj4RRCBnNKMJy-BQJjrpoHCgvMu2b2DzaVAN`
- **Main Spreadsheet**: [Link](https://docs.google.com/spreadsheets/d/1otbJUQAuVxVr0xIbGFXWl4Ke5fWaw1O78RNFjJcFNVo/)

## Development with Clasp

### Prerequisites
- `clasp` installed globally: `npm install -g @google/clasp`
- Logged in with: `mobilizare@apme.ro`

### Working with Main Project
```bash
cd main-project
clasp pull    # Pull latest from Google Apps Script
clasp push    # Push changes to Google Apps Script
clasp open    # Open in browser
```

### Working with Wrapper Project
```bash
cd wrapper-project
clasp pull    # Pull latest from Google Apps Script
clasp push    # Push changes to Google Apps Script
clasp open    # Open in browser
```

## Important Notes

1. The wrapper project uses the main project as a library
2. Any changes to the main project need to be deployed as a new version if using library versioning
3. The wrapper is bound to the spreadsheet and provides the menu interface

## Quick Commands

```bash
# Deploy main project
cd main-project && clasp push

# Deploy wrapper
cd wrapper-project && clasp push

# Pull latest changes
cd main-project && clasp pull
cd ../wrapper-project && clasp pull
```
