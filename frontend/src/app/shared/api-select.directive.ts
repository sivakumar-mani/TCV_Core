import { AfterViewChecked, AfterViewInit, Component, ComponentRef, Directive, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewContainerRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';

interface SearchOption { label: string; value: string; disabled: boolean; }
@Component({
  selector: 'app-api-select-popup',
  standalone: true,
  imports: [FormsModule, SelectModule],
  template: `<p-select [options]="options" optionLabel="label" optionValue="value" optionDisabled="disabled"
    [ngModel]="value" [ngModelOptions]="{standalone:true}" (onChange)="selected.emit($event.value)"
    (onBlur)="touched.emit()" [disabled]="disabled" [filter]="true" filterBy="label"
    [resetFilterOnHide]="true" [ariaLabel]="label" [placeholder]="label" appendTo="body"
    [style]="{width:'100%',minWidth:'0'}"></p-select>`,
  styles: [':host{display:block;min-width:0;width:100%;font-size:inherit}']
})
export class ApiSelectPopup {
  @Input() options: SearchOption[] = [];
  @Input() value: string | null = null;
  @Input() disabled = false;
  @Input() label = 'Select';
  @Output() selected = new EventEmitter<string>();
  @Output() touched = new EventEmitter<void>();
}

/** Keeps Angular's native select accessor (including ngValue object/number mapping).
 * Only explicitly marked API-backed selects receive the searchable presentation.
 */
@Directive({selector:'select[appApiSelect]',standalone:true})
export class ApiSelectDirective implements AfterViewInit, AfterViewChecked, OnDestroy {
  private popup?: ComponentRef<ApiSelectPopup>;
  private observer?: MutationObserver;
  private destroyed = false;
  private signature = '';
  private originalDisplay = '';
  private originalAria: string | null = null;
  constructor(private element:ElementRef<HTMLSelectElement>,private container:ViewContainerRef) {}
  ngAfterViewInit() {
    const native=this.element.nativeElement;
    // Multi-selects have different interaction semantics; do not change them.
    if(native.multiple)return;
    this.popup=this.container.createComponent(ApiSelectPopup);
    this.popup.instance.selected.subscribe(value=>{
      if(native.disabled)return;
      const option=Array.from(native.options).find(x=>x.value===value);
      if(!option||option.disabled)return;
      native.value=value;
      native.dispatchEvent(new Event('change',{bubbles:true}));
      this.schedule();
    });
    this.popup.instance.touched.subscribe(()=>native.dispatchEvent(new Event('blur')));
    this.originalDisplay=native.style.display;this.originalAria=native.getAttribute('aria-hidden');
    native.style.display='none';native.setAttribute('aria-hidden','true');
    this.observer=new MutationObserver(()=>this.schedule());
    this.observer.observe(native,{childList:true,subtree:true,attributes:true,characterData:true});
    this.schedule();
  }
  ngAfterViewChecked(){this.schedule();}
  private schedule(){
    if(!this.popup||this.destroyed)return;
    const native=this.element.nativeElement;
    const options=Array.from(native.options).map(x=>({label:x.textContent?.trim()||'',value:x.value,disabled:x.disabled||(x.parentElement instanceof HTMLOptGroupElement && x.parentElement.disabled)}));
    const labelText=Array.from(native.labels?.[0]?.childNodes||[]).filter(x=>x.nodeType===3).map(x=>x.textContent).join(' ').trim();
    const label=native.getAttribute('aria-label')||labelText||native.getAttribute('name')||'Select';
    const value=native.selectedIndex<0?null:native.value;
    const signature=JSON.stringify([options,value,native.disabled,label]);
    if(signature===this.signature)return;
    this.signature=signature;
    // Queue only actual changes, avoiding a change-detection/microtask loop.
    queueMicrotask(()=>{
      if(this.destroyed||signature!==this.signature)return;
      this.popup!.setInput('options',options);this.popup!.setInput('value',value);
      this.popup!.setInput('disabled',native.disabled);this.popup!.setInput('label',label);
    });
  }
  ngOnDestroy(){
    this.destroyed=true;this.observer?.disconnect();this.popup?.destroy();
    const native=this.element.nativeElement;native.style.display=this.originalDisplay;
    if(this.originalAria===null)native.removeAttribute('aria-hidden');else native.setAttribute('aria-hidden',this.originalAria);
  }
}
