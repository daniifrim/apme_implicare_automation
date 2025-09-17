# Google Sheets Reader for APME Implicare Automation

This module provides direct access to the Google Spreadsheet data for Claude Code to analyze submissions and provide insights outside of the Google Apps Script environment.

## Setup Instructions

### 1. Install Python Dependencies

```bash
cd sheets-reader
pip install -r requirements.txt
```

### 2. Google Cloud Console Setup

1. **Create a Google Cloud Project** (if you don't have one):
   - Go to the [Google Cloud Console](https://console.cloud.google.com/)
   - Click "New Project"
   - Name it something like "APME-Sheets-Reader"

2. **Enable the Google Sheets API**:
   - In your project, go to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click on it and click "Enable"

3. **Create OAuth2 Credentials**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - If prompted, configure the OAuth consent screen:
     - Choose "External" user type
     - Fill in application name: "APME Sheets Reader"
     - Add your email as a test user
   - For Application type, choose "Desktop application"
   - Name it "Sheets Reader Client"
   - Download the JSON file

4. **Save Credentials**:
   - Rename the downloaded JSON file to `credentials.json`
   - Move it to the `sheets-reader/auth/` directory

### 3. Authentication

The first time you run the script, it will:
1. Open a browser window for OAuth authentication
2. Ask you to sign in with the Google account that has access to the spreadsheet
3. Grant permission to read your Google Sheets
4. Save authentication tokens for future use

### 4. Test the Connection

```bash
cd sheets-reader
python reader.py
```

This will display basic information about your spreadsheet and confirm the connection is working.

## Usage

### Import and Use the Reader

```python
from reader import GoogleSheetsReader

# Initialize the reader
reader = GoogleSheetsReader()

# Get latest submissions
latest = reader.get_latest_submissions(10)
print(f"Latest 10 submissions: {len(latest)}")

# Search for specific submissions
results = reader.search_submissions({"Email": "example@email.com"})
print(f"Found {len(results)} matching submissions")

# Get unprocessed submissions
unprocessed = reader.get_unprocessed_submissions()
print(f"Unprocessed submissions: {len(unprocessed)}")
```

### Available Methods

- `get_sheet_data(sheet_name, range_name)` - Read data from any sheet/range
- `get_implicare_data(range_name)` - Get data from "Implicare 2.0" sheet
- `get_headers(sheet_name)` - Get column headers
- `get_latest_submissions(n)` - Get the n most recent submissions
- `search_submissions(criteria)` - Search submissions by criteria
- `get_submission_count()` - Get total number of submissions
- `get_processed_submissions()` - Get submissions that have been processed
- `get_unprocessed_submissions()` - Get submissions pending processing

### Search Criteria Examples

```python
# Find submissions by email
reader.search_submissions({"Email": "john@example.com"})

# Find submissions by name (partial match)
reader.search_submissions({"Name": "John"})

# Multiple criteria
reader.search_submissions({
    "Country": "Romania",
    "Status": "Processed"
})
```

## Security Notes

- The `auth/credentials.json` file contains sensitive information and should not be committed to git
- The `auth/token.pickle` file contains authentication tokens and should also be kept private
- Both files are already added to `.gitignore`

## Troubleshooting

### "Credentials file not found"
- Make sure you've downloaded the OAuth2 credentials JSON file
- Rename it to `credentials.json` and place it in `sheets-reader/auth/`

### "Permission denied" or "Access forbidden"
- Ensure the Google account you're authenticating with has access to the spreadsheet
- Check that the Google Sheets API is enabled in your Google Cloud project

### "Invalid credentials"
- Delete the `auth/token.pickle` file and run the script again to re-authenticate

## Configuration

The script is pre-configured for the APME Implicare spreadsheet:
- **Spreadsheet ID**: `1otbJUQAuVxVr0xIbGFXWl4Ke5fWaw1O78RNFjJcFNVo`
- **Sheet Name**: `Implicare 2.0`

To use with a different spreadsheet, modify the constants in `reader.py`:
```python
SPREADSHEET_ID = 'your-spreadsheet-id'
IMPLICARE_SHEET_NAME = 'your-sheet-name'
```