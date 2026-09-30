import { Component } from '@angular/core';
@Component({
  selector: 'app-store-page',
  standalone: true,
  templateUrl: './store-page.component.html',
  styleUrls: ['./store-page.component.scss'],
})
export class StorePageComponent {
  readonly plans = [
    {
      name: 'VIP 1',
      price: 'R$ 25,00',
      rank: 'VIP',
      description: 'O primeiro passo para sua jornada.',
      kits: [
        {
          name: 'Diário',
          cooldown: '24 horas',
          items: [
            '24 Poké Bolas',
            '16 Super Bolas',
            '8 Ultra Bolas',
            '2 Doces Raros',
            '2 Exp. Candy M',
            '2 Revives',
          ],
        },
        {
          name: 'Semanal',
          cooldown: '7 dias',
          items: [
            '32 Poké Bolas',
            '16 Super Bolas',
            '8 Ultra Bolas',
            '12 Doces Raros',
            '8 Exp. Candy L',
            '5 Revives',
            '1 Mint aleatória',
            '1 Pedra de Evolução aleatória',
          ],
        },
        {
          name: 'Mensal',
          cooldown: '30 dias',
          items: [
            '64 Poké Bolas',
            '32 Super Bolas',
            '16 Ultra Bolas',
            '32 Doces Raros',
            '16 Exp. Candy XL',
            '10 Revives',
            '2 Max Revives',
            '2 Mints aleatórias',
            '2 Pedras de Evolução aleatórias',
            '1 Lucky Egg',
            '1 Bottle Cap de atributo aleatório',
          ],
        },
      ],
    },
    {
      name: 'VIP 2',
      price: 'R$ 35,00',
      rank: 'VIP ✦',
      description: 'Mais possibilidades para sua equipe.',
      kits: [
        {
          name: 'Diário',
          cooldown: '24 horas',
          items: ['1 Exp. Share', '2 Exp. Candy XL', '1 Max Revive'],
        },
        {
          name: 'Semanal',
          cooldown: '7 dias',
          items: ['1 Lucky Egg', '1 Ability Capsule', '2 Mints aleatórias'],
        },
        {
          name: 'Mensal',
          cooldown: '30 dias',
          items: [
            '1 Destiny Knot',
            '1 Everstone',
            '2 Lucky Eggs',
            '2 Ability Capsules',
            '5 Bottle Caps (OBC)',
          ],
        },
      ],
    },
    {
      name: 'VIP 3',
      price: 'R$ 50,00',
      rank: 'VIP ✦✦',
      description: 'A experiência completa dos kits VIP.',
      kits: [
        {
          name: 'Diário',
          cooldown: '24 horas',
          items: ['2 Exp. Candy XL', '2 Max Revives', '1 Mint à escolha'],
        },
        {
          name: 'Semanal',
          cooldown: '7 dias',
          items: ['2 Silver Bottle Caps', '3 Ability Capsules', '16 Exp. Candy XL'],
        },
        {
          name: 'Mensal',
          cooldown: '30 dias',
          items: [
            '1 Master Ball',
            '1 Golden Bottle Cap',
            '2 Ability Patches',
            '3 Lucky Eggs',
            '2 Destiny Knots',
            '2 Everstones',
            '5 Bottle Caps de atributos aleatórios',
            '5 Mints à escolha',
          ],
        },
      ],
    },
  ];
  selected = 0;
  enlarged = { src: '', title: '' };
  kitImage(name: string): string {
    const period = name === 'Diário' ? 'diario' : name === 'Semanal' ? 'semanal' : 'mensal';
    return `/kits/vip-${this.selected + 1}-${period}.png`;
  }
  openImage(dialog: HTMLDialogElement, name: string): void {
    this.enlarged = { src: this.kitImage(name), title: `${this.plan.name} — Kit ${name}` };
    dialog.showModal();
  }
  get plan() {
    return this.plans[this.selected];
  }
}
