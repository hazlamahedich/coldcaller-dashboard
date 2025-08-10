import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FloatingChatbot from './FloatingChatbot';

const ChatbotToggle = () => {
  const [showChatbot, setShowChatbot] = useState(false);

  const toggleChatbot = () => {
    setShowChatbot(!showChatbot);
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <motion.button
        className={`fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center z-50 transition-all duration-300 ${
          showChatbot ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={toggleChatbot}
        style={{ zIndex: 999 }}
        aria-label="Open chat assistant"
        title="Open Cold Calling Assistant"
      >
        <motion.svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          initial={{ rotate: 0 }}
          whileHover={{ rotate: 15 }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </motion.svg>

        {/* Notification badge (can be used for unread messages) */}
        <motion.div
          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          style={{ display: 'none' }} // Hidden by default, can be controlled by state
        >
          !
        </motion.div>
      </motion.button>

      {/* Floating Chatbot */}
      <AnimatePresence>
        {showChatbot && (
          <FloatingChatbot
            onClose={() => setShowChatbot(false)}
            initialPosition={{ 
              x: window.innerWidth - 420, 
              y: window.innerHeight - 620 
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatbotToggle;