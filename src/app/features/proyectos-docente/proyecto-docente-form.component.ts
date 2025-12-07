import { Component, inject, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProyectoDocenteService, type ProyectoDocenteCreate } from '../../core/services/proyecto-docente.service';
import { ProyectosService } from '../../core/services/proyectos.service';
import { PersonasService } from '../../core/services/personas.service';
import type { Proyecto } from '../../core/models/proyecto';
import type { Docente } from '../../core/models/docente';
import { IconComponent } from '../../shared/icon/icon.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';
import { BrnLabelImports } from '@spartan-ng/brain/label';
import { AlertService } from '../../core/services/alert.service';
import { forkJoin } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-proyecto-docente-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    IconComponent,
    ...BrnButtonImports,
    ...BrnLabelImports
  ],
  templateUrl: './proyecto-docente-form.component.html',
})
export class ProyectoDocenteFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private proyectoDocenteService = inject(ProyectoDocenteService);
  private proyectosService = inject(ProyectosService);
  private personasService = inject(PersonasService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private alertService = inject(AlertService);

  form!: FormGroup;
  proyectos = signal<Proyecto[]>([]);
  docentes = signal<Docente[]>([]);
  
  loading = signal(false);
  error = signal<string | null>(null);
  isEditMode = signal(false);

  // Señales para controlar visibilidad de dropdowns
  mostrarDropdownProyecto = signal(false);
  mostrarDropdownDocente = signal(false);

  // Filtros de búsqueda
  filtroProyecto = signal<string>('');
  filtroDocente = signal<string>('');

  ngOnInit(): void {
    this.initializeForm();
    this.loadAllData();

    // Pre-llenar datos si vienen de query params
    const idProyecto = this.route.snapshot.queryParamMap.get('idProyecto');
    const idDocente = this.route.snapshot.queryParamMap.get('idDocente');
    
    if (idProyecto) {
      setTimeout(() => {
        this.form.patchValue({ idProyecto: +idProyecto });
      }, 500);
    }
    
    if (idDocente) {
      setTimeout(() => {
        this.form.patchValue({ idDocente: +idDocente });
      }, 500);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    
    if (!target.closest('.dropdown-proyecto')) {
      this.mostrarDropdownProyecto.set(false);
    }
    if (!target.closest('.dropdown-docente')) {
      this.mostrarDropdownDocente.set(false);
    }
  }

  initializeForm(): void {
    this.form = this.fb.group({
      idProyecto: [null, Validators.required],
      idDocente: [null, Validators.required],
      rolEnProyecto: ['']
    });
  }

  loadAllData(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      proyectos: this.proyectosService.getAll(),
      docentes: this.personasService.listDocentes()
    }).subscribe({
      next: ({ proyectos, docentes }) => {
        this.proyectos.set(proyectos);
        this.docentes.set(docentes);
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

  toggleDropdownDocente(): void {
    this.mostrarDropdownDocente.set(!this.mostrarDropdownDocente());
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

  filtrarDocentes(): Docente[] {
    const filtro = this.filtroDocente().toLowerCase();
    if (!filtro) return this.docentes();
    return this.docentes().filter(d => 
      (d.nombreCompleto || '').toLowerCase().includes(filtro) ||
      (d.departamento || '').toLowerCase().includes(filtro) ||
      (d.nombreNivelAcademico || '').toLowerCase().includes(filtro)
    );
  }

  // Selección
  seleccionarProyecto(proyecto: Proyecto): void {
    this.form.patchValue({ idProyecto: proyecto.idProyecto || proyecto.id });
    this.mostrarDropdownProyecto.set(false);
    this.filtroProyecto.set('');
  }

  seleccionarDocente(docente: Docente): void {
    this.form.patchValue({ idDocente: docente.id });
    this.mostrarDropdownDocente.set(false);
    this.filtroDocente.set('');
  }

  eliminarProyecto(): void {
    this.form.patchValue({ idProyecto: null });
  }

  eliminarDocente(): void {
    this.form.patchValue({ idDocente: null });
  }

  getProyectoSeleccionado(): Proyecto | null {
    const id = this.form.get('idProyecto')?.value;
    if (!id) return null;
    return this.proyectos().find(p => (p.idProyecto || p.id) === id) || null;
  }

  getDocenteSeleccionado(): Docente | null {
    const id = this.form.get('idDocente')?.value;
    if (!id) return null;
    return this.docentes().find(d => d.id === id) || null;
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
    const proyectoDocenteData: ProyectoDocenteCreate = {
      idProyecto: formValue.idProyecto,
      idDocente: formValue.idDocente,
      rolEnProyecto: formValue.rolEnProyecto || undefined
    };

    this.proyectoDocenteService.create(proyectoDocenteData).subscribe({
      next: (result) => {
        this.alertService.success('Éxito', 'Proyecto-Docente creado exitosamente.');
        setTimeout(() => {
          this.router.navigate(['/proyectos', proyectoDocenteData.idProyecto]);
        }, 1500);
      },
      error: (err) => {
        console.error('Error creating proyecto-docente:', err);
        const errorMessage = err.error?.message || err.message || 'Error al crear la relación proyecto-docente.';
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
      formValue.idDocente ||
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

