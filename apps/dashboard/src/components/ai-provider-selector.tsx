'use client';
import { RiArrowDownSLine, RiCheckLine } from '@remixicon/react';
import { useState } from 'react';
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
  const [open, setOpen] = useState(false);
  const selectedProvider = providers.find((p) => p.id === value);

  if (providers.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-1.5 ${className ?? ''}`}>
      <Label htmlFor="aiProvider" className="text-xs text-muted-foreground whitespace-nowrap">
        AI Provider
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="aiProvider"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'h-7 text-xs border-border/50 bg-background hover:bg-muted/50 min-w-[160px] px-2 justify-between font-normal',
              triggerClassName,
            )}
          >
            {selectedProvider
              ? `${selectedProvider.name}${selectedProvider.isDefault ? ' (默认)' : ''}`
              : '选择 AI Provider'}
            <RiArrowDownSLine className="ml-2 h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-0" align="start">
          <Command>
            <CommandInput placeholder="搜索 AI Provider..." />
            <CommandList>
              <CommandEmpty>未找到匹配的 AI Provider</CommandEmpty>
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
                    />
                    <span>
                      {provider.name}
                      {provider.isDefault && (
                        <span className="ml-1 text-xs text-muted-foreground">(默认)</span>
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
