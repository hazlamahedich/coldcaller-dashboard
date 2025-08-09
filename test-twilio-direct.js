require('dotenv').config();
const twilio = require('twilio');

console.log('🔍 Testing Twilio Configuration...');

// Check environment variables
console.log('Environment Variables:');
console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? 'SET' : 'NOT SET');
console.log('TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? 'SET' : 'NOT SET');
console.log('TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER);

if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
  console.error('❌ Twilio credentials not found');
  process.exit(1);
}

// Initialize Twilio client
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function testTwilio() {
  try {
    console.log('\n📞 Testing Twilio connection...');
    
    // Test connection by fetching account info
    const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
    console.log('✅ Connected to Twilio account:', account.friendlyName);
    
    // Test phone number validation
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    console.log('📱 Using Twilio number:', fromNumber);
    
    // Make test call - using a different number to actually test the call
    const testNumber = '+15551234567'; // Generic test number - replace with your actual phone
    
    console.log('\n🔔 Making test call to:', testNumber);
    console.log('📞 From Twilio number:', fromNumber);
    
    const call = await client.calls.create({
      to: testNumber,
      from: fromNumber,
      twiml: '<Response><Say voice="alice">Hello! This is a test call from your cold calling application. If you hear this message, your Twilio integration is working correctly.</Say></Response>'
    });
    
    console.log('✅ Test call created successfully!');
    console.log('Call SID:', call.sid);
    console.log('Call Status:', call.status);
    console.log('From:', call.from);
    console.log('To:', call.to);
    
    // Monitor call status
    console.log('\n⏳ Monitoring call status...');
    let attempts = 0;
    const maxAttempts = 10;
    
    const checkStatus = async () => {
      try {
        const updatedCall = await client.calls(call.sid).fetch();
        console.log(`[${new Date().toLocaleTimeString()}] Call status:`, updatedCall.status);
        
        if (updatedCall.status === 'completed' || updatedCall.status === 'failed' || 
            updatedCall.status === 'busy' || updatedCall.status === 'no-answer' ||
            updatedCall.status === 'canceled') {
          console.log('\n📊 Final call details:');
          console.log('Duration:', updatedCall.duration, 'seconds');
          console.log('Price:', updatedCall.price, updatedCall.priceUnit);
          console.log('Direction:', updatedCall.direction);
          console.log('Start Time:', updatedCall.startTime);
          console.log('End Time:', updatedCall.endTime);
          
          if (updatedCall.status === 'completed') {
            console.log('🎉 SUCCESS: Call completed successfully!');
            console.log('📞 Your phone should have rung and played the test message.');
          } else {
            console.log('⚠️ Call ended with status:', updatedCall.status);
            if (updatedCall.status === 'failed') {
              console.log('❌ Call failed - check the phone number and try again');
            }
          }
          return;
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 3000);
        } else {
          console.log('⏰ Stopped monitoring after', maxAttempts, 'attempts');
          console.log('💡 You can check the call status in Twilio Console');
        }
      } catch (error) {
        console.error('❌ Error checking call status:', error.message);
      }
    };
    
    setTimeout(checkStatus, 2000);
    
  } catch (error) {
    console.error('❌ Twilio test failed:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.moreInfo) {
      console.error('More info:', error.moreInfo);
    }
  }
}

console.log('\n🚀 Starting Twilio integration test...');
testTwilio();