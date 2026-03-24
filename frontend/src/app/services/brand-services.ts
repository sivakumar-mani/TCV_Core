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

}
