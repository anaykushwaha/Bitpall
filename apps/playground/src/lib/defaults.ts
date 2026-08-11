import { DEFAULT_SCENARIO_ID, getScenario } from "./scenarios";

const defaultScenario = getScenario(DEFAULT_SCENARIO_ID);

export const DEFAULT_POLICY = defaultScenario.policy;
export const DEFAULT_EVENTS_JSON = defaultScenario.eventsJson;
