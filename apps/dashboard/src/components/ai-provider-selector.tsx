'use client';
import { RiArrowDownSLine, RiCheckLine } from '@remixicon/react';
import { useTranslations } from '@/i18n/use-translations';
import { useState } from 'react';
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

interface AiProvider {
  id: number;
  name: string;
  type: string;
  isDefault: boolean;
}

interface AiProviderSelectorProps {
  providers: AiProvider[];
  value?: number;
  onValueChange?: (value: number) => void;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
}

export function AiProviderSelector({
  providers,
  value,
  onValueChange,
  disabled,
  className,
  triggerClassName,
}: AiProviderSelectorProps) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const selectedProvider = providers.find((p) => p.id === value);

  if (providers.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-1.5 ${className ?? ''}`}>
      <Label htmlFor="aiProvider" className="text-xs text-muted-foreground whitespace-nowrap">
        {t('AI Provider')}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          id="aiProvider"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={buttonVariants({
            variant: 'outline',
            size: 'sm',
            className: cn(
              'text-xs border-border/50 bg-background hover:bg-muted/50 min-w-[160px] px-2 justify-between font-normal text-left',
              triggerClassName,
            ),
          })}
        >
          <span className="flex-1 min-w-0 truncate text-left">
            {selectedProvider
              ? `${selectedProvider.name}${selectedProvider.isDefault ? ` ${t('(Default)')}` : ''}`
              : t('Select AI Provider')}
          </span>
          <RiArrowDownSLine className="ml-2 h-3 w-3 shrink-0 opacity-50" aria-hidden="true" />
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-0" align="start">
          <Command>
            <CommandInput placeholder={t('Search AI Provider')} />
            <CommandList>
              <CommandEmpty>{t('No AI Provider found')}</CommandEmpty>
              <CommandGroup>
                {providers.map((provider) => (
                  <CommandItem
                    key={provider.id}
                    value={`${provider.id} ${provider.name} ${provider.type}`}
                    onSelect={() => {
                      onValueChange?.(provider.id);
                      setOpen(false);
                    }}
                    className="py-1.5"
                  >
                    <RiCheckLine
                      className={cn(
                        'mr-2 h-3 w-3 shrink-0',
                        value === provider.id ? 'opacity-100' : 'opacity-0',
                      )}
                      aria-hidden="true"
                    />
                    <span>
                      {provider.name}
                      {provider.isDefault && (
                        <span className="ml-1 text-xs text-muted-foreground">{t('(Default)')}</span>
                      )}
                    </span>
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
