import { useState } from "react";
import { failureMessage } from "../ui/session-workspace";
import { signInTeam, type TeamAccess } from "./team-auth";

export interface TeamConnection {
  apiUrl: string;
  appUrl: string;
  publicKey: string;
}

function useTeamSignIn(
  connection: TeamConnection,
  onSignedIn: (access: TeamAccess) => void
) {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const signIn = async () => {
    setIsSigningIn(true);
    setFailure(null);
    try {
      onSignedIn(await signInTeam(connection));
    } catch (error) {
      setFailure(failureMessage(error));
    }
    setIsSigningIn(false);
  };

  return { failure, isSigningIn, signIn };
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
  notice,
  onSignedIn,
}: {
  connection: TeamConnection;
  notice: string | null;
  onSignedIn: (access: TeamAccess) => void;
}) {
  const [isHidden, setIsHidden] = useState(false);
  const { failure, isSigningIn, signIn } = useTeamSignIn(
    connection,
    onSignedIn
  );

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
      {notice && <p className="dt-meta">{notice}</p>}
      {failure && (
        <p className="dt-error" role="alert">
          {failure}
        </p>
      )}
      <SignInActions
        isSigningIn={isSigningIn}
        onHide={() => setIsHidden(true)}
        onSignIn={signIn}
      />
    </section>
  );
}
