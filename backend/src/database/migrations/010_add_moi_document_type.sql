-- Add 'moi' to document_type ENUM/CHECK constraints
ALTER TABLE knowledge_documents DROP CONSTRAINT IF EXISTS knowledge_documents_document_type_check;

ALTER TABLE knowledge_documents ADD CONSTRAINT knowledge_documents_document_type_check 
CHECK (document_type IN (
    'conduct_rules', 'management_rules', 'minutes', 'financials',
    'insurance', 'maintenance_plan', 'trustee_info', 'levy_schedule',
    'faq', 'architectural_guidelines', 'general', 'moi'
));
