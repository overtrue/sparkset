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
import {
  RiBarChartLine,
  RiBookOpenLine,
  RiDashboardLine,
  RiDatabase2Line,
  RiDatabaseLine,
  RiFlashlightLine,
  RiGithubLine,
  RiHeart2Line,
  RiPlayLine,
  RiSparkling2Line,
} from '@remixicon/react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType } from 'react';
import * as React from 'react';
import { SearchForm } from './search-form';

interface MenuItem {
  title: string;
  url: string;
  icon: ComponentType<{ className?: string }>;
  external?: boolean;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const t = useTranslations();

  const menuGroups: MenuGroup[] = [
    {
      label: t('Features'),
      items: [
        { title: t('Query'), url: '/query', icon: RiPlayLine },
        { title: t('Datasets'), url: '/datasets', icon: RiDatabaseLine },
        { title: t('Charts'), url: '/charts', icon: RiBarChartLine },
        { title: t('Dashboards'), url: '/dashboards', icon: RiDashboardLine },
        { title: t('Actions'), url: '/actions', icon: RiFlashlightLine },
        { title: t('Datasources'), url: '/', icon: RiDatabase2Line },
        { title: t('AI Providers'), url: '/ai-providers', icon: RiSparkling2Line },
      ],
    },
    {
      label: t('Others'),
      items: [
        {
          title: t('Repository'),
          url: 'https://github.com/overtrue/sparkset',
          icon: RiGithubLine,
          external: true,
        },
        {
          title: t('Documentation'),
          url: 'https://github.com/overtrue/sparkset',
          icon: RiBookOpenLine,
          external: true,
        },
        {
          title: t('Sponsor'),
          url: 'https://github.com/sponsors/overtrue',
          icon: RiHeart2Line,
          external: true,
        },
      ],
    },
  ];

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 p-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <RiSparkling2Line className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-semibold">Sparkset</span>
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
                    <SidebarMenuItem key={item.url + item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className="group/menu-button font-medium gap-3 h-9 rounded-md bg-linear-to-r hover:bg-transparent hover:from-sidebar-accent hover:to-sidebar-accent/40 data-[active=true]:from-primary/20 data-[active=true]:to-primary/5 [&>svg]:size-auto"
                      >
                        <Link {...linkProps}>
                          <Icon
                            className="h-5 w-5 text-muted-foreground group-data-[active=true]/menu-button:text-foreground"
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
