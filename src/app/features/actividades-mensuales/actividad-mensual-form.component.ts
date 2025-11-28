import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ActividadMensualInstService } from '../../core/services/actividad-mensual-inst.service';
import { ActividadAnualService } from '../../core/services/actividad-anual.service';
import type { ActividadMensualInstCreate } from '../../core/models/actividad-mensual-inst';
import type { ActividadAnual } from '../../core/models/actividad-anual';
import { IconComponent } from '../../shared/icon/icon.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';
import { BrnLabelImports } from '@spartan-ng/brain/label';

@Component({
  standalone: true,
  selector: 'app-actividad-mensual-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    IconComponent,
    ...BrnButtonImports,
    ...BrnLabelImports
  ],
  templateUrl: './actividad-mensual-form.component.html',
})
export class ActividadMensualFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private actividadMensualInstService = inject(ActividadMensualInstService);
  private actividadAnualService = inject(ActividadAnualService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  form!: FormGroup;
  actividadesAnuales = signal<ActividadAnual[]>([]);
  isEditMode = signal(false);
  actividadMensualId = signal<number | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  readonly meses = [
    { value: 1, nombre: 'Enero' },
    { value: 2, nombre: 'Febrero' },
    { value: 3, nombre: 'Marzo' },
    { value: 4, nombre: 'Abril' },
    { value: 5, nombre: 'Mayo' },
    { value: 6, nombre: 'Junio' },
    { value: 7, nombre: 'Julio' },
    { value: 8, nombre: 'Agosto' },
    { value: 9, nombre: 'Septiembre' },
    { value: 10, nombre: 'Octubre' },
    { value: 11, nombre: 'Noviembre' },
    { value: 12, nombre: 'Diciembre' }
  ];

  ngOnInit(): void {
    this.initializeForm();
    
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.actividadMensualId.set(+id);
      this.loadActividadMensual(+id);
    }

    // Leer idIndicador de query params (si viene desde el dropdown de actividades)
    const idIndicador = this.route.snapshot.queryParams['idIndicador'];
    this.loadActividadesAnuales(idIndicador ? +idIndicador : undefined);
  }

  initializeForm(): void {
    this.form = this.fb.group({
      idActividadAnual: [null, Validators.required],
      mes: [null, Validators.required],
      nombre: [''],
      descripcion: [''],
      activo: [true]
    });
  }

  loadActividadesAnuales(idIndicador?: number): void {
    const filters = idIndicador ? { idIndicador } : undefined;
    this.actividadAnualService.getAll(filters).subscribe({
      next: (data) => {
        this.actividadesAnuales.set(data);
      },
      error: (err) => {
        console.error('Error loading actividades anuales:', err);
        this.error.set('Error al cargar las actividades anuales');
      }
    });
  }

  loadActividadMensual(id: number): void {
    this.loading.set(true);
    this.actividadMensualInstService.getById(id).subscribe({
      next: (data) => {
        if (data) {
          this.form.patchValue({
            idActividadAnual: data.idActividadAnual || null,
            mes: data.mes || null,
            nombre: data.nombre || '',
            descripcion: data.descripcion || '',
            activo: data.activo ?? true
          });
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading actividad mensual:', err);
        this.error.set('Error al cargar la actividad mensual institucional');
        this.loading.set(false);
      }
    });
  }

  onSubmit(): void {
    if (this.form.valid) {
      this.loading.set(true);
      this.error.set(null);

      const formValue = this.form.value;

      // Validar y convertir valores numéricos
      // Los valores del select pueden venir como string, null o número
      let idActividadAnual: number;
      let mes: number;

      // Convertir idActividadAnual
      if (formValue.idActividadAnual === null || formValue.idActividadAnual === undefined || formValue.idActividadAnual === '') {
        this.error.set('La actividad anual es requerida');
        this.loading.set(false);
        return;
      }
      idActividadAnual = Number(formValue.idActividadAnual);
      if (isNaN(idActividadAnual) || idActividadAnual <= 0) {
        this.error.set('La actividad anual seleccionada no es válida');
        this.loading.set(false);
        return;
      }

      // Convertir mes
      if (formValue.mes === null || formValue.mes === undefined || formValue.mes === '') {
        this.error.set('El mes es requerido');
        this.loading.set(false);
        return;
      }
      mes = Number(formValue.mes);
      if (isNaN(mes) || mes < 1 || mes > 12) {
        this.error.set('El mes debe estar entre 1 y 12');
        this.loading.set(false);
        return;
      }

      const data: ActividadMensualInstCreate = {
        idActividadAnual: idActividadAnual,
        mes: mes,
        nombre: formValue.nombre?.trim() || undefined,
        descripcion: formValue.descripcion?.trim() || undefined,
        activo: formValue.activo ?? true
      };

      console.log('🔄 FormComponent - Datos a enviar:', JSON.stringify(data, null, 2));

      if (this.isEditMode()) {
        this.actividadMensualInstService.update(this.actividadMensualId()!, data).subscribe({
          next: () => {
            this.router.navigate(['/actividades']);
          },
          error: (err: any) => {
            console.error('Error saving actividad mensual:', err);
            this.error.set('Error al guardar la actividad mensual institucional');
            this.loading.set(false);
          }
        });
      } else {
        this.actividadMensualInstService.create(data).subscribe({
          next: () => {
            this.router.navigate(['/actividades']);
          },
          error: (err: any) => {
            console.error('Error saving actividad mensual:', err);
            let errorMessage = 'Error al crear la actividad mensual institucional';
            
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
      }
    } else {
      this.form.markAllAsTouched();
    }
  }

  get idActividadAnual() { return this.form.get('idActividadAnual'); }
  get mes() { return this.form.get('mes'); }
}

