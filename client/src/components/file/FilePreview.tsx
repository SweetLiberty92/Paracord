import { useState } from 'react';
import { Download, FileText, X } from 'lucide-react';

interface FilePreviewProps {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function FilePreview({ url, filename, mimeType, size }: FilePreviewProps) {
  const [lightbox, setLightbox] = useState(false);

  // Image preview
  if (mimeType.startsWith('image/')) {
    return (
      <>
        <div className="mt-1 max-w-md">
          <img
            src={url}
            alt={filename}
            className="max-h-72 cursor-pointer rounded-xl object-contain"
            style={{ border: '1px solid var(--border-subtle)' }}
            onClick={() => setLightbox(true)}
          />
          <div className="mt-2 flex items-center gap-2.5">
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{filename}</span>
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{formatFileSize(size)}</span>
          </div>
        </div>

        {/* Lightbox */}
        {lightbox && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
            style={{ backgroundColor: 'var(--overlay-backdrop)' }}
            onClick={() => setLightbox(false)}
          >
            <button
              className="absolute right-4 top-4 rounded-full p-2.5"
              style={{
                backgroundColor: 'var(--bg-mod-strong)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <X size={20} />
            </button>
            <img src={url} alt={filename} className="max-w-[90vw] max-h-[90vh] object-contain" />
          </div>
        )}
      </>
    );
  }

  // Video preview
  if (mimeType.startsWith('video/')) {
    return (
      <div className="mt-1 max-w-md">
        <video
          src={url}
          controls
          className="max-h-72 rounded-xl"
          style={{ border: '1px solid var(--border-subtle)' }}
        />
        <div className="mt-2 flex items-center gap-2.5">
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{filename}</span>
        </div>
      </div>
    );
  }

  // Audio preview
  if (mimeType.startsWith('audio/')) {
    return (
      <div className="mt-1 max-w-md">
        <div
          className="flex items-center gap-3 rounded-xl p-3.5"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
        >
          <audio src={url} controls className="h-9 flex-1" />
        </div>
        <div className="mt-2 flex items-center gap-2.5">
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{filename}</span>
        </div>
      </div>
    );
  }

  // Generic file card
  return (
    <div className="mt-1 max-w-sm">
      <a
        href={url}
        download={filename}
        className="flex items-center gap-3.5 rounded-xl p-3.5 transition-colors no-underline"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-mod-subtle)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; }}
      >
        <FileText size={32} style={{ color: 'var(--text-link)', flexShrink: 0 }} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate" style={{ color: 'var(--text-link)' }}>
            {filename}
          </div>
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {formatFileSize(size)}
          </div>
        </div>
        <Download size={20} style={{ color: 'var(--interactive-normal)', flexShrink: 0 }} />
      </a>
    </div>
  );
}
