/**
 * UserMenu Component
 * Displays user information and logout button in the header
 */

'use client';

import { RiLogoutCircleRLine, RiSettings3Line, RiUser3Line } from '@remixicon/react';
import { useRouter } from 'next/navigation';

import { useAuth, useUser } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

export function UserMenu() {
  const user = useUser();
  const { logout } = useAuth();
  const router = useRouter();

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const getAvatarFallback = () => {
    if (user.displayName) return user.displayName.charAt(0).toUpperCase();
    if (user.username) return user.username.charAt(0).toUpperCase();
    return user.provider.charAt(0).toUpperCase();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 px-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src="" alt={user.username} />
            <AvatarFallback>{getAvatarFallback()}</AvatarFallback>
          </Avatar>
          <span className="hidden lg:inline text-sm font-medium">
            {user.displayName || user.username}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium leading-none">{user.displayName || user.username}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
            <RiUser3Line className="mr-2 h-4 w-4" />
            个人资料
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
            <RiSettings3Line className="mr-2 h-4 w-4" />
            设置
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <div className="px-2 py-1">
            <div className="text-xs font-medium text-muted-foreground mb-1">角色</div>
            <div className="flex flex-wrap gap-1">
              {user.roles.length > 0 ? (
                user.roles.map((role) => (
                  <Badge key={role} variant="secondary" className="text-xs">
                    {role}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">无角色</span>
              )}
            </div>
          </div>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
          <RiLogoutCircleRLine className="mr-2 h-4 w-4" />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
