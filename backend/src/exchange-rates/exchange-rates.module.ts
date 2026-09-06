import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BnaExchangeRate } from './bna-exchange-rate.entity';
import { BnaExchangeRatesService } from './bna-exchange-rates.service';

@Module({
  imports: [TypeOrmModule.forFeature([BnaExchangeRate])],
  providers: [BnaExchangeRatesService],
  exports: [BnaExchangeRatesService],
})
export class ExchangeRatesModule {}
