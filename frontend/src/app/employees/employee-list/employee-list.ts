import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ColDef } from 'ag-grid-community';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { EmployeeServices } from '../../services/employee-services';
import { CommonMethods } from '../../shared/common-methods';
import { ActionMenu } from '../../shared/list-action-menu';
import { appConfig } from '../../app-config';
import { AgGridList } from '../../shared/ag-grid-list/ag-grid-list';

@Component({
  selector: 'app-employee-list',
  imports: [CommonModule, RouterLink, AgGridList],
  templateUrl: './employee-list.html',
  styleUrl: './employee-list.scss',
})
export class EmployeeList {
  employees: any[] = [];
  selectedEmployee: any;
  private assetBaseUrl = appConfig.apiUrl.replace('/api', '');
  pagination = true;
  paginationPageSize = 10;
  paginationPageSizeSelector = [10, 25, 50, 100];

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
    { field: 'employee_code', headerName: 'Code', maxWidth: 130 },
    { field: 'employee_name', headerName: 'Employee Name' },
    { field: 'phone', headerName: 'Phone', maxWidth: 140 },
    { field: 'email', headerName: 'Email' },
    { field: 'designation', headerName: 'Designation' },
    { field: 'department', headerName: 'Department', maxWidth: 150 },
    { field: 'permanent_city_district', headerName: 'City/District', maxWidth: 160 },
    {
      field: 'is_active',
      headerName: 'Status',
      maxWidth: 120,
      valueFormatter: (params) => Number(params.value) === 1 ? 'Active' : 'Inactive',
    },
    {
      headerName: 'Action',
      maxWidth: 120,
      cellRenderer: ActionMenu,
      cellRendererParams: {
        dropdownMenu: [
          { label: 'View', action: (row: any) => this.viewEmployee(row) },
          { label: 'Edit', action: (row: any) => this.editEmployee(row) },
          { label: 'Delete', action: (row: any) => this.deleteEmployee(row) }
        ]
      },
      filter: false,
      sortable: false
    }
  ];

  constructor(
    private employeeService: EmployeeServices,
    private ngxLoader: NgxUiLoaderService,
    private commonMethods: CommonMethods,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadEmployees();
  }

  loadEmployees() {
    this.ngxLoader.start();
    this.employeeService.getEmployees().subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.employees = Array.isArray(response) ? response : response?.data ?? [];
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  addEmployee() {
    this.router.navigateByUrl('/employees/add');
  }

  editEmployee(row: any) {
    this.router.navigate(['/employees/edit', row.employee_id]);
  }

  viewEmployee(row: any) {
    this.ngxLoader.start();
    this.employeeService.getEmployeeById(row.employee_id).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.selectedEmployee = response?.data ?? response;
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  closeView() {
    this.selectedEmployee = null;
  }

  getPhotoUrl(path: string) {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${this.assetBaseUrl}${path}`;
  }

  deleteEmployee(row: any) {
    if (!confirm(`Delete employee ${row.employee_name}?`)) return;

    this.ngxLoader.start();
    this.employeeService.deleteEmployee({ employee_id: row.employee_id }).subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleTokenAndMessage(response);
        this.loadEmployees();
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }
}
