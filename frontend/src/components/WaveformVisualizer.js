import React, { useEffect, useRef, useState } from 'react';

// WaveformVisualizer Component - Professional audio waveform visualization
// Features: real-time visualization, progress tracking, interactive seeking
// Canvas-based rendering for high performance and smooth animations

const WaveformVisualizer = ({ 
  audioUrl, 
  isPlaying, 
  currentTime, 
  duration,
  onSeek,
  height = 100,
  width = '100%',
  color = '#3B82F6',
  progressColor = '#10B981',
  backgroundColor = '#F3F4F6'
}) => {
  const canvasRef = useRef(null);
  const [audioBuffer, setAudioBuffer] = useState(null);
  const [waveformData, setWaveformData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hovering, setHovering] = useState(false);
  const [hoverTime, setHoverTime] = useState(0);
  
  // Audio context for processing
  const audioContextRef = useRef(null);

  // Initialize audio context
  useEffect(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Load and process audio when URL changes
  useEffect(() => {
    if (audioUrl) {
      loadAudioBuffer(audioUrl);
    }
  }, [audioUrl]);

  // Redraw waveform when data or playback state changes
  useEffect(() => {
    if (waveformData && canvasRef.current) {
      drawWaveform();
    }
  }, [waveformData, currentTime, isPlaying, hovering, hoverTime]);

  // Load audio buffer and generate waveform data
  const loadAudioBuffer = async (url) => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch audio file
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to load audio file');
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      
      setAudioBuffer(audioBuffer);
      generateWaveformData(audioBuffer);
      
    } catch (err) {
      console.error('❌ Failed to load audio buffer:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Generate waveform visualization data
  const generateWaveformData = (buffer) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const width = canvas.width;
    const channelData = buffer.getChannelData(0); // Use first channel
    const samples = channelData.length;
    const blockSize = Math.floor(samples / width);
    const waveformArray = [];
    
    // Generate amplitude data for each pixel column
    for (let i = 0; i < width; i++) {
      const startIndex = i * blockSize;
      const endIndex = Math.min(startIndex + blockSize, samples);
      
      let min = 0;
      let max = 0;
      
      // Find min/max values in this block
      for (let j = startIndex; j < endIndex; j++) {
        const value = channelData[j];
        if (value > max) max = value;
        if (value < min) min = value;
      }
      
      waveformArray.push({ min, max });
    }
    
    setWaveformData(waveformArray);
    console.log('✅ Waveform data generated:', waveformArray.length, 'bars');
  };

  // Draw waveform on canvas
  const drawWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas || !waveformData) return;
    
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const progress = duration > 0 ? currentTime / duration : 0;
    const progressX = width * progress;
    
    // Clear canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
    
    // Draw waveform bars
    const barWidth = width / waveformData.length;
    const centerY = height / 2;
    const scale = height * 0.8; // Leave some padding
    
    waveformData.forEach((bar, index) => {
      const x = index * barWidth;
      const minHeight = Math.abs(bar.min) * scale * 0.5;
      const maxHeight = Math.abs(bar.max) * scale * 0.5;
      const barHeight = Math.max(minHeight, maxHeight, 1); // Minimum 1px height
      
      // Choose color based on progress
      ctx.fillStyle = x <= progressX ? progressColor : color;
      
      // Draw bar (centered)
      ctx.fillRect(
        x, 
        centerY - barHeight / 2, 
        Math.max(barWidth - 1, 1), 
        barHeight
      );
    });
    
    // Draw progress line
    if (isPlaying && progress > 0) {
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(progressX, 0);
      ctx.lineTo(progressX, height);
      ctx.stroke();
    }
    
    // Draw hover indicator
    if (hovering && hoverTime >= 0) {
      const hoverX = width * (hoverTime / duration);
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(hoverX, 0);
      ctx.lineTo(hoverX, height);
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash
    }
  };

  // Handle canvas resize
  const handleCanvasResize = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const container = canvas.parentElement;
    const rect = container.getBoundingClientRect();
    
    // Set canvas size with device pixel ratio for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;
    
    // Scale context to match device pixel ratio
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    
    // Set CSS size
    canvas.style.width = rect.width + 'px';
    canvas.style.height = height + 'px';
    
    // Redraw if we have data
    if (waveformData) {
      drawWaveform();
    }
  };

  // Handle click/touch for seeking
  const handleCanvasClick = (event) => {
    if (!duration || !onSeek) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const clickProgress = x / rect.width;
    const seekTime = clickProgress * duration;
    
    onSeek(Math.max(0, Math.min(seekTime, duration)));
  };

  // Handle mouse move for hover indicator
  const handleMouseMove = (event) => {
    if (!duration) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const hoverProgress = x / rect.width;
    const time = hoverProgress * duration;
    
    setHoverTime(Math.max(0, Math.min(time, duration)));
  };

  // Format time for display
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Resize observer for responsive canvas
  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      handleCanvasResize();
    });
    
    const canvas = canvasRef.current;
    if (canvas && canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
      handleCanvasResize(); // Initial size
    }
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className="relative">
      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="text-center">
            <div className="text-2xl mb-2">🔄</div>
            <div className="text-sm text-gray-600">Loading waveform...</div>
          </div>
        </div>
      )}
      
      {/* Error state */}
      {error && (
        <div className="flex items-center justify-center bg-red-50 border border-red-200 rounded" style={{ height }}>
          <div className="text-center">
            <div className="text-2xl mb-2 text-red-600">⚠️</div>
            <div className="text-sm text-red-800">Failed to load waveform</div>
          </div>
        </div>
      )}
      
      {/* Waveform canvas */}
      {!loading && !error && (
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="w-full cursor-pointer"
            style={{ width, height }}
            onClick={handleCanvasClick}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
          />
          
          {/* Time tooltip on hover */}
          {hovering && duration > 0 && (
            <div 
              className="absolute bg-black bg-opacity-80 text-white text-xs px-2 py-1 rounded pointer-events-none transform -translate-x-1/2"
              style={{
                left: `${(hoverTime / duration) * 100}%`,
                top: '-30px'
              }}
            >
              {formatTime(hoverTime)}
            </div>
          )}
          
          {/* Progress indicator */}
          {isPlaying && currentTime > 0 && duration > 0 && (
            <div 
              className="absolute top-0 w-0.5 bg-red-500 pointer-events-none"
              style={{
                left: `${(currentTime / duration) * 100}%`,
                height: `${height}px`
              }}
            />
          )}
        </div>
      )}
      
      {/* Time display */}
      {duration > 0 && (
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      )}
    </div>
  );
};

export default WaveformVisualizer;