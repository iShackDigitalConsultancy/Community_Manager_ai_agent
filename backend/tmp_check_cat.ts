import { apiHubService } from './src/modules/api-hub/api-hub.service';

async function test() {
    try {
        const id = '79e01197-6b20-46fc-b02f-630f00571234'; 
        const typesRes = await apiHubService.getReportTypesProxy(id, 156);
        console.log("Categories for comID 156:", JSON.stringify(typesRes, null, 2));
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
test();
