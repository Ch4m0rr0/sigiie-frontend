import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProyectosService } from '../../core/services/proyectos.service';
import type { ProyectoCreate } from '../../core/models/proyecto';
import { IconComponent } from '../../shared/icon/icon.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';
import { BrnLabelImports } from '@spartan-ng/brain/label';

@Component({
  standalone: true,
  selector: 'app-proyecto-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    IconComponent,
    ...BrnButtonImports,
    ...BrnLabelImports
  ],
  templateUrl: './proyecto-form.component.html',
})
export class ProyectoFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private proyectosService = inject(ProyectosService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  form!: FormGroup;
  isEditMode = signal(false);
  proyectoId = signal<number | null>(null);
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  ngOnInit(): void {
    this.initializeForm();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.proyectoId.set(+id);
      this.loadProyecto(+id);
    }
  }

  initializeForm(): void {
    this.form = this.fb.group({
      nombreProyecto: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: [''],
      fechaInicio: [''],
      fechaFin: [''],
      departamentoId: [null],
      idEstadoProyecto: [null],
      idEdicion: [null],
      idTipoIniciativa: [null],
      idTipoInvestigacion: [null],
      idAreaConocimiento: [null],
      idTipoDocumento: [null],
      tipoAutor: [''],
      archivoSoporte: [null]
    });
  }

  loadProyecto(id: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.proyectosService.getById(id).subscribe({
      next: (proyecto) => {
        if (proyecto) {
          this.form.patchValue({
            nombreProyecto: proyecto.nombreProyecto || proyecto.nombre,
            descripcion: proyecto.descripcion || '',
            fechaInicio: proyecto.fechaInicio ? proyecto.fechaInicio.split('T')[0] : '',
            fechaFin: proyecto.fechaFin ? proyecto.fechaFin.split('T')[0] : '',
            departamentoId: proyecto.departamentoId || null,
            idEstadoProyecto: proyecto.idEstadoProyecto || null,
            idEdicion: proyecto.idEdicion || null,
            idTipoIniciativa: proyecto.idTipoIniciativa || null,
            idTipoInvestigacion: proyecto.idTipoInvestigacion || null,
            idAreaConocimiento: proyecto.idAreaConocimiento || null,
            idTipoDocumento: proyecto.idTipoDocumento || null,
            tipoAutor: proyecto.tipoAutor || ''
          });
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading proyecto:', err);
        this.error.set('Error al cargar el proyecto. Por favor, intenta nuevamente.');
        this.loading.set(false);
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.success.set(null);

    const formValue = this.form.getRawValue();
    const proyectoData: ProyectoCreate = {
      nombreProyecto: formValue.nombreProyecto,
      descripcion: formValue.descripcion || undefined,
      fechaInicio: formValue.fechaInicio || undefined,
      fechaFin: formValue.fechaFin || undefined,
      departamentoId: formValue.departamentoId || undefined,
      idEstadoProyecto: formValue.idEstadoProyecto || undefined,
      idEdicion: formValue.idEdicion || undefined,
      idTipoIniciativa: formValue.idTipoIniciativa || undefined,
      idTipoInvestigacion: formValue.idTipoInvestigacion || undefined,
      idAreaConocimiento: formValue.idAreaConocimiento || undefined,
      idTipoDocumento: formValue.idTipoDocumento || undefined,
      tipoAutor: formValue.tipoAutor || undefined,
      archivoSoporte: formValue.archivoSoporte || undefined
    };

    if (this.isEditMode()) {
      const id = this.proyectoId();
      if (id) {
        this.proyectosService.update(id, proyectoData).subscribe({
          next: (proyecto) => {
            if (proyecto) {
              this.success.set('Proyecto actualizado exitosamente');
              setTimeout(() => {
                this.router.navigate(['/proyectos']);
              }, 1500);
            } else {
              this.error.set('Error al actualizar el proyecto');
              this.saving.set(false);
            }
          },
          error: (err) => {
            console.error('Error updating proyecto:', err);
            this.error.set('Error al actualizar el proyecto. Por favor, intenta nuevamente.');
            this.saving.set(false);
          }
        });
      }
    } else {
      this.proyectosService.create(proyectoData).subscribe({
        next: (proyecto) => {
          this.success.set('Proyecto creado exitosamente');
          setTimeout(() => {
            this.router.navigate(['/proyectos']);
          }, 1500);
        },
        error: (err) => {
          console.error('Error creating proyecto:', err);
          this.error.set('Error al crear el proyecto. Por favor, intenta nuevamente.');
          this.saving.set(false);
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/proyectos']);
  }

  getFieldError(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (field?.hasError('required')) {
      return 'Este campo es requerido';
    }
    if (field?.hasError('minlength')) {
      return `Mínimo ${field.errors?.['minlength'].requiredLength} caracteres`;
    }
    if (field?.hasError('min')) {
      return 'El valor debe ser mayor o igual a 0';
    }
    return '';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.form.patchValue({ archivoSoporte: input.files[0] });
    }
  }
}

