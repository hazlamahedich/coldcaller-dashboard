import React, { useState } from 'react';
import { dummyAudioClips } from '../data/dummyData';

// AudioClipPlayer Component - This creates panels with buttons to play audio clips
// Organized by categories like greetings, objections, and closing

const AudioClipPlayer = () => {
  // Track which clip is currently playing
  const [playingClip, setPlayingClip] = useState(null);
  // Track the selected category
  const [selectedCategory, setSelectedCategory] = useState('greetings');

  // This function simulates playing an audio clip
  // In Week 4, we'll connect this to real audio files
  const handlePlayClip = (clipId, clipName) => {
    if (playingClip === clipId) {
      // If the same clip is clicked, stop it
      console.log('Stopping:', clipName);
      setPlayingClip(null);
    } else {
      // Play the new clip
      console.log('Playing:', clipName);
      setPlayingClip(clipId);
      
      // Simulate clip ending after 3 seconds
      setTimeout(() => {
        setPlayingClip(null);
      }, 3000);
    }
  };

  // Get clips for the selected category
  const currentClips = dummyAudioClips[selectedCategory] || [];

  return (
    <div className="card max-w-md mx-2.5">
      <h2 className="text-center mb-4 text-slate-800 text-lg font-semibold">Audio Clips</h2>
      
      {/* Category tabs */}
      <div className="flex gap-1 mb-5 border-b-2 border-gray-200 pb-2.5">
        {Object.keys(dummyAudioClips).map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 text-sm rounded-t-md transition-all duration-300 border-none cursor-pointer ${
              selectedCategory === category
                ? 'bg-green-500 text-white font-bold'
                : 'bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-800'
            }`}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>

      {/* Audio clips for selected category */}
      <div className="max-h-80 overflow-y-auto">
        {currentClips.map((clip) => (
          <div key={clip.id} className="flex justify-between items-center p-3 mb-2 bg-white rounded-md border border-gray-200 hover:shadow-md transition-shadow duration-200">
            <div className="flex flex-col flex-1">
              <span className="font-semibold text-sm text-slate-700">{clip.name}</span>
              <span className="text-xs text-gray-500 mt-0.5">{clip.duration}</span>
            </div>
            <button
              onClick={() => handlePlayClip(clip.id, clip.name)}
              className={`px-4 py-2 text-white border-none rounded-md cursor-pointer text-sm font-medium transition-all duration-300 hover:scale-105 ${
                playingClip === clip.id
                  ? 'bg-orange-500 hover:bg-orange-600'
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {playingClip === clip.id ? '⏸️ Pause' : '▶️ Play'}
            </button>
          </div>
        ))}
      </div>

      {/* Status indicator */}
      {playingClip && (
        <div className="text-center mt-4 p-3 bg-blue-50 rounded-md text-blue-700 text-sm font-medium">
          🎵 Playing audio clip...
        </div>
      )}

      {/* Instructions for user */}
      <div className="mt-4 p-3 bg-orange-50 rounded-md text-sm text-gray-600 leading-relaxed">
        💡 Tip: Click on clips to play during your call. 
        They'll help handle common situations.
      </div>
    </div>
  );
};


export default AudioClipPlayer;