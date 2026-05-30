"use client";

interface PreviewCardProps {
    file: File;
    src: string;
    index: number;
    onRemove: (index: number) => void;
}

export function PreviewCard({file, src, index, onRemove}: PreviewCardProps) {
    const isVideo = file.type.startsWith("video/");

    return (                                    
        <div key={index} className="relative aspect-square w-full rounded-xl overflow-hidden bg-white/5 border border-white/10 group/item">
            <button
                type="button"
                onClick={() => onRemove(index)}
                className="absolute top-1.5 right-1.5 z-10 bg-black/60 hover:bg-black text-white rounded-full w-6 h-6 flex items-center justify-center text-xs backdrop-blur-sm transition-colors"
                title="Remove file"
            >
                ✕
            </button>
            {isVideo ? (
                <div className="relative w-full h-full">
                    <video src={src} className="object-cover w-full h-full" muted playsInline/>

                    <div className="absolute bottom-1.5 left-1.5 bg-black/60 backdrop-blur-sm text-[10px] text-white/90 px-1.5 py-0.5 rounded-md flex items-center gap-1 font-medium tracking-wider uppercase pointer-events-none">
                        <span>📹</span>
                        <span>Video</span>
                    </div>
                </div>
            ) : (
                <img src={src} alt={`preview-${index}`} className="object-cover w-full h-full"/>
            )}
        </div>
    );
}