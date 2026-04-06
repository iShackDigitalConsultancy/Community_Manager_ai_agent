import { parse } from 'csv-parse';
import { unitsService } from './units.service';
import fs from 'fs';

export class CsvService {
    async processUnitImport(schemeId: string, filePath: string) {
        const results: any[] = [];
        const parser = fs.createReadStream(filePath).pipe(parse({
            columns: true,
            skip_empty_lines: true,
            trim: true
        }));

        let successCount = 0;
        let errorCount = 0;

        for await (const row of parser) {
            try {
                // Map generic CSV headers to our DB fields
                await unitsService.create(schemeId, {
                    unit_number: row['Unit Number'] || row['unit_number'],
                    unit_type: row['Type']?.toLowerCase() || 'residential',
                    owner_name: row['Owner Name'] || row['owner_name'],
                    owner_email: row['Owner Email'] || row['owner_email'],
                    tenant_name: row['Tenant Name'] || row['tenant_name'],
                    tenant_email: row['Tenant Email'] || row['tenant_email'],
                    tenant_phone: row['Contact Number'] || row['tenant_phone']
                });
                successCount++;
            } catch (e) {
                errorCount++;
            }
        }
        
        fs.unlinkSync(filePath); // Cleanup
        
        return { successCount, errorCount };
    }
}

export const csvService = new CsvService();
