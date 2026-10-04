import { IFloatingFilterComp, IFloatingFilterParams } from 'ag-grid-community';

type SelectFilterParams = IFloatingFilterParams & {
  options: () => string[];
  formatLabel: (value: string) => string;
};

export class CustomerSelectFloatingFilter implements IFloatingFilterComp {
  private select!: HTMLSelectElement;
  private params!: SelectFilterParams;

  init(params: SelectFilterParams) {
    this.params = params;
    this.select = document.createElement('select');
    this.select.setAttribute('aria-label', `${params.column.getColDef().headerName} filter`);
    this.select.style.cssText = 'width:100%;min-width:0;height:28px;border:1px solid #c8d0dc;border-radius:4px;background:#fff;color:#111827;font:inherit;';
    this.select.addEventListener('focus', () => this.updateOptions(this.select.value));
    this.select.addEventListener('change', () => {
      const value = this.select.value;
      this.params.parentFilterInstance((filter) => filter.onFloatingFilterChanged('equals', value || null));
    });
    this.onParentModelChanged(params.currentParentModel());
  }

  getGui() {
    return this.select;
  }

  onParentModelChanged(model: any) {
    this.updateOptions(model?.filter || '');
  }

  private updateOptions(value: string) {
    const options = [...new Set([...this.params.options(), ...(value ? [value] : [])])];
    this.select.replaceChildren(new Option('All', ''), ...options.map((option) => new Option(this.params.formatLabel(option), option)));
    this.select.value = value;
  }
}
