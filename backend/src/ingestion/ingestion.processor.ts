import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { IngestionService } from './ingestion.service';

// 1. Define the "Package Label" (The interface)
interface IngestionJobData {
    fileName: string;
    fileBuffer: string; // This is the Base64 string
}

@Processor('ingestion') // <--- This MUST match the queue name in your Module
export class IngestionProcessor extends WorkerHost {
    private readonly logger = new Logger(IngestionProcessor.name);

    constructor(private readonly ingestionService: IngestionService) {
        super();
    }
    // 2. Add the interface to the Job type definition
    async process(job: Job<IngestionJobData>): Promise<any> {
        this.logger.log(`--- [WORKER START] Job ${job.id} ---`);

        // Now TypeScript knows exactly what 'data' contains!
        const { fileBuffer, fileName } = job.data;

        const buffer = Buffer.from(fileBuffer, 'base64');

        const extractedText = await this.ingestionService.extractTextFromPdf(buffer);

        this.logger.log(`Extracted Text from ${fileName}: ${extractedText.substring(0, 50)}...`);

        this.logger.log(`--- [WORKER COMPLETED] ---`);

        return {
            status: 'success',
            textLength: extractedText.length
        };
    }
}