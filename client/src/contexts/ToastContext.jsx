import { createContext, useContext } from 'react';

export const ToastContext = createContext({
  showToast: () => {},
});

export const useToast = () => useContext(ToastContext);
