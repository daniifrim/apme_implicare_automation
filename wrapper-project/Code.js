/**
 * Fillout Spreadsheet - Mission Automation Wrapper
 * This minimal bound script connects to the standalone APME project
 * Created for: https://docs.google.com/spreadsheets/d/1otbJUQAuVxVr0xIbGFXWl4Ke5fWaw1O78RNFjJcFNVo
 */

// IMPORTANT: This should be the LIBRARY ID, not the script ID
// Library ID from the main project deployment
const APME_LIBRARY_ID = '1Q32fzhqvPJytC0B2TLFruj4RRCBnNKMJy-BQJjrpoHCgvMu2b2DzaVAN'; // This is the library ID from CLAUDE.md

/**
 * onOpen trigger - Creates menu when spreadsheet opens
 */
function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('🎯 Mission Emailer')
      .addItem('📊 Open Email Sidebar', 'showMissionEmailerSidebar')
      .addItem('🔄 Process New Submissions', 'processFilloutSubmission')
      .addItem('📧 Send Scheduled Emails', 'sendScheduledEmails')
      .addSeparator()
      .addItem('🧪 Test Connection', 'testSheetsConnection')
      .addItem('🚀 Test Email Automation', 'testEmailAutomationWithLastSubmission')
      .addItem('⚙️ Setup Automation Triggers', 'setupAutomationTriggers')
      .addToUi();
    console.log('✅ Mission Emailer menu added to Fillout spreadsheet');
  } catch (error) {
    console.error('❌ Menu creation error:', error.message);
  }
}

/**
 * Quick setup function - run this first
 */
function setupFilloutConnection() {
  console.log('🚀 Setting up Fillout spreadsheet connection...');
  
  try {
    // Test if the library is properly connected
    if (typeof APME === 'undefined') {
      throw new Error('APME library not loaded. Check library ID and version.');
    }
    
    console.log('✅ APME library connected successfully');
    
    // Test basic connection
    const testResult = APME.testSheetsConnection();
    if (testResult.success) {
      console.log('✅ Connection test passed:', testResult.spreadsheetName);
    } else {
      console.warn('⚠️ Connection test failed:', testResult.error);
    }
    
    // Add menu automatically
    onOpen();
    
    console.log('🎉 Fillout connection setup complete!');
    
    return {
      success: true,
      message: 'Fillout spreadsheet successfully connected to APME automation',
      libraryStatus: 'connected',
      menuStatus: 'added'
    };
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    return {
      success: false,
      error: error.message,
      help: 'Make sure APME_LIBRARY_ID is set correctly to your standalone script ID'
    };
  }
}

/**
 * Wrapper functions that call the standalone APME library
 */

function showMissionEmailerSidebar() {
  try {
    return APME.showMissionEmailerSidebar();
  } catch (error) {
    console.error('❌ Sidebar error:', error);
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
  }
}

function processFilloutSubmission() {
  try {
    return APME.processFilloutSubmission();
  } catch (error) {
    console.error('❌ Processing error:', error);
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
  }
}

function sendScheduledEmails() {
  try {
    return APME.sendScheduledEmails();
  } catch (error) {
    console.error('❌ Email sending error:', error);
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
  }
}

function testSheetsConnection() {
  try {
    return APME.testSheetsConnection();
  } catch (error) {
    console.error('❌ Connection test error:', error);
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
  }
}

function setupAutomationTriggers() {
  try {
    return APME.setupAutomationTriggers();
  } catch (error) {
    console.error('❌ Trigger setup error:', error);
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
  }
}

function quickValidationTest() {
  try {
    return APME.quickValidationTest();
  } catch (error) {
    console.error('❌ Validation error:', error);
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
  }
}

function syncTemplatesNow() {
  try {
    return APME.syncTemplatesNow();
  } catch (error) {
    console.error('❌ Template sync error:', error);
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
  }
}

function testEmailAutomationWithLastSubmission() {
  try {
    return APME.testEmailAutomationWithLastSubmission();
  } catch (error) {
    console.error('❌ Email automation test error:', error);
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
  }
}

/**
 * Helper function to get the standalone script ID
 */
function getStandaloneScriptId() {
  return APME_LIBRARY_ID;
}

/**
 * Test the library connection
 */
function testLibraryConnection() {
  console.log('🔍 Testing library connection...');
  
  try {
    if (typeof APME === 'undefined') {
      return {
        success: false,
        error: 'APME library not loaded',
        instructions: 'Add the APME library with ID: ' + APME_LIBRARY_ID
      };
    }
    
    const connectionTest = APME.testSheetsConnection();
    return {
      success: true,
      libraryConnected: true,
      spreadsheetConnection: connectionTest,
      message: 'Library connection successful'
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      instructions: 'Check library ID and version in Project Properties'
    };
  }
}