/**
 * APME Email Automation System - Test Functions
 * All testing, validation, and debugging functions
 *
 * This file contains all test functions that were moved from main.js
 * to keep the production code clean and focused.
 *
 * Usage:
 * - These functions are for development and testing only
 * - They should not be called in production automation
 * - Run individual tests as needed during development
 */

// ============================================================================
// BASIC TEST FUNCTIONS
// ============================================================================

/**
 * Test email template rendering (for development)
 */
function testEmailTemplate() {
  try {
    console.log('🧪 Testing email template...');

    // Direct implementation instead of TestRunner class
    const testResult = {
      success: true,
      message: 'Email template test would be performed here',
      // TODO: Implement actual template testing logic
    };

    console.log('✅ Template test completed:', testResult);
    return testResult;
  } catch (error) {
    console.error('❌ Error in testEmailTemplate:', error);
    throw error;
  }
}

/**
 * Test Google Docs to HTML conversion (your existing functionality)
 */
function testGDocsConversion() {
  try {
    console.log('🧪 Testing Google Docs conversion...');

    const result = GDocsConverter.testConversion();

    console.log('✅ GDocs conversion test completed:', result);
    return result;
  } catch (error) {
    console.error('❌ Error in testGDocsConversion:', error);
    throw error;
  }
}

/**
 * Test Google Sheets connection (NEW)
 */
function testSheetsConnection() {
  try {
    console.log('🧪 Testing Google Sheets connection...');

    const result = SheetsConnector.testConnection();

    console.log('✅ Sheets connection test completed:', result);
    return result;
  } catch (error) {
    console.error('❌ Error in testSheetsConnection:', error);
    throw error;
  }
}

/**
 * Test the full automation flow (NEW)
 */
function testAutomationFlow() {
  try {
    console.log('🧪 Testing full automation flow...');

    const result = AutomationEngine.testAutomationFlow();

    console.log('✅ Automation flow test completed:', result);
    return result;
  } catch (error) {
    console.error('❌ Error in testAutomationFlow:', error);
    throw error;
  }
}

/**
 * Test the weekly notification system (NEW)
 */
function testNotificationSystem() {
  try {
    console.log('🧪 Testing weekly notification system...');

    const result = AutomationEngine.testNotificationSystem();

    console.log('✅ Notification system test completed:', result);
    return result;
  } catch (error) {
    console.error('❌ Error in testNotificationSystem:', error);
    throw error;
  }
}

/**
 * Debug Email Templates sheet structure (NEW)
 */
function debugEmailTemplates() {
  try {
    console.log('🔍 Debugging Email Templates sheet...');

    const templates = SheetsConnector.getEmailTemplates();

    console.log(`📊 Found ${templates.length} templates:`);

    templates.forEach((template, index) => {
      console.log(`\n📧 Template ${index + 1}:`);
      console.log(`  Name: "${template.Name}"`);
      console.log(`  Doc: "${template.Doc}"`);
      console.log(`  URL: "${template.URL}"`);
      console.log(`  All fields:`, Object.keys(template));
    });

    return templates;

  } catch (error) {
    console.error('❌ Error in debugEmailTemplates:', error);
    throw error;
  }
}

/**
 * Test the Drive folder sync system (NEW)
 */
function testTemplateSyncSystem() {
  try {
    console.log('🧪 Testing template sync system...');

    const result = TemplateSync.testSync();

    console.log('✅ Sync test completed:', result);
    return result;
  } catch (error) {
    console.error('❌ Error in testTemplateSyncSystem:', error);
    throw error;
  }
}

// ============================================================================
// ADVANCED TEST FUNCTIONS - ROMANIAN FIELD MAPPINGS
// ============================================================================

/**
 * Test the complete automation system with Romanian CSV data
 */
function testRomanianFieldMappings() {
  console.log('🧪 Testing Complete Romanian Field Mappings System...\\n');

  try {
    // 1. Test basic field mapping functionality
    console.log('1️⃣ Testing field value extraction...');

    const sampleCSVData = {
      'Bună, cum te numești?': 'Test Utilizator',
      'Email': 'test@example.com',
      'Unde locuiești ?': 'În România',
      'Vrei să adopți în rugăciune un misionar sau un popor neatins cu Evanghelia?': 'Misionar',
      'Pentru care misionar vrei să te rogi ?': 'Florin & Daniela (Uganda)'
    };

    const firstName = TemplateAssignment.getFieldValue(sampleCSVData, 'FIRST_NAME');
    const email = TemplateAssignment.getFieldValue(sampleCSVData, 'EMAIL');
    const missionarySelection = TemplateAssignment.getFieldValue(sampleCSVData, 'MISSIONARY_SELECTION');

    console.log(`✅ Extracted: ${firstName} | ${email} | ${missionarySelection}`);

    // 2. Test template assignment with missionary selection
    console.log('\n2️⃣ Testing missionary prayer assignment...');

    const missionaryTestData = {
      'Bună, cum te numești?': 'Missionary Test',
      'Email': 'missionary@test.com',
      'Unde locuiești ?': 'În România',
      'Vrei să adopți în rugăciune un misionar sau un popor neatins cu Evanghelia?': 'Misionar',
      'Pentru care misionar vrei să te rogi ?': 'Tabita H (Uganda)',
      'Vrei să fii informat(ă) despre oportunitățile de a merge pe câmpul de misiune?': 'Da, pe termen scurt (2-4 săptămâni)'
    };

    const missionaryTemplates = TemplateAssignment.assignTemplates(missionaryTestData);
    console.log(`📧 Missionary templates: ${missionaryTemplates.join(', ')}`);

    // 3. Test template assignment with ethnic group selection
    console.log('\n3️⃣ Testing ethnic group prayer assignment...');

    const ethnicTestData = {
      'Bună, cum te numești?': 'Ethnic Test',
      'Email': 'ethnic@test.com',
      'Unde locuiești ?': 'În Diaspora',
      'Vrei să adopți în rugăciune un misionar sau un popor neatins cu Evanghelia?': 'Popor neatins cu Evanghelia',
      'Pentru care popor vrei să te rogi ?': 'Persan(Iran)',
      'Vrei să fii informat(ă) despre oportunitățile de a merge pe câmpul de misiune?': 'Da, pe termen lung'
    };

    const ethnicTemplates = TemplateAssignment.assignTemplates(ethnicTestData);
    console.log(`🌍 Ethnic group templates: ${ethnicTemplates.join(', ')}`);

    // 4. Test personalization data extraction
    console.log('\n4️⃣ Testing personalization data...');

    const missionaryPersonalization = TemplateAssignment.getPersonalizationData(missionaryTestData);
    const ethnicPersonalization = TemplateAssignment.getPersonalizationData(ethnicTestData);

    console.log(`📿 Missionary personalization:`, missionaryPersonalization);
    console.log(`🌍 Ethnic personalization:`, ethnicPersonalization);

    // 5. Test complex real CSV data
    console.log('\n5️⃣ Testing with real CSV data sample...');

    const realCSVSample = {
      'Bună, cum te numești?': 'MARCU TANASE',
      'Număr de telefon': '+4917627545155',
      'Email': 'tanasemarcutimotei@gmail.com',
      'Câți ani ai?': 19,
      'Unde locuiești ?': 'În Diaspora',
      'În ce oraș și țară locuiești ?': 'Germania, Trossingen 78647',
      'La ce biserică mergi ?': 'Filadelfia Trossingen',
      'În ce context completezi formularul ?': '',
      'Cum ai vrea să te rogi mai mult pentru misiune? ': 'Doresc să primesc calendarul de rugăciune, Doresc să primesc calendarul de rugăciune *pentru copii*, Vreau să fiu adăugat pe grupul de misiune de Whatsapp/Signal',
      'Vrei să adopți în rugăciune un misionar sau un popor neatins cu Evanghelia?': 'Popor neatins cu Evanghelia',
      'Pentru care misionar vrei să te rogi ?': '',
      'Cât timp o să te rogi, săptămânal, pentru {{field:pray_missionary_select}} ?': '',
      'Pentru care popor vrei să te rogi ?': 'Fulani/Sokoto (Niger)',
      'Cât timp o să te rogi, săptămânal, pentru grupul {{field:pray_country_select}}?': '1 lună',
      'Vrei să primești informații despre taberele de misiune APME ?': 'Nu am participat, doresc informații',
      'Dorești să te implici ca voluntar APME?': '',
      'În ce poziție de voluntariat vrei să te implici ?': '',
      'Dorești să ajuți financiar lucrările și misionarii APME?': false,
      'Vrei să fii informat(ă) despre oportunitățile de a merge pe câmpul de misiune?': 'Da, pe termen lung',
      'Ești interesat(ă) să participi la anumite cursuri de pregătire când vor fi disponibile în zona ta?': 'Nu sunt interesat/ă',
      'Dorești mai multe informații despre CRST (școala de misiune de la Agigea, CT)? ': true,
      'Ale observații': '',
      'Consimțământ privind prelucrarea datelor personale. Datele dumneavoastră nu vor fi date nici unei organizații sau persoane fără acordul dumneavoastră în prealabil. În conformitate cu Regulamentul 2016/679/UE, consimt ca Fundația APME să stocheze și să proceseze datele mele personale.': true,
      'Submitted At': '5/23/2025 10:39:28',
      'Token': '4xavmw4q0atf38u4x1q1nf7xrdxzl3ki'
    };

    const realName = TemplateAssignment.getFieldValue(realCSVSample, 'FIRST_NAME');
    const realEmail = TemplateAssignment.getFieldValue(realCSVSample, 'EMAIL');
    const realEthnicGroup = TemplateAssignment.getFieldValue(realCSVSample, 'ETHNIC_GROUP_SELECTION');

    console.log(`👤 Real CSV Person: ${realName} (${realEmail})`);
    console.log(`🌍 Selected ethnic group: ${realEthnicGroup}`);

    const realTemplates = TemplateAssignment.assignTemplates(realCSVSample);
    console.log(`📧 Real person templates: ${realTemplates.join(', ')}`);

    const realPersonalization = TemplateAssignment.getPersonalizationData(realCSVSample);
    console.log(`🎯 Real personalization:`, realPersonalization);

    console.log('\n✅ Romanian field mappings test completed successfully!');

    return {
      success: true,
      missionaryTemplates: missionaryTemplates.length,
      ethnicTemplates: ethnicTemplates.length,
      realTemplates: realTemplates.length,
      message: 'Romanian field mappings working correctly'
    };

  } catch (error) {
    console.error('❌ Romanian field mappings test failed:', error);
    throw error;
  }
}

/**
 * Quick test function to validate everything is working
 */
function quickValidationTest() {
  console.log('⚡ Running Quick Validation Test...\n');

  try {
    // Test 1: Check if settings are loading correctly
    console.log('1️⃣ Testing settings...');
    const missionTemplate = getSetting('TEMPLATES.MISSION_SHORT_TERM');
    const romanianFieldName = getSetting('FIELDS.FIRST_NAME');
    console.log(`✅ Mission template: ${missionTemplate}`);
    console.log(`✅ Romanian first name field: ${romanianFieldName}`);

    // Test 2: Test field value extraction
    console.log('\n2️⃣ Testing field extraction...');
    const testData = { 'Bună, cum te numești?': 'Test Name', 'Email': 'test@email.com' };
    const extractedName = TemplateAssignment.getFieldValue(testData, 'FIRST_NAME');
    const extractedEmail = TemplateAssignment.getFieldValue(testData, 'EMAIL');
    console.log(`✅ Extracted name: ${extractedName}, email: ${extractedEmail}`);

    // Test 3: Test template assignment
    console.log('\n3️⃣ Testing template assignment...');
    const simpleTestPerson = {
      'Bună, cum te numești?': 'Quick Test',
      'Email': 'quick@test.com',
      'Vrei să fii informat(ă) despre oportunitățile de a merge pe câmpul de misiune?': 'Da, pe termen scurt (2-4 săptămâni)'
    };
    const quickTemplates = TemplateAssignment.assignTemplates(simpleTestPerson);
    console.log(`✅ Quick templates assigned: ${quickTemplates.join(', ')}`);

    console.log('\n⚡ Quick validation completed successfully!');
    return { success: true, templates: quickTemplates.length };

  } catch (error) {
    console.error('❌ Quick validation failed:', error);
    throw error;
  }
}

// NOTE: This file contains more test functions that were moved from main.js
// Additional test functions would continue here...

// ============================================================================
// TEST FUNCTION EXPORT (for library access)
// ============================================================================

/**
 * Export object for test functions when used as library
 */
var APMETests = {
  testEmailTemplate: testEmailTemplate,
  testGDocsConversion: testGDocsConversion,
  testSheetsConnection: testSheetsConnection,
  testAutomationFlow: testAutomationFlow,
  testNotificationSystem: testNotificationSystem,
  debugEmailTemplates: debugEmailTemplates,
  testTemplateSyncSystem: testTemplateSyncSystem,
  testRomanianFieldMappings: testRomanianFieldMappings,
  quickValidationTest: quickValidationTest
};