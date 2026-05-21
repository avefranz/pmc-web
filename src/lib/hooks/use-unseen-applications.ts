import { useState, useEffect } from "react";
import { getUnseenCount } from "./use-notification-poller";

/** Реактивный счётчик непросмотренных изменений по заявкам тенанта. */
export function useUnseenApplications(): number {
  const [count, setCount] = useState(getUnseenCount);

  useEffect(() => {
    function sync() { setCount(getUnseenCount()); }
    window.addEventListener("siamo_unseen_changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("siamo_unseen_changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return count;
}
