import { useState } from "react";
import { failureMessage } from "../ui/session-workspace";

export interface TeamConnection {
  apiUrl: string;
  appUrl: string;
  publicKey: string;
}

function useTeamSignIn(onSignIn: () => Promise<void>) {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const signIn = async () => {
    setIsSigningIn(true);
    setFailure(null);
    try {
      await onSignIn();
    } catch (error) {
      setFailure(failureMessage(error));
      setIsSigningIn(false);
    }
  };

  return { failure, isSigningIn, signIn };
}

function SignInActions({
  canSignIn,
  onHide,
  onSignIn,
}: {
  canSignIn: boolean;
  onHide: () => void;
  onSignIn: () => void;
}) {
  return (
    <div className="dt-actions">
      <button
        className="dt-btn"
        data-variant="primary"
        disabled={!canSignIn}
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
  isFinishing,
  notice,
  onSignIn,
  continuesInBrowser,
}: {
  isFinishing: boolean;
  notice: string | null;
  onSignIn: () => Promise<void>;
  continuesInBrowser: boolean;
}) {
  const [isHidden, setIsHidden] = useState(false);
  const { failure, isSigningIn, signIn } = useTeamSignIn(onSignIn);
  const isWaitingForBrowser = continuesInBrowser && isSigningIn;
  const isLeavingPage = isSigningIn && !continuesInBrowser;

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
      {isWaitingForBrowser && (
        <p className="dt-meta" role="status">
          Finish signing in in your browser.
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
        canSignIn={!(isLeavingPage || isFinishing)}
        onHide={() => setIsHidden(true)}
        onSignIn={signIn}
      />
    </section>
  );
}
