import { useState } from 'react';
import './ExportButton.css';

interface ExportButtonProps {
  onClick: () => Promise<void>;
}

export function ExportButton({ onClick }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleClick = async () => {
    setExporting(true);
    setSuccess(false);

    try {
      await onClick();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export image. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      className={`export-button ${exporting ? 'exporting' : ''} ${success ? 'success' : ''}`}
      onClick={handleClick}
      disabled={exporting}
    >
      {exporting ? (
        <>
          <div className="button-spinner"></div>
          Exporting...
        </>
      ) : success ? (
        <>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Exported!
        </>
      ) : (
        <>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export Image
        </>
      )}
    </button>
  );
}
