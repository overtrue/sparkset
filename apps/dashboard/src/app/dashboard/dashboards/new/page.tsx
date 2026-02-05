'use client';

import { useTranslations } from '@/i18n/use-translations';
import { useState } from 'react';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from '@/i18n/client-routing';
import { createDashboard } from '@/lib/api/dashboards';
import { toast } from 'sonner';

export default function NewDashboardPage() {
  const t = useTranslations();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error(t('Please enter dashboard name'));
      return;
    }

    try {
      setLoading(true);
      const dashboard = await createDashboard({
        title: title.trim(),
        description: description.trim() || undefined,
      });
      toast.success(t('Dashboard created successfully'));
      router.push(`/dashboard/dashboards/${dashboard.id}`);
    } catch {
      toast.error(t('Failed to create dashboard'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Create Dashboard')}
        description={t('Create a new data visualization dashboard')}
        backButton={{ useRouter: true }}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t('Basic Info')}</CardTitle>
          <CardDescription>{t('Fill in dashboard basic information')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              void handleSubmit(e);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="title">{t('Name')} *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('Please enter dashboard name')}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('Description')}</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('Please enter dashboard description (optional)')}
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  router.back();
                }}
              >
                {t('Cancel')}
              </Button>
              <Button type="submit" disabled={loading}>
                {t('Create')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
