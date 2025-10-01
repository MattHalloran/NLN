type PerformanceEntry = {
    name: string;
    value: number;
    delta?: number;
    id?: string;
};

type OnPerfEntry = (entry: PerformanceEntry) => void;

const reportWebVitals = (onPerfEntry?: OnPerfEntry): void => {
    if (onPerfEntry && typeof onPerfEntry === "function") {
        // TODO replace with a different library
        // import("web-vitals").then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
        //     getCLS(onPerfEntry);
        //     getFID(onPerfEntry);
        //     getFCP(onPerfEntry);
        //     getLCP(onPerfEntry);
        //     getTTFB(onPerfEntry);
        // });
    }
};

export default reportWebVitals;
