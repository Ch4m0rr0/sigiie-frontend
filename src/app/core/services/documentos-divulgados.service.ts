import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import type { DocumentoDivulgado, DocumentoDivulgadoCreate, DocumentoDivulgadoUpdate } from '../models/documento-divulgado';

@Injectable({ providedIn: 'root' })
export class DocumentosDivulgadosService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/documentos-divulgados`;

  /**
   * Obtiene todos los documentos divulgados
   */
  getAll(): Observable<DocumentoDivulgado[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map(response => {
        const items = response.data || response;
        return Array.isArray(items) ? items.map(item => this.mapDocumentoDivulgado(item)) : [];
      }),
      catchError(error => {
        console.error('Error fetching documentos divulgados:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene un documento divulgado por ID
   */
  getById(id: number): Observable<DocumentoDivulgado | null> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(response => {
        const item = response.data || response;
        return item ? this.mapDocumentoDivulgado(item) : null;
      }),
      catchError(error => {
        console.error('Error fetching documento divulgado:', error);
        return of(null);
      })
    );
  }

  /**
   * Crea un nuevo documento divulgado
   * Usa multipart/form-data porque acepta ArchivoRespaldo
   */
  create(documento: DocumentoDivulgadoCreate): Observable<DocumentoDivulgado> {
    const formData = new FormData();
    
    // Campo requerido
    formData.append('NombreDocumento', documento.nombreDocumento || '');
    
    // Campos numéricos - siempre enviar, usar 0 como valor por defecto
    formData.append('CantidadEstudiantesParticipantes', 
      (documento.cantidadEstudiantesParticipantes ?? 0).toString());
    formData.append('CantidadDocentesParticipantes', 
      (documento.cantidadDocentesParticipantes ?? 0).toString());
    formData.append('CantidadAdministrativosParticipantes', 
      (documento.cantidadAdministrativosParticipantes ?? 0).toString());
    formData.append('ParticipantesDivulgacionCientifica', 
      (documento.participantesDivulgacionCientifica ?? 0).toString());
    formData.append('CantidadProductos', 
      (documento.cantidadProductos ?? 0).toString());
    
    // Campos opcionales - solo agregar si tienen valor
    if (documento.idTipoDocumentoDivulgado !== undefined && documento.idTipoDocumentoDivulgado !== null) {
      formData.append('IdTipoDocumentoDivulgado', documento.idTipoDocumentoDivulgado.toString());
    } else {
      formData.append('IdTipoDocumentoDivulgado', '0');
    }
    
    if (documento.departamentoId !== undefined && documento.departamentoId !== null) {
      formData.append('DepartamentoId', documento.departamentoId.toString());
    } else {
      formData.append('DepartamentoId', '0');
    }
    
    if (documento.linkAcceso) {
      formData.append('LinkAcceso', documento.linkAcceso);
    } else {
      formData.append('LinkAcceso', '');
    }
    
    // Archivo - según swagger, se puede enviar vacío: -F 'ArchivoRespaldo='
    // Si no hay archivo, no enviar el campo (el backend lo manejará como null/opcional)
    if (documento.archivoRespaldo) {
      formData.append('ArchivoRespaldo', documento.archivoRespaldo);
    }

    // Log para debugging
    console.log('📤 Creating documento divulgado - FormData contents:');
    for (const [key, value] of formData.entries()) {
      console.log(`  ${key}:`, value instanceof File ? `File(${value.name})` : value);
    }

    return this.http.post<any>(this.apiUrl, formData).pipe(
      map(response => {
        const item = response.data || response;
        return this.mapDocumentoDivulgado(item);
      }),
      catchError(error => {
        console.error('Error creating documento divulgado:', error);
        if (error.error?.errors) {
          console.error('Validation errors:', JSON.stringify(error.error.errors, null, 2));
        }
        if (error.error) {
          console.error('Error response:', JSON.stringify(error.error, null, 2));
        }
        throw error;
      })
    );
  }

  /**
   * Actualiza un documento divulgado
   * Usa multipart/form-data porque acepta ArchivoRespaldo
   */
  update(id: number, documento: DocumentoDivulgadoUpdate): Observable<DocumentoDivulgado> {
    const formData = new FormData();
    
    if (documento.nombreDocumento !== undefined) {
      formData.append('NombreDocumento', documento.nombreDocumento);
    }
    
    if (documento.idTipoDocumentoDivulgado !== undefined) {
      formData.append('IdTipoDocumentoDivulgado', documento.idTipoDocumentoDivulgado.toString());
    }
    
    if (documento.cantidadEstudiantesParticipantes !== undefined) {
      formData.append('CantidadEstudiantesParticipantes', documento.cantidadEstudiantesParticipantes.toString());
    }
    
    if (documento.cantidadDocentesParticipantes !== undefined) {
      formData.append('CantidadDocentesParticipantes', documento.cantidadDocentesParticipantes.toString());
    }
    
    if (documento.cantidadAdministrativosParticipantes !== undefined) {
      formData.append('CantidadAdministrativosParticipantes', documento.cantidadAdministrativosParticipantes.toString());
    }
    
    if (documento.participantesDivulgacionCientifica !== undefined) {
      formData.append('ParticipantesDivulgacionCientifica', documento.participantesDivulgacionCientifica.toString());
    }
    
    if (documento.cantidadProductos !== undefined) {
      formData.append('CantidadProductos', documento.cantidadProductos.toString());
    }
    
    if (documento.linkAcceso !== undefined) {
      formData.append('LinkAcceso', documento.linkAcceso);
    }
    
    if (documento.departamentoId !== undefined) {
      formData.append('DepartamentoId', documento.departamentoId.toString());
    }
    
    if (documento.archivoRespaldo) {
      formData.append('ArchivoRespaldo', documento.archivoRespaldo);
    }

    return this.http.put<any>(`${this.apiUrl}/${id}`, formData).pipe(
      map(response => {
        const item = response.data || response;
        return this.mapDocumentoDivulgado(item);
      }),
      catchError(error => {
        console.error('Error updating documento divulgado:', error);
        throw error;
      })
    );
  }

  /**
   * Elimina un documento divulgado
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error deleting documento divulgado:', error);
        return of(false);
      })
    );
  }

  private mapDocumentoDivulgado(item: any): DocumentoDivulgado {
    return {
      id: item.id || item.Id || item.idDocumentoDivulgado || item.IdDocumentoDivulgado || 0,
      nombreDocumento: item.nombreDocumento || item.NombreDocumento || '',
      idTipoDocumentoDivulgado: item.idTipoDocumentoDivulgado || item.IdTipoDocumentoDivulgado,
      nombreTipoDocumentoDivulgado: item.nombreTipoDocumentoDivulgado || item.NombreTipoDocumentoDivulgado,
      cantidadEstudiantesParticipantes: item.cantidadEstudiantesParticipantes || item.CantidadEstudiantesParticipantes,
      cantidadDocentesParticipantes: item.cantidadDocentesParticipantes || item.CantidadDocentesParticipantes,
      cantidadAdministrativosParticipantes: item.cantidadAdministrativosParticipantes || item.CantidadAdministrativosParticipantes,
      participantesDivulgacionCientifica: item.participantesDivulgacionCientifica || item.ParticipantesDivulgacionCientifica,
      cantidadProductos: item.cantidadProductos || item.CantidadProductos,
      archivoRespaldoUrl: item.archivoRespaldoUrl || item.ArchivoRespaldoUrl,
      linkAcceso: item.linkAcceso || item.LinkAcceso,
      departamentoId: item.departamentoId || item.DepartamentoId,
      nombreDepartamento: item.nombreDepartamento || item.NombreDepartamento,
      fechaCreacion: item.fechaCreacion || item.FechaCreacion,
      fechaModificacion: item.fechaModificacion || item.FechaModificacion
    };
  }
}

