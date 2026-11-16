import { formatDate } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';
import { indianDisplayInstant } from './india-date';

@Pipe({ name: 'indiaDate', standalone: true })
export class IndiaDatePipe implements PipeTransform {
  transform(value: unknown, format = 'dd-MM-yyyy'): string | null {
    const date = indianDisplayInstant(value);
    return date ? formatDate(date, format, 'en-US', '+0530') : null;
  }
}
