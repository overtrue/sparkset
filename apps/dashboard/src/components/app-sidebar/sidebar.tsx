'use client';

import * as React from 'react';
import { ChevronRight } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
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
  useSidebar,
} from '../ui/sidebar';
import { SearchForm } from './search-form';
import { VersionSwitcher } from './version-switcher';
import { mainNav } from './nav';

const data = {
  versions: ['v0.1.0', 'v0.1.0'],
  navMain: [
    {
      title: '导航',
      items: mainNav.map((item) => ({
        title: item.title,
        url: item.url,
        isActive: false,
      })),
    },
  ],
};

export function AppSidebar() {
  const pathname = usePathname();
  const sidebar = useSidebar();

  return (
    <Sidebar>
      <SidebarHeader>
        <VersionSwitcher versions={data.versions} defaultVersion={data.versions[0]} />
        <SearchForm />
      </SidebarHeader>
      <SidebarContent className="gap-0">
        {data.navMain.map((item) => (
          <Collapsible key={item.title} defaultOpen className="group/collapsible">
            <SidebarGroup>
              <SidebarGroupLabel asChild className="group/label text-sm text-sidebar-foreground">
                <CollapsibleTrigger>
                  {item.title}
                  <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {item.items.map((link) => (
                      <SidebarMenuItem key={link.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={pathname === link.url}
                          onClick={() => {
                            if (sidebar?.setOpen) sidebar.setOpen(false);
                          }}
                        >
                          <Link href={link.url}>{link.title}</Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
