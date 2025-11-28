import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import type { ActividadMensualInst, ActividadMensualInstCreate, ActividadMensualInstUpdate, ActividadMensualInstFilterDto } from '../models/actividad-mensual-inst';

@Injectable({ providedIn: 'root' })
export class ActividadMensualInstService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/actividades-mensuales-institucionales`;

  getAll(filters?: ActividadMensualInstFilterDto): Observable<ActividadMensualInst[]> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.idActividadAnual !== undefined) {
        params = params.set('IdActividadAnual', filters.idActividadAnual.toString());
      }
      if (filters.mes !== undefined) {
        params = params.set('Mes', filters.mes.toString());
      }
      if (filters.anio !== undefined) {
        params = params.set('Anio', filters.anio.toString());
      }
      if (filters.idIndicador !== undefined) {
        params = params.set('IdIndicador', filters.idIndicador.toString());
      }
      if (filters.activo !== undefined) {
        params = params.set('Activo', filters.activo.toString());
      }
    }

    return this.http.get<any>(this.apiUrl, { params }).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapActividadMensualInst(item)) : [];
      }),
      catchError(error => {
        if (error.status === 404) {
          console.warn('⚠️ Endpoint /api/actividades-mensuales-institucionales no encontrado (404)');
          return of([]);
        } else {
          console.error('❌ Error fetching actividades mensuales institucionales:', error);
          return of([]);
        }
      })
    );
  }

  getById(id: number): Observable<ActividadMensualInst | null> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(response => {
        const item = response.data || response;
        if (!item) return null;
        return this.mapActividadMensualInst(item);
      }),
      catchError(error => {
        if (error.status === 404) {
          console.warn('⚠️ ActividadMensualInst no encontrada (404)');
          return of(null);
        }
        console.error('❌ Error fetching actividad mensual institucional:', error);
        throw error;
      })
    );
  }

  create(data: ActividadMensualInstCreate): Observable<ActividadMensualInst> {
    // Validar y asegurar que los campos requeridos tengan valores válidos
    if (data.idActividadAnual === null || data.idActividadAnual === undefined) {
      throw new Error('idActividadAnual es requerido');
    }
    if (data.mes === null || data.mes === undefined) {
      throw new Error('mes es requerido');
    }

    // Convertir a PascalCase para el backend
    const payload: any = {
      IdActividadAnual: Number(data.idActividadAnual), // Asegurar que sea número
      Mes: Number(data.mes), // Asegurar que sea número
      Activo: data.activo !== undefined ? data.activo : true
    };
    
    // Agregar campos opcionales solo si están presentes
    if (data.nombre !== undefined && data.nombre !== null && data.nombre.trim() !== '') {
      payload.Nombre = data.nombre.trim();
    }
    if (data.descripcion !== undefined && data.descripcion !== null && data.descripcion.trim() !== '') {
      payload.Descripcion = data.descripcion.trim();
    }
    if (data.metaMensual !== undefined && data.metaMensual !== null) payload.MetaMensual = Number(data.metaMensual);
    if (data.metaAlcanzada !== undefined && data.metaAlcanzada !== null) payload.MetaAlcanzada = Number(data.metaAlcanzada);
    if (data.porcentajeCumplimiento !== undefined && data.porcentajeCumplimiento !== null) payload.PorcentajeCumplimiento = Number(data.porcentajeCumplimiento);
    if (data.valoracionCualitativa !== undefined && data.valoracionCualitativa !== null && data.valoracionCualitativa.trim() !== '') {
      payload.ValoracionCualitativa = data.valoracionCualitativa.trim();
    }
    if (data.brechas !== undefined && data.brechas !== null && data.brechas.trim() !== '') {
      payload.Brechas = data.brechas.trim();
    }
    if (data.evidenciaResumen !== undefined && data.evidenciaResumen !== null && data.evidenciaResumen.trim() !== '') {
      payload.EvidenciaResumen = data.evidenciaResumen.trim();
    }

    console.log('🔄 CREATE ActividadMensualInst - Payload enviado:', JSON.stringify(payload, null, 2));
    console.log('🔄 CREATE ActividadMensualInst - URL:', this.apiUrl);

    return this.http.post<any>(this.apiUrl, payload).pipe(
      map(response => {
        const item = response.data || response;
        if (!item) {
          throw new Error('No se recibió respuesta del servidor');
        }
        return this.mapActividadMensualInst(item);
      }),
      catchError(error => {
        console.error('❌ Error creating actividad mensual institucional:', error);
        console.error('❌ Error status:', error.status);
        console.error('❌ Error message:', error.message);
        if (error.error) {
          console.error('❌ Error body:', error.error);
          if (error.error.errors) {
            console.error('❌ Validation errors:', error.error.errors);
          }
        }
        throw error;
      })
    );
  }

  update(id: number, data: ActividadMensualInstUpdate): Observable<ActividadMensualInst> {
    // Convertir a PascalCase para el backend
    const payload: any = {};
    if (data.idActividadAnual !== undefined) payload.IdActividadAnual = data.idActividadAnual;
    if (data.mes !== undefined) payload.Mes = data.mes;
    if (data.nombre !== undefined) payload.Nombre = data.nombre;
    if (data.descripcion !== undefined) payload.Descripcion = data.descripcion;
    if (data.metaMensual !== undefined) payload.MetaMensual = data.metaMensual;
    if (data.metaAlcanzada !== undefined) payload.MetaAlcanzada = data.metaAlcanzada;
    if (data.porcentajeCumplimiento !== undefined) payload.PorcentajeCumplimiento = data.porcentajeCumplimiento;
    if (data.valoracionCualitativa !== undefined) payload.ValoracionCualitativa = data.valoracionCualitativa;
    if (data.brechas !== undefined) payload.Brechas = data.brechas;
    if (data.evidenciaResumen !== undefined) payload.EvidenciaResumen = data.evidenciaResumen;
    if (data.activo !== undefined) payload.Activo = data.activo;

    return this.http.put<any>(`${this.apiUrl}/${id}`, payload).pipe(
      map(response => {
        const item = response.data || response;
        if (!item) {
          // Si la respuesta es null, devolver un objeto con los datos originales
          return {
            idActividadMensualInst: id,
            idActividadAnual: data.idActividadAnual || 0,
            mes: data.mes || 0,
            metaMensual: data.metaMensual,
            metaAlcanzada: data.metaAlcanzada,
            porcentajeCumplimiento: data.porcentajeCumplimiento,
            valoracionCualitativa: data.valoracionCualitativa,
            brechas: data.brechas,
            evidenciaResumen: data.evidenciaResumen,
            activo: data.activo !== undefined ? data.activo : true
          } as ActividadMensualInst;
        }
        return this.mapActividadMensualInst(item);
      }),
      catchError(error => {
        console.error('❌ Error updating actividad mensual institucional:', error);
        throw error;
      })
    );
  }

  delete(id: number): Observable<boolean> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(
      map(() => true),
      catchError(error => {
        console.error('❌ Error deleting actividad mensual institucional:', error);
        throw error;
      })
    );
  }

  getByActividadAnual(idActividadAnual: number): Observable<ActividadMensualInst[]> {
    return this.getAll({ idActividadAnual });
  }

  getByMes(mes: number, anio?: number): Observable<ActividadMensualInst[]> {
    return this.getAll({ mes, anio });
  }

  private mapActividadMensualInst(item: any): ActividadMensualInst {
    const meses = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const mes = item.mes || item.Mes || 0;
    
    return {
      idActividadMensualInst: item.idActividadMensualInst || item.IdActividadMensualInst || item.Id || item.id || 0,
      idActividadAnual: item.idActividadAnual || item.IdActividadAnual || 0,
      mes: mes,
      nombre: item.nombre || item.Nombre, // Campo de la tabla SQL
      descripcion: item.descripcion || item.Descripcion, // Campo de la tabla SQL
      nombreMes: meses[mes] || item.nombreMes || item.NombreMes,
      metaMensual: item.metaMensual !== undefined ? item.metaMensual : (item.MetaMensual !== undefined ? item.MetaMensual : undefined),
      metaAlcanzada: item.metaAlcanzada !== undefined ? item.metaAlcanzada : (item.MetaAlcanzada !== undefined ? item.MetaAlcanzada : undefined),
      porcentajeCumplimiento: item.porcentajeCumplimiento !== undefined ? item.porcentajeCumplimiento : (item.PorcentajeCumplimiento !== undefined ? item.PorcentajeCumplimiento : undefined),
      valoracionCualitativa: item.valoracionCualitativa || item.ValoracionCualitativa,
      brechas: item.brechas || item.Brechas,
      evidenciaResumen: item.evidenciaResumen || item.EvidenciaResumen,
      activo: item.activo !== undefined ? item.activo : (item.Activo !== undefined ? item.Activo : true),
      creadoPor: item.creadoPor || item.CreadoPor, // Campo de la tabla SQL
      fechaCreacion: item.fechaCreacion || item.FechaCreacion,
      fechaModificacion: item.fechaModificacion || item.FechaModificacion,
      actividadAnual: item.actividadAnual || item.ActividadAnual ? {
        idActividadAnual: item.actividadAnual?.idActividadAnual || item.ActividadAnual?.IdActividadAnual || 0,
        idIndicador: item.actividadAnual?.idIndicador || item.ActividadAnual?.IdIndicador || 0,
        anio: item.actividadAnual?.anio || item.ActividadAnual?.Anio || 0,
        nombreIndicador: item.actividadAnual?.nombreIndicador || item.ActividadAnual?.NombreIndicador
      } : undefined
    };
  }
}

