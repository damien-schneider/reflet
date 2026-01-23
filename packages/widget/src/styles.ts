export function getWidgetStyles(primaryColor: string, zIndex: number): string {
  return `
    .reflet-widget-container {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #1a1a1a;
      box-sizing: border-box;
    }
    
    .reflet-widget-container * {
      box-sizing: border-box;
    }
    
    .reflet-launcher {
      position: fixed;
      bottom: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: ${primaryColor};
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      z-index: ${zIndex};
    }
    
    .reflet-launcher:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }
    
    .reflet-launcher.bottom-right {
      right: 20px;
    }
    
    .reflet-launcher.bottom-left {
      left: 20px;
    }
    
    .reflet-launcher-icon {
      width: 28px;
      height: 28px;
      fill: white;
    }
    
    .reflet-launcher-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      background: #ef4444;
      color: white;
      font-size: 12px;
      font-weight: 600;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .reflet-window {
      position: fixed;
      bottom: 90px;
      width: 380px;
      height: 520px;
      max-height: calc(100vh - 120px);
      background: white;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: ${zIndex};
      animation: reflet-slide-in 0.3s ease;
    }
    
    .reflet-window.bottom-right {
      right: 20px;
    }
    
    .reflet-window.bottom-left {
      left: 20px;
    }
    
    @keyframes reflet-slide-in {
      from {
        opacity: 0;
        transform: translateY(20px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    
    .reflet-header {
      padding: 16px 20px;
      background: ${primaryColor};
      color: white;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .reflet-header-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    
    .reflet-header-title {
      font-size: 16px;
      font-weight: 600;
      margin: 0;
    }
    
    .reflet-header-subtitle {
      font-size: 13px;
      opacity: 0.85;
      margin: 0;
    }
    
    .reflet-close-btn {
      width: 32px;
      height: 32px;
      border: none;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s ease;
    }
    
    .reflet-close-btn:hover {
      background: rgba(255, 255, 255, 0.25);
    }
    
    .reflet-close-btn svg {
      width: 16px;
      height: 16px;
      fill: white;
    }
    
    .reflet-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .reflet-message {
      max-width: 85%;
      padding: 10px 14px;
      border-radius: 16px;
      word-wrap: break-word;
    }
    
    .reflet-message.own {
      align-self: flex-end;
      background: ${primaryColor};
      color: white;
      border-bottom-right-radius: 4px;
    }
    
    .reflet-message.other {
      align-self: flex-start;
      background: #f3f4f6;
      color: #1a1a1a;
      border-bottom-left-radius: 4px;
    }
    
    .reflet-message-time {
      font-size: 11px;
      margin-top: 4px;
      opacity: 0.7;
    }
    
    .reflet-empty-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px;
      text-align: center;
      color: #6b7280;
    }
    
    .reflet-empty-icon {
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }
    
    .reflet-input-container {
      padding: 12px 16px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }
    
    .reflet-input {
      flex: 1;
      min-height: 40px;
      max-height: 120px;
      padding: 10px 14px;
      border: 1px solid #e5e7eb;
      border-radius: 20px;
      font-size: 14px;
      font-family: inherit;
      resize: none;
      outline: none;
      transition: border-color 0.2s ease;
    }
    
    .reflet-input:focus {
      border-color: ${primaryColor};
    }
    
    .reflet-input::placeholder {
      color: #9ca3af;
    }
    
    .reflet-send-btn {
      width: 40px;
      height: 40px;
      border: none;
      background: ${primaryColor};
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease, opacity 0.2s ease;
    }
    
    .reflet-send-btn:hover:not(:disabled) {
      transform: scale(1.05);
    }
    
    .reflet-send-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .reflet-send-btn svg {
      width: 18px;
      height: 18px;
      fill: white;
    }
    
    .reflet-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    
    .reflet-spinner {
      width: 24px;
      height: 24px;
      border: 2px solid #e5e7eb;
      border-top-color: ${primaryColor};
      border-radius: 50%;
      animation: reflet-spin 0.8s linear infinite;
    }
    
    @keyframes reflet-spin {
      to {
        transform: rotate(360deg);
      }
    }
    
    .reflet-powered-by {
      padding: 8px;
      text-align: center;
      font-size: 11px;
      color: #9ca3af;
      border-top: 1px solid #e5e7eb;
    }
    
    .reflet-powered-by a {
      color: #6b7280;
      text-decoration: none;
    }
    
    .reflet-powered-by a:hover {
      text-decoration: underline;
    }
    
    @media (max-width: 420px) {
      .reflet-window {
        width: calc(100vw - 24px);
        left: 12px !important;
        right: 12px !important;
        bottom: 80px;
        height: calc(100vh - 100px);
        max-height: none;
      }
      
      .reflet-launcher {
        width: 56px;
        height: 56px;
      }
    }
  `;
}
