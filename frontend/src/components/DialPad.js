import React, { useState } from 'react';

// DialPad Component - This creates a phone keypad like on your smartphone
// It lets users type phone numbers and shows a call/hang up button

const DialPad = () => {
  // useState is React's way of storing data that can change
  // phoneNumber stores what number the user has typed
  const [phoneNumber, setPhoneNumber] = useState('');
  // isCalling tells us if we're currently on a call
  const [isCalling, setIsCalling] = useState(false);

  // This function runs when someone clicks a number button
  const handleNumberClick = (number) => {
    // Add the clicked number to the phone number
    setPhoneNumber(phoneNumber + number);
  };

  // This function runs when someone clicks the delete button
  const handleDelete = () => {
    // Remove the last digit from the phone number
    setPhoneNumber(phoneNumber.slice(0, -1));
  };

  // This function runs when someone clicks the call button
  const handleCall = () => {
    if (phoneNumber.length > 0) {
      setIsCalling(true);
      console.log('Calling:', phoneNumber);
      // In Week 5, we'll connect this to real VOIP calling
    }
  };

  // This function runs when someone clicks the hang up button
  const handleHangUp = () => {
    setIsCalling(false);
    console.log('Call ended');
    // Optionally clear the number after hanging up
    // setPhoneNumber('');
  };

  // Format phone number to look nice (555) 123-4567
  const formatPhoneNumber = (num) => {
    const cleaned = num.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  };

  // The buttons array makes it easy to create all number buttons
  const buttons = [
    '1', '2', '3',
    '4', '5', '6',
    '7', '8', '9',
    '*', '0', '#'
  ];

  return (
    <div className="card max-w-sm mx-2">
      <h2 className="text-xl font-semibold text-center mb-4 text-gray-700">Dial Pad</h2>
      
      {/* Display area showing the typed number */}
      <div className="flex mb-4 gap-1">
        <input
          type="text"
          value={formatPhoneNumber(phoneNumber)}
          onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
          placeholder="Enter phone number"
          className="input-field flex-1 text-center text-lg"
        />
        <button 
          onClick={handleDelete} 
          className="px-4 py-3 text-xl bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors duration-200"
        >
          ⌫
        </button>
      </div>

      {/* Number pad with all the buttons */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {buttons.map((btn) => (
          <button
            key={btn}
            onClick={() => handleNumberClick(btn)}
            disabled={isCalling}
            className="p-4 text-xl bg-white border-2 border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {btn}
          </button>
        ))}
      </div>

      {/* Call/Hang up button */}
      <div className="flex justify-center">
        {!isCalling ? (
          <button 
            onClick={handleCall} 
            disabled={phoneNumber.length === 0}
            className="btn-primary w-full text-lg py-4 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            📞 Call
          </button>
        ) : (
          <button 
            onClick={handleHangUp}
            className="btn-danger w-full text-lg py-4"
          >
            📵 Hang Up
          </button>
        )}
      </div>

      {/* Status indicator */}
      {isCalling && (
        <div className="text-center mt-3 text-red-500 font-bold">
          🔴 Call in progress...
        </div>
      )}
    </div>
  );
};

// All styles now converted to Tailwind CSS classes!

export default DialPad;