import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ApiSelectDirective, ApiSelectPopup } from './api-select.directive';
@Component({standalone:true,imports:[CommonModule,FormsModule,ReactiveFormsModule,ApiSelectDirective],template:`
 <label>Employee<select appApiSelect [(ngModel)]="id" (ngModelChange)="changes=changes+1">
 <option [ngValue]="null">All employees</option><option *ngFor="let row of rows" [ngValue]="row.id" [disabled]="row.disabled">{{row.name}}</option></select></label>
 <select appApiSelect [formControl]="control"><option [ngValue]="null">Choose</option><option *ngFor="let row of rows" [ngValue]="row">{{row.name}}</option></select>
 <select class="static"><option>Active</option><option>Inactive</option></select>
`})
class Host {
 id:number|null=2; changes=0;
 rows=[{id:2,name:'Alpha',disabled:false},{id:3,name:'Beta',disabled:true}];
 control=new FormControl<any>(null);
}
describe('API searchable select adapter',()=>{
 let fixture:ComponentFixture<Host>;
 async function settle(){fixture.detectChanges();await fixture.whenStable();fixture.detectChanges();await fixture.whenStable();}
 function popups(){return fixture.debugElement.queryAll(By.directive(ApiSelectPopup)).map(x=>x.componentInstance as ApiSelectPopup);}
 beforeEach(async()=>{await TestBed.configureTestingModule({imports:[Host],providers:[provideNoopAnimations()]}).compileComponents();fixture=TestBed.createComponent(Host);await settle();});
 afterEach(()=>fixture.destroy());
 it('preserves numeric and null ngValues and invokes existing change handlers once',async()=>{
  const popup=popups()[0];expect(popup.options.find(x=>x.value===popup.value)?.label).toBe('Alpha');
  popup.selected.emit(popup.options[0].value);await settle();expect(fixture.componentInstance.id).toBeNull();expect(fixture.componentInstance.changes).toBe(1);
  popup.selected.emit(popup.options[1].value);await settle();expect(fixture.componentInstance.id).toBe(2);expect(fixture.componentInstance.changes).toBe(2);
 });
 it('preserves reactive object values, reset, touched and disabled states',async()=>{
  const popup=popups()[1];popup.selected.emit(popup.options[1].value);await settle();expect(fixture.componentInstance.control.value).toBe(fixture.componentInstance.rows[0]);
  popup.touched.emit();expect(fixture.componentInstance.control.touched).toBeTrue();
  fixture.componentInstance.control.disable();await settle();expect(popup.disabled).toBeTrue();
  fixture.componentInstance.control.enable();fixture.componentInstance.control.reset();await settle();expect(popup.options.find(x=>x.value===popup.value)?.label).toBe('Choose');
 });
 it('updates after API lists change and refuses disabled options',async()=>{
  const popup=popups()[0];popup.selected.emit(popup.options[2].value);await settle();expect(fixture.componentInstance.id).toBe(2);
  fixture.componentInstance.rows=[{id:7,name:'Gamma',disabled:false}];fixture.componentInstance.id=7;await settle();expect(popup.options.map(x=>x.label)).toEqual(['All employees','Gamma']);expect(popup.options.find(x=>x.value===popup.value)?.label).toBe('Gamma');
 });
 it('renders an in-popup search and leaves static selects native',async()=>{
  expect(fixture.nativeElement.querySelector('select.static').style.display).toBe('');expect(popups().length).toBe(2);
  fixture.nativeElement.querySelector('app-api-select-popup .p-select').click();await settle();
  const input=document.body.querySelector<HTMLInputElement>('.p-select-filter');expect(input).not.toBeNull();
  input!.value='Beta';input!.dispatchEvent(new Event('input'));await settle();
  const labels=Array.from(document.body.querySelectorAll('.p-select-option')).map(x=>x.textContent?.trim());expect(labels).toEqual(['Beta']);
 });
});
