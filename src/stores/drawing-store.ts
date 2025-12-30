import { create } from "zustand";
import * as api from "@/lib/fetch-wrapper"

interface DrawingState {
    canvasRefElement: HTMLCanvasElement | null,
    canvasEditing: boolean;
    needSave: boolean;

    setCanvasRefElement: (canvas: HTMLCanvasElement | null) => void;
    setCanvasEditing: (r: boolean) => void;
    canvasSave: (drawingPath: string | null) => Promise<string | null>;
    setNeedSave: (r: boolean) => void;
}

export const useDrawingStore = create<DrawingState>((set, get) => ({
    canvasRefElement: null,
    canvasEditing: false,
    needSave: false,

    setCanvasEditing: (r) => set({ canvasEditing: r }),
    setCanvasRefElement: (canvas) => set({ canvasRefElement: canvas }),
    canvasSave: async (path) => {
        if (!get().needSave) return null;
        
        const c = get().canvasRefElement;
        if (!c) return null;

        return new Promise<string | null>((resolve) => {
            c.toBlob(async (blob) => {
                if (!blob) return resolve(null);
                

                const init = await api.uploadDrawingInit({drawingPath: path});
                await api.uploadDrawing({ url: init.url, session: init.session, file: blob });
                const filePath = await api.uploadDrawingFinish({ session_id: init.session.id });

                resolve(filePath);
            }, "image/png");
        });
    },
    setNeedSave: (r) => set({ needSave: r })
}));
