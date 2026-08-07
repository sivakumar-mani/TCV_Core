import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { InternetCustomerServices } from '../../services/internet-customer-services';
import { WorkflowServices } from '../../services/workflow-services';
import { CommonMethods } from '../../shared/common-methods';

@Component({selector:'app-internet-customer-view',imports:[CommonModule],templateUrl:'./internet-customer-view.html',styleUrl:'./internet-customer-view.scss'})
export class InternetCustomerView {
  details:any={}; id=0; activeTab='subscription'; reviewMode=false; workflowId:string|null=null; approving=false;
  readonly tabs=[['subscription','Subscription'],['router','Router'],['connection','Connection'],['package','Package'],['customer','Customer Information']];
  constructor(private route:ActivatedRoute,private router:Router,private api:InternetCustomerServices,private workflows:WorkflowServices,private common:CommonMethods){this.id=Number(route.snapshot.paramMap.get('id'));this.reviewMode=route.snapshot.queryParamMap.get('review')==='true';this.workflowId=route.snapshot.queryParamMap.get('workflowId');}
  ngOnInit(){this.load();}
  load(){this.api.getCustomer(this.id).subscribe({next:r=>{const keys=['amount','balance_amount','rate','connection_charge','connection_discount','labour_service_charge','package_price','base_price','total_price','grand_total','router_amount','router_discount','connection_amount','labor_amount','material_cost','material_discount','subscription_amount','overall_discount','customer_paid_amount','office_received_amount','office_balance_amount'];const rounded=(value:any):any=>{if(Array.isArray(value))return value.map(rounded);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,keys.includes(key)?Math.round(Number(item)||0):rounded(item)]));return value;};this.details=rounded(r);},error:e=>this.common.handleError(e)});}
  approve(){if(!this.workflowId||this.approving||!confirm(`Approve Internet customer ${this.details.customer?.customer_code}?`))return;this.approving=true;this.workflows.approveWorkflow(this.workflowId).subscribe({next:r=>{this.approving=false;this.common.handleTokenAndMessage(r);this.reviewMode=false;this.load();this.router.navigate(['/internet/customers/view',this.id],{replaceUrl:true});},error:e=>{this.approving=false;this.common.handleError(e);}});}
  back(){this.router.navigateByUrl(this.reviewMode?'/workflow-approval':'/internet/customers');}
  address(){const c=this.details.customer||{};return [c.door_no,c.street_name,c.area_name,c.location_name,c.city,c.pincode].filter(Boolean).join(', ');}
  monthName(value:any){return new Date(2000,Math.max(Number(value)-1,0),1).toLocaleString('en',{month:'long'});}
}
