import { type Dispatch, type SetStateAction, useState } from "react";
import type { SessionDetail } from "../../../protocol";
import { useSessionAction, useSessionWorkspace } from "../../session-workspace";
import type { ReviewHandle } from "../use-session-detail";

const WEB_PROTOCOLS = ["http:", "https:"];

interface LinkDraft {
  access: string;
  label: string;
  url: string;
}

const EMPTY_LINK: LinkDraft = { access: "", label: "", url: "" };

interface AttachLinkProps {
  detail: SessionDetail;
  onDone: () => void;
  review: ReviewHandle;
}

function isWebUrl(value: string): boolean {
  try {
    return WEB_PROTOCOLS.includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function useLinkAttachment({ detail, onDone, review }: AttachLinkProps) {
  const { api } = useSessionWorkspace();
  const run = useSessionAction();
  const [clientKey] = useState(() => crypto.randomUUID());
  return async (link: LinkDraft) => {
    const evidence = await run("The link was not attached", () =>
      api.addEvidence({
        atMs: detail.session.durationMs,
        clientKey,
        link: {
          access: link.access.trim(),
          label: link.label.trim(),
          url: link.url.trim(),
        },
        sessionId: detail.session.id,
        trigger: "manual",
      })
    );
    if (evidence) {
      review.patch((current) => ({
        ...current,
        evidence: [...current.evidence, evidence],
      }));
      onDone();
    }
  };
}

function LinkFields({
  link,
  setLink,
}: {
  link: LinkDraft;
  setLink: Dispatch<SetStateAction<LinkDraft>>;
}) {
  const field = (key: keyof LinkDraft) => ({
    className: "dt-field",
    onChange: (event: { target: { value: string } }) =>
      setLink((current) => ({ ...current, [key]: event.target.value })),
    value: link[key],
  });
  return (
    <>
      <label className="dt-ses-field">
        <span>URL</span>
        <input maxLength={2000} type="url" {...field("url")} />
      </label>
      <label className="dt-ses-field">
        <span>Label</span>
        <input maxLength={120} {...field("label")} />
      </label>
      <label className="dt-ses-field">
        <span>Who can open it</span>
        <input
          maxLength={200}
          placeholder="For example: the design team"
          {...field("access")}
        />
      </label>
    </>
  );
}

export function AttachLink({ detail, onDone, review }: AttachLinkProps) {
  const attachLink = useLinkAttachment({ detail, onDone, review });
  const [link, setLink] = useState(EMPTY_LINK);
  const isValid = isWebUrl(link.url.trim()) && link.label.trim() !== "";

  return (
    <form
      className="dt-card dt-ses-form"
      onSubmit={(event) => {
        event.preventDefault();
        attachLink(link);
      }}
    >
      <LinkFields link={link} setLink={setLink} />
      <div className="dt-actions">
        <button
          className="dt-btn"
          data-variant="primary"
          disabled={!isValid}
          type="submit"
        >
          Attach link
        </button>
        <button className="dt-btn" onClick={onDone} type="button">
          Cancel
        </button>
      </div>
    </form>
  );
}
