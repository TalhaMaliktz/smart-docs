import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';
import { IngestionProcessor } from './ingestion.processor';

@Module({
  imports: [
    // Register the specific queue for this module
    BullModule.registerQueue({
      name: 'ingestion', // <--- MUST match @InjectQueue('ingestion') in Controller
    }),
  ],
  controllers: [IngestionController],
  providers: [IngestionService, IngestionProcessor],
})
export class IngestionModule { }
