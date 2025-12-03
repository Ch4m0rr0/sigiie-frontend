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
        
        const mapped = Array.isArray(items) ? items.map((item, index) => this.mapEstudiante(item, index)) : [];
        console.log('✅ GET Estudiantes - Items mapeados:', mapped.length);
        if (mapped.length > 0) {
          console.log('✅ GET Estudiantes - Primer estudiante mapeado:', mapped[0]);
        }
        return mapped;
      }),
      catchError(error => {
        if (error.status === 404) {
          console.warn('⚠️ Endpoint /api/estudiantes no encontrado (404)');
          return of([]);
        } else if (error.status === 500) {
          // Error del backend: columnas faltantes en la base de datos
          // El servicio retorna un array vacío para que el frontend pueda continuar
          const errorText = typeof error.error === 'string' ? error.error : JSON.stringify(error.error || {});
          if (errorText.includes('departamento_id') || errorText.includes('carrera')) {
            console.warn('⚠️ Error 500 del servidor al obtener estudiantes. El backend está intentando acceder a columnas que no existen en la base de datos: "departamento_id" y/o "carrera".');
            console.warn('⚠️ El formulario continuará funcionando, pero no se mostrarán estudiantes en la lista de responsables.');
          } else {
            console.warn('⚠️ Error 500 del servidor al obtener estudiantes:', errorText);
          }
          return of([]);
        }
        console.warn('⚠️ Error al obtener estudiantes:', error.status, error.message);
        return of([]);
      })
    );
  }

  private mapEstudiante(item: any, index?: number): Estudiante {
    // El backend devuelve IdEstudiante según EstudianteDto
    // Intentar múltiples variantes de nombres de propiedades (case-insensitive)
    let id = item.id || item.Id || item.ID || 
             item.idEstudiante || item.IdEstudiante || item.IDEstudiante ||
             item.estudianteId || item.EstudianteId || item.EstudianteID;
    
    // Si el ID es 0, null o undefined, intentar usar el índice como fallback temporal
    // pero solo para listas (cuando index está definido)
    if ((!id || id === 0) && index !== undefined) {
      // Usar un ID negativo temporal basado en el índice para evitar duplicados
      id = -(index + 1000); // Usar números negativos grandes para evitar conflictos
      console.warn('⚠️ mapEstudiante - ID no encontrado, usando ID temporal:', id, 'item:', item);
    } else if (!id || id === 0) {
      // Para operaciones individuales (get, create, update), no podemos usar índice
      // En este caso, lanzar un error o usar un valor que indique problema
      console.error('❌ mapEstudiante - ID no encontrado y no hay índice disponible. Item:', item);
      id = -1; // ID inválido que será detectado por la validación
    }
    
    const finalId = id;
    
    // El backend devuelve nombres (Genero, Departamento, EstadoEstudiante) pero necesitamos los IDs
    // Por ahora, intentamos mapear desde diferentes posibles campos
    // Si el backend incluye los IDs en la navegación, los usamos; si no, intentamos desde otros campos
    // NOTA: Estos campos son opcionales - no necesarios para el contexto de actividades
    const generoId = item.generoId || item.GeneroId || item.IdGenero || item.idGenero || undefined;
    const departamentoId = item.departamentoId || item.DepartamentoId || undefined; // No existe en la tabla, obtener desde carrera si se necesita
    const estadoId = item.estadoId || item.EstadoId || item.IdEstadoEstudiante || item.idEstadoEstudiante || undefined;
    
    // Log para debugging si el ID es inválido (podría indicar un problema de mapeo)
    if (finalId <= 0) {
      console.warn('⚠️ mapEstudiante - ID inválido o temporal:', finalId, 'item completo:', item);
    }
    
    const mapped = {
      id: finalId,
      nombreCompleto: item.nombreCompleto || item.NombreCompleto || '',
      matricula: item.matricula || item.Matricula || item.numeroCarnet || item.NumeroCarnet || '',
      correo: item.correo || item.Correo || '',
      generoId: generoId,
      departamentoId: departamentoId, // Opcional - no existe en la tabla, se obtiene desde carrera si se necesita
      estadoId: estadoId,
      fechaIngreso: item.fechaIngreso ? new Date(item.fechaIngreso) : (item.FechaIngreso ? new Date(item.FechaIngreso) : undefined),
      activo: item.activo !== undefined ? item.activo : (item.Activo !== undefined ? item.Activo : true),
      numeroOrcid: item.numeroOrcid || item.NumeroOrcid || undefined,
      cedula: item.cedula || item.Cedula || undefined,
      carrera: item.carrera || item.Carrera || undefined, // Opcional - no existe en la tabla
      idCarrera: item.idCarrera || item.IdCarrera || item.id_carrera || undefined, // Columna real en la BD
      idCategoriaParticipacion: item.idCategoriaParticipacion || item.IdCategoriaParticipacion || item.id_categoria_participacion || undefined,
      nivelFormacion: item.nivelFormacion || item.NivelFormacion || item.nivel_formacion || undefined
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
      map(item => this.mapEstudiante(item, 0)),
      catchError(error => {
        if (error.status === 404) return of(null);
        console.error('Error fetching estudiante:', error);
        throw error;
      })
    );
  }

  createEstudiante(estudiante: Omit<Estudiante, 'id'>): Observable<Estudiante> {
    // Validar que todos los campos requeridos estén presentes
    // NOTA: departamentoId no es requerido - se obtiene desde idCarrera si se necesita
    if (!estudiante.nombreCompleto || !estudiante.matricula || !estudiante.correo) {
      throw new Error('Faltan campos requeridos para crear el estudiante: nombreCompleto, matricula, correo');
    }

    // Convertir a PascalCase según EstudianteCreateDto del backend
    // Campos requeridos: NombreCompleto, NumeroCarnet, Correo
    // Campos opcionales: IdGenero, IdCarrera (no DepartamentoId), IdEstadoEstudiante, Cedula, NumeroOrcid, IdCategoriaParticipacion, NivelFormacion
    // NOTA: El backend NO usa FechaIngreso en CreateAsync, solo lo usa internamente
    // IMPORTANTE: No incluir campos opcionales (Cedula, NumeroOrcid) si no tienen valor
    // para evitar violaciones de UNIQUE constraint cuando el backend asigna null
    // NOTA: DepartamentoId no se envía - el backend lo obtiene desde IdCarrera si es necesario
    const dto: any = {
      NombreCompleto: estudiante.nombreCompleto.trim(),
      NumeroCarnet: estudiante.matricula.trim(),
      Correo: estudiante.correo.trim()
    };
    
    // Campos opcionales - solo incluir si tienen valor
    if (estudiante.generoId) {
      dto.IdGenero = Number(estudiante.generoId);
    }
    if (estudiante.idCarrera) {
      dto.IdCarrera = Number(estudiante.idCarrera); // Usar IdCarrera en lugar de DepartamentoId
    }
    if (estudiante.estadoId) {
      dto.IdEstadoEstudiante = Number(estudiante.estadoId);
    }
    
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
    
    // Solo incluir IdCategoriaParticipacion si tiene valor
    if (estudiante.idCategoriaParticipacion && estudiante.idCategoriaParticipacion > 0) {
      dto.IdCategoriaParticipacion = Number(estudiante.idCategoriaParticipacion);
    }
    
    // Solo incluir NivelFormacion si tiene valor
    if (estudiante.nivelFormacion && estudiante.nivelFormacion.trim()) {
      dto.NivelFormacion = estudiante.nivelFormacion.trim();
    }
    
    // Validar que los IDs sean números válidos
    // Validar que los campos numéricos sean válidos si están presentes
    if (dto.IdGenero !== undefined && isNaN(dto.IdGenero)) {
      throw new Error('IdGenero debe ser un número válido');
    }
    if (dto.IdCarrera !== undefined && isNaN(dto.IdCarrera)) {
      throw new Error('IdCarrera debe ser un número válido');
    }
    if (dto.IdEstadoEstudiante !== undefined && isNaN(dto.IdEstadoEstudiante)) {
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
    
    // Función auxiliar para validar y convertir números
    const toNumber = (value: any): number | null => {
      if (value === null || value === undefined || value === '') return null;
      const num = Number(value);
      return !isNaN(num) && isFinite(num) && num > 0 ? num : null;
    };
    
    // Campos requeridos o comunes
    if (estudiante.nombreCompleto !== undefined && estudiante.nombreCompleto && String(estudiante.nombreCompleto).trim()) {
      dto.NombreCompleto = String(estudiante.nombreCompleto).trim();
    }
    if (estudiante.matricula !== undefined && estudiante.matricula && String(estudiante.matricula).trim()) {
      dto.NumeroCarnet = String(estudiante.matricula).trim();
    }
    if (estudiante.correo !== undefined && estudiante.correo && String(estudiante.correo).trim()) {
      dto.Correo = String(estudiante.correo).trim();
    }
    
    // IDs numéricos - solo incluir si son válidos (> 0) y son números
    const generoId = toNumber(estudiante.generoId);
    if (generoId !== null) {
      dto.IdGenero = generoId;
    }
    
    // IdCarrera - usar en lugar de DepartamentoId (el departamento se obtiene desde la carrera)
    const idCarrera = toNumber(estudiante.idCarrera);
    if (idCarrera !== null) {
      dto.IdCarrera = idCarrera;
    }
    
    const estadoId = toNumber(estudiante.estadoId);
    if (estadoId !== null) {
      dto.IdEstadoEstudiante = estadoId;
    }
    
    // Campo booleano
    if (estudiante.activo !== undefined) {
      dto.Activo = Boolean(estudiante.activo);
    }
    
    // Campos opcionales - solo incluir si tienen valor
    if (estudiante.numeroOrcid !== undefined && estudiante.numeroOrcid && String(estudiante.numeroOrcid).trim()) {
      dto.NumeroOrcid = String(estudiante.numeroOrcid).trim();
    }
    if (estudiante.cedula !== undefined && estudiante.cedula && String(estudiante.cedula).trim()) {
      dto.Cedula = String(estudiante.cedula).trim();
    }
    
    const categoriaId = toNumber(estudiante.idCategoriaParticipacion);
    if (categoriaId !== null) {
      dto.IdCategoriaParticipacion = categoriaId;
    }
    
    if (estudiante.nivelFormacion !== undefined && estudiante.nivelFormacion && String(estudiante.nivelFormacion).trim()) {
      dto.NivelFormacion = String(estudiante.nivelFormacion).trim();
    }
    
    // Fecha de ingreso si está presente
    if (estudiante.fechaIngreso !== undefined) {
      if (estudiante.fechaIngreso instanceof Date) {
        dto.FechaIngreso = estudiante.fechaIngreso.toISOString().split('T')[0];
      } else {
        const fechaStr = String(estudiante.fechaIngreso);
        dto.FechaIngreso = fechaStr.split('T')[0];
      }
    }
    
    console.log('🔄 PUT Estudiante - ID:', id);
    console.log('🔄 PUT Estudiante - DTO enviado:', JSON.stringify(dto, null, 2));
    console.log('🔄 PUT Estudiante - Datos originales:', estudiante);
    
    return this.http.put<any>(`${this.apiUrl}/estudiantes/${id}`, dto).pipe(
      map(item => {
        console.log('✅ PUT Estudiante - Respuesta recibida:', item);
        return this.mapEstudiante(item, 0);
      }),
      catchError(error => {
        console.error('❌ Error updating estudiante:', error);
        console.error('❌ Error status:', error.status);
        console.error('❌ Error statusText:', error.statusText);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error error (body):', error.error);
        console.error('❌ DTO que causó el error:', JSON.stringify(dto, null, 2));
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
        } else if (error.status === 500) {
          console.error('❌ Error 500 del servidor al obtener docentes:', error);
          return of([]);
        }
        console.error('Error fetching docentes:', error);
        return of([]);
      })
    );
  }

  private mapDocente(item: any): Docente {
    // El backend devuelve DocenteDto con Genero como string, pero necesitamos el ID
    // Si el backend incluye IdGenero o generoId, lo usamos; si no, intentamos desde otros campos
    const generoId = item.generoId || item.GeneroId || item.IdGenero || 0;
    
    return {
      id: item.id || item.Id || item.IdDocente || 0,
      nombreCompleto: item.nombreCompleto || item.NombreCompleto || '',
      correo: item.correo || item.Correo || '',
      generoId: generoId,
      departamentoId: item.departamentoId || item.DepartamentoId || 0,
      activo: item.activo !== undefined ? item.activo : (item.Activo !== undefined ? item.Activo : true),
      numeroOrcid: item.numeroOrcid || item.NumeroOrcid || undefined,
      cedula: item.cedula || item.Cedula || undefined,
      nivelAcademico: item.nivelAcademico || item.NivelAcademico || undefined
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
    if (!docente.nombreCompleto || !docente.correo || !docente.generoId || !docente.departamentoId) {
      throw new Error('Faltan campos requeridos para crear el docente (nombreCompleto, correo, generoId, departamentoId)');
    }

    const dto: any = {
      NombreCompleto: docente.nombreCompleto.trim(),
      Correo: docente.correo.trim(),
      IdGenero: Number(docente.generoId), // Requerido según DocenteCreateDto
      DepartamentoId: Number(docente.departamentoId),
      Activo: docente.activo !== undefined ? docente.activo : true
    };
    
    // Solo incluir NumeroOrcid si tiene valor (no null ni vacío)
    if (docente.numeroOrcid && docente.numeroOrcid.trim()) {
      dto.NumeroOrcid = docente.numeroOrcid.trim();
      console.log('✅ CREATE Docente - NumeroOrcid incluido:', dto.NumeroOrcid);
    }
    
    // Solo incluir Cedula si tiene valor
    if (docente.cedula && docente.cedula.trim()) {
      dto.Cedula = docente.cedula.trim();
      console.log('✅ CREATE Docente - Cedula incluida:', dto.Cedula);
    }
    
    // Solo incluir NivelAcademico si tiene valor
    if (docente.nivelAcademico && docente.nivelAcademico.trim()) {
      dto.NivelAcademico = docente.nivelAcademico.trim();
      console.log('✅ CREATE Docente - NivelAcademico incluido:', dto.NivelAcademico);
    }
    
    // Validar que los IDs sean números válidos
    if (isNaN(dto.IdGenero) || isNaN(dto.DepartamentoId)) {
      throw new Error('Los IDs (generoId, departamentoId) deben ser números válidos');
    }
    
    // Verificar una vez más que GeneroId NO esté presente
    const dtoKeys = Object.keys(dto);
    const hasGeneroId = dtoKeys.includes('GeneroId') || dtoKeys.includes('generoId');
    
    console.log('🔄 CREATE Docente - DTO enviado:', JSON.stringify(dto, null, 2));
    console.log('🔄 CREATE Docente - Keys del DTO:', dtoKeys);
    console.log('🔄 CREATE Docente - ¿GeneroId presente?', hasGeneroId);
    console.log('🔄 CREATE Docente - URL:', `${this.apiUrl}/docentes`);
    
    if (hasGeneroId) {
      console.error('❌ ERROR: GeneroId está presente en el DTO antes de enviar!');
      delete dto.GeneroId;
      delete dto.generoId;
      console.log('🔄 CREATE Docente - DTO corregido (sin GeneroId):', JSON.stringify(dto, null, 2));
    }
    
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
        console.error('❌ DTO que se intentó enviar:', JSON.stringify(dto, null, 2));
        
        // Intentar extraer mensaje de validación del backend
        let errorMessage = 'Error desconocido al crear el docente';
        
        if (error.error) {
          if (error.error.errors) {
            console.error('❌ Validation errors:', JSON.stringify(error.error.errors, null, 2));
            // Extraer mensajes de validación
            const validationMessages: string[] = [];
            Object.keys(error.error.errors).forEach(key => {
              const messages = error.error.errors[key];
              if (Array.isArray(messages)) {
                messages.forEach((msg: string) => validationMessages.push(`${key}: ${msg}`));
              } else {
                validationMessages.push(`${key}: ${messages}`);
              }
            });
            if (validationMessages.length > 0) {
              errorMessage = validationMessages.join('\n');
            }
          }
          if (error.error.title) {
            console.error('❌ Error title:', error.error.title);
            errorMessage = error.error.title;
          }
          // Extraer mensaje de excepción del backend
          if (typeof error.error === 'string') {
            if (error.error.includes('Exception')) {
              const exceptionMatch = error.error.match(/Exception:\s*(.+?)(?:\r\n|$)/);
              if (exceptionMatch) {
                errorMessage = exceptionMatch[1];
                console.error('❌ Backend exception message:', errorMessage);
              }
            } else {
              errorMessage = error.error;
            }
          }
          // Si hay un mensaje de detalle
          if (error.error.detail) {
            errorMessage = error.error.detail;
          }
        }
        
        // Crear un error más descriptivo
        const enhancedError = new Error(errorMessage);
        (enhancedError as any).originalError = error;
        (enhancedError as any).status = error.status;
        throw enhancedError;
      })
    );
  }

  updateDocente(id: number, docente: Partial<Docente>): Observable<Docente> {
    const dto: any = {};
    if (docente.nombreCompleto !== undefined) dto.NombreCompleto = docente.nombreCompleto.trim();
    if (docente.correo !== undefined) dto.Correo = docente.correo.trim();
    if (docente.generoId !== undefined) dto.IdGenero = Number(docente.generoId);
    if (docente.departamentoId !== undefined) dto.DepartamentoId = Number(docente.departamentoId);
    // Solo incluir NumeroOrcid si tiene valor (no null ni vacío)
    if (docente.numeroOrcid !== undefined && docente.numeroOrcid && docente.numeroOrcid.trim()) {
      dto.NumeroOrcid = docente.numeroOrcid.trim();
    }
    // Solo incluir Cedula si tiene valor
    if (docente.cedula !== undefined && docente.cedula && docente.cedula.trim()) {
      dto.Cedula = docente.cedula.trim();
    }
    // Solo incluir NivelAcademico si tiene valor
    if (docente.nivelAcademico !== undefined && docente.nivelAcademico && docente.nivelAcademico.trim()) {
      dto.NivelAcademico = docente.nivelAcademico.trim();
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
        } else if (error.status === 500) {
          console.error('❌ Error 500 del servidor al obtener administrativos:', error);
          return of([]);
        }
        console.error('Error fetching administrativos:', error);
        return of([]);
      })
    );
  }

  private mapAdministrativo(item: any): Administrativo {
    // El backend devuelve AdministrativoDto con Genero como string, pero necesitamos el ID
    // Intentar obtener IdGenero directamente primero
    let generoId = item.generoId || item.GeneroId || item.IdGenero;
    
    // Si no tenemos el ID pero tenemos el string Genero, necesitamos buscarlo
    // Por ahora, si no viene el ID, usamos 0 (se debería buscar en la lista de géneros en el componente)
    if (!generoId || generoId === 0) {
      // El backend devuelve Genero como string, pero no podemos mapearlo sin la lista de géneros
      // El componente deberá buscar el género por su código/descripción
      generoId = 0;
      console.warn('⚠️ mapAdministrativo - No se encontró IdGenero, solo Genero como string:', item.genero || item.Genero);
    }
    
    return {
      id: item.id || item.Id || item.IdAdmin || 0,
      nombreCompleto: item.nombreCompleto || item.NombreCompleto || '',
      correo: item.correo || item.Correo || '',
      generoId: generoId,
      departamentoId: item.departamentoId || item.DepartamentoId || 0,
      activo: item.activo !== undefined ? item.activo : (item.Activo !== undefined ? item.Activo : true),
      cedula: item.cedula || item.Cedula || undefined,
      numeroOrcid: item.numeroOrcid || item.NumeroOrcid || undefined,
      puesto: item.puesto || item.Puesto || undefined
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
    // Validar que todos los campos requeridos estén presentes
    if (!administrativo.nombreCompleto || !administrativo.correo || !administrativo.generoId || !administrativo.departamentoId) {
      throw new Error('Faltan campos requeridos para crear el administrativo (nombreCompleto, correo, generoId, departamentoId)');
    }

    const dto: any = {
      NombreCompleto: administrativo.nombreCompleto.trim(),
      Correo: administrativo.correo.trim(),
      IdGenero: Number(administrativo.generoId), // Requerido según AdministrativoCreateDto
      DepartamentoId: Number(administrativo.departamentoId),
      Activo: administrativo.activo !== undefined ? administrativo.activo : true
    };
    
    // Solo incluir NumeroOrcid si tiene valor
    if (administrativo.numeroOrcid && administrativo.numeroOrcid.trim()) {
      dto.NumeroOrcid = administrativo.numeroOrcid.trim();
      console.log('✅ CREATE Administrativo - NumeroOrcid incluido:', dto.NumeroOrcid);
    }
    
    // Solo incluir Cedula si tiene valor
    if (administrativo.cedula && administrativo.cedula.trim()) {
      dto.Cedula = administrativo.cedula.trim();
      console.log('✅ CREATE Administrativo - Cedula incluida:', dto.Cedula);
    }
    
    // Solo incluir Puesto si tiene valor
    if (administrativo.puesto && administrativo.puesto.trim()) {
      dto.Puesto = administrativo.puesto.trim();
      console.log('✅ CREATE Administrativo - Puesto incluido:', dto.Puesto);
    }
    
    // Validar que los IDs sean números válidos
    if (isNaN(dto.IdGenero) || isNaN(dto.DepartamentoId)) {
      throw new Error('Los IDs (generoId, departamentoId) deben ser números válidos');
    }
    
    console.log('🔄 CREATE Administrativo - DTO enviado:', JSON.stringify(dto, null, 2));
    console.log('🔄 CREATE Administrativo - URL:', `${this.apiUrl}/administrativos`);
    
    return this.http.post<any>(`${this.apiUrl}/administrativos`, dto).pipe(
      map(item => {
        console.log('✅ CREATE Administrativo - Respuesta recibida:', item);
        return this.mapAdministrativo(item);
      }),
      catchError(error => {
        console.error('❌ Error creating administrativo:', error);
        console.error('❌ Error status:', error.status);
        console.error('❌ Error error (body):', error.error);
        throw error;
      })
    );
  }

  updateAdministrativo(id: number, administrativo: Partial<Administrativo>): Observable<Administrativo> {
    const dto: any = {};
    if (administrativo.nombreCompleto !== undefined) dto.NombreCompleto = administrativo.nombreCompleto.trim();
    if (administrativo.correo !== undefined) dto.Correo = administrativo.correo.trim();
    if (administrativo.generoId !== undefined) dto.IdGenero = Number(administrativo.generoId);
    if (administrativo.departamentoId !== undefined) dto.DepartamentoId = Number(administrativo.departamentoId);
    // Solo incluir NumeroOrcid si tiene valor
    if (administrativo.numeroOrcid !== undefined && administrativo.numeroOrcid && administrativo.numeroOrcid.trim()) {
      dto.NumeroOrcid = administrativo.numeroOrcid.trim();
    }
    // Solo incluir Cedula si tiene valor
    if (administrativo.cedula !== undefined && administrativo.cedula && administrativo.cedula.trim()) {
      dto.Cedula = administrativo.cedula.trim();
    }
    // Solo incluir Puesto si tiene valor
    if (administrativo.puesto !== undefined && administrativo.puesto && administrativo.puesto.trim()) {
      dto.Puesto = administrativo.puesto.trim();
    }
    if (administrativo.activo !== undefined) dto.Activo = administrativo.activo;
    
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
