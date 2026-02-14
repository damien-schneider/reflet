"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { env } from "@reflet/env/web";
import { useMutation } from "convex/react";
import { useCallback, useEffect, useState } from "react";

/**
 * Convert a URL-safe base64 string to a Uint8Array.
 * Required for the applicationServerKey parameter of pushManager.subscribe().
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

interface PushNotificationState {
  isSupported: boolean;
  permissionState: NotificationPermission | "unsupported";
  isSubscribed: boolean;
  isLoading: boolean;
  registration: ServiceWorkerRegistration | null;
}

/**
 * Hook to manage push notification subscription lifecycle.
 * - Registers the service worker
 * - Checks current permission and subscription state
 * - Provides subscribe/unsubscribe functions that sync with Convex
 */
export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permissionState: "unsupported",
    isSubscribed: false,
    isLoading: true,
    registration: null,
  });

  const subscribeMutation = useMutation(
    api.push_notifications_queries.subscribe
  );
  const unsubscribeMutation = useMutation(
    api.push_notifications_queries.unsubscribe
  );

  // Register service worker and check initial state
  useEffect(() => {
    const init = async () => {
      const supported =
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;

      if (!supported) {
        setState((prev) => ({
          ...prev,
          isSupported: false,
          isLoading: false,
        }));
        return;
      }

      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;

        const subscription = await registration.pushManager.getSubscription();

        setState({
          isSupported: true,
          permissionState: Notification.permission,
          isSubscribed: !!subscription,
          isLoading: false,
          registration,
        });
      } catch (error) {
        console.error("[Push] Service worker registration failed:", error);
        setState((prev) => ({
          ...prev,
          isSupported: true,
          permissionState: Notification.permission,
          isLoading: false,
        }));
      }
    };

    init();
  }, []);

  /**
   * Request push permission and subscribe to push notifications.
   * Sends the subscription keys to Convex for server-side push sending.
   */
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!state.registration) {
      return false;
    }

    const vapidPublicKey = env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    try {
      const permission = await Notification.requestPermission();

      setState((prev) => ({ ...prev, permissionState: permission }));

      if (permission !== "granted") {
        return false;
      }

      const reg = state.registration;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: new Uint8Array(
          urlBase64ToUint8Array(vapidPublicKey)
        ),
      });

      const subscriptionJson = subscription.toJSON();
      const { endpoint } = subscriptionJson;
      const p256dh = subscriptionJson.keys?.p256dh;
      const auth = subscriptionJson.keys?.auth;

      if (!(endpoint && p256dh && auth)) {
        console.error("[Push] Invalid subscription keys");
        return false;
      }

      // Save to Convex
      await subscribeMutation({
        endpoint,
        p256dh,
        auth,
        userAgent: navigator.userAgent,
      });

      setState((prev) => ({ ...prev, isSubscribed: true }));
      return true;
    } catch (error) {
      console.error("[Push] Subscribe failed:", error);
      return false;
    }
  }, [state.registration, subscribeMutation]);

  /**
   * Unsubscribe from push notifications and remove from Convex.
   */
  const unsubscribeFromPush = useCallback(async (): Promise<boolean> => {
    if (!state.registration) {
      return false;
    }

    try {
      const reg = state.registration;
      const subscription = await reg.pushManager.getSubscription();

      if (subscription) {
        const { endpoint } = subscription;
        await subscription.unsubscribe();
        await unsubscribeMutation({ endpoint });
      }

      setState((prev) => ({ ...prev, isSubscribed: false }));
      return true;
    } catch (error) {
      console.error("[Push] Unsubscribe failed:", error);
      return false;
    }
  }, [state.registration, unsubscribeMutation]);

  return {
    isSupported: state.isSupported,
    permissionState: state.permissionState,
    isSubscribed: state.isSubscribed,
    isLoading: state.isLoading,
    subscribe,
    unsubscribe: unsubscribeFromPush,
  };
}
