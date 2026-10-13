import { useState } from "react";
import { failureMessage } from "../ui/session-workspace";
import { prepareTeamSignIn } from "./team-auth";

export interface TeamConnection {
  apiUrl: string;
  appUrl: string;
  publicKey: string;
}

function useTeamSignIn(connection: TeamConnection) {
  const [isLeaving, setIsLeaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const signIn = async () => {
    setIsLeaving(true);
    setFailure(null);
    try {
      window.location.assign(await prepareTeamSignIn(connection));
    } catch (error) {
      setFailure(failureMessage(error));
      setIsLeaving(false);
    }
  };

  return { failure, isLeaving, signIn };
}

function SignInActions({
  isSigningIn,
  onHide,
  onSignIn,
}: {
  isSigningIn: boolean;
  onHide: () => void;
  onSignIn: () => void;
}) {
  return (
    <div className="dt-actions">
      <button
        className="dt-btn"
        data-variant="primary"
        disabled={isSigningIn}
        onClick={onSignIn}
        type="button"
      >
        Sign in with Reflet
      </button>
      <button className="dt-btn" onClick={onHide} type="button">
        Hide
      </button>
    </div>
  );
}

export function TeamSignInCard({
  connection,
  isFinishing,
  notice,
}: {
  connection: TeamConnection;
  isFinishing: boolean;
  notice: string | null;
}) {
  const [isHidden, setIsHidden] = useState(false);
  const { failure, isLeaving, signIn } = useTeamSignIn(connection);

  if (isHidden) {
    return null;
  }
  return (
    <section aria-labelledby="rf-team-title" className="dt-team-card glass">
      <h2 className="dt-ses-subhead" id="rf-team-title">
        Reflet team tools
      </h2>
      <p className="dt-meta">
        Sign in with your Reflet account to record a session on this app.
      </p>
      <p className="dt-meta">
        Only members of the app's Reflet organization can sign in.
      </p>
      {isFinishing && (
        <p className="dt-meta" role="status">
          Finishing sign-in…
        </p>
      )}
      {notice && (
        <p className="dt-meta" role="status">
          {notice}
        </p>
      )}
      {failure && (
        <p className="dt-error" role="alert">
          {failure}
        </p>
      )}
      <SignInActions
        isSigningIn={isLeaving || isFinishing}
        onHide={() => setIsHidden(true)}
        onSignIn={signIn}
      />
    </section>
  );
}
