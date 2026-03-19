import { DatePipe, JsonPipe, NgClass, TitleCasePipe } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatDialogActions, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
@Component({
  selector: 'app-view-user',
  imports: [MatDialogActions, MatDialogModule,    TitleCasePipe],
  templateUrl: './view-user.html',
  styleUrl: './view-user.scss',
})
export class ViewUser {
  constructor( @Inject(MAT_DIALOG_DATA) public data:any){
  }

}