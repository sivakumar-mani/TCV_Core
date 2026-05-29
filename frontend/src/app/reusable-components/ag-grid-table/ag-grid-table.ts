import {
  Component,
  Input,
  Output,
  EventEmitter
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  GridOptions,
  GridReadyEvent,
  SelectionChangedEvent,
  CellClickedEvent,
  RowClickedEvent,
  ColDef
} from 'ag-grid-community';

import { AgGridAngular } from 'ag-grid-angular'; 
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
ModuleRegistry.registerModules([AllCommunityModule]);
@Component({
  selector: 'app-ag-grid-table',
  standalone: true,
  imports: [
    CommonModule,
    AgGridAngular 
  ],
  templateUrl: './ag-grid-table.html',
  styleUrls: ['./ag-grid-table.scss']
})
export class AgGridTableComponent {

  // ================= INPUTS =================

  @Input() width: string = '100%';
  @Input() height: string = '500px';

  @Input() rowData: any[] = [];

  @Input() columnDefs: ColDef[] = [];

  @Input() defaultColDef: any = {
    flex: 1,
    sortable: true,
    filter: true,
    floatingFilter: true,
    resizable: true,
  };

  @Input() gridOptions: GridOptions = {};

  @Input() pagination: boolean = true;

  @Input() paginationPageSize: number = 10;

  @Input() paginationPageSizeSelector: number[] = [10, 25, 50, 100];

  @Input() rowSelection: 'single' | 'multiple' = 'single';

  @Input() suppressRowClickSelection: boolean = false;

  @Input() rowMultiSelectWithClick: boolean = false;

  @Input() animateRows: boolean = true;

  @Input() suppressCellFocus: boolean = false;

  @Input() tooltipShowDelay: number = 0;

  @Input() overlayLoadingTemplate: string =
    '<span class="ag-overlay-loading-center">Loading...</span>';

  @Input() overlayNoRowsTemplate: string =
    '<span class="ag-overlay-loading-center">No Data Available</span>';

  // ================= OUTPUTS =================

  @Output() gridReady = new EventEmitter<GridReadyEvent>();

  @Output() selectionChanged = new EventEmitter<SelectionChangedEvent>();

  @Output() cellClicked = new EventEmitter<CellClickedEvent>();

  @Output() rowClicked = new EventEmitter<RowClickedEvent>();

  // ================= EVENTS =================

  onGridReady(event: GridReadyEvent): void {
    this.gridReady.emit(event);
  }

  onSelectionChanged(event: SelectionChangedEvent): void {
    this.selectionChanged.emit(event);
  }

  onCellClicked(event: CellClickedEvent): void {
    this.cellClicked.emit(event);
  }

  onRowClicked(event: RowClickedEvent): void {
    this.rowClicked.emit(event);
  }
}