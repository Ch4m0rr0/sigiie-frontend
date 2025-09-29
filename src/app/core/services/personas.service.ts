import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { Estudiante } from '../models/estudiante';
import type { Docente } from '../models/docente';
import type { Administrativo } from '../models/administrativo';

@Injectable({ providedIn: 'root' })
export class PersonasService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}`;

  // Estudiantes
  listEstudiantes(): Observable<Estudiante[]> {
    return this.http.get<Estudiante[]>(`${this.apiUrl}/estudiantes`);
  }

  getEstudiante(id: number): Observable<Estudiante> {
    return this.http.get<Estudiante>(`${this.apiUrl}/estudiantes/${id}`);
  }

  createEstudiante(estudiante: Omit<Estudiante, 'id'>): Observable<Estudiante> {
    return this.http.post<Estudiante>(`${this.apiUrl}/estudiantes`, estudiante);
  }

  updateEstudiante(id: number, estudiante: Partial<Estudiante>): Observable<Estudiante> {
    return this.http.put<Estudiante>(`${this.apiUrl}/estudiantes/${id}`, estudiante);
  }

  deleteEstudiante(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/estudiantes/${id}`);
  }

  getHistorialEstados(id: number): Observable<any[]> { // Ajustar tipo según backend
    return this.http.get<any[]>(`${this.apiUrl}/estudiantes/${id}/historial-estados`);
  }

  // Docentes
  listDocentes(): Observable<Docente[]> {
    return this.http.get<Docente[]>(`${this.apiUrl}/docentes`);
  }

  getDocente(id: number): Observable<Docente> {
    return this.http.get<Docente>(`${this.apiUrl}/docentes/${id}`);
  }

  createDocente(docente: Omit<Docente, 'id'>): Observable<Docente> {
    return this.http.post<Docente>(`${this.apiUrl}/docentes`, docente);
  }

  updateDocente(id: number, docente: Partial<Docente>): Observable<Docente> {
    return this.http.put<Docente>(`${this.apiUrl}/docentes/${id}`, docente);
  }

  activarDesactivarDocente(id: number, activo: boolean): Observable<Docente> {
    return this.http.patch<Docente>(`${this.apiUrl}/docentes/${id}/activo`, { activo });
  }

  deleteDocente(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/docentes/${id}`);
  }

  // Administrativos
  listAdministrativos(): Observable<Administrativo[]> {
    return this.http.get<Administrativo[]>(`${this.apiUrl}/administrativos`);
  }

  getAdministrativo(id: number): Observable<Administrativo> {
    return this.http.get<Administrativo>(`${this.apiUrl}/administrativos/${id}`);
  }

  createAdministrativo(administrativo: Omit<Administrativo, 'id'>): Observable<Administrativo> {
    return this.http.post<Administrativo>(`${this.apiUrl}/administrativos`, administrativo);
  }

  updateAdministrativo(id: number, administrativo: Partial<Administrativo>): Observable<Administrativo> {
    return this.http.put<Administrativo>(`${this.apiUrl}/administrativos/${id}`, administrativo);
  }

  deleteAdministrativo(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/administrativos/${id}`);
  }
}
