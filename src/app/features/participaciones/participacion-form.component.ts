import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ParticipacionService } from '../../core/services/participacion.service';
import { SubactividadService } from '../../core/services/subactividad.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import { ActividadesService } from '../../core/services/actividades.service';
import type { ParticipacionCreate } from '../../core/models/participacion';
import type { Subactividad } from '../../core/models/subactividad';
import type { RolEquipo } from '../../core/models/catalogos-nuevos';
import type { Edicion } from '../../core/models/edicion';
import { IconComponent } from '../../shared/icon/icon.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';
import { BrnLabelImports } from '@spartan-ng/brain/label';

@Component({
  standalone: true,
  selector: 'app-participacion-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    IconComponent,
    ...BrnButtonImports,
    ...BrnLabelImports
  ],
  templateUrl: './participacion-form.component.html',
})
export class ParticipacionFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private participacionService = inject(ParticipacionService);
  private subactividadService = inject(SubactividadService);
  private catalogosService = inject(CatalogosService);
  private actividadesService = inject(ActividadesService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  form!: FormGroup;
  subactividades = signal<Subactividad[]>([]);
  rolesEquipo = signal<RolEquipo[]>([]);
  ediciones = signal<Edicion[]>([]);
  isEditMode = signal(false);
  participacionId = signal<number | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.initializeForm();
    this.loadSubactividades();
    this.loadRolesEquipo();

    const id = this.route.snapshot.paramMap.get('id');
    const subactividadId = this.route.snapshot.queryParamMap.get('subactividadId');
    const edicionId = this.route.snapshot.queryParamMap.get('edicionId');
    
    if (id) {
      this.isEditMode.set(true);
      this.participacionId.set(+id);
      this.loadParticipacion(+id);
    } else if (subactividadId) {
      // Pre-seleccionar subactividad si viene de una subactividad específica
      this.form.patchValue({ idSubactividad: +subactividadId });
    } else if (edicionId) {
      // Pre-seleccionar edición si viene de una edición específica
      this.form.patchValue({ edicionId: +edicionId });
    }
  }

  initializeForm(): void {
    this.form = this.fb.group({
      edicionId: ['', Validators.required],
      idSubactividad: [null],
      grupoNumero: [null],
      idRolEquipo: [null],
      idTutor: [null],
      estudiantes: this.fb.array([]),
      docentes: this.fb.array([]),
      administrativos: this.fb.array([]),
      categoriaParticipacionId: ['', Validators.required],
      estadoParticipacionId: ['', Validators.required],
      fechaParticipacion: [new Date().toISOString().split('T')[0], Validators.required]
    });
  }

  get estudiantes(): FormArray {
    return this.form.get('estudiantes') as FormArray;
  }

  get docentes(): FormArray {
    return this.form.get('docentes') as FormArray;
  }

  get administrativos(): FormArray {
    return this.form.get('administrativos') as FormArray;
  }

  addEstudiante(): void {
    const estudianteForm = this.fb.group({
      estudianteId: [null, Validators.required]
    });
    this.estudiantes.push(estudianteForm);
  }

  removeEstudiante(index: number): void {
    this.estudiantes.removeAt(index);
  }

  addDocente(): void {
    const docenteForm = this.fb.group({
      docenteId: [null, Validators.required]
    });
    this.docentes.push(docenteForm);
  }

  removeDocente(index: number): void {
    this.docentes.removeAt(index);
  }

  addAdministrativo(): void {
    const administrativoForm = this.fb.group({
      administrativoId: [null, Validators.required]
    });
    this.administrativos.push(administrativoForm);
  }

  removeAdministrativo(index: number): void {
    this.administrativos.removeAt(index);
  }

  loadSubactividades(): void {
    this.subactividadService.getAll().subscribe({
      next: (data) => this.subactividades.set(data),
      error: (err) => console.error('Error loading subactividades:', err)
    });
  }

  loadRolesEquipo(): void {
    this.catalogosService.getRolesEquipo().subscribe({
      next: (data) => this.rolesEquipo.set(data),
      error: (err) => console.error('Error loading roles equipo:', err)
    });
  }

  loadParticipacion(id: number): void {
    this.loading.set(true);
    this.participacionService.getById(id).subscribe({
      next: (data) => {
        if (!data) {
          this.error.set('Participación no encontrada');
          this.loading.set(false);
          return;
        }
        // Limpiar arrays
        while (this.estudiantes.length !== 0) {
          this.estudiantes.removeAt(0);
        }
        while (this.docentes.length !== 0) {
          this.docentes.removeAt(0);
        }
        while (this.administrativos.length !== 0) {
          this.administrativos.removeAt(0);
        }

        // Agregar participantes si existen
        if (data.estudianteId || data.idEstudiante) {
          this.addEstudiante();
          this.estudiantes.at(0).patchValue({ estudianteId: data.estudianteId || data.idEstudiante });
        }
        if (data.docenteId || data.idDocente) {
          this.addDocente();
          this.docentes.at(0).patchValue({ docenteId: data.docenteId || data.idDocente });
        }
        if (data.administrativoId || data.idAdmin) {
          this.addAdministrativo();
          this.administrativos.at(0).patchValue({ administrativoId: data.administrativoId || data.idAdmin });
        }

        this.form.patchValue({
          edicionId: data.edicionId,
          idSubactividad: data.idSubactividad || null,
          grupoNumero: data.grupoNumero || null,
          idRolEquipo: data.idRolEquipo || null,
          idTutor: data.idTutor || null,
          categoriaParticipacionId: data.categoriaParticipacionId,
          estadoParticipacionId: data.estadoParticipacionId || data.idEstadoParticipacion,
          fechaParticipacion: data.fechaParticipacion ? new Date(data.fechaParticipacion).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
        });
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading participacion:', err);
        this.error.set('Error al cargar la participación');
        this.loading.set(false);
      }
    });
  }

  onSubmit(): void {
    // Validar que haya al menos un participante
    const tieneParticipantes = 
      this.estudiantes.length > 0 || 
      this.docentes.length > 0 || 
      this.administrativos.length > 0;

    if (!tieneParticipantes) {
      this.error.set('Debe agregar al menos un participante (estudiante, docente o administrativo)');
      return;
    }

    if (this.form.valid) {
      this.loading.set(true);
      this.error.set(null);

      // Crear una participación por cada participante
      const participaciones: ParticipacionCreate[] = [];
      const baseData = {
        edicionId: this.form.value.edicionId,
        idSubactividad: this.form.value.idSubactividad || undefined,
        grupoNumero: this.form.value.grupoNumero || undefined,
        idRolEquipo: this.form.value.idRolEquipo || undefined,
        idTutor: this.form.value.idTutor || undefined,
        categoriaParticipacionId: this.form.value.categoriaParticipacionId,
        estadoParticipacionId: this.form.value.estadoParticipacionId,
        fechaParticipacion: new Date(this.form.value.fechaParticipacion)
      };

      // Agregar participaciones para estudiantes
      this.estudiantes.controls.forEach(control => {
        if (control.value.estudianteId) {
          participaciones.push({
            ...baseData,
            estudianteId: control.value.estudianteId,
            docenteId: undefined,
            administrativoId: undefined
          });
        }
      });

      // Agregar participaciones para docentes
      this.docentes.controls.forEach(control => {
        if (control.value.docenteId) {
          participaciones.push({
            ...baseData,
            estudianteId: undefined,
            docenteId: control.value.docenteId,
            administrativoId: undefined
          });
        }
      });

      // Agregar participaciones para administrativos
      this.administrativos.controls.forEach(control => {
        if (control.value.administrativoId) {
          participaciones.push({
            ...baseData,
            estudianteId: undefined,
            docenteId: undefined,
            administrativoId: control.value.administrativoId
          });
        }
      });

      // Si estamos editando, solo actualizar la primera participación
      if (this.isEditMode() && participaciones.length > 0) {
        this.participacionService.update(this.participacionId()!, participaciones[0]).subscribe({
          next: () => {
            this.router.navigate(['/participaciones']);
          },
          error: (err: any) => {
            console.error('Error saving participacion:', err);
            this.error.set('Error al guardar la participación');
            this.loading.set(false);
          }
        });
      } else {
        // Crear todas las participaciones
        let completed = 0;
        const total = participaciones.length;
        
        if (total === 0) {
          this.error.set('Debe agregar al menos un participante');
          this.loading.set(false);
          return;
        }

        participaciones.forEach((data, index) => {
          this.participacionService.create(data).subscribe({
            next: () => {
              completed++;
              if (completed === total) {
                this.router.navigate(['/participaciones']);
              }
            },
            error: (err: any) => {
              console.error(`Error saving participacion ${index + 1}:`, err);
              this.error.set(`Error al guardar la participación ${index + 1}`);
              this.loading.set(false);
            }
          });
        });
      }
    } else {
      this.form.markAllAsTouched();
    }
  }

  get edicionId() { return this.form.get('edicionId'); }
  get categoriaParticipacionId() { return this.form.get('categoriaParticipacionId'); }
  get estadoParticipacionId() { return this.form.get('estadoParticipacionId'); }
}