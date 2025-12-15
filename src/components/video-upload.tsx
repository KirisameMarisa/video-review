"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import * as api from "@/lib/api"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Upload } from "lucide-react";
import path from "path";
import { useTranslations } from "next-intl";

export default function VideoUploadDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const t = useTranslations("video-upload");
    const [folderKeys, setFolderKeys] = useState<string[]>([]);
    const [selectedFolderKey, setSelectedFolderKey] = useState<string>("");
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        (async () => {
            try {
                const keys = await api.getVideoFolderKeys();
                setFolderKeys(keys);
            } finally {

            }
        })();
    }, []);

    const handleUpload = async () => {
        if (!selectedFolderKey || !file) {
            setMessage(t("errorNoInput"));
            return;
        }
        const title = path.parse(file.name).name

        setUploading(true);
        setMessage("");
        const data = await api.uploadVideo({ title, folderKey: selectedFolderKey, file })
        if (!data.sucess) {
            setMessage(data.msg);
            setUploading(false);
        } else {
            onClose();
        }
    };

    return (
        <Dialog open={open} onOpenChange={() => !uploading && onClose()}>
            <DialogContent className="bg-[#202020] text-white border border-[#333]">
                <DialogHeader>
                    <DialogTitle className="text-[#ff8800]">{t("title")}</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-3">
                    <label
                        htmlFor="video-file"
                        className="flex items-center justify-between w-full p-2 rounded bg-[#303030] border border-[#444] cursor-pointer hover:bg-[#383838]"
                    >
                        <span className="text-[#aaa]">
                            {file ? file.name : t("selectFile")}
                        </span>
                        <input
                            id="video-file"
                            type="file"
                            accept="video/mp4"
                            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                            className="hidden"
                        />
                        <Upload size={16} className="text-[#666]" />
                    </label>

                    <input
                        type="text"
                        list="folder-key-options"
                        placeholder={t("folderKeyPlaceholder")}
                        value={selectedFolderKey}
                        onChange={(e) => setSelectedFolderKey(e.target.value)}
                        className="w-full p-2 rounded bg-[#303030] border border-[#444] text-white text-left"
                    />

                    <datalist id="folder-key-options">
                        {folderKeys.map((key) => (
                            <option key={key} value={key} />
                        ))}
                    </datalist>
                </div>

                {message && <div className="text-sm text-[#ccc] mt-2">{message}</div>}

                <div className="flex justify-end gap-2 mt-4">
                    <Button
                        variant="ghost"
                        disabled={uploading}
                        onClick={onClose}
                        className="text-white hover:bg-[#2a2a2a]"
                    >
                        {t("cancel")}
                    </Button>
                    <Button
                        onClick={handleUpload}
                        disabled={!file || uploading}
                        className="bg-[#ff8800] text-black hover:bg-[#ff9900]"
                    >
                        {uploading ? t("uploading") : t("upload")}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
