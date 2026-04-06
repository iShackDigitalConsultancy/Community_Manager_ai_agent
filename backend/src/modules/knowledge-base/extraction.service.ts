import { env } from '../../config/env';
const pdfParse = require('pdf-parse');
import mammoth from 'mammoth';

export interface IDocumentExtractor {
    extract(buffer: Buffer, mimetype: string): Promise<string>;
}


export class LocalPdfExtractor implements IDocumentExtractor {
    async extract(buffer: Buffer, mimetype: string): Promise<string> {
        console.log(`[Extraction] Parsing PDF natively via pdf-parse...`);
        let timeoutId: NodeJS.Timeout;
        const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error("PDF Parsing Timeout after 15s - Document might be too large or corrupted")), 15000);
        });
        let data;
        try {
            data = await Promise.race([pdfParse(buffer), timeoutPromise]);
        } finally {
            clearTimeout(timeoutId!);
        }
        return data.text;
    }
}

export class LlamaParseExtractor implements IDocumentExtractor {
    async extract(buffer: Buffer, mimetype: string): Promise<string> {
        const apiKey = env.LLAMAPARSE_API_KEY;
        if (!apiKey) {
            throw new Error(`[LlamaParse] No API key configured. Please set LLAMAPARSE_API_KEY.`);
        }

        console.log(`[LlamaParse] Uploading to Cloud API...`);
        const formData = new FormData();
        const blob = new Blob([new Uint8Array(buffer)], { type: mimetype });
        formData.append('file', blob, 'document.pdf');
        
        const uploadRes = await fetch('https://api.cloud.llamaindex.ai/api/parsing/upload', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}` },
            body: formData
        });

        if (!uploadRes.ok) {
            throw new Error(`LlamaParse upload failed: ${uploadRes.statusText}`);
        }
        
        const { id: jobId } = await uploadRes.json() as { id: string };
        console.log(`[LlamaParse] Job ID: ${jobId}. Polling...`);

        let status = 'PENDING';
        let retries = 0;
        while (status !== 'SUCCESS' && status !== 'ERROR' && retries < 60) {
            await new Promise(r => setTimeout(r, 2000));
            const statusRes = await fetch(`https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}`, {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            if (!statusRes.ok) throw new Error('Failed to check LlamaParse status');
            const statusData = await statusRes.json() as { status: string };
            status = statusData.status;
            retries++;
        }

        if (status !== 'SUCCESS') {
            throw new Error(`LlamaParse job failed/timeout. Status: ${status}`);
        }

        console.log(`[LlamaParse] Downloading markdown result...`);
        const resultRes = await fetch(`https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}/result/markdown`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (!resultRes.ok) throw new Error('Failed to download LlamaParse markdown');
        
        const resultData = await resultRes.json() as { markdown: string };
        return resultData.markdown;
    }
}

export class LocalWordExtractor implements IDocumentExtractor {
    async extract(buffer: Buffer, mimetype: string): Promise<string> {
        let timeoutId: NodeJS.Timeout;
        const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error("Word Document Parsing Timeout after 15s")), 15000);
        });
        let result;
        try {
            result = await Promise.race([mammoth.extractRawText({ buffer }), timeoutPromise]);
        } finally {
            clearTimeout(timeoutId!);
        }
        return result.value;
    }
}

export class LocalTextExtractor implements IDocumentExtractor {
    async extract(buffer: Buffer, mimetype: string): Promise<string> {
        return buffer.toString('utf-8');
    }
}

export class ExtractionService {
    private extractors: Record<string, IDocumentExtractor> = {
        'application/pdf': env.LLAMAPARSE_API_KEY ? new LlamaParseExtractor() : new LocalPdfExtractor(),
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': new LocalWordExtractor(),
        'text/plain': new LocalTextExtractor()
    };

    /**
     * Set a custom extractor for a particular mimetype (e.g. inject LlamaParse)
     */
    setExtractor(mimetype: string, extractor: IDocumentExtractor) {
        this.extractors[mimetype] = extractor;
    }

    async extractText(buffer: Buffer, mimetype: string): Promise<string> {
        const extractor = this.extractors[mimetype];
        if (!extractor) {
            throw new Error(`Unsupported file type: ${mimetype}`);
        }
        return extractor.extract(buffer, mimetype);
    }
}

export const extractionService = new ExtractionService();
