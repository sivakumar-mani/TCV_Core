import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ColDef } from 'ag-grid-community';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { SupplierServices } from '../../services/supplier-services';
import { AgGridList } from '../../shared/ag-grid-list/ag-grid-list';
import { CommonMethods } from '../../shared/common-methods';
import { ActionMenu } from '../../shared/list-action-menu';

@Component({
  selector: 'app-supplier-list',
  imports: [AgGridList],
  templateUrl: './supplier-list.html',
  styleUrl: './supplier-list.scss',
})
export class SupplierList {
  suppliers: any[] = [];

  defaultColDef: ColDef = {
    resizable: true,
    minWidth: 120,
    flex: 1,
    filter: true,
    floatingFilter: true,
    headerClass: 'ag-header-style',
  };

  colDefs: ColDef[] = [
    { headerName: 'S.No', maxWidth: 80, valueGetter: (params: any) => params.node.rowIndex + 1 },
    { field: 'supplier_name', headerName: 'Supplier Name' },
    { field: 'contact_person', headerName: 'Contact Person' },
    { field: 'phone', headerName: 'Phone', maxWidth: 140 },
    { field: 'email', headerName: 'Email' },
    { field: 'gst_no', headerName: 'GST No', maxWidth: 150 },
    { field: 'city_district', headerName: 'City/District' },
    { field: 'state', headerName: 'State' },
    { field: 'pincode', headerName: 'Pincode', maxWidth: 130 },
    {
      field: 'status',
      headerName: 'Status',
      maxWidth: 120,
      valueFormatter: (params) => this.getStatusLabel(params.value),
    },
    {
      headerName: 'Action',
      maxWidth: 110,
      cellRenderer: ActionMenu,
      cellRendererParams: {
        dropdownMenu: [
          { label: 'Edit', action: (row: any) => this.editSupplier(row) },
          { label: 'Purchase Order', action: (row: any) => this.createPurchase(row) },
          { label: 'Supplier Payment', action: (row: any) => this.createSupplierPayment(row) },
          { label: 'Delete', action: (row: any) => this.deleteSupplier(row) }
        ]
      },
      filter: false,
      sortable: false
    }
  ];

  constructor(
    private supplierService: SupplierServices,
    private ngxLoader: NgxUiLoaderService,
    private commonMethods: CommonMethods,
    private router: Router
  ) { }

  ngOnInit() {
    this.loadSuppliers();
  }

  loadSuppliers() {
    this.ngxLoader.start();
    this.supplierService.getSuppliers().subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        const data = Array.isArray(response) ? response : response.data ?? [];
        this.suppliers = data.map((supplier: any) => ({
          ...supplier,
          city_district: supplier.city_district || supplier.city
        }));
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  addSupplier() {
    this.router.navigateByUrl('/suppliers/add');
  }

  editSupplier(row: any) {
    this.router.navigate(['/suppliers/edit', row.supplier_id]);
  }

  createPurchase(row: any) {
    this.router.navigate(['/purchases/add'], { queryParams: { supplierId: row.supplier_id } });
  }

  createSupplierPayment(row: any) {
    this.router.navigate(['/supplier-payments'], { queryParams: { supplierId: row.supplier_id } });
  }

  deleteSupplier(row: any) {
    if (!confirm(`Delete supplier ${row.supplier_name}?`)) return;

    this.ngxLoader.start();
    this.supplierService.deleteSupplier({ supplier_id: row.supplier_id }).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleTokenAndMessage(response);
        this.loadSuppliers();
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  getStatusLabel(status: number | string) {
    return Number(status) === 1 ? 'Active' : 'Inactive';
  }
}
