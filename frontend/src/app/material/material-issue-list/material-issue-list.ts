import { Component, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router } from '@angular/router';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { MaterialServices } from '../../services/material-services';
import { CommonMethods } from '../../shared/common-methods';

@Component({
  selector: 'app-material-issue-list',
  imports: [MatButtonModule, MatIconModule, MatPaginatorModule, MatTableModule, MatToolbarModule],
  templateUrl: './material-issue-list.html',
  styleUrl: './material-issue-list.scss',
})
export class MaterialIssueList {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  displayedColumns: string[] = [
    'serial',
    'issue_no',
    'issue_date',
    'work_order_no',
    'issued_by_name',
    'received_by_employee_name',
    'issue_status',
    'remarks',
    'action'
  ];
  dataSource = new MatTableDataSource<any>([]);

  constructor(
    private materialService: MaterialServices,
    private ngxLoader: NgxUiLoaderService,
    private commonMethods: CommonMethods,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadIssues();
  }

  loadIssues() {
    this.ngxLoader.start();
    this.materialService.getIssues().subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.dataSource = new MatTableDataSource(response?.data ?? response ?? []);
        this.dataSource.paginator = this.paginator;
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  markIssued(row: any) {
    this.ngxLoader.start();
    this.materialService.updateIssueStatus(row.material_issue_id, 'ISSUED').subscribe({
      next: (response: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleTokenAndMessage(response);
        this.loadIssues();
      },
      error: (error: any) => {
        this.ngxLoader.stop();
        this.commonMethods.handleError(error);
      }
    });
  }

  addIssue() {
    this.router.navigateByUrl('/material-issues/add');
  }

  applyFilter(event: Event) {
    this.dataSource.filter = (event.target as HTMLInputElement).value.trim().toLowerCase();
  }
}

