import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AgGridModule } from 'ag-grid-angular';
import { AllCommunityModule, ColDef, ModuleRegistry, themeBalham } from 'ag-grid-community';
import { UserServices } from '../../services/user-services';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { Router } from '@angular/router';
import { MatDialog,  } from '@angular/material/dialog';
import { Signup } from '../dialog/signup/signup';
import { ActionMenu } from '../../shared/list-action-menu';
import { ViewUser } from '../dialog/view-user/view-user';
import { ConfirmationPopup } from '../../shared/confirmation-popup/confirmation-popup';
import { Snackbar } from '../../services/snackbar';
import { globalConstants } from '../../services/global-constants';
ModuleRegistry.registerModules([AllCommunityModule]);
@Component({
  selector: 'app-user-list',
  imports: [MatIconModule, MatToolbarModule, AgGridModule],
  templateUrl: './user-list.html',
  styleUrl: './user-list.scss',
})
export class UserList {
  
  isMobile = window.innerWidth < 768;
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
  responseMessage: any;
  
  constructor(private userService: UserServices,
    private ngxLoader: NgxUiLoaderService,
    private router: Router,
    private snackBarService :Snackbar
  ) {
    this.rowSelection = {
      mode: 'multiRow',
    };
  }

  ngOnInit() {
    this.ngxLoader.start();
    this.getUsers();
  }

  getUsers() {
    this.userService.getAllusers().subscribe((response: any) => {
      this.ngxLoader.stop();
      this.userList = response
    })
  }
  addUser(){
    const dialogConfig =  this.dialog.open(Signup,{
      width: this.isMobile ? '96%' : '60%',
      height: this.isMobile ? '90%' : '80%',
      maxWidth: '100vw',
      maxHeight:'100vh',
       disableClose: true,
      position:{
         top: 'calc(1vw + 20px)'
      }
    });
    dialogConfig.afterClosed().subscribe(result => {
    if (result === 'success') {
      this.getUsers();   
    }
  });
  }
viewUser(userData:any){
   const dialogConfig =  this.dialog.open(ViewUser,{
      data: userData,
       width: this.isMobile ? '96%' : '60%',
      height: this.isMobile ? '90%' : '80%',
      maxWidth: '100vw',
      maxHeight:'100vh',
       disableClose: true,
      position:{
         top: '20px'
      }
    });
}

editUser(userData:any){
  const dialogConfig =  this.dialog.open(Signup,{
      data: userData,
      width: this.isMobile ? '96%' : '60%',
      height: this.isMobile ? '90%' : '80%',
      maxWidth: '100vw',
      maxHeight:'100vh',
       disableClose: true,
      position:{
         top: 'calc(1vw + 20px)'
      }
    });
    dialogConfig.afterClosed().subscribe(result => {
    if (result === 'success') {
      this.getUsers();   
    }
  });
}

delete(userData:any){  
   const dialogConfig =  this.dialog.open(ConfirmationPopup,{
    data : {
      data: userData,
      message: "Delete",
      userName :"User Name",
      fullName: "Full Name"
    },
      width: '40%',
      height:'40%',
      maxWidth: '100vw',
      maxHeight:'100vh',
       disableClose: true,
      position:{
         top: 'calc(1vw + 20px)'
      }
    });
     const sub = dialogConfig.componentInstance.onEmitStatusChange.subscribe(() => {
      this.userService.userDelete(userData).subscribe({
           next: (response: any) => {
             this.ngxLoader.stop();
            if (response?.token) {
               localStorage.setItem('token', response.token);
             }
             this.responseMessage = response.message;
             this.snackBarService.openSnackbar(this.responseMessage, "");
             if (response) {
               dialogConfig.close('success');
             }
             this.router.navigateByUrl('/users');
           },
           error: (error) => {
             this.ngxLoader.stop();
             if (error.error?.message) {
               this.responseMessage = error.error?.message;
             } else {
               this.responseMessage = globalConstants.genericError;
             }
             this.snackBarService.openSnackbar(this.responseMessage, globalConstants.errorRegex)
           }
         });
    })
    dialogConfig.afterClosed().subscribe(result => {
    if (result === 'success') {
      sub.unsubscribe();
      this.getUsers();   
    }
  });
}
  
  defaultColDef: ColDef = {
    resizable: true,
    minWidth: 120,
    flex: 1,
    filter: true,
    floatingFilter: true,
    headerClass: 'ag-header-style',
  }
  
  titleCaseFormatter = (params: any) => {
    if (!params.value) return '';
    return params.value.toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase());
  };

  colDefs: ColDef[] = [
    { headerName: 'S.No', maxWidth: 70, valueGetter: (params: any) => params.node.rowIndex + 1,  },
    { field: "userName", headerName: 'User Name', maxWidth: 150 },
    { headerName: 'Full Name', valueGetter: (params) => { return params.data.firstName + ' ' + params.data.lastName }, valueFormatter: this.titleCaseFormatter },
    { field: "email", headerName: 'Email' },
    { field: "contactNumber", headerName: 'Contact #', maxWidth: 120, },
    { field: "role", headerName: 'Role', maxWidth: 100, },
    { field: "Status", headerName: 'Status', maxWidth: 70, },
    {
  headerName: "Action",
  maxWidth: 120,
  cellRenderer: ActionMenu,
  cellRendererParams: {
    dropdownMenu: [
      { label: 'View', action: (userData:any) => this.viewUser(userData) },
      { label: 'Edit', action: (userData:any) => this.editUser(userData) },
      { label: 'Delete', action: (userData:any) => this.delete(userData) }
    ]
  },
  filter: false,
  sortable: false
}
  ];


}
