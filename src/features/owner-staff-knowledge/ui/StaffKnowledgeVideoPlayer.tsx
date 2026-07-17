type StaffKnowledgeVideoPlayerProps = {
  url: string;
  title?: string;
};

export function StaffKnowledgeVideoPlayer({ url, title }: StaffKnowledgeVideoPlayerProps) {
  const trimmed = url.trim();
  if (!trimmed) return null;

  return (
    <div className="overflow-hidden rounded-lg border bg-muted/30">
      <video
        className="aspect-video w-full bg-black"
        controls
        preload="metadata"
        src={trimmed}
        title={title}
      >
        <a href={trimmed} className="text-sm text-primary underline" target="_blank" rel="noreferrer">
          Open video
        </a>
      </video>
    </div>
  );
}
