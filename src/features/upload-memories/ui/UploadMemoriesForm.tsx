"use client";

import { useState } from "react";
import SubmitBtn from "@/components/ui/submit-btn";
import { uploadMemoriesAction } from "../api/action";

import { FileZone } from "./FileZone";
import { InstagramInput } from "./InstagramInput";
import { SuccessScreen } from "./SuccessScreen";

export function UploadMemoriesForm() {
    const [files, setFiles] = useState<File[]>([]);
    const [previewURLs, setPreviewURLs] = useState<string[]>([]);
    const [instagram, setInstagram] = useState("");
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newlySelected = Array.from(e.target.files || []);
        if (newlySelected.length === 0) return;

        const newUrls = newlySelected.map(file => URL.createObjectURL(file));

        setFiles(prev => [...prev, ...newlySelected]);
        setPreviewURLs(prev => [...prev, ...newUrls]);
    };

    const handleFileRemove = (index: number) => {
        URL.revokeObjectURL(previewURLs[index]);
        setFiles(prev => prev.filter((_, i) => i !== index));
        setPreviewURLs(prev => prev.filter((_, i) => i !== index));
    };

    const handleReset = () => {
        previewURLs.forEach(url => URL.revokeObjectURL(url));
        setFiles([]);
        setPreviewURLs([]);
        setInstagram("");
        setSuccess(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!files || files.length === 0) {
            setError("Please select at least one file.");
            return;
        }

        const tooLarge = files.some(file => file.size > 100 * 1024 * 1024);
        if (tooLarge) {
            setError("One or more files exceed the 100MB limit. Select smaller ones.");
            return;
        }

        try {
            setIsLoading(true);
            const cleanInstagram = instagram.trim().replace("@", "");

            const formData = new FormData();
            files.forEach(file => formData.append("files", file));
            formData.append("instagram", cleanInstagram);

            // куда поместить переменную количество файлов
            await uploadMemoriesAction(formData);

            setSuccess(true);
            setFiles([]);
            setInstagram("");
            previewURLs.forEach(url => URL.revokeObjectURL(url));
            setPreviewURLs([]);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };
    if (success) {
        return <SuccessScreen onReset={() => setSuccess(false)}/>;
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && <p className="text-red-400 text-sm">{error}</p>}
            
            <FileZone 
                files={files} 
                previewURLs={previewURLs} 
                onChange={handleFileChange} 
                onRemove={handleFileRemove} 
            />

            <InstagramInput value={instagram} onChange={setInstagram} />

            <div className="pt-2">
                <SubmitBtn />
                {isLoading && <p className="text-xs text-white/50 mt-2 text-center">Uploading...</p>}
            </div>
        </form>
    );
}