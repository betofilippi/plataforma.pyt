# Vendas Module

Complete sales management system with CRM functionality for plataforma.app

## Features

- **Sales Dashboard**: Real-time sales metrics and KPIs
- **Customer Management**: Complete CRM with customer data
- **Proposal Management**: Create and track sales proposals
- **Product Catalog**: Manage products and services
- **Payment Tracking**: Payment status and history
- **Sales Reports**: Analytics and reporting tools

## Components

### VendasModule
Main module component with desktop interface for sales management.

### Sales Dashboard
Interactive dashboard showing:
- Monthly sales totals
- Active customer count
- Open proposals
- Conversion rates

## Database Schema

The vendas module uses the following database tables:
- `vendas.clientes` - Customer information
- `vendas.propostas` - Sales proposals
- `vendas.produtos` - Product catalog
- `vendas.pagamentos` - Payment records

## Usage

```tsx
import { VendasModule } from '@plataforma/vendas-module';

function App() {
  return <VendasModule />;
}
```

## Development

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build module
npm run build

# Type checking
npm run typecheck
```

## Features in Development

- Advanced reporting and analytics
- Integration with external payment systems
- Email campaign management
- Sales pipeline automation
- Mobile-responsive interface

## Module Structure

```
src/
├── components/           # React components
│   └── VendasModule.tsx
├── hooks/               # Custom hooks
│   ├── useSalesData.ts
│   └── useCustomers.ts
├── services/            # API services
│   ├── sales-api.ts
│   └── customer-api.ts
├── utils/               # Utility functions
└── index.ts            # Module exports
```

## Dependencies

- React 18+
- Supabase client
- Lucide React icons
- Date-fns for date handling
- Core platform components

## License

MIT