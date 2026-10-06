import { Component, computed, effect, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { toSignal } from '@angular/core/rxjs-interop';
import { ProductService } from '../../core/product.service';
import { PromotionService } from '../../core/promotion.service';
import { SiteSettings } from '../../shared/site-settings.service';
import { CheckoutComponent } from '../../shared/commerce/checkout.component';
import { CountdownComponent } from '../../shared/commerce/countdown.component';
import { DialogFocusDirective } from '../../shared/effects/dialog-focus.directive';

@Component({
  selector: 'app-vip-detail-page',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, CheckoutComponent, CountdownComponent, DialogFocusDirective],
  templateUrl: './vip-detail-page.component.html',
  styleUrl: './vip-detail-page.component.scss',
})
export class VipDetailPageComponent {
  readonly products = inject(ProductService);
  readonly promotions = inject(PromotionService);
  readonly settings = inject(SiteSettings);
  private readonly title = inject(Title);
  private readonly params = toSignal(inject(ActivatedRoute).paramMap);
  readonly tier = computed(() => {
    const match = /^vip-([123])$/.exec(this.params()?.get('slug') ?? '');
    return match ? Number(match[1]) : 0;
  });
  readonly plan = computed(() => this.products.plans[this.tier() - 1]);
  // Atlas docs: HOME-SYSTEM.md, CLAIMS.md and releases 1.29.3/6/8, 1.30.2/3.
  readonly advantages = computed(() => ({
    homes: [5, 8, 12][this.tier() - 1],
    homeCooldown: [15, 10, 5][this.tier() - 1],
    claimArea: [20000, 30000, 50000][this.tier() - 1]?.toLocaleString('pt-BR'),
  }));
  readonly plannedCommands = [
    { command: '/craft', description: 'Abrir a mesa de trabalho de onde estiver.' },
    { command: '/trash', description: 'Abrir uma lixeira para descartar itens.' },
    { command: '/repair', description: 'Reparar ferramentas.' },
    { command: '/pc', description: 'Acessar o PC de Pokémon remotamente.' },
    { command: '/pokeheal', description: 'Curar os Pokémon da sua equipe.' },
    { command: '/hatch', description: 'Facilitar a eclosão de ovos.' },
    { command: '/warp vip', description: 'Acessar uma área exclusiva para VIPs.' },
    { command: '/lojas', description: 'Acessar lojas de jogadores e os recursos de loja VIP.' },
    { command: '/pokecolor', description: 'Personalizar a cor dos nomes dos seus Pokémon.' },
    { command: '/setcolor', description: 'Escolher a cor das suas mensagens no chat por comando.' },
    { command: '/nick', description: 'Personalizar seu apelido no servidor.' },
    { command: '/hat', description: 'Usar um item como chapéu.' },
  ];
  readonly product = computed(() =>
    this.products.products().find((p) => p.id === this.tier() && p.category === 'VIPs' && p.active),
  );
  readonly included = computed(() =>
    this.products.plans.slice(0, this.tier()).map((plan, i) => ({ ...plan, tier: i + 1 })),
  );
  enlarged = { src: '', title: '' };
  constructor() {
    effect(() =>
      this.title.setTitle(`${this.plan()?.name ?? 'VIP não encontrado'} | Atlas Cobblemon`),
    );
  }
  image(tier: number, index: number) {
    return `/kits/vip-${tier}-${['diario', 'semanal', 'mensal'][index]}.png`;
  }
  kitCommand(tier: number, index: number) {
    return `/kit vip${tier}${['diario', 'semanal', 'mensal'][index]}`;
  }
  enlarge(dialog: HTMLDialogElement, tier: number, index: number, name: string) {
    this.enlarged = { src: this.image(tier, index), title: `VIP ${tier} — Kit ${name}` };
    dialog.showModal();
  }
}
