import { companiesService } from './src/modules/companies/companies.service';
import { apiHubService } from './src/modules/api-hub/api-hub.service';

async function testScenario() {
    console.log("Simulating Frontend Scenario...");
    try {
        const id = '9eb9331f-3ed9-4416-8151-10c184dd350d'; // Palladium
        
        console.log("1. Update Company via PUT /api/v1/admin/companies/:id");
        const companyRes = await companiesService.update(id, {
            name: "Palladium",
            status: "active",
            address: "",
            email: "",
            contact_number: "",
            main_contact_person: ""
        });
        console.log("Company Updated:", companyRes.id);

        console.log("2. Update Integration via PATCH /api/v1/admin/api-hub/:id");
        const intReq = await apiHubService.updateIntegration('2d99bc08-639b-47c7-a843-053b2a346be9', {
            companyId: id,
            brandId: 'sm',
            clientId: 'palladium_community_ai',
            communityId: 156,
            dbIdentifier: 'GUID',
            isActive: true,
            clientSecret: undefined // if empty from form
        });
        
        console.log("Integration Updated successfully:", intReq.id);

    } catch (e: any) {
        console.error("FAIL:", e.message);
    }
}

testScenario();
