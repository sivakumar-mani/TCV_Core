import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { loginData, forgotPasswordData } from '../interfaces/user-interface'

@Injectable({
  providedIn: 'root',
})
export class UserServices {
  url =environment.apiUrl;

  constructor( private http: HttpClient){}

  login( data: loginData){
   return this.http.post(`${this.url}/user/login`, data,{
      headers: new HttpHeaders().set('content-type', "application/json")
    })
  }

  forgotPassword(data:forgotPasswordData){
    return this.http.post(`${this.url}/user/forgotPassword`, data,{
      headers: new HttpHeaders().set('content-type',"application/json")
    })
  }
}
