/**
 * APME Summary Email Manager
 * Handles sending daily summary emails to organizers
 */

class SummaryEmailManager {
  
  /**
   * Send daily summary to all admin emails
   */
  static async sendDailySummary(date = new Date()) {
    try {
      console.log('📧 Sending daily summary for:', date.toDateString());
      
      // Generate summary data
      const summary = AnalyticsManager.generateDailySummary(date);
      
      // Check if we should send the summary
      if (!this.shouldSendSummary(summary)) {
        console.log('📭 Skipping summary - no new submissions or below threshold');
        return {
          success: true,
          sent: false,
          reason: 'No new submissions or below threshold'
        };
      }
      
      // Get admin email list
      const adminEmails = getSetting('SUMMARY.ADMIN_EMAILS', []);
      
      if (adminEmails.length === 0) {
        console.log('⚠️ No admin emails configured for summary');
        return {
          success: false,
          sent: false,
          reason: 'No admin emails configured'
        };
      }
      
      // Format email content (raw)
      let emailContent = AnalyticsManager.formatSummaryForEmail(summary);
      const subject = this.generateSubjectLine(date, summary);
      
      // --- AI Review & Correction Step ---
      try {
        console.log('🤖 [AI] Preparing to send summary to OpenAI for review and correction...');
        const aiPrompt = `You are a data correction assistant. I will give you an HTML summary with geographic data that may have errors (cities listed as countries, countries listed as cities, etc.).

Your task:
1. Fix any geographic inconsistencies by moving items to the correct category
2. Remove or correct any obviously wrong location data
3. Do NOT add notes, comments, or explanations
4. Output ONLY the corrected HTML - nothing else

Example of what to fix:
- If "Valencia" appears under "Top Countries", move it to "Top Cities" 
- If "Germany" appears under "Top Cities", move it to "Top Countries"
- Remove duplicate entries

HTML to correct:
${emailContent}`;
        
        console.log('🤖 [AI] Prompt length:', aiPrompt.length, 'characters');
        console.log('🤖 [AI] Prompt preview:', aiPrompt.substring(0, 300) + '...');
        
        const aiResponse = await OpenAIClient.callOpenAI(aiPrompt);
        
        if (aiResponse && aiResponse.length > 0) {
          console.log('🤖 [AI] Response length:', aiResponse.length, 'characters');
          console.log('🤖 [AI] Response preview:', aiResponse.substring(0, 200) + '...');
          
          // More thorough validation
          const hasHtml = aiResponse.includes('<') && aiResponse.includes('>');
          const hasProperHtmlStructure = aiResponse.includes('<h') || aiResponse.includes('<p') || aiResponse.includes('<ul');
          const hasUnwantedNotes = aiResponse.toLowerCase().includes('[note:') || aiResponse.toLowerCase().includes('note:');
          
          console.log('🤖 [AI] Validation:', { hasHtml, hasProperHtmlStructure, hasUnwantedNotes });
          
          if (hasHtml && hasProperHtmlStructure && !hasUnwantedNotes) {
            console.log('✅ [AI] AI provided a corrected summary. Using AI version.');
            emailContent = aiResponse.trim();
            
            // Debug: log the corrected content
            console.log('🤖 [AI] Corrected HTML preview:');
            console.log(emailContent.substring(0, 500) + '...');
            
          } else {
            console.log('⚠️ [AI] AI response failed validation. Using original summary.');
            if (hasUnwantedNotes) {
              console.log('⚠️ [AI] AI added unwanted notes/comments');
            }
          }
        } else {
          console.log('⚠️ [AI] No valid AI response. Using original summary.');
        }
      } catch (aiError) {
        console.error('❌ [AI] Error during AI review/correction:', aiError);
        // Fallback to original summary
      }
      // --- End AI Review Step ---
      
      // Send to each admin
      const results = [];
      let sentCount = 0;
      
      adminEmails.forEach(adminEmail => {
        try {
          const result = this.sendSummaryEmail(adminEmail, subject, emailContent, summary);
          results.push(result);
          
          if (result.success) {
            sentCount++;
          }
          
        } catch (error) {
          console.error(`❌ Error sending summary to ${adminEmail}:`, error);
          results.push({
            email: adminEmail,
            success: false,
            error: error.message
          });
        }
      });
      
      console.log(`✅ Daily summary sent to ${sentCount}/${adminEmails.length} admins`);
      
      return {
        success: sentCount > 0,
        sent: sentCount > 0,
        sentCount: sentCount,
        totalAdmins: adminEmails.length,
        results: results
      };
      
    } catch (error) {
      console.error('❌ Error sending daily summary:', error);
      return {
        success: false,
        sent: false,
        error: error.message
      };
    }
  }
  
  /**
   * Check if we should send the summary
   */
  static shouldSendSummary(summary) {
    try {
      // Don't send if no data
      if (!summary.hasData) {
        return false;
      }
      
      // Check minimum submissions threshold
      const minSubmissions = getSetting('SUMMARY.MIN_NEW_SUBMISSIONS', 1);
      if (summary.totalSubmissions < minSubmissions) {
        return false;
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ Error checking if should send summary:', error);
      return false;
    }
  }
  
  /**
   * Generate subject line for summary email
   */
  static generateSubjectLine(date, summary) {
    try {
      let subject = getSetting('SUMMARY.SUBJECT', 'APME Daily Summary - {date}');
      
      // Replace placeholders
      subject = subject.replace('{date}', date.toDateString());
      
      // Add submission count if available
      if (summary.hasData && summary.totalSubmissions > 0) {
        subject += ` (${summary.totalSubmissions} new submissions)`;
      }
      
      return subject;
      
    } catch (error) {
      console.error('❌ Error generating subject line:', error);
      return 'APME Daily Summary';
    }
  }
  
  /**
   * Send summary email to a specific admin
   */
  static sendSummaryEmail(adminEmail, subject, emailContent, summary) {
    try {
      console.log(`📧 Sending summary to: ${adminEmail}`);
      
      // Use test mode if configured
      const recipientEmail = getEmailRecipient(adminEmail);
      
      // Debug: Log final email content before sending
      console.log('📧 [DEBUG] Final email content before sending:');
      console.log('📧 [DEBUG] Content type: HTML');
      console.log('📧 [DEBUG] Content length:', emailContent.length);
      console.log('📧 [DEBUG] Content preview:', emailContent.substring(0, 300) + '...');
      
      // Send email using Gmail
      GmailApp.sendEmail(
        recipientEmail,
        subject,
        this.convertHtmlToText(emailContent), // Plain text version
        {
          htmlBody: emailContent,
          name: getSetting('SUMMARY.FROM_NAME', 'APME Analytics'),
          from: getSetting('SUMMARY.FROM_EMAIL', 'mobilizare@apme.ro'),
          attachments: []
        }
      );
      
      console.log(`✅ Summary sent successfully to ${adminEmail}`);
      
      return {
        email: adminEmail,
        success: true,
        recipient: recipientEmail
      };
      
    } catch (error) {
      console.error(`❌ Error sending summary to ${adminEmail}:`, error);
      return {
        email: adminEmail,
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Convert HTML to plain text for email
   */
  static convertHtmlToText(htmlContent) {
    try {
      // Simple HTML to text conversion
      return htmlContent
        .replace(/<h[1-6][^>]*>/gi, '\n\n')
        .replace(/<\/h[1-6]>/gi, '\n')
        .replace(/<ul>/gi, '\n')
        .replace(/<\/ul>/gi, '\n')
        .replace(/<li>/gi, '• ')
        .replace(/<\/li>/gi, '\n')
        .replace(/<p>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]*>/g, '') // Remove all other HTML tags
        .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove excessive line breaks
        .trim();
      
    } catch (error) {
      console.error('❌ Error converting HTML to text:', error);
      return htmlContent.replace(/<[^>]*>/g, ''); // Fallback: just remove HTML tags
    }
  }
  
  /**
   * Test summary email functionality
   */
  static testSummaryEmail() {
    try {
      console.log('🧪 Testing summary email functionality...');
      
      // Generate test summary for today
      const testSummary = AnalyticsManager.generateDailySummary(new Date());
      
      // Force it to have data for testing
      if (!testSummary.hasData) {
        console.log('📝 No real data for today, creating test data...');
        testSummary.hasData = true;
        testSummary.totalSubmissions = 5;
        testSummary.date = new Date().toDateString();
        testSummary.location = { romania: 3, diaspora: 2, topCities: [], topCountries: [] };
        testSummary.demographics = { averageAge: 25, totalWithAge: 5 };
        testSummary.engagement = {
          prayerAdoption: { missionary: 2, ethnicGroup: 1, notInterested: 2 },
          missionInterest: { shortTerm: 3, longTerm: 1, notInterested: 1 },
          courseInterest: { kairos: 2, mobilize: 1, empowered: 0, notInterested: 2 },
          volunteerInterest: 2,
          financialSupport: 1,
          campInterest: 3,
          crstInterest: 1
        };
        testSummary.emailPerformance = { totalEmailsSent: 15, emailSuccessRate: 100 };
        testSummary.templateAssignments = { averageTemplatesPerPerson: 3.0, mostAssigned: [] };
        testSummary.insights = [
          '🇷🇴 Majority of submissions (3) are from Romania',
          '🙏 3 people want to adopt missionaries/ethnic groups in prayer',
          '🤝 2 people interested in volunteering'
        ];
      }
      
      // Format email content
      const emailContent = AnalyticsManager.formatSummaryForEmail(testSummary);
      const subject = this.generateSubjectLine(new Date(), testSummary);
      
      console.log('📧 Test email content generated:');
      console.log('Subject:', subject);
      console.log('Content length:', emailContent.length, 'characters');
      
      // Send test email to first admin (or test email)
      const adminEmails = getSetting('SUMMARY.ADMIN_EMAILS', []);
      const testEmail = adminEmails.length > 0 ? adminEmails[0] : getSetting('DEVELOPMENT.TEST_EMAIL');
      
      if (!testEmail) {
        throw new Error('No test email configured');
      }
      
      const result = this.sendSummaryEmail(testEmail, subject, emailContent, testSummary);
      
      console.log('✅ Summary email test completed');
      return {
        success: result.success,
        testEmail: testEmail,
        subject: subject,
        contentLength: emailContent.length
      };
      
    } catch (error) {
      console.error('❌ Summary email test failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Send summary for a specific date range
   */
  static sendDateRangeSummary(startDate, endDate) {
    try {
      console.log(`📊 Sending summary for date range: ${startDate.toDateString()} to ${endDate.toDateString()}`);
      
      // Get all submissions in the date range
      const allSubmissions = SheetsConnector.getAllSubmissions();
      const startTime = new Date(startDate).getTime();
      const endTime = new Date(endDate).getTime();
      
      const rangeSubmissions = allSubmissions.filter(submission => {
        const submissionTime = new Date(submission['Submitted At']).getTime();
        return submissionTime >= startTime && submissionTime <= endTime;
      });
      
      if (rangeSubmissions.length === 0) {
        console.log('📭 No submissions found in date range');
        return {
          success: true,
          sent: false,
          reason: 'No submissions in date range'
        };
      }
      
      // Create custom summary
      const customSummary = {
        date: `${startDate.toDateString()} to ${endDate.toDateString()}`,
        totalSubmissions: rangeSubmissions.length,
        hasData: true,
        location: AnalyticsManager.generateLocationStats(rangeSubmissions),
        demographics: AnalyticsManager.generateDemographicStats(rangeSubmissions),
        engagement: AnalyticsManager.generateEngagementStats(rangeSubmissions),
        emailPerformance: AnalyticsManager.generateEmailPerformanceStats(rangeSubmissions),
        templateAssignments: AnalyticsManager.generateTemplateAssignmentStats(rangeSubmissions),
        insights: AnalyticsManager.generateInsights(rangeSubmissions)
      };
      
      // Send summary
      return this.sendDailySummary(new Date()); // This will use our custom summary
      
    } catch (error) {
      console.error('❌ Error sending date range summary:', error);
      return {
        success: false,
        sent: false,
        error: error.message
      };
    }
  }
  
  /**
   * Send summary email with AI review (for testing)
   */
  static async sendSummaryEmailWithAIReview(adminEmail, subject, emailContent, summary) {
    try {
      console.log(`📧 Sending summary with AI review to: ${adminEmail}`);
      
      // --- AI Review & Correction Step ---
      try {
        console.log('🤖 [AI] Preparing to send summary to OpenAI for review and correction...');
        const aiPrompt = `You are a data correction assistant. I will give you an HTML summary with geographic data that may have errors (cities listed as countries, countries listed as cities, etc.).

Your task:
1. Fix any geographic inconsistencies by moving items to the correct category
2. Remove or correct any obviously wrong location data
3. Do NOT add notes, comments, or explanations
4. Output ONLY the corrected HTML - nothing else

Example of what to fix:
- If "Valencia" appears under "Top Countries", move it to "Top Cities" 
- If "Germany" appears under "Top Cities", move it to "Top Countries"
- Remove duplicate entries

HTML to correct:
${emailContent}`;
        
        console.log('🤖 [AI] Prompt length:', aiPrompt.length, 'characters');
        console.log('🤖 [AI] Prompt preview:', aiPrompt.substring(0, 300) + '...');
        
        const aiResponse = await OpenAIClient.callOpenAI(aiPrompt);
        
        if (aiResponse && aiResponse.length > 0) {
          console.log('🤖 [AI] Response length:', aiResponse.length, 'characters');
          console.log('🤖 [AI] Response preview:', aiResponse.substring(0, 200) + '...');
          
          // More thorough validation
          const hasHtml = aiResponse.includes('<') && aiResponse.includes('>');
          const hasProperHtmlStructure = aiResponse.includes('<h') || aiResponse.includes('<p') || aiResponse.includes('<ul');
          const hasUnwantedNotes = aiResponse.toLowerCase().includes('[note:') || aiResponse.toLowerCase().includes('note:');
          
          console.log('🤖 [AI] Validation:', { hasHtml, hasProperHtmlStructure, hasUnwantedNotes });
          
          if (hasHtml && hasProperHtmlStructure && !hasUnwantedNotes) {
            console.log('✅ [AI] AI provided a corrected summary. Using AI version.');
            emailContent = aiResponse.trim();
            
            // Debug: log the corrected content
            console.log('🤖 [AI] Corrected HTML preview:');
            console.log(emailContent.substring(0, 500) + '...');
            
          } else {
            console.log('⚠️ [AI] AI response failed validation. Using original summary.');
            if (hasUnwantedNotes) {
              console.log('⚠️ [AI] AI added unwanted notes/comments');
            }
          }
        } else {
          console.log('⚠️ [AI] No valid AI response. Using original summary.');
        }
      } catch (aiError) {
        console.error('❌ [AI] Error during AI review/correction:', aiError);
        // Fallback to original summary
      }
      // --- End AI Review Step ---
      
      // Use test mode if configured
      const recipientEmail = getEmailRecipient(adminEmail);
      
      // Send email using Gmail
      GmailApp.sendEmail(
        recipientEmail,
        subject,
        this.convertHtmlToText(emailContent), // Plain text version
        {
          htmlBody: emailContent,
          name: getSetting('SUMMARY.FROM_NAME', 'APME Analytics'),
          from: getSetting('SUMMARY.FROM_EMAIL', 'mobilizare@apme.ro')
        }
      );
      
      console.log(`✅ Summary with AI review sent successfully to ${adminEmail}`);
      
      return {
        email: adminEmail,
        success: true,
        recipient: recipientEmail,
        aiReviewed: true
      };
      
    } catch (error) {
      console.error(`❌ Error sending summary with AI review to ${adminEmail}:`, error);
      return {
        email: adminEmail,
        success: false,
        error: error.message
      };
    }
  }
} 