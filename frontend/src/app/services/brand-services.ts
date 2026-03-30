import { inject, Injectable } from '@angular/core';
import { HttpHeaders, HttpClient } from '@angular/common/http'; 
import { environment } from '../../environments/environment.development';
@Injectable({
  providedIn: 'root',
})
export class BrandServices {
   url = environment.apiUrl
   http = inject(HttpClient)

    getBrands(){
      return this.http.get(`${this.url}/brand/get`);
    }

    addBrands(data:any){
      return this.http.post(`${this.url}/brand/add`, data,{
        headers : new HttpHeaders().set('content-type',"application/json")
      })
    }
}
