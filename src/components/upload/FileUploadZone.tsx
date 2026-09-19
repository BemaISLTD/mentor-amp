import { useState, useRef, useCallback } from 'react';
import { cn, formatBytes } from '@/lib/utils';
import { Button, Badge } from '@/components/ui';
import { FileStatusBadge } from '@/components/status/StatusBadges';
import { Upload, File, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import type { FileStatus } from '@/lib/types';

interface UploadedFileInfo {
  file: File;
  status: FileStatus;
  validationErrors?: string[];
}

interface FileUploadZoneProps {
  accept?: string;
  label?: string;
  description?: string;
  onFileSelected?: (file: File) => void;
  onUpload?: (file: File) => Promise<void>;
  className?: string;
  multiple?: boolean;
}

export function FileUploadZone({
  accept = '.csv,.xlsx,.xls',
  label = 'Upload File',
  description = 'Drag and drop or click to browse',
  onFileSelected,
  onUpload,
  className,
}: FileUploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFileInfo | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    const info: UploadedFileInfo = { file, status: 'pending' };
    setUploadedFile(info);
    onFileSelected?.(file);

    if (onUpload) {
      setIsUploading(true);
      setUploadedFile(prev => prev ? { ...prev, status: 'uploaded' } : null);
      try {
        await onUpload(file);
        // Simulate validation
        setUploadedFile(prev => prev ? { ...prev, status: 'validating' } : null);
        await new Promise(r => setTimeout(r, 1500));
        setUploadedFile(prev => prev ? { ...prev, status: 'validated' } : null);
      } catch {
        setUploadedFile(prev => prev ? { ...prev, status: 'failed', validationErrors: ['Upload failed'] } : null);
      } finally {
        setIsUploading(false);
      }
    } else {
      setUploadedFile(prev => prev ? { ...prev, status: 'uploaded' } : null);
    }
  }, [onFileSelected, onUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Drop Zone */}
      <div
        onClick={() => !uploadedFile && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors',
          dragOver
            ? 'border-[--color-primary] bg-blue-50 dark:bg-blue-950/20'
            : uploadedFile
              ? 'border-[--color-border] bg-[--color-muted]/20 cursor-default'
              : 'border-[--color-border] hover:border-[--color-primary] hover:bg-[--color-muted]/20 cursor-pointer',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />
        {isUploading ? (
          <>
            <Loader2 className="h-10 w-10 text-[--color-primary] animate-spin mb-3" />
            <p className="text-sm font-medium">Processing file…</p>
          </>
        ) : uploadedFile ? (
          <>
            <CheckCircle2 className="h-10 w-10 text-green-500 mb-3" />
            <p className="text-sm font-medium">{uploadedFile.file.name}</p>
            <p className="text-xs text-[--color-muted-foreground] mt-1">{formatBytes(uploadedFile.file.size)}</p>
          </>
        ) : (
          <>
            <Upload className="h-10 w-10 text-[--color-muted-foreground] mb-3" />
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-[--color-muted-foreground] mt-1">{description}</p>
            <p className="text-xs text-[--color-muted-foreground] mt-2">Accepted: {accept}</p>
          </>
        )}
      </div>

      {/* File Info */}
      {uploadedFile && (
        <div className="flex items-center gap-3 rounded-md border border-[--color-border] p-3">
          <File className="h-4 w-4 text-[--color-muted-foreground] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{uploadedFile.file.name}</p>
            <p className="text-xs text-[--color-muted-foreground]">
              {formatBytes(uploadedFile.file.size)} · {uploadedFile.file.type || 'Unknown type'}
            </p>
            {uploadedFile.validationErrors?.map((err, i) => (
              <p key={i} className="text-xs text-red-600 mt-0.5">{err}</p>
            ))}
          </div>
          <FileStatusBadge status={uploadedFile.status} />
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => setUploadedFile(null)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
