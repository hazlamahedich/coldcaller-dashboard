// Debug script to test chatbot sources rendering
// Run this in browser console after opening chatbot

console.log('🔍 Starting chatbot sources debug...');

// Test 1: Check if ChatMessage component is loaded
const checkChatMessage = () => {
    console.log('📝 Checking ChatMessage component...');
    
    // Look for chatbot messages in DOM
    const messageElements = document.querySelectorAll('.message-content');
    console.log(`Found ${messageElements.length} message elements`);
    
    // Look for source sections
    const sourceSections = document.querySelectorAll('[id*="sources-"]');
    console.log(`Found ${sourceSections.length} source sections`);
    
    return { messageElements: messageElements.length, sourceSections: sourceSections.length };
};

// Test 2: Check SourceLink components
const checkSourceLinks = () => {
    console.log('🔗 Checking SourceLink components...');
    
    // Look for source link elements
    const sourceLinks = document.querySelectorAll('[data-source-link="true"]');
    console.log(`Found ${sourceLinks.length} source links`);
    
    const viewDocumentButtons = Array.from(document.querySelectorAll('a')).filter(a => 
        a.textContent.includes('View Document')
    );
    console.log(`Found ${viewDocumentButtons.length} "View Document" buttons`);
    
    return { sourceLinks: sourceLinks.length, viewDocumentButtons: viewDocumentButtons.length };
};

// Test 3: Send test message and monitor
const sendTestMessage = async () => {
    console.log('📨 Sending test message...');
    
    // Find chat input
    const chatInput = document.querySelector('textarea') || document.querySelector('input[type="text"]');
    if (!chatInput) {
        console.error('❌ Could not find chat input');
        return;
    }
    
    console.log('✅ Found chat input, sending test message...');
    
    // Monitor for new messages
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if this is a new message
                        if (node.querySelector && (
                            node.querySelector('.message-content') || 
                            node.classList.contains('message-content')
                        )) {
                            console.log('🆕 New message detected!');
                            setTimeout(() => {
                                checkChatMessage();
                                checkSourceLinks();
                            }, 1000);
                        }
                    }
                });
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Simulate typing and sending
    chatInput.value = 'What is Twilio?';
    chatInput.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Find send button
    const sendButton = document.querySelector('button[type="submit"]') || 
                      Array.from(document.querySelectorAll('button')).find(btn => 
                          btn.textContent.includes('Send') || btn.innerHTML.includes('svg')
                      );
    
    if (sendButton) {
        console.log('✅ Found send button, clicking...');
        sendButton.click();
    } else {
        console.log('⚠️ Send button not found, trying Enter key...');
        chatInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    }
    
    // Stop observing after 10 seconds
    setTimeout(() => {
        observer.disconnect();
        console.log('🔍 Final check after test message:');
        checkChatMessage();
        checkSourceLinks();
    }, 10000);
};

// Test 4: Check message data structure
const checkMessageData = () => {
    console.log('📊 Checking message data in React components...');
    
    // Try to access React component data (if available)
    const messageElements = document.querySelectorAll('.message-content');
    messageElements.forEach((element, index) => {
        const reactInstance = element._reactInternalInstance || 
                            element._reactInternalFiber ||
                            Object.keys(element).find(key => key.startsWith('__reactInternalInstance'));
        
        if (reactInstance) {
            console.log(`Message ${index + 1}: Has React instance`);
        } else {
            console.log(`Message ${index + 1}: No React instance found`);
        }
    });
};

// Run initial checks
console.log('🚀 Running initial checks...');
checkChatMessage();
checkSourceLinks();
checkMessageData();

// Instructions
console.log(`
📋 Debug Instructions:
1. Run sendTestMessage() to test a message with sources
2. Check browser console for SourceLink rendering logs
3. Look for blue "📖 View Document" buttons in chat
4. Check Network tab for RAG API calls

Available functions:
- checkChatMessage() - Check for ChatMessage components
- checkSourceLinks() - Check for SourceLink components  
- sendTestMessage() - Send test message and monitor
- checkMessageData() - Check React component data
`);

// Export functions to global scope
window.debugChatbot = {
    checkChatMessage,
    checkSourceLinks,
    sendTestMessage,
    checkMessageData
};

console.log('🔍 Debug functions available as window.debugChatbot.*');