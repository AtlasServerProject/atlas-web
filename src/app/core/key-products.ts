import { KEY_PRICES_CENTS } from './key-prices';
export const KEY_PRODUCTS = [
  ...['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Unova', 'Kalos', 'Alola', 'Galar', 'Paldea'].map(
    (region, i) => ({
      identifier: `generation_${i + 1}`,
      slug: `key-generation-${i + 1}`,
      name: `Chave ${i + 1}ª geração — ${region}`,
      description: `Uma abertura na caixa da ${i + 1}ª geração, com lendários e míticos disponíveis nas versões normal e shiny. A prévia no jogo mostra o conteúdo e as chances atuais.`,
      sprite: i === 2,
      artPosition: 'right center',
      imageUrl:
        i === 1
          ? '/keys/generation-2-thematic.png'
          : i === 3
            ? '/keys/generation-4-arceus-cartoon.png'
            : i === 2
              ? '/keys/johto-hoenn-cartoon.png'
              : `/keys/generation-${i + 1}-cartoon.png`,
      price: KEY_PRICES_CENTS[`generation_${i + 1}`] / 100,
    }),
  ),
  {
    identifier: 'legendary_monthly',
    slug: 'key-legendary-monthly',
    name: 'Chave Lendários do mês',
    description:
      'Uma abertura na caixa mensal: 10 espécies lendárias selecionadas por mês, em versões normal e shiny. A chave usa a seleção vigente no momento da abertura.',
    sprite: false,
    artPosition: 'center',
    imageUrl: '/keys/monthly-cartoon.png',
    price: KEY_PRICES_CENTS['legendary_monthly'] / 100,
  },
];
