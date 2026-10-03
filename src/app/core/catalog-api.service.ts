import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { ClockService } from './clock.service';
import { Product, Promotion } from './models';
interface Snapshot {
  serverTime: string;
  revision: number;
  products: (Omit<Product, 'price'> & { priceCents: number })[];
  promotions: (Omit<Promotion, 'originalPrice' | 'promotionalPrice'> & {
    originalCents: number;
    finalCents: number;
  })[];
}
@Injectable({ providedIn: 'root' })
export class CatalogApiService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly clock = inject(ClockService);
  readonly products = signal<Product[]>([]);
  readonly promotions = signal<Promotion[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  private flight?: Promise<void>;
  private readonly timer = setInterval(() => {
    void this.refresh();
  }, 15000);
  private readonly visible = () => {
    if (document.visibilityState === 'visible') void this.refresh();
  };
  constructor() {
    document.addEventListener('visibilitychange', this.visible);
  }
  async refresh(): Promise<void> {
    if (this.flight) return this.flight;
    this.loading.set(true);
    this.flight = (async () => {
      try {
        const before = Date.now();
        const data = await firstValueFrom(
          this.http.get<Snapshot>(
            this.auth.isAdmin() ? '/api/v1/admin/catalog' : '/api/v1/catalog',
            { withCredentials: true },
          ),
        );
        if (!Array.isArray(data.products) || !Array.isArray(data.promotions))
          throw new Error('Catálogo indisponível.');
        this.clock.synchronize(data.serverTime, before);
        this.products.set(data.products.map((p) => ({ ...p, price: p.priceCents / 100 })));
        this.promotions.set(
          data.promotions.map((p) => ({
            ...p,
            originalPrice:
              (data.products.find((x) => x.id === p.productId)?.priceCents ?? p.originalCents) /
              100,
            promotionalPrice: p.finalCents / 100,
          })),
        );
        this.error.set('');
      } catch {
        this.error.set('Não foi possível atualizar o catálogo. Tente novamente.');
      } finally {
        this.loading.set(false);
        this.flight = undefined;
      }
    })();
    return this.flight;
  }
  async mutate<T>(method: 'POST' | 'PATCH', path: string, body: unknown): Promise<T> {
    try {
      const csrf = await firstValueFrom(
        this.http.get<{ token: string; headerName: string }>('/api/v1/auth/csrf', {
          withCredentials: true,
        }),
      );
      const result = await firstValueFrom(
        this.http.request<T>(method, '/api/v1/admin/' + path, {
          body,
          withCredentials: true,
          headers: { [csrf.headerName]: csrf.token },
        }),
      );
      await this.refresh();
      return result;
    } catch (e) {
      if (e instanceof HttpErrorResponse && e.status === 409) await this.refresh();
      throw new Error(
        e instanceof HttpErrorResponse && typeof e.error?.message === 'string'
          ? e.error.message
          : 'Não foi possível salvar. Tente novamente.',
      );
    }
  }
  ngOnDestroy() {
    clearInterval(this.timer);
    document.removeEventListener('visibilitychange', this.visible);
  }
}
