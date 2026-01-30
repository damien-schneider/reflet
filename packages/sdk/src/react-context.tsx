import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Reflet } from "./client";
import type { RefletConfig, RefletUser } from "./types";

// ============================================
// Context Types
// ============================================

interface RefletContextValue {
  client: Reflet;
  isReady: boolean;
  user: RefletUser | undefined;
  setUser: (user: RefletUser | undefined) => void;
}

// ============================================
// Context
// ============================================

const RefletContext = createContext<RefletContextValue | null>(null);

// ============================================
// Provider
// ============================================

export interface RefletProviderProps {
  /** Your board's public API key */
  publicKey: string;
  /** API base URL (optional) */
  baseUrl?: string;
  /** Initial user identification */
  user?: RefletUser;
  /** Pre-signed user token (alternative to user) */
  userToken?: string;
  /** Children */
  children: ReactNode;
}

/**
 * Provider component for Reflet SDK
 *
 * @example
 * ```tsx
 * import { RefletProvider } from '@reflet/sdk/react';
 *
 * function App() {
 *   return (
 *     <RefletProvider
 *       publicKey="fb_pub_xxx"
 *       user={{ id: 'user_123', email: 'user@example.com', name: 'John' }}
 *     >
 *       <YourApp />
 *     </RefletProvider>
 *   );
 * }
 * ```
 */
export function RefletProvider({
  publicKey,
  baseUrl,
  user: initialUser,
  userToken,
  children,
}: RefletProviderProps) {
  const [user, setUser] = useState<RefletUser | undefined>(initialUser);
  const [isReady, setIsReady] = useState(false);

  const client = useMemo(() => {
    const config: RefletConfig = {
      publicKey,
      baseUrl,
      user,
      userToken,
    };
    return new Reflet(config);
  }, [publicKey, baseUrl, user, userToken]);

  // Update client when user changes
  useEffect(() => {
    if (userToken) {
      client.setUserToken(userToken);
    } else {
      client.setUser(user);
    }
  }, [client, user, userToken]);

  // Mark as ready after mount
  useEffect(() => {
    setIsReady(true);
  }, []);

  const value = useMemo(
    () => ({
      client,
      isReady,
      user,
      setUser,
    }),
    [client, isReady, user]
  );

  return (
    <RefletContext.Provider value={value}>{children}</RefletContext.Provider>
  );
}

// ============================================
// Hook to access context
// ============================================

export function useRefletContext(): RefletContextValue {
  const context = useContext(RefletContext);
  if (!context) {
    throw new Error("useRefletContext must be used within a RefletProvider");
  }
  return context;
}

export function useRefletClient(): Reflet {
  const { client } = useRefletContext();
  return client;
}
