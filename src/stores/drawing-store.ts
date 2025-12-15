import { create } from "zustand";
import * as api from '@/lib/api';

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

                const drawingPath = await api.uploadDrawing(blob, path);
                resolve(drawingPath);
            }, "image/png");
        });
    },
    setNeedSave: (r) => set({ needSave: r })
}));
