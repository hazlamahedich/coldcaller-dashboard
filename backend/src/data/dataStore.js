// In-memory data store for the Cold Calling Dashboard
// This simulates a database until we implement a real one

const { v4: uuidv4 } = require('uuid');

// Initial data based on frontend dummy data
let leads = [
  {
    id: 1,
    name: "John Smith",
    company: "Tech Solutions Inc.",
    phone: "(555) 123-4567",
    email: "john@techsolutions.com",
    status: "New",
    lastContact: "Never",
    notes: "Interested in cloud services",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 2,
    name: "Sarah Johnson",
    company: "Digital Marketing Pro",
    phone: "(555) 234-5678",
    email: "sarah@digitalmpro.com",
    status: "Follow-up",
    lastContact: "2024-01-15",
    notes: "Requested pricing information",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 3,
    name: "Mike Chen",
    company: "StartUp Ventures",
    phone: "(555) 345-6789",
    email: "mike@startupv.com",
    status: "Qualified",
    lastContact: "2024-01-10",
    notes: "Decision maker, budget approved",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

let scripts = {
  introduction: {
    id: 'introduction',
    title: "Introduction",
    color: "blue",
    text: "Hi [NAME], this is [YOUR NAME] from [COMPANY]. I'm calling because we help companies like [THEIR COMPANY] reduce their IT costs by up to 30%. Do you have 2 minutes to hear how we've helped similar businesses?",
    category: "opening",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  gatekeeper: {
    id: 'gatekeeper',
    title: "Gatekeeper",
    color: "yellow",
    text: "Hi, I'm trying to reach the person who handles IT decisions at [COMPANY]. Could you point me in the right direction? I have some important information about cost savings that I think they'd want to know about.",
    category: "gatekeeper",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  objection: {
    id: 'objection',
    title: "Objection Handling",
    color: "red",
    text: "I completely understand you're busy. That's exactly why I'm calling - we specialize in saving busy executives time and money. Would it be better if I sent you a quick email with the key points and we could schedule a brief call next week?",
    category: "objection",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  closing: {
    id: 'closing',
    title: "Closing",
    color: "green",
    text: "Great! Based on what you've told me, it sounds like we could really help. The next step would be a 15-minute demo where I can show you exactly how this would work for [COMPANY]. Are you available Tuesday at 2 PM or would Thursday at 10 AM work better?",
    category: "closing",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
};

let audioClips = [
  // Greetings
  { id: 1, name: "Professional Intro", duration: "0:15", category: "greetings", url: "/audio/professional-intro.mp3", createdAt: new Date().toISOString() },
  { id: 2, name: "Casual Intro", duration: "0:12", category: "greetings", url: "/audio/casual-intro.mp3", createdAt: new Date().toISOString() },
  { id: 3, name: "Executive Intro", duration: "0:18", category: "greetings", url: "/audio/executive-intro.mp3", createdAt: new Date().toISOString() },
  
  // Objections
  { id: 4, name: "Not Interested", duration: "0:20", category: "objections", url: "/audio/not-interested.mp3", createdAt: new Date().toISOString() },
  { id: 5, name: "Too Busy", duration: "0:15", category: "objections", url: "/audio/too-busy.mp3", createdAt: new Date().toISOString() },
  { id: 6, name: "Send Email", duration: "0:18", category: "objections", url: "/audio/send-email.mp3", createdAt: new Date().toISOString() },
  
  // Closing
  { id: 7, name: "Schedule Meeting", duration: "0:22", category: "closing", url: "/audio/schedule-meeting.mp3", createdAt: new Date().toISOString() },
  { id: 8, name: "Trial Offer", duration: "0:25", category: "closing", url: "/audio/trial-offer.mp3", createdAt: new Date().toISOString() },
  { id: 9, name: "Next Steps", duration: "0:20", category: "closing", url: "/audio/next-steps.mp3", createdAt: new Date().toISOString() }
];

let callLogs = [
  {
    id: 1,
    leadId: 1,
    leadName: "John Smith",
    phone: "(555) 123-4567",
    date: "2024-01-20",
    time: "10:30 AM",
    duration: "5:23",
    outcome: "Voicemail",
    notes: "Left message about our services",
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    leadId: 2,
    leadName: "Sarah Johnson",
    phone: "(555) 234-5678",
    date: "2024-01-20",
    time: "11:15 AM",
    duration: "12:45",
    outcome: "Interested",
    notes: "Scheduled follow-up for next week",
    createdAt: new Date().toISOString()
  }
];

// Helper functions
const generateId = () => {
  return Date.now() + Math.floor(Math.random() * 1000);
};

// Additional data for enhanced call management
let stats = {
  totalCalls: 0,
  totalConnected: 0,
  totalInterested: 0,
  averageDuration: '0:00',
  conversionRate: 0,
  lastUpdated: new Date().toISOString()
};

let audioFiles = [];

// SIP Configuration storage
const sipConfig = {
  current: null,
  history: []
};

// Active calls tracking
const activeCalls = new Map();

// Call recordings metadata
const callRecordings = [];

// Real-time metrics
const systemMetrics = {
  startTime: new Date().toISOString(),
  totalCallsStarted: 0,
  totalCallsCompleted: 0,
  totalRecordingTime: 0,
  averageCallQuality: 0,
  systemUptime: 0,
  sipConnectionStatus: 'disconnected',
  lastUpdate: new Date().toISOString()
};

// Utility functions
const findById = (collection, id) => {
  return collection.find(item => item.id === id);
};

const findByProperty = (collection, property, value) => {
  return collection.filter(item => item[property] === value);
};

const addItem = (collection, item) => {
  item.id = generateId();
  item.createdAt = new Date().toISOString();
  item.updatedAt = new Date().toISOString();
  collection.push(item);
  return item;
};

const updateItem = (collection, id, updates) => {
  const index = collection.findIndex(item => item.id === id);
  if (index !== -1) {
    collection[index] = { ...collection[index], ...updates, updatedAt: new Date().toISOString() };
    return collection[index];
  }
  return null;
};

const deleteItem = (collection, id) => {
  const index = collection.findIndex(item => item.id === id);
  if (index !== -1) {
    return collection.splice(index, 1)[0];
  }
  return null;
};

const resetData = () => {
  leads.length = 0;
  callLogs.length = 0;
  audioFiles.length = 0;
  callRecordings.length = 0;
  activeCalls.clear();
  sipConfig.current = null;
  sipConfig.history = [];
  console.log('Data store reset');
};

module.exports = {
  // Data arrays
  leads,
  scripts,
  audioClips,
  callLogs,
  stats,
  audioFiles,
  sipConfig,
  activeCalls,
  callRecordings,
  systemMetrics,
  
  // Utility functions
  generateId,
  findById,
  findByProperty,
  addItem,
  updateItem,
  deleteItem,
  resetData
};