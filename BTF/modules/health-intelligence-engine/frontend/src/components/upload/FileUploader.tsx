import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';
import { api } from '../../lib/api';

interface FileUploaderProps {
  entityType: 'health_record' | 'necropsy' | 'disease';
  entityId: string;
  onUploadComplete?: (urls: string[]) => void;
  acceptedTypes?: string;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ 
  entityType, 
  entityId, 
  onUploadComplete,
  acceptedTypes = 'image/*,application/pdf' 
}) => {
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const formData = new FormData();
    acceptedFiles.forEach(file => formData.append('files', file));
    formData.append('entityType', entityType);
    formData.append('entityId', entityId);

    const response = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    onUploadComplete?.(response.data.urls);
  }, [entityType, entityId, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: acceptedTypes.split(',').reduce((acc, type) => ({ ...acc, [type.trim()]: [] }), {})
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${
        isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-slate-400'
      }`}
    >
      <input {...getInputProps()} />
      <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
      <p className="text-sm text-slate-600">
        {isDragActive ? 'Upuść pliki tutaj...' : 'Przeciągnij pliki lub kliknij, aby wybrać'}
      </p>
      <p className="text-xs text-slate-400 mt-1">Akceptowane: JPG, PNG, PDF</p>
    </div>
  );
};
