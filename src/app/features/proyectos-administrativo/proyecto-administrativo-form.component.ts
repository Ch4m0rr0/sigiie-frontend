import { Component, inject, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProyectoAdministrativoService, type ProyectoAdministrativoCreate } from '../../core/services/proyecto-administrativo.service';
import { ProyectosService } from '../../core/services/proyectos.service';
import { PersonasService } from '../../core/services/personas.service';
import type { Proyecto } from '../../core/models/proyecto';
import type { Administrativo } from '../../core/models/administrativo';
import { IconComponent } from '../../shared/icon/icon.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';
import { BrnLabelImports } from '@spartan-ng/brain/label';
import { AlertService } from '../../core/services/alert.service';
import { forkJoin } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-proyecto-administrativo-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    IconComponent,
    ...BrnButtonImports,
    ...BrnLabelImports
  ],
  templateUrl: './proyecto-administrativo-form.component.html',
})
export class ProyectoAdministrativoFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private proyectoAdministrativoService = inject(ProyectoAdministrativoService);
  private proyectosService = inject(ProyectosService);
  private personasService = inject(PersonasService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private alertService = inject(AlertService);

  form!: FormGroup;
  proyectos = signal<Proyecto[]>([]);
  administrativos = signal<Administrativo[]>([]);
  
  loading = signal(false);
  error = signal<string | null>(null);
  isEditMode = signal(false);

  // Señales para controlar visibilidad de dropdowns
  mostrarDropdownProyecto = signal(false);
  mostrarDropdownAdministrativo = signal(false);

  // Filtros de búsqueda
  filtroProyecto = signal<string>('');
  filtroAdministrativo = signal<string>('');

  ngOnInit(): void {
    this.initializeForm();
    this.loadAllData();

    // Pre-llenar datos si vienen de query params
    const idProyecto = this.route.snapshot.queryParamMap.get('idProyecto');
    const idAdmin = this.route.snapshot.queryParamMap.get('idAdmin');
    
    if (idProyecto) {
      setTimeout(() => {
        this.form.patchValue({ idProyecto: +idProyecto });
      }, 500);
    }
    
    if (idAdmin) {
      setTimeout(() => {
        this.form.patchValue({ idAdmin: +idAdmin });
      }, 500);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    
    if (!target.closest('.dropdown-proyecto')) {
      this.mostrarDropdownProyecto.set(false);
    }
    if (!target.closest('.dropdown-administrativo')) {
      this.mostrarDropdownAdministrativo.set(false);
    }
  }

  initializeForm(): void {
    this.form = this.fb.group({
      idProyecto: [null, Validators.required],
      idAdmin: [null, Validators.required],
      rolEnProyecto: ['']
    });
  }

  loadAllData(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      proyectos: this.proyectosService.getAll(),
      administrativos: this.personasService.listAdministrativos()
    }).subscribe({
      next: ({ proyectos, administrativos }) => {
        this.proyectos.set(proyectos);
        this.administrativos.set(administrativos);
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

  toggleDropdownAdministrativo(): void {
    this.mostrarDropdownAdministrativo.set(!this.mostrarDropdownAdministrativo());
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

  filtrarAdministrativos(): Administrativo[] {
    const filtro = this.filtroAdministrativo().toLowerCase();
    if (!filtro) return this.administrativos();
    return this.administrativos().filter(a => 
      (a.nombreCompleto || '').toLowerCase().includes(filtro) ||
      (a.puesto || '').toLowerCase().includes(filtro) ||
      (a.departamento || '').toLowerCase().includes(filtro)
    );
  }

  // Selección
  seleccionarProyecto(proyecto: Proyecto): void {
    this.form.patchValue({ idProyecto: proyecto.idProyecto || proyecto.id });
    this.mostrarDropdownProyecto.set(false);
    this.filtroProyecto.set('');
  }

  seleccionarAdministrativo(administrativo: Administrativo): void {
    this.form.patchValue({ idAdmin: administrativo.id });
    this.mostrarDropdownAdministrativo.set(false);
    this.filtroAdministrativo.set('');
  }

  eliminarProyecto(): void {
    this.form.patchValue({ idProyecto: null });
  }

  eliminarAdministrativo(): void {
    this.form.patchValue({ idAdmin: null });
  }

  getProyectoSeleccionado(): Proyecto | null {
    const id = this.form.get('idProyecto')?.value;
    if (!id) return null;
    return this.proyectos().find(p => (p.idProyecto || p.id) === id) || null;
  }

  getAdministrativoSeleccionado(): Administrativo | null {
    const id = this.form.get('idAdmin')?.value;
    if (!id) return null;
    return this.administrativos().find(a => a.id === id) || null;
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
    const proyectoAdministrativoData: ProyectoAdministrativoCreate = {
      idProyecto: formValue.idProyecto,
      idAdmin: formValue.idAdmin,
      rolEnProyecto: formValue.rolEnProyecto || undefined
    };

    this.proyectoAdministrativoService.create(proyectoAdministrativoData).subscribe({
      next: (result) => {
        this.alertService.success('Éxito', 'Proyecto-Administrativo creado exitosamente.');
        setTimeout(() => {
          this.router.navigate(['/proyectos', proyectoAdministrativoData.idProyecto]);
        }, 1500);
      },
      error: (err) => {
        console.error('Error creating proyecto-administrativo:', err);
        const errorMessage = err.error?.message || err.message || 'Error al crear la relación proyecto-administrativo.';
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
      formValue.idAdmin ||
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

