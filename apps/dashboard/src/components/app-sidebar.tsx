'use client';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import type { LucideIcon } from 'lucide-react';
import { BookOpen, Database, Github, Play, Sparkles, Zap } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';
import { SearchForm } from './search-form';

interface MenuItem {
  title: string;
  url: string;
  icon: LucideIcon;
  external?: boolean;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    label: '功能模块',
    items: [
      { title: '数据源', url: '/', icon: Database },
      { title: '查询', url: '/query', icon: Play },
      { title: 'Actions', url: '/actions', icon: Zap },
      { title: 'AI 配置', url: '/ai-providers', icon: Sparkles },
    ],
  },
  {
    label: '其他',
    items: [
      {
        title: '代码仓库',
        url: 'https://github.com/nicepkg/sparkline',
        icon: Github,
        external: true,
      },
      { title: '使用文档', url: '#', icon: BookOpen, external: true },
    ],
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 p-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Database className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-semibold">Sparkline</span>
          </div>
        </div>
        <hr className="border-t border-border mx-2 -mt-px" />
        <SearchForm className="mt-3" />
      </SidebarHeader>
      <SidebarContent>
        {menuGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="uppercase text-muted-foreground">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent className="px-2">
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    !item.external &&
                    (pathname === item.url || (item.url !== '/' && pathname?.startsWith(item.url)));

                  const linkProps = item.external
                    ? { href: item.url, target: '_blank', rel: 'noopener noreferrer' }
                    : { href: item.url };

                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className="group/menu-button font-medium gap-3 h-9 rounded-md bg-gradient-to-r hover:bg-transparent hover:from-sidebar-accent hover:to-sidebar-accent/40 data-[active=true]:from-primary/20 data-[active=true]:to-primary/5 [&>svg]:size-auto"
                      >
                        <Link {...linkProps}>
                          <Icon
                            className="text-muted-foreground group-data-[active=true]/menu-button:text-foreground"
                            size={20}
                            aria-hidden="true"
                          />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
