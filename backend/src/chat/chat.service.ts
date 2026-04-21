import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class ChatService {
    private readonly logger = new Logger(ChatService.name);
    private ai: GoogleGenerativeAI;

    // We inject ConfigService to securely access our environment variables
    constructor(private configService: ConfigService) {
        // Make sure this matches exactly what you named it in your .env file!
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');

        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is missing from environment variables.');
        }

        // Initialize the Native SDK
        this.ai = new GoogleGenerativeAI(apiKey);
    }

    async processChatRequest(userMessage: string) {
        this.logger.log(`Received user question: "${userMessage}"`);

        try {
            // 1. Convert userMessage into a 3072-dim vector (Gemini Embedding)
            this.logger.log('Translating question into high-dimensional vector...');

            // We must strictly use the same model used during document ingestion
            const embeddingModel = this.ai.getGenerativeModel({ model: 'gemini-embedding-001' });

            const result = await embeddingModel.embedContent(userMessage);
            const queryVector = result.embedding.values;

            this.logger.log(`Successfully generated vector array of length: ${queryVector.length}`);

            // TODO: 2. Run Raw SQL Cosine Similarity search against pgvector
            // TODO: 3. Orchestrate the System Prompt with retrieved context
            // TODO: 4. Generate the final answer using Gemini 1.5 Flash

            return {
                query: userMessage,
                vectorDimensions: queryVector.length,
                status: 'vectorized',
                message: 'The Read Path successfully embedded the query.'
            };

        } catch (error) {
            this.logger.error('Failed to vectorize user query', error);
            throw new InternalServerErrorException('Failed to process AI embedding layer.');
        }
    }
}