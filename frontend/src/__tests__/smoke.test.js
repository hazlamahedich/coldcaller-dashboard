import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../App';
import DialPad from '../components/DialPad';
import AudioClipPlayer from '../components/AudioClipPlayer';
import ScriptDisplay from '../components/ScriptDisplay';
import LeadPanel from '../components/LeadPanel';

describe('Smoke Tests - Basic Rendering', () => {
  test('App renders without crashing', () => {
    render(<App />);
    expect(screen.getByText('🎯 Cold Calling Dashboard')).toBeInTheDocument();
  });

  test('DialPad component renders', () => {
    render(<DialPad />);
    expect(screen.getByText('Dial Pad')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter phone number')).toBeInTheDocument();
  });

  test('AudioClipPlayer component renders', () => {
    render(<AudioClipPlayer />);
    expect(screen.getByText('Audio Clips')).toBeInTheDocument();
    expect(screen.getByText('Greetings')).toBeInTheDocument();
  });

  test('ScriptDisplay component renders', () => {
    render(<ScriptDisplay />);
    expect(screen.getByText('Call Scripts')).toBeInTheDocument();
    expect(screen.getByText('Quick Tips:')).toBeInTheDocument();
  });

  test('LeadPanel component renders', () => {
    render(<LeadPanel />);
    expect(screen.getByText('Current Lead')).toBeInTheDocument();
    expect(screen.getByText('John Smith')).toBeInTheDocument();
  });

  test('All main sections are present in App', () => {
    render(<App />);
    
    // Check all major sections exist
    expect(screen.getByText('Dial Pad')).toBeInTheDocument();
    expect(screen.getByText('Audio Clips')).toBeInTheDocument();
    expect(screen.getByText('Call Scripts')).toBeInTheDocument();
    expect(screen.getByText('Current Lead')).toBeInTheDocument();
    expect(screen.getByText("Today's Stats")).toBeInTheDocument();
    expect(screen.getByText('Recent Calls')).toBeInTheDocument();
  });
});