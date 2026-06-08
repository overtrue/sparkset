'use client';

import { RiShieldKeyholeLine, RiUser3Line, RiVerifiedBadgeLine } from '@remixicon/react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/contexts/AuthContext';
import { useTranslations } from '@/i18n/use-translations';
import { formatDateTime } from '@/lib/utils/date';
import { PageHeader } from '@/components/page-header';

export default function ProfilePage() {
  const t = useTranslations();
  const user = useUser();

  if (!user) {
    return null;
  }

  const getAvatarFallback = () => {
    if (user.displayName) return user.displayName.charAt(0).toUpperCase();
    if (user.username) return user.username.charAt(0).toUpperCase();
    return user.provider.charAt(0).toUpperCase();
  };

  return (
    <div className="space-y-6">
      <PageHeader titleKey="Profile" descriptionKey="View and manage your account information" />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RiUser3Line className="h-5 w-5" />
              {t('Basic Information')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src="" alt={user.username} />
                <AvatarFallback className="text-lg">{getAvatarFallback()}</AvatarFallback>
              </Avatar>
              <div>
                <div className="text-lg font-semibold">{user.displayName || user.username}</div>
                <div className="text-sm text-muted-foreground">{user.email || t('No email')}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">{t('User ID')}:</span>
                <div className="font-mono">{user.id}</div>
              </div>
              <div>
                <span className="text-muted-foreground">{t('UID')}:</span>
                <div className="font-mono text-xs break-all">{user.uid}</div>
              </div>
              <div>
                <span className="text-muted-foreground">{t('Provider')}:</span>
                <div className="font-mono">{user.provider}</div>
              </div>
              <div>
                <span className="text-muted-foreground">{t('Status')}:</span>
                <Badge variant={user.isActive ? 'default' : 'destructive'}>
                  {user.isActive ? t('Active') : t('Disabled')}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Permissions Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RiShieldKeyholeLine className="h-5 w-5" />
              {t('Permissions and Roles')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-2 text-sm font-medium text-muted-foreground">{t('Roles')}</div>
              <div className="flex flex-wrap gap-2">
                {user.roles.length > 0 ? (
                  user.roles.map((role) => (
                    <Badge key={role} variant="secondary">
                      {role}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">{t('No roles')}</span>
                )}
              </div>
            </div>
            <div>
              <div className="mb-2 text-sm font-medium text-muted-foreground">
                {t('Permissions')}
              </div>
              <div className="flex flex-wrap gap-2">
                {user.permissions.length > 0 ? (
                  user.permissions.map((perm) => (
                    <Badge key={perm} variant="outline" className="font-mono text-xs">
                      {perm}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">{t('No permissions')}</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timestamps Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RiVerifiedBadgeLine className="h-5 w-5" />
              {t('Account Timeline')}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">{t('Created At')}:</span>
              <div>{formatDateTime(user.createdAt)}</div>
            </div>
            <div>
              <span className="text-muted-foreground">{t('Updated At')}:</span>
              <div>{formatDateTime(user.updatedAt)}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
