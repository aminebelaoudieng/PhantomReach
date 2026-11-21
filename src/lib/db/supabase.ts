import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { DbInterface } from "./index";
import type {
  ApiUsage,
  AuditInput,
  Plan,
  Report,
  ReportType,
  ScoutInput,
  UsageAction,
  User,
  WidgetLead,
} from "./types";

const WORKSPACE_USER_ID = "00000000-0000-4000-8000-000000000001";
const WORKSPACE_USER_EMAIL = "hosted@phantomreach.local";
const WORKSPACE_CREDITS = 999999;

export interface SupabaseDb extends DbInterface {
  getLocalWorkspaceUser(): Promise<User>;
}

function requiredEnv(name: string, fallbackName?: string): string {
  const value = process.env[name]?.trim() || (fallbackName ? process.env[fallbackName]?.trim() : "");
  if (!value) {
    throw new Error(`Missing required Supabase environment variable: ${name}`);
  }
  return value;
}

function withoutUndefined<T extends Record<string, unknown>>(value: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}

function mapUser(row: Record<string, any>): User {
  return {
    ...row,
    auth_user_id: row.auth_user_id ?? undefined,
    name: row.name ?? undefined,
    stripe_customer_id: row.stripe_customer_id ?? undefined,
    widget_api_key: row.widget_api_key ?? undefined,
    white_label_config: row.white_label_config ?? {},
  } as User;
}

function mapReport(row: Record<string, any>): Report {
  return {
    ...row,
    result: row.result ?? undefined,
    scores: row.scores ?? undefined,
    pdf_storage_path: row.pdf_storage_path ?? undefined,
    email_sent_at: row.email_sent_at ?? undefined,
    expires_at: row.expires_at ?? undefined,
  } as Report;
}

function mapUsage(row: Record<string, any>): ApiUsage {
  return {
    ...row,
    stripe_metered_event_id: row.stripe_metered_event_id ?? undefined,
    metadata: row.metadata ?? {},
  } as ApiUsage;
}

function mapWidgetLead(row: Record<string, any>): WidgetLead {
  return {
    ...row,
    visitor_name: row.visitor_name ?? undefined,
    report_id: row.report_id ?? undefined,
    delivered_at: row.delivered_at ?? undefined,
  } as WidgetLead;
}

function throwDbError(operation: string, error: { message: string } | null): void {
  if (error) throw new Error(`Supabase ${operation} failed: ${error.message}`);
}

export function createSupabaseDb(): SupabaseDb {
  const url = requiredEnv("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  const publishableKey = requiredEnv("SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const accessToken = requiredEnv("PHANTOM_DB_ACCESS_TOKEN");

  const client: SupabaseClient = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-phantom-db-token": accessToken } },
  });

  async function getUserBy(column: string, value: string): Promise<User | undefined> {
    const { data, error } = await client.from("users").select("*").eq(column, value).maybeSingle();
    throwDbError(`get user by ${column}`, error);
    return data ? mapUser(data) : undefined;
  }

  async function getReportById(id: string): Promise<Report | undefined> {
    const { data, error } = await client.from("reports").select("*").eq("id", id).maybeSingle();
    throwDbError("get report", error);
    return data ? mapReport(data) : undefined;
  }

  const db: SupabaseDb = {
    async getLocalWorkspaceUser(): Promise<User> {
      const existing = await getUserBy("id", WORKSPACE_USER_ID);
      if (existing) return existing;
      return db.createUser({
        id: WORKSPACE_USER_ID,
        email: WORKSPACE_USER_EMAIL,
        name: "Hosted Workspace",
        plan: "agency",
      });
    },

    getUser: (id) => getUserBy("id", id),
    getUserByAuthUserId: (authUserId) => getUserBy("auth_user_id", authUserId),
    getUserByEmail: (email) => getUserBy("email", email),
    getUserByWidgetApiKey: (apiKey) => getUserBy("widget_api_key", apiKey),
    getUserByStripeCustomerId: (customerId) => getUserBy("stripe_customer_id", customerId),

    async createUser(data): Promise<User> {
      const now = new Date().toISOString();
      const payload = {
        id: data.id ?? randomUUID(),
        auth_user_id: data.auth_user_id ?? null,
        email: data.email,
        name: data.name ?? null,
        plan: data.plan ?? "agency",
        stripe_customer_id: data.stripe_customer_id ?? null,
        audit_credits_remaining: WORKSPACE_CREDITS,
        scout_credits_remaining: WORKSPACE_CREDITS,
        widget_api_key: data.widget_api_key ?? null,
        white_label_config: {},
        created_at: now,
        updated_at: now,
      };
      const { data: created, error } = await client.from("users").insert(payload).select("*").single();
      throwDbError("create user", error);
      return mapUser(created);
    },

    async updateUser(id, data): Promise<User | undefined> {
      const { id: _id, created_at: _createdAt, ...safeData } = data;
      const payload = withoutUndefined({ ...safeData, updated_at: new Date().toISOString() });
      const { data: updated, error } = await client
        .from("users")
        .update(payload)
        .eq("id", id)
        .select("*")
        .maybeSingle();
      throwDbError("update user", error);
      return updated ? mapUser(updated) : undefined;
    },

    getReport: getReportById,

    async getReportPublic(id): Promise<Report | undefined> {
      const report = await getReportById(id);
      if (!report || report.status !== "completed") return undefined;
      if (report.expires_at && new Date(report.expires_at) < new Date()) return undefined;
      return report;
    },

    async getReportsByUser(userId): Promise<Report[]> {
      const { data, error } = await client
        .from("reports")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      throwDbError("list reports", error);
      return (data ?? []).map(mapReport);
    },

    async getExpiredReports(nowIso): Promise<Report[]> {
      const { data, error } = await client
        .from("reports")
        .select("*")
        .not("expires_at", "is", null)
        .lt("expires_at", nowIso)
        .neq("status", "failed");
      throwDbError("list expired reports", error);
      return (data ?? []).map(mapReport);
    },

    async createReport(data: {
      user_id: string;
      type: ReportType;
      input: AuditInput | ScoutInput;
      is_widget_generated?: boolean;
    }): Promise<Report> {
      const now = new Date().toISOString();
      const payload = {
        id: randomUUID(),
        user_id: data.user_id,
        type: data.type,
        status: "queued",
        input: data.input,
        is_widget_generated: data.is_widget_generated ?? false,
        created_at: now,
        updated_at: now,
      };
      const { data: created, error } = await client.from("reports").insert(payload).select("*").single();
      throwDbError("create report", error);
      return mapReport(created);
    },

    async updateReport(id, data): Promise<Report | undefined> {
      const { id: _id, created_at: _createdAt, ...safeData } = data;
      const payload = withoutUndefined({ ...safeData, updated_at: new Date().toISOString() });
      const { data: updated, error } = await client
        .from("reports")
        .update(payload)
        .eq("id", id)
        .select("*")
        .maybeSingle();
      throwDbError("update report", error);
      return updated ? mapReport(updated) : undefined;
    },

    async trackUsage(data: {
      user_id: string;
      action: UsageAction;
      credits_consumed: number;
      stripe_metered_event_id?: string;
      metadata?: Record<string, unknown>;
    }): Promise<ApiUsage> {
      const payload = {
        id: randomUUID(),
        user_id: data.user_id,
        action: data.action,
        credits_consumed: data.credits_consumed,
        stripe_metered_event_id: data.stripe_metered_event_id ?? null,
        created_at: new Date().toISOString(),
        metadata: data.metadata ?? {},
      };
      const { data: created, error } = await client.from("api_usage").insert(payload).select("*").single();
      throwDbError("track usage", error);
      return mapUsage(created);
    },

    async getUserUsage(userId): Promise<ApiUsage[]> {
      const { data, error } = await client
        .from("api_usage")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      throwDbError("list usage", error);
      return (data ?? []).map(mapUsage);
    },

    async getMonthlyUsageCount(userId, action): Promise<number> {
      const now = new Date();
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
      const { count, error } = await client
        .from("api_usage")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("action", action)
        .gte("created_at", start);
      throwDbError("count monthly usage", error);
      return count ?? 0;
    },

    async createWidgetLead(data: Omit<WidgetLead, "id" | "created_at">): Promise<WidgetLead> {
      const payload = {
        id: randomUUID(),
        ...data,
        visitor_name: data.visitor_name ?? null,
        report_id: data.report_id ?? null,
        delivered_at: data.delivered_at ?? null,
        created_at: new Date().toISOString(),
      };
      const { data: created, error } = await client.from("widget_leads").insert(payload).select("*").single();
      throwDbError("create widget lead", error);
      return mapWidgetLead(created);
    },

    async getWidgetLeads(userId): Promise<WidgetLead[]> {
      const { data, error } = await client
        .from("widget_leads")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      throwDbError("list widget leads", error);
      return (data ?? []).map(mapWidgetLead);
    },
  };

  return db;
}
