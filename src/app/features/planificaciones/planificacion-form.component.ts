import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PlanificacionService } from '../../core/services/planificacion.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import type { PlanificacionCreate, PlanificacionUpdate } from '../../core/models/planificacion';
import type { TipoPlanificacion } from '../../core/models/catalogos-nuevos';
import { IconComponent } from '../../shared/icon/icon.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';
import { BrnLabelImports } from '@spartan-ng/brain/label';

@Component({
  standalone: true,
  selector: 'app-planificacion-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    IconComponent,
    ...BrnButtonImports,
    ...BrnLabelImports
  ],
  templateUrl: './planificacion-form.component.html',
})
export class PlanificacionFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private planificacionService = inject(PlanificacionService);
  private catalogosService = inject(CatalogosService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  form!: FormGroup;
  tiposPlanificacion = signal<TipoPlanificacion[]>([]);
  isEditMode = signal(false);
  planificacionId = signal<number | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.initializeForm();
    this.loadTiposPlanificacion();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.planificacionId.set(+id);
      this.loadPlanificacion(+id);
    }
  }

  initializeForm(): void {
    const currentYear = new Date().getFullYear();
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: [''],
      idTipoPlanificacion: ['', Validators.required],
      periodoInicio: [''],
      periodoFin: [''],
      anio: [currentYear, [Validators.required, Validators.min(2020)]],
      activo: [true]
    });
  }

  loadTiposPlanificacion(): void {
    this.catalogosService.getTiposPlanificacion().subscribe({
      next: (data) => this.tiposPlanificacion.set(data),
      error: (err) => console.error('Error loading tipos planificacion:', err)
    });
  }

  loadPlanificacion(id: number): void {
    this.loading.set(true);
    this.planificacionService.getById(id).subscribe({
      next: (data) => {
        if (data) {
          this.form.patchValue({
            nombre: data.nombre,
            descripcion: data.descripcion || '',
            idTipoPlanificacion: data.idTipoPlanificacion,
            periodoInicio: data.periodoInicio || '',
            periodoFin: data.periodoFin || '',
            anio: data.anio,
            activo: data.activo
          });
        } else {
          this.error.set('Planificación no encontrada');
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading planificacion:', err);
        this.error.set('Error al cargar la planificación');
        this.loading.set(false);
      }
    });
  }

  onSubmit(): void {
    if (this.form.valid) {
      this.loading.set(true);
      this.error.set(null);

      // Al crear una nueva planificación, siempre debe ser activa
      // Al editar, usar el valor del formulario
      const activoValue = this.isEditMode() 
        ? (this.form.value.activo === true || this.form.value.activo === 'true' || this.form.value.activo === 1 || this.form.value.activo === '1')
        : true; // Siempre true para nuevas planificaciones
      
      const data: PlanificacionCreate = {
        nombre: this.form.value.nombre,
        descripcion: this.form.value.descripcion || undefined,
        idTipoPlanificacion: +this.form.value.idTipoPlanificacion, // Asegurar que sea número
        periodoInicio: this.form.value.periodoInicio || undefined,
        periodoFin: this.form.value.periodoFin || undefined,
        anio: +this.form.value.anio, // Asegurar que sea número
        activo: activoValue
      };
      
      console.log('🔍 FormComponent - Datos del formulario antes de enviar:', this.form.value);
      console.log('🔍 FormComponent - Valor activo del formulario:', activoValue, 'Tipo:', typeof activoValue);
      console.log('🔍 FormComponent - Valor activo procesado:', activoValue);
      console.log('🔍 FormComponent - Datos procesados para crear:', data);

      if (this.isEditMode()) {
        const updateData: PlanificacionUpdate = {
          nombre: data.nombre,
          descripcion: data.descripcion,
          idTipoPlanificacion: data.idTipoPlanificacion,
          periodoInicio: data.periodoInicio || '',
          periodoFin: data.periodoFin || '',
          anio: data.anio,
          activo: activoValue // Usar el valor procesado
        };
        this.planificacionService.update(this.planificacionId()!, updateData).subscribe({
          next: (success) => {
            if (success) {
              this.router.navigate(['/planificaciones']);
            } else {
              this.error.set('Error al actualizar la planificación');
              this.loading.set(false);
            }
          },
          error: (err: any) => {
            console.error('Error saving planificacion:', err);
            this.error.set('Error al guardar la planificación');
            this.loading.set(false);
          }
        });
      } else {
        console.log('🔄 FormComponent - Creando planificación con datos:', data);
        this.planificacionService.create(data).subscribe({
          next: (result) => {
            console.log('✅ FormComponent - Planificación creada exitosamente:', result);
            this.router.navigate(['/planificaciones']);
          },
          error: (err: any) => {
            console.error('❌ FormComponent - Error saving planificacion:', err);
            console.error('❌ Error status:', err.status);
            console.error('❌ Error message:', err.message);
            console.error('❌ Error details:', err.error);
            
            let errorMessage = 'Error al guardar la planificación';
            if (err.error?.errors) {
              const validationErrors = Object.values(err.error.errors).flat();
              errorMessage = validationErrors.join(', ');
            } else if (err.error?.title) {
              errorMessage = err.error.title;
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

  get nombre() { return this.form.get('nombre'); }
  get idTipoPlanificacion() { return this.form.get('idTipoPlanificacion'); }
  get anio() { return this.form.get('anio'); }
}

