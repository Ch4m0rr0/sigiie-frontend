import { Component, inject, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DocumentosDivulgadosService } from '../../core/services/documentos-divulgados.service';
import type { DocumentoDivulgadoCreate } from '../../core/models/documento-divulgado';
import { CatalogosService } from '../../core/services/catalogos.service';
import type { TipoDocumentoDivulgado } from '../../core/models/tipo-documento-divulgado';
import type { Departamento } from '../../core/models/departamento';
import { IconComponent } from '../../shared/icon/icon.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';
import { BrnLabelImports } from '@spartan-ng/brain/label';
import { AlertService } from '../../core/services/alert.service';
import { forkJoin } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-documento-divulgado-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    IconComponent,
    ...BrnButtonImports,
    ...BrnLabelImports
  ],
  templateUrl: './documento-divulgado-form.component.html',
})
export class DocumentoDivulgadoFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private documentosDivulgadosService = inject(DocumentosDivulgadosService);
  private catalogosService = inject(CatalogosService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private alertService = inject(AlertService);

  form!: FormGroup;
  tiposDocumentoDivulgado = signal<TipoDocumentoDivulgado[]>([]);
  departamentos = signal<Departamento[]>([]);
  
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  isEditMode = signal(false);
  documentoId = signal<number | null>(null);
  
  selectedFile = signal<File | null>(null);
  filePreviewUrl = signal<string | null>(null);

  // Señales para controlar visibilidad de dropdowns
  mostrarDropdownTipoDocumento = signal(false);
  mostrarDropdownDepartamento = signal(false);

  // Filtros de búsqueda
  filtroTipoDocumento = signal<string>('');
  filtroDepartamento = signal<string>('');

  ngOnInit(): void {
    this.initializeForm();
    this.loadCatalogos();

    const id = this.route.snapshot.paramMap.get('id');
    const proyectoId = this.route.snapshot.queryParamMap.get('proyectoId');
    
    // Solo cargar documento si el ID es válido y mayor que 0
    if (id && id !== '0' && !isNaN(+id) && +id > 0) {
      this.isEditMode.set(true);
      this.documentoId.set(+id);
      this.loadDocumentoDivulgado(+id);
    }
    
    // Pre-llenar departamento si viene de proyecto
    if (proyectoId) {
      // Aquí podrías cargar el proyecto y pre-llenar el departamento
      // Por ahora solo guardamos el proyectoId si es necesario
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    
    if (!target.closest('.dropdown-tipo-documento')) {
      this.mostrarDropdownTipoDocumento.set(false);
    }
    if (!target.closest('.dropdown-departamento')) {
      this.mostrarDropdownDepartamento.set(false);
    }
  }

  initializeForm(): void {
    this.form = this.fb.group({
      nombreDocumento: ['', [Validators.required, Validators.minLength(3)]],
      idTipoDocumentoDivulgado: [null],
      cantidadEstudiantesParticipantes: [0, [Validators.min(0)]],
      cantidadDocentesParticipantes: [0, [Validators.min(0)]],
      cantidadAdministrativosParticipantes: [0, [Validators.min(0)]],
      participantesDivulgacionCientifica: [0, [Validators.min(0)]],
      cantidadProductos: [0, [Validators.min(0)]],
      linkAcceso: [''],
      departamentoId: [null],
      archivoRespaldo: [null]
    });
  }

  loadCatalogos(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      tiposDocumento: this.catalogosService.getTiposDocumentoDivulgado(),
      departamentos: this.catalogosService.getDepartamentos()
    }).subscribe({
      next: ({ tiposDocumento, departamentos }) => {
        this.tiposDocumentoDivulgado.set(tiposDocumento);
        this.departamentos.set(departamentos);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading catalogos:', err);
        this.error.set('Error al cargar los catálogos. Por favor, intenta nuevamente.');
        this.loading.set(false);
      }
    });
  }

  loadDocumentoDivulgado(id: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.documentosDivulgadosService.getById(id).subscribe({
      next: (documento) => {
        if (documento) {
          this.form.patchValue({
            nombreDocumento: documento.nombreDocumento || '',
            idTipoDocumentoDivulgado: documento.idTipoDocumentoDivulgado || null,
            cantidadEstudiantesParticipantes: documento.cantidadEstudiantesParticipantes || 0,
            cantidadDocentesParticipantes: documento.cantidadDocentesParticipantes || 0,
            cantidadAdministrativosParticipantes: documento.cantidadAdministrativosParticipantes || 0,
            participantesDivulgacionCientifica: documento.participantesDivulgacionCientifica || 0,
            cantidadProductos: documento.cantidadProductos || 0,
            linkAcceso: documento.linkAcceso || '',
            departamentoId: documento.departamentoId || null
          });
        } else {
          this.error.set('Documento divulgado no encontrado');
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading documento divulgado:', err);
        this.error.set('Error al cargar el documento divulgado. Por favor, intenta nuevamente.');
        this.loading.set(false);
      }
    });
  }

  // Métodos para dropdowns
  toggleDropdownTipoDocumento(): void {
    this.mostrarDropdownTipoDocumento.set(!this.mostrarDropdownTipoDocumento());
  }

  toggleDropdownDepartamento(): void {
    this.mostrarDropdownDepartamento.set(!this.mostrarDropdownDepartamento());
  }

  // Filtros
  filtrarTiposDocumento(): TipoDocumentoDivulgado[] {
    const filtro = this.filtroTipoDocumento().toLowerCase();
    if (!filtro) return this.tiposDocumentoDivulgado();
    return this.tiposDocumentoDivulgado().filter(t => 
      (t.nombre || '').toLowerCase().includes(filtro) ||
      (t.descripcion || '').toLowerCase().includes(filtro)
    );
  }

  filtrarDepartamentos(): Departamento[] {
    const filtro = this.filtroDepartamento().toLowerCase();
    if (!filtro) return this.departamentos();
    return this.departamentos().filter(d => 
      (d.nombre || '').toLowerCase().includes(filtro)
    );
  }

  // Selección
  seleccionarTipoDocumento(tipo: TipoDocumentoDivulgado): void {
    this.form.patchValue({ idTipoDocumentoDivulgado: tipo.id });
    this.mostrarDropdownTipoDocumento.set(false);
    this.filtroTipoDocumento.set('');
  }

  seleccionarDepartamento(departamento: Departamento): void {
    this.form.patchValue({ departamentoId: departamento.id });
    this.mostrarDropdownDepartamento.set(false);
    this.filtroDepartamento.set('');
  }

  eliminarTipoDocumento(): void {
    this.form.patchValue({ idTipoDocumentoDivulgado: null });
  }

  eliminarDepartamento(): void {
    this.form.patchValue({ departamentoId: null });
  }

  getTipoDocumentoSeleccionado(): TipoDocumentoDivulgado | null {
    const id = this.form.get('idTipoDocumentoDivulgado')?.value;
    if (!id) return null;
    return this.tiposDocumentoDivulgado().find(t => t.id === id) || null;
  }

  getDepartamentoSeleccionado(): Departamento | null {
    const id = this.form.get('departamentoId')?.value;
    if (!id) return null;
    return this.departamentos().find(d => d.id === id) || null;
  }

  // Manejo de archivos
  onFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      this.selectedFile.set(file);
      this.form.patchValue({ archivoRespaldo: file });
      
      // Crear preview si es imagen
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.filePreviewUrl.set(e.target.result);
        };
        reader.readAsDataURL(file);
      } else {
        this.filePreviewUrl.set(null);
      }
    }
  }

  removeFile(): void {
    this.selectedFile.set(null);
    this.filePreviewUrl.set(null);
    this.form.patchValue({ archivoRespaldo: null });
    // Resetear el input file
    const fileInput = document.getElementById('archivoRespaldo') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.alertService.error('Error de validación', 'Por favor, completa todos los campos requeridos.');
      return;
    }

    const formValue = this.form.value;
    
    // Validar que solo una categoría de participantes tenga valor mayor a 0
    const cantidadEstudiantes = formValue.cantidadEstudiantesParticipantes ? Number(formValue.cantidadEstudiantesParticipantes) : 0;
    const cantidadDocentes = formValue.cantidadDocentesParticipantes ? Number(formValue.cantidadDocentesParticipantes) : 0;
    const cantidadAdministrativos = formValue.cantidadAdministrativosParticipantes ? Number(formValue.cantidadAdministrativosParticipantes) : 0;
    
    const categoriasConValor = [
      cantidadEstudiantes > 0 ? 'Estudiantes' : null,
      cantidadDocentes > 0 ? 'Docentes' : null,
      cantidadAdministrativos > 0 ? 'Administrativos' : null
    ].filter(c => c !== null);
    
    if (categoriasConValor.length > 1) {
      this.alertService.error(
        'Error de validación', 
        'Solo puede existir cantidad de participantes en una categoría: Docentes, Administrativos o Estudiantes. Por favor, seleccione solo una categoría.'
      );
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const documentoData: DocumentoDivulgadoCreate = {
      nombreDocumento: formValue.nombreDocumento || '',
      idTipoDocumentoDivulgado: formValue.idTipoDocumentoDivulgado ? Number(formValue.idTipoDocumentoDivulgado) : undefined,
      cantidadEstudiantesParticipantes: cantidadEstudiantes,
      cantidadDocentesParticipantes: cantidadDocentes,
      cantidadAdministrativosParticipantes: cantidadAdministrativos,
      participantesDivulgacionCientifica: formValue.participantesDivulgacionCientifica ? Number(formValue.participantesDivulgacionCientifica) : 0,
      cantidadProductos: formValue.cantidadProductos ? Number(formValue.cantidadProductos) : 0,
      linkAcceso: formValue.linkAcceso || undefined,
      departamentoId: formValue.departamentoId ? Number(formValue.departamentoId) : undefined,
      archivoRespaldo: formValue.archivoRespaldo || undefined
    };

    if (this.isEditMode() && this.documentoId()) {
      this.documentosDivulgadosService.update(this.documentoId()!, documentoData).subscribe({
        next: (result) => {
          this.alertService.success('Éxito', 'Documento divulgado actualizado exitosamente.');
          const proyectoId = this.route.snapshot.queryParamMap.get('proyectoId');
          if (proyectoId) {
            this.router.navigate(['/proyectos', proyectoId]);
          } else {
            this.router.navigate(['/proyectos']);
          }
        },
        error: (err) => {
          console.error('Error updating documento divulgado:', err);
          const errorMessage = err.error?.message || err.message || 'Error al actualizar el documento divulgado.';
          this.error.set(errorMessage);
          this.alertService.error('Error', errorMessage);
          this.saving.set(false);
        }
      });
    } else {
      this.documentosDivulgadosService.create(documentoData).subscribe({
        next: (result) => {
          this.alertService.success('Éxito', 'Documento divulgado creado exitosamente.');
          const proyectoId = this.route.snapshot.queryParamMap.get('proyectoId');
          if (proyectoId) {
            this.router.navigate(['/proyectos', proyectoId]);
          } else {
            this.router.navigate(['/proyectos']);
          }
        },
        error: (err) => {
          console.error('Error creating documento divulgado:', err);
          let errorMessage = 'Error al crear el documento divulgado.';
          
          if (err.error?.errors) {
            // Errores de validación del backend
            const validationErrors = err.error.errors;
            const errorMessages = Object.keys(validationErrors).map(key => {
              const messages = Array.isArray(validationErrors[key]) 
                ? validationErrors[key].join(', ') 
                : validationErrors[key];
              return `${key}: ${messages}`;
            });
            errorMessage = `Errores de validación:\n${errorMessages.join('\n')}`;
            console.error('Validation errors:', validationErrors);
          } else if (err.error?.message || (typeof err.error === 'string' && err.error.includes('Solo puede existir cantidad de participantes'))) {
            // Extraer el mensaje del error del backend
            const backendMessage = typeof err.error === 'string' 
              ? err.error.split('\n')[0] // Tomar solo la primera línea del error
              : err.error?.message || '';
            errorMessage = backendMessage || 'Solo puede existir cantidad de participantes en una categoría: Docentes, Administrativos o Estudiantes.';
          } else if (err.message) {
            errorMessage = err.message;
          }
          
          this.error.set(errorMessage);
          this.alertService.error('Error', errorMessage);
          this.saving.set(false);
        }
      });
    }
  }

  onCancel(): void {
    const proyectoId = this.route.snapshot.queryParamMap.get('proyectoId');
    if (proyectoId) {
      this.router.navigate(['/proyectos', proyectoId]);
    } else {
      this.router.navigate(['/proyectos']);
    }
  }
}

