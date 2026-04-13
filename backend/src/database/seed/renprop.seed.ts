import { pool } from '../../config/database';
import { logger } from '../../shared/logger';

const SEED_DATA = `110 Conrad	32 Peter Place, Bryanston	Johannesburg, Gauteng	Jacques Verster	Jacques@renprop.co.za	9 units	Active
456 Cypress	Cnr Cypress & Vlade RD, Ferndale	Johannesburg, Gauteng	Jan Lourens	jan@renprop.co.za	120 units	Active
51 Wessel Road	51 Wessel Road, Edenburg, Sandton	Johannesburg, Gauteng	Philile Ntombela	philile@renprop.co.za	4 units	Active
65 Capital Hill	Capital Hill Business Park, Le Roux Avenue, Midrand	Johannesburg, Gauteng	Claudio Fernandes	claudio@renprop.co.za	00 units	Active
73 Capital Hill	Halfway House, Midrand	Johannesburg, Gauteng	Claudio Fernandes	claudio@renprop.co.za	-	Active
Amber Elite	29 De La Rey Rd, Edenburg	Johannesburg, Gauteng	Claudio Fernandes	claudio@renprop.co.za	156 units	Active
Amberley BC	Amberley, 14 Carnation St, Wendywood, Sandton, 2148	Johannesburg, Gauteng	Francois Meintjies	francois@renprop.co.za	73 units	Active
Antigo Falls	Lingerette Ave, Sunninghill Gardens	Johannesburg, Gauteng	Francois Meintjies	francois@renprop.co.za	88 units	Active
Asaja Complex	201 Oak Ave, Ferndale, Randburg, 2194	Johannesburg, Gauteng	Francois Meintjies	francois@renprop.co.za	22 units	Active
Bantry Close	Bantry Road, Bryanston ext 7	Johannesburg, Gauteng	Claudio Fernandes	claudio@renprop.co.za	56 units	Active
Bauhaus Bryanston	1 Ballyclare Dr, Bryanston, Sandton, 2191	Johannesburg, Gauteng	Philile Ntombela	philile@renprop.co.za	-	Active
Broadlands	Rosewood Rd, Broadacres	Johannesburg, Gauteng	Claudio Fernandes	claudio@renprop.co.za	78 units	Active
Broadwoods	Cnr Cedar & Rosewood Road, Broadacres	Johannesburg, Gauteng	Claudio Fernandes	claudio@renprop.co.za	80 units	Active
Brooke Manor	43 De La Rey Rd, Edenburg, 2191	Johannesburg, Gauteng	Philile Ntombela	philile@renprop.co.za	-	Active
Capital Hill H.O.A	CapitalHill C/P, Le Roux Dr, Midrand	Johannesburg, Gauteng	Claudio Fernandes	claudio@renprop.co.za	24 units	Active
Castello	Pampoenspruit Street, Sonneglans ext 21	Johannesburg, Gauteng	Philile Ntombela	philile@renprop.co.za	60 units	Active
Cedar Office Park	Cnr Cedar Road and Stinkwood cres, Broadacres	Johannesburg, Gauteng	Jan Louis	Jan@renprop.co.za	13 units	Active
Cottonwoods	Homestead Road, Rivonia	Johannesburg, Gauteng	Jan Lourens	jan@renprop.co.za	78 units	Active
Douglasgate	70 Niven Avenue, Douglasdale	Johannesburg, Gauteng	Jan Louis	Jan@renprop.co.za	187 units	Active
Ellingham Estate	8 Naivasha Rd, Sunninghill, Sandton, 2157	Johannesburg, Gauteng	Francois Meintjies	francois@renprop.co.za	-	Active
Elton Hill Manor	99 Atholl Oaklands Road, Elton Hill Ext.3	Johannesburg, Gauteng	Philile Ntombela	philile@renprop.co.za	18 units	Active
Elton Hill Mews	99 Atholl Oaklands Road, Elton Hill Ext.3	Johannesburg, Gauteng	Philile Ntombela	philile@renprop.co.za	12 units	Active
Falcon Crest	CapitalHill C/P, Le Roux Dr, Midrand	Johannesburg, Gauteng	Claudio Fernandes	claudio@renprop.co.za	6 units	Active
Fern Valley	Fern Valley Body Corporate, Main Avenue, Ferndale	Johannesburg, Gauteng	Philile Ntombela	philile@renprop.co.za	66 units	Active
First Avenue	Cnr 1st & 7th Avenue, Parktown North	Johannesburg, Gauteng	Francois Meintjies	francois@renprop.co.za	72 units	Active
Fourways View	Cnr Sunset Boulevard & Rockery Lane, Lonehill	Johannesburg, Gauteng	Francois Meintjies	francois@renprop.co.za	6 units	Active
Gauteng Industrial Park	Oliffantfontein Road, Clayville	Johannesburg, Gauteng	Claudio Fernandes	claudio@renprop.co.za	27 units	Active
Georgian Terrace	3rd Avenue, Rivonia	Johannesburg, Gauteng	Jan Louis	Jan@renprop.co.za	70 units	Active
Grace Park	Corner Tudor Avenue and Spitfire Street, Sunninghill	Johannesburg, Gauteng	Claudio Fernandes	claudio@renprop.co.za	56 units	Active
Greenwich	73 Holkam Road, Paulshoff ext 83	Johannesburg, Gauteng	Claudio Fernandes	claudio@renprop.co.za	239 units	Active
Habitat on Cowley	71 Cowley Rd, Petervale, Sandton, 2191	Johannesburg, Gauteng	Francois Meintjies	francois@renprop.co.za	54 units	Active
Homestead	37-41 Homestead Rd, Edenburg Sandton 2128	Johannesburg, Gauteng	Jan Lourens	jan@renprop.co.za	32 units	Active
Jade	10 Lower Rd, Morningside, Sandton, 2057	Johannesburg, Gauteng	Jan Louis	Jan@renprop.co.za	-	Active
Katherine & West	114 West St, Sandown, Sandton, 2031	Johannesburg, Gauteng	Shannon Van Goethem	shannon@renprop.co.za	1 units	Active
La Rocca	Cnr main & Petunia Road, Bryanston	Johannesburg, Gauteng	Francois Meintjes	francois@renprop.co.za	11 units	Active
Madison Body Corporate	45 Hamilton Avenue, Hurlingham	Johannesburg, Gauteng	Philile Ntombela	philile@renprop.co.za	29 units	Active
Madison Square	313 Rivonia Road	Johannesburg, Gauteng	Jan Louis	Jan@renprop.co.za	144 units	Active
Manhattan	2b Kikuyu Road Sunninghill	Johannesburg, Gauteng	Philile Ntombela	philile@renprop.co.za	180 units	Active
Metropolis on Park	118-120 Pretoria Ave, Sandown, Sandton, 2031	Johannesburg, Gauteng	Shannon Van Goethem	shannon@renprop.co.za	-	Active
Monte Falco	Sunset Ave, Pine Slopes AH, Sandton, 2194	Johannesburg, Gauteng	Francois Meintjies	francois@renprop.co.za	95 units	Active
Morningside Close	222 Rivonia Road. cnr Michelle, Morningside	Johannesburg, Gauteng	Francois Meintjies	francois@renprop.co.za	10 units	Active
Oasis Palms	Cnr Sandstone & Green street, Randfontein	Johannesburg, Gauteng	Philile Ntombela	philile@renprop.co.za	164 units	Active
Oxford & Glenhove	114 Oxford Rd, Melrose Estate, Johannesburg, 2196	Johannesburg, Gauteng	Shannon Van Goethem	shannon@renprop.co.za	1 units	Active
Pavilion Office Park	12 Wessel Road, Rivonia	Johannesburg, Gauteng	Claudio Fernandes	claudio@renprop.co.za	-	Active
Pinewood OA	33 Riley St, Woodmead, Sandton, 2191	, Gauteng	Jan	Jan@renprop.co.za	-	Active
RENPROP DEMO BUILDING	152 Capricorn Rd, Lone Hill, Sandton, 2062	Johannesburg, Gauteng	Carmen Scheepers	carmen@renprop.co.za	160 units	Active
Savuti Sands	51 Naivasha Rd, Sunninghill, Sandton, 2157	Sandton, Gauteng	Philile Ntombela	philile@renprop.co.za	-	Active
Shimbali Sands	88 Naivasha Road, Sunninghill, Sandton	Johannesburg, Gauteng	Claudio Fernandes	claudio@renprop.co.za	126 units	Active
Singati Sands	Singati Sands, 54 Naivasha Rd, Sunninghill, Sandton, 2157	Johannesburg, Gauteng	Philile Ntombela	philile@renprop.co.za	-	Active
St Hilaire	18 Karen Link, Lyme Park, Bryanston, 2060	Johannesburg, Gauteng	Claudio Fernandes	claudio@renprop.co.za	33 units	Active
Stonebrook	13 Achter Road, Paulshof	Johannesburg, Gauteng	Francois Meintjies	francois@renprop.co.za	72 units	Active
Stonefields	141 Cedar Ave West, Maroeladal	Johannesburg, Gauteng	Jan Louis	Jan@renprop.co.za	20 units	Active
The Arches of Rivonia	5th Avenue Rivonia	Johannesburg, Gauteng	Philile Ntombela	philile@renprop.co.za	86 units	Active
The Atrium	9 De La Rey Rd, Edenburg,Sandton	Johannesburg, Gauteng	Francois Meintjies	francois@renprop.co.za	178 units	Active
The Boundary	0D Dennis Road Lonehill 2062	Johannesburg, Gauteng	Philile Ntombela	philile@renprop.co.za	120 units	Active
The Conservatory	13 Baker Street, Rosebank	Johannesburg, Gauteng	Jacques Verster	Jacques@renprop.co.za	10 units	Active
The Country Club	21 Woodlands Drive	Johannesburg, Gauteng	Jan Louis	Jan@renprop.co.za	8 units	Active
The Courtyards	32 Peter place, Bryanston	Johannesburg, Gauteng	Philile Ntombela	philile@renprop.co.za	6 units	Active
The Cube	9th Ave & De La Rey Road, Rivonia, Sandton 2191	Johannesburg, Gauteng	Francois Meintjies	francois@renprop.co.za	100 units	Active
The Hub	3 Muswell Road, Bryanston	Johannesburg, Gauteng	Francois Meintjies	francois@renprop.co.za	44 units	Active
The Link	16 11th Avenue, Edenburg, Sandton 2128	Johannesburg, Gauteng	Philile Ntombela	philile@renprop.co.za	334 units	Active
The Median	23 Cradock Avenue, Rosebank	Johannesburg, Gauteng	Jacques Verster	jacques@renprop.co.za	240 units	Active
The Melrose	36 Kernick Avenue, Melrose North.	Johannesburg, Gauteng	Jan Louis	Jan@renprop.co.za	36 units	Active
The Quails	138 Holkam Road, Paulshof 2191	Johannesburg, Gauteng	Soneni Ncube	estate@renprop.co.za	72 units	Active
The Straight	The Straight/Forest Drive Lonehill Exit 76	Johannesburg, Gauteng	Francois Meintjies	francois@renprop.co.za	86 units	Active
The Tyrwhitt	Cnr Tyrwhitt & Bath Avenue, Rosebank	Johannesburg, Gauteng	Jacques Verster	jacques@renprop.co.za	221 units	Active
The Vantage	54 Bath Avenue	Johannesburg, Gauteng	Jacques Verster	jacques@renprop.co.za	165 units	Active
The View	3 Michelle Road Morningside	Johannesburg, Gauteng	Francois Meintjes	francois@renprop.co.za	134 units	Active
Third Avenue	Third Avenue Rivonia	Johannesburg, Gauteng	Jan Louis	Jan@renprop.co.za	39 units	Active
Thorn Tree HOA	141 Cedar Ave West, Maroeladal	Johannesburg, Gauteng	Jan Louis	Jan@renprop.co.za	97 units	Active
Thorn Tree Place	141 Cedar Ave West, Maroeladal	Johannesburg, Gauteng	Jan Louis	Jan@renprop.co.za	97 units	Active
Tudor Rose	Tana Rd, Sunninghill, Sandton, 2157	Johannesburg, Gauteng	Jan Lourens	jan@renprop.co.za	-	Active
Turley Manor	Cnr Forest Drive & Leslie Road, Lonehill ext 70	Johannesburg, Gauteng	Claudio Fernandes	claudio@renprop.co.za	77 units	Active
WaterBerry	141 Cedar Ave West, Maroeladal	Johannesburg, Gauteng	Jan Louis	Jan@renprop.co.za	90 units	Active
Westwood Way	Corner of Witkoppen and Esttele Road.	Johannesburg, Gauteng	Claudio Fernandes	claudio@renprop.co.za	165 units	Active
Zaleni Estate	17 The Straight Ave, Pine Slopes AH, Sandton,	Johannesburg, Gauteng	Claudio Fernandes	claudio@renprop.co.za	76 Units	Active`;

async function runSeed() {
    try {
        const lines = SEED_DATA.split('\n').filter(l => l.trim().length > 0);
        
        // 1. Ensure Renprop exists
        let companyId = null;
        let companyRes = await pool.query("SELECT id FROM companies WHERE name ILIKE '%Renprop%' LIMIT 1");
        if (companyRes.rows.length === 0) {
            companyRes = await pool.query(
                "INSERT INTO companies (name) VALUES ($1) RETURNING id",
                ['Renprop']
            );
            companyId = companyRes.rows[0].id;
        } else {
            companyId = companyRes.rows[0].id;
        }

        let inserted = 0;

        for (const line of lines) {
            const parts = line.split('\t').map(p => p.trim());
            if (parts.length >= 7) {
                const [buildingName, address1, address2, manager, email, unitsStr, status] = parts;
                
                const fullAddress = `${address1}${address2 ? ', ' + address2 : ''}`.trim();
                
                const unitMatch = unitsStr.match(/(\d+)/);
                const mappedUnits = unitMatch ? parseInt(unitMatch[1], 10) : null;
                
                let codeSafe = buildingName.replace(/[^A-Za-z0-9]/g, '').substring(0, 7).toUpperCase();
                codeSafe += Math.floor(100 + Math.random() * 900);
                
                const existing = await pool.query("SELECT id FROM schemes WHERE scheme_name = $1 AND company_id = $2", [buildingName, companyId]);
                
                if (existing.rows.length === 0) {
                    await pool.query(
                        `INSERT INTO schemes (
                            scheme_name, scheme_code, scheme_type, company_id, status,
                            address, facilities_manager, manager_email, mapped_units_count, is_active
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)`,
                        [buildingName, codeSafe, 'sectional_title', companyId, status.toLowerCase() === 'active' ? 'live' : 'setup', fullAddress, manager, email, mappedUnits]
                    );
                    inserted++;
                } else {
                    await pool.query(
                        `UPDATE schemes SET 
                            address = $1, facilities_manager = $2, manager_email = $3, mapped_units_count = $4, status = $5
                        WHERE id = $6`,
                        [fullAddress, manager, email, mappedUnits, status.toLowerCase() === 'active' ? 'live' : 'setup', existing.rows[0].id]
                    );
                }
            }
        }
        
        logger.info(`Successfully seeded/updated ${inserted} Renprop communities.`);
        console.log(`Successfully seeded/updated ${inserted} Renprop communities.`);
    } catch (err) {
        console.error('Error seeding Renprop data:', err);
    } finally {
        process.exit(0);
    }
}

runSeed();
