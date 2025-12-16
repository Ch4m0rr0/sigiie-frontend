import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SubactividadService } from '../../core/services/subactividad.service';
import { ParticipacionService } from '../../core/services/participacion.service';
import { EvidenciaService } from '../../core/services/evidencia.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import { ActividadAnualService } from '../../core/services/actividad-anual.service';
import { ActividadMensualInstService } from '../../core/services/actividad-mensual-inst.service';
import { IndicadorService } from '../../core/services/indicador.service';
import { SubactividadResponsableService, type SubactividadResponsable } from '../../core/services/subactividad-responsable.service';
import { firstValueFrom } from 'rxjs';
import type { Subactividad } from '../../core/models/subactividad';
import type { ActividadAnual } from '../../core/models/actividad-anual';
import type { ActividadMensualInst } from '../../core/models/actividad-mensual-inst';
import type { Indicador } from '../../core/models/indicador';
import { IconComponent } from '../../shared/icon/icon.component';
import { SkeletonCardComponent } from '../../shared/skeleton/skeleton-card.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';

@Component({
  standalone: true,
  selector: 'app-subactividad-detail',
  imports: [CommonModule, RouterModule, IconComponent, SkeletonCardComponent, ...BrnButtonImports],
  templateUrl: './subactividad-detail.component.html',
})
export class SubactividadDetailComponent implements OnInit {
  private subactividadService = inject(SubactividadService);
  private participacionService = inject(ParticipacionService);
  private evidenciaService = inject(EvidenciaService);
  private catalogosService = inject(CatalogosService);
  private actividadAnualService = inject(ActividadAnualService);
  private actividadMensualInstService = inject(ActividadMensualInstService);
  private indicadorService = inject(IndicadorService);
  private responsableService = inject(SubactividadResponsableService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  subactividad = signal<Subactividad | null>(null);
  participaciones = signal<any[]>([]);
  evidencias = signal<any[]>([]);
  responsables = signal<SubactividadResponsable[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  activeTab = signal<'info' | 'participantes' | 'evidencias'>('info');

  // Catálogos
  tiposProtagonista = signal<any[]>([]);
  tiposEvidencia = signal<any[]>([]);
  estadosActividad = signal<any[]>([]);
  todosLosDepartamentos = signal<any[]>([]);
  actividadesAnuales = signal<ActividadAnual[]>([]);
  actividadesMensuales = signal<ActividadMensualInst[]>([]);
  indicadores = signal<Indicador[]>([]);
  capacidadesInstaladas = signal<any[]>([]);

  // Signals para controlar el estado de las secciones
  seccionPlanificacionExpandida = signal(true);
  seccionInformacionExpandida = signal(true);
  seccionResponsablesExpandida = signal(true);
  editandoEstado = signal(false);
  guardandoEstado = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadSubactividad(+id);
      this.loadParticipaciones(+id);
      this.loadEvidencias(+id);
      this.loadCatalogos();
    }
  }

  loadCatalogos(): void {
    this.loadTiposProtagonista();
    this.loadTiposEvidencia();
    this.loadEstadosActividad();
    this.loadDepartamentos();
    this.loadCapacidadesInstaladas();
  }

  loadTiposProtagonista(): void {
    this.catalogosService.getTiposProtagonista().subscribe({
      next: (data) => {
        this.tiposProtagonista.set(data.filter(t => t.activo !== false));
      },
      error: (err) => {
        console.error('Error loading tipos protagonista:', err);
      }
    });
  }

  loadTiposEvidencia(): void {
    this.catalogosService.getTiposEvidencia().subscribe({
      next: (data) => {
        this.tiposEvidencia.set(data || []);
      },
      error: (err) => {
        console.error('Error loading tipos evidencia:', err);
        this.tiposEvidencia.set([]);
      }
    });
  }

  loadEstadosActividad(): void {
    this.catalogosService.getEstadosActividad().subscribe({
      next: (data) => {
        this.estadosActividad.set(data || []);
      },
      error: (err) => {
        console.error('Error loading estados actividad:', err);
        this.estadosActividad.set([]);
      }
    });
  }

  loadDepartamentos(): void {
    this.catalogosService.getDepartamentos().subscribe({
      next: (data) => {
        this.todosLosDepartamentos.set(data);
      },
      error: (err) => {
        console.error('Error loading departamentos:', err);
      }
    });
  }

  loadCapacidadesInstaladas(): void {
    this.catalogosService.getCapacidadesInstaladas().subscribe({
      next: (data) => {
        this.capacidadesInstaladas.set(data);
      },
      error: (err) => {
        console.error('Error loading capacidades instaladas:', err);
        this.capacidadesInstaladas.set([]);
      }
    });
  }

  loadResponsables(id: number): void {
    this.responsableService.getBySubactividad(id).subscribe({
      next: (data) => {
        this.responsables.set(data || []);
      },
      error: (err) => {
        console.error('Error loading responsables:', err);
        this.responsables.set([]);
      }
    });
  }

  loadSubactividad(id: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.subactividadService.getById(id).subscribe({
      next: (data) => {
        console.log('🔍 [SubactividadDetail] Datos recibidos del backend:', {
          'Datos completos': data,
          'organizador': data.organizador,
          'ubicacion': data.ubicacion,
          'cantidadParticipantesProyectados': data.cantidadParticipantesProyectados,
          'cantidadParticipantesEstudiantesProyectados': data.cantidadParticipantesEstudiantesProyectados,
          'cantidadTotalParticipantesProtagonistas': data.cantidadTotalParticipantesProtagonistas,
          'departamentoResponsableId': data.departamentoResponsableId,
          'idTipoProtagonista': data.idTipoProtagonista,
          'idTiposProtagonistas': (data as any).idTiposProtagonistas,
          'idDepartamentosResponsables': (data as any).idDepartamentosResponsables,
          'Todas las propiedades': Object.keys(data)
        });
        
        this.subactividad.set(data);
        this.loading.set(false);
        
        console.log('✅ [SubactividadDetail] Subactividad cargada en signal:', {
          'organizador': this.subactividad()?.organizador,
          'ubicacion': this.subactividad()?.ubicacion,
          'cantidadParticipantesProyectados': this.subactividad()?.cantidadParticipantesProyectados
        });
        
        // Cargar datos relacionados después de cargar la subactividad
        this.loadActividadesAnuales();
        this.loadActividadesMensuales();
        this.loadResponsables(id);
        if (data.idIndicador) {
          this.loadIndicador(data.idIndicador);
        }
      },
      error: (err) => {
        console.error('❌ [SubactividadDetail] Error loading subactividad:', err);
        this.error.set('Error al cargar la subactividad');
        this.loading.set(false);
      }
    });
  }

  loadActividadesAnuales(): void {
    const subactividad = this.subactividad();
    if (!subactividad || !subactividad.idActividadAnual) return;

    const ids = Array.isArray(subactividad.idActividadAnual) 
      ? subactividad.idActividadAnual 
      : [subactividad.idActividadAnual];

    if (ids.length === 0) return;

    const requests = ids
      .filter(id => id != null && id > 0)
      .map(id => this.actividadAnualService.getById(id));

    if (requests.length > 0) {
      Promise.all(requests.map(req => firstValueFrom(req))).then(actividadesAnuales => {
        const actividadesValidas = actividadesAnuales.filter(a => a !== null && a !== undefined);
        this.actividadesAnuales.set(actividadesValidas);
      }).catch(err => {
        console.error('Error loading actividades anuales:', err);
      });
    }
  }

  loadActividadesMensuales(): void {
    const subactividad = this.subactividad();
    if (!subactividad || !subactividad.idActividadMensualInst) return;

    const ids = Array.isArray(subactividad.idActividadMensualInst) 
      ? subactividad.idActividadMensualInst 
      : [subactividad.idActividadMensualInst];

    if (ids.length === 0) return;

    const requests = ids
      .filter(id => id != null && id > 0)
      .map(id => this.actividadMensualInstService.getById(id));

    if (requests.length > 0) {
      Promise.all(requests.map(req => firstValueFrom(req))).then(actividadesMensuales => {
        const actividadesValidas = actividadesMensuales.filter(a => a !== null && a !== undefined);
        this.actividadesMensuales.set(actividadesValidas);
      }).catch(err => {
        console.error('Error loading actividades mensuales:', err);
      });
    }
  }

  loadIndicador(id: number): void {
    this.indicadorService.getById(id).subscribe({
      next: (data) => {
        if (data) {
          this.indicadores.set([data]);
        }
      },
      error: (err) => {
        console.error('Error loading indicador:', err);
      }
    });
  }

  loadParticipaciones(id: number): void {
    this.participacionService.getBySubactividad(id).subscribe({
      next: (data) => this.participaciones.set(data),
      error: (err) => console.error('Error loading participaciones:', err)
    });
  }

  loadEvidencias(id: number): void {
    this.evidenciaService.getBySubactividad(id).subscribe({
      next: (data) => this.evidencias.set(data),
      error: (err) => console.error('Error loading evidencias:', err)
    });
  }

  navigateToEdit(): void {
    const id = this.subactividad()?.idSubactividad;
    if (id) {
      this.router.navigate(['/subactividades', id, 'editar']);
    }
  }

  onDelete(): void {
    const id = this.subactividad()?.idSubactividad;
    if (id && confirm('¿Está seguro de que desea eliminar esta subactividad?')) {
      this.subactividadService.delete(id).subscribe({
        next: () => this.router.navigate(['/subactividades']),
        error: (err) => {
          console.error('Error deleting subactividad:', err);
          this.error.set('Error al eliminar la subactividad');
        }
      });
    }
  }

  setTab(tab: 'info' | 'participantes' | 'evidencias'): void {
    this.activeTab.set(tab);
  }

  toggleSeccionPlanificacion(): void {
    this.seccionPlanificacionExpandida.update(v => !v);
  }

  toggleSeccionInformacion(): void {
    this.seccionInformacionExpandida.update(v => !v);
  }

  toggleSeccionResponsables(): void {
    this.seccionResponsablesExpandida.update(v => !v);
  }

  onEstadoChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const nuevoEstadoId = select.value ? Number(select.value) : undefined;
    const subactividad = this.subactividad();
    
    if (!subactividad || !subactividad.idSubactividad) return;
    
    this.guardandoEstado.set(true);
    
    // Actualizar el estado en el backend
    this.subactividadService.update(subactividad.idSubactividad, {
      nombre: subactividad.nombre || subactividad.nombreSubactividad || '',
      idEstadoActividad: nuevoEstadoId
    }).subscribe({
      next: () => {
        // Recargar la subactividad para obtener los datos actualizados
        this.loadSubactividad(subactividad.idSubactividad);
        this.editandoEstado.set(false);
        this.guardandoEstado.set(false);
        console.log('✅ Estado de subactividad actualizado correctamente');
      },
      error: (err) => {
        console.error('Error actualizando estado:', err);
        this.guardandoEstado.set(false);
        // Revertir el cambio en el select
        select.value = subactividad.idEstadoActividad?.toString() || '';
        alert('Error al actualizar el estado de la subactividad');
      }
    });
  }

  getCantidadTotalParticipantesProtagonistas(): number {
    const subactividad = this.subactividad();
    if (!subactividad) return 0;
    return subactividad.cantidadTotalParticipantesProtagonistas || 0;
  }

  // Métodos helper para obtener arrays de datos
  getProtagonistasArray(): any[] {
    const subactividad = this.subactividad();
    if (!subactividad) return [];
    
    const subactividadData = subactividad as any;
    const idsSet = new Set<number>();
    
    // Buscar en diferentes formatos (igual que actividades)
    // IMPORTANTE: Verificar TODOS los formatos, no solo el primero (usar if en lugar de else if)
    
    // Formato 1: idTiposProtagonistas (array, plural) - formato preferido
    if (subactividadData.idTiposProtagonistas && Array.isArray(subactividadData.idTiposProtagonistas)) {
      subactividadData.idTiposProtagonistas.forEach((id: any) => {
        const numId = Number(id);
        if (numId > 0) idsSet.add(numId);
      });
    }
    
    // Formato 2: IdTiposProtagonistas (array, PascalCase)
    if (subactividadData.IdTiposProtagonistas && Array.isArray(subactividadData.IdTiposProtagonistas)) {
      subactividadData.IdTiposProtagonistas.forEach((id: any) => {
        const numId = Number(id);
        if (numId > 0) idsSet.add(numId);
      });
    }
    
    // Formato 3: idTipoProtagonista (single o array, legacy)
    if (subactividad.idTipoProtagonista) {
      const ids = Array.isArray(subactividad.idTipoProtagonista) 
        ? subactividad.idTipoProtagonista
        : [subactividad.idTipoProtagonista];
      ids.forEach((id: any) => {
        const numId = Number(id);
        if (numId > 0) idsSet.add(numId);
      });
    }
    
    // Formato 4: IdTipoProtagonista (single, PascalCase, legacy)
    if (subactividadData.IdTipoProtagonista) {
      const numId = Number(subactividadData.IdTipoProtagonista);
      if (numId > 0) idsSet.add(numId);
    }
    
    // Formato 5: tiposProtagonistas (array de objetos)
    if (subactividadData.tiposProtagonistas && Array.isArray(subactividadData.tiposProtagonistas)) {
      subactividadData.tiposProtagonistas.forEach((tipo: any) => {
        const id = tipo.id || tipo.idTipoProtagonista || tipo.Id || tipo.IdTipoProtagonista;
        if (id) {
          const numId = Number(id);
          if (numId > 0) idsSet.add(numId);
        }
      });
    }
    
    // Formato 6: TiposProtagonistas (array de objetos, PascalCase)
    if (subactividadData.TiposProtagonistas && Array.isArray(subactividadData.TiposProtagonistas)) {
      subactividadData.TiposProtagonistas.forEach((tipo: any) => {
        const id = tipo.id || tipo.idTipoProtagonista || tipo.Id || tipo.IdTipoProtagonista;
        if (id) {
          const numId = Number(id);
          if (numId > 0) idsSet.add(numId);
        }
      });
    }
    
    if (idsSet.size === 0) return [];
    
    const ids = Array.from(idsSet);
    console.log('🔍 [getProtagonistasArray] IDs encontrados:', ids);
    
    return ids.map(id => {
      const tipo = this.tiposProtagonista().find(t => {
        const tId = t.id || t.idTipoProtagonista;
        return Number(tId) === id;
      });
      return tipo || { id, nombre: `ID: ${id}` };
    }).filter(t => t);
  }

  getTiposEvidenciaArray(): any[] {
    const subactividad = this.subactividad();
    if (!subactividad || !subactividad.idTipoEvidencias) return [];

    const ids = Array.isArray(subactividad.idTipoEvidencias) 
      ? subactividad.idTipoEvidencias 
      : [subactividad.idTipoEvidencias];

    return ids.map((id: number) => {
      const tipo = this.tiposEvidencia().find(t => {
        const tId = t.idTipoEvidencia || t.id || t.IdTipoEvidencia || t.Id;
        return Number(tId) === Number(id);
      });
      return tipo || { id, nombre: `ID: ${id}` };
    }).filter(t => t);
  }

  getDepartamentosResponsablesArray(): any[] {
    const subactividad = this.subactividad();
    if (!subactividad) return [];
    
    const deptos: any[] = [];
    const subactividadData = subactividad as any;
    const idsDepartamentosSet = new Set<number>();
    
    // Agregar departamento principal si existe
    if (subactividad.departamentoId) {
      const deptId = Number(subactividad.departamentoId);
      if (deptId > 0 && !idsDepartamentosSet.has(deptId)) {
        idsDepartamentosSet.add(deptId);
      }
    }
    
    // Buscar departamentos responsables en diferentes formatos (igual que actividades)
    // IMPORTANTE: Verificar TODOS los formatos, no solo el primero (usar if en lugar de else if)
    
    // Formato 1: idDepartamentosResponsables (array)
    if (subactividadData.idDepartamentosResponsables && Array.isArray(subactividadData.idDepartamentosResponsables)) {
      subactividadData.idDepartamentosResponsables.forEach((id: any) => {
        const numId = Number(id);
        if (numId > 0 && !idsDepartamentosSet.has(numId)) {
          idsDepartamentosSet.add(numId);
        }
      });
    }
    
    // Formato 2: IdDepartamentosResponsables (array, PascalCase)
    if (subactividadData.IdDepartamentosResponsables && Array.isArray(subactividadData.IdDepartamentosResponsables)) {
      subactividadData.IdDepartamentosResponsables.forEach((id: any) => {
        const numId = Number(id);
        if (numId > 0 && !idsDepartamentosSet.has(numId)) {
          idsDepartamentosSet.add(numId);
        }
      });
    }
    
    // Formato 3: departamentoResponsableId (single o array)
    if (subactividad.departamentoResponsableId) {
      const ids = Array.isArray(subactividad.departamentoResponsableId) 
        ? subactividad.departamentoResponsableId
        : [subactividad.departamentoResponsableId];
      ids.forEach((id: any) => {
        const numId = Number(id);
        if (numId > 0 && !idsDepartamentosSet.has(numId)) {
          idsDepartamentosSet.add(numId);
        }
      });
    }
    
    // Formato 4: DepartamentoResponsableId (single o array, PascalCase)
    if (subactividadData.DepartamentoResponsableId) {
      const ids = Array.isArray(subactividadData.DepartamentoResponsableId) 
        ? subactividadData.DepartamentoResponsableId
        : [subactividadData.DepartamentoResponsableId];
      ids.forEach((id: any) => {
        const numId = Number(id);
        if (numId > 0 && !idsDepartamentosSet.has(numId)) {
          idsDepartamentosSet.add(numId);
        }
      });
    }
    
    // Formato 5: departamentosResponsables (array de objetos)
    if (subactividadData.departamentosResponsables && Array.isArray(subactividadData.departamentosResponsables)) {
      subactividadData.departamentosResponsables.forEach((dept: any) => {
        const id = dept.id || dept.idDepartamento || dept.Id || dept.IdDepartamento;
        if (id) {
          const numId = Number(id);
          if (numId > 0 && !idsDepartamentosSet.has(numId)) {
            idsDepartamentosSet.add(numId);
          }
        }
      });
    }
    
    // Formato 6: DepartamentosResponsables (array de objetos, PascalCase)
    if (subactividadData.DepartamentosResponsables && Array.isArray(subactividadData.DepartamentosResponsables)) {
      subactividadData.DepartamentosResponsables.forEach((dept: any) => {
        const id = dept.id || dept.idDepartamento || dept.Id || dept.IdDepartamento;
        if (id) {
          const numId = Number(id);
          if (numId > 0 && !idsDepartamentosSet.has(numId)) {
            idsDepartamentosSet.add(numId);
          }
        }
      });
    }
    
    // Formato 7: nombreDepartamentoResponsable (si hay nombre pero no ID, buscar por nombre)
    if (subactividadData.nombreDepartamentoResponsable) {
      const nombres = Array.isArray(subactividadData.nombreDepartamentoResponsable)
        ? subactividadData.nombreDepartamentoResponsable
        : [subactividadData.nombreDepartamentoResponsable];
      
      nombres.forEach((nombre: string) => {
        if (nombre && nombre.trim()) {
          const dept = this.todosLosDepartamentos().find(d => 
            d.nombre?.toLowerCase() === nombre.toLowerCase() || 
            d.Nombre?.toLowerCase() === nombre.toLowerCase()
          );
          if (dept) {
            const deptId = Number(dept.id || dept.idDepartamento);
            if (deptId > 0 && !idsDepartamentosSet.has(deptId)) {
              idsDepartamentosSet.add(deptId);
            }
          }
        }
      });
    }
    
    // Mapear todos los IDs encontrados a departamentos
    idsDepartamentosSet.forEach(id => {
      const dept = this.todosLosDepartamentos().find(d => {
        const dId = Number(d.id || d.idDepartamento);
        return dId === id;
      });
      if (dept) {
        const deptId = Number(dept.id || dept.idDepartamento);
        if (!deptos.find(d => Number(d.id) === deptId)) {
          deptos.push({
            id: deptId,
            nombre: dept.nombre || dept.Nombre
          });
        }
      } else if (subactividad.nombreDepartamentoResponsable && !deptos.find(d => d.nombre === subactividad.nombreDepartamentoResponsable)) {
        // Si no se encuentra el departamento en el catálogo, usar el nombre del backend
        deptos.push({
          id: id,
          nombre: subactividad.nombreDepartamentoResponsable
        });
      }
    });

    console.log('🔍 [getDepartamentosResponsablesArray] IDs encontrados:', Array.from(idsDepartamentosSet), 'Departamentos mapeados:', deptos);

    return deptos;
  }

  getActividadesAnualesSeleccionadas(): ActividadAnual[] {
    return this.actividadesAnuales();
  }

  // Método para obtener la ubicación desde idCapacidadInstalada (Local Principal)
  getUbicacion(): string | null {
    const subactividad = this.subactividad();
    if (!subactividad || !subactividad.idCapacidadInstalada) return null;

    const capacidad = this.capacidadesInstaladas().find(c => {
      const cId = Number(c.id);
      const sId = Number(subactividad.idCapacidadInstalada);
      return cId === sId;
    });

    return capacidad?.nombre || null;
  }

  // Método para obtener el organizador desde los responsables
  // Nota: Si el backend no devuelve el rol en SubactividadResponsable,
  // este método retornará todos los responsables. El backend debería
  // incluir información de rol si se necesita filtrar por "Organizador"
  getOrganizadores(): string[] {
    const responsables = this.responsables();
    if (!responsables || responsables.length === 0) return [];

    // Por ahora, retornamos todos los responsables ya que el modelo
    // SubactividadResponsable no incluye información de rol
    // TODO: Si el backend agrega rolResponsable o nombreRolResponsable,
    // filtrar por rol "Organizador" aquí
    const nombres = responsables
      .map(resp => this.getNombreResponsable(resp))
      .filter(nombre => nombre && nombre.trim() !== '' && nombre !== 'Sin nombre');

    return nombres;
  }

  // Método para obtener el nombre del responsable
  getNombreResponsable(resp: SubactividadResponsable): string {
    // Buscar nombre en todos los campos posibles según el tipo de responsable
    // Prioridad según los campos que vienen del backend
    return resp.nombreResponsable ||
           resp.nombrePersona ||
           resp.nombreUsuario ||      // Para usuarios
           resp.nombreDocente ||      // Para docentes
           resp.nombreAdmin ||        // Para administrativos
           resp.nombreAdministrativo || // Para administrativos (legacy)
           resp.nombreEstudiante ||   // Para estudiantes
           resp.nombreResponsableExterno || // Para responsables externos
           `Responsable ${resp.idSubactividadResponsable}`;
  }

  // Método para obtener el cargo/rol del responsable
  getCargoResponsable(resp: SubactividadResponsable): string {
    // Prioridad 1: Usar el campo 'cargo' que viene directamente del backend
    if (resp.cargo) {
      return resp.cargo;
    }
    
    // Prioridad 2: Si es responsable externo, usar su cargo específico
    if (resp.cargoResponsableExterno) {
      return resp.cargoResponsableExterno;
    }
    
    // Prioridad 3: Usar rolResponsable o nombreRolResponsable
    if (resp.rolResponsable) {
      return resp.rolResponsable;
    }
    if (resp.nombreRolResponsable) {
      return resp.nombreRolResponsable;
    }
    
    // Prioridad 4: Inferir el cargo según el tipo de responsable
    if (resp.idDocente || resp.nombreDocente) {
      return 'Docente';
    }
    if (resp.idUsuario || resp.nombreUsuario) {
      return 'Usuario';
    }
    if (resp.idAdmin || resp.nombreAdmin || resp.nombreAdministrativo) {
      return 'Administrativo';
    }
    if (resp.idEstudiante || resp.nombreEstudiante) {
      return 'Estudiante';
    }
    if (resp.idResponsableExterno || resp.nombreResponsableExterno) {
      return 'Responsable Externo';
    }
    
    return 'Sin cargo asignado';
  }

  getActividadesMensualesSeleccionadas(): ActividadMensualInst[] {
    return this.actividadesMensuales();
  }

  getIndicador(): Indicador | null {
    const indicadores = this.indicadores();
    return indicadores.length > 0 ? indicadores[0] : null;
  }

  // Método para determinar si hay datos de planificación (indicador, actividad anual o mensual)
  tieneDatosPlanificacion(): boolean {
    const subactividad = this.subactividad();
    if (!subactividad) return false;
    
    const tieneIndicador = subactividad.idIndicador !== null && subactividad.idIndicador !== undefined;
    const tieneActividadAnual = subactividad.idActividadAnual !== null && subactividad.idActividadAnual !== undefined;
    const tieneActividadMensual = subactividad.idActividadMensualInst !== null && subactividad.idActividadMensualInst !== undefined;
    
    // Verificar si hay arrays con elementos
    const actividadesAnualesArray = Array.isArray(subactividad.idActividadAnual) 
      ? subactividad.idActividadAnual 
      : (subactividad.idActividadAnual ? [subactividad.idActividadAnual] : []);
    const actividadesMensualesArray = Array.isArray(subactividad.idActividadMensualInst) 
      ? subactividad.idActividadMensualInst 
      : (subactividad.idActividadMensualInst ? [subactividad.idActividadMensualInst] : []);
    
    return tieneIndicador || actividadesAnualesArray.length > 0 || actividadesMensualesArray.length > 0;
  }

  convertir24hA12h(hora?: string): string {
    if (!hora) return 'Sin hora';
    try {
      const [horas, minutos] = hora.split(':');
      const h = parseInt(horas, 10);
      const m = minutos || '00';
      const periodo = h >= 12 ? 'PM' : 'AM';
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return `${h12}:${m} ${periodo}`;
    } catch {
      return hora;
    }
  }
}

