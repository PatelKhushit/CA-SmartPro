import { Body, Controller, Post } from '@nestjs/common';
import { CalculatorsService } from './calculators.service.js';
import {
  PercentageDto,
  GstDto,
  FlatRateDto,
  InterestDto,
  InvoiceDto,
  DiscountDto,
  PriceCompareDto,
  DateDifferenceDto,
  DueDateDto,
  EmiDto,
} from './dto/calculator.dto.js';

@Controller('calculators')
export class CalculatorsController {
  constructor(private readonly calculatorsService: CalculatorsService) {}

  @Post('percentage')
  percentage(@Body() dto: PercentageDto) {
    return this.calculatorsService.percentage(dto);
  }

  @Post('gst')
  gst(@Body() dto: GstDto) {
    return this.calculatorsService.gst(dto);
  }

  @Post('tax')
  tax(@Body() dto: FlatRateDto) {
    return this.calculatorsService.tax(dto);
  }

  @Post('tds')
  tds(@Body() dto: FlatRateDto) {
    return this.calculatorsService.tds(dto);
  }

  @Post('interest')
  interest(@Body() dto: InterestDto) {
    return this.calculatorsService.interest(dto);
  }

  @Post('invoice')
  invoice(@Body() dto: InvoiceDto) {
    return this.calculatorsService.invoice(dto);
  }

  @Post('discount')
  discount(@Body() dto: DiscountDto) {
    return this.calculatorsService.discount(dto);
  }

  @Post('profit-margin')
  profitMargin(@Body() dto: PriceCompareDto) {
    return this.calculatorsService.profitMargin(dto);
  }

  @Post('markup')
  markup(@Body() dto: PriceCompareDto) {
    return this.calculatorsService.markup(dto);
  }

  @Post('date-difference')
  dateDifference(@Body() dto: DateDifferenceDto) {
    return this.calculatorsService.dateDifference(dto);
  }

  @Post('due-date')
  dueDate(@Body() dto: DueDateDto) {
    return this.calculatorsService.dueDate(dto);
  }

  @Post('emi')
  emi(@Body() dto: EmiDto) {
    return this.calculatorsService.emi(dto);
  }
}
