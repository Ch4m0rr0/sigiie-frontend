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

  // Estado de mostrar notificaciones en pantalla (toasts)
  private readonly STORAGE_KEY_MOSTRAR_TOASTS = 'notificaciones_mostrar_toasts';
  private mostrarToastsSubject = new BehaviorSubject<boolean>(this.getMostrarToastsFromStorage());
  public mostrarToasts$ = this.mostrarToastsSubject.asObservable();

  constructor() {
    // Limpiar cualquier notificación local almacenada al iniciar
    this.notificacionesSubject.next([]);
    this.updateNoLeidasCount([]);
    
    // Cargar notificaciones del backend al inicializar el servicio
    this.loadNotificaciones();
    
    // Asegurar que el valor inicial esté sincronizado con localStorage
    const valorInicial = this.getMostrarToastsFromStorage();
    if (this.mostrarToastsSubject.value !== valorInicial) {
      this.mostrarToastsSubject.next(valorInicial);
    }
  }

  /**
   * Obtiene el estado de mostrar toasts desde localStorage
   */
  private getMostrarToastsFromStorage(): boolean {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_MOSTRAR_TOASTS);
      // Por defecto, mostrar toasts está activado (true) solo si no hay valor guardado
      if (stored === null) {
        return true; // Valor por defecto
      }
      return stored === 'true';
    } catch (error) {
      console.warn('⚠️ Error leyendo localStorage para mostrar toasts:', error);
      return true; // Valor por defecto en caso de error
    }
  }

  /**
   * Obtiene si se deben mostrar toasts
   */
  getMostrarToasts(): boolean {
    return this.mostrarToastsSubject.value;
  }

  /**
   * Establece si se deben mostrar toasts
   */
  setMostrarToasts(mostrar: boolean): void {
    try {
      localStorage.setItem(this.STORAGE_KEY_MOSTRAR_TOASTS, mostrar.toString());
      this.mostrarToastsSubject.next(mostrar);
      console.log('✅ Preferencia de mostrar toasts guardada:', mostrar);
    } catch (error) {
      console.error('❌ Error guardando preferencia de mostrar toasts:', error);
      // Aún así actualizar el subject para que la UI se actualice
      this.mostrarToastsSubject.next(mostrar);
    }
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
        // Si el endpoint no existe o hay un error, retornar array vacío
        // Las notificaciones ahora vienen solo del backend
        if (error.status === 404 || error.status === 500) {
          const statusMsg = error.status === 404 
            ? 'Endpoint /api/notificaciones no encontrado'
            : 'Error del servidor al obtener notificaciones';
          console.warn(`⚠️ ${statusMsg}. Retornando array vacío.`);
        } else {
          console.warn('⚠️ Error obteniendo notificaciones del backend. Retornando array vacío.');
        }
        
        // Limpiar cualquier notificación local y retornar array vacío
        this.updateNotificaciones([]);
        return of([]);
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

  /**
   * Agrega una notificación localmente (sin llamar al backend)
   * DESACTIVADO: Las notificaciones ahora vienen solo del backend
   */
  agregarNotificacionLocal(notificacion: Omit<Notificacion, 'id'>, codigoNotificacion?: string): void {
    // Método desactivado - las notificaciones ahora vienen solo del backend
    console.log('⚠️ agregarNotificacionLocal desactivado - las notificaciones vienen solo del backend');
    return;
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
   * DESACTIVADO: Las notificaciones ahora vienen solo del backend
   */
  private getMockNotificaciones(): Notificacion[] {
    // Método desactivado - las notificaciones ahora vienen solo del backend
    return [];
  }
}

