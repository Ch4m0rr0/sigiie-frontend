import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SubactividadService } from '../../core/services/subactividad.service';
import { ActividadesService } from '../../core/services/actividades.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import type { SubactividadCreate } from '../../core/models/subactividad';
import type { Actividad } from '../../core/models/actividad';
import type { TipoSubactividad } from '../../core/models/catalogos-nuevos';
import type { Departamento } from '../../core/models/departamento';
import { BrnButtonImports } from '@spartan-ng/brain/button';
import { BrnLabelImports } from '@spartan-ng/brain/label';

@Component({
  standalone: true,
  selector: 'app-subactividad-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    ...BrnButtonImports,
    ...BrnLabelImports
  ],
  templateUrl: './subactividad-form.component.html',
})
export class SubactividadFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private subactividadService = inject(SubactividadService);
  private actividadesService = inject(ActividadesService);
  private catalogosService = inject(CatalogosService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  form!: FormGroup;
  actividades = signal<Actividad[]>([]);
  tiposSubactividad = signal<TipoSubactividad[]>([]);
  departamentos = signal<Departamento[]>([]);
  isEditMode = signal(false);
  subactividadId = signal<number | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.initializeForm();
    this.loadActividades();
    this.loadTiposSubactividad();
    this.loadDepartamentos();

    const id = this.route.snapshot.paramMap.get('id');
    const actividadId = this.route.snapshot.queryParamMap.get('actividadId');
    
    if (id) {
      this.isEditMode.set(true);
      this.subactividadId.set(+id);
      this.loadSubactividad(+id);
    } else if (actividadId) {
      // Pre-seleccionar actividad si viene de una actividad específica
      this.form.patchValue({ idActividad: +actividadId });
    }
  }

  initializeForm(): void {
    this.form = this.fb.group({
      idActividad: ['', Validators.required],
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: [''],
      idTipoSubactividad: [null],
      fechaInicio: [''],
      fechaFin: [''],
      departamentoResponsableId: [null],
      ubicacion: [''],
      modalidad: [''],
      organizador: [''],
      activo: [true]
    });
  }

  loadActividades(): void {
    this.actividadesService.list().subscribe({
      next: (data) => this.actividades.set(data),
      error: (err) => console.error('Error loading actividades:', err)
    });
  }

  loadTiposSubactividad(): void {
    this.catalogosService.getTiposSubactividad().subscribe({
      next: (data) => this.tiposSubactividad.set(data),
      error: (err) => console.error('Error loading tipos subactividad:', err)
    });
  }

  loadDepartamentos(): void {
    this.catalogosService.getDepartamentos().subscribe({
      next: (data) => this.departamentos.set(data),
      error: (err) => console.error('Error loading departamentos:', err)
    });
  }

  loadSubactividad(id: number): void {
    this.loading.set(true);
    this.subactividadService.getById(id).subscribe({
      next: (data) => {
        this.form.patchValue({
          idActividad: data.idActividad,
          nombre: data.nombre,
          descripcion: data.descripcion || '',
          idTipoSubactividad: data.idTipoSubactividad || null,
          fechaInicio: data.fechaInicio ? data.fechaInicio.split('T')[0] : '',
          fechaFin: data.fechaFin ? data.fechaFin.split('T')[0] : '',
          departamentoResponsableId: data.departamentoResponsableId || null,
          ubicacion: data.ubicacion || '',
          modalidad: data.modalidad || '',
          organizador: data.organizador || '',
          activo: data.activo
        });
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading subactividad:', err);
        this.error.set('Error al cargar la subactividad');
        this.loading.set(false);
      }
    });
  }

  onSubmit(): void {
    if (this.form.valid) {
      this.loading.set(true);
      this.error.set(null);

      const data: SubactividadCreate = {
        idActividad: this.form.value.idActividad,
        nombre: this.form.value.nombre,
        descripcion: this.form.value.descripcion || undefined,
        idTipoSubactividad: this.form.value.idTipoSubactividad || undefined,
        fechaInicio: this.form.value.fechaInicio || undefined,
        fechaFin: this.form.value.fechaFin || undefined,
        departamentoResponsableId: this.form.value.departamentoResponsableId || undefined,
        ubicacion: this.form.value.ubicacion || undefined,
        modalidad: this.form.value.modalidad || undefined,
        organizador: this.form.value.organizador || undefined,
        activo: this.form.value.activo ?? true
      };

      if (this.isEditMode()) {
        this.subactividadService.update(this.subactividadId()!, data).subscribe({
          next: () => {
            this.router.navigate(['/subactividades']);
          },
          error: (err: any) => {
            console.error('Error saving subactividad:', err);
            this.error.set('Error al guardar la subactividad');
            this.loading.set(false);
          }
        });
      } else {
        this.subactividadService.create(data).subscribe({
          next: () => {
            this.router.navigate(['/subactividades']);
          },
          error: (err: any) => {
            console.error('Error saving subactividad:', err);
            this.error.set('Error al guardar la subactividad');
            this.loading.set(false);
          }
        });
      }
    } else {
      this.form.markAllAsTouched();
    }
  }

  get idActividad() { return this.form.get('idActividad'); }
  get nombre() { return this.form.get('nombre'); }
}

