'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

interface ResultsTableProps {
  data: any[]
  onRowClick?: (row: any) => void
}

export function ResultsTable({ data, onRowClick }: ResultsTableProps) {
  if (!data || data.length === 0) {
    return <p className="p-4 text-center text-xs text-muted-foreground">The query returned no results.</p>
  }

  const headers = Object.keys(data[0])

  return (
    <div className="w-full border rounded-md bg-white">
      {/* SCROLL HORIZONTAL FORÇADO COM BARRA SEMPRE VISÍVEL */}
      <div 
        className="force-scrollbar"
        style={{
          width: '100%',
          maxHeight: '1200px', // 3x mais linhas (400px -> 1200px)
          border: '1px solid #ccc'
        }}
      >
        <table 
          style={{
            width: `${headers.length * 250}px`, // FORÇA LARGURA TOTAL
            minWidth: `${headers.length * 250}px`,
            borderCollapse: 'collapse',
            tableLayout: 'fixed'
          }}
        >
          <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8f9fa', zIndex: 10 }}>
            <tr>
              {headers.map((header, index) => (
                <th 
                  key={header}
                  style={{
                    width: '250px',
                    minWidth: '250px',
                    maxWidth: '250px',
                    border: '1px solid #ddd',
                    padding: '8px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    backgroundColor: '#f8f9fa',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                  title={header}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                onClick={() => onRowClick?.(row)}
                style={{
                  cursor: onRowClick ? 'pointer' : 'default'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
              >
                {headers.map((header, colIndex) => (
                  <td
                    key={`${rowIndex}-${header}`}
                    style={{
                      width: '250px',
                      minWidth: '250px',
                      maxWidth: '250px',
                      border: '1px solid #ddd',
                      padding: '8px',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                    title={JSON.stringify(row[header]).replace(/^"|"$/g, '')}
                  >
                    {JSON.stringify(row[header]).replace(/^"|"$/g, '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Indicador de scroll */}
      <div 
        style={{
          padding: '8px',
          backgroundColor: '#f8f9fa',
          borderTop: '1px solid #ddd',
          fontSize: '11px',
          color: '#666',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <span>📊 {headers.length} colunas • SCROLL HORIZONTAL ATIVO</span>
        <span style={{ color: '#007bff', fontWeight: 'bold' }}>
          Largura: {headers.length * 250}px →
        </span>
      </div>
    </div>
  )
}
