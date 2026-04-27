import { inject, Injectable } from '@angular/core';
import { HttpHeaders, HttpClient } from '@angular/common/http'; 
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class CategoryServices {
   url = environment.apiUrl;
   http = inject(HttpClient);

    getCategory(){
      return this.http.get(`${this.url}/category/get`);
    }
 deleteCategory(id: number) {
    return this.http.delete(`${this.url}/category/delete/${id}`);
  }

  updateCategory(data: any) {
    return this.http.put(`${this.url}/category/update/${data.category_id}`, data);
  }
  // claude
  // updateCategory(id: number, payload: any): Observable<any> {
  //   return this.http.put(`${this.apiUrl}/${id}`, payload);
  // }

  // deleteCategory(id: number): Observable<any> {
  //   return this.http.delete(`${this.apiUrl}/${id}`);
  // }
}
