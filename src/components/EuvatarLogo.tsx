import { useEffect, useState } from "react";
import { removeBackground, loadImage } from "@/utils/backgroundRemoval";

interface EuvatarLogoProps {
  className?: string;
  alt?: string;
}

export const EuvatarLogo = ({ className = "h-8", alt = "Euvatar" }: EuvatarLogoProps) => {
  const [logoSrc, setLogoSrc] = useState<string>("/euvatar-logo-original.png");
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const processLogo = async () => {
      try {
        // Load the original image
        const response = await fetch("/euvatar-logo-original.png");
        const blob = await response.blob();
        const img = await loadImage(blob);
        
        // Remove background
        const processedBlob = await removeBackground(img);
        const processedUrl = URL.createObjectURL(processedBlob);
        
        setLogoSrc(processedUrl);
      } catch (error) {
        console.error("Failed to process logo:", error);
        // Fallback to original image
      } finally {
        setIsProcessing(false);
      }
    };

    processLogo();
  }, []);

  if (isProcessing) {
    return <div className={`${className} bg-muted animate-pulse rounded`} />;
  }

  return <img src={logoSrc} alt={alt} className={className} />;
};