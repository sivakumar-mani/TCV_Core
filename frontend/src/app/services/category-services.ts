import { inject, Injectable } from '@angular/core';
import { HttpHeaders, HttpClient } from '@angular/common/http'; 
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class CategoryServices {
   url = environment.apiUrl;
   http = inject(HttpClient);
   private endpoint = `${this.url}/v1/categories`;

    getCategory(){
      return this.http.get(this.endpoint);
    }
 deleteCategory(id: number) {
    return this.http.delete(`${this.endpoint}/${id}`);
  }

  addCategory(data: any) {
    return this.http.post(this.endpoint, data,{
      headers : new HttpHeaders().set('content-type', "application/json")
     })
  }

  updateCategory(data:any){
    return this.http.patch(this.endpoint, data, {
      headers: new HttpHeaders().set('content-type', "application/json")
    })
  }

    getCategoryById(parentId:any){
    return this.http.get(`${this.endpoint}/${parentId}`)
  }
  // claude
  // updateCategory(id: number, payload: any): Observable<any> {
  //   return this.http.put(`${this.apiUrl}/${id}`, payload);
  // }

  // deleteCategory(id: number): Observable<any> {
  //   return this.http.delete(`${this.apiUrl}/${id}`);
  // }
}
