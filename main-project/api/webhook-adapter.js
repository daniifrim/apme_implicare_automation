/**
 * APME Webhook Adapter
 * Receives external webhook requests and sends templated emails via Google Docs.
 *
 * ============================================================================
 * DEPLOYMENT INSTRUCTIONS
 * ============================================================================
 * 1. Open the Google Apps Script project.
 * 2. Select "Publish" -> "Deploy as web app".
 * 3. Choose "Execute the app as: Me".
 * 4. Choose "Who has access to the app: Anyone".
 * 5. Copy the deployed web app URL.
 * 6. Configure the WEBHOOK_API_KEY script property:
 *    - File -> Project properties -> Script properties
 *    - Add property: WEBHOOK_API_KEY = <your-secure-key>
 * 7. Send POST requests to the deployed URL with JSON body.
 * ============================================================================
 */

class WebhookAdapter {

  /**
   * Main handler for incoming webhook POST requests.
   * @param {Object} e - The Apps Script event object.
   * @returns {TextOutput} JSON response.
   */
  static handleRequest(e) {
    try {
      // 1. Parse JSON payload
      var data = JSON.parse(e.postData.contents);

      // 2. Validate API key
      var expectedKey = getSetting('WEBHOOK.API_KEY');
      if (!data.apiKey || data.apiKey !== expectedKey) {
        return this.createErrorResponse('Invalid or missing API key', 401);
      }

      // 3. Validate required fields
      var missingFields = [];
      if (!data.email) {
        missingFields.push('email');
      }
      if (!data.templateName) {
        missingFields.push('templateName');
      }
      if (!data.jobId) {
        missingFields.push('jobId');
      }

      if (missingFields.length > 0) {
        return this.createErrorResponse(
          'Missing required fields: ' + missingFields.join(', '),
          400,
          { missingFields: missingFields }
        );
      }

      // 4. Look up template
      var templates = SheetsConnector.getEmailTemplates();
      var template = null;
      for (var i = 0; i < templates.length; i++) {
        if (templates[i].Name === data.templateName) {
          template = templates[i];
          break;
        }
      }

      if (!template) {
        return this.createErrorResponse(
          'Template "' + data.templateName + '" not found',
          404
        );
      }

      // 5. Build Google Doc URL from template
      var docUrl = null;
      if (template.Doc && template.Doc.indexOf('docs.google.com') !== -1) {
        docUrl = template.Doc;
      } else if (template.DocURL) {
        docUrl = template.DocURL;
      } else if (template.URL && template.URL.indexOf('docs.google.com') !== -1) {
        docUrl = template.URL;
      } else if (template['Fallback URL']) {
        docUrl = template['Fallback URL'];
      }

      if (!docUrl) {
        return this.createErrorResponse(
          'No valid Google Doc URL found for template "' + data.templateName + '"',
          404
        );
      }

      // 6. Build template data
      var templateData = {};
      if (data.personalizationData && data.personalizationData.FirstName) {
        templateData.FirstName = data.personalizationData.FirstName;
      } else {
        templateData.FirstName = 'Prieten';
      }

      if (data.personalizationData) {
        for (var key in data.personalizationData) {
          if (data.personalizationData.hasOwnProperty(key)) {
            templateData[key] = data.personalizationData[key];
          }
        }
      }

      // 7. Generate subject line
      var subjectMap = {
        'Info Misiune pe termen scurt APME': getSetting('EMAIL.SUBJECTS.MISSION_INFO'),
        'Rugăciune pentru misionari': getSetting('EMAIL.SUBJECTS.PRAYER_MISSIONARY'),
        'Rugăciune pentru grup etnic': getSetting('EMAIL.SUBJECTS.PRAYER_ETHNIC'),
        'Info Tabere Misiune APME': getSetting('EMAIL.SUBJECTS.CAMP_INFO'),
        'Info despre cursul Kairos': getSetting('EMAIL.SUBJECTS.COURSE_KAIROS'),
        'Info despre cursul Mobilizează': getSetting('EMAIL.SUBJECTS.COURSE_MOBILIZE'),
        'Info Voluntariat APME': getSetting('EMAIL.SUBJECTS.VOLUNTEER_INFO'),
        'Info Donații APME': getSetting('EMAIL.SUBJECTS.DONATION_INFO')
      };

      var subject = subjectMap[data.templateName] || ('APME - ' + data.templateName);
      if (templateData.FirstName && templateData.FirstName !== 'Prieten') {
        subject = subject + ' - ' + templateData.FirstName;
      }

      // 8. Send email
      var result = GDocsConverter.sendEmailFromGDoc(
        docUrl,
        getEmailRecipient(data.email),
        subject,
        templateData
      );

      // 9. Log to email history
      var personName = 'Prieten';
      if (data.personalizationData && data.personalizationData.FirstName) {
        personName = data.personalizationData.FirstName;
      }

      var responseID = '';
      if (data.submissionId) {
        responseID = data.submissionId;
      } else if (data.jobId) {
        responseID = data.jobId;
      }

      EmailHistoryManager.logEmailSent(
        data.email,
        data.templateName,
        'Webhook',
        responseID,
        personName,
        'Sent via webhook for job ' + data.jobId
      );

      // 10. Return success response
      var successResponse = {
        status: 'success',
        message: 'Email sent successfully',
        recipient: result.recipient,
        template: data.templateName,
        jobId: data.jobId
      };

      return this.createJsonResponse(successResponse, 200);

    } catch (error) {
      console.error('WebhookAdapter.handleRequest error:', error);
      return this.createErrorResponse('Internal server error: ' + error.message, 500);
    }
  }

  /**
   * Create a JSON response with the given data and status code.
   * @param {Object} data - The response data.
   * @param {number} statusCode - HTTP status code.
   * @returns {TextOutput} Apps Script TextOutput with JSON mime type.
   */
  static createJsonResponse(data, statusCode) {
    // Note: Apps Script web apps always return HTTP 200.
    // Status codes are conveyed in the JSON body for client-side handling.
    var response = data;
    if (statusCode && statusCode !== 200) {
      response.httpStatus = statusCode;
    }

    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
  }

  /**
   * Create a JSON error response.
   * @param {string} message - Error message.
   * @param {number} statusCode - HTTP status code.
   * @param {Object} details - Optional additional error details.
   * @returns {TextOutput} Apps Script TextOutput with JSON mime type.
   */
  static createErrorResponse(message, statusCode, details) {
    var errorData = {
      status: 'error',
      message: message
    };

    if (details) {
      errorData.details = details;
    }

    return this.createJsonResponse(errorData, statusCode || 400);
  }
}

// ============================================================================
// GLOBAL ENTRY POINTS
// ============================================================================

/**
 * Handle incoming POST requests.
 * @param {Object} e - The Apps Script event object.
 * @returns {TextOutput} JSON response.
 */
function doPost(e) {
  try {
    return WebhookAdapter.handleRequest(e);
  } catch (error) {
    console.error('Webhook error:', error);
    var errorResponse = {
      status: 'error',
      message: 'Internal server error',
      error: error.message,
      httpStatus: 500
    };
    return ContentService.createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle incoming GET requests (health check).
 * @param {Object} e - The Apps Script event object.
 * @returns {TextOutput} JSON response.
 */
function doGet(e) {
  try {
    var settings = getSetting('WEBHOOK', {});
    var response = {
      status: 'ok',
      message: 'APME Webhook Adapter is running',
      timestamp: new Date().toISOString(),
      webhookEnabled: settings.ENABLED !== false
    };
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    var errorResponse = {
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString(),
      httpStatus: 500
    };
    return ContentService.createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
