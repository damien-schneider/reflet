import { z } from "zod";

const RESEND_API_BASE = "https://api.resend.com";

export type ResendResult<T> = { data: T } | { error: string };

const resendErrorSchema = z.object({ message: z.string() });

const domainRecordSchema = z.object({
  name: z.string(),
  priority: z.number().optional(),
  record: z.string(),
  status: z.string(),
  type: z.string(),
  value: z.string(),
});

export const resendDomainSchema = z.object({
  id: z.string(),
  name: z.string(),
  records: z.array(domainRecordSchema).default([]),
  status: z.string(),
});

export type ResendDomain = z.infer<typeof resendDomainSchema>;

const receivedAttachmentSchema = z.object({
  content_disposition: z.string().nullish(),
  content_id: z.string().nullish(),
  content_type: z.string(),
  filename: z.string().nullish(),
  id: z.string(),
  size: z.number().nullish(),
});

const authenticationSchema = z
  .object({
    dkim: z.unknown().optional(),
    dmarc: z.unknown().optional(),
    spf: z.unknown().optional(),
  })
  .loose()
  .nullish();

export const receivedEmailSchema = z.object({
  attachments: z.array(receivedAttachmentSchema).nullish(),
  authentication: authenticationSchema,
  bcc: z.array(z.string()).nullish(),
  cc: z.array(z.string()).nullish(),
  created_at: z.string().nullish(),
  from: z.string(),
  headers: z.record(z.string(), z.unknown()).nullish(),
  html: z.string().nullish(),
  id: z.string(),
  message_id: z.string().nullish(),
  received_for: z.array(z.string()).nullish(),
  subject: z.string().nullish(),
  text: z.string().nullish(),
  to: z.array(z.string()),
});

export type ReceivedEmail = z.infer<typeof receivedEmailSchema>;

const attachmentDownloadSchema = z.object({
  content_disposition: z.string().nullish(),
  content_type: z.string(),
  download_url: z.string(),
  expires_at: z.string().nullish(),
  filename: z.string().nullish(),
  id: z.string(),
  size: z.number().nullish(),
});

export type ReceivedAttachmentDownload = z.infer<
  typeof attachmentDownloadSchema
>;

const supportApiKey = (): string => {
  const key = process.env.RESEND_SUPPORT_API_KEY;
  if (!key) {
    throw new Error("RESEND_SUPPORT_API_KEY environment variable is not set");
  }
  return key;
};

const callResend = async <T>(
  path: string,
  schema: z.ZodType<T>,
  init: { body?: unknown; method: "GET" | "POST" | "DELETE" }
): Promise<ResendResult<T>> => {
  const response = await fetch(`${RESEND_API_BASE}${path}`, {
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    headers: {
      Authorization: `Bearer ${supportApiKey()}`,
      "Content-Type": "application/json",
    },
    method: init.method,
  });
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const parsedError = resendErrorSchema.safeParse(payload);
    return {
      error: parsedError.success
        ? parsedError.data.message
        : `Resend API error ${response.status}`,
    };
  }

  const parsed = schema.safeParse(payload);
  return parsed.success
    ? { data: parsed.data }
    : { error: `Unexpected Resend response for ${path}` };
};

export const createDomain = (name: string) =>
  callResend("/domains", resendDomainSchema, {
    body: {
      click_tracking: false,
      name,
      open_tracking: false,
      region: "eu-west-1",
    },
    method: "POST",
  });

export const getDomain = (id: string) =>
  callResend(`/domains/${id}`, resendDomainSchema, { method: "GET" });

export const verifyDomain = (id: string) =>
  callResend(`/domains/${id}/verify`, z.object({ id: z.string() }), {
    method: "POST",
  });

export const deleteDomain = (id: string) =>
  callResend(`/domains/${id}`, z.looseObject({ id: z.string() }), {
    method: "DELETE",
  });

export const getReceivedEmail = (id: string) =>
  callResend(`/emails/receiving/${id}`, receivedEmailSchema, {
    method: "GET",
  });

export const listReceivedAttachments = (id: string) =>
  callResend(
    `/emails/receiving/${id}/attachments`,
    z.object({ data: z.array(attachmentDownloadSchema) }),
    { method: "GET" }
  );
