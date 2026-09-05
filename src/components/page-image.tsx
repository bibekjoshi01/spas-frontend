interface PageImageProps {
  src: string
  alt: string
  className?: string
}

const PageImage = ({ src, alt, className }: PageImageProps) => (
  <img src={src} alt={alt} className={cn("h-auto w-full", className)} />
)

export default PageImage
import { cn } from "@/lib/utils"
