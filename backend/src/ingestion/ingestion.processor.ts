import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';

@Processor('ingestion') // <--- This MUST match the queue name in your Module
export class IngestionProcessor extends WorkerHost {
    private readonly logger = new Logger(IngestionProcessor.name);

    async process(job: Job<any, any, string>): Promise<any> {
        this.logger.log(`--- [WORKER START] ---`);
        this.logger.log(`Processing Job ID: ${job.id}`);
        this.logger.log(`File being processed: ${job.data.fileName}`);

        // This is where the magic will eventually happen:
        // 1. Convert Buffer back to File
        // 2. Send to GitHub/Gemini
        // 3. Save to Vector DB

        this.logger.log('Simulating PDF text extraction (3 second delay)...');

        // Simulate "Work" so you can see it happening in the logs
        await new Promise(resolve => setTimeout(resolve, 3000));

        this.logger.log(`--- [WORKER COMPLETED] Job ${job.id} ---`);

        return {
            status: 'success',
            processedAt: new Date().toISOString()
        };
    }
}