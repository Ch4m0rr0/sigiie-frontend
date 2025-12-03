import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import type { Estudiante } from '../models/estudiante';
import type { Docente } from '../models/docente';
import type { Administrativo } from '../models/administrativo';
import type { ResponsableExterno } from '../models/responsable-externo';

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
    // Verificar que item no sea null o undefined
    if (!item || item === null || item === undefined) {
      console.error('❌ mapEstudiante - Item es null o undefined');
      throw new Error('No se puede mapear un estudiante null o undefined');
    }
    
    // El backend devuelve IdEstudiante según EstudianteDto
    let id = item.id || item.Id || item.ID || 
             item.idEstudiante || item.IdEstudiante || item.IDEstudiante ||
             item.estudianteId || item.EstudianteId || item.EstudianteID;
    
    if ((!id || id === 0) && index !== undefined) {
      id = -(index + 1000);
      console.warn('⚠️ mapEstudiante - ID no encontrado, usando ID temporal:', id, 'item:', item);
    } else if (!id || id === 0) {
      console.error('❌ mapEstudiante - ID no encontrado y no hay índice disponible. Item:', item);
      id = -1;
    }
    
    const finalId = id;
    
    // Mapear IDs según la nueva estructura
    // El backend puede enviar los IDs directamente o solo los nombres
    let idGenero = item.idGenero || item.IdGenero || item.generoId || item.GeneroId || 0;
    const idCarrera = item.idCarrera || item.IdCarrera || item.carreraId || item.CarreraId || 0;
    let idEstadoEstudiante = item.idEstadoEstudiante || item.IdEstadoEstudiante || item.estadoId || item.EstadoId || 0;
    
    // Si no viene el ID pero viene el nombre, dejamos 0 para que el componente lo busque
    // El componente buscará el ID basándose en el nombre del género/estado
    
    return {
      id: finalId,
      nombreCompleto: item.nombreCompleto || item.NombreCompleto || '',
      numeroCarnet: item.numeroCarnet || item.NumeroCarnet || item.matricula || item.Matricula || '',
      correo: item.correo || item.Correo || '',
      idGenero: idGenero,
      idCarrera: idCarrera,
      idEstadoEstudiante: idEstadoEstudiante,
      activo: item.activo !== undefined ? item.activo : (item.Activo !== undefined ? item.Activo : true),
      numeroOrcid: item.numeroOrcid || item.NumeroOrcid || undefined,
      cedula: item.cedula || item.Cedula || undefined,
      numeroTelefono: item.numeroTelefono || item.NumeroTelefono || item.telefono || item.Telefono || undefined,
      fechaIngreso: item.fechaIngreso ? new Date(item.fechaIngreso) : (item.FechaIngreso ? new Date(item.FechaIngreso) : undefined),
      idCategoriaParticipacion: item.idCategoriaParticipacion || item.IdCategoriaParticipacion || item.id_categoria_participacion || undefined,
      nivelFormacion: item.nivelFormacion || item.NivelFormacion || item.nivel_formacion || undefined,
      // Campos calculados del backend (solo lectura)
      carrera: item.carrera || item.Carrera || undefined,
      departamento: item.departamento || item.Departamento || undefined,
      genero: item.genero || item.Genero || undefined,
      estadoEstudiante: item.estadoEstudiante || item.EstadoEstudiante || undefined,
      categoriaParticipacion: item.categoriaParticipacion || item.CategoriaParticipacion || undefined
    };
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
    // Validar que todos los campos requeridos estén presentes según la documentación
    if (!estudiante.nombreCompleto || !estudiante.numeroCarnet || !estudiante.correo || 
        !estudiante.idGenero || !estudiante.idCarrera || !estudiante.idEstadoEstudiante) {
      throw new Error('Faltan campos requeridos para crear el estudiante (nombreCompleto, numeroCarnet, correo, idGenero, idCarrera, idEstadoEstudiante)');
    }

    // Convertir a PascalCase según EstudianteCreateDto del backend
    const dto: any = {
      NombreCompleto: estudiante.nombreCompleto.trim(),
      NumeroCarnet: estudiante.numeroCarnet.trim(),
      Correo: estudiante.correo.trim(),
      IdGenero: Number(estudiante.idGenero),
      IdCarrera: Number(estudiante.idCarrera),
      IdEstadoEstudiante: Number(estudiante.idEstadoEstudiante)
    };
    
    // Campos opcionales - solo incluir si tienen valor
    if (estudiante.numeroOrcid && estudiante.numeroOrcid.trim()) {
      dto.NumeroOrcid = estudiante.numeroOrcid.trim();
    }
    
    if (estudiante.cedula && estudiante.cedula.trim()) {
      dto.Cedula = estudiante.cedula.trim();
    }
    
    if (estudiante.numeroTelefono && estudiante.numeroTelefono.trim()) {
      dto.NumeroTelefono = estudiante.numeroTelefono.trim();
    }
    
    if (estudiante.idCategoriaParticipacion && estudiante.idCategoriaParticipacion > 0) {
      dto.IdCategoriaParticipacion = Number(estudiante.idCategoriaParticipacion);
    }
    
    if (estudiante.nivelFormacion && estudiante.nivelFormacion.trim()) {
      dto.NivelFormacion = estudiante.nivelFormacion.trim();
    }
    
    // Validar que los IDs sean números válidos
    if (isNaN(dto.IdGenero) || isNaN(dto.IdCarrera) || isNaN(dto.IdEstadoEstudiante)) {
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
    // Convertir a PascalCase según la documentación del backend
    const dto: any = {};
    
    // Función auxiliar para validar y convertir números - más estricta
    const toNumber = (value: any): number | null => {
      if (value === null || value === undefined || value === '') return null;
      // Si es un string, verificar que no sea texto
      if (typeof value === 'string' && value.trim() === '') return null;
      // Intentar convertir a número
      const num = Number(value);
      // Verificar que sea un número válido y positivo
      if (isNaN(num) || !isFinite(num) || num <= 0) {
        console.warn('⚠️ Valor no numérico detectado:', value, typeof value);
        return null;
      }
      return num;
    };
    
    // Campos requeridos - validar que no sean null/undefined/vacíos
    if (estudiante.nombreCompleto !== undefined && estudiante.nombreCompleto && String(estudiante.nombreCompleto).trim()) {
      dto.NombreCompleto = String(estudiante.nombreCompleto).trim();
    }
    if (estudiante.numeroCarnet !== undefined && estudiante.numeroCarnet && String(estudiante.numeroCarnet).trim()) {
      dto.NumeroCarnet = String(estudiante.numeroCarnet).trim();
    }
    if (estudiante.correo !== undefined && estudiante.correo && String(estudiante.correo).trim()) {
      dto.Correo = String(estudiante.correo).trim();
    }
    
    // IDs numéricos requeridos - validar estrictamente
    const idGenero = toNumber(estudiante.idGenero);
    if (idGenero === null) {
      console.error('❌ IdGenero inválido:', estudiante.idGenero);
      throw new Error('El género es requerido y debe ser un número válido');
    }
    dto.IdGenero = idGenero;
    
    const idCarrera = toNumber(estudiante.idCarrera);
    if (idCarrera === null) {
      console.error('❌ IdCarrera inválido:', estudiante.idCarrera);
      throw new Error('La carrera es requerida y debe ser un número válido');
    }
    dto.IdCarrera = idCarrera;
    
    const idEstadoEstudiante = toNumber(estudiante.idEstadoEstudiante);
    if (idEstadoEstudiante === null) {
      console.error('❌ IdEstadoEstudiante inválido:', estudiante.idEstadoEstudiante);
      throw new Error('El estado del estudiante es requerido y debe ser un número válido');
    }
    dto.IdEstadoEstudiante = idEstadoEstudiante;
    
    // Campo booleano requerido
    if (estudiante.activo !== undefined) {
      dto.Activo = Boolean(estudiante.activo);
    } else {
      dto.Activo = true; // Valor por defecto
    }
    
    // Campos opcionales - solo incluir si tienen valor válido
    if (estudiante.cedula !== undefined && estudiante.cedula && String(estudiante.cedula).trim()) {
      dto.Cedula = String(estudiante.cedula).trim();
    }
<<<<<<< HEAD
    
    const categoriaId = toNumber(estudiante.idCategoriaParticipacion);
    if (categoriaId !== null) {
      dto.IdCategoriaParticipacion = categoriaId;
=======
    if (estudiante.numeroOrcid !== undefined && estudiante.numeroOrcid && String(estudiante.numeroOrcid).trim()) {
      dto.NumeroOrcid = String(estudiante.numeroOrcid).trim();
    }
    if (estudiante.numeroTelefono !== undefined && estudiante.numeroTelefono && String(estudiante.numeroTelefono).trim()) {
      dto.NumeroTelefono = String(estudiante.numeroTelefono).trim();
>>>>>>> 4ac6e97a522cd659ce55423a91b146af2054ffa5
    }
    if (estudiante.nivelFormacion !== undefined && estudiante.nivelFormacion && String(estudiante.nivelFormacion).trim()) {
      dto.NivelFormacion = String(estudiante.nivelFormacion).trim();
    }
    
    // Asegurarse de que no haya campos adicionales no deseados
    const allowedKeys = ['NombreCompleto', 'NumeroCarnet', 'Correo', 'IdGenero', 'IdCarrera', 'IdEstadoEstudiante', 'Activo', 'Cedula', 'NumeroOrcid', 'NumeroTelefono', 'NivelFormacion'];
    const finalDto: any = {};
    for (const key of allowedKeys) {
      if (dto[key] !== undefined) {
        finalDto[key] = dto[key];
      }
    }
    
    console.log('🔄 PUT Estudiante - ID (ruta):', id, 'Tipo:', typeof id);
    console.log('🔄 PUT Estudiante - DTO enviado:', JSON.stringify(finalDto, null, 2));
    console.log('🔄 PUT Estudiante - Tipos de datos:', Object.keys(finalDto).reduce((acc, key) => {
      acc[key] = typeof finalDto[key];
      return acc;
    }, {} as any));
    console.log('🔄 PUT Estudiante - URL completa:', `${this.apiUrl}/estudiantes/${id}`);
    
    // Validar que el ID de la ruta sea un número válido
    const routeId = Number(id);
    if (isNaN(routeId) || routeId <= 0) {
      console.error('❌ ID de ruta inválido:', id, typeof id);
      throw new Error(`ID de estudiante inválido: ${id}`);
    }
    
    return this.http.put<any>(`${this.apiUrl}/estudiantes/${routeId}`, finalDto, { observe: 'response' }).pipe(
      switchMap(response => {
        console.log('✅ PUT Estudiante - Status:', response.status);
        console.log('✅ PUT Estudiante - Respuesta recibida:', response.body);
        
        // Si el backend devuelve NoContent (204), obtener el estudiante actualizado
        if (response.status === 204 || !response.body || response.body === null || response.body === undefined) {
          console.log('🔄 PUT Estudiante - Respuesta NoContent (204), obteniendo estudiante actualizado desde el servidor...');
          return this.getEstudiante(routeId).pipe(
            map(estudiante => {
              if (!estudiante) {
                throw new Error(`No se pudo obtener el estudiante actualizado con ID ${routeId}`);
              }
              return estudiante;
            })
          );
        }
        
        // Extraer el item de la respuesta (puede estar en response.data o ser response directamente)
        const item = response.body?.data || response.body;
        
        // Si la respuesta es vacía, obtener el estudiante actualizado
        if (!item || item === null || item === undefined || (typeof item === 'object' && Object.keys(item).length === 0)) {
          console.log('🔄 PUT Estudiante - Respuesta vacía, obteniendo estudiante actualizado desde el servidor...');
          return this.getEstudiante(routeId).pipe(
            map(estudiante => {
              if (!estudiante) {
                throw new Error(`No se pudo obtener el estudiante actualizado con ID ${routeId}`);
              }
              return estudiante;
            })
          );
        }
        
        // Si tenemos un item válido, mapearlo
        try {
          return of(this.mapEstudiante(item, 0));
        } catch (error) {
          console.error('❌ Error mapeando estudiante, obteniendo desde el servidor...', error);
          // Si hay un error al mapear, obtener el estudiante desde el servidor
          return this.getEstudiante(routeId).pipe(
            map(estudiante => {
              if (!estudiante) {
                throw new Error(`No se pudo obtener el estudiante actualizado con ID ${routeId}`);
              }
              return estudiante;
            })
          );
        }
      }),
      catchError(error => {
        console.error('❌ Error updating estudiante:', error);
        console.error('❌ Error status:', error.status);
        console.error('❌ Error body:', error.error);
        if (error.error?.errors) {
          console.error('❌ Validation errors:', JSON.stringify(error.error.errors, null, 2));
        }
        throw error;
      })
    );
  }

  deleteEstudiante(id: number): Observable<boolean> {
    return this.http.delete<any>(`${this.apiUrl}/estudiantes/${id}`, { observe: 'response' }).pipe(
      map(response => {
        // El backend devuelve NoContent (204) cuando se elimina exitosamente
        if (response.status === 204 || response.status === 200) {
          console.log('✅ DELETE Estudiante - Eliminado exitosamente (Status:', response.status, ')');
          return true;
        }
        return true;
      }),
      catchError(error => {
        console.error('❌ Error deleting estudiante:', error);
        if (error.status === 404) {
          console.warn('⚠️ Estudiante no encontrado (404)');
        }
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
    // Verificar que item no sea null o undefined
    if (!item || item === null || item === undefined) {
      console.error('❌ mapDocente - Item es null o undefined');
      throw new Error('No se puede mapear un docente null o undefined');
    }
    
    // Mapear según la nueva estructura
    const idGenero = item.idGenero || item.IdGenero || item.generoId || item.GeneroId || 0;
    const idNivelAcademico = item.idNivelAcademico || item.IdNivelAcademico || item.nivelAcademicoId || item.NivelAcademicoId || undefined;
    
    // Mapear departamentoId - puede venir como departamentoId, DepartamentoId, o solo el nombre
    let departamentoId = item.departamentoId ?? item.DepartamentoId ?? item.idDepartamento ?? item.IdDepartamento;
    // Si no viene el ID, dejar undefined para que el componente lo busque por nombre
    if (departamentoId === undefined || departamentoId === null) {
      departamentoId = undefined;
    } else {
      departamentoId = Number(departamentoId);
      if (isNaN(departamentoId)) {
        departamentoId = undefined;
      }
      // Si es 0, también dejarlo como undefined para que se busque por nombre
      if (departamentoId === 0) {
        departamentoId = undefined;
      }
    }
    
    return {
      id: item.id || item.Id || item.IdDocente || item.idDocente || 0,
      nombreCompleto: item.nombreCompleto || item.NombreCompleto || '',
      correo: item.correo || item.Correo || '',
      idGenero: idGenero,
      departamentoId: departamentoId ?? 0, // Si es undefined, usar 0 para mantener compatibilidad
      activo: item.activo !== undefined ? item.activo : (item.Activo !== undefined ? item.Activo : true),
      numeroOrcid: item.numeroOrcid || item.NumeroOrcid || undefined,
      cedula: item.cedula || item.Cedula || undefined,
      numeroTelefono: item.numeroTelefono || item.NumeroTelefono || item.telefono || item.Telefono || undefined,
      idNivelAcademico: idNivelAcademico,
      // Campos calculados del backend (solo lectura)
      genero: item.genero || item.Genero || undefined,
      departamento: item.departamento || item.Departamento || undefined,
      nombreNivelAcademico: item.nombreNivelAcademico || item.NombreNivelAcademico || undefined
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
    // Validar que todos los campos requeridos estén presentes según la documentación
    if (!docente.nombreCompleto || !docente.correo || !docente.idGenero || !docente.departamentoId) {
      throw new Error('Faltan campos requeridos para crear el docente (nombreCompleto, correo, idGenero, departamentoId)');
    }

    // El backend espera PascalCase según la documentación
    const dto: any = {
      NombreCompleto: docente.nombreCompleto.trim(),
      Correo: docente.correo.trim(),
      IdGenero: Number(docente.idGenero),
      DepartamentoId: Number(docente.departamentoId)
    };
    
    // Campos opcionales - solo incluir si tienen valor
    if (docente.numeroOrcid && docente.numeroOrcid.trim()) {
      dto.NumeroOrcid = docente.numeroOrcid.trim();
    }
    
    if (docente.cedula && docente.cedula.trim()) {
      dto.Cedula = docente.cedula.trim();
    }
    
    if (docente.numeroTelefono && docente.numeroTelefono.trim()) {
      dto.NumeroTelefono = docente.numeroTelefono.trim();
    }
    
    if (docente.idNivelAcademico && docente.idNivelAcademico > 0) {
      dto.IdNivelAcademico = Number(docente.idNivelAcademico);
    }
    
    // Validar que los IDs sean números válidos
    if (isNaN(dto.IdGenero) || isNaN(dto.DepartamentoId)) {
      throw new Error('Los IDs (idGenero, departamentoId) deben ser números válidos');
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
    // El backend espera PascalCase según la documentación
    const dto: any = {};
    
    // Campos requeridos
    if (docente.nombreCompleto !== undefined) dto.NombreCompleto = docente.nombreCompleto.trim();
    if (docente.correo !== undefined) dto.Correo = docente.correo.trim();
    if (docente.idGenero !== undefined && docente.idGenero != null) dto.IdGenero = Number(docente.idGenero);
    if (docente.departamentoId !== undefined && docente.departamentoId != null) dto.DepartamentoId = Number(docente.departamentoId);
    
    // Campos opcionales - solo incluir si tienen valor
    if (docente.numeroOrcid !== undefined && docente.numeroOrcid && docente.numeroOrcid.trim()) {
      dto.NumeroOrcid = docente.numeroOrcid.trim();
    }
    if (docente.cedula !== undefined && docente.cedula && docente.cedula.trim()) {
      dto.Cedula = docente.cedula.trim();
    }
    if (docente.numeroTelefono !== undefined && docente.numeroTelefono && docente.numeroTelefono.trim()) {
      dto.NumeroTelefono = docente.numeroTelefono.trim();
    }
    if (docente.idNivelAcademico !== undefined && docente.idNivelAcademico != null && docente.idNivelAcademico > 0) {
      dto.IdNivelAcademico = Number(docente.idNivelAcademico);
    }
    if (docente.activo !== undefined) dto.Activo = docente.activo;
    
    console.log('🔄 UPDATE Docente - DTO enviado:', JSON.stringify(dto, null, 2));
    console.log('🔄 UPDATE Docente - ID:', id);
    console.log('🔄 UPDATE Docente - URL:', `${this.apiUrl}/docentes/${id}`);
    
    return this.http.put<any>(`${this.apiUrl}/docentes/${id}`, dto).pipe(
      switchMap(response => {
        console.log('✅ PUT Docente - Respuesta recibida:', response);
        
        // Extraer el item de la respuesta (puede estar en response.data o ser response directamente)
        const item = response?.data || response;
        
        // Si la respuesta es null, undefined o vacía, obtener el docente actualizado
        if (!item || item === null || item === undefined || (typeof item === 'object' && Object.keys(item).length === 0)) {
          console.log('🔄 PUT Docente - Respuesta vacía o null, obteniendo docente actualizado desde el servidor...');
          return this.getDocente(id).pipe(
            map(docente => {
              if (!docente) {
                throw new Error(`No se pudo obtener el docente actualizado con ID ${id}`);
              }
              return docente;
            })
          );
        }
        
        // Si tenemos un item válido, mapearlo
        try {
          return of(this.mapDocente(item));
        } catch (error) {
          console.error('❌ Error mapeando docente, obteniendo desde el servidor...', error);
          // Si hay un error al mapear, obtener el docente desde el servidor
          return this.getDocente(id).pipe(
            map(docente => {
              if (!docente) {
                throw new Error(`No se pudo obtener el docente actualizado con ID ${id}`);
              }
              return docente;
            })
          );
        }
      }),
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
    // Verificar que item no sea null o undefined
    if (!item || item === null || item === undefined) {
      console.error('❌ mapAdministrativo - Item es null o undefined');
      throw new Error('No se puede mapear un administrativo null o undefined');
    }
    
    // Mapear según la nueva estructura
    const idGenero = item.idGenero || item.IdGenero || item.generoId || item.GeneroId || 0;
    const idNivelAcademico = item.idNivelAcademico || item.IdNivelAcademico || item.nivelAcademicoId || item.NivelAcademicoId || undefined;
    
    // Mapear departamentoId - puede venir como departamentoId, DepartamentoId, o solo el nombre
    let departamentoId = item.departamentoId ?? item.DepartamentoId ?? item.idDepartamento ?? item.IdDepartamento;
    // Si no viene el ID, dejar undefined para que el componente lo busque por nombre
    if (departamentoId === undefined || departamentoId === null) {
      departamentoId = undefined;
    } else {
      departamentoId = Number(departamentoId);
      if (isNaN(departamentoId)) {
        departamentoId = undefined;
      }
      // Si es 0, también dejarlo como undefined para que se busque por nombre
      if (departamentoId === 0) {
        departamentoId = undefined;
      }
    }
    
    return {
      id: item.id || item.Id || item.IdAdmin || item.idAdmin || 0,
      nombreCompleto: item.nombreCompleto || item.NombreCompleto || '',
      correo: item.correo || item.Correo || '',
      idGenero: idGenero,
      departamentoId: departamentoId ?? 0, // Si es undefined, usar 0 para mantener compatibilidad
      activo: item.activo !== undefined ? item.activo : (item.Activo !== undefined ? item.Activo : true),
      cedula: item.cedula || item.Cedula || undefined,
      numeroOrcid: item.numeroOrcid || item.NumeroOrcid || undefined,
      numeroTelefono: item.numeroTelefono || item.NumeroTelefono || item.telefono || item.Telefono || undefined,
      idNivelAcademico: idNivelAcademico,
      puesto: item.puesto || item.Puesto || undefined,
      // Campos calculados del backend (solo lectura)
      genero: item.genero || item.Genero || undefined,
      departamento: item.departamento || item.Departamento || undefined,
      nombreNivelAcademico: item.nombreNivelAcademico || item.NombreNivelAcademico || undefined
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
    // Validar que todos los campos requeridos estén presentes según la documentación
    if (!administrativo.nombreCompleto || !administrativo.correo || !administrativo.idGenero || !administrativo.departamentoId) {
      throw new Error('Faltan campos requeridos para crear el administrativo (nombreCompleto, correo, idGenero, departamentoId)');
    }

    // El backend espera PascalCase según la documentación
    const dto: any = {
      NombreCompleto: administrativo.nombreCompleto.trim(),
      Correo: administrativo.correo.trim(),
      IdGenero: Number(administrativo.idGenero),
      DepartamentoId: Number(administrativo.departamentoId)
    };
    
    // Campos opcionales - solo incluir si tienen valor
    if (administrativo.numeroOrcid && administrativo.numeroOrcid.trim()) {
      dto.NumeroOrcid = administrativo.numeroOrcid.trim();
    }
    
    if (administrativo.cedula && administrativo.cedula.trim()) {
      dto.Cedula = administrativo.cedula.trim();
    }
    
    if (administrativo.numeroTelefono && administrativo.numeroTelefono.trim()) {
      dto.NumeroTelefono = administrativo.numeroTelefono.trim();
    }
    
    if (administrativo.idNivelAcademico && administrativo.idNivelAcademico > 0) {
      dto.IdNivelAcademico = Number(administrativo.idNivelAcademico);
    }
    
    if (administrativo.puesto && administrativo.puesto.trim()) {
      dto.Puesto = administrativo.puesto.trim();
    }
    
    // Validar que los IDs sean números válidos
    if (isNaN(dto.IdGenero) || isNaN(dto.DepartamentoId)) {
      throw new Error('Los IDs (idGenero, departamentoId) deben ser números válidos');
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
    // El backend espera PascalCase según la documentación
    const dto: any = {};
    
    // Campos requeridos
    if (administrativo.nombreCompleto !== undefined) dto.NombreCompleto = administrativo.nombreCompleto.trim();
    if (administrativo.correo !== undefined) dto.Correo = administrativo.correo.trim();
    if (administrativo.idGenero !== undefined && administrativo.idGenero != null) dto.IdGenero = Number(administrativo.idGenero);
    if (administrativo.departamentoId !== undefined && administrativo.departamentoId != null) dto.DepartamentoId = Number(administrativo.departamentoId);
    
    // Campos opcionales - solo incluir si tienen valor
    if (administrativo.numeroOrcid !== undefined && administrativo.numeroOrcid && administrativo.numeroOrcid.trim()) {
      dto.NumeroOrcid = administrativo.numeroOrcid.trim();
    }
    if (administrativo.cedula !== undefined && administrativo.cedula && administrativo.cedula.trim()) {
      dto.Cedula = administrativo.cedula.trim();
    }
    if (administrativo.numeroTelefono !== undefined && administrativo.numeroTelefono && administrativo.numeroTelefono.trim()) {
      dto.NumeroTelefono = administrativo.numeroTelefono.trim();
    }
    if (administrativo.idNivelAcademico !== undefined && administrativo.idNivelAcademico != null && administrativo.idNivelAcademico > 0) {
      dto.IdNivelAcademico = Number(administrativo.idNivelAcademico);
    }
    if (administrativo.puesto !== undefined && administrativo.puesto && administrativo.puesto.trim()) {
      dto.Puesto = administrativo.puesto.trim();
    }
    if (administrativo.activo !== undefined) dto.Activo = administrativo.activo;
    
    console.log('🔄 UPDATE Administrativo - DTO enviado:', JSON.stringify(dto, null, 2));
    console.log('🔄 UPDATE Administrativo - ID:', id);
    console.log('🔄 UPDATE Administrativo - URL:', `${this.apiUrl}/administrativos/${id}`);
    
    return this.http.put<any>(`${this.apiUrl}/administrativos/${id}`, dto).pipe(
      switchMap(response => {
        console.log('✅ PUT Administrativo - Respuesta recibida:', response);
        
        // Extraer el item de la respuesta (puede estar en response.data o ser response directamente)
        const item = response?.data || response;
        
        // Si la respuesta es null, undefined o vacía, obtener el administrativo actualizado
        if (!item || item === null || item === undefined || (typeof item === 'object' && Object.keys(item).length === 0)) {
          console.log('🔄 PUT Administrativo - Respuesta vacía o null, obteniendo administrativo actualizado desde el servidor...');
          return this.getAdministrativo(id).pipe(
            map(administrativo => {
              if (!administrativo) {
                throw new Error(`No se pudo obtener el administrativo actualizado con ID ${id}`);
              }
              return administrativo;
            })
          );
        }
        
        // Si tenemos un item válido, mapearlo
        try {
          return of(this.mapAdministrativo(item));
        } catch (error) {
          console.error('❌ Error mapeando administrativo, obteniendo desde el servidor...', error);
          // Si hay un error al mapear, obtener el administrativo desde el servidor
          return this.getAdministrativo(id).pipe(
            map(administrativo => {
              if (!administrativo) {
                throw new Error(`No se pudo obtener el administrativo actualizado con ID ${id}`);
              }
              return administrativo;
            })
          );
        }
      }),
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

  // Responsable Externo (Participante Externo)
  listResponsablesExternos(filtros?: { nombre?: string, institucion?: string, activo?: boolean }): Observable<ResponsableExterno[]> {
    let url = `${this.apiUrl}/responsable-externo`;
    const params = new URLSearchParams();
    
    if (filtros) {
      if (filtros.nombre) params.append('nombre', filtros.nombre);
      if (filtros.institucion) params.append('institucion', filtros.institucion);
      if (filtros.activo !== undefined) params.append('activo', filtros.activo.toString());
    }
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    return this.http.get<any>(url).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapResponsableExterno(item)) : [];
      }),
      catchError(error => {
        if (error.status === 404) {
          console.warn('⚠️ Endpoint /api/responsable-externo no encontrado (404)');
          return of([]);
        }
        console.error('Error fetching responsables externos:', error);
        return of([]);
      })
    );
  }

  getResponsableExterno(id: number): Observable<ResponsableExterno | null> {
    return this.http.get<any>(`${this.apiUrl}/responsable-externo/${id}`).pipe(
      map(item => this.mapResponsableExterno(item)),
      catchError(error => {
        if (error.status === 404) return of(null);
        console.error('Error fetching responsable externo:', error);
        throw error;
      })
    );
  }

  createResponsableExterno(responsable: Omit<ResponsableExterno, 'id'>): Observable<ResponsableExterno> {
    // Validar que todos los campos requeridos estén presentes
    if (!responsable.nombre || !responsable.institucion) {
      throw new Error('Faltan campos requeridos para crear el responsable externo (nombre, institucion)');
    }

    // El backend espera PascalCase según la documentación
    const dto: any = {
      Nombre: responsable.nombre.trim(),
      Institucion: responsable.institucion.trim()
    };
    
    // Campos opcionales - solo incluir si tienen valor
    if (responsable.cargo && responsable.cargo.trim()) {
      dto.Cargo = responsable.cargo.trim();
    }
    
    if (responsable.telefono && responsable.telefono.trim()) {
      dto.Telefono = responsable.telefono.trim();
    }
    
    if (responsable.correo && responsable.correo.trim()) {
      dto.Correo = responsable.correo.trim();
    }
    
    console.log('🔄 CREATE ResponsableExterno - DTO enviado:', JSON.stringify(dto, null, 2));
    console.log('🔄 CREATE ResponsableExterno - URL:', `${this.apiUrl}/responsable-externo`);
    
    return this.http.post<any>(`${this.apiUrl}/responsable-externo`, dto).pipe(
      map(item => {
        console.log('✅ CREATE ResponsableExterno - Respuesta recibida:', item);
        return this.mapResponsableExterno(item);
      }),
      catchError(error => {
        console.error('❌ Error creating responsable externo:', error);
        throw error;
      })
    );
  }

  updateResponsableExterno(id: number, responsable: Partial<ResponsableExterno>): Observable<ResponsableExterno> {
    // El backend espera PascalCase según la documentación
    const dto: any = {};
    
    if (responsable.nombre !== undefined && responsable.nombre && responsable.nombre.trim()) {
      dto.Nombre = responsable.nombre.trim();
    }
    if (responsable.institucion !== undefined && responsable.institucion && responsable.institucion.trim()) {
      dto.Institucion = responsable.institucion.trim();
    }
    if (responsable.cargo !== undefined && responsable.cargo && responsable.cargo.trim()) {
      dto.Cargo = responsable.cargo.trim();
    }
    if (responsable.telefono !== undefined && responsable.telefono && responsable.telefono.trim()) {
      dto.Telefono = responsable.telefono.trim();
    }
    if (responsable.correo !== undefined && responsable.correo && responsable.correo.trim()) {
      dto.Correo = responsable.correo.trim();
    }
    if (responsable.activo !== undefined) {
      dto.Activo = Boolean(responsable.activo);
    }
    
    console.log('🔄 UPDATE ResponsableExterno - DTO enviado:', JSON.stringify(dto, null, 2));
    console.log('🔄 UPDATE ResponsableExterno - ID:', id);
    console.log('🔄 UPDATE ResponsableExterno - URL:', `${this.apiUrl}/responsable-externo/${id}`);
    
    return this.http.put<any>(`${this.apiUrl}/responsable-externo/${id}`, dto, { observe: 'response' }).pipe(
      switchMap(response => {
        console.log('✅ PUT ResponsableExterno - Status:', response.status);
        console.log('✅ PUT ResponsableExterno - Respuesta recibida:', response.body);
        
        // Si el backend devuelve NoContent (204), obtener el responsable actualizado
        if (response.status === 204 || !response.body || response.body === null || response.body === undefined) {
          console.log('🔄 PUT ResponsableExterno - Respuesta NoContent (204), obteniendo responsable actualizado desde el servidor...');
          return this.getResponsableExterno(id).pipe(
            map(responsable => {
              if (!responsable) {
                throw new Error(`No se pudo obtener el responsable externo actualizado con ID ${id}`);
              }
              return responsable;
            })
          );
        }
        
        // Extraer el item de la respuesta
        const item = response.body?.data || response.body;
        
        // Si la respuesta es vacía, obtener el responsable actualizado
        if (!item || item === null || item === undefined || (typeof item === 'object' && Object.keys(item).length === 0)) {
          console.log('🔄 PUT ResponsableExterno - Respuesta vacía, obteniendo responsable actualizado desde el servidor...');
          return this.getResponsableExterno(id).pipe(
            map(responsable => {
              if (!responsable) {
                throw new Error(`No se pudo obtener el responsable externo actualizado con ID ${id}`);
              }
              return responsable;
            })
          );
        }
        
        // Si tenemos un item válido, mapearlo
        try {
          return of(this.mapResponsableExterno(item));
        } catch (error) {
          console.error('❌ Error mapeando responsable externo, obteniendo desde el servidor...', error);
          return this.getResponsableExterno(id).pipe(
            map(responsable => {
              if (!responsable) {
                throw new Error(`No se pudo obtener el responsable externo actualizado con ID ${id}`);
              }
              return responsable;
            })
          );
        }
      }),
      catchError(error => {
        console.error('Error updating responsable externo:', error);
        throw error;
      })
    );
  }

  deleteResponsableExterno(id: number): Observable<boolean> {
    return this.http.delete<any>(`${this.apiUrl}/responsable-externo/${id}`, { observe: 'response' }).pipe(
      map(response => {
        // El backend devuelve NoContent (204) cuando se elimina exitosamente
        if (response.status === 204 || response.status === 200) {
          console.log('✅ DELETE ResponsableExterno - Eliminado exitosamente (Status:', response.status, ')');
          return true;
        }
        return true;
      }),
      catchError(error => {
        console.error('❌ Error deleting responsable externo:', error);
        if (error.status === 404) {
          console.warn('⚠️ Responsable externo no encontrado (404)');
        }
        throw error;
      })
    );
  }

  private mapResponsableExterno(item: any): ResponsableExterno {
    return {
      id: item.id || item.Id || item.idResponsableExterno || item.IdResponsableExterno || 0,
      nombre: item.nombre || item.Nombre || '',
      institucion: item.institucion || item.Institucion || '',
      cargo: item.cargo || item.Cargo || undefined,
      telefono: item.telefono || item.Telefono || undefined,
      correo: item.correo || item.Correo || undefined,
      activo: item.activo !== undefined ? item.activo : (item.Activo !== undefined ? item.Activo : true),
      creadoPor: item.creadoPor || item.CreadoPor || undefined,
      nombreCreador: item.nombreCreador || item.NombreCreador || undefined,
      fechaCreacion: item.fechaCreacion ? new Date(item.fechaCreacion) : (item.FechaCreacion ? new Date(item.FechaCreacion) : undefined),
      fechaModificacion: item.fechaModificacion ? new Date(item.fechaModificacion) : (item.FechaModificacion ? new Date(item.FechaModificacion) : null)
    };
  }
}
