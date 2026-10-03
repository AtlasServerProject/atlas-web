import { DialogFocusDirective } from '../../shared/effects/dialog-focus.directive';
import { ProductService } from '../../core/product.service';
import { CatalogComponent } from '../../shared/commerce/catalog.component';
import { AuthService } from '../../core/auth.service';
import { PromotionService } from '../../core/promotion.service';
import { CurrencyPipe } from '@angular/common';
import { CountdownComponent } from '../../shared/commerce/countdown.component';
import { Component, inject } from '@angular/core';
@Component({
  selector: 'app-store-page',
  standalone: true,
  imports: [DialogFocusDirective, CatalogComponent, CurrencyPipe, CountdownComponent],
  templateUrl: './store-page.component.html',
  styleUrls: ['./store-page.component.scss'],
})
export class StorePageComponent {
  readonly auth = inject(AuthService);
  readonly promotions = inject(PromotionService);
  readonly products = inject(ProductService);
  get plans() {
    return this.products.plans.flatMap((p, i) => {
      const product = this.products
        .products()
        .find((item) => item.id === i + 1 && item.category === 'VIPs' && item.active);
      return product
        ? [
            {
              ...p,
              name: product.name,
              description: product.description,
              tier: i + 1,
              id: product.id,
              product,
              price: product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            },
          ]
        : [];
    });
  }

  selected = 0;
  enlarged = { src: '', title: '' };
  kitImage(name: string): string {
    const period = name === 'Diário' ? 'diario' : name === 'Semanal' ? 'semanal' : 'mensal';
    const tier =
      this.plans.find((p) => p.tier === this.selected + 1)?.tier ?? this.plans[0]?.tier ?? 1;
    return `/kits/vip-${tier}-${period}.png`;
  }
  openImage(dialog: HTMLDialogElement, name: string): void {
    this.enlarged = { src: this.kitImage(name), title: `${this.plan.name} — Kit ${name}` };
    dialog.showModal();
  }
  get plan() {
    return (
      this.plans.find((p) => p.tier === this.selected + 1) ??
      this.plans[0] ??
      this.products.plans[0]
    );
  }
}
