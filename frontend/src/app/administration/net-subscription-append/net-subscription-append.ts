import {CommonModule} from '@angular/common';
import {Component} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {InternetCustomerServices} from '../../services/internet-customer-services';
import {CommonMethods} from '../../shared/common-methods';

@Component({selector:'app-net-subscription-append',imports:[CommonModule,FormsModule],templateUrl:'./net-subscription-append.html',styleUrl:'../cable-tv-subscription-append/cable-tv-subscription-append.scss'})
export class NetSubscriptionAppend{
  private readonly next=new Date(new Date().getFullYear(),new Date().getMonth()+1,1);
  readonly months=Array.from({length:12},(_,i)=>({value:i+1,label:new Date(2000,i,1).toLocaleString('en-US',{month:'long'})}));
  readonly years=Array.from({length:8},(_,i)=>new Date().getFullYear()-1+i);
  subscriptionMonth=this.next.getMonth()+1;subscriptionYear=this.next.getFullYear();rows:any[]=[];selectedIds=new Set<number>();period:any={};totalAmount=0;loading=false;
  constructor(private api:InternetCustomerServices,private common:CommonMethods){}
  ngOnInit(){this.preview();}
  get allSelected(){return this.rows.length>0&&this.selectedIds.size===this.rows.length;}
  get selectedRows(){return this.rows.filter(x=>this.selectedIds.has(Number(x.internet_customer_id)));}
  get selectedAmount(){return this.selectedRows.reduce((sum,x)=>sum+Number(x.amount||0),0);}
  preview(){this.loading=true;this.api.previewSubscriptionAppend(this.subscriptionMonth,this.subscriptionYear).subscribe({next:r=>{this.loading=false;this.rows=r?.rows||[];this.period=r?.period||{};this.totalAmount=Number(r?.total_amount)||0;this.selectedIds=new Set(this.rows.map(x=>Number(x.internet_customer_id)));},error:e=>{this.loading=false;this.common.handleError(e);}});}
  toggleAll(checked:boolean){this.selectedIds=checked?new Set(this.rows.map(x=>Number(x.internet_customer_id))):new Set<number>();}
  toggleRow(id:number,checked:boolean){const next=new Set(this.selectedIds);checked?next.add(Number(id)):next.delete(Number(id));this.selectedIds=next;}
  append(){if(!this.selectedIds.size)return;if(!confirm(`Append ${this.selectedIds.size} Net subscription(s)?`))return;this.loading=true;this.api.appendSubscriptions({subscription_month:Number(this.subscriptionMonth),subscription_year:Number(this.subscriptionYear),customer_ids:[...this.selectedIds]}).subscribe({next:r=>{this.loading=false;this.common.handleTokenAndMessage(r);this.preview();},error:e=>{this.loading=false;this.common.handleError(e);}});}
  displayDate(value:any){if(!value)return'-';const [y,m,d]=String(value).slice(0,10).split('-');return y&&m&&d?`${d}-${m}-${y}`:String(value);}
}
