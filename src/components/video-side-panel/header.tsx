"use client";

import { TabsList, TabsTrigger } from "@/ui/tabs";
import { SidebarHeader } from "@/ui/sidebar";
import { Separator } from "@/ui/separator";
import { VideoSidePanelDefinition } from "@/components/video-side-panel/types";

export default function VideoSidePanelHeader(props: {
    panels: VideoSidePanelDefinition[];
    currentPanel: VideoSidePanelDefinition;
    openDialog: () => void;
}) {
    const hasHeaderBody = props.currentPanel.renderHeaderBody !== undefined;

    return (
        <SidebarHeader
            style={{ color: "#ff8800" }}
            className="border-b p-3 font-semibold text-sm bg-[#181818] border-[#333]"
        >
            <div className="flex justify-between">
                <TabsList className="bg-[#222] border border-[#333] h-8">
                    {props.panels.map((panel) => (
                        <TabsTrigger
                            key={panel.key}
                            value={panel.key}
                            className="data-[state=active]:bg-[#3a2b00] data-[state=active]:text-[#ff8800] text-white"
                        >
                            {panel.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {props.currentPanel.renderHeaderActions?.({ openDialog: props.openDialog })}
            </div>

            {hasHeaderBody
                ? (
                    <>
                        <Separator className="bg-[#333]" />
                        {props.currentPanel.renderHeaderBody?.()}
                    </>
                )
                : null}
        </SidebarHeader>
    );
}
