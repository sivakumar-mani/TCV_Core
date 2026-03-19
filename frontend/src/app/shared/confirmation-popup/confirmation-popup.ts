import { NgIf } from '@angular/common';
import { Component, EventEmitter, Inject } from '@angular/core';
import { MAT_DIALOG_DATA ,MatDialogModule, MatDialogActions, MatDialogRef} from '@angular/material/dialog';

@Component({
  selector: 'app-confirmation-popup',
  imports: [MatDialogModule, MatDialogActions],
  templateUrl: './confirmation-popup.html',
  styleUrl: './confirmation-popup.scss',
})
export class ConfirmationPopup {
  onEmitStatusChange = new EventEmitter();
  details: any
  constructor(@Inject(MAT_DIALOG_DATA) public dialogData: any, 
private dialogConfig : MatDialogRef<ConfirmationPopup>){}

  ngOnInit(){
    if(this.dialogData){
      this.details = this.dialogData
    }
  }
  handleSubmit(){
    this.onEmitStatusChange.emit()
  }
}
