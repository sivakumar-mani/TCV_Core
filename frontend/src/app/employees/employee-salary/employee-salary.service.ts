import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EmployeeSalaryService {
  private apiUrl = '/api/employee-salary'; // Adjust based on your backend URL

  constructor(private http: HttpClient) { }

  /**
   * Get all salary records for an employee
   */
  getSalaryByEmployee(employeeId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/employee/${employeeId}`);
  }

  /**
   * Get salary slip details with items
   */
  getSalarySlip(salaryId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${salaryId}`);
  }

  /**
   * Add new salary record
   */
  addSalary(salaryData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}`, salaryData);
  }

  /**
   * Update salary record
   */
  updateSalary(salaryId: number, salaryData: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${salaryId}`, salaryData);
  }

  /**
   * Delete salary record
   */
  deleteSalary(salaryId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${salaryId}`);
  }

  /**
   * Get salary summary for employee
   */
  getSalarySummary(employeeId: number, year?: number): Observable<any[]> {
    let url = `${this.apiUrl}/summary?employee_id=${employeeId}`;
    if (year) {
      url += `&year=${year}`;
    }
    return this.http.get<any[]>(url);
  }
}
