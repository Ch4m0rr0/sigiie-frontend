import { Component, inject, OnInit, signal } from '@angular/core';
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
  seccionEstadoExpandida = signal(true);
  showYearWarning = signal(false);
  yearWarningConfirmed = signal(false);
  
  // Dropdown de indicador
  mostrarDropdownIndicador = signal(false);
  indicadorSeleccionado = signal<Indicador | null>(null);

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
      anio: [null, [Validators.required, Validators.min(2000), Validators.max(2100)]],
      nombre: [''],
      descripcion: [''],
      activo: [true]
    });

    // Escuchar cambios en el campo año para mostrar advertencia
    this.form.get('anio')?.valueChanges.subscribe(() => {
      this.checkYearWarning();
      // Resetear la confirmación cuando cambia el año
      this.yearWarningConfirmed.set(false);
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

  checkYearWarning(): void {
    const anioValue = this.form.get('anio')?.value;
    if (!anioValue) {
      this.showYearWarning.set(false);
      return;
    }

    const year = Number(anioValue);
    if (isNaN(year)) {
      this.showYearWarning.set(false);
      return;
    }

    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;

    // Mostrar advertencia si el año no es el actual ni el siguiente
    this.showYearWarning.set(year !== currentYear && year !== nextYear);
  }

  isYearInRange(): boolean {
    const anioValue = this.form.get('anio')?.value;
    if (!anioValue) return false;

    const year = Number(anioValue);
    if (isNaN(year)) return false;

    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;

    return year === currentYear || year === nextYear;
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
            anio: data.anio || new Date().getFullYear(),
            nombre: data.nombre || '',
            descripcion: data.descripcion || '',
            activo: data.activo ?? true
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
      // Verificar si el año requiere confirmación
      const anioValueForCheck = this.form.get('anio')?.value;
      if (anioValueForCheck && this.showYearWarning() && !this.yearWarningConfirmed()) {
        const year = Number(anioValueForCheck);
        const confirmMessage = `¿Está seguro de que el año "${year}" es correcto para crear esta actividad anual?\n\nNormalmente las actividades anuales se planifican para el año en curso (${new Date().getFullYear()}) o para el año siguiente (${new Date().getFullYear() + 1}).\n\nPor favor, verifique que el año ingresado sea correcto antes de continuar.`;
        
        if (!confirm(confirmMessage)) {
          // El usuario canceló, no hacer nada
          return;
        }
        
        // El usuario confirmó
        this.yearWarningConfirmed.set(true);
      }

      this.loading.set(true);
      this.error.set(null);

      const formValue = this.form.value;
      const currentYear = new Date().getFullYear();

      // Asegurar que anio siempre tenga un valor válido
      let anioValue: number;
      if (formValue.anio === null || formValue.anio === undefined || formValue.anio === '') {
        anioValue = currentYear;
      } else {
        anioValue = Number(formValue.anio);
        // Si la conversión falla o es NaN, usar el año actual
        if (isNaN(anioValue) || anioValue < 2000 || anioValue > 2100) {
          anioValue = currentYear;
        }
      }

      const data: ActividadAnualCreate = {
        idIndicador: Number(formValue.idIndicador), // Asegurar que sea número
        anio: anioValue, // Asegurar que siempre sea un número válido
        nombre: formValue.nombre?.trim() || undefined,
        descripcion: formValue.descripcion?.trim() || undefined,
        activo: formValue.activo ?? true
      };

      console.log('🔄 FormComponent - Datos a enviar:', JSON.stringify(data, null, 2));
      console.log('🔄 FormComponent - anioValue:', anioValue, 'tipo:', typeof anioValue);

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
  get anio() { return this.form.get('anio'); }

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

  getIndicadoresFiltrados(): Indicador[] {
    return this.indicadores();
  }

  getCurrentYear(): number {
    return new Date().getFullYear();
  }

  getNextYear(): number {
    return new Date().getFullYear() + 1;
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

