import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/dashboard`;

  /**
   * GET /api/dashboard/resumen-general
   * Obtiene el resumen general del dashboard
   */
  getResumenGeneral(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/resumen-general`);
  }

  /**
   * GET /api/dashboard/datos-tendencia
   * Obtiene los datos de tendencia para gráficos
   */
  getDatosTendencia(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/datos-tendencia`);
  }

  /**
   * GET /api/dashboard/vista-especial-metricas
   * Obtiene métricas especiales para el dashboard
   */
  getVistaEspecialMetricas(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/vista-especial-metricas`);
  }

  /**
   * GET /api/dashboard/vista-especial-rendimiento
   * Obtiene datos de rendimiento especiales para el dashboard
   */
  getVistaEspecialRendimiento(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/vista-especial-rendimiento`);
  }
}

