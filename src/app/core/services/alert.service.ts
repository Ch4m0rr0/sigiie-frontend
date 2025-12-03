import { Injectable } from '@angular/core';
import Swal, { SweetAlertOptions, SweetAlertResult } from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  
  /**
   * Muestra una alerta de éxito
   */
  success(title: string, message?: string, options?: SweetAlertOptions): Promise<SweetAlertResult> {
    return Swal.fire({
      icon: 'success',
      title,
      text: message,
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#10b981', // emerald-600
      ...options
    });
  }

  /**
   * Muestra una alerta de error
   */
  error(title: string, message?: string, options?: SweetAlertOptions): Promise<SweetAlertResult> {
    return Swal.fire({
      icon: 'error',
      title,
      text: message,
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#ef4444', // red-500
      ...options
    });
  }

  /**
   * Muestra una alerta de advertencia
   */
  warning(title: string, message?: string, options?: SweetAlertOptions): Promise<SweetAlertResult> {
    return Swal.fire({
      icon: 'warning',
      title,
      text: message,
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#f59e0b', // amber-500
      ...options
    });
  }

  /**
   * Muestra una alerta de información
   */
  info(title: string, message?: string, options?: SweetAlertOptions): Promise<SweetAlertResult> {
    return Swal.fire({
      icon: 'info',
      title,
      text: message,
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#3b82f6', // blue-500
      ...options
    });
  }

  /**
   * Muestra una alerta de confirmación
   */
  confirm(
    title: string,
    message?: string,
    confirmText: string = 'Sí, continuar',
    cancelText: string = 'Cancelar',
    options?: SweetAlertOptions
  ): Promise<SweetAlertResult> {
    return Swal.fire({
      icon: 'question',
      title,
      text: message,
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      confirmButtonColor: '#10b981', // emerald-600
      cancelButtonColor: '#6b7280', // slate-500
      reverseButtons: true,
      ...options
    });
  }

  /**
   * Muestra una alerta de confirmación para eliminar
   */
  confirmDelete(
    itemName?: string,
    message?: string,
    options?: SweetAlertOptions
  ): Promise<SweetAlertResult> {
    const title = itemName 
      ? `¿Eliminar ${itemName}?`
      : '¿Está seguro de que desea eliminar?';
    const defaultMessage = message || 'Esta acción no se puede deshacer.';
    
    return Swal.fire({
      icon: 'warning',
      title,
      text: defaultMessage,
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444', // red-500
      cancelButtonColor: '#6b7280', // slate-500
      reverseButtons: true,
      ...options
    });
  }

  /**
   * Muestra una alerta de carga
   */
  loading(title: string = 'Cargando...', message?: string): void {
    Swal.fire({
      title,
      text: message,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
  }

  /**
   * Cierra la alerta actual
   */
  close(): void {
    Swal.close();
  }

  /**
   * Muestra un toast (notificación pequeña)
   */
  toast(
    message: string,
    icon: 'success' | 'error' | 'warning' | 'info' = 'success',
    position: 'top' | 'top-start' | 'top-end' | 'center' | 'center-start' | 'center-end' | 'bottom' | 'bottom-start' | 'bottom-end' = 'top-end',
    duration: number = 3000
  ): void {
    const Toast = Swal.mixin({
      toast: true,
      position,
      showConfirmButton: false,
      timer: duration,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
      }
    });

    Toast.fire({
      icon,
      title: message
    });
  }

  /**
   * Método genérico para mostrar cualquier tipo de alerta
   */
  fire(options: SweetAlertOptions): Promise<SweetAlertResult> {
    return Swal.fire(options);
  }
}

