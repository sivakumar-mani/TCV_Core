import { Injectable } from '@angular/core';
import { MAT_NATIVE_DATE_FORMATS, NativeDateAdapter } from '@angular/material/core';

@Injectable()
export class IndiaDateAdapter extends NativeDateAdapter {
  override format(date: Date, displayFormat: any): string {
    if (displayFormat === 'dd-MM-yyyy') {
      // Picker Dates are local calendar selections. Do not timezone-shift them.
      return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
    }
    return super.format(date, displayFormat);
  }
}

export const INDIA_DATE_FORMATS = {
  ...MAT_NATIVE_DATE_FORMATS,
  display: { ...MAT_NATIVE_DATE_FORMATS.display, dateInput: 'dd-MM-yyyy' }
};
