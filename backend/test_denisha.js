const axios = require('axios');

async function test() {
  try {
    const res = await axios.get('http://localhost:5001/auth/getAllUser');
    const users = res.data.user;
    const denisha = users.find(u => u.email && u.email.toLowerCase().includes('denisha'));
    console.log(denisha ? {
      name: denisha.name,
      email: denisha.email,
      isAdminApproved: denisha.isAdminApproved,
      isPartial: denisha.isPartial,
      rejectedStep: denisha.rejectedStep,
      rejectedStepReason: denisha.rejectedStepReason
    } : 'Denisha not found');
  } catch (err) {
    console.error('Error:', err.message);
  }
}
test();
