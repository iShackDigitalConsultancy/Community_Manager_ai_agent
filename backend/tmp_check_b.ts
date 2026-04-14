import { apiHubService } from './src/modules/api-hub/api-hub.service';

async function test() {
    try {
        const id = '79e01197-6b20-46fc-b02f-630f00571234'; 
         const buildingsRes: any = await apiHubService.getBuildings(id);
         const buildingsArray = Array.isArray(buildingsRes) ? buildingsRes : 
                              (Array.isArray(buildingsRes.data) ? buildingsRes.data : []);
         
         for (const b of buildingsArray) {
             console.log(`ID: ${b.building_id}, Name: ${b.building_name}`);
         }
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
test();
