"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import * as api from "@/lib/fetch-wrapper"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Upload } from "lucide-react";
import path from "path";
import { useTranslations } from "next-intl";
import { UploadSession } from "@/lib/db-types";

import { DialogClose } from "@radix-ui/react-dialog";

export default function VideoUploadDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    type UploadStep = "input" | "uploading" | "done" | "error";

    const t = useTranslations("video-upload");
    const [folderKeys, setFolderKeys] = useState<string[]>([]);
    const [selectedFolderKey, setSelectedFolderKey] = useState<string>("");
    const [file, setFile] = useState<File | null>(null);
    const [step, setStep] = useState<UploadStep>("input");
    const [session, setSession] = useState<UploadSession | null>(null);
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

    useEffect(() => {
        if (open) {
            setStep("input");
            setMessage("");
            setFile(null);
            setSelectedFolderKey("");
            setSession(null);
        }
    }, [open])

    const handleUpload = async () => {
        if (!selectedFolderKey || !file) {
            setMessage(t("errorNoInput"));
            return;
        }

        const title = path.parse(file.name).name;

        try {
            setMessage("");

            const init = await api.uploadVideoInit({
                title,
                folderKey: selectedFolderKey,
            });

            setSession(init.session);
            setStep("uploading");

            api.uploadVideo({
                url: init.url,
                session: init.session,
                file,
            });

        } catch {
            setStep("error");
            setMessage(t("errorUploadFailed"));
        }
    };

    useEffect(() => {
        if (step !== "uploading" || !session) return;

        let cancelled = false;

        const timer = setInterval(async () => {
            try {
                const res = await api.checkUploadStatus({
                    session_id: session.id,
                });

                if (cancelled) return;

                if (res.status === "uploaded") {
                    await api.uploadVideoFinish({
                        session_id: session.id,
                    });
                }

                if (res.status === "completed") {
                    setStep("done");
                    onClose();
                    return;
                }
            } catch (e: any) {
                if (e?.status === 404) {
                    setStep("error");
                    setMessage(t("errorUploadFailed"));
                    return;
                }
            }
        }, 1500);

        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, [step, session]);

    return (
        <Dialog open={open} onOpenChange={() => step === "done" || onClose()}>
            <DialogContent className="bg-[#202020]">
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

                <DialogFooter>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button
                            variant="ghost"
                            disabled={step === "uploading"}
                            onClick={onClose}
                            className="bg-[#333] text-white hover:bg-[#fff]"
                        >
                            {t("cancel")}
                        </Button>
                        <Button
                            onClick={handleUpload}
                            disabled={!file || step !== "input"}
                            className="bg-[#ff8800] text-white hover:bg-[#ee3300]"
                        >
                            {step === "uploading" ? t("uploading") : t("upload")}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

