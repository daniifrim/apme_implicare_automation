/**
 * APME Analytics Manager
 * Generates comprehensive statistics and summaries for organizer reports
 */

class AnalyticsManager {
  
  /**
   * Generate daily summary statistics
   */
  static generateDailySummary(date = new Date()) {
    try {
      console.log('📊 Generating daily summary for:', date.toDateString());
      
      // Get submissions from today
      const todaySubmissions = this.getSubmissionsForDate(date);
      
      if (todaySubmissions.length === 0) {
        console.log('📭 No submissions found for today');
        return {
          hasData: false,
          message: 'No new submissions today'
        };
      }
      
      console.log(`📈 Found ${todaySubmissions.length} submissions for analysis`);
      
      // Generate comprehensive statistics
      const summary = {
        date: date.toDateString(),
        totalSubmissions: todaySubmissions.length,
        hasData: true,
        
        // Geographic breakdowns
        location: this.generateLocationStats(todaySubmissions),
        
        // Demographic breakdowns
        demographics: this.generateDemographicStats(todaySubmissions),
        
        // Engagement breakdowns
        engagement: this.generateEngagementStats(todaySubmissions),
        
        // Email performance
        emailPerformance: this.generateEmailPerformanceStats(todaySubmissions),
        
        // Template assignments
        templateAssignments: this.generateTemplateAssignmentStats(todaySubmissions),
        
        // Top insights
        insights: this.generateInsights(todaySubmissions)
      };
      
      console.log('✅ Daily summary generated successfully');
      return summary;
      
    } catch (error) {
      console.error('❌ Error generating daily summary:', error);
      throw error;
    }
  }
  
  /**
   * Get submissions for a specific date
   */
  static getSubmissionsForDate(date) {
    try {
      const allSubmissions = SheetsConnector.getAllSubmissions();
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      
      return allSubmissions.filter(submission => {
        const submissionDate = new Date(submission['Submitted At']);
        submissionDate.setHours(0, 0, 0, 0);
        return submissionDate.getTime() === targetDate.getTime();
      });
      
    } catch (error) {
      console.error('❌ Error getting submissions for date:', error);
      return [];
    }
  }
  
  /**
   * Generate location-based statistics
   */
  static generateLocationStats(submissions) {
    try {
      const locationStats = {
        romania: 0,
        diaspora: 0,
        cities: {},
        countries: {},
        topCities: [],
        topCountries: []
      };
      
      submissions.forEach(submission => {
        const location = TemplateAssignment.getFieldValue(submission, 'LOCATION');
        const cityRomania = TemplateAssignment.getFieldValue(submission, 'CITY_ROMANIA');
        const cityInternational = TemplateAssignment.getFieldValue(submission, 'CITY_INTERNATIONAL');
        
        // Romania vs Diaspora
        if (location === 'În România') {
          locationStats.romania++;
        } else if (location === 'În Diaspora') {
          locationStats.diaspora++;
        }
        
        // City breakdown - Romania
        if (cityRomania) {
          const cleanCity = this.cleanCityName(cityRomania);
          locationStats.cities[cleanCity] = (locationStats.cities[cleanCity] || 0) + 1;
        }
        
        // City and Country breakdown - Diaspora
        if (cityInternational) {
          const parsedLocation = this.parseCityAndCountry(cityInternational);
          
          if (parsedLocation.city) {
            const cleanCity = this.cleanCityName(parsedLocation.city);
            locationStats.cities[cleanCity] = (locationStats.cities[cleanCity] || 0) + 1;
          }
          
          if (parsedLocation.country) {
            const cleanCountry = this.cleanCountryName(parsedLocation.country);
            locationStats.countries[cleanCountry] = (locationStats.countries[cleanCountry] || 0) + 1;
          }
        }
      });
      
      // Generate top lists
      locationStats.topCities = this.getTopItems(locationStats.cities, getSetting('SUMMARY.FORMAT.INCLUDE_TOP_CITIES', 5));
      locationStats.topCountries = this.getTopItems(locationStats.countries, getSetting('SUMMARY.FORMAT.INCLUDE_TOP_COUNTRIES', 3));
      
      return locationStats;
      
    } catch (error) {
      console.error('❌ Error generating location stats:', error);
      return { romania: 0, diaspora: 0, cities: {}, countries: {}, topCities: [], topCountries: [] };
    }
  }
  
  /**
   * Clean city name by removing extra information
   */
  static cleanCityName(cityName) {
    try {
      if (!cityName) return '';
      
      // Remove county information (Județul, etc.)
      let cleanCity = cityName.replace(/Județul\s+/gi, '');
      cleanCity = cleanCity.replace(/,\s*Județul\s+\w+/gi, '');
      
      // Remove postal codes
      cleanCity = cleanCity.replace(/\d{5,6}/g, '');
      
      // Remove extra commas and spaces
      cleanCity = cleanCity.replace(/,\s*,/g, ',');
      cleanCity = cleanCity.replace(/^\s*,\s*/, '');
      cleanCity = cleanCity.replace(/\s*,\s*$/, '');
      cleanCity = cleanCity.trim();
      
      // If it's just a number or empty, return empty
      if (!cleanCity || /^\d+$/.test(cleanCity)) {
        return '';
      }
      
      return cleanCity;
    } catch (error) {
      console.error('❌ Error cleaning city name:', error);
      return cityName || '';
    }
  }
  
  /**
   * Clean country name
   */
  static cleanCountryName(countryName) {
    try {
      if (!countryName) return '';
      
      // Remove postal codes and extra info
      let cleanCountry = countryName.replace(/\d{5,6}/g, '');
      cleanCountry = cleanCountry.replace(/,\s*\d+/g, '');
      cleanCountry = cleanCountry.trim();
      
      // Common country name mappings
      const countryMappings = {
        'germania': 'Germany',
        'germany': 'Germany',
        'deutschland': 'Germany',
        'spain': 'Spain',
        'espana': 'Spain',
        'spania': 'Spain',
        'romania': 'Romania',
        'romania': 'Romania'
      };
      
      const lowerCountry = cleanCountry.toLowerCase();
      if (countryMappings[lowerCountry]) {
        return countryMappings[lowerCountry];
      }
      
      return cleanCountry;
    } catch (error) {
      console.error('❌ Error cleaning country name:', error);
      return countryName || '';
    }
  }
  
  /**
   * Parse city and country from combined string
   */
  static parseCityAndCountry(locationString) {
    try {
      if (!locationString) return { city: '', country: '' };
      
      // Split by comma and clean up
      const parts = locationString.split(',').map(part => part.trim()).filter(part => part);
      
      if (parts.length === 0) {
        return { city: '', country: '' };
      }
      
      if (parts.length === 1) {
        // Single part - could be city or country
        const singlePart = parts[0];
        if (this.isLikelyCountry(singlePart)) {
          return { city: '', country: this.cleanCountryName(singlePart) };
        } else {
          return { city: this.cleanCityName(singlePart), country: '' };
        }
      }
      
      // Multiple parts - last part is usually country
      const city = this.cleanCityName(parts.slice(0, -1).join(', '));
      const country = this.cleanCountryName(parts[parts.length - 1]);
      
      return { city, country };
      
    } catch (error) {
      console.error('❌ Error parsing city and country:', error);
      return { city: '', country: '' };
    }
  }
  
  /**
   * Check if a string is likely a country name
   */
  static isLikelyCountry(text) {
    const countryKeywords = [
      'germania', 'germany', 'deutschland', 'spain', 'espana', 'spania',
      'romania', 'romania', 'france', 'italy', 'italia', 'uk', 'united kingdom',
      'usa', 'united states', 'canada', 'australia', 'netherlands', 'holland'
    ];
    
    return countryKeywords.includes(text.toLowerCase());
  }
  
  /**
   * Generate demographic statistics
   */
  static generateDemographicStats(submissions) {
    try {
      const demoStats = {
        ageGroups: {
          '18-25': 0,
          '26-35': 0,
          '36-45': 0,
          '46-55': 0,
          '56+': 0
        },
        averageAge: 0,
        totalWithAge: 0
      };
      
      let totalAge = 0;
      let ageCount = 0;
      
      submissions.forEach(submission => {
        const age = TemplateAssignment.getFieldValue(submission, 'AGE');
        
        if (age && !isNaN(age)) {
          const ageNum = parseInt(age);
          totalAge += ageNum;
          ageCount++;
          
          // Categorize by age group
          if (ageNum <= 25) demoStats.ageGroups['18-25']++;
          else if (ageNum <= 35) demoStats.ageGroups['26-35']++;
          else if (ageNum <= 45) demoStats.ageGroups['36-45']++;
          else if (ageNum <= 55) demoStats.ageGroups['46-55']++;
          else demoStats.ageGroups['56+']++;
        }
      });
      
      demoStats.averageAge = ageCount > 0 ? Math.round(totalAge / ageCount) : 0;
      demoStats.totalWithAge = ageCount;
      
      return demoStats;
      
    } catch (error) {
      console.error('❌ Error generating demographic stats:', error);
      return { ageGroups: {}, averageAge: 0, totalWithAge: 0 };
    }
  }
  
  /**
   * Generate engagement statistics
   */
  static generateEngagementStats(submissions) {
    try {
      const engagementStats = {
        prayerAdoption: {
          missionary: 0,
          ethnicGroup: 0,
          notInterested: 0
        },
        missionInterest: {
          shortTerm: 0,
          longTerm: 0,
          notInterested: 0
        },
        courseInterest: {
          kairos: 0,
          mobilize: 0,
          empowered: 0,
          notInterested: 0
        },
        volunteerInterest: 0,
        financialSupport: 0,
        campInterest: 0,
        crstInterest: 0
      };
      
      submissions.forEach(submission => {
        // Prayer adoption
        const prayerAdoption = TemplateAssignment.getFieldValue(submission, 'PRAYER_ADOPTION');
        if (prayerAdoption === 'Misionar') {
          engagementStats.prayerAdoption.missionary++;
        } else if (prayerAdoption === 'Popor neatins cu Evanghelia') {
          engagementStats.prayerAdoption.ethnicGroup++;
        } else {
          engagementStats.prayerAdoption.notInterested++;
        }
        
        // Mission interest
        const missionField = TemplateAssignment.getFieldValue(submission, 'MISSION_FIELD');
        if (missionField && missionField.includes('scurt')) {
          engagementStats.missionInterest.shortTerm++;
        } else if (missionField && missionField.includes('lung')) {
          engagementStats.missionInterest.longTerm++;
        } else {
          engagementStats.missionInterest.notInterested++;
        }
        
        // Course interest
        const coursesInterest = TemplateAssignment.getFieldValue(submission, 'COURSES_INTEREST');
        if (coursesInterest && coursesInterest.includes('Kairos')) {
          engagementStats.courseInterest.kairos++;
        } else if (coursesInterest && coursesInterest.includes('Mobilizează')) {
          engagementStats.courseInterest.mobilize++;
        } else if (coursesInterest && coursesInterest.includes('Empowered')) {
          engagementStats.courseInterest.empowered++;
        } else {
          engagementStats.courseInterest.notInterested++;
        }
        
        // Other interests
        const volunteerInterest = TemplateAssignment.getFieldValue(submission, 'VOLUNTEER_INTEREST');
        if (volunteerInterest && volunteerInterest !== '') {
          engagementStats.volunteerInterest++;
        }
        
        const financialSupport = TemplateAssignment.getFieldValue(submission, 'FINANCIAL_SUPPORT');
        if (financialSupport === true || financialSupport === 'true') {
          engagementStats.financialSupport++;
        }
        
        const campInfo = TemplateAssignment.getFieldValue(submission, 'CAMP_INFO');
        if (campInfo && campInfo.includes('informații')) {
          engagementStats.campInterest++;
        }
        
        const crstInfo = TemplateAssignment.getFieldValue(submission, 'CRST_INFO');
        if (crstInfo === true || crstInfo === 'true') {
          engagementStats.crstInterest++;
        }
      });
      
      return engagementStats;
      
    } catch (error) {
      console.error('❌ Error generating engagement stats:', error);
      return {
        prayerAdoption: { missionary: 0, ethnicGroup: 0, notInterested: 0 },
        missionInterest: { shortTerm: 0, longTerm: 0, notInterested: 0 },
        courseInterest: { kairos: 0, mobilize: 0, empowered: 0, notInterested: 0 },
        volunteerInterest: 0,
        financialSupport: 0,
        campInterest: 0,
        crstInterest: 0
      };
    }
  }
  
  /**
   * Generate email performance statistics
   */
  static generateEmailPerformanceStats(submissions) {
    try {
      const emailStats = {
        totalEmailsSent: 0,
        templatesUsed: {},
        averageEmailsPerPerson: 0,
        emailSuccessRate: 0
      };
      
      let totalEmails = 0;
      let successfulEmails = 0;
      
      submissions.forEach(submission => {
        const email = TemplateAssignment.getFieldValue(submission, 'EMAIL');
        if (email) {
          // Get email history for this person
          const emailHistory = EmailHistoryManager.getPersonEmailHistory(email);
          
          emailHistory.forEach(record => {
            totalEmails++;
            emailStats.templatesUsed[record.template] = (emailStats.templatesUsed[record.template] || 0) + 1;
            
            if (record.status === 'SENT' || record.deliveryStatus === 'DELIVERED') {
              successfulEmails++;
            }
          });
        }
      });
      
      emailStats.totalEmailsSent = totalEmails;
      emailStats.averageEmailsPerPerson = submissions.length > 0 ? Math.round(totalEmails / submissions.length * 10) / 10 : 0;
      emailStats.emailSuccessRate = totalEmails > 0 ? Math.round((successfulEmails / totalEmails) * 100) : 0;
      
      return emailStats;
      
    } catch (error) {
      console.error('❌ Error generating email performance stats:', error);
      return {
        totalEmailsSent: 0,
        templatesUsed: {},
        averageEmailsPerPerson: 0,
        emailSuccessRate: 0
      };
    }
  }
  
  /**
   * Generate template assignment statistics
   */
  static generateTemplateAssignmentStats(submissions) {
    try {
      const templateStats = {
        assignments: {},
        mostAssigned: [],
        averageTemplatesPerPerson: 0
      };
      
      let totalTemplates = 0;
      
      submissions.forEach(submission => {
        const assignedTemplates = TemplateAssignment.assignTemplates(submission);
        totalTemplates += assignedTemplates.length;
        
        assignedTemplates.forEach(template => {
          templateStats.assignments[template] = (templateStats.assignments[template] || 0) + 1;
        });
      });
      
      templateStats.averageTemplatesPerPerson = submissions.length > 0 ? Math.round(totalTemplates / submissions.length * 10) / 10 : 0;
      templateStats.mostAssigned = this.getTopItems(templateStats.assignments, 5);
      
      return templateStats;
      
    } catch (error) {
      console.error('❌ Error generating template assignment stats:', error);
      return {
        assignments: {},
        mostAssigned: [],
        averageTemplatesPerPerson: 0
      };
    }
  }
  
  /**
   * Generate key insights from the data
   */
  static generateInsights(submissions) {
    try {
      const insights = [];
      
      // Geographic insights
      const locationStats = this.generateLocationStats(submissions);
      if (locationStats.romania > locationStats.diaspora) {
        insights.push(`[RO] Majority of submissions (${locationStats.romania}) are from Romania`);
      } else if (locationStats.diaspora > locationStats.romania) {
        insights.push(`[INT] Majority of submissions (${locationStats.diaspora}) are from Diaspora`);
      }
      
      if (locationStats.topCities.length > 0) {
        insights.push(`[CITY] Top city: ${locationStats.topCities[0].name} (${locationStats.topCities[0].count} submissions)`);
      }
      
      if (locationStats.topCountries.length > 0) {
        insights.push(`[COUNTRY] Top country: ${locationStats.topCountries[0].name} (${locationStats.topCountries[0].count} submissions)`);
      }
      
      // Engagement insights
      const engagementStats = this.generateEngagementStats(submissions);
      const totalPrayer = engagementStats.prayerAdoption.missionary + engagementStats.prayerAdoption.ethnicGroup;
      if (totalPrayer > 0) {
        insights.push(`[PRAYER] ${totalPrayer} people want to adopt missionaries/ethnic groups in prayer`);
      }
      
      if (engagementStats.volunteerInterest > 0) {
        insights.push(`[VOLUNTEER] ${engagementStats.volunteerInterest} people interested in volunteering`);
      }
      
      if (engagementStats.financialSupport > 0) {
        insights.push(`[MONEY] ${engagementStats.financialSupport} people want to provide financial support`);
      }
      
      // Mission interest insights
      const totalMissionInterest = engagementStats.missionInterest.shortTerm + engagementStats.missionInterest.longTerm;
      if (totalMissionInterest > 0) {
        insights.push(`[MISSION] ${totalMissionInterest} people interested in mission opportunities`);
      }
      
      // Camp and course insights
      if (engagementStats.campInterest > 0) {
        insights.push(`[CAMP] ${engagementStats.campInterest} people interested in mission camps`);
      }
      
      if (engagementStats.crstInterest > 0) {
        insights.push(`[SCHOOL] ${engagementStats.crstInterest} people interested in CRST mission school`);
      }
      
      // Age insights
      const demoStats = this.generateDemographicStats(submissions);
      if (demoStats.averageAge > 0) {
        if (demoStats.averageAge < 25) {
          insights.push(`[AGE] Young group with average age of ${demoStats.averageAge} years`);
        } else if (demoStats.averageAge > 35) {
          insights.push(`[AGE] Mature group with average age of ${demoStats.averageAge} years`);
        } else {
          insights.push(`[AGE] Mixed age group with average of ${demoStats.averageAge} years`);
        }
      }
      
      // High engagement insights
      const totalSubmissions = submissions.length;
      const highEngagementThreshold = Math.round(totalSubmissions * 0.6); // 60% threshold
      
      if (totalPrayer >= highEngagementThreshold) {
        insights.push(`[HIGH] Strong prayer adoption interest (${Math.round(totalPrayer/totalSubmissions*100)}%)`);
      }
      
      if (totalMissionInterest >= highEngagementThreshold) {
        insights.push(`[HIGH] Strong mission interest (${Math.round(totalMissionInterest/totalSubmissions*100)}%)`);
      }
      
      if (engagementStats.financialSupport >= highEngagementThreshold) {
        insights.push(`[HIGH] Strong financial support interest (${Math.round(engagementStats.financialSupport/totalSubmissions*100)}%)`);
      }
      
      return insights;
      
    } catch (error) {
      console.error('❌ Error generating insights:', error);
      return [];
    }
  }
  
  /**
   * Get top items from a count object
   */
  static getTopItems(countObject, limit = 5) {
    try {
      return Object.entries(countObject)
        .sort(([,a], [,b]) => b - a)
        .slice(0, limit)
        .map(([name, count]) => ({ name, count }));
    } catch (error) {
      console.error('❌ Error getting top items:', error);
      return [];
    }
  }
  
  /**
   * Format summary for email
   */
  static formatSummaryForEmail(summary) {
    try {
      if (!summary.hasData) {
        return this.formatNoDataEmail(summary);
      }
      
      let emailContent = `
<h2>APME Daily Summary - ${summary.date}</h2>

<h3>Overview</h3>
<ul>
  <li><strong>Total Submissions:</strong> ${summary.totalSubmissions}</li>
  <li><strong>Average Age:</strong> ${summary.demographics.averageAge} years</li>
</ul>
`;
      
      // Location breakdown
      if (getSetting('SUMMARY.ANALYTICS.INCLUDE_LOCATION_STATS')) {
        const romaniaPercent = Math.round(summary.location.romania / summary.totalSubmissions * 100);
        const diasporaPercent = Math.round(summary.location.diaspora / summary.totalSubmissions * 100);
        
        emailContent += `
<h3>Geographic Distribution</h3>
<ul>
  <li><strong>Romania:</strong> ${summary.location.romania} (${romaniaPercent}%)</li>
  <li><strong>Diaspora:</strong> ${summary.location.diaspora} (${diasporaPercent}%)</li>
</ul>
`;
        
        if (summary.location.topCities.length > 0) {
          emailContent += `<p><strong>Top Cities:</strong> ${summary.location.topCities.map(city => `${city.name} (${city.count})`).join(', ')}</p>`;
        }
        
        if (summary.location.topCountries.length > 0) {
          emailContent += `<p><strong>Top Countries:</strong> ${summary.location.topCountries.map(country => `${country.name} (${country.count})`).join(', ')}</p>`;
        }
      }
      
      // Engagement breakdown
      if (getSetting('SUMMARY.ANALYTICS.INCLUDE_PRAYER_STATS')) {
        const totalPrayer = summary.engagement.prayerAdoption.missionary + summary.engagement.prayerAdoption.ethnicGroup;
        const missionaryPercent = Math.round(summary.engagement.prayerAdoption.missionary / summary.totalSubmissions * 100);
        const ethnicPercent = Math.round(summary.engagement.prayerAdoption.ethnicGroup / summary.totalSubmissions * 100);
        const notInterestedPercent = Math.round(summary.engagement.prayerAdoption.notInterested / summary.totalSubmissions * 100);
        
        emailContent += `
<h3>Prayer Engagement</h3>
<ul>
  <li><strong>Missionary Prayer:</strong> ${summary.engagement.prayerAdoption.missionary} (${missionaryPercent}%)</li>
  <li><strong>Ethnic Group Prayer:</strong> ${summary.engagement.prayerAdoption.ethnicGroup} (${ethnicPercent}%)</li>
  <li><strong>Not Interested:</strong> ${summary.engagement.prayerAdoption.notInterested} (${notInterestedPercent}%)</li>
</ul>
`;
      }
      
      if (getSetting('SUMMARY.ANALYTICS.INCLUDE_MISSION_STATS')) {
        const shortTermPercent = Math.round(summary.engagement.missionInterest.shortTerm / summary.totalSubmissions * 100);
        const longTermPercent = Math.round(summary.engagement.missionInterest.longTerm / summary.totalSubmissions * 100);
        const notInterestedPercent = Math.round(summary.engagement.missionInterest.notInterested / summary.totalSubmissions * 100);
        
        emailContent += `
<h3>Mission Interest</h3>
<ul>
  <li><strong>Short-term:</strong> ${summary.engagement.missionInterest.shortTerm} (${shortTermPercent}%)</li>
  <li><strong>Long-term:</strong> ${summary.engagement.missionInterest.longTerm} (${longTermPercent}%)</li>
  <li><strong>Not Interested:</strong> ${summary.engagement.missionInterest.notInterested} (${notInterestedPercent}%)</li>
</ul>
`;
      }
      
      if (getSetting('SUMMARY.ANALYTICS.INCLUDE_VOLUNTEER_STATS') || getSetting('SUMMARY.ANALYTICS.INCLUDE_FINANCIAL_STATS')) {
        const volunteerPercent = Math.round(summary.engagement.volunteerInterest / summary.totalSubmissions * 100);
        const financialPercent = Math.round(summary.engagement.financialSupport / summary.totalSubmissions * 100);
        const campPercent = Math.round(summary.engagement.campInterest / summary.totalSubmissions * 100);
        const crstPercent = Math.round(summary.engagement.crstInterest / summary.totalSubmissions * 100);
        
        emailContent += `
<h3>Support & Involvement</h3>
<ul>
  <li><strong>Volunteer Interest:</strong> ${summary.engagement.volunteerInterest} (${volunteerPercent}%)</li>
  <li><strong>Financial Support:</strong> ${summary.engagement.financialSupport} (${financialPercent}%)</li>
  <li><strong>Camp Interest:</strong> ${summary.engagement.campInterest} (${campPercent}%)</li>
  <li><strong>CRST Interest:</strong> ${summary.engagement.crstInterest} (${crstPercent}%)</li>
</ul>
`;
      }
      
      // Key insights
      if (summary.insights.length > 0) {
        emailContent += `
<h3>Key Insights</h3>
<ul>
  ${summary.insights.map(insight => `<li>${insight}</li>`).join('')}
</ul>
`;
      }
      
      emailContent += `
<hr>
<p><em>This summary was automatically generated by the APME Email Automation System.</em></p>
`;
      
      return emailContent;
      
    } catch (error) {
      console.error('❌ Error formatting summary for email:', error);
      return '<p>Error generating summary email</p>';
    }
  }
  
  /**
   * Format email when no data is available
   */
  static formatNoDataEmail(summary) {
    return `
<h2>APME Daily Summary - ${summary.date}</h2>

<p>No new submissions were received today.</p>

<hr>
<p><em>This summary was automatically generated by the APME Email Automation System.</em></p>
`;
  }
} 