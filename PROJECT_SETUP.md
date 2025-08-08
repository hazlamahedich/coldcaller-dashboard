# Cold Calling Dashboard - Week 1 Setup Guide

## Prerequisites Installation

### Step 1: Install Required Software

1. **Node.js** (includes npm)
   - Go to https://nodejs.org/
   - Download the LTS version (20.x)
   - Install it (click through the installer)

2. **Visual Studio Code** (recommended editor)
   - Go to https://code.visualstudio.com/
   - Download and install

3. **Git** (for version control)
   - Go to https://git-scm.com/
   - Download and install

### Step 2: Verify Installation

Open Terminal (Mac) or Command Prompt (Windows) and run:
```bash
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
git --version   # Should show git version
```

## Project Structure

Your project will be organized like this:

```
coldcaller/
├── frontend/               # React app
│   ├── public/            # Static files
│   ├── src/               # Source code
│   │   ├── components/    # React components
│   │   ├── data/          # Dummy data
│   │   ├── styles/        # CSS files
│   │   └── App.js         # Main app
│   └── package.json       # Dependencies
├── backend/               # Express server (Week 3)
├── audio-clips/           # Audio files (Week 4)
└── database/              # Database files (Week 6)
```

## What We're Building in Week 1

This week we'll create 4 main components:

1. **DialPad**: Phone keypad for entering numbers
2. **AudioClipPlayer**: Panel with buttons to play audio clips
3. **ScriptDisplay**: Shows color-coded call scripts
4. **LeadPanel**: Displays current lead information

Each component will work with dummy (fake) data first, so you can see everything working before connecting real features.