import { Popover, PopoverTrigger, PopoverContent } from "@/ui/popover";
import { Slider } from "@/ui/slider";
import { Button } from "@/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGear } from "@fortawesome/free-solid-svg-icons";
import { ChromePicker } from "react-color";
import { useTranslations } from "next-intl";

export function CanvasSettingsPopover({
    lineWidth,
    setLineWidth,
    color,
    setColor,
}: {
    lineWidth: number;
    setLineWidth: (v: number) => void;
    color: string;
    setColor: (v: string) => void;
}) {
    const t = useTranslations("canvas-setting");
    
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button size="icon" variant="ghost">
                    <FontAwesomeIcon icon={faGear} />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 bg-[#1f1f1f] border border-[#333] text-white">
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium">{t("lineWidth")}</label>
                        <Slider
                            value={[lineWidth]}
                            min={1}
                            max={20}
                            step={1}
                            onValueChange={(v) => setLineWidth(v[0])}
                            className="mt-2"
                        />
                        <div className="text-xs text-gray-200 mt-1">{lineWidth}px</div>
                    </div>
                    <div>
                        <label className="text-sm font-medium">{t("color")}</label>
                        <div className="mt-2 rounded overflow-hidden border border-[#444]">
                            <ChromePicker

                                color={color}
                                onChange={(c) => setColor(c.hex)}
                                disableAlpha
                                styles={{
                                    default: {
                                        picker: {
                                            background: "#1f1f1f",
                                            boxShadow: "none",
                                            border: "1px solid #333",
                                        },

                                        swatch: {
                                            boxShadow: "none",
                                        },
                                    },
                                }}
                            />
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
