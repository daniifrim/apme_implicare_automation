#!/usr/bin/env python3
"""
Google Sheets Reader for APME Implicare Automation
This script provides direct access to the Google Spreadsheet data
for Claude Code to analyze submissions and provide insights.
"""

import os
import pickle
from typing import List, Dict, Any, Optional
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# Google Sheets API scopes
SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly']

# Spreadsheet configuration
SPREADSHEET_ID = '1otbJUQAuVxVr0xIbGFXWl4Ke5fWaw1O78RNFjJcFNVo'
IMPLICARE_SHEET_NAME = 'Implicare 2.0'

class GoogleSheetsReader:
    """
    A class to read data from Google Sheets using the Google Sheets API.
    """

    def __init__(self, credentials_file: str = 'auth/credentials.json'):
        """
        Initialize the Google Sheets Reader.

        Args:
            credentials_file: Path to the OAuth2 credentials JSON file
        """
        self.credentials_file = credentials_file
        self.token_file = 'auth/token.pickle'
        self.service = None
        self._authenticate()

    def _authenticate(self):
        """
        Authenticate with Google Sheets API using OAuth2.
        """
        creds = None

        # Check if token file exists
        if os.path.exists(self.token_file):
            with open(self.token_file, 'rb') as token:
                creds = pickle.load(token)

        # If there are no (valid) credentials available, let the user log in
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                if not os.path.exists(self.credentials_file):
                    raise FileNotFoundError(
                        f"Credentials file not found at {self.credentials_file}. "
                        "Please follow the setup instructions to generate OAuth2 credentials."
                    )

                flow = InstalledAppFlow.from_client_secrets_file(
                    self.credentials_file, SCOPES)
                creds = flow.run_local_server(port=0)

            # Save the credentials for the next run
            with open(self.token_file, 'wb') as token:
                pickle.dump(creds, token)

        # Build the service
        self.service = build('sheets', 'v4', credentials=creds)

    def get_sheet_data(self, sheet_name: str, range_name: str = None) -> List[List[str]]:
        """
        Get data from a specific sheet and range.

        Args:
            sheet_name: Name of the sheet
            range_name: A1 notation range (e.g., 'A1:Z100'). If None, gets all data.

        Returns:
            List of rows, where each row is a list of cell values
        """
        try:
            if range_name:
                range_spec = f"{sheet_name}!{range_name}"
            else:
                range_spec = sheet_name

            result = self.service.spreadsheets().values().get(
                spreadsheetId=SPREADSHEET_ID,
                range=range_spec
            ).execute()

            values = result.get('values', [])
            return values

        except HttpError as error:
            print(f"An error occurred: {error}")
            return []

    def get_implicare_data(self, range_name: str = None) -> List[List[str]]:
        """
        Get data from the 'Implicare 2.0' sheet.

        Args:
            range_name: A1 notation range. If None, gets all data.

        Returns:
            List of rows from the Implicare 2.0 sheet
        """
        return self.get_sheet_data(IMPLICARE_SHEET_NAME, range_name)

    def get_headers(self, sheet_name: str = IMPLICARE_SHEET_NAME) -> List[str]:
        """
        Get the header row from a sheet.

        Args:
            sheet_name: Name of the sheet (defaults to Implicare 2.0)

        Returns:
            List of header names
        """
        data = self.get_sheet_data(sheet_name, 'A1:Z1')
        return data[0] if data else []

    def get_latest_submissions(self, n: int = 10) -> List[Dict[str, Any]]:
        """
        Get the latest n submissions from the Implicare 2.0 sheet.

        Args:
            n: Number of latest submissions to retrieve

        Returns:
            List of dictionaries representing the latest submissions
        """
        data = self.get_implicare_data()
        if not data:
            return []

        headers = data[0]
        rows = data[1:]  # Skip header row

        # Get the last n rows (most recent submissions)
        latest_rows = rows[-n:] if len(rows) >= n else rows

        # Convert to list of dictionaries
        submissions = []
        for row in latest_rows:
            # Pad row with empty strings if it's shorter than headers
            padded_row = row + [''] * (len(headers) - len(row))
            submission = dict(zip(headers, padded_row))
            submissions.append(submission)

        return submissions

    def search_submissions(self, criteria: Dict[str, str]) -> List[Dict[str, Any]]:
        """
        Search for submissions based on criteria.

        Args:
            criteria: Dictionary of column_name: search_value pairs

        Returns:
            List of matching submissions as dictionaries
        """
        data = self.get_implicare_data()
        if not data:
            return []

        headers = data[0]
        rows = data[1:]  # Skip header row

        matching_submissions = []

        for row in rows:
            # Pad row with empty strings if it's shorter than headers
            padded_row = row + [''] * (len(headers) - len(row))
            submission = dict(zip(headers, padded_row))

            # Check if this row matches all criteria
            matches = True
            for column, search_value in criteria.items():
                if column in submission:
                    if search_value.lower() not in submission[column].lower():
                        matches = False
                        break
                else:
                    matches = False
                    break

            if matches:
                matching_submissions.append(submission)

        return matching_submissions

    def get_submission_count(self) -> int:
        """
        Get the total number of submissions (excluding header).

        Returns:
            Number of submissions in the sheet
        """
        data = self.get_implicare_data()
        return len(data) - 1 if data else 0

    def get_processed_submissions(self) -> List[Dict[str, Any]]:
        """
        Get submissions that have been processed (have email status).
        Assumes there's a column that indicates email processing status.

        Returns:
            List of processed submissions
        """
        data = self.get_implicare_data()
        if not data:
            return []

        headers = data[0]
        rows = data[1:]

        processed_submissions = []

        # Look for common status column names
        status_columns = ['Status', 'Email Status', 'Processed', 'Email Sent']
        status_column = None

        for col in status_columns:
            if col in headers:
                status_column = col
                break

        if not status_column:
            # If no status column found, return all submissions
            for row in rows:
                padded_row = row + [''] * (len(headers) - len(row))
                submission = dict(zip(headers, padded_row))
                processed_submissions.append(submission)
            return processed_submissions

        # Filter by status
        for row in rows:
            padded_row = row + [''] * (len(headers) - len(row))
            submission = dict(zip(headers, padded_row))

            if submission.get(status_column, '').strip():
                processed_submissions.append(submission)

        return processed_submissions

    def get_unprocessed_submissions(self) -> List[Dict[str, Any]]:
        """
        Get submissions that haven't been processed yet.

        Returns:
            List of unprocessed submissions
        """
        data = self.get_implicare_data()
        if not data:
            return []

        headers = data[0]
        rows = data[1:]

        unprocessed_submissions = []

        # Look for common status column names
        status_columns = ['Status', 'Email Status', 'Processed', 'Email Sent']
        status_column = None

        for col in status_columns:
            if col in headers:
                status_column = col
                break

        if not status_column:
            # If no status column found, assume all are unprocessed
            for row in rows:
                padded_row = row + [''] * (len(headers) - len(row))
                submission = dict(zip(headers, padded_row))
                unprocessed_submissions.append(submission)
            return unprocessed_submissions

        # Filter by empty status
        for row in rows:
            padded_row = row + [''] * (len(headers) - len(row))
            submission = dict(zip(headers, padded_row))

            if not submission.get(status_column, '').strip():
                unprocessed_submissions.append(submission)

        return unprocessed_submissions

def main():
    """
    Example usage of the GoogleSheetsReader.
    """
    try:
        reader = GoogleSheetsReader()

        print("=== APME Implicare Google Sheets Reader ===\n")

        # Get basic info
        total_submissions = reader.get_submission_count()
        print(f"Total submissions: {total_submissions}")

        # Get headers
        headers = reader.get_headers()
        print(f"Sheet columns: {', '.join(headers[:5])}..." if len(headers) > 5 else f"Sheet columns: {', '.join(headers)}")

        # Get latest submissions
        latest = reader.get_latest_submissions(3)
        print(f"\nLatest 3 submissions:")
        for i, submission in enumerate(latest, 1):
            print(f"  {i}. {submission.get('Timestamp', 'N/A')} - {submission.get('Email', 'N/A')}")

        # Get processed vs unprocessed
        processed = reader.get_processed_submissions()
        unprocessed = reader.get_unprocessed_submissions()
        print(f"\nProcessed submissions: {len(processed)}")
        print(f"Unprocessed submissions: {len(unprocessed)}")

    except FileNotFoundError as e:
        print(f"Error: {e}")
        print("\nPlease follow the setup instructions to configure OAuth2 credentials.")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()