'use client';

import { useState } from 'react';
import { useTranslations } from '@/shared/i18n';
import { Alert, AlertDescription, Button } from '@/shared/ui';
import type { UploadMemoriesErrorKey } from '../api/types';
import { uploadMemoriesAction } from '../api/action';
import { FileZone } from './FileZone';
import { InstagramInput } from './InstagramInput';
import { SuccessScreen } from './SuccessScreen';

export function UploadMemoriesForm() {
  const tErrors = useTranslations('features.uploadMemories.errors');
  const tForm = useTranslations('features.uploadMemories.form');
  const [files, setFiles] = useState<File[]>([]);
  const [previewURLs, setPreviewURLs] = useState<string[]>([]);
  const [instagram, setInstagram] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newlySelected = Array.from(e.target.files || []);
    if (newlySelected.length === 0) return;

    const newUrls = newlySelected.map((file) => URL.createObjectURL(file));

    setFiles((prev) => [...prev, ...newlySelected]);
    setPreviewURLs((prev) => [...prev, ...newUrls]);
  };

  const handleFileRemove = (index: number) => {
    URL.revokeObjectURL(previewURLs[index]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewURLs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleReset = () => {
    previewURLs.forEach((url) => URL.revokeObjectURL(url));
    setFiles([]);
    setPreviewURLs([]);
    setInstagram('');
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!files || files.length === 0) {
      setError(tErrors('noFiles'));
      return;
    }

    const tooLarge = files.some((file) => file.size > 100 * 1024 * 1024);
    if (tooLarge) {
      setError(tErrors('fileTooLarge'));
      return;
    }

    try {
      setIsLoading(true);
      const cleanInstagram = instagram.trim().replace('@', '');

      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));
      formData.append('instagram', cleanInstagram);

      const result = await uploadMemoriesAction(formData);
      if (!result.success) {
        const errorKey = (result.errorKey ?? 'unknown') as UploadMemoriesErrorKey;
        setError(tErrors(errorKey));
        return;
      }

      setSuccess(true);
      setFiles([]);
      setInstagram('');
      previewURLs.forEach((url) => URL.revokeObjectURL(url));
      setPreviewURLs([]);
    } catch (error) {
      console.error(error);
      setError(tErrors('unknown'));
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return <SuccessScreen onReset={() => setSuccess(false)} />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <FileZone
        files={files}
        previewURLs={previewURLs}
        onChange={handleFileChange}
        onRemove={handleFileRemove}
      />

      <InstagramInput value={instagram} onChange={setInstagram} />

      <div className="pt-2">
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? tForm('uploading') : tForm('upload')}
        </Button>
      </div>
    </form>
  );
}
