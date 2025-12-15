"use client";

import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useTranslations } from "next-intl";

interface ShareLinkDialogProps {
    url: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ShareLinkDialog({ url, open, onOpenChange }: ShareLinkDialogProps) {
    const t = useTranslations("share-link");

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-[#202020]">
                <DialogHeader>
                    <DialogTitle>{t("title")}</DialogTitle>
                    <DialogDescription className="text-white">
                        {t("helperText")}
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-4">
                    <Input
                        value={url}
                        readOnly
                        className="w-full text-sm bg-zinc-900 text-white select-all selection:bg-sky-500/40 selection:text-white"
                        onFocus={(e) => e.target.select()}
                    />
                </div>

                <DialogFooter className="mt-4">
                    <DialogClose asChild>
                        <Button variant="secondary" className="bg-[#ff8800] hover:bg-[#ff9900]">{t("close")}</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
