"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, Image as ImageIcon, Video, Loader2 } from "lucide-react";

export interface Photo {
    id: string;
    url: string;
    file?: File;
    type: "photo" | "video";
    poster?: string; // Base64 poster frame for videos

}

interface UploaderProps {
    onUpload: (photos: Photo[]) => void;
}

export function Uploader({ onUpload }: UploaderProps) {
    const [isProcessing, setIsProcessing] = useState(false);

    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            setIsProcessing(true);
            setTimeout(() => {
                const newPhotos: Photo[] = acceptedFiles.map((file) => {
                    const uuid = (typeof crypto !== 'undefined' && crypto.randomUUID)
                        ? crypto.randomUUID()
                        : Math.random().toString(36).substring(2) + Date.now().toString(36);

                    return {
                        id: uuid,
                        url: URL.createObjectURL(file),
                        file,
                        type: file.type.startsWith("video/") ? "video" : "photo",
                    };
                });
                setIsProcessing(false);
                onUpload(newPhotos);
            }, 1200);
        },
        [onUpload]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "image/*": [".jpeg", ".png", ".jpg", ".heic", ".webp"],
            "video/*": [".mp4", ".webm", ".mov"],
        },
        multiple: true,
    });

    return (
        <div
            {...getRootProps()}
            className={`relative flex cursor-pointer flex-col items-center justify-center rounded-3xl p-12 text-center transition-all duration-500 group ${isDragActive
                ? "border-2 border-purple-400 bg-purple-50"
                : "border-2 border-dashed border-purple-200 hover:border-purple-300 hover:bg-purple-50/50"
                }`}
        >
            <input {...getInputProps()} />

            {/* Hover glow */}
            <div className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(ellipse_at_center,rgba(216,180,254,0.15),transparent_70%)]" />

            {isProcessing ? (
                <div className="flex flex-col items-center gap-4 text-purple-600">
                    <div className="relative">
                        <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
                        <div className="absolute inset-0 rounded-full bg-purple-200 blur-xl animate-pulse" />
                    </div>
                    <p className="font-serif text-lg italic text-slate-600">Curating your memories…</p>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-4 text-slate-500">
                    <div className="relative">
                        <div className={`rounded-full p-4 border transition-all duration-500 ${isDragActive
                            ? "border-purple-300 bg-purple-100"
                            : "border-purple-100 bg-white group-hover:border-purple-200 group-hover:bg-purple-50 shadow-sm"
                            }`}>
                            <UploadCloud className={`h-10 w-10 transition-colors duration-300 ${isDragActive ? "text-purple-600" : "text-purple-400 group-hover:text-purple-500"
                                }`} />
                        </div>
                        <div className="absolute inset-0 rounded-full border border-purple-300/0 group-hover:border-purple-300/30 group-hover:scale-150 transition-all duration-700 pointer-events-none" />
                    </div>
                    <div>
                        <p className="font-semibold text-xl text-slate-800 tracking-tight">
                            {isDragActive ? "Drop your memories" : "Upload photos & videos"}
                        </p>
                        <p className="mt-1.5 text-sm text-slate-500 font-medium">
                            Drag & drop your memories, or click to browse
                        </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 mt-2">
                        <div className="flex items-center gap-1.5 bg-white rounded-full px-4 py-1.5 border border-purple-100 shadow-sm">
                            <ImageIcon className="h-3.5 w-3.5 text-purple-400" />
                            <span>JPG, PNG, HEIC, WEBP</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white rounded-full px-4 py-1.5 border border-purple-100 shadow-sm">
                            <Video className="h-3.5 w-3.5 text-teal-400" />
                            <span>MP4, WEBM, MOV</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
