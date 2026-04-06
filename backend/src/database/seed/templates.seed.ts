import { pool } from '../../config/database';
import { logger } from '../../shared/logger';

const template = {
    name: "Sectional Title — Full Setup",
    scheme_type: "sectional_title",
    description: "Complete knowledge base for a body corporate under STSMA.",
    template_documents: [
        {
            document_type: "conduct_rules",
            title: "Conduct Rules",
            is_required: true,
            description: "The registered conduct rules including any amendments.",
            tips: [
                "Upload the most recent version with all amendments incorporated",
                "If amended at the last AGM, upload the updated version",
                "Best format: PDF of the official registered rules"
            ],
            sample_questions: ["Are pets allowed?", "What are the noise restrictions?", "Can I Airbnb my unit?", "What are the parking rules?"]
        },
        {
            document_type: "faq",
            title: "Frequently Asked Questions",
            is_required: false,
            description: "Common Q&A specific to this scheme.",
            tips: [
                "Format: Q: [question] A: [answer]"
            ],
            sample_questions: ["How do I get a gate remote?"]
        }
    ],
    checklist: {}
};

async function seedTemplates() {
    const client = await pool.connect();
    try {
        const res = await client.query('SELECT id FROM knowledge_templates WHERE name = $1', [template.name]);
        if (res.rows.length === 0) {
            await client.query(`
                INSERT INTO knowledge_templates (name, scheme_type, description, template_documents, checklist)
                VALUES ($1, $2, $3, $4, $5)
            `, [template.name, template.scheme_type, template.description, JSON.stringify(template.template_documents), JSON.stringify(template.checklist)]);
            logger.info('Templates seeded successfully.');
        } else {
            logger.info('Templates already seeded.');
        }
    } catch (e) {
        logger.error('Error seeding templates:', e);
    } finally {
        client.release();
    }
}

seedTemplates().then(() => process.exit(0));
