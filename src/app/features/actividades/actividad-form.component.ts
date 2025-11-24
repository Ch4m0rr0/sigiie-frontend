import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ActividadesService } from '../../core/services/actividades.service';
import { PlanificacionService } from '../../core/services/planificacion.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import type { ActividadCreate } from '../../core/models/actividad';
import type { Planificacion } from '../../core/models/planificacion';
import type { Departamento } from '../../core/models/departamento';
import type { CategoriaActividad } from '../../core/models/categoria-actividad';
import type { TipoUnidad } from '../../core/models/tipo-unidad';
import type { AreaConocimiento } from '../../core/models/area-conocimiento';
import type { TipoIniciativa } from '../../core/models/tipo-iniciativa';
import type { EstadoActividad } from '../../core/models/estado-actividad';
import type { TipoDocumento } from '../../core/models/tipo-documento';
import type { NivelActividad } from '../../core/models/catalogos-nuevos';
import { ActividadMensualInstService } from '../../core/services/actividad-mensual-inst.service';
import type { ActividadMensualInst } from '../../core/models/actividad-mensual-inst';
import { IconComponent } from '../../shared/icon/icon.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';
import { BrnLabelImports } from '@spartan-ng/brain/label';

@Component({
  standalone: true,
  selector: 'app-actividad-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    IconComponent,
    ...BrnButtonImports,
    ...BrnLabelImports
  ],
  templateUrl: './actividad-form.component.html',
})
export class ActividadFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private actividadesService = inject(ActividadesService);
  private planificacionService = inject(PlanificacionService);
  private catalogosService = inject(CatalogosService);
  private actividadMensualInstService = inject(ActividadMensualInstService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  form!: FormGroup;
  planificaciones = signal<Planificacion[]>([]);
  departamentos = signal<Departamento[]>([]);
  categoriasActividad = signal<CategoriaActividad[]>([]);
  tiposUnidad = signal<TipoUnidad[]>([]);
  areasConocimiento = signal<AreaConocimiento[]>([]);
  tiposIniciativa = signal<TipoIniciativa[]>([]);
  estadosActividad = signal<EstadoActividad[]>([]);
  tiposDocumento = signal<TipoDocumento[]>([]);
  nivelesActividad = signal<NivelActividad[]>([]);
  actividadesMensualesInst = signal<ActividadMensualInst[]>([]);
  isEditMode = signal(false);
  actividadId = signal<number | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.initializeForm();
    this.loadPlanificaciones();
    this.loadDepartamentos();
    this.loadCategoriasActividad();
    this.loadTiposUnidad();
    this.loadAreasConocimiento();
    this.loadTiposIniciativa();
    this.loadEstadosActividad();
    this.loadTiposDocumento();
    this.loadNivelesActividad();
    this.loadActividadesMensualesInst();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.actividadId.set(+id);
      this.loadActividad(+id);
    }
  }

  initializeForm(): void {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: [''],
      departamentoId: [null],
      departamentoResponsableId: [null],
      idTipoIniciativa: [null],
      fechaInicio: [''],
      fechaFin: [''],
      soporteDocumentoUrl: [null], // Para archivo
      idEstadoActividad: [null],
      idTipoActividad: [null], // Reemplaza categoriaActividadId
      idArea: [null], // Reemplaza areaConocimientoId
      idTipoDocumento: [null],
      organizador: [''],
      modalidad: [''],
      ubicacion: [''],
      idNivel: [null],
      nivelActividad: [1],
      semanaMes: [null],
      codigoActividad: [''],
      idActividadMensualInst: [null],
      // Campos legacy para compatibilidad (se mapearán en onSubmit)
      categoriaActividadId: [null],
      tipoUnidadId: [null],
      areaConocimientoId: [null],
      idPlanificacion: [null],
      activo: [true]
    });
  }

  loadPlanificaciones(): void {
    this.planificacionService.getAll().subscribe({
      next: (data) => this.planificaciones.set(data),
      error: (err) => console.error('Error loading planificaciones:', err)
    });
  }


  loadDepartamentos(): void {
    this.catalogosService.getDepartamentos().subscribe({
      next: (data) => this.departamentos.set(data),
      error: (err) => console.error('Error loading departamentos:', err)
    });
  }

  loadCategoriasActividad(): void {
    this.catalogosService.getCategoriasActividad().subscribe({
      next: (data) => this.categoriasActividad.set(data),
      error: (err) => console.error('Error loading categorias actividad:', err)
    });
  }

  loadTiposUnidad(): void {
    this.catalogosService.getTiposUnidad().subscribe({
      next: (data) => this.tiposUnidad.set(data),
      error: (err) => console.error('Error loading tipos unidad:', err)
    });
  }

  loadAreasConocimiento(): void {
    this.catalogosService.getAreasConocimiento().subscribe({
      next: (data) => this.areasConocimiento.set(data),
      error: (err) => console.error('Error loading areas conocimiento:', err)
    });
  }

  loadTiposIniciativa(): void {
    this.catalogosService.getTiposIniciativa().subscribe({
      next: (data) => this.tiposIniciativa.set(data),
      error: (err) => console.error('Error loading tipos iniciativa:', err)
    });
  }

  loadEstadosActividad(): void {
    this.catalogosService.getEstadosActividad().subscribe({
      next: (data) => this.estadosActividad.set(data),
      error: (err) => console.error('Error loading estados actividad:', err)
    });
  }

  loadTiposDocumento(): void {
    this.catalogosService.getTiposDocumento().subscribe({
      next: (data) => this.tiposDocumento.set(data),
      error: (err) => console.error('Error loading tipos documento:', err)
    });
  }

  loadNivelesActividad(): void {
    this.catalogosService.getNivelesActividad().subscribe({
      next: (data) => this.nivelesActividad.set(data),
      error: (err) => console.error('Error loading niveles actividad:', err)
    });
  }

  loadActividadesMensualesInst(): void {
    this.actividadMensualInstService.getAll().subscribe({
      next: (data) => this.actividadesMensualesInst.set(data),
      error: (err) => console.error('Error loading actividades mensuales inst:', err)
    });
  }

  loadActividad(id: number): void {
    this.loading.set(true);
    this.actividadesService.get(id).subscribe({
      next: (data) => {
        this.form.patchValue({
          nombre: data.nombre || data.nombreActividad,
          descripcion: data.descripcion || '',
          departamentoId: data.departamentoId || null,
          departamentoResponsableId: data.departamentoResponsableId || null,
          idTipoIniciativa: data.idTipoIniciativa || null,
          fechaInicio: data.fechaInicio || '',
          fechaFin: data.fechaFin || '',
          idEstadoActividad: data.idEstadoActividad || null,
          idTipoActividad: data.idTipoActividad || data.categoriaActividadId || null,
          idArea: data.idArea || data.areaConocimientoId || null,
          idTipoDocumento: data.idTipoDocumento || null,
          organizador: data.organizador || '',
          modalidad: data.modalidad || '',
          ubicacion: data.ubicacion || '',
          idNivel: data.idNivel || null,
          nivelActividad: data.nivelActividad ?? 1,
          semanaMes: data.semanaMes || null,
          codigoActividad: data.codigoActividad || '',
          idActividadMensualInst: data.idActividadMensualInst || null,
          // Campos legacy para compatibilidad
          categoriaActividadId: data.idTipoActividad || data.categoriaActividadId || null,
          areaConocimientoId: data.idArea || data.areaConocimientoId || null,
          activo: data.activo ?? true
        });
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading actividad:', err);
        this.error.set('Error al cargar la actividad');
        this.loading.set(false);
      }
    });
  }

  onSubmit(): void {
    if (this.form.valid) {
      this.loading.set(true);
      this.error.set(null);

      const formValue = this.form.value;
      
      // Formatear fechas si están presentes
      let fechaInicio: string | undefined = undefined;
      let fechaFin: string | undefined = undefined;
      
      if (formValue.fechaInicio) {
        const fecha = new Date(formValue.fechaInicio);
        if (!isNaN(fecha.getTime())) {
          fechaInicio = fecha.toISOString().split('T')[0];
        }
      }
      
      if (formValue.fechaFin) {
        const fecha = new Date(formValue.fechaFin);
        if (!isNaN(fecha.getTime())) {
          fechaFin = fecha.toISOString().split('T')[0];
        }
      }

      const data: ActividadCreate = {
        nombreActividad: formValue.nombre,
        nombre: formValue.nombre, // Alias para compatibilidad
        descripcion: formValue.descripcion || undefined,
        departamentoId: formValue.departamentoId || undefined,
        departamentoResponsableId: formValue.departamentoResponsableId || undefined,
        idTipoIniciativa: formValue.idTipoIniciativa || undefined,
        fechaInicio: fechaInicio,
        fechaFin: fechaFin,
        idEstadoActividad: formValue.idEstadoActividad || undefined,
        idTipoActividad: formValue.idTipoActividad || formValue.categoriaActividadId || undefined,
        idArea: formValue.idArea || formValue.areaConocimientoId || undefined,
        idTipoDocumento: formValue.idTipoDocumento || undefined,
        organizador: formValue.organizador || undefined,
        modalidad: formValue.modalidad || undefined,
        ubicacion: formValue.ubicacion || undefined,
        idNivel: formValue.idNivel || undefined,
        nivelActividad: formValue.nivelActividad ?? 1,
        semanaMes: formValue.semanaMes || undefined,
        codigoActividad: formValue.codigoActividad || undefined,
        idActividadMensualInst: formValue.idActividadMensualInst || undefined,
        // Campos legacy para compatibilidad
        categoriaActividadId: formValue.idTipoActividad || formValue.categoriaActividadId || undefined,
        areaConocimientoId: formValue.idArea || formValue.areaConocimientoId || undefined
      };

      // NOTA: El archivo de soporte (soporteDocumentoUrl) se manejará en el backend
      // cuando se implemente la funcionalidad de subida de archivos.
      // Por ahora, solo enviamos los datos del formulario.

      if (this.isEditMode()) {
        this.actividadesService.update(this.actividadId()!, data).subscribe({
          next: () => {
            this.router.navigate(['/actividades']);
          },
          error: (err: any) => {
            console.error('Error saving actividad:', err);
            this.error.set('Error al guardar la actividad');
            this.loading.set(false);
          }
        });
      } else {
        this.actividadesService.create(data).subscribe({
          next: () => {
            this.router.navigate(['/actividades']);
          },
          error: (err: any) => {
            console.error('Error saving actividad:', err);
            this.error.set('Error al guardar la actividad');
            this.loading.set(false);
          }
        });
      }
    } else {
      this.form.markAllAsTouched();
    }
  }

  get nombre() { return this.form.get('nombre'); }
  get idPlanificacion() { return this.form.get('idPlanificacion'); }
  get departamentoResponsableId() { return this.form.get('departamentoResponsableId'); }
}

