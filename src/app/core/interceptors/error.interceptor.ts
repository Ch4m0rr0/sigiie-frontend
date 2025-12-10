import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AlertService } from '../services/alert.service';

/**
 * Interceptor global para manejar errores HTTP
 * Filtra y maneja errores 500 de manera más elegante
 * Muestra alertas para errores 403 (sin permisos)
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const alertService = inject(AlertService);
  
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const url = req.url;
      
      // Solo loguear errores 500 si no son de endpoints conocidos que ya manejan sus propios errores
      if (error.status === 500) {
        // Verificar si el error 500 es en realidad un error de permisos mal manejado por el backend
        const errorMessage = error.error?.message || error.error?.title || error.message || '';
        const errorDetails = error.error?.details || error.error?.stack || '';
        const errorString = JSON.stringify(error.error || {}).toLowerCase();
        const fullErrorText = (errorMessage + ' ' + errorDetails + ' ' + errorString).toLowerCase();
        
        const isPermissionError = fullErrorText.includes('permiso') || 
                                 fullErrorText.includes('no tiene permiso') ||
                                 fullErrorText.includes('authentication handler') ||
                                 fullErrorText.includes('forbid') ||
                                 (fullErrorText.includes('scheme') && fullErrorText.includes('ver usuarios'));
        
        // Si es un error de permisos en un GET para cargar datos, manejarlo silenciosamente
        const isGetRequest = req.method === 'GET';
        const isDataLoadRequest = isGetRequest && (
          url.includes('/departamentos') ||
          url.includes('/indicadores') ||
          url.includes('/actividades-anuales') ||
          url.includes('/actividades-mensuales-institucionales') ||
          url.includes('/tipo-actividad') ||
          url.includes('/tipo-protagonista') ||
          url.includes('/tipo-evidencia') ||
          url.includes('/categoria-actividad') ||
          url.includes('/estado-actividad') ||
          url.includes('/usuarios')
        );
        
        if (isPermissionError && isDataLoadRequest) {
          // Error de permisos mal manejado por el backend (500 en lugar de 403)
          // No loguear nada, el servicio lo manejará silenciosamente
          // Solo continuar sin hacer nada
        } else {
          // Lista de endpoints que ya manejan sus propios errores y no necesitan logging adicional
          const silentEndpoints = [
            '/api/docentes',
            '/api/estudiantes',
            '/api/administrativos',
            '/api/departamentos',
            '/api/estado-actividad',
            '/api/tipo-iniciativa',
            '/api/categorias-actividad',
            '/api/tipo-documento',
            '/api/tipo-protagonista',
            '/api/capacidad-instalaciones',
            '/api/actividades-anuales',
            '/api/actividades-mensuales-institucionales',
            '/api/actividades',
            '/api/indicadores',
            '/api/tipo-evidencia',
            '/api/usuarios', // GET de usuarios para usar en formularios
            '/api/notificaciones' // El servicio de notificaciones maneja sus propios errores
          ];
          
          const shouldSilence = silentEndpoints.some(endpoint => url.includes(endpoint));
          
          if (!shouldSilence) {
            // Solo loguear errores 500 de endpoints importantes
            console.error(`❌ Error 500 en ${req.method} ${url}:`, error);
            if (error.error) {
              console.error('❌ Detalles del error:', error.error);
            }
          }
        }
      } else if (error.status === 0) {
        // Error de conexión
        console.error(`❌ Error de conexión en ${req.method} ${req.url}: No se pudo conectar al servidor`);
      } else if (error.status === 401) {
        // No autenticado - esto se maneja en el auth guard
        console.warn(`⚠️ No autenticado: ${req.method} ${req.url}`);
      } else if (error.status === 403) {
        // Sin permisos - mostrar alerta solo para acciones de CRUD (POST, PUT, DELETE)
        // Para GET (cargar datos para uso), no mostrar alerta ya que los servicios manejan el error
        const isGetRequest = req.method === 'GET';
        const isDataLoadRequest = isGetRequest && (
          url.includes('/departamentos') ||
          url.includes('/indicadores') ||
          url.includes('/actividades-anuales') ||
          url.includes('/actividades-mensuales-institucionales') ||
          url.includes('/tipo-actividad') ||
          url.includes('/tipo-protagonista') ||
          url.includes('/tipo-evidencia') ||
          url.includes('/categoria-actividad') ||
          url.includes('/estado-actividad') ||
          url.includes('/usuarios') // GET de usuarios para usar en formularios
        );
        
        // Solo mostrar alerta si NO es una petición GET para cargar datos de uso
        // (las peticiones GET para datos de uso se manejan silenciosamente en los servicios)
        if (!isDataLoadRequest) {
          console.warn(`⚠️ Sin permisos: ${req.method} ${req.url}`);
          
          // Extraer mensaje del error
          let mensaje = 'No tiene permisos para realizar esta acción.';
          if (error.error?.message) {
            mensaje = error.error.message;
          } else if (typeof error.error === 'string') {
            mensaje = error.error;
          } else if (error.error?.title) {
            mensaje = error.error.title;
          }
          
          // Determinar el tipo de acción según la URL y método
          let titulo = 'Acceso Denegado';
          let permisoRequerido = '';
          
          if (url.includes('/usuarios')) {
            titulo = 'Sin Permisos - Usuarios';
            if (req.method === 'POST') permisoRequerido = 'CrearUsuario';
            else if (req.method === 'PUT') permisoRequerido = 'EditarUsuario';
            else if (req.method === 'DELETE') permisoRequerido = 'EliminarUsuario';
          } else if (url.includes('/participaciones')) {
            titulo = 'Sin Permisos - Participaciones';
            if (req.method === 'POST') {
              permisoRequerido = 'CrearParticipacion';
              if (url.includes('/individual')) {
                mensaje = 'No tiene permisos para crear participaciones individuales. Necesita el permiso "CrearParticipacion" (sin la "e" al final). Verifique que el rol tenga asignado este permiso específico.';
              } else {
                mensaje = 'No tiene permisos para crear participaciones. Necesita el permiso "CrearParticipacion" (sin la "e" al final).';
              }
            } else if (req.method === 'PUT') {
              permisoRequerido = 'EditarParticipacion';
              if (url.includes('/individual')) {
                mensaje = 'No tiene permisos para editar participaciones individuales. Necesita el permiso "EditarParticipacion" (sin la "e" al final).';
              } else {
                mensaje = 'No tiene permisos para editar participaciones. Necesita el permiso "EditarParticipacion" (sin la "e" al final).';
              }
            } else if (req.method === 'DELETE') {
              permisoRequerido = 'EliminarParticipacion';
              if (url.includes('/individual')) {
                mensaje = 'No tiene permisos para eliminar participaciones individuales. Necesita el permiso "EliminarParticipacion" (sin la "e" al final).';
              } else {
                mensaje = 'No tiene permisos para eliminar participaciones. Necesita el permiso "EliminarParticipacion" (sin la "e" al final).';
              }
            }
          } else if (url.includes('/actividades') && !isGetRequest) {
            titulo = 'Sin Permisos - Actividades';
            if (req.method === 'POST') permisoRequerido = 'CrearActividad';
            else if (req.method === 'PUT') permisoRequerido = 'EditarActividad';
            else if (req.method === 'DELETE') permisoRequerido = 'EliminarActividad';
          } else if (url.includes('/catalogos') || url.includes('/departamentos') || url.includes('/tipo-actividad') || url.includes('/tipo-protagonista') || url.includes('/tipo-evidencia') || url.includes('/categoria-actividad') || url.includes('/indicadores')) {
            titulo = 'Sin Permisos - Catálogos';
            if (req.method === 'POST') permisoRequerido = 'catalogos.crear';
            else if (req.method === 'PUT') permisoRequerido = 'catalogos.editar';
            else if (req.method === 'DELETE') permisoRequerido = 'catalogos.eliminar';
          } else if (url.includes('/proyectos')) {
            titulo = 'Sin Permisos - Proyectos';
            if (req.method === 'POST') permisoRequerido = 'CrearProyecto';
            else if (req.method === 'PUT') permisoRequerido = 'EditarProyecto';
            else if (req.method === 'DELETE') permisoRequerido = 'EliminarProyecto';
          }
          
          // Agregar información del permiso requerido al mensaje si está disponible
          if (permisoRequerido && !mensaje.includes(permisoRequerido)) {
            mensaje += ` Permiso requerido: "${permisoRequerido}".`;
          }
          
          // Mostrar alerta de advertencia solo para acciones de CRUD
          alertService.warning(titulo, mensaje, {
            backdrop: true,
            allowOutsideClick: false,
            allowEscapeKey: true
          });
        } else {
          // Para GET de datos de uso, solo loguear sin mostrar alerta
          console.warn(`⚠️ Sin permisos para ver datos (403): ${req.method} ${req.url} - Los datos no estarán disponibles pero el formulario continuará funcionando.`);
        }
      }
      
      // Re-lanzar el error para que los servicios puedan manejarlo
      return throwError(() => error);
    })
  );
};

