import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import { map, tap, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import type { Departamento } from '../models/departamento';
import type { Genero } from '../models/genero';
import type { EstadoEstudiante } from '../models/estado-estudiante';
import type { EstadoParticipacion } from '../models/estado-participacion';
import type { CategoriaParticipacion } from '../models/categoria-participacion';
import type { CategoriaActividad } from '../models/categoria-actividad';
import type { TipoUnidad } from '../models/tipo-unidad';
import type { TipoIniciativa } from '../models/tipo-iniciativa';
import type { TipoInvestigacion } from '../models/tipo-investigacion';
import type { TipoDocumento } from '../models/tipo-documento';
import type { TipoDocumentoDivulgado } from '../models/tipo-documento-divulgado';
import type { AreaConocimiento } from '../models/area-conocimiento';
import type { NivelActividad, TipoSubactividad, TipoEvidencia, RolEquipo } from '../models/catalogos-nuevos';
import type { EstadoActividad } from '../models/estado-actividad';

@Injectable({ providedIn: 'root' })
export class CatalogosService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}`;


  // Departamentos
  // Endpoint: /api/departamentos
  getDepartamentos(): Observable<Departamento[]> {
    return this.http.get<any>(`${this.apiUrl}/departamentos`).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => {
          // Log para debugging
          console.log('📦 Departamento recibido del backend:', item);
          return {
            id: item.idDepartamento || item.Id || item.id, 
            nombre: item.nombre || item.Nombre, 
            descripcion: item.descripcion || item.Descripcion || '',
            nombreJefe: item.nombreJefe || item.NombreJefe || item.nombreJefeDepartamento || item.NombreJefeDepartamento || '',
            correoJefe: item.correoJefe || item.CorreoJefe || item.correoJefeDepartamento || item.CorreoJefeDepartamento || '',
            telefonoJefe: item.telefonoJefe || item.TelefonoJefe || item.telefonoJefeDepartamento || item.TelefonoJefeDepartamento || ''
          };
        }) : [];
      }),
      catchError(error => {
        if (error.status === 404) {
          console.warn('⚠️ Endpoint /api/departamentos no encontrado (404)');
        } else {
          console.error('❌ Error fetching departamentos:', error);
        }
        return of([]);
      })
    );
  }

  createDepartamento(departamento: Omit<Departamento, 'id'>): Observable<Departamento> {
    const data = { 
      Nombre: departamento.nombre, 
      Descripcion: departamento.descripcion,
      NombreJefe: departamento.nombreJefe,
      CorreoJefe: departamento.correoJefe,
      TelefonoJefe: departamento.telefonoJefe
    };
    console.log('📤 CREATE DEPARTAMENTO - Datos enviados:', data);
    return this.http.post<any>(`${this.apiUrl}/departamentos`, data).pipe(
      map(item => {
        console.log('📥 CREATE DEPARTAMENTO - Respuesta del backend:', item);
        return {
          id: item.Id || item.id,
          nombre: item.Nombre || item.nombre,
          descripcion: item.Descripcion || item.descripcion || '',
          nombreJefe: item.NombreJefe || item.nombreJefe || '',
          correoJefe: item.CorreoJefe || item.correoJefe || '',
          telefonoJefe: item.TelefonoJefe || item.telefonoJefe || ''
        };
      })
    );
  }

  updateDepartamento(id: number, departamento: Omit<Departamento, 'id'>): Observable<void> {
    const data = { 
      Nombre: departamento.nombre, 
      Descripcion: departamento.descripcion,
      NombreJefe: departamento.nombreJefe,
      CorreoJefe: departamento.correoJefe,
      TelefonoJefe: departamento.telefonoJefe
    };
    return this.http.put<void>(`${this.apiUrl}/departamentos/${id}`, data);
  }

  deleteDepartamento(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/departamentos/${id}`);
  }

  // Genero
  getGeneros(): Observable<Genero[]> {
    console.log('🔄 GET Generos - URL:', `${this.apiUrl}/generos`);
    
    return this.http.get<any>(`${this.apiUrl}/generos`).pipe(
      map(response => {
        const items = response.data || response;
        const itemsArray = Array.isArray(items) ? items : [];
        console.log('✅ GET Generos - Respuesta recibida:', itemsArray);
        const result = itemsArray.map((item: any) => ({
          id: item.idGenero || item.IdGenero || item.id || 0,
          codigo: item.codigo || item.Codigo || '',
          descripcion: item.descripcion || item.Descripcion || ''
        }));
        console.log('✅ GET Generos - Datos mapeados:', result);
        return result;
      }),
      catchError(error => {
        console.error('❌ GET Generos - Error:', error);
        return of([]);
      })
    );
  }

  createGenero(genero: Omit<Genero, 'id'>): Observable<Genero> {
    const data = { Codigo: genero.codigo, Descripcion: genero.descripcion };
    console.log('🔄 CREATE Genero - Datos enviados:', data);
    console.log('🔄 CREATE Genero - URL:', `${this.apiUrl}/generos`);
    
    return this.http.post<any>(`${this.apiUrl}/generos`, data).pipe(
      map(item => {
        console.log('✅ CREATE Genero - Respuesta recibida:', item);
        const result = { id: item.idGenero, codigo: item.codigo, descripcion: item.descripcion };
        console.log('✅ CREATE Genero - Datos mapeados:', result);
        return result;
      })
    );
  }


  updateGenero(id: number, genero: Omit<Genero, 'id'>): Observable<Genero> {
    const data = { Codigo: genero.codigo, Descripcion: genero.descripcion };
    console.log('🔄 UPDATE Genero - ID:', id);
    console.log('🔄 UPDATE Genero - Datos enviados:', data);
    console.log('🔄 UPDATE Genero - URL:', `${this.apiUrl}/generos/${id}`);
    
    return this.http.put<any>(`${this.apiUrl}/generos/${id}`, data).pipe(
      map(response => {
        console.log('✅ UPDATE Genero - Respuesta recibida:', response);
        
        if (!response) {
          console.warn('⚠️ UPDATE Genero - Respuesta nula, usando datos enviados');
          return {
            id: id,
            codigo: genero.codigo,
            descripcion: genero.descripcion || ''
          };
        }
        
        const item = response.data || response;
        if (!item) {
          console.warn('⚠️ UPDATE Genero - Item nulo, usando datos enviados');
          return {
            id: id,
            codigo: genero.codigo,
            descripcion: genero.descripcion || ''
          };
        }
        
        const result = {
          id: item.IdGenero || item.idGenero || item.Id || item.id || id,
          codigo: item.Codigo || item.codigo || genero.codigo,
          descripcion: item.Descripcion || item.descripcion || genero.descripcion || ''
        };
        console.log('✅ UPDATE Genero - Datos mapeados:', result);
        return result;
      }),
      catchError(error => {
        console.error('❌ Error updating genero:', error);
        if (!error) {
          throw new Error('Error desconocido al actualizar genero');
        }
        throw error;
      })
    );
  }

  deleteGenero(id: number): Observable<void> {
    console.log('🔄 DELETE Genero - ID:', id);
    console.log('🔄 DELETE Genero - URL:', `${this.apiUrl}/generos/${id}`);
    
    return this.http.delete<void>(`${this.apiUrl}/generos/${id}`).pipe(
      tap(() => {
        console.log('✅ DELETE Genero - Eliminado exitosamente');
      })
    );
  }

  // Estado Estudiante
  getEstadosEstudiante(): Observable<EstadoEstudiante[]> {
    console.log('🔄 GET EstadoEstudiante - URL:', `${this.apiUrl}/estado-estudiantes`);
    
    return this.http.get<any>(`${this.apiUrl}/estado-estudiantes`).pipe(
      map(response => {
        console.log('✅ GET EstadoEstudiante - Respuesta recibida:', response);
        const items = response.data || response;
        const result = Array.isArray(items) ? items.map(item => ({ 
          id: item.idEstadoEstudiante || item.Id || item.id, 
          nombre: item.nombre || item.Nombre, 
          descripcion: item.descripcion || item.Descripcion || '' 
        })) : [];
        console.log('✅ GET EstadoEstudiante - Datos mapeados:', result);
        return result;
      }),
      catchError(error => {
        console.error('❌ GET EstadoEstudiante - Error:', error);
        return of([]);
      })
    );
  }

  createEstadoEstudiante(estado: Omit<EstadoEstudiante, 'id'>): Observable<EstadoEstudiante> {
    const data = { Nombre: estado.nombre, Descripcion: estado.descripcion };
    console.log('🔄 CREATE EstadoEstudiante - Datos enviados:', data);
    console.log('🔄 CREATE EstadoEstudiante - URL:', `${this.apiUrl}/estado-estudiantes`);
    
    return this.http.post<any>(`${this.apiUrl}/estado-estudiantes`, data).pipe(
      map(item => {
        console.log('✅ CREATE EstadoEstudiante - Respuesta recibida:', item);
        if (!item) {
          console.error('❌ CREATE EstadoEstudiante - Respuesta nula');
          throw new Error('No se recibió respuesta del servidor');
        }
        const result = { 
          id: item.idEstadoEstudiante || item.Id, 
          nombre: item.nombre || item.Nombre || estado.nombre, 
          descripcion: item.descripcion || item.Descripcion || estado.descripcion 
        };
        console.log('✅ CREATE EstadoEstudiante - Datos mapeados:', result);
        return result;
      })
    );
  }

  updateEstadoEstudiante(id: number, estado: Omit<EstadoEstudiante, 'id'>): Observable<EstadoEstudiante> {
    const data = { Nombre: estado.nombre, Descripcion: estado.descripcion };
    console.log('🔄 UPDATE EstadoEstudiante - ID:', id);
    console.log('🔄 UPDATE EstadoEstudiante - Datos enviados:', data);
    console.log('🔄 UPDATE EstadoEstudiante - URL:', `${this.apiUrl}/estado-estudiantes/${id}`);
    
    return this.http.put<any>(`${this.apiUrl}/estado-estudiantes/${id}`, data).pipe(
      map(response => {
        console.log('✅ UPDATE EstadoEstudiante - Respuesta recibida:', response);
        
        // Si la respuesta es null o undefined, retornar los datos enviados con el ID
        if (!response) {
          console.warn('⚠️ UPDATE EstadoEstudiante - Respuesta nula, usando datos enviados');
          return {
            id: id,
            nombre: estado.nombre,
            descripcion: estado.descripcion || ''
          };
        }
        
        // Manejar diferentes estructuras de respuesta
        const item = response.data || response;
        
        // Si el item es null o no tiene datos, retornar los datos enviados con el ID
        if (!item) {
          console.warn('⚠️ UPDATE EstadoEstudiante - Item nulo, usando datos enviados');
          return {
            id: id,
            nombre: estado.nombre,
            descripcion: estado.descripcion || ''
          };
        }
        
        // Mapear según diferentes posibles estructuras del backend
        const result = { 
          id: item.idEstadoEstudiante || item.IdEstadoEstudiante || item.Id || item.id || id, 
          nombre: item.nombre || item.Nombre || estado.nombre, 
          descripcion: item.descripcion || item.Descripcion || estado.descripcion || '' 
        };
        console.log('✅ UPDATE EstadoEstudiante - Datos mapeados:', result);
        return result;
      }),
      catchError(error => {
        console.error('❌ Error updating estado estudiante:', error);
        // Si el error es null o no tiene estructura esperada, crear un error genérico
        if (!error) {
          throw new Error('Error desconocido al actualizar estado estudiante');
        }
        throw error;
      })
    );
  }

  deleteEstadoEstudiante(id: number): Observable<void> {
    console.log('🔄 DELETE EstadoEstudiante - ID:', id);
    console.log('🔄 DELETE EstadoEstudiante - URL:', `${this.apiUrl}/estado-estudiantes/${id}`);
    
    return this.http.delete<void>(`${this.apiUrl}/estado-estudiantes/${id}`).pipe(
      tap(() => {
        console.log('✅ DELETE EstadoEstudiante - Eliminado exitosamente');
      })
    );
  }

  // Estado Participacion
  getEstadosParticipacion(): Observable<EstadoParticipacion[]> {
    return this.http.get<any>(`${this.apiUrl}/estados-participacion`).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => ({ 
          id: item.idEstadoParticipacion || item.Id || item.id, 
          nombre: item.nombre || item.Nombre, 
          descripcion: item.descripcion || item.Descripcion || '' 
        })) : [];
      }),
      catchError(error => {
        console.error('Error fetching estados participacion:', error);
        return of([]);
      })
    );
  }

  createEstadoParticipacion(estado: Omit<EstadoParticipacion, 'id'>): Observable<EstadoParticipacion> {
    const data = { Nombre: estado.nombre, Descripcion: estado.descripcion };
    return this.http.post<any>(`${this.apiUrl}/estados-participacion`, data).pipe(
      map(item => ({ id: item.idEstadoParticipacion || item.Id, nombre: item.nombre || item.Nombre, descripcion: item.descripcion || item.Descripcion }))
    );
  }

  updateEstadoParticipacion(id: number, estado: Omit<EstadoParticipacion, 'id'>): Observable<EstadoParticipacion> {
    const data = { Nombre: estado.nombre, Descripcion: estado.descripcion };
    return this.http.put<any>(`${this.apiUrl}/estados-participacion/${id}`, data).pipe(
      map(response => {
        if (!response) {
          return {
            id: id,
            nombre: estado.nombre,
            descripcion: estado.descripcion || ''
          };
        }
        
        const item = response.data || response;
        if (!item) {
          return {
            id: id,
            nombre: estado.nombre,
            descripcion: estado.descripcion || ''
          };
        }
        
        return {
          id: item.idEstadoParticipacion || item.IdEstadoParticipacion || item.Id || item.id || id,
          nombre: item.nombre || item.Nombre || estado.nombre,
          descripcion: item.descripcion || item.Descripcion || estado.descripcion || ''
        };
      }),
      catchError(error => {
        console.error('Error updating estado participacion:', error);
        if (!error) {
          throw new Error('Error desconocido al actualizar estado participacion');
        }
        throw error;
      })
    );
  }

  deleteEstadoParticipacion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/estados-participacion/${id}`);
  }

  // Categoria Participacion
  getCategoriasParticipacion(): Observable<CategoriaParticipacion[]> {
    return this.http.get<any>(`${this.apiUrl}/categorias-participacion`).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => ({ 
          id: item.idCategoria || item.idCategoriaParticipacion || item.Id || item.id, 
          nombre: item.nombre || item.Nombre, 
          descripcion: item.descripcion || item.Descripcion || '' 
        })) : [];
      }),
      catchError(error => {
        console.error('Error fetching categorias participacion:', error);
        return of([]);
      })
    );
  }

  createCategoriaParticipacion(categoria: Omit<CategoriaParticipacion, 'id'>): Observable<CategoriaParticipacion> {
    const data = { Nombre: categoria.nombre, Descripcion: categoria.descripcion };
    return this.http.post<any>(`${this.apiUrl}/categorias-participacion`, data).pipe(
      map(item => ({ id: item.idCategoria || item.idCategoriaParticipacion || item.Id, nombre: item.nombre || item.Nombre, descripcion: item.descripcion || item.Descripcion }))
    );
  }

  updateCategoriaParticipacion(id: number, categoria: Omit<CategoriaParticipacion, 'id'>): Observable<CategoriaParticipacion> {
    const data = { Nombre: categoria.nombre, Descripcion: categoria.descripcion };
    return this.http.put<any>(`${this.apiUrl}/categorias-participacion/${id}`, data).pipe(
      map(response => {
        if (!response) {
          return {
            id: id,
            nombre: categoria.nombre,
            descripcion: categoria.descripcion || ''
          };
        }
        
        const item = response.data || response;
        if (!item) {
          return {
            id: id,
            nombre: categoria.nombre,
            descripcion: categoria.descripcion || ''
          };
        }
        
        return {
          id: item.idCategoria || item.idCategoriaParticipacion || item.IdCategoria || item.IdCategoriaParticipacion || item.Id || item.id || id,
          nombre: item.nombre || item.Nombre || categoria.nombre,
          descripcion: item.descripcion || item.Descripcion || categoria.descripcion || ''
        };
      }),
      catchError(error => {
        console.error('Error updating categoria participacion:', error);
        if (!error) {
          throw new Error('Error desconocido al actualizar categoria participacion');
        }
        throw error;
      })
    );
  }

  deleteCategoriaParticipacion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/categorias-participacion/${id}`);
  }

  // Categoria Actividad - Alineado con ICategoriaActividadService
  // Endpoint: /api/categorias-actividad
  getAllCategoriasActividad(): Observable<CategoriaActividad[]> {
    return this.http.get<any>(`${this.apiUrl}/categorias-actividad`).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapCategoriaActividad(item)) : [];
      }),
      catchError(error => {
        // Silenciar errores 404 si el endpoint no existe aún
        if (error.status !== 404) {
          console.error('Error fetching categorias actividad:', error);
        }
        return of([]);
      })
    );
  }

  // Método legacy - mantener para compatibilidad
  getCategoriasActividad(): Observable<CategoriaActividad[]> {
    return this.getAllCategoriasActividad();
  }

  getCategoriaActividadById(id: number): Observable<CategoriaActividad | null> {
    return this.http.get<any>(`${this.apiUrl}/categorias-actividad/${id}`).pipe(
      map(item => this.mapCategoriaActividad(item)),
      catchError(error => {
        if (error.status === 404) {
          return of(null);
        }
        console.error('Error fetching categoria actividad by id:', error);
        return of(null);
      })
    );
  }

  createCategoriaActividad(categoria: Omit<CategoriaActividad, 'id' | 'idCategoriaActividad'>): Observable<CategoriaActividad> {
    // El backend espera CategoriaActividadCreateDto con PascalCase
    const dto = {
      Nombre: categoria.nombre,
      Descripcion: categoria.descripcion || null
    };
    
    return this.http.post<any>(`${this.apiUrl}/categorias-actividad`, dto).pipe(
      map(item => this.mapCategoriaActividad(item))
    );
  }

  updateCategoriaActividad(id: number, categoria: Omit<CategoriaActividad, 'id' | 'idCategoriaActividad'>): Observable<boolean> {
    // El backend espera CategoriaActividadUpdateDto con PascalCase
    const dto = {
      Nombre: categoria.nombre,
      Descripcion: categoria.descripcion || null
    };
    
    return this.http.put<any>(`${this.apiUrl}/categorias-actividad/${id}`, dto).pipe(
      map(() => true),
      catchError(error => {
        if (error.status === 404) {
          return of(false);
        }
        console.error('Error updating categoria actividad:', error);
        return of(false);
      })
    );
  }

  deleteCategoriaActividad(id: number): Observable<boolean> {
    return this.http.delete<any>(`${this.apiUrl}/categorias-actividad/${id}`).pipe(
      map(() => true),
      catchError(error => {
        if (error.status === 404) {
          return of(false);
        }
        console.error('Error deleting categoria actividad:', error);
        return of(false);
      })
    );
  }

  private mapCategoriaActividad(item: any): CategoriaActividad {
    const id = item.IdCategoriaActividad || item.idCategoriaActividad || item.id || item.Id || 0;
    return {
      id: id,
      idCategoriaActividad: id,
      nombre: item.Nombre || item.nombre || '',
      descripcion: item.Descripcion || item.descripcion
    };
  }

  // Tipo Unidad - Endpoint: /api/tipo-unidad
  getTiposUnidad(): Observable<TipoUnidad[]> {
    console.log('🔄 GET TiposUnidad - URL:', `${this.apiUrl}/tipo-unidad`);
    
    return this.http.get<any>(`${this.apiUrl}/tipo-unidad`).pipe(
      map(response => {
        console.log('✅ GET TiposUnidad - Response:', response);
        const items = response.data || response;
        const result = Array.isArray(items) ? items.map(item => {
          // Mapear según diferentes posibles estructuras del backend
          const mapped = {
            id: item.idTipoUnidad || item.IdTipoUnidad || item.id || item.Id,
            nombre: item.nombre || item.Nombre || '',
            descripcion: item.descripcion || item.Descripcion || ''
          };
          console.log('📦 Mapped item:', mapped);
          return mapped;
        }) : [];
        console.log('✅ GET TiposUnidad - Mapped result:', result);
        return result;
      }),
      catchError(error => {
        console.error('❌ GET TiposUnidad - Error:', error);
        console.error('❌ Error status:', error.status);
        console.error('❌ Error message:', error.message);
        // Silenciar errores 404 si el endpoint no existe aún
        if (error.status !== 404) {
          console.error('Error fetching tipos unidad:', error);
        }
        return of([]);
      })
    );
  }

  getTipoUnidadById(id: number): Observable<TipoUnidad | null> {
    return this.http.get<any>(`${this.apiUrl}/tipo-unidad/${id}`).pipe(
      map(item => ({
        id: item.idTipoUnidad || item.IdTipoUnidad || item.id || item.Id,
        nombre: item.nombre || item.Nombre || '',
        descripcion: item.descripcion || item.Descripcion || ''
      })),
      catchError(error => {
        console.error('Error fetching tipo unidad by id:', error);
        return of(null);
      })
    );
  }

  createTipoUnidad(tipo: Omit<TipoUnidad, 'id'>): Observable<TipoUnidad> {
    const data = { Nombre: tipo.nombre, Descripcion: tipo.descripcion || '' };
    return this.http.post<any>(`${this.apiUrl}/tipo-unidad`, data).pipe(
      map(item => ({
        id: item.idTipoUnidad || item.IdTipoUnidad || item.id || item.Id,
        nombre: item.nombre || item.Nombre || tipo.nombre,
        descripcion: item.descripcion || item.Descripcion || tipo.descripcion || ''
      }))
    );
  }

  updateTipoUnidad(id: number, tipo: Omit<TipoUnidad, 'id'>): Observable<boolean> {
    const data = { Nombre: tipo.nombre, Descripcion: tipo.descripcion || '' };
    return this.http.put<any>(`${this.apiUrl}/tipo-unidad/${id}`, data).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error updating tipo unidad:', error);
        return of(false);
      })
    );
  }

  deleteTipoUnidad(id: number): Observable<boolean> {
    return this.http.delete<any>(`${this.apiUrl}/tipo-unidad/${id}`).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error deleting tipo unidad:', error);
        return of(false);
      })
    );
  }

  // Tipo Iniciativa
  getTiposIniciativa(): Observable<TipoIniciativa[]> {
    return this.http.get<any>(`${this.apiUrl}/tipo-iniciativa`).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => ({ 
          id: item.idTipoIniciativa || item.Id || item.id, 
          nombre: item.nombre || item.Nombre, 
          descripcion: item.descripcion || item.Descripcion || '' 
        })) : [];
      }),
      catchError(error => {
        console.error('Error fetching tipos iniciativa:', error);
        return of([]);
      })
    );
  }

  createTipoIniciativa(tipo: Omit<TipoIniciativa, 'id'>): Observable<TipoIniciativa> {
    const data = { Nombre: tipo.nombre, Descripcion: tipo.descripcion };
    return this.http.post<any>(`${this.apiUrl}/tipo-iniciativa`, data).pipe(
      map(item => ({ id: item.idTipoIniciativa || item.Id, nombre: item.nombre || item.Nombre, descripcion: item.descripcion || item.Descripcion }))
    );
  }

  updateTipoIniciativa(id: number, tipo: Omit<TipoIniciativa, 'id'>): Observable<TipoIniciativa> {
    const data = { Nombre: tipo.nombre, Descripcion: tipo.descripcion };
    return this.http.put<any>(`${this.apiUrl}/tipo-iniciativa/${id}`, data).pipe(
      map(response => {
        if (!response) {
          return {
            id: id,
            nombre: tipo.nombre,
            descripcion: tipo.descripcion || ''
          };
        }
        
        const item = response.data || response;
        if (!item) {
          return {
            id: id,
            nombre: tipo.nombre,
            descripcion: tipo.descripcion || ''
          };
        }
        
        return {
          id: item.idTipoIniciativa || item.IdTipoIniciativa || item.Id || item.id || id,
          nombre: item.nombre || item.Nombre || tipo.nombre,
          descripcion: item.descripcion || item.Descripcion || tipo.descripcion || ''
        };
      }),
      catchError(error => {
        console.error('Error updating tipo iniciativa:', error);
        if (!error) {
          throw new Error('Error desconocido al actualizar tipo iniciativa');
        }
        throw error;
      })
    );
  }

  deleteTipoIniciativa(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/tipo-iniciativa/${id}`);
  }

  // Tipo Investigacion
  getTiposInvestigacion(): Observable<TipoInvestigacion[]> {
    return this.http.get<any>(`${this.apiUrl}/tipo-investigacion`).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => ({ 
          id: item.idTipoInvestigacion || item.Id || item.id, 
          nombre: item.nombre || item.Nombre, 
          descripcion: item.descripcion || item.Descripcion || '' 
        })) : [];
      }),
      catchError(error => {
        console.error('Error fetching tipos investigacion:', error);
        return of([]);
      })
    );
  }

  createTipoInvestigacion(tipo: Omit<TipoInvestigacion, 'id'>): Observable<TipoInvestigacion> {
    const data = { Nombre: tipo.nombre, Descripcion: tipo.descripcion };
    return this.http.post<any>(`${this.apiUrl}/tipo-investigacion`, data).pipe(
      map(item => ({ id: item.idTipoInvestigacion || item.Id, nombre: item.nombre || item.Nombre, descripcion: item.descripcion || item.Descripcion }))
    );
  }

  updateTipoInvestigacion(id: number, tipo: Omit<TipoInvestigacion, 'id'>): Observable<TipoInvestigacion> {
    const data = { Nombre: tipo.nombre, Descripcion: tipo.descripcion };
    return this.http.put<any>(`${this.apiUrl}/tipo-investigacion/${id}`, data).pipe(
      map(response => {
        if (!response) {
          return {
            id: id,
            nombre: tipo.nombre,
            descripcion: tipo.descripcion || ''
          };
        }
        
        const item = response.data || response;
        if (!item) {
          return {
            id: id,
            nombre: tipo.nombre,
            descripcion: tipo.descripcion || ''
          };
        }
        
        return {
          id: item.idTipoInvestigacion || item.IdTipoInvestigacion || item.Id || item.id || id,
          nombre: item.nombre || item.Nombre || tipo.nombre,
          descripcion: item.descripcion || item.Descripcion || tipo.descripcion || ''
        };
      }),
      catchError(error => {
        console.error('Error updating tipo investigacion:', error);
        if (!error) {
          throw new Error('Error desconocido al actualizar tipo investigacion');
        }
        throw error;
      })
    );
  }

  deleteTipoInvestigacion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/tipo-investigacion/${id}`);
  }

  // Tipo Documento
  getTiposDocumento(): Observable<TipoDocumento[]> {
    return this.http.get<any>(`${this.apiUrl}/tipo-documento`).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => ({ 
          id: item.idTipoDocumento || item.Id || item.id, 
          nombre: item.nombre || item.Nombre, 
          descripcion: item.descripcion || item.Descripcion || '' 
        })) : [];
      }),
      catchError(error => {
        console.error('Error fetching tipos documento:', error);
        return of([]);
      })
    );
  }

  createTipoDocumento(tipo: Omit<TipoDocumento, 'id'>): Observable<TipoDocumento> {
    const data = { Nombre: tipo.nombre, Descripcion: tipo.descripcion };
    return this.http.post<any>(`${this.apiUrl}/tipo-documento`, data).pipe(
      map(item => ({ id: item.idTipoDocumento || item.Id, nombre: item.nombre || item.Nombre, descripcion: item.descripcion || item.Descripcion }))
    );
  }

  updateTipoDocumento(id: number, tipo: Omit<TipoDocumento, 'id'>): Observable<TipoDocumento> {
    const data = { Nombre: tipo.nombre, Descripcion: tipo.descripcion };
    return this.http.put<any>(`${this.apiUrl}/tipo-documento/${id}`, data).pipe(
      map(response => {
        if (!response) {
          return {
            id: id,
            nombre: tipo.nombre,
            descripcion: tipo.descripcion || ''
          };
        }
        
        const item = response.data || response;
        if (!item) {
          return {
            id: id,
            nombre: tipo.nombre,
            descripcion: tipo.descripcion || ''
          };
        }
        
        return {
          id: item.idTipoDocumento || item.IdTipoDocumento || item.Id || item.id || id,
          nombre: item.nombre || item.Nombre || tipo.nombre,
          descripcion: item.descripcion || item.Descripcion || tipo.descripcion || ''
        };
      }),
      catchError(error => {
        console.error('Error updating tipo documento:', error);
        if (!error) {
          throw new Error('Error desconocido al actualizar tipo documento');
        }
        throw error;
      })
    );
  }

  deleteTipoDocumento(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/tipo-documento/${id}`);
  }

  // Tipo Documento Divulgado
  getTiposDocumentoDivulgado(): Observable<TipoDocumentoDivulgado[]> {
    return this.http.get<any>(`${this.apiUrl}/tipo-documento-divulgado`).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => ({ 
          id: item.idTipoDocumentoDivulgado || item.Id || item.id, 
          nombre: item.nombre || item.Nombre, 
          descripcion: item.descripcion || item.Descripcion || '' 
        })) : [];
      }),
      catchError(error => {
        console.error('Error fetching tipos documento divulgado:', error);
        return of([]);
      })
    );
  }

  createTipoDocumentoDivulgado(tipo: Omit<TipoDocumentoDivulgado, 'id'>): Observable<TipoDocumentoDivulgado> {
    const data = { Nombre: tipo.nombre, Descripcion: tipo.descripcion };
    return this.http.post<any>(`${this.apiUrl}/tipo-documento-divulgado`, data).pipe(
      map(item => ({ id: item.idTipoDocumentoDivulgado || item.Id, nombre: item.nombre || item.Nombre, descripcion: item.descripcion || item.Descripcion }))
    );
  }

  updateTipoDocumentoDivulgado(id: number, tipo: Omit<TipoDocumentoDivulgado, 'id'>): Observable<TipoDocumentoDivulgado> {
    const data = { Nombre: tipo.nombre, Descripcion: tipo.descripcion };
    return this.http.put<any>(`${this.apiUrl}/tipo-documento-divulgado/${id}`, data).pipe(
      map(response => {
        // Si la respuesta es null o undefined, retornar los datos enviados con el ID
        if (!response) {
          return {
            id: id,
            nombre: tipo.nombre,
            descripcion: tipo.descripcion || ''
          };
        }
        
        // Manejar diferentes estructuras de respuesta
        const item = response.data || response;
        
        // Si el item es null o no tiene datos, retornar los datos enviados con el ID
        if (!item) {
          return {
            id: id,
            nombre: tipo.nombre,
            descripcion: tipo.descripcion || ''
          };
        }
        
        // Mapear según diferentes posibles estructuras del backend
        return {
          id: item.idTipoDocumentoDivulgado || item.IdTipoDocumentoDivulgado || item.Id || item.id || id,
          nombre: item.nombre || item.Nombre || tipo.nombre,
          descripcion: item.descripcion || item.Descripcion || tipo.descripcion || ''
        };
      }),
      catchError(error => {
        console.error('Error updating tipo documento divulgado:', error);
        // Si el error es null o no tiene estructura esperada, crear un error genérico
        if (!error) {
          throw new Error('Error desconocido al actualizar tipo documento divulgado');
        }
        throw error;
      })
    );
  }

  deleteTipoDocumentoDivulgado(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/tipo-documento-divulgado/${id}`);
  }

  // Area Conocimiento - Endpoint: /api/area-conocimiento
  getAreasConocimiento(): Observable<AreaConocimiento[]> {
    console.log('🔄 GET AreasConocimiento - URL:', `${this.apiUrl}/area-conocimiento`);
    
    return this.http.get<any>(`${this.apiUrl}/area-conocimiento`).pipe(
      map(response => {
        console.log('✅ GET AreasConocimiento - Response:', response);
        const items = response.data || response;
        const result = Array.isArray(items) ? items.map(item => {
          // Mapear según diferentes posibles estructuras del backend
          const mapped = {
            id: item.idArea || item.idAreaConocimiento || item.IdArea || item.IdAreaConocimiento || item.Id || item.id,
            nombre: item.nombre || item.Nombre || '',
            descripcion: item.descripcion || item.Descripcion || ''
          };
          console.log('📦 Mapped item:', mapped);
          return mapped;
        }) : [];
        console.log('✅ GET AreasConocimiento - Mapped result:', result);
        return result;
      }),
      catchError(error => {
        console.error('❌ GET AreasConocimiento - Error:', error);
        console.error('❌ Error status:', error.status);
        console.error('❌ Error message:', error.message);
        // Silenciar errores 404 si el endpoint no existe aún
        if (error.status !== 404) {
          console.error('Error fetching areas conocimiento:', error);
        }
        return of([]);
      })
    );
  }

  getAreaConocimientoById(id: number): Observable<AreaConocimiento | null> {
    return this.http.get<any>(`${this.apiUrl}/area-conocimiento/${id}`).pipe(
      map(item => ({
        id: item.idArea || item.idAreaConocimiento || item.IdArea || item.IdAreaConocimiento || item.Id || item.id,
        nombre: item.nombre || item.Nombre || '',
        descripcion: item.descripcion || item.Descripcion || ''
      })),
      catchError(error => {
        console.error('Error fetching area conocimiento by id:', error);
        return of(null);
      })
    );
  }

  createAreaConocimiento(area: Omit<AreaConocimiento, 'id'>): Observable<AreaConocimiento> {
    const data = { Nombre: area.nombre, Descripcion: area.descripcion || '' };
    return this.http.post<any>(`${this.apiUrl}/area-conocimiento`, data).pipe(
      map(item => ({
        id: item.idArea || item.idAreaConocimiento || item.IdArea || item.IdAreaConocimiento || item.id || item.Id,
        nombre: item.nombre || item.Nombre || area.nombre,
        descripcion: item.descripcion || item.Descripcion || area.descripcion || ''
      }))
    );
  }

  updateAreaConocimiento(id: number, area: Omit<AreaConocimiento, 'id'>): Observable<boolean> {
    const data = { Nombre: area.nombre, Descripcion: area.descripcion || '' };
    return this.http.put<any>(`${this.apiUrl}/area-conocimiento/${id}`, data).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error updating area conocimiento:', error);
        return of(false);
      })
    );
  }

  deleteAreaConocimiento(id: number): Observable<boolean> {
    return this.http.delete<any>(`${this.apiUrl}/area-conocimiento/${id}`).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error deleting area conocimiento:', error);
        return of(false);
      })
    );
  }

  // Nivel Actividad
  // Endpoint: /api/nivel-actividad
  getNivelesActividad(): Observable<NivelActividad[]> {
    return this.http.get<any>(`${this.apiUrl}/nivel-actividad`).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapNivelActividad(item)) : [];
      }),
      catchError(error => {
        if (error.status === 404) {
          console.warn('⚠️ Endpoint /api/nivel-actividad no encontrado (404)');
        } else {
          console.error('❌ Error fetching niveles actividad:', error);
        }
        return of([]);
      })
    );
  }

  createNivelActividad(nivel: Omit<NivelActividad, 'idNivel'>): Observable<NivelActividad> {
    // El backend espera DTO con PascalCase
    const dto = {
      Nombre: nivel.nombre,
      Descripcion: nivel.descripcion || null,
      Activo: nivel.activo !== undefined ? nivel.activo : true
    };
    
    return this.http.post<any>(`${this.apiUrl}/nivel-actividad`, dto).pipe(
      map(item => this.mapNivelActividad(item))
    );
  }

  updateNivelActividad(id: number, nivel: Omit<NivelActividad, 'idNivel'>): Observable<NivelActividad> {
    // El backend espera DTO con PascalCase
    const dto = {
      Nombre: nivel.nombre,
      Descripcion: nivel.descripcion || null,
      Activo: nivel.activo !== undefined ? nivel.activo : true
    };
    
    return this.http.put<any>(`${this.apiUrl}/nivel-actividad/${id}`, dto).pipe(
      map(response => {
        if (!response) {
          return {
            idNivel: id,
            nombre: nivel.nombre,
            descripcion: nivel.descripcion || '',
            activo: nivel.activo !== undefined ? nivel.activo : true
          };
        }
        
        const item = response.data || response;
        if (!item) {
          return {
            idNivel: id,
            nombre: nivel.nombre,
            descripcion: nivel.descripcion || '',
            activo: nivel.activo !== undefined ? nivel.activo : true
          };
        }
        
        return this.mapNivelActividad(item, id);
      }),
      catchError(error => {
        console.error('Error updating nivel actividad:', error);
        if (!error) {
          throw new Error('Error desconocido al actualizar nivel actividad');
        }
        throw error;
      })
    );
  }

  deleteNivelActividad(id: number): Observable<boolean> {
    return this.http.delete<any>(`${this.apiUrl}/nivel-actividad/${id}`).pipe(
      map(() => true),
      catchError(error => {
        if (error.status === 404) {
          return of(false);
        }
        console.error('Error deleting nivel actividad:', error);
        return of(false);
      })
    );
  }

  private mapNivelActividad(item: any, fallbackId?: number): NivelActividad {
    const id = item.IdNivel || item.idNivel || item.id || item.Id || fallbackId || 0;
    return {
      idNivel: id,
      nombre: item.Nombre || item.nombre || '',
      descripcion: item.Descripcion || item.descripcion,
      activo: item.Activo !== undefined ? item.Activo : (item.activo !== undefined ? item.activo : true)
    };
  }

  // Tipo Subactividad
  // Endpoint: /api/tipo-subactividad (kebab-case, siguiendo el patrón de /api/subactividades)
  getTiposSubactividad(): Observable<TipoSubactividad[]> {
    return this.http.get<any>(`${this.apiUrl}/tipo-subactividad`).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => ({
          idTipoSubactividad: item.idTipoSubactividad || item.IdTipoSubactividad || item.id,
          nombre: item.nombre || item.Nombre,
          descripcion: item.descripcion || item.Descripcion,
          activo: item.activo !== undefined ? item.activo : (item.Activo !== undefined ? item.Activo : true)
        })) : [];
      }),
      catchError(error => {
        if (error.status === 404) {
          console.warn('⚠️ Endpoint /api/tipo-subactividad no encontrado (404)');
        } else {
          console.error('❌ Error fetching tipos subactividad:', error);
        }
        return of([]);
      })
    );
  }

  createTipoSubactividad(tipo: Omit<TipoSubactividad, 'idTipoSubactividad'>): Observable<TipoSubactividad> {
    const data = { Nombre: tipo.nombre, Descripcion: tipo.descripcion, Activo: tipo.activo };
    console.log('🔄 CREATE TipoSubactividad - URL:', `${this.apiUrl}/tipo-subactividad`);
    console.log('🔄 CREATE TipoSubactividad - DTO:', data);
    
    return this.http.post<any>(`${this.apiUrl}/tipo-subactividad`, data).pipe(
      map(item => {
        const result = {
          idTipoSubactividad: item.idTipoSubactividad || item.IdTipoSubactividad,
          nombre: item.nombre || item.Nombre,
          descripcion: item.descripcion || item.Descripcion,
          activo: item.activo !== undefined ? item.activo : (item.Activo !== undefined ? item.Activo : true)
        };
        console.log('✅ CREATE TipoSubactividad - Resultado:', result);
        return result;
      }),
      catchError(error => {
        console.error('❌ CREATE TipoSubactividad - Error:', error);
        console.error('❌ Error status:', error.status);
        console.error('❌ Error message:', error.message);
        throw error;
      })
    );
  }

  updateTipoSubactividad(id: number, tipo: Omit<TipoSubactividad, 'idTipoSubactividad'>): Observable<TipoSubactividad> {
    const data = { Nombre: tipo.nombre, Descripcion: tipo.descripcion, Activo: tipo.activo };
    return this.http.put<any>(`${this.apiUrl}/tipo-subactividad/${id}`, data).pipe(
      map(response => {
        if (!response) {
          return {
            idTipoSubactividad: id,
            nombre: tipo.nombre,
            descripcion: tipo.descripcion || '',
            activo: tipo.activo !== undefined ? tipo.activo : true
          };
        }
        
        const item = response.data || response;
        if (!item) {
          return {
            idTipoSubactividad: id,
            nombre: tipo.nombre,
            descripcion: tipo.descripcion || '',
            activo: tipo.activo !== undefined ? tipo.activo : true
          };
        }
        
        return {
          idTipoSubactividad: item.idTipoSubactividad || item.IdTipoSubactividad || id,
          nombre: item.nombre || item.Nombre || tipo.nombre,
          descripcion: item.descripcion || item.Descripcion || tipo.descripcion || '',
          activo: item.activo !== undefined ? item.activo : (item.Activo !== undefined ? item.Activo : (tipo.activo !== undefined ? tipo.activo : true))
        };
      }),
      catchError(error => {
        console.error('Error updating tipo subactividad:', error);
        if (!error) {
          throw new Error('Error desconocido al actualizar tipo subactividad');
        }
        throw error;
      })
    );
  }

  deleteTipoSubactividad(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/tipo-subactividad/${id}`);
  }

  // Tipo Evidencia
  getTiposEvidencia(): Observable<TipoEvidencia[]> {
    return this.http.get<any>(`${this.apiUrl}/tipo-evidencia`).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => ({
          // Usar ?? en lugar de || para no perder IDs numéricos 0
          idTipoEvidencia: item.idTipoEvidencia ?? item.IdTipoEvidencia ?? item.id,
          nombre: item.nombre || item.Nombre,
          descripcion: item.descripcion || item.Descripcion,
          activo: item.activo !== undefined ? item.activo : (item.Activo !== undefined ? item.Activo : true)
        })) : [];
      }),
      catchError(error => {
        console.error('Error fetching tipos evidencia:', error);
        return of([]);
      })
    );
  }

  createTipoEvidencia(tipo: Omit<TipoEvidencia, 'idTipoEvidencia'>): Observable<TipoEvidencia> {
    const data = { Nombre: tipo.nombre, Descripcion: tipo.descripcion, Activo: tipo.activo };
    return this.http.post<any>(`${this.apiUrl}/tipo-evidencia`, data).pipe(
      map(item => ({
        idTipoEvidencia: item.idTipoEvidencia || item.IdTipoEvidencia,
        nombre: item.nombre || item.Nombre,
        descripcion: item.descripcion || item.Descripcion,
        activo: item.activo !== undefined ? item.activo : (item.Activo !== undefined ? item.Activo : true)
      }))
    );
  }

  updateTipoEvidencia(id: number, tipo: Omit<TipoEvidencia, 'idTipoEvidencia'>): Observable<TipoEvidencia> {
    const data = { Nombre: tipo.nombre, Descripcion: tipo.descripcion, Activo: tipo.activo };
    return this.http.put<any>(`${this.apiUrl}/tipo-evidencia/${id}`, data).pipe(
      map(response => {
        if (!response) {
          return {
            idTipoEvidencia: id,
            nombre: tipo.nombre,
            descripcion: tipo.descripcion || '',
            activo: tipo.activo !== undefined ? tipo.activo : true
          };
        }
        
        const item = response.data || response;
        if (!item) {
          return {
            idTipoEvidencia: id,
            nombre: tipo.nombre,
            descripcion: tipo.descripcion || '',
            activo: tipo.activo !== undefined ? tipo.activo : true
          };
        }
        
        return {
          idTipoEvidencia: item.idTipoEvidencia || item.IdTipoEvidencia || id,
          nombre: item.nombre || item.Nombre || tipo.nombre,
          descripcion: item.descripcion || item.Descripcion || tipo.descripcion || '',
          activo: item.activo !== undefined ? item.activo : (item.Activo !== undefined ? item.Activo : (tipo.activo !== undefined ? tipo.activo : true))
        };
      }),
      catchError(error => {
        console.error('Error updating tipo evidencia:', error);
        if (!error) {
          throw new Error('Error desconocido al actualizar tipo evidencia');
        }
        throw error;
      })
    );
  }

  deleteTipoEvidencia(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/tipo-evidencia/${id}`);
  }

  // Rol Equipo
  getRolesEquipo(): Observable<RolEquipo[]> {
    return this.http.get<any>(`${this.apiUrl}/rol-equipo`).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => ({
          idRolEquipo: item.idRolEquipo || item.IdRolEquipo || item.id,
          nombre: item.nombre || item.Nombre,
          descripcion: item.descripcion || item.Descripcion,
          activo: item.activo !== undefined ? item.activo : (item.Activo !== undefined ? item.Activo : true)
        })) : [];
      }),
      catchError(error => {
        console.error('Error fetching roles equipo:', error);
        return of([]);
      })
    );
  }

  createRolEquipo(rol: Omit<RolEquipo, 'idRolEquipo'>): Observable<RolEquipo> {
    const data = { Nombre: rol.nombre, Descripcion: rol.descripcion, Activo: rol.activo };
    return this.http.post<any>(`${this.apiUrl}/rol-equipo`, data).pipe(
      map(item => ({
        idRolEquipo: item.idRolEquipo || item.IdRolEquipo,
        nombre: item.nombre || item.Nombre,
        descripcion: item.descripcion || item.Descripcion,
        activo: item.activo !== undefined ? item.activo : (item.Activo !== undefined ? item.Activo : true)
      }))
    );
  }

  updateRolEquipo(id: number, rol: Omit<RolEquipo, 'idRolEquipo'>): Observable<RolEquipo> {
    const data = { Nombre: rol.nombre, Descripcion: rol.descripcion, Activo: rol.activo };
    return this.http.put<any>(`${this.apiUrl}/rol-equipo/${id}`, data).pipe(
      map(response => {
        if (!response) {
          return {
            idRolEquipo: id,
            nombre: rol.nombre,
            descripcion: rol.descripcion || '',
            activo: rol.activo !== undefined ? rol.activo : true
          };
        }
        
        const item = response.data || response;
        if (!item) {
          return {
            idRolEquipo: id,
            nombre: rol.nombre,
            descripcion: rol.descripcion || '',
            activo: rol.activo !== undefined ? rol.activo : true
          };
        }
        
        return {
          idRolEquipo: item.idRolEquipo || item.IdRolEquipo || id,
          nombre: item.nombre || item.Nombre || rol.nombre,
          descripcion: item.descripcion || item.Descripcion || rol.descripcion || '',
          activo: item.activo !== undefined ? item.activo : (item.Activo !== undefined ? item.Activo : (rol.activo !== undefined ? rol.activo : true))
        };
      }),
      catchError(error => {
        console.error('Error updating rol equipo:', error);
        if (!error) {
          throw new Error('Error desconocido al actualizar rol equipo');
        }
        throw error;
      })
    );
  }

  deleteRolEquipo(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/rol-equipo/${id}`);
  }

  // Estado Actividad
  // Endpoint: /api/estado-actividad
  getEstadosActividad(): Observable<EstadoActividad[]> {
    return this.http.get<any>(`${this.apiUrl}/estado-actividad`).pipe(
      map(response => {
        const items = response.data || response;
        if (!Array.isArray(items)) {
          console.warn('⚠️ getEstadosActividad - Respuesta no es un array:', items);
          return [];
        }
        return items.map(item => {
          const mapped = {
            id: item.idEstadoActividad || item.IdEstadoActividad || item.Id || item.id || 0,
            idEstadoActividad: item.idEstadoActividad || item.IdEstadoActividad || item.Id || item.id || 0,
            nombre: item.nombre || item.Nombre || item.NombreEstado || item.nombreEstado || '',
            descripcion: item.descripcion || item.Descripcion || item.descripcion || ''
          };
          console.log('🔍 getEstadosActividad - Item mapeado:', { original: item, mapped });
          return mapped;
        });
      }),
      catchError(error => {
        if (error.status === 404) {
          console.warn('⚠️ Endpoint /api/estado-actividad no encontrado (404)');
        } else {
          console.error('❌ Error fetching estados actividad:', error);
        }
        return of([]);
      })
    );
  }

  createEstadoActividad(estado: Omit<EstadoActividad, 'id'>): Observable<EstadoActividad> {
    const data = { NombreEstado: estado.nombre, Descripcion: estado.descripcion };
    console.log('🔄 createEstadoActividad - Enviando datos:', data);
    return this.http.post<any>(`${this.apiUrl}/estado-actividad`, data).pipe(
      map(response => {
        console.log('✅ createEstadoActividad - Respuesta recibida:', response);
        const item = response.data || response;
        if (!item) {
          console.warn('⚠️ createEstadoActividad - Respuesta vacía, usando datos de entrada');
          return {
            id: 0,
            nombre: estado.nombre,
            descripcion: estado.descripcion || ''
          };
        }
        const mapped = {
          id: item.idEstadoActividad || item.IdEstadoActividad || item.Id || item.id || 0,
          idEstadoActividad: item.idEstadoActividad || item.IdEstadoActividad || item.Id || item.id || 0,
          nombre: item.nombre || item.Nombre || item.NombreEstado || item.nombreEstado || estado.nombre,
          descripcion: item.descripcion || item.Descripcion || estado.descripcion || ''
        };
        console.log('✅ createEstadoActividad - Item mapeado:', { original: item, mapped });
        return mapped;
      }),
      catchError(error => {
        console.error('❌ Error creating estado actividad:', error);
        throw error;
      })
    );
  }

  updateEstadoActividad(id: number, estado: Omit<EstadoActividad, 'id'>): Observable<EstadoActividad> {
    const data = { NombreEstado: estado.nombre, Descripcion: estado.descripcion };
    console.log('🔄 updateEstadoActividad - Enviando datos:', { id, data });
    return this.http.put<any>(`${this.apiUrl}/estado-actividad/${id}`, data).pipe(
      map(response => {
        console.log('✅ updateEstadoActividad - Respuesta recibida:', response);
        if (!response) {
          console.warn('⚠️ updateEstadoActividad - Respuesta vacía, usando datos de entrada');
          return {
            id: id,
            idEstadoActividad: id,
            nombre: estado.nombre,
            descripcion: estado.descripcion || ''
          };
        }
        
        const item = response.data || response;
        if (!item) {
          console.warn('⚠️ updateEstadoActividad - Item vacío en respuesta, usando datos de entrada');
          return {
            id: id,
            idEstadoActividad: id,
            nombre: estado.nombre,
            descripcion: estado.descripcion || ''
          };
        }
        
        const mapped = {
          id: item.idEstadoActividad || item.IdEstadoActividad || item.Id || item.id || id,
          idEstadoActividad: item.idEstadoActividad || item.IdEstadoActividad || item.Id || item.id || id,
          nombre: item.nombre || item.Nombre || item.NombreEstado || item.nombreEstado || estado.nombre,
          descripcion: item.descripcion || item.Descripcion || estado.descripcion || ''
        };
        console.log('✅ updateEstadoActividad - Item mapeado:', { original: item, mapped });
        return mapped;
      }),
      catchError(error => {
        console.error('❌ Error updating estado actividad:', error);
        if (!error) {
          throw new Error('Error desconocido al actualizar estado actividad');
        }
        throw error;
      })
    );
  }

  deleteEstadoActividad(id: number): Observable<boolean> {
    return this.http.delete<any>(`${this.apiUrl}/estado-actividad/${id}`).pipe(
      map(() => true),
      catchError(error => {
        if (error.status === 404) {
          return of(false);
        }
        console.error('Error deleting estado actividad:', error);
        return of(false);
      })
    );
  }


  // Tipo Protagonista - Endpoint: /api/tipo-protagonista
  getTiposProtagonista(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/tipo-protagonista`).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => ({
          id: item.idTipoProtagonista || item.IdTipoProtagonista || item.id || item.Id || 0,
          nombre: item.nombre || item.Nombre || '',
          descripcion: item.descripcion || item.Descripcion || '',
          activo: item.activo !== undefined ? item.activo : (item.Activo !== undefined ? item.Activo : true)
        })) : [];
      }),
      catchError(error => {
        if (error.status === 404) {
          console.warn('⚠️ Endpoint /api/tipo-protagonista no encontrado (404)');
        } else {
          console.error('❌ Error fetching tipos protagonista:', error);
        }
        return of([]);
      })
    );
  }

  // Capacidades Instaladas - Endpoint: /api/capacidad-instalaciones
  getCapacidadesInstaladas(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/capacidad-instalaciones`).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => ({
          id: item.idCapacidadInstalada || item.IdCapacidadInstalada || item.id || item.Id || 0,
          nombre: item.nombreInstalacion || item.NombreInstalacion || item.nombre || item.Nombre || '',
          descripcion: item.descripcion || item.Descripcion || ''
        })) : [];
      }),
      catchError(error => {
        if (error.status === 404) {
          console.warn('⚠️ Endpoint /api/capacidad-instalaciones no encontrado (404)');
        } else {
          console.error('❌ Error fetching capacidades instaladas:', error);
        }
        return of([]);
      })
    );
  }

  // CRUD para Capacidades Instaladas
  getCapacidadInstaladaById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/capacidad-instalaciones/${id}`).pipe(
      map(response => {
        const item = response.data || response;
        return {
          id: item.idCapacidadInstalada || item.IdCapacidadInstalada || item.id || item.Id || 0,
          nombre: item.nombreInstalacion || item.NombreInstalacion || item.nombre || item.Nombre || '',
          descripcion: item.descripcion || item.Descripcion || ''
        };
      }),
      catchError(error => {
        console.error('❌ Error fetching capacidad instalada:', error);
        throw error;
      })
    );
  }

  createCapacidadInstalada(data: { nombre: string, descripcion?: string }): Observable<any> {
    const dto = {
      NombreInstalacion: data.nombre,
      Descripcion: data.descripcion || ''
    };
    return this.http.post<any>(`${this.apiUrl}/capacidad-instalaciones`, dto).pipe(
      map(response => {
        const item = response.data || response;
        return {
          id: item.idCapacidadInstalada || item.IdCapacidadInstalada || item.id || item.Id || 0,
          nombre: item.nombreInstalacion || item.NombreInstalacion || item.nombre || item.Nombre || '',
          descripcion: item.descripcion || item.Descripcion || ''
        };
      }),
      catchError(error => {
        console.error('❌ Error creating capacidad instalada:', error);
        throw error;
      })
    );
  }

  updateCapacidadInstalada(id: number, data: { nombre: string, descripcion?: string }): Observable<any> {
    const dto = {
      NombreInstalacion: data.nombre,
      Descripcion: data.descripcion || ''
    };
    return this.http.put<any>(`${this.apiUrl}/capacidad-instalaciones/${id}`, dto).pipe(
      map(response => {
        const item = response.data || response;
        return {
          id: item.idCapacidadInstalada || item.IdCapacidadInstalada || item.id || item.Id || 0,
          nombre: item.nombreInstalacion || item.NombreInstalacion || item.nombre || item.Nombre || '',
          descripcion: item.descripcion || item.Descripcion || ''
        };
      }),
      catchError(error => {
        console.error('❌ Error updating capacidad instalada:', error);
        throw error;
      })
    );
  }

  deleteCapacidadInstalada(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/capacidad-instalaciones/${id}`).pipe(
      catchError(error => {
        console.error('❌ Error deleting capacidad instalada:', error);
        throw error;
      })
    );
  }
}
