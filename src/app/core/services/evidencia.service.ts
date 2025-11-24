import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import type { Evidencia, EvidenciaCreate } from '../models/evidencia';

@Injectable({ providedIn: 'root' })
export class EvidenciaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/evidencias`;

  getAll(): Observable<Evidencia[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapEvidencia(item)) : [];
      }),
      catchError(error => {
        // Silenciar errores 404 si el endpoint no existe aún
        if (error.status !== 404) {
          console.error('Error fetching evidencias:', error);
        }
        return of([]);
      })
    );
  }

  getById(id: number): Observable<Evidencia> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(item => this.mapEvidencia(item))
    );
  }

  create(data: EvidenciaCreate): Observable<Evidencia> {
    return this.http.post<any>(this.apiUrl, data).pipe(
      map(item => this.mapEvidencia(item))
    );
  }

  update(id: number, data: Partial<EvidenciaCreate>): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // NUEVOS MÉTODOS
  getBySubactividad(subactividadId: number): Observable<Evidencia[]> {
    return this.http.get<any>(`${this.apiUrl}/por-subactividad/${subactividadId}`).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapEvidencia(item)) : [];
      }),
      catchError(error => {
        console.error('Error fetching evidencias por subactividad:', error);
        return of([]);
      })
    );
  }

  getSeleccionadasParaReporte(actividadId?: number): Observable<Evidencia[]> {
    let params = new HttpParams();
    if (actividadId) {
      params = params.set('actividadId', actividadId.toString());
    }
    return this.http.get<any>(`${this.apiUrl}/seleccionadas-para-reporte`, { params }).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapEvidencia(item)) : [];
      }),
      catchError(error => {
        console.error('Error fetching evidencias seleccionadas:', error);
        return of([]);
      })
    );
  }

  marcarParaReporte(id: number, seleccionada: boolean): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/marcar-para-reporte`, { seleccionada });
  }

  upload(file: File, data: EvidenciaCreate): Observable<Evidencia> {
    const formData = new FormData();
    formData.append('file', file);
    Object.keys(data).forEach(key => {
      if (data[key as keyof EvidenciaCreate] !== null && data[key as keyof EvidenciaCreate] !== undefined) {
        formData.append(key, String(data[key as keyof EvidenciaCreate]));
      }
    });
    return this.http.post<any>(`${this.apiUrl}/upload`, formData).pipe(
      map(item => this.mapEvidencia(item))
    );
  }

  download(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/descargar`, { responseType: 'blob' });
  }

  private mapEvidencia(item: any): Evidencia {
    return {
      idEvidencia: item.idEvidencia || item.IdEvidencia || item.id,
      id: item.idEvidencia || item.IdEvidencia || item.id,
      idProyecto: item.idProyecto || item.IdProyecto,
      idActividad: item.idActividad || item.IdActividad,
      idSubactividad: item.idSubactividad || item.IdSubactividad,
      nombreSubactividad: item.nombreSubactividad || item.NombreSubactividad,
      idTipoEvidencia: item.idTipoEvidencia || item.IdTipoEvidencia,
      nombreTipoEvidencia: item.nombreTipoEvidencia || item.NombreTipoEvidencia,
      fechaEvidencia: item.fechaEvidencia || item.FechaEvidencia,
      seleccionadaParaReporte: item.seleccionadaParaReporte !== undefined 
        ? item.seleccionadaParaReporte 
        : (item.SeleccionadaParaReporte !== undefined ? item.SeleccionadaParaReporte : false),
      tipo: item.tipo || item.Tipo,
      rutaArchivo: item.rutaArchivo || item.RutaArchivo,
      descripcion: item.descripcion || item.Descripcion,
      fechaSubida: item.fechaSubida || item.FechaSubida
    };
  }
}

