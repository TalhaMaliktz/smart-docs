import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import { PrismaService } from 'src/prisma/prisma.service';

// 1. Update the interface to match what the Controller is now sending
interface IngestionJobData {
    file: { type: 'Buffer'; data: number[] }; // How BullMQ serializes a Node Buffer
    documentId: string; // The Postgres ID we need to update
}

@Processor('ingestion')
export class IngestionProcessor extends WorkerHost {
    private readonly logger = new Logger(IngestionProcessor.name);

    constructor(
        private readonly ingestionService: IngestionService,
        private readonly prisma: PrismaService // <-- Inject Prisma
    ) {
        super();
    }

    async process(job: Job<IngestionJobData>): Promise<any> {
        this.logger.log(`--- [WORKER START] Job ${job.id} ---`);

        const { file, documentId } = job.data;

        try {
            // 1. Mark as PROCESSING in the Database
            await this.prisma.document.update({
                where: { id: documentId },
                data: { status: 'PROCESSING' },
            });

            // 2. Reconstruct the Buffer from Redis JSON format
            const buffer = Buffer.from(file.data);

            // 3. Extract the text using your Service
            const extractedText = await this.ingestionService.extractTextFromPdf(buffer);
            this.logger.log(`Extracted Text from Doc ${documentId}: ${extractedText.substring(0, 50)}...`);

            // 4. Save Text & Mark COMPLETED in the Database
            await this.prisma.document.update({
                where: { id: documentId },
                data: {
                    status: 'COMPLETED',
                    content: extractedText
                },
            });

            this.logger.log(`--- [WORKER COMPLETED] Document safely stored! ---`);

            return {
                status: 'success',
                textLength: extractedText.length
            };

        } catch (error) {
            // 1. Defensively extract the stack trace and message
            const stackTrace = error instanceof Error ? error.stack : 'No stack trace available';
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

            // 2. Safely log the error
            this.logger.error(`[WORKER FAILED] Job ${job.id} failed`, stackTrace);

            // 3. Mark as FAILED in the Database
            await this.prisma.document.update({
                where: { id: documentId },
                data: {
                    status: 'FAILED',
                    errorMessage: errorMessage
                },
            });

            // 4. Let BullMQ know it failed
            throw error;
        }
    }
}