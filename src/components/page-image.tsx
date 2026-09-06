interface PageImageProps {
  src: string
  alt: string
  className?: string
}

const PageImage = ({ src, alt, className }: PageImageProps) => (
  <img
    src={src}
    alt={alt}
    style={{
      maxWidth: "100%",
      height: "60vh",
      marginBottom: "20px",
    }}
    className={className}
  />
)

export default PageImage
