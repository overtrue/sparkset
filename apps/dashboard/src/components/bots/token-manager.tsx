'use client';

import { useState } from 'react';
import { useTranslations } from '@/i18n/use-translations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { RiFileCopyLine, RiRefreshLine } from '@remixicon/react';
import { toast } from 'sonner';
import type { Bot } from '@/types/api';
import { useRegenerateToken } from '@/lib/api/bots-hooks';

interface TokenManagerProps {
  bot: Bot;
  onTokenRegenerated?: () => void;
}

export function TokenManager({ bot, onTokenRegenerated }: TokenManagerProps) {
  const t = useTranslations();
  const { trigger: regenerateToken } = useRegenerateToken();
  const [showToken, setShowToken] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const webhookUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/webhooks/bot/${bot.id}/${bot.webhookToken}`;

  const handleCopyToken = () => {
    navigator.clipboard.writeText(bot.webhookToken);
    toast.success(t('Token copied to clipboard'));
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success(t('Webhook URL copied to clipboard'));
  };

  const handleRegenerate = async () => {
    if (!confirm(t('Regenerate token? Old token will be invalidated.'))) {
      return;
    }

    setRegenerating(true);
    try {
      await regenerateToken(bot.id);
      toast.success(t('Token regenerated successfully'));
      onTokenRegenerated?.();
    } catch (error) {
      toast.error(t('Failed to regenerate token'));
      console.error('Error regenerating token:', error);
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Webhook Token')}</CardTitle>
        <CardDescription>{t('Use this token to authenticate webhook requests')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Token Display */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('Token')}</label>
          <div className="flex gap-2">
            <Input
              type={showToken ? 'text' : 'password'}
              value={bot.webhookToken}
              readOnly
              className="font-mono text-xs"
            />
            <Button variant="outline" size="sm" onClick={handleCopyToken} title={t('Copy')}>
              <RiFileCopyLine className="h-4 w-4" />
            </Button>
          </div>
          <button
            onClick={() => setShowToken(!showToken)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {showToken ? t('Hide') : t('Show')}
          </button>
        </div>

        {/* Webhook URL */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('Bot Webhook URL')}</label>
          <div className="flex gap-2">
            <Input value={webhookUrl} readOnly className="font-mono text-xs" />
            <Button variant="outline" size="sm" onClick={handleCopyUrl} title={t('Copy')}>
              <RiFileCopyLine className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('Configure this URL as your webhook endpoint in your bot platform settings')}
          </p>
        </div>

        {/* Regenerate Button */}
        <div className="pt-4">
          <Button variant="destructive" onClick={handleRegenerate} disabled={regenerating}>
            <RiRefreshLine className="h-4 w-4" />
            {regenerating ? t('Regenerating...') : t('Regenerate')}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            {t(
              'Regenerating will invalidate the old token. Update your webhook configuration immediately.',
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
