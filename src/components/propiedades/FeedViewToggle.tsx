"use client";

import Link from "next/link";
import { Smartphone } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useIsMobile } from "~/components/hooks/use-mobile";

interface FeedViewToggleProps {
  slugString: string;
  currentSort: string;
}

export function FeedViewToggle({ slugString, currentSort }: FeedViewToggleProps) {
  const isMobile = useIsMobile();
  if (!isMobile) return null;

  const params = new URLSearchParams();
  params.set("vista", "feed");
  if (currentSort && currentSort !== "default") {
    params.set("sort", currentSort);
  }

  return (
    <Button variant="outline" size="sm" asChild>
      <Link href={`/${slugString}?${params.toString()}`}>
        <Smartphone className="mr-2 h-4 w-4" />
        Explorar
      </Link>
    </Button>
  );
}
