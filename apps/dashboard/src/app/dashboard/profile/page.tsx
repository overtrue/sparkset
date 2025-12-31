'use client';

/**
 * User Profile Page
 * Displays current user information and settings
 */

import { RiShieldKeyholeLine, RiUser3Line, RiVerifiedBadgeLine } from '@remixicon/react';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@/contexts/AuthContext';

export default function ProfilePage() {
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
              基本信息
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
                <div className="text-sm text-muted-foreground">{user.email || 'No email'}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">用户 ID:</span>
                <div className="font-mono">{user.id}</div>
              </div>
              <div>
                <span className="text-muted-foreground">UID:</span>
                <div className="font-mono text-xs break-all">{user.uid}</div>
              </div>
              <div>
                <span className="text-muted-foreground">提供者:</span>
                <div className="font-mono">{user.provider}</div>
              </div>
              <div>
                <span className="text-muted-foreground">状态:</span>
                <Badge variant={user.isActive ? 'default' : 'destructive'}>
                  {user.isActive ? '活跃' : '禁用'}
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
              权限与角色
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-2 text-sm font-medium text-muted-foreground">角色</div>
              <div className="flex flex-wrap gap-2">
                {user.roles.length > 0 ? (
                  user.roles.map((role) => (
                    <Badge key={role} variant="secondary">
                      {role}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">无角色</span>
                )}
              </div>
            </div>
            <div>
              <div className="mb-2 text-sm font-medium text-muted-foreground">权限</div>
              <div className="flex flex-wrap gap-2">
                {user.permissions.length > 0 ? (
                  user.permissions.map((perm) => (
                    <Badge key={perm} variant="outline" className="font-mono text-xs">
                      {perm}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">无权限</span>
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
              账户时间
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">创建时间:</span>
              <div>{new Date(user.createdAt).toLocaleString()}</div>
            </div>
            <div>
              <span className="text-muted-foreground">更新时间:</span>
              <div>{new Date(user.updatedAt).toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
