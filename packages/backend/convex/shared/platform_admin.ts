import type { AuthProvider } from "convex/server";

export const PLATFORM_ADMIN_ISSUER = "https://admin.damien-schneider.pro";

const PLATFORM_ADMIN_JWKS = {
  keys: [
    {
      alg: "ES256",
      crv: "P-256",
      kid: "platform-admin-2026-10",
      kty: "EC",
      use: "sig",
      x: "dp_VTxr5z12iidJ-1lKGaXpeFSIt04a69tphvdPrT9c",
      y: "nJhN5XXJ0TPHEu5-4bwKk1YNUpqFXxUMh2ywNU-BtCo",
    },
  ],
};

export const platformAdminAuthProvider: AuthProvider = {
  algorithm: "ES256",
  applicationID: "platform-admin-reflet",
  issuer: PLATFORM_ADMIN_ISSUER,
  jwks: `data:text/plain;charset=utf-8;base64,${btoa(JSON.stringify(PLATFORM_ADMIN_JWKS))}`,
  type: "customJwt",
};
