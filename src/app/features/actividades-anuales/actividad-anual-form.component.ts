import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ActividadAnualService } from '../../core/services/actividad-anual.service';
import { IndicadorService } from '../../core/services/indicador.service';
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

  form!: FormGroup;
  indicadores = signal<Indicador[]>([]);
  isEditMode = signal(false);
  actividadAnualId = signal<number | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

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
            this.router.navigate(['/actividades']);
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
            this.router.navigate(['/actividades']);
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
}

