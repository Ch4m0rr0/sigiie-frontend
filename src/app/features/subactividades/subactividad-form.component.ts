import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SubactividadService } from '../../core/services/subactividad.service';
import { ActividadesService } from '../../core/services/actividades.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import { PersonasService } from '../../core/services/personas.service';
import { SubactividadResponsableService, type SubactividadResponsableCreate } from '../../core/services/subactividad-responsable.service';
import type { SubactividadCreate } from '../../core/models/subactividad';
import type { Actividad } from '../../core/models/actividad';
import type { TipoSubactividad } from '../../core/models/catalogos-nuevos';
import type { Departamento } from '../../core/models/departamento';
import type { Docente } from '../../core/models/docente';
import type { Administrativo } from '../../core/models/administrativo';
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
  private personasService = inject(PersonasService);
  private subactividadResponsableService = inject(SubactividadResponsableService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  form!: FormGroup;
  actividades = signal<Actividad[]>([]);
  tiposSubactividad = signal<TipoSubactividad[]>([]);
  departamentos = signal<Departamento[]>([]);
  docentes = signal<Docente[]>([]);
  administrativos = signal<Administrativo[]>([]);
  tipoResponsable = signal<'docente' | 'administrativo' | null>(null);
  isEditMode = signal(false);
  subactividadId = signal<number | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.initializeForm();
    this.loadActividades();
    this.loadTiposSubactividad();
    this.loadDepartamentos();
    this.loadDocentes();
    this.loadAdministrativos();

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
      tipoResponsable: [null],
      idDocenteResponsable: [null],
      idAdministrativoResponsable: [null],
      ubicacion: [''],
      modalidad: [''],
      organizador: [''],
      activo: [true]
    });

    // Cuando cambia el tipo de responsable, limpiar el otro campo
    this.form.get('tipoResponsable')?.valueChanges.subscribe(tipo => {
      this.tipoResponsable.set(tipo);
      if (tipo === 'docente') {
        this.form.patchValue({ idAdministrativoResponsable: null }, { emitEvent: false });
      } else if (tipo === 'administrativo') {
        this.form.patchValue({ idDocenteResponsable: null }, { emitEvent: false });
      } else {
        this.form.patchValue({ 
          idDocenteResponsable: null, 
          idAdministrativoResponsable: null 
        }, { emitEvent: false });
      }
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

  loadDocentes(): void {
    this.personasService.listDocentes().subscribe({
      next: (data) => this.docentes.set(data),
      error: (err) => console.error('Error loading docentes:', err)
    });
  }

  loadAdministrativos(): void {
    this.personasService.listAdministrativos().subscribe({
      next: (data) => this.administrativos.set(data),
      error: (err) => console.error('Error loading administrativos:', err)
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
        
        // Cargar responsables de la subactividad
        this.subactividadResponsableService.getBySubactividad(id).subscribe({
          next: (responsables) => {
            if (responsables && responsables.length > 0) {
              const responsable = responsables[0]; // Tomar el primero si hay varios
              if (responsable.idDocente) {
                this.form.patchValue({
                  tipoResponsable: 'docente',
                  idDocenteResponsable: responsable.idDocente
                });
              } else if (responsable.idAdministrativo) {
                this.form.patchValue({
                  tipoResponsable: 'administrativo',
                  idAdministrativoResponsable: responsable.idAdministrativo
                });
              }
            }
            this.loading.set(false);
          },
          error: (err) => {
            console.warn('Error loading responsables:', err);
            this.loading.set(false);
          }
        });
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
            // Actualizar responsable si se seleccionó uno
            const tipoResponsable = this.form.value.tipoResponsable;
            const idDocente = this.form.value.idDocenteResponsable;
            const idAdministrativo = this.form.value.idAdministrativoResponsable;

            // Primero obtener los responsables existentes
            this.subactividadResponsableService.getBySubactividad(this.subactividadId()!).subscribe({
              next: (responsablesExistentes) => {
                if (tipoResponsable && (idDocente || idAdministrativo)) {
                  // Si ya existe un responsable, actualizarlo; si no, crear uno nuevo
                  if (responsablesExistentes && responsablesExistentes.length > 0) {
                    const responsableExistente = responsablesExistentes[0];
                    const responsableData: SubactividadResponsableCreate = {
                      idSubactividad: this.subactividadId()!,
                      idDocente: tipoResponsable === 'docente' ? idDocente : undefined,
                      idAdministrativo: tipoResponsable === 'administrativo' ? idAdministrativo : undefined,
                      activo: true
                    };
                    this.subactividadResponsableService.update(responsableExistente.idSubactividadResponsable, responsableData).subscribe({
                      next: () => {
                        console.log('✅ Responsable actualizado correctamente');
                        this.router.navigate(['/subactividades']);
                      },
                      error: (err: any) => {
                        console.error('Error actualizando responsable:', err);
                        this.router.navigate(['/subactividades']);
                      }
                    });
                  } else {
                    // Crear nuevo responsable
                    const responsableData: SubactividadResponsableCreate = {
                      idSubactividad: this.subactividadId()!,
                      idDocente: tipoResponsable === 'docente' ? idDocente : undefined,
                      idAdministrativo: tipoResponsable === 'administrativo' ? idAdministrativo : undefined,
                      activo: true
                    };
                    this.subactividadResponsableService.create(responsableData).subscribe({
                      next: () => {
                        console.log('✅ Responsable creado correctamente');
                        this.router.navigate(['/subactividades']);
                      },
                      error: (err: any) => {
                        console.error('Error creando responsable:', err);
                        this.router.navigate(['/subactividades']);
                      }
                    });
                  }
                } else {
                  // Si no se seleccionó responsable, eliminar los existentes
                  if (responsablesExistentes && responsablesExistentes.length > 0) {
                    responsablesExistentes.forEach(responsable => {
                      this.subactividadResponsableService.delete(responsable.idSubactividadResponsable).subscribe({
                        error: (err: any) => console.error('Error eliminando responsable:', err)
                      });
                    });
                  }
                  this.router.navigate(['/subactividades']);
                }
              },
              error: (err: any) => {
                console.warn('Error obteniendo responsables:', err);
                this.router.navigate(['/subactividades']);
              }
            });
          },
          error: (err: any) => {
            console.error('Error saving subactividad:', err);
            this.error.set('Error al guardar la subactividad');
            this.loading.set(false);
          }
        });
      } else {
        this.subactividadService.create(data).subscribe({
          next: (subactividadCreada) => {
            // Crear responsable si se seleccionó uno
            const tipoResponsable = this.form.value.tipoResponsable;
            const idDocente = this.form.value.idDocenteResponsable;
            const idAdministrativo = this.form.value.idAdministrativoResponsable;

            if (tipoResponsable && (idDocente || idAdministrativo)) {
              const responsableData: SubactividadResponsableCreate = {
                idSubactividad: subactividadCreada.idSubactividad,
                idDocente: tipoResponsable === 'docente' ? idDocente : undefined,
                idAdministrativo: tipoResponsable === 'administrativo' ? idAdministrativo : undefined,
                activo: true
              };

              this.subactividadResponsableService.create(responsableData).subscribe({
                next: () => {
                  console.log('✅ Responsable asignado correctamente');
                  this.router.navigate(['/subactividades']);
                },
                error: (err: any) => {
                  console.error('Error asignando responsable:', err);
                  // Aún así navegar, el responsable se puede asignar después
                  this.router.navigate(['/subactividades']);
                }
              });
            } else {
              this.router.navigate(['/subactividades']);
            }
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

