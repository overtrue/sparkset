'use client';
import { RiArrowDownSLine, RiCheckLine } from '@remixicon/react';
import { useTranslations } from '@/i18n/use-translations';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
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
  const t = useTranslations();
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
        {t('Datasource')}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          id="datasource"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={buttonVariants({
            variant: 'outline',
            size: 'sm',
            className: cn(
              'text-xs border-border/50 bg-background hover:bg-muted/50 min-w-[140px] px-2 justify-between font-normal text-left',
              triggerClassName,
            ),
          })}
        >
          <span className="flex-1 min-w-0 truncate text-left">
            {selectedDatasource ? selectedDatasource.name : t('Select datasource')}
          </span>
          <RiArrowDownSLine className="ml-2 h-3 w-3 shrink-0 opacity-50" aria-hidden="true" />
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandInput placeholder={t('Search datasource…')} />
            <CommandList>
              <CommandEmpty>{t('No datasource found')}</CommandEmpty>
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
                      aria-hidden="true"
                    />
                    <span className="flex-1">{ds.name}</span>
                    {ds.isDefault && (
                      <span className="ml-2 text-xs text-muted-foreground">{t('(Default)')}</span>
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
