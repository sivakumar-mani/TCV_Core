import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { loginData, forgotPasswordData, changePasswordData, signupInterface  } from '../interfaces/user-interface'

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

 signup( data:signupInterface ){
  return this.http.post(`${this.url}/user/signup`, data,{
    headers: new HttpHeaders().set('content-type', "application/json")
  })
 }

 userEdit( data: signupInterface){
  return this.http.patch(`${this.url}/user/editUser`, data,{
    headers : new HttpHeaders().set('content-type',"application/json")
  })
 }

  getAllusers(){
    return this.http.get(`${this.url}/user/get`);
  }

  forgotPassword(data:forgotPasswordData){
    return this.http.post(`${this.url}/user/forgotPassword`, data,{
      headers: new HttpHeaders().set('content-type',"application/json")
    })
  }

  changePassword(data:changePasswordData){
    return this.http.post(`${this.url}/user/changePassword`,data,{
      headers: new HttpHeaders().set('content-type',"application/json")
    })
  }
}
