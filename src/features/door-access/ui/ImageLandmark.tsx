interface ImageLandmarkProps {
  src: string;
  alt: string;
}

export function ImageLandmark({ src, alt }: ImageLandmarkProps) {
  return (
    <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-muted shadow-inner">
      <img src={src} alt={alt} className="h-full w-full object-cover" loading="lazy" />
    </div>
  );
}
