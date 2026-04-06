import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env';
import fs from 'fs';
import path from 'path';
import os from 'os';

export class S3Service {
    private client: S3Client;
    private bucketName: string;

    constructor() {
        this.client = new S3Client({
            region: env.AWS_REGION || 'af-south-1',
            credentials: {
                accessKeyId: env.AWS_ACCESS_KEY_ID || 'mock',
                secretAccessKey: env.AWS_SECRET_ACCESS_KEY || 'mock'
            }
        });
        this.bucketName = env.AWS_S3_BUCKET || 'schemeassist-kb';
    }

    async uploadFile(key: string, body: Buffer, contentType: string) {
        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            Body: body,
            ContentType: contentType,
        });

        if (!env.AWS_ACCESS_KEY_ID || env.AWS_ACCESS_KEY_ID === 'mock' || env.AWS_ACCESS_KEY_ID.includes('mock')) {
            console.log(`[S3] Using mock S3 upload (No valid AWS credentials found or mock mode enabled)`);
            const mockDir = path.join(os.tmpdir(), 'schemeassist-mock-s3');
            if (!fs.existsSync(mockDir)) fs.mkdirSync(mockDir, { recursive: true });
            fs.writeFileSync(path.join(mockDir, key.replace(/\//g, '_')), body);
            return `mock-s3://${this.bucketName}/${key}`;
        }

        console.log(`[S3] Attempting real AWS upload to bucket: ${this.bucketName}, key: ${key}`);
        try {
            let timeoutId: NodeJS.Timeout;
            const timeoutPromise = new Promise<never>((_, reject) => {
                timeoutId = setTimeout(() => reject(new Error("S3 Upload Timeout after 15s")), 15000);
            });
            try {
                await Promise.race([this.client.send(command), timeoutPromise]);
            } finally {
                clearTimeout(timeoutId!);
            }
            console.log(`[S3] Upload successful`);
            return `s3://${this.bucketName}/${key}`;
        } catch (e: any) {
            console.error(`[S3] Upload failed or timed out:`, e);
            throw new Error(`S3 Upload failed: ${e.message}`);
        }
    }

    async getSignedDownloadUrl(key: string, expiresIn: number = 3600) {
        if (key.startsWith('mock-s3://')) return key;
        
        const realKey = key.replace(`s3://${this.bucketName}/`, '');
        const command = new GetObjectCommand({
            Bucket: this.bucketName,
            Key: realKey
        });
        return getSignedUrl(this.client, command, { expiresIn });
    }

    async deleteFile(key: string) {
        if (key.startsWith('mock-s3://')) return;

        const realKey = key.replace(`s3://${this.bucketName}/`, '');
        const command = new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: realKey
        });
        await this.client.send(command);
    }

    async downloadFile(key: string): Promise<Buffer> {
        if (key.startsWith('mock-s3://')) {
            const realKey = key.replace(`mock-s3://${this.bucketName}/`, '');
            const mockPath = path.join(os.tmpdir(), 'schemeassist-mock-s3', realKey.replace(/\//g, '_'));
            if (!fs.existsSync(mockPath)) throw new Error('Mock file not found');
            return fs.readFileSync(mockPath);
        }

        const realKey = key.replace(`s3://${this.bucketName}/`, '');
        const command = new GetObjectCommand({
            Bucket: this.bucketName,
            Key: realKey
        });
        const response = await this.client.send(command);
        const byteArray = await response.Body?.transformToByteArray();
        if (!byteArray) throw new Error('Failed to download file payload');
        return Buffer.from(byteArray);
    }
}

export const s3Service = new S3Service();
