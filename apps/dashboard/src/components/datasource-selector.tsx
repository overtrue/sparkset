'use client';
import { RiArrowDownSLine, RiCheckLine } from '@remixicon/react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Datasource {
  id: number;
  name: string;
  isDefault?: boolean;
}

interface DatasourceSelectorProps {
  datasources: Datasource[];
  value?: number;
  onValueChange?: (value: number) => void;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
}

export function DatasourceSelector({
  datasources,
  value,
  onValueChange,
  disabled,
  className,
  triggerClassName,
}: DatasourceSelectorProps) {
  const [open, setOpen] = useState(false);
  const selectedDatasource = datasources.find((ds) => ds.id === value);

  // 如果 value 未提供，自动选择默认数据源
  useEffect(() => {
    if (value === undefined && datasources.length > 0) {
      const defaultDatasource = datasources.find((d) => d.isDefault) ?? datasources[0];
      if (defaultDatasource && onValueChange) {
        onValueChange(defaultDatasource.id);
      }
    }
  }, [value, datasources, onValueChange]);

  return (
    <div className={`flex items-center gap-1.5 ${className ?? ''}`}>
      <Label htmlFor="datasource" className="text-xs text-muted-foreground whitespace-nowrap">
        数据源
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="datasource"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'h-7 text-xs border-border/50 bg-background hover:bg-muted/50 min-w-[140px] px-2 justify-between font-normal',
              triggerClassName,
            )}
          >
            {selectedDatasource ? selectedDatasource.name : '选择数据源'}
            <RiArrowDownSLine className="ml-2 h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandInput placeholder="搜索数据源..." />
            <CommandList>
              <CommandEmpty>未找到匹配的数据源</CommandEmpty>
              <CommandGroup>
                {datasources.map((ds) => (
                  <CommandItem
                    key={ds.id}
                    value={`${ds.id} ${ds.name}`}
                    onSelect={() => {
                      onValueChange?.(ds.id);
                      setOpen(false);
                    }}
                    className="py-1.5"
                  >
                    <RiCheckLine
                      className={cn(
                        'mr-2 h-3 w-3 shrink-0',
                        value === ds.id ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <span className="flex-1">{ds.name}</span>
                    {ds.isDefault && (
                      <span className="ml-2 text-xs text-muted-foreground">默认</span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
