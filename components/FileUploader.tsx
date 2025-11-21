import React, { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, X } from 'lucide-react';
import { cn } from '../utils/cn';

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFilesSelected }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = (Array.from(e.dataTransfer.files) as File[]).filter(f => 
      f.name.endsWith('.xlsx') || 
      f.name.endsWith('.xls') || 
      f.name.endsWith('.csv') ||
      f.name.endsWith('.ods')
    );
    if (files.length > 0) {
      addFiles(files);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as File[];
      addFiles(files);
    }
  };

  const addFiles = (newFiles: File[]) => {
    setSelectedFiles(prev => {
        const combined = [...prev, ...newFiles];
        onFilesSelected(combined);
        return combined;
    });
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => {
        const updated = prev.filter((_, i) => i !== index);
        onFilesSelected(updated);
        return updated;
    });
  };

  return (
    <div className="w-full space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center w-full h-48 rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer",
          isDragging 
            ? "border-blue-500 bg-blue-50" 
            : "border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400"
        )}
      >
        <input
            type="file"
            multiple
            accept=".xlsx, .xls, .csv, .ods"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleFileInput}
        />
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <div className="p-3 bg-white rounded-full shadow-sm mb-3">
            <Upload className="w-6 h-6 text-blue-500" />
          </div>
          <p className="mb-2 text-sm text-slate-700 font-medium">
            <span className="font-semibold">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-slate-500">Supports .xlsx, .xls, .ods, .csv</p>
        </div>
      </div>

      {selectedFiles.length > 0 && (
        <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Selected Files ({selectedFiles.length})</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {selectedFiles.map((file, idx) => (
                    <div key={`${file.name}-${idx}`} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                        <div className="flex items-center space-x-3">
                            <FileSpreadsheet className="w-5 h-5 text-green-600" />
                            <span className="text-sm text-slate-700 truncate max-w-[200px]">{file.name}</span>
                        </div>
                        <button 
                            onClick={() => removeFile(idx)}
                            className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-red-500"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
};