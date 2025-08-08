/**
 * Lead Data Seeder - Populate database with sample lead data
 */

const { faker } = require('@faker-js/faker');

// Industry-specific data for realistic leads
const INDUSTRIES = [
  'Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Retail',
  'Education', 'Real Estate', 'Marketing', 'Consulting', 'Legal',
  'Construction', 'Hospitality', 'Transportation', 'Energy', 'Media'
];

const LEAD_SOURCES = [
  'Website', 'Cold Call', 'Referral', 'Trade Show', 'LinkedIn',
  'Google Ads', 'Email Campaign', 'Social Media', 'Partner', 'Webinar'
];

const JOB_TITLES = [
  'CEO', 'CTO', 'CFO', 'VP of Sales', 'VP of Marketing', 'VP of Operations',
  'Director of IT', 'IT Manager', 'Marketing Manager', 'Sales Manager',
  'Operations Manager', 'Project Manager', 'Business Development Manager',
  'Product Manager', 'General Manager', 'Owner', 'President'
];

const generateLead = () => {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const company = faker.company.name();
  const industry = faker.helpers.arrayElement(INDUSTRIES);
  
  return {
    firstName,
    lastName,
    email: faker.internet.email({ firstName, lastName }).toLowerCase(),
    phone: faker.phone.number('+1##########'),
    alternatePhone: Math.random() > 0.7 ? faker.phone.number('+1##########') : null,
    
    company,
    title: faker.helpers.arrayElement(JOB_TITLES),
    industry,
    companySize: faker.helpers.arrayElement(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']),
    website: `https://${company.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}.com`,
    
    status: faker.helpers.arrayElement(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost', 'nurturing']),
    priority: faker.helpers.arrayElement(['low', 'medium', 'high', 'urgent']),
    leadSource: faker.helpers.arrayElement(LEAD_SOURCES),
    
    // Address
    addressStreet: faker.location.streetAddress(),
    addressCity: faker.location.city(),
    addressState: faker.location.state({ abbreviated: true }),
    addressZip: faker.location.zipCode(),
    addressCountry: 'USA',
    
    // Scoring (realistic distribution)
    leadScore: faker.number.int({ min: 0, max: 100 }),
    conversionProbability: parseFloat(faker.number.float({ min: 0, max: 1, fractionDigits: 2 })),
    estimatedValue: faker.number.int({ min: 1000, max: 100000 }),
    
    // Timing
    lastContactDate: Math.random() > 0.5 ? faker.date.recent({ days: 30 }) : null,
    nextFollowUpDate: Math.random() > 0.6 ? faker.date.future({ days: 30 }) : null,
    timeZone: faker.helpers.arrayElement(['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles']),
    bestCallTime: faker.helpers.arrayElement(['Morning (9-12)', 'Afternoon (1-5)', 'Evening (6-8)', 'Flexible']),
    
    // Notes and tags
    notes: faker.lorem.sentences({ min: 1, max: 3 }),
    tags: faker.helpers.arrayElements(
      ['decision-maker', 'budget-approved', 'interested', 'competitor-user', 'price-sensitive', 'tech-savvy', 'urgent-need'],
      { min: 0, max: 4 }
    ),
    
    // Assignment
    assignedTo: faker.helpers.arrayElement(['agent_001', 'agent_002', 'agent_003', 'agent_004', null]),
    teamId: faker.helpers.arrayElement(['team_sales', 'team_enterprise', 'team_smb', null]),
    
    // Tracking metrics
    callAttempts: faker.number.int({ min: 0, max: 10 }),
    emailsSent: faker.number.int({ min: 0, max: 8 }),
    meetingsScheduled: faker.number.int({ min: 0, max: 3 }),
    
    // Compliance
    consentGiven: faker.datatype.boolean(),
    consentDate: Math.random() > 0.5 ? faker.date.recent({ days: 90 }) : null,
    doNotCall: Math.random() > 0.9, // 10% don't call
    doNotEmail: Math.random() > 0.95, // 5% don't email
    
    // Lifecycle
    isActive: Math.random() > 0.05 // 95% active
  };
};

const generateContact = (leadId) => {
  const contactTypes = ['phone', 'email', 'address', 'social'];
  const type = faker.helpers.arrayElement(contactTypes);
  
  let value, label;
  
  switch (type) {
    case 'phone':
      value = faker.phone.number('+1##########');
      label = faker.helpers.arrayElement(['work', 'mobile', 'home', 'direct']);
      break;
    case 'email':
      value = faker.internet.email().toLowerCase();
      label = faker.helpers.arrayElement(['work', 'personal', 'alternate']);
      break;
    case 'address':
      value = `${faker.location.streetAddress()}, ${faker.location.city()}, ${faker.location.state()} ${faker.location.zipCode()}`;
      label = faker.helpers.arrayElement(['work', 'home', 'billing', 'shipping']);
      break;
    case 'social':
      value = `https://linkedin.com/in/${faker.internet.userName()}`;
      label = 'linkedin';
      break;
  }
  
  return {
    leadId,
    type,
    value,
    label,
    isPrimary: Math.random() > 0.7, // 30% primary
    isVerified: Math.random() > 0.4, // 60% verified
    isActive: Math.random() > 0.1, // 90% active
    metadata: {
      source: 'seeder',
      confidence: faker.number.float({ min: 0.5, max: 1.0, fractionDigits: 2 })
    }
  };
};

const generateCallLog = (leadId, phoneNumber) => {
  const direction = faker.helpers.arrayElement(['inbound', 'outbound']);
  const status = faker.helpers.arrayElement(['completed', 'failed', 'voicemail']);
  const outcomes = {
    completed: ['connected', 'interested', 'not_interested', 'callback_requested', 'meeting_scheduled'],
    failed: ['no_answer', 'busy', 'failed'],
    voicemail: ['voicemail']
  };
  
  const outcome = faker.helpers.arrayElement(outcomes[status]);
  const duration = status === 'completed' ? faker.number.int({ min: 30, max: 1800 }) : faker.number.int({ min: 0, max: 30 });
  
  const initiatedAt = faker.date.recent({ days: 30 });
  const answeredAt = status === 'completed' ? new Date(initiatedAt.getTime() + faker.number.int({ min: 5000, max: 30000 })) : null;
  const completedAt = new Date(initiatedAt.getTime() + duration * 1000 + (answeredAt ? answeredAt.getTime() - initiatedAt.getTime() : 0));
  
  return {
    leadId,
    phoneNumber,
    direction,
    status,
    outcome,
    initiatedAt,
    answeredAt,
    completedAt,
    duration,
    talkTime: answeredAt ? Math.floor((completedAt - answeredAt) / 1000) : null,
    callQuality: status === 'completed' ? faker.number.int({ min: 1, max: 5 }) : null,
    sipCallId: `sip-${faker.string.uuid()}`,
    notes: faker.lorem.sentence(),
    agentId: faker.helpers.arrayElement(['agent_001', 'agent_002', 'agent_003']),
    agentName: faker.person.fullName(),
    metadata: {
      userAgent: faker.internet.userAgent(),
      callAttempt: faker.number.int({ min: 1, max: 5 })
    },
    followUpRequired: outcome === 'callback_requested' || outcome === 'interested',
    followUpDate: outcome === 'callback_requested' ? faker.date.future({ days: 7 }) : null
  };
};

const seedDatabase = async (models, options = {}) => {
  const {
    leadCount = 100,
    contactsPerLead = 2,
    callLogsPerLead = 3,
    clearExisting = false
  } = options;
  
  console.log('🌱 Starting database seeding...');
  
  try {
    // Clear existing data if requested
    if (clearExisting) {
      console.log('🧹 Clearing existing data...');
      await models.CallLog.destroy({ where: {}, force: true });
      await models.Contact.destroy({ where: {}, force: true });
      await models.Lead.destroy({ where: {}, force: true });
      console.log('✅ Existing data cleared');
    }
    
    console.log(`🔄 Creating ${leadCount} leads...`);
    const leads = [];
    
    // Create leads
    for (let i = 0; i < leadCount; i++) {
      const leadData = generateLead();
      const lead = await models.Lead.create(leadData);
      leads.push(lead);
      
      if ((i + 1) % 10 === 0) {
        console.log(`   Created ${i + 1}/${leadCount} leads`);
      }
    }
    
    console.log(`🔄 Creating contacts and call logs...`);
    
    // Create contacts and call logs for each lead
    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      
      // Create contacts
      const contactCount = Math.min(contactsPerLead, faker.number.int({ min: 1, max: contactsPerLead + 1 }));
      for (let j = 0; j < contactCount; j++) {
        const contactData = generateContact(lead.id);
        await models.Contact.create(contactData);
      }
      
      // Create call logs
      const callLogCount = Math.min(callLogsPerLead, faker.number.int({ min: 0, max: callLogsPerLead + 2 }));
      for (let k = 0; k < callLogCount; k++) {
        const callLogData = generateCallLog(lead.id, lead.phone);
        await models.CallLog.create(callLogData);
      }
      
      if ((i + 1) % 20 === 0) {
        console.log(`   Processed ${i + 1}/${leads.length} leads with contacts and calls`);
      }
    }
    
    // Final statistics
    const finalStats = {
      leads: await models.Lead.count(),
      contacts: await models.Contact.count(),
      callLogs: await models.CallLog.count()
    };
    
    console.log('🎉 Database seeding completed!');
    console.log('📊 Final Statistics:');
    console.log(`   - Leads: ${finalStats.leads}`);
    console.log(`   - Contacts: ${finalStats.contacts}`);
    console.log(`   - Call Logs: ${finalStats.callLogs}`);
    
    return finalStats;
    
  } catch (error) {
    console.error('💥 Database seeding failed:', error);
    throw error;
  }
};

module.exports = {
  seedDatabase,
  generateLead,
  generateContact,
  generateCallLog
};