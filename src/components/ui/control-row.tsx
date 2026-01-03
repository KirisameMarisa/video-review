/**
 * A reusable row layout for settings, filters, and search UIs.
 *
 * - Left side: label text (flexible width, truncates if too long)
 * - Right side: control element (input, button, select, etc.)
 *
 * The layout ensures:
 * - The label does not push or shrink the control area
 * - The control keeps its intrinsic size
 * - Consistent horizontal alignment across rows
 *
 * @param label - Text displayed on the left side
 * @param control - Render function for the right-side control
 */
export function ControlRow(label: string, control: () => React.ReactElement) {
    return (
        <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm text-gray-100">
                    {label}
                </span>
            </div>

            <div className="flex-shrink-0 flex justify-end">
                {control()}
            </div>
        </div>
    );
}