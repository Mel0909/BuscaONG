'use client'
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useState, useEffect } from "react";

 
function AdminLink({ item, pathname }: { item: any, pathname: string }) {
  const selected = pathname === item.url

  return ( 
    <SidebarMenuItem className={cn("pr-7", item.marginTop && 'mt-2', selected && "hover:text-papel")}>
      <SidebarMenuButton asChild className={cn("pl-7 rounded-l-none transition-colors hover:bg-musgo-escuro", selected && "hover:text-papel")}>
        <Link 
          href={item.url} 
          className={("flex gap-3 " + (selected ? 'bg-musgo hover:bg-musgo' : ''))}
        >
          <item.icon />
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
   );
}

export default AdminLink;