'use client';

import { App, message as staticMessage, notification as staticNotification, Modal as staticModal } from 'antd';

type UseAppType = ReturnType<typeof App.useApp>;
export type MessageInstance = UseAppType['message'];
export type NotificationInstance = UseAppType['notification'];
export type ModalHookAPI = UseAppType['modal'];

let _message: MessageInstance | null = null;
let _notification: NotificationInstance | null = null;
let _modal: ModalHookAPI | null = null;

/**
 * AntdStaticBridge connects Ant Design's App component context
 * to static helpers, so message, notification, and modal always consume
 * dynamic theme/locale contexts and eliminate console warnings.
 */
export const AntdStaticBridge = () => {
  const staticApp = App.useApp();
  _message = staticApp.message;
  _notification = staticApp.notification;
  _modal = staticApp.modal;
  return null;
};

export const message: MessageInstance = new Proxy({} as MessageInstance, {
  get(_target, prop) {
    if (_message && typeof (_message as any)[prop] === 'function') {
      return (_message as any)[prop].bind(_message);
    }
    return (staticMessage as any)[prop];
  },
});

export const notification: NotificationInstance = new Proxy({} as NotificationInstance, {
  get(_target, prop) {
    if (_notification && typeof (_notification as any)[prop] === 'function') {
      return (_notification as any)[prop].bind(_notification);
    }
    return (staticNotification as any)[prop];
  },
});

export const modal: ModalHookAPI = new Proxy({} as ModalHookAPI, {
  get(_target, prop) {
    if (_modal && typeof (_modal as any)[prop] === 'function') {
      return (_modal as any)[prop].bind(_modal);
    }
    return (staticModal as any)[prop];
  },
});

export default AntdStaticBridge;
