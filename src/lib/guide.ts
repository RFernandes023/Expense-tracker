/** Guia de poupança geral para quem vive em Portugal. */
export interface GuideTip { icon: string; title: string; body: string; url?: string }
export interface GuideSection { id: string; title: string; tips: GuideTip[] }

export const GUIDE: GuideSection[] = [
  {
    id: 'casa', title: '🏠 Casa e energia', tips: [
      { icon: '⚡', title: 'Compara o tarifário de eletricidade e gás', body: 'O simulador oficial da ERSE compara todos os comercializadores, incluindo o mercado regulado. Revê uma vez por ano.', url: 'https://simulador.precos.erse.pt' },
      { icon: '🔌', title: 'Ajusta a potência contratada', body: 'Muitas casas têm potência acima do necessário. Descer um escalão (ex.: 6,9 → 5,75 kVA) reduz a parte fixa da fatura todos os meses.' },
      { icon: '🌙', title: 'Tarifa bi-horária', body: 'Se usas máquinas de lavar, termoacumulador ou carregas o carro à noite e ao fim de semana, a bi-horária pode compensar.' },
      { icon: '🤝', title: 'Tarifa social', body: 'Para quem recebe prestações sociais ou tem rendimentos baixos: desconto na eletricidade, gás natural, água (em muitos municípios) e internet.' },
      { icon: '🏡', title: 'Apoios à habitação', body: 'Porta 65+ / Porta 65 Jovem para arrendamento, apoio extraordinário à renda e garantia pública para jovens no crédito à primeira casa.', url: 'https://www.portaldahabitacao.pt' },
      { icon: '🏦', title: 'Crédito habitação', body: 'Compara o spread de outros bancos — a transferência do crédito pode valer a pena. Podes amortizar antecipadamente e contratar o seguro de vida fora do banco.' }
    ]
  },
  {
    id: 'irs', title: '🧾 IRS e Finanças', tips: [
      { icon: '🧾', title: 'Pede sempre fatura com NIF', body: 'Despesas gerais (35% até 250 €), saúde (15% até 1000 €), educação (30% até 800 €) e rendas contam para a dedução à coleta.' },
      { icon: '💇', title: 'Benefício do IVA', body: 'Em restauração, alojamento, cabeleireiros, oficinas, veterinários e ginásios recuperas 15% do IVA; nos passes de transportes, 100%. Limite: 250 € por agregado.' },
      { icon: '📅', title: 'Valida o e-Fatura até ao fim de fevereiro', body: 'Faturas pendentes (sobretudo de farmácias e comerciantes com várias atividades) só contam se as classificares.', url: 'https://faturas.portaldasfinancas.gov.pt' },
      { icon: '👫', title: 'Conjunto ou separado?', body: 'Casados ou em união de facto devem simular as duas opções antes de entregar o IRS (1 de abril a 30 de junho).' },
      { icon: '🎓', title: 'IRS Jovem', body: 'Até aos 35 anos, isenção parcial ou total do IRS sobre rendimentos do trabalho nos primeiros anos. Pede ao empregador para refletir na retenção.' },
      { icon: '🐷', title: 'PPR com benefício fiscal', body: 'Entregas até 31 de dezembro deduzem 20% (até 400 € <35 anos, 350 € entre 35–50, 300 € >50).' }
    ]
  },
  {
    id: 'dia', title: '🛒 Dia a dia', tips: [
      { icon: '🏷️', title: 'Marcas brancas e cartões de cliente', body: 'Marcas próprias custam muitas vezes 20–40% menos. Usa os cupões das apps das cadeias e acumula saldo nos cartões de fidelização.' },
      { icon: '🥬', title: 'Mercados e fruta da época', body: 'Mercados municipais e produtos da época são mais baratos e frescos. Apps anti-desperdício vendem cabazes a preços baixos ao fim do dia.' },
      { icon: '🍱', title: 'Marmita e cartão refeição', body: 'O subsídio de refeição em cartão tem um limite isento de IRS superior ao pago em dinheiro — pergunta à tua empresa.' },
      { icon: '📶', title: 'Telecomunicações', body: 'No fim da fidelização podes mudar sem custos. Marcas low-cost e tarifários só de dados podem custar metade de um pacote tradicional.', url: 'https://www.anacom.pt' },
      { icon: '📺', title: 'Subscrições', body: 'Faz uma revisão trimestral: cancela o que não usas e roda os serviços de streaming em vez de os manter todos.' }
    ]
  },
  {
    id: 'mobilidade', title: '🚆 Mobilidade', tips: [
      { icon: '🚇', title: 'Passes metropolitanos', body: 'Navegante (AML) e Andante (AMP) cerca de 40 €/mês com transportes ilimitados na área metropolitana; descontos para jovens e seniores.' },
      { icon: '🚆', title: 'Passe Ferroviário Verde', body: '20 €/mês para comboios regionais, inter-regionais, urbanos e intercidades (2.ª classe) da CP.' },
      { icon: '⛽', title: 'Combustível mais barato', body: 'Consulta os preços no portal da DGEG e prefere postos de hipermercado com descontos acumulados.', url: 'https://precoscombustiveis.dgeg.gov.pt' },
      { icon: '🚗', title: 'Seguro e IUC', body: 'Compara o seguro automóvel antes da renovação e lembra-te do IUC no mês da matrícula — inclui-o no orçamento.' }
    ]
  },
  {
    id: 'poupanca', title: '💶 Poupança e investimento', tips: [
      { icon: '🧯', title: 'Fundo de emergência primeiro', body: '3 a 6 meses de despesas numa conta separada e com liquidez imediata.' },
      { icon: '🇵🇹', title: 'Certificados de Aforro e do Tesouro', body: 'Produtos de dívida pública com capital garantido, subscritos no AforroNet, CTT ou balcões aderentes.', url: 'https://www.igcp.pt' },
      { icon: '📊', title: 'Compara depósitos a prazo', body: 'O Banco de Portugal publica as taxas no Portal do Cliente Bancário; bancos online costumam pagar mais.', url: 'https://clientebancario.bportugal.pt' },
      { icon: '💳', title: 'Atenção ao crédito ao consumo', body: 'Cartões de crédito e crédito pessoal têm TAEG elevada. Amortiza primeiro as dívidas mais caras.' }
    ]
  }
];
