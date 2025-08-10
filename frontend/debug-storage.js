console.log('=== DEBUG localStorage DATA ===');
const storage = JSON.parse(localStorage.getItem('userRecordings') || '[]');
console.log('Total recordings:', storage.length);
console.log('Recordings:', storage);
console.log('==========================');
