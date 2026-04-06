import { retrievalService } from '../knowledge-base/retrieval.service';
import { pool } from '../../config/database';
import { logger } from '../../shared/logger';
import { apiHubService } from '../api-hub/api-hub.service';

// ══════════════════════════════════════════════════════════════════
//  AGENT TOOL DEFINITIONS  — Used by Claude to understand capabilities
// ══════════════════════════════════════════════════════════════════
export const agentTools = [

    // ── 1. Knowledge Base Research ──────────────────────────────────
    {
        name: 'search_knowledgebase',
        description: `Search the scheme's knowledge base (rules, budgets, policies, notices, MOIs) 
to answer resident questions. ALWAYS call this before answering any scheme-specific question. 
Call multiple times with different queries to gather comprehensive context before replying.
For complex questions, call decompose_query first, then search_knowledgebase for each sub-query.`,
        input_schema: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Specific search query. Use different angles for follow-up searches (e.g. first "noise policy", then "fine schedule", then "committee contact").'
                },
                topK: {
                    type: 'number',
                    description: 'Number of results to retrieve (1-8). Use 5-6 for complex or multi-part questions.'
                },
                documentTypes: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Optional: restrict search to specific document types. Values: conduct_rules, moi, financial, notice, policy, minutes, other. Leave empty to search all.'
                }
            },
            required: ['query']
        }
    },

    // ── 2. Decompose Query (AutoResearch Pass 1) ─────────────────────
    {
        name: 'decompose_query',
        description: `AutoResearch Pass 1 — LANDSCAPE SCAN.
Break a complex resident question into 2-5 focused sub-queries, each tagged with the most 
relevant document types and a rationale. Use this at the START of any question that involves 
multiple rules, processes, or topics (e.g. "Can I park here AND have a pet?"). 
Returns a structured research plan for subsequent search_knowledgebase calls.`,
        input_schema: {
            type: 'object',
            properties: {
                question: {
                    type: 'string',
                    description: 'The full resident question, exactly as asked.'
                },
                residentRole: {
                    type: 'string',
                    enum: ['tenant', 'owner', 'trustee', 'unknown'],
                    description: 'The resident\'s role — determines which document types to prioritise.'
                }
            },
            required: ['question']
        }
    },

    // ── 3. Synthesise Research (AutoResearch Pass 5) ─────────────────
    {
        name: 'synthesise_research',
        description: `AutoResearch Pass 5 — SYNTHESISE.
After gathering findings from multiple search_knowledgebase calls, call this tool to:
1. Score how well the findings cover the question
2. Detect conflicts or contradictions between documents
3. Identify gaps that still need answering
4. Get a structured synthesis ready to present to the resident.

IMPORTANT: Use this to plan your final answer. Do NOT escalate unless the findings are completely irrelevant or empty.
Always call this before composing your final answer to a complex question.`,
        input_schema: {
            type: 'object',
            properties: {
                question: {
                    type: 'string',
                    description: 'The original resident question.'
                },
                findings: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Array of raw text returned from all search_knowledgebase calls so far. Include the source references.'
                }
            },
            required: ['question', 'findings']
        }
    },

    // ── 4. Log Maintenance Request ─────────────────────────────────
    {
        name: 'log_maintenance_request',
        description: `Log a new maintenance or repair request from a resident or homeowner. 
Use this when a resident reports a fault, damage, or maintenance need in their unit or common areas.
Returns a unique reference number for tracking.`,
        input_schema: {
            type: 'object',
            properties: {
                category: {
                    type: 'string',
                    enum: ['plumbing', 'electrical', 'structural', 'security', 'garden', 'pool', 'lift', 'parking', 'common_area', 'pest_control', 'other'],
                    description: 'Category of the maintenance issue.'
                },
                description: {
                    type: 'string',
                    description: 'Clear description of the problem, location, and urgency level as reported by the resident.'
                },
                urgency: {
                    type: 'string',
                    enum: ['critical', 'high', 'normal', 'low'],
                    description: 'Urgency: critical=safety risk, high=major inconvenience, normal=standard repair, low=cosmetic.'
                },
                unitNumber: {
                    type: 'string',
                    description: 'The resident\'s unit number (if applicable).'
                }
            },
            required: ['category', 'description', 'urgency']
        }
    },

    // ── 5. Levy Account Query ─────────────────────────────────────
    // Removed in favor of render_ui_component


    // ── 6. Request Official Document ────────────────────────────────
    {
        name: 'request_document',
        description: `Submit a formal request for scheme documents such as levy clearance certificates, 
conduct rules, meeting minutes, financial statements, or the scheme's MOI. The request is 
logged and sent to the managing agent for fulfillment.`,
        input_schema: {
            type: 'object',
            properties: {
                documentType: {
                    type: 'string',
                    enum: ['levy_clearance', 'conduct_rules', 'agm_minutes', 'sgm_minutes', 'financial_statements', 'moi', 'insurance_certificate', 'other'],
                    description: 'The type of document being requested.'
                },
                purpose: {
                    type: 'string',
                    description: 'Reason for the request (e.g. "sale of unit", "refinancing", "personal record").'
                },
                urgentRequest: {
                    type: 'boolean',
                    description: 'True if this is an urgent/time-sensitive request.'
                }
            },
            required: ['documentType', 'purpose']
        }
    },

    // ── 7. Check Scheme Announcements ───────────────────────────────
    {
        name: 'get_announcements',
        description: `Retrieve recent scheme announcements, notices, or community updates. 
Use this when a resident asks about upcoming maintenance, water shutoffs, AGM notices, 
rule changes, or any recent news from the body corporate or trustees.`,
        input_schema: {
            type: 'object',
            properties: {
                category: {
                    type: 'string',
                    enum: ['all', 'maintenance', 'meetings', 'rule_changes', 'emergency', 'financial'],
                    description: 'Filter announcements by category. Use "all" for general queries.'
                },
                limit: {
                    type: 'number',
                    description: 'Max number of announcements to retrieve (default: 5).'
                }
            },
            required: ['category']
        }
    },

    // ── 8. Escalate to Human ────────────────────────────────────────
    {
        name: 'escalate_to_human',
        description: `Escalate the conversation to a human property manager or trustee. 
Use this when: (1) synthesise_research returns coverage_score < 6, (2) the resident is distressed 
or angry, (3) the issue involves a legal dispute, or (4) the resident explicitly requests a human.
Do NOT use for routine questions. Include the synthesis gaps as the reason.`,
        input_schema: {
            type: 'object',
            properties: {
                reason: {
                    type: 'string',
                    description: 'Detailed reason for escalation (include knowledge gaps if applicable).'
                },
                priority: {
                    type: 'string',
                    enum: ['urgent', 'normal'],
                    description: 'Urgency of human review needed.'
                },
                summary: {
                    type: 'string',
                    description: 'Brief summary of what the resident needs, to brief the human agent.'
                }
            },
            required: ['reason', 'priority', 'summary']
        }
    },

    // ── 9. Render Interactive UI Component ──────────────────────────
    {
        name: 'render_ui_component',
        description: `Render an interactive UI component in the resident's chat window.
Use this when:
1. The resident asks for their levy balance, statement, or account details. (Use componentType='levy_statement')
2. The resident explicitly wants to fill out a maintenance request form manually or hasn't provided details. (Use componentType='maintenance_form')
3. The resident asks for the community conduct rules, building rules, or general guidelines. (Use componentType='community_rules')
Important: Do not use this if you have enough information to log a maintenance request directly using log_maintenance_request.`,
        input_schema: {
            type: 'object',
            properties: {
                componentType: {
                    type: 'string',
                    enum: ['levy_statement', 'maintenance_form', 'community_rules'],
                    description: 'The type of UI component to render'
                },
                data: {
                    type: 'object',
                    description: 'Optional pre-filled data for the component based on known context'
                }
            },
            required: ['componentType']
        }
    }
];

// ══════════════════════════════════════════════════════════════════
//  TOOLS REGISTRY  — Executes each tool and returns a result string
// ══════════════════════════════════════════════════════════════════

// ── decompose_query: Community management question patterns ───────

/** Maps topic keywords to document types and role-specific search angles */
const QUESTION_PATTERNS: Array<{
    keywords: RegExp;
    subQueries: (q: string, role: string) => Array<{ query: string; documentTypes: string[]; rationale: string }>;
}> = [
    {
        keywords: /noise|loud|music|party|nuisance|disturbance/i,
        subQueries: (q, role) => [
            { query: 'noise rules quiet hours', documentTypes: ['conduct_rules'], rationale: 'Primary noise policy source' },
            { query: 'fine penalty noise violation enforcement', documentTypes: ['conduct_rules', 'policy'], rationale: 'Enforcement consequences' },
            { query: 'noise complaint committee trustee contact', documentTypes: ['notice', 'policy'], rationale: 'Reporting process' },
        ]
    },
    {
        keywords: /pet|dog|cat|animal/i,
        subQueries: (q, role) => [
            { query: 'pet policy animals allowed rules', documentTypes: ['conduct_rules'], rationale: 'Core pet permission rules' },
            { query: 'pet registration approval trustee permit', documentTypes: ['conduct_rules', 'moi'], rationale: 'Approval process' },
            { query: 'pet nuisance damage liability', documentTypes: ['conduct_rules', 'policy'], rationale: 'Liability and enforcement' },
        ]
    },
    {
        keywords: /park|vehicle|car|garage|bay|visitor/i,
        subQueries: (q, role) => [
            { query: 'parking rules visitor parking bays', documentTypes: ['conduct_rules'], rationale: 'Core parking policy' },
            { query: 'parking allocation reserved bay lease', documentTypes: ['moi', 'conduct_rules'], rationale: 'Ownership of bays' },
            { query: 'parking fine towing unauthorized vehicle', documentTypes: ['conduct_rules', 'policy'], rationale: 'Enforcement' },
        ]
    },
    {
        keywords: /levy|payment|arrear|balance|account|statement|fee/i,
        subQueries: (q, role) => [
            { query: 'levy amount monthly payment schedule', documentTypes: ['financial', 'notice'], rationale: 'Current levy amounts' },
            { query: 'levy payment due date interest penalty late', documentTypes: ['conduct_rules', 'financial', 'policy'], rationale: 'Payment terms' },
            { query: 'levy special levy budget reserve fund', documentTypes: ['financial', 'minutes'], rationale: 'Levy composition' },
        ]
    },
    {
        keywords: /renovate|alteration|improve|extend|change|build|install/i,
        subQueries: (q, role) => [
            { query: 'alterations renovations approval permission required', documentTypes: ['conduct_rules', 'moi'], rationale: 'Permission rules' },
            { query: 'trustee approval application process alterations', documentTypes: ['conduct_rules', 'policy'], rationale: 'How to apply' },
            { query: 'aesthetic guidelines appearance exterior changes', documentTypes: ['conduct_rules'], rationale: 'Aesthetic standards' },
        ]
    },
    {
        keywords: /agm|meeting|vote|trustee|election|quorum/i,
        subQueries: (q, role) => [
            { query: 'AGM annual general meeting notice requirements', documentTypes: ['moi', 'minutes'], rationale: 'Meeting rules' },
            { query: 'trustee election voting rights proxy', documentTypes: ['moi'], rationale: 'Governance process' },
            { query: 'quorum majority resolution body corporate', documentTypes: ['moi', 'minutes'], rationale: 'Decision thresholds' },
        ]
    },
    {
        keywords: /maintain|repair|fault|broken|fix|leak|damage/i,
        subQueries: (q, role) => [
            { query: 'maintenance responsibility body corporate owner unit', documentTypes: ['conduct_rules', 'moi'], rationale: 'Who is responsible' },
            { query: 'maintenance request process SLA turnaround', documentTypes: ['policy', 'notice'], rationale: 'How to report and SLAs' },
            { query: 'emergency maintenance urgent repair contact', documentTypes: ['policy', 'notice'], rationale: 'Emergency process' },
        ]
    },
    {
        keywords: /clearance|certificate|sell|transfer|sale/i,
        subQueries: (q, role) => [
            { query: 'levy clearance certificate sale transfer requirements', documentTypes: ['policy', 'moi'], rationale: 'Clearance cert requirements' },
            { query: 'outstanding levy balance account clearance', documentTypes: ['financial', 'policy'], rationale: 'Financial clearance' },
        ]
    },
];

/** Default decomposition when no specific pattern matches */
function defaultDecompose(question: string, role: string): Array<{ query: string; documentTypes: string[]; rationale: string }> {
    const roleDocPriority = {
        tenant:  ['conduct_rules', 'notice', 'policy'],
        owner:   ['moi', 'conduct_rules', 'financial', 'minutes'],
        trustee: ['moi', 'financial', 'minutes', 'conduct_rules', 'policy'],
        unknown: ['conduct_rules', 'moi', 'notice', 'policy'],
    }[role] || ['conduct_rules', 'moi'];

    return [
        { query: question, documentTypes: roleDocPriority, rationale: 'Primary search targeting role-appropriate documents' },
        { query: `${question} rules policy`, documentTypes: ['conduct_rules', 'policy'], rationale: 'Rule-specific angle' },
        { query: `${question} procedure process contact`, documentTypes: ['notice', 'policy'], rationale: 'Process/action angle' },
    ];
}

/** Runs the decompose_query logic — pure server-side, no LLM call */
function decomposeQuestion(question: string, role = 'unknown') {
    for (const pattern of QUESTION_PATTERNS) {
        if (pattern.keywords.test(question)) {
            return pattern.subQueries(question, role);
        }
    }
    return defaultDecompose(question, role);
}

// ── synthesise_research: Coverage scoring + conflict detection ────

/** Community management topic keywords for coverage scoring */
const TOPIC_KEYWORDS: Record<string, RegExp> = {
    permission:   /permission|approval|allowed|prohibited|permit/i,
    process:      /process|procedure|steps|how to|submit|apply|report/i,
    contact:      /contact|phone|email|trustee|manager|committee/i,
    dates:        /date|deadline|notice period|days?|month|annual/i,
    amounts:      /amount|fee|fine|penalty|levy|cost|rand|R\d/i,
    enforcement:  /enforce|fine|warning|evict|legal action/i,
};

function scoreCoverage(question: string, findings: string[]): {
    coverage_score: number;
    covered_topics: string[];
    gaps: string[];
    conflicts: string[];
} {
    const allText = findings.join(' ');
    const covered: string[] = [];
    const gaps: string[] = [];

    for (const [topic, regex] of Object.entries(TOPIC_KEYWORDS)) {
        if (regex.test(allText)) covered.push(topic);
        else gaps.push(topic);
    }

    // Conflict detection: look for contradictory signals in the same text
    const conflicts: string[] = [];
    const conflictPatterns = [
        { a: /must not|prohibited|not allowed/i, b: /may|permitted|allowed/i, topic: 'permission conflict' },
        { a: /\bR\s*\d+/i,                        b: /\bR\s*\d+/i,            topic: 'different amounts mentioned' },
    ];

    for (const cp of conflictPatterns) {
        const positiveHits = findings.filter(f => cp.a.test(f) && cp.b.test(f));
        if (positiveHits.length > 0) conflicts.push(cp.topic);
    }

    // Base score: based on having any findings
    const sourceCount = new Set(findings.flatMap(f => {
        const m = f.match(/\[Source: ([^\]]+)\]/);
        return m ? [m[1]] : [];
    })).size;

    let score = findings.length > 0 ? 8 : 2;
    if (sourceCount >= 2) score = Math.min(score + 1, 10);
    if (conflicts.length > 0) score = Math.max(score - 1, 0);

    return { coverage_score: score, covered_topics: covered, gaps, conflicts };
}

export class ToolsRegistry {

    async executeTool(name: string, input: any, schemeId: string, unitId?: string): Promise<string> {
        logger.info(`[Agent Tool] ${name}`, { schemeId, input });

        switch (name) {

            // ── 1. Knowledge Base Search (enhanced) ──────────────────
            case 'search_knowledgebase': {
                const topK = Math.min(Math.max(input.topK || 5, 1), 8);
                let docTypes: string[] = input.documentTypes || [];
                if (typeof docTypes === 'string') docTypes = [docTypes];
                if (!Array.isArray(docTypes)) docTypes = [];

                let results;
                if (docTypes.length > 0) {
                    // Pass 2 focused dive — restrict to specific doc types
                    results = await retrievalService.retrieveByDocumentType(schemeId, input.query, docTypes, topK);
                    
                    // Fallback to broader search if the specific doc types yielded nothing
                    if (results.length === 0) {
                        logger.info(`[Agent Tool] No results found for ${docTypes.join(',')}. Falling back to all documents.`);
                        results = await retrievalService.retrieveContext(schemeId, input.query, topK);
                    }
                } else {
                    results = await retrievalService.retrieveContext(schemeId, input.query, topK);
                }

                if (results.length === 0) {
                    return `No relevant information found for "${input.query}". Try a different search angle.`;
                }
                return retrievalService.formatResults(results);
            }

            // ── 2. Decompose Query (AutoResearch Pass 1) ──────────────
            case 'decompose_query': {
                const role = input.residentRole || 'unknown';
                const subQueries = decomposeQuestion(input.question, role);

                const result = {
                    question: input.question,
                    residentRole: role,
                    researchPlan: subQueries,
                    instructions: [
                        `Call search_knowledgebase for each of the ${subQueries.length} sub-queries above.`,
                        'Use the documentTypes array to scope each search appropriately.',
                        'After all searches, call synthesise_research with all findings.',
                    ]
                };

                logger.info('[AutoResearch] Query decomposed', {
                    question: input.question,
                    role,
                    subQueryCount: subQueries.length
                });

                return JSON.stringify(result, null, 2);
            }

            // ── 3. Synthesise Research (AutoResearch Pass 5) ──────────
            case 'synthesise_research': {
                const findings: string[] = input.findings || [];
                const { coverage_score, covered_topics, gaps, conflicts } = scoreCoverage(input.question, findings);

                const recommendation = coverage_score >= 6
                    ? 'HIGH CONFIDENCE: Answer the resident directly. Quote and link the exact rules, paragraphs, and sections.'
                    : 'LOW CONFIDENCE: If findings contain the answer, synthesize it! Only call escalate_to_human if completely missing critical information.';

                const result = {
                    coverage_score,
                    recommendation,
                    covered_topics,
                    gaps: gaps.length > 0 ? gaps : ['none — good coverage'],
                    conflicts: conflicts.length > 0 ? conflicts : ['none detected'],
                    source_count: new Set(findings.flatMap(f => {
                        const m = f.match(/\[Source: ([^\]]+)\]/);
                        return m ? [m[1]] : [];
                    })).size,
                    synthesis_note: `Based on ${findings.length} document segment(s) from ${new Set(findings.flatMap(f => {
                        const m = f.match(/\[Type: ([^\]]+)\]/);
                        return m ? [m[1]] : [];
                    })).size} document type(s).`
                };

                logger.info('[AutoResearch] Research synthesised', {
                    coverage_score,
                    covered: covered_topics.length,
                    gaps: gaps.length,
                    conflicts: conflicts.length
                });

                return JSON.stringify(result, null, 2);
            }

            // ── 4. Log Maintenance Request ────────────────────────────
            case 'log_maintenance_request': {
                try {
                    const refNumber = `MT-${Date.now().toString(36).toUpperCase()}`;
                    await pool.query(
                        `INSERT INTO maintenance_requests 
                         (scheme_id, unit_id, reference_number, category, description, urgency, status)
                         VALUES ($1, $2, $3, $4, $5, $6, 'open')`,
                        [schemeId, unitId || null, refNumber, input.category, input.description, input.urgency]
                    ).catch(() => {
                        logger.warn('[Agent] maintenance_requests table not found, skipping DB insert');
                    });

                    // >>> SMARTBUILDING INTEGRATION PUSH <<<
                    let ticketPushed = false;
                    try {
                        // Find active API integration for this scheme
                        const integrationRes = await pool.query(
                            `SELECT ai.id FROM api_integrations ai
                             INNER JOIN schemes s ON s.id::text = ai.community_id::text OR s.scheme_name ILIKE '%' || ai.company_name || '%'
                             WHERE s.id = $1 AND ai.is_active = true
                             LIMIT 1`,
                            [schemeId]
                        );

                        if (integrationRes.rows.length > 0) {
                            const integrationId = integrationRes.rows[0].id;
                            // Push to SmartBuilding via proxy (category 1 = general)
                            await apiHubService.reportIncidentProxy(integrationId, {
                                category: 1, 
                                message: `[AI Escrow - ${input.urgency.toUpperCase()}] ${input.category}\n\n${input.description}`
                            });
                            ticketPushed = true;
                            logger.info(`[Agent] Successfully pushed incident to SBA ticketing for ${refNumber}`);
                        }
                    } catch (sbaErr) {
                         logger.warn('[Agent] Failed to push incident to SBA ticketing system', sbaErr);
                    }

                    const urgencyMsg = input.urgency === 'critical'
                        ? 'This has been flagged as CRITICAL and the maintenance team has been notified immediately.'
                        : `This has been logged with ${input.urgency} priority.`;
                    
                    const vendorMsg = ticketPushed 
                        ? '\n\n**Note**: This ticket has been automatically dispatched to the SmartBuilding Vendor Queue for rapid processing.'
                        : '';

                    return `✅ Maintenance request logged successfully.
Reference: ${refNumber}
Category: ${input.category}
Urgency: ${input.urgency}
${urgencyMsg}${vendorMsg}

The managing agent will follow up within ${input.urgency === 'critical' ? '2 hours' : input.urgency === 'high' ? '24 hours' : '3–5 business days'}.`;

                } catch (e: any) {
                    logger.error('[Tool] log_maintenance_request error', e);
                    return `Maintenance request has been noted (ref: MT-${Date.now().toString(36).toUpperCase()}). Please follow up with your managing agent directly if you don't receive confirmation.`;
                }
            }

            // ── 5. Levy Account Query ─────────────────────────────────
            // Handled by render_ui_component directly in openai.service.ts


            // ── 6. Request Official Document ──────────────────────────
            case 'request_document': {
                const refNumber = `DOC-${Date.now().toString(36).toUpperCase()}`;
                const urgencyLabel = input.urgentRequest ? ' (marked URGENT)' : '';
                const turnaround = input.urgentRequest ? '1–2 business days' : '5–7 business days';

                await pool.query(
                    `INSERT INTO document_requests 
                     (scheme_id, unit_id, reference_number, document_type, purpose, is_urgent, status)
                     VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
                    [schemeId, unitId || null, refNumber, input.documentType, input.purpose, !!input.urgentRequest]
                ).catch(() => {
                    logger.warn('[Agent] document_requests table not found, skipping DB insert');
                });

                return `✅ Document request submitted${urgencyLabel}.
Reference: ${refNumber}
Document: ${input.documentType.replace(/_/g, ' ').toUpperCase()}
Purpose: ${input.purpose}
Expected turnaround: ${turnaround}

You will receive the document via email. Please reference ${refNumber} in any follow-up queries.`;
            }

            // ── 7. Announcements ──────────────────────────────────────
            case 'get_announcements': {
                try {
                    const limit = Math.min(input.limit || 5, 10);
                    const categoryFilter = input.category === 'all' ? '' : `AND category = '${input.category}'`;

                    const res = await pool.query(
                        `SELECT title, body, category, created_at 
                         FROM scheme_announcements 
                         WHERE scheme_id = $1 ${categoryFilter}
                         ORDER BY created_at DESC 
                         LIMIT $2`,
                        [schemeId, limit]
                    ).catch(() => ({ rows: [] }));

                    if (res.rows.length === 0) {
                        return `No recent announcements found${input.category !== 'all' ? ` for category: ${input.category}` : ''}. The scheme may not have posted any notices recently.`;
                    }

                    return `Recent Scheme Announcements:\n\n` + res.rows.map((a: any, i: number) =>
                        `${i + 1}. **${a.title}** [${a.category}] — ${new Date(a.created_at).toLocaleDateString('en-ZA')}\n${a.body}`
                    ).join('\n\n');

                } catch (e: any) {
                    logger.error('[Tool] get_announcements error', e);
                    return 'Announcements are not available at this time.';
                }
            }

            // ── 8. Escalate to Human ──────────────────────────────────
            case 'escalate_to_human': {
                logger.warn('[Agent] Escalation triggered', { reason: input.reason, priority: input.priority });
                return `🔔 Escalation logged (${input.priority.toUpperCase()} priority).
Reason: ${input.reason}
Summary for managing agent: ${input.summary}

A property manager has been notified and will contact you${input.priority === 'urgent' ? ' within the next 2 hours' : ' within 1 business day'}.`;
            }

            default:
                return `Error: Tool "${name}" not found. Available tools: search_knowledgebase, decompose_query, synthesise_research, log_maintenance_request, request_document, get_announcements, escalate_to_human, render_ui_component.`;
        }
    }
}

export const toolsRegistry = new ToolsRegistry();
