export type Channel = 'sms' | 'voice' | 'chat';
export type Status = 'running' | 'passed' | 'failed' | 'aborted';
export type ScenarioChannel = 'any' | Channel;
export type ChatMessageType = 'Live_Chat' | 'WebChat' | 'SMS' | 'Custom';

export interface SessionRow {
  id: number;
  channel: Channel;
  name: string | null;
  status: Status;
  turns: number;
  score: number | null;
  bot_number: string;
  created_at: string;
  finished_at: string | null;
  messages: number;
}

export interface JudgeCheck {
  check: string;
  pass: boolean;
  reason: string;
}

export interface JudgeResult {
  overall_pass: boolean;
  score: number;
  goal_achieved?: boolean;
  checks?: JudgeCheck[];
  issues?: string[];
  summary?: string;
  end_reason?: string;
  turns?: number;
  transcript?: string;
  extra?: { call_id?: string; duration_sec?: number | null; recording_url?: string | null };
}

export interface SessionScenario {
  name?: string;
  persona?: string;
  goal?: string;
  checks?: string[];
  max_turns?: number;
  /** SMS only: the bot sends the first message (e.g. a form-triggered workflow). */
  bot_starts?: boolean;
}

export interface Session {
  id: number;
  channel: Channel;
  status: Status;
  turns: number;
  scenario: SessionScenario;
  result: JudgeResult | null;
  tester_number: string;
  bot_number: string;
  external_ref: string | null;
  created_at: string;
  finished_at: string | null;
}

export interface Message {
  role: 'tester' | 'bot';
  content: string;
  at: string;
}

export interface SessionDetail {
  session: Session;
  messages: Message[];
}

export interface Scenario {
  id: number;
  channel: ScenarioChannel;
  name: string;
  persona: string;
  goal: string;
  checks: string[];
  max_turns: number;
  bot_starts?: boolean;
  created_at: string;
  updated_at: string;
}

export type ScenarioInput = Omit<Scenario, 'id' | 'created_at' | 'updated_at'> & { id?: number };

export interface TestScenario {
  name: string;
  persona: string;
  goal: string;
  checks: string[];
  max_turns: number;
  bot_starts?: true;
}

export interface SmsTarget {
  tester_number: string;
  bot_number: string;
}
export interface VoiceTarget {
  from_number: string;
  to_number: string;
  tester_agent_id?: string;
}
export interface ChatTarget {
  location_id: string;
  message_type: ChatMessageType;
  conversation_provider_id?: string | null;
}

export type StartTestInput =
  | { channel: 'sms'; target: SmsTarget; scenario: TestScenario }
  | { channel: 'voice'; target: VoiceTarget; scenario: TestScenario }
  | { channel: 'chat'; target: ChatTarget; scenario: TestScenario };

export interface StartTestResult {
  session_id: number;
  call_id?: string;
  contact_id?: string;
}

/** Maps each action to its request payload and response data. */
export interface ApiActions {
  list_sessions: { req: { channel?: '' | Channel; limit?: number }; res: SessionRow[] };
  get_session: { req: { id: number }; res: SessionDetail | null };
  abort_session: { req: { id: number }; res: { aborted: 0 | 1 } };
  start_test: { req: StartTestInput; res: StartTestResult };
  list_scenarios: { req: Record<string, never>; res: Scenario[] };
  save_scenario: { req: { scenario: ScenarioInput }; res: Scenario | null };
  delete_scenario: { req: { id: number }; res: { deleted: 0 | 1 } };
}

export type ApiAction = keyof ApiActions;
