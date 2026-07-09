import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

type MenuItem = {
  label: string;
  href: string;
};

type ProductCard = {
  name: string;
  price: string;
  text: string;
  accent: string;
};

type StoreSection = 'vip' | 'keys';

@Component({
  selector: 'app-store-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './store-page.component.html',
  styleUrls: ['./store-page.component.scss']
})
export class StorePageComponent {
  protected readonly serverName = 'Atlas';
  protected activeSection: StoreSection = 'keys';

  protected readonly menu: MenuItem[] = [
    { label: 'Inicio', href: '/' },
    { label: 'Loja', href: '/store' },
    { label: 'Jogar', href: '/how-to-play' },
    { label: 'Noticias', href: '/notices' },
    { label: 'Equipe', href: '/#novidades' }
  ];

  protected readonly vipBenefits = [
    'Tag exclusiva dentro do Atlas.',
    'Vaga reservada, mesmo com o servidor cheio.',
    'Chat VIP exclusivo para membros.',
    'Progresso acelerado com vantagens unicas no jogo.'
  ];

  protected readonly vipPlans: ProductCard[] = [
    {
      name: 'VIP 30 dias',
      price: 'R$ 19,99',
      text: 'Plano de entrada para liberar beneficios exclusivos e acesso prioritario no Atlas.',
      accent: 'VIP'
    },
    {
      name: 'VIP 45 dias',
      price: 'R$ 27,99',
      text: 'Mais tempo de vantagens para quem quer consolidar a jornada no servidor.',
      accent: 'VIP'
    },
    {
      name: 'VIP Permanente',
      price: 'R$ 79,99',
      text: 'Acesso definitivo ao pacote VIP com foco em praticidade e presenca constante.',
      accent: 'VIP'
    },
    {
      name: 'VIP Assinatura',
      price: 'R$ 16,99',
      text: 'Modelo recorrente para manter os beneficios sempre ativos sem renovacao manual.',
      accent: 'VIP'
    }
  ];

  protected readonly legendaryKeys: ProductCard[] = [
    {
      name: 'Chave de Lendario | 1o Geracao',
      price: 'R$ 9,99',
      text: 'Use esta chave para abrir as Caixas Lendarias da primeira geracao.',
      accent: 'Lendaria'
    },
    {
      name: 'Chave de Lendario | 2o Geracao',
      price: 'R$ 14,99',
      text: 'Versao para a segunda geracao de recompensas lendarias.',
      accent: 'Lendaria'
    },
    {
      name: 'Chave de Lendario | 3o Geracao',
      price: 'R$ 17,99',
      text: 'Abrir caixas com foco em recompensas da terceira geracao.',
      accent: 'Lendaria'
    },
    {
      name: 'Chave de Lendario | 4o Geracao',
      price: 'R$ 11,99',
      text: 'Item oficial para as caixas lendarias da quarta geracao.',
      accent: 'Lendaria'
    },
    {
      name: 'Chave de Lendario | 5o Geracao',
      price: 'R$ 17,99',
      text: 'Chave lendaria da quinta geracao para abrir suas caixas.',
      accent: 'Lendaria'
    },
    {
      name: 'Chave de Lendario | 6o Geracao',
      price: 'R$ 17,99',
      text: 'Uma das chaves mais valorizadas da loja do Atlas.',
      accent: 'Lendaria'
    },
    {
      name: 'Chave de Lendario | 7o Geracao',
      price: 'R$ 17,99',
      text: 'Uma das chaves mais valorizadas da loja do Atlas.',
      accent: 'Lendaria'
    },
    {
      name: 'Chave de Lendario | 8o Geracao',
      price: 'R$ 17,99',
      text: 'Uma das chaves mais valorizadas da loja do Atlas.',
      accent: 'Lendaria'
    },
    {
      name: 'Chave de Lendario | 9o Geracao',
      price: 'R$ 17,99',
      text: 'Uma das chaves mais valorizadas da loja do Atlas.',
      accent: 'Lendaria'
    }
  ];

  protected setActiveSection(section: StoreSection): void {
    this.activeSection = section;
  }

  protected isActiveSection(section: StoreSection): boolean {
    return this.activeSection === section;
  }
}
