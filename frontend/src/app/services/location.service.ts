import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private apiUrl = '/api/locations'; // Adjust based on your backend URL

  constructor(private http: HttpClient) { }

  /**
   * Get all states
   */
  getStates(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/db/states`);
  }

  /**
   * Get districts by state ID
   */
  getDistrictsByState(stateId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/db/districts/${stateId}`);
  }

  /**
   * Get all states with their districts
   */
  getStatesWithDistricts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/db/states-with-districts`);
  }

  /**
   * Get list of ID proof types
   */
  getIdProofTypes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/id-proof-types`);
  }

  /**
   * Get list of departments
   */
  getDepartments(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/departments`);
  }

  /**
   * Legacy method - Get states from external API
   */
  getStatesLegacy(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/states`);
  }

  /**
   * Legacy method - Get districts from external API
   */
  getDistrictsLegacy(stateId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/districts/${stateId}`);
  }
}
