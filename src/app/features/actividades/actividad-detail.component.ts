import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ActividadesService } from '../../core/services/actividades.service';
import { ActividadAnualService } from '../../core/services/actividad-anual.service';
import { ActividadMensualInstService } from '../../core/services/actividad-mensual-inst.service';
import { IndicadorService } from '../../core/services/indicador.service';
import { ActividadResponsableService } from '../../core/services/actividad-responsable.service';
import { EdicionService } from '../../core/services/edicion.service';
import type { Actividad } from '../../core/models/actividad';
import type { ActividadResponsable } from '../../core/models/actividad-responsable';
import type { ActividadIndicador } from '../../core/models/indicador';
import type { Subactividad } from '../../core/models/subactividad';
import type { ActividadAnual } from '../../core/models/actividad-anual';
import type { ActividadMensualInst } from '../../core/models/actividad-mensual-inst';
import type { Indicador } from '../../core/models/indicador';
import type { Edicion } from '../../core/models/edicion';
import { IconComponent } from '../../shared/icon/icon.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';

@Component({
  standalone: true,
  selector: 'app-actividad-detail',
  imports: [CommonModule, RouterModule, ReactiveFormsModule, IconComponent, ...BrnButtonImports],
  templateUrl: './actividad-detail.component.html',
})
export class ActividadDetailComponent implements OnInit {
  private actividadesService = inject(ActividadesService);
  private actividadAnualService = inject(ActividadAnualService);
  private actividadMensualInstService = inject(ActividadMensualInstService);
  private indicadorService = inject(IndicadorService);
  private responsableService = inject(ActividadResponsableService);
  private edicionService = inject(EdicionService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  actividad = signal<Actividad | null>(null);
  responsables = signal<ActividadResponsable[]>([]);
  indicadores = signal<ActividadIndicador[]>([]);
  subactividades = signal<Subactividad[]>([]);
  departamentos = signal<any[]>([]);
  actividadesAnuales = signal<ActividadAnual[]>([]);
  actividadesMensuales = signal<ActividadMensualInst[]>([]);
  indicadoresList = signal<Indicador[]>([]);
  ediciones = signal<Edicion[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  activeTab = signal<'info' | 'departamentos' | 'responsables' | 'indicadores' | 'subactividades' | 'actividades-anuales'>('info');
  
  // Formulario para crear indicador
  formIndicador!: FormGroup;
  mostrarFormIndicador = signal(false);
  loadingIndicador = signal(false);
  errorIndicador = signal<string | null>(null);

  ngOnInit(): void {
    this.initializeFormIndicador();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadActividad(+id);
      this.loadIndicadoresList();
    }
  }

  initializeFormIndicador(): void {
    this.formIndicador = this.fb.group({
      codigo: ['', [Validators.required, Validators.minLength(1)]],
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: [''],
      anio: [null, [Validators.min(2000), Validators.max(2100)]],
      meta: [null, [Validators.min(0)]],
      activo: [true]
    });
  }

  loadActividad(id: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.actividadesService.get(id).subscribe({
      next: (data) => {
        this.actividad.set(data);
        
        // Usar los datos que vienen en el objeto Actividad
        // Responsables
        if (data.responsables && Array.isArray(data.responsables)) {
          this.responsables.set(data.responsables);
        } else {
          // Fallback: intentar cargar desde endpoint dedicado si no vienen en la respuesta
          this.loadResponsables(id);
        }
        
        // Subactividades
        if (data.subactividades && Array.isArray(data.subactividades)) {
          this.subactividades.set(data.subactividades);
        }
        
        // Indicadores - crear array desde los datos del indicador asociado
        if (data.idIndicador) {
          const indicadorData: ActividadIndicador = {
            idActividadIndicador: 0, // No tenemos este ID, usar 0 como placeholder
            idActividad: data.id,
            idIndicador: data.idIndicador,
            nombreIndicador: data.nombreIndicador || data.nombreIndicadorAsociado || '',
            codigoIndicador: data.codigoIndicadorAsociado || data.codigoIndicador || '',
            metaAnual: data.metaIndicador,
            metaPeriodo: undefined,
            metaAlcanzada: data.metaAlcanzada,
            porcentajeCumplimiento: data.metaCumplimiento,
            valoracionCualitativa: data.valoracionIndicadorEstrategico,
            brechas: data.brechaEstrategica,
            evidenciaResumen: undefined
          };
          this.indicadores.set([indicadorData]);
          
          // Cargar actividades anuales relacionadas
          this.loadActividadesAnuales();
        }
        
        // Departamentos - crear array desde los datos del departamento
        const departamentosData: any[] = [];
        if (data.departamentoId && data.nombreDepartamento) {
          departamentosData.push({
            id: data.departamentoId,
            nombre: data.nombreDepartamento
          });
        }
        if (data.departamentoResponsableId && data.nombreDepartamentoResponsable) {
          departamentosData.push({
            id: data.departamentoResponsableId,
            nombre: data.nombreDepartamentoResponsable
          });
        }
        this.departamentos.set(departamentosData);
        
        // Ediciones
        if (data.ediciones && Array.isArray(data.ediciones)) {
          this.ediciones.set(data.ediciones);
        }
        
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading actividad:', err);
        this.error.set('Error al cargar la actividad');
        this.loading.set(false);
      }
    });
  }

  loadResponsables(id: number): void {
    // Usar el servicio dedicado que tiene el endpoint específico
    this.responsableService.getByActividad(id).subscribe({
      next: (data) => {
        this.responsables.set(data);
        console.log('✅ Responsables cargados:', data.length);
      },
      error: (err) => {
        console.error('Error loading responsables:', err);
        // Fallback al método del servicio de actividades si el endpoint dedicado falla
        this.actividadesService.getResponsables(id).subscribe({
          next: (data) => this.responsables.set(data),
          error: (fallbackErr) => console.error('Error en fallback de responsables:', fallbackErr)
        });
      }
    });
  }

  // Estos métodos ya no son necesarios ya que los datos vienen en el objeto Actividad
  // Se mantienen como métodos privados por si se necesitan como fallback
  private loadIndicadores(id: number): void {
    this.actividadesService.getIndicadores(id).subscribe({
      next: (data) => {
        this.indicadores.set(data);
        this.loadActividadesAnuales();
      },
      error: (err) => console.error('Error loading indicadores:', err)
    });
  }

  private loadSubactividades(id: number): void {
    this.actividadesService.getSubactividades(id).subscribe({
      next: (data) => this.subactividades.set(data),
      error: (err) => console.error('Error loading subactividades:', err)
    });
  }

  private loadDepartamentos(id: number): void {
    this.actividadesService.getDepartamentos(id).subscribe({
      next: (data) => {
        const items = Array.isArray(data) ? data : (data.data || []);
        this.departamentos.set(items);
      },
      error: (err) => console.error('Error loading departamentos:', err)
    });
  }

  navigateToEdit(): void {
    const id = this.actividad()?.id;
    if (id) {
      this.router.navigate(['/actividades', id, 'editar']);
    }
  }

  onDelete(): void {
    const id = this.actividad()?.id;
    if (id && confirm('¿Está seguro de que desea eliminar esta actividad?')) {
      this.actividadesService.delete(id).subscribe({
        next: () => this.router.navigate(['/actividades']),
        error: (err) => {
          console.error('Error deleting actividad:', err);
          this.error.set('Error al eliminar la actividad');
        }
      });
    }
  }

  navigateToSubactividad(id: number): void {
    this.router.navigate(['/subactividades', id]);
  }

  navigateToIndicador(id: number): void {
    this.router.navigate(['/indicadores', id]);
  }

  loadIndicadoresList(): void {
    this.indicadorService.getAll().subscribe({
      next: (data) => this.indicadoresList.set(data),
      error: (err) => console.error('Error loading indicadores list:', err)
    });
  }

  toggleFormIndicador(): void {
    this.mostrarFormIndicador.set(!this.mostrarFormIndicador());
    if (!this.mostrarFormIndicador()) {
      this.formIndicador.reset();
      this.errorIndicador.set(null);
    }
  }

  onSubmitIndicador(): void {
    if (this.formIndicador.valid) {
      this.loadingIndicador.set(true);
      this.errorIndicador.set(null);

      const formValue = this.formIndicador.value;
      const indicadorData = {
        codigo: formValue.codigo.trim(),
        nombre: formValue.nombre.trim(),
        descripcion: formValue.descripcion?.trim() || undefined,
        anio: formValue.anio ? Number(formValue.anio) : undefined,
        meta: formValue.meta !== null && formValue.meta !== undefined ? Number(formValue.meta) : undefined,
        activo: formValue.activo ?? true
      };

      this.indicadorService.create(indicadorData).subscribe({
        next: (nuevoIndicador) => {
          console.log('✅ Indicador creado:', nuevoIndicador);
          // Recargar la actividad para obtener los datos actualizados
          const actividadId = this.actividad()?.id;
          if (actividadId) {
            this.loadActividad(actividadId);
            this.loadIndicadoresList();
          }
          // Cerrar el formulario
          this.toggleFormIndicador();
          this.loadingIndicador.set(false);
        },
        error: (err) => {
          console.error('❌ Error creando indicador:', err);
          let errorMessage = 'Error al crear el indicador';
          
          if (err.error) {
            if (err.error.errors) {
              const validationErrors = err.error.errors;
              const errorMessages = Object.keys(validationErrors).map(key => {
                const messages = Array.isArray(validationErrors[key]) 
                  ? validationErrors[key].join(', ') 
                  : validationErrors[key];
                return `${key}: ${messages}`;
              });
              errorMessage = `Errores de validación:\n${errorMessages.join('\n')}`;
            } else if (err.error.message) {
              errorMessage = err.error.message;
            } else if (typeof err.error === 'string') {
              errorMessage = err.error;
            }
          } else if (err.message) {
            errorMessage = err.message;
          }
          
          this.errorIndicador.set(errorMessage);
          this.loadingIndicador.set(false);
        }
      });
    } else {
      this.formIndicador.markAllAsTouched();
    }
  }

  loadActividadesAnuales(): void {
    const actividad = this.actividad();
    if (!actividad) {
      this.actividadesAnuales.set([]);
      this.actividadesMensuales.set([]);
      return;
    }

    // Si hay una actividad anual asociada, cargarla
    if (actividad.idActividadAnual) {
      this.actividadAnualService.getById(actividad.idActividadAnual).subscribe({
        next: (actividadAnual) => {
          if (actividadAnual) {
            this.actividadesAnuales.set([actividadAnual]);
            
            // Cargar actividades mensuales relacionadas
            if (actividadAnual.idActividadAnual) {
              this.actividadMensualInstService.getByActividadAnual(actividadAnual.idActividadAnual).subscribe({
                next: (actividadesMensuales) => {
                  this.actividadesMensuales.set(actividadesMensuales || []);
                },
                error: (err) => {
                  console.error('Error loading actividades mensuales:', err);
                  this.actividadesMensuales.set([]);
                }
              });
            } else {
              this.actividadesMensuales.set([]);
            }
          } else {
            this.actividadesAnuales.set([]);
            this.actividadesMensuales.set([]);
          }
        },
        error: (err) => {
          console.error('Error loading actividad anual:', err);
          this.actividadesAnuales.set([]);
          this.actividadesMensuales.set([]);
        }
      });
    } else {
      // Si no hay actividad anual asociada, intentar cargar desde indicadores
      const indicadores = this.indicadores();
      if (indicadores.length === 0) {
        this.actividadesAnuales.set([]);
        this.actividadesMensuales.set([]);
        return;
      }

      // Obtener IDs únicos de indicadores
      const indicadorIds = [...new Set(indicadores.map(ind => ind.idIndicador).filter(id => id !== undefined && id !== null))];
      
      if (indicadorIds.length === 0) {
        this.actividadesAnuales.set([]);
        this.actividadesMensuales.set([]);
        return;
      }

      // Cargar actividades anuales para cada indicador
      const actividadesAnualesPromises = indicadorIds.map(idIndicador => 
        firstValueFrom(this.actividadAnualService.getByIndicador(idIndicador))
      );

      Promise.all(actividadesAnualesPromises).then(results => {
        const todasActividadesAnuales = results.flat().filter(item => item !== null && item !== undefined);
        this.actividadesAnuales.set(todasActividadesAnuales);

        // Cargar actividades mensuales para cada actividad anual
        const actividadesMensualesPromises = todasActividadesAnuales.map(anual => 
          anual.idActividadAnual 
            ? firstValueFrom(this.actividadMensualInstService.getByActividadAnual(anual.idActividadAnual))
            : Promise.resolve([])
        );

        Promise.all(actividadesMensualesPromises).then(mensualesResults => {
          const todasActividadesMensuales = mensualesResults.flat().filter(item => item !== null && item !== undefined);
          this.actividadesMensuales.set(todasActividadesMensuales);
        }).catch(err => {
          console.error('Error loading actividades mensuales:', err);
        });
      }).catch(err => {
        console.error('Error loading actividades anuales:', err);
      });
    }
  }

  setTab(tab: 'info' | 'departamentos' | 'responsables' | 'indicadores' | 'subactividades' | 'actividades-anuales'): void {
    this.activeTab.set(tab);
  }

  getActividadesMensualesPorAnual(idActividadAnual: number): ActividadMensualInst[] {
    return this.actividadesMensuales().filter(m => m.idActividadAnual === idActividadAnual);
  }

  tieneActividadesMensuales(idActividadAnual: number): boolean {
    return this.getActividadesMensualesPorAnual(idActividadAnual).length > 0;
  }
}

