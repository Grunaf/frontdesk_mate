"use client";

import { PreviewCard } from "./PreviewCard";

interface FileZoneProps {
    files: File[];
    previewURLs: string[];
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemove: (index: number) => void;
}

export function FileZone({files, previewURLs, onChange, onRemove}: FileZoneProps) {
    return (
        <div className="relative w-full min-h-[200px] border-2 border-dashed border-white/20 rounded-xl bg-white/5 p-4 transition-colors">    
            <input
                id="file-upload-input"
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={onChange}
            />

            {previewURLs.length === 0 ? (
                <label 
                    htmlFor="file-upload-input" 
                    className="flex flex-col items-center justify-center w-full h-full py-8 cursor-pointer group"
                >
                    <span className="text-3xl block mb-2 group-hover:scale-110 transition-transform">📸</span>
                    <p className="text-sm text-white/80 font-medium">Click to upload photos or videos</p>
                    <p className="text-xs text-white/40 mt-1">Up to 100MB per file</p>
                </label>
            ) : (
                <div 
                    className="grid grid-cols-3 gap-3 w-full h-full items-center">
                    {files.map((file, index) => (
                        <PreviewCard
                            key={index}
                            file={file}
                            src={previewURLs[index]}
                            index={index}
                            onRemove={onRemove}
                        />
                    ))}

                    <label
                        htmlFor="file-upload-input"
                        onClick={(e) => {
                            const input = e.currentTarget.closest('label')?.querySelector('input');
                            input?.click();
                        }}
                        className="flex flex-col items-center justify-center aspect-square w-full rounded-xl border border-dashed border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/40 text-white/60 hover:text-white transition-all"
                        title="Add more files"
                    >
                        <span className="text-2xl font-light">+</span>
                        <span className="text-[10px] mt-1 tracking-wide uppercase">Add more</span>
                    </label>
                </div>
            )}
        </div>
    );
}