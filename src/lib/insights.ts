import { avgCategory, byCategory, inMonth, totals } from './analytics';
import { getCategory } from './categories';
import { addMonths, fmt0 } from './format';
import { computeDeductions } from './irs';
import type { Settings, Transaction } from './types';

export type InsightLevel = 'alerta' | 'poupanca' | 'fiscal' | 'info';

export interface Insight {
  id: string;
  level: InsightLevel;
  icon: string;
  title: string;
  body: string;
  saving?: number; // poupança potencial anual estimada (€)
  link?: { label: string; url: string };
}

/** Salário mínimo nacional (Portugal continental) de referência. */
export const SMN = 920;

const sumCat = (txs: Transaction[], ids: string[]) =>
  txs.filter((t) => t.type === 'expense' && ids.includes(t.category)).reduce((s, t) => s + t.amount, 0);

/**
 * Motor de sugestões personalizadas, adaptado à realidade portuguesa.
 * Analisa o mês `key` (e os anteriores) e devolve dicas ordenadas por relevância.
 */
export function generateInsights(all: Transaction[], key: string, s: Settings): Insight[] {
  const out: Insight[] = [];
  const month = inMonth(all, key);
  const { income: regIncome, expense } = totals(month);
  const income = s.monthlyIncome > 0 ? s.monthlyIncome : regIncome;
  const year = Number(key.slice(0, 4));
  const m = Number(key.slice(5, 7));
  const avg = (c: string) => avgCategory(all, c, key, 3);

  // 1. Orçamentos ultrapassados
  for (const { category, amount } of byCategory(month)) {
    const b = s.budgets[category];
    if (b && amount > b) {
      const c = getCategory(category);
      out.push({
        id: `budget-${category}`, level: 'alerta', icon: '🚨',
        title: `Orçamento de ${c.label} ultrapassado`,
        body: `Gastaste ${fmt0(amount)} de ${fmt0(b)} previstos (+${Math.round((amount / b - 1) * 100)}%). Revê os próximos gastos desta categoria até ao fim do mês.`
      });
    }
  }

  // 2. Taxa de poupança
  if (income > 0 && expense > 0) {
    const rate = (income - expense) / income;
    if (rate < 0) {
      out.push({
        id: 'negative', level: 'alerta', icon: '📉', title: 'Estás a gastar mais do que ganhas',
        body: `Este mês as despesas superam o rendimento em ${fmt0(expense - income)}. Corta primeiro nos gastos variáveis (restauração, lazer, compras) e evita crédito ao consumo e cartões de crédito com TAEG elevada.`
      });
    } else if (rate < 0.1) {
      out.push({
        id: 'low-savings', level: 'poupanca', icon: '🎯', title: 'Tenta poupar pelo menos 10–20%',
        body: `A tua taxa de poupança é de ${Math.round(rate * 100)}%. Experimenta a regra 50/30/20: 50% necessidades, 30% desejos, 20% poupança. Automatiza uma transferência no dia em que recebes o salário.`,
        saving: income * 0.1 * 12
      });
    } else if (rate >= 0.2) {
      out.push({
        id: 'good-savings', level: 'info', icon: '🌱', title: `Boa! Poupaste ${Math.round(rate * 100)}% este mês`,
        body: 'Põe o dinheiro a render: Certificados de Aforro e do Tesouro (via AforroNet) ou depósitos a prazo com melhor taxa do que a conta à ordem. Primeiro garante um fundo de emergência de 3 a 6 meses de despesas.',
        link: { label: 'IGCP — Aforro e Tesouro', url: 'https://www.igcp.pt' }
      });
    }
  }

  // 3. Taxa de esforço com habitação
  const housing = sumCat(month, ['habitacao']);
  if (income > 0 && housing / income > 0.35) {
    out.push({
      id: 'housing', level: 'alerta', icon: '🏠', title: `Habitação pesa ${Math.round((housing / income) * 100)}% do rendimento`,
      body: s.age <= 35
        ? 'Acima de 35% é considerado taxa de esforço elevada. Se arrendas, vê se te candidatas ao Porta 65+/Porta 65 Jovem e ao apoio extraordinário à renda. Se tens crédito, pede ao banco simulação de renegociação do spread ou taxa mista.'
        : 'Acima de 35% é considerado taxa de esforço elevada. Se tens crédito habitação, compara spreads e pondera transferir o crédito ou fixar a taxa (taxa mista). Se arrendas, confirma se tens direito ao apoio extraordinário à renda.',
      link: { label: 'Portal da Habitação', url: 'https://www.portaldahabitacao.pt' }
    });
  }

  // 4. Restauração
  const rest = avg('restauracao');
  if (expense > 0 && rest > 0 && (rest / Math.max(expense, 1) > 0.12 || rest > 200)) {
    const save = rest * 0.4 * 12;
    out.push({
      id: 'restaurants', level: 'poupanca', icon: '🍱', title: 'Restauração acima do recomendado',
      body: `Gastas em média ${fmt0(rest)}/mês em restaurantes e cafés. Levar marmita 3 dias por semana e usar o cartão/subsídio de refeição pode poupar ~${fmt0(save)}/ano. E pede sempre fatura com NIF: 15% do IVA volta para ti no IRS.`,
      saving: save
    });
  }

  // 5. Energia
  const energy = avg('energia');
  if (energy > 90) {
    const save = energy * 0.15 * 12;
    out.push({
      id: 'energy', level: 'poupanca', icon: '⚡', title: 'Fatura de energia elevada',
      body: `Média de ${fmt0(energy)}/mês em luz, água e gás. Usa o simulador da ERSE para comparar tarifários (incluindo o mercado regulado), avalia a tarifa bi-horária se usas máquinas à noite e baixa a potência contratada se raramente dispara. Poupança típica: ~${fmt0(save)}/ano.`,
      saving: save,
      link: { label: 'Simulador ERSE', url: 'https://simulador.precos.erse.pt' }
    });
  }
  if (income > 0 && income <= SMN * 1.5 && (energy > 0 || sumCat(month, ['energia']) > 0)) {
    out.push({
      id: 'social-tariff', level: 'poupanca', icon: '🤝', title: 'Verifica se tens direito à tarifa social',
      body: 'Com rendimentos mais baixos podes ter tarifa social de eletricidade e gás natural (desconto significativo e automático se cumprires critérios) e tarifa social de internet. Confirma junto do teu comercializador ou da DGEG.'
    });
  }

  // 6. Telecomunicações
  const tel = avg('telecom');
  if (tel > 55) {
    const save = (tel - 35) * 12;
    out.push({
      id: 'telecom', level: 'poupanca', icon: '📡', title: 'Pacote de telecomunicações caro',
      body: `Pagas ~${fmt0(tel)}/mês. Verifica quando acaba a fidelização (podes consultar e denunciar o contrato sem penalização no fim) e compara ofertas das marcas low-cost e tarifários só de dados. Ao renegociar, pede retenção — costuma baixar o preço.`,
      saving: save,
      link: { label: 'ANACOM — Comparar tarifários', url: 'https://www.anacom.pt' }
    });
  }

  // 7. Mobilidade
  const fuel = avg('combustivel');
  const passe = avg('passe');
  if (fuel > 120 && passe === 0) {
    out.push({
      id: 'mobility', level: 'poupanca', icon: '🚆', title: 'Considera o passe de transportes',
      body: `Gastas ~${fmt0(fuel)}/mês em combustível e portagens. Os passes metropolitanos (Navegante em Lisboa, Andante no Porto) custam cerca de 40 €/mês e o Passe Ferroviário Verde dá acesso a comboios regionais/intercidades a 20 €/mês. O IVA do passe é 100% dedutível no IRS.`,
      saving: Math.max(0, (fuel - 40) * 12 * 0.5)
    });
  } else if (fuel > 120) {
    out.push({
      id: 'fuel', level: 'poupanca', icon: '⛽', title: 'Poupa no combustível',
      body: 'Compara preços no portal da DGEG (Preços dos Combustíveis), abastece em postos de hipermercado com descontos de cartão e evita portagens quando a alternativa é razoável. Mantém a pressão dos pneus correta.',
      link: { label: 'Preços dos combustíveis (DGEG)', url: 'https://precoscombustiveis.dgeg.gov.pt' }
    });
  }

  // 8. Supermercado
  const groc = avg('supermercado');
  const people = s.taxpayers + s.dependents;
  if (groc > 0 && groc / Math.max(people, 1) > 280) {
    const save = groc * 0.12 * 12;
    out.push({
      id: 'groceries', level: 'poupanca', icon: '🛒', title: 'Compras de supermercado acima da média',
      body: `~${fmt0(groc)}/mês para ${people} pessoa(s). Faz lista, prefere marcas brancas, usa os cartões de fidelização e cupões das apps das cadeias, compra fruta da época em mercados municipais e aproveita apps anti-desperdício. Poupança estimada: ${fmt0(save)}/ano.`,
      saving: save
    });
  }

  // 9. Subscrições
  const subs = avg('subscricoes');
  if (subs > 25) {
    out.push({
      id: 'subs', level: 'poupanca', icon: '📺', title: 'Revê as tuas subscrições',
      body: `Tens ~${fmt0(subs)}/mês em subscrições. Cancela as que não usaste no último mês, partilha planos familiares e alterna serviços de streaming em vez de os manter todos ativos.`,
      saving: subs * 0.4 * 12
    });
  }

  // 10. Seguros
  if (avg('seguros') > 60) {
    out.push({
      id: 'insurance', level: 'poupanca', icon: '🛡️', title: 'Compara os teus seguros',
      body: 'Pede propostas de seguro automóvel e multirriscos todos os anos — mudar de seguradora antes da renovação poupa frequentemente 15–30%. No crédito habitação, podes contratar o seguro de vida fora do banco.'
    });
  }

  // 11. Fiscal: faturas sem NIF e deduções
  const deds = computeDeductions(all, year, s);
  const missing = deds.reduce((x, l) => x + l.missingNif, 0);
  if (missing > 0) {
    out.push({
      id: 'nif', level: 'fiscal', icon: '🧾', title: 'Despesas sem NIF na fatura',
      body: `Registaste ${fmt0(missing)} em despesas dedutíveis sem NIF este ano. Pede sempre fatura com NIF (ou associa o NIF ao cartão de cliente) para contarem nas deduções do IRS.`
    });
  }
  const gerais = deds.find((d) => d.key === 'gerais')!;
  if (gerais.deduction >= gerais.cap) {
    out.push({
      id: 'gerais-max', level: 'info', icon: '✅', title: 'Já atingiste o máximo das despesas gerais',
      body: `As despesas gerais familiares já garantem a dedução máxima de ${fmt0(gerais.cap)} em ${year}. Concentra agora a atenção nas faturas de saúde, educação e setores com benefício de IVA.`
    });
  }
  const ppr = deds.find((d) => d.key === 'ppr')!;
  if (ppr.spent === 0 && income > SMN * 1.3 && m >= 9) {
    const needed = ppr.cap / 0.2;
    out.push({
      id: 'ppr', level: 'fiscal', icon: '🐷', title: 'Ainda vais a tempo de um PPR',
      body: `Entregas num PPR até 31 de dezembro deduzem 20% no IRS de ${year}: investir ${fmt0(needed)} dá até ${fmt0(ppr.cap)} de dedução (limite para a tua idade). Compara comissões e escolhe um perfil de risco adequado.`,
      saving: ppr.cap
    });
  }
  if (s.age > 0 && s.age <= 35) {
    out.push({
      id: 'irs-jovem', level: 'fiscal', icon: '🎓', title: 'Confirma o IRS Jovem',
      body: 'Até aos 35 anos podes ter isenção parcial ou total de IRS sobre os rendimentos do trabalho nos primeiros anos de carreira. Garante que a opção está assinalada na declaração e pede ao empregador para ajustar a retenção na fonte.',
      link: { label: 'Portal das Finanças', url: 'https://www.portaldasfinancas.gov.pt' }
    });
  }

  // 12. Calendário fiscal português
  if (m === 1 || m === 2) {
    out.push({
      id: 'efatura', level: 'fiscal', icon: '📅', title: 'Valida as faturas no e-Fatura',
      body: 'Até ao final de fevereiro deves confirmar no e-Fatura as faturas pendentes (sobretudo saúde e setores com IVA dedutível). Faturas por classificar podem não contar para o IRS.',
      link: { label: 'e-Fatura', url: 'https://faturas.portaldasfinancas.gov.pt' }
    });
  } else if (m >= 4 && m <= 6) {
    out.push({
      id: 'irs-season', level: 'fiscal', icon: '📝', title: 'Época de entrega do IRS',
      body: 'A declaração de IRS entrega-se entre 1 de abril e 30 de junho. Compara a tributação conjunta vs. separada no simulador antes de submeter — o IRS Automático nem sempre é a melhor opção.'
    });
  } else if (m === 7 || m === 12) {
    out.push({
      id: 'subsidy', level: 'poupanca', icon: '🎁', title: m === 7 ? 'Subsídio de férias à vista' : 'Subsídio de Natal: usa-o bem',
      body: 'Antes de gastar o subsídio, separa uma parte para o fundo de emergência ou para amortizar dívidas com juros altos. Lembra-te também do IUC e outras despesas anuais que aparecem nesta altura.'
    });
  } else if (m >= 10) {
    out.push({
      id: 'year-end', level: 'fiscal', icon: '🗓️', title: 'Prepara o fecho do ano fiscal',
      body: 'Despesas de saúde, educação e PPR feitas até 31 de dezembro contam para o IRS deste ano. Confirma no e-Fatura se as faturas estão bem classificadas.'
    });
  }

  // 13. Fundo de emergência (genérico)
  if (all.length > 0 && !out.some((i) => i.id === 'good-savings')) {
    const prev = totals(inMonth(all, addMonths(key, -1))).expense || expense;
    if (prev > 0) {
      out.push({
        id: 'emergency', level: 'info', icon: '🧯', title: 'Fundo de emergência',
        body: `Com base nas tuas despesas, o teu fundo de emergência ideal fica entre ${fmt0(prev * 3)} e ${fmt0(prev * 6)}. Guarda-o numa conta separada, com acesso imediato e sem risco.`
      });
    }
  }

  const order: Record<InsightLevel, number> = { alerta: 0, poupanca: 1, fiscal: 2, info: 3 };
  return out.sort((a, b) => order[a.level] - order[b.level] || (b.saving ?? 0) - (a.saving ?? 0));
}
