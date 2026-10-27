import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';
import { AuthService } from './auth.service';
import { ClockService } from './clock.service';
import { Product, Promotion } from './models';
import { mockProducts } from './mock-data';
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
  readonly revision = signal(0);
  // Public reference catalog remains readable without the API; never authorizes payment.
  readonly products = signal<Product[]>(mockProducts.map(product => ({ ...product, purchasable: false })));
  readonly available = signal(false);
  readonly promotions = signal<Promotion[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  private flight?: Promise<void>;
  private generation = 0;
  private readonly sessionSubscription = this.auth.sessionChanges.subscribe(() => {
    this.generation++;
    this.flight = undefined;
    this.revision.set(0);
    this.products.set(mockProducts.map(product => ({ ...product, purchasable: false })));
    this.promotions.set([]);
    this.available.set(false);
    this.loading.set(false);
    this.error.set('');
    void this.refresh();
  });
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
    const generation = ++this.generation;
    const session = this.auth.sessionGeneration();
    this.loading.set(true);
    this.flight = (async () => {
      try {
        const before = Date.now();
        const data = await firstValueFrom(
          this.http.get<Snapshot>(
            this.auth.isAdmin() ? '/api/v1/admin/catalog' : '/api/v1/catalog',
            { withCredentials: true },
          ).pipe(timeout(10000)),
        );
        if (generation !== this.generation || session !== this.auth.sessionGeneration()) return;
        if (!Array.isArray(data.products) || !Array.isArray(data.promotions))
          throw new Error('Catálogo indisponível.');
        this.revision.set(data.revision);
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
        this.available.set(true);
      } catch (e) {
        if (generation !== this.generation || session !== this.auth.sessionGeneration()) return;
        if (e instanceof HttpErrorResponse && (e.status === 401 || e.status === 403)) {
          this.auth.expireSession();
          if (e.status === 403) void this.auth.refresh().catch(() => {});
          return;
        }
        this.available.set(false);
        this.error.set('Você pode consultar os preços e benefícios. O pagamento está temporariamente indisponível; os valores exibidos são de referência e serão confirmados quando o serviço voltar.');
      } finally {
        if (generation === this.generation) {
          this.loading.set(false);
          this.flight = undefined;
        }
      }
    })();
    return this.flight;
  }
  async mutate<T>(method: 'POST' | 'PATCH', path: string, body: unknown, retried = false): Promise<T> {
    const session = this.auth.sessionGeneration();
    if (!this.auth.isAdmin()) throw new Error('Acesso não autorizado.');
    try {
      const csrf = await firstValueFrom(
        this.http.get<{ token: string; headerName: string }>('/api/v1/auth/csrf', {
          withCredentials: true,
        }),
      );
      if (session !== this.auth.sessionGeneration() || !this.auth.isAdmin()) throw new Error('Sua sessão mudou.');
      const result = await firstValueFrom(
        this.http.request<T>(method, '/api/v1/admin/' + path, {
          body,
          withCredentials: true,
          headers: { [csrf.headerName]: csrf.token },
        }),
      );
      if (session !== this.auth.sessionGeneration()) throw new Error('Sua sessão mudou.');
      await this.refresh();
      return result;
    } catch (e) {
      if (session !== this.auth.sessionGeneration()) throw new Error('Sua sessão mudou.');
      if (!retried && e instanceof HttpErrorResponse && e.status === 403 && e.error?.code === 'REAUTHENTICATION_REQUIRED') {
        await this.auth.requestReauthentication();
        if (session !== this.auth.sessionGeneration()) throw new Error('Sua sessão mudou.');
        return this.mutate<T>(method, path, body, true);
      }
      if (e instanceof HttpErrorResponse && e.status === 401) this.auth.expireSession();
      if (e instanceof HttpErrorResponse && e.status === 409) await this.refresh();
      throw new Error(
        e instanceof HttpErrorResponse && typeof e.error?.message === 'string'
          ? e.error.message
          : 'Não foi possível salvar. Tente novamente.',
      );
    }
  }
  ngOnDestroy() {
    this.sessionSubscription.unsubscribe();
    clearInterval(this.timer);
    document.removeEventListener('visibilitychange', this.visible);
  }
}
