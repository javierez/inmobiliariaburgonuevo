"use client";

import Link from "next/link";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { SlidersHorizontal, Check } from "lucide-react";

const sortOptions = [
  { value: "default", label: "Destacados primero" },
  { value: "newest", label: "Más recientes" },
  { value: "price-asc", label: "Precio: menor a mayor" },
  { value: "price-desc", label: "Precio: mayor a menor" },
  { value: "size-asc", label: "Tamaño: menor a mayor" },
  { value: "size-desc", label: "Tamaño: mayor a menor" },
] as const;

interface SortDropdownProps {
  slugString: string;
  currentSort?: string;
}

export function SortDropdown({ slugString, currentSort = "default" }: SortDropdownProps) {
  const activeLabel = sortOptions.find((o) => o.value === currentSort)?.label ?? "Ordenar";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          {activeLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {sortOptions.map((option) => (
          <DropdownMenuItem key={option.value} asChild>
            <Link href={`/${slugString}?sort=${option.value}`} className="flex w-full items-center justify-between">
              {option.label}
              {currentSort === option.value && <Check className="ml-2 h-4 w-4" />}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
