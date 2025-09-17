/**
 * Google Docs to HTML Email Converter
 * Converts Google Docs to HTML for email sending with inline images
 */

class GDocsConverter {
  
  /**
   * Converts a Google Doc to HTML and sends it as an email
   * @param {string} docUrl - The Google Doc URL
   * @param {string} recipient - Email recipient
   * @param {string} subject - Email subject
   * @param {Object} templateData - Data for template placeholders
   */
  static sendEmailFromGDoc(docUrl, recipient, subject, templateData = {}) {
    try {
      // 1. Extract Doc ID from URL
      const docId = this.extractDocId(docUrl);
      if (!docId) {
        throw new Error('Could not extract document ID from URL: ' + docUrl);
      }

      // 2. Grant Drive scope by touching the file
      DriveApp.getFileById(docId);

      // 3. Export Doc to HTML
      const html = this.exportDocToHtml(docId);

      // 4. Process template placeholders
      let processedHtml = this.processPlaceholders(html, templateData);

      // 5. Fix hyperlinks if needed
      processedHtml = this.patchHyperlinks(processedHtml, docUrl);

      // 6. Extract and inline images
      const { htmlWithInlineImages, inlineImages } = this.extractAndInlineImages(processedHtml);

      // 7. Send the email
      this.sendHtmlEmail(recipient, subject, htmlWithInlineImages, inlineImages);

      console.log(`✅ Email sent to ${recipient} using Doc ID ${docId}, inlined ${Object.keys(inlineImages).length} images.`);
      return {
        success: true,
        recipient,
        docId,
        imagesInlined: Object.keys(inlineImages).length
      };

    } catch (error) {
      console.error('❌ Error in sendEmailFromGDoc:', error);
      throw error;
    }
  }

  /**
   * Test function - matches your original functionality
   */
  static testConversion() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Email Templates');
    if (!sheet) throw new Error('Sheet "Email Templates" not found.');

    // Read parameters from the sheet (your original logic)
    const firstName = 'Dani';  // placeholder value
    const linkText = 'Evenimente – Tabere de Misiune';
    const recipient = 'danifrim14@gmail.com';
    const nameCell = sheet.getRange('A2').getDisplayValue();
    const fallbackUrl = sheet.getRange('F2').getDisplayValue();
    const richValue = sheet.getRange('B2').getRichTextValue();
    const docUrl = (richValue && richValue.getLinkUrl()) || fallbackUrl;

    if (!docUrl) throw new Error('No Doc URL found in B2 or F2.');

    // Use the new modular approach
    return this.sendEmailFromGDoc(
      docUrl, 
      recipient, 
      `Test: ${nameCell}`,
      { FirstName: firstName, linkText: linkText }
    );
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Extract document ID from Google Docs URL
   */
  static extractDocId(docUrl) {
    const match = docUrl.match(/\/d\/([A-Za-z0-9_-]+)/);
    return match ? match[1] : null;
  }

  /**
   * Export Google Doc to HTML using Drive API
   */
  static exportDocToHtml(docId) {
    const exportUrl = `https://www.googleapis.com/drive/v3/files/${docId}/export?mimeType=text/html`;
    const response = UrlFetchApp.fetch(exportUrl, {
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }
    });
    return response.getContentText();
  }

  /**
   * Process template placeholders in HTML
   */
  static processPlaceholders(html, templateData) {
    let processedHtml = html;

    // Replace {{FirstName}} and other placeholders
    for (const [key, value] of Object.entries(templateData)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      processedHtml = processedHtml.replace(regex, value);
    }

    return processedHtml;
  }

  /**
   * Patch hyperlinks in HTML (your original logic)
   */
  static patchHyperlinks(html, docUrl, linkText) {
    if (!linkText) return html;

    const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const linkRe = new RegExp(
      `<a[^>]*>\\s*${esc(linkText)}\\s*<\\/a>`,
      'g'
    );
    
    return html.replace(linkRe, tag => tag.replace(
      /<a[^>]*>/,
      `<a href="${docUrl}">`
    ));
  }

  /**
   * Extract images and convert to inline attachments
   */
  static extractAndInlineImages(html) {
    const inlineImages = {};
    let imgIndex = 0;
    
    const htmlWithInlineImages = html.replace(
      /<img\s+[^>]*src="([^"]+)"[^>]*>/g,
      (tag, src) => {
        try {
          const blob = UrlFetchApp.fetch(src).getBlob();
          const cid = `img${imgIndex++}`;
          inlineImages[cid] = blob;
          return tag.replace(src, `cid:${cid}`);
        } catch (error) {
          console.warn('⚠️ Could not fetch image:', src, error);
          return tag; // Return original tag if image fetch fails
        }
      }
    );

    return { htmlWithInlineImages, inlineImages };
  }

  /**
   * Send HTML email with inline images
   */
  static sendHtmlEmail(recipient, subject, htmlBody, inlineImages) {
    GmailApp.sendEmail(recipient, subject, '', {
      htmlBody: htmlBody,
      inlineImages: inlineImages
    });
  }
} 