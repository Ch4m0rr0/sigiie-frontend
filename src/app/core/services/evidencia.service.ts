import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import type { Evidencia, EvidenciaCreate } from '../models/evidencia';

@Injectable({ providedIn: 'root' })
export class EvidenciaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/evidencias`;

  getBaseUrl(): string {
    return environment.apiUrl;
  }

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
    // Crear evidencia SIN archivo no está soportado por el backend (CreateAsync lanza error)
    // Este método se deja para compatibilidad pero siempre debe usarse junto con upload()
    return this.http.post<any>(this.apiUrl, data).pipe(
      map(item => this.mapEvidencia(item))
    );
  }

  update(id: number, data: Partial<EvidenciaCreate>, file?: File): Observable<void> {
    // El backend de actualización espera datos como formulario (multipart/form-data),
    // aunque no se envíe un archivo nuevo.
    const formData = new FormData();

    // Si hay un archivo nuevo, agregarlo
    if (file) {
      formData.append('Archivo', file);
    }

    if (data.idProyecto !== undefined && data.idProyecto !== null) {
      formData.append('IdProyecto', String(data.idProyecto));
    }
    if (data.idActividad !== undefined && data.idActividad !== null) {
      formData.append('IdActividad', String(data.idActividad));
    }
    if (data.idSubactividad !== undefined && data.idSubactividad !== null) {
      formData.append('IdSubactividad', String(data.idSubactividad));
    }
    if (data.descripcion) {
      formData.append('Descripcion', data.descripcion);
    }
    if (data.idTipoEvidencia !== undefined && data.idTipoEvidencia !== null) {
      formData.append('IdTipoEvidencia', String(data.idTipoEvidencia));
    }
    if (data.fechaEvidencia) {
      const fecha =
        typeof data.fechaEvidencia === 'string'
          ? data.fechaEvidencia
          : new Date(data.fechaEvidencia).toISOString().split('T')[0];
      formData.append('FechaEvidencia', fecha);
    }
    if (data.seleccionadaParaReporte !== undefined) {
      formData.append('SeleccionadaParaReporte', String(data.seleccionadaParaReporte));
    }
    if (data.tipo) {
      formData.append('Tipo', data.tipo);
    }

    return this.http.put<void>(`${this.apiUrl}/${id}`, formData);
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

  /**
   * Obtiene la URL para descargar/ver el archivo de una evidencia
   * Intenta varios endpoints posibles
   */
  getFileUrl(id: number): string {
    return `${this.apiUrl}/${id}/imagen`;
  }

  /**
   * Obtiene el archivo de una evidencia como blob
   * NOTA: Este método está deshabilitado porque el backend no tiene estos endpoints implementados.
   * Se usa directamente rutaArchivo para construir la URL de la imagen.
   */
  getFileAsBlob(id: number): Observable<Blob> {
    // Este método ya no se usa, pero se mantiene por compatibilidad
    // El backend no tiene endpoints para obtener archivos, se usa rutaArchivo directamente
    return new Observable(observer => {
      observer.error(new Error('Endpoint no disponible. Usar rutaArchivo directamente.'));
    });
  }

  upload(file: File, data: EvidenciaCreate): Observable<Evidencia> {
    const formData = new FormData();

    // El backend espera "Archivo" (y/o "Archivos") en EvidenciaCreateDto
    formData.append('Archivo', file);

    // Mapear campos al DTO del backend (case-insensitive, pero usamos PascalCase por claridad)
    if (data.idProyecto !== undefined && data.idProyecto !== null) {
      formData.append('IdProyecto', String(data.idProyecto));
    }
    if (data.idActividad !== undefined && data.idActividad !== null) {
      formData.append('IdActividad', String(data.idActividad));
    }
    if (data.idSubactividad !== undefined && data.idSubactividad !== null) {
      formData.append('IdSubactividad', String(data.idSubactividad));
    }
    if (data.descripcion) {
      formData.append('Descripcion', data.descripcion);
    }
    if (data.idTipoEvidencia !== undefined && data.idTipoEvidencia !== null) {
      formData.append('IdTipoEvidencia', String(data.idTipoEvidencia));
    }
    if (data.fechaEvidencia) {
      const fecha =
        typeof data.fechaEvidencia === 'string'
          ? data.fechaEvidencia
          : new Date(data.fechaEvidencia).toISOString().split('T')[0];
      formData.append('FechaEvidencia', fecha);
    }
    formData.append(
      'SeleccionadaParaReporte',
      String(data.seleccionadaParaReporte ?? false)
    );

    // El backend expone [HttpPost] en /api/evidencias (no /upload)
    return this.http.post<any>(this.apiUrl, formData).pipe(
      map(item => this.mapEvidencia(item))
    );
  }

  private mapEvidencia(item: any): Evidencia {
    // Mapear seleccionadaParaReporte asegurándonos de que siempre sea un booleano
    let seleccionadaParaReporte = false;
    if (item.seleccionadaParaReporte !== undefined) {
      seleccionadaParaReporte = Boolean(item.seleccionadaParaReporte);
    } else if (item.SeleccionadaParaReporte !== undefined) {
      seleccionadaParaReporte = Boolean(item.SeleccionadaParaReporte);
    } else if (item.seleccionadaParaReporte === null || item.SeleccionadaParaReporte === null) {
      seleccionadaParaReporte = false;
    }

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
      seleccionadaParaReporte: seleccionadaParaReporte,
      tipo: item.tipo || item.Tipo,
      rutaArchivo: item.rutaArchivo || item.RutaArchivo,
      descripcion: item.descripcion || item.Descripcion,
      fechaSubida: item.fechaSubida || item.FechaSubida
    };
  }
}

