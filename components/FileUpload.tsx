import React, { useCallback, useState } from 'react';
import type { ContextFile, UserTier } from '../types';
import { Icon } from './Icon';
import * as pdfjs from 'pdfjs-dist';

// Set worker path for pdf.js from CDN, as specified in importmap
pdfjs.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.6.1/build/pdf.worker.mjs`;

interface FileUploadProps {
  files: ContextFile[];
  setFiles: (files: ContextFile[]) => void;
  maxFiles: number;
  effectiveTier: UserTier;
}

const fileToDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const fileToText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
    });
};

const extractTextFromPdf = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument(arrayBuffer);
    const pdf = await loadingTask.promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => 'str' in item ? item.str : '').join(' ');
        fullText += pageText + '\n\n';
    }
    return fullText.trim();
};


export const FileUpload: React.FC<FileUploadProps> = ({ files, setFiles, maxFiles, effectiveTier }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [processing, setProcessing] = useState(false);

    const handleFileProcessing = useCallback(async (uploadedFiles: FileList | null) => {
        if (!uploadedFiles || uploadedFiles.length === 0) return;
        
        let selectedFiles = Array.from(uploadedFiles);
        setProcessing(true);

        if (maxFiles !== Infinity && (files.length + selectedFiles.length > maxFiles)) {
            alert(`No puedes subir más de ${maxFiles} archivos con tu plan actual. Se han omitido algunos archivos.`);
            const remainingSlots = maxFiles - files.length;
            if (remainingSlots <= 0) {
                setProcessing(false);
                return;
            }
            selectedFiles = selectedFiles.slice(0, remainingSlots);
        }

        const newContextFilesPromises = selectedFiles.map(async (file): Promise<ContextFile | null> => {
            const extension = file.name.split('.').pop()?.toLowerCase();
            try {
                if (extension === 'txt') {
                    const content = await fileToText(file);
                    return { name: file.name, type: 'text', content };
                } else if (['jpg', 'jpeg', 'png'].includes(extension || '')) {
                    const dataUrl = await fileToDataURL(file);
                    const base64Content = dataUrl.split(',')[1];
                    return { name: file.name, type: 'image', content: base64Content };
                } else if (extension === 'pdf') {
                    const content = await extractTextFromPdf(file);
                    return { name: file.name, type: 'pdf', content };
                } else {
                    console.warn(`Unsupported file type: ${file.name}`);
                    alert(`Tipo de archivo no soportado: ${file.name}`);
                    return null;
                }
            } catch (error) {
                console.error(`Error processing file ${file.name}:`, error);
                alert(`No se pudo procesar el archivo: ${file.name}`);
                return null;
            }
        });
        
        const newContextFiles = (await Promise.all(newContextFilesPromises)).filter((file): file is ContextFile => file !== null);
        
        const updatedFiles = [...files];
        newContextFiles.forEach(newFile => {
            if (!updatedFiles.some(existingFile => existingFile.name === newFile.name)) {
                updatedFiles.push(newFile);
            }
        });
        
        setFiles(updatedFiles);
        setProcessing(false);
    }, [files, setFiles, maxFiles]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFileProcessing(e.target.files);
        e.target.value = ''; // Reset file input to allow uploading the same file again
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation(); 
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileProcessing(e.dataTransfer.files);
            e.dataTransfer.clearData();
        }
    };

    const removeFile = (fileName: string) => {
        setFiles(files.filter(f => f.name !== fileName));
    };

    return (
        <div className="space-y-4">
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                className={`relative flex justify-center items-center w-full px-6 py-10 border-2 border-dashed rounded-lg transition-colors
                    ${isDragging ? 'border-primary bg-surface' : 'border-border-color hover:border-primary'}`}
            >
                {processing && <div className="absolute inset-0 bg-surface/50 flex items-center justify-center rounded-lg"><Icon name="loader" className="w-8 h-8"/></div>}
                <input id="file-upload" type="file" className="hidden" multiple accept=".txt,.pdf,.jpg,.jpeg,.png" onChange={handleFileChange} disabled={processing} />
                <label htmlFor="file-upload" className={`flex flex-col items-center text-center ${processing ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                    <Icon name="upload" className="w-10 h-10 text-text-secondary" />
                    <p className="mt-2 text-sm text-text-main">
                        <span className="font-semibold text-primary">Haz clic para subir</span> o arrastra y suelta
                    </p>
                    <p className="text-xs text-text-secondary">TXT, PDF, JPG, PNG (Máx: {maxFiles === Infinity ? 'Ilimitado' : maxFiles})</p>
                </label>
            </div>
            
            {files.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-text-secondary">Archivos Cargados:</h4>
                    <ul className="divide-y divide-border-color rounded-md border border-border-color">
                        {files.map(file => (
                            <li key={file.name} className="flex items-center justify-between p-3 bg-brand-bg">
                                <div className="flex items-center min-w-0">
                                    <Icon name={file.type === 'image' ? 'image' : 'file-text'} className="w-5 h-5 mr-3 text-primary flex-shrink-0" />
                                    <p className="text-sm text-text-main truncate" title={file.name}>{file.name}</p>
                                </div>
                                <button onClick={() => removeFile(file.name)} className="text-red-400 hover:text-red-600 flex-shrink-0 ml-4">
                                    <Icon name="x-circle" className="w-5 h-5" />
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};