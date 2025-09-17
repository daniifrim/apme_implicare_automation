/**
 * Email History Manager
 * Handles comprehensive email tracking and history management
 */

class EmailHistoryManager {
  
  /**
   * Initialize the Email History sheet
   */
  static initializeEmailHistorySheet() {
    try {
      console.log('📧 Initializing Email History sheet...');
      
      const spreadsheet = SheetsConnector.getPeopleDBSpreadsheet();
      let emailHistorySheet = spreadsheet.getSheetByName('Email History');
      
      // Create sheet if it doesn't exist
      if (!emailHistorySheet) {
        emailHistorySheet = spreadsheet.insertSheet('Email History');
        console.log('✅ Created new Email History sheet');
      }
      
      // Set up headers
      const headers = [
        'Email',
        'TemplateName', 
        'SentDate',
        'Status',
        'CampaignContext',
        'ResponseID',
        'PersonName',
        'Notes',
        'DeliveryStatus',
        'Opened',
        'Clicked',
        'Bounced'
      ];
      
      // Clear existing data and set headers
      emailHistorySheet.clear();
      emailHistorySheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // Format headers
      const headerRange = emailHistorySheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4285f4');
      headerRange.setFontColor('white');
      
      // Auto-resize columns
      headers.forEach((_, index) => {
        emailHistorySheet.autoResizeColumn(index + 1);
      });
      
      console.log('✅ Email History sheet initialized with headers');
      return emailHistorySheet;
      
    } catch (error) {
      console.error('❌ Error initializing Email History sheet:', error);
      throw error;
    }
  }
  
  /**
   * Migrate existing email data from People DB
   */
  static migrateExistingEmailHistory() {
    try {
      console.log('🔄 Migrating existing email history from People DB...');
      
      const peopleDB = SheetsConnector.getAllPeople();
      const emailHistorySheet = this.getEmailHistorySheet();
      const newEntries = [];
      
      let migratedCount = 0;
      
      peopleDB.forEach(person => {
        const email = person.Email;
        const sentEmails = person['Sent Emails'];
        const lastSentDate = person['Last Sent Emails Date'];
        const responseID = person['Response ID'];
        const personName = person['Name'] || person['Nume'];
        const campaignContext = person['În ce context completezi acest formular?'] || 'Legacy';
        
        if (sentEmails && sentEmails.trim() !== '') {
          // Split multiple emails (comma-separated)
          const emailTemplates = sentEmails.split(',').map(template => template.trim());
          
          emailTemplates.forEach(template => {
            if (template && template !== '') {
              newEntries.push([
                email,                    // Email
                template,                 // TemplateName
                lastSentDate || 'Unknown', // SentDate
                'SENT',                   // Status
                campaignContext,          // CampaignContext
                responseID || '',         // ResponseID
                personName || '',         // PersonName
                'Migrated from People DB', // Notes
                'DELIVERED',              // DeliveryStatus
                'UNKNOWN',                // Opened
                'UNKNOWN',                // Clicked
                'NO'                      // Bounced
              ]);
              migratedCount++;
            }
          });
        }
      });
      
      // Add all entries to the sheet
      if (newEntries.length > 0) {
        const startRow = emailHistorySheet.getLastRow() + 1;
        emailHistorySheet.getRange(startRow, 1, newEntries.length, newEntries[0].length)
          .setValues(newEntries);
        
        console.log(`✅ Migrated ${migratedCount} email entries from People DB`);
      } else {
        console.log('ℹ️ No existing email data found to migrate');
      }
      
      return migratedCount;
      
    } catch (error) {
      console.error('❌ Error migrating email history:', error);
      throw error;
    }
  }
  
  /**
   * Log a new email being sent
   */
  static logEmailSent(email, templateName, campaignContext, responseID, personName, notes = '') {
    try {
      const emailHistorySheet = this.getEmailHistorySheet();
      const currentDate = new Date().toLocaleString('ro-RO');
      
      const newEntry = [
        email,                    // Email
        templateName,             // TemplateName
        currentDate,              // SentDate
        'SENT',                   // Status
        campaignContext,          // CampaignContext
        responseID || '',         // ResponseID
        personName || '',         // PersonName
        notes,                    // Notes
        'SENT',                   // DeliveryStatus
        'UNKNOWN',                // Opened
        'UNKNOWN',                // Clicked
        'NO'                      // Bounced
      ];
      
      const nextRow = emailHistorySheet.getLastRow() + 1;
      emailHistorySheet.getRange(nextRow, 1, 1, newEntry.length).setValues([newEntry]);
      
      console.log(`📧 Logged email sent: ${templateName} to ${email}`);
      return true;
      
    } catch (error) {
      console.error('❌ Error logging email sent:', error);
      return false;
    }
  }
  
  /**
   * Check if person has received specific template recently
   */
  static hasReceivedTemplateRecently(email, templateName, daysThreshold = 30) {
    try {
      const emailHistorySheet = this.getEmailHistorySheet();
      const data = emailHistorySheet.getDataRange().getValues();
      const headers = data[0];
      
      const emailCol = headers.indexOf('Email');
      const templateCol = headers.indexOf('TemplateName');
      const dateCol = headers.indexOf('SentDate');
      
      if (emailCol === -1 || templateCol === -1 || dateCol === -1) {
        console.error('❌ Required columns not found in Email History sheet');
        return false;
      }
      
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);
      
      // Check recent emails for this person and template
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const rowEmail = row[emailCol];
        const rowTemplate = row[templateCol];
        const rowDate = row[dateCol];
        
        if (rowEmail === email && rowTemplate === templateName) {
          try {
            const sentDate = new Date(rowDate);
            if (sentDate > thresholdDate) {
              console.log(`⏭️ ${email} received ${templateName} recently (${rowDate})`);
              return true;
            }
          } catch (dateError) {
            console.warn(`⚠️ Could not parse date: ${rowDate}`);
          }
        }
      }
      
      return false;
      
    } catch (error) {
      console.error('❌ Error checking recent template:', error);
      return false;
    }
  }
  
  /**
   * Get email history for a specific person
   */
  static getPersonEmailHistory(email) {
    try {
      const emailHistorySheet = this.getEmailHistorySheet();
      const data = emailHistorySheet.getDataRange().getValues();
      const headers = data[0];
      
      const emailCol = headers.indexOf('Email');
      const templateCol = headers.indexOf('TemplateName');
      const dateCol = headers.indexOf('SentDate');
      const statusCol = headers.indexOf('Status');
      const campaignCol = headers.indexOf('CampaignContext');
      
      const personHistory = [];
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[emailCol] === email) {
          personHistory.push({
            template: row[templateCol],
            sentDate: row[dateCol],
            status: row[statusCol],
            campaign: row[campaignCol]
          });
        }
      }
      
      return personHistory;
      
    } catch (error) {
      console.error('❌ Error getting person email history:', error);
      return [];
    }
  }
  
  /**
   * Get Email History sheet
   */
  static getEmailHistorySheet() {
    const spreadsheet = SheetsConnector.getPeopleDBSpreadsheet();
    let emailHistorySheet = spreadsheet.getSheetByName('Email History');
    
    if (!emailHistorySheet) {
      console.log('📧 Email History sheet not found, creating it...');
      emailHistorySheet = this.initializeEmailHistorySheet();
    }
    
    return emailHistorySheet;
  }
  
  /**
   * Get email statistics
   */
  static getEmailStatistics() {
    try {
      const emailHistorySheet = this.getEmailHistorySheet();
      const data = emailHistorySheet.getDataRange().getValues();
      
      if (data.length <= 1) {
        return {
          totalEmails: 0,
          uniqueRecipients: 0,
          templatesUsed: 0,
          recentEmails: 0
        };
      }
      
      const headers = data[0];
      const emailCol = headers.indexOf('Email');
      const templateCol = headers.indexOf('TemplateName');
      const dateCol = headers.indexOf('SentDate');
      
      const emails = new Set();
      const templates = new Set();
      const recipients = new Set();
      
      let recentEmails = 0;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const email = row[emailCol];
        const template = row[templateCol];
        const date = row[dateCol];
        
        if (email) recipients.add(email);
        if (template) templates.add(template);
        
        try {
          const sentDate = new Date(date);
          if (sentDate > thirtyDaysAgo) {
            recentEmails++;
          }
        } catch (dateError) {
          // Skip invalid dates
        }
      }
      
      return {
        totalEmails: data.length - 1,
        uniqueRecipients: recipients.size,
        templatesUsed: templates.size,
        recentEmails: recentEmails
      };
      
    } catch (error) {
      console.error('❌ Error getting email statistics:', error);
      return {
        totalEmails: 0,
        uniqueRecipients: 0,
        templatesUsed: 0,
        recentEmails: 0
      };
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EmailHistoryManager;
} 