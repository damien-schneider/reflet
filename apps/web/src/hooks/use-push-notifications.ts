"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { env } from "@reflet/env/web";
import { useMutation } from "convex/react";

import { useEffect, useState } from "react";

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
  isLoading: boolean;
  isSubscribed: boolean;
  isSupported: boolean;
  permissionState: NotificationPermission | "unsupported";
  registration: ServiceWorkerRegistration | null;
}

async function createPushSubscriptionKeys(
  registration: ServiceWorkerRegistration
) {
  const subscription = await registration.pushManager.subscribe({
    applicationServerKey: new Uint8Array(
      urlBase64ToUint8Array(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
    ),
    userVisibleOnly: true,
  });
  const { endpoint, keys } = subscription.toJSON();
  const p256dh = keys?.p256dh;
  const auth = keys?.auth;
  if (!(endpoint && p256dh && auth)) {
    return null;
  }
  return { auth, endpoint, p256dh };
}

async function removePushSubscription(registration: ServiceWorkerRegistration) {
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    return null;
  }
  await subscription.unsubscribe();
  return subscription.endpoint;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    isLoading: true,
    isSubscribed: false,
    isSupported: false,
    permissionState: "unsupported",
    registration: null,
  });

  const subscribeMutation = useMutation(
    api.notifications.push_queries.subscribe
  );
  const unsubscribeMutation = useMutation(
    api.notifications.push_queries.unsubscribe
  );

  useEffect(() => {
    const init = async () => {
      const supported =
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;

      if (!supported) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isSupported: false,
        }));
        return;
      }

      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;

        const subscription = await registration.pushManager.getSubscription();

        setState({
          isLoading: false,
          isSubscribed: !!subscription,
          isSupported: true,
          permissionState: Notification.permission,
          registration,
        });
      } catch (error) {
        console.error("[Push] Service worker registration failed:", error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isSupported: true,
          permissionState: Notification.permission,
        }));
      }
    };

    init();
  }, []);

  const subscribe = async (): Promise<boolean> => {
    if (!state.registration) {
      return false;
    }
    try {
      const permission = await Notification.requestPermission();
      setState((prev) => ({ ...prev, permissionState: permission }));
      if (permission !== "granted") {
        return false;
      }
      const keys = await createPushSubscriptionKeys(state.registration);
      if (!keys) {
        console.error("[Push] Invalid subscription keys");
        return false;
      }
      await subscribeMutation({ ...keys, userAgent: navigator.userAgent });
      setState((prev) => ({ ...prev, isSubscribed: true }));
      return true;
    } catch (error) {
      console.error("[Push] Subscribe failed:", error);
      return false;
    }
  };

  const unsubscribeFromPush = async (): Promise<boolean> => {
    if (!state.registration) {
      return false;
    }
    try {
      const endpoint = await removePushSubscription(state.registration);
      if (endpoint) {
        await unsubscribeMutation({ endpoint });
      }
      setState((prev) => ({ ...prev, isSubscribed: false }));
      return true;
    } catch (error) {
      console.error("[Push] Unsubscribe failed:", error);
      return false;
    }
  };

  return {
    isLoading: state.isLoading,
    isSubscribed: state.isSubscribed,
    isSupported: state.isSupported,
    permissionState: state.permissionState,
    subscribe,
    unsubscribe: unsubscribeFromPush,
  };
}
