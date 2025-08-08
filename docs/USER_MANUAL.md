# ColdCaller Dashboard - Complete User Manual

## 📋 Table of Contents
1. [Getting Started](#getting-started)
2. [User Roles & Permissions](#user-roles--permissions)
3. [Dashboard Overview](#dashboard-overview)
4. [Making Calls](#making-calls)
5. [Lead Management](#lead-management)
6. [Note Taking System](#note-taking-system)
7. [Audio Library](#audio-library)
8. [Call Analytics](#call-analytics)
9. [Advanced Features](#advanced-features)
10. [Troubleshooting](#troubleshooting)

---

## Getting Started

### First Time Login
1. **Access the Application**
   - Open your web browser
   - Navigate to your ColdCaller dashboard URL
   - Log in with your provided credentials

2. **Initial Setup**
   - Complete your user profile
   - Test your microphone and audio settings
   - Review your assigned leads

### System Requirements
- **Modern web browser** (Chrome 90+, Firefox 88+, Safari 14+)
- **Microphone access** for VOIP calling
- **Stable internet connection** (minimum 1 Mbps)
- **Speakers or headset** recommended

---

## User Roles & Permissions

### 🎯 Sales Agent
**Primary Functions:**
- Make cold calls using VOIP system
- Manage assigned leads and prospects
- Take detailed call notes
- Use audio clips and call scripts
- Track personal call performance

**Daily Workflow:**
1. Review today's leads
2. Prepare call scripts and audio clips  
3. Make calls using the dialer
4. Log call outcomes and notes
5. Schedule follow-ups
6. Review daily performance metrics

### 📊 Sales Manager
**Primary Functions:**
- Monitor team call performance
- Assign leads to sales agents
- Review call analytics and reports
- Manage call scripts and templates
- Configure system settings

**Management Dashboard:**
- Team performance overview
- Call volume and conversion rates
- Lead pipeline status
- Agent productivity metrics

### ⚙️ System Administrator
**Primary Functions:**
- User account management
- System configuration
- VOIP server settings
- Security and backup management
- Integration management

**Admin Controls:**
- User permissions and roles
- System health monitoring
- Data backup and recovery
- API configuration

---

## Dashboard Overview

### Main Interface Layout

```
┌─────────────────┬─────────────────────────────┐
│                 │                             │
│   Lead Panel    │        Call Controls        │
│                 │                             │
│   • Lead Info   │   • DialPad                 │
│   • Notes       │   • Call Status             │
│   • History     │   • DTMF Keypad            │
│                 │                             │
├─────────────────┼─────────────────────────────┤
│                 │                             │
│  Script Display │      Audio Library          │
│                 │                             │
│   • Call Scripts│   • Greeting Clips          │
│   • Tips        │   • Objection Handlers      │
│   • Templates   │   • Closing Scripts         │
│                 │                             │
└─────────────────┴─────────────────────────────┘
```

### Navigation Elements
- **Top Bar**: User profile, notifications, settings
- **Left Sidebar**: Main navigation menu
- **Right Panel**: Quick actions and shortcuts
- **Bottom Bar**: System status and help

### Customization Options
- **Layout**: Switch between compact and expanded views
- **Color Theme**: Choose from professional color schemes
- **Panel Arrangement**: Drag and drop to rearrange components
- **Quick Actions**: Customize toolbar buttons

---

## Making Calls

### VOIP Call Process

#### Step 1: Select Lead
1. Click on lead from the Lead Panel
2. Review contact information
3. Check previous call history
4. Note any special requirements

#### Step 2: Prepare for Call
1. **Choose Call Script**
   - Select appropriate script from Script Display
   - Customize with lead-specific information
   - Copy key phrases to clipboard

2. **Queue Audio Clips**
   - Select relevant greeting clips
   - Prepare objection handlers
   - Queue closing audio if needed

#### Step 3: Make the Call
1. **Enter Phone Number**
   - Use DialPad to enter number
   - Number auto-formats during entry
   - Click green call button to dial

2. **Call States**
   - **Connecting**: System establishing connection
   - **Ringing**: Phone ringing at destination
   - **Active**: Call is connected and live
   - **On Hold**: Call placed on hold

#### Step 4: During the Call
1. **Call Controls Available**
   - **Mute/Unmute**: Toggle microphone
   - **Hold/Resume**: Place call on hold
   - **DTMF**: Send touch tones for menu navigation
   - **Record**: Start/stop call recording
   - **Transfer**: Transfer call to another agent

2. **Real-time Information**
   - Call duration timer
   - Connection quality indicator
   - Signal strength bars
   - Network latency display

#### Step 5: End Call & Log Results
1. **Hang Up**: Click red hang-up button
2. **Log Outcome**: Select from dropdown options
   - Interested
   - Not Interested  
   - Voicemail Left
   - No Answer
   - Callback Requested
   - Busy Signal

3. **Add Notes**: Document key conversation points
4. **Schedule Follow-up**: Set reminder if needed

### Advanced Calling Features

#### Call History & Quick Redial
- **Recent Calls List**: Last 20 calls with outcomes
- **Quick Redial**: Click phone icon to redial
- **Call Details**: Expand to see full call information
- **Outcome Filtering**: Filter by call results

#### DTMF (Touch Tone) Usage
- **Access During Call**: DTMF keypad appears during active calls
- **Menu Navigation**: Press numbers to navigate phone menus
- **Visual Feedback**: Keys light up when pressed
- **Tone History**: See sequence of tones sent

#### Call Transfer
1. Click "Transfer" during active call
2. Enter destination number
3. Choose transfer type:
   - **Blind Transfer**: Immediate transfer
   - **Attended Transfer**: Speak before transferring
4. Click "Complete Transfer"

---

## Lead Management

### Lead Information Panel

#### Contact Details Display
- **Primary Info**: Name, company, title
- **Contact Methods**: Phone, email, LinkedIn
- **Lead Status**: New, Contacted, Follow-up, Qualified, Lost
- **Lead Source**: How lead was acquired
- **Assigned Agent**: Current owner

#### Lead Status Management
**Status Options:**
- 🆕 **New**: Fresh lead, not yet contacted
- 📞 **Contacted**: Initial contact made
- 🔄 **Follow-up**: Requires additional contact
- ✅ **Qualified**: Meets qualification criteria
- ❌ **Lost**: No longer viable prospect

**Changing Status:**
1. Click current status badge
2. Select new status from dropdown
3. Add status change note (optional)
4. Status automatically timestamps

### Lead Navigation
- **Previous/Next Buttons**: Navigate through lead list
- **Lead Counter**: Shows current position (e.g., "Lead 3 of 15")
- **Quick Search**: Search leads by name or company
- **Filter Options**: Filter by status, agent, or date

### Lead Actions
- **Call Lead**: Immediately dial lead's phone
- **Send Email**: Open email client with lead's address  
- **Schedule Follow-up**: Set reminder for future contact
- **Add to Campaign**: Include in marketing campaign
- **Export Lead**: Export lead data

---

## Note Taking System

### Comprehensive Note Management

#### Note Types
1. **Call Notes**: Specific to individual calls
2. **Lead Notes**: General lead information
3. **Follow-up Notes**: Action items and reminders
4. **Personal Notes**: Agent's private observations

#### Note Taking Interface
```
┌─────────────────────────────────────┐
│  📝 Call Notes                      │
├─────────────────────────────────────┤
│                                     │
│  [Rich text editor with formatting] │
│                                     │
│  • Bold, italic, underline          │
│  • Bullet points and numbering      │
│  • Quick tags and categories        │
│                                     │
├─────────────────────────────────────┤
│  🏷️ Tags: [Sales] [Interested] [+]  │
│  📅 Follow-up: [Date Picker]        │
│  📋 Template: [Quick Templates ▼]   │
└─────────────────────────────────────┘
```

#### Quick Note Templates
**Pre-built Templates:**
- **Initial Contact**: First call attempt template
- **Voicemail Left**: Standard voicemail note
- **Not Interested**: Rejection reasons and notes
- **Callback Requested**: Callback scheduling template
- **Meeting Scheduled**: Meeting details template

**Using Templates:**
1. Click "Template" dropdown
2. Select appropriate template
3. Template auto-fills note editor
4. Customize with call-specific details

#### Note Features
- **Auto-Save**: Notes save automatically every 30 seconds
- **Rich Formatting**: Bold, italic, lists, and links
- **Quick Tags**: Add categorical tags for organization
- **Search**: Full-text search across all notes
- **Export**: Export notes to PDF or CSV

### Note Analytics
- **Note Volume**: Track note-taking frequency
- **Tag Analysis**: Most commonly used tags
- **Follow-up Tracking**: Scheduled follow-up completion rates
- **Template Usage**: Most effective note templates

---

## Audio Library

### Audio Clip Categories

#### 🎯 Greetings & Introductions
- **Professional Introduction**: Standard business greeting
- **Warm Introduction**: Follow-up call greeting
- **Referral Introduction**: When calling from referral
- **Cold Outreach**: Initial cold call greeting

#### 🛡️ Objection Handlers
- **Price Objection**: "Too expensive" responses
- **Time Objection**: "Not interested right now" responses
- **Authority Objection**: "Need to check with boss" responses
- **Competitor Objection**: "Already working with someone" responses

#### 🎯 Closing Scripts
- **Trial Close**: Testing interest level
- **Assumptive Close**: Assuming the sale
- **Alternative Close**: Offering options
- **Urgency Close**: Time-sensitive offers

#### 📋 General Scripts
- **Product Demos**: Feature explanation clips
- **Company Background**: About us information
- **Social Proof**: Customer testimonial clips
- **FAQ Responses**: Common question answers

### Using Audio Clips

#### Playing Audio Clips
1. **Select Category**: Click category tab
2. **Choose Clip**: Click on desired audio clip
3. **Preview**: Clips play for 3-second preview
4. **Full Play**: Click play button for full clip
5. **Auto-Stop**: Clips auto-stop after playing

#### Audio Controls
- **Play/Pause**: Control playback
- **Volume**: Adjust audio level
- **Speed**: Adjust playback speed (0.5x to 2x)
- **Repeat**: Loop clip for practice

#### Custom Audio Management
- **Upload Clips**: Add your own audio recordings
- **Edit Descriptions**: Customize clip names and descriptions
- **Create Playlists**: Group clips for specific call types
- **Share with Team**: Make clips available to other agents

---

## Call Analytics

### Personal Performance Dashboard

#### Daily Metrics
```
┌─────────────────┬─────────────────┬─────────────────┐
│     Calls       │   Connect Rate  │   Avg Duration  │
│       42        │      68%        │     4:32        │
└─────────────────┴─────────────────┴─────────────────┘

┌─────────────────────────────────────────────────────┐
│                Call Outcomes                        │
├─────────────────────────────────────────────────────┤
│  ✅ Interested:      12 (28.6%)                     │
│  📞 Callback:         8 (19.0%)                     │
│  📧 Voicemail:       15 (35.7%)                     │
│  ❌ Not Interested:   7 (16.7%)                     │
└─────────────────────────────────────────────────────┘
```

#### Weekly Performance Trends
- **Call Volume Graph**: Calls per day over time
- **Success Rate Trend**: Conversion rate progression
- **Peak Hours Analysis**: Best times for calling
- **Lead Quality Metrics**: Lead source effectiveness

#### Goal Tracking
- **Daily Call Target**: Set and track daily call goals
- **Weekly Targets**: Weekly performance objectives
- **Monthly Goals**: Long-term performance tracking
- **Achievement Badges**: Unlock performance milestones

### Team Performance (Managers Only)

#### Team Dashboard
- **Agent Rankings**: Top performers by various metrics
- **Team Totals**: Combined team statistics
- **Performance Comparisons**: Agent vs. agent metrics
- **Coaching Opportunities**: Agents needing support

#### Reporting Features
- **Custom Reports**: Build reports with specific metrics
- **Export Data**: Export reports to Excel/PDF
- **Scheduled Reports**: Automatic report generation
- **Dashboard Sharing**: Share reports with stakeholders

---

## Advanced Features

### CRM Integration
- **Lead Import**: Import leads from external CRM
- **Data Sync**: Two-way data synchronization
- **Custom Fields**: Map CRM fields to system
- **Automated Updates**: Real-time data updates

### Automation Features
- **Auto-Dialer**: Sequential calling through lead lists
- **Callback Scheduling**: Automatic callback reminders
- **Follow-up Automation**: Scheduled follow-up sequences
- **Email Integration**: Automated email follow-ups

### Mobile Interface
- **Responsive Design**: Works on tablets and phones
- **Touch Controls**: Optimized for touch interfaces
- **Offline Mode**: Basic functionality without internet
- **Push Notifications**: Call reminders and alerts

### Integration APIs
- **Webhook Integration**: Real-time data updates
- **REST API Access**: Custom integrations
- **Third-party Apps**: Connect with other tools
- **Custom Dashboards**: Build custom reporting interfaces

---

## Troubleshooting

### Common Issues & Solutions

#### Audio/VOIP Problems

**Problem**: Can't hear other party
**Solutions:**
1. Check browser microphone permissions
2. Test audio with system audio test
3. Try different browser or refresh page
4. Check network connection stability

**Problem**: Poor call quality/choppy audio
**Solutions:**
1. Close other browser tabs and applications
2. Check internet speed (minimum 1 Mbps)
3. Use ethernet connection instead of WiFi
4. Contact system administrator for server status

**Problem**: Can't make outgoing calls
**Solutions:**
1. Verify VOIP server connection status
2. Check SIP registration in call status panel
3. Try logging out and back in
4. Contact administrator for account status

#### Lead Management Issues

**Problem**: Leads not loading or displaying
**Solutions:**
1. Refresh browser page
2. Clear browser cache and cookies
3. Check internet connection
4. Try incognito/private browsing mode

**Problem**: Can't save notes or lead updates
**Solutions:**
1. Check network connection
2. Verify you have permission to edit leads
3. Try refreshing page and re-entering information
4. Contact administrator if problem persists

#### Performance Issues

**Problem**: Application running slowly
**Solutions:**
1. Close unnecessary browser tabs
2. Clear browser cache
3. Disable browser extensions temporarily
4. Restart browser application
5. Check system memory and close other programs

### Browser Compatibility

#### Recommended Browsers
- ✅ **Chrome 90+**: Full feature support
- ✅ **Firefox 88+**: Full feature support  
- ✅ **Safari 14+**: Full feature support
- ✅ **Edge 90+**: Full feature support

#### Known Limitations
- **Internet Explorer**: Not supported
- **Older Mobile Browsers**: Limited functionality
- **Corporate Firewalls**: May block VOIP features

### Getting Help

#### Built-in Help
- **Help Button**: Click ? icon for contextual help
- **Tooltips**: Hover over elements for quick tips
- **Keyboard Shortcuts**: Press Ctrl+? for shortcut list

#### Support Resources
- **User Manual**: Complete documentation (this document)
- **Video Tutorials**: Step-by-step video guides
- **FAQ Section**: Frequently asked questions
- **Support Ticket**: Submit technical support requests

#### Contact Information
- **Technical Support**: support@coldcaller.com
- **Training Questions**: training@coldcaller.com
- **Account Issues**: accounts@coldcaller.com
- **Phone Support**: 1-800-COLD-CALL (1-800-265-3225)

---

## Quick Reference

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| Ctrl+D | Start dialing current lead |
| Ctrl+H | Hang up current call |
| Ctrl+M | Mute/unmute microphone |
| Ctrl+N | Add new note |
| Ctrl+S | Save current work |
| Ctrl+/ | Show help panel |
| Arrow Keys | Navigate between leads |
| Space | Play/pause audio clips |

### Status Icons
| Icon | Meaning |
|------|---------|
| 🟢 | Online/Connected |
| 🟡 | Connecting/In Progress |
| 🔴 | Offline/Error |
| 📞 | Active Call |
| 📧 | Email Available |
| 🔔 | Notification/Reminder |

### Common Phone Menu Navigation
| Menu Type | Typical Navigation |
|-----------|-------------------|
| Main Menu | Press 0 for operator |
| Directory | Press 1 for directory |
| Voicemail | Press # to skip greeting |
| Transfer | Press * for transfer |

---

**Last Updated**: January 2024  
**Version**: 2.0  
**For Technical Support**: support@coldcaller.com