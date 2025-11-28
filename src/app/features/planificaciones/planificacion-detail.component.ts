import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PlanificacionService } from '../../core/services/planificacion.service';
import { ActividadesService } from '../../core/services/actividades.service';
import type { Planificacion, PlanificacionArbol, PlanificacionResumen, PlanificacionUpdate, PlanificacionActividadCreate } from '../../core/models/planificacion';
import type { Actividad } from '../../core/models/actividad';
import { IconComponent } from '../../shared/icon/icon.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';
import { firstValueFrom } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-planificacion-detail',
  imports: [CommonModule, RouterModule, IconComponent, ...BrnButtonImports],
  templateUrl: './planificacion-detail.component.html',
})
export class PlanificacionDetailComponent implements OnInit {
  private planificacionService = inject(PlanificacionService);
  private actividadesService = inject(ActividadesService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  planificacion = signal<Planificacion | null>(null);
  hijas = signal<PlanificacionArbol[]>([]);
  actividades = signal<any[]>([]);
  todasLasActividades = signal<Actividad[]>([]); // Para el selector de asociar
  resumen = signal<PlanificacionResumen | null>(null);
  arbolCompleto = signal<PlanificacionArbol | null>(null);
  loading = signal(false);
  loadingActividades = signal(false);
  loadingResumen = signal(false);
  loadingTodasActividades = signal(false);
  error = signal<string | null>(null);
  activeTab = signal<'info' | 'hijas' | 'actividades' | 'reportes' | 'resumen' | 'arbol'>('info');
  
  // Para el modal/formulario de asociar actividad
  mostrarModalAsociar = signal(false);
  actividadSeleccionada = signal<number | null>(null);
  asociando = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadPlanificacion(+id);
      this.loadHijas(+id);
    }
  }

  loadPlanificacion(id: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.planificacionService.getById(id).subscribe({
      next: (data) => {
        this.planificacion.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading planificacion:', err);
        this.error.set('Error al cargar la planificación');
        this.loading.set(false);
      }
    });
  }

  loadHijas(id: number): void {
    this.planificacionService.getHijas(id).subscribe({
      next: (data) => this.hijas.set(data),
      error: (err) => console.error('Error loading hijas:', err)
    });
  }

  navigateToEdit(): void {
    const id = this.planificacion()?.idPlanificacion;
    if (id) {
      this.router.navigate(['/planificaciones', id, 'editar']);
    }
  }

  onDelete(): void {
    const planificacion = this.planificacion();
    const id = planificacion?.idPlanificacion;
    
    if (!id) {
      this.error.set('No se pudo obtener el ID de la planificación');
      return;
    }

    // Mensaje de confirmación personalizado según el estado
    const estado = planificacion.activo ? 'activa' : 'inactiva';
    const mensajeConfirmacion = `¿Está seguro de que desea eliminar esta planificación ${estado}? Esta acción no se puede deshacer.`;
    
    if (!confirm(mensajeConfirmacion)) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    
    console.log('🔄 DetailComponent - Eliminando planificación ID:', id);
    console.log('🔄 DetailComponent - Estado de la planificación:', planificacion.activo ? 'Activa' : 'Inactiva');
    
    this.planificacionService.delete(id).subscribe({
      next: async (success) => {
        console.log('✅ DetailComponent - Resultado de eliminación:', success);
        
        if (success) {
          console.log('✅ DetailComponent - Backend reportó éxito, verificando eliminación...');
          
          // Verificar que realmente se eliminó intentando obtenerla de nuevo
          try {
            const verificacion = await firstValueFrom(this.planificacionService.getById(id));
            if (verificacion === null) {
              console.log('✅ DetailComponent - Verificación exitosa: La planificación ya no existe');
              this.loading.set(false);
              this.router.navigate(['/planificaciones']);
            } else {
              console.warn('⚠️ DetailComponent - La planificación aún existe después de eliminar');
              console.warn('⚠️ DetailComponent - Estado de la planificación:', verificacion.activo ? 'Activa' : 'Inactiva');
              console.warn('⚠️ DetailComponent - ID:', verificacion.idPlanificacion);
              
              this.loading.set(false);
              
              // Mensaje específico según el estado
              if (!verificacion.activo) {
                const mensaje = 'No se puede eliminar una planificación inactiva. El backend tiene restricciones que impiden eliminar planificaciones inactivas.\n\n¿Deseas activar la planificación primero y luego intentar eliminarla?';
                if (confirm(mensaje)) {
                  this.activarYeliminar(id, verificacion);
                } else {
                  this.error.set('No se puede eliminar una planificación inactiva. Activa la planificación primero desde el formulario de edición.');
                }
              } else {
                this.error.set('La planificación no se eliminó correctamente. El servidor reportó éxito pero la planificación aún existe. Por favor, intenta nuevamente o contacta al administrador.');
              }
            }
          } catch (verifyError: any) {
            if (verifyError?.status === 404) {
              // 404 significa que realmente se eliminó
              console.log('✅ DetailComponent - Verificación exitosa: 404 confirmado (planificación eliminada)');
              this.loading.set(false);
              this.router.navigate(['/planificaciones']);
            } else {
              console.warn('⚠️ DetailComponent - Error al verificar eliminación:', verifyError);
              // Aún así navegar, ya que el backend reportó éxito
              this.loading.set(false);
              this.router.navigate(['/planificaciones']);
            }
          }
        } else {
          console.warn('⚠️ DetailComponent - El backend reportó que la eliminación falló (success=false)');
          this.loading.set(false);
          this.error.set('No se pudo eliminar la planificación. El servidor reportó que la operación falló.');
        }
      },
      error: (err: any) => {
        console.error('❌ DetailComponent - Error deleting planificacion:', err);
        console.error('❌ Error status:', err.status);
        console.error('❌ Error message:', err.message);
        console.error('❌ Error details:', err.error);
        console.error('❌ Error completo:', JSON.stringify(err, null, 2));
        
        this.loading.set(false);
        
        let errorMessage = 'Error al eliminar la planificación';
        
        // Manejo específico de errores según el código HTTP
        if (err.status === 404) {
          errorMessage = 'La planificación no fue encontrada';
        } else if (err.status === 403) {
          errorMessage = 'No tienes permisos para eliminar esta planificación';
        } else if (err.status === 400) {
          // Intentar extraer el mensaje del error del backend
          const backendMessage = err.error?.message || 
                                err.error?.title || 
                                err.error?.errors?.[0] ||
                                (typeof err.error === 'string' ? err.error : null);
          
          if (backendMessage) {
            errorMessage = backendMessage;
          } else {
            errorMessage = 'No se puede eliminar la planificación. Puede tener dependencias asociadas o estar en un estado que no permite su eliminación.';
          }
        } else if (err.status === 500) {
          errorMessage = 'Error interno del servidor. Por favor, intenta nuevamente más tarde.';
        } else if (err.error?.message) {
          errorMessage = err.error.message;
        } else if (err.error?.title) {
          errorMessage = err.error.title;
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        this.error.set(errorMessage);
      }
    });
  }

  activarYeliminar(id: number, planificacion: Planificacion): void {
    console.log('🔄 DetailComponent - Activando planificación antes de eliminar...');
    console.log('🔄 DetailComponent - ID de planificación:', id);
    console.log('🔄 DetailComponent - Datos de planificación:', planificacion);
    this.loading.set(true);
    this.error.set(null);

    // Crear objeto de actualización con activo = true
    const updateData: PlanificacionUpdate = {
      nombre: planificacion.nombre,
      descripcion: planificacion.descripcion,
      idTipoPlanificacion: planificacion.idTipoPlanificacion,
      periodoInicio: planificacion.periodoInicio || '',
      periodoFin: planificacion.periodoFin || '',
      anio: planificacion.anio,
      activo: true // Activar la planificación
    };

    console.log('🔄 DetailComponent - Datos de actualización:', updateData);

    // Primero activar
    this.planificacionService.update(id, updateData).subscribe({
      next: (success) => {
        console.log('✅ DetailComponent - Resultado de activación:', success);
        if (success) {
          console.log('✅ DetailComponent - Planificación activada, esperando 500ms antes de eliminar...');
          // Esperar un momento para que el backend procese la actualización
          setTimeout(() => {
            console.log('🔄 DetailComponent - Intentando eliminar planificación activada...');
            this.planificacionService.delete(id).subscribe({
              next: async (deleteSuccess) => {
                if (deleteSuccess) {
                  console.log('✅ DetailComponent - Backend reportó éxito al eliminar después de activar');
                  
                  // Verificar que realmente se eliminó
                  try {
                    const verificacion = await firstValueFrom(this.planificacionService.getById(id));
                    if (verificacion === null) {
                      console.log('✅ DetailComponent - Verificación exitosa: Planificación eliminada');
                      this.loading.set(false);
                      this.router.navigate(['/planificaciones']);
                    } else {
                      console.warn('⚠️ DetailComponent - La planificación aún existe después de activar y eliminar');
                      console.warn('⚠️ DetailComponent - Estado actual:', verificacion.activo ? 'Activa' : 'Inactiva');
                      console.warn('⚠️ DetailComponent - Datos completos:', verificacion);
                      
                      this.loading.set(false);
                      
                      // Mensaje más específico
                      let mensajeError = 'La planificación no se eliminó correctamente incluso después de activarla. ';
                      
                      // Verificar si tiene hijas o dependencias
                      if (verificacion.hijasCount > 0) {
                        mensajeError += `La planificación tiene ${verificacion.hijasCount} planificación(es) hija(s) asociada(s). Es posible que necesites eliminar primero las planificaciones hijas.`;
                      } else {
                        mensajeError += 'El backend puede tener restricciones adicionales que impiden la eliminación. Por favor, contacta al administrador del sistema.';
                      }
                      
                      this.error.set(mensajeError);
                    }
                  } catch (verifyErr: any) {
                    if (verifyErr?.status === 404) {
                      console.log('✅ DetailComponent - Verificación exitosa: 404 confirmado (planificación eliminada)');
                      this.loading.set(false);
                      this.router.navigate(['/planificaciones']);
                    } else {
                      console.warn('⚠️ DetailComponent - Error al verificar eliminación después de activar:', verifyErr);
                      // Aún así navegar, ya que el backend reportó éxito
                      this.loading.set(false);
                      this.router.navigate(['/planificaciones']);
                    }
                  }
                } else {
                  console.warn('⚠️ DetailComponent - Backend reportó que la eliminación falló después de activar');
                  this.loading.set(false);
                  this.error.set('No se pudo eliminar la planificación incluso después de activarla. El backend puede tener restricciones adicionales.');
                }
              },
              error: (deleteErr: any) => {
                console.error('❌ DetailComponent - Error al eliminar después de activar:', deleteErr);
                this.loading.set(false);
                this.error.set('Error al eliminar la planificación después de activarla. Por favor, intenta eliminarla manualmente desde la lista.');
              }
            });
          }, 500); // Esperar 500ms
        } else {
          this.loading.set(false);
          this.error.set('No se pudo activar la planificación. Por favor, actívala manualmente desde el formulario de edición.');
        }
      },
      error: (updateErr: any) => {
        console.error('❌ DetailComponent - Error al activar planificación:', updateErr);
        this.loading.set(false);
        this.error.set('Error al activar la planificación. Por favor, actívala manualmente desde el formulario de edición.');
      }
    });
  }

  onDuplicar(): void {
    const id = this.planificacion()?.idPlanificacion;
    if (id) {
      this.planificacionService.duplicar(id).subscribe({
        next: (data) => {
          this.router.navigate(['/planificaciones', data.idPlanificacion]);
        },
        error: (err) => {
          console.error('Error duplicating planificacion:', err);
          this.error.set('Error al duplicar la planificación');
        }
      });
    }
  }

  setTab(tab: 'info' | 'hijas' | 'actividades' | 'reportes' | 'resumen' | 'arbol'): void {
    this.activeTab.set(tab);
    
    // Cargar datos según el tab seleccionado
    const id = this.planificacion()?.idPlanificacion;
    if (!id) return;
    
    if (tab === 'actividades' && this.actividades().length === 0) {
      this.loadActividades(id);
    } else if (tab === 'resumen' && !this.resumen()) {
      this.loadResumen(id);
    } else if (tab === 'arbol' && !this.arbolCompleto()) {
      this.loadArbolCompleto(id);
    }
  }

  loadActividades(id: number): void {
    this.loadingActividades.set(true);
    this.planificacionService.getActividades(id).subscribe({
      next: (data) => {
        this.actividades.set(data);
        this.loadingActividades.set(false);
      },
      error: (err) => {
        console.error('Error loading actividades:', err);
        this.error.set('Error al cargar las actividades');
        this.loadingActividades.set(false);
      }
    });
  }

  loadTodasLasActividades(): void {
    if (this.todasLasActividades().length > 0) {
      return; // Ya están cargadas
    }
    
    this.loadingTodasActividades.set(true);
    this.actividadesService.getAll().subscribe({
      next: (data) => {
        // Filtrar las que ya están asociadas
        const actividadesAsociadas = this.actividades().map(a => a.id || a.idActividad);
        const disponibles = data.filter(a => !actividadesAsociadas.includes(a.id));
        this.todasLasActividades.set(disponibles);
        this.loadingTodasActividades.set(false);
      },
      error: (err) => {
        console.error('Error loading todas las actividades:', err);
        this.loadingTodasActividades.set(false);
      }
    });
  }

  abrirModalAsociar(): void {
    this.loadTodasLasActividades();
    this.mostrarModalAsociar.set(true);
    this.actividadSeleccionada.set(null);
  }

  cerrarModalAsociar(): void {
    this.mostrarModalAsociar.set(false);
    this.actividadSeleccionada.set(null);
  }

  asociarActividad(): void {
    const planificacionId = this.planificacion()?.idPlanificacion;
    const actividadId = this.actividadSeleccionada();
    
    if (!planificacionId || !actividadId) {
      this.error.set('Debes seleccionar una actividad');
      return;
    }

    this.asociando.set(true);
    const data: PlanificacionActividadCreate = {
      idPlanificacion: planificacionId,
      idActividad: actividadId,
      anio: this.planificacion()?.anio,
      activo: true
    };

    this.planificacionService.asociarActividad(planificacionId, data).subscribe({
      next: () => {
        console.log('✅ Actividad asociada exitosamente');
        this.cerrarModalAsociar();
        // Recargar actividades
        this.loadActividades(planificacionId);
        // Actualizar lista de disponibles
        this.todasLasActividades.set(
          this.todasLasActividades().filter(a => a.id !== actividadId)
        );
        this.asociando.set(false);
      },
      error: (err) => {
        console.error('❌ Error al asociar actividad:', err);
        this.error.set('Error al asociar la actividad. Por favor, intenta nuevamente.');
        this.asociando.set(false);
      }
    });
  }

  desasociarActividad(actividad: any): void {
    const planificacionId = this.planificacion()?.idPlanificacion;
    
    if (!planificacionId) {
      this.error.set('No se pudo obtener el ID de la planificación');
      return;
    }

    // Obtener el idPlanificacionActividad de la actividad
    const idPlanificacionActividad = actividad.idPlanificacionActividad || actividad.IdPlanificacionActividad;
    
    if (!idPlanificacionActividad) {
      this.error.set('No se pudo obtener el ID de la asociación. Por favor, recarga la página.');
      return;
    }

    if (!confirm('¿Estás seguro de que deseas desasociar esta actividad de la planificación?')) {
      return;
    }

    this.loadingActividades.set(true);
    this.planificacionService.desasociarActividad(idPlanificacionActividad).subscribe({
      next: () => {
        console.log('✅ Actividad desasociada exitosamente');
        // Recargar actividades
        this.loadActividades(planificacionId);
        // Recargar todas las actividades para que aparezca en el selector
        this.todasLasActividades.set([]);
        this.loadTodasLasActividades();
      },
      error: (err) => {
        console.error('❌ Error al desasociar actividad:', err);
        this.error.set('Error al desasociar la actividad. Por favor, intenta nuevamente.');
        this.loadingActividades.set(false);
      }
    });
  }

  crearNuevaActividad(): void {
    const planificacionId = this.planificacion()?.idPlanificacion;
    if (planificacionId) {
      // Navegar al formulario de actividad con el ID de planificación en query params
      this.router.navigate(['/actividades/nueva'], {
        queryParams: { planificacionId: planificacionId }
      });
    } else {
      this.router.navigate(['/actividades/nueva']);
    }
  }

  loadResumen(id: number): void {
    this.loadingResumen.set(true);
    // Cargar resumen con actividades y reportes
    this.planificacionService.getResumen(id, true, true).subscribe({
      next: (data) => {
        this.resumen.set(data);
        this.loadingResumen.set(false);
      },
      error: (err) => {
        console.error('Error loading resumen:', err);
        this.error.set('Error al cargar el resumen');
        this.loadingResumen.set(false);
      }
    });
  }

  loadArbolCompleto(id: number): void {
    this.planificacionService.getArbolCompleto(id).subscribe({
      next: (data) => {
        this.arbolCompleto.set(data);
      },
      error: (err) => {
        console.error('Error loading arbol completo:', err);
        this.error.set('Error al cargar el árbol completo');
      }
    });
  }

  // Helper methods para el template
  tieneActividadesResumen(): boolean {
    const res = this.resumen();
    return res !== null && 
           res.actividadesResumen !== undefined && 
           Array.isArray(res.actividadesResumen) && 
           res.actividadesResumen.length > 0;
  }

  tieneReportesResumen(): boolean {
    const res = this.resumen();
    return res !== null && 
           res.reportesResumen !== undefined && 
           Array.isArray(res.reportesResumen) && 
           res.reportesResumen.length > 0;
  }

  getActividadesResumen(): any[] {
    const res = this.resumen();
    return res?.actividadesResumen && Array.isArray(res.actividadesResumen) ? res.actividadesResumen : [];
  }

  getReportesResumen(): any[] {
    const res = this.resumen();
    return res?.reportesResumen && Array.isArray(res.reportesResumen) ? res.reportesResumen : [];
  }
}

