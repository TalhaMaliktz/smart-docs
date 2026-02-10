import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'; // <--- Import this
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Makes .env available everywhere
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }