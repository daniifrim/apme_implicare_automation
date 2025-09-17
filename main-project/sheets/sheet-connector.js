/**
 * Google Sheets Connector
 * Handles all interactions with Google Sheets for APME automation
 */

class SheetsConnector {
  
  /**
   * Get the People Database spreadsheet
   */
  static getPeopleDBSpreadsheet() {
    try {
      const sheetId = getSetting('SHEETS.PEOPLE_DB_ID');
      return SpreadsheetApp.openById(sheetId);
    } catch (error) {
      console.error('❌ Error opening People DB spreadsheet:', error);
      throw new Error(`Could not open People DB spreadsheet. Check SHEETS.PEOPLE_DB_ID in settings.js`);
    }
  }
  
  /**
   * Get a specific sheet from People DB
   */
  static getPeopleDBSheet(sheetName = null) {
    const spreadsheet = this.getPeopleDBSpreadsheet();
    const targetSheetName = sheetName || getSetting('SHEETS.PEOPLE_DB_SHEET_NAME');
    
    const sheet = spreadsheet.getSheetByName(targetSheetName);
    if (!sheet) {
      throw new Error(`Sheet "${targetSheetName}" not found in People DB spreadsheet`);
    }
    
    return sheet;
  }
  
  /**
   * Get Email Templates sheet
   */
  static getEmailTemplatesSheet() {
    const spreadsheet = this.getPeopleDBSpreadsheet(); // Same sheet for now
    const sheetName = getSetting('SHEETS.EMAIL_TEMPLATES_SHEET_NAME');
    
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found. Please create an "Email Templates" sheet.`);
    }
    
    return sheet;
  }
  
  /**
   * Get all people from the database
   */
  static getAllPeople() {
    try {
      const sheet = this.getPeopleDBSheet();
      const data = sheet.getDataRange().getValues();
      
      if (data.length === 0) {
        console.log('⚠️ No data found in People DB sheet');
        return [];
      }
      
      // First row is headers
      const headers = data[0];
      const people = [];
      
      // Convert each row to an object
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const person = {};
        
        headers.forEach((header, index) => {
          person[header] = row[index];
        });
        
        people.push(person);
      }
      
      console.log(`📊 Loaded ${people.length} people from database`);
      return people;
      
    } catch (error) {
      console.error('❌ Error loading people data:', error);
      throw error;
    }
  }
  
  /**
   * Get people who need email processing
   */
  static getPeopleNeedingEmailProcessing() {
    const allPeople = this.getAllPeople();
    
    // Filter for people who need processing
    // This is where you'd implement your criteria
    return allPeople.filter(person => {
      // Example criteria - adjust based on your sheet structure
      return person.Email && 
             person.FirstName && 
             !person['Emails Sent']; // Assuming you have a column tracking if emails were sent
    });
  }
  
  /**
   * Get email templates data
   */
  static getEmailTemplates() {
    try {
      const sheet = this.getEmailTemplatesSheet();
      const data = sheet.getDataRange().getValues();
      
      if (data.length === 0) {
        console.log('⚠️ No email templates found');
        return [];
      }
      
      const headers = data[0];
      const templates = [];
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const template = {};
        
        headers.forEach((header, index) => {
          template[header] = row[index];
        });
        
        // Try to extract smart chip URLs from the Doc column
        if (template.Doc && !template.Doc.includes('docs.google.com')) {
          // Try to get rich text value with link
          try {
            const range = sheet.getRange(i + 1, headers.indexOf('Doc') + 1);
            const richValue = range.getRichTextValue();
            if (richValue && richValue.getLinkUrl()) {
              template.DocURL = richValue.getLinkUrl();
              console.log(`🔗 Extracted URL from smart chip: ${template.DocURL}`);
            }
          } catch (error) {
            console.warn(`⚠️ Could not extract smart chip URL for row ${i + 1}:`, error);
          }
        }
        
        templates.push(template);
      }
      
      console.log(`📧 Loaded ${templates.length} email templates`);
      return templates;
      
    } catch (error) {
      console.error('❌ Error loading email templates:', error);
      throw error;
    }
  }
  
  /**
   * Update person's email status
   */
  static updatePersonEmailStatus(personEmail, templatesSent) {
    try {
      const sheet = this.getPeopleDBSheet();
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      
      // Find the person's row
      let personRowIndex = -1;
      for (let i = 1; i < data.length; i++) {
        const emailColumnIndex = headers.indexOf('Email');
        if (data[i][emailColumnIndex] === personEmail) {
          personRowIndex = i + 1; // +1 because sheet rows are 1-indexed
          break;
        }
      }
      
      if (personRowIndex === -1) {
        console.warn(`⚠️ Person with email ${personEmail} not found in sheet`);
        return;
      }
      
      // Update the email status columns
      const sentEmailsColumnIndex = headers.indexOf('Sent Emails');
      const lastSentDateColumnIndex = headers.indexOf('Last Sent Emails Date');
      const numSentColumnIndex = headers.indexOf('Nr Sent Emails');
      
      if (sentEmailsColumnIndex !== -1) {
        sheet.getRange(personRowIndex, sentEmailsColumnIndex + 1).setValue(templatesSent.join(', '));
      }
      
      if (lastSentDateColumnIndex !== -1) {
        sheet.getRange(personRowIndex, lastSentDateColumnIndex + 1).setValue(new Date());
      }
      
      if (numSentColumnIndex !== -1) {
        sheet.getRange(personRowIndex, numSentColumnIndex + 1).setValue(templatesSent.length);
      }
      
      console.log(`✅ Updated email status for ${personEmail}`);
      
    } catch (error) {
      console.error('❌ Error updating person email status:', error);
      throw error;
    }
  }
  
  /**
   * Get all submissions from Implicare 2.0 sheet
   */
  static getAllSubmissions() {
    try {
      const spreadsheet = this.getPeopleDBSpreadsheet();
      const submissionsSheet = spreadsheet.getSheetByName('Implicare 2.0');
      
      if (!submissionsSheet) {
        console.log('⚠️ Implicare 2.0 sheet not found');
        return [];
      }
      
      const data = submissionsSheet.getDataRange().getValues();
      
      if (data.length === 0) {
        console.log('⚠️ No data found in Implicare 2.0 sheet');
        return [];
      }
      
      // First row is headers
      const headers = data[0];
      const submissions = [];
      
      // Convert each row to an object
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const submission = {};
        
        headers.forEach((header, index) => {
          submission[header] = row[index];
        });
        
        submissions.push(submission);
      }
      
      console.log(`📊 Loaded ${submissions.length} submissions from Implicare 2.0 sheet`);
      return submissions;
      
    } catch (error) {
      console.error('❌ Error loading submissions data:', error);
      throw error;
    }
  }
  
  /**
   * Test connection to sheets
   */
  static testConnection() {
    try {
      console.log('🧪 Testing Google Sheets connection...');

      const spreadsheet = this.getPeopleDBSpreadsheet();
      console.log(`✅ Connected to spreadsheet: ${spreadsheet.getName()}`);

      const sheets = spreadsheet.getSheets();
      console.log(`📋 Available sheets: ${sheets.map(s => s.getName()).join(', ')}`);

      // Get data from Implicare 2.0 sheet instead of People DB
      const implicareSheet = spreadsheet.getSheetByName('Implicare 2.0');
      if (!implicareSheet) {
        throw new Error('Implicare 2.0 sheet not found');
      }

      const rowCount = implicareSheet.getLastRow();
      const submissionCount = Math.max(0, rowCount - 1); // Subtract header row
      console.log(`📝 Implicare 2.0 sheet has ${submissionCount} submissions`);

      // Get processing statistics
      const stats = this.getProcessingStatistics();
      console.log(`📊 Processing stats: ${stats.processed} processed, ${stats.unprocessed} unprocessed`);

      return {
        success: true,
        spreadsheetName: spreadsheet.getName(),
        sheets: sheets.map(s => s.getName()),
        submissionCount: submissionCount,
        processingStats: stats
      };

    } catch (error) {
      console.error('❌ Sheets connection test failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Batch autocorrect and overwrite emails in the Implicare 2.0 sheet using OpenAI for all emails
   */
  static async autocorrectEmailsInImplicareSheet() {
    try {
      const spreadsheet = this.getPeopleDBSpreadsheet();
      const sheet = spreadsheet.getSheetByName('Implicare 2.0');
      if (!sheet) {
        console.log('⚠️ Implicare 2.0 sheet not found');
        return 0;
      }
      const data = sheet.getDataRange().getValues();
      if (data.length === 0) {
        console.log('⚠️ No data found in Implicare 2.0 sheet');
        return 0;
      }
      const headers = data[0];
      const emailCol = headers.indexOf('Email');
      if (emailCol === -1) {
        console.log('⚠️ No Email column found');
        return 0;
      }
      // Collect all emails
      const emails = [];
      for (let i = 1; i < data.length; i++) {
        emails.push((data[i][emailCol] || '').toLowerCase().trim());
      }
      // Prepare batch prompt
      const prompt = `Here is a list of email addresses. For each, return the most likely correct, deliverable version. If it is already correct, return it as is. Output only the corrected emails, one per line, in the same order.\n\n\`
${emails.join('\n')}\n\``;
      // Call OpenAI in one batch
      const response = await OpenAIClient.callOpenAI(prompt);
      if (!response) {
        console.log('❌ No response from OpenAI for batch email correction');
        return 0;
      }
      // Parse AI response
      const correctedEmails = response
        .replace(/^[^\w]*|[^\w]*$/g, '') // Remove leading/trailing non-word chars
        .split(/\r?\n/)
        .map(e => e.trim())
        .filter(e => e.length > 0);
      if (correctedEmails.length !== emails.length) {
        console.warn(`⚠️ AI returned ${correctedEmails.length} emails, but expected ${emails.length}`);
      }
      // Overwrite the sheet with corrected emails
      let correctedCount = 0;
      for (let i = 1; i < data.length; i++) {
        const original = data[i][emailCol];
        const corrected = correctedEmails[i - 1] || original;
        if (original !== corrected) {
          data[i][emailCol] = corrected;
          correctedCount++;
          console.log(`🔄 Corrected email: '${original}' → '${corrected}'`);
        }
      }
      sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
      console.log(`✅ Batch autocorrected and updated ${correctedCount} emails in Implicare 2.0 sheet using OpenAI`);
      return correctedCount;
    } catch (error) {
      console.error('❌ Error batch autocorrecting emails with OpenAI:', error);
      throw error;
    }
  }
  
  /**
   * Initialize Processing Status column in Implicare 2.0 sheet
   */
  static initializeProcessingStatusColumn() {
    try {
      const spreadsheet = this.getPeopleDBSpreadsheet();
      const sheet = spreadsheet.getSheetByName('Implicare 2.0');
      
      if (!sheet) {
        console.log('⚠️ Implicare 2.0 sheet not found');
        return false;
      }
      
      const data = sheet.getDataRange().getValues();
      if (data.length === 0) {
        console.log('⚠️ No data found in Implicare 2.0 sheet');
        return false;
      }
      
      const headers = data[0];
      const processingStatusIndex = headers.indexOf('Processing Status');
      
      // Add Processing Status column if it doesn't exist
      if (processingStatusIndex === -1) {
        console.log('📋 Adding Processing Status column...');
        
        // Add the header
        const lastColumn = headers.length;
        sheet.getRange(1, lastColumn + 1).setValue('Processing Status');
        
        // Mark all existing entries as "PROCESSED" (since they're old)
        const statusColumn = lastColumn + 1;
        for (let row = 2; row <= data.length; row++) {
          sheet.getRange(row, statusColumn).setValue('PROCESSED');
        }
        
        console.log(`✅ Processing Status column added and ${data.length - 1} existing entries marked as PROCESSED`);
        return true;
      } else {
        console.log('✅ Processing Status column already exists');
        return true;
      }
      
    } catch (error) {
      console.error('❌ Error initializing Processing Status column:', error);
      return false;
    }
  }
  
  /**
   * Get only unprocessed submissions (NEW submissions)
   */
  static getUnprocessedSubmissions() {
    try {
      const spreadsheet = this.getPeopleDBSpreadsheet();
      const submissionsSheet = spreadsheet.getSheetByName('Implicare 2.0');
      
      if (!submissionsSheet) {
        console.log('⚠️ Implicare 2.0 sheet not found');
        return [];
      }
      
      const data = submissionsSheet.getDataRange().getValues();
      
      if (data.length === 0) {
        console.log('⚠️ No data found in Implicare 2.0 sheet');
        return [];
      }
      
      // First row is headers
      const headers = data[0];
      const statusIndex = headers.indexOf('Processing Status');
      
      if (statusIndex === -1) {
        console.log('⚠️ Processing Status column not found. Run initializeProcessingStatusColumn() first.');
        return [];
      }
      
      const unprocessedSubmissions = [];
      
      // Convert each unprocessed row to an object
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const status = row[statusIndex];
        
        // Only include submissions that are not marked as PROCESSED
        if (status !== 'PROCESSED') {
          const submission = {};
          
          headers.forEach((header, index) => {
            submission[header] = row[index];
          });
          
          // Store the row number for later updates
          submission._rowNumber = i + 1;
          unprocessedSubmissions.push(submission);
        }
      }
      
      console.log(`📊 Found ${unprocessedSubmissions.length} unprocessed submissions`);
      return unprocessedSubmissions;
      
    } catch (error) {
      console.error('❌ Error loading unprocessed submissions:', error);
      throw error;
    }
  }
  
  /**
   * Mark a submission as processed
   */
  static markSubmissionAsProcessed(submission, status = 'PROCESSED') {
    try {
      const spreadsheet = this.getPeopleDBSpreadsheet();
      const sheet = spreadsheet.getSheetByName('Implicare 2.0');
      
      if (!sheet) {
        console.log('⚠️ Implicare 2.0 sheet not found');
        return false;
      }
      
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const statusIndex = headers.indexOf('Processing Status');
      const processedAtIndex = headers.indexOf('Processed At');
      
      if (statusIndex === -1) {
        console.log('⚠️ Processing Status column not found');
        return false;
      }
      
      // Find the submission row (by email or row number)
      let rowNumber = submission._rowNumber;
      
      if (!rowNumber) {
        // Find by email if row number not available
        const emailIndex = headers.indexOf('Email');
        const email = submission.Email || submission.email;
        
        if (emailIndex !== -1 && email) {
          for (let i = 1; i < data.length; i++) {
            if (data[i][emailIndex] === email) {
              rowNumber = i + 1;
              break;
            }
          }
        }
      }
      
      if (!rowNumber) {
        console.log('⚠️ Could not find submission row to mark as processed');
        return false;
      }
      
      // Update status
      sheet.getRange(rowNumber, statusIndex + 1).setValue(status);
      
      // Add Processed At timestamp if column exists
      if (processedAtIndex === -1) {
        // Create Processed At column if it doesn't exist
        const lastColumn = headers.length;
        sheet.getRange(1, lastColumn + 1).setValue('Processed At');
        sheet.getRange(rowNumber, lastColumn + 1).setValue(new Date());
      } else {
        sheet.getRange(rowNumber, processedAtIndex + 1).setValue(new Date());
      }
      
      const email = submission.Email || submission.email || 'Unknown';
      console.log(`✅ Marked ${email} as ${status}`);
      
      return true;
      
    } catch (error) {
      console.error('❌ Error marking submission as processed:', error);
      return false;
    }
  }
  
  /**
   * Get processing statistics
   */
  static getProcessingStatistics() {
    try {
      const spreadsheet = this.getPeopleDBSpreadsheet();
      const sheet = spreadsheet.getSheetByName('Implicare 2.0');
      
      if (!sheet) {
        return { total: 0, processed: 0, unprocessed: 0, processingRate: 0 };
      }
      
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const statusIndex = headers.indexOf('Processing Status');
      
      if (statusIndex === -1) {
        return { total: data.length - 1, processed: 0, unprocessed: data.length - 1, processingRate: 0 };
      }
      
      let processed = 0;
      let unprocessed = 0;
      
      for (let i = 1; i < data.length; i++) {
        const status = data[i][statusIndex];
        if (status === 'PROCESSED') {
          processed++;
        } else {
          unprocessed++;
        }
      }
      
      const total = data.length - 1;
      const processingRate = total > 0 ? Math.round((processed / total) * 100) : 0;
      
      return {
        total: total,
        processed: processed,
        unprocessed: unprocessed,
        processingRate: processingRate
      };
      
    } catch (error) {
      console.error('❌ Error getting processing statistics:', error);
      return { total: 0, processed: 0, unprocessed: 0, processingRate: 0 };
    }
  }
} 