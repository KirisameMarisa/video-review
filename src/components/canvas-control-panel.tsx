"use client";
import React, { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faPen,
    faEraser,
    faSave,
    faFile,
    faGear
} from "@fortawesome/free-solid-svg-icons";
import { useCommentEditStore } from "@/stores/comment-edit-store";
import { useDrawingStore } from "@/stores/drawing-store";
import { CanvasSettingsPopover } from "@/components/canvas-setting";

export default function CanvasControlPanel() {
    const [lineWidth, setLineWidth] = useState<number>(10);
    const [color, setColor] = useState<string>("#ff8800");
    const [mode, setMode] = useState<"pen" | "eraser">("pen");
        
    const {
        needSave,
        canvasRefElement,
        canvasEditing,
        setCanvasEditing,
        setNeedSave } = useDrawingStore();

    const {
        editingComment,
    } = useCommentEditStore();

    const colorRef =  useRef(color);
    const lineWidthRef =  useRef(lineWidth);
    const editingRef = useRef(canvasEditing);
    const modeRef = useRef(mode);

    useEffect(() => {
        lineWidthRef.current = lineWidth;
        colorRef.current = color;
    }, [lineWidth, color]);

    useEffect(() => {
        setCanvasEditing(editingComment ? true : false);
    }, [editingComment]);

    useEffect(() => {
        editingRef.current = canvasEditing;
    }, [canvasEditing]);

    useEffect(() => {
        console.log("needSave", needSave)
    }, [needSave])

    useEffect(() => {
        modeRef.current = mode;
    }, [mode]);

    useEffect(() => {
        const c = canvasRefElement;
        if (!c) return;

        const ctx = c.getContext("2d")!;
        let drawing = false;

        const getPos = (e: MouseEvent, canvas: HTMLCanvasElement) => {
            const rect = canvas.getBoundingClientRect();
            const ratio = window.devicePixelRatio || 1;
            const x = (e.clientX - rect.left) * (canvas.width / rect.width) / ratio;
            const y = (e.clientY - rect.top) * (canvas.height / rect.height) / ratio;
            return { x, y };
        };

        const start = (e: MouseEvent) => {
            if (!editingRef.current) return;
            const pos = getPos(e, canvasRefElement);
            drawing = true;
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
        };

        const move = (e: MouseEvent) => {
            setNeedSave(true);

            if (!editingRef.current || !drawing) return;
            const pos = getPos(e, canvasRefElement);
            switch (modeRef.current) {
                case "pen":
                    ctx.globalCompositeOperation = "source-over";
                    ctx.strokeStyle = colorRef.current;
                    ctx.lineWidth = lineWidthRef.current;
                    break;
                case "eraser":
                    ctx.globalCompositeOperation = "destination-out";
                    ctx.lineWidth = lineWidthRef.current;;
                    break;
            }
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
        };

        const end = () => {
            drawing = false;
            ctx.closePath();
        };

        c.addEventListener("mousedown", start);
        c.addEventListener("mousemove", move);
        c.addEventListener("mouseup", end);
        c.addEventListener("mouseleave", end);

        return () => {
            c.removeEventListener("mousedown", start);
            c.removeEventListener("mousemove", move);
            c.removeEventListener("mouseup", end);
            c.removeEventListener("mouseleave", end);
        };
    }, [canvasRefElement]);

    if (!canvasEditing) {
        return <div></div>
    }

    const handleNewCanvas = () => {
        const c = canvasRefElement;
        if(!c) return;

        const ctx = c.getContext("2d")!;
        if(!ctx) return;

        ctx.clearRect(0, 0, c.width, c.height);
    }

    return (
        <div className="absolute top-2 left-2 flex gap-2 bg-[#202020]/80 p-2 rounded-lg border border-[#333]">
            <button className="p-1"
                onClick={() => {
                    if (mode === "pen") {
                        setMode("eraser")
                    } else if (mode === "eraser") {
                        setMode("pen")
                    }
                }}

            >
                <FontAwesomeIcon icon={mode === "pen" ? faPen : faEraser} />
            </button>
            <button className="p-1"
                onClick={() => handleNewCanvas()}

            >
                <FontAwesomeIcon icon={faFile} />
            </button>
            <CanvasSettingsPopover
                lineWidth={lineWidth}
                setLineWidth={setLineWidth}
                color={color}
                setColor={setColor}
            />
        </div>
    );
}
