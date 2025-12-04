import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ActividadAnualService } from '../../core/services/actividad-anual.service';
import { IndicadorService } from '../../core/services/indicador.service';
import { AlertService } from '../../core/services/alert.service';
import type { ActividadAnualCreate } from '../../core/models/actividad-anual';
import type { Indicador } from '../../core/models/indicador';
import { IconComponent } from '../../shared/icon/icon.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';
import { BrnLabelImports } from '@spartan-ng/brain/label';

@Component({
  standalone: true,
  selector: 'app-actividad-anual-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    IconComponent,
    ...BrnButtonImports,
    ...BrnLabelImports
  ],
  templateUrl: './actividad-anual-form.component.html',
})
export class ActividadAnualFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private actividadAnualService = inject(ActividadAnualService);
  private indicadorService = inject(IndicadorService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private alertService = inject(AlertService);

  form!: FormGroup;
  indicadores = signal<Indicador[]>([]);
  isEditMode = signal(false);
  actividadAnualId = signal<number | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  seccionInformacionExpandida = signal(true);
  
  // Dropdown de indicador
  mostrarDropdownIndicador = signal(false);
  indicadorSeleccionado = signal<Indicador | null>(null);
  terminoBusquedaIndicador = signal<string>('');

  ngOnInit(): void {
    this.initializeForm();
    
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.actividadAnualId.set(+id);
      this.loadActividadAnual(+id);
    } else {
      // Si es creación nueva, verificar si viene un indicador desde query params
      const idIndicador = this.route.snapshot.queryParams['idIndicador'];
      if (idIndicador) {
        // Cargar indicadores y luego preseleccionar
        this.loadIndicadoresWithPreselect(+idIndicador);
      } else {
        this.loadIndicadores();
      }
    }
  }

  initializeForm(): void {
    this.form = this.fb.group({
      idIndicador: [null, Validators.required],
      nombre: ['', Validators.required],
      descripcion: ['']
      // activo se establece automáticamente como true al crear
    });

    // Escuchar cambios en el indicador para actualizar el signal
    this.form.get('idIndicador')?.valueChanges.subscribe((idIndicador) => {
      if (idIndicador) {
        const indicador = this.indicadores().find(ind => ind.idIndicador === idIndicador);
        this.indicadorSeleccionado.set(indicador || null);
      } else {
        this.indicadorSeleccionado.set(null);
      }
    });
  }


  loadIndicadores(): void {
    this.indicadorService.getAll().subscribe({
      next: (data) => {
        this.indicadores.set(data);
      },
      error: (err) => {
        console.error('Error loading indicadores:', err);
        this.error.set('Error al cargar los indicadores');
      }
    });
  }

  loadIndicadoresWithPreselect(idIndicador: number): void {
    this.indicadorService.getAll().subscribe({
      next: (data) => {
        this.indicadores.set(data);
        // Preseleccionar el indicador después de cargar
        const indicador = data.find((ind: Indicador) => ind.idIndicador === idIndicador);
        if (indicador) {
          this.form.patchValue({ idIndicador: idIndicador });
          this.indicadorSeleccionado.set(indicador);
        }
      },
      error: (err) => {
        console.error('Error loading indicadores:', err);
        this.error.set('Error al cargar los indicadores');
      }
    });
  }

  loadActividadAnual(id: number): void {
    this.loading.set(true);
    this.actividadAnualService.getById(id).subscribe({
      next: (data) => {
        if (data) {
          this.form.patchValue({
            idIndicador: data.idIndicador || null,
            nombre: data.nombre || '',
            descripcion: data.descripcion || ''
          });
          
          // Actualizar el indicador seleccionado
          if (data.idIndicador) {
            this.loadIndicadores();
            setTimeout(() => {
              const indicador = this.indicadores().find(ind => ind.idIndicador === data.idIndicador);
              if (indicador) {
                this.indicadorSeleccionado.set(indicador);
              }
            }, 100);
          }
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading actividad anual:', err);
        this.error.set('Error al cargar la actividad anual');
        this.loading.set(false);
      }
    });
  }

  onSubmit(): void {
    if (this.form.valid) {
      this.loading.set(true);
      this.error.set(null);

      const formValue = this.form.value;
      const currentYear = new Date().getFullYear();

      const data: ActividadAnualCreate = {
        idIndicador: Number(formValue.idIndicador), // Asegurar que sea número
        anio: currentYear, // El año se establece automáticamente como el año actual
        nombre: formValue.nombre?.trim() || undefined,
        descripcion: formValue.descripcion?.trim() || undefined
        // activo se establece automáticamente como true en el backend
      };

      console.log('🔄 FormComponent - Datos a enviar:', JSON.stringify(data, null, 2));

      if (this.isEditMode()) {
        this.actividadAnualService.update(this.actividadAnualId()!, data).subscribe({
          next: () => {
            this.mostrarAlertaExito();
          },
          error: (err: any) => {
            console.error('Error saving actividad anual:', err);
            let errorMessage = 'Error al guardar la actividad anual';
            
            if (err.error) {
              // Intentar extraer mensajes de validación del backend
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
            
            this.error.set(errorMessage);
            this.loading.set(false);
          }
        });
      } else {
        this.actividadAnualService.create(data).subscribe({
          next: () => {
            this.mostrarAlertaExito();
          },
          error: (err: any) => {
            console.error('Error saving actividad anual:', err);
            let errorMessage = 'Error al crear la actividad anual';
            
            if (err.error) {
              // Intentar extraer mensajes de validación del backend
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
                // Mostrar el mensaje completo del backend
                errorMessage = err.error.message;
                console.log('📋 Mensaje completo del backend:', err.error.message);
              } else if (typeof err.error === 'string') {
                errorMessage = err.error;
              }
            } else if (err.message) {
              errorMessage = err.message;
            }
            
            this.error.set(errorMessage);
            this.loading.set(false);
          }
        });
      }
    } else {
      this.form.markAllAsTouched();
    }
  }

  get idIndicador() { return this.form.get('idIndicador'); }

  // Métodos para el dropdown de indicador
  mostrarDropdownIndicadorFunc(): void {
    this.mostrarDropdownIndicador.set(!this.mostrarDropdownIndicador());
  }

  toggleIndicador(idIndicador: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.checked) {
      this.form.patchValue({ idIndicador: idIndicador });
      const indicador = this.indicadores().find(ind => ind.idIndicador === idIndicador);
      this.indicadorSeleccionado.set(indicador || null);
      this.mostrarDropdownIndicador.set(false);
    }
  }

  isIndicadorSelected(idIndicador: number): boolean {
    return this.form.get('idIndicador')?.value === idIndicador;
  }

  tieneIndicadorSeleccionado(): boolean {
    return !!this.indicadorSeleccionado();
  }

  eliminarIndicador(): void {
    this.form.patchValue({ idIndicador: null });
    this.indicadorSeleccionado.set(null);
  }

  // Indicadores filtrados por búsqueda
  indicadoresFiltrados = computed(() => {
    const termino = this.terminoBusquedaIndicador().toLowerCase().trim();
    if (!termino) {
      return this.indicadores();
    }
    return this.indicadores().filter(indicador => {
      const nombre = (indicador.nombre || '').toLowerCase();
      const codigo = (indicador.codigo || '').toLowerCase();
      return nombre.includes(termino) || codigo.includes(termino);
    });
  });

  getIndicadoresFiltrados(): Indicador[] {
    return this.indicadoresFiltrados();
  }


  private mostrarAlertaExito(): void {
    const nombreActividad = this.form.get('nombre')?.value || 'la actividad anual';
    
    if (this.isEditMode()) {
      // Mensaje para actividad anual actualizada
      this.alertService.success(
        '¡Actividad anual actualizada!',
        `La actividad anual "${nombreActividad}" ha sido actualizada correctamente.`
      ).then(() => {
        this.router.navigate(['/actividades']);
      });
    } else {
      // Mensaje para actividad anual creada
      this.alertService.success(
        '¡Actividad anual creada exitosamente!',
        `La actividad anual "${nombreActividad}" ha sido creada correctamente.`
      ).then(() => {
        this.router.navigate(['/actividades']);
      });
    }
  }
}

