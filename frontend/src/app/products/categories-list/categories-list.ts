import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { Snackbar } from '../../services/snackbar';
import { CategoryServices } from '../../services/category-services';
import { NgxUiLoaderService } from 'ngx-ui-loader';
import { Router } from '@angular/router';

@Component({
  selector: 'app-categories-list',
  imports: [],
  templateUrl: './categories-list.html',
  styleUrl: './categories-list.scss',
})
export class CategoriesList {

 categories:any []=[];
 http = inject(HttpClient);
 
 constructor( private snackBarService: Snackbar,
  private categoryService : CategoryServices,
  private ngxLoader: NgxUiLoaderService,
  private router: Router
 ){}
}
