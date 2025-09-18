/**
 * APME Automation Engine
 * Orchestrates the entire email automation process
 */

class AutomationEngine {
  
  /**
   * Process new submissions from Fillout
   * Main entry point for automation
   */
  static processNewSubmissions() {
    try {
      console.log('🚀 Starting APME email automation process...');
      
      // 1. Test sheets connection first
      const connectionTest = SheetsConnector.testConnection();
      if (!connectionTest.success) {
        throw new Error(`Sheets connection failed: ${connectionTest.error}`);
      }
      
      console.log(`✅ Connected to "${connectionTest.spreadsheetName}" with ${connectionTest.peopleCount} people`);
      
      // 2. Get people who need email processing (unprocessed submissions)
      const peopleToProcess = SheetsConnector.getUnprocessedSubmissions();
      
      if (peopleToProcess.length === 0) {
        console.log('📭 No people need email processing at this time');
        return { processed: 0, message: 'No people to process' };
      }
      
      console.log(`👥 Found ${peopleToProcess.length} people needing email processing`);
      
      // 3. Process each person
      const results = [];
      let processed = 0;
      
      for (const person of peopleToProcess) {
        try {
          const result = this.processPersonEmails(person);
          results.push(result);
          processed++;
          
          // Add delay between processing to avoid rate limits
          if (processed < peopleToProcess.length) {
            Utilities.sleep(getSetting('EMAIL.DELAY_BETWEEN_EMAILS', 1000));
          }
          
        } catch (error) {
          console.error(`❌ Error processing ${person.Email}:`, error);
          results.push({ 
            person: person.Email, 
            success: false, 
            error: error.message 
          });
        }
      }
      
      // 4. Summary
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      console.log(`✅ Automation complete: ${successful} successful, ${failed} failed`);
      
      return {
        processed: successful,
        failed: failed,
        total: peopleToProcess.length,
        results: results
      };
      
    } catch (error) {
      console.error('❌ Fatal error in automation engine:', error);
      throw error;
    }
  }
  
  /**
   * Process emails for a single person
   */
  static processPersonEmails(person) {
    try {
      // Use Romanian field mappings
      const firstName = TemplateAssignment.getFieldValue(person, 'FIRST_NAME') || 'Prieten';
      const email = TemplateAssignment.getFieldValue(person, 'EMAIL') || 'unknown@email.com';
      
      console.log(`👤 Processing emails for: ${firstName} (${email})`);
      
      // 1. Check if person should be processed
      if (!TemplateAssignment.shouldProcessPerson(person)) {
        return { 
          person: email, 
          success: true, 
          skipped: true, 
          reason: 'Person should not be processed' 
        };
      }
      
      // 2. Assign email templates based on their responses
      const assignedTemplates = TemplateAssignment.assignTemplates(person);
      
      if (assignedTemplates.length === 0) {
        console.log(`📭 No templates assigned for ${email}`);
        return { 
          person: email, 
          success: true, 
          templates: [], 
          message: 'No templates assigned' 
        };
      }
      
      // 3. Send emails for each template
      const emailResults = [];
      
      for (const templateName of assignedTemplates) {
        try {
          const emailResult = this.sendTemplateEmail(person, templateName);
          emailResults.push(emailResult);
        } catch (error) {
          console.error(`❌ Error sending template "${templateName}" to ${email}:`, error);
          emailResults.push({ 
            template: templateName, 
            success: false, 
            error: error.message 
          });
        }
      }
      
      // 4. Update person's status in the sheet
      const successfulTemplates = emailResults
        .filter(r => r.success)
        .map(r => r.template);
      
      if (successfulTemplates.length > 0) {
        SheetsConnector.updatePersonEmailStatus(email, successfulTemplates);
        // Mark the submission as processed in the Implicare 2.0 sheet
        SheetsConnector.markSubmissionAsProcessed(person, 'PROCESSED');
      }
      
      return {
        person: email,
        success: true,
        templates: successfulTemplates,
        emailResults: emailResults
      };
      
    } catch (error) {
      console.error(`❌ Error processing person ${email}:`, error);
      throw error;
    }
  }
  
  /**
   * Send a specific template email to a person
   */
  static sendTemplateEmail(person, templateName) {
    try {
      const email = TemplateAssignment.getFieldValue(person, 'EMAIL');
      console.log(`📧 Sending template "${templateName}" to ${email}`);
      
      // 1. Get template information from sheets
      const templates = SheetsConnector.getEmailTemplates();
      const template = templates.find(t => t.Name === templateName);
      
      if (!template) {
        throw new Error(`Template "${templateName}" not found in Email Templates sheet`);
      }
      
      // 2. Get the Google Doc URL for this template
      let docUrl = null;
      
      // Try multiple ways to get the URL
      if (template.Doc && template.Doc.includes('docs.google.com')) {
        docUrl = template.Doc;
      } else if (template.DocURL) {
        docUrl = template.DocURL; // From smart chip extraction
      } else if (template.URL && template.URL.includes('docs.google.com')) {
        docUrl = template.URL;
      } else if (template['Fallback URL']) {
        docUrl = template['Fallback URL'];
      } else if (template.Doc) {
        // Log what we found for debugging
        console.log(`🔍 Doc field contains: "${template.Doc}"`);
      }
      
      if (!docUrl) {
        console.log(`🔍 Available template fields:`, Object.keys(template));
        console.log(`🔍 Template data:`, template);
        throw new Error(`No valid Google Doc URL found for template "${templateName}"`);
      }
      
      // 3. Prepare template data for personalization using the new system
      const templateData = TemplateAssignment.getPersonalizationData(person);
      
      // Add specific data for prayer templates
      if (templateName.includes('Rugăciune pentru misionari') || templateName.includes('Rugăciune pentru grup etnic')) {
        const missionarySelection = TemplateAssignment.getFieldValue(person, 'MISSIONARY_SELECTION');
        const ethnicGroupSelection = TemplateAssignment.getFieldValue(person, 'ETHNIC_GROUP_SELECTION');
        
        // Set the appropriate prayer target
        if (missionarySelection) {
          templateData.Missionary = missionarySelection;
          console.log(`📿 Personalizing missionary prayer for: ${missionarySelection}`);
        }
        if (ethnicGroupSelection) {
          templateData.EthnicGroup = ethnicGroupSelection;
          console.log(`🌍 Personalizing ethnic group prayer for: ${ethnicGroupSelection}`);
        }
      }
      
      // 4. Generate subject line
      const subject = this.generateSubjectLine(templateName, templateData);
      
      // 5. Send email using our GDocsConverter
      const result = GDocsConverter.sendEmailFromGDoc(
        docUrl,
        getEmailRecipient(email), // This respects test mode
        subject,
        templateData
      );
      
      console.log(`✅ Template "${templateName}" sent successfully`);
      
      return {
        template: templateName,
        success: true,
        docUrl: docUrl,
        recipient: result.recipient
      };
      
    } catch (error) {
      console.error(`❌ Error sending template "${templateName}":`, error);
      throw error;
    }
  }
  
  /**
   * Generate appropriate subject line for template
   */
  static generateSubjectLine(templateName, templateData) {
    // Map template names to subject lines from settings
    const subjectMap = {
      'Info Misiune pe termen scurt APME': getSetting('EMAIL.SUBJECTS.MISSION_INFO'),
      'Rugăciune pentru misionari': getSetting('EMAIL.SUBJECTS.PRAYER_MISSIONARY'),
      'Rugăciune pentru grup etnic': getSetting('EMAIL.SUBJECTS.PRAYER_ETHNIC'),
      'Info Tabere Misiune APME': getSetting('EMAIL.SUBJECTS.CAMP_INFO'),
      'Info despre cursul Kairos': getSetting('EMAIL.SUBJECTS.COURSE_KAIROS'),
      'Info despre cursul Mobilizează': getSetting('EMAIL.SUBJECTS.COURSE_MOBILIZE'),
      'Info Voluntariat APME': getSetting('EMAIL.SUBJECTS.VOLUNTEER_INFO'),
      'Info Donații APME': getSetting('EMAIL.SUBJECTS.DONATION_INFO')
    };
    
    const subject = subjectMap[templateName] || `APME - ${templateName}`;
    
    // Personalize with first name if available
    if (templateData.FirstName && templateData.FirstName !== 'Prieten') {
      return `${subject} - ${templateData.FirstName}`;
    }
    
    return subject;
  }
  
  /**
   * Send scheduled emails (for timer triggers)
   */
  static sendScheduledEmails() {
    console.log('📅 Running scheduled email processing...');
    return this.processNewSubmissions();
  }
  
  /**
   * Test the entire automation flow with a single person
   */
  static testAutomationFlow(personEmail = null) {
    try {
      console.log('🧪 Testing automation flow...');
      
      // Get test person
      let testPerson;
      
      if (personEmail) {
        const allPeople = SheetsConnector.getAllPeople();
        testPerson = allPeople.find(p => p.Email === personEmail);
        if (!testPerson) {
          throw new Error(`Person with email ${personEmail} not found`);
        }
             } else {
         // Use a sample test person with field names matching your sheet
         testPerson = {
           'First Name': 'Dani',
           'Last Name': 'Ifrim', 
           'Email': 'danifrim14@gmail.com',
           'Location': 'Romania',
           'Mission Involvement': 'DA',
           'Praying Choice': 'Misionar',
           'Praying Groups': 'Doresc să particip la un grup de rugăciune pentru misiune în zona mea',
           'Info Tabere': 'DA',
           'Cursuri SM': 'Cursul Kairos',
           'Ajutor Financiar': true,
           'Voluntar APME': true
         };
       }
      
      console.log(`🧪 Testing with person: ${testPerson.FirstName} ${testPerson.LastName}`);
      
      // Test template assignment
      const templates = TemplateAssignment.assignTemplates(testPerson);
      console.log(`📧 Templates assigned: ${templates.join(', ')}`);
      
      // Test the full flow (but don't actually send emails in test mode)
      const originalTestMode = getSetting('DEVELOPMENT.TEST_MODE');
      // Temporarily enable test mode
      SETTINGS.DEVELOPMENT.TEST_MODE = true;
      
      const result = this.processPersonEmails(testPerson);
      
      // Restore original test mode
      SETTINGS.DEVELOPMENT.TEST_MODE = originalTestMode;
      
      console.log('✅ Automation flow test completed successfully');
      return result;
      
    } catch (error) {
      console.error('❌ Automation flow test failed:', error);
      throw error;
    }
  }

  /**
   * Send emails to a person for assigned templates
   */
  static sendEmailsToPerson(person, assignedTemplates) {
    try {
      const email = TemplateAssignment.getFieldValue(person, 'EMAIL') || person.Email || person.email;
      const firstName = TemplateAssignment.getFieldValue(person, 'FIRST_NAME') || 'Prieten';
      
      console.log(`📧 Sending ${assignedTemplates.length} emails to: ${firstName} (${email})`);
      
      const emailResults = [];
      let successCount = 0;
      let failCount = 0;
      
      for (const templateName of assignedTemplates) {
        try {
          const result = this.sendTemplateEmail(person, templateName);
          emailResults.push(result);
          
          if (result.success) {
            successCount++;
            console.log(`✅ Sent "${templateName}" to ${email}`);
          } else {
            failCount++;
            console.log(`❌ Failed to send "${templateName}" to ${email}: ${result.error}`);
          }
          
          // Small delay between individual emails
          if (emailResults.length < assignedTemplates.length) {
            Utilities.sleep(500);
          }
          
        } catch (error) {
          failCount++;
          console.error(`❌ Error sending "${templateName}":`, error);
          emailResults.push({
            template: templateName,
            success: false,
            error: error.message
          });
        }
      }
      
      const overallSuccess = successCount > 0; // Consider success if at least one email was sent
      
      console.log(`📊 Email results for ${email}: ${successCount}/${assignedTemplates.length} successful`);
      
      return {
        success: overallSuccess,
        sentCount: successCount,
        failedCount: failCount,
        totalTemplates: assignedTemplates.length,
        results: emailResults,
        person: email,
        error: failCount === assignedTemplates.length ? 'All emails failed' : null
      };
      
    } catch (error) {
      console.error('❌ Error in sendEmailsToPerson:', error);
      return {
        success: false,
        sentCount: 0,
        failedCount: assignedTemplates ? assignedTemplates.length : 0,
        totalTemplates: assignedTemplates ? assignedTemplates.length : 0,
        results: [],
        person: person.Email || person.email || 'Unknown',
        error: error.message
      };
    }
  }

  // ============================================================================
  // WEEKLY NOTIFICATION SYSTEM
  // ============================================================================

  /**
   * Process weekly notifications to team members
   * Categorizes people and sends emails for unprocessed entries
   */
  static processWeeklyNotifications() {
    try {
      console.log('📅 Starting weekly notification processing...');
      
      // 1. Get all people from the database
      const allPeople = SheetsConnector.getAllPeople();
      console.log(`📊 Found ${allPeople.length} total people in database`);
      
      // 2. Filter to unprocessed people only
      const unprocessedPeople = this.getUnprocessedPeopleForNotifications(allPeople);
      console.log(`📋 Found ${unprocessedPeople.length} unprocessed people for notifications`);
      
      if (unprocessedPeople.length === 0) {
        console.log('✅ No unprocessed people found - no notifications to send');
        return {
          success: true,
          notifications: {},
          totalCategories: 0,
          emailsSent: 0,
          message: 'No unprocessed people found'
        };
      }
      
      // 3. Categorize unprocessed people for each notification type
      const notifications = {
        whatsappGroup: this.categorizeForWhatsAppGroup(unprocessedPeople),
        crstSchool: this.categorizeForCrstSchool(unprocessedPeople),
        missionInvolvement: this.categorizeForMissionInvolvement(unprocessedPeople)
      };
      
      // 4. Display categorization results
      this.displayNotificationSummary(notifications);
      
      // 5. Send notification emails
      const emailResults = this.sendNotificationEmails(notifications);
      
      // 6. Update tracking for processed people
      this.updateNotificationTracking(notifications);
      
      console.log('✅ Weekly notification processing completed');
      
      return {
        success: true,
        notifications: notifications,
        totalCategories: 3,
        emailsSent: emailResults.totalSent,
        emailResults: emailResults
      };
      
    } catch (error) {
      console.error('❌ Error in weekly notification processing:', error);
      throw error;
    }
  }

  /**
   * Categorize people who want to join WhatsApp group
   */
  static categorizeForWhatsAppGroup(allPeople) {
    console.log('🔍 Categorizing people for WhatsApp group notifications...');
    
    const criteria = getSetting('NOTIFICATIONS.CRITERIA.WHATSAPP_GROUP');
    const matchingPeople = [];
    
    for (const person of allPeople) {
      const prayerMethod = TemplateAssignment.getFieldValue(person, criteria.field);
      
      if (prayerMethod && prayerMethod.includes && prayerMethod.includes(criteria.contains)) {
        const personInfo = this.extractPersonInfo(person);
        matchingPeople.push(personInfo);
      }
    }
    
    console.log(`📱 WhatsApp Group: ${matchingPeople.length} people want to be added`);
    return {
      type: 'WHATSAPP_GROUP',
      recipient: getSetting('NOTIFICATIONS.WEEKLY_RECIPIENTS.WHATSAPP_GROUP'),
      subject: getSetting('NOTIFICATIONS.SUBJECTS.WHATSAPP_GROUP'),
      people: matchingPeople,
      count: matchingPeople.length
    };
  }

  /**
   * Categorize people interested in CRST school
   */
  static categorizeForCrstSchool(allPeople) {
    console.log('🔍 Categorizing people for CRST school notifications...');
    
    const criteria = getSetting('NOTIFICATIONS.CRITERIA.CRST_SCHOOL');
    const matchingPeople = [];
    
    for (const person of allPeople) {
      const crstInterest = TemplateAssignment.getFieldValue(person, criteria.field);
      
      // Check for TRUE, "TRUE", or similar positive values
      const isInterested = crstInterest === true || 
                          crstInterest === 'TRUE' || 
                          crstInterest === 'true' ||
                          crstInterest === 'Da' ||
                          crstInterest === 'YES' ||
                          crstInterest === 'yes';
      
      if (isInterested) {
        const personInfo = this.extractPersonInfo(person);
        matchingPeople.push(personInfo);
      }
    }
    
    console.log(`🏫 CRST School: ${matchingPeople.length} people interested`);
    return {
      type: 'CRST_SCHOOL',
      recipient: getSetting('NOTIFICATIONS.WEEKLY_RECIPIENTS.CRST_SCHOOL'),
      subject: getSetting('NOTIFICATIONS.SUBJECTS.CRST_SCHOOL'),
      people: matchingPeople,
      count: matchingPeople.length
    };
  }

  /**
   * Categorize people interested in mission involvement
   */
  static categorizeForMissionInvolvement(allPeople) {
    console.log('🔍 Categorizing people for mission involvement notifications...');
    
    const criteria = getSetting('NOTIFICATIONS.CRITERIA.MISSION_INVOLVEMENT');
    const matchingPeople = [];
    
    for (const person of allPeople) {
      const missionField = TemplateAssignment.getFieldValue(person, criteria.field);
      
      if (missionField) {
        // Check if any of the target values are contained in the response
        const isInterested = criteria.contains.some(targetValue => 
          missionField.includes && missionField.includes(targetValue)
        );
        
        if (isInterested) {
          const personInfo = this.extractPersonInfo(person);
          personInfo.missionType = this.determineMissionType(missionField);
          matchingPeople.push(personInfo);
        }
      }
    }
    
    console.log(`✈️ Mission Involvement: ${matchingPeople.length} people interested`);
    return {
      type: 'MISSION_INVOLVEMENT',
      recipient: getSetting('NOTIFICATIONS.WEEKLY_RECIPIENTS.MISSION_INVOLVEMENT'),
      subject: getSetting('NOTIFICATIONS.SUBJECTS.MISSION_INVOLVEMENT'),
      people: matchingPeople,
      count: matchingPeople.length
    };
  }

  /**
   * Extract relevant person information for notifications
   */
  static extractPersonInfo(person) {
    return {
      name: TemplateAssignment.getFieldValue(person, 'FIRST_NAME') || 'Nume necunoscut',
      email: TemplateAssignment.getFieldValue(person, 'EMAIL') || 'Email necunoscut',
      location: this.getPersonLocation(person),
      church: TemplateAssignment.getFieldValue(person, 'CHURCH') || 'Biserica nu este specificată'
    };
  }

  /**
   * Get person's location (prioritizing the most specific available)
   */
  static getPersonLocation(person) {
    const cityIntl = TemplateAssignment.getFieldValue(person, 'CITY_INTERNATIONAL');
    const cityRomania = TemplateAssignment.getFieldValue(person, 'CITY_ROMANIA');
    const location = TemplateAssignment.getFieldValue(person, 'LOCATION');
    
    if (cityIntl) return cityIntl;
    if (cityRomania) return cityRomania;
    if (location) return location;
    return 'Locația nu este specificată';
  }

  /**
   * Determine mission type (short-term vs long-term)
   */
  static determineMissionType(missionField) {
    if (missionField.includes('termen scurt')) return 'Termen scurt (2-4 săptămâni)';
    if (missionField.includes('termen lung')) return 'Termen lung';
    return 'Tip nedeterminat';
  }

  /**
   * Display comprehensive summary of notification categorization
   */
  static displayNotificationSummary(notifications) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 WEEKLY NOTIFICATION SUMMARY');
    console.log('='.repeat(60));
    
    const totalPeople = notifications.whatsappGroup.count + 
                       notifications.crstSchool.count + 
                       notifications.missionInvolvement.count;
    
    console.log(`📈 Total people categorized: ${totalPeople}`);
    console.log('');
    
    // WhatsApp Group category
    this.displayCategoryDetails(notifications.whatsappGroup, '📱 WHATSAPP GROUP');
    
    // CRST School category  
    this.displayCategoryDetails(notifications.crstSchool, '🏫 CRST SCHOOL');
    
    // Mission Involvement category
    this.displayCategoryDetails(notifications.missionInvolvement, '✈️ MISSION INVOLVEMENT');
    
    console.log('='.repeat(60));
  }

  /**
   * Display details for a specific notification category
   */
  static displayCategoryDetails(category, title) {
    console.log(`\n${title}`);
    console.log(`📧 Recipient: ${category.recipient}`);
    console.log(`📝 Subject: ${category.subject}`);
    console.log(`👥 People count: ${category.count}`);
    
    if (category.count > 0) {
      console.log('👤 People list:');
      category.people.forEach((person, index) => {
        let personLine = `  ${index + 1}. ${person.name} (${person.email})`;
        personLine += ` - ${person.location}`;
        if (person.church !== 'Biserica nu este specificată') {
          personLine += ` - ${person.church}`;
        }
        if (person.missionType) {
          personLine += ` - ${person.missionType}`;
        }
        console.log(personLine);
      });
    } else {
      console.log('  No people in this category');
    }
    console.log('-'.repeat(40));
  }

  /**
   * Get people who haven't been processed for notifications yet
   */
  static getUnprocessedPeopleForNotifications(allPeople) {
    // For now, we'll consider all people as unprocessed since we don't have tracking columns yet
    // In production, this would check the tracking columns to see who has already been notified
    
    // TODO: When tracking columns are added to the sheet, filter based on:
    // - WhatsApp Notification Sent
    // - CRST Notification Sent  
    // - Mission Notification Sent
    // - Last Notification Date
    
    console.log('📋 Note: All people considered unprocessed (tracking not yet implemented)');
    return allPeople;
  }

  /**
   * Send notification emails to team members
   */
  static sendNotificationEmails(notifications) {
    console.log('📧 Starting notification email sending...');
    
    const results = {
      sent: [],
      failed: [],
      totalSent: 0,
      totalFailed: 0
    };
    
    // Send WhatsApp group notification
    if (notifications.whatsappGroup.count > 0) {
      const result = this.sendSingleNotificationEmail(notifications.whatsappGroup);
      if (result.success) {
        results.sent.push(result);
        results.totalSent++;
      } else {
        results.failed.push(result);
        results.totalFailed++;
      }
    }
    
    // Send CRST school notification
    if (notifications.crstSchool.count > 0) {
      const result = this.sendSingleNotificationEmail(notifications.crstSchool);
      if (result.success) {
        results.sent.push(result);
        results.totalSent++;
      } else {
        results.failed.push(result);
        results.totalFailed++;
      }
    }
    
    // Send mission involvement notification
    if (notifications.missionInvolvement.count > 0) {
      const result = this.sendSingleNotificationEmail(notifications.missionInvolvement);
      if (result.success) {
        results.sent.push(result);
        results.totalSent++;
      } else {
        results.failed.push(result);
        results.totalFailed++;
      }
    }
    
    console.log(`📊 Email sending complete: ${results.totalSent} sent, ${results.totalFailed} failed`);
    return results;
  }

  /**
   * Send a single notification email
   */
  static sendSingleNotificationEmail(notification) {
    try {
      console.log(`📧 Sending ${notification.type} notification to ${notification.recipient}`);
      
      // Generate email content
      const emailContent = this.generateNotificationEmailContent(notification);
      
      // Get recipient (respects test mode)
      const recipient = getEmailRecipient(notification.recipient);
      
      // Send email using Gmail service
      const emailOptions = {
        to: recipient,
        subject: notification.subject,
        htmlBody: emailContent.html,
        name: getSetting('NOTIFICATIONS.EMAIL_SETTINGS.FROM_NAME')
      };
      
      if (getSetting('NOTIFICATIONS.EMAIL_SETTINGS.HIDE_SIGNATURE')) {
        emailOptions.noReply = true;
      }
      
      // Send the email
      GmailApp.sendEmail(
        emailOptions.to,
        emailOptions.subject,
        '', // plain text (we're using HTML)
        {
          htmlBody: emailOptions.htmlBody,
          name: emailOptions.name
        }
      );
      
      console.log(`✅ ${notification.type} notification sent successfully to ${recipient}`);
      
      return {
        success: true,
        type: notification.type,
        recipient: recipient,
        peopleCount: notification.count
      };
      
    } catch (error) {
      console.error(`❌ Failed to send ${notification.type} notification:`, error);
      
      return {
        success: false,
        type: notification.type,
        recipient: notification.recipient,
        error: error.message
      };
    }
  }

  /**
   * Generate HTML email content for notifications
   */
  static generateNotificationEmailContent(notification) {
    const greeting = this.getGreetingForNotificationType(notification.type);
    const intro = this.getIntroForNotificationType(notification.type);
    
    let peopleListHtml = '';
    notification.people.forEach((person, index) => {
      peopleListHtml += `
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 8px; font-weight: bold;">${index + 1}.</td>
          <td style="padding: 8px; font-weight: bold;">${person.name}</td>
          <td style="padding: 8px;">${person.email}</td>
          <td style="padding: 8px;">${person.location}</td>
          <td style="padding: 8px;">${person.church}</td>
          ${person.missionType ? `<td style="padding: 8px;">${person.missionType}</td>` : ''}
        </tr>
      `;
    });
    
    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 800px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
              ${notification.subject}
            </h2>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              ${greeting}
            </p>
            
            <p style="font-size: 14px; margin-bottom: 20px;">
              ${intro}
            </p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; border: 1px solid #ddd;">
              <thead style="background-color: #f8f9fa;">
                <tr>
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">#</th>
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Nume</th>
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Email</th>
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Locația</th>
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Biserica</th>
                  ${notification.type === 'MISSION_INVOLVEMENT' ? '<th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Tip Misiune</th>' : ''}
                </tr>
              </thead>
              <tbody>
                ${peopleListHtml}
              </tbody>
            </table>
            
            <p style="font-size: 14px; margin-top: 30px; color: #666;">
              Cu drag,<br>
              <strong>${getSetting('NOTIFICATIONS.EMAIL_SETTINGS.SIGNATURE')}</strong>
            </p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #888; text-align: center;">
              Această notificare a fost generată automat de sistemul APME de automatizare a emailurilor.
            </p>
          </div>
        </body>
      </html>
    `;
    
    return { html };
  }

  /**
   * Get appropriate greeting for notification type
   */
  static getGreetingForNotificationType(type) {
    switch (type) {
      case 'WHATSAPP_GROUP':
        return 'Salutare!';
      case 'CRST_SCHOOL':
        return 'Pace în Domnul!';
      case 'MISSION_INVOLVEMENT':
        return 'Salutări în Domnul!';
      default:
        return 'Salutare!';
    }
  }

  /**
   * Get appropriate intro text for notification type
   */
  static getIntroForNotificationType(type) {
    switch (type) {
      case 'WHATSAPP_GROUP':
        return 'În continuare aveți o listă cu persoanele care doresc să fie adăugate pe grupul de misiune de WhatsApp/Signal și emailurile lor:';
      case 'CRST_SCHOOL':
        return 'În continuare aveți o listă cu persoanele care au solicitat mai multe informații despre CRST (școala de misiune de la Agigea, CT) și emailurile lor:';
      case 'MISSION_INVOLVEMENT':
        return 'În continuare aveți o listă cu persoanele care sunt interesate în implicare pe misiune (termen scurt sau lung) și emailurile lor:';
      default:
        return 'În continuare aveți o listă cu persoanele relevante și emailurile lor:';
    }
  }

  /**
   * Update tracking information for processed notifications
   */
  static updateNotificationTracking(notifications) {
    console.log('📝 Updating notification tracking...');
    
    // TODO: Implement tracking updates in the spreadsheet
    // This would mark people as processed for each notification type
    // and update the last notification date
    
    console.log('📝 Note: Tracking update not yet implemented (requires spreadsheet columns)');
    
    // When implemented, this would:
    // 1. Update WhatsApp notification tracking for people in whatsappGroup
    // 2. Update CRST notification tracking for people in crstSchool  
    // 3. Update Mission notification tracking for people in missionInvolvement
    // 4. Set Last Notification Date to current date
  }

  /**
   * Test the notification system with sample data (no emails sent)
   */
  static testNotificationSystem() {
    try {
      console.log('🧪 Testing notification categorization system...');
      
      // Test with all available data but without sending emails
      const originalTestMode = getSetting('DEVELOPMENT.TEST_MODE');
      
      // Temporarily enable test mode to prevent actual email sending
      if (typeof SETTINGS !== 'undefined') {
        SETTINGS.DEVELOPMENT = SETTINGS.DEVELOPMENT || {};
        SETTINGS.DEVELOPMENT.TEST_MODE = true;
      }
      
      const result = this.processWeeklyNotifications();
      
      // Restore original test mode
      if (typeof SETTINGS !== 'undefined' && SETTINGS.DEVELOPMENT) {
        SETTINGS.DEVELOPMENT.TEST_MODE = originalTestMode;
      }
      
      console.log('✅ Notification system test completed successfully');
      return result;
      
    } catch (error) {
      console.error('❌ Notification system test failed:', error);
      throw error;
    }
  }
} 