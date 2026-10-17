import "server-only";
import { v4 as uuidv4 } from "uuid";

// Drawings live under one prefix with a server-made name; the client never chooses where bytes land.
export const newDrawingKey = () => `drawing/${uuidv4()}.png`;
