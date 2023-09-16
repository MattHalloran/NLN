import { createContext } from "react";
import { Session } from "types";

export const SessionContext = createContext<Session | undefined>(undefined);
