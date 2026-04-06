export class SyncService {
    async triggerSmartBuildingSync(schemeId: string, propertyId: string) {
        // Stubbed logic for pulling units from SmartBuilding API
        return { message: `Queued SmartBuilding sync for property ${propertyId} (Scheme ${schemeId})` };
    }

    async triggerMdaSync(schemeId: string, mdaSchemeId: string) {
        // Stubbed logic for pulling units from MDA API
        return { message: `Queued MDA sync for MDA scheme ${mdaSchemeId} (Scheme ${schemeId})` };
    }
}

export const syncService = new SyncService();
