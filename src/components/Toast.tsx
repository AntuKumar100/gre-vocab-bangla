import { useEffect, useState } from "react";
import { setToastHandler } from "../lib/toast";

export function Toaster() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let timer = 0;
    setToastHandler((m) => {
      setMsg(m);
      clearTimeout(timer);
      timer = window.setTimeout(() => setMsg(null), 2000);
    });
    return () => {
      setToastHandler(null);
      clearTimeout(timer);
    };
  }, []);
  return msg ? (
    <div className="toast" role="status">
      {msg}
    </div>
  ) : null;
}
