import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ColDef } from 'ag-grid-community';
import { AgGridList } from '../../shared/ag-grid-list/ag-grid-list';
import { ActionMenu } from '../../shared/list-action-menu';
import { InternetCustomerServices } from '../../services/internet-customer-services';
import { CommonMethods } from '../../shared/common-methods';

@Component({ selector:'app-internet-customer-list', imports:[CommonModule,FormsModule,AgGridList], templateUrl:'./internet-customer-list.html', styleUrl:'./internet-customer-list.scss' })
export class InternetCustomerList {
  all:any[]=[]; rows:any[]=[]; search='';
  defaultColDef:ColDef={resizable:true,flex:1,minWidth:120,filter:false,headerClass:'ag-header-style'};
  colDefs:ColDef[]=[
    {headerName:'S.No',maxWidth:80,valueGetter:(p:any)=>p.node.rowIndex+1},
    {field:'customer_code',headerName:'Customer No',maxWidth:140},{field:'network_type',headerName:'Network',maxWidth:130},
    {field:'full_name',headerName:'Full Name',minWidth:180},{field:'net_id',headerName:'Netid',minWidth:150},
    {field:'address',headerName:'Address',minWidth:250},{field:'mobile_no',headerName:'Mobile',minWidth:140},
    {field:'package_amount',headerName:'Package Amount',valueFormatter:(p:any)=>String(Math.round(Number(p.value)||0))},
    {field:'status',headerName:'Status',minWidth:150,maxWidth:170,cellRenderer:(p:any)=>this.statusPill(p.value)},
    {headerName:'Action',maxWidth:120,cellRenderer:ActionMenu,cellRendererParams:{dropdownMenu:[
      {label:'View',action:(r:any)=>this.router.navigate(['/internet/customers/view',r.internet_customer_id])},
      {label:'Complaint',action:(r:any)=>this.router.navigate(['/internet/customers',r.internet_customer_id,'complaints'])},
      {label:'Update',visible:(r:any)=>r.approval_status==='APPROVED'&&r.account_status==='PAID',action:(r:any)=>this.router.navigate(['/internet/customers/view',r.internet_customer_id])}
    ]},sortable:false,filter:false}
  ];
  constructor(private api:InternetCustomerServices,private router:Router,private common:CommonMethods){}
  ngOnInit(){this.load();}
  load(){this.api.getCustomers().subscribe({next:r=>{this.all=(r||[]).map(x=>({...x,address:[x.door_no,x.street_name,x.area_name,x.location_name,x.city,x.pincode].filter(Boolean).join(', ')}));this.filter();},error:e=>this.common.handleError(e)});}
  filter(){const q=this.search.trim().toLowerCase();this.rows=this.all.filter(x=>!q||[x.customer_code,x.full_name,x.net_id,x.mobile_no].some(v=>String(v||'').toLowerCase().includes(q)));}
  statusPill(value:any){const status=String(value||'PENDING').trim();const pill=document.createElement('span');pill.className='status-pill';pill.dataset['status']=status;pill.textContent=status;return pill;}
  add(){this.router.navigateByUrl('/internet/customers/add');}
}
