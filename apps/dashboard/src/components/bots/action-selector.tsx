'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from '@/i18n/use-translations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RiCloseLine, RiSearch2Line } from '@remixicon/react';
import type { ActionDTO, Bot } from '@/types/api';

interface ActionSelectorProps {
  bot: Bot;
  availableActions: ActionDTO[];
  onSave: (enabledActionIds: number[]) => Promise<void>;
  isLoading?: boolean;
}

export function ActionSelector({ bot, availableActions, onSave, isLoading }: ActionSelectorProps) {
  const t = useTranslations();
  const [search, setSearch] = useState('');
  const [selectedActions, setSelectedActions] = useState<Set<number>>(
    new Set(bot.enabledActions || []),
  );
  const [saving, setSaving] = useState(false);

  const filteredActions = useMemo(() => {
    return availableActions.filter(
      (action) =>
        action.name.toLowerCase().includes(search.toLowerCase()) ||
        action.description?.toLowerCase().includes(search.toLowerCase()),
    );
  }, [availableActions, search]);

  const toggleAction = (actionId: number) => {
    const newSelected = new Set(selectedActions);
    if (newSelected.has(actionId)) {
      newSelected.delete(actionId);
    } else {
      newSelected.add(actionId);
    }
    setSelectedActions(newSelected);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(Array.from(selectedActions));
    } finally {
      setSaving(false);
    }
  };

  const isModified =
    JSON.stringify(Array.from(selectedActions).sort()) !==
    JSON.stringify((bot.enabledActions || []).sort());

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Manage Actions')}</CardTitle>
        <CardDescription>
          {selectedActions.size} {t('out of')} {availableActions.length} {t('actions selected')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <RiSearch2Line className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('Search actions…')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            disabled={saving || isLoading}
          />
        </div>

        {/* Actions List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredActions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {t('No actions found')}
            </p>
          ) : (
            filteredActions.map((action) => (
              <div
                key={action.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-input hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  id={`action-${action.id}`}
                  checked={selectedActions.has(action.id)}
                  onCheckedChange={() => toggleAction(action.id)}
                  disabled={saving || isLoading}
                />
                <div className="flex-1 min-w-0">
                  <Label
                    htmlFor={`action-${action.id}`}
                    className="font-medium cursor-pointer block"
                  >
                    {action.name}
                  </Label>
                  {action.description && (
                    <p className="text-sm text-muted-foreground mt-1">{action.description}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Selected Actions Summary */}
        {selectedActions.size > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">{t('Selected Actions')}</p>
            <div className="flex flex-wrap gap-2">
              {Array.from(selectedActions)
                .map((id) => availableActions.find((a) => a.id === id))
                .filter(Boolean)
                .map((action) => (
                  <Badge key={action?.id} variant="secondary" className="flex items-center gap-1">
                    {action?.name}
                    <button
                      onClick={() => toggleAction(action!.id)}
                      disabled={saving || isLoading}
                      className="ml-1 hover:text-foreground text-muted-foreground"
                    >
                      <RiCloseLine className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex gap-2 pt-4">
          <Button onClick={handleSave} disabled={!isModified || saving || isLoading}>
            {saving ? t('Saving…') : t('Save Changes')}
          </Button>
          {isModified && !saving && (
            <Button
              variant="outline"
              onClick={() => setSelectedActions(new Set(bot.enabledActions || []))}
              disabled={saving || isLoading}
            >
              {t('Reset')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
