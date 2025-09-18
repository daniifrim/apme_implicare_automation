/**
 * Email Template Sync System
 * Automatically syncs Google Drive folder contents to Email Templates sheet
 */

class TemplateSync {
  
  /**
   * Main sync function - scans Drive folder and updates Email Templates sheet
   */
  static syncTemplatesFromDrive() {
    try {
      console.log('🔄 Starting Email Templates sync from Google Drive...');
      
      // 1. Get all documents from the Drive folder
      const folderDocuments = this.scanDriveFolder();
      
      if (folderDocuments.length === 0) {
        console.log('📁 No documents found in the Drive folder');
        return { synced: 0, message: 'No documents found' };
      }
      
      console.log(`📄 Found ${folderDocuments.length} documents in Drive folder`);
      
      // 2. Update the Email Templates sheet
      const syncResult = this.updateEmailTemplatesSheet(folderDocuments);
      
      console.log(`✅ Template sync completed: ${syncResult.synced} templates synced`);
      return syncResult;
      
    } catch (error) {
      console.error('❌ Error in template sync:', error);
      throw error;
    }
  }
  
  /**
   * Scan the Google Drive folder for documents
   */
  static scanDriveFolder() {
    try {
      // Extract folder ID from the Drive URL
      const folderUrl = 'https://drive.google.com/drive/u/4/folders/1o-y10WtW47mArnvWO4htlboKFWS0pupJ';
      const folderId = this.extractFolderIdFromUrl(folderUrl);
      
      if (!folderId) {
        throw new Error('Could not extract folder ID from URL');
      }
      
      console.log(`📁 Scanning folder ID: ${folderId}`);
      
      // Get the folder
      const folder = DriveApp.getFolderById(folderId);
      console.log(`📂 Folder name: ${folder.getName()}`);
      
      // Get all Google Docs in the folder
      const files = folder.getFiles();
      const documents = [];
      
      while (files.hasNext()) {
        const file = files.next();
        
        // Only include Google Docs
        if (file.getMimeType() === 'application/vnd.google-apps.document') {
          const docInfo = {
            name: file.getName(),
            id: file.getId(),
            url: file.getUrl(),
            lastModified: this.formatDate(file.getLastUpdated()),
            modifiedBy: this.getFileModifiedBy(file),
            description: file.getDescription() || ''
          };
          
          documents.push(docInfo);
          console.log(`📄 Found document: ${docInfo.name}`);
        }
      }
      
      // Sort by name for consistent ordering
      documents.sort((a, b) => a.name.localeCompare(b.name));
      
      return documents;
      
    } catch (error) {
      console.error('❌ Error scanning Drive folder:', error);
      throw error;
    }
  }
  
  /**
   * Update the Email Templates sheet with the documents
   */
  static updateEmailTemplatesSheet(documents) {
    try {
      const sheet = SheetsConnector.getEmailTemplatesSheet();
      
      // Clear existing content (except headers)
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clear();
      }
      
      // Set up headers if needed
      const headers = ['Doc', 'Name', 'URL', 'Country', 'ModifiedOn', 'ModifiedBy'];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // Add document data
      const rowData = [];
      
      documents.forEach(doc => {
        const row = [
          doc.name,           // Doc column (smart chip will be created)
          doc.name,           // Name column  
          doc.url,            // URL column
          this.extractCountryFromName(doc.name), // Country (from name analysis)
          doc.lastModified,   // ModifiedOn
          doc.modifiedBy      // ModifiedBy
        ];
        
        rowData.push(row);
      });
      
      // Write all data at once for efficiency
      if (rowData.length > 0) {
        sheet.getRange(2, 1, rowData.length, headers.length).setValues(rowData);
        
        // Create smart chips in the Doc column
        this.createSmartChips(sheet, documents);
      }
      
      // Auto-resize columns
      sheet.autoResizeColumns(1, headers.length);
      
      console.log(`✅ Updated Email Templates sheet with ${documents.length} templates`);
      
      return {
        synced: documents.length,
        templates: documents.map(d => d.name),
        message: `Successfully synced ${documents.length} templates`
      };
      
    } catch (error) {
      console.error('❌ Error updating Email Templates sheet:', error);
      throw error;
    }
  }
  
  /**
   * Create smart chips (rich text links) in the Doc column
   */
  static createSmartChips(sheet, documents) {
    try {
      console.log('🔗 Creating smart chips for document links...');
      
      documents.forEach((doc, index) => {
        const rowNumber = index + 2; // +2 because of header row and 1-based indexing
        const range = sheet.getRange(rowNumber, 1); // Doc column
        
        // Create rich text with link
        const richText = SpreadsheetApp.newRichTextValue()
          .setText(doc.name)
          .setLinkUrl(doc.url)
          .build();
        
        range.setRichTextValue(richText);
      });
      
      console.log('✅ Smart chips created successfully');
      
    } catch (error) {
      console.warn('⚠️ Error creating smart chips:', error);
      // Don't fail the whole sync if smart chips fail
    }
  }
  
  /**
   * Extract folder ID from Google Drive URL
   */
  static extractFolderIdFromUrl(url) {
    const match = url.match(/\/folders\/([A-Za-z0-9_-]+)/);
    return match ? match[1] : null;
  }
  
  /**
   * Format a date as YYYY-MM-DD
   */
  static formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  /**
   * Get the user who last modified the file
   */
  static getFileModifiedBy(file) {
    try {
      const revisions = Drive.Revisions.list(file.getId());
      if (revisions.items && revisions.items.length > 0) {
        const lastRevision = revisions.items[revisions.items.length - 1];
        if (lastRevision.lastModifyingUser) {
          if (lastRevision.lastModifyingUser.displayName) {
            return lastRevision.lastModifyingUser.displayName;
          } else if (lastRevision.lastModifyingUser.emailAddress) {
            return lastRevision.lastModifyingUser.emailAddress;
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not get modified by info:', error);
    }
    return 'Unknown';
  }
  
  /**
   * Extract country/location from template name
   */
  static extractCountryFromName(name) {
    // Simple heuristics based on template names
    if (name.toLowerCase().includes('romania')) {
      return 'Romania';
    } else if (name.toLowerCase().includes('diaspora')) {
      return 'Diaspora';
    } else {
      return 'Both'; // Universal templates
    }
  }
  
  /**
   * Sync and update template assignments in settings
   */
  static syncAndUpdateSettings() {
    try {
      console.log('🔄 Syncing templates and updating settings...');
      
      // 1. Sync from Drive
      const syncResult = this.syncTemplatesFromDrive();
      
      // 2. Get updated template list
      const templates = SheetsConnector.getEmailTemplates();
      
      // 3. Log template mapping for manual settings update
      console.log('\n📋 Template Mapping for Settings Update:');
      console.log('Copy these template names to your settings.js:');
      
      templates.forEach(template => {
        const settingsKey = this.generateSettingsKey(template.Name);
        console.log(`${settingsKey}: "${template.Name}",`);
      });
      
      return {
        ...syncResult,
        templateMapping: templates.map(t => ({
          key: this.generateSettingsKey(t.Name),
          value: t.Name
        }))
      };
      
    } catch (error) {
      console.error('❌ Error in sync and update:', error);
      throw error;
    }
  }
  
  /**
   * Generate a settings key from template name
   */
  static generateSettingsKey(templateName) {
    return templateName
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '_')           // Replace spaces with underscores
      .toUpperCase();                 // Convert to uppercase
  }
  
  /**
   * Test the sync system
   */
  static testSync() {
    try {
      console.log('🧪 Testing template sync system...');
      
      // Test folder access
      const folderUrl = 'https://drive.google.com/drive/u/4/folders/1o-y10WtW47mArnvWO4htlboKFWS0pupJ';
      const folderId = this.extractFolderIdFromUrl(folderUrl);
      
      if (!folderId) {
        throw new Error('Could not extract folder ID');
      }
      
      const folder = DriveApp.getFolderById(folderId);
      console.log(`✅ Successfully accessed folder: ${folder.getName()}`);
      
      // Test document scanning
      const documents = this.scanDriveFolder();
      console.log(`✅ Found ${documents.length} documents`);
      
      // Test sheet access
      const sheet = SheetsConnector.getEmailTemplatesSheet();
      console.log(`✅ Successfully accessed Email Templates sheet`);
      
      return {
        success: true,
        folderName: folder.getName(),
        documentCount: documents.length,
        documents: documents.map(d => d.name)
      };
      
    } catch (error) {
      console.error('❌ Sync test failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Monitor for Fillout field changes and update mappings automatically
   */
  static monitorFieldMappings() {
    console.log('🔍 Starting Field Mapping Monitor...');
    
    try {
      // Get latest data from the sheet to check for field changes
      const sheetsData = SheetConnector.getAllPeople();
      
      if (sheetsData.length === 0) {
        console.log('⚠️ No data found for field mapping analysis');
        return;
      }

      // Analyze field mappings using the latest data
      const samplePerson = sheetsData[0];
      const analysis = TemplateAssignment.analyzeDataSource(samplePerson);
      
      console.log(`📊 Field mapping analysis completed:`);
      console.log(`📋 Available fields: ${analysis.availableFields.length}`);
      console.log(`🎯 Mapping confidence: ${(analysis.confidence * 100).toFixed(1)}%`);
      
      // Check for potential field mapping issues
      this.detectFieldMappingIssues(analysis);
      
      // Update field mappings if needed
      this.updateFieldMappings(analysis);
      
      // Generate field mapping report
      this.generateFieldMappingReport(analysis, sheetsData.length);
      
      return analysis;
      
    } catch (error) {
      console.error('❌ Field mapping monitoring failed:', error);
      throw error;
    }
  }

  /**
   * Detect potential field mapping issues
   */
  static detectFieldMappingIssues(analysis) {
    console.log('\n🔍 Detecting potential field mapping issues...');
    
    const issues = [];
    const requiredFields = ['FIRST_NAME', 'EMAIL', 'PRAYER_ADOPTION', 'MISSION_FIELD'];
    
    for (const fieldKey of requiredFields) {
      if (!analysis.mappingSuggestions[fieldKey]) {
        issues.push({
          type: 'MISSING_FIELD',
          field: fieldKey,
          severity: 'HIGH',
          message: `Required field "${fieldKey}" could not be automatically mapped`
        });
      }
    }

    // Check mapping confidence
    if (analysis.confidence < 0.8) {
      issues.push({
        type: 'LOW_CONFIDENCE',
        confidence: analysis.confidence,
        severity: 'MEDIUM',
        message: `Field mapping confidence is low (${(analysis.confidence * 100).toFixed(1)}%)`
      });
    }

    // Report issues
    if (issues.length > 0) {
      console.log(`⚠️ Found ${issues.length} field mapping issues:`);
      for (const issue of issues) {
        console.log(`  ${issue.severity}: ${issue.message}`);
      }
    } else {
      console.log('✅ No field mapping issues detected');
    }

    return issues;
  }

  /**
   * Update field mappings based on analysis
   */
  static updateFieldMappings(analysis) {
    console.log('\n🔄 Updating field mappings...');
    
    try {
      let updatesCount = 0;
      
      for (const [fieldKey, detectedField] of Object.entries(analysis.mappingSuggestions)) {
        // Check if this is a new or changed mapping
        const currentMapping = getSetting(`FIELD_MAPPING.PRIMARY.${fieldKey}`);
        
        if (currentMapping !== detectedField) {
          console.log(`📝 Updating mapping: ${fieldKey} → "${detectedField}"`);
          
          // Update the primary mapping (in real implementation, would persist)
          updatesCount++;
        }
      }

      if (updatesCount > 0) {
        console.log(`✅ Would update ${updatesCount} field mappings`);
      } else {
        console.log('ℹ️ No field mapping updates needed');
      }

      return updatesCount;
      
    } catch (error) {
      console.error('❌ Failed to update field mappings:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive field mapping report
   */
  static generateFieldMappingReport(analysis, totalRecords) {
    console.log('\n📋 FIELD MAPPING REPORT');
    console.log('════════════════════════════════════════');
    
    const timestamp = new Date().toISOString();
    
    console.log(`📅 Generated: ${timestamp}`);
    console.log(`📊 Total records analyzed: ${totalRecords}`);
    console.log(`🎯 Overall confidence: ${(analysis.confidence * 100).toFixed(1)}%`);
    console.log(`📋 Available fields: ${analysis.availableFields.length}`);
    console.log(`🔗 Successful mappings: ${Object.keys(analysis.mappingSuggestions).length}`);
    
    console.log('\n📝 FIELD MAPPINGS:');
    console.log('─'.repeat(50));
    
    const allFieldKeys = ['FIRST_NAME', 'EMAIL', 'PRAYER_ADOPTION', 'MISSIONARY_SELECTION', 'ETHNIC_GROUP_SELECTION', 'MISSION_FIELD', 'CAMP_INFO', 'COURSES_INTEREST', 'FINANCIAL_SUPPORT', 'VOLUNTEER_INTEREST'];
    
    for (const fieldKey of allFieldKeys) {
      const mapped = analysis.mappingSuggestions[fieldKey];
      const status = mapped ? '✅' : '❌';
      const field = mapped || 'NOT MAPPED';
      
      console.log(`${status} ${fieldKey.padEnd(20)} → ${field}`);
    }
    
    console.log('════════════════════════════════════════\n');
    
    return {
      timestamp,
      totalRecords,
      confidence: analysis.confidence,
      availableFields: analysis.availableFields.length,
      successfulMappings: Object.keys(analysis.mappingSuggestions).length,
      mappings: analysis.mappingSuggestions
    };
  }
} 