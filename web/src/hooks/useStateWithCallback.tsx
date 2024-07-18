import { useCallback, useEffect, useRef, useState } from "react";

export const useStateWithCallback = <T,>(initialState: T) => {
  const callbackRef = useRef<(() => void) | null>(null);
  const [state, setState] = useState(initialState);

  const updateState = useCallback(
    (newState: (prev: T) => T | T, cb?: () => void) => {
      if (cb) callbackRef.current = cb;

      setState((prev) =>
        typeof newState === "function" ? newState(prev) : newState
      );
    },
    []
  );

  useEffect(() => {
    if (callbackRef.current) {
      callbackRef.current();
      callbackRef.current = null;
    }
  }, [state]);

  return [state, updateState] as const;
};
