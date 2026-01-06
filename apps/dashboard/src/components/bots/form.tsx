'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/client-routing';
import { useTranslations } from '@/i18n/use-translations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import type { Bot, BotPlatform, CreateBotDto, UpdateBotDto } from '@/types/api';
import { useCreateBot, useUpdateBot } from '@/lib/api/bots-hooks';

interface BotFormProps {
  bot?: Bot;
  isLoading?: boolean;
  onSuccess?: () => void;
}

const PLATFORMS: { value: BotPlatform; label: string }[] = [
  { value: 'wecom', label: 'WeChat Work' },
  { value: 'discord', label: 'Discord' },
  { value: 'slack', label: 'Slack' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'custom', label: 'Custom' },
];

export function BotForm({ bot, isLoading, onSuccess }: BotFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const { trigger: createBot } = useCreateBot();
  const { trigger: updateBot } = useUpdateBot();

  const [formData, setFormData] = useState({
    name: bot?.name || '',
    description: bot?.description || '',
    type: (bot?.type || 'wecom') as BotPlatform,
    enableQuery: bot?.enableQuery ?? true,
  });

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error(t('Bot name is required'));
      return;
    }

    setSubmitting(true);

    try {
      if (bot) {
        // Update existing bot
        const updateData: UpdateBotDto = {
          name: formData.name,
          description: formData.description,
          enableQuery: formData.enableQuery,
        };
        await updateBot({ id: bot.id, data: updateData });
        toast.success(t('Bot updated successfully'));
      } else {
        // Create new bot - generate webhook URL
        const webhookUrl = `${window.location.origin}/api/webhooks/bot/[id]/${Math.random().toString(36).substr(2, 9)}`;
        const createData: CreateBotDto = {
          name: formData.name,
          description: formData.description,
          type: formData.type,
          webhookUrl,
          enableQuery: formData.enableQuery,
        };
        await createBot(createData);
        toast.success(t('Bot created successfully'));
      }

      onSuccess?.();
      router.push('/dashboard/bots');
    } catch (error) {
      toast.error(t('Failed to save bot'));
      console.error('Error saving bot:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{bot ? t('Edit Bot') : t('Create Bot')}</CardTitle>
        <CardDescription>
          {bot ? t('Update bot configuration') : t('Create a new bot')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Bot Name */}
          <div className="space-y-2">
            <Label htmlFor="name">{t('Bot Name')}</Label>
            <Input
              id="name"
              placeholder={t('e.g. My Support Bot')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={submitting || isLoading}
              required
            />
            <p className="text-xs text-muted-foreground">{t('A descriptive name for your bot')}</p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t('Description')}</Label>
            <Textarea
              id="description"
              placeholder={t('e.g. Helps with customer support inquiries')}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={submitting || isLoading}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">{t('Optional description of the bot')}</p>
          </div>

          {/* Platform - only shown for new bots */}
          {!bot && (
            <div className="space-y-2">
              <Label htmlFor="type">{t('Platform')}</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value as BotPlatform })}
              >
                <SelectTrigger id="type" disabled={submitting || isLoading}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('Select the platform where your bot will run')}
              </p>
            </div>
          )}

          {/* Enable Query */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enableQuery"
                checked={formData.enableQuery}
                onChange={(e) => setFormData({ ...formData, enableQuery: e.target.checked })}
                disabled={submitting || isLoading}
              />
              <Label htmlFor="enableQuery" className="mb-0">
                {t('Enable AI Query')}
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('Allow this bot to process natural language queries')}
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={submitting || isLoading}>
              {submitting ? t('Saving...') : t('Save')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={submitting || isLoading}
            >
              {t('Cancel')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
