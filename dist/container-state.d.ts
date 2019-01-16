import { InspectResult } from "./container";
import { Port } from "./port";
export declare class ContainerState {
    private readonly inspectResult;
    constructor(inspectResult: InspectResult);
    getHostPorts(): Port[];
    getInternalPorts(): Port[];
}
