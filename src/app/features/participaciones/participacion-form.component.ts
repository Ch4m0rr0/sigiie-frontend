import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ParticipacionService } from '../../core/services/participacion.service';
import { SubactividadService } from '../../core/services/subactividad.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import { ActividadesService } from '../../core/services/actividades.service';
import type { ParticipacionCreate } from '../../core/models/participacion';
import type { Subactividad } from '../../core/models/subactividad';
import type { RolEquipo } from '../../core/models/catalogos-nuevos';
import type { Edicion } from '../../core/models/edicion';
import { BrnButtonImports } from '@spartan-ng/brain/button';
import { BrnLabelImports } from '@spartan-ng/brain/label';

@Component({
  standalone: true,
  selector: 'app-participacion-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
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
      estudianteId: [null],
      docenteId: [null],
      administrativoId: [null],
      categoriaParticipacionId: ['', Validators.required],
      estadoParticipacionId: ['', Validators.required],
      fechaParticipacion: [new Date().toISOString().split('T')[0], Validators.required]
    });
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
        this.form.patchValue({
          edicionId: data.edicionId,
          idSubactividad: data.idSubactividad || null,
          grupoNumero: data.grupoNumero || null,
          idRolEquipo: data.idRolEquipo || null,
          idTutor: data.idTutor || null,
          estudianteId: data.estudianteId || data.idEstudiante || null,
          docenteId: data.docenteId || data.idDocente || null,
          administrativoId: data.administrativoId || data.idAdmin || null,
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
    if (this.form.valid) {
      this.loading.set(true);
      this.error.set(null);

      const data: ParticipacionCreate = {
        edicionId: this.form.value.edicionId,
        idSubactividad: this.form.value.idSubactividad || undefined,
        grupoNumero: this.form.value.grupoNumero || undefined,
        idRolEquipo: this.form.value.idRolEquipo || undefined,
        idTutor: this.form.value.idTutor || undefined,
        estudianteId: this.form.value.estudianteId || undefined,
        docenteId: this.form.value.docenteId || undefined,
        administrativoId: this.form.value.administrativoId || undefined,
        categoriaParticipacionId: this.form.value.categoriaParticipacionId,
        estadoParticipacionId: this.form.value.estadoParticipacionId,
        fechaParticipacion: new Date(this.form.value.fechaParticipacion)
      };

      if (this.isEditMode()) {
        this.participacionService.update(this.participacionId()!, data).subscribe({
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
        this.participacionService.create(data).subscribe({
          next: () => {
            this.router.navigate(['/participaciones']);
          },
          error: (err: any) => {
            console.error('Error saving participacion:', err);
            this.error.set('Error al guardar la participación');
            this.loading.set(false);
          }
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

