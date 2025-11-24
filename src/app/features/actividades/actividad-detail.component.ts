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
  indicadoresPadre = signal<Indicador[]>([]);
  ediciones = signal<Edicion[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  activeTab = signal<'info' | 'planificacion' | 'departamentos' | 'responsables' | 'indicadores' | 'subactividades' | 'actividades-anuales' | 'ediciones'>('info');
  
  // Formulario para crear indicador hijo
  formIndicador!: FormGroup;
  mostrarFormIndicador = signal(false);
  loadingIndicador = signal(false);
  errorIndicador = signal<string | null>(null);

  ngOnInit(): void {
    this.initializeFormIndicador();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadActividad(+id);
      this.loadResponsables(+id);
      this.loadIndicadores(+id); // Esto también cargará las actividades anuales
      this.loadSubactividades(+id);
      this.loadDepartamentos(+id);
      this.loadIndicadoresList();
      this.loadIndicadoresPadre();
    }
  }

  initializeFormIndicador(): void {
    this.formIndicador = this.fb.group({
      idIndicadorPadre: [null, Validators.required],
      codigo: ['', [Validators.required, Validators.minLength(1)]],
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: [''],
      activo: [true]
    });
  }

  loadActividad(id: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.actividadesService.get(id).subscribe({
      next: (data) => {
        this.actividad.set(data);
        // Cargar ediciones si vienen incluidas en la respuesta
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

  loadIndicadores(id: number): void {
    this.actividadesService.getIndicadores(id).subscribe({
      next: (data) => {
        this.indicadores.set(data);
        // Cargar actividades anuales después de cargar los indicadores
        this.loadActividadesAnuales();
      },
      error: (err) => console.error('Error loading indicadores:', err)
    });
  }

  loadSubactividades(id: number): void {
    this.actividadesService.getSubactividades(id).subscribe({
      next: (data) => this.subactividades.set(data),
      error: (err) => console.error('Error loading subactividades:', err)
    });
  }

  loadDepartamentos(id: number): void {
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

  loadIndicadoresPadre(): void {
    this.indicadorService.getPadres().subscribe({
      next: (data) => this.indicadoresPadre.set(data),
      error: (err) => console.error('Error loading indicadores padre:', err)
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
        idIndicadorPadre: Number(formValue.idIndicadorPadre),
        codigo: formValue.codigo.trim(),
        nombre: formValue.nombre.trim(),
        descripcion: formValue.descripcion?.trim() || undefined,
        activo: formValue.activo ?? true
      };

      this.indicadorService.create(indicadorData).subscribe({
        next: (nuevoIndicador) => {
          console.log('✅ Indicador hijo creado:', nuevoIndicador);
          // Recargar la lista de indicadores
          const actividadId = this.actividad()?.id;
          if (actividadId) {
            this.loadIndicadores(actividadId);
            this.loadIndicadoresPadre();
            this.loadIndicadoresList();
          }
          // Cerrar el formulario
          this.toggleFormIndicador();
          this.loadingIndicador.set(false);
        },
        error: (err) => {
          console.error('❌ Error creando indicador hijo:', err);
          let errorMessage = 'Error al crear el indicador hijo';
          
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
    // Cargar actividades anuales basadas en los indicadores asociados a esta actividad
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

  setTab(tab: 'info' | 'planificacion' | 'departamentos' | 'responsables' | 'indicadores' | 'subactividades' | 'actividades-anuales' | 'ediciones'): void {
    this.activeTab.set(tab);
  }

  getActividadesMensualesPorAnual(idActividadAnual: number): ActividadMensualInst[] {
    return this.actividadesMensuales().filter(m => m.idActividadAnual === idActividadAnual);
  }

  tieneActividadesMensuales(idActividadAnual: number): boolean {
    return this.getActividadesMensualesPorAnual(idActividadAnual).length > 0;
  }
}

