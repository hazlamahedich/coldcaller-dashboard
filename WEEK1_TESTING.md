# Week 1 Testing Guide - Cold Calling Dashboard

## How to Run Your App

### Step 1: Open Terminal
- Mac: Press `Cmd + Space`, type "Terminal", press Enter
- Windows: Press `Windows + R`, type "cmd", press Enter

### Step 2: Navigate to Your Project
```bash
cd ~/coldcaller/frontend
```

### Step 3: Start the Development Server
```bash
npm start
```

Your browser should automatically open to http://localhost:3000
If not, open your browser and go to that address.

## What You Should See

### 🎯 Main Dashboard
You should see a dashboard with 3 columns:

**Left Column:**
- Lead Panel showing John Smith's information
- Navigation buttons to browse through 3 test leads
- Editable notes section

**Middle Column:**
- Dial Pad with number buttons
- Phone number display
- Call/Hang Up button
- Today's Stats (dummy data)

**Right Column:**
- Audio Clip Player with 3 categories
- Buttons to simulate playing audio
- Recent Calls list (dummy data)

## Testing Each Component

### 1. Test the DialPad
✅ **What to test:**
- Click number buttons - numbers should appear in display
- Type directly in the input field
- Click delete button (⌫) - removes last digit
- Click Call button - turns green to red "Hang Up"
- Click Hang Up - returns to Call button

✅ **Check the console:**
- Open Developer Tools (F12 or right-click → Inspect)
- Go to Console tab
- You should see "Calling: [number]" when you click Call
- You should see "Call ended" when you click Hang Up

### 2. Test the LeadPanel
✅ **What to test:**
- Click "Next" button - shows Sarah Johnson
- Click "Previous" button - goes back to John Smith
- Click "Edit" on notes - text area appears
- Type new notes and click Save
- Click Cancel - reverts changes

✅ **Expected behavior:**
- 3 leads total (John, Sarah, Mike)
- Status badges have different colors
- Notes save locally (lost on refresh for now)

### 3. Test the ScriptDisplay
✅ **What to test:**
- Click different script buttons (Introduction, Gatekeeper, etc.)
- Each script has different color coding
- Click "Copy" - copies script to clipboard
- Click "Expand/Collapse" - changes view size

✅ **Color meanings:**
- Blue = Introduction
- Yellow = Gatekeeper  
- Red = Objection Handling
- Green = Closing

### 4. Test the AudioClipPlayer
✅ **What to test:**
- Click category tabs (Greetings, Objections, Closing)
- Click Play buttons - changes to Pause
- Status shows "Playing audio clip..."
- Auto-stops after 3 seconds

✅ **Check the console:**
- Should see "Playing: [clip name]" messages
- Should see "Stopping: [clip name]" when paused

## Common Issues & Solutions

### Issue: "npm: command not found"
**Solution:** Node.js isn't installed. Go back to prerequisites and install Node.js.

### Issue: Page is blank
**Solution:** 
1. Check browser console for errors (F12 → Console)
2. Make sure all component files were created
3. Try stopping server (Ctrl+C) and running `npm start` again

### Issue: "Module not found" error
**Solution:**
1. Check that all files are in correct folders
2. File names must match exactly (case-sensitive)
3. Make sure imports in App.js are correct

### Issue: Styles look broken
**Solution:**
1. This is normal for Week 1 - we'll add Tailwind CSS in Week 2
2. Components should still be functional even if not pretty

## Success Indicators

You know Week 1 is working when:
✅ All 4 components appear on screen
✅ Dial pad accepts input and shows numbers
✅ Lead navigation works (3 leads)
✅ Scripts change with color coding
✅ Audio player shows 3 categories with clips
✅ Console shows messages when interacting
✅ No red errors in browser console

## What's Next (Week 2 Preview)

Next week we'll make everything beautiful by:
- Installing Tailwind CSS
- Creating a professional color scheme
- Adding icons and animations
- Making the layout responsive (works on mobile)
- Adding dark mode toggle

## Quick Commands Reference

```bash
# Start the app
npm start

# Stop the app
Ctrl + C (or Cmd + C on Mac)

# Install missing packages (if needed)
npm install

# Check for issues
npm audit

# Build for production (Week 8)
npm run build
```

## Developer Tips

1. **Keep Console Open:** Always have browser DevTools open to catch errors
2. **Save Often:** Changes auto-refresh in browser when you save files
3. **Small Changes:** Make one small change at a time and test
4. **Version Control:** Consider using git to save your progress

## Need Help?

If something isn't working:
1. Check the browser console for errors
2. Verify all files are in the right folders
3. Make sure file names match exactly
4. Try restarting the development server
5. Compare your code with the provided examples

Congratulations! You've built the foundation of your cold calling dashboard! 🎉