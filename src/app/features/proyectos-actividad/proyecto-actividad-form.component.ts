import { Component, inject, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProyectoActividadService, type ProyectoActividadCreate } from '../../core/services/proyecto-actividad.service';
import { ProyectosService } from '../../core/services/proyectos.service';
import { ActividadesService } from '../../core/services/actividades.service';
import { SubactividadService } from '../../core/services/subactividad.service';
import type { Proyecto } from '../../core/models/proyecto';
import type { Actividad } from '../../core/models/actividad';
import type { Subactividad } from '../../core/models/subactividad';
import { IconComponent } from '../../shared/icon/icon.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';
import { BrnLabelImports } from '@spartan-ng/brain/label';
import { AlertService } from '../../core/services/alert.service';
import { forkJoin } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-proyecto-actividad-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    IconComponent,
    ...BrnButtonImports,
    ...BrnLabelImports
  ],
  templateUrl: './proyecto-actividad-form.component.html',
})
export class ProyectoActividadFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private proyectoActividadService = inject(ProyectoActividadService);
  private proyectosService = inject(ProyectosService);
  private actividadesService = inject(ActividadesService);
  private subactividadService = inject(SubactividadService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private alertService = inject(AlertService);

  form!: FormGroup;
  proyectos = signal<Proyecto[]>([]);
  actividades = signal<Actividad[]>([]);
  subactividades = signal<Subactividad[]>([]);
  
  loading = signal(false);
  error = signal<string | null>(null);
  isEditMode = signal(false);

  // Señales para controlar visibilidad de dropdowns
  mostrarDropdownProyecto = signal(false);
  mostrarDropdownActividad = signal(false);
  mostrarDropdownSubactividad = signal(false);

  // Filtros de búsqueda
  filtroProyecto = signal<string>('');
  filtroActividad = signal<string>('');
  filtroSubactividad = signal<string>('');

  ngOnInit(): void {
    this.initializeForm();
    this.loadAllData();

    // Pre-llenar datos si vienen de query params
    const idProyecto = this.route.snapshot.queryParamMap.get('idProyecto');
    const idActividad = this.route.snapshot.queryParamMap.get('idActividad');
    
    if (idProyecto) {
      setTimeout(() => {
        this.form.patchValue({ idProyecto: +idProyecto });
      }, 500);
    }
    
    if (idActividad) {
      setTimeout(() => {
        this.form.patchValue({ idActividad: +idActividad });
        this.onActividadChange();
      }, 500);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    
    if (!target.closest('.dropdown-proyecto')) {
      this.mostrarDropdownProyecto.set(false);
    }
    if (!target.closest('.dropdown-actividad')) {
      this.mostrarDropdownActividad.set(false);
    }
    if (!target.closest('.dropdown-subactividad')) {
      this.mostrarDropdownSubactividad.set(false);
    }
  }

  initializeForm(): void {
    this.form = this.fb.group({
      idProyecto: [null, Validators.required],
      idActividad: [null, Validators.required],
      esSubactividad: [false],
      idSubactividad: [null],
      tipoRelacion: [''],
      comentario: ['']
    });

    // Validación condicional: idSubactividad es requerido si esSubactividad es true
    this.form.get('esSubactividad')?.valueChanges.subscribe(esSubactividad => {
      const idSubactividadControl = this.form.get('idSubactividad');
      if (esSubactividad) {
        idSubactividadControl?.setValidators(Validators.required);
      } else {
        idSubactividadControl?.clearValidators();
        idSubactividadControl?.setValue(null);
      }
      idSubactividadControl?.updateValueAndValidity();
    });

    // Cargar subactividades cuando cambia la actividad
    this.form.get('idActividad')?.valueChanges.subscribe(() => {
      this.onActividadChange();
    });
  }

  loadAllData(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      proyectos: this.proyectosService.getAll(),
      actividades: this.actividadesService.getAll()
    }).subscribe({
      next: ({ proyectos, actividades }) => {
        this.proyectos.set(proyectos);
        this.actividades.set(actividades);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading data:', err);
        this.error.set('Error al cargar los datos. Por favor, intenta nuevamente.');
        this.loading.set(false);
      }
    });
  }

  onActividadChange(): void {
    const idActividad = this.form.get('idActividad')?.value;
    if (idActividad) {
      this.loadSubactividades(idActividad);
    } else {
      this.subactividades.set([]);
    }
  }

  loadSubactividades(idActividad: number): void {
    this.subactividadService.getByActividad(idActividad).subscribe({
      next: (subactividades) => {
        this.subactividades.set(subactividades);
      },
      error: (err) => {
        console.error('Error loading subactividades:', err);
        this.subactividades.set([]);
      }
    });
  }

  // Métodos para dropdowns
  toggleDropdownProyecto(): void {
    this.mostrarDropdownProyecto.set(!this.mostrarDropdownProyecto());
  }

  toggleDropdownActividad(): void {
    this.mostrarDropdownActividad.set(!this.mostrarDropdownActividad());
  }

  toggleDropdownSubactividad(): void {
    this.mostrarDropdownSubactividad.set(!this.mostrarDropdownSubactividad());
  }

  // Filtros
  filtrarProyectos(): Proyecto[] {
    const filtro = this.filtroProyecto().toLowerCase();
    if (!filtro) return this.proyectos();
    return this.proyectos().filter(p => 
      (p.nombreProyecto || p.nombre || '').toLowerCase().includes(filtro) ||
      (p.descripcion || '').toLowerCase().includes(filtro)
    );
  }

  filtrarActividades(): Actividad[] {
    const filtro = this.filtroActividad().toLowerCase();
    if (!filtro) return this.actividades();
    return this.actividades().filter(a => 
      (a.nombreActividad || a.nombre || '').toLowerCase().includes(filtro) ||
      (a.descripcion || '').toLowerCase().includes(filtro)
    );
  }

  filtrarSubactividades(): Subactividad[] {
    const filtro = this.filtroSubactividad().toLowerCase();
    if (!filtro) return this.subactividades();
    return this.subactividades().filter(s => 
      (s.nombreSubactividad || s.nombre || '').toLowerCase().includes(filtro) ||
      (s.descripcion || '').toLowerCase().includes(filtro)
    );
  }

  // Selección
  seleccionarProyecto(proyecto: Proyecto): void {
    this.form.patchValue({ idProyecto: proyecto.idProyecto || proyecto.id });
    this.mostrarDropdownProyecto.set(false);
    this.filtroProyecto.set('');
  }

  seleccionarActividad(actividad: Actividad): void {
    this.form.patchValue({ idActividad: actividad.idActividad || actividad.id });
    this.mostrarDropdownActividad.set(false);
    this.filtroActividad.set('');
    this.onActividadChange();
  }

  seleccionarSubactividad(subactividad: Subactividad): void {
    this.form.patchValue({ idSubactividad: subactividad.idSubactividad });
    this.mostrarDropdownSubactividad.set(false);
    this.filtroSubactividad.set('');
  }

  eliminarProyecto(): void {
    this.form.patchValue({ idProyecto: null });
  }

  eliminarActividad(): void {
    this.form.patchValue({ idActividad: null });
    this.subactividades.set([]);
    if (this.form.get('esSubactividad')?.value) {
      this.form.patchValue({ esSubactividad: false, idSubactividad: null });
    }
  }

  eliminarSubactividad(): void {
    this.form.patchValue({ idSubactividad: null });
  }

  getProyectoSeleccionado(): Proyecto | null {
    const id = this.form.get('idProyecto')?.value;
    if (!id) return null;
    return this.proyectos().find(p => (p.idProyecto || p.id) === id) || null;
  }

  getActividadSeleccionada(): Actividad | null {
    const id = this.form.get('idActividad')?.value;
    if (!id) return null;
    return this.actividades().find(a => (a.idActividad || a.id) === id) || null;
  }

  getSubactividadSeleccionada(): Subactividad | null {
    const id = this.form.get('idSubactividad')?.value;
    if (!id) return null;
    return this.subactividades().find(s => s.idSubactividad === id) || null;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.alertService.error('Error de validación', 'Por favor, completa todos los campos requeridos.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const formValue = this.form.value;
    const proyectoActividadData: ProyectoActividadCreate = {
      idProyecto: formValue.idProyecto,
      idActividad: formValue.idActividad,
      esSubactividad: formValue.esSubactividad || false,
      idSubactividad: formValue.esSubactividad ? formValue.idSubactividad : undefined,
      tipoRelacion: formValue.tipoRelacion || undefined,
      comentario: formValue.comentario || undefined
    };

    this.proyectoActividadService.create(proyectoActividadData).subscribe({
      next: (result) => {
        this.alertService.success('Éxito', 'Proyecto-Actividad creado exitosamente.');
        setTimeout(() => {
          this.router.navigate(['/proyectos', proyectoActividadData.idProyecto]);
        }, 1500);
      },
      error: (err) => {
        console.error('Error creating proyecto-actividad:', err);
        const errorMessage = err.error?.message || err.message || 'Error al crear la relación proyecto-actividad.';
        this.error.set(errorMessage);
        this.alertService.error('Error', errorMessage);
        this.loading.set(false);
      }
    });
  }

  /**
   * Verifica si hay cambios sin guardar en el formulario
   */
  private tieneCambiosSinGuardar(): boolean {
    if (!this.form) {
      return false;
    }

    const formValue = this.form.getRawValue();
    
    // Verificar si hay datos en los campos
    const tieneDatos = !!(
      formValue.idProyecto ||
      formValue.idActividad ||
      formValue.esSubactividad ||
      formValue.idSubactividad ||
      formValue.tipoRelacion?.trim() ||
      formValue.comentario?.trim()
    );
    
    return tieneDatos;
  }

  /**
   * Maneja el clic en el botón de cancelar
   * Muestra alertas de confirmación antes de cancelar
   */
  async onCancel(): Promise<void> {
    // Verificar si hay cambios sin guardar
    const tieneCambios = this.tieneCambiosSinGuardar();
    
    if (tieneCambios) {
      // Si hay cambios, mostrar alerta con opción de continuar editando
      const result = await this.alertService.confirm(
        '¿Desea cancelar?',
        'Tiene cambios sin guardar. ¿Desea descartar los cambios y salir?',
        'Sí, descartar cambios',
        'No, continuar',
        {
          showDenyButton: true,
          denyButtonText: 'Continuar editando',
          denyButtonColor: '#6b7280'
        }
      );
      
      if (result.isConfirmed) {
        // Usuario eligió "Descartar cambios"
        this.router.navigate(['/proyectos']);
      } else if (result.isDenied) {
        // Usuario eligió "Continuar editando"
        return; // No hacer nada, quedarse en el formulario
      }
      // Si cerró el diálogo, no hacer nada
    } else {
      // Si no hay cambios, mostrar alerta simple de confirmación
      const result = await this.alertService.confirm(
        '¿Desea cancelar?',
        '¿Está seguro de que desea salir?',
        'Sí, cancelar',
        'No, continuar'
      );
      
      if (result.isConfirmed) {
        this.router.navigate(['/proyectos']);
      }
      // Si no confirma, no hacer nada
    }
  }
}

