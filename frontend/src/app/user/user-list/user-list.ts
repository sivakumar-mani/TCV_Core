import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AgGridModule } from 'ag-grid-angular';
import { AllCommunityModule, ColDef, ICellRendererParams, ModuleRegistry, themeBalham } from 'ag-grid-community';
import { UserServices } from '../../services/user-services';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { Router } from '@angular/router';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { Dialog } from '@angular/cdk/dialog';
import { Signup } from '../../dialog/signup/signup';
import { ActionMenu } from '../../shared/list-action-menu';
ModuleRegistry.registerModules([AllCommunityModule]);
@Component({
  selector: 'app-user-list',
  imports: [MatIconModule, MatToolbarModule, AgGridModule],
  templateUrl: './user-list.html',
  styleUrl: './user-list.scss',
})
export class UserList {

  rowSelection: any;
  actionMenu: any;
  rowHeight = 20;
  pagination = true;
  paginationPageSize = 10;
  paginationPageSizeSelector = [10, 25, 50, 100];
  public theme = themeBalham;
  // userList:any[]=[];
  userList: any;
  dialog = inject(MatDialog);
  
  constructor(private userService: UserServices,
    private ngxUiLoader: NgxUiLoaderService,
    private router: Router,
    

  ) {
    this.rowSelection = {
      mode: 'multiRow',
    };
  }

  ngOnInit() {
    this.ngxUiLoader.start();
    this.getUsers();
  }

  getUsers() {
    this.userService.getAllusers().subscribe((response: any) => {
      this.ngxUiLoader.stop();
      this.userList = response
    })
  }
  addUser(){
    const dialogConfig =  this.dialog.open(Signup,{
      width: '60%',
      height:'80%',
      maxWidth: '100vw',
      maxHeight:'100vh',
       disableClose: true,
      position:{
         top: 'calc(1vw + 20px)'
      }
    });
    
  }

  
  defaultColDef: ColDef = {
    flex: 1,
    filter: true,
    floatingFilter: true,
    headerClass: 'ag-header-style',
  }

  colDefs: ColDef[] = [
    { headerName: 'S.No', maxWidth: 70, valueGetter: (params: any) => params.node.rowIndex + 1 },
    { field: "userName", headerName: 'User Name', maxWidth: 150 },
    { headerName: 'Full Name', valueGetter: (params) => { return params.data.firstName + ' ' + params.data.lastName } },
    { field: "email", headerName: 'Email' },
    { field: "contactNumber", headerName: 'Contact #', maxWidth: 120, },
    { field: "role", headerName: 'Role', maxWidth: 100, },
    { field: "Status", headerName: 'Status', maxWidth: 70, },
    {
  headerName: "Action",
  maxWidth: 120,
  cellRenderer: ActionMenu,
  cellRendererParams: {
    actions: [
      { label: 'View', action: (row:any) => this.view(row) },
      { label: 'Edit', action: (row:any) => this.edit(row) },
      { label: 'Delete', action: (row:any) => this.delete(row) }
    ]
  },
  filter: false,
  sortable: false
}
  ];
view(row:any){
  console.log("View", row);
}

edit(row:any){
  console.log("Edit", row);
}

delete(row:any){
  console.log("Delete", row);
}

}
