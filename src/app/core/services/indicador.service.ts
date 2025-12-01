import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import type { Indicador, IndicadorCreate } from '../models/indicador';

@Injectable({ providedIn: 'root' })
export class IndicadorService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/indicadores`;

  // Endpoint: /api/indicadores
  getAll(): Observable<Indicador[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapIndicador(item)) : [];
      }),
      catchError(error => {
        if (error.status === 404) {
          console.warn('⚠️ Endpoint /api/indicadores no encontrado (404)');
        } else if (error.status === 500) {
          console.error('❌ Error 500 del servidor al obtener indicadores:', error);
        } else {
          console.error('❌ Error fetching indicadores:', error);
        }
        return of([]);
      })
    );
  }

  getById(id: number): Observable<Indicador | null> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(response => {
        const item = response.data || response;
        if (!item) return null;
        return this.mapIndicador(item);
      }),
      catchError(error => {
        if (error.status === 404) {
          console.warn('⚠️ Indicador no encontrado (404)');
          return of(null);
        }
        console.error('❌ Error fetching indicador:', error);
        throw error;
      })
    );
  }

  getByCodigo(codigo: string): Observable<Indicador> {
    return this.http.get<any>(`${this.apiUrl}/por-codigo/${codigo}`).pipe(
      map(item => this.mapIndicador(item))
    );
  }

  create(data: IndicadorCreate): Observable<Indicador> {
    // Convertir a PascalCase para el backend
    const payload: any = {
      Codigo: data.codigo.trim(),
      Nombre: data.nombre.trim(),
      Activo: data.activo !== undefined ? data.activo : true
    };
    
    // Agregar campos opcionales solo si tienen valores
    if (data.descripcion !== undefined && data.descripcion !== null && data.descripcion.trim() !== '') {
      payload.Descripcion = data.descripcion.trim();
    }
    if (data.anio !== undefined && data.anio !== null) {
      payload.Anio = Number(data.anio);
    }
    if (data.meta !== undefined && data.meta !== null) {
      payload.Meta = Number(data.meta);
    }
    if (data.lineaEstrategica !== undefined && data.lineaEstrategica !== null && data.lineaEstrategica.trim() !== '') {
      payload.LineaEstrategica = data.lineaEstrategica.trim();
    }
    if (data.objetivoEstrategico !== undefined && data.objetivoEstrategico !== null && data.objetivoEstrategico.trim() !== '') {
      payload.ObjetivoEstrategico = data.objetivoEstrategico.trim();
    }
    if (data.accionEstrategica !== undefined && data.accionEstrategica !== null && data.accionEstrategica.trim() !== '') {
      payload.AccionEstrategica = data.accionEstrategica.trim();
    }
    if (data.unidadMedida !== undefined && data.unidadMedida !== null && data.unidadMedida.trim() !== '') {
      payload.UnidadMedida = data.unidadMedida.trim();
    }
    
    // Agregar IdIndicadorPadre solo si está presente (para indicadores hijos)
    if (data.idIndicadorPadre !== undefined && data.idIndicadorPadre !== null) {
      payload.IdIndicadorPadre = Number(data.idIndicadorPadre);
      // Si tiene padre, debe tener Nivel = 2 (según validación del backend)
      payload.Nivel = 2;
    } else {
      // Si no tiene padre, debe tener Nivel = 1 (según validación del backend)
      payload.Nivel = 1;
    }

    console.log('🔄 CREATE Indicador - Payload enviado:', JSON.stringify(payload, null, 2));
    console.log('🔄 CREATE Indicador - URL:', this.apiUrl);

    return this.http.post<any>(this.apiUrl, payload).pipe(
      map(response => {
        const item = response.data || response;
        console.log('✅ CREATE Indicador - Respuesta recibida:', item);
        return this.mapIndicador(item);
      }),
      catchError(error => {
        console.error('❌ Error creating indicador:', error);
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

  update(id: number, data: Partial<IndicadorCreate>): Observable<Indicador> {
    // Primero obtener el indicador actual para determinar si tiene padre
    return this.getById(id).pipe(
      switchMap(currentIndicador => {
        if (!currentIndicador) {
          throw new Error(`Indicador con ID ${id} no encontrado`);
        }

        // Convertir a PascalCase para el backend
        const payload: any = {};
        
        // Campos requeridos
        if (data.codigo !== undefined && data.codigo !== null) {
          payload.Codigo = typeof data.codigo === 'string' ? data.codigo.trim() : data.codigo;
        }
        if (data.nombre !== undefined && data.nombre !== null) {
          payload.Nombre = typeof data.nombre === 'string' ? data.nombre.trim() : data.nombre;
        }
        
        // Campos opcionales
        if (data.descripcion !== undefined && data.descripcion !== null && data.descripcion !== '') {
          payload.Descripcion = typeof data.descripcion === 'string' ? data.descripcion.trim() : data.descripcion;
        }
        if (data.anio !== undefined && data.anio !== null) {
          payload.Anio = Number(data.anio);
        }
        if (data.meta !== undefined && data.meta !== null) {
          payload.Meta = Number(data.meta);
        }
        if (data.lineaEstrategica !== undefined && data.lineaEstrategica !== null && data.lineaEstrategica !== '') {
          payload.LineaEstrategica = typeof data.lineaEstrategica === 'string' ? data.lineaEstrategica.trim() : data.lineaEstrategica;
        }
        if (data.objetivoEstrategico !== undefined && data.objetivoEstrategico !== null && data.objetivoEstrategico !== '') {
          payload.ObjetivoEstrategico = typeof data.objetivoEstrategico === 'string' ? data.objetivoEstrategico.trim() : data.objetivoEstrategico;
        }
        if (data.accionEstrategica !== undefined && data.accionEstrategica !== null && data.accionEstrategica !== '') {
          payload.AccionEstrategica = typeof data.accionEstrategica === 'string' ? data.accionEstrategica.trim() : data.accionEstrategica;
        }
        if (data.unidadMedida !== undefined && data.unidadMedida !== null && data.unidadMedida !== '') {
          payload.UnidadMedida = typeof data.unidadMedida === 'string' ? data.unidadMedida.trim() : data.unidadMedida;
        }
        if (data.activo !== undefined) {
          payload.Activo = data.activo;
        }

        // Manejar IdIndicadorPadre y Nivel
        if (data.idIndicadorPadre !== undefined) {
          // Si se está cambiando el padre
          if (data.idIndicadorPadre !== null && data.idIndicadorPadre !== undefined) {
            payload.IdIndicadorPadre = Number(data.idIndicadorPadre);
            payload.Nivel = 2; // Indicador hijo = nivel 2
          } else {
            // Si se está removiendo el padre (convirtiendo en padre)
            payload.Nivel = 1; // Indicador padre = nivel 1
          }
        } else {
          // Si no se está cambiando el padre, mantener el nivel según el indicador actual
          if (currentIndicador.idIndicadorPadre) {
            // Tiene padre, mantener como hijo (nivel 2)
            payload.Nivel = 2;
          } else {
            // No tiene padre, debe ser nivel 1
            payload.Nivel = 1;
          }
        }
        
        console.log('🔄 UPDATE Indicador - ID:', id);
        console.log('🔄 UPDATE Indicador - Indicador actual:', currentIndicador);
        console.log('🔄 UPDATE Indicador - Payload enviado:', JSON.stringify(payload, null, 2));
        console.log('🔄 UPDATE Indicador - URL:', `${this.apiUrl}/${id}`);
        
        // Hacer la petición PUT
        return this.http.put<any>(`${this.apiUrl}/${id}`, payload);
      }),
      switchMap(response => {
        // Manejar respuesta null o undefined
        if (response === null || response === undefined) {
          // Si la respuesta es null, el backend puede haber actualizado correctamente
          // pero no devolvió el objeto. Obtener el indicador actualizado.
          console.warn('⚠️ UPDATE Indicador - Respuesta null, obteniendo indicador actualizado...');
          return this.getById(id).pipe(
            map(updatedIndicador => {
              if (!updatedIndicador) {
                throw new Error(`No se pudo obtener el indicador actualizado con ID ${id}`);
              }
              return updatedIndicador;
            })
          );
        }
        
        // Intentar extraer el item de response.data o usar response directamente
        const item = (response && typeof response === 'object' && 'data' in response) 
          ? response.data 
          : response;
        
        // Si el item es null o undefined, obtener el indicador actualizado
        if (!item || (typeof item === 'object' && Object.keys(item).length === 0)) {
          console.warn('⚠️ UPDATE Indicador - Respuesta vacía, obteniendo indicador actualizado...');
          return this.getById(id).pipe(
            map(updatedIndicador => {
              if (!updatedIndicador) {
                throw new Error(`No se pudo obtener el indicador actualizado con ID ${id}`);
              }
              return updatedIndicador;
            })
          );
        }
        
        console.log('✅ UPDATE Indicador - Respuesta recibida:', item);
        return of(this.mapIndicador(item));
      }),
      catchError(error => {
        console.error('❌ Error updating indicador:', error);
        console.error('❌ Error status:', error.status);
        console.error('❌ Error message:', error.message);
        if (error.error) {
          console.error('❌ Error body:', error.error);
          if (error.error.errors) {
            console.error('❌ Validation errors:', error.error.errors);
          }
          if (error.error.message) {
            console.error('❌ Error message from backend:', error.error.message);
          }
        }
        throw error;
      })
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getActividades(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}/actividades`);
  }

  importarDesdeAnio(data: { anioOrigen: number, anioDestino: number, actualizarExistentes: boolean }): Observable<any> {
    const payload = {
      AnioOrigen: data.anioOrigen,
      AnioDestino: data.anioDestino,
      ActualizarExistentes: data.actualizarExistentes
    };
    return this.http.post(`${this.apiUrl}/importar-desde-anio`, payload);
  }

  importarDesdeExcel(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/importar-desde-excel`, formData);
  }

  descargarPlantillaExcel(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/plantilla-excel`, { responseType: 'blob' });
  }

  private mapIndicador(item: any): Indicador {
    return {
      idIndicador: item.idIndicador || item.IdIndicador || item.id,
      codigo: item.codigo || item.Codigo,
      nombre: item.nombre || item.Nombre,
      descripcion: item.descripcion || item.Descripcion,
      lineaEstrategica: item.lineaEstrategica || item.LineaEstrategica,
      objetivoEstrategico: item.objetivoEstrategico || item.ObjetivoEstrategico,
      accionEstrategica: item.accionEstrategica || item.AccionEstrategica,
      unidadMedida: item.unidadMedida || item.UnidadMedida,
      activo: item.activo !== undefined ? item.activo : (item.Activo !== undefined ? item.Activo : true),
      fechaCreacion: item.fechaCreacion || item.FechaCreacion || new Date().toISOString(),
      idIndicadorPadre: item.idIndicadorPadre || item.IdIndicadorPadre || undefined,
      nivel: item.nivel || item.Nivel || undefined,
      anio: item.anio !== undefined ? item.anio : (item.Anio !== undefined ? item.Anio : undefined),
      meta: item.meta !== undefined ? item.meta : (item.Meta !== undefined ? item.Meta : undefined)
    };
  }
  
  // Método para obtener solo indicadores padres (sin padre)
  getPadres(): Observable<Indicador[]> {
    return this.getAll().pipe(
      map(indicadores => indicadores.filter(ind => !ind.idIndicadorPadre))
    );
  }
}

