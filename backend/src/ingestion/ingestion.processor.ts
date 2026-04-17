import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import { PrismaService } from 'src/prisma/prisma.service';

import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

            // ==========================================
            // PHASE 5: THE AI BRAIN (STABLE STEP-BY-STEP)
            // ==========================================
            this.logger.log(`Starting Phase 5: Chunking and Native Vectorization...`);

            // 1. TEXT SPLITTING (Keep LangChain for this part)
            const splitter = new RecursiveCharacterTextSplitter({
                chunkSize: 1000,
                chunkOverlap: 200,
            });

            const rawDocs = await splitter.createDocuments([extractedText]);
            const docs = rawDocs.filter(doc => doc.pageContent.trim().length > 0);
            this.logger.log(`Split document into ${docs.length} valid chunks.`);

            // 2. THE COMPILER FIX: Narrow the type from string | undefined to string
            const apiKey = process.env.GOOGLE_API_KEY;
            if (!apiKey) {
                throw new Error("GOOGLE_API_KEY is not defined in your .env file. The worker cannot proceed.");
            }

            // 3. INITIALIZE SDK: Using the model you found in the docs
            const genAI = new GoogleGenerativeAI(apiKey);
            const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

            this.logger.log(`Throttling requests to Gemini (1 chunk every 4 seconds)...`);

            let savedCount = 0;
            for (let i = 0; i < docs.length; i++) {
                try {
                    // 4. EMBED CONTENT (Native Method)
                    const result = await embeddingModel.embedContent(docs[i].pageContent);
                    const vector = result.embedding.values;

                    if (vector && vector.length > 0) {
                        // 5. SAVE TO DB (Assuming current 768 dimension schema)
                        await this.prisma.$executeRaw`
                            INSERT INTO "DocumentChunk" (id, text, "documentId", embedding)
                            VALUES (
                                gen_random_uuid(), 
                                ${docs[i].pageContent}, 
                                ${documentId}, 
                                ${JSON.stringify(vector)}::vector
                            )
                        `;
                        savedCount++;
                        this.logger.log(`[${i + 1}/${docs.length}] Successfully saved vector.`);
                    }

                } catch (err) {
                    this.logger.error(`[ERROR] Gemini rejected chunk ${i}:`, err);
                } finally {
                    // Respect the rate limit
                    if (i < docs.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 4200));
                    }
                }
            }

            this.logger.log(`Successfully saved ${savedCount} valid vectors to pgvector.`);

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
                chunksGenerated: docs.length
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