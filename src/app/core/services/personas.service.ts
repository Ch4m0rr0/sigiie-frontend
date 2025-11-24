import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
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
    const url = `${this.apiUrl}/estudiantes`;
    console.log('🔄 GET Estudiantes - URL:', url);
    console.log('🔄 GET Estudiantes - apiUrl base:', this.apiUrl);
    
    return this.http.get<any>(url, { observe: 'response' }).pipe(
      map(httpResponse => {
        console.log('🔄 GET Estudiantes - Status:', httpResponse.status);
        console.log('🔄 GET Estudiantes - Headers:', httpResponse.headers.keys());
        const response = httpResponse.body;
        console.log('🔄 GET Estudiantes - Respuesta completa (body):', response);
        console.log('🔄 GET Estudiantes - Tipo de respuesta:', typeof response);
        console.log('🔄 GET Estudiantes - ¿Es array?', Array.isArray(response));
        console.log('🔄 GET Estudiantes - ¿Es objeto?', response && typeof response === 'object');
        
        const items = response?.data || response;
        console.log('🔄 GET Estudiantes - Items extraídos:', items);
        console.log('🔄 GET Estudiantes - Longitud de items:', Array.isArray(items) ? items.length : 'No es array');
        
        if (Array.isArray(items) && items.length > 0) {
          console.log('🔄 GET Estudiantes - Primer item:', items[0]);
          console.log('🔄 GET Estudiantes - Claves del primer item:', Object.keys(items[0]));
        } else if (Array.isArray(items) && items.length === 0) {
          console.warn('⚠️ GET Estudiantes - El backend devolvió un array vacío []');
        }
        
        const mapped = Array.isArray(items) ? items.map(item => this.mapEstudiante(item)) : [];
        console.log('✅ GET Estudiantes - Items mapeados:', mapped.length);
        if (mapped.length > 0) {
          console.log('✅ GET Estudiantes - Primer estudiante mapeado:', mapped[0]);
        }
        return mapped;
      }),
      catchError(error => {
        console.error('❌ Error fetching estudiantes:', error);
        console.error('❌ Error status:', error.status);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error body:', error.error);
        if (error.status === 404) {
          console.warn('⚠️ Endpoint /api/estudiantes no encontrado (404)');
          return of([]);
        }
        throw error;
      })
    );
  }

  private mapEstudiante(item: any): Estudiante {
    // El backend devuelve IdEstudiante según EstudianteDto
    const id = item.id || item.Id || item.IdEstudiante || 0;
    
    // El backend devuelve nombres (Genero, Departamento, EstadoEstudiante) pero necesitamos los IDs
    // Por ahora, intentamos mapear desde diferentes posibles campos
    // Si el backend incluye los IDs en la navegación, los usamos; si no, intentamos desde otros campos
    const generoId = item.generoId || item.GeneroId || item.IdGenero || 0;
    const departamentoId = item.departamentoId || item.DepartamentoId || 0;
    const estadoId = item.estadoId || item.EstadoId || item.IdEstadoEstudiante || 0;
    
    // Log para debugging si el ID es 0 (podría indicar un problema de mapeo)
    if (id === 0) {
      console.warn('⚠️ mapEstudiante - ID es 0, item completo:', item);
    }
    
    const mapped = {
      id: id,
      nombreCompleto: item.nombreCompleto || item.NombreCompleto || '',
      matricula: item.matricula || item.Matricula || item.numeroCarnet || item.NumeroCarnet || '',
      correo: item.correo || item.Correo || '',
      generoId: generoId,
      departamentoId: departamentoId,
      estadoId: estadoId,
      fechaIngreso: item.fechaIngreso ? new Date(item.fechaIngreso) : (item.FechaIngreso ? new Date(item.FechaIngreso) : new Date()),
      activo: item.activo !== undefined ? item.activo : (item.Activo !== undefined ? item.Activo : true),
      numeroOrcid: item.numeroOrcid || item.NumeroOrcid || undefined,
      cedula: item.cedula || item.Cedula || undefined,
      carrera: item.carrera || item.Carrera || undefined,
      idCategoriaParticipacion: item.idCategoriaParticipacion || item.IdCategoriaParticipacion || undefined,
      nivelFormacion: item.nivelFormacion || item.NivelFormacion || undefined
    };
    
    // Log para debugging si algún campo crítico está vacío
    if (!mapped.nombreCompleto || !mapped.matricula || !mapped.correo) {
      console.warn('⚠️ mapEstudiante - Campos críticos vacíos:', {
        nombreCompleto: mapped.nombreCompleto,
        matricula: mapped.matricula,
        correo: mapped.correo,
        itemOriginal: item
      });
    }
    
    return mapped;
  }

  getEstudiante(id: number): Observable<Estudiante | null> {
    return this.http.get<any>(`${this.apiUrl}/estudiantes/${id}`).pipe(
      map(item => this.mapEstudiante(item)),
      catchError(error => {
        if (error.status === 404) return of(null);
        console.error('Error fetching estudiante:', error);
        throw error;
      })
    );
  }

  createEstudiante(estudiante: Omit<Estudiante, 'id'>): Observable<Estudiante> {
    // Validar que todos los campos requeridos estén presentes
    if (!estudiante.nombreCompleto || !estudiante.matricula || !estudiante.correo || 
        !estudiante.generoId || !estudiante.departamentoId || !estudiante.estadoId) {
      throw new Error('Faltan campos requeridos para crear el estudiante');
    }

    // Convertir a PascalCase según EstudianteCreateDto del backend
    // Campos requeridos: NombreCompleto, NumeroCarnet, Correo, IdGenero, DepartamentoId, IdEstadoEstudiante
    // Campos opcionales: Cedula, NumeroOrcid, Carrera, IdCategoriaParticipacion, NivelFormacion
    // NOTA: El backend NO usa FechaIngreso en CreateAsync, solo lo usa internamente
    // IMPORTANTE: No incluir campos opcionales (Cedula, NumeroOrcid) si no tienen valor
    // para evitar violaciones de UNIQUE constraint cuando el backend asigna null
    const dto: any = {
      NombreCompleto: estudiante.nombreCompleto.trim(),
      NumeroCarnet: estudiante.matricula.trim(),
      Correo: estudiante.correo.trim(),
      IdGenero: Number(estudiante.generoId),
      DepartamentoId: Number(estudiante.departamentoId),
      IdEstadoEstudiante: Number(estudiante.estadoId)
    };
    
    // Solo incluir NumeroOrcid si tiene valor (no null ni vacío)
    // Si no se incluye, el backend no debería asignarlo como null
    if (estudiante.numeroOrcid && estudiante.numeroOrcid.trim()) {
      dto.NumeroOrcid = estudiante.numeroOrcid.trim();
      console.log('✅ CREATE Estudiante - NumeroOrcid incluido:', dto.NumeroOrcid);
    }
    
    // Solo incluir Cedula si tiene valor (no null ni vacío)
    // Si no se incluye, el backend no debería asignarlo como null
    if (estudiante.cedula && estudiante.cedula.trim()) {
      dto.Cedula = estudiante.cedula.trim();
      console.log('✅ CREATE Estudiante - Cedula incluida:', dto.Cedula);
    }
    
    // Solo incluir Carrera si tiene valor
    if (estudiante.carrera && estudiante.carrera.trim()) {
      dto.Carrera = estudiante.carrera.trim();
    }
    
    // Solo incluir IdCategoriaParticipacion si tiene valor
    if (estudiante.idCategoriaParticipacion && estudiante.idCategoriaParticipacion > 0) {
      dto.IdCategoriaParticipacion = Number(estudiante.idCategoriaParticipacion);
    }
    
    // Solo incluir NivelFormacion si tiene valor
    if (estudiante.nivelFormacion && estudiante.nivelFormacion.trim()) {
      dto.NivelFormacion = estudiante.nivelFormacion.trim();
    }
    
    // Validar que los IDs sean números válidos
    if (isNaN(dto.IdGenero) || isNaN(dto.DepartamentoId) || isNaN(dto.IdEstadoEstudiante)) {
      throw new Error('Los IDs deben ser números válidos');
    }
    
    console.log('🔄 CREATE Estudiante - DTO enviado:', JSON.stringify(dto, null, 2));
    console.log('🔄 CREATE Estudiante - Keys del DTO:', Object.keys(dto));
    console.log('🔄 CREATE Estudiante - ¿NumeroOrcid presente?', 'NumeroOrcid' in dto);
    console.log('🔄 CREATE Estudiante - Tipos de datos:', {
      NombreCompleto: typeof dto.NombreCompleto,
      NumeroCarnet: typeof dto.NumeroCarnet,
      Correo: typeof dto.Correo,
      IdGenero: typeof dto.IdGenero,
      DepartamentoId: typeof dto.DepartamentoId,
      IdEstadoEstudiante: typeof dto.IdEstadoEstudiante
    });
    console.log('🔄 CREATE Estudiante - URL:', `${this.apiUrl}/estudiantes`);
    
    return this.http.post<any>(`${this.apiUrl}/estudiantes`, dto).pipe(
      map(item => {
        console.log('✅ CREATE Estudiante - Respuesta recibida:', item);
        return this.mapEstudiante(item);
      }),
      catchError(error => {
        console.error('❌ Error creating estudiante:', error);
        console.error('❌ Error status:', error.status);
        console.error('❌ Error statusText:', error.statusText);
        console.error('❌ Error error (body):', error.error);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error url:', error.url);
        
        // Intentar extraer mensaje de validación del backend
        if (error.error) {
          if (error.error.errors) {
            console.error('❌ Validation errors:', JSON.stringify(error.error.errors, null, 2));
          }
          if (error.error.title) {
            console.error('❌ Error title:', error.error.title);
          }
          // Extraer mensaje de excepción del backend
          if (typeof error.error === 'string' && error.error.includes('Exception')) {
            const exceptionMatch = error.error.match(/Exception:\s*(.+?)(?:\r\n|$)/);
            if (exceptionMatch) {
              console.error('❌ Backend exception message:', exceptionMatch[1]);
            }
          }
        }
        
        throw error;
      })
    );
  }

  updateEstudiante(id: number, estudiante: Partial<Estudiante>): Observable<Estudiante> {
    // Convertir a PascalCase según EstudianteUpdateDto del backend
    const dto: any = {};
    if (estudiante.nombreCompleto !== undefined) dto.NombreCompleto = estudiante.nombreCompleto.trim();
    if (estudiante.matricula !== undefined) dto.NumeroCarnet = estudiante.matricula.trim();
    if (estudiante.correo !== undefined) dto.Correo = estudiante.correo.trim();
    if (estudiante.generoId !== undefined) dto.IdGenero = Number(estudiante.generoId);
    if (estudiante.departamentoId !== undefined) dto.DepartamentoId = Number(estudiante.departamentoId);
    if (estudiante.estadoId !== undefined) dto.IdEstadoEstudiante = Number(estudiante.estadoId);
    if (estudiante.activo !== undefined) dto.Activo = Boolean(estudiante.activo);
    // Solo incluir NumeroOrcid si tiene valor (no null ni vacío)
    if (estudiante.numeroOrcid !== undefined && estudiante.numeroOrcid && estudiante.numeroOrcid.trim()) {
      dto.NumeroOrcid = estudiante.numeroOrcid.trim();
    }
    // Solo incluir Cedula si tiene valor (no null ni vacío)
    if (estudiante.cedula !== undefined && estudiante.cedula && estudiante.cedula.trim()) {
      dto.Cedula = estudiante.cedula.trim();
    }
    // Solo incluir Carrera si tiene valor
    if (estudiante.carrera !== undefined && estudiante.carrera && estudiante.carrera.trim()) {
      dto.Carrera = estudiante.carrera.trim();
    }
    // Solo incluir IdCategoriaParticipacion si tiene valor
    if (estudiante.idCategoriaParticipacion !== undefined && estudiante.idCategoriaParticipacion && estudiante.idCategoriaParticipacion > 0) {
      dto.IdCategoriaParticipacion = Number(estudiante.idCategoriaParticipacion);
    }
    // Solo incluir NivelFormacion si tiene valor
    if (estudiante.nivelFormacion !== undefined && estudiante.nivelFormacion && estudiante.nivelFormacion.trim()) {
      dto.NivelFormacion = estudiante.nivelFormacion.trim();
    }
    
    return this.http.put<any>(`${this.apiUrl}/estudiantes/${id}`, dto).pipe(
      map(item => this.mapEstudiante(item)),
      catchError(error => {
        console.error('Error updating estudiante:', error);
        throw error;
      })
    );
  }

  deleteEstudiante(id: number): Observable<boolean> {
    return this.http.delete<any>(`${this.apiUrl}/estudiantes/${id}`).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error deleting estudiante:', error);
        throw error;
      })
    );
  }

  getHistorialEstados(id: number): Observable<any[]> { // Ajustar tipo según backend
    return this.http.get<any[]>(`${this.apiUrl}/estudiantes/${id}/historial-estados`);
  }

  // Docentes
  listDocentes(): Observable<Docente[]> {
    return this.http.get<any>(`${this.apiUrl}/docentes`).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapDocente(item)) : [];
      }),
      catchError(error => {
        if (error.status === 404) {
          console.warn('⚠️ Endpoint /api/docentes no encontrado (404)');
          return of([]);
        }
        console.error('Error fetching docentes:', error);
        throw error;
      })
    );
  }

  private mapDocente(item: any): Docente {
    return {
      id: item.id || item.Id || 0,
      nombreCompleto: item.nombreCompleto || item.NombreCompleto || '',
      correo: item.correo || item.Correo || '',
      departamentoId: item.departamentoId || item.DepartamentoId || 0,
      activo: item.activo !== undefined ? item.activo : (item.Activo !== undefined ? item.Activo : true),
      numeroOrcid: item.numeroOrcid || item.NumeroOrcid || undefined
    };
  }

  getDocente(id: number): Observable<Docente | null> {
    return this.http.get<any>(`${this.apiUrl}/docentes/${id}`).pipe(
      map(item => this.mapDocente(item)),
      catchError(error => {
        if (error.status === 404) return of(null);
        console.error('Error fetching docente:', error);
        throw error;
      })
    );
  }

  createDocente(docente: Omit<Docente, 'id'>): Observable<Docente> {
    // Validar que todos los campos requeridos estén presentes
    if (!docente.nombreCompleto || !docente.correo || !docente.departamentoId) {
      throw new Error('Faltan campos requeridos para crear el docente');
    }

    const dto: any = {
      NombreCompleto: docente.nombreCompleto.trim(),
      Correo: docente.correo.trim(),
      DepartamentoId: Number(docente.departamentoId),
      Activo: docente.activo !== undefined ? docente.activo : true
    };
    
    // Solo incluir NumeroOrcid si tiene valor (no null ni vacío)
    // Si no se incluye, el backend no debería asignarlo como null
    if (docente.numeroOrcid && docente.numeroOrcid.trim()) {
      dto.NumeroOrcid = docente.numeroOrcid.trim();
      console.log('✅ CREATE Docente - NumeroOrcid incluido:', dto.NumeroOrcid);
    }
    
    // Validar que el ID del departamento sea un número válido
    if (isNaN(dto.DepartamentoId)) {
      throw new Error('El ID del departamento debe ser un número válido');
    }
    
    console.log('🔄 CREATE Docente - DTO enviado:', JSON.stringify(dto, null, 2));
    console.log('🔄 CREATE Docente - URL:', `${this.apiUrl}/docentes`);
    
    return this.http.post<any>(`${this.apiUrl}/docentes`, dto).pipe(
      map(item => {
        console.log('✅ CREATE Docente - Respuesta recibida:', item);
        return this.mapDocente(item);
      }),
      catchError(error => {
        console.error('❌ Error creating docente:', error);
        console.error('❌ Error status:', error.status);
        console.error('❌ Error statusText:', error.statusText);
        console.error('❌ Error error (body):', error.error);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error url:', error.url);
        
        // Intentar extraer mensaje de validación del backend
        if (error.error) {
          if (error.error.errors) {
            console.error('❌ Validation errors:', JSON.stringify(error.error.errors, null, 2));
          }
          if (error.error.title) {
            console.error('❌ Error title:', error.error.title);
          }
          // Extraer mensaje de excepción del backend
          if (typeof error.error === 'string' && error.error.includes('Exception')) {
            const exceptionMatch = error.error.match(/Exception:\s*(.+?)(?:\r\n|$)/);
            if (exceptionMatch) {
              console.error('❌ Backend exception message:', exceptionMatch[1]);
            }
          }
        }
        
        throw error;
      })
    );
  }

  updateDocente(id: number, docente: Partial<Docente>): Observable<Docente> {
    const dto: any = {};
    if (docente.nombreCompleto !== undefined) dto.NombreCompleto = docente.nombreCompleto.trim();
    if (docente.correo !== undefined) dto.Correo = docente.correo.trim();
    if (docente.departamentoId !== undefined) dto.DepartamentoId = Number(docente.departamentoId);
    // Solo incluir NumeroOrcid si tiene valor (no null ni vacío)
    if (docente.numeroOrcid !== undefined && docente.numeroOrcid && docente.numeroOrcid.trim()) {
      dto.NumeroOrcid = docente.numeroOrcid.trim();
    }
    if (docente.activo !== undefined) dto.Activo = docente.activo;
    
    return this.http.put<any>(`${this.apiUrl}/docentes/${id}`, dto).pipe(
      map(item => this.mapDocente(item)),
      catchError(error => {
        console.error('Error updating docente:', error);
        throw error;
      })
    );
  }

  activarDesactivarDocente(id: number, activo: boolean): Observable<Docente> {
    return this.http.patch<any>(`${this.apiUrl}/docentes/${id}/activo`, { Activo: activo }).pipe(
      map(item => this.mapDocente(item)),
      catchError(error => {
        console.error('Error activando/desactivando docente:', error);
        throw error;
      })
    );
  }

  deleteDocente(id: number): Observable<boolean> {
    return this.http.delete<any>(`${this.apiUrl}/docentes/${id}`).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error deleting docente:', error);
        throw error;
      })
    );
  }

  // Administrativos
  listAdministrativos(): Observable<Administrativo[]> {
    return this.http.get<any>(`${this.apiUrl}/administrativos`).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapAdministrativo(item)) : [];
      }),
      catchError(error => {
        if (error.status === 404) {
          console.warn('⚠️ Endpoint /api/administrativos no encontrado (404)');
          return of([]);
        }
        console.error('Error fetching administrativos:', error);
        throw error;
      })
    );
  }

  private mapAdministrativo(item: any): Administrativo {
    return {
      id: item.id || item.Id || 0,
      nombreCompleto: item.nombreCompleto || item.NombreCompleto || '',
      correo: item.correo || item.Correo || '',
      departamentoId: item.departamentoId || item.DepartamentoId || 0,
      activo: item.activo !== undefined ? item.activo : (item.Activo !== undefined ? item.Activo : true)
    };
  }

  getAdministrativo(id: number): Observable<Administrativo | null> {
    return this.http.get<any>(`${this.apiUrl}/administrativos/${id}`).pipe(
      map(item => this.mapAdministrativo(item)),
      catchError(error => {
        if (error.status === 404) return of(null);
        console.error('Error fetching administrativo:', error);
        throw error;
      })
    );
  }

  createAdministrativo(administrativo: Omit<Administrativo, 'id'>): Observable<Administrativo> {
    const dto: any = {
      NombreCompleto: administrativo.nombreCompleto,
      Correo: administrativo.correo,
      DepartamentoId: administrativo.departamentoId
    };
    
    return this.http.post<any>(`${this.apiUrl}/administrativos`, dto).pipe(
      map(item => this.mapAdministrativo(item)),
      catchError(error => {
        console.error('Error creating administrativo:', error);
        throw error;
      })
    );
  }

  updateAdministrativo(id: number, administrativo: Partial<Administrativo>): Observable<Administrativo> {
    const dto: any = {};
    if (administrativo.nombreCompleto !== undefined) dto.NombreCompleto = administrativo.nombreCompleto;
    if (administrativo.correo !== undefined) dto.Correo = administrativo.correo;
    if (administrativo.departamentoId !== undefined) dto.DepartamentoId = administrativo.departamentoId;
    
    return this.http.put<any>(`${this.apiUrl}/administrativos/${id}`, dto).pipe(
      map(item => this.mapAdministrativo(item)),
      catchError(error => {
        console.error('Error updating administrativo:', error);
        throw error;
      })
    );
  }

  deleteAdministrativo(id: number): Observable<boolean> {
    return this.http.delete<any>(`${this.apiUrl}/administrativos/${id}`).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error deleting administrativo:', error);
        throw error;
      })
    );
  }

  /**
   * GET /api/administrativos/buscar/{nombre}
   * Busca administrativos por nombre
   */
  buscarAdministrativosPorNombre(nombre: string): Observable<Administrativo[]> {
    return this.http.get<any>(`${this.apiUrl}/administrativos/buscar/${encodeURIComponent(nombre)}`).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapAdministrativo(item)) : [];
      }),
      catchError(error => {
        if (error.status === 404) {
          console.warn('⚠️ Endpoint /api/administrativos/buscar no encontrado (404)');
          return of([]);
        }
        console.error('Error searching administrativos:', error);
        throw error;
      })
    );
  }
}
