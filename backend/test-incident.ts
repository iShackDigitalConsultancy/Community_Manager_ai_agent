require('dotenv').config();
import { apiHubService } from './src/modules/api-hub/api-hub.service';

async function test() {
  try {
    const integrationId = '79e01197-6b20-46fc-b02f-630f00571234'; // Palladium
    console.log('Sending proxy request...');
    const result = await apiHubService.reportIncidentProxy(integrationId, {
      category: 1,
      message: '[TEST] Leaking tap in Unit 123'
    });
    console.log('Success:', result);
  } catch (error: any) {
    console.error('Failed:', error.message);
  }
}
test();
