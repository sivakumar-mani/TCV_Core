import { inject, Injectable } from '@angular/core';
import { appConfig } from '../app-config';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  url = appConfig.apiUrl;
  http = inject(HttpClient);
  private endpoint = `${this.url}/v1/products`;

  getProduct(){
    return this.http.get(this.endpoint);
  }

  addProduct(data:any){
    return this.http.post(this.endpoint, data, {
      headers : new HttpHeaders().set('content-type', "application/json")
    })
  }
  updateProduct(data:any){
    return this.http.patch(this.endpoint, data,{
      headers: new HttpHeaders().set('content-type', "application/json")
    })
  }

  deleteProduct(productId: number) {
    return this.http.delete(`${this.endpoint}/${productId}`);
  }
}
