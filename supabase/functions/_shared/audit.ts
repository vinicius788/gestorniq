interface AuditLogPayload {
  action: string;
  companyId?: string | null;
  metadata?: Record<string, unknown>;
  source?: string;
  actorIp?: string | null;
  actorUserId?: string | null;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const toNullableUuid = (value: string | null | undefined) =>
  value && UUID_REGEX.test(value) ? value : null;

export async function writeAuditLog(supabaseAdmin: any, payload: AuditLogPayload): Promise<void> {
  const { error } = await supabaseAdmin.rpc("write_audit_log", {
    p_action: payload.action,
    p_company_id: payload.companyId ?? null,
    p_metadata: payload.metadata ?? {},
    p_source: payload.source ?? "edge_function",
    p_actor_ip: payload.actorIp ?? null,
    p_actor_user_id: toNullableUuid(payload.actorUserId),
  });

  if (error) {
    console.error(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: "error",
        function: "audit",
        event: "write_audit_log.failed",
        action: payload.action,
        error: error.message,
      }),
    );
  }
}
