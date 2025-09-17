#!/usr/bin/env python3
"""
Example usage patterns for the Google Sheets Reader.
These examples show how Claude Code can use the reader to analyze data.
"""

from reader import GoogleSheetsReader
from datetime import datetime, timedelta

def analyze_recent_activity(reader: GoogleSheetsReader, days: int = 7):
    """
    Analyze submission activity in the last N days.
    """
    print(f"=== Activity Analysis (Last {days} days) ===")

    # Get all submissions
    all_data = reader.get_implicare_data()
    if not all_data:
        print("No data available")
        return

    headers = all_data[0]
    rows = all_data[1:]

    # Look for timestamp column
    timestamp_cols = ['Timestamp', 'Date', 'Submitted', 'Created']
    timestamp_col = None

    for col in timestamp_cols:
        if col in headers:
            timestamp_col = col
            break

    if not timestamp_col:
        print("No timestamp column found - showing latest submissions instead")
        latest = reader.get_latest_submissions(10)
        print(f"Latest {len(latest)} submissions:")
        for i, sub in enumerate(latest, 1):
            email = sub.get('Email', 'N/A')[:30]
            print(f"  {i}. {email}")
        return

    # Count recent submissions
    recent_count = 0
    cutoff_date = datetime.now() - timedelta(days=days)

    for row in rows:
        if len(row) > headers.index(timestamp_col):
            timestamp_str = row[headers.index(timestamp_col)]
            try:
                # Try parsing common date formats
                for fmt in ['%m/%d/%Y %H:%M:%S', '%Y-%m-%d %H:%M:%S', '%m/%d/%Y']:
                    try:
                        timestamp = datetime.strptime(timestamp_str, fmt)
                        if timestamp >= cutoff_date:
                            recent_count += 1
                        break
                    except ValueError:
                        continue
            except:
                pass

    print(f"Submissions in last {days} days: {recent_count}")
    print(f"Total submissions: {len(rows)}")
    print(f"Average per day (last {days} days): {recent_count / days:.1f}")

def check_processing_status(reader: GoogleSheetsReader):
    """
    Check the processing status of submissions.
    """
    print("=== Processing Status ===")

    processed = reader.get_processed_submissions()
    unprocessed = reader.get_unprocessed_submissions()
    total = reader.get_submission_count()

    print(f"Total submissions: {total}")
    print(f"Processed: {len(processed)} ({len(processed)/total*100:.1f}%)")
    print(f"Unprocessed: {len(unprocessed)} ({len(unprocessed)/total*100:.1f}%)")

    if unprocessed:
        print(f"\nNext {min(5, len(unprocessed))} to process:")
        for i, sub in enumerate(unprocessed[:5], 1):
            email = sub.get('Email', 'N/A')[:30]
            timestamp = sub.get('Timestamp', 'N/A')[:19]
            print(f"  {i}. {timestamp} - {email}")

def analyze_email_domains(reader: GoogleSheetsReader):
    """
    Analyze the distribution of email domains.
    """
    print("=== Email Domain Analysis ===")

    all_data = reader.get_implicare_data()
    if not all_data:
        print("No data available")
        return

    headers = all_data[0]
    rows = all_data[1:]

    # Find email column
    email_col = None
    for col in ['Email', 'email', 'Email Address']:
        if col in headers:
            email_col = col
            break

    if not email_col:
        print("No email column found")
        return

    # Count domains
    domain_counts = {}
    email_col_index = headers.index(email_col)

    for row in rows:
        if len(row) > email_col_index and row[email_col_index]:
            email = row[email_col_index].strip()
            if '@' in email:
                domain = email.split('@')[1].lower()
                domain_counts[domain] = domain_counts.get(domain, 0) + 1

    # Sort by count
    sorted_domains = sorted(domain_counts.items(), key=lambda x: x[1], reverse=True)

    print(f"Total unique domains: {len(sorted_domains)}")
    print("Top 10 domains:")
    for i, (domain, count) in enumerate(sorted_domains[:10], 1):
        percentage = count / len(rows) * 100
        print(f"  {i}. {domain}: {count} ({percentage:.1f}%)")

def search_by_criteria_examples(reader: GoogleSheetsReader):
    """
    Examples of searching submissions by different criteria.
    """
    print("=== Search Examples ===")

    # Example 1: Search by partial email
    gmail_users = reader.search_submissions({"Email": "gmail"})
    print(f"Gmail users: {len(gmail_users)}")

    # Example 2: Search by partial name
    johns = reader.search_submissions({"Name": "John"})
    print(f"Submissions with 'John' in name: {len(johns)}")

    # Example 3: Get sample of each
    if gmail_users:
        print(f"Sample Gmail user: {gmail_users[0].get('Email', 'N/A')}")

    if johns:
        print(f"Sample John: {johns[0].get('Name', 'N/A')} - {johns[0].get('Email', 'N/A')}")

def main():
    """
    Run all analysis examples.
    """
    try:
        reader = GoogleSheetsReader()

        print("=== APME Implicare Data Analysis ===\n")

        # Basic info
        total = reader.get_submission_count()
        headers = reader.get_headers()
        print(f"Total submissions: {total}")
        print(f"Columns available: {len(headers)}")
        print(f"Column names: {', '.join(headers[:5])}{'...' if len(headers) > 5 else ''}\n")

        # Run analyses
        analyze_recent_activity(reader, 7)
        print()

        check_processing_status(reader)
        print()

        analyze_email_domains(reader)
        print()

        search_by_criteria_examples(reader)

    except FileNotFoundError as e:
        print(f"Error: {e}")
        print("Please complete the setup process first.")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()