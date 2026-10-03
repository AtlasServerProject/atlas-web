import { provideHttpClient } from '@angular/common/http';
import { CatalogApiService } from './core/catalog-api.service';
import { AuthService } from './core/auth.service';
import { registerLocaleData } from '@angular/common';
import pt from '@angular/common/locales/pt';
registerLocaleData(pt);
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withInMemoryScrolling, withViewTransitions } from '@angular/router';
import { routes } from './app.routes';
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideAppInitializer(() => {
      const auth = inject(AuthService);
      const catalog = inject(CatalogApiService);
      return auth.initialize().then(() => catalog.refresh());
    }),
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
      withViewTransitions({
        skipInitialTransition: true,
        onViewTransitionCreated: ({ transition, from, to }) => {
          if (
            matchMedia('(prefers-reduced-motion: reduce)').matches ||
            from.firstChild?.routeConfig?.path === to.firstChild?.routeConfig?.path
          )
            transition.skipTransition();
        },
      }),
    ),
  ],
};
