import { Component, inject, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProyectoEstudianteService, type ProyectoEstudianteCreate } from '../../core/services/proyecto-estudiante.service';
import { ProyectosService } from '../../core/services/proyectos.service';
import { PersonasService } from '../../core/services/personas.service';
import type { Proyecto } from '../../core/models/proyecto';
import type { Estudiante } from '../../core/models/estudiante';
import { IconComponent } from '../../shared/icon/icon.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';
import { BrnLabelImports } from '@spartan-ng/brain/label';
import { AlertService } from '../../core/services/alert.service';
import { forkJoin } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-proyecto-estudiante-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    IconComponent,
    ...BrnButtonImports,
    ...BrnLabelImports
  ],
  templateUrl: './proyecto-estudiante-form.component.html',
})
export class ProyectoEstudianteFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private proyectoEstudianteService = inject(ProyectoEstudianteService);
  private proyectosService = inject(ProyectosService);
  private personasService = inject(PersonasService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private alertService = inject(AlertService);

  form!: FormGroup;
  proyectos = signal<Proyecto[]>([]);
  estudiantes = signal<Estudiante[]>([]);
  
  loading = signal(false);
  error = signal<string | null>(null);
  isEditMode = signal(false);

  // Señales para controlar visibilidad de dropdowns
  mostrarDropdownProyecto = signal(false);
  mostrarDropdownEstudiante = signal(false);

  // Filtros de búsqueda
  filtroProyecto = signal<string>('');
  filtroEstudiante = signal<string>('');

  ngOnInit(): void {
    this.initializeForm();
    this.loadAllData();

    // Pre-llenar datos si vienen de query params
    const idProyecto = this.route.snapshot.queryParamMap.get('idProyecto');
    const idEstudiante = this.route.snapshot.queryParamMap.get('idEstudiante');
    
    if (idProyecto) {
      setTimeout(() => {
        this.form.patchValue({ idProyecto: +idProyecto });
      }, 500);
    }
    
    if (idEstudiante) {
      setTimeout(() => {
        this.form.patchValue({ idEstudiante: +idEstudiante });
      }, 500);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    
    if (!target.closest('.dropdown-proyecto')) {
      this.mostrarDropdownProyecto.set(false);
    }
    if (!target.closest('.dropdown-estudiante')) {
      this.mostrarDropdownEstudiante.set(false);
    }
  }

  initializeForm(): void {
    this.form = this.fb.group({
      idProyecto: [null, Validators.required],
      idEstudiante: [null, Validators.required],
      rolEnProyecto: ['']
    });
  }

  loadAllData(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      proyectos: this.proyectosService.getAll(),
      estudiantes: this.personasService.listEstudiantes()
    }).subscribe({
      next: ({ proyectos, estudiantes }) => {
        this.proyectos.set(proyectos);
        this.estudiantes.set(estudiantes);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading data:', err);
        this.error.set('Error al cargar los datos. Por favor, intenta nuevamente.');
        this.loading.set(false);
      }
    });
  }

  // Métodos para dropdowns
  toggleDropdownProyecto(): void {
    this.mostrarDropdownProyecto.set(!this.mostrarDropdownProyecto());
  }

  toggleDropdownEstudiante(): void {
    this.mostrarDropdownEstudiante.set(!this.mostrarDropdownEstudiante());
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

  filtrarEstudiantes(): Estudiante[] {
    const filtro = this.filtroEstudiante().toLowerCase();
    if (!filtro) return this.estudiantes();
    return this.estudiantes().filter(e => 
      (e.nombreCompleto || '').toLowerCase().includes(filtro) ||
      (e.numeroCarnet || '').toLowerCase().includes(filtro) ||
      (e.carrera || '').toLowerCase().includes(filtro) ||
      (e.departamento || '').toLowerCase().includes(filtro)
    );
  }

  // Selección
  seleccionarProyecto(proyecto: Proyecto): void {
    this.form.patchValue({ idProyecto: proyecto.idProyecto || proyecto.id });
    this.mostrarDropdownProyecto.set(false);
    this.filtroProyecto.set('');
  }

  seleccionarEstudiante(estudiante: Estudiante): void {
    this.form.patchValue({ idEstudiante: estudiante.id });
    this.mostrarDropdownEstudiante.set(false);
    this.filtroEstudiante.set('');
  }

  eliminarProyecto(): void {
    this.form.patchValue({ idProyecto: null });
  }

  eliminarEstudiante(): void {
    this.form.patchValue({ idEstudiante: null });
  }

  getProyectoSeleccionado(): Proyecto | null {
    const id = this.form.get('idProyecto')?.value;
    if (!id) return null;
    return this.proyectos().find(p => (p.idProyecto || p.id) === id) || null;
  }

  getEstudianteSeleccionado(): Estudiante | null {
    const id = this.form.get('idEstudiante')?.value;
    if (!id) return null;
    return this.estudiantes().find(e => e.id === id) || null;
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
    const proyectoEstudianteData: ProyectoEstudianteCreate = {
      idProyecto: formValue.idProyecto,
      idEstudiante: formValue.idEstudiante,
      rolEnProyecto: formValue.rolEnProyecto || undefined
    };

    this.proyectoEstudianteService.create(proyectoEstudianteData).subscribe({
      next: (result) => {
        this.alertService.success('Éxito', 'Proyecto-Estudiante creado exitosamente.');
        setTimeout(() => {
          this.router.navigate(['/proyectos', proyectoEstudianteData.idProyecto]);
        }, 1500);
      },
      error: (err) => {
        console.error('Error creating proyecto-estudiante:', err);
        const errorMessage = err.error?.message || err.message || 'Error al crear la relación proyecto-estudiante.';
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
      formValue.idEstudiante ||
      formValue.rolEnProyecto?.trim()
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

