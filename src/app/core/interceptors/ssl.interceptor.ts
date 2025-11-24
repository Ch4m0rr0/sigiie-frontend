import { HttpInterceptorFn } from '@angular/common/http';

export const sslInterceptor: HttpInterceptorFn = (req, next) => {
  // Interceptor para logging de requests (opcional)
  console.log(`🌐 HTTP Request: ${req.method} ${req.url}`);
  return next(req);
};
