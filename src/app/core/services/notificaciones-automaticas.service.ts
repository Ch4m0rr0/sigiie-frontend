import { Injectable, inject } from '@angular/core';
import { interval, firstValueFrom } from 'rxjs';
import { ActividadesService } from './actividades.service';
import { ParticipacionService } from './participacion.service';
import { EvidenciaService } from './evidencia.service';
import { NotificacionesService } from './notificaciones.service';
import { ToastService } from './toast.service';
import type { Actividad } from '../models/actividad';

@Injectable({ providedIn: 'root' })
export class NotificacionesAutomaticasService {
  private actividadesService = inject(ActividadesService);
  private participacionService = inject(ParticipacionService);
  private evidenciaService = inject(EvidenciaService);
  private notificacionesService = inject(NotificacionesService);
  private toastService = inject(ToastService);

  private intervalSubscription: any;
  private notificacionesProcesadas = new Set<string>(); // Para evitar duplicados
  private readonly INTERVALO_VERIFICACION = 60000; // 1 minuto

  /**
   * Inicia el servicio de verificación automática de notificaciones
   */
  iniciar(): void {
    console.log('🔔 Iniciando servicio de notificaciones automáticas');
    
    // Verificar inmediatamente
    this.verificarNotificaciones();

    // Verificar periódicamente
    this.intervalSubscription = interval(this.INTERVALO_VERIFICACION).subscribe(() => {
      this.verificarNotificaciones();
    });
  }

  /**
   * Detiene el servicio de verificación automática
   */
  detener(): void {
    if (this.intervalSubscription) {
      this.intervalSubscription.unsubscribe();
      this.intervalSubscription = null;
    }
    console.log('🔕 Servicio de notificaciones automáticas detenido');
  }

  /**
   * Verifica y genera notificaciones automáticas
   */
  async verificarNotificaciones(): Promise<void> {
    try {
      const ahora = new Date();
      const mañana = new Date(ahora);
      mañana.setDate(mañana.getDate() + 1);
      mañana.setHours(0, 0, 0, 0);

      // Obtener todas las actividades
      const actividades = await firstValueFrom(this.actividadesService.getAll());

      // 1. Actividades que inician en 1 día
      await this.verificarActividadesQueInician(actividades, mañana);

      // 2. Actividades ya terminadas
      await this.verificarActividadesTerminadas(actividades, ahora);

      // 3. Actividades terminadas sin participación
      await this.verificarActividadesSinParticipacion(actividades, ahora);

      // 4. Actividades terminadas sin evidencia
      await this.verificarActividadesSinEvidencia(actividades, ahora);

    } catch (error) {
      console.error('❌ Error verificando notificaciones automáticas:', error);
    }
  }

  /**
   * Verifica actividades que inician en 1 día
   */
  private async verificarActividadesQueInician(actividades: Actividad[], mañana: Date): Promise<void> {
    const actividadesQueInician = actividades.filter(actividad => {
      if (!actividad.fechaInicio) return false;
      
      const fechaInicio = new Date(actividad.fechaInicio);
      fechaInicio.setHours(0, 0, 0, 0);
      
      return fechaInicio.getTime() === mañana.getTime();
    });

    for (const actividad of actividadesQueInician) {
      const key = `inicio-${actividad.id}`;
      if (this.notificacionesProcesadas.has(key)) continue;

      const mensaje = `La actividad "${actividad.nombreActividad}" inicia mañana`;
      const titulo = 'Actividad próxima a iniciar';

      // Mostrar toast solo si está habilitado
      if (this.notificacionesService.getMostrarToasts()) {
        this.toastService.info(mensaje, titulo, 5000, {
          texto: 'Ver actividad',
          callback: () => {
            // Navegar a la actividad
            window.location.href = `/actividades/${actividad.id}`;
          }
        });
      }

      // Crear notificación persistente (si el backend está disponible)
      this.crearNotificacionBackend({
        titulo,
        mensaje,
        tipo: 'info',
        url: `/actividades/${actividad.id}`
      }, key);

      this.notificacionesProcesadas.add(key);
    }
  }

  /**
   * Verifica actividades ya terminadas
   */
  private async verificarActividadesTerminadas(actividades: Actividad[], ahora: Date): Promise<void> {
    const actividadesTerminadas = actividades.filter(actividad => {
      if (!actividad.fechaFin) return false;
      
      const fechaFin = new Date(actividad.fechaFin);
      fechaFin.setHours(23, 59, 59, 999);
      
      // Actividad terminada en los últimos 7 días
      const hace7Dias = new Date(ahora);
      hace7Dias.setDate(hace7Dias.getDate() - 7);
      
      return fechaFin < ahora && fechaFin > hace7Dias;
    });

    for (const actividad of actividadesTerminadas) {
      const key = `terminada-${actividad.id}`;
      if (this.notificacionesProcesadas.has(key)) continue;

      const fechaFin = new Date(actividad.fechaFin!);
      const diasTranscurridos = Math.floor((ahora.getTime() - fechaFin.getTime()) / (1000 * 60 * 60 * 24));
      
      const mensaje = `La actividad "${actividad.nombreActividad}" finalizó hace ${diasTranscurridos} día${diasTranscurridos > 1 ? 's' : ''}`;
      const titulo = 'Actividad finalizada';

      // Mostrar toast solo si está habilitado
      if (this.notificacionesService.getMostrarToasts()) {
        this.toastService.success(mensaje, titulo, 5000, {
          texto: 'Ver actividad',
          callback: () => {
            // Navegar a la actividad
            window.location.href = `/actividades/${actividad.id}`;
          }
        });
      }

          this.crearNotificacionBackend({
            titulo,
            mensaje,
            tipo: 'success',
            url: `/actividades/${actividad.id}`
          }, key);

      this.notificacionesProcesadas.add(key);
    }
  }

  /**
   * Verifica actividades terminadas sin participación
   */
  private async verificarActividadesSinParticipacion(actividades: Actividad[], ahora: Date): Promise<void> {
    for (const actividad of actividades) {
      if (!actividad.fechaFin) continue;
      
      const fechaFin = new Date(actividad.fechaFin);
      fechaFin.setHours(23, 59, 59, 999);
      
      // Solo verificar actividades terminadas en los últimos 30 días
      const hace30Dias = new Date(ahora);
      hace30Dias.setDate(hace30Dias.getDate() - 30);
      
      if (fechaFin >= ahora || fechaFin < hace30Dias) continue;

      const key = `sin-participacion-${actividad.id}`;
      if (this.notificacionesProcesadas.has(key)) continue;

      try {
        // Verificar si tiene participaciones
        const participaciones = await firstValueFrom(
          this.participacionService.getByActividad(actividad.id)
        );

        if (participaciones.length === 0) {
          const mensaje = `La actividad "${actividad.nombreActividad}" finalizó pero no tiene participaciones registradas`;
          const titulo = 'Actividad sin participación';

          // Mostrar toast solo si está habilitado
          if (this.notificacionesService.getMostrarToasts()) {
            this.toastService.warning(mensaje, titulo, 6000, {
              texto: 'Agregar participación',
              callback: () => {
                // Navegar a la actividad en el tab de participantes
                window.location.href = `/actividades/${actividad.id}?tab=participantes`;
              }
            });
          }

          this.crearNotificacionBackend({
            titulo,
            mensaje,
            tipo: 'warning',
            url: `/actividades/${actividad.id}?tab=participantes`
          }, key);

          this.notificacionesProcesadas.add(key);
        }
      } catch (error) {
        console.warn('⚠️ Error verificando participaciones para actividad', actividad.id, error);
      }
    }
  }

  /**
   * Verifica actividades terminadas sin evidencia
   */
  private async verificarActividadesSinEvidencia(actividades: Actividad[], ahora: Date): Promise<void> {
    for (const actividad of actividades) {
      if (!actividad.fechaFin) continue;
      
      const fechaFin = new Date(actividad.fechaFin);
      fechaFin.setHours(23, 59, 59, 999);
      
      // Solo verificar actividades terminadas en los últimos 30 días
      const hace30Dias = new Date(ahora);
      hace30Dias.setDate(hace30Dias.getDate() - 30);
      
      if (fechaFin >= ahora || fechaFin < hace30Dias) continue;

      const key = `sin-evidencia-${actividad.id}`;
      if (this.notificacionesProcesadas.has(key)) continue;

      try {
        // Verificar si tiene evidencias
        // Obtener todas las evidencias y filtrar por actividad
        const todasEvidencias = await firstValueFrom(this.evidenciaService.getAll());
        const evidencias = todasEvidencias.filter(e => e.idActividad === actividad.id);

        if (evidencias.length === 0) {
          const mensaje = `La actividad "${actividad.nombreActividad}" finalizó pero no tiene evidencias registradas`;
          const titulo = 'Actividad sin evidencia';

          // Mostrar toast solo si está habilitado
          if (this.notificacionesService.getMostrarToasts()) {
            this.toastService.warning(mensaje, titulo, 6000, {
              texto: 'Agregar evidencia',
              callback: () => {
                // Navegar a la actividad en el tab de evidencias
                window.location.href = `/actividades/${actividad.id}?tab=evidencias`;
              }
            });
          }

          this.crearNotificacionBackend({
            titulo,
            mensaje,
            tipo: 'warning',
            url: `/actividades/${actividad.id}?tab=evidencias`
          }, key);

          this.notificacionesProcesadas.add(key);
        }
      } catch (error) {
        console.warn('⚠️ Error verificando evidencias para actividad', actividad.id, error);
      }
    }
  }

  /**
   * Notifica cuando se crea una nueva actividad
   */
  notificarNuevaActividad(actividad: Actividad, creadorNombre?: string): void {
    const mensaje = creadorNombre 
      ? `Se creó una nueva actividad: "${actividad.nombreActividad}" por ${creadorNombre}`
      : `Se creó una nueva actividad: "${actividad.nombreActividad}"`;
    const titulo = 'Nueva actividad creada';

    // Mostrar toast solo si está habilitado
    if (this.notificacionesService.getMostrarToasts()) {
      this.toastService.info(mensaje, titulo, 5000, {
        texto: 'Ver actividad',
        callback: () => {
          // Navegar a la actividad
          window.location.href = `/actividades/${actividad.id}`;
        }
      });
    }

    this.crearNotificacionBackend({
      titulo,
      mensaje,
      tipo: 'info',
      url: `/actividades/${actividad.id}`
    }, `nueva-actividad-${actividad.id}`);
  }

  /**
   * Crea una notificación en el backend (si está disponible) y localmente
   */
  private crearNotificacionBackend(notificacion: {
    titulo: string;
    mensaje: string;
    tipo: 'info' | 'success' | 'warning' | 'error';
    url?: string;
  }, codigoNotificacion?: string): void {
    // Agregar la notificación localmente para que aparezca en el dropdown
    this.notificacionesService.agregarNotificacionLocal({
      titulo: notificacion.titulo,
      mensaje: notificacion.mensaje,
      tipo: notificacion.tipo,
      fecha: new Date(),
      leida: false,
      url: notificacion.url
    }, codigoNotificacion);

    // Cuando el backend esté listo, aquí se haría la llamada HTTP
    // this.notificacionesService.crear(notificacion).subscribe();
  }

  /**
   * Limpia las notificaciones procesadas (útil para testing o reset)
   */
  limpiarCache(): void {
    this.notificacionesProcesadas.clear();
  }
}

