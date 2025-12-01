import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

/**
 * Interceptor global para manejar errores HTTP
 * Filtra y maneja errores 500 de manera más elegante
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const url = req.url;
      
      // Solo loguear errores 500 si no son de endpoints conocidos que ya manejan sus propios errores
      if (error.status === 500) {
        
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
          '/api/indicadores'
        ];
        
        const shouldSilence = silentEndpoints.some(endpoint => url.includes(endpoint));
        
        if (!shouldSilence) {
          // Solo loguear errores 500 de endpoints importantes
          console.error(`❌ Error 500 en ${req.method} ${url}:`, error);
          if (error.error) {
            console.error('❌ Detalles del error:', error.error);
          }
        }
      } else if (error.status === 0) {
        // Error de conexión
        console.error(`❌ Error de conexión en ${req.method} ${req.url}: No se pudo conectar al servidor`);
      } else if (error.status === 401) {
        // No autenticado - esto se maneja en el auth guard
        console.warn(`⚠️ No autenticado: ${req.method} ${req.url}`);
      } else if (error.status === 403) {
        // Sin permisos
        console.warn(`⚠️ Sin permisos: ${req.method} ${req.url}`);
      }
      
      // Re-lanzar el error para que los servicios puedan manejarlo
      return throwError(() => error);
    })
  );
};

