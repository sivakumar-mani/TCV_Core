import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  url = environment.apiUrl;
  http = inject(HttpClient);

  getProduct(){
    return this.http.get(`${this.url}/product/get`);
  }

  addProduct(data:any){
    return this.http.post(`${this.url}/product/add`, data, {
      headers : new HttpHeaders().set('content-type', "application/json")
    })
  }
}
