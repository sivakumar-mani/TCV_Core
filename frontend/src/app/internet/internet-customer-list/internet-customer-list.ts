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
  all:any[]=[]; rows:any[]=[];
  filters={customerNo:'',network:'',name:'',mobile:'',status:''};
  readonly networkOptions=['KRISHI','RAILWIRE','DMNET'];
  readonly statusOptions=['Active','Disconnected','Waiting Approval','Pending Payment','Rejected'];
  defaultColDef:ColDef={resizable:true,flex:1,minWidth:120,filter:'agTextColumnFilter',floatingFilter:true,filterParams:{buttons:['reset'],maxNumConditions:1},headerClass:'ag-header-style'};
  readonly customerActions=[
    {label:'View',action:(r:any)=>this.router.navigate(['/internet/customers/view',r.internet_customer_id])},
    {label:'Complaint',action:(r:any)=>this.router.navigate(['/internet/customers',r.internet_customer_id,'complaints'])},
    {label:'Update',permission:'view',visible:(r:any)=>Boolean(String(r.legacy_customer_no||'').trim())||(r.approval_status==='APPROVED'&&r.account_status==='PAID'),action:(r:any)=>this.router.navigate(['/internet/customers/view',r.internet_customer_id])}
  ];
  colDefs:ColDef[]=[
    {headerName:'Serial #',width:92,minWidth:92,maxWidth:92,flex:0,cellRenderer:ActionMenu,cellRendererParams:{showSerial:true,dropdownMenu:this.customerActions},sortable:false,filter:false,floatingFilter:false},
    {field:'legacy_customer_no',headerName:'Cust No',width:88,minWidth:88,maxWidth:88,flex:0},
    {field:'network_type',headerName:'Network',width:100,minWidth:100,maxWidth:100,flex:0},
    {field:'full_name',headerName:'Full Name',minWidth:180,valueFormatter:(p:any)=>this.titleCaseText(p.value)},
    {field:'net_id',headerName:'Net ID',width:135,minWidth:135,maxWidth:135,flex:0},
    {field:'address',headerName:'Address',minWidth:250,valueFormatter:(p:any)=>this.titleCaseText(p.value)},
    {field:'mobile_no',headerName:'Mobile',width:125,minWidth:125,maxWidth:125,flex:0},
    {field:'package_amount',headerName:'Package',width:105,minWidth:105,maxWidth:105,flex:0,valueFormatter:(p:any)=>String(Math.round(Number(p.value)||0))},
    {field:'status',headerName:'Status',width:130,minWidth:130,maxWidth:130,flex:0,cellRenderer:(p:any)=>this.statusPill(p.value)}
  ];
  constructor(private api:InternetCustomerServices,private router:Router,private common:CommonMethods){}
  ngOnInit(){this.load();}
  load(){this.api.getCustomers().subscribe({next:r=>{this.all=(r||[]).map(x=>({...x,address:[x.door_no,x.street_name,x.area_name,x.location_name,x.city,x.pincode].filter(Boolean).join(', ')}));this.filter();},error:e=>this.common.handleError(e)});}
  filter(){const text=(value:any)=>String(value||'').trim().toLowerCase();this.rows=this.all.filter(x=>(!this.filters.customerNo||text(x.legacy_customer_no).includes(text(this.filters.customerNo)))&&(!this.filters.network||text(x.network_type)===text(this.filters.network))&&(!this.filters.name||text(x.full_name).includes(text(this.filters.name)))&&(!this.filters.mobile||text(x.mobile_no).includes(text(this.filters.mobile)))&&(!this.filters.status||text(x.status)===text(this.filters.status)));}
  resetFilters(){this.filters={customerNo:'',network:'',name:'',mobile:'',status:''};this.filter();}
  statusPill(value:any){const status=String(value||'PENDING').trim();const pill=document.createElement('span');pill.className='status-pill';pill.dataset['status']=status;pill.textContent=status;return pill;}
  titleCaseText(value:any){return String(value||'-').toLowerCase().replace(/\b\w/g,(letter)=>letter.toUpperCase());}
  add(){this.router.navigateByUrl('/internet/customers/add');}
}
