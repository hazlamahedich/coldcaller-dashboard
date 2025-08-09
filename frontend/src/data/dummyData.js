// Dummy data for testing our components
// This is fake data that helps us build the UI before connecting real features

export const dummyLeads = [
  {
    id: 1,
    name: "John Smith",
    company: "Tech Solutions Inc.",
    phone: "(555) 123-4567",
    email: "john@techsolutions.com",
    status: "New",
    priority: "High",
    lastContact: "Never",
    notes: "Interested in cloud services",
    call_attempts: 0
  },
  {
    id: 2,
    name: "Sarah Johnson",
    company: "Digital Marketing Pro",
    phone: "(555) 234-5678",
    email: "sarah@digitalmpro.com",
    status: "Follow-up",
    priority: "Medium",
    lastContact: "2024-01-15",
    notes: "Requested pricing information",
    call_attempts: 3
  },
  {
    id: 3,
    name: "Mike Chen",
    company: "StartUp Ventures",
    phone: "(555) 345-6789",
    email: "mike@startupv.com",
    status: "Qualified",
    priority: "Low",
    lastContact: "2024-01-10",
    notes: "Decision maker, budget approved",
    call_attempts: 1
  },
  {
    id: 4,
    name: "Emma Rodriguez",
    company: "Future Innovations",
    phone: "",
    email: "",
    status: "New", 
    priority: "Medium",
    lastContact: "Never",
    notes: "Lead from trade show, contact info missing",
    call_attempts: 0
  },
  {
    id: 5,
    name: "David Park",
    company: "Growth Corp",
    phone: "(555) 456-7890",
    email: "",
    status: "Not Interested",
    priority: "Low",
    lastContact: "2024-01-08",
    notes: "Has phone but no email - prefers calls only",
    call_attempts: 2
  }
];

export const dummyScripts = {
  introduction: {
    title: "Introduction",
    color: "blue",
    text: "Hi [NAME], this is [YOUR NAME] from [COMPANY]. I'm calling because we help companies like [THEIR COMPANY] reduce their IT costs by up to 30%. Do you have 2 minutes to hear how we've helped similar businesses?"
  },
  gatekeeper: {
    title: "Gatekeeper",
    color: "yellow",
    text: "Hi, I'm trying to reach the person who handles IT decisions at [COMPANY]. Could you point me in the right direction? I have some important information about cost savings that I think they'd want to know about."
  },
  objection: {
    title: "Objection Handling",
    color: "red",
    text: "I completely understand you're busy. That's exactly why I'm calling - we specialize in saving busy executives time and money. Would it be better if I sent you a quick email with the key points and we could schedule a brief call next week?"
  },
  closing: {
    title: "Closing",
    color: "green",
    text: "Great! Based on what you've told me, it sounds like we could really help. The next step would be a 15-minute demo where I can show you exactly how this would work for [COMPANY]. Are you available Tuesday at 2 PM or would Thursday at 10 AM work better?"
  }
};

export const dummyAudioClips = {
  greetings: [
    { id: 1, name: "Professional Intro", duration: "0:15", category: "greetings" },
    { id: 2, name: "Casual Intro", duration: "0:12", category: "greetings" },
    { id: 3, name: "Executive Intro", duration: "0:18", category: "greetings" }
  ],
  objections: [
    { id: 4, name: "Not Interested", duration: "0:20", category: "objections" },
    { id: 5, name: "Too Busy", duration: "0:15", category: "objections" },
    { id: 6, name: "Send Email", duration: "0:18", category: "objections" }
  ],
  closing: [
    { id: 7, name: "Schedule Meeting", duration: "0:22", category: "closing" },
    { id: 8, name: "Trial Offer", duration: "0:25", category: "closing" },
    { id: 9, name: "Next Steps", duration: "0:20", category: "closing" }
  ],
  custom: [
    { id: 10, name: "My Custom Recording", duration: "0:30", category: "custom" },
    { id: 11, name: "Personal Follow-up", duration: "0:25", category: "custom" }
  ]
};

// Convert object format to array format (for compatibility with API format)
export const dummyAudioClipsArray = [
  // Greetings
  { id: 1, name: "Professional Intro", duration: "0:15", category: "greetings" },
  { id: 2, name: "Casual Intro", duration: "0:12", category: "greetings" },
  { id: 3, name: "Executive Intro", duration: "0:18", category: "greetings" },
  // Objections  
  { id: 4, name: "Not Interested", duration: "0:20", category: "objections" },
  { id: 5, name: "Too Busy", duration: "0:15", category: "objections" },
  { id: 6, name: "Send Email", duration: "0:18", category: "objections" },
  // Closing
  { id: 7, name: "Schedule Meeting", duration: "0:22", category: "closing" },
  { id: 8, name: "Trial Offer", duration: "0:25", category: "closing" },
  { id: 9, name: "Next Steps", duration: "0:20", category: "closing" },
  // Custom - This will show the custom category!
  { id: 10, name: "My Custom Recording", duration: "0:30", category: "custom" },
  { id: 11, name: "Personal Follow-up", duration: "0:25", category: "custom" }
];

// Helper function to convert object format to categorized format
export const convertAudioClipsToCategories = (audioClipsArray) => {
  if (!audioClipsArray || !Array.isArray(audioClipsArray)) {
    return {};
  }
  
  return audioClipsArray.reduce((acc, clip) => {
    if (!acc[clip.category]) {
      acc[clip.category] = [];
    }
    acc[clip.category].push(clip);
    return acc;
  }, {});
};

export const dummyCallLog = [
  {
    id: 1,
    leadName: "John Smith",
    phone: "(555) 123-4567",
    date: "2024-01-20",
    time: "10:30 AM",
    duration: "5:23",
    outcome: "Voicemail",
    notes: "Left message about our services"
  },
  {
    id: 2,
    leadName: "Sarah Johnson",
    phone: "(555) 234-5678",
    date: "2024-01-20",
    time: "11:15 AM",
    duration: "12:45",
    outcome: "Interested",
    notes: "Scheduled follow-up for next week"
  }
];