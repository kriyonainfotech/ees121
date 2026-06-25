const axios = require('axios');
const mongoose = require('mongoose');

async function test() {
  try {
    const res = await axios.get('http://localhost:5001/auth/getAllUser');
    const users = res.data.user;
    const pending = users.find(u => u.isAdminApproved === false);
    if (!pending) {
      console.log('No pending users found');
      return;
    }
    console.log('Found pending user:', pending._id);
    const rejectRes = await axios.put('http://localhost:5001/auth/rejectUserStep', {
      userId: pending._id,
      stepNumber: 3,
      reason: 'test reason'
    });
    console.log('Reject Response:', rejectRes.data);
  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
}
test();
