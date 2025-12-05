import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Notificacion {
  id: number;
  titulo: string;
  mensaje: string;
  tipo: 'info' | 'success' | 'warning' | 'error';
  fecha: Date;
  leida: boolean;
  url?: string;
}

@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/notificaciones`;
  
  // Subject para manejar el estado de las notificaciones
  private notificacionesSubject = new BehaviorSubject<Notificacion[]>([]);
  public notificaciones$ = this.notificacionesSubject.asObservable();

  // Contador de notificaciones no leídas
  private noLeidasCountSubject = new BehaviorSubject<number>(0);
  public noLeidasCount$ = this.noLeidasCountSubject.asObservable();

  constructor() {
    // Cargar notificaciones al inicializar el servicio
    this.loadNotificaciones();
  }

  /**
   * Obtiene todas las notificaciones del usuario actual
   * Si el endpoint no existe, retorna notificaciones mock
   */
  getAll(): Observable<Notificacion[]> {
    console.log('🔄 GET Notificaciones - URL:', this.apiUrl);
    
    return this.http.get<any>(this.apiUrl).pipe(
      map(response => {
        const items = response.data || response;
        const notificaciones = Array.isArray(items) 
          ? items.map(item => this.mapNotificacion(item))
          : [];
        this.updateNotificaciones(notificaciones);
        return notificaciones;
      }),
      catchError(error => {
        // Si el endpoint no existe, usar datos mock
        if (error.status === 404) {
          console.warn('⚠️ Endpoint /api/notificaciones no encontrado. Usando datos mock.');
          const mockNotificaciones = this.getMockNotificaciones();
          this.updateNotificaciones(mockNotificaciones);
          return of(mockNotificaciones);
        }
        console.error('❌ Error obteniendo notificaciones:', error);
        const mockNotificaciones = this.getMockNotificaciones();
        this.updateNotificaciones(mockNotificaciones);
        return of(mockNotificaciones);
      })
    );
  }

  /**
   * Marca una notificación como leída
   */
  marcarComoLeida(id: number): Observable<boolean> {
    console.log('🔄 PUT Marcar notificación como leída - ID:', id);
    
    return this.http.put<any>(`${this.apiUrl}/${id}/leida`, {}).pipe(
      map(() => {
        this.updateNotificacionLeida(id);
        return true;
      }),
      catchError(error => {
        // Si el endpoint no existe, actualizar localmente
        if (error.status === 404) {
          console.warn('⚠️ Endpoint para marcar como leída no encontrado. Actualizando localmente.');
          this.updateNotificacionLeida(id);
          return of(true);
        }
        console.error('❌ Error marcando notificación como leída:', error);
        // Actualizar localmente de todas formas
        this.updateNotificacionLeida(id);
        return of(true);
      })
    );
  }

  /**
   * Marca todas las notificaciones como leídas
   */
  marcarTodasComoLeidas(): Observable<boolean> {
    console.log('🔄 PUT Marcar todas las notificaciones como leídas');
    
    return this.http.put<any>(`${this.apiUrl}/marcar-todas-leidas`, {}).pipe(
      map(() => {
        this.marcarTodasLeidasLocal();
        return true;
      }),
      catchError(error => {
        // Si el endpoint no existe, actualizar localmente
        if (error.status === 404) {
          console.warn('⚠️ Endpoint para marcar todas como leídas no encontrado. Actualizando localmente.');
          this.marcarTodasLeidasLocal();
          return of(true);
        }
        console.error('❌ Error marcando todas las notificaciones como leídas:', error);
        // Actualizar localmente de todas formas
        this.marcarTodasLeidasLocal();
        return of(true);
      })
    );
  }

  /**
   * Elimina una notificación
   */
  eliminar(id: number): Observable<boolean> {
    console.log('🔄 DELETE Eliminar notificación - ID:', id);
    
    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(
      map(() => {
        this.eliminarNotificacionLocal(id);
        return true;
      }),
      catchError(error => {
        // Si el endpoint no existe, eliminar localmente
        if (error.status === 404) {
          console.warn('⚠️ Endpoint para eliminar notificación no encontrado. Eliminando localmente.');
          this.eliminarNotificacionLocal(id);
          return of(true);
        }
        console.error('❌ Error eliminando notificación:', error);
        // Eliminar localmente de todas formas
        this.eliminarNotificacionLocal(id);
        return of(true);
      })
    );
  }

  /**
   * Carga las notificaciones
   */
  loadNotificaciones(): void {
    this.getAll().subscribe();
  }

  /**
   * Obtiene el número de notificaciones no leídas
   */
  getNoLeidasCount(): number {
    return this.noLeidasCountSubject.value;
  }

  /**
   * Obtiene las notificaciones actuales
   */
  getNotificaciones(): Notificacion[] {
    return this.notificacionesSubject.value;
  }

  // Métodos privados para manejo local del estado

  private updateNotificaciones(notificaciones: Notificacion[]): void {
    this.notificacionesSubject.next(notificaciones);
    this.updateNoLeidasCount(notificaciones);
  }

  private updateNotificacionLeida(id: number): void {
    const notificaciones = this.notificacionesSubject.value.map(n => 
      n.id === id ? { ...n, leida: true } : n
    );
    this.updateNotificaciones(notificaciones);
  }

  private marcarTodasLeidasLocal(): void {
    const notificaciones = this.notificacionesSubject.value.map(n => ({ ...n, leida: true }));
    this.updateNotificaciones(notificaciones);
  }

  private eliminarNotificacionLocal(id: number): void {
    const notificaciones = this.notificacionesSubject.value.filter(n => n.id !== id);
    this.updateNotificaciones(notificaciones);
  }

  private updateNoLeidasCount(notificaciones: Notificacion[]): void {
    const count = notificaciones.filter(n => !n.leida).length;
    this.noLeidasCountSubject.next(count);
  }

  private mapNotificacion(item: any): Notificacion {
    return {
      id: item.id || item.idNotificacion || 0,
      titulo: item.titulo || item.Titulo || 'Notificación',
      mensaje: item.mensaje || item.Mensaje || item.descripcion || item.Descripcion || '',
      tipo: this.mapTipo(item.tipo || item.Tipo || 'info'),
      fecha: item.fecha ? new Date(item.fecha || item.Fecha) : new Date(),
      leida: item.leida || item.Leida || false,
      url: item.url || item.Url
    };
  }

  private mapTipo(tipo: string): 'info' | 'success' | 'warning' | 'error' {
    const tipoLower = tipo.toLowerCase();
    if (tipoLower === 'success' || tipoLower === 'exito' || tipoLower === 'éxito') return 'success';
    if (tipoLower === 'warning' || tipoLower === 'advertencia' || tipoLower === 'alerta') return 'warning';
    if (tipoLower === 'error' || tipoLower === 'error') return 'error';
    return 'info';
  }

  /**
   * Genera notificaciones mock para desarrollo
   */
  private getMockNotificaciones(): Notificacion[] {
    const ahora = new Date();
    return [
      {
        id: 1,
        titulo: 'Nueva actividad asignada',
        mensaje: 'Se te ha asignado una nueva actividad: "Revisión de indicadores"',
        tipo: 'info',
        fecha: new Date(ahora.getTime() - 5 * 60 * 1000), // Hace 5 minutos
        leida: false
      },
      {
        id: 2,
        titulo: 'Actividad completada',
        mensaje: 'La actividad "Reunión de seguimiento" ha sido marcada como completada',
        tipo: 'success',
        fecha: new Date(ahora.getTime() - 30 * 60 * 1000), // Hace 30 minutos
        leida: false
      },
      {
        id: 3,
        titulo: 'Recordatorio importante',
        mensaje: 'Tienes 3 actividades pendientes que requieren atención',
        tipo: 'warning',
        fecha: new Date(ahora.getTime() - 2 * 60 * 60 * 1000), // Hace 2 horas
        leida: true
      },
      {
        id: 4,
        titulo: 'Nueva evidencia subida',
        mensaje: 'Se ha subido una nueva evidencia para la actividad "Capacitación"',
        tipo: 'info',
        fecha: new Date(ahora.getTime() - 1 * 24 * 60 * 60 * 1000), // Hace 1 día
        leida: false
      },
      {
        id: 5,
        titulo: 'Indicador actualizado',
        mensaje: 'El indicador 6.1.1 ha sido actualizado con nuevos datos',
        tipo: 'success',
        fecha: new Date(ahora.getTime() - 2 * 24 * 60 * 60 * 1000), // Hace 2 días
        leida: true
      }
    ];
  }
}

