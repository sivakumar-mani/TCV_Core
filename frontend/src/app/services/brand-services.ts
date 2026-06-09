import { inject, Injectable } from '@angular/core';
import { HttpHeaders, HttpClient } from '@angular/common/http'; 
import { environment } from '../../environments/environment.development';
@Injectable({
  providedIn: 'root',
})
export class BrandServices {
   url = environment.apiUrl
   http = inject(HttpClient)
   private endpoint = `${this.url}/v1/brands`;

    getBrands(){
      return this.http.get(this.endpoint);
    }

    addBrands(data:any){
      return this.http.post(this.endpoint, data,{
        headers : new HttpHeaders().set('content-type',"application/json")
      })
    }

    updateBrand(data:any){
      return this.http.patch(this.endpoint,data,{
        headers: new HttpHeaders().set('content-type',"application/json")
      } )
    }

    deleteBrand(data:any){
      return this.http.delete(this.endpoint,{
        body: data,
         headers: new HttpHeaders().set('content-type',"application/json")
      })
    }
}
