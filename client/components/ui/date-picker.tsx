import React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DateRange {
  from: Date;
  to: Date;
}

interface DatePickerWithRangeProps {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  className?: string;
  placeholder?: string;
}

export function DatePickerWithRange({
  value,
  onChange,
  className,
  placeholder = "Selecionar período"
}: DatePickerWithRangeProps) {
  const formatDateRange = (range?: DateRange) => {
    if (!range) return placeholder;
    
    const formatter = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    return `${formatter.format(range.from)} - ${formatter.format(range.to)}`;
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange(value)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-4">
            <p className="text-sm text-gray-600">
              Seleção de período personalizada será implementada em breve.
            </p>
            <div className="mt-3 space-y-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const today = new Date();
                  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                  onChange?.({ from: lastWeek, to: today });
                }}
                className="w-full"
              >
                Últimos 7 dias
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const today = new Date();
                  const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                  onChange?.({ from: lastMonth, to: today });
                }}
                className="w-full"
              >
                Últimos 30 dias
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const today = new Date();
                  const lastQuarter = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
                  onChange?.({ from: lastQuarter, to: today });
                }}
                className="w-full"
              >
                Últimos 90 dias
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}