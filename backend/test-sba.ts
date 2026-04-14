require('dotenv').config();
import { getToken, getMe } from './src/modules/api-hub/smartbuilding.client';

async function test() {
  try {
    const creds = {
      brandId: 'sm',
      clientId: 'ai_community',
      clientSecret: 't07LDDIc9Bzj2ZrVuiMO8LhZaaLfVOgmtSqM2IVRj-g',
    };
    console.log('Testing GET TOKEN...');
    const tokenResult = await getToken(creds);
    console.log('Token fetched successfully!');
    
    console.log('Testing GET ME...');
    const me = await getMe(creds);
    console.log('GET ME SUCCESS:', me.data.name);
  } catch(e) {
    console.error('FAILED:', e);
  }
}
test();
