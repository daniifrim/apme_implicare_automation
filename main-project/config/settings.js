/**
 * APME Email Automation - Configuration Settings
 * All configuration values, IDs, and constants in one place
 */

const SETTINGS = {
  
  // ============================================================================
  // GOOGLE SHEETS CONFIGURATION
  // ============================================================================
  SHEETS: {
    // TODO: Replace these with your actual Google Sheets IDs
    // To get Sheet ID: Open your sheet → Copy the long string from URL between /d/ and /edit
    
    // Your main People Database sheet (with CSV import data)
    PEOPLE_DB_ID: '1otbJUQAuVxVr0xIbGFXWl4Ke5fWaw1O78RNFjJcFNVo',

    // Your Email Templates sheet (if separate)
    EMAIL_TEMPLATES_ID: '1otbJUQAuVxVr0xIbGFXWl4Ke5fWaw1O78RNFjJcFNVo',

    // Your Fillout data sheet (if separate)
    FILLOUT_DATA_ID: '1otbJUQAuVxVr0xIbGFXWl4Ke5fWaw1O78RNFjJcFNVo',

    // Sheet names within your spreadsheet
    PEOPLE_DB_SHEET_NAME: 'Implicare 2.0',
    EMAIL_TEMPLATES_SHEET_NAME: 'Email Templates', 
    FILLOUT_SHEET_NAME: 'Fillout Data',
    ANALYTICS_SHEET_NAME: 'Analytics'
  },

  // ============================================================================
  // EMAIL CONFIGURATION
  // ============================================================================
  EMAIL: {
    FROM_NAME: 'APME Team',
    FROM_EMAIL: 'mobilizare@apme.ro',
    
    // Default subjects for different email types
    SUBJECTS: {
      MISSION_INFO: 'Oportunități de misiune pe termen scurt - APME',
      PRAYER_MISSIONARY: 'Rugăciune pentru misionari - APME',
      PRAYER_ETHNIC: 'Rugăciune pentru grupuri etnice - APME',
      CAMP_INFO: 'Tabere de misiune APME - Informații',
      COURSE_KAIROS: 'Cursul Kairos - APME',
      COURSE_MOBILIZE: 'Cursul Mobilizează - APME',
      VOLUNTEER_INFO: 'Voluntariat APME - Oportunități',
      DONATION_INFO: 'Sprijin financiar APME'
    },

    // Email sending limits and batching
    BATCH_SIZE: 50,
    DAILY_LIMIT: 500,
    DELAY_BETWEEN_EMAILS: 500, // milliseconds
  },

  // ============================================================================
  // WEEKLY NOTIFICATION SYSTEM
  // ============================================================================
  NOTIFICATIONS: {
    // Team member email addresses for weekly notifications
    WEEKLY_RECIPIENTS: {
      WHATSAPP_GROUP: "balicioana@gmail.com",
      CRST_SCHOOL: "secretariat@crst-ct.ro", 
      MISSION_INVOLVEMENT: "betina.serban@interchange.ro"
    },
    
    // Email subjects for notifications
    SUBJECTS: {
      WHATSAPP_GROUP: "Persoane care doresc să fie adăugate pe grupul de misiune",
      CRST_SCHOOL: "Persoane care solicită informații pentru CRST",
      MISSION_INVOLVEMENT: "Persoane interesate în implicare pe misiune"
    },
    
    // Notification criteria mapping to field values
    CRITERIA: {
      WHATSAPP_GROUP: {
        field: 'PRAYER_METHOD',
        contains: 'Vreau să fiu adăugat pe grupul de misiune de Whatsapp/Signal'
      },
      CRST_SCHOOL: {
        field: 'CRST_INFO',
        equals: true
      },
      MISSION_INVOLVEMENT: {
        field: 'MISSION_FIELD',
        contains: ['Da, pe termen scurt (2-4 săptămâni)', 'Da, pe termen lung']
      }
    },
    
    // Email template settings
    EMAIL_SETTINGS: {
      FROM_NAME: 'Echipa de Mobilizare APME',
      SIGNATURE: 'Echipa de Mobilizare APME',
      HIDE_SIGNATURE: true
    },
    
    // Tracking columns in the spreadsheet
    TRACKING_COLUMNS: {
      WHATSAPP_NOTIFICATION_SENT: 'WhatsApp Notification Sent',
      CRST_NOTIFICATION_SENT: 'CRST Notification Sent', 
      MISSION_NOTIFICATION_SENT: 'Mission Notification Sent',
      LAST_NOTIFICATION_DATE: 'Last Notification Date'
    }
  },

  // ============================================================================
  // AUTOMATION TRIGGERS
  // ============================================================================
  TRIGGERS: {
    // When to run daily email processing
    DAILY_EMAIL_HOUR: 9,
    DAILY_EMAIL_MINUTE: 0,
    
    // When to send daily summary to organizers
    DAILY_SUMMARY_HOUR: 20, // 8 PM
    DAILY_SUMMARY_MINUTE: 0,
    
    // How often to check for new Fillout submissions
    FILLOUT_CHECK_INTERVAL: 30, // minutes
    
    // Minimum days between sending emails to same person
    MIN_DAYS_BETWEEN_EMAILS: 30
  },

  // ============================================================================
  // TEMPLATE ASSIGNMENT RULES
  // ============================================================================
  EXCLUSIONS: {
    MISSION_INVOLVEMENT: [
      "Nu acum, poate mai târziu",
      "NU", 
      "Nu am resurse financiare"
    ],
    
    PRAYER_GROUPS: [
      "Nu sunt interesat/ă",
      "Vreau să fiu adăugat pe grupul de misiune de Whatsapp/Signal"
    ],
    
    CAMP_INFO: [
      "Nu sunt interesat/ă",
      "Am participat, doresc să mai fiu informat și pe viitor"
    ],
    
    COURSES: [
      "Nu sunt interesat/ă"
    ]
  },

  // ============================================================================
  // EMAIL TEMPLATES MAPPING
  // ============================================================================
  TEMPLATES: {
    // Universal templates (matching your Email Templates sheet exactly)
    MISSION_SHORT_TERM: "Info Misiune pe termen scurt APME",
    PRAYER_MISSIONARY: "Info Donații APME", // Temporary: Using existing template since prayer template doesn't exist
    PRAYER_ETHNIC: "Info Donații APME", // Temporary: Using existing template since prayer template doesn't exist
    CAMP_INFO: "Info Tabere Misiune APME",
    COURSE_KAIROS: "Info despre cursul Kairos",
    COURSE_KAIROS_COORDINATOR: "Info despre cursul Kairos", // Using Kairos since coordinator doesn't exist
    COURSE_MOBILIZE: "Info despre cursul Mobilizează", 
    COURSE_EMPOWERED: "Info despre cursul Mobilizează", // Using Mobilize since empowered doesn't exist
    DONATION_INFO: "Info Donații APME",
    VOLUNTEER_INFO: "Info Voluntariat APME",
    
    // Location-specific templates (will need to be added to your sheet)
    ROMANIA_PRAYER_GROUP_JOIN: "Info despre grupuri zonale de rugăciune Romania",
    ROMANIA_PRAYER_GROUP_START: "Info despre începerea unui grup zonal de rugăciune Romania", 
    DIASPORA_PRAYER_GROUP_JOIN: "Info despre grupuri zonale de rugăciune Diaspora",
    DIASPORA_PRAYER_GROUP_START: "Info despre începerea unui grup zonal de rugăciune Diaspora"
  },

  // ============================================================================
  // OPENAI API CONFIGURATION
  // ============================================================================
  OPENAI: {
    API_KEY: '', // API key is stored in Script Properties for security
    MODEL: 'gpt-4o',
    BASE_URL: 'https://api.openai.com/v1',
    MAX_TOKENS: 16384,
    TEMPERATURE: 1, // Low temperature for consistent field mapping
    
    // Field mapping specific prompts
    FIELD_MAPPING_PROMPT: `You are an expert at mapping form field names to standardized field keys.

Given a list of available field names and a target field key, find the best matching field name.

Target field meanings:
- FIRST_NAME: Person's first name, name, full name
- EMAIL: Email address, contact email, e-mail
- LOCATION: Where person lives, residence, country, city
- PRAYER_ADOPTION: Prayer for missionary or ethnic group, spiritual adoption
- MISSIONARY_SELECTION: Which specific missionary to pray for
- ETHNIC_GROUP_SELECTION: Which ethnic group/people group to pray for  
- MISSION_FIELD: Mission opportunities, mission trips, overseas service
- CAMP_INFO: Mission camps, training camps, short-term trips
- COURSES_INTEREST: Training courses, educational programs, workshops
- FINANCIAL_SUPPORT: Financial help, donations, monetary support
- VOLUNTEER_INTEREST: Volunteering, service opportunities, involvement

Respond ONLY with the exact field name that best matches, or "NO_MATCH" if none match well.`,

    // Cache management
    CACHE_ENABLED: true,
    CACHE_TTL_HOURS: 24,
    RATE_LIMIT_MS: 1000 // 1 second between API calls
  },

  // ============================================================================
  // ENHANCED DYNAMIC FIELD MAPPING SYSTEM (Future-Proof with AI)
  // ============================================================================
  FIELD_MAPPING: {
    // Primary field mappings (exact matches)
    PRIMARY: {
      FIRST_NAME: 'Bună, cum te numești?',
      PHONE: 'Număr de telefon',
      EMAIL: 'Email',
      AGE: 'Câți ani ai?',
      LOCATION: 'Unde locuiești ?',
      CITY_ROMANIA: 'În ce oraș din România locuiești ?',
      CITY_INTERNATIONAL: 'În ce oraș și țară locuiești ?',
      CHURCH: 'La ce biserică mergi ?',
      CONTEXT: 'În ce context completezi formularul ?',
      
      // Prayer and Mission Fields  
      PRAYER_METHOD: 'Cum ai vrea să te rogi mai mult pentru misiune? ',
      PRAYER_ADOPTION: 'Vrei să adopți în rugăciune un misionar sau un popor neatins cu Evanghelia?',
      MISSIONARY_SELECTION: 'Pentru care misionar vrei să te rogi ?',
      MISSIONARY_TIME: 'Cât timp o să te rogi, săptămânal, pentru {{field:pray_missionary_select}} ?',
      ETHNIC_GROUP_SELECTION: 'Pentru care popor vrei să te rogi ?',
      ETHNIC_GROUP_TIME: 'Cât timp o să te rogi, săptămânal, pentru grupul {{field:pray_country_select}}?',
      
      // Programs and Courses
      CAMP_INFO: 'Vrei să primești informații despre taberele de misiune APME ?',
      VOLUNTEER_INTEREST: 'Dorești să te implici ca voluntar APME?',
      VOLUNTEER_POSITION: 'În ce poziție de voluntariat vrei să te implici ?',
      FINANCIAL_SUPPORT: 'Dorești să ajuți financiar lucrările și misionarii APME?',
      MISSION_FIELD: 'Vrei să fii informat(ă) despre oportunitățile de a merge pe câmpul de misiune?',
      COURSES_INTEREST: 'Ești interesat(ă) să participi la anumite cursuri de pregătire când vor fi disponibile în zona ta?',
      CRST_INFO: 'Dorești mai multe informații despre CRST (școala de misiune de la Agigea, CT)? ',
      
      // Additional Fields
      OBSERVATIONS: 'Alte observații',
      CONSENT: 'Consimțământ privind prelucrarea datelor personale. Datele dumneavoastră nu vor fi date nici unei organizații sau persoane fără acordul dumneavoastră în prealabil. În conformitate cu Regulamentul 2016/679/UE, consimt ca Fundația APME să stocheze și să proceseze datele mele personale.',
      SUBMITTED_AT: 'Submitted At',
      TOKEN: 'Token'
    },

    // Enhanced fallback patterns for fuzzy matching (expanded for better coverage)
    PATTERNS: {
      FIRST_NAME: [
        'nume', 'numele', 'prenume', 'cum te numești', 'cum te cheamă', 'first name', 
        'name', 'full name', 'numele tău', 'numele complet', 'care este numele',
        'complete name', 'legal name', 'full legal name', 'numele tău complet',
        'what is your name', 'your name', 'numele complet', 'prenumele'
      ],
      EMAIL: [
        'email', 'e-mail', 'adresa de email', 'mail', '@', 'contact email',
        'email address', 'adresă email', 'pentru confirmări', 'contact',
        'electronic mail', 'correspondence', 'notifications', 'confirmări',
        'email pentru', 'adresa email', 'mail address', 'contact address'
      ],
      PHONE: [
        'telefon', 'tel', 'phone', 'număr', 'contact', 'număr de telefon',
        'phone number', 'contact number', 'telephone', 'mobile', 'mobil'
      ],
      LOCATION: [
        'unde locuiești', 'locație', 'location', 'oraș', 'țară', 'residence',
        'where do you live', 'country', 'city', 'unde', 'locuiești',
        'residence', 'address', 'current location', 'present location',
        'în ce țară', 'în ce oraș', 'current residence', 'home location'
      ],
      PRAYER_ADOPTION: [
        'rugăciune', 'misionar', 'popor', 'evanghelia', 'prayer', 'adopt',
        'adopți în rugăciune', 'prayer for missionary', 'spiritual adoption',
        'rugăciune pentru', 'neatins cu evanghelia', 'pray for', 'spiritual commitment',
        'missionary prayer', 'prayer adoption', 'spiritual partnership',
        'would you like to pray', 'prayer participation', 'spiritual involvement'
      ],
      MISSIONARY_SELECTION: [
        'care misionar', 'pentru care', 'missionary', 'selectează',
        'which missionary', 'misionar vrei', 'pentru care misionar',
        'selectează misionarul', 'care misionar vrei', 'missionary selection',
        'choose missionary', 'select missionary', 'specific missionary',
        'missionary for prayer', 'prayer target', 'missionary choice'
      ],
      ETHNIC_GROUP_SELECTION: [
        'care popor', 'grup etnic', 'ethnic', 'people group', 'neevanghelizat',
        'pentru care popor', 'ethnic group', 'popor vrei', 'people group',
        'ethnic people', 'unreached people', 'people group selection',
        'which people group', 'ethnic group choice', 'unreached group'
      ],
      MISSION_FIELD: [
        'câmpul de misiune', 'mission field', 'oportunități', 'overseas',
        'oportunitățile de a merge', 'mission opportunities', 'câmp de misiune',
        'misiune pe termen', 'overseas service', 'mission trips', 'mission work',
        'international mission', 'mission engagement', 'mission involvement',
        'mission field interest', 'overseas opportunities', 'mission service'
      ],
      CAMP_INFO: [
        'tabere', 'camp', 'informații', 'participare', 'mission camps',
        'tabere de misiune', 'camp information', 'training camps',
        'mission training', 'camp opportunities', 'camp participation',
        'mission camp info', 'training opportunities', 'camp details'
      ],
      COURSES_INTEREST: [
        'cursuri', 'course', 'pregătire', 'training', 'școală',
        'cursuri de pregătire', 'training courses', 'educational programs',
        'workshops', 'kairos', 'mobilizează', 'educational opportunities',
        'training programs', 'course interest', 'educational courses',
        'spiritual development', 'training workshops', 'course participation'
      ],
      FINANCIAL_SUPPORT: [
        'financiar', 'financial', 'ajutor', 'support', 'donație',
        'ajuți financiar', 'financial help', 'donations', 'monetary support',
        'financial assistance', 'financial contribution', 'financial aid',
        'monetary help', 'financial backing', 'financial partnership'
      ],
      VOLUNTEER_INTEREST: [
        'voluntar', 'volunteer', 'implicare', 'servire',
        'voluntariat', 'volunteer opportunities', 'service', 'involvement',
        'volunteer work', 'service opportunities', 'volunteer service',
        'volunteer involvement', 'service work', 'volunteer participation'
      ]
    },

    // AI-powered field mapping settings
    AI_MAPPING: {
      ENABLED: true,
      CONFIDENCE_THRESHOLD: 0.8, // 80% minimum confidence
      USE_CACHE: true,
      FALLBACK_TO_FUZZY: true, // Use fuzzy matching if AI fails
      MAX_RETRIES: 2
    },

    // Field confidence scoring for automatic matching
    CONFIDENCE_THRESHOLD: 0.7, // 70% similarity required for fuzzy matching
    
    // Cached mappings (updated automatically when fields are detected)
    DYNAMIC_CACHE: {},
    
    // AI mapping cache to avoid repeated API calls
    AI_CACHE: {}
  },

  // ============================================================================
  // LOCATION MAPPING
  // ============================================================================
  LOCATION_MAPPING: {
    'În România': 'Romania',
    'În Diaspora': 'Diaspora'
  },

  // ============================================================================
  // MISSIONARY AND ETHNIC GROUP MAPPINGS
  // ============================================================================
  PRAYER_SELECTION: {
    // When they choose "Misionar" they get to select specific missionaries
    MISSIONARY_CHOICES: [
      'Nora (Orientul Mijlociu)',
      'Florin & Daniela (Uganda)',
      'Florin & Alina (Madagascar)',
      'Tabita H (Uganda)',
      'Amos & Thea (Asia de Sud-Est)',
      'Marius & Rut (Etiopia)',
      'Marius & Margareta (Uganda)',
      'Arton & Monica (Pristina, Kosovo)',
      'Adin & Persida (Kenya, Africa)',
      'Sandu & Marinela (Namibia)',
      'George & Andreea (Asia de Sud)',
      'Simion & Hadasa (Asia Centrală)',
      'Iulian & Rohi (Africa de Nord)',
      'Denisa Moldovan (Madagascar)',
      'Cristina (Asia Sud-Est)',
      'Tudor & Carina (Asia de Sud Est)',
      'Claudia (Asia de Sud Est)',
      'Dumitrița (Grecia, printre refugiați)',
      'Ștefan & Ioana (Europa de Vest)'
    ],
    
    // When they choose "Popor neatins cu Evanghelia" they get to select ethnic groups
    ETHNIC_GROUP_CHOICES: [
      'Fulani/Sokoto (Niger)',
      'Aringa (Uganda)',
      'Turc (Turcia)',
      'Tipera(India)',
      'Rongmahbrogpa Amdo (China)',
      'Rtahu Amdo (China)',
      'Bihari (Bangladesh)',
      'Mongoli Khalkha (Mongolia)',
      'Gurung Ghale (Nepal)',
      'Persan(Iran)',
      'Khulant/Khulwant (India)',
      'Rongba Amdo(China)',
      'Wolof (Senegal)',
      'Marma (Bangladesh)',
      'Kurd(Irak)',
      'Santal (Bangladesh)',
      'Bind(India)',
      'Persan (Grecia)',
      'Ashkali (Kosovo)',
      'Tadjici (Uzbekistan)',
      'Arabi marocani (Spania)',
      'Bhote(Nepal)',
      'Hbrogpa Amdo(China)',
      'Algerieni (Spania)',
      'Kunbi(India)',
      'Kurzii nordici(Irak)',
      'Egipteni balcanici (Kosovo)',
      'Albanezi (Albania)'
    ]
  },

  // ============================================================================
  // TEMPLATE PERSONALIZATION PLACEHOLDERS
  // ============================================================================
  PLACEHOLDERS: {
    // Standard placeholders available in all templates
    FIRST_NAME: '{{FirstName}}',
    LAST_NAME: '{{LastName}}',
    EMAIL: '{{Email}}',
    
    // Prayer-specific placeholders for personalized content
    MISSIONARY_NAME: '{{Missionary}}',
    ETHNIC_GROUP_NAME: '{{EthnicGroup}}',
    PRAYER_DURATION: '{{PrayerDuration}}',
    
    // Location-specific placeholders
    LOCATION: '{{Location}}',
    CITY: '{{City}}',
    CHURCH: '{{Church}}'
  },

  // ============================================================================
  // LOGGING AND MONITORING
  // ============================================================================
  LOGGING: {
    LEVEL: 'INFO', // DEBUG, INFO, WARN, ERROR
    MAX_LOG_ENTRIES: 1000,
    ENABLE_EMAIL_NOTIFICATIONS: true,
    ERROR_NOTIFICATION_EMAIL: 'danifrim14@gmail.com'
  },

  // ============================================================================
  // DEVELOPMENT & TESTING CONFIGURATION
  // ============================================================================
  DEVELOPMENT: {
    // PRODUCTION: Send emails to real users
    TEST_MODE: false, // CHANGED: Now sends emails to real users
    TEST_EMAIL: 'danifrim14@gmail.com', // Fallback email for errors
    VERBOSE_LOGGING: true,

    // Email safety settings - KEEP ENABLED for initial production deployment
    SAFETY_MODE: false, // Keep enabled for safety
    ALLOWED_EMAILS: [
      'danifrim14@gmail.com',
      'betina.serban@interchange.ro',
      'mobilizare@apme.ro'
      // Add more trusted emails here as needed
    ],
    BLOCK_ALL_OTHER_EMAILS: false // CHANGED: Now allows emails to real users
  },

  // ============================================================================
  // SUMMARY EMAIL SYSTEM
  // ============================================================================
  SUMMARY: {
    // List of email addresses to receive daily summaries
    ADMIN_EMAILS: [
      'danifrim14@gmail.com',
      'betina.serban@interchange.ro',
      // Add more organizer emails here
    ],
    
    // Summary email configuration
    FROM_NAME: 'APME Analytics',
    FROM_EMAIL: 'mobilizare@apme.ro',
    SUBJECT: 'Implicare 2.0 - Summary - {date}',
    
    // What data to include in summaries
    ANALYTICS: {
      // Geographic breakdowns
      INCLUDE_LOCATION_STATS: true,
      INCLUDE_CITY_BREAKDOWN: true,
      INCLUDE_COUNTRY_BREAKDOWN: true,
      
      // Demographic breakdowns  
      INCLUDE_AGE_STATS: true,
      INCLUDE_GENDER_STATS: true, // Set to true if you collect gender
      
      // Engagement breakdowns
      INCLUDE_PRAYER_STATS: true,
      INCLUDE_MISSION_STATS: true,
      INCLUDE_COURSE_STATS: true,
      INCLUDE_VOLUNTEER_STATS: true,
      INCLUDE_FINANCIAL_STATS: true,
      INCLUDE_CAMP_STATS: true,
      
      // Email performance (disabled - not useful for daily summaries)
      INCLUDE_EMAIL_STATS: false,
      INCLUDE_TEMPLATE_STATS: false
    },
    
    // Summary thresholds (only send if there are new submissions)
    MIN_NEW_SUBMISSIONS: 1,
    
    // Summary format preferences
    FORMAT: {
      INCLUDE_CHARTS: false, // Set to true if you want visual charts
      INCLUDE_DETAILED_BREAKDOWNS: true,
      INCLUDE_TOP_CITIES: 5,
      INCLUDE_TOP_COUNTRIES: 3
    }
  }
};

// ============================================================================
// UTILITY FUNCTIONS FOR SETTINGS
// ============================================================================

/**
 * Get a setting value with optional fallback
 */
function getSetting(path, fallback = null) {
  const keys = path.split('.');
  let value = SETTINGS;
  
  for (const key of keys) {
    if (value[key] === undefined) {
      return fallback;
    }
    value = value[key];
  }
  
  return value;
}

/**
 * Check if we're in test mode
 */
function isTestMode() {
  return getSetting('DEVELOPMENT.TEST_MODE', false);
}

/**
 * Get the actual email recipient (respects test mode and safety settings)
 * CRITICAL: This function prevents accidental emails to real users
 */
function getEmailRecipient(actualEmail) {
  try {
    // Always check safety mode first
    if (getSetting('DEVELOPMENT.SAFETY_MODE', true)) {
      const allowedEmails = getSetting('DEVELOPMENT.ALLOWED_EMAILS', ['danifrim14@gmail.com']);
      const blockOthers = getSetting('DEVELOPMENT.BLOCK_ALL_OTHER_EMAILS', true);
      
      // If email is not in allowed list, redirect to test email
      if (!allowedEmails.includes(actualEmail.toLowerCase())) {
        console.log(`🚨 SAFETY: Blocking email to ${actualEmail}, redirecting to test email`);
        return getSetting('DEVELOPMENT.TEST_EMAIL', 'danifrim14@gmail.com');
      }
    }
    
    // Check test mode
    if (getSetting('DEVELOPMENT.TEST_MODE', true)) {
      console.log(`🧪 TEST MODE: Redirecting email from ${actualEmail} to test email`);
      return getSetting('DEVELOPMENT.TEST_EMAIL', 'danifrim14@gmail.com');
    }
    
    return actualEmail;
  } catch (error) {
    console.error('❌ Error in getEmailRecipient:', error);
    // Always return test email on error for safety
    return getSetting('DEVELOPMENT.TEST_EMAIL', 'danifrim14@gmail.com');
  }
} 