import { useState, useEffect } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResizableLogoProps {
  src: string;
  alt: string;
  className?: string;
}

export const ResizableLogo = ({ src, alt, className }: ResizableLogoProps) => {
  const [size, setSize] = useState(() => {
    const saved = localStorage.getItem("euvatar-logo-size");
    const parsed = saved ? parseInt(saved, 10) : 96;

    // If the user has an old saved size that is too small, bump it up.
    if (!Number.isFinite(parsed) || parsed < 80) return 96;

    return parsed;
  });

  useEffect(() => {
    localStorage.setItem("euvatar-logo-size", size.toString());
  }, [size]);

  const increasSize = () => {
    setSize((prev) => Math.min(prev + 8, 200)); // max 200px
  };

  const decreaseSize = () => {
    setSize((prev) => Math.max(prev - 8, 64)); // min 64px (avoid tiny logo)
  };

  return (
    <div className="flex items-center gap-2 group">
      <img
        src={src}
        alt={alt}
        className={
          className ?? "w-auto object-contain -translate-y-2 origin-left scale-[1.25]"
        }
        style={{ height: `${size}px` }}
      />
      <div className="hidden group-hover:flex items-center gap-1 ml-2">
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={decreaseSize}
          className="h-6 w-6 p-0"
        >
          <Minus className="h-3 w-3" />
        </Button>
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={increasSize}
          className="h-6 w-6 p-0"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};