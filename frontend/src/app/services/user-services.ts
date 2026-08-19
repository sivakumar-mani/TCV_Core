import { Injectable } from '@angular/core';
import { appConfig } from '../app-config';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { loginData, forgotPasswordData, changePasswordData, signupInterface, deleteUserData  } from '../interfaces/user-interface'

@Injectable({
  providedIn: 'root',
})
export class UserServices {
  url =appConfig.apiUrl;

  constructor( private http: HttpClient){}

  login( data: loginData){
   return this.http.post(`${this.url}/user/login`, data,{
      headers: new HttpHeaders().set('content-type', "application/json")
    })
  }

  getCaptcha() {
    return this.http.get<{ question: string; token: string; expiresAt: number }>(`${this.url}/user/captcha`, {
      params: { t: String(Date.now()) },
      headers: new HttpHeaders()
        .set('Cache-Control', 'no-cache')
        .set('Pragma', 'no-cache')
    });
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

  userDelete(data:deleteUserData){
    return this.http.delete(`${this.url}/user/deleteUser`, {
    body: data,
    headers: new HttpHeaders().set('content-type', 'application/json')
  });
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
