/**
 * Constantes da plataforma
 */

export const MODULES = [
  {
    id: 'planilha',
    name: 'planilha.app',
    domain: 'planilha.app',
    icon: 'GridOn',
    color: 'blue',
    isActive: true,
    route: '/planilha',
    description: 'Base de dados central'
  },
  {
    id: 'administrativo',
    name: 'administrativo.app',
    domain: 'administrativo.app',
    icon: 'Business',
    color: 'purple',
    isActive: false,
    route: '/administrativo',
    description: 'Gestão administrativa'
  },
  {
    id: 'estoques',
    name: 'estoques.app',
    domain: 'estoques.app',
    icon: 'Inventory',
    color: 'green',
    isActive: false,
    route: '/estoques',
    description: 'Controle de inventário'
  },
  {
    id: 'faturamento',
    name: 'faturamento.app',
    domain: 'faturamento.app',
    icon: 'Receipt',
    color: 'orange',
    isActive: false,
    route: '/faturamento',
    description: 'Emissão de notas'
  },
  {
    id: 'franquias',
    name: 'franquias.app',
    domain: 'franquias.app',
    icon: 'Store',
    color: 'teal',
    isActive: false,
    route: '/franquias',
    description: 'Gestão de franquias'
  },
  {
    id: 'identidade',
    name: 'identidade.app',
    domain: 'identidade.app',
    icon: 'Palette',
    color: 'pink',
    isActive: false,
    route: '/identidade',
    description: 'Identidade visual'
  },
  {
    id: 'inpi',
    name: 'inpi.app',
    domain: 'inpi.app',
    icon: 'Gavel',
    color: 'brown',
    isActive: false,
    route: '/inpi',
    description: 'Propriedade intelectual'
  },
  {
    id: 'juridico',
    name: 'juridico.app',
    domain: 'juridico.app',
    icon: 'Balance',
    color: 'gray',
    isActive: false,
    route: '/juridico',
    description: 'Gestão jurídica'
  },
  {
    id: 'loja',
    name: 'loja.app',
    domain: 'loja.app',
    icon: 'ShoppingCart',
    color: 'red',
    isActive: false,
    route: '/loja',
    description: 'E-commerce'
  },
  {
    id: 'montagem',
    name: 'montagem.app',
    domain: 'montagem.app',
    icon: 'Construction',
    color: 'amber',
    isActive: false,
    route: '/montagem',
    description: 'Gestão de montagem'
  },
  {
    id: 'pessoal',
    name: 'pessoal.app',
    domain: 'pessoal.app',
    icon: 'People',
    color: 'cyan',
    isActive: false,
    route: '/pessoal',
    description: 'Recursos humanos'
  },
  {
    id: 'produtos',
    name: 'produtos.app',
    domain: 'produtos.app',
    icon: 'Category',
    color: 'lime',
    isActive: false,
    route: '/produtos',
    description: 'Catálogo de produtos'
  },
  {
    id: 'suporte',
    name: 'suporte.app',
    domain: 'suporte.app',
    icon: 'HeadsetMic',
    color: 'violet',
    isActive: false,
    route: '/suporte',
    description: 'Atendimento ao cliente'
  },
  {
    id: 'transportadora',
    name: 'transportadora.app',
    domain: 'transportadora.app',
    icon: 'LocalShipping',
    color: 'navy',
    isActive: false,
    route: '/transportadora',
    description: 'Gestão de entregas'
  },
  {
    id: 'tributario',
    name: 'tributario.app',
    domain: 'tributario.app',
    icon: 'AccountBalance',
    color: 'olive',
    isActive: false,
    route: '/tributario',
    description: 'Gestão fiscal'
  }
] as const;