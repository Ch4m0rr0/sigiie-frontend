import { ApplicationConfig, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';

import { routes } from './app.routes';
import { jwtInterceptor } from './interceptors/jwt.interceptor';
import { sslInterceptor } from './interceptors/ssl.interceptor';
import { errorInterceptor } from './interceptors/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([sslInterceptor, jwtInterceptor, errorInterceptor]), 
      withFetch()
    ),
    { provide: LOCALE_ID, useValue: 'es-ES' }
  ],
};
