import React, { useState } from 'react';

const SourceLink = ({ source, onSourceClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // Enhanced debug log to confirm component is rendering
  React.useEffect(() => {
    console.log('🔗 SourceLink mounted/updated:', { 
      title: source.title, 
      url: source.url,
      hasSource: !!source,
      timestamp: new Date().toISOString()
    });
  }, [source]);

  console.log('🔗 SourceLink rendering with:', { 
    title: source.title, 
    url: source.url,
    hasSource: !!source 
  });

  const handleClick = async (e) => {
    try {
      // Track the click
      onSourceClick?.(source);
      console.log('Document source accessed:', {
        title: source.title,
        url: source.url,
        timestamp: new Date().toISOString()
      });

      // Let the browser handle the link opening naturally
      // No need to prevent default since we want the link to open
    } catch (error) {
      console.error('Error accessing document source:', error);
      // Could show a user-friendly message here if needed
    }
  };

  const getSourceIcon = () => {
    // External sources get web icon
    if (source.type === 'external') return '🌐';
    
    // Internal source icons based on content
    if (source.title?.toLowerCase().includes('twilio')) return '🔧';
    if (source.title?.toLowerCase().includes('getting started') || source.title?.toLowerCase().includes('guide')) return '🚀';
    if (source.title?.toLowerCase().includes('setup')) return '⚙️';
    if (source.title?.toLowerCase().includes('integration')) return '🔌';
    return '📖';
  };

  const getSourceLabel = () => {
    if (source.type === 'external') {
      return source.searchType === 'knowledge_graph' ? 'Knowledge' : 'External';
    }
    return 'View Document';
  };

  const getSourceColor = () => {
    if (source.type === 'external') {
      return {
        backgroundColor: '#059669', // Green for external
        borderColor: '#059669'
      };
    }
    return {
      backgroundColor: '#1d4ed8', // Blue for internal
      borderColor: '#1d4ed8'
    };
  };

  return (
    <div className="flex items-center space-x-2 mt-1" style={{ position: 'relative', zIndex: 9999 }}>
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        data-source-link="true"
        className="flex items-center space-x-1 hover:text-blue-800 underline font-medium transition-all duration-200 hover:scale-105"
        style={{ 
          color: '#ffffff', 
          fontWeight: '700',
          textDecoration: 'none',
          pointerEvents: 'auto',
          cursor: 'pointer',
          display: 'inline-flex',
          ...getSourceColor(),
          padding: '8px 12px',
          borderRadius: '6px',
          border: `2px solid ${getSourceColor().borderColor}`,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          transform: isHovered ? 'scale(1.02)' : 'scale(1)',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
        title={`Open ${source.title} in new tab`}
      >
        <span className="text-lg">{getSourceIcon()}</span>
        <span className="text-sm">{getSourceLabel()}</span>
        <svg 
          className="w-3 h-3 opacity-70" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" 
          />
        </svg>
      </a>
      
      {source.similarity && (
        <span 
          className="text-xs px-2 py-1 rounded-full text-white font-medium"
          style={{ 
            backgroundColor: source.similarity >= 0.8 ? '#10b981' : 
                             source.similarity >= 0.6 ? '#f59e0b' : '#ef4444'
          }}
          title={`Relevance: ${Math.round(source.similarity * 100)}%`}
        >
          {Math.round(source.similarity * 100)}%
        </span>
      )}
    </div>
  );
};

export default SourceLink;