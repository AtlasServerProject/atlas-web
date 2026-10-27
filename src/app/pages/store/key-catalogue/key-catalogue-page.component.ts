import { Component, computed, effect, inject, OnDestroy, signal } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { KeyCatalogueService, currentCrateMonth } from '../../../core/key-catalogue.service';
import { KeyPokemonViewerComponent } from '../../../shared/cobblemon-model/key-pokemon-viewer.component';
import { CurrencyPipe } from '@angular/common';
import { KEY_PRODUCTS } from '../../../core/key-products';
import { ProductService } from '../../../core/product.service';
import { PromotionService } from '../../../core/promotion.service';
import { AuthService } from '../../../core/auth.service';
import { ProductEditorComponent } from '../../../shared/commerce/product-editor.component';

@Component({
  selector: 'app-key-catalogue-page',
  standalone: true,
  imports: [RouterLink, KeyPokemonViewerComponent, CurrencyPipe, ProductEditorComponent],
  templateUrl: './key-catalogue-page.component.html',
  styleUrl: './key-catalogue-page.component.scss',
})
export class KeyCataloguePageComponent implements OnDestroy {
  readonly auth = inject(AuthService);
  readonly products = inject(ProductService);
  readonly promotions = inject(PromotionService);
  readonly product = computed(() => {
    const definition = KEY_PRODUCTS.find((k) => k.identifier === this.identifier());
    return this.products
      .products()
      .find((p) => p.category === 'Chaves' && p.slug === definition?.slug);
  });
  readonly price = computed(() => {
    const product = this.product();
    return (
      (product
        ? (this.promotions.activeFor(product.id)?.promotionalPrice ?? product.price)
        : undefined) ?? KEY_PRODUCTS.find((k) => k.identifier === this.identifier())?.price
    );
  });
  readonly data = inject(KeyCatalogueService);
  private readonly params = toSignal(inject(ActivatedRoute).paramMap);
  private readonly title = inject(Title);
  readonly query = signal('');
  readonly classification = signal('all');
  readonly paused = signal(false);
  readonly reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  readonly month = signal(currentCrateMonth());
  private readonly clock = setInterval(() => this.month.set(currentCrateMonth()), 30000);
  readonly identifier = computed(() => this.params()?.get('identifier') ?? '');
  readonly crate = computed(() =>
    this.data.catalogue()?.crates.find((c) => c.identifier === this.identifier()),
  );
  readonly stale = computed(
    () => this.crate()?.identifier === 'legendary_monthly' && this.crate()?.period !== this.month(),
  );
  readonly species = computed(() => {
    if (this.stale()) return [];
    const term = this.query()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
    return (this.crate()?.species ?? []).filter(
      (p) =>
        (this.classification() === 'all' || this.classification() === p.classification) &&
        p.name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .includes(term),
    );
  });
  readonly period = computed(() => {
    const period = this.crate()?.period;
    return period
      ? new Intl.DateTimeFormat('pt-BR', {
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        }).format(new Date(period + '-01T12:00:00Z'))
      : '';
  });
  constructor() {
    void this.data.load();
    void this.products.refresh();
    effect(() => {
      this.title.setTitle(`${this.crate()?.name ?? 'Catálogo de chaves'} | Atlas Cobblemon`);
      this.identifier();
      this.query.set('');
      this.classification.set('all');
    });
  }
  search(event: Event) {
    this.query.set((event.target as HTMLInputElement).value);
  }
  async toggleAnimation() {
    this.paused.update((value) => !value);
    const renderer = await import('../../../shared/cobblemon-model/key-renderer');
    renderer.setKeyAnimationsPaused(this.paused());
  }
  ngOnDestroy() {
    clearInterval(this.clock);
    void import('../../../shared/cobblemon-model/key-renderer').then((m) => m.releaseKeyRenderer());
  }
}
