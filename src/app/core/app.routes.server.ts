import { RenderMode, ServerRoute } from '@angular/ssr';

const skipPrerender = async () => {
  // No tenemos parámetros conocidos en build time; devolvemos vacío para omitir el prerender.
  return [];
};

export const serverRoutes: ServerRoute[] = [
  { path: 'proyectos/:id', renderMode: RenderMode.Prerender, getPrerenderParams: skipPrerender },
  { path: 'proyectos/:id/editar', renderMode: RenderMode.Prerender, getPrerenderParams: skipPrerender },
  { path: 'usuarios/editar/:id', renderMode: RenderMode.Prerender, getPrerenderParams: skipPrerender },
  { path: 'personas/:tipo/nuevo', renderMode: RenderMode.Prerender, getPrerenderParams: skipPrerender },
  { path: 'personas/:tipo/:id/editar', renderMode: RenderMode.Prerender, getPrerenderParams: skipPrerender },
  { path: 'actividades/:id', renderMode: RenderMode.Prerender, getPrerenderParams: skipPrerender },
  { path: 'actividades-mensuales/:id/editar', renderMode: RenderMode.Prerender, getPrerenderParams: skipPrerender },
  { path: 'actividades-anuales/:id/editar', renderMode: RenderMode.Prerender, getPrerenderParams: skipPrerender },
  { path: 'actividades-planificadas/:id/editar', renderMode: RenderMode.Prerender, getPrerenderParams: skipPrerender },
  { path: 'actividades-no-planificadas/:id/editar', renderMode: RenderMode.Prerender, getPrerenderParams: skipPrerender },
  { path: 'subactividades/:id', renderMode: RenderMode.Prerender, getPrerenderParams: skipPrerender },
  { path: 'subactividades/:id/editar', renderMode: RenderMode.Prerender, getPrerenderParams: skipPrerender },
  { path: 'participaciones/:id', renderMode: RenderMode.Prerender, getPrerenderParams: skipPrerender },
  { path: 'participaciones/:id/editar', renderMode: RenderMode.Prerender, getPrerenderParams: skipPrerender },
  { path: 'participaciones/equipos/:edicionId', renderMode: RenderMode.Prerender, getPrerenderParams: skipPrerender },
  { path: 'participaciones/equipos/:edicionId/:grupoNumero', renderMode: RenderMode.Prerender, getPrerenderParams: skipPrerender },
  { path: 'evidencias/:id', renderMode: RenderMode.Prerender, getPrerenderParams: skipPrerender },
  { path: 'evidencias/:id/editar', renderMode: RenderMode.Prerender, getPrerenderParams: skipPrerender },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
