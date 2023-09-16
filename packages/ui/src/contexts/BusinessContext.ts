import { createContext } from "react";
import { BusinessData } from "types";

export const BusinessContext = createContext<BusinessData | undefined>(undefined);
