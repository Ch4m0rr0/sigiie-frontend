import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ToastAction {
  texto: string;
  callback: () => void;
}

export interface ToastMessage {
  id: string;
  titulo?: string;
  mensaje: string;
  tipo: 'success' | 'error' | 'warning' | 'info';
  duracion: number; // en milisegundos
  visible: boolean;
  progress: number; // 0-100
  accion?: ToastAction;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private toastsSubject = new BehaviorSubject<ToastMessage[]>([]);
  public toasts$ = this.toastsSubject.asObservable();

  private toasts: ToastMessage[] = [];
  private timers: Map<string, any> = new Map();
  private progressTimers: Map<string, any> = new Map();

  /**
   * Muestra un toast de éxito
   */
  success(mensaje: string, titulo?: string, duracion: number = 5000, accion?: ToastAction): string {
    return this.show('success', mensaje, titulo, duracion, accion);
  }

  /**
   * Muestra un toast de error
   */
  error(mensaje: string, titulo?: string, duracion: number = 6000, accion?: ToastAction): string {
    return this.show('error', mensaje, titulo, duracion, accion);
  }

  /**
   * Muestra un toast de advertencia
   */
  warning(mensaje: string, titulo?: string, duracion: number = 5000, accion?: ToastAction): string {
    return this.show('warning', mensaje, titulo, duracion, accion);
  }

  /**
   * Muestra un toast de información
   */
  info(mensaje: string, titulo?: string, duracion: number = 4000, accion?: ToastAction): string {
    return this.show('info', mensaje, titulo, duracion, accion);
  }

  /**
   * Muestra un toast genérico
   */
  show(
    tipo: 'success' | 'error' | 'warning' | 'info',
    mensaje: string,
    titulo?: string,
    duracion: number = 5000,
    accion?: ToastAction
  ): string {
    const id = this.generateId();
    const toast: ToastMessage = {
      id,
      titulo,
      mensaje,
      tipo,
      duracion,
      visible: true,
      progress: 100,
      accion
    };

    this.toasts.push(toast);
    this.updateToasts();

    // Iniciar animación de progreso
    this.startProgress(id, duracion);

    // Auto-remover después de la duración
    const timer = setTimeout(() => {
      this.remove(id);
    }, duracion);

    this.timers.set(id, timer);

    return id;
  }

  /**
   * Remueve un toast por ID
   */
  remove(id: string): void {
    const index = this.toasts.findIndex(t => t.id === id);
    if (index === -1) return;

    // Limpiar timers
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }

    const progressTimer = this.progressTimers.get(id);
    if (progressTimer) {
      clearInterval(progressTimer);
      this.progressTimers.delete(id);
    }

    // Animar salida
    this.toasts[index].visible = false;
    this.updateToasts();

    // Remover después de la animación
    setTimeout(() => {
      this.toasts = this.toasts.filter(t => t.id !== id);
      this.updateToasts();
    }, 300);
  }

  /**
   * Limpia todos los toasts
   */
  clear(): void {
    this.toasts.forEach(toast => {
      const timer = this.timers.get(toast.id);
      if (timer) clearTimeout(timer);
      const progressTimer = this.progressTimers.get(toast.id);
      if (progressTimer) clearInterval(progressTimer);
    });

    this.timers.clear();
    this.progressTimers.clear();
    this.toasts = [];
    this.updateToasts();
  }

  private startProgress(id: string, duracion: number): void {
    const toast = this.toasts.find(t => t.id === id);
    if (!toast) return;

    const interval = 50; // Actualizar cada 50ms
    const decrement = (100 / duracion) * interval;

    const progressTimer = setInterval(() => {
      const currentToast = this.toasts.find(t => t.id === id);
      if (!currentToast) {
        clearInterval(progressTimer);
        return;
      }

      currentToast.progress = Math.max(0, currentToast.progress - decrement);
      this.updateToasts();

      if (currentToast.progress <= 0) {
        clearInterval(progressTimer);
        this.progressTimers.delete(id);
      }
    }, interval);

    this.progressTimers.set(id, progressTimer);
  }

  private updateToasts(): void {
    this.toastsSubject.next([...this.toasts]);
  }

  private generateId(): string {
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

