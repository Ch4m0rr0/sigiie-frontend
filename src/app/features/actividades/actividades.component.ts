import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ActividadesService } from '../../core/services/actividades.service';
import { PlanificacionService } from '../../core/services/planificacion.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import { IndicadorService } from '../../core/services/indicador.service';
import type { Actividad } from '../../core/models/actividad';
import type { Planificacion } from '../../core/models/planificacion';
import type { NivelActividad } from '../../core/models/catalogos-nuevos';
import type { Indicador } from '../../core/models/indicador';
import { IconComponent } from '../../shared/icon/icon.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';

@Component({
  standalone: true,
  selector: 'app-list-actividades',
  imports: [CommonModule, RouterModule, ReactiveFormsModule, IconComponent, ...BrnButtonImports],
  templateUrl: './actividades.component.html',
})
export class ListActividadesComponent implements OnInit {
  private actividadesService = inject(ActividadesService);
  private planificacionService = inject(PlanificacionService);
  private catalogosService = inject(CatalogosService);
  private indicadorService = inject(IndicadorService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  actividades = signal<Actividad[]>([]);
  planificaciones = signal<Planificacion[]>([]);
  nivelesActividad = signal<NivelActividad[]>([]);
  indicadoresPadre = signal<Indicador[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // Filtros
  filtroPlanificacion = signal<number | null>(null);
  filtroNivel = signal<number | null>(null);
  filtroActivo = signal<boolean | null>(null);

  // Formulario para crear indicador hijo
  formIndicador!: FormGroup;
  mostrarFormIndicador = signal(false);
  loadingIndicador = signal(false);
  errorIndicador = signal<string | null>(null);

  // Formulario para crear indicador padre
  formIndicadorPadre!: FormGroup;
  mostrarFormIndicadorPadre = signal(false);
  loadingIndicadorPadre = signal(false);
  errorIndicadorPadre = signal<string | null>(null);

  ngOnInit(): void {
    this.initializeFormIndicador();
    this.initializeFormIndicadorPadre();
    this.loadPlanificaciones();
    this.loadNivelesActividad();
    this.loadActividades();
    this.loadIndicadoresPadre();
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

  initializeFormIndicadorPadre(): void {
    this.formIndicadorPadre = this.fb.group({
      codigo: ['', [Validators.required, Validators.minLength(1)]],
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: [''],
      activo: [true]
    });
  }

  loadPlanificaciones(): void {
    this.planificacionService.getAll().subscribe({
      next: (data) => this.planificaciones.set(data),
      error: (err) => console.error('Error loading planificaciones:', err)
    });
  }

  loadNivelesActividad(): void {
    this.catalogosService.getNivelesActividad().subscribe({
      next: (data) => this.nivelesActividad.set(data),
      error: (err) => console.error('Error loading niveles actividad:', err)
    });
  }

  loadActividades(): void {
    this.loading.set(true);
    this.error.set(null);

    // Usar GetAllAsync() - sin filtros del backend, filtramos en el cliente
    this.actividadesService.getAll().subscribe({
      next: (data) => {
        // Aplicar filtros del lado del cliente
        let filtered = data;
        
        if (this.filtroPlanificacion()) {
          filtered = filtered.filter(a => a.idPlanificacion === this.filtroPlanificacion()!);
        }
        
        if (this.filtroNivel()) {
          filtered = filtered.filter(a => a.idNivel === this.filtroNivel()!);
        }
        
        if (this.filtroActivo() !== null) {
          filtered = filtered.filter(a => a.activo === this.filtroActivo()!);
        }
        
        console.log('✅ Actividades cargadas:', filtered.length);
        this.actividades.set(filtered);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('❌ Error loading actividades:', err);
        
        let errorMessage = 'Error al cargar las actividades.';
        
        if (err.status === 500) {
          errorMessage = 'Error interno del servidor. Por favor, contacta al administrador o intenta más tarde.';
        } else if (err.status === 401) {
          errorMessage = 'No estás autenticado. Por favor, inicia sesión nuevamente.';
        } else if (err.status === 403) {
          errorMessage = 'No tienes permisos para ver las actividades.';
        } else if (err.status === 404) {
          errorMessage = 'El servicio de actividades no está disponible.';
        } else if (err.status === 0) {
          errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
        } else if (err.error?.message) {
          errorMessage = `Error: ${err.error.message}`;
        }
        
        this.error.set(errorMessage);
        this.loading.set(false);
      }
    });
  }

  navigateToDetail(id: number): void {
    this.router.navigate(['/actividades', id]);
  }

  navigateToCreate(): void {
    this.router.navigate(['/actividades/nueva']);
  }

  onFiltroChange(): void {
    this.loadActividades();
  }

  clearFilters(): void {
    this.filtroPlanificacion.set(null);
    this.filtroNivel.set(null);
    this.filtroActivo.set(null);
    this.loadActividades();
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
    // Cerrar el otro formulario si está abierto
    if (this.mostrarFormIndicadorPadre()) {
      this.toggleFormIndicadorPadre();
    }
  }

  toggleFormIndicadorPadre(): void {
    this.mostrarFormIndicadorPadre.set(!this.mostrarFormIndicadorPadre());
    if (!this.mostrarFormIndicadorPadre()) {
      this.formIndicadorPadre.reset();
      this.errorIndicadorPadre.set(null);
    }
    // Cerrar el otro formulario si está abierto
    if (this.mostrarFormIndicador()) {
      this.toggleFormIndicador();
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
          // Recargar la lista de indicadores padres
          this.loadIndicadoresPadre();
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

  onSubmitIndicadorPadre(): void {
    if (this.formIndicadorPadre.valid) {
      this.loadingIndicadorPadre.set(true);
      this.errorIndicadorPadre.set(null);

      const formValue = this.formIndicadorPadre.value;
      const indicadorData = {
        codigo: formValue.codigo.trim(),
        nombre: formValue.nombre.trim(),
        descripcion: formValue.descripcion?.trim() || undefined,
        activo: formValue.activo ?? true
        // No incluir idIndicadorPadre para crear un indicador padre
      };

      this.indicadorService.create(indicadorData).subscribe({
        next: (nuevoIndicador) => {
          console.log('✅ Indicador padre creado:', nuevoIndicador);
          // Recargar la lista de indicadores padres
          this.loadIndicadoresPadre();
          // Cerrar el formulario
          this.toggleFormIndicadorPadre();
          this.loadingIndicadorPadre.set(false);
        },
        error: (err) => {
          console.error('❌ Error creando indicador padre:', err);
          let errorMessage = 'Error al crear el indicador padre';
          
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
          
          this.errorIndicadorPadre.set(errorMessage);
          this.loadingIndicadorPadre.set(false);
        }
      });
    } else {
      this.formIndicadorPadre.markAllAsTouched();
    }
  }
}
